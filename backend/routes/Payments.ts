import { Router, type RequestHandler, type Response } from "express";
import { z } from "zod";
import { requireUser } from "../src/auth/require-user";
import { sessionManager, type SessionManager } from "../src/auth/session";
import { emptyObjectSchema, parseOrRespond } from "../src/http/validation";
import {
  DefaultPaymentService,
  PaymentOwnershipError,
  PaymentSignatureError,
  PaymentStateError,
  PaymentWebhookError,
  paymentService,
} from "../src/payment/payment-service";
import { verifyPaymentSchema } from "../src/payment/payment-schemas";
import { userService, type UserService } from "../src/user/user-service";

type Dependencies = {
  payments: Pick<DefaultPaymentService, "verify">;
  sessions: SessionManager;
  users: Pick<UserService, "userExists">;
};

function respondWithPaymentError(error: unknown, response: Response) {
  if (error instanceof PaymentSignatureError) {
    response.status(400).json({ error: error.message });
    return;
  }
  if (error instanceof PaymentOwnershipError) {
    response.status(404).json({ error: error.message });
    return;
  }
  if (error instanceof PaymentStateError) {
    response.status(409).json({ error: error.message });
    return;
  }
  response.status(503).json({ error: "Payment could not be verified. Please try again." });
}

export function createPaymentsRouter({ payments, sessions, users }: Dependencies) {
  const router = Router();
  const userGuard = requireUser(sessions, users);

  router.post("/verify", userGuard, async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    const body = parseOrRespond(verifyPaymentSchema, request.body, response);
    if (!body) return;

    try {
      response.json(await payments.verify(response.locals.userSession.subjectId, body));
    } catch (error) {
      respondWithPaymentError(error, response);
    }
  });

  return router;
}

const webhookHeaderSchema = z.string().min(1).max(300);

export function createRazorpayWebhookHandler(
  payments: Pick<DefaultPaymentService, "webhook">,
): RequestHandler {
  return async (request, response) => {
    const signature = webhookHeaderSchema.safeParse(request.header("x-razorpay-signature"));
    const eventId = webhookHeaderSchema.safeParse(request.header("x-razorpay-event-id"));
    if (!signature.success || !eventId.success || !Buffer.isBuffer(request.body)) {
      response.status(400).json({ error: "Invalid webhook request." });
      return;
    }
    try {
      await payments.webhook(request.body, signature.data, eventId.data);
      response.status(204).end();
    } catch (error) {
      if (error instanceof PaymentSignatureError || error instanceof PaymentWebhookError) {
        response.status(400).json({ error: "Invalid webhook request." });
        return;
      }
      response.status(503).json({ error: "Webhook processing failed." });
    }
  };
}

export default createPaymentsRouter({
  payments: paymentService,
  sessions: sessionManager,
  users: userService,
});

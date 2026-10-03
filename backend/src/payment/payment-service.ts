import { createHmac, timingSafeEqual } from "node:crypto";
import "temporal-polyfill/global";
import { db } from "../prisma/db";
import { isBookingOverlapConstraintError } from "../booking/booking-service";
import {
  razorpayGateway,
  type RazorpayGateway,
} from "./razorpay-gateway";
import {
  razorpayWebhookSchema,
  type RazorpayWebhook,
  type VerifyPaymentInput,
} from "./payment-schemas";

const REFUND_MESSAGE = "This time was booked by someone else, so we've refunded your payment.";

type StoredBooking = {
  astrologerId: string;
  callMode: "in_app" | "phone";
  callType: "normal" | "urgent" | "subscription";
  endsAt: Temporal.Instant;
  id: string;
  pricePaise: number;
  startsAt: Temporal.Instant;
  status: "pending_payment" | "confirmed" | "completed" | "missed" | "expired";
  usedCredit: boolean;
};

export type StoredPayment = {
  amountPaise: number;
  booking: StoredBooking | null;
  bookingId: string | null;
  creditsPurchased: number;
  id: string;
  purpose: "normal_call" | "urgent_call" | "subscription_pack";
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  status: "created" | "paid" | "failed" | "refunded";
  userId: string;
};

type SettlementInput = {
  amountPaise: number;
  eventId?: string;
  orderId: string;
  paymentId: string;
};

export type SettlementResult =
  | { kind: "confirmed"; booking: StoredBooking; subscriptionCredits?: number }
  | { kind: "duplicate" }
  | { kind: "ignored" }
  | { kind: "invalid" }
  | { kind: "refunded" };

export interface PaymentRepository {
  getPayment(orderId: string): Promise<StoredPayment | null>;
  markFailed(orderId: string, eventId: string): Promise<"recorded" | "duplicate">;
  markRefunded(orderId: string, paymentId: string, eventId?: string): Promise<void>;
  settle(input: SettlementInput): Promise<SettlementResult>;
}

export type ConfirmedPayment = {
  booking: {
    astrologerId: string;
    callMode: "in_app" | "phone";
    callType: "normal" | "urgent" | "subscription";
    durationMin: number;
    endsAt: string;
    id: string;
    pricePaise: number;
    startsAt: string;
    status: "confirmed";
    usedCredit: boolean;
  };
  status: "confirmed";
  subscriptionCredits?: number;
};

export type RefundedPayment = {
  message: typeof REFUND_MESSAGE;
  status: "refunded";
};

export type VerifyPaymentResult = ConfirmedPayment | RefundedPayment;

export class PaymentSignatureError extends Error {}
export class PaymentOwnershipError extends Error {}
export class PaymentStateError extends Error {}
export class PaymentWebhookError extends Error {}

function isUniqueConstraintError(error: unknown) {
  let current = error;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    const candidate = current as { cause?: unknown; code?: unknown; sqlState?: unknown };
    if (candidate.code === "23505" || candidate.sqlState === "23505") return true;
    current = candidate.cause;
  }
  return false;
}

export function verifyHmacHex(secret: string, content: Buffer | string, signature: string) {
  const expected = Buffer.from(createHmac("sha256", secret).update(content).digest("hex"), "hex");
  let received: Buffer;
  try {
    received = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function publicBooking(booking: StoredBooking): ConfirmedPayment["booking"] {
  return {
    id: booking.id,
    astrologerId: booking.astrologerId,
    callType: booking.callType,
    callMode: booking.callMode,
    startsAt: booking.startsAt.toString(),
    endsAt: booking.endsAt.toString(),
    durationMin: Math.round(
      (booking.endsAt.epochMilliseconds - booking.startsAt.epochMilliseconds) / 60_000,
    ),
    pricePaise: booking.pricePaise,
    status: "confirmed",
    usedCredit: booking.usedCredit,
  };
}

const paymentFields = [
  "id",
  "userId",
  "bookingId",
  "purpose",
  "razorpayOrderId",
  "razorpayPaymentId",
  "amountPaise",
  "creditsPurchased",
  "status",
] as const;

const bookingFields = [
  "id",
  "astrologerId",
  "callType",
  "callMode",
  "startsAt",
  "endsAt",
  "status",
  "pricePaise",
  "usedCredit",
] as const;

export class DatabasePaymentRepository implements PaymentRepository {
  async getPayment(orderId: string): Promise<StoredPayment | null> {
    const payment = await db.orm.public.Payment.select(...paymentFields).first({
      razorpayOrderId: orderId,
    });
    if (!payment) return null;
    const booking = payment.bookingId
      ? await db.orm.public.Booking.select(...bookingFields).first({ id: payment.bookingId })
      : null;
    return { ...payment, booking } as StoredPayment;
  }

  private async webhookExists(eventId: string) {
    return Boolean(await db.orm.public.WebhookEvent.select("eventId").first({ eventId }));
  }

  async settle(input: SettlementInput): Promise<SettlementResult> {
    try {
      return await db.transaction(async (transaction) => {
        if (input.eventId) {
          await transaction.orm.public.WebhookEvent.create({ eventId: input.eventId });
        }
        const payment = await transaction.orm.public.Payment.select(...paymentFields).first({
          razorpayOrderId: input.orderId,
        });
        if (!payment || !payment.bookingId) return { kind: "ignored" as const };
        const booking = await transaction.orm.public.Booking.select(...bookingFields).first({
          id: payment.bookingId,
        });
        if (!booking) return { kind: "ignored" as const };
        if (payment.amountPaise !== input.amountPaise || booking.pricePaise !== input.amountPaise) {
          return { kind: "invalid" as const };
        }
        const expectedPurpose = booking.callType === "normal"
          ? "normal_call"
          : booking.callType === "urgent"
            ? "urgent_call"
            : "subscription_pack";
        const isSubscriptionPack = expectedPurpose === "subscription_pack";
        if (
          payment.purpose !== expectedPurpose
          || (isSubscriptionPack
            ? payment.creditsPurchased < 1
            : payment.creditsPurchased !== 0)
        ) {
          return { kind: "invalid" as const };
        }
        if (payment.status === "refunded") return { kind: "refunded" as const };
        if (payment.status === "paid") {
          if (payment.razorpayPaymentId !== input.paymentId) {
            return { kind: "invalid" as const };
          }
          const user = isSubscriptionPack
            ? await transaction.orm.public.User.select("subscriptionCredits").first({
              id: payment.userId,
            })
            : null;
          return {
            kind: "confirmed" as const,
            booking: booking as StoredBooking,
            ...(user ? { subscriptionCredits: user.subscriptionCredits } : {}),
          };
        }

        const claimPlan = transaction.sql.public.Payment
          .update({ status: "paid", razorpayPaymentId: input.paymentId })
          .where((storedPayment, functions) => functions.and(
            functions.eq(storedPayment.id, payment.id),
            functions.in(storedPayment.status, ["created", "failed"]),
          ))
          .returning("id")
          .build();
        const [claimed] = await transaction.query(claimPlan);
        if (!claimed) {
          const current = await transaction.orm.public.Payment.select(...paymentFields).first({
            id: payment.id,
          });
          if (current?.status === "refunded") return { kind: "refunded" as const };
          if (current?.status !== "paid" || current.razorpayPaymentId !== input.paymentId) {
            return { kind: "invalid" as const };
          }
          const currentBooking = await transaction.orm.public.Booking.select(...bookingFields).first({
            id: booking.id,
          });
          if (!currentBooking) return { kind: "ignored" as const };
          const user = isSubscriptionPack
            ? await transaction.orm.public.User.select("subscriptionCredits").first({
              id: payment.userId,
            })
            : null;
          return {
            kind: "confirmed" as const,
            booking: currentBooking as StoredBooking,
            ...(user ? { subscriptionCredits: user.subscriptionCredits } : {}),
          };
        }

        let subscriptionCredits: number | undefined;
        if (isSubscriptionPack) {
          const creditsToAdd = payment.creditsPurchased - 1;
          const creditPlan = transaction.sql.public.User
            .update((user, functions) => ({
              subscriptionCredits: functions.raw`${user.subscriptionCredits} + ${creditsToAdd}`
                .returns("pg/int4@1"),
            }))
            .where((user, functions) => functions.eq(user.id, payment.userId))
            .returning("subscriptionCredits")
            .build();
          const [updatedUser] = await transaction.query(creditPlan);
          if (!updatedUser) {
            throw new Error("User not found while settling subscription credits.");
          }
          subscriptionCredits = updatedUser.subscriptionCredits;
        }

        await transaction.orm.public.Booking.where({ id: booking.id }).update({
          status: "confirmed",
          holdExpiresAt: null,
          usedCredit: isSubscriptionPack,
        });
        return {
          kind: "confirmed" as const,
          booking: {
            ...booking,
            status: "confirmed",
            usedCredit: isSubscriptionPack,
          } as StoredBooking,
          ...(subscriptionCredits === undefined ? {} : { subscriptionCredits }),
        };
      });
    } catch (error) {
      if (input.eventId && isUniqueConstraintError(error) && await this.webhookExists(input.eventId)) {
        return { kind: "duplicate" };
      }
      throw error;
    }
  }

  async markFailed(orderId: string, eventId: string) {
    try {
      await db.transaction(async (transaction) => {
        await transaction.orm.public.WebhookEvent.create({ eventId });
        const payment = await transaction.orm.public.Payment.select("id").first({
          razorpayOrderId: orderId,
        });
        if (payment) {
          const plan = transaction.sql.public.Payment
            .update({ status: "failed" })
            .where((storedPayment, functions) => functions.and(
              functions.eq(storedPayment.id, payment.id),
              functions.eq(storedPayment.status, "created"),
            ))
            .build();
          await transaction.execute(plan);
        }
      });
      return "recorded" as const;
    } catch (error) {
      if (isUniqueConstraintError(error) && await this.webhookExists(eventId)) {
        return "duplicate" as const;
      }
      throw error;
    }
  }

  async markRefunded(orderId: string, paymentId: string, eventId?: string) {
    try {
      await db.transaction(async (transaction) => {
        if (eventId) {
          await transaction.orm.public.WebhookEvent.create({ eventId });
        }
        const payment = await transaction.orm.public.Payment.select("id", "bookingId").first({
          razorpayOrderId: orderId,
        });
        if (!payment) return;
        await transaction.orm.public.Payment.where({ id: payment.id }).update({
          status: "refunded",
          razorpayPaymentId: paymentId,
        });
        if (payment.bookingId) {
          await transaction.orm.public.Booking.where({ id: payment.bookingId }).update({
            status: "expired",
          });
        }
      });
    } catch (error) {
      if (eventId && isUniqueConstraintError(error) && await this.webhookExists(eventId)) return;
      throw error;
    }
  }
}

function requiredSecret(name: "RAZORPAY_KEY_SECRET" | "RAZORPAY_WEBHOOK_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export class DefaultPaymentService {
  private readonly orderLocks = new Map<string, Promise<void>>();

  constructor(
    private readonly repository: PaymentRepository,
    private readonly gateway: RazorpayGateway,
    private readonly keySecret: () => string = () => requiredSecret("RAZORPAY_KEY_SECRET"),
    private readonly webhookSecret: () => string = () => requiredSecret("RAZORPAY_WEBHOOK_SECRET"),
  ) {}

  private async withOrderLock<T>(orderId: string, work: () => Promise<T>) {
    const previous = this.orderLocks.get(orderId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => { release = resolve; });
    const queued = previous.then(() => current);
    this.orderLocks.set(orderId, queued);
    await previous;
    try {
      return await work();
    } finally {
      release();
      if (this.orderLocks.get(orderId) === queued) this.orderLocks.delete(orderId);
    }
  }

  private async settle(
    stored: StoredPayment,
    paymentId: string,
    eventId?: string,
  ): Promise<VerifyPaymentResult | SettlementResult> {
    try {
      const outcome = await this.repository.settle({
        orderId: stored.razorpayOrderId,
        paymentId,
        amountPaise: stored.amountPaise,
        eventId,
      });
      if (outcome.kind === "confirmed") {
        return {
          status: "confirmed",
          booking: publicBooking(outcome.booking),
          ...(outcome.subscriptionCredits === undefined
            ? {}
            : { subscriptionCredits: outcome.subscriptionCredits }),
        };
      }
      if (outcome.kind === "refunded") {
        return { status: "refunded", message: REFUND_MESSAGE };
      }
      return outcome;
    } catch (error) {
      if (!isBookingOverlapConstraintError(error)) throw error;
      await this.gateway.refundPayment(paymentId, stored.id);
      await this.repository.markRefunded(stored.razorpayOrderId, paymentId, eventId);
      return { status: "refunded", message: REFUND_MESSAGE };
    }
  }

  async verify(userId: string, input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const signedContent = `${input.razorpayOrderId}|${input.razorpayPaymentId}`;
    if (!verifyHmacHex(this.keySecret(), signedContent, input.razorpaySignature)) {
      throw new PaymentSignatureError("Payment could not be verified. Please try again.");
    }

    return this.withOrderLock(input.razorpayOrderId, async () => {
      const stored = await this.repository.getPayment(input.razorpayOrderId);
      if (!stored || stored.userId !== userId || stored.bookingId !== input.bookingId) {
        throw new PaymentOwnershipError("Payment could not be verified. Please try again.");
      }
      const outcome = await this.settle(
        stored,
        input.razorpayPaymentId,
      );
      if ("status" in outcome) return outcome;
      if (outcome.kind === "invalid" || outcome.kind === "ignored") {
        throw new PaymentStateError("Payment could not be verified. Please try again.");
      }
      const refreshed = await this.repository.getPayment(input.razorpayOrderId);
      if (!refreshed?.booking) {
        throw new PaymentStateError("Payment could not be verified. Please try again.");
      }
      return { status: "confirmed", booking: publicBooking(refreshed.booking) };
    });
  }

  async webhook(rawBody: Buffer, signature: string, eventId: string) {
    if (!verifyHmacHex(this.webhookSecret(), rawBody, signature)) {
      throw new PaymentSignatureError("Invalid webhook signature.");
    }
    let parsed: RazorpayWebhook;
    try {
      parsed = razorpayWebhookSchema.parse(JSON.parse(rawBody.toString("utf8")));
    } catch {
      throw new PaymentWebhookError("Invalid webhook payload.");
    }
    const payment = parsed.payload.payment.entity;

    return this.withOrderLock(payment.order_id, async () => {
      if (parsed.event === "payment.failed") {
        return this.repository.markFailed(payment.order_id, eventId);
      }
      const stored = await this.repository.getPayment(payment.order_id);
      if (!stored) {
        const outcome = await this.repository.settle({
          orderId: payment.order_id,
          paymentId: payment.id,
          amountPaise: payment.amount,
          eventId,
        });
        return outcome.kind;
      }
      const feePaise = payment.fee ?? 0;
      const amountMatchesOrder = payment.amount === stored.amountPaise
        || payment.amount - feePaise === stored.amountPaise;
      if (!amountMatchesOrder) {
        console.error("Razorpay webhook payment amount did not match its stored order.", {
          event: parsed.event,
          feePaise,
          paymentAmountPaise: payment.amount,
          storedAmountPaise: stored.amountPaise,
        });
        const outcome = await this.repository.settle({
          orderId: stored.razorpayOrderId,
          paymentId: payment.id,
          amountPaise: payment.amount,
          eventId,
        });
        return outcome.kind;
      }
      const outcome = await this.settle(stored, payment.id, eventId);
      if ("status" in outcome) return outcome.status;
      if (outcome.kind === "invalid") {
        console.error("Razorpay webhook settlement was invalid.", {
          event: parsed.event,
          paymentAmountPaise: payment.amount,
          storedAmountPaise: stored.amountPaise,
        });
      }
      return outcome.kind;
    });
  }
}

export const paymentRepository = new DatabasePaymentRepository();
export const paymentService = new DefaultPaymentService(paymentRepository, razorpayGateway);

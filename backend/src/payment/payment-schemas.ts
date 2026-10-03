import { z } from "zod";

export const verifyPaymentSchema = z.object({
  bookingId: z.string().uuid(),
  razorpayOrderId: z.string().min(1).max(100),
  razorpayPaymentId: z.string().min(1).max(100),
  razorpaySignature: z.string().regex(/^[a-fA-F0-9]{64}$/),
}).strict();

const paymentEntitySchema = z.object({
  id: z.string().min(1).max(100),
  order_id: z.string().min(1).max(100),
  amount: z.coerce.number().int().positive(),
  fee: z.coerce.number().int().nonnegative().nullable().optional(),
}).passthrough();

export const razorpayWebhookSchema = z.object({
  event: z.enum(["payment.captured", "order.paid", "payment.failed"]),
  payload: z.object({
    payment: z.object({ entity: paymentEntitySchema }).passthrough(),
  }).passthrough(),
}).passthrough();

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type RazorpayWebhook = z.infer<typeof razorpayWebhookSchema>;

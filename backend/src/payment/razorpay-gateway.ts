import Razorpay from "razorpay";

export type CreateRazorpayOrderInput = {
  amountPaise: number;
  bookingId: string;
  userId: string;
};

export type CreatedRazorpayOrder = {
  amountPaise: number;
  currency: "INR";
  id: string;
};

export interface RazorpayGateway {
  createOrder(input: CreateRazorpayOrderInput): Promise<CreatedRazorpayOrder>;
  getCheckoutKeyId(): string;
  refundPayment(paymentId: string, paymentRecordId: string): Promise<void>;
}

export class OfficialRazorpayGateway implements RazorpayGateway {
  private client: Razorpay | null = null;

  private configuration() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error("Razorpay is not configured.");
    }
    return { keyId, keySecret };
  }

  private getClient() {
    if (!this.client) {
      const { keyId, keySecret } = this.configuration();
      this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
    return this.client;
  }

  getCheckoutKeyId() {
    return this.configuration().keyId;
  }

  async createOrder(input: CreateRazorpayOrderInput) {
    const order = await this.getClient().orders.create({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.bookingId,
      notes: {
        bookingId: input.bookingId,
        userId: input.userId,
      },
    });
    const amountPaise = Number(order.amount);
    if (!order.id || amountPaise !== input.amountPaise || order.currency !== "INR") {
      throw new Error("Razorpay returned an invalid order.");
    }
    return { id: order.id, amountPaise, currency: "INR" as const };
  }

  async refundPayment(paymentId: string, paymentRecordId: string) {
    const client = this.getClient();
    const payment = await client.payments.fetch(paymentId);
    const amountPaidPaise = Number(payment.amount);
    const amountRefundedPaise = Number(payment.amount_refunded ?? 0);
    if (!Number.isInteger(amountPaidPaise) || amountPaidPaise < 1) {
      throw new Error("Razorpay returned an invalid payment amount.");
    }
    if (
      payment.refund_status === "full"
      || amountRefundedPaise >= amountPaidPaise
    ) {
      return;
    }
    await client.payments.refund(paymentId, {
      amount: amountPaidPaise - amountRefundedPaise,
      speed: "normal",
      receipt: `rf_${paymentRecordId.replaceAll("-", "").slice(0, 32)}`,
      notes: { reason: "booking_slot_unavailable" },
    });
  }
}

export const razorpayGateway = new OfficialRazorpayGateway();

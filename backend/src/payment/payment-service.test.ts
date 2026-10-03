import { createHmac } from "node:crypto";
import "temporal-polyfill/global";
import { SqlQueryError } from "@prisma/orm-family-sql/errors";
import { describe, expect, it, vi } from "vitest";
import type { RazorpayGateway } from "./razorpay-gateway";
import {
  DefaultPaymentService,
  PaymentOwnershipError,
  PaymentSignatureError,
  type PaymentRepository,
  type SettlementResult,
  type StoredPayment,
} from "./payment-service";

const userId = "30f7af37-09f6-47d3-b24a-508d718f17c1";
const bookingId = "d0c73928-d807-4d7f-80e0-b99f93aadbf5";
const orderId = "order_test_123";
const paymentId = "pay_test_123";
const keySecret = "test-key-secret";
const webhookSecret = "test-webhook-secret";

function storedPayment(): StoredPayment {
  return {
    id: "payment-record-id",
    userId,
    bookingId,
    purpose: "urgent_call",
    creditsPurchased: 0,
    razorpayOrderId: orderId,
    razorpayPaymentId: null,
    amountPaise: 30_000,
    status: "created",
    booking: {
      id: bookingId,
      astrologerId: "ee6438fd-fc87-4d4c-a3ec-ebac07a814f0",
      callType: "urgent",
      callMode: "phone",
      startsAt: Temporal.Instant.from("2026-10-02T04:30:00Z"),
      endsAt: Temporal.Instant.from("2026-10-02T04:45:00Z"),
      status: "pending_payment",
      pricePaise: 30_000,
      usedCredit: false,
    },
  };
}

class MemoryPaymentRepository implements PaymentRepository {
  payment = storedPayment();
  confirmedWrites = 0;
  refundedWrites = 0;
  events = new Set<string>();
  overlap = false;
  subscriptionCredits = 0;

  async getPayment(requestedOrderId: string) {
    return requestedOrderId === orderId ? this.payment : null;
  }

  async settle(input: {
    amountPaise: number;
    eventId?: string;
    orderId: string;
    paymentId: string;
  }): Promise<SettlementResult> {
    if (input.eventId) {
      if (this.events.has(input.eventId)) return { kind: "duplicate" };
      this.events.add(input.eventId);
    }
    if (this.payment.amountPaise !== input.amountPaise) return { kind: "invalid" };
    if (this.payment.status === "refunded") return { kind: "refunded" };
    if (this.payment.status === "paid") {
      return {
        kind: "confirmed",
        booking: this.payment.booking!,
        ...(this.payment.purpose === "subscription_pack"
          ? { subscriptionCredits: this.subscriptionCredits }
          : {}),
      };
    }
    if (this.overlap) {
      throw new SqlQueryError(
        "conflicting key value violates exclusion constraint \"Booking_no_overlap\"",
        { sqlState: "23P01", constraint: "Booking_no_overlap" },
      );
    }
    await Promise.resolve();
    this.confirmedWrites += 1;
    this.payment.status = "paid";
    this.payment.razorpayPaymentId = input.paymentId;
    this.payment.booking!.status = "confirmed";
    if (this.payment.purpose === "subscription_pack") {
      this.subscriptionCredits += this.payment.creditsPurchased - 1;
      this.payment.booking!.usedCredit = true;
    }
    return {
      kind: "confirmed",
      booking: this.payment.booking!,
      ...(this.payment.purpose === "subscription_pack"
        ? { subscriptionCredits: this.subscriptionCredits }
        : {}),
    };
  }

  async markFailed(_requestedOrderId: string, eventId: string) {
    if (this.events.has(eventId)) return "duplicate" as const;
    this.events.add(eventId);
    this.payment.status = "failed";
    return "recorded" as const;
  }

  async markRefunded(_requestedOrderId: string, requestedPaymentId: string, eventId?: string) {
    if (eventId) this.events.add(eventId);
    this.refundedWrites += 1;
    this.payment.status = "refunded";
    this.payment.razorpayPaymentId = requestedPaymentId;
    this.payment.booking!.status = "expired";
  }
}

function gateway(): RazorpayGateway {
  return {
    createOrder: vi.fn(async () => ({ id: orderId, amountPaise: 30_000, currency: "INR" as const })),
    getCheckoutKeyId: vi.fn(() => "rzp_test_public"),
    refundPayment: vi.fn(async () => undefined),
  };
}

function service(repository: MemoryPaymentRepository, payments = gateway()) {
  return {
    payments,
    service: new DefaultPaymentService(
      repository,
      payments,
      () => keySecret,
      () => webhookSecret,
    ),
  };
}

function verifySignature() {
  return createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

function webhook(eventId = "evt_1", amountPaise = 30_000, feePaise?: number) {
  const raw = Buffer.from(JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: orderId,
          amount: amountPaise,
          ...(feePaise === undefined ? {} : { fee: feePaise }),
        },
      },
    },
  }));
  return {
    eventId,
    raw,
    signature: createHmac("sha256", webhookSecret).update(raw).digest("hex"),
  };
}

describe("DefaultPaymentService", () => {
  it("accepts a valid Checkout signature and rejects a forged one", async () => {
    const repository = new MemoryPaymentRepository();
    const current = service(repository).service;

    await expect(current.verify(userId, {
      bookingId,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: "0".repeat(64),
    })).rejects.toBeInstanceOf(PaymentSignatureError);

    await expect(current.verify(userId, {
      bookingId,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: verifySignature(),
    })).resolves.toEqual(expect.objectContaining({ status: "confirmed" }));
  });

  it("does not let one user verify another user's payment", async () => {
    const repository = new MemoryPaymentRepository();
    const current = service(repository).service;

    await expect(current.verify("27368532-c560-458d-aed6-73a7eb260cfe", {
      bookingId,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: verifySignature(),
    })).rejects.toBeInstanceOf(PaymentOwnershipError);

    expect(repository.confirmedWrites).toBe(0);
  });

  it("makes a replayed webhook a no-op", async () => {
    const repository = new MemoryPaymentRepository();
    const current = service(repository).service;
    const event = webhook();

    await current.webhook(event.raw, event.signature, event.eventId);
    await current.webhook(event.raw, event.signature, event.eventId);

    expect(repository.confirmedWrites).toBe(1);
    expect(repository.events).toEqual(new Set([event.eventId]));
  });

  it("lets verification and a webhook confirm the booking only once", async () => {
    const repository = new MemoryPaymentRepository();
    const current = service(repository).service;
    const event = webhook("evt_concurrent");

    await Promise.all([
      current.verify(userId, {
        bookingId,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: verifySignature(),
      }),
      current.webhook(event.raw, event.signature, event.eventId),
    ]);

    expect(repository.confirmedWrites).toBe(1);
    expect(repository.payment.status).toBe("paid");
  });

  it("confirms an Urgent webhook when Razorpay adds a customer fee", async () => {
    const repository = new MemoryPaymentRepository();
    const current = service(repository).service;
    const event = webhook("evt_urgent_customer_fee", 30_600, 600);

    await expect(current.webhook(event.raw, event.signature, event.eventId)).resolves.toBe("confirmed");

    expect(repository.confirmedWrites).toBe(1);
    expect(repository.payment.status).toBe("paid");
  });

  it("adds a paid Subscription pack and consumes this booking exactly once", async () => {
    const repository = new MemoryPaymentRepository();
    repository.payment = {
      ...repository.payment,
      amountPaise: 99_900,
      purpose: "subscription_pack",
      creditsPurchased: 4,
      booking: {
        ...repository.payment.booking!,
        callType: "subscription",
        pricePaise: 99_900,
      },
    };
    const current = service(repository).service;
    const event = webhook("evt_subscription", 99_900);

    const [verified] = await Promise.all([
      current.verify(userId, {
        bookingId,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: verifySignature(),
      }),
      current.webhook(event.raw, event.signature, event.eventId),
    ]);
    await current.verify(userId, {
      bookingId,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: verifySignature(),
    });

    expect(repository.confirmedWrites).toBe(1);
    expect(repository.subscriptionCredits).toBe(3);
    expect(repository.payment.booking?.usedCredit).toBe(true);
    expect(verified).toEqual(expect.objectContaining({
      status: "confirmed",
      subscriptionCredits: 3,
    }));
  });

  it("adds Subscription credits when Razorpay adds a customer fee", async () => {
    const repository = new MemoryPaymentRepository();
    repository.payment = {
      ...repository.payment,
      amountPaise: 99_900,
      purpose: "subscription_pack",
      creditsPurchased: 4,
      booking: {
        ...repository.payment.booking!,
        callType: "subscription",
        pricePaise: 99_900,
      },
    };
    const current = service(repository).service;
    const event = webhook("evt_pack_customer_fee", 101_898, 1_998);

    await expect(current.webhook(event.raw, event.signature, event.eventId)).resolves.toBe("confirmed");

    expect(repository.confirmedWrites).toBe(1);
    expect(repository.subscriptionCredits).toBe(3);
    expect(repository.payment.booking?.usedCredit).toBe(true);
  });

  it("refunds a late payment when confirming would take an occupied slot", async () => {
    const repository = new MemoryPaymentRepository();
    repository.overlap = true;
    const current = service(repository);

    const result = await current.service.verify(userId, {
      bookingId,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: verifySignature(),
    });

    expect(result).toEqual({
      status: "refunded",
      message: "This time was booked by someone else, so we've refunded your payment.",
    });
    expect(current.payments.refundPayment).toHaveBeenCalledWith(
      paymentId,
      "payment-record-id",
    );
    expect(repository.refundedWrites).toBe(1);
  });
});

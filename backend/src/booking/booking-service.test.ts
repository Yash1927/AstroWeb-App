import "temporal-polyfill/global";
import { SqlQueryError } from "@prisma/orm-family-sql/errors";
import { describe, expect, it, vi } from "vitest";
import type { SlotResult, SlotService } from "../availability/slot-service";
import {
  BookingAstrologerNotFoundError,
  BookingFreeNormalLimitError,
  BookingOverlapError,
  BookingPhoneRequiredError,
  BookingSlotUnavailableError,
  BookingUserDetailsIncompleteError,
  DefaultBookingService,
  isBookingOverlapConstraintError,
  type BookingRepository,
  type BookingTransaction,
} from "./booking-service";
import { SlotAstrologerNotFoundError } from "../availability/slot-service";
import type { RazorpayGateway } from "../payment/razorpay-gateway";

const userId = "30f7af37-09f6-47d3-b24a-508d718f17c1";
const astrologerId = "ee6438fd-fc87-4d4c-a3ec-ebac07a814f0";
const startsAt = "2026-10-02T04:30:00Z";
const endsAt = "2026-10-02T04:45:00Z";
const now = Temporal.Instant.from("2026-10-01T00:00:00Z");

const completeUser: NonNullable<Awaited<ReturnType<BookingRepository["getUser"]>>> = {
  id: userId,
  email: "maya@example.com",
  name: "Maya Shah",
  birthDate: {},
  birthTime: {},
  birthPlace: "Jaipur",
  phone: "+919876543210",
  gender: "female" as const,
  subscriptionCredits: 0,
};

const settings: NonNullable<Awaited<ReturnType<BookingRepository["getSettings"]>>> = {
  normalPricePaise: 0,
  urgentPricePaise: 30_000,
  subscriptionPricePaise: 99_900,
  subscriptionCallsPerPack: 4,
  normalDurationMin: 15,
  urgentDurationMin: 15,
  subscriptionDurationMin: 15,
};

function fakeSlots(result?: Partial<SlotResult>): SlotService {
  return {
    getAvailableSlots: vi.fn(async (): Promise<SlotResult> => {
      const base: SlotResult = {
        durationMin: 15,
        timeZone: "Asia/Kolkata",
        days: [{ date: "2026-10-02", slots: [{ startsAt, endsAt }] }],
      };
      return { ...base, ...result };
    }),
  };
}

function fakeRepository(options?: {
  createError?: unknown;
  hasUpcomingNormal?: boolean;
  subscriptionCredits?: number;
  settings?: NonNullable<Awaited<ReturnType<BookingRepository["getSettings"]>>>;
  user?: NonNullable<Awaited<ReturnType<BookingRepository["getUser"]>>> | null;
}) {
  const events: string[] = [];
  let subscriptionCredits = options?.subscriptionCredits ?? 0;
  const transaction: BookingTransaction = {
    consumeSubscriptionCredit: vi.fn(async () => {
      events.push("credit");
      await Promise.resolve();
      if (subscriptionCredits < 1) return null;
      subscriptionCredits -= 1;
      return subscriptionCredits;
    }),
    addSubscriptionPackAndConsume: vi.fn(async (_userId, callsPerPack) => {
      events.push("pack");
      subscriptionCredits += callsPerPack - 1;
      return subscriptionCredits;
    }),
    expireElapsedHolds: vi.fn(async () => { events.push("expire"); }),
    hasUpcomingNormal: vi.fn(async () => {
      events.push("limit");
      return options?.hasUpcomingNormal ?? false;
    }),
    createBooking: vi.fn(async (input) => {
      events.push("create");
      if (options?.createError) throw options.createError;
      return {
        id: input.id,
        astrologerId: input.astrologerId,
        callType: input.callType,
        callMode: input.callMode,
        startsAt: input.startsAt.toString(),
        endsAt: input.endsAt.toString(),
        status: input.status,
        pricePaise: input.pricePaise,
        usedCredit: input.usedCredit,
      };
    }),
    createPayment: vi.fn(async () => { events.push("payment"); }),
  };
  const repository: BookingRepository = {
    getUser: vi.fn(async () => options && "user" in options ? options.user ?? null : completeUser),
    getSettings: vi.fn(async () => options?.settings ?? settings),
    transaction: vi.fn(async (work) => work(transaction)),
  };
  return { events, repository, transaction, getCredits: () => subscriptionCredits };
}

function fakeGateway(): RazorpayGateway {
  return {
    createOrder: vi.fn(async ({ amountPaise }) => ({
      id: "order_test",
      amountPaise,
      currency: "INR" as const,
    })),
    getCheckoutKeyId: vi.fn(() => "rzp_test_public"),
    refundPayment: vi.fn(async () => undefined),
  };
}

describe("DefaultBookingService", () => {
  it("expires holds then confirms a server-priced Normal slot as an in-app call", async () => {
    const { events, repository, transaction } = fakeRepository();
    const slots = fakeSlots();
    const service = new DefaultBookingService(repository, slots, () => now);

    const result = await service.createBooking(userId, {
      astrologerId,
      callType: "normal",
      startsAt,
    });

    expect(events).toEqual(["expire", "limit", "create"]);
    expect(result.booking).toEqual(expect.objectContaining({
      astrologerId,
      callType: "normal",
      callMode: "in_app",
      durationMin: 15,
      pricePaise: 0,
      status: "confirmed",
      startsAt,
      endsAt,
    }));
    expect(transaction.createBooking).toHaveBeenCalledWith(expect.objectContaining({
      userId,
      holdExpiresAt: null,
      usedCredit: false,
    }));
    expect(slots.getAvailableSlots).toHaveBeenCalledWith(expect.objectContaining({
      astrologerId,
      callType: "normal",
      startDate: "2026-10-01",
      endDate: "2026-10-14",
      now,
    }));
  });

  it("confirms any zero-price call type and derives phone mode on the server", async () => {
    const { repository, transaction } = fakeRepository({
      settings: { ...settings, urgentPricePaise: 0 },
    });
    const service = new DefaultBookingService(repository, fakeSlots(), () => now);

    const result = await service.createBooking(userId, {
      astrologerId,
      callType: "urgent",
      startsAt,
    });

    expect(result.booking.callMode).toBe("phone");
    expect(result.booking.pricePaise).toBe(0);
    expect(transaction.hasUpcomingNormal).not.toHaveBeenCalled();
  });

  it("rejects incomplete details and invalid phone details without writing", async () => {
    const incomplete = fakeRepository({ user: { ...completeUser, birthDate: null } });
    await expect(new DefaultBookingService(incomplete.repository, fakeSlots(), () => now)
      .createBooking(userId, { astrologerId, callType: "normal", startsAt }))
      .rejects.toBeInstanceOf(BookingUserDetailsIncompleteError);
    expect(incomplete.repository.transaction).not.toHaveBeenCalled();

    const noPhone = fakeRepository({
      user: { ...completeUser, phone: null },
      settings: { ...settings, urgentPricePaise: 0 },
    });
    await expect(new DefaultBookingService(noPhone.repository, fakeSlots(), () => now)
      .createBooking(userId, { astrologerId, callType: "urgent", startsAt }))
      .rejects.toBeInstanceOf(BookingPhoneRequiredError);

    const invalidPhone = fakeRepository({ user: { ...completeUser, phone: "+911234567890" } });
    await expect(new DefaultBookingService(invalidPhone.repository, fakeSlots(), () => now)
      .createBooking(userId, { astrologerId, callType: "urgent", startsAt }))
      .rejects.toBeInstanceOf(BookingPhoneRequiredError);
  });

  it("enforces the upcoming Normal limit after expiring elapsed holds", async () => {
    const { events, repository, transaction } = fakeRepository({ hasUpcomingNormal: true });
    const service = new DefaultBookingService(repository, fakeSlots(), () => now);

    await expect(service.createBooking(userId, {
      astrologerId,
      callType: "normal",
      startsAt,
    })).rejects.toBeInstanceOf(BookingFreeNormalLimitError);

    expect(events).toEqual(["expire", "limit"]);
    expect(transaction.createBooking).not.toHaveBeenCalled();
  });

  it("rejects an ineligible astrologer or a start that is not an exact free slot", async () => {
    const { repository } = fakeRepository();
    const missingAstrologer: SlotService = {
      getAvailableSlots: vi.fn(async () => {
        throw new SlotAstrologerNotFoundError("Astrologer not found.");
      }),
    };

    await expect(new DefaultBookingService(repository, missingAstrologer, () => now)
      .createBooking(userId, { astrologerId, callType: "normal", startsAt }))
      .rejects.toBeInstanceOf(BookingAstrologerNotFoundError);
    await expect(new DefaultBookingService(repository, fakeSlots({ days: [] }), () => now)
      .createBooking(userId, { astrologerId, callType: "normal", startsAt }))
      .rejects.toBeInstanceOf(BookingSlotUnavailableError);
  });

  it("maps the database exclusion constraint to the friendly overlap error", async () => {
    const prismaError = new SqlQueryError(
      "conflicting key value violates exclusion constraint \"Booking_no_overlap\"",
      { sqlState: "23P01", constraint: "Booking_no_overlap" },
    );
    const { repository } = fakeRepository({
      createError: prismaError,
    });
    const service = new DefaultBookingService(repository, fakeSlots(), () => now);

    await expect(service.createBooking(userId, {
      astrologerId,
      callType: "normal",
      startsAt,
    })).rejects.toEqual(expect.objectContaining({
      constructor: BookingOverlapError,
      message: "Sorry, this time was just booked. Please pick another time.",
    }));
  });

  it("recognizes Prisma's sqlState directly and through its transaction wrapper", () => {
    const prismaError = new SqlQueryError(
      "conflicting key value violates exclusion constraint \"Booking_no_overlap\"",
      { sqlState: "23P01", constraint: "Booking_no_overlap" },
    );

    expect(isBookingOverlapConstraintError(prismaError)).toBe(true);
    expect(isBookingOverlapConstraintError({
      code: "RUNTIME.TRANSACTION_COMMIT_FAILED",
      cause: prismaError,
    })).toBe(true);
    expect(isBookingOverlapConstraintError(new SqlQueryError(
      "duplicate key value violates unique constraint",
      { sqlState: "23505", constraint: "User_googleSub_key" },
    ))).toBe(false);
  });

  it("ignores a browser price and creates a ten-minute server-priced hold for Urgent", async () => {
    const { events, repository, transaction } = fakeRepository();
    const gateway = fakeGateway();
    const service = new DefaultBookingService(repository, fakeSlots(), () => now, gateway);

    const result = await service.createBooking(userId, {
      astrologerId,
      callType: "urgent",
      startsAt,
      pricePaise: 1,
    } as never);

    expect(gateway.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      amountPaise: 30_000,
      userId,
    }));
    expect(events).toEqual(["expire", "create", "payment"]);
    expect(transaction.createBooking).toHaveBeenCalledWith(expect.objectContaining({
      callMode: "phone",
      pricePaise: 30_000,
      status: "pending_payment",
      holdExpiresAt: now.add({ minutes: 10 }),
    }));
    expect(transaction.createPayment).toHaveBeenCalledWith(expect.objectContaining({
      amountPaise: 30_000,
      creditsPurchased: 0,
      purpose: "urgent_call",
      razorpayOrderId: "order_test",
    }));
    expect(result.checkout).toEqual(expect.objectContaining({
      amountPaise: 30_000,
      orderId: "order_test",
      expiresAt: now.add({ minutes: 10 }).toString(),
      prefill: {
        name: "Maya Shah",
        email: "maya@example.com",
        contact: "+919876543210",
      },
    }));
  });

  it("uses one existing Subscription credit and confirms without Checkout", async () => {
    const current = fakeRepository({ subscriptionCredits: 2 });
    const gateway = fakeGateway();
    const result = await new DefaultBookingService(
      current.repository,
      fakeSlots(),
      () => now,
      gateway,
    ).createBooking(userId, { astrologerId, callType: "subscription", startsAt });

    expect(current.events).toEqual(["expire", "credit", "create"]);
    expect(current.getCredits()).toBe(1);
    expect(gateway.createOrder).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({
      subscriptionCredits: 1,
      booking: expect.objectContaining({
        callMode: "phone",
        callType: "subscription",
        pricePaise: 0,
        status: "confirmed",
        usedCredit: true,
      }),
    }));
  });

  it("creates a server-priced pack order when no Subscription credit remains", async () => {
    const current = fakeRepository();
    const gateway = fakeGateway();
    const result = await new DefaultBookingService(
      current.repository,
      fakeSlots(),
      () => now,
      gateway,
    ).createBooking(userId, { astrologerId, callType: "subscription", startsAt });

    expect(current.events).toEqual(["expire", "credit", "expire", "create", "payment"]);
    expect(gateway.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      amountPaise: 99_900,
      bookingId: result.booking.id,
      userId,
    }));
    expect(current.transaction.createPayment).toHaveBeenCalledWith(expect.objectContaining({
      amountPaise: 99_900,
      creditsPurchased: 4,
      purpose: "subscription_pack",
    }));
    expect(result.booking).toEqual(expect.objectContaining({
      pricePaise: 99_900,
      status: "pending_payment",
      usedCredit: false,
    }));
    expect(result.checkout).toEqual(expect.objectContaining({ amountPaise: 99_900 }));
  });

  it("adds and consumes a zero-price Subscription pack without Checkout", async () => {
    const current = fakeRepository({
      settings: { ...settings, subscriptionPricePaise: 0 },
    });
    const gateway = fakeGateway();
    const result = await new DefaultBookingService(
      current.repository,
      fakeSlots(),
      () => now,
      gateway,
    ).createBooking(userId, { astrologerId, callType: "subscription", startsAt });

    expect(current.events).toEqual(["expire", "credit", "expire", "pack", "create"]);
    expect(current.getCredits()).toBe(3);
    expect(gateway.createOrder).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({
      subscriptionCredits: 3,
      booking: expect.objectContaining({
        pricePaise: 0,
        status: "confirmed",
        usedCredit: true,
      }),
    }));
  });

  it("never takes concurrent Subscription credit bookings below zero", async () => {
    const current = fakeRepository({ subscriptionCredits: 1 });
    const service = new DefaultBookingService(
      current.repository,
      fakeSlots(),
      () => now,
      fakeGateway(),
    );

    const results = await Promise.all([
      service.createBooking(userId, { astrologerId, callType: "subscription", startsAt }),
      service.createBooking(userId, { astrologerId, callType: "subscription", startsAt }),
    ]);

    expect(current.getCredits()).toBe(0);
    expect(results.filter((result) => result.booking.usedCredit)).toHaveLength(1);
    expect(results.filter((result) => result.checkout)).toHaveLength(1);
  });
});

import { randomUUID } from "node:crypto";
import "temporal-polyfill/global";
import { db } from "../prisma/db";
import {
  APP_TIME_ZONE,
  SlotAstrologerNotFoundError,
  slotService,
  type SlotService,
} from "../availability/slot-service";
import type { CreateBookingInput } from "./booking-schemas";
import {
  razorpayGateway,
  type RazorpayGateway,
} from "../payment/razorpay-gateway";

type CallType = CreateBookingInput["callType"];
type CallMode = "in_app" | "phone";

type BookingUser = {
  birthDate: unknown | null;
  birthPlace: string | null;
  birthTime: unknown | null;
  email: string;
  gender: "male" | "female" | "other" | null;
  id: string;
  name: string;
  phone: string | null;
  subscriptionCredits: number;
};

type BookingSettings = {
  normalDurationMin: number;
  normalPricePaise: number;
  subscriptionDurationMin: number;
  subscriptionCallsPerPack: number;
  subscriptionPricePaise: number;
  urgentDurationMin: number;
  urgentPricePaise: number;
};

export type BookingInsert = {
  astrologerId: string;
  callMode: CallMode;
  callType: CallType;
  endsAt: Temporal.Instant;
  holdExpiresAt: Temporal.Instant | null;
  id: string;
  pricePaise: number;
  startsAt: Temporal.Instant;
  status: "confirmed" | "pending_payment";
  usedCredit: boolean;
  userId: string;
};

export type CreatedBooking = {
  astrologerId: string;
  callMode: CallMode;
  callType: CallType;
  durationMin: 10 | 15 | 30;
  endsAt: string;
  id: string;
  pricePaise: number;
  startsAt: string;
  status: "confirmed" | "pending_payment";
  usedCredit: boolean;
};

export type BookingCheckout = {
  amountPaise: number;
  currency: "INR";
  expiresAt: string;
  keyId: string;
  orderId: string;
  prefill: {
    contact: string;
    email: string;
    name: string;
  };
};

export type CreateBookingResult = {
  booking: CreatedBooking;
  checkout?: BookingCheckout;
  subscriptionCredits?: number;
};

export type PaymentInsert = {
  amountPaise: number;
  bookingId: string;
  creditsPurchased: number;
  id: string;
  purpose: "normal_call" | "urgent_call" | "subscription_pack";
  razorpayOrderId: string;
  status: "created";
  userId: string;
};

export interface BookingTransaction {
  createBooking(input: BookingInsert): Promise<Omit<CreatedBooking, "durationMin">>;
  createPayment(input: PaymentInsert): Promise<void>;
  addSubscriptionPackAndConsume(userId: string, callsPerPack: number): Promise<number>;
  consumeSubscriptionCredit(userId: string): Promise<number | null>;
  expireElapsedHolds(astrologerId: string, now: Temporal.Instant): Promise<void>;
  hasUpcomingNormal(userId: string, now: Temporal.Instant): Promise<boolean>;
}

export interface BookingRepository {
  getSettings(): Promise<BookingSettings | null>;
  getUser(userId: string): Promise<BookingUser | null>;
  transaction<T>(work: (transaction: BookingTransaction) => Promise<T>): Promise<T>;
}

export interface BookingService {
  createBooking(userId: string, input: CreateBookingInput): Promise<CreateBookingResult>;
}

export class BookingUserDetailsIncompleteError extends Error {}
export class BookingPhoneRequiredError extends Error {}
export class BookingAstrologerNotFoundError extends Error {}
export class BookingSlotUnavailableError extends Error {}
export class BookingOverlapError extends Error {}
export class BookingFreeNormalLimitError extends Error {}

function completeDetails(user: BookingUser) {
  return user.name.trim().length >= 2
    && user.name.trim().length <= 60
    && user.birthDate !== null
    && user.birthTime !== null
    && Boolean(user.birthPlace?.trim())
    && user.gender !== null;
}

function priceAndDuration(settings: BookingSettings, callType: CallType) {
  const pricePaise = settings[`${callType}PricePaise`];
  const durationMin = settings[`${callType}DurationMin`];
  if (!Number.isInteger(pricePaise) || pricePaise < 0) {
    throw new Error("The call price is invalid.");
  }
  if (durationMin !== 10 && durationMin !== 15 && durationMin !== 30) {
    throw new Error("The call duration is invalid.");
  }
  return { pricePaise, durationMin };
}

function callModeFor(callType: CallType): CallMode {
  return callType === "normal" ? "in_app" : "phone";
}

function purposeFor(callType: CallType) {
  if (callType === "subscription") return "subscription_pack" as const;
  return callType === "normal" ? "normal_call" as const : "urgent_call" as const;
}

export function isBookingOverlapConstraintError(error: unknown) {
  let current = error;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    const candidate = current as {
      cause?: unknown;
      code?: unknown;
      constraint?: unknown;
      sqlState?: unknown;
    };
    if (
      candidate.sqlState === "23P01"
      || candidate.code === "23P01"
      || candidate.constraint === "Booking_no_overlap"
    ) {
      return true;
    }
    current = candidate.cause;
  }
  return false;
}

export class DatabaseBookingRepository implements BookingRepository {
  async getUser(userId: string) {
    return db.orm.public.User.select(
      "id",
      "email",
      "name",
      "birthDate",
      "birthTime",
      "birthPlace",
      "phone",
      "gender",
      "subscriptionCredits",
    ).first({ id: userId });
  }

  async getSettings() {
    return db.orm.public.Settings.select(
      "normalPricePaise",
      "urgentPricePaise",
      "subscriptionPricePaise",
      "subscriptionCallsPerPack",
      "normalDurationMin",
      "urgentDurationMin",
      "subscriptionDurationMin",
    ).first({ id: 1 });
  }

  async transaction<T>(work: (transaction: BookingTransaction) => Promise<T>) {
    return db.transaction(async (transaction) => work({
      async consumeSubscriptionCredit(userId) {
        const plan = transaction.sql.public.User
          .update((user, functions) => ({
            subscriptionCredits: functions.raw`${user.subscriptionCredits} - ${1}`
              .returns("pg/int4@1"),
          }))
          .where((user, functions) => functions.and(
            functions.eq(user.id, userId),
            functions.gt(user.subscriptionCredits, 0),
          ))
          .returning("subscriptionCredits")
          .build();
        const [updated] = await transaction.query(plan);
        return updated?.subscriptionCredits ?? null;
      },
      async addSubscriptionPackAndConsume(userId, callsPerPack) {
        const creditsToAdd = callsPerPack - 1;
        const plan = transaction.sql.public.User
          .update((user, functions) => ({
            subscriptionCredits: functions.raw`${user.subscriptionCredits} + ${creditsToAdd}`
              .returns("pg/int4@1"),
          }))
          .where((user, functions) => functions.eq(user.id, userId))
          .returning("subscriptionCredits")
          .build();
        const [updated] = await transaction.query(plan);
        if (!updated) throw new Error("User not found while adding subscription credits.");
        return updated.subscriptionCredits;
      },
      async expireElapsedHolds(astrologerId, now) {
        await transaction.orm.public.Booking
          .where({ astrologerId, status: "pending_payment" })
          .where((booking) => booking.holdExpiresAt.lte(now))
          .update({ status: "expired" });
      },
      async hasUpcomingNormal(userId, now) {
        const bookings = await transaction.orm.public.Booking.select(
          "status",
          "holdExpiresAt",
        )
          .where({ userId, callType: "normal" })
          .where((booking) => booking.status.in(["confirmed", "pending_payment"]))
          .where((booking) => booking.endsAt.gt(now))
          .all();

        return bookings.some((booking) => booking.status === "confirmed"
          || (
            booking.status === "pending_payment"
            && booking.holdExpiresAt !== null
            && Temporal.Instant.compare(booking.holdExpiresAt, now) > 0
          ));
      },
      async createBooking(input) {
        const created = await transaction.orm.public.Booking.select(
          "id",
          "astrologerId",
          "callType",
          "callMode",
          "startsAt",
          "endsAt",
          "status",
          "pricePaise",
          "usedCredit",
        ).create(input);

        return {
          ...created,
          startsAt: created.startsAt.toString(),
          endsAt: created.endsAt.toString(),
          status: created.status as "confirmed" | "pending_payment",
        };
      },
      async createPayment(input) {
        await transaction.orm.public.Payment.create(input);
      },
    }));
  }
}

export class DefaultBookingService implements BookingService {
  constructor(
    private readonly repository: BookingRepository,
    private readonly slots: SlotService,
    private readonly now: () => Temporal.Instant = () => Temporal.Now.instant(),
    private readonly payments: RazorpayGateway = razorpayGateway,
  ) {}

  async createBooking(
    userId: string,
    input: CreateBookingInput,
  ): Promise<CreateBookingResult> {
    const now = this.now();
    const [user, settings] = await Promise.all([
      this.repository.getUser(userId),
      this.repository.getSettings(),
    ]);
    if (!user || !completeDetails(user)) {
      throw new BookingUserDetailsIncompleteError(
        "Complete your details before booking a call.",
      );
    }

    const callMode = callModeFor(input.callType);
    if (callMode === "phone" && !/^\+91[6-9]\d{9}$/.test(user.phone ?? "")) {
      throw new BookingPhoneRequiredError(
        "Add your phone number before booking this call.",
      );
    }
    if (!settings) throw new Error("Settings are unavailable.");
    const { pricePaise, durationMin } = priceAndDuration(settings, input.callType);

    const today = now.toZonedDateTimeISO(APP_TIME_ZONE).toPlainDate();
    let available;
    try {
      available = await this.slots.getAvailableSlots({
        astrologerId: input.astrologerId,
        callType: input.callType,
        startDate: today.toString(),
        endDate: today.add({ days: 13 }).toString(),
        now,
      });
    } catch (error) {
      if (error instanceof SlotAstrologerNotFoundError) {
        throw new BookingAstrologerNotFoundError("Astrologer not found.");
      }
      throw error;
    }

    const requestedStart = Temporal.Instant.from(input.startsAt);
    const slot = available.days
      .flatMap((day) => day.slots)
      .find((candidate) => Temporal.Instant.compare(
        Temporal.Instant.from(candidate.startsAt),
        requestedStart,
      ) === 0);
    if (!slot || available.durationMin !== durationMin) {
      throw new BookingSlotUnavailableError(
        "Sorry, this time was just booked. Please pick another time.",
      );
    }
    const id = randomUUID();

    if (input.callType === "subscription") {
      try {
        const creditBooking = await this.repository.transaction(async (transaction) => {
          await transaction.expireElapsedHolds(input.astrologerId, now);
          const subscriptionCredits = await transaction.consumeSubscriptionCredit(userId);
          if (subscriptionCredits === null) return null;
          const booking = await transaction.createBooking({
            id,
            userId,
            astrologerId: input.astrologerId,
            callType: input.callType,
            callMode,
            startsAt: requestedStart,
            endsAt: Temporal.Instant.from(slot.endsAt),
            status: "confirmed",
            holdExpiresAt: null,
            pricePaise: 0,
            usedCredit: true,
          });
          return { booking: { ...booking, durationMin }, subscriptionCredits };
        });
        if (creditBooking) return creditBooking;
      } catch (error) {
        if (isBookingOverlapConstraintError(error)) {
          throw new BookingOverlapError(
            "Sorry, this time was just booked. Please pick another time.",
          );
        }
        throw error;
      }

      if (!Number.isInteger(settings.subscriptionCallsPerPack)
        || settings.subscriptionCallsPerPack < 1) {
        throw new Error("The subscription pack size is invalid.");
      }

      if (pricePaise === 0) {
        try {
          return await this.repository.transaction(async (transaction) => {
            await transaction.expireElapsedHolds(input.astrologerId, now);
            const subscriptionCredits = await transaction.addSubscriptionPackAndConsume(
              userId,
              settings.subscriptionCallsPerPack,
            );
            const booking = await transaction.createBooking({
              id,
              userId,
              astrologerId: input.astrologerId,
              callType: input.callType,
              callMode,
              startsAt: requestedStart,
              endsAt: Temporal.Instant.from(slot.endsAt),
              status: "confirmed",
              holdExpiresAt: null,
              pricePaise: 0,
              usedCredit: true,
            });
            return { booking: { ...booking, durationMin }, subscriptionCredits };
          });
        } catch (error) {
          if (isBookingOverlapConstraintError(error)) {
            throw new BookingOverlapError(
              "Sorry, this time was just booked. Please pick another time.",
            );
          }
          throw error;
        }
      }
    }

    const holdExpiresAt = pricePaise > 0 ? now.add({ minutes: 10 }) : null;
    const order = pricePaise > 0
      ? await this.payments.createOrder({ amountPaise: pricePaise, bookingId: id, userId })
      : null;

    try {
      const booking = await this.repository.transaction(async (transaction) => {
        await transaction.expireElapsedHolds(input.astrologerId, now);

        if (input.callType === "normal" && await transaction.hasUpcomingNormal(userId, now)) {
          throw new BookingFreeNormalLimitError(
            "You already have an upcoming Normal call. You can book another after it ends.",
          );
        }

        const created = await transaction.createBooking({
          id,
          userId,
          astrologerId: input.astrologerId,
          callType: input.callType,
          callMode,
          startsAt: requestedStart,
          endsAt: Temporal.Instant.from(slot.endsAt),
          status: order ? "pending_payment" : "confirmed",
          holdExpiresAt,
          pricePaise,
          usedCredit: false,
        });
        if (order) {
          await transaction.createPayment({
            id: randomUUID(),
            userId,
            bookingId: id,
            purpose: purposeFor(input.callType),
            razorpayOrderId: order.id,
            amountPaise: pricePaise,
            creditsPurchased: input.callType === "subscription"
              ? settings.subscriptionCallsPerPack
              : 0,
            status: "created",
          });
        }
        return { ...created, durationMin };
      });

      return {
        booking,
        ...(order && holdExpiresAt ? {
          checkout: {
            keyId: this.payments.getCheckoutKeyId(),
            orderId: order.id,
            amountPaise: pricePaise,
            currency: "INR" as const,
            expiresAt: holdExpiresAt.toString(),
            prefill: {
              name: user.name,
              email: user.email,
              contact: user.phone ?? "",
            },
          },
        } : {}),
      };
    } catch (error) {
      if (error instanceof BookingFreeNormalLimitError) throw error;
      if (isBookingOverlapConstraintError(error)) {
        throw new BookingOverlapError(
          "Sorry, this time was just booked. Please pick another time.",
        );
      }
      throw error;
    }
  }
}

export const bookingRepository = new DatabaseBookingRepository();
export const bookingService = new DefaultBookingService(bookingRepository, slotService);

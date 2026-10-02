import "temporal-polyfill/global";
import { SqlQueryError } from "@prisma/orm-family-sql/errors";
import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { ResolvedSession, SessionManager } from "../src/auth/session";
import type { SlotService } from "../src/availability/slot-service";
import {
  BookingFreeNormalLimitError,
  BookingOverlapError,
  SubscriptionBookingDeferredError,
  DefaultBookingService,
  type BookingInsert,
  type BookingRepository,
  type BookingService,
  type BookingTransaction,
  type CreatedBooking,
} from "../src/booking/booking-service";
import type { UserService } from "../src/user/user-service";
import { createBookingsRouter } from "./Bookings";

const userA = "30f7af37-09f6-47d3-b24a-508d718f17c1";
const userB = "27368532-c560-458d-aed6-73a7eb260cfe";
const astrologerId = "ee6438fd-fc87-4d4c-a3ec-ebac07a814f0";
const startsAt = "2026-10-02T04:30:00Z";
const endsAt = "2026-10-02T04:45:00Z";
const now = Temporal.Instant.from("2026-10-01T00:00:00Z");

function sessionsFor(subjects = [userA, userB]): SessionManager {
  return {
    create: vi.fn(async () => "signed-session"),
    destroy: vi.fn(async () => undefined),
    resolve: vi.fn(async (_role, cookie) => {
      const subjectId = /subject=([^;]+)/.exec(cookie ?? "")?.[1];
      if (!subjectId || !subjects.includes(subjectId)) return null;
      return { id: `session-${subjectId}`, role: "user", subjectId } as ResolvedSession;
    }),
  };
}

function usersFor(subjects = [userA, userB]): Pick<UserService, "userExists"> {
  return { userExists: vi.fn(async (id) => subjects.includes(id)) };
}

function successfulBooking(): CreatedBooking {
  return {
    id: "d0c73928-d807-4d7f-80e0-b99f93aadbf5",
    astrologerId,
    callType: "normal",
    callMode: "in_app",
    startsAt,
    endsAt,
    status: "confirmed",
    pricePaise: 0,
    durationMin: 15,
  };
}

function testApp(bookings: BookingService, sessions = sessionsFor()) {
  const app = express();
  app.use(express.json());
  app.use("/api/bookings", createBookingsRouter({
    bookings,
    sessions,
    users: usersFor(),
  }));
  return app;
}

function bookingRequest(app: express.Express, subjectId = userA) {
  return request(app)
    .post("/api/bookings")
    .set("Cookie", `subject=${subjectId}`)
    .send({ astrologerId, callType: "normal", startsAt });
}

describe("POST /api/bookings", () => {
  it("requires a user session, validates booking fields and ignores a browser price", async () => {
    const bookings: BookingService = { createBooking: vi.fn(async () => ({ booking: successfulBooking() })) };
    const app = testApp(bookings);
    const signedOut = await request(app).post("/api/bookings").send({
      astrologerId,
      callType: "normal",
      startsAt,
    });
    const invalid = await request(app)
      .post("/api/bookings?pricePaise=0")
      .set("Cookie", `subject=${userA}`)
      .send({ astrologerId, callType: "video", startsAt, pricePaise: 0 });
    const browserPrice = await request(app)
      .post("/api/bookings")
      .set("Cookie", `subject=${userA}`)
      .send({ astrologerId, callType: "normal", startsAt, pricePaise: 0 });

    expect(signedOut.status).toBe(401);
    expect(invalid.status).toBe(400);
    expect(browserPrice.status).toBe(201);
    expect(bookings.createBooking).toHaveBeenCalledTimes(1);
    expect(bookings.createBooking).toHaveBeenCalledWith(userA, {
      astrologerId,
      callType: "normal",
      startsAt,
    });
  });

  it("creates only for the session user and maps booking conflicts", async () => {
    const bookings: BookingService = {
      createBooking: vi.fn(async (userId) => {
        expect(userId).toBe(userA);
        return { booking: successfulBooking() };
      }),
    };
    const created = await bookingRequest(testApp(bookings));
    expect(created.status).toBe(201);
    expect(created.body.booking).toEqual(successfulBooking());

    const limited = await bookingRequest(testApp({
      createBooking: vi.fn(async () => {
        throw new BookingFreeNormalLimitError(
          "You already have an upcoming Normal call. You can book another after it ends.",
        );
      }),
    }));
    expect(limited.status).toBe(409);
    expect(limited.body.error).toContain("upcoming Normal call");

    const overlap = await bookingRequest(testApp({
      createBooking: vi.fn(async () => {
        throw new BookingOverlapError(
          "Sorry, this time was just booked. Please pick another time.",
        );
      }),
    }));
    expect(overlap.status).toBe(409);
    expect(overlap.body.error).toBe(
      "Sorry, this time was just booked. Please pick another time.",
    );

    const paid = await bookingRequest(testApp({
      createBooking: vi.fn(async () => {
        throw new SubscriptionBookingDeferredError("Subscription packs come in a later step.");
      }),
    }));
    expect(paid.status).toBe(409);
    expect(paid.body.error).toBe("Subscription packs come in a later step.");
  });

  it("allows exactly one of two simultaneous requests for the same slot", async () => {
    class ConcurrentRepository implements BookingRepository {
      bookings: BookingInsert[] = [];
      private queue: Promise<void> = Promise.resolve();

      async getUser(userId: string) {
        return {
          id: userId,
          email: "user@example.com",
          name: "Test User",
          birthDate: {},
          birthTime: {},
          birthPlace: "Jaipur",
          phone: null,
          gender: "other" as const,
        };
      }

      async getSettings() {
        return {
          normalPricePaise: 0,
          urgentPricePaise: 30_000,
          subscriptionPricePaise: 99_900,
          normalDurationMin: 15,
          urgentDurationMin: 15,
          subscriptionDurationMin: 15,
        };
      }

      transaction<T>(work: (transaction: BookingTransaction) => Promise<T>) {
        const run = this.queue.then(() => work({
          expireElapsedHolds: async () => undefined,
          createPayment: async () => undefined,
          hasUpcomingNormal: async (userId) => this.bookings.some((booking) => (
            booking.userId === userId
            && booking.callType === "normal"
            && booking.status === "confirmed"
          )),
          createBooking: async (input) => {
            const overlaps = this.bookings.some((booking) => (
              booking.astrologerId === input.astrologerId
              && Temporal.Instant.compare(booking.startsAt, input.endsAt) < 0
              && Temporal.Instant.compare(booking.endsAt, input.startsAt) > 0
            ));
            if (overlaps) {
              throw new SqlQueryError(
                "conflicting key value violates exclusion constraint \"Booking_no_overlap\"",
                { sqlState: "23P01", constraint: "Booking_no_overlap" },
              );
            }
            this.bookings.push(input);
            return {
              id: input.id,
              astrologerId: input.astrologerId,
              callType: input.callType,
              callMode: input.callMode,
              startsAt: input.startsAt.toString(),
              endsAt: input.endsAt.toString(),
              status: input.status,
              pricePaise: input.pricePaise,
            };
          },
        }));
        this.queue = run.then(() => undefined, () => undefined);
        return run;
      }
    }

    const repository = new ConcurrentRepository();
    const slots: SlotService = {
      getAvailableSlots: vi.fn(async (): Promise<Awaited<ReturnType<SlotService["getAvailableSlots"]>>> => ({
        durationMin: 15,
        timeZone: "Asia/Kolkata",
        days: [{ date: "2026-10-02", slots: [{ startsAt, endsAt }] }],
      })),
    };
    const service = new DefaultBookingService(repository, slots, () => now);
    const app = testApp(service);

    const responses = await Promise.all([
      bookingRequest(app, userA),
      bookingRequest(app, userB),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(responses.find((response) => response.status === 409)?.body.error).toBe(
      "Sorry, this time was just booked. Please pick another time.",
    );
    expect(repository.bookings).toHaveLength(1);
  });
});

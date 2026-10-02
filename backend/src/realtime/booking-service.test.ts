import "temporal-polyfill/global";
import { describe, expect, it } from "vitest";
import {
  DefaultRealtimeBookingService,
  RealtimeBookingUnavailableError,
  type RealtimeBooking,
  type RealtimeBookingRepository,
} from "./booking-service";

const startsAt = Temporal.Instant.from("2026-10-01T10:00:00Z");
const endsAt = Temporal.Instant.from("2026-10-01T10:15:00Z");

function booking(overrides: Partial<RealtimeBooking> = {}): RealtimeBooking {
  return {
    id: "1c10ff39-56b3-4c86-9fa4-a8cb17d4a7df",
    userId: "user-1",
    astrologerId: "astrologer-1",
    startsAt,
    endsAt,
    userJoinedAt: null,
    astrologerJoinedAt: null,
    ...overrides,
  };
}

function repository(rows: RealtimeBooking[]) {
  const firstJoins: Array<{ bookingId: string; participant: string; joinedAt: string }> = [];
  const finalized: Array<{ bookingId: string; status: string }> = [];
  const value: RealtimeBookingRepository = {
    async findBooking(bookingId) {
      return rows.find((row) => row.id === bookingId) ?? null;
    },
    async findEndedBookings(now) {
      return rows.filter((row) => Temporal.Instant.compare(row.endsAt, now) <= 0);
    },
    async markFirstJoin(bookingId, participant, joinedAt) {
      firstJoins.push({ bookingId, participant, joinedAt: joinedAt.toString() });
    },
    async finalizeBooking(bookingId, status) {
      finalized.push({ bookingId, status });
    },
  };
  return { finalized, firstJoins, value };
}

describe("DefaultRealtimeBookingService", () => {
  it("authorizes a participant without recording a join", async () => {
    const fake = repository([booking()]);
    const service = new DefaultRealtimeBookingService(fake.value);
    const now = Temporal.Instant.from("2026-10-01T10:05:00Z");

    await expect(service.authorizeBooking({
      bookingId: booking().id,
      participant: "astrologer",
      subjectId: "astrologer-1",
      now,
    })).resolves.toEqual(booking());
    expect(fake.firstJoins).toEqual([]);
  });

  it("admits only the booking participant during the call window and records first join", async () => {
    const fake = repository([booking()]);
    const service = new DefaultRealtimeBookingService(fake.value);
    const now = Temporal.Instant.from("2026-10-01T10:05:00Z");

    await expect(service.joinBooking({
      bookingId: booking().id,
      participant: "user",
      subjectId: "user-1",
      now,
    })).resolves.toMatchObject({ userJoinedAt: now });
    expect(fake.firstJoins).toEqual([{
      bookingId: booking().id,
      participant: "user",
      joinedAt: now.toString(),
    }]);

    await expect(service.joinBooking({
      bookingId: booking().id,
      participant: "user",
      subjectId: "user-2",
      now,
    })).rejects.toBeInstanceOf(RealtimeBookingUnavailableError);
    await expect(service.joinBooking({
      bookingId: booking().id,
      participant: "astrologer",
      subjectId: "astrologer-1",
      now: startsAt.subtract({ nanoseconds: 1 }),
    })).rejects.toBeInstanceOf(RealtimeBookingUnavailableError);
    await expect(service.joinBooking({
      bookingId: booking().id,
      participant: "astrologer",
      subjectId: "astrologer-1",
      now: endsAt,
    })).rejects.toBeInstanceOf(RealtimeBookingUnavailableError);
  });

  it("finalizes ended calls as completed only when both people joined", async () => {
    const completed = booking({
      userJoinedAt: startsAt,
      astrologerJoinedAt: startsAt.add({ seconds: 2 }),
    });
    const missed = booking({ id: "ee1dedf6-7e69-4276-8ad0-af15828342a6", userJoinedAt: startsAt });
    const fake = repository([completed, missed]);
    const service = new DefaultRealtimeBookingService(fake.value);

    await service.finalizeEnded(endsAt.add({ seconds: 1 }));

    expect(fake.finalized).toEqual([
      { bookingId: completed.id, status: "completed" },
      { bookingId: missed.id, status: "missed" },
    ]);
  });
});


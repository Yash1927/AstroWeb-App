import "temporal-polyfill/global";
import { describe, expect, it, vi } from "vitest";
import {
  DefaultBookingHistoryService,
  type BookingHistoryRepository,
} from "./booking-history-service";

function booking(
  id: string,
  startsAt: string,
  endsAt: string,
  joined: "both" | "one" | "none" = "none",
) {
  return {
    id,
    userId: "user-1",
    astrologerId: "astrologer-1",
    callType: "normal" as const,
    startsAt: Temporal.Instant.from(startsAt),
    endsAt: Temporal.Instant.from(endsAt),
    pricePaise: 0,
    usedCredit: false,
    userJoinedAt: joined === "none" ? null : Temporal.Instant.from(startsAt),
    astrologerJoinedAt: joined === "both" ? Temporal.Instant.from(startsAt) : null,
  };
}

function repository(rows: ReturnType<typeof booking>[]): BookingHistoryRepository {
  return {
    listUserBookings: vi.fn(async () => rows),
    listAstrologerBookings: vi.fn(async () => rows),
    getUserBooking: vi.fn(async (userId, bookingId) => (
      rows.find((row) => row.userId === userId && row.id === bookingId) ?? null
    )),
    getAstrologerBooking: vi.fn(async (astrologerId, bookingId) => (
      rows.find((row) => row.astrologerId === astrologerId && row.id === bookingId) ?? null
    )),
    findAstrologers: vi.fn(async () => [{ id: "astrologer-1", displayName: "Anika Rao" }]),
    findUsers: vi.fn(async () => [{
      id: "user-1",
      name: "Maya Shah",
      birthDate: Temporal.PlainDate.from("1991-08-17"),
      birthTime: Temporal.PlainTime.from("05:30"),
      birthPlace: "Jaipur",
      gender: "female" as const,
      phone: "+919876543210",
    }]),
  };
}

describe("DefaultBookingHistoryService", () => {
  it("sorts upcoming soonest first and past newest first", async () => {
    const service = new DefaultBookingHistoryService(repository([
      booking("future-later", "2026-10-01T12:00:00Z", "2026-10-01T12:15:00Z"),
      booking("past-older", "2026-10-01T08:00:00Z", "2026-10-01T08:15:00Z", "both"),
      booking("future-sooner", "2026-10-01T11:00:00Z", "2026-10-01T11:15:00Z"),
      booking("past-newer", "2026-10-01T09:00:00Z", "2026-10-01T09:15:00Z", "none"),
    ]), () => Temporal.Instant.from("2026-10-01T10:00:00Z"));

    const result = await service.listUserBookings("user-1");

    expect(result.upcoming.map(({ id }) => id)).toEqual(["future-sooner", "future-later"]);
    expect(result.past.map(({ id }) => id)).toEqual(["past-newer", "past-older"]);
    expect(result.past.map(({ status }) => status)).toEqual(["missed", "completed"]);
  });

  it("returns the astrologer's booked user details without an email", async () => {
    const service = new DefaultBookingHistoryService(repository([
      booking("future", "2026-10-01T11:00:00Z", "2026-10-01T11:15:00Z"),
    ]), () => Temporal.Instant.from("2026-10-01T10:00:00Z"));

    const result = await service.listAstrologerBookings("astrologer-1");

    expect(result.upcoming[0]?.user).toEqual({
      id: "user-1",
      name: "Maya Shah",
      birthDate: "1991-08-17",
      birthTime: "05:30",
      birthPlace: "Jaipur",
      gender: "female",
      phone: "+919876543210",
    });
    expect(JSON.stringify(result)).not.toContain("email");
  });
});


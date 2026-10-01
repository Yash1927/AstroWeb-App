import "temporal-polyfill/global";
import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  astrologerFirst: vi.fn(),
  bookingAll: vi.fn(),
  exceptionAll: vi.fn(),
  settingsFirst: vi.fn(),
  weeklyAll: vi.fn(),
}));

vi.mock("../prisma/db", () => {
  function query(terminal: "all" | "first", run: ReturnType<typeof vi.fn>) {
    const builder: Record<string, unknown> = {};
    builder.where = vi.fn(() => builder);
    builder[terminal] = run;
    return builder;
  }

  return {
    db: {
      orm: {
        public: {
          Astrologer: {
            select: vi.fn(() => query("first", databaseMocks.astrologerFirst)),
          },
          AvailabilityException: {
            select: vi.fn(() => query("all", databaseMocks.exceptionAll)),
          },
          AvailabilityRule: {
            select: vi.fn(() => query("all", databaseMocks.weeklyAll)),
          },
          Booking: {
            select: vi.fn(() => query("all", databaseMocks.bookingAll)),
          },
          Settings: {
            select: vi.fn(() => query("first", databaseMocks.settingsFirst)),
          },
        },
      },
    },
  };
});

import { DatabaseSlotService } from "./slot-service";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  for (const mock of Object.values(databaseMocks)) mock.mockReset();
  databaseMocks.astrologerFirst.mockResolvedValue({ id: "astrologer-1" });
});

describe("DatabaseSlotService", () => {
  it("starts settings, weekly, exception and booking reads in parallel", async () => {
    const settings = deferred<{
      normalDurationMin: number;
      subscriptionDurationMin: number;
      urgentDurationMin: number;
    }>();
    const weekly = deferred<Array<{
      endTime: Temporal.PlainTime;
      startTime: Temporal.PlainTime;
      weekday: number;
    }>>();
    const exceptions = deferred<never[]>();
    const bookings = deferred<never[]>();
    databaseMocks.settingsFirst.mockReturnValue(settings.promise);
    databaseMocks.weeklyAll.mockReturnValue(weekly.promise);
    databaseMocks.exceptionAll.mockReturnValue(exceptions.promise);
    databaseMocks.bookingAll.mockReturnValue(bookings.promise);

    const pending = new DatabaseSlotService().getAvailableSlots({
      astrologerId: "astrologer-1",
      callType: "urgent",
      startDate: "2026-10-01",
      endDate: "2026-10-01",
      now: Temporal.Instant.from("2026-10-01T00:00:00Z"),
    });

    await vi.waitFor(() => {
      expect(databaseMocks.settingsFirst).toHaveBeenCalledOnce();
      expect(databaseMocks.weeklyAll).toHaveBeenCalledOnce();
      expect(databaseMocks.exceptionAll).toHaveBeenCalledOnce();
      expect(databaseMocks.bookingAll).toHaveBeenCalledOnce();
    });

    settings.resolve({
      normalDurationMin: 15,
      urgentDurationMin: 15,
      subscriptionDurationMin: 15,
    });
    weekly.resolve([{
      weekday: 4,
      startTime: Temporal.PlainTime.from("10:00"),
      endTime: Temporal.PlainTime.from("10:15"),
    }]);
    exceptions.resolve([]);
    bookings.resolve([]);

    await expect(pending).resolves.toEqual(expect.objectContaining({
      durationMin: 15,
      days: [{
        date: "2026-10-01",
        slots: [{
          startsAt: "2026-10-01T04:30:00Z",
          endsAt: "2026-10-01T04:45:00Z",
        }],
      }],
    }));
  });
});

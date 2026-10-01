import "temporal-polyfill/global";
import { describe, expect, it } from "vitest";
import type { CalculateAvailableSlotsInput } from "./slot-service";
import { calculateAvailableSlots } from "./slot-service";

const thursday = 4;
const friday = 5;
const base: CalculateAvailableSlotsInput = {
  astrologerId: "ee6438fd-fc87-4d4c-a3ec-ebac07a814f0",
  callType: "urgent",
  durationMin: 15,
  startDate: "2026-10-01",
  endDate: "2026-10-01",
  now: Temporal.Instant.from("2026-10-01T00:00:00Z"),
  weekly: [{ weekday: thursday, startTime: "10:00", endTime: "11:00" }],
  exceptions: [],
  bookings: [],
};

function starts(input: Partial<CalculateAvailableSlotsInput> = {}) {
  return calculateAvailableSlots({ ...base, ...input }).days.flatMap((day) =>
    day.slots.map((slot) => slot.startsAt),
  );
}

describe("calculateAvailableSlots", () => {
  it.each([
    [10, ["04:30:00Z", "04:40:00Z", "04:50:00Z"]],
    [15, ["04:30:00Z", "04:45:00Z"]],
    [30, ["04:30:00Z"]],
  ] as const)("cuts a window into %i-minute slots", (durationMin, expectedTimes) => {
    const actual = starts({
      durationMin,
      weekly: [{ weekday: thursday, startTime: "10:00", endTime: "10:30" }],
    });

    expect(actual).toEqual(expectedTimes.map((time) => `2026-10-01T${time}`));
  });

  it("adds extra hours, subtracts partial blocks and honours whole-day blocks", () => {
    const partial = starts({
      durationMin: 30,
      weekly: [{ weekday: thursday, startTime: "10:00", endTime: "12:00" }],
      exceptions: [
        {
          date: "2026-10-01",
          kind: "blocked",
          startTime: "10:30",
          endTime: "11:00",
        },
        {
          date: "2026-10-01",
          kind: "extra",
          startTime: "13:00",
          endTime: "14:00",
        },
      ],
    });
    const blocked = starts({
      exceptions: [{
        date: "2026-10-01",
        kind: "blocked",
        startTime: null,
        endTime: null,
      }],
    });

    expect(partial).toEqual([
      "2026-10-01T04:30:00Z",
      "2026-10-01T05:30:00Z",
      "2026-10-01T06:00:00Z",
      "2026-10-01T07:30:00Z",
      "2026-10-01T08:00:00Z",
    ]);
    expect(blocked).toEqual([]);
  });

  it("leaves out past starts while keeping a slot that starts now", () => {
    expect(starts({
      now: Temporal.Instant.from("2026-10-01T03:45:00Z"),
      weekly: [{ weekday: thursday, startTime: "08:30", endTime: "10:00" }],
    })).toEqual([
      "2026-10-01T03:45:00Z",
      "2026-10-01T04:00:00Z",
      "2026-10-01T04:15:00Z",
    ]);
  });

  it("removes confirmed bookings and unexpired holds, but ignores expired holds", () => {
    expect(starts({
      bookings: [
        {
          startsAt: Temporal.Instant.from("2026-10-01T04:45:00Z"),
          endsAt: Temporal.Instant.from("2026-10-01T05:00:00Z"),
          status: "confirmed",
          holdExpiresAt: null,
        },
        {
          startsAt: Temporal.Instant.from("2026-10-01T05:00:00Z"),
          endsAt: Temporal.Instant.from("2026-10-01T05:15:00Z"),
          status: "pending_payment",
          holdExpiresAt: Temporal.Instant.from("2026-10-01T00:10:00Z"),
        },
        {
          startsAt: Temporal.Instant.from("2026-10-01T05:15:00Z"),
          endsAt: Temporal.Instant.from("2026-10-01T05:30:00Z"),
          status: "pending_payment",
          holdExpiresAt: Temporal.Instant.from("2026-09-30T23:59:00Z"),
        },
      ],
    })).toEqual([
      "2026-10-01T04:30:00Z",
      "2026-10-01T05:15:00Z",
    ]);
  });

  it("keeps today empty for Normal and starts Normal slots tomorrow", () => {
    const result = calculateAvailableSlots({
      ...base,
      callType: "normal",
      endDate: "2026-10-02",
      now: Temporal.Instant.from("2026-10-01T00:00:00Z"),
      weekly: [
        { weekday: thursday, startTime: "10:00", endTime: "10:30" },
        { weekday: friday, startTime: "10:00", endTime: "10:30" },
      ],
    });

    expect(result.days[0]).toEqual({ date: "2026-10-01", slots: [] });
    expect(result.days[1]?.slots.map((slot) => slot.startsAt)).toEqual([
      "2026-10-02T04:30:00Z",
      "2026-10-02T04:45:00Z",
    ]);
  });

  it("converts an IST availability clock to UTC timestamps", () => {
    const result = calculateAvailableSlots(base);

    expect(result.timeZone).toBe("Asia/Kolkata");
    expect(result.days[0]?.slots[0]).toEqual({
      startsAt: "2026-10-01T04:30:00Z",
      endsAt: "2026-10-01T04:45:00Z",
    });
  });
});

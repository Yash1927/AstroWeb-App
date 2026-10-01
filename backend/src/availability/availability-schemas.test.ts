import { describe, expect, it } from "vitest";
import { availabilitySchema } from "./availability-schemas";

describe("availabilitySchema", () => {
  it("accepts separate ranges and a whole-date block", () => {
    expect(availabilitySchema.safeParse({
      weekly: [
        { weekday: 1, startTime: "09:00", endTime: "12:00" },
        { weekday: 1, startTime: "13:00", endTime: "17:00" },
      ],
      exceptions: [{
        date: "2026-10-05",
        kind: "blocked",
        startTime: null,
        endTime: null,
      }],
    }).success).toBe(true);
  });

  it("rejects backwards, overlapping and ambiguous exception ranges", () => {
    const backwards = availabilitySchema.safeParse({
      weekly: [{ weekday: 1, startTime: "12:00", endTime: "09:00" }],
      exceptions: [],
    });
    const overlap = availabilitySchema.safeParse({
      weekly: [
        { weekday: 1, startTime: "09:00", endTime: "12:00" },
        { weekday: 1, startTime: "11:00", endTime: "13:00" },
      ],
      exceptions: [],
    });
    const wholeDayPlusExtra = availabilitySchema.safeParse({
      weekly: [],
      exceptions: [
        { date: "2026-10-05", kind: "blocked", startTime: null, endTime: null },
        { date: "2026-10-05", kind: "extra", startTime: "10:00", endTime: "11:00" },
      ],
    });

    expect(backwards.success).toBe(false);
    expect(overlap.success).toBe(false);
    expect(wholeDayPlusExtra.success).toBe(false);
  });
});

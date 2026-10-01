import { describe, expect, it } from "vitest";
import {
  ensureDevelopmentEnvironment,
  parseMakeBookingArguments,
} from "./make-booking-helpers";

describe("dev:make-booking arguments", () => {
  it("parses the two emails, offset and duration", () => {
    expect(parseMakeBookingArguments([
      "--user", "Maya@example.com",
      "--astrologer", "Anika@example.com",
      "--starts-in", "5",
      "--duration", "15",
    ])).toEqual({
      userEmail: "maya@example.com",
      astrologerEmail: "anika@example.com",
      startsInMin: 5,
      durationMin: 15,
    });
  });

  it("allows a past start for testing Past cards and rejects incomplete arguments", () => {
    expect(parseMakeBookingArguments([
      "--duration", "10",
      "--starts-in", "-20",
      "--astrologer", "anika@example.com",
      "--user", "maya@example.com",
    ]).startsInMin).toBe(-20);
    expect(() => parseMakeBookingArguments(["--user", "maya@example.com"]))
      .toThrow(/Usage:/);
  });

  it("refuses to run in production", () => {
    expect(() => ensureDevelopmentEnvironment("production"))
      .toThrow("dev:make-booking refuses to run in production.");
    expect(() => ensureDevelopmentEnvironment("development")).not.toThrow();
  });
});


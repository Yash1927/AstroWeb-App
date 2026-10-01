import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { PublicAstrologerService } from "../src/public/public-astrologer-service";
import type { SlotResult, SlotService } from "../src/availability/slot-service";
import { createPublicAstrologerRouter } from "./Astrologers";

const astrologerId = "ee6438fd-fc87-4d4c-a3ec-ebac07a814f0";

function fakeSlots(): SlotService {
  return {
    getAvailableSlots: vi.fn(async (): Promise<SlotResult> => ({
      durationMin: 15,
      timeZone: "Asia/Kolkata",
      days: [{
        date: "2026-10-01",
        slots: [{
          startsAt: "2026-10-01T04:30:00Z",
          endsAt: "2026-10-01T04:45:00Z",
        }],
      }],
    })),
  };
}

function testApp(astrologers: PublicAstrologerService, slots = fakeSlots()) {
  const app = express();
  app.use(express.json());
  app.use("/api/astrologers", createPublicAstrologerRouter({
    astrologers,
    slots,
    now: () => Temporal.Instant.from("2026-10-01T00:00:00Z"),
  }));
  return { app, slots };
}

describe("public astrologer cards", () => {
  it("returns only the fields used by the shared Home card", async () => {
    const astrologers = {
      listEligibleAstrologers: vi.fn(async () => [
        {
          id: astrologerId,
          displayName: "Anika Rao",
          expertise: ["Vedic", "Tarot"],
          languages: ["Hindi", "English"],
          experienceYears: 8,
          email: "private@example.com",
          isActive: true,
          profileSavedAt: "2026-10-01T00:00:00Z",
        },
      ]),
    } as unknown as PublicAstrologerService;
    const response = await request(testApp(astrologers).app).get("/api/astrologers");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      astrologers: [
        {
          id: astrologerId,
          displayName: "Anika Rao",
          expertise: ["Vedic", "Tarot"],
          languages: ["Hindi", "English"],
          experienceYears: 8,
        },
      ],
    });
    expect(JSON.stringify(response.body)).not.toContain("private@example.com");
    expect(JSON.stringify(response.body)).not.toContain("profileSavedAt");
  });

  it("rejects unexpected public input", async () => {
    const astrologers: PublicAstrologerService = {
      listEligibleAstrologers: vi.fn(async () => []),
    };
    const query = await request(testApp(astrologers).app).get("/api/astrologers?email=private");
    const body = await request(testApp(astrologers).app)
      .get("/api/astrologers")
      .set("Content-Type", "application/json")
      .send({ includeHidden: true });

    expect(query.status).toBe(400);
    expect(body.status).toBe(400);
    expect(astrologers.listEligibleAstrologers).not.toHaveBeenCalled();
  });

  it("returns a generic service error", async () => {
    const astrologers: PublicAstrologerService = {
      listEligibleAstrologers: vi.fn(async () => {
        throw new Error("database details must stay private");
      }),
    };
    const response = await request(testApp(astrologers).app).get("/api/astrologers");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: "Astrologers are unavailable. Please try again.",
    });
  });

  it("returns a 14-day IST slot request for a validated call type", async () => {
    const astrologers: PublicAstrologerService = {
      listEligibleAstrologers: vi.fn(async () => []),
    };
    const { app, slots } = testApp(astrologers);
    const response = await request(app).get(`/api/astrologers/${astrologerId}/slots?type=normal`);
    const invalid = await request(app).get(`/api/astrologers/${astrologerId}/slots?type=video`);

    expect(response.status).toBe(200);
    expect(response.body.timeZone).toBe("Asia/Kolkata");
    expect(slots.getAvailableSlots).toHaveBeenCalledWith({
      astrologerId,
      callType: "normal",
      startDate: "2026-10-01",
      endDate: "2026-10-14",
      now: Temporal.Instant.from("2026-10-01T00:00:00Z"),
    });
    expect(invalid.status).toBe(400);
  });
});

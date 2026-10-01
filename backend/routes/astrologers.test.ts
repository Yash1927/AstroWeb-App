import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { PublicAstrologerService } from "../src/public/public-astrologer-service";
import { createPublicAstrologerRouter } from "./Astrologers";

function testApp(astrologers: PublicAstrologerService) {
  const app = express();
  app.use(express.json());
  app.use("/api/astrologers", createPublicAstrologerRouter({ astrologers }));
  return app;
}

describe("public astrologer cards", () => {
  it("returns only the fields used by the shared Home card", async () => {
    const astrologers = {
      listEligibleAstrologers: vi.fn(async () => [
        {
          id: "ee6438fd-fc87-4d4c-a3ec-ebac07a814f0",
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
    const response = await request(testApp(astrologers)).get("/api/astrologers");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      astrologers: [
        {
          id: "ee6438fd-fc87-4d4c-a3ec-ebac07a814f0",
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
    const query = await request(testApp(astrologers)).get("/api/astrologers?email=private");
    const body = await request(testApp(astrologers))
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
    const response = await request(testApp(astrologers)).get("/api/astrologers");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: "Astrologers are unavailable. Please try again.",
    });
  });
});

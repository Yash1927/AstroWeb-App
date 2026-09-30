import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginRateLimiter } from "../src/auth/login-rate-limit";
import type { ResolvedSession, SessionManager } from "../src/auth/session";
import type { AstrologerProfile, OwnerService, OwnerSettings } from "../src/owner/owner-service";
import { createOwnerRouter } from "./Owner";
import { createOwnerAuthRouter } from "./OwnerAuth";

const astrologerId = "ee6438fd-fc87-4d4c-a3ec-ebac07a814f0";
const ownerSession: ResolvedSession = {
  id: "session-id",
  role: "owner",
  subjectId: "owner",
};

const profile: AstrologerProfile = {
  id: astrologerId,
  displayName: "Anika Rao",
  email: "anika@example.com",
  expertise: [],
  languages: [],
  experienceYears: 0,
  isActive: true,
  isListed: true,
  mustChangePassword: true,
  createdAt: "2026-09-30T09:00:00Z",
};

const settings: OwnerSettings = {
  normalPricePaise: 0,
  urgentPricePaise: 30_000,
  subscriptionPricePaise: 99_900,
  subscriptionCallsPerPack: 4,
  normalDurationMin: 15,
  urgentDurationMin: 15,
  subscriptionDurationMin: 15,
};

function fakeOwners(): OwnerService {
  return {
    createAstrologer: vi.fn(async () => profile),
    getAstrologer: vi.fn(async () => profile),
    getSettings: vi.fn(async () => settings),
    listAstrologers: vi.fn(async () => [profile]),
    ownerExists: vi.fn(async () => true),
    resetAstrologerPassword: vi.fn(async () => undefined),
    setAstrologerActive: vi.fn(async () => profile),
    setAstrologerListed: vi.fn(async () => profile),
    updateAstrologer: vi.fn(async () => profile),
    updateSettings: vi.fn(async () => settings),
    verifyOwner: vi.fn(async () => ({ id: "owner" })),
  };
}

function fakeSessions(resolved: ResolvedSession | null = ownerSession): SessionManager {
  return {
    create: vi.fn(async () => "signed-session"),
    destroy: vi.fn(async () => undefined),
    resolve: vi.fn(async () => resolved),
  };
}

function testApp(owners = fakeOwners(), sessions = fakeSessions(), limiter = new LoginRateLimiter()) {
  const app = express();
  app.use(express.json());
  app.use(
    "/api/auth/owner",
    createOwnerAuthRouter({ owners, rateLimiter: limiter, sessions }),
  );
  app.use("/api/owner", createOwnerRouter({ owners, sessions }));
  return { app, owners, sessions };
}

describe("owner authentication", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
    process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
  });

  it("returns the same response for an unknown email and a wrong password", async () => {
    const owners = fakeOwners();
    owners.verifyOwner = vi.fn(async () => null);
    const { app } = testApp(owners);

    const unknown = await request(app)
      .post("/api/auth/owner/login")
      .send({ email: "unknown@example.com", password: "wrong-password" });
    const wrong = await request(app)
      .post("/api/auth/owner/login")
      .send({ email: "owner@example.com", password: "wrong-password" });

    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it("blocks the sixth failed attempt for the same email and IP", async () => {
    const owners = fakeOwners();
    owners.verifyOwner = vi.fn(async () => null);
    const { app } = testApp(owners);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(app)
        .post("/api/auth/owner/login")
        .send({ email: "owner@example.com", password: "wrong-password" });
      expect(response.status).toBe(401);
    }

    const blocked = await request(app)
      .post("/api/auth/owner/login")
      .send({ email: "owner@example.com", password: "wrong-password" });
    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBeDefined();
  });

  it("sets an httpOnly, SameSite=Lax owner cookie after login", async () => {
    const { app } = testApp();
    const response = await request(app)
      .post("/api/auth/owner/login")
      .send({ email: "owner@example.com", password: "correct-password" });
    const cookie = response.headers["set-cookie"]?.[0] ?? "";

    expect(response.status).toBe(200);
    expect(cookie).toContain("astrowebapp_owner_session=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/api/owner");
  });
});

describe("protected owner routes", () => {
  it("returns 401 without an owner session", async () => {
    const { app } = testApp(fakeOwners(), fakeSessions(null));
    const response = await request(app).get("/api/owner/astrologers");

    expect(response.status).toBe(401);
  });

  it("returns 401 for a session with the wrong role", async () => {
    const wrongRole: ResolvedSession = {
      ...ownerSession,
      role: "astrologer",
    };
    const { app } = testApp(fakeOwners(), fakeSessions(wrongRole));
    const response = await request(app).get("/api/owner/astrologers");

    expect(response.status).toBe(401);
  });

  it("rejects unexpected data on otherwise empty owner requests", async () => {
    const { app } = testApp();
    const query = await request(app).get("/api/owner/session?unexpected=true");
    const body = await request(app)
      .get("/api/owner/settings")
      .set("Content-Type", "application/json")
      .send({ unexpected: true });

    expect(query.status).toBe(400);
    expect(body.status).toBe(400);
  });

  it("deletes the server session on logout", async () => {
    const sessions = fakeSessions();
    const { app } = testApp(fakeOwners(), sessions);
    const response = await request(app)
      .post("/api/owner/logout")
      .set("Cookie", "astrowebapp_owner_session=signed-session")
      .send({});

    expect(response.status).toBe(204);
    expect(sessions.destroy).toHaveBeenCalledWith("owner", expect.any(String));
  });

  it("validates and creates an astrologer", async () => {
    const { app, owners } = testApp();
    const invalid = await request(app).post("/api/owner/astrologers").send({
      displayName: "Anika Rao",
      email: "anika@example.com",
      temporaryPassword: "short",
    });
    const valid = await request(app).post("/api/owner/astrologers").send({
      displayName: "Anika Rao",
      email: "ANIKA@example.com",
      temporaryPassword: "temporary-password",
    });

    expect(invalid.status).toBe(400);
    expect(valid.status).toBe(201);
    expect(owners.createAstrologer).toHaveBeenCalledWith({
      displayName: "Anika Rao",
      email: "anika@example.com",
      temporaryPassword: "temporary-password",
    });
  });

  it("routes every astrologer account mutation through the protected service", async () => {
    const { app, owners } = testApp();

    expect(
      (await request(app).patch(`/api/owner/astrologers/${astrologerId}`).send({
        displayName: "Anika Sharma",
        email: "anika@example.com",
      })).status,
    ).toBe(200);
    expect(
      (await request(app).patch(`/api/owner/astrologers/${astrologerId}/listing`).send({
        isListed: false,
      })).status,
    ).toBe(200);
    expect(
      (await request(app).patch(`/api/owner/astrologers/${astrologerId}/active`).send({
        isActive: false,
      })).status,
    ).toBe(200);
    expect(
      (await request(app).post(`/api/owner/astrologers/${astrologerId}/reset-password`).send({
        temporaryPassword: "another-temporary-password",
      })).status,
    ).toBe(200);

    expect(owners.updateAstrologer).toHaveBeenCalled();
    expect(owners.setAstrologerListed).toHaveBeenCalledWith(astrologerId, false);
    expect(owners.setAstrologerActive).toHaveBeenCalledWith(astrologerId, false);
    expect(owners.resetAstrologerPassword).toHaveBeenCalledWith(
      astrologerId,
      "another-temporary-password",
    );
  });

  it("accepts only supported durations and integer paise", async () => {
    const { app, owners } = testApp();
    const invalid = await request(app)
      .put("/api/owner/settings")
      .send({ ...settings, urgentDurationMin: 20 });
    const valid = await request(app)
      .put("/api/owner/settings")
      .send({ ...settings, urgentPricePaise: 35_000 });

    expect(invalid.status).toBe(400);
    expect(valid.status).toBe(200);
    expect(owners.updateSettings).toHaveBeenCalledWith({
      ...settings,
      urgentPricePaise: 35_000,
    });
  });
});

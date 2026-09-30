import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginRateLimiter } from "../src/auth/login-rate-limit";
import type { ResolvedSession, SessionManager } from "../src/auth/session";
import {
  AstrologerPasswordStateError,
  type AstrologerOwnProfile,
  type AstrologerService,
} from "../src/astrologer/astrologer-service";
import { createAstrologerRouter } from "./Astrologer";
import { createAstrologerAuthRouter } from "./AstrologerAuth";

const astrologerId = "ee6438fd-fc87-4d4c-a3ec-ebac07a814f0";
const astrologerSession: ResolvedSession = {
  id: "session-id",
  role: "astrologer",
  subjectId: astrologerId,
};

const profile: AstrologerOwnProfile = {
  id: astrologerId,
  email: "anika@example.com",
  displayName: "Anika Rao",
  expertise: ["Vedic"],
  languages: ["Hindi", "English"],
  experienceYears: 8,
  profileSavedAt: null,
};

function fakeAstrologers(): AstrologerService {
  return {
    astrologerIsActive: vi.fn(async () => true),
    getProfile: vi.fn(async () => profile),
    getSessionState: vi.fn(async () => ({ id: astrologerId, mustChangePassword: false })),
    replaceTemporaryPassword: vi.fn(async () => undefined),
    saveProfile: vi.fn(async () => profile),
    verifyAstrologer: vi.fn(async () => ({ id: astrologerId, mustChangePassword: false })),
  };
}

function fakeSessions(resolved: ResolvedSession | null = astrologerSession): SessionManager {
  return {
    create: vi.fn(async () => "signed-session"),
    destroy: vi.fn(async () => undefined),
    resolve: vi.fn(async () => resolved),
  };
}

function testApp(
  astrologers = fakeAstrologers(),
  sessions = fakeSessions(),
  limiter = new LoginRateLimiter(),
) {
  const app = express();
  app.use(express.json());
  app.use(
    "/api/auth/astrologer",
    createAstrologerAuthRouter({ astrologers, rateLimiter: limiter, sessions }),
  );
  app.use("/api/astrologer", createAstrologerRouter({ astrologers, sessions }));
  return { app, astrologers, sessions };
}

describe("astrologer authentication", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
    process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
  });

  it("uses the same response for an unknown, incorrect or deactivated account", async () => {
    const astrologers = fakeAstrologers();
    astrologers.verifyAstrologer = vi.fn(async () => null);
    const { app } = testApp(astrologers);

    const unknown = await request(app).post("/api/auth/astrologer/login").send({
      email: "unknown@example.com",
      password: "incorrect-password",
    });
    const unavailable = await request(app).post("/api/auth/astrologer/login").send({
      email: "anika@example.com",
      password: "incorrect-password",
    });

    expect(unknown.status).toBe(401);
    expect(unavailable.status).toBe(401);
    expect(unknown.body).toEqual(unavailable.body);
  });

  it("blocks the sixth failed attempt for one email and IP", async () => {
    const astrologers = fakeAstrologers();
    astrologers.verifyAstrologer = vi.fn(async () => null);
    const { app } = testApp(astrologers);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(app).post("/api/auth/astrologer/login").send({
        email: "anika@example.com",
        password: "incorrect-password",
      });
      expect(response.status).toBe(401);
    }

    const blocked = await request(app).post("/api/auth/astrologer/login").send({
      email: "anika@example.com",
      password: "incorrect-password",
    });
    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBeDefined();
  });

  it("sets a 12-hour astrologer cookie for all paths", async () => {
    const { app } = testApp();
    const response = await request(app).post("/api/auth/astrologer/login").send({
      email: "anika@example.com",
      password: "temporary-password",
    });
    const cookie = response.headers["set-cookie"]?.[0] ?? "";

    expect(response.status).toBe(200);
    expect(cookie).toContain("astrowebapp_astrologer_session=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=43200");
  });
});

describe("protected astrologer routes", () => {
  it("rejects missing, wrong-role and inactive sessions", async () => {
    const missing = testApp(fakeAstrologers(), fakeSessions(null));
    expect((await request(missing.app).get("/api/astrologer/session")).status).toBe(401);

    const wrongRole = fakeSessions({ ...astrologerSession, role: "owner" });
    expect((await request(testApp(fakeAstrologers(), wrongRole).app).get("/api/astrologer/session")).status).toBe(401);

    const inactive = fakeAstrologers();
    inactive.astrologerIsActive = vi.fn(async () => false);
    expect((await request(testApp(inactive).app).get("/api/astrologer/session")).status).toBe(401);
  });

  it("reports the password gate and deletes the session on logout", async () => {
    const astrologers = fakeAstrologers();
    astrologers.getSessionState = vi.fn(async () => ({ id: astrologerId, mustChangePassword: true }));
    const sessions = fakeSessions();
    const { app } = testApp(astrologers, sessions);

    const state = await request(app).get("/api/astrologer/session");
    const logout = await request(app)
      .post("/api/astrologer/logout")
      .set("Cookie", "astrowebapp_astrologer_session=signed-session")
      .send({});

    expect(state.body).toEqual({ authenticated: true, mustChangePassword: true });
    expect(logout.status).toBe(204);
    expect(sessions.destroy).toHaveBeenCalledWith("astrologer", expect.any(String));
  });

  it("requires a 10-character replacement password and rotates the session", async () => {
    const { app, astrologers, sessions } = testApp();
    const short = await request(app).put("/api/astrologer/password").send({ newPassword: "short" });
    const valid = await request(app).put("/api/astrologer/password").send({
      newPassword: "private-new-password",
    });

    expect(short.status).toBe(400);
    expect(valid.status).toBe(200);
    expect(astrologers.replaceTemporaryPassword).toHaveBeenCalledWith(
      astrologerId,
      "private-new-password",
    );
    expect(sessions.create).toHaveBeenCalledWith("astrologer", astrologerId);
  });

  it("blocks profile access until the temporary password is replaced", async () => {
    const astrologers = fakeAstrologers();
    astrologers.getProfile = vi.fn(async () => {
      throw new AstrologerPasswordStateError("Set a new password before continuing.");
    });
    const response = await request(testApp(astrologers).app).get("/api/astrologer/profile");

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("Set a new password before continuing.");
  });

  it("validates and saves only the signed-in astrologer's profile", async () => {
    const { app, astrologers } = testApp();
    const invalid = await request(app).put("/api/astrologer/profile").send({
      displayName: "Anika Rao",
      expertise: ["Vedic"],
      languages: ["Hindi"],
      experienceYears: 61,
    });
    const valid = await request(app).put("/api/astrologer/profile").send({
      displayName: " Anika Rao ",
      expertise: ["Vedic", "vedic", "Tarot"],
      languages: ["Hindi", "English"],
      experienceYears: 8,
    });

    expect(invalid.status).toBe(400);
    expect(valid.status).toBe(200);
    expect(astrologers.saveProfile).toHaveBeenCalledWith(astrologerId, {
      displayName: "Anika Rao",
      expertise: ["Vedic", "Tarot"],
      languages: ["Hindi", "English"],
      experienceYears: 8,
    });
  });
});

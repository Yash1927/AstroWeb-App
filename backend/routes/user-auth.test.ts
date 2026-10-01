import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionManager } from "../src/auth/session";
import type { GoogleIdentityVerifier } from "../src/user/google-identity";
import type { UserService } from "../src/user/user-service";
import { createUserAuthRouter, safeContinuation } from "./UserAuth";

const userId = "30f7af37-09f6-47d3-b24a-508d718f17c1";

function fakeSessions(): SessionManager {
  return {
    create: vi.fn(async () => "signed-user-session"),
    destroy: vi.fn(async () => undefined),
    resolve: vi.fn(async () => null),
  };
}

function fakeVerifier(identity: Awaited<ReturnType<GoogleIdentityVerifier["verify"]>> = {
  sub: "google-subject",
  email: "maya@example.com",
  name: "Maya Shah",
}): GoogleIdentityVerifier {
  return { verify: vi.fn(async () => identity) };
}

function fakeUsers(): Pick<UserService, "findOrCreateGoogleUser"> {
  return { findOrCreateGoogleUser: vi.fn(async () => ({ id: userId })) };
}

function testApp(
  identities = fakeVerifier(),
  sessions = fakeSessions(),
  users = fakeUsers(),
) {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", createUserAuthRouter({
    appOrigin: () => "http://localhost:5173",
    identities,
    sessions,
    users,
  }));
  return { app, identities, sessions, users };
}

function googlePost(app: express.Express, overrides: Record<string, string> = {}) {
  return request(app)
    .post("/api/auth/google")
    .set("Cookie", "g_csrf_token=matching-token")
    .type("form")
    .send({
      credential: "google-id-token",
      g_csrf_token: "matching-token",
      state: "/history",
      ...overrides,
    });
}

describe("Google redirect authentication", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
    process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
  });

  it("rejects a missing or mismatched double-submit CSRF token before token verification", async () => {
    const { app, identities } = testApp();
    const missing = await request(app).post("/api/auth/google").type("form").send({
      credential: "google-id-token",
      g_csrf_token: "matching-token",
    });
    const mismatch = await googlePost(app, { g_csrf_token: "different-token" });

    expect(missing.status).toBe(400);
    expect(mismatch.status).toBe(400);
    expect(identities.verify).not.toHaveBeenCalled();
  });

  it("rejects an ID token that the verified-email identity boundary does not accept", async () => {
    const { app, users } = testApp(fakeVerifier(null));
    const response = await googlePost(app);

    expect(response.status).toBe(401);
    expect(users.findOrCreateGoogleUser).not.toHaveBeenCalled();
  });

  it("finds or creates by verified identity, starts a 30-day session and returns to state", async () => {
    const identities = fakeVerifier();
    const sessions = fakeSessions();
    const users = fakeUsers();
    const { app } = testApp(identities, sessions, users);
    const response = await googlePost(app, {
      state: "/?bookingAstrologer=astro-id&callType=urgent",
    });
    const cookie = response.headers["set-cookie"]?.[0] ?? "";

    expect(response.status).toBe(303);
    expect(response.headers.location).toBe(
      "http://localhost:5173/?bookingAstrologer=astro-id&callType=urgent",
    );
    expect(users.findOrCreateGoogleUser).toHaveBeenCalledWith({
      sub: "google-subject",
      email: "maya@example.com",
      name: "Maya Shah",
    });
    expect(sessions.create).toHaveBeenCalledWith("user", userId);
    expect(cookie).toContain("astrowebapp_user_session=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=2592000");
  });

  it("does not allow an external continuation URL", async () => {
    expect(safeContinuation("https://evil.example/path", "http://localhost:5173")).toBe("/");
    expect(safeContinuation("//evil.example/path", "http://localhost:5173")).toBe("/");

    const response = await googlePost(testApp().app, {
      state: "https://evil.example/path",
    });
    expect(response.headers.location).toBe("http://localhost:5173/");
  });
});


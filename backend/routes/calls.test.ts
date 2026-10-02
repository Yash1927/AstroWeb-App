import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type {
  ResolvedSession,
  SessionManager,
  SessionRole,
} from "../src/auth/session";
import { RealtimeBookingUnavailableError } from "../src/realtime/booking-service";
import type { IceServerService } from "../src/realtime/ice-server-service";
import { createCallsRouter } from "./Calls";

const bookingId = "1c10ff39-56b3-4c86-9fa4-a8cb17d4a7df";
const userSession: ResolvedSession = {
  id: "user-session",
  role: "user",
  subjectId: "user-1",
};
const astrologerSession: ResolvedSession = {
  id: "astrologer-session",
  role: "astrologer",
  subjectId: "astrologer-1",
};

function fakeSessions(resolved: Partial<Record<"user" | "astrologer", ResolvedSession>> = {}) {
  return {
    create: vi.fn(),
    destroy: vi.fn(),
    resolve: vi.fn(async (role: SessionRole) => (
      role === "owner" ? null : resolved[role] ?? null
    )),
  } satisfies SessionManager;
}

function fakeIceServers(allowedSubject = "user-1") {
  return {
    getIceServers: vi.fn(async ({ subjectId }) => {
      if (subjectId !== allowedSubject) throw new RealtimeBookingUnavailableError();
      return [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: ["turn:turn.example.test:3478"],
          username: `1790850000:${bookingId}`,
          credential: "short-lived-credential",
        },
      ];
    }),
  } satisfies IceServerService;
}

function testApp(sessions: SessionManager, iceServers: IceServerService) {
  const app = express();
  app.use(express.json());
  app.use("/api", createCallsRouter({ sessions, iceServers }));
  return app;
}

describe("GET /api/calls/:bookingId/ice-servers", () => {
  it("requires a user or astrologer session", async () => {
    const response = await request(testApp(fakeSessions(), fakeIceServers()))
      .get(`/api/calls/${bookingId}/ice-servers`);
    expect(response.status).toBe(401);
  });

  it("returns credentials only after booking-specific authorization", async () => {
    const iceServers = fakeIceServers();
    const response = await request(testApp(
      fakeSessions({ user: userSession }),
      iceServers,
    )).get(`/api/calls/${bookingId}/ice-servers`);

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body.iceServers).toHaveLength(2);
    expect(iceServers.getIceServers).toHaveBeenCalledWith({
      bookingId,
      participant: "user",
      subjectId: "user-1",
    });
  });

  it("accepts the booking's astrologer session independently", async () => {
    const iceServers = fakeIceServers("astrologer-1");
    const response = await request(testApp(
      fakeSessions({ astrologer: astrologerSession }),
      iceServers,
    )).get(`/api/calls/${bookingId}/ice-servers`);

    expect(response.status).toBe(200);
    expect(iceServers.getIceServers).toHaveBeenCalledWith({
      bookingId,
      participant: "astrologer",
      subjectId: "astrologer-1",
    });
  });

  it("conceals a foreign booking and strictly validates the request", async () => {
    const app = testApp(
      fakeSessions({ user: { ...userSession, subjectId: "another-user" } }),
      fakeIceServers(),
    );
    expect((await request(app).get(`/api/calls/${bookingId}/ice-servers`)).status).toBe(404);
    expect((await request(app).get("/api/calls/not-a-uuid/ice-servers")).status).toBe(400);
    expect((await request(app).get(`/api/calls/${bookingId}/ice-servers?extra=yes`)).status)
      .toBe(400);
  });
});

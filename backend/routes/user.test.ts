import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { ResolvedSession, SessionManager } from "../src/auth/session";
import type {
  BookingHistoryService,
  UserBookingCard,
} from "../src/booking-history/booking-history-service";
import type { UserDetails, UserService } from "../src/user/user-service";
import { createUserRouter } from "./User";

const userId = "30f7af37-09f6-47d3-b24a-508d718f17c1";
const otherUserId = "27368532-c560-458d-aed6-73a7eb260cfe";
const ownBookingId = "ca0c20ac-70d3-4218-b7d1-95bb4e269fab";
const otherBookingId = "e267b980-0fd1-4df1-894e-535d1a1458bc";
const session: ResolvedSession = { id: "session-id", role: "user", subjectId: userId };
const user: UserDetails = {
  id: userId,
  email: "maya@example.com",
  name: "Maya Shah",
  birthDate: "1991-08-17",
  birthTime: "05:30",
  birthPlace: "Jaipur",
  phone: null,
  gender: "female",
  subscriptionCredits: 0,
  detailsComplete: true,
};

function fakeSessions(resolved: ResolvedSession | null = session): SessionManager {
  return {
    create: vi.fn(async () => "signed-session"),
    destroy: vi.fn(async () => undefined),
    resolve: vi.fn(async () => resolved),
  };
}

function fakeUsers(): UserService {
  return {
    findOrCreateGoogleUser: vi.fn(async () => ({ id: userId })),
    getUser: vi.fn(async () => user),
    updateUser: vi.fn(async () => user),
    userExists: vi.fn(async (id) => id === userId),
  };
}

function ownBooking(): UserBookingCard {
  return {
    id: ownBookingId,
    astrologer: { id: "fd0059ad-79e4-435f-b5bf-7e11ef5cfd55", displayName: "Anika Rao" },
    callType: "normal",
    callMode: "in_app",
    startsAt: "2026-10-02T04:30:00Z",
    endsAt: "2026-10-02T04:45:00Z",
    durationMin: 15,
    pricePaise: 0,
    usedCredit: false,
    status: "upcoming",
    endedStatus: "missed",
    phone: null,
  };
}

function fakeBookings(): BookingHistoryService {
  return {
    listUserBookings: vi.fn(async () => ({ upcoming: [ownBooking()], past: [] })),
    getUserBooking: vi.fn(async (requestedUserId, bookingId) => (
      requestedUserId === userId && bookingId === ownBookingId ? ownBooking() : null
    )),
    listAstrologerBookings: vi.fn(async () => ({ upcoming: [], past: [] })),
    getAstrologerBooking: vi.fn(async () => null),
  };
}

function testApp(
  users = fakeUsers(),
  sessions = fakeSessions(),
  bookings = fakeBookings(),
) {
  const app = express();
  app.use(express.json());
  app.use("/api", createUserRouter({ bookings, sessions, users }));
  return { app, bookings, sessions, users };
}

describe("self-only user details", () => {
  it("rejects missing and wrong-role sessions", async () => {
    expect((await request(testApp(fakeUsers(), fakeSessions(null)).app).get("/api/me")).status)
      .toBe(401);
    expect((await request(testApp(fakeUsers(), fakeSessions({
      ...session,
      role: "astrologer",
    })).app).get("/api/me")).status).toBe(401);
  });

  it("reads and updates only the session subject", async () => {
    const { app, users } = testApp();
    const loaded = await request(app).get("/api/me");
    const updated = await request(app).put("/api/me").send({
      name: "Maya Shah",
      birthDate: "1991-08-17",
      birthTime: "05:30",
      birthPlace: "Udaipur",
      phone: "+919876543210",
      gender: "female",
    });

    expect(loaded.status).toBe(200);
    expect(loaded.body.user.email).toBe("maya@example.com");
    expect(updated.status).toBe(200);
    expect(users.getUser).toHaveBeenCalledWith(userId);
    expect(users.updateUser).toHaveBeenCalledWith(userId, expect.objectContaining({
      birthPlace: "Udaipur",
    }));
    expect(users.updateUser).not.toHaveBeenCalledWith(otherUserId, expect.anything());
  });

  it("enforces required details, past dates and Indian phone numbers", async () => {
    const { app, users } = testApp();
    const response = await request(app).put("/api/me").send({
      name: "M",
      birthDate: "9999-01-01",
      birthTime: "25:00",
      birthPlace: "",
      phone: "12345",
      gender: "unspecified",
    });

    expect(response.status).toBe(400);
    expect(users.updateUser).not.toHaveBeenCalled();
  });

  it("deletes the current server session and clears the user cookie", async () => {
    const { app, sessions } = testApp();
    const response = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", "astrowebapp_user_session=signed-session")
      .send({});

    expect(response.status).toBe(204);
    expect(sessions.destroy).toHaveBeenCalledWith("user", expect.any(String));
    expect(response.headers["set-cookie"]?.[0]).toContain("Path=/");
  });

  it("does not let user A read user B's booking", async () => {
    const bookings = fakeBookings();
    const { app } = testApp(fakeUsers(), fakeSessions(), bookings);

    const own = await request(app).get(`/api/me/bookings/${ownBookingId}`);
    const someoneElses = await request(app).get(`/api/me/bookings/${otherBookingId}`);

    expect(own.status).toBe(200);
    expect(someoneElses.status).toBe(404);
    expect(bookings.getUserBooking).toHaveBeenNthCalledWith(1, userId, ownBookingId);
    expect(bookings.getUserBooking).toHaveBeenNthCalledWith(2, userId, otherBookingId);
    expect(bookings.getUserBooking).not.toHaveBeenCalledWith(otherUserId, expect.anything());
  });
});


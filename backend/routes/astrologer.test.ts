import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginRateLimiter } from "../src/auth/login-rate-limit";
import type { ResolvedSession, SessionManager } from "../src/auth/session";
import type {
  AstrologerBookingCard,
  BookingHistoryService,
} from "../src/booking-history/booking-history-service";
import type { AvailabilityService } from "../src/availability/availability-service";
import {
  AstrologerPasswordStateError,
  type AstrologerOwnProfile,
  type AstrologerService,
} from "../src/astrologer/astrologer-service";
import { createAstrologerRouter } from "./Astrologer";
import { createAstrologerAuthRouter } from "./AstrologerAuth";
import { BlogMediaValidationError, type BlogService } from "../src/blog/blog-service";
import type { MediaService } from "../src/media/media-service";
import { MediaUploadRateLimiter } from "../src/media/media-upload-rate-limit";

const astrologerId = "ee6438fd-fc87-4d4c-a3ec-ebac07a814f0";
const ownBookingId = "4090cd52-cb14-4167-834d-ee7024fd9bda";
const otherBookingId = "1711caca-06f0-4b99-b0da-51de56be7799";
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

function fakeAvailability(): AvailabilityService {
  return {
    getAvailability: vi.fn(async () => ({ weekly: [], exceptions: [] })),
    saveAvailability: vi.fn(async (_id, input) => ({
      ...input,
      displacedBookingCount: 0,
    })),
  };
}

function ownBooking(): AstrologerBookingCard {
  return {
    id: ownBookingId,
    callType: "normal",
    callMode: "in_app",
    startsAt: "2026-10-02T04:30:00Z",
    endsAt: "2026-10-02T04:45:00Z",
    durationMin: 15,
    pricePaise: 0,
    usedCredit: false,
    status: "upcoming",
    endedStatus: "missed",
    user: {
      id: "1d0f2227-690e-49e4-bd96-06440f358424",
      name: "Maya Shah",
      birthDate: "1991-08-17",
      birthTime: "05:30",
      birthPlace: "Jaipur",
      gender: "female",
      phone: "+919876543210",
    },
  };
}

function fakeBookings(): BookingHistoryService {
  return {
    listAstrologerBookings: vi.fn(async (requestedAstrologerId) => (
      requestedAstrologerId === astrologerId
        ? { upcoming: [ownBooking()], past: [] }
        : { upcoming: [], past: [] }
    )),
    getAstrologerBooking: vi.fn(async (requestedAstrologerId, bookingId) => (
      requestedAstrologerId === astrologerId && bookingId === ownBookingId
        ? ownBooking()
        : null
    )),
    listUserBookings: vi.fn(async () => ({
      upcoming: [],
      past: [],
      subscriptionCredits: 0,
    })),
    getUserBooking: vi.fn(async () => null),
  };
}

function fakeBlogs(): BlogService {
  return {
    createComment: vi.fn(),
    deleteAstrologerComment: vi.fn(async () => undefined),
    deleteAstrologerPost: vi.fn(async () => undefined),
    deleteOwnerComment: vi.fn(),
    deleteUserComment: vi.fn(),
    getPublishedPost: vi.fn(),
    listAstrologerPosts: vi.fn(async () => []),
    listPublishedPosts: vi.fn(),
    listRecentComments: vi.fn(),
    saveAstrologerPost: vi.fn(async (_astrologerId, id, input) => ({
      id: id ?? "43f7d52f-98aa-4f2d-bc32-3baa7382080f",
      ...input,
      publishedAt: input.status === "published" ? "2026-10-02T08:00:00Z" : null,
      createdAt: "2026-10-02T08:00:00Z",
      updatedAt: "2026-10-02T08:00:00Z",
      likeCount: 0,
      commentCount: 0,
      comments: [],
    })),
    toggleLike: vi.fn(),
  };
}

function fakeMedia() {
  return {
    deleteOwnAsset: vi.fn(async () => undefined),
    removeOwnProfile: vi.fn(async () => undefined),
    removeProfileAsOwner: vi.fn(async () => undefined),
    uploadBlogImage: vi.fn(async () => ({
      id: "6fab01f4-20a8-4822-9de2-8d625ca26d29",
      kind: "blog_image" as const,
      url: "https://media.example.test/blog.webp",
      width: 1200,
      height: 800,
      bytes: 1234,
      createdAt: "2026-10-03T08:00:00Z",
    })),
    uploadProfile: vi.fn(async () => ({
      id: "8c86ca4e-bde2-4f69-b983-021772311986",
      kind: "profile_photo" as const,
      url: "https://media.example.test/profile.webp",
      width: 512,
      height: 512,
      bytes: 900,
      createdAt: "2026-10-03T08:00:00Z",
    })),
  };
}

function testApp(
  astrologers = fakeAstrologers(),
  sessions = fakeSessions(),
  limiter = new LoginRateLimiter(),
  availability = fakeAvailability(),
  bookings = fakeBookings(),
  blogs = fakeBlogs(),
  media = fakeMedia(),
  uploadRateLimiter = new MediaUploadRateLimiter(),
) {
  const app = express();
  app.use(express.json());
  app.use(
    "/api/auth/astrologer",
    createAstrologerAuthRouter({ astrologers, rateLimiter: limiter, sessions }),
  );
  app.use(
    "/api/astrologer",
    createAstrologerRouter({ astrologers, availability, bookings, blogs, media: media as unknown as MediaService, uploadRateLimiter, sessions }),
  );
  return { app, astrologers, availability, bookings, blogs, media, sessions };
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

  it("does not let a user session call any astrologer route that takes an id", async () => {
    const bookings = fakeBookings();
    const blogs = fakeBlogs();
    const media = fakeMedia();
    const userSession: ResolvedSession = { id: "user-session", role: "user", subjectId: "user-1" };
    const { app } = testApp(
      fakeAstrologers(),
      fakeSessions(userSession),
      new LoginRateLimiter(),
      fakeAvailability(),
      bookings,
      blogs,
      media,
    );
    const blogId = "43f7d52f-98aa-4f2d-bc32-3baa7382080f";
    const commentId = "8b834d55-89c3-47d2-ab28-b8373842fd40";
    const mediaId = "6fab01f4-20a8-4822-9de2-8d625ca26d29";
    const responses = await Promise.all([
      request(app).get(`/api/astrologer/bookings/${ownBookingId}`),
      request(app).put(`/api/astrologer/blogs/${blogId}`).send({}),
      request(app).delete(`/api/astrologer/blogs/${blogId}`),
      request(app).delete(`/api/astrologer/blogs/${blogId}/comments/${commentId}`),
      request(app).delete(`/api/astrologer/media/${mediaId}`),
    ]);

    expect(responses.every((response) => response.status === 401)).toBe(true);
    expect(bookings.getAstrologerBooking).not.toHaveBeenCalled();
    expect(blogs.saveAstrologerPost).not.toHaveBeenCalled();
    expect(blogs.deleteAstrologerPost).not.toHaveBeenCalled();
    expect(blogs.deleteAstrologerComment).not.toHaveBeenCalled();
    expect(media.deleteOwnAsset).not.toHaveBeenCalled();
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

  it("keeps availability, bookings and blogs behind the temporary-password gate", async () => {
    const astrologers = fakeAstrologers();
    astrologers.getSessionState = vi.fn(async () => ({
      id: astrologerId,
      mustChangePassword: true,
    }));
    const availability = fakeAvailability();
    const bookings = fakeBookings();
    const blogs = fakeBlogs();
    const { app } = testApp(
      astrologers,
      fakeSessions(),
      new LoginRateLimiter(),
      availability,
      bookings,
      blogs,
    );

    const availabilityResponse = await request(app).get("/api/astrologer/availability");
    const bookingsResponse = await request(app).get("/api/astrologer/bookings");
    const blogsResponse = await request(app).get("/api/astrologer/blogs");

    expect(availabilityResponse.status).toBe(409);
    expect(bookingsResponse.status).toBe(409);
    expect(blogsResponse.status).toBe(409);
    expect(availability.getAvailability).not.toHaveBeenCalled();
    expect(bookings.listAstrologerBookings).not.toHaveBeenCalled();
    expect(blogs.listAstrologerPosts).not.toHaveBeenCalled();
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

  it("reads and replaces only the signed-in astrologer's availability", async () => {
    const availability = fakeAvailability();
    const { app } = testApp(fakeAstrologers(), fakeSessions(), new LoginRateLimiter(), availability);
    const read = await request(app).get("/api/astrologer/availability");
    const invalid = await request(app).put("/api/astrologer/availability").send({
      weekly: [
        { weekday: 1, startTime: "09:00", endTime: "12:00" },
        { weekday: 1, startTime: "11:00", endTime: "13:00" },
      ],
      exceptions: [],
    });
    const validBody = {
      weekly: [{ weekday: 1, startTime: "09:00", endTime: "12:00" }],
      exceptions: [{
        date: "2026-10-05",
        kind: "blocked" as const,
        startTime: null,
        endTime: null,
      }],
    };
    const valid = await request(app).put("/api/astrologer/availability").send(validBody);

    expect(read.status).toBe(200);
    expect(invalid.status).toBe(400);
    expect(valid.status).toBe(200);
    expect(availability.getAvailability).toHaveBeenCalledWith(astrologerId);
    expect(availability.saveAvailability).toHaveBeenCalledWith(astrologerId, validBody);
  });

  it("does not expose another astrologer's booking or any user email", async () => {
    const bookings = fakeBookings();
    const { app } = testApp(
      fakeAstrologers(),
      fakeSessions(),
      new LoginRateLimiter(),
      fakeAvailability(),
      bookings,
    );

    const list = await request(app).get("/api/astrologer/bookings");
    const someoneElses = await request(app).get(`/api/astrologer/bookings/${otherBookingId}`);

    expect(list.status).toBe(200);
    expect(list.body.upcoming).toHaveLength(1);
    expect(JSON.stringify(list.body)).not.toContain("email");
    expect(someoneElses.status).toBe(404);
    expect(bookings.listAstrologerBookings).toHaveBeenCalledWith(astrologerId);
    expect(bookings.getAstrologerBooking).toHaveBeenCalledWith(astrologerId, otherBookingId);
  });

  it("scopes blog writes and comment deletion to the signed-in astrologer", async () => {
    const blogs = fakeBlogs();
    const { app } = testApp(
      fakeAstrologers(),
      fakeSessions(),
      new LoginRateLimiter(),
      fakeAvailability(),
      fakeBookings(),
      blogs,
    );
    const blogId = "43f7d52f-98aa-4f2d-bc32-3baa7382080f";
    const commentId = "8b834d55-89c3-47d2-ab28-b8373842fd40";
    const created = await request(app).post("/api/astrologer/blogs").send({
      title: " A gentle guide ",
      body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Plain text only." }] }] },
      coverMediaId: null,
      status: "draft",
    });
    const removed = await request(app).delete(`/api/astrologer/blogs/${blogId}/comments/${commentId}`);

    expect(created.status).toBe(201);
    expect(removed.status).toBe(204);
    expect(blogs.saveAstrologerPost).toHaveBeenCalledWith(astrologerId, null, {
      title: "A gentle guide",
      body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Plain text only." }] }] },
      coverMediaId: null,
      status: "draft",
    });
    expect(blogs.deleteAstrologerComment).toHaveBeenCalledWith(astrologerId, blogId, commentId);
  });

  it("returns the specific blog validation message to the editor", async () => {
    const { app, blogs } = testApp();
    const response = await request(app).post("/api/astrologer/blogs").send({
      title: "A gentle guide",
      body: { type: "doc", content: [{ type: "video" }] },
      coverMediaId: null,
      status: "draft",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "The post contains an unsupported block." });
    expect(blogs.saveAstrologerPost).not.toHaveBeenCalled();
  });

  it("returns 400 when a blog image is not owned by the signed-in astrologer", async () => {
    const blogs = fakeBlogs();
    blogs.saveAstrologerPost = vi.fn(async () => {
      throw new BlogMediaValidationError("Every image must belong to this astrologer.");
    });
    const { app } = testApp(
      fakeAstrologers(),
      fakeSessions(),
      new LoginRateLimiter(),
      fakeAvailability(),
      fakeBookings(),
      blogs,
    );
    const response = await request(app).post("/api/astrologer/blogs").send({
      title: "A gentle guide",
      body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Body" }] }] },
      coverMediaId: null,
      status: "draft",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Every image must belong to this astrologer." });
  });

  it("scopes profile removal and blog media deletion to the signed-in astrologer", async () => {
    const media = fakeMedia();
    const { app } = testApp(
      fakeAstrologers(),
      fakeSessions(),
      new LoginRateLimiter(),
      fakeAvailability(),
      fakeBookings(),
      fakeBlogs(),
      media,
    );
    const mediaId = "6fab01f4-20a8-4822-9de2-8d625ca26d29";

    expect((await request(app).delete("/api/astrologer/profile/photo")).status).toBe(204);
    expect((await request(app).delete(`/api/astrologer/media/${mediaId}`)).status).toBe(204);
    expect(media.removeOwnProfile).toHaveBeenCalledWith(astrologerId);
    expect(media.deleteOwnAsset).toHaveBeenCalledWith(astrologerId, mediaId);
  });

  it("does not reach media storage without an astrologer session", async () => {
    const media = fakeMedia();
    const { app } = testApp(
      fakeAstrologers(),
      fakeSessions(null),
      new LoginRateLimiter(),
      fakeAvailability(),
      fakeBookings(),
      fakeBlogs(),
      media,
    );

    expect((await request(app).delete("/api/astrologer/profile/photo")).status).toBe(401);
    expect((await request(app).post("/api/astrologer/profile/photo").attach("image", Buffer.from("image"), "photo.png")).status).toBe(401);
    expect(media.removeOwnProfile).not.toHaveBeenCalled();
    expect(media.uploadProfile).not.toHaveBeenCalled();
  });

  it("rate-limits profile and blog image uploads before reading another file", async () => {
    const media = fakeMedia();
    const limiter = new MediaUploadRateLimiter({ limit: 1, windowMs: 60_000 });
    const { app } = testApp(
      fakeAstrologers(),
      fakeSessions(),
      new LoginRateLimiter(),
      fakeAvailability(),
      fakeBookings(),
      fakeBlogs(),
      media,
      limiter,
    );

    const first = await request(app)
      .post("/api/astrologer/profile/photo")
      .attach("image", Buffer.from("first"), "photo.png");
    const blocked = await request(app)
      .post("/api/astrologer/blog-images")
      .attach("image", Buffer.from("second"), "blog.png");

    expect(first.status).toBe(201);
    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBe("60");
    expect(media.uploadProfile).toHaveBeenCalledOnce();
    expect(media.uploadBlogImage).not.toHaveBeenCalled();
  });
});

import { Router, type Response } from "express";
import { requireUser } from "../src/auth/require-user";
import {
  bookingHistoryService,
  type BookingHistoryService,
} from "../src/booking-history/booking-history-service";
import { bookingHistoryParamsSchema } from "../src/booking-history/booking-history-schemas";
import {
  clearSessionCookieOptions,
  sessionConfigs,
  sessionManager,
  type SessionManager,
} from "../src/auth/session";
import { emptyObjectSchema, parseOrRespond } from "../src/http/validation";
import { userDetailsSchema } from "../src/user/user-schemas";
import {
  UserNotFoundError,
  userService,
  type UserService,
} from "../src/user/user-service";

type Dependencies = {
  bookings: BookingHistoryService;
  sessions: SessionManager;
  users: UserService;
};

function respondWithUserError(error: unknown, response: Response) {
  if (error instanceof UserNotFoundError) {
    response.status(404).json({ error: error.message });
    return;
  }
  response.status(503).json({ error: "The service is unavailable. Please try again." });
}

export function createUserRouter({ bookings, sessions, users }: Dependencies) {
  const router = Router();
  const userGuard = requireUser(sessions, users);

  router.get("/me", userGuard, async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      response.json({ user: await users.getUser(response.locals.userSession.subjectId) });
    } catch (error) {
      respondWithUserError(error, response);
    }
  });

  router.put("/me", userGuard, async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    const body = parseOrRespond(userDetailsSchema, request.body, response);
    if (!body) return;

    try {
      response.json({
        user: await users.updateUser(response.locals.userSession.subjectId, body),
      });
    } catch (error) {
      respondWithUserError(error, response);
    }
  });

  router.get("/me/bookings", userGuard, async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      response.json(await bookings.listUserBookings(response.locals.userSession.subjectId));
    } catch {
      response.status(503).json({ error: "Bookings are unavailable. Please try again." });
    }
  });

  router.get("/me/bookings/:bookingId", userGuard, async (request, response) => {
    const params = parseOrRespond(bookingHistoryParamsSchema, request.params, response);
    if (!params) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      const booking = await bookings.getUserBooking(
        response.locals.userSession.subjectId,
        params.bookingId,
      );
      if (!booking) {
        response.status(404).json({ error: "Booking not found." });
        return;
      }
      response.json({ booking });
    } catch {
      response.status(503).json({ error: "The booking is unavailable. Please try again." });
    }
  });

  router.post("/auth/logout", userGuard, async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      await sessions.destroy("user", request.headers.cookie);
      response.clearCookie(
        sessionConfigs.user.cookieName,
        clearSessionCookieOptions("user"),
      );
      response.status(204).end();
    } catch {
      response.status(503).json({ error: "The service is unavailable. Please try again." });
    }
  });

  return router;
}

export default createUserRouter({
  bookings: bookingHistoryService,
  sessions: sessionManager,
  users: userService,
});

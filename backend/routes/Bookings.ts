import { Router, type Response } from "express";
import { requireUser } from "../src/auth/require-user";
import { sessionManager, type SessionManager } from "../src/auth/session";
import {
  BookingAstrologerNotFoundError,
  BookingFreeNormalLimitError,
  BookingOverlapError,
  BookingPhoneRequiredError,
  BookingSlotUnavailableError,
  BookingUserDetailsIncompleteError,
  bookingService,
  type BookingService,
} from "../src/booking/booking-service";
import { createBookingSchema } from "../src/booking/booking-schemas";
import { bookingRateLimiter, type BookingRateLimiter } from "../src/booking/booking-rate-limit";
import { emptyObjectSchema, parseOrRespond } from "../src/http/validation";
import { logRouteError } from "../src/http/route-error-log";
import { userService, type UserService } from "../src/user/user-service";

type Dependencies = {
  bookings: BookingService;
  sessions: SessionManager;
  users: Pick<UserService, "userExists">;
  rateLimiter?: BookingRateLimiter;
};

function respondWithBookingError(error: unknown, response: Response) {
  if (error instanceof BookingAstrologerNotFoundError) {
    response.status(404).json({ error: error.message });
    return;
  }
  if (
    error instanceof BookingUserDetailsIncompleteError
    || error instanceof BookingPhoneRequiredError
    || error instanceof BookingFreeNormalLimitError
    || error instanceof BookingSlotUnavailableError
    || error instanceof BookingOverlapError
  ) {
    response.status(409).json({ error: error.message });
    return;
  }
  logRouteError("user.bookings.create", error);
  response.status(503).json({ error: "Booking is unavailable. Please try again." });
}

export function createBookingsRouter({ bookings, rateLimiter = bookingRateLimiter, sessions, users }: Dependencies) {
  const router = Router();
  const userGuard = requireUser(sessions, users);

  router.post("/", userGuard, async (request, response) => {
    const rate = rateLimiter.consume(rateLimiter.key(
      response.locals.userSession.subjectId,
      request.ip || request.socket.remoteAddress || "unknown",
    ));
    if (!rate.allowed) {
      response.set("Retry-After", String(rate.retryAfterSeconds));
      response.status(429).json({ error: "Too many booking attempts. Please wait before trying again." });
      return;
    }
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    const body = parseOrRespond(createBookingSchema, request.body, response);
    if (!body) return;

    try {
      const result = await bookings.createBooking(
        response.locals.userSession.subjectId,
        body,
      );
      response.status(201).json(result);
    } catch (error) {
      respondWithBookingError(error, response);
    }
  });

  return router;
}

export default createBookingsRouter({
  bookings: bookingService,
  sessions: sessionManager,
  users: userService,
});

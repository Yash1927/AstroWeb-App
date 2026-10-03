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
import { emptyObjectSchema, parseOrRespond } from "../src/http/validation";
import { logRouteError } from "../src/http/route-error-log";
import { userService, type UserService } from "../src/user/user-service";

type Dependencies = {
  bookings: BookingService;
  sessions: SessionManager;
  users: Pick<UserService, "userExists">;
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

export function createBookingsRouter({ bookings, sessions, users }: Dependencies) {
  const router = Router();
  const userGuard = requireUser(sessions, users);

  router.post("/", userGuard, async (request, response) => {
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

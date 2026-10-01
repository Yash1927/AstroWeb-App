import { Router, type Response } from "express";
import { requireAstrologer } from "../src/auth/require-astrologer";
import {
  bookingHistoryService,
  type BookingHistoryService,
} from "../src/booking-history/booking-history-service";
import { bookingHistoryParamsSchema } from "../src/booking-history/booking-history-schemas";
import {
  clearSessionCookieOptions,
  sessionConfigs,
  sessionCookieOptions,
  sessionManager,
  type SessionManager,
} from "../src/auth/session";
import {
  astrologerProfileSchema,
  changeAstrologerPasswordSchema,
} from "../src/astrologer/astrologer-schemas";
import { availabilitySchema } from "../src/availability/availability-schemas";
import {
  availabilityService,
  type AvailabilityService,
} from "../src/availability/availability-service";
import {
  AstrologerNotFoundError,
  AstrologerPasswordStateError,
  astrologerService,
  type AstrologerService,
} from "../src/astrologer/astrologer-service";
import { emptyObjectSchema, parseOrRespond } from "../src/http/validation";

type Dependencies = {
  astrologers: AstrologerService;
  availability: AvailabilityService;
  bookings: BookingHistoryService;
  sessions: SessionManager;
};

function respondWithAstrologerError(error: unknown, response: Response) {
  if (error instanceof AstrologerNotFoundError) {
    response.status(404).json({ error: error.message });
    return;
  }

  if (error instanceof AstrologerPasswordStateError) {
    response.status(409).json({ error: error.message });
    return;
  }

  response.status(503).json({ error: "The service is unavailable. Please try again." });
}

export function createAstrologerRouter({ astrologers, availability, bookings, sessions }: Dependencies) {
  const router = Router();
  router.use(requireAstrologer(sessions, astrologers));

  router.get("/session", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      const state = await astrologers.getSessionState(response.locals.astrologerSession.subjectId);
      if (!state) {
        response.status(401).json({ error: "Please log in to continue." });
        return;
      }
      response.json({ authenticated: true, mustChangePassword: state.mustChangePassword });
    } catch (error) {
      respondWithAstrologerError(error, response);
    }
  });

  router.post("/logout", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      await sessions.destroy("astrologer", request.headers.cookie);
      response.clearCookie(
        sessionConfigs.astrologer.cookieName,
        clearSessionCookieOptions("astrologer"),
      );
      response.status(204).end();
    } catch {
      response.status(503).json({ error: "The service is unavailable. Please try again." });
    }
  });

  router.put("/password", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    const body = parseOrRespond(changeAstrologerPasswordSchema, request.body, response);
    if (!body) return;

    const astrologerId = response.locals.astrologerSession.subjectId;

    try {
      await astrologers.replaceTemporaryPassword(astrologerId, body.newPassword);
      const cookie = await sessions.create("astrologer", astrologerId);
      response.cookie(
        sessionConfigs.astrologer.cookieName,
        cookie,
        sessionCookieOptions("astrologer"),
      );
      response.json({ ok: true });
    } catch (error) {
      respondWithAstrologerError(error, response);
    }
  });

  router.use(async (_request, response, next) => {
    try {
      const state = await astrologers.getSessionState(
        response.locals.astrologerSession.subjectId,
      );
      if (!state) {
        response.status(401).json({ error: "Please log in to continue." });
        return;
      }
      if (state.mustChangePassword) {
        response.status(409).json({ error: "Set a new password before continuing." });
        return;
      }
      next();
    } catch (error) {
      respondWithAstrologerError(error, response);
    }
  });

  router.get("/profile", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      response.json({
        profile: await astrologers.getProfile(response.locals.astrologerSession.subjectId),
      });
    } catch (error) {
      respondWithAstrologerError(error, response);
    }
  });

  router.put("/profile", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    const body = parseOrRespond(astrologerProfileSchema, request.body, response);
    if (!body) return;

    try {
      response.json({
        profile: await astrologers.saveProfile(
          response.locals.astrologerSession.subjectId,
          body,
        ),
      });
    } catch (error) {
      respondWithAstrologerError(error, response);
    }
  });

  router.get("/availability", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      response.json({
        availability: await availability.getAvailability(
          response.locals.astrologerSession.subjectId,
        ),
      });
    } catch (error) {
      respondWithAstrologerError(error, response);
    }
  });

  router.put("/availability", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    const body = parseOrRespond(availabilitySchema, request.body, response);
    if (!body) return;

    try {
      response.json({
        availability: await availability.saveAvailability(
          response.locals.astrologerSession.subjectId,
          body,
        ),
      });
    } catch (error) {
      respondWithAstrologerError(error, response);
    }
  });

  router.get("/bookings", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      response.json(await bookings.listAstrologerBookings(
        response.locals.astrologerSession.subjectId,
      ));
    } catch {
      response.status(503).json({ error: "Bookings are unavailable. Please try again." });
    }
  });

  router.get("/bookings/:bookingId", async (request, response) => {
    const params = parseOrRespond(bookingHistoryParamsSchema, request.params, response);
    if (!params) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      const booking = await bookings.getAstrologerBooking(
        response.locals.astrologerSession.subjectId,
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

  return router;
}

export default createAstrologerRouter({
  astrologers: astrologerService,
  availability: availabilityService,
  bookings: bookingHistoryService,
  sessions: sessionManager,
});

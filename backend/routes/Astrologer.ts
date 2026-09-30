import { Router, type Response } from "express";
import { requireAstrologer } from "../src/auth/require-astrologer";
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
import {
  AstrologerNotFoundError,
  AstrologerPasswordStateError,
  astrologerService,
  type AstrologerService,
} from "../src/astrologer/astrologer-service";
import { emptyObjectSchema, parseOrRespond } from "../src/http/validation";

type Dependencies = {
  astrologers: AstrologerService;
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

export function createAstrologerRouter({ astrologers, sessions }: Dependencies) {
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

  return router;
}

export default createAstrologerRouter({ astrologers: astrologerService, sessions: sessionManager });

import type { RequestHandler } from "express";
import type { AstrologerService } from "../astrologer/astrologer-service";
import {
  clearSessionCookieOptions,
  sessionConfigs,
  type SessionManager,
} from "./session";

export function requireAstrologer(
  sessions: SessionManager,
  astrologers: Pick<AstrologerService, "astrologerIsActive">,
): RequestHandler {
  return async (request, response, next) => {
    try {
      const session = await sessions.resolve("astrologer", request.headers.cookie);

      if (
        !session ||
        session.role !== "astrologer" ||
        !(await astrologers.astrologerIsActive(session.subjectId))
      ) {
        response.clearCookie(
          sessionConfigs.astrologer.cookieName,
          clearSessionCookieOptions("astrologer"),
        );
        response.status(401).json({ error: "Please log in to continue." });
        return;
      }

      response.locals.astrologerSession = session;
      next();
    } catch {
      response.status(503).json({ error: "The service is unavailable. Please try again." });
    }
  };
}

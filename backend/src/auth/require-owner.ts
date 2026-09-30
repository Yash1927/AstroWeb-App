import type { RequestHandler } from "express";
import type { OwnerService } from "../owner/owner-service";
import {
  clearSessionCookieOptions,
  sessionConfigs,
  type SessionManager,
} from "./session";

export function requireOwner(
  sessions: SessionManager,
  owners: Pick<OwnerService, "ownerExists">,
): RequestHandler {
  return async (request, response, next) => {
    try {
      const session = await sessions.resolve("owner", request.headers.cookie);

      if (
        !session ||
        session.role !== "owner" ||
        !(await owners.ownerExists(session.subjectId))
      ) {
        response.clearCookie(
          sessionConfigs.owner.cookieName,
          clearSessionCookieOptions("owner"),
        );
        response.status(401).json({ error: "Please log in to continue." });
        return;
      }

      response.locals.ownerSession = session;
      next();
    } catch {
      response.status(503).json({ error: "The service is unavailable. Please try again." });
    }
  };
}

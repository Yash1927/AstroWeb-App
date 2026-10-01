import type { RequestHandler } from "express";
import type { UserService } from "../user/user-service";
import {
  clearSessionCookieOptions,
  sessionConfigs,
  type SessionManager,
} from "./session";

export function requireUser(
  sessions: SessionManager,
  users: Pick<UserService, "userExists">,
): RequestHandler {
  return async (request, response, next) => {
    try {
      const session = await sessions.resolve("user", request.headers.cookie);

      if (!session || session.role !== "user" || !(await users.userExists(session.subjectId))) {
        response.clearCookie(
          sessionConfigs.user.cookieName,
          clearSessionCookieOptions("user"),
        );
        response.status(401).json({ error: "Continue with Google to proceed." });
        return;
      }

      response.locals.userSession = session;
      next();
    } catch {
      response.status(503).json({ error: "The service is unavailable. Please try again." });
    }
  };
}


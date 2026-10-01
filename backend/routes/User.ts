import { Router, type Response } from "express";
import { requireUser } from "../src/auth/require-user";
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

export function createUserRouter({ sessions, users }: Dependencies) {
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

export default createUserRouter({ sessions: sessionManager, users: userService });

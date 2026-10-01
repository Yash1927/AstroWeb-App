import { timingSafeEqual } from "node:crypto";
import express, { Router } from "express";
import { cookieValue, sessionConfigs, sessionCookieOptions, sessionManager, type SessionManager } from "../src/auth/session";
import { emptyObjectSchema, parseOrRespond } from "../src/http/validation";
import {
  GoogleConfigurationError,
  googleIdentityVerifier,
  type GoogleIdentityVerifier,
} from "../src/user/google-identity";
import { googleCredentialSchema } from "../src/user/user-schemas";
import { userService, type UserService } from "../src/user/user-service";

type Dependencies = {
  appOrigin: () => string | undefined;
  identities: GoogleIdentityVerifier;
  sessions: SessionManager;
  users: Pick<UserService, "findOrCreateGoogleUser">;
};

function valuesMatch(first: string, second: string) {
  const firstBytes = Buffer.from(first);
  const secondBytes = Buffer.from(second);
  return firstBytes.length === secondBytes.length && timingSafeEqual(firstBytes, secondBytes);
}

export function safeContinuation(state: string | undefined, appOrigin: string) {
  if (!state || !state.startsWith("/") || state.startsWith("//")) return "/";

  try {
    const origin = new URL(appOrigin);
    const destination = new URL(state, origin);
    if (destination.origin !== origin.origin) return "/";
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/";
  }
}

export function createUserAuthRouter({ appOrigin, identities, sessions, users }: Dependencies) {
  const router = Router();

  router.post(
    "/google",
    express.urlencoded({ extended: false, limit: "16kb" }),
    async (request, response) => {
      if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
      if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;

      const body = googleCredentialSchema.safeParse(request.body);
      if (!body.success) {
        response.status(400).json({ error: "Google sign-in could not be verified." });
        return;
      }

      const csrfCookie = cookieValue(request.headers.cookie, "g_csrf_token");
      if (!csrfCookie || !valuesMatch(csrfCookie, body.data.g_csrf_token)) {
        response.status(400).json({ error: "Google sign-in could not be verified." });
        return;
      }

      try {
        const origin = appOrigin();
        if (!origin) throw new GoogleConfigurationError("APP_ORIGIN is not configured.");

        const identity = await identities.verify(body.data.credential);
        if (!identity) {
          response.status(401).json({ error: "Google sign-in could not be verified." });
          return;
        }

        const user = await users.findOrCreateGoogleUser(identity);
        const cookie = await sessions.create("user", user.id);
        response.cookie(sessionConfigs.user.cookieName, cookie, sessionCookieOptions("user"));

        const returnTo = safeContinuation(body.data.state, origin);
        response.redirect(303, new URL(returnTo, origin).toString());
      } catch (error) {
        if (error instanceof GoogleConfigurationError) {
          response.status(503).json({ error: "Google sign-in is not configured." });
          return;
        }
        response.status(503).json({ error: "The service is unavailable. Please try again." });
      }
    },
  );

  return router;
}

export default createUserAuthRouter({
  appOrigin: () => process.env.APP_ORIGIN,
  identities: googleIdentityVerifier,
  sessions: sessionManager,
  users: userService,
});


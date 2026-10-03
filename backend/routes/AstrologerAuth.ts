import { Router } from "express";
import { astrologerLoginRateLimiter, type LoginRateLimiter } from "../src/auth/login-rate-limit";
import {
  sessionConfigs,
  sessionCookieOptions,
  sessionManager,
  type SessionManager,
} from "../src/auth/session";
import { astrologerLoginSchema } from "../src/astrologer/astrologer-schemas";
import { astrologerService, type AstrologerService } from "../src/astrologer/astrologer-service";
import { emptyObjectSchema, parseOrRespond } from "../src/http/validation";
import { logRouteError } from "../src/http/route-error-log";

type Dependencies = {
  astrologers: Pick<AstrologerService, "verifyAstrologer">;
  rateLimiter: LoginRateLimiter;
  sessions: SessionManager;
};

const invalidCredentials = { error: "The email or password is incorrect." };

export function createAstrologerAuthRouter({ astrologers, rateLimiter, sessions }: Dependencies) {
  const router = Router();

  router.post("/login", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;

    const candidateEmail =
      typeof request.body?.email === "string" ? request.body.email.slice(0, 254) : "invalid";
    const rateKey = rateLimiter.key(
      candidateEmail,
      request.ip || request.socket.remoteAddress || "unknown",
    );
    const rateStatus = rateLimiter.check(rateKey);

    if (!rateStatus.allowed) {
      response.set("Retry-After", String(rateStatus.retryAfterSeconds));
      response.status(429).json({ error: "Too many login attempts. Please try again later." });
      return;
    }

    const body = astrologerLoginSchema.safeParse(request.body);
    if (!body.success) {
      rateLimiter.recordFailure(rateKey);
      response.status(401).json(invalidCredentials);
      return;
    }

    try {
      const astrologer = await astrologers.verifyAstrologer(body.data.email, body.data.password);

      if (!astrologer) {
        rateLimiter.recordFailure(rateKey);
        response.status(401).json(invalidCredentials);
        return;
      }

      rateLimiter.reset(rateKey);
      const cookie = await sessions.create("astrologer", astrologer.id);
      response.cookie(
        sessionConfigs.astrologer.cookieName,
        cookie,
        sessionCookieOptions("astrologer"),
      );
      response.json({ mustChangePassword: astrologer.mustChangePassword });
    } catch (error) {
      logRouteError("astrologer.login", error);
      response.status(503).json({ error: "The service is unavailable. Please try again." });
    }
  });

  return router;
}

export default createAstrologerAuthRouter({
  astrologers: astrologerService,
  rateLimiter: astrologerLoginRateLimiter,
  sessions: sessionManager,
});

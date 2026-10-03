import { Router } from "express";
import { emptyObjectSchema, parseOrRespond } from "../src/http/validation";
import { logRouteError } from "../src/http/route-error-log";
import { ownerLoginRateLimiter, type LoginRateLimiter } from "../src/auth/login-rate-limit";
import {
  sessionConfigs,
  sessionCookieOptions,
  sessionManager,
  type SessionManager,
} from "../src/auth/session";
import { ownerLoginSchema } from "../src/owner/owner-schemas";
import { ownerService, type OwnerService } from "../src/owner/owner-service";

type OwnerAuthDependencies = {
  owners: Pick<OwnerService, "verifyOwner">;
  rateLimiter: LoginRateLimiter;
  sessions: SessionManager;
};

const invalidCredentials = { error: "The email or password is incorrect." };

export function createOwnerAuthRouter({
  owners,
  rateLimiter,
  sessions,
}: OwnerAuthDependencies) {
  const router = Router();

  router.post("/login", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;

    const candidateEmail =
      typeof request.body?.email === "string" ? request.body.email.slice(0, 254) : "invalid";
    const rateKey = rateLimiter.key(candidateEmail, request.ip || request.socket.remoteAddress || "unknown");
    const rateStatus = rateLimiter.check(rateKey);

    if (!rateStatus.allowed) {
      response.set("Retry-After", String(rateStatus.retryAfterSeconds));
      response.status(429).json({ error: "Too many login attempts. Please try again later." });
      return;
    }

    const parsed = ownerLoginSchema.safeParse(request.body);

    if (!parsed.success) {
      rateLimiter.recordFailure(rateKey);
      response.status(401).json(invalidCredentials);
      return;
    }

    try {
      const owner = await owners.verifyOwner(parsed.data.email, parsed.data.password);

      if (!owner) {
        rateLimiter.recordFailure(rateKey);
        response.status(401).json(invalidCredentials);
        return;
      }

      rateLimiter.reset(rateKey);
      const cookie = await sessions.create("owner", owner.id);
      response.cookie(
        sessionConfigs.owner.cookieName,
        cookie,
        sessionCookieOptions("owner"),
      );
      response.json({ ok: true });
    } catch (error) {
      logRouteError("owner.login", error);
      response.status(503).json({ error: "The service is unavailable. Please try again." });
    }
  });

  return router;
}

export default createOwnerAuthRouter({
  owners: ownerService,
  rateLimiter: ownerLoginRateLimiter,
  sessions: sessionManager,
});

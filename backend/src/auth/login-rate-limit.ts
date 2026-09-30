import { createHash } from "node:crypto";

type AttemptWindow = {
  count: number;
  startedAt: number;
};

type LoginRateLimiterOptions = {
  limit?: number;
  now?: () => number;
  windowMs?: number;
};

export class LoginRateLimiter {
  private readonly attempts = new Map<string, AttemptWindow>();
  private readonly limit: number;
  private readonly now: () => number;
  private readonly windowMs: number;

  constructor({ limit = 5, now = Date.now, windowMs = 15 * 60 * 1_000 }: LoginRateLimiterOptions = {}) {
    this.limit = limit;
    this.now = now;
    this.windowMs = windowMs;
  }

  key(email: string, ipAddress: string) {
    return createHash("sha256")
      .update(`${email.trim().toLowerCase()}\0${ipAddress}`)
      .digest("base64url");
  }

  check(key: string) {
    const attempt = this.current(key);

    if (!attempt || attempt.count < this.limit) {
      return { allowed: true, retryAfterSeconds: 0 };
    }

    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((attempt.startedAt + this.windowMs - this.now()) / 1_000),
      ),
    };
  }

  recordFailure(key: string) {
    const attempt = this.current(key);

    if (attempt) {
      attempt.count += 1;
      return;
    }

    this.attempts.set(key, { count: 1, startedAt: this.now() });
  }

  reset(key: string) {
    this.attempts.delete(key);
  }

  private current(key: string) {
    const attempt = this.attempts.get(key);
    if (!attempt) return null;

    if (attempt.startedAt + this.windowMs <= this.now()) {
      this.attempts.delete(key);
      return null;
    }

    return attempt;
  }
}

export const ownerLoginRateLimiter = new LoginRateLimiter();

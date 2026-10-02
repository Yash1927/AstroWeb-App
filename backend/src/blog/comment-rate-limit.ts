import { createHash } from "node:crypto";

type CommentWindow = {
  count: number;
  startedAt: number;
};

type Options = {
  limit?: number;
  now?: () => number;
  windowMs?: number;
};

export class CommentRateLimiter {
  private readonly attempts = new Map<string, CommentWindow>();
  private readonly limit: number;
  private readonly now: () => number;
  private readonly windowMs: number;

  constructor({ limit = 5, now = Date.now, windowMs = 60_000 }: Options = {}) {
    this.limit = limit;
    this.now = now;
    this.windowMs = windowMs;
  }

  key(userId: string, ipAddress: string) {
    return createHash("sha256").update(`${userId}\0${ipAddress}`).digest("base64url");
  }

  consume(key: string) {
    const existing = this.current(key);
    if (!existing) {
      this.attempts.set(key, { count: 1, startedAt: this.now() });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (existing.count >= this.limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((existing.startedAt + this.windowMs - this.now()) / 1_000),
        ),
      };
    }

    existing.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  private current(key: string) {
    const existing = this.attempts.get(key);
    if (!existing) return null;
    if (existing.startedAt + this.windowMs <= this.now()) {
      this.attempts.delete(key);
      return null;
    }
    return existing;
  }
}

export const commentRateLimiter = new CommentRateLimiter();


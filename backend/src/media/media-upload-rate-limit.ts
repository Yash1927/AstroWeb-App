import { createHash } from "node:crypto";

type UploadWindow = {
  count: number;
  startedAt: number;
};

type Options = {
  limit?: number;
  now?: () => number;
  windowMs?: number;
};

export class MediaUploadRateLimiter {
  private readonly attempts = new Map<string, UploadWindow>();
  private readonly limit: number;
  private readonly now: () => number;
  private readonly windowMs: number;

  constructor({ limit = 30, now = Date.now, windowMs = 10 * 60 * 1_000 }: Options = {}) {
    this.limit = limit;
    this.now = now;
    this.windowMs = windowMs;
  }

  key(astrologerId: string, ipAddress: string) {
    return createHash("sha256").update(`${astrologerId}\0${ipAddress}`).digest("base64url");
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
        retryAfterSeconds: Math.max(1, Math.ceil((existing.startedAt + this.windowMs - this.now()) / 1_000)),
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

export const mediaUploadRateLimiter = new MediaUploadRateLimiter();

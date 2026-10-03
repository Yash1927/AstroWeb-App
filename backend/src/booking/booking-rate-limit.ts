import { createHash } from "node:crypto";

type Options = {
  limit?: number;
  now?: () => number;
  windowMs?: number;
};

type Window = { count: number; resetAt: number };

export class BookingRateLimiter {
  private readonly attempts = new Map<string, Window>();
  private readonly limit: number;
  private readonly now: () => number;
  private readonly windowMs: number;

  constructor({ limit = 10, now = Date.now, windowMs = 60_000 }: Options = {}) {
    this.limit = limit;
    this.now = now;
    this.windowMs = windowMs;
  }

  key(userId: string, ipAddress: string) {
    return createHash("sha256").update(`${userId}\0${ipAddress}`).digest("hex");
  }

  consume(key: string) {
    const now = this.now();
    const existing = this.attempts.get(key);
    const current = !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + this.windowMs }
      : existing;

    if (current.count >= this.limit) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)) };
    }

    current.count += 1;
    this.attempts.set(key, current);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

export const bookingRateLimiter = new BookingRateLimiter();

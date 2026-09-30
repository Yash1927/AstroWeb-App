import { describe, expect, it } from "vitest";
import { LoginRateLimiter } from "./login-rate-limit";

describe("LoginRateLimiter", () => {
  it("allows five failures and blocks the sixth attempt for an email and IP", () => {
    let now = 1_000;
    const limiter = new LoginRateLimiter({ now: () => now });
    const key = limiter.key("Owner@Example.com", "127.0.0.1");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(limiter.check(key).allowed).toBe(true);
      limiter.recordFailure(key);
    }

    expect(limiter.check(key)).toEqual({ allowed: false, retryAfterSeconds: 900 });
    now += 15 * 60 * 1_000;
    expect(limiter.check(key).allowed).toBe(true);
  });

  it("clears the attempt window after a successful login", () => {
    const limiter = new LoginRateLimiter();
    const key = limiter.key("owner@example.com", "127.0.0.1");

    limiter.recordFailure(key);
    limiter.reset(key);

    expect(limiter.check(key).allowed).toBe(true);
  });
});

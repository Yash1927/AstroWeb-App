import { beforeEach, describe, expect, it } from "vitest";
import {
  readSignedSessionId,
  sessionConfigs,
  sessionCookieOptions,
  signSessionId,
} from "./session";

describe("owner session cookies", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
    process.env.NODE_ENV = "test";
  });

  it("accepts an untampered signed owner session id", () => {
    const signed = signSessionId("session-id");
    const header = `${sessionConfigs.owner.cookieName}=${encodeURIComponent(signed)}`;

    expect(readSignedSessionId(header, "owner")).toBe("session-id");
    expect(readSignedSessionId(`${header}x`, "owner")).toBeNull();
  });

  it("uses the required owner cookie attributes and lifetime", () => {
    expect(sessionCookieOptions("owner")).toMatchObject({
      httpOnly: true,
      maxAge: 12 * 60 * 60 * 1_000,
      path: "/api/owner",
      sameSite: "lax",
      secure: false,
    });

    process.env.NODE_ENV = "production";
    expect(sessionCookieOptions("owner").secure).toBe(true);
  });

  it("uses a different cookie name for every panel", () => {
    const names = Object.values(sessionConfigs).map((config) => config.cookieName);
    expect(new Set(names).size).toBe(3);
  });

  it("sends user and astrologer cookies to shared API and WebSocket paths", () => {
    expect(sessionCookieOptions("user").path).toBe("/");
    expect(sessionCookieOptions("astrologer").path).toBe("/");
    expect(sessionCookieOptions("owner").path).toBe("/api/owner");
  });
});

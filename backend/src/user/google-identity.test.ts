import { describe, expect, it } from "vitest";
import { identityFromVerifiedPayload } from "./google-identity";

describe("verified Google payload boundary", () => {
  it("requires a verified email and stable subject", () => {
    expect(identityFromVerifiedPayload({
      sub: "google-subject",
      email: "maya@example.com",
      email_verified: false,
    })).toBeNull();
    expect(identityFromVerifiedPayload({
      sub: "google-subject",
      email: "maya@example.com",
      email_verified: true,
      name: "Maya Shah",
    })).toEqual({
      sub: "google-subject",
      email: "maya@example.com",
      name: "Maya Shah",
    });
  });
});

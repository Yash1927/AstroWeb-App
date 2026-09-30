import argon2 from "argon2";
import { describe, expect, it } from "vitest";
import { hashOwnerPassword, readSeedInput } from "./seed-helpers";

describe("readSeedInput", () => {
  it("normalizes a valid owner email", () => {
    expect(
      readSeedInput({
        OWNER_EMAIL: " Owner@Example.com ",
        OWNER_PASSWORD: "long-enough-password",
      }),
    ).toEqual({
      ownerEmail: "owner@example.com",
      ownerPassword: "long-enough-password",
    });
  });

  it("rejects an invalid email", () => {
    expect(() =>
      readSeedInput({
        OWNER_EMAIL: "not-an-email",
        OWNER_PASSWORD: "long-enough-password",
      }),
    ).toThrow("OWNER_EMAIL must be a valid email address.");
  });

  it("rejects a password shorter than ten characters", () => {
    expect(() =>
      readSeedInput({
        OWNER_EMAIL: "owner@example.com",
        OWNER_PASSWORD: "too-short",
      }),
    ).toThrow("OWNER_PASSWORD must be at least 10 characters.");
  });
});

describe("hashOwnerPassword", () => {
  it("creates an Argon2id hash that verifies", async () => {
    const password = "long-enough-password";
    const hash = await hashOwnerPassword(password);

    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(argon2.verify(hash, password)).resolves.toBe(true);
  });
});

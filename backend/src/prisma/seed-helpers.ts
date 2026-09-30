import argon2 from "argon2";

export type SeedInput = {
  ownerEmail: string;
  ownerPassword: string;
};

export function readSeedInput(environment: NodeJS.ProcessEnv = process.env): SeedInput {
  const ownerEmail = environment.OWNER_EMAIL?.trim().toLowerCase();
  const ownerPassword = environment.OWNER_PASSWORD;

  if (!ownerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
    throw new Error("OWNER_EMAIL must be a valid email address.");
  }

  if (!ownerPassword || ownerPassword.length < 10) {
    throw new Error("OWNER_PASSWORD must be at least 10 characters.");
  }

  return { ownerEmail, ownerPassword };
}

export function hashOwnerPassword(ownerPassword: string) {
  return argon2.hash(ownerPassword, { type: argon2.argon2id });
}

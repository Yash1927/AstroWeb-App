import argon2 from "argon2";
import { randomUUID } from "node:crypto";
import { db } from "../prisma/db";
import { hashOwnerPassword } from "../prisma/seed-helpers";

const missingOwnerHash =
  "$argon2id$v=19$m=65536,p=4,t=3$GeLu1IsYiyNTfvb43gtE2A$kjz/e9b0yCAsOuEpp6zuDhbutUeTiBNkhphU/hFS6e4";

export type AstrologerProfile = {
  createdAt: string;
  displayName: string;
  email: string;
  expertise: string[];
  experienceYears: number;
  id: string;
  isActive: boolean;
  isListed: boolean;
  languages: string[];
  mustChangePassword: boolean;
};

export type OwnerSettings = {
  normalDurationMin: number;
  normalPricePaise: number;
  subscriptionCallsPerPack: number;
  subscriptionDurationMin: number;
  subscriptionPricePaise: number;
  urgentDurationMin: number;
  urgentPricePaise: number;
};

export type CreateAstrologerInput = {
  displayName: string;
  email: string;
  temporaryPassword: string;
};

export type UpdateAstrologerInput = Pick<CreateAstrologerInput, "displayName" | "email">;

export class OwnerNotFoundError extends Error {}
export class OwnerConflictError extends Error {}
export class OwnerStateError extends Error {}

export interface OwnerService {
  createAstrologer(input: CreateAstrologerInput): Promise<AstrologerProfile>;
  getAstrologer(id: string): Promise<AstrologerProfile>;
  getSettings(): Promise<OwnerSettings>;
  listAstrologers(): Promise<AstrologerProfile[]>;
  ownerExists(id: string): Promise<boolean>;
  resetAstrologerPassword(id: string, temporaryPassword: string): Promise<void>;
  setAstrologerActive(id: string, isActive: boolean): Promise<AstrologerProfile>;
  setAstrologerListed(id: string, isListed: boolean): Promise<AstrologerProfile>;
  updateAstrologer(id: string, input: UpdateAstrologerInput): Promise<AstrologerProfile>;
  updateSettings(input: OwnerSettings): Promise<OwnerSettings>;
  verifyOwner(email: string, password: string): Promise<{ id: string } | null>;
}

function toProfile(astrologer: {
  createdAt: { toString(): string };
  displayName: string;
  email: string;
  expertise: readonly string[];
  experienceYears: number;
  id: string;
  isActive: boolean;
  isListed: boolean;
  languages: readonly string[];
  mustChangePassword: boolean;
}): AstrologerProfile {
  return {
    ...astrologer,
    createdAt: astrologer.createdAt.toString(),
    expertise: [...astrologer.expertise],
    languages: [...astrologer.languages],
  };
}

const profileFields = [
  "id",
  "displayName",
  "email",
  "expertise",
  "languages",
  "experienceYears",
  "isActive",
  "isListed",
  "mustChangePassword",
  "createdAt",
] as const;

export class DatabaseOwnerService implements OwnerService {
  async verifyOwner(email: string, password: string) {
    const owner = await db.orm.public.Owner.select("id", "passwordHash").first({ email });
    const hash = owner?.passwordHash ?? missingOwnerHash;
    let matches = false;

    try {
      matches = await argon2.verify(hash, password);
    } catch {
      matches = false;
    }

    return owner && matches ? { id: owner.id } : null;
  }

  async ownerExists(id: string) {
    return Boolean(await db.orm.public.Owner.select("id").first({ id }));
  }

  async listAstrologers() {
    const astrologers = await db.orm.public.Astrologer.select(...profileFields)
      .orderBy((astrologer) => astrologer.displayName.asc())
      .all();

    return astrologers.map(toProfile);
  }

  async getAstrologer(id: string) {
    const astrologer = await db.orm.public.Astrologer.select(...profileFields).first({ id });
    if (!astrologer) throw new OwnerNotFoundError("Astrologer not found.");
    return toProfile(astrologer);
  }

  async createAstrologer(input: CreateAstrologerInput) {
    const existing = await db.orm.public.Astrologer.select("id").first({ email: input.email });
    if (existing) {
      throw new OwnerConflictError("An astrologer with this email already exists.");
    }

    const passwordHash = await hashOwnerPassword(input.temporaryPassword);
    const astrologer = await db.orm.public.Astrologer.select(...profileFields).create({
      id: randomUUID(),
      email: input.email,
      passwordHash,
      mustChangePassword: true,
      displayName: input.displayName,
      isListed: true,
    });

    return toProfile(astrologer);
  }

  async updateAstrologer(id: string, input: UpdateAstrologerInput) {
    await this.getAstrologer(id);
    const matchingEmail = await db.orm.public.Astrologer.select("id").first({ email: input.email });

    if (matchingEmail && matchingEmail.id !== id) {
      throw new OwnerConflictError("An astrologer with this email already exists.");
    }

    await db.orm.public.Astrologer.where({ id }).update(input);
    return this.getAstrologer(id);
  }

  async setAstrologerListed(id: string, isListed: boolean) {
    const astrologer = await this.getAstrologer(id);

    if (isListed && !astrologer.isActive) {
      throw new OwnerStateError("Reactivate this account before showing it on Home.");
    }

    await db.orm.public.Astrologer.where({ id }).update({ isListed });
    return this.getAstrologer(id);
  }

  async setAstrologerActive(id: string, isActive: boolean) {
    await this.getAstrologer(id);
    await db.orm.public.Astrologer.where({ id }).update(
      isActive ? { isActive: true } : { isActive: false, isListed: false },
    );
    return this.getAstrologer(id);
  }

  async resetAstrologerPassword(id: string, temporaryPassword: string) {
    await this.getAstrologer(id);
    const passwordHash = await hashOwnerPassword(temporaryPassword);

    await db.orm.public.Astrologer.where({ id }).update({
      passwordHash,
      mustChangePassword: true,
    });
  }

  async getSettings() {
    const settings = await db.orm.public.Settings.select(
      "normalPricePaise",
      "urgentPricePaise",
      "subscriptionPricePaise",
      "subscriptionCallsPerPack",
      "normalDurationMin",
      "urgentDurationMin",
      "subscriptionDurationMin",
    ).first({ id: 1 });

    if (!settings) throw new OwnerNotFoundError("Settings are unavailable.");
    return settings;
  }

  async updateSettings(input: OwnerSettings) {
    await this.getSettings();
    await db.orm.public.Settings.where({ id: 1 }).update(input);
    return this.getSettings();
  }
}

export const ownerService = new DatabaseOwnerService();

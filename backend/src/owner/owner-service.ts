import argon2 from "argon2";
import { randomUUID } from "node:crypto";
import { db } from "../prisma/db";
import { hashOwnerPassword } from "../prisma/seed-helpers";
import { publicMediaUrl } from "../media/media-service";

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
  profileSavedAt: string | null;
  photoUrl?: string | null;
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
  profileSavedAt: { toString(): string } | null;
  profileMediaId: string | null;
}): AstrologerProfile {
  return {
    ...astrologer,
    createdAt: astrologer.createdAt.toString(),
    expertise: [...astrologer.expertise],
    languages: [...astrologer.languages],
    profileSavedAt: astrologer.profileSavedAt?.toString() ?? null,
    photoUrl: null,
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
  "profileSavedAt",
  "profileMediaId",
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

    const assets = await this.photoAssets(astrologers.map((item) => item.profileMediaId));
    return astrologers.map((item) => {
      const storageKey = item.profileMediaId ? assets.get(item.profileMediaId) : undefined;
      return { ...toProfile(item), photoUrl: storageKey ? publicMediaUrl(storageKey) : null };
    });
  }

  async getAstrologer(id: string) {
    const astrologer = await db.orm.public.Astrologer.select(...profileFields).first({ id });
    if (!astrologer) throw new OwnerNotFoundError("Astrologer not found.");
    const profile = toProfile(astrologer);
    if (astrologer.profileMediaId) {
      const asset = await db.orm.public.MediaAsset.select("storageKey").first({ id: astrologer.profileMediaId });
      profile.photoUrl = asset ? publicMediaUrl(asset.storageKey) : null;
    }
    return profile;
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
    if (isActive) {
      await this.getAstrologer(id);
      await db.orm.public.Astrologer.where({ id }).update({ isActive: true });
      return this.getAstrologer(id);
    }

    await db.transaction(async (transaction) => {
      const astrologer = await transaction.orm.public.Astrologer.select("id").first({ id });
      if (!astrologer) throw new OwnerNotFoundError("Astrologer not found.");

      await transaction.orm.public.Astrologer.where({ id }).update({
        isActive: false,
        isListed: false,
      });
      const deleteSessions = transaction.sql.public.Session.delete()
        .where((session, functions) => functions.and(
          functions.eq(session.role, "astrologer"),
          functions.eq(session.subjectId, id),
        ))
        .build();
      await transaction.execute(deleteSessions);
    });

    return this.getAstrologer(id);
  }

  async resetAstrologerPassword(id: string, temporaryPassword: string) {
    const passwordHash = await hashOwnerPassword(temporaryPassword);

    await db.transaction(async (transaction) => {
      const astrologer = await transaction.orm.public.Astrologer.select("id").first({ id });
      if (!astrologer) throw new OwnerNotFoundError("Astrologer not found.");

      await transaction.orm.public.Astrologer.where({ id }).update({
        passwordHash,
        mustChangePassword: true,
      });
      const deleteSessions = transaction.sql.public.Session.delete()
        .where((session, functions) => functions.and(
          functions.eq(session.role, "astrologer"),
          functions.eq(session.subjectId, id),
        ))
        .build();
      await transaction.execute(deleteSessions);
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

  private async photoAssets(ids: Array<string | null>) {
    const uniqueIds = [...new Set(ids.filter((id): id is string => Boolean(id)))];
    if (!uniqueIds.length) return new Map<string, string>();
    const rows = await db.orm.public.MediaAsset.select("id", "storageKey")
      .where((asset) => asset.id.in(uniqueIds)).all();
    return new Map(rows.map((row) => [row.id, row.storageKey]));
  }
}

export const ownerService = new DatabaseOwnerService();

import argon2 from "argon2";
import { db } from "../prisma/db";
import { hashOwnerPassword } from "../prisma/seed-helpers";
import type { AstrologerProfileInput } from "./astrologer-schemas";
import { publicMediaUrl } from "../media/media-service";

const missingAstrologerHash =
  "$argon2id$v=19$m=65536,p=4,t=3$GeLu1IsYiyNTfvb43gtE2A$kjz/e9b0yCAsOuEpp6zuDhbutUeTiBNkhphU/hFS6e4";

export type AstrologerOwnProfile = AstrologerProfileInput & {
  email: string;
  id: string;
  profileSavedAt: string | null;
  photoUrl?: string | null;
};

export type AstrologerSessionState = {
  id: string;
  mustChangePassword: boolean;
};

export class AstrologerNotFoundError extends Error {}
export class AstrologerPasswordStateError extends Error {}

export interface AstrologerService {
  astrologerIsActive(id: string): Promise<boolean>;
  getProfile(id: string): Promise<AstrologerOwnProfile>;
  getSessionState(id: string): Promise<AstrologerSessionState | null>;
  replaceTemporaryPassword(id: string, newPassword: string): Promise<void>;
  saveProfile(id: string, input: AstrologerProfileInput): Promise<AstrologerOwnProfile>;
  verifyAstrologer(email: string, password: string): Promise<AstrologerSessionState | null>;
}

type ProfileRecord = {
  displayName: string;
  email: string;
  expertise: readonly string[];
  experienceYears: number;
  id: string;
  languages: readonly string[];
  profileSavedAt: { toString(): string } | null;
  profileMediaId: string | null;
};

async function toOwnProfile(astrologer: ProfileRecord): Promise<AstrologerOwnProfile> {
  const asset = astrologer.profileMediaId
    ? await db.orm.public.MediaAsset.select("storageKey").first({ id: astrologer.profileMediaId })
    : null;
  return {
    ...astrologer,
    expertise: [...astrologer.expertise],
    languages: [...astrologer.languages],
    profileSavedAt: astrologer.profileSavedAt?.toString() ?? null,
    photoUrl: asset ? publicMediaUrl(asset.storageKey) : null,
  };
}

const ownProfileFields = [
  "id",
  "email",
  "displayName",
  "expertise",
  "languages",
  "experienceYears",
  "profileSavedAt",
  "profileMediaId",
] as const;

export class DatabaseAstrologerService implements AstrologerService {
  async verifyAstrologer(email: string, password: string) {
    const astrologer = await db.orm.public.Astrologer.select(
      "id",
      "passwordHash",
      "mustChangePassword",
      "isActive",
    ).first({ email });
    const hash = astrologer?.passwordHash ?? missingAstrologerHash;
    let matches = false;

    try {
      matches = await argon2.verify(hash, password);
    } catch {
      matches = false;
    }

    if (!astrologer || !astrologer.isActive || !matches) return null;
    return { id: astrologer.id, mustChangePassword: astrologer.mustChangePassword };
  }

  async astrologerIsActive(id: string) {
    return Boolean(
      await db.orm.public.Astrologer.select("id").first({ id, isActive: true }),
    );
  }

  async getSessionState(id: string) {
    const astrologer = await db.orm.public.Astrologer.select(
      "id",
      "mustChangePassword",
      "isActive",
    ).first({ id });

    if (!astrologer?.isActive) return null;
    return { id: astrologer.id, mustChangePassword: astrologer.mustChangePassword };
  }

  async getProfile(id: string) {
    const astrologer = await db.orm.public.Astrologer.select(
      ...ownProfileFields,
      "mustChangePassword",
      "isActive",
    ).first({ id });

    if (!astrologer?.isActive) throw new AstrologerNotFoundError("Astrologer not found.");
    if (astrologer.mustChangePassword) {
      throw new AstrologerPasswordStateError("Set a new password before continuing.");
    }

    return toOwnProfile(astrologer);
  }

  async replaceTemporaryPassword(id: string, newPassword: string) {
    const passwordHash = await hashOwnerPassword(newPassword);

    await db.transaction(async (transaction) => {
      const astrologer = await transaction.orm.public.Astrologer.select(
        "id",
        "isActive",
        "mustChangePassword",
      ).first({ id });

      if (!astrologer?.isActive) throw new AstrologerNotFoundError("Astrologer not found.");
      if (!astrologer.mustChangePassword) {
        throw new AstrologerPasswordStateError("The temporary password was already replaced.");
      }

      await transaction.orm.public.Astrologer.where({ id }).update({
        passwordHash,
        mustChangePassword: false,
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

  async saveProfile(id: string, input: AstrologerProfileInput) {
    await db.transaction(async (transaction) => {
      const astrologer = await transaction.orm.public.Astrologer.select(
        "id",
        "isActive",
        "mustChangePassword",
        "profileSavedAt",
      ).first({ id });

      if (!astrologer?.isActive) throw new AstrologerNotFoundError("Astrologer not found.");
      if (astrologer.mustChangePassword) {
        throw new AstrologerPasswordStateError("Set a new password before continuing.");
      }

      await transaction.orm.public.Astrologer.where({ id }).update({
        ...input,
        profileSavedAt: astrologer.profileSavedAt ?? Temporal.Now.instant(),
      });
    });

    return this.getProfile(id);
  }
}

export const astrologerService = new DatabaseAstrologerService();

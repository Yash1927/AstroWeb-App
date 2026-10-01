import { randomUUID } from "node:crypto";
import { db } from "../prisma/db";
import type { UserDetailsInput } from "./user-schemas";

export type GoogleIdentity = {
  email: string;
  name?: string;
  sub: string;
};

export type UserDetails = {
  birthDate: string | null;
  birthPlace: string | null;
  birthTime: string | null;
  detailsComplete: boolean;
  email: string;
  gender: "male" | "female" | "other" | null;
  id: string;
  name: string;
  phone: string | null;
  subscriptionCredits: number;
};

type UserRecord = {
  birthDate: { toString(): string } | null;
  birthPlace: string | null;
  birthTime: { toString(options?: { smallestUnit: "minute" }): string } | null;
  email: string;
  gender: "male" | "female" | "other" | null;
  id: string;
  name: string;
  phone: string | null;
  subscriptionCredits: number;
};

export class UserNotFoundError extends Error {}

export interface UserService {
  findOrCreateGoogleUser(identity: GoogleIdentity): Promise<{ id: string }>;
  getUser(id: string): Promise<UserDetails>;
  updateUser(id: string, details: UserDetailsInput): Promise<UserDetails>;
  userExists(id: string): Promise<boolean>;
}

const userFields = [
  "id",
  "email",
  "name",
  "birthDate",
  "birthTime",
  "birthPlace",
  "phone",
  "gender",
  "subscriptionCredits",
] as const;

function isComplete(user: UserRecord) {
  return (
    user.name.trim().length >= 2 &&
    user.name.trim().length <= 60 &&
    user.birthDate !== null &&
    user.birthTime !== null &&
    user.birthPlace !== null &&
    user.birthPlace.trim().length > 0 &&
    user.gender !== null
  );
}

function toUserDetails(user: UserRecord): UserDetails {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    birthDate: user.birthDate?.toString() ?? null,
    birthTime: user.birthTime?.toString({ smallestUnit: "minute" }) ?? null,
    birthPlace: user.birthPlace,
    phone: user.phone,
    gender: user.gender,
    subscriptionCredits: user.subscriptionCredits,
    detailsComplete: isComplete(user),
  };
}

function initialName(identity: GoogleIdentity) {
  const googleName = identity.name?.trim();
  if (googleName) return googleName.slice(0, 60);

  const emailName = identity.email.split("@", 1)[0]?.trim();
  return emailName ? emailName.slice(0, 60) : "Google user";
}

export class DatabaseUserService implements UserService {
  async findOrCreateGoogleUser(identity: GoogleIdentity) {
    const existing = await db.orm.public.User.select("id", "email").first({
      googleSub: identity.sub,
    });

    if (existing) {
      if (existing.email !== identity.email) {
        await db.orm.public.User.where({ id: existing.id }).update({ email: identity.email });
      }
      return { id: existing.id };
    }

    try {
      const created = await db.orm.public.User.select("id").create({
        id: randomUUID(),
        googleSub: identity.sub,
        email: identity.email,
        name: initialName(identity),
      });
      return created;
    } catch (error) {
      const concurrentlyCreated = await db.orm.public.User.select("id").first({
        googleSub: identity.sub,
      });
      if (concurrentlyCreated) return concurrentlyCreated;
      throw error;
    }
  }

  async userExists(id: string) {
    return Boolean(await db.orm.public.User.select("id").first({ id }));
  }

  async getUser(id: string) {
    const user = await db.orm.public.User.select(...userFields).first({ id });
    if (!user) throw new UserNotFoundError("User not found.");
    return toUserDetails(user);
  }

  async updateUser(id: string, details: UserDetailsInput) {
    if (!(await this.userExists(id))) throw new UserNotFoundError("User not found.");

    await db.orm.public.User.where({ id }).update({
      ...details,
      birthDate: Temporal.PlainDate.from(details.birthDate),
      birthTime: Temporal.PlainTime.from(details.birthTime),
    });

    return this.getUser(id);
  }
}

export const userService = new DatabaseUserService();


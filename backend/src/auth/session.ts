import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { CookieOptions } from "express";
import { db } from "../prisma/db";

export type SessionRole = "user" | "astrologer" | "owner";

export type ResolvedSession = {
  id: string;
  role: SessionRole;
  subjectId: string;
};

type SessionConfig = {
  cookieName: string;
  cookiePath: string;
  lifetimeMs: number;
};

const twelveHoursMs = 12 * 60 * 60 * 1_000;

export const sessionConfigs: Record<SessionRole, SessionConfig> = {
  user: {
    cookieName: "astrowebapp_user_session",
    cookiePath: "/",
    lifetimeMs: 30 * 24 * 60 * 60 * 1_000,
  },
  astrologer: {
    cookieName: "astrowebapp_astrologer_session",
    cookiePath: "/",
    lifetimeMs: twelveHoursMs,
  },
  owner: {
    cookieName: "astrowebapp_owner_session",
    cookiePath: "/api/owner",
    lifetimeMs: twelveHoursMs,
  },
};

export interface SessionManager {
  create(role: SessionRole, subjectId: string): Promise<string>;
  destroy(role: SessionRole, cookieHeader: string | undefined): Promise<void>;
  resolve(role: SessionRole, cookieHeader: string | undefined): Promise<ResolvedSession | null>;
}

function sessionSecret() {
  const value = process.env.SESSION_SECRET;

  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }

  return value;
}

function signatureFor(sessionId: string) {
  return createHmac("sha256", sessionSecret()).update(sessionId).digest("base64url");
}

export function signSessionId(sessionId: string) {
  return `${sessionId}.${signatureFor(sessionId)}`;
}

export function cookieValue(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === name) {
      try {
        return decodeURIComponent(rawValue.join("="));
      } catch {
        return null;
      }
    }
  }

  return null;
}

export function readSignedSessionId(cookieHeader: string | undefined, role: SessionRole) {
  const value = cookieValue(cookieHeader, sessionConfigs[role].cookieName);
  if (!value) return null;

  const separator = value.lastIndexOf(".");
  if (separator < 1) return null;

  const sessionId = value.slice(0, separator);
  const suppliedSignature = value.slice(separator + 1);
  const expectedSignature = signatureFor(sessionId);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);

  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return null;
  }

  return sessionId;
}

export function sessionCookieOptions(role: SessionRole): CookieOptions {
  return {
    httpOnly: true,
    maxAge: sessionConfigs[role].lifetimeMs,
    path: sessionConfigs[role].cookiePath,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}

export function clearSessionCookieOptions(role: SessionRole): CookieOptions {
  const { httpOnly, path, sameSite, secure } = sessionCookieOptions(role);
  return { httpOnly, path, sameSite, secure };
}

export class DatabaseSessionManager implements SessionManager {
  async create(role: SessionRole, subjectId: string) {
    const id = randomUUID();
    const expiresAt = Temporal.Instant.fromEpochMilliseconds(
      Date.now() + sessionConfigs[role].lifetimeMs,
    );

    await db.orm.public.Session.create({ id, role, subjectId, expiresAt });
    return signSessionId(id);
  }

  async destroy(role: SessionRole, cookieHeader: string | undefined) {
    const id = readSignedSessionId(cookieHeader, role);
    if (!id) return;

    await db.orm.public.Session.where({ id }).delete();
  }

  async resolve(role: SessionRole, cookieHeader: string | undefined) {
    const id = readSignedSessionId(cookieHeader, role);
    if (!id) return null;

    const session = await db.orm.public.Session.select(
      "id",
      "role",
      "subjectId",
      "expiresAt",
    ).first({ id });

    if (!session || session.role !== role) return null;

    if (Temporal.Instant.compare(session.expiresAt, Temporal.Now.instant()) <= 0) {
      await db.orm.public.Session.where({ id }).delete();
      return null;
    }

    return session;
  }
}

export const sessionManager = new DatabaseSessionManager();

import { OAuth2Client } from "google-auth-library";
import type { GoogleIdentity } from "./user-service";

export class GoogleConfigurationError extends Error {}

export interface GoogleIdentityVerifier {
  verify(credential: string): Promise<GoogleIdentity | null>;
}

type VerifiedPayload = {
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
  sub?: unknown;
};

export function identityFromVerifiedPayload(payload: VerifiedPayload | undefined) {
  if (
    !payload ||
    payload.email_verified !== true ||
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string"
  ) {
    return null;
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: typeof payload.name === "string" ? payload.name : undefined,
  };
}

export class GoogleAuthLibraryVerifier implements GoogleIdentityVerifier {
  private readonly client = new OAuth2Client();

  async verify(credential: string) {
    const audience = process.env.GOOGLE_CLIENT_ID;
    if (!audience) throw new GoogleConfigurationError("Google sign-in is not configured.");

    try {
      const ticket = await this.client.verifyIdToken({ idToken: credential, audience });
      return identityFromVerifiedPayload(ticket.getPayload());
    } catch (error) {
      if (error instanceof GoogleConfigurationError) throw error;
      return null;
    }
  }
}

export const googleIdentityVerifier = new GoogleAuthLibraryVerifier();


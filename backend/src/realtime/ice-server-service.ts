import { createHmac } from "node:crypto";
import "temporal-polyfill/global";
import {
  realtimeBookingService,
  type RealtimeBookingService,
} from "./booking-service";
import type { RealtimeParticipant } from "./signaling";

const STUN_URL = "stun:stun.l.google.com:19302";

export type CallIceServer = {
  credential?: string;
  urls: string | string[];
  username?: string;
};

export class TurnConfigurationError extends Error {}

type TurnConfiguration = {
  secret: string | undefined;
  urls: string | undefined;
};

export interface IceServerService {
  getIceServers(input: {
    bookingId: string;
    participant: RealtimeParticipant;
    subjectId: string;
    now?: Temporal.Instant;
  }): Promise<CallIceServer[]>;
}

export function parseTurnUrls(value: string | undefined) {
  const urls = value?.split(",").map((url) => url.trim()).filter(Boolean) ?? [];
  if (!urls.length || urls.some((url) => !/^turns?:/u.test(url))) {
    throw new TurnConfigurationError("TURN is not configured.");
  }
  return urls;
}

export function createTurnCredentials(
  bookingId: string,
  expiresAt: Temporal.Instant,
  secret: string | undefined,
) {
  if (!secret?.trim()) throw new TurnConfigurationError("TURN is not configured.");
  const expiry = Math.floor(expiresAt.epochMilliseconds / 1_000);
  const username = `${expiry}:${bookingId}`;
  const credential = createHmac("sha1", secret).update(username).digest("base64");
  return { credential, username };
}

export class DefaultIceServerService implements IceServerService {
  constructor(
    private readonly bookings: Pick<RealtimeBookingService, "authorizeBooking">,
    private readonly configuration: () => TurnConfiguration = () => ({
      secret: process.env.TURN_SECRET,
      urls: process.env.TURN_URLS,
    }),
  ) {}

  async getIceServers(input: {
    bookingId: string;
    participant: RealtimeParticipant;
    subjectId: string;
    now?: Temporal.Instant;
  }) {
    const booking = await this.bookings.authorizeBooking(input);
    const configuration = this.configuration();
    const urls = parseTurnUrls(configuration.urls);
    const credentials = createTurnCredentials(
      booking.id,
      booking.endsAt,
      configuration.secret,
    );
    return [
      { urls: STUN_URL },
      { urls, ...credentials },
    ];
  }
}

export const iceServerService = new DefaultIceServerService(realtimeBookingService);

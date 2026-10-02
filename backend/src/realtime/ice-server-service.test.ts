import { createHmac } from "node:crypto";
import "temporal-polyfill/global";
import { describe, expect, it, vi } from "vitest";
import type { RealtimeBookingService } from "./booking-service";
import {
  createTurnCredentials,
  DefaultIceServerService,
  parseTurnUrls,
  TurnConfigurationError,
} from "./ice-server-service";

const bookingId = "1c10ff39-56b3-4c86-9fa4-a8cb17d4a7df";
const endsAt = Temporal.Instant.from("2026-10-01T10:15:00Z");

describe("TURN ICE server credentials", () => {
  it("uses the booking end Unix time and a base64 HMAC-SHA1 credential", () => {
    const result = createTurnCredentials(bookingId, endsAt, "test-turn-secret");
    const expectedUsername = `${Math.floor(endsAt.epochMilliseconds / 1_000)}:${bookingId}`;

    expect(result).toEqual({
      username: expectedUsername,
      credential: createHmac("sha1", "test-turn-secret")
        .update(expectedUsername)
        .digest("base64"),
    });
  });

  it("returns STUN plus every configured TURN URL after booking authorization", async () => {
    const authorizeBooking = vi.fn(async () => ({
      id: bookingId,
      userId: "user-1",
      astrologerId: "astrologer-1",
      startsAt: Temporal.Instant.from("2026-10-01T10:00:00Z"),
      endsAt,
      userJoinedAt: null,
      astrologerJoinedAt: null,
    }));
    const service = new DefaultIceServerService(
      { authorizeBooking } as Pick<RealtimeBookingService, "authorizeBooking">,
      () => ({
        urls: "turn:turn.example.test:3478?transport=udp, turns:turn.example.test:5349?transport=tcp",
        secret: "test-turn-secret",
      }),
    );

    const result = await service.getIceServers({
      bookingId,
      participant: "user",
      subjectId: "user-1",
    });

    expect(authorizeBooking).toHaveBeenCalledWith({
      bookingId,
      participant: "user",
      subjectId: "user-1",
    });
    expect(result[0]).toEqual({ urls: "stun:stun.l.google.com:19302" });
    expect(result[1]).toMatchObject({
      urls: [
        "turn:turn.example.test:3478?transport=udp",
        "turns:turn.example.test:5349?transport=tcp",
      ],
    });
  });

  it("rejects missing or non-TURN configuration", () => {
    expect(() => parseTurnUrls(undefined)).toThrow(TurnConfigurationError);
    expect(() => parseTurnUrls("https://relay.example.test")).toThrow(TurnConfigurationError);
    expect(() => createTurnCredentials(bookingId, endsAt, undefined))
      .toThrow(TurnConfigurationError);
  });
});

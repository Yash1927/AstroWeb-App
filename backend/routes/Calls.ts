import { Router } from "express";
import {
  sessionManager,
  type ResolvedSession,
  type SessionManager,
} from "../src/auth/session";
import { emptyObjectSchema, parseOrRespond } from "../src/http/validation";
import { logRouteError } from "../src/http/route-error-log";
import {
  RealtimeBookingUnavailableError,
} from "../src/realtime/booking-service";
import { callParamsSchema } from "../src/realtime/call-schemas";
import {
  TurnConfigurationError,
  iceServerService,
  type IceServerService,
} from "../src/realtime/ice-server-service";
import type { RealtimeParticipant } from "../src/realtime/signaling";

type Dependencies = {
  iceServers: IceServerService;
  sessions: SessionManager;
};

type ParticipantSession = {
  participant: RealtimeParticipant;
  session: ResolvedSession;
};

async function resolveParticipantSessions(
  sessions: SessionManager,
  cookie: string | undefined,
) {
  const [user, astrologer] = await Promise.all([
    sessions.resolve("user", cookie),
    sessions.resolve("astrologer", cookie),
  ]);
  const resolved: ParticipantSession[] = [];
  if (user?.role === "user") resolved.push({ participant: "user", session: user });
  if (astrologer?.role === "astrologer") {
    resolved.push({ participant: "astrologer", session: astrologer });
  }
  return resolved;
}

export function createCallsRouter({ iceServers, sessions }: Dependencies) {
  const router = Router();

  router.get("/calls/:bookingId/ice-servers", async (request, response) => {
    const params = parseOrRespond(callParamsSchema, request.params, response);
    if (!params) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      const candidates = await resolveParticipantSessions(sessions, request.headers.cookie);
      if (!candidates.length) {
        response.status(401).json({ error: "Please sign in to continue." });
        return;
      }

      for (const candidate of candidates) {
        try {
          const values = await iceServers.getIceServers({
            bookingId: params.bookingId,
            participant: candidate.participant,
            subjectId: candidate.session.subjectId,
          });
          response.set("Cache-Control", "no-store");
          response.json({ iceServers: values });
          return;
        } catch (error) {
          if (error instanceof RealtimeBookingUnavailableError) continue;
          throw error;
        }
      }

      response.status(404).json({ error: "Call not found." });
    } catch (error) {
      if (error instanceof TurnConfigurationError) {
        logRouteError("calls.ice-servers", error);
        response.status(503).json({ error: "Call audio is unavailable. Please try again." });
        return;
      }
      logRouteError("calls.ice-servers", error);
      response.status(503).json({ error: "Call audio is unavailable. Please try again." });
    }
  });

  return router;
}

export default createCallsRouter({ iceServers: iceServerService, sessions: sessionManager });

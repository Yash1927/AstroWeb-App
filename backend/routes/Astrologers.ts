import { Router } from "express";
import { emptyObjectSchema, parseOrRespond } from "../src/http/validation";
import { logRouteError } from "../src/http/route-error-log";
import {
  publicAstrologerService,
  type PublicAstrologerCard,
  type PublicAstrologerService,
} from "../src/public/public-astrologer-service";
import {
  slotParamsSchema,
  slotQuerySchema,
} from "../src/availability/availability-schemas";
import {
  APP_TIME_ZONE,
  SlotAstrologerNotFoundError,
  slotService,
  type SlotService,
} from "../src/availability/slot-service";

type Dependencies = {
  astrologers: PublicAstrologerService;
  now?: () => Temporal.Instant;
  slots: SlotService;
};

function publicFields(astrologer: PublicAstrologerCard): PublicAstrologerCard {
  return {
    id: astrologer.id,
    displayName: astrologer.displayName,
    expertise: astrologer.expertise,
    languages: astrologer.languages,
    experienceYears: astrologer.experienceYears,
    photoUrl: astrologer.photoUrl ?? null,
  };
}

export function createPublicAstrologerRouter({ astrologers, now, slots }: Dependencies) {
  const router = Router();

  router.get("/", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      const eligible = await astrologers.listEligibleAstrologers();
      response.json({ astrologers: eligible.map(publicFields) });
    } catch (error) {
      logRouteError("public.astrologers.list", error);
      response.status(503).json({
        error: "Astrologers are unavailable. Please try again.",
      });
    }
  });

  router.get("/:id/slots", async (request, response) => {
    const params = parseOrRespond(slotParamsSchema, request.params, response);
    if (!params) return;
    const query = parseOrRespond(slotQuerySchema, request.query, response);
    if (!query) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      const current = (now ?? (() => Temporal.Now.instant()))();
      const startDate = current.toZonedDateTimeISO(APP_TIME_ZONE).toPlainDate();
      response.json(await slots.getAvailableSlots({
        astrologerId: params.id,
        callType: query.type,
        startDate: startDate.toString(),
        endDate: startDate.add({ days: 13 }).toString(),
        now: current,
      }));
    } catch (error) {
      if (error instanceof SlotAstrologerNotFoundError) {
        response.status(404).json({ error: error.message });
        return;
      }
      logRouteError("public.astrologers.slots", error);
      response.status(503).json({ error: "Times are unavailable. Please try again." });
    }
  });

  return router;
}

export default createPublicAstrologerRouter({
  astrologers: publicAstrologerService,
  slots: slotService,
});

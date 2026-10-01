import { Router } from "express";
import { emptyObjectSchema, parseOrRespond } from "../src/http/validation";
import {
  publicAstrologerService,
  type PublicAstrologerCard,
  type PublicAstrologerService,
} from "../src/public/public-astrologer-service";

type Dependencies = {
  astrologers: PublicAstrologerService;
};

function publicFields(astrologer: PublicAstrologerCard): PublicAstrologerCard {
  return {
    id: astrologer.id,
    displayName: astrologer.displayName,
    expertise: astrologer.expertise,
    languages: astrologer.languages,
    experienceYears: astrologer.experienceYears,
  };
}

export function createPublicAstrologerRouter({ astrologers }: Dependencies) {
  const router = Router();

  router.get("/", async (request, response) => {
    if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
    if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;

    try {
      const eligible = await astrologers.listEligibleAstrologers();
      response.json({ astrologers: eligible.map(publicFields) });
    } catch {
      response.status(503).json({
        error: "Astrologers are unavailable. Please try again.",
      });
    }
  });

  return router;
}

export default createPublicAstrologerRouter({ astrologers: publicAstrologerService });

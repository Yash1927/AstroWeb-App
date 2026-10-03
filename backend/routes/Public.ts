import { Router } from "express";
import { logRouteError } from "../src/http/route-error-log";
import { emptyObjectSchema, parseOrRespond } from "../src/http/validation";
import { db } from "../src/prisma/db";

const router = Router();

router.get("/health/db", async (request, response) => {
  if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
  if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
  if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;
  try {
    await db.orm.public.Settings.select("id").first();
    response.json({ ok: true });
  } catch (error) {
    logRouteError("public.health.database", error);
    response.status(503).json({ ok: false });
  }
});

router.get("/settings/public", async (request, response) => {
  if (!parseOrRespond(emptyObjectSchema, request.params, response)) return;
  if (!parseOrRespond(emptyObjectSchema, request.query, response)) return;
  if (!parseOrRespond(emptyObjectSchema, request.body ?? {}, response)) return;
  try {
    const settings = await db.orm.public.Settings.select(
      "normalPricePaise",
      "urgentPricePaise",
      "subscriptionPricePaise",
      "subscriptionCallsPerPack",
      "normalDurationMin",
      "urgentDurationMin",
      "subscriptionDurationMin",
    ).first({ id: 1 });

    if (!settings) {
      logRouteError("public.settings", new Error("Settings row is missing."));
      response.status(503).json({ error: "Settings are unavailable." });
      return;
    }

    response.json(settings);
  } catch (error) {
    logRouteError("public.settings", error);
    response.status(503).json({ error: "Settings are unavailable." });
  }
});

export default router;

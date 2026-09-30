import { Router } from "express";
import { db } from "../src/prisma/db";

const router = Router();

router.get("/health/db", async (_request, response) => {
  try {
    await db.orm.public.Settings.select("id").first();
    response.json({ ok: true });
  } catch {
    response.status(503).json({ ok: false });
  }
});

router.get("/settings/public", async (_request, response) => {
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
      response.status(503).json({ error: "Settings are unavailable." });
      return;
    }

    response.json(settings);
  } catch {
    response.status(503).json({ error: "Settings are unavailable." });
  }
});

export default router;

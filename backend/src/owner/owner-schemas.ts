import { z } from "zod";

const email = z.string().trim().max(254).email().transform((value) => value.toLowerCase());
const displayName = z.string().trim().min(2).max(80);
const temporaryPassword = z.string().min(10).max(256);
const paise = z.number().int().min(0).max(2_147_483_647);
const duration = z.union([z.literal(10), z.literal(15), z.literal(30)]);

export const ownerLoginSchema = z
  .object({
    email,
    password: z.string().min(1).max(256),
  })
  .strict();

export const createAstrologerSchema = z
  .object({
    displayName,
    email,
    temporaryPassword,
  })
  .strict();

export const updateAstrologerSchema = z.object({ displayName, email }).strict();

export const astrologerIdSchema = z.object({ id: z.string().uuid() }).strict();

export const listedSchema = z.object({ isListed: z.boolean() }).strict();
export const activeSchema = z.object({ isActive: z.boolean() }).strict();
export const resetPasswordSchema = z.object({ temporaryPassword }).strict();

export const settingsSchema = z
  .object({
    normalPricePaise: paise,
    urgentPricePaise: paise,
    subscriptionPricePaise: paise,
    subscriptionCallsPerPack: z.number().int().min(1).max(2_147_483_647),
    normalDurationMin: duration,
    urgentDurationMin: duration,
    subscriptionDurationMin: duration,
  })
  .strict();

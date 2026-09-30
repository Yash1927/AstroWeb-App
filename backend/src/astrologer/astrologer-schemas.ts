import { z } from "zod";

const email = z.string().trim().max(254).email().transform((value) => value.toLowerCase());
const password = z.string().min(10).max(256);

function uniqueTags(values: string[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const tags = z
  .array(z.string().trim().min(1).max(40))
  .max(20)
  .transform(uniqueTags);

export const astrologerLoginSchema = z
  .object({
    email,
    password: z.string().min(1).max(256),
  })
  .strict();

export const changeAstrologerPasswordSchema = z
  .object({ newPassword: password })
  .strict();

export const astrologerProfileSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80),
    expertise: tags,
    languages: tags,
    experienceYears: z.number().int().min(0).max(60),
  })
  .strict();

export type AstrologerProfileInput = z.infer<typeof astrologerProfileSchema>;

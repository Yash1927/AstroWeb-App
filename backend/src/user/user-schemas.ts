import "temporal-polyfill/global";
import { z } from "zod";

const localDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const localTimePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const indianPhonePattern = /^\+91[6-9]\d{9}$/;

function isValidPastOrPresentDate(value: string) {
  try {
    const date = Temporal.PlainDate.from(value);
    const today = Temporal.Now.plainDateISO(process.env.APP_TIMEZONE || "Asia/Kolkata");
    return Temporal.PlainDate.compare(date, today) <= 0;
  } catch {
    return false;
  }
}

export const userDetailsSchema = z.object({
  name: z.string().trim().min(2).max(60),
  birthDate: z.string().regex(localDatePattern).refine(isValidPastOrPresentDate),
  birthTime: z.string().regex(localTimePattern),
  birthPlace: z.string().trim().min(1).max(100),
  phone: z.union([z.string().regex(indianPhonePattern), z.null()]),
  gender: z.enum(["male", "female", "other"]),
}).strict();

export const googleCredentialSchema = z.object({
  credential: z.string().min(1).max(12_000),
  g_csrf_token: z.string().min(1).max(1_024),
  select_by: z.string().max(64).optional(),
  state: z.string().max(2_048).optional(),
});

export type UserDetailsInput = z.infer<typeof userDetailsSchema>;


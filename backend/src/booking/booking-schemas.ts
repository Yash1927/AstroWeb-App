import "temporal-polyfill/global";
import { z } from "zod";

function isInstant(value: string) {
  try {
    Temporal.Instant.from(value);
    return true;
  } catch {
    return false;
  }
}

export const createBookingSchema = z.object({
  astrologerId: z.string().uuid(),
  callType: z.enum(["normal", "urgent", "subscription"]),
  startsAt: z.string().refine(isInstant),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

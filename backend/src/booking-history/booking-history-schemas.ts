import { z } from "zod";

export const bookingHistoryParamsSchema = z.object({
  bookingId: z.string().uuid(),
}).strict();


import { z } from "zod";

export const callParamsSchema = z.object({
  bookingId: z.string().uuid(),
}).strict();

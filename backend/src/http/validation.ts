import type { Response } from "express";
import { z } from "zod";

export const emptyObjectSchema = z.object({}).strict();

export function parseOrRespond<T extends z.ZodType>(
  schema: T,
  value: unknown,
  response: Response,
): z.infer<T> | null {
  const result = schema.safeParse(value);

  if (!result.success) {
    response.status(400).json({ error: "Check the information and try again." });
    return null;
  }

  return result.data;
}

export function parseOrRespondWithIssue<T extends z.ZodType>(
  schema: T,
  value: unknown,
  response: Response,
): z.infer<T> | null {
  const result = schema.safeParse(value);

  if (!result.success) {
    response.status(400).json({
      error: result.error.issues[0]?.message || "Check the information and try again.",
    });
    return null;
  }

  return result.data;
}

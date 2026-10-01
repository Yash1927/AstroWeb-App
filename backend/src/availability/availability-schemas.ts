import "temporal-polyfill/global";
import { z } from "zod";

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: string) {
  try {
    Temporal.PlainDate.from(value);
    return true;
  } catch {
    return false;
  }
}

const clockTime = z.string().regex(timePattern);
const calendarDate = z.string().regex(datePattern).refine(validDate);

export const availabilityRuleSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startTime: clockTime,
    endTime: clockTime,
  })
  .strict()
  .refine((range) => range.endTime > range.startTime, {
    message: "End time must be after start time.",
    path: ["endTime"],
  });

export const availabilityExceptionSchema = z
  .object({
    date: calendarDate,
    kind: z.enum(["blocked", "extra"]),
    startTime: clockTime.nullable(),
    endTime: clockTime.nullable(),
  })
  .strict()
  .superRefine((exception, context) => {
    const hasStart = exception.startTime !== null;
    const hasEnd = exception.endTime !== null;

    if (hasStart !== hasEnd) {
      context.addIssue({
        code: "custom",
        message: "Enter both a start and end time.",
        path: hasStart ? ["endTime"] : ["startTime"],
      });
      return;
    }
    if (exception.kind === "extra" && !hasStart) {
      context.addIssue({
        code: "custom",
        message: "Extra hours need a start and end time.",
        path: ["startTime"],
      });
      return;
    }
    if (exception.startTime && exception.endTime && exception.endTime <= exception.startTime) {
      context.addIssue({
        code: "custom",
        message: "End time must be after start time.",
        path: ["endTime"],
      });
    }
  });

type RangeLike = { startTime: string; endTime: string };

function addOverlapIssues<T extends RangeLike>(
  ranges: Array<{ index: number; range: T }>,
  path: "weekly" | "exceptions",
  context: z.RefinementCtx,
) {
  const ordered = [...ranges].sort((left, right) =>
    left.range.startTime.localeCompare(right.range.startTime),
  );

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1]!;
    const current = ordered[index]!;
    if (current.range.startTime < previous.range.endTime) {
      context.addIssue({
        code: "custom",
        message: "Time ranges on the same day cannot overlap.",
        path: [path, current.index, "startTime"],
      });
    }
  }
}

export const availabilitySchema = z
  .object({
    weekly: z.array(availabilityRuleSchema).max(70),
    exceptions: z.array(availabilityExceptionSchema).max(100),
  })
  .strict()
  .superRefine((availability, context) => {
    for (let weekday = 0; weekday <= 6; weekday += 1) {
      addOverlapIssues(
        availability.weekly
          .map((range, index) => ({ index, range }))
          .filter(({ range }) => range.weekday === weekday),
        "weekly",
        context,
      );
    }

    const dates = new Set(availability.exceptions.map((exception) => exception.date));
    for (const date of dates) {
      const onDate = availability.exceptions
        .map((exception, index) => ({ exception, index }))
        .filter(({ exception }) => exception.date === date);
      const wholeDayBlocks = onDate.filter(
        ({ exception }) => exception.kind === "blocked" && exception.startTime === null,
      );

      if (wholeDayBlocks.length > 0 && onDate.length > 1) {
        for (const { index } of wholeDayBlocks) {
          context.addIssue({
            code: "custom",
            message: "A whole-day block must be the only exception on its date.",
            path: ["exceptions", index, "date"],
          });
        }
        continue;
      }

      addOverlapIssues(
        onDate
          .filter(
            ({ exception }) => exception.startTime !== null && exception.endTime !== null,
          )
          .map(({ exception, index }) => ({
            index,
            range: {
              startTime: exception.startTime!,
              endTime: exception.endTime!,
            },
          })),
        "exceptions",
        context,
      );
    }
  });

export const slotParamsSchema = z.object({ id: z.string().uuid() }).strict();
export const slotQuerySchema = z
  .object({ type: z.enum(["normal", "urgent", "subscription"]) })
  .strict();

export type AvailabilityInput = z.infer<typeof availabilitySchema>;
export type AvailabilityRuleInput = z.infer<typeof availabilityRuleSchema>;
export type AvailabilityExceptionInput = z.infer<typeof availabilityExceptionSchema>;
export type CallType = z.infer<typeof slotQuerySchema>["type"];

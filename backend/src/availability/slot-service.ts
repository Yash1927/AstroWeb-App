import "temporal-polyfill/global";
import { db } from "../prisma/db";
import type {
  AvailabilityExceptionInput,
  AvailabilityRuleInput,
  CallType,
} from "./availability-schemas";

export const APP_TIME_ZONE = "Asia/Kolkata";

type MinuteRange = { start: number; end: number };

export type BlockingBooking = {
  endsAt: Temporal.Instant;
  holdExpiresAt: Temporal.Instant | null;
  startsAt: Temporal.Instant;
  status: "confirmed" | "pending_payment";
};

export type AvailableSlot = {
  endsAt: string;
  startsAt: string;
};

export type SlotDay = {
  date: string;
  slots: AvailableSlot[];
};

export type SlotResult = {
  days: SlotDay[];
  durationMin: 10 | 15 | 30;
  timeZone: typeof APP_TIME_ZONE;
};

export type CalculateAvailableSlotsInput = {
  astrologerId: string;
  bookings: BlockingBooking[];
  callType: CallType;
  durationMin: 10 | 15 | 30;
  endDate: string;
  exceptions: AvailabilityExceptionInput[];
  now: Temporal.Instant;
  startDate: string;
  weekly: AvailabilityRuleInput[];
};

function minuteOfDay(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours! * 60 + minutes!;
}

function clockAt(minutes: number) {
  return Temporal.PlainTime.from({
    hour: Math.floor(minutes / 60),
    minute: minutes % 60,
  });
}

function mergeRanges(ranges: MinuteRange[]) {
  const ordered = [...ranges].sort((left, right) => left.start - right.start || left.end - right.end);
  const merged: MinuteRange[] = [];

  for (const range of ordered) {
    const previous = merged.at(-1);
    if (!previous || range.start > previous.end) {
      merged.push({ ...range });
    } else {
      previous.end = Math.max(previous.end, range.end);
    }
  }

  return merged;
}

function subtractRange(windows: MinuteRange[], blocked: MinuteRange) {
  return windows.flatMap((window): MinuteRange[] => {
    if (blocked.end <= window.start || blocked.start >= window.end) return [window];

    const remaining: MinuteRange[] = [];
    if (blocked.start > window.start) {
      remaining.push({ start: window.start, end: blocked.start });
    }
    if (blocked.end < window.end) {
      remaining.push({ start: blocked.end, end: window.end });
    }
    return remaining;
  });
}

export function availabilityWindowsForDate(
  date: Temporal.PlainDate,
  weekly: AvailabilityRuleInput[],
  exceptions: AvailabilityExceptionInput[],
) {
  const weekday = date.dayOfWeek % 7;
  const dateText = date.toString();
  const onDate = exceptions.filter((exception) => exception.date === dateText);

  if (onDate.some((exception) => exception.kind === "blocked" && exception.startTime === null)) {
    return [];
  }

  let windows = mergeRanges([
    ...weekly
      .filter((range) => range.weekday === weekday)
      .map((range) => ({
        start: minuteOfDay(range.startTime),
        end: minuteOfDay(range.endTime),
      })),
    ...onDate
      .filter((exception) => exception.kind === "extra")
      .map((exception) => ({
        start: minuteOfDay(exception.startTime!),
        end: minuteOfDay(exception.endTime!),
      })),
  ]);

  for (const exception of onDate) {
    if (exception.kind !== "blocked" || !exception.startTime || !exception.endTime) continue;
    windows = subtractRange(windows, {
      start: minuteOfDay(exception.startTime),
      end: minuteOfDay(exception.endTime),
    });
  }

  return windows;
}

function overlaps(
  startsAt: Temporal.Instant,
  endsAt: Temporal.Instant,
  booking: BlockingBooking,
) {
  return Temporal.Instant.compare(startsAt, booking.endsAt) < 0
    && Temporal.Instant.compare(endsAt, booking.startsAt) > 0;
}

export function calculateAvailableSlots(input: CalculateAvailableSlotsInput): SlotResult {
  const startDate = Temporal.PlainDate.from(input.startDate);
  const endDate = Temporal.PlainDate.from(input.endDate);
  if (Temporal.PlainDate.compare(endDate, startDate) < 0) {
    throw new RangeError("The slot date range is invalid.");
  }

  const today = input.now.toZonedDateTimeISO(APP_TIME_ZONE).toPlainDate();
  const earliestDate = input.callType === "normal" ? today.add({ days: 1 }) : today;
  const blockingBookings = input.bookings.filter((booking) =>
    booking.status === "confirmed"
    || (
      booking.status === "pending_payment"
      && booking.holdExpiresAt !== null
      && Temporal.Instant.compare(booking.holdExpiresAt, input.now) > 0
    ),
  );
  const days: SlotDay[] = [];

  for (
    let date = startDate;
    Temporal.PlainDate.compare(date, endDate) <= 0;
    date = date.add({ days: 1 })
  ) {
    const slots: AvailableSlot[] = [];

    if (Temporal.PlainDate.compare(date, earliestDate) >= 0) {
      for (const window of availabilityWindowsForDate(date, input.weekly, input.exceptions)) {
        for (
          let startMinute = window.start;
          startMinute + input.durationMin <= window.end;
          startMinute += input.durationMin
        ) {
          const startsAt = date
            .toZonedDateTime({ timeZone: APP_TIME_ZONE, plainTime: clockAt(startMinute) })
            .toInstant();
          const endsAt = startsAt.add({ minutes: input.durationMin });

          if (Temporal.Instant.compare(startsAt, input.now) < 0) continue;
          if (blockingBookings.some((booking) => overlaps(startsAt, endsAt, booking))) continue;

          slots.push({ startsAt: startsAt.toString(), endsAt: endsAt.toString() });
        }
      }
    }

    days.push({ date: date.toString(), slots });
  }

  return { days, durationMin: input.durationMin, timeZone: APP_TIME_ZONE };
}

export class SlotAstrologerNotFoundError extends Error {}

export interface SlotService {
  getAvailableSlots(input: {
    astrologerId: string;
    callType: CallType;
    endDate: string;
    now?: Temporal.Instant;
    startDate: string;
  }): Promise<SlotResult>;
}

function timeText(value: { toString(options?: { smallestUnit: "minute" }): string }) {
  return value.toString({ smallestUnit: "minute" });
}

export class DatabaseSlotService implements SlotService {
  async getAvailableSlots(input: {
    astrologerId: string;
    callType: CallType;
    endDate: string;
    now?: Temporal.Instant;
    startDate: string;
  }) {
    const now = input.now ?? Temporal.Now.instant();
    const startDate = Temporal.PlainDate.from(input.startDate);
    const endDate = Temporal.PlainDate.from(input.endDate);
    const astrologer = await db.orm.public.Astrologer
      .select("id")
      .where({ id: input.astrologerId, isActive: true, isListed: true })
      .where((candidate) => candidate.profileSavedAt.isNotNull())
      .first();
    if (!astrologer) throw new SlotAstrologerNotFoundError("Astrologer not found.");

    const settings = await db.orm.public.Settings.select(
      "normalDurationMin",
      "urgentDurationMin",
      "subscriptionDurationMin",
    ).first({ id: 1 });
    if (!settings) throw new Error("Settings are unavailable.");

    const weeklyRows = await db.orm.public.AvailabilityRule.select(
      "weekday",
      "startTime",
      "endTime",
    ).where({ astrologerId: input.astrologerId }).all();
    const exceptionRows = await db.orm.public.AvailabilityException.select(
      "date",
      "kind",
      "startTime",
      "endTime",
    )
      .where({ astrologerId: input.astrologerId })
      .where((exception) => exception.date.gte(startDate))
      .where((exception) => exception.date.lte(endDate))
      .all();

    const rangeStart = startDate
      .toZonedDateTime({ timeZone: APP_TIME_ZONE, plainTime: Temporal.PlainTime.from("00:00") })
      .toInstant();
    const rangeEnd = endDate.add({ days: 1 })
      .toZonedDateTime({ timeZone: APP_TIME_ZONE, plainTime: Temporal.PlainTime.from("00:00") })
      .toInstant();
    const bookingRows = await db.orm.public.Booking.select(
      "startsAt",
      "endsAt",
      "status",
      "holdExpiresAt",
    )
      .where({ astrologerId: input.astrologerId })
      .where((booking) => booking.status.in(["confirmed", "pending_payment"]))
      .where((booking) => booking.startsAt.lt(rangeEnd))
      .where((booking) => booking.endsAt.gt(rangeStart))
      .all();

    const durationField = `${input.callType}DurationMin` as const;
    const durationMin = settings[durationField];
    if (durationMin !== 10 && durationMin !== 15 && durationMin !== 30) {
      throw new Error("The call duration is invalid.");
    }

    return calculateAvailableSlots({
      astrologerId: input.astrologerId,
      callType: input.callType,
      durationMin,
      startDate: input.startDate,
      endDate: input.endDate,
      now,
      weekly: weeklyRows.map((range) => ({
        weekday: range.weekday,
        startTime: timeText(range.startTime),
        endTime: timeText(range.endTime),
      })),
      exceptions: exceptionRows.map((exception) => ({
        date: exception.date.toString(),
        kind: exception.kind,
        startTime: exception.startTime ? timeText(exception.startTime) : null,
        endTime: exception.endTime ? timeText(exception.endTime) : null,
      })),
      bookings: bookingRows.map((booking) => ({
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        status: booking.status as "confirmed" | "pending_payment",
        holdExpiresAt: booking.holdExpiresAt,
      })),
    });
  }
}

export const slotService = new DatabaseSlotService();

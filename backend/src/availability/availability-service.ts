import { randomUUID } from "node:crypto";
import "temporal-polyfill/global";
import {
  AstrologerNotFoundError,
  AstrologerPasswordStateError,
} from "../astrologer/astrologer-service";
import { db } from "../prisma/db";
import type { AvailabilityInput } from "./availability-schemas";
import { APP_TIME_ZONE, availabilityWindowsForDate } from "./slot-service";

export type SavedAvailability = AvailabilityInput & {
  displacedBookingCount: number;
};

export interface AvailabilityService {
  getAvailability(astrologerId: string): Promise<AvailabilityInput>;
  saveAvailability(astrologerId: string, input: AvailabilityInput): Promise<SavedAvailability>;
}

type ReadyAstrologer = {
  id: string;
  isActive: boolean;
  mustChangePassword: boolean;
};

function assertReady(astrologer: ReadyAstrologer | null) {
  if (!astrologer?.isActive) throw new AstrologerNotFoundError("Astrologer not found.");
  if (astrologer.mustChangePassword) {
    throw new AstrologerPasswordStateError("Set a new password before continuing.");
  }
}

function timeText(value: { toString(options?: { smallestUnit: "minute" }): string }) {
  return value.toString({ smallestUnit: "minute" });
}

function sortedAvailability(availability: AvailabilityInput): AvailabilityInput {
  return {
    weekly: [...availability.weekly].sort(
      (left, right) => left.weekday - right.weekday
        || left.startTime.localeCompare(right.startTime),
    ),
    exceptions: [...availability.exceptions].sort(
      (left, right) => left.date.localeCompare(right.date)
        || (left.startTime ?? "").localeCompare(right.startTime ?? "")
        || left.kind.localeCompare(right.kind),
    ),
  };
}

function bookingFallsOutside(
  booking: { startsAt: Temporal.Instant; endsAt: Temporal.Instant },
  availability: AvailabilityInput,
) {
  const start = booking.startsAt.toZonedDateTimeISO(APP_TIME_ZONE);
  const end = booking.endsAt.toZonedDateTimeISO(APP_TIME_ZONE);
  if (!start.toPlainDate().equals(end.toPlainDate())) return true;

  const startMinute = start.hour * 60 + start.minute;
  const endMinute = end.hour * 60 + end.minute;
  return !availabilityWindowsForDate(
    start.toPlainDate(),
    availability.weekly,
    availability.exceptions,
  ).some((window) => window.start <= startMinute && window.end >= endMinute);
}

export class DatabaseAvailabilityService implements AvailabilityService {
  async getAvailability(astrologerId: string) {
    const astrologer = await db.orm.public.Astrologer.select(
      "id",
      "isActive",
      "mustChangePassword",
    ).first({ id: astrologerId });
    assertReady(astrologer);

    const weekly = await db.orm.public.AvailabilityRule.select(
      "weekday",
      "startTime",
      "endTime",
    ).where({ astrologerId }).all();
    const exceptions = await db.orm.public.AvailabilityException.select(
      "date",
      "kind",
      "startTime",
      "endTime",
    ).where({ astrologerId }).all();

    return sortedAvailability({
      weekly: weekly.map((range) => ({
        weekday: range.weekday,
        startTime: timeText(range.startTime),
        endTime: timeText(range.endTime),
      })),
      exceptions: exceptions.map((exception) => ({
        date: exception.date.toString(),
        kind: exception.kind,
        startTime: exception.startTime ? timeText(exception.startTime) : null,
        endTime: exception.endTime ? timeText(exception.endTime) : null,
      })),
    });
  }

  async saveAvailability(astrologerId: string, input: AvailabilityInput) {
    const availability = sortedAvailability(input);
    const displacedBookingCount = await db.transaction(async (transaction) => {
      const astrologer = await transaction.orm.public.Astrologer.select(
        "id",
        "isActive",
        "mustChangePassword",
      ).first({ id: astrologerId });
      assertReady(astrologer);

      const now = Temporal.Now.instant();
      const futureBookings = await transaction.orm.public.Booking.select(
        "startsAt",
        "endsAt",
      )
        .where({ astrologerId, status: "confirmed" })
        .where((booking) => booking.endsAt.gt(now))
        .all();

      await transaction.orm.public.AvailabilityRule.where({ astrologerId }).delete();
      await transaction.orm.public.AvailabilityException.where({ astrologerId }).delete();

      for (const range of availability.weekly) {
        await transaction.orm.public.AvailabilityRule.create({
          id: randomUUID(),
          astrologerId,
          weekday: range.weekday,
          startTime: Temporal.PlainTime.from(range.startTime),
          endTime: Temporal.PlainTime.from(range.endTime),
        });
      }
      for (const exception of availability.exceptions) {
        await transaction.orm.public.AvailabilityException.create({
          id: randomUUID(),
          astrologerId,
          date: Temporal.PlainDate.from(exception.date),
          kind: exception.kind,
          startTime: exception.startTime ? Temporal.PlainTime.from(exception.startTime) : null,
          endTime: exception.endTime ? Temporal.PlainTime.from(exception.endTime) : null,
        });
      }

      return futureBookings.filter((booking) => bookingFallsOutside(booking, availability)).length;
    });

    return { ...availability, displacedBookingCount };
  }
}

export const availabilityService = new DatabaseAvailabilityService();

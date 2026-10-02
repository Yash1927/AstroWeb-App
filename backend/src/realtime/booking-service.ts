import "temporal-polyfill/global";
import { db } from "../prisma/db";
import type { RealtimeParticipant } from "./signaling";

export type RealtimeBooking = {
  astrologerId: string;
  astrologerJoinedAt: Temporal.Instant | null;
  endsAt: Temporal.Instant;
  id: string;
  startsAt: Temporal.Instant;
  userId: string;
  userJoinedAt: Temporal.Instant | null;
};

export interface RealtimeBookingRepository {
  finalizeBooking(bookingId: string, status: "completed" | "missed"): Promise<void>;
  findBooking(bookingId: string): Promise<RealtimeBooking | null>;
  findEndedBookings(now: Temporal.Instant): Promise<RealtimeBooking[]>;
  markFirstJoin(
    bookingId: string,
    participant: RealtimeParticipant,
    joinedAt: Temporal.Instant,
  ): Promise<void>;
}

export interface RealtimeBookingService {
  authorizeBooking(input: {
    bookingId: string;
    participant: RealtimeParticipant;
    subjectId: string;
    now?: Temporal.Instant;
  }): Promise<RealtimeBooking>;
  finalizeBooking(bookingId: string, now?: Temporal.Instant): Promise<void>;
  finalizeEnded(now?: Temporal.Instant): Promise<void>;
  joinBooking(input: {
    bookingId: string;
    participant: RealtimeParticipant;
    subjectId: string;
    now?: Temporal.Instant;
  }): Promise<RealtimeBooking>;
}

export class RealtimeBookingUnavailableError extends Error {}

const realtimeBookingFields = [
  "id",
  "userId",
  "astrologerId",
  "startsAt",
  "endsAt",
  "userJoinedAt",
  "astrologerJoinedAt",
] as const;

export class DatabaseRealtimeBookingRepository implements RealtimeBookingRepository {
  async findBooking(bookingId: string) {
    return db.orm.public.Booking.select(...realtimeBookingFields).first({
      id: bookingId,
      callMode: "in_app",
      status: "confirmed",
    });
  }

  async markFirstJoin(
    bookingId: string,
    participant: RealtimeParticipant,
    joinedAt: Temporal.Instant,
  ) {
    if (participant === "user") {
      await db.orm.public.Booking.where({
        id: bookingId,
        status: "confirmed",
        userJoinedAt: null,
      }).update({ userJoinedAt: joinedAt });
      return;
    }

    await db.orm.public.Booking.where({
      id: bookingId,
      status: "confirmed",
      astrologerJoinedAt: null,
    }).update({ astrologerJoinedAt: joinedAt });
  }

  async findEndedBookings(now: Temporal.Instant) {
    return db.orm.public.Booking.select(...realtimeBookingFields)
      .where({ callMode: "in_app", status: "confirmed" })
      .where((booking) => booking.endsAt.lte(now))
      .all();
  }

  async finalizeBooking(bookingId: string, status: "completed" | "missed") {
    await db.orm.public.Booking.where({
      id: bookingId,
      callMode: "in_app",
      status: "confirmed",
    }).update({ status });
  }
}

function participantOwnsBooking(
  booking: RealtimeBooking,
  participant: RealtimeParticipant,
  subjectId: string,
) {
  return participant === "user"
    ? booking.userId === subjectId
    : booking.astrologerId === subjectId;
}

function inCallWindow(booking: RealtimeBooking, now: Temporal.Instant) {
  return Temporal.Instant.compare(now, booking.startsAt) >= 0
    && Temporal.Instant.compare(now, booking.endsAt) < 0;
}

function endedStatus(booking: RealtimeBooking) {
  return booking.userJoinedAt && booking.astrologerJoinedAt
    ? "completed" as const
    : "missed" as const;
}

export class DefaultRealtimeBookingService implements RealtimeBookingService {
  constructor(
    private readonly repository: RealtimeBookingRepository,
    private readonly clock: () => Temporal.Instant = () => Temporal.Now.instant(),
  ) {}

  async authorizeBooking({ bookingId, participant, subjectId, now = this.clock() }: {
    bookingId: string;
    participant: RealtimeParticipant;
    subjectId: string;
    now?: Temporal.Instant;
  }) {
    const booking = await this.repository.findBooking(bookingId);
    if (!booking || !participantOwnsBooking(booking, participant, subjectId)) {
      throw new RealtimeBookingUnavailableError("Call unavailable.");
    }
    if (!inCallWindow(booking, now)) {
      throw new RealtimeBookingUnavailableError("Call unavailable.");
    }

    return booking;
  }

  async joinBooking({ bookingId, participant, subjectId, now = this.clock() }: {
    bookingId: string;
    participant: RealtimeParticipant;
    subjectId: string;
    now?: Temporal.Instant;
  }) {
    const booking = await this.authorizeBooking({ bookingId, participant, subjectId, now });

    await this.repository.markFirstJoin(booking.id, participant, now);
    return participant === "user"
      ? { ...booking, userJoinedAt: booking.userJoinedAt ?? now }
      : { ...booking, astrologerJoinedAt: booking.astrologerJoinedAt ?? now };
  }

  async finalizeBooking(bookingId: string, now = this.clock()) {
    const booking = await this.repository.findBooking(bookingId);
    if (!booking || Temporal.Instant.compare(now, booking.endsAt) < 0) return;
    await this.repository.finalizeBooking(booking.id, endedStatus(booking));
  }

  async finalizeEnded(now = this.clock()) {
    const bookings = await this.repository.findEndedBookings(now);
    await Promise.all(bookings.map((booking) => (
      this.repository.finalizeBooking(booking.id, endedStatus(booking))
    )));
  }
}

export const realtimeBookingRepository = new DatabaseRealtimeBookingRepository();
export const realtimeBookingService = new DefaultRealtimeBookingService(
  realtimeBookingRepository,
);

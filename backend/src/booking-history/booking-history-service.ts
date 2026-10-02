import "temporal-polyfill/global";
import { db } from "../prisma/db";

type BookingStatus = "upcoming" | "completed" | "missed" | "phone-call";

type BookingRow = {
  astrologerId: string;
  astrologerJoinedAt: Temporal.Instant | null;
  callMode: "in_app" | "phone";
  callType: "normal" | "urgent" | "subscription";
  endsAt: Temporal.Instant;
  id: string;
  pricePaise: number;
  startsAt: Temporal.Instant;
  usedCredit: boolean;
  userId: string;
  userJoinedAt: Temporal.Instant | null;
};

type AstrologerRow = {
  displayName: string;
  id: string;
};

type UserRow = {
  birthDate: Temporal.PlainDate | null;
  birthPlace: string | null;
  birthTime: Temporal.PlainTime | null;
  gender: "male" | "female" | "other" | null;
  id: string;
  name: string;
  phone: string | null;
};

export type BookingCardBase = {
  callMode: "in_app" | "phone";
  callType: "normal" | "urgent" | "subscription";
  durationMin: number;
  endedStatus: Exclude<BookingStatus, "upcoming">;
  endsAt: string;
  id: string;
  pricePaise: number;
  startsAt: string;
  status: BookingStatus;
  usedCredit: boolean;
};

export type UserBookingCard = BookingCardBase & {
  astrologer: AstrologerRow;
  phone: string | null;
};

export type AstrologerBookingCard = BookingCardBase & {
  user: {
    birthDate: string | null;
    birthPlace: string | null;
    birthTime: string | null;
    gender: "male" | "female" | "other" | null;
    id: string;
    name: string;
    phone: string | null;
  };
};

export type BookingSections<T> = {
  past: T[];
  upcoming: T[];
};

export type UserBookingSections = BookingSections<UserBookingCard> & {
  subscriptionCredits: number;
};

export interface BookingHistoryRepository {
  findAstrologers(ids: string[]): Promise<AstrologerRow[]>;
  findUsers(ids: string[]): Promise<UserRow[]>;
  getAstrologerBooking(astrologerId: string, bookingId: string): Promise<BookingRow | null>;
  getUserSubscriptionCredits(userId: string): Promise<number>;
  getUserBooking(userId: string, bookingId: string): Promise<BookingRow | null>;
  listAstrologerBookings(astrologerId: string): Promise<BookingRow[]>;
  listUserBookings(userId: string): Promise<BookingRow[]>;
}

export interface BookingHistoryService {
  getAstrologerBooking(astrologerId: string, bookingId: string): Promise<AstrologerBookingCard | null>;
  getUserBooking(userId: string, bookingId: string): Promise<UserBookingCard | null>;
  listAstrologerBookings(astrologerId: string): Promise<BookingSections<AstrologerBookingCard>>;
  listUserBookings(userId: string): Promise<UserBookingSections>;
}

const bookingFields = [
  "id",
  "userId",
  "astrologerId",
  "callMode",
  "callType",
  "startsAt",
  "endsAt",
  "pricePaise",
  "usedCredit",
  "userJoinedAt",
  "astrologerJoinedAt",
] as const;

export class DatabaseBookingHistoryRepository implements BookingHistoryRepository {
  async listUserBookings(userId: string) {
    const rows = await db.orm.public.Booking.select(...bookingFields)
      .where({ userId })
      .where((booking) => booking.status.in(["confirmed", "completed", "missed"]))
      .all();
    return rows as BookingRow[];
  }

  async listAstrologerBookings(astrologerId: string) {
    const rows = await db.orm.public.Booking.select(...bookingFields)
      .where({ astrologerId })
      .where((booking) => booking.status.in(["confirmed", "completed", "missed"]))
      .all();
    return rows as BookingRow[];
  }

  async getUserBooking(userId: string, bookingId: string) {
    const row = await db.orm.public.Booking.select(...bookingFields)
      .where({ userId, id: bookingId, callType: "normal" })
      .where((booking) => booking.status.in(["confirmed", "completed", "missed"]))
      .first();
    return row ? { ...row, callType: "normal" as const, callMode: "in_app" as const } : null;
  }

  async getUserSubscriptionCredits(userId: string) {
    const user = await db.orm.public.User.select("subscriptionCredits").first({ id: userId });
    return user?.subscriptionCredits ?? 0;
  }

  async getAstrologerBooking(astrologerId: string, bookingId: string) {
    const row = await db.orm.public.Booking.select(...bookingFields)
      .where({ astrologerId, id: bookingId, callType: "normal" })
      .where((booking) => booking.status.in(["confirmed", "completed", "missed"]))
      .first();
    return row ? { ...row, callType: "normal" as const, callMode: "in_app" as const } : null;
  }

  async findAstrologers(ids: string[]) {
    if (ids.length === 0) return [];
    return db.orm.public.Astrologer.select("id", "displayName")
      .where((astrologer) => astrologer.id.in(ids))
      .all();
  }

  async findUsers(ids: string[]) {
    if (ids.length === 0) return [];
    return db.orm.public.User.select(
      "id",
      "name",
      "birthDate",
      "birthTime",
      "birthPlace",
      "phone",
      "gender",
    )
      .where((user) => user.id.in(ids))
      .all();
  }
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function statusFor(booking: BookingRow, now: Temporal.Instant): BookingStatus {
  if (Temporal.Instant.compare(now, booking.endsAt) < 0) return "upcoming";
  if (booking.callMode === "phone") return "phone-call";
  return booking.userJoinedAt && booking.astrologerJoinedAt ? "completed" : "missed";
}

function baseCard(booking: BookingRow, now: Temporal.Instant): BookingCardBase {
  const endedStatus = booking.callMode === "phone"
    ? "phone-call"
    : booking.userJoinedAt && booking.astrologerJoinedAt
      ? "completed"
      : "missed";
  return {
    id: booking.id,
    callType: booking.callType,
    callMode: booking.callMode,
    startsAt: booking.startsAt.toString(),
    endsAt: booking.endsAt.toString(),
    durationMin: Math.round(
      (booking.endsAt.epochMilliseconds - booking.startsAt.epochMilliseconds) / 60_000,
    ),
    pricePaise: booking.pricePaise,
    usedCredit: booking.usedCredit,
    status: statusFor(booking, now),
    endedStatus,
  };
}

function sections<T extends BookingCardBase>(bookings: T[]): BookingSections<T> {
  return {
    upcoming: bookings
      .filter((booking) => booking.status === "upcoming")
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt)),
    past: bookings
      .filter((booking) => booking.status !== "upcoming")
      .sort((left, right) => right.startsAt.localeCompare(left.startsAt)),
  };
}

function publicUser(user: UserRow): AstrologerBookingCard["user"] {
  return {
    id: user.id,
    name: user.name,
    birthDate: user.birthDate?.toString() ?? null,
    birthTime: user.birthTime?.toString({ smallestUnit: "minute" }) ?? null,
    birthPlace: user.birthPlace,
    gender: user.gender,
    phone: user.phone,
  };
}

export class DefaultBookingHistoryService implements BookingHistoryService {
  constructor(
    private readonly repository: BookingHistoryRepository,
    private readonly now: () => Temporal.Instant = () => Temporal.Now.instant(),
  ) {}

  async listUserBookings(userId: string) {
    const [bookings, currentUsers, subscriptionCredits] = await Promise.all([
      this.repository.listUserBookings(userId),
      this.repository.findUsers([userId]),
      this.repository.getUserSubscriptionCredits(userId),
    ]);
    const astrologers = await this.repository.findAstrologers(
      unique(bookings.map((booking) => booking.astrologerId)),
    );
    const byId = new Map(astrologers.map((astrologer) => [astrologer.id, astrologer]));
    const now = this.now();
    return {
      ...sections(bookings.flatMap((booking) => {
        const astrologer = byId.get(booking.astrologerId);
        return astrologer ? [{
          ...baseCard(booking, now),
          astrologer,
          phone: currentUsers[0]?.phone ?? null,
        }] : [];
      })),
      subscriptionCredits,
    };
  }

  async listAstrologerBookings(astrologerId: string) {
    const bookings = await this.repository.listAstrologerBookings(astrologerId);
    const users = await this.repository.findUsers(unique(bookings.map((booking) => booking.userId)));
    const byId = new Map(users.map((user) => [user.id, user]));
    const now = this.now();
    return sections(bookings.flatMap((booking) => {
      const user = byId.get(booking.userId);
      return user ? [{ ...baseCard(booking, now), user: publicUser(user) }] : [];
    }));
  }

  async getUserBooking(userId: string, bookingId: string) {
    const booking = await this.repository.getUserBooking(userId, bookingId);
    if (!booking) return null;
    const [astrologer] = await this.repository.findAstrologers([booking.astrologerId]);
    const [user] = await this.repository.findUsers([userId]);
    return astrologer ? {
      ...baseCard(booking, this.now()),
      astrologer,
      phone: user?.phone ?? null,
    } : null;
  }

  async getAstrologerBooking(astrologerId: string, bookingId: string) {
    const booking = await this.repository.getAstrologerBooking(astrologerId, bookingId);
    if (!booking) return null;
    const [user] = await this.repository.findUsers([booking.userId]);
    return user ? { ...baseCard(booking, this.now()), user: publicUser(user) } : null;
  }
}

export const bookingHistoryRepository = new DatabaseBookingHistoryRepository();
export const bookingHistoryService = new DefaultBookingHistoryService(bookingHistoryRepository);


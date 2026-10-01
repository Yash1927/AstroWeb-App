import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import "temporal-polyfill/global";
import { db } from "../prisma/db";
import {
  ensureDevelopmentEnvironment,
  parseMakeBookingArguments,
} from "./make-booking-helpers";

export async function makeDevelopmentBooking(arguments_: string[]) {
  ensureDevelopmentEnvironment(process.env.NODE_ENV);
  const input = parseMakeBookingArguments(arguments_);

  const [users, astrologer] = await Promise.all([
    db.orm.public.User.select("id").where({ email: input.userEmail }).all(),
    db.orm.public.Astrologer.select("id").first({ email: input.astrologerEmail }),
  ]);
  if (users.length !== 1) {
    throw new Error(users.length === 0
      ? "No user has that email address."
      : "More than one user has that email address.");
  }
  if (!astrologer) throw new Error("No astrologer has that email address.");

  const startsAt = Temporal.Now.instant().add({ minutes: input.startsInMin });
  const endsAt = startsAt.add({ minutes: input.durationMin });
  const booking = await db.orm.public.Booking.select("id", "startsAt", "endsAt").create({
    id: randomUUID(),
    userId: users[0]!.id,
    astrologerId: astrologer.id,
    callType: "normal",
    callMode: "in_app",
    startsAt,
    endsAt,
    status: "confirmed",
    holdExpiresAt: null,
    pricePaise: 0,
    usedCredit: false,
  });

  return {
    id: booking.id,
    startsAt: booking.startsAt.toString(),
    endsAt: booking.endsAt.toString(),
  };
}

async function main() {
  try {
    const booking = await makeDevelopmentBooking(process.argv.slice(2));
    console.log(`Development booking created: ${booking.id} (${booking.startsAt} to ${booking.endsAt}).`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "The development booking could not be created.");
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}

const entryFile = process.argv[1];
if (entryFile && import.meta.url === pathToFileURL(entryFile).href) {
  await main();
}


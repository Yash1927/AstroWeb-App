import { pathToFileURL } from "node:url";
import { db } from "./db";
import { hashOwnerPassword, readSeedInput, type SeedInput } from "./seed-helpers";

const OWNER_ID = "owner";
const SETTINGS_ID = 1;

export async function seedDatabase(input: SeedInput) {
  return db.transaction(async (transaction) => {
    const existingOwner = await transaction.orm.public.Owner.select("id").first();
    let ownerCreated = false;

    if (!existingOwner) {
      const passwordHash = await hashOwnerPassword(input.ownerPassword);

      await transaction.orm.public.Owner.create({
        id: OWNER_ID,
        email: input.ownerEmail,
        passwordHash,
      });
      ownerCreated = true;
    }

    const existingSettings = await transaction.orm.public.Settings.select("id").first({
      id: SETTINGS_ID,
    });
    let settingsCreated = false;

    if (!existingSettings) {
      await transaction.orm.public.Settings.create({
        id: SETTINGS_ID,
        normalPricePaise: 0,
        urgentPricePaise: 30_000,
        subscriptionPricePaise: 99_900,
        subscriptionCallsPerPack: 4,
        normalDurationMin: 15,
        urgentDurationMin: 15,
        subscriptionDurationMin: 15,
      });
      settingsCreated = true;
    }

    return { ownerCreated, settingsCreated };
  });
}

async function main() {
  try {
    const result = await seedDatabase(readSeedInput());
    console.log(
      `Seed complete. Owner created: ${result.ownerCreated}. Settings created: ${result.settingsCreated}.`,
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("OWNER_")) {
      console.error(error.message);
    } else {
      console.error("Seed failed. Check the database connection and try again.");
    }
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}

const entryFile = process.argv[1];

if (entryFile && import.meta.url === pathToFileURL(entryFile).href) {
  await main();
}

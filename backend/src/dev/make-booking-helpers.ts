import { z } from "zod";

const makeBookingInputSchema = z.object({
  astrologerEmail: z.string().trim().toLowerCase().email(),
  durationMin: z.coerce.number().int().positive().max(1_440),
  startsInMin: z.coerce.number().int().min(-10_080).max(10_080),
  userEmail: z.string().trim().toLowerCase().email(),
}).strict();

const optionNames: Record<string, keyof MakeBookingInput> = {
  "--astrologer": "astrologerEmail",
  "--duration": "durationMin",
  "--starts-in": "startsInMin",
  "--user": "userEmail",
};

export type MakeBookingInput = z.infer<typeof makeBookingInputSchema>;

export function ensureDevelopmentEnvironment(nodeEnv: string | undefined) {
  if (nodeEnv === "production") {
    throw new Error("dev:make-booking refuses to run in production.");
  }
}

export function parseMakeBookingArguments(arguments_: string[]): MakeBookingInput {
  const parsed: Record<string, string> = {};

  for (let index = 0; index < arguments_.length; index += 2) {
    const option = arguments_[index];
    const value = arguments_[index + 1];
    const field = option ? optionNames[option] : undefined;
    if (!field || value === undefined || value.startsWith("--") || field in parsed) {
      throw new Error(
        "Usage: npm run dev:make-booking -- --user USER_EMAIL --astrologer ASTROLOGER_EMAIL --starts-in MINUTES --duration MINUTES",
      );
    }
    parsed[field] = value;
  }

  const result = makeBookingInputSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      "Usage: npm run dev:make-booking -- --user USER_EMAIL --astrologer ASTROLOGER_EMAIL --starts-in MINUTES --duration MINUTES",
    );
  }
  return result.data;
}


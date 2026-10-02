import { z } from "zod";

export const MAX_REALTIME_MESSAGE_BYTES = 16 * 1_024;

const bookingIdSchema = z.string().uuid();
const sdpSchema = z.string().min(1).max(12_000);
const chatTextSchema = z.string().trim().min(1).max(500);

const iceCandidateSchema = z.object({
  candidate: z.string().max(2_048),
  sdpMid: z.string().max(256).nullable(),
  sdpMLineIndex: z.number().int().min(0).max(65_535).nullable(),
  usernameFragment: z.string().max(256).nullable().optional(),
}).strict();

export const realtimeRoleQuerySchema = z.object({
  role: z.enum(["user", "astrologer"]),
}).strict();

export const clientRealtimeMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("join"), bookingId: bookingIdSchema }).strict(),
  z.object({ type: z.literal("leave") }).strict(),
  z.object({ type: z.literal("offer"), sdp: sdpSchema }).strict(),
  z.object({ type: z.literal("answer"), sdp: sdpSchema }).strict(),
  z.object({ type: z.literal("ice-candidate"), candidate: iceCandidateSchema }).strict(),
  z.object({ type: z.literal("mute-state"), muted: z.boolean() }).strict(),
  z.object({ type: z.literal("chat"), text: chatTextSchema }).strict(),
]);

const participantSchema = z.enum(["user", "astrologer"]);
const participantPresenceSchema = z.object({
  muted: z.boolean(),
  present: z.boolean(),
}).strict();

export const serverRealtimeMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("join"),
    bookingId: bookingIdSchema,
    participant: participantSchema,
  }).strict(),
  z.object({
    type: z.literal("leave"),
    participant: participantSchema,
    reason: z.enum(["left", "ended"]),
  }).strict(),
  z.object({
    type: z.literal("presence"),
    participants: z.object({
      astrologer: participantPresenceSchema,
      user: participantPresenceSchema,
    }).strict(),
  }).strict(),
  z.object({ type: z.literal("offer"), from: participantSchema, sdp: sdpSchema }).strict(),
  z.object({ type: z.literal("answer"), from: participantSchema, sdp: sdpSchema }).strict(),
  z.object({
    type: z.literal("ice-candidate"),
    from: participantSchema,
    candidate: iceCandidateSchema,
  }).strict(),
  z.object({
    type: z.literal("mute-state"),
    participant: participantSchema,
    muted: z.boolean(),
  }).strict(),
  z.object({
    type: z.literal("chat"),
    from: participantSchema,
    text: chatTextSchema,
  }).strict(),
]);

export type RealtimeParticipant = z.infer<typeof participantSchema>;
export type ClientRealtimeMessage = z.infer<typeof clientRealtimeMessageSchema>;
export type ServerRealtimeMessage = z.infer<typeof serverRealtimeMessageSchema>;

import type { IncomingMessage, Server as HttpServer } from "node:http";
import type { Duplex } from "node:stream";
import "temporal-polyfill/global";
import WebSocket, { WebSocketServer, type RawData } from "ws";
import { sessionManager, type SessionManager } from "../auth/session";
import {
  RealtimeBookingUnavailableError,
  realtimeBookingService,
  type RealtimeBookingService,
} from "./booking-service";
import {
  clientRealtimeMessageSchema,
  MAX_REALTIME_MESSAGE_BYTES,
  realtimeRoleQuerySchema,
  serverRealtimeMessageSchema,
  type RealtimeParticipant,
  type ServerRealtimeMessage,
} from "./signaling";

const END_SWEEP_INTERVAL_MS = 30_000;
const CHAT_INTERVAL_MS = 1_000;

type AuthenticatedSocket = {
  participant: RealtimeParticipant;
  subjectId: string;
};

type RoomParticipant = AuthenticatedSocket & {
  lastChatAtMs: number | null;
  muted: boolean;
  socket: WebSocket;
};

type Room = {
  bookingId: string;
  endsAt: Temporal.Instant;
  participants: Map<RealtimeParticipant, RoomParticipant>;
  timer: ReturnType<typeof setTimeout> | null;
};

type SocketState = AuthenticatedSocket & {
  roomId: string | null;
};

type RealtimeDependencies = {
  appOrigin?: string;
  bookings?: RealtimeBookingService;
  now?: () => Temporal.Instant;
  sessions?: SessionManager;
};

function rejectUpgrade(socket: Duplex, status: number, message: string) {
  if (!socket.writable) return;
  const body = `${message}\n`;
  socket.end(
    `HTTP/1.1 ${status} ${message}\r\n`
    + "Connection: close\r\n"
    + "Content-Type: text/plain; charset=utf-8\r\n"
    + `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n`
    + body,
  );
}

function queryRole(request: IncomingMessage) {
  try {
    const url = new URL(request.url ?? "", "http://localhost");
    if (url.pathname !== "/ws") return null;
    const queryEntries = [...url.searchParams.entries()];
    if (queryEntries.length !== 1) return null;
    const parsed = realtimeRoleQuerySchema.safeParse(Object.fromEntries(queryEntries));
    return parsed.success ? parsed.data.role : null;
  } catch {
    return null;
  }
}

function rawDataBytes(data: RawData) {
  if (Buffer.isBuffer(data)) return data.byteLength;
  if (data instanceof ArrayBuffer) return data.byteLength;
  return data.reduce((total, part) => total + part.byteLength, 0);
}

function rawDataText(data: RawData) {
  if (Buffer.isBuffer(data)) return data.toString("utf8");
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8");
  return Buffer.concat(data).toString("utf8");
}

function send(socket: WebSocket, message: ServerRealtimeMessage) {
  if (socket.readyState !== WebSocket.OPEN) return;
  const validated = serverRealtimeMessageSchema.parse(message);
  socket.send(JSON.stringify(validated));
}

export function attachRealtimeServer(
  server: HttpServer,
  dependencies: RealtimeDependencies = {},
) {
  const appOrigin = dependencies.appOrigin ?? process.env.APP_ORIGIN;
  const bookings = dependencies.bookings ?? realtimeBookingService;
  const sessions = dependencies.sessions ?? sessionManager;
  const now = dependencies.now ?? (() => Temporal.Now.instant());
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_REALTIME_MESSAGE_BYTES });
  const rooms = new Map<string, Room>();
  const socketStates = new WeakMap<WebSocket, SocketState>();

  function presence(room: Room): ServerRealtimeMessage {
    const user = room.participants.get("user");
    const astrologer = room.participants.get("astrologer");
    return {
      type: "presence",
      participants: {
        user: { present: Boolean(user), muted: user?.muted ?? false },
        astrologer: { present: Boolean(astrologer), muted: astrologer?.muted ?? false },
      },
    };
  }

  function broadcast(room: Room, message: ServerRealtimeMessage, except?: WebSocket) {
    for (const participant of room.participants.values()) {
      if (participant.socket !== except) send(participant.socket, message);
    }
  }

  function detach(socket: WebSocket, reason: "left" | "ended" = "left", notify = true) {
    const state = socketStates.get(socket);
    if (!state?.roomId) return;
    const room = rooms.get(state.roomId);
    state.roomId = null;
    if (!room) return;
    const current = room.participants.get(state.participant);
    if (current?.socket !== socket) return;
    room.participants.delete(state.participant);
    if (notify) {
      broadcast(room, { type: "leave", participant: state.participant, reason });
      broadcast(room, presence(room));
    }
  }

  async function endRoom(room: Room) {
    if (rooms.get(room.bookingId) !== room) return;
    rooms.delete(room.bookingId);
    for (const participant of [...room.participants.values()]) {
      detach(participant.socket, "ended");
      participant.socket.close(4000, "Call ended.");
    }
    try {
      await bookings.finalizeBooking(room.bookingId, now());
    } catch {
      console.error("Could not finalize an ended in-app call.");
    }
  }

  function createRoom(bookingId: string, endsAt: Temporal.Instant) {
    const delay = Math.max(0, endsAt.epochMilliseconds - now().epochMilliseconds);
    const room: Room = {
      bookingId,
      endsAt,
      participants: new Map(),
      timer: null,
    };
    room.timer = setTimeout(
      () => void endRoom(room),
      Math.min(delay, 2_147_483_647),
    );
    room.timer.unref?.();
    rooms.set(bookingId, room);
    return room;
  }

  async function handleMessage(socket: WebSocket, data: RawData, isBinary: boolean) {
    if (isBinary) {
      socket.close(1003, "Text messages only.");
      return;
    }
    if (rawDataBytes(data) > MAX_REALTIME_MESSAGE_BYTES) {
      socket.close(1009, "Message too large.");
      return;
    }

    let json: unknown;
    try {
      json = JSON.parse(rawDataText(data));
    } catch {
      socket.close(1007, "Invalid message.");
      return;
    }
    const parsed = clientRealtimeMessageSchema.safeParse(json);
    if (!parsed.success) {
      socket.close(1007, "Invalid message.");
      return;
    }

    const state = socketStates.get(socket);
    if (!state) {
      socket.close(1011, "Call unavailable.");
      return;
    }

    if (parsed.data.type === "join") {
      if (state.roomId === parsed.data.bookingId) {
        const currentRoom = rooms.get(state.roomId);
        if (currentRoom) {
          send(socket, {
            type: "join",
            bookingId: currentRoom.bookingId,
            participant: state.participant,
          });
          send(socket, presence(currentRoom));
        }
        return;
      }

      try {
        const booking = await bookings.joinBooking({
          bookingId: parsed.data.bookingId,
          participant: state.participant,
          subjectId: state.subjectId,
          now: now(),
        });
        detach(socket);
        const room = rooms.get(booking.id) ?? createRoom(booking.id, booking.endsAt);
        const previous = room.participants.get(state.participant);
        if (previous) {
          detach(previous.socket, "left", false);
          previous.socket.close(4001, "Call opened elsewhere.");
        }
        room.participants.set(state.participant, {
          ...state,
          lastChatAtMs: null,
          muted: false,
          socket,
        });
        state.roomId = room.bookingId;
        send(socket, {
          type: "join",
          bookingId: room.bookingId,
          participant: state.participant,
        });
        broadcast(room, presence(room));
      } catch (error) {
        if (error instanceof RealtimeBookingUnavailableError) {
          socket.close(4403, "Call unavailable.");
          return;
        }
        socket.close(1011, "Call unavailable.");
      }
      return;
    }

    const room = state.roomId ? rooms.get(state.roomId) : null;
    if (!room || room.participants.get(state.participant)?.socket !== socket) {
      socket.close(4403, "Join the call first.");
      return;
    }
    if (Temporal.Instant.compare(now(), room.endsAt) >= 0) {
      await endRoom(room);
      return;
    }

    if (parsed.data.type === "leave") {
      detach(socket);
      return;
    }

    if (parsed.data.type === "mute-state") {
      const participant = room.participants.get(state.participant);
      if (!participant) return;
      participant.muted = parsed.data.muted;
      broadcast(room, {
        type: "mute-state",
        participant: state.participant,
        muted: parsed.data.muted,
      }, socket);
      return;
    }

    if (parsed.data.type === "chat") {
      const participant = room.participants.get(state.participant);
      if (!participant) return;
      const sentAtMs = now().epochMilliseconds;
      if (
        participant.lastChatAtMs !== null
        && sentAtMs - participant.lastChatAtMs < CHAT_INTERVAL_MS
      ) return;
      participant.lastChatAtMs = sentAtMs;
      broadcast(room, {
        type: "chat",
        from: state.participant,
        text: parsed.data.text,
      }, socket);
      return;
    }

    const otherRole = state.participant === "user" ? "astrologer" : "user";
    const other = room.participants.get(otherRole);
    if (!other) return;
    if (parsed.data.type === "ice-candidate") {
      send(other.socket, {
        type: "ice-candidate",
        from: state.participant,
        candidate: parsed.data.candidate,
      });
      return;
    }
    send(other.socket, {
      type: parsed.data.type,
      from: state.participant,
      sdp: parsed.data.sdp,
    });
  }

  function handleConnection(socket: WebSocket, authentication: AuthenticatedSocket) {
    socketStates.set(socket, { ...authentication, roomId: null });
    let messageQueue = Promise.resolve();
    socket.on("message", (data, isBinary) => {
      messageQueue = messageQueue
        .then(() => handleMessage(socket, data, isBinary))
        .catch(() => socket.close(1011, "Call unavailable."));
    });
    socket.on("close", () => detach(socket));
    socket.on("error", () => detach(socket));
  }

  const upgradeHandler = async (
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ) => {
    if (!appOrigin || request.headers.origin !== appOrigin) {
      rejectUpgrade(socket, 403, "Forbidden");
      return;
    }
    const participant = queryRole(request);
    if (!participant) {
      rejectUpgrade(socket, 400, "Bad Request");
      return;
    }

    try {
      const session = await sessions.resolve(participant, request.headers.cookie);
      if (!session) {
        rejectUpgrade(socket, 401, "Unauthorized");
        return;
      }
      wss.handleUpgrade(request, socket, head, (webSocket) => {
        handleConnection(webSocket, {
          participant,
          subjectId: session.subjectId,
        });
      });
    } catch {
      rejectUpgrade(socket, 503, "Service Unavailable");
    }
  };

  server.on("upgrade", upgradeHandler);
  void bookings.finalizeEnded(now()).catch(() => {
    console.error("Could not finalize ended in-app calls.");
  });
  const sweep = setInterval(() => {
    void bookings.finalizeEnded(now()).catch(() => {
      console.error("Could not finalize ended in-app calls.");
    });
  }, END_SWEEP_INTERVAL_MS);
  sweep.unref?.();

  return {
    rooms,
    wss,
    close() {
      server.off("upgrade", upgradeHandler);
      clearInterval(sweep);
      for (const room of rooms.values()) {
        if (room.timer) clearTimeout(room.timer);
      }
      rooms.clear();
      for (const client of wss.clients) client.terminate();
      wss.close();
    },
  };
}

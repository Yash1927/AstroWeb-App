import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import "temporal-polyfill/global";
import WebSocket from "ws";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionManager } from "../auth/session";
import type {
  RealtimeBooking,
  RealtimeBookingService,
} from "./booking-service";
import { attachRealtimeServer } from "./index";
import { MAX_REALTIME_MESSAGE_BYTES } from "./signaling";

const bookingId = "1c10ff39-56b3-4c86-9fa4-a8cb17d4a7df";
const now = Temporal.Instant.from("2026-10-01T10:05:00Z");

function booking(): RealtimeBooking {
  return {
    id: bookingId,
    userId: "user-1",
    astrologerId: "astrologer-1",
    startsAt: now.subtract({ minutes: 5 }),
    endsAt: now.add({ minutes: 10 }),
    userJoinedAt: null,
    astrologerJoinedAt: null,
  };
}

function fakeSessions(): SessionManager {
  return {
    create: vi.fn(),
    destroy: vi.fn(),
    async resolve(role, cookie) {
      if (cookie !== `${role}=valid`) return null;
      return { id: `${role}-session`, role, subjectId: `${role}-1` };
    },
  };
}

function fakeBookings(): RealtimeBookingService {
  return {
    authorizeBooking: vi.fn(async (input) => {
      const expected = input.participant === "user" ? "user-1" : "astrologer-1";
      if (input.bookingId !== bookingId || input.subjectId !== expected) {
        throw new Error("not allowed");
      }
      return booking();
    }),
    finalizeBooking: vi.fn(async () => undefined),
    finalizeEnded: vi.fn(async () => undefined),
    joinBooking: vi.fn(async (input) => {
      const expected = input.participant === "user" ? "user-1" : "astrologer-1";
      if (input.bookingId !== bookingId || input.subjectId !== expected) {
        throw new Error("not allowed");
      }
      return booking();
    }),
  };
}

function listen(server: HttpServer) {
  return new Promise<number>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve((server.address() as AddressInfo).port);
    });
  });
}

function closeServer(server: HttpServer) {
  return new Promise<void>((resolve) => server.close(() => resolve()));
}

function nextMessage(socket: WebSocket) {
  return new Promise<Record<string, unknown>>((resolve) => {
    socket.once("message", (data) => resolve(JSON.parse(data.toString())));
  });
}

function nextMessageOfType(socket: WebSocket, type: string) {
  return new Promise<Record<string, unknown>>((resolve) => {
    const listener = (data: WebSocket.RawData) => {
      const message = JSON.parse(data.toString()) as Record<string, unknown>;
      if (message.type !== type) return;
      socket.off("message", listener);
      resolve(message);
    };
    socket.on("message", listener);
  });
}

function connect(port: number, role: "user" | "astrologer", origin = "http://app.test") {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?role=${role}`, {
    headers: { Cookie: `${role}=valid`, Origin: origin },
  });
  return new Promise<WebSocket>((resolve, reject) => {
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });
}

const servers: HttpServer[] = [];
const sockets: WebSocket[] = [];

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.terminate();
  for (const server of servers.splice(0)) await closeServer(server);
});

describe("attachRealtimeServer", () => {
  it("rejects a mismatched Origin before opening a socket", async () => {
    const server = createServer();
    servers.push(server);
    const realtime = attachRealtimeServer(server, {
      appOrigin: "http://app.test",
      bookings: fakeBookings(),
      sessions: fakeSessions(),
      now: () => now,
    });
    const port = await listen(server);
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?role=user`, {
      headers: { Cookie: "user=valid", Origin: "http://wrong.test" },
    });
    socket.on("error", () => undefined);

    const status = await new Promise<number>((resolve) => {
      socket.once("unexpected-response", (_request, response) => resolve(response.statusCode ?? 0));
    });

    expect(status).toBe(403);
    realtime.close();
  });

  it("rejects an upgrade without the selected role session", async () => {
    const server = createServer();
    servers.push(server);
    const realtime = attachRealtimeServer(server, {
      appOrigin: "http://app.test",
      bookings: fakeBookings(),
      sessions: fakeSessions(),
      now: () => now,
    });
    const port = await listen(server);
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?role=user`, {
      headers: { Origin: "http://app.test" },
    });
    socket.on("error", () => undefined);

    const status = await new Promise<number>((resolve) => {
      socket.once("unexpected-response", (_request, response) => resolve(response.statusCode ?? 0));
    });

    expect(status).toBe(401);
    realtime.close();
  });

  it("isolates a booking room and relays presence, mute and signalling", async () => {
    const server = createServer();
    servers.push(server);
    const bookings = fakeBookings();
    const realtime = attachRealtimeServer(server, {
      appOrigin: "http://app.test",
      bookings,
      sessions: fakeSessions(),
      now: () => now,
    });
    const port = await listen(server);
    const user = await connect(port, "user");
    const astrologer = await connect(port, "astrologer");
    sockets.push(user, astrologer);

    const userJoin = nextMessageOfType(user, "join");
    const userWaitingPresence = nextMessageOfType(user, "presence");
    user.send(JSON.stringify({ type: "join", bookingId }));
    expect(await userJoin).toMatchObject({ type: "join", participant: "user" });
    await userWaitingPresence;

    const astrologerJoin = nextMessageOfType(astrologer, "join");
    const astrologerPresence = nextMessageOfType(astrologer, "presence");
    const userPresence = nextMessageOfType(user, "presence");
    astrologer.send(JSON.stringify({ type: "join", bookingId }));
    expect(await astrologerJoin).toMatchObject({ type: "join", participant: "astrologer" });
    expect(await userPresence).toMatchObject({
      type: "presence",
      participants: { user: { present: true }, astrologer: { present: true } },
    });
    await astrologerPresence;

    const mute = nextMessage(astrologer);
    user.send(JSON.stringify({ type: "mute-state", muted: true }));
    expect(await mute).toEqual({ type: "mute-state", participant: "user", muted: true });

    const offer = nextMessage(astrologer);
    user.send(JSON.stringify({ type: "offer", sdp: "offer-sdp" }));
    expect(await offer).toEqual({ type: "offer", from: "user", sdp: "offer-sdp" });
    expect(bookings.joinBooking).toHaveBeenCalledTimes(2);
    realtime.close();
  });

  it("reports the other participant's current mute state after a rejoin", async () => {
    const server = createServer();
    servers.push(server);
    const realtime = attachRealtimeServer(server, {
      appOrigin: "http://app.test",
      bookings: fakeBookings(),
      sessions: fakeSessions(),
      now: () => now,
    });
    const port = await listen(server);
    const user = await connect(port, "user");
    const astrologer = await connect(port, "astrologer");
    sockets.push(user, astrologer);

    const userJoin = nextMessageOfType(user, "join");
    const userPresence = nextMessageOfType(user, "presence");
    user.send(JSON.stringify({ type: "join", bookingId }));
    await userJoin;
    await userPresence;

    const astrologerJoin = nextMessageOfType(astrologer, "join");
    const firstAstrologerPresence = nextMessageOfType(astrologer, "presence");
    const joinedPresence = nextMessageOfType(user, "presence");
    astrologer.send(JSON.stringify({ type: "join", bookingId }));
    await astrologerJoin;
    await firstAstrologerPresence;
    await joinedPresence;

    const muted = nextMessageOfType(astrologer, "mute-state");
    user.send(JSON.stringify({ type: "mute-state", muted: true }));
    expect(await muted).toMatchObject({ participant: "user", muted: true });

    const unmuted = nextMessageOfType(astrologer, "mute-state");
    user.send(JSON.stringify({ type: "mute-state", muted: false }));
    expect(await unmuted).toMatchObject({ participant: "user", muted: false });

    const left = nextMessageOfType(user, "leave");
    const waitingPresence = nextMessageOfType(user, "presence");
    astrologer.send(JSON.stringify({ type: "leave" }));
    await left;
    await waitingPresence;

    const rejoin = nextMessageOfType(astrologer, "join");
    const rejoinerPresence = nextMessageOfType(astrologer, "presence");
    const reunitedPresence = nextMessageOfType(user, "presence");
    astrologer.send(JSON.stringify({ type: "join", bookingId }));
    await rejoin;
    expect(await rejoinerPresence).toMatchObject({
      type: "presence",
      participants: {
        user: { present: true, muted: false },
        astrologer: { present: true, muted: false },
      },
    });
    await reunitedPresence;
    realtime.close();
  });

  it("relays transient chat at no more than one message per second", async () => {
    let currentNow = now;
    const server = createServer();
    servers.push(server);
    const realtime = attachRealtimeServer(server, {
      appOrigin: "http://app.test",
      bookings: fakeBookings(),
      sessions: fakeSessions(),
      now: () => currentNow,
    });
    const port = await listen(server);
    const user = await connect(port, "user");
    const astrologer = await connect(port, "astrologer");
    sockets.push(user, astrologer);

    const userJoin = nextMessageOfType(user, "join");
    const userPresence = nextMessageOfType(user, "presence");
    user.send(JSON.stringify({ type: "join", bookingId }));
    await userJoin;
    await userPresence;
    const astrologerJoin = nextMessageOfType(astrologer, "join");
    const astrologerPresence = nextMessageOfType(astrologer, "presence");
    const joinedPresence = nextMessageOfType(user, "presence");
    astrologer.send(JSON.stringify({ type: "join", bookingId }));
    await astrologerJoin;
    await astrologerPresence;
    await joinedPresence;

    const chats: Array<Record<string, unknown>> = [];
    astrologer.on("message", (data) => {
      const message = JSON.parse(data.toString()) as Record<string, unknown>;
      if (message.type === "chat") chats.push(message);
    });
    user.send(JSON.stringify({ type: "chat", text: "  Hello  " }));
    await vi.waitFor(() => expect(chats).toHaveLength(1));
    expect(chats[0]).toEqual({ type: "chat", from: "user", text: "Hello" });

    user.send(JSON.stringify({ type: "chat", text: "Too soon" }));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(chats).toHaveLength(1);

    currentNow = currentNow.add({ seconds: 1 });
    user.send(JSON.stringify({ type: "chat", text: "One second later" }));
    await vi.waitFor(() => expect(chats).toHaveLength(2));
    expect(chats[1]).toMatchObject({ text: "One second later" });
    realtime.close();
  });

  it("closes every participant at the stored end time", async () => {
    const endNow = Temporal.Now.instant();
    const endingBooking = {
      ...booking(),
      startsAt: endNow.subtract({ seconds: 1 }),
      endsAt: endNow.add({ milliseconds: 100 }),
    };
    const bookings: RealtimeBookingService = {
      authorizeBooking: vi.fn(async () => endingBooking),
      finalizeBooking: vi.fn(async () => undefined),
      finalizeEnded: vi.fn(async () => undefined),
      joinBooking: vi.fn(async () => endingBooking),
    };
    const server = createServer();
    servers.push(server);
    const realtime = attachRealtimeServer(server, {
      appOrigin: "http://app.test",
      bookings,
      sessions: fakeSessions(),
    });
    const port = await listen(server);
    const user = await connect(port, "user");
    sockets.push(user);

    const joined = nextMessageOfType(user, "join");
    const closed = new Promise<number>((resolve) => user.once("close", resolve));
    user.send(JSON.stringify({ type: "join", bookingId }));
    await joined;

    expect(await closed).toBe(4000);
    expect(bookings.finalizeBooking).toHaveBeenCalledWith(
      bookingId,
      expect.anything(),
    );
    realtime.close();
  });

  it("closes a socket that sends an invalid message", async () => {
    const server = createServer();
    servers.push(server);
    const realtime = attachRealtimeServer(server, {
      appOrigin: "http://app.test",
      bookings: fakeBookings(),
      sessions: fakeSessions(),
      now: () => now,
    });
    const port = await listen(server);
    const user = await connect(port, "user");
    sockets.push(user);
    const closed = new Promise<number>((resolve) => user.once("close", resolve));

    user.send(JSON.stringify({ type: "mute-state", muted: "yes" }));

    expect(await closed).toBe(1007);
    realtime.close();
  });

  it("rejects chat longer than 500 characters", async () => {
    const server = createServer();
    servers.push(server);
    const realtime = attachRealtimeServer(server, {
      appOrigin: "http://app.test",
      bookings: fakeBookings(),
      sessions: fakeSessions(),
      now: () => now,
    });
    const port = await listen(server);
    const user = await connect(port, "user");
    sockets.push(user);
    const closed = new Promise<number>((resolve) => user.once("close", resolve));

    user.send(JSON.stringify({ type: "chat", text: "x".repeat(501) }));

    expect(await closed).toBe(1007);
    realtime.close();
  });

  it("limits incoming messages to 16 KiB", async () => {
    const server = createServer();
    servers.push(server);
    const realtime = attachRealtimeServer(server, {
      appOrigin: "http://app.test",
      bookings: fakeBookings(),
      sessions: fakeSessions(),
      now: () => now,
    });
    const port = await listen(server);
    const user = await connect(port, "user");
    sockets.push(user);
    const closed = new Promise<number>((resolve) => user.once("close", resolve));

    user.send("x".repeat(MAX_REALTIME_MESSAGE_BYTES + 1));

    expect(await closed).toBe(1009);
    realtime.close();
  });
});

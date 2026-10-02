# Step 11: In-app call, part 2

- **Status:** Done
- **Spec:** README §7.1–§7.3, §10.4 and §17
- **Started:** 2026-10-01
- **Finished:** 2026-10-02

## Goal

Finish the in-app Normal-call experience with a live countdown and end notice, transient chat, supported speaker-output selection, automatic microphone replacement after device changes, speaking rings and booking-scoped TURN credentials. Keep every realtime and TURN action limited to the authenticated booking participants and active call window.

## Plan

- **Screens and UI:** Add the time-left display, two-minute notice, chat sheet, conditional Speaker control, device-change toast and local/remote speaking rings to the shared call room.
- **API:** Add `GET /api/calls/:bookingId/ice-servers`, accepting no body or query, resolving either the user or astrologer session, and returning STUN plus short-lived TURN credentials only for a participant in that active in-app booking.
- **Database:** No schema, migration or persistent chat data. Reuse the existing Booking participant and time-window fields.
- **Real-time:** Add strict chat messages to the existing room protocol, enforce a per-socket one-message-per-second limit, and keep messages in memory only long enough to relay them. Extend the WebRTC helper for supplied ICE servers, relay-only development testing, microphone track replacement and local/remote audio-level observation.
- **New libraries:** None. Use Node `crypto` and browser WebRTC, Web Audio and MediaDevices APIs.

## Edge cases

- Reject missing, malformed or expired TURN configuration without disclosing secrets; do not generate credentials for a foreign, non-Normal or out-of-window booking.
- Keep the development relay override inert in production builds.
- Reject blank, over-500-character and too-frequent chat messages without closing an otherwise healthy call.
- Hide Speaker when `setSinkId` is unavailable, and handle no alternative output or a rejected sink change calmly.
- Ignore device changes after leaving, stop superseded microphone tracks, retain the current mute state on the replacement track, and keep the old track if replacement fails.
- Stop analysers, animation frames, audio contexts, device listeners and timers on leave, end and unmount.
- Let the server's stored end timer remain authoritative while the browser countdown reaches zero independently.

## Test plan

- **Automated:** Test TURN HMAC output/configuration/participant and time-window access; strict chat validation, relay, rate limit and non-persistence; timer/notice/end transitions; conditional speaker behavior; device-change replacement/toast; speaking-state updates; and relay-only development configuration.
- **Manual:** Follow Step 11's Try it out list in `BUILD_PROMPTS.md` with two signed-in browsers, desktop output devices, phone earbuds, reduced motion, mobile data and a configured TURN relay.

## As built

- The connected room shows a `M:SS` countdown and the polite “2 minutes left.” notice. Both the browser clock and the server's authoritative room timer end the call at the stored `endsAt`; the server closes active sockets and finalizes Completed or Missed from the existing first-join timestamps.
- `chat` joins the strict WebSocket protocol. Messages are trimmed, limited to 500 characters, relayed only to the other booking participant and dropped when the same socket sends again within one second. They are never written to the database or replayed.
- Speaker appears only when `HTMLMediaElement.setSinkId()` exists. It cycles through the browser's reported audio outputs. A joined room listens for `devicechange`, captures the new default microphone with the existing call constraints, preserves mute state and swaps the track with `RTCRtpSender.replaceTrack()`.
- Local and remote Web Audio analysers drive the existing reduced-motion-aware `speak-ring` around a participant avatar. Streams, analysers, animation frames, timers and device listeners are stopped on leave, end or unmount.
- `GET /api/calls/:bookingId/ice-servers` resolves either root-path participant cookie, checks that subject against the confirmed in-app booking and active call window, and returns Google STUN plus booking-scoped TURN values. The TURN username is `<booking-end-unix-seconds>:<bookingId>` and its credential is a base64 HMAC-SHA1 made with backend-only `TURN_SECRET`.
- `VITE_FORCE_RELAY=true` selects `iceTransportPolicy: "relay"` only in a Vite development build. Production builds always use the normal `all` policy. No new package, database field or migration was needed.
- Backend type-check and all 94 tests pass. Frontend lint, all 35 tests and the production build pass.

## How to try it

1. Configure a coturn REST shared secret or compatible managed relay. Put its comma-separated `turn:`/`turns:` addresses in `TURN_URLS` and the shared secret in `TURN_SECRET` in `backend/.env`. Do not put relay secrets in the frontend.
2. Start the backend and frontend with `npm run dev` in their folders. For a phone, point an HTTPS tunnel at `http://localhost:5173`, set `APP_ORIGIN` to that exact public HTTPS origin and restart the backend.
3. Create a current Normal booking with `npm run dev:make-booking -- --user USER_EMAIL --astrologer ASTROLOGER_EMAIL --starts-in MINUTES --duration MINUTES`, then join as its user and astrologer in separate browser profiles.
4. Confirm the timer counts down, the two-minute notice appears, chat arrives on the other side but disappears after leaving, mute and speaking rings follow each participant, and the server ends both rooms at the booking end.
5. Where **Speaker** appears, change outputs. Connect or disconnect a microphone or earbuds and confirm “Audio device changed.” appears and the other participant still hears audio.
6. To prove relay use locally, set `VITE_FORCE_RELAY="true"` in `frontend/.env`, restart Vite and repeat the call. Test a phone through the HTTPS tunnel on mobile data while the other participant uses Wi-Fi.

## Follow-ups and known issues

- TURN connectivity, phone audio routing, real earbuds and the browser-specific Speaker control need the real-device checks in README §18. Automated tests cannot prove provider/network behavior.
- The speaker button is intentionally absent where `setSinkId()` is not exposed, including Chrome on Android. On those devices the operating system controls output routing.
- Static provider credentials supplied in the build request were not copied into source or documentation. They should be rotated because they were shared in chat; runtime configuration must use the backend environment and a provider compatible with short-lived HMAC credentials.

# Step 10: In-app call, part 1

- **Status:** Done
- **Spec:** README §1, §7.1–§7.3, §10.4, §12 and §14
- **Started:** 2026-10-01
- **Finished:** 2026-10-01

## Goal

Build the authenticated, booking-scoped Normal-call room. Users and astrologers can join during the booked window, exchange WebRTC audio through validated WebSocket signalling, mute, leave and rejoin, while the room moves through the four time and presence states automatically.

## Plan

- **Screens and UI:** Replace both protected call placeholders with one audience-aware call room. Add the four clock-driven states, breathing wait view, participant avatars, microphone-permission help, labelled Mute and Leave controls, remote-muted state and polite state announcements.
- **API:** Keep the existing subject-scoped booking detail endpoints for room bootstrap data. Add the authenticated `/ws?role=user|astrologer` WebSocket protocol for join, leave, presence, offer, answer, ICE candidate and mute messages.
- **Database:** Make no schema or migration change. Record each participant's first join timestamp and finalize ended in-app bookings as Completed when both joined, otherwise Missed.
- **Real-time:** Attach a no-server `ws` server to the main HTTP server. Require the exact configured origin and a valid role session during upgrade, authorize each join against its booking and time window, limit and validate messages, isolate rooms by booking id, and relay WebRTC signalling only to the other participant.
- **New libraries:** None. Use the existing `ws`, `zod`, browser WebRTC APIs and Vitest setup.

## Edge cases

- Reject missing or stale sessions, wrong origins, malformed role selectors, binary or oversized messages and invalid message shapes.
- Do not admit a participant before the start time, at or after the end time, to another person's booking, or to a phone-call booking.
- Replace an older connection when the same participant rejoins from another socket, without affecting another booking's room.
- Keep mute and presence state correct when either person leaves, reconnects or closes the browser.
- Ask for microphone permission only after Join; explain denial and let the person retry.
- Close audio and signalling automatically at the end boundary, including when it passes while the page is open.
- Finalize calls that had no open room through the server's ended-booking sweep as well as active-room end timers.

## Test plan

- **Automated:** Test WebSocket origin/session/booking/window authorization, message validation and size limits, isolated signalling/presence/mute relay, first-join recording and Completed/Missed finalization. Test the four room states, deferred microphone request, denied-permission retry, mute, peer-muted display, leave and automatic time-boundary changes.
- **Manual:** Create a near-future Normal booking, open the user and astrologer routes in separate signed-in browsers, verify the waiting states, join audio from both sides, mute, leave/rejoin and remain open across the end time. Repeat permission denial at 360px and with reduced motion.

## As built

- `backend/index.ts` now creates one Node HTTP server for Express and the no-server WebSocket implementation at `/ws`; the obsolete port-8080/global-pair behavior is gone.
- `backend/src/realtime/index.ts` checks exact Origin and the selected role session during upgrade, keeps booking-id rooms, serializes incoming work, validates and caps messages, relays only to the other booking participant, and handles replacement, leave and end cleanup.
- `backend/src/realtime/booking-service.ts` authorizes the stored participant, call mode, confirmed state and time window; preserves first-join timestamps; and finalizes active or swept ended bookings from those timestamps.
- `frontend/src/screens/CallRoomPage.tsx` implements the four clock/presence states, polite announcements, breathing wait view, permission denial/retry, both avatars, track-backed mute visibility, Leave and rejoin for both audience routes. It reports audio failure only from the current peer's failed state or a 15-second connection timeout and clears the warning on connection.
- `frontend/src/call/audio-peer.ts` captures the exact requested audio constraints and uses a polite/impolite perfect-negotiation pair with Google public STUN. Expected rejections from ignored or obsolete signalling work do not become user-visible failures. `frontend/src/call/protocol.ts` validates the browser's view of server messages before using them.
- No library, environment variable, database schema or migration was added. See [D-016](../DECISIONS.md#d-016-step-10-is-stun-only-and-step-11-finishes-the-call-room) for the explicitly staged differences from the finished README room.

## How to try it

1. Start both development servers and keep `APP_ORIGIN="http://localhost:5173"`.
2. Create a confirmed Normal booking starting soon, for example from `backend/`: `npm run dev:make-booking -- --user USER_EMAIL --astrologer ASTROLOGER_EMAIL --starts-in 2 --duration 15`.
3. Sign in as that user at `/history` and as that astrologer in a separate browser profile at `/astrologer`; open the same booking from both lists.
4. Confirm that neither room requests a microphone before the start. At the start, choose **Join call** on each side and allow microphone access.
5. Confirm **Connected.**, two avatars and two-way audio. Mute one side and verify the other sees its muted badge. Leave, then join again before the end.
6. Deny microphone access once and verify the settings explanation plus **Try again**. Keep both pages open across the end and verify **This call has ended.** with **Back to History** for the user and **Back to Bookings** for the astrologer.
7. Repeat at 360px and with reduced motion. Real phones require an HTTPS origin.

## Follow-ups and known issues

- TURN relay, timer, two-minute notice, chat, speaker switching, earbuds handling and speaking rings remain Step 11 work as requested.
- STUN-only peer-to-peer audio can fail on restrictive or mobile networks. This is the expected Step 10 limitation, not a production topology.
- Automated regressions cover stale signalling rejection, peer failure/timeout/recovery, mute/unmute across a peer rejoin, the live track state and current mute presence on rejoin. Backend type-check and all 83 tests pass; frontend lint, all 27 tests and the production build pass. The reported Chrome two-tab sequences need a manual retest.

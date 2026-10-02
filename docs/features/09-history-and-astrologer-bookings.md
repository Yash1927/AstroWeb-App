# Step 9: History and astrologer bookings

- **Status:** Done
- **Spec:** README §2, §5.3, §7.1, §8.4 and §12
- **Started:** 2026-10-01
- **Finished:** 2026-10-01

## Goal

Give signed-in users a private History view of their Normal calls and give each astrologer a private Bookings view containing only their own customers. Booking cards change from Join to Join now, then Completed or Missed, as time passes without a page refresh.

## Plan

- **Screens and UI:** Replace the History placeholder and astrologer Bookings placeholder with shared Normal-call booking cards, add protected user and astrologer call-room placeholders, and update card state at the start and end times.
- **API:** Add role-protected list and booking-detail endpoints. Scope every query to the authenticated user or astrologer and omit user email from astrologer responses.
- **Database:** Read the existing Booking, User and Astrologer rows. Add a development-only command that creates one confirmed Normal booking without changing the schema.
- **Real-time:** None. Step 10 will build the call room and WebSocket flow.
- **New libraries:** None.

## Edge cases

- A direct request for another person's booking returns not found without revealing that the booking exists.
- A booking moves to Past at its end time. It is Completed only when both participants have joined; otherwise it is Missed.
- Only confirmed Normal calls are shown in this step. Phone-call cards remain for Step 12.
- The development booking helper refuses to run when `NODE_ENV` is `production`.

## Test plan

- **Automated:** Cover user and astrologer record isolation, private-field response shaping, time-based card transitions, route placeholders, command validation, backend type-check/tests, and frontend lint/tests/build.
- **Manual:** Create a near-term Normal booking with the development helper, open History and the astrologer Bookings section in separate sessions, and watch Join change to Join now and then disappear at the end.

## As built

- `backend/src/booking-history/booking-history-service.ts` reads confirmed/completed/missed bookings and sorts both sections. Normal calls derive Upcoming/Completed/Missed from current time and join timestamps; Step 12 adds Upcoming/Phone call for phone mode. Every repository query remains scoped to the authenticated user or astrologer.
- `GET /api/me/bookings` and `GET /api/astrologer/bookings` return the two booking sections. Matching detail endpoints protect direct call-room navigation without accepting a user or astrologer id from the browser. Astrologer responses select the booked user's details but never select email.
- The astrologer router now applies the existing temporary-password gate to profile, availability and booking routes, while leaving session, logout and password replacement available.
- History and the astrologer Bookings section share responsive cards with avatar, call facts, price and status. Normal cards have time-driven Join states. Step 12 phone cards never have Join: users see who will call, the current number and a Settings link; astrologers see **Phone call · date · time** with a `tel:` number.
- `/call/:bookingId` and `/astrologer/call/:bookingId` still load only an owned Normal booking. Steps 10 and 11 replaced the placeholders with the complete authenticated in-app audio room.
- `npm run dev:make-booking` creates a confirmed Normal test booking from two email arguments, an offset and a duration. It refuses production.
- Automated access tests cover cross-user and cross-astrologer detail requests. Service and component tests cover sorting, privacy shaping, Completed/Missed rules, and automatic Join transitions.

## How to try it

1. From `backend/`, create a short test call: `npm run dev:make-booking -- --user USER_EMAIL --astrologer ASTROLOGER_EMAIL --starts-in 2 --duration 5`.
2. Sign in as that user and open `/history`. The booking appears under Upcoming, with **Join** before its start.
3. Leave the page open. At the start it changes to **Join now** with a soft glow. At the end it moves to Past and shows Completed only if both join timestamps exist; otherwise it shows Missed.
4. Sign in as the booked astrologer, choose **Bookings**, and check the same call plus the user's permitted details. No user email is shown.
5. Open each side's Join link. Before the start the room gives the IST start time; during the window it offers the complete in-app audio call.

## Follow-ups and known issues

- Steps 10 and 11 added the audio room, join timestamps, live controls and end-of-call finalization.
- Step 12 added Urgent phone-call cards, and Step 13 now supplies Subscription phone bookings and the user's current calls-left balance.

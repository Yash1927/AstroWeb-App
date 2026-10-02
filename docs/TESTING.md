# Testing

Automated tests and manual checks, as they exist now.

Last updated: 2026-10-02

## Automated tests

Run backend tests from `backend/` with `npm test`, and frontend component tests from `frontend/` with `npm test`.

| Test file | What it covers | Step |
|---|---|---|
| `backend/src/prisma/seed.test.ts` | Owner seed input validation and Argon2id hashing | 2 |
| `backend/src/auth/session.test.ts` | Signed session ids; separate role cookies; 12-hour owner max-age; httpOnly, SameSite and production Secure attributes; root user/astrologer cookie paths | 3, 4 |
| `backend/src/auth/login-rate-limit.test.ts` | Normalized email plus IP keys, five-failure allowance, sixth-attempt blocking, reset and window expiry | 3 |
| `backend/routes/owner.test.ts` | Credential-error parity, login cookie, owner guard, logout deletion, every astrologer action and settings validation | 3 |
| `frontend/src/components/Dialog.test.tsx` | Types a multi-word controlled value while `onClose` changes identity; focus stays in the input and the dialog remains open | Step 3 fix |
| `frontend/src/components/Avatar.test.tsx` | Ignores a numeric-leading word when deriving initials (`sumit 007` becomes `S`) | Step 6 review fix |
| `backend/routes/astrologer.test.ts` | Credential parity, session/security behavior, profile and availability scoping, plus own-booking list/detail access and user-email omission | 4, 7, 9 |
| `frontend/src/components/AstrologerCard.test.tsx` | Home-card fields, supplied Call action and omission of empty expertise/language rows | 4; Step 6 review fix |
| `backend/routes/astrologers.test.ts` | Public card response whitelist, strict input, generic service errors and validated 14-day slot endpoint input | 5, 7 |
| `backend/src/public/public-astrologer-service.test.ts` | Five-field database selection, active/listed/saved eligibility filters and display-name ordering | 5 |
| `frontend/src/screens/HomePage.test.tsx` | Public Home states and call options; signed-out gate; missing-details flow; fixed-prefix Urgent phone normalization; disabled dates and empty-day wording; booking summary/payload/success/History link; friendly overlap feedback; calm Normal-limit notice with replacement History action | 5–8; Step 8 browser review fix |
| `backend/routes/user-auth.test.ts` | Google double-submit CSRF, rejected identity, 30-day cookie, user/session creation, continuation and open-redirect protection | 6 |
| `backend/src/user/google-identity.test.ts` | Verified-email and stable-subject requirements on Google claims | 6 |
| `backend/src/user/user-service.test.ts` | Existing-user lookup by Google subject, verified-email refresh and first-time account creation | 6 |
| `backend/routes/user.test.ts` | User role/live-account guard, session-subject scoping, details validation/logout, and rejection of another user's booking id | 6, 9 |
| `frontend/src/components/GoogleSignInButton.test.tsx` | GIS redirect mode, callback URI, Continue wording and continuation state | 6 |
| `frontend/src/screens/HistoryPage.test.tsx` | Signed-out Google gate and own-booking section request/empty states | 6, 9 |
| `frontend/src/screens/SettingsPage.test.tsx` | Signed-out gate, read-only email, fixed-prefix phone normalization, details persistence request, Saved toast and logout | 6 |
| `frontend/src/components/UserDetailsForm.test.tsx` | Distinct empty/future birth-date wording and fixed-prefix phone display/normalization | Step 6 review fix |
| `backend/src/availability/availability-schemas.test.ts` | End-after-start, weekly overlap and whole-date exception validation | 7 |
| `backend/src/availability/slot-service.test.ts` | Weekly windows, blocked/extra exceptions, 10/15/30-minute cutting, past slots, confirmed/held conflicts, expired holds, Normal-from-tomorrow and IST-to-UTC conversion | 7 |
| `backend/src/availability/slot-service-database.test.ts` | Holds the four independent slot-data promises open and proves Settings, weekly hours, exceptions and bookings all start before any one resolves | Step 8 browser review fix |
| `frontend/src/components/AvailabilityEditor.test.tsx` | Field-level time error, first-invalid focus/scroll, save summary, repeatable weekly ranges, whole-date exception and replacement save payload | 7; browser review fix |
| `backend/src/booking/booking-service.test.ts` | Complete-detail and phone gates, settings-owned price/duration, exact-slot/eligibility recheck, zero-price confirmation and modes, paid deferral, Normal limit, transaction order, and real Prisma `SqlQueryError.sqlState` mapping directly and through `cause` | 8; Step 8 browser review fix |
| `backend/routes/bookings.test.ts` | User auth, strict booking input, friendly status mapping and two concurrent same-slot HTTP requests with exactly one `201` and one `409`; the constraint loser throws Prisma's installed `SqlQueryError` class with `sqlState = "23P01"` | 8; Step 8 browser review fix |
| `backend/src/booking-history/booking-history-service.test.ts` | Upcoming/Past ordering, join-timestamp Completed/Missed derivation, booked-user detail shaping and email omission | 9 |
| `backend/src/dev/make-booking-helpers.test.ts` | Development booking command arguments, negative Past offset and production refusal | 9 |
| `frontend/src/components/BookingLists.test.tsx` | Join/Join now/Missed transitions without refresh, Past movement, soft glow, astrologer-visible details and no email label | 9 |
| `backend/src/realtime/booking-service.test.ts` | Participant ownership, inclusive-start/exclusive-end authorization with and without recording a join, first-join storage and Completed/Missed finalization | 10, 11 |
| `backend/src/realtime/ice-server-service.test.ts` | STUN/TURN response, comma-separated relay URLs, exact booking-end username, base64 HMAC-SHA1 credential and missing configuration | 11 |
| `backend/routes/calls.test.ts` | User and astrologer ICE access, participant-record isolation, strict UUID/query/body input and `Cache-Control: no-store` | 11 |
| `backend/src/realtime/index.test.ts` | Exact-Origin/session rejection, booking-room presence/mute/offer relay, current mute after rejoin, strict message/size handling, bounded/rate-limited chat relay and server close/finalization at the room end | 10, 11; two-tab review fix |
| `frontend/src/call/audio-peer.test.ts` | Relay-only/all ICE configuration and replacement of the live audio sender and local stream track | 11 |
| `frontend/src/call/timer.test.ts` | Rounded/clamped countdown formatting and development-only relay flag behavior | 11 |
| `frontend/src/call/speaking-monitor.test.ts` | Web Audio sample level and speaking-threshold behavior | 11 |
| `frontend/src/screens/CallPlaceholderPage.test.tsx` | Four room states, microphone/error recovery, mute and rejoin state, countdown/notice, ICE configuration, transient chat, conditional Speaker/output switching, speaking/mute interaction, device-change track replacement/toast and server-ended close | 9–11; two-tab review fix |

### Prisma 8 overlap error verification

- Prisma's current [transaction documentation](https://www.prisma.io/docs/orm/fundamentals/transactions#write-conflicts) says PostgreSQL database errors expose the SQLSTATE value on `sqlState`, and a commit-time wrapper keeps the database error in `cause`.
- The installed `@prisma/orm-family-sql` `8.0.0-rc.13` export was inspected with a one-off local Node command. Constructing its exported `SqlQueryError` reported `{name:"SqlQueryError",kind:"sql_query",sqlState:"23P01",constraint:"Booking_no_overlap"}`. This matches the class implementation and type declaration in the installed package.
- The mapper regressions instantiate that real exported class both directly and below a transaction-style `cause`. They also prove an unrelated `23505` unique violation is not misclassified.
- No request was sent to the main Neon database. A disposable Neon branch was unnecessary because both the official Prisma 8 contract and the installed runtime agreed on the shape.

## Manual checks

Results of each step's "Try it out" list in [BUILD_PROMPTS.md](../BUILD_PROMPTS.md). Codex records a result whenever you report it in the chat.

| Step | Date | Result | Notes |
|---|---|---|---|
| 1 | 2026-09-30 | Pass | Backend type-check and Vitest command passed. Frontend lint and production build passed. Local runtime checks covered `/api/health`, the Vite proxy and allowed-origin CORS. Exact 360px emulation found no horizontal overflow, confirmed 48px active targets, tab navigation with `fade-up`, overlay controls and reduced motion. The production bundle contains no design-page route or code. |
| 2 | 2026-09-30 | Pass | Contract emission, migration integrity, backend type-check/tests, frontend lint/build and production audit passed. Prisma confirmed both migrations are applied and the Neon marker and schema match the contract. The idempotent seed found the existing owner and settings rows and changed neither. |
| 3 | 2026-09-30 | Reported Chrome issues fixed; manual retest needed | The owner found focus loss in dialogs, fixed overlays confined by `.screen`, one generic settings error and stale add-form values. The fixes now use body portals, open-only focus, latest-callback Escape handling, field-linked errors and form reset. The new frontend regression, frontend lint/build, backend type-check and all 19 backend tests pass. Please retest the four reported cases in Chrome. |
| 4 | 2026-10-01 | Automated pass; manual panel flow needed | Backend type-check and all 28 tests pass. Frontend TypeScript, ESLint, the production Vite bundle and both component tests pass. Prisma migration integrity/status and live Neon contract verification pass. The temporary-password, save/relogin, owner view, revocation and 360px rendered flows remain for the owner to try with real credentials. |
| 5 | 2026-10-01 | Automated pass; manual Home states needed | Backend type-check and all 32 tests pass. Frontend TypeScript, ESLint, all 4 tests and the production build pass. The production bundle contains no design-page route or code. Real eligible/ineligible profiles, live settings, 360px and wide layouts remain for the owner to inspect. |
| 6 | 2026-10-01 | Reported review issues fixed; real Google flow needed | The delayed Step 6 review fixes now use local 10-digit phone entry with a fixed `+91` prefix, specific empty-birth-date wording, letter-only avatar words and omitted empty card rows. Automated regressions pass; the browser cases and real Google redirect still need a manual retest. |
| 7 | 2026-10-01 | Reported browser issues fixed; live retest needed | The owner found horizontally hidden time chips, distant availability errors and overlapping desktop exceptions. The fixes wrap times, cue date scrolling, focus/scroll the first invalid field and use overlap-safe exception columns. Automated regressions pass; the 360px and desktop browser cases need a manual retest. |
| 8 | 2026-10-01 | Reported browser issues fixed; live retest needed | The owner reported an unverified Prisma exclusion shape, a red/repeatable Normal-limit state and a roughly 2–3 second slot check. The mapper now uses the documented and installed Prisma `sqlState` shape, the limit is a calm History notice, and the four independent slot reads start in parallel. Backend type-check and all 67 tests pass; frontend lint, all 19 tests and the production build pass. A two-browser Neon race, rendered notice and post-change timing remain manual. |
| 9 | 2026-10-01 | Automated pass; live time-boundary flow needed | Backend type-check and all 75 tests pass. Frontend TypeScript, lint, all 24 tests and production build pass. Tests prove session-subject booking scoping, cross-record 404s, no astrologer-visible user email, ordering/status rules, exact call-placeholder wording and automatic Join transitions. A real user/astrologer session, the development helper and a rendered 360px time-boundary flow remain manual. |
| 10 | 2026-10-01 | Reported two-tab issues fixed; manual retest needed | A real Chrome two-tab call carried audio both ways while one side also showed a false audio error; one mute/unmute then peer-rejoin run may also have left the local control mismatched. Signalling-operation rejections no longer set the warning, actual peer failure or a 15-second timeout does, connection clears it, and local mute now follows the audio track through peer resets. Automated regressions also prove a rejoining participant receives the other side's current mute state. Backend type-check and all 83 tests pass; frontend lint, all 27 tests and the production build pass. Please retest those two sequences and the astrologer's **Back to Bookings** action in Chrome. |
| 11 | 2026-10-02 | Automated pass; TURN and hardware checks needed | Backend type-check and all 94 tests pass. Frontend lint, all 35 tests and the production build pass. Tests cover participant-only short-lived TURN output, exact credential HMAC/expiry, strict/rate-limited transient chat, server end closure, countdown/notice, relay policy, output switching, speaking state and default-microphone track replacement with mute preservation. A real coturn/provider relay, HTTPS phone tunnel, mobile data, supported Speaker outputs and wired/Bluetooth earbuds remain manual because browser mocks cannot prove network or hardware routing. |

## Devices

Fill this in as real-device checks happen (README §18).

| Device and browser | Install | Google sign-in | In-app call | Speaker | Earbuds | Payment | Last checked |
|---|---|---|---|---|---|---|---|
| Android phone, Chrome | | | | | | | |
| iPhone, Safari (installed app) | | | | | | | |
| Desktop, Chrome | | | | | | | |

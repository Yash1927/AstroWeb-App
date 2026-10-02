# Changelog

Every change to the project, newest first, with one entry per task. Use this format:

Last updated: 2026-10-02

```markdown
## YYYY-MM-DD: Step N, title (or a short description)
- **Added / Changed / Fixed / Removed:** what changed, in plain words
- **Files:** the main files touched
- **Database:** migrations (or "none")
- **Env vars:** new or changed variables (or "none")
- **Docs updated:** which docs
- **Notes:** breaking changes, follow-ups (optional)
```

---

## 2026-10-02: Step 11, complete in-app calls
- **Added:** connected-call countdown and two-minute notice; transient, 500-character, rate-limited WebSocket chat; capability-gated Speaker output switching; automatic default-microphone replacement with the “Audio device changed.” toast; analyser-driven speaking rings; and participant-only `GET /api/calls/:bookingId/ice-servers` with short-lived coturn REST credentials
- **Changed:** WebRTC now consumes server-authorized STUN/TURN configuration and supports a development-only relay policy; the authoritative server timer closes both room sockets at the booking end; realtime schemas and isolation cover chat as well as signalling and mute state
- **Files:** `backend/app.ts`, `backend/routes/Calls.ts`, `backend/src/realtime/`, `frontend/.env.example`, `frontend/src/api/calls.ts`, `frontend/src/call/`, `frontend/src/screens/CallRoomPage.tsx`, `frontend/src/design.css`, and related backend/frontend tests
- **Database:** none; existing booking window, status and first-join fields are reused, and chat is never stored
- **Env vars:** added frontend `VITE_FORCE_RELAY` with a `false` placeholder; existing backend `TURN_URLS` and `TURN_SECRET` now power the ICE endpoint
- **Dependencies:** none; Node crypto and existing browser WebRTC, MediaDevices and Web Audio APIs are used
- **Docs updated:** `docs/PROGRESS.md`, `docs/features/10-in-app-call-part-1.md`, `docs/features/11-in-app-call-part-2.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DESIGN_SYSTEM.md`, `docs/SETUP.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/DECISIONS.md`, `docs/PANEL_GUIDE.md`, `docs/CHANGELOG.md`
- **Notes:** backend type-check and all 94 tests pass; frontend lint, all 35 tests and the production build pass. Static TURN credentials shared in chat were not stored; they should be rotated. A real TURN provider, HTTPS phone tunnel, mobile data, supported Speaker outputs and earbuds remain manual checks

## 2026-10-01: Step 10 two-tab call fixes
- **Fixed:** rejected offer/answer or ICE work during perfect negotiation no longer leaves a false audio error while media is connected; the audio warning now appears only after the peer connection reports failure or remains unconnected for 15 seconds, and it clears on connection
- **Fixed:** local mute is tied to the live audio track across peer resets, and presence snapshots give joining or rejoining participants the other person's current mute state
- **Changed:** an ended astrologer call now says **Back to Bookings** and opens the panel's Bookings section
- **Files:** `frontend/src/call/audio-peer.ts`, `frontend/src/screens/CallRoomPage.tsx`, `frontend/src/screens/AstrologerPage.tsx`, `frontend/src/screens/CallPlaceholderPage.test.tsx`, `backend/src/realtime/index.test.ts`
- **Database:** none
- **Env vars:** none
- **Dependencies:** none
- **Docs updated:** `docs/features/10-in-app-call-part-1.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/TESTING.md`, `docs/PANEL_GUIDE.md`, `docs/CHANGELOG.md`
- **Notes:** backend type-check and all 83 tests pass; frontend lint, all 27 tests and the production build pass. The new regressions cover ignored signalling failures, connection failure/timeout/recovery, mute/unmute through peer rejoin, track state and rejoin presence state

## 2026-10-01: Step 10, in-app call room and audio
- **Added:** one authenticated `/ws` endpoint on the main HTTP server, booking-id rooms, strict join/presence/leave/offer/answer/ICE/mute messages, first-join recording, ended-booking finalization, the four live user/astrologer room states, microphone permission help, peer-to-peer WebRTC audio, mute visibility and leave/rejoin
- **Changed:** protected call placeholders now open a standalone room and switch at start/end boundaries without refresh; the old separate port-8080 global socket pair is removed from runtime use
- **Files:** `backend/index.ts`, `backend/src/realtime/`, `frontend/src/call/`, `frontend/src/screens/CallRoomPage.tsx`, `frontend/src/App.tsx`, `frontend/src/design.css`, and related backend/frontend tests
- **Database:** none; Step 10 updates the existing `Booking.userJoinedAt`, `astrologerJoinedAt` and `status` fields
- **Env vars:** none; the existing exact `APP_ORIGIN` is now enforced during WebSocket upgrade
- **Dependencies:** none; this uses existing `ws`, `zod`, React and browser WebRTC APIs
- **Docs updated:** `docs/PROGRESS.md`, `docs/features/10-in-app-call-part-1.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DESIGN_SYSTEM.md`, `docs/SETUP.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/DECISIONS.md`, `docs/PANEL_GUIDE.md`, `docs/CHANGELOG.md`
- **Notes:** backend type-check and all 82 tests pass; frontend TypeScript, lint, all 25 tests and production build pass. Step 10 is STUN-only; TURN, timer, two-minute notice, chat, speaker switch, earbuds handling and speaking ring remain Step 11

## 2026-10-01: Step 9, History and astrologer bookings
- **Added:** private user and astrologer booking-list/detail APIs, user History, the astrologer Bookings section, shared time-aware Normal-call cards, protected user/astrologer call placeholders, and the production-blocked `dev:make-booking` helper
- **Changed:** Normal calls now move from Join to glowing Join now and then Completed or Missed without a refresh; the astrologer panel shows only the booked user's permitted details and never their email; the temporary-password gate now protects profile, availability and booking APIs
- **Files:** `backend/src/booking-history/`, `backend/src/dev/`, `backend/routes/User.ts`, `backend/routes/Astrologer.ts`, `backend/package.json`, `frontend/src/api/`, `frontend/src/components/BookingLists.tsx`, `frontend/src/components/AstrologerBookings.tsx`, `frontend/src/screens/HistoryPage.tsx`, `frontend/src/screens/CallPlaceholderPage.tsx`, `frontend/src/design.css`, and related tests
- **Database:** none; Step 9 reads the existing booking/account tables and the opt-in development command creates one confirmed Normal row
- **Env vars:** none
- **Dependencies:** none
- **Docs updated:** `docs/PROGRESS.md`, `docs/features/01-foundation-app-shell.md`, `docs/features/04-astrologer-login-profile.md`, `docs/features/08-booking-free-normal-calls.md`, `docs/features/09-history-and-astrologer-bookings.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DESIGN_SYSTEM.md`, `docs/SETUP.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/PANEL_GUIDE.md`, `docs/CHANGELOG.md`
- **Notes:** backend type-check and all 75 tests pass; frontend TypeScript, lint, all 24 tests and the production build pass. The real call room remains Step 10 and phone-call cards remain Step 12

## 2026-10-01: Step 8 browser review fixes
- **Fixed:** Prisma 8 exclusion failures are now recognized by their real `SqlQueryError.sqlState = "23P01"` shape, including when nested under a transaction `cause`, so `Booking_no_overlap` returns the specified `409` instead of a generic `503`
- **Changed:** the one-upcoming-Normal message is a calm notice with **Go to History** replacing **Confirm booking**; after astrologer eligibility passes, the slot service now loads Settings, weekly hours, exceptions and blocking bookings in parallel
- **Files:** `backend/src/booking/booking-service.ts`, `backend/src/booking/booking-service.test.ts`, `backend/routes/bookings.test.ts`, `backend/src/availability/slot-service.ts`, `backend/src/availability/slot-service-database.test.ts`, `frontend/src/screens/HomePage.tsx`, `frontend/src/screens/HomePage.test.tsx`, `frontend/src/design.css`
- **Database:** none; no main or branch database was queried for the error-shape check
- **Env vars:** none
- **Dependencies:** none
- **Docs updated:** `docs/CHANGELOG.md`, `docs/features/08-booking-free-normal-calls.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/API.md`, `docs/DATABASE.md`, `docs/TESTING.md`, `docs/SECURITY.md`
- **Notes:** Prisma's official transaction documentation and the installed `@prisma/orm-family-sql` 8.0.0-rc.13 export both identify `sqlState` as the database-code field; automated tests use that package's real `SqlQueryError` class. Backend type-check and all 67 tests pass; frontend lint, all 19 tests and the production build pass

## 2026-10-01: Step 8, booking a free Normal call
- **Added:** authenticated `POST /api/bookings`, settings-owned price and duration, exact-slot revalidation, transactional expired-hold cleanup, confirmed zero-price bookings, the one-upcoming-Normal limit, database-overlap conflict handling, the Home booking summary and animated success screen
- **Changed:** choosing a Home time now continues to confirmation instead of the Step 8 placeholder; paid call types stop with the clear later-step message and do not create a booking
- **Files:** `backend/routes/Bookings.ts`, `backend/src/booking/`, `backend/app.ts`, `frontend/src/api/bookings.ts`, `frontend/src/screens/HomePage.tsx`, `frontend/src/design.css`, and related backend/frontend tests
- **Database:** none; Step 8 uses the existing `Booking`, `Settings` and `Booking_no_overlap` definitions
- **Env vars:** none
- **Dependencies:** none
- **Docs updated:** `docs/PROGRESS.md`, `docs/features/05-home-page.md`, `docs/features/06-google-login-details-settings.md`, `docs/features/07-availability-time-slots.md`, `docs/features/08-booking-free-normal-calls.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/API.md`, `docs/DATABASE.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/CHANGELOG.md`
- **Notes:** backend type-check and all 65 tests pass; frontend lint, all 18 tests and the production build pass. History content, payments and the call room remain later steps

## 2026-10-01: Step 6 and 7 browser review fixes
- **Fixed:** Home time chips now wrap to about three per row at 360px while the horizontal date strip reveals part of the next date; invalid availability saves focus and scroll to the first bad field, show a nearby summary, and date exceptions no longer overlap at desktop widths
- **Changed:** phone fields show a fixed `+91` prefix, accept 10 local digits while ignoring spaces and dashes, and still send the canonical `+91XXXXXXXXXX` value; an empty birth date has its own error; avatar initials ignore non-letter-leading words; empty expertise and language rows are omitted from `AstrologerCard`
- **Files:** `frontend/src/components/AvailabilityEditor.tsx`, `frontend/src/components/PhoneNumberField.tsx`, `frontend/src/components/UserDetailsForm.tsx`, `frontend/src/components/Avatar.tsx`, `frontend/src/components/AstrologerCard.tsx`, `frontend/src/screens/HomePage.tsx`, `frontend/src/user-details.ts`, `frontend/src/design.css`, and related frontend tests
- **Database:** none
- **Env vars:** none
- **Dependencies:** none
- **Docs updated:** `docs/CHANGELOG.md`, `docs/DESIGN_SYSTEM.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/DECISIONS.md`, `docs/PANEL_GUIDE.md`, `docs/features/06-google-login-details-settings.md`, `docs/features/07-availability-time-slots.md`
- **Notes:** frontend lint, all 17 frontend tests and the production build pass; backend type-check and all 55 backend tests pass. Backend behavior and API shapes are unchanged; the server continues to validate and store canonical Indian phone numbers

## 2026-10-01: Step 7, availability and time slots
- **Added:** authenticated weekly hours and date-exception editing for astrologers, a settings-backed IST slot engine, public 14-day slot results, disabled empty date chips, time chips and the Step 8 confirmation placeholder
- **Changed:** the Home flow now continues past sign-in, details and phone collection into real free-time selection; availability saves warn when confirmed bookings sit outside the new hours while keeping those bookings unchanged
- **Files:** `backend/src/availability/`, `backend/routes/Astrologer.ts`, `backend/routes/Astrologers.ts`, `frontend/src/components/AvailabilityEditor.tsx`, `frontend/src/screens/AstrologerPage.tsx`, `frontend/src/screens/HomePage.tsx`, `frontend/src/api/astrologer.ts`, `frontend/src/api/public.ts`, `frontend/src/design.css`
- **Database:** none; Step 7 uses the existing `AvailabilityRule`, `AvailabilityException`, `Booking` and `Settings` tables
- **Env vars:** none
- **Dependencies:** none
- **Docs updated:** `docs/PROGRESS.md`, `docs/features/05-home-page.md`, `docs/features/06-google-login-details-settings.md`, `docs/features/07-availability-time-slots.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/API.md`, `docs/DATABASE.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/DECISIONS.md`, `docs/PANEL_GUIDE.md`, `docs/CHANGELOG.md`
- **Notes:** backend type-check and all 55 tests pass; frontend lint, all 12 tests and production build pass. Slot timestamps are emitted in UTC and rendered in IST. No booking row is created.

## 2026-10-01: Step 6, Google login, details form and Settings
- **Added:** Google Identity Services redirect login, verified Google account creation, 30-day user sessions, self-only details endpoints, user logout, signed-out History and Settings gates, the shared details form, the complete Settings screen, and the Home flow through the Step 7 time-choice placeholder
- **Changed:** Home now continues after call-type selection instead of showing the Step 5 deferred-booking toast; Urgent and Subscription collect one phone field when a completed profile has no saved number
- **Files:** `backend/routes/UserAuth.ts`, `backend/routes/User.ts`, `backend/src/user/`, `backend/src/auth/require-user.ts`, `frontend/src/api/user.ts`, `frontend/src/components/GoogleSignInButton.tsx`, `frontend/src/components/UserDetailsForm.tsx`, `frontend/src/screens/HomePage.tsx`, `frontend/src/screens/HistoryPage.tsx`, `frontend/src/screens/SettingsPage.tsx`, `frontend/src/design.css`
- **Database:** none; Step 6 uses the existing `User` and `Session` tables
- **Env vars:** added the public `VITE_GOOGLE_CLIENT_ID` frontend example; `GOOGLE_CLIENT_ID` was already present in the backend example
- **Dependencies:** added backend runtime `google-auth-library`
- **Docs updated:** `docs/PROGRESS.md`, `docs/features/05-home-page.md`, `docs/features/06-google-login-details-settings.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/API.md`, `docs/DATABASE.md`, `docs/SETUP.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md`
- **Notes:** backend type-check and all 43 tests pass; frontend TypeScript, lint, all 10 tests and production build pass; production dependencies audit clean. Real Google and installed-iPhone redirect testing remain manual. No slots or booking records were added.

## 2026-10-01: Step 5, Home page
- **Added:** public privacy-limited astrologer cards, the real Home loading/empty/error/list states, responsive one/two/three-column layout, first-six stagger animation, and a settings-backed call-type BottomSheet with the later-step toast
- **Changed:** the shared `AstrologerCard` now uses its existing interactive desktop hover style; eligible Home cards are ordered by display name
- **Files:** `backend/routes/Astrologers.ts`, `backend/src/public/public-astrologer-service.ts`, `frontend/src/screens/HomePage.tsx`, `frontend/src/api/public.ts`, `frontend/src/components/AstrologerCard.tsx`, `frontend/src/design.css`, `frontend/src/App.tsx`
- **Database:** none; Home reads existing `Astrologer` and `Settings` rows
- **Env vars:** none
- **Dependencies:** none
- **Docs updated:** `docs/PROGRESS.md`, `docs/features/05-home-page.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/API.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/DECISIONS.md`, `docs/PANEL_GUIDE.md`, `docs/CHANGELOG.md`
- **Notes:** backend type-check and 32 tests pass; frontend TypeScript, lint, 4 tests and production build pass; no login, slots or booking behavior was added

## 2026-10-01: Step 4, astrologer login and profile
- **Added:** astrologer login/logout, a 12-hour server session, forced temporary-password replacement, protected own-profile endpoints, the `/astrologer` panel, tag editing, unsaved phone-width preview, and the reusable `AstrologerCard`
- **Changed:** user and astrologer cookie paths now use `/`; owner deactivation and password reset revoke that astrologer's sessions immediately; the owner full-profile view shows profile fields and first-save state
- **Files:** `backend/routes/Astrologer*.ts`, `backend/src/astrologer/`, `backend/src/auth/`, `backend/src/owner/owner-service.ts`, `frontend/src/screens/AstrologerPage.tsx`, `frontend/src/components/AstrologerCard.tsx`, `frontend/src/api/astrologer.ts`, `frontend/src/design.css`
- **Database:** added and applied `20260930T1814_astrologer_profile_saved_at`, which adds nullable `Astrologer.profileSavedAt`; Prisma verifies that Neon matches the new contract
- **Env vars:** none
- **Dependencies:** none
- **Docs updated:** `docs/PROGRESS.md`, `docs/features/04-astrologer-login-profile.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/API.md`, `docs/DATABASE.md`, `docs/SETUP.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/DECISIONS.md`, `docs/PANEL_GUIDE.md`, `docs/CHANGELOG.md`
- **Notes:** backend type-check and 28 tests, frontend TypeScript/lint/build and 2 tests, migration checks, migration status and live Neon schema verification pass. Availability, bookings, blogs and the public Home query remain later steps.

## 2026-09-30: Owner overlay and form fixes
- **Fixed:** Dialog and BottomSheet focus now moves to the close button only when an overlay opens; Escape always calls the latest close callback; Dialog, BottomSheet and Toast render through `document.body` portals; settings validation identifies and links each invalid field; the add-astrologer form clears whenever it closes or reopens
- **Added:** a jsdom regression that types a multi-word name into a controlled Dialog input and verifies that focus stays in the input and the dialog stays open
- **Files:** `frontend/src/components/Dialog.tsx`, `frontend/src/components/BottomSheet.tsx`, `frontend/src/components/Toast.tsx`, `frontend/src/components/Dialog.test.tsx`, `frontend/src/screens/OwnerPage.tsx`, `frontend/package.json`
- **Database:** none
- **Env vars:** none
- **Dependencies:** added development-only `vitest`, `jsdom`, `@testing-library/react` and `@testing-library/user-event` to the frontend
- **Docs updated:** `docs/features/03-owner-panel.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/SETUP.md`, `docs/TESTING.md`, `docs/CHANGELOG.md`
- **Notes:** frontend test, lint and production build pass; backend type-check and all 19 backend tests still pass

## 2026-09-30: Step 3, owner panel
- **Added:** database-backed signed owner sessions, a 12-hour owner cookie, login throttling, owner login/logout, protected astrologer and settings APIs, and the complete `/owner` interface
- **Changed:** the Express app is split from the listener for HTTP testing; new astrologers start listed with a temporary Argon2id password and mandatory password change; inactive astrologers are hidden; prices are edited in rupees and stored in paise
- **Files:** `backend/app.ts`, `backend/routes/Owner*.ts`, `backend/src/auth/`, `backend/src/owner/`, `frontend/src/screens/OwnerPage.tsx`, `frontend/src/api/owner.ts`, `frontend/src/design.css`
- **Database:** no migration; Step 3 uses the existing `Owner`, `Session`, `Astrologer` and `Settings` tables. The Step 2 migration and seed were applied and verified on Neon before this build.
- **Env vars:** added the optional `NODE_ENV` example; `SESSION_SECRET` is now required by owner sessions
- **Dependencies:** added runtime `zod`; added development-only `supertest` and `@types/supertest`
- **Docs updated:** `docs/PROGRESS.md`, `docs/features/02-database-and-seed.md`, `docs/features/03-owner-panel.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/API.md`, `docs/DATABASE.md`, `docs/SETUP.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/DECISIONS.md`, `docs/PANEL_GUIDE.md`, `docs/CHANGELOG.md`
- **Notes:** frontend lint/build, backend type-check, 19 tests and the live Neon login/session/logout smoke test pass. The owner should still inspect the panel at 360px during manual try-out because no browser surface was available to this session.

## 2026-09-30: Step 2, database and seed
- **Added:**
  - the complete 13-table Prisma 8 contract, generated artifacts and a checked migration package
  - the `btree_gist` extension and `Booking_no_overlap` exclusion constraint in the migration
  - an idempotent owner/settings seed with Argon2id hashing and seed validation tests
  - `GET /api/health/db` and the narrow `GET /api/settings/public` response
- **Changed:** Prisma 8 packages to the current release candidates, migration scripts, the direct migration connection, and Node 24 Temporal support
- **Removed:** the legacy `Astro`, `Blogs` and incomplete `User` schema from the target contract
- **Files:** `backend/src/prisma/`, `backend/migrations/`, `backend/routes/Public.ts`, `backend/index.ts`, `backend/prisma.config.ts`, `backend/package.json`, `backend/.env.example`
- **Database:** added and applied `20260930T0841_database_schema`; Prisma verifies that Neon matches the contract
- **Env vars:** no new names; Step 2 now uses `DATABASE_URL`, `DIRECT_DATABASE_URL`, `OWNER_EMAIL` and `OWNER_PASSWORD`
- **Docs updated:** `docs/PROGRESS.md`, `docs/features/02-database-and-seed.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DATABASE.md`, `docs/SETUP.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md`
- **Notes:** the Neon migration, verification and idempotent real seed all passed before Step 3 started.

## 2026-09-30: Step 1, foundation, design.css and app shell
- **Added:**
  - a runnable Express server, `GET /api/health`, restricted credentialed CORS and `/api` router mounting
  - the shared design tokens, component styles, animations and reduced-motion behaviour in `frontend/src/design.css`
  - shared frontend components, the routed four-tab app shell and development-only `/_design` gallery
  - Vite development proxies for `/api` and `/ws`
- **Changed:** backend development and verification scripts, environment placeholders, the page metadata, and the empty route modules
- **Removed:** Vite demo styles, content and unused starter assets
- **Files:** `backend/index.ts`, `backend/routes/`, `backend/.env.example`, `backend/package.json`, `frontend/src/`, `frontend/vite.config.ts`, `frontend/index.html`
- **Database:** none
- **Env vars:** added placeholders for `PORT` and every backend variable in README §13
- **Docs updated:** `docs/PROGRESS.md`, `docs/features/01-foundation-app-shell.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/API.md`, `docs/SETUP.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/PANEL_GUIDE.md`, `docs/CHANGELOG.md`
- **Notes:** no login, real data, database rebuild or real-time implementation was added. `backend/src/realtime/` remains unchanged for Step 10.

## 2026-09-30: Project spec and docs set up
- **Added:**
  - `README.md` (the product spec)
  - `BUILD_PROMPTS.md` (the 16 build steps, with setup instructions for Codex in VS Code)
  - `AGENTS.md` (rules for coding agents, including keeping these docs up to date)
  - `docs/`, with templates for the as-built documentation
- **Files:** `README.md`, `BUILD_PROMPTS.md`, `AGENTS.md`, `docs/`
- **Database:** none
- **Env vars:** none
- **Docs updated:** all docs created
- **Notes:** No app code has changed yet, so the boilerplate bugs in README §14 are still there.

# Changelog

Every change to the project, newest first, with one entry per task. Use this format:

Last updated: 2026-10-03

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

## 2026-10-03: C3 browser-review fixes
- **Changed:** renamed all user-visible branding to Astromaitreyi and added a 4.5 KB header icon.
- **Fixed:** stable blog editing/autosave, initial overlay flashes, italics, neutral email, image-button positioning, styled uploads/crop sliders and confirmed photo removal.
- **Fixed:** blog media ownership errors now return 400, and panel/editor chunks are excluded from the offline precache.
- **Files:** blog/editor/overlay/profile components, PWA assets/config, styling, blog service/routes and focused tests.
- **Database / env vars:** none.
- **Checks/docs:** lint/build/type-check pass; backend has 134 pass/4 skipped; all 68 frontend tests pass across the final run plus an isolated retry of one load-related timeout; affected docs updated.

## 2026-10-03: Browser-review fixes for rich editing, photos and loading
- **Fixed 1–3:** preserved editor selections, corrected labelled toolbar states/containment, added editable inline captions and moved the image button to the cursor's empty line.
- **Fixed 4–6:** added styled profile upload with adjustable square crop, corrected monogram/icon crops without changing `logo.jpg`, and lazy-loaded panels, editor and cropper; the entry chunk fell from 856.80 kB to 344.03 kB.
- **Fixed 7–9:** separated excerpt blocks, surfaced safe server validation messages and made the read-only email neutral.
- **Checked 10:** the reviewer-applied migration is current and verified; future migration apply/status/verify steps are documented.
- **Checks/docs:** 64 frontend and 133 backend tests, lint, build, type-check and migration checks passed; updated the affected docs. No controllable browser was available for a new rendered pass.

## 2026-10-03: R2 media, astrologer photos and rich blogs, pending fixes 13–15
- **Fixed item 13:** added backend-only Cloudflare R2 storage, a `MediaAsset` record, real-byte JPG/PNG/WebP validation, a 5 MB ceiling, metadata-free Sharp WebP transforms, random keys, replacement/deletion cleanup, a 24-hour orphan-cleanup command and the configured media origin in CSP
- **Fixed item 14:** added astrologer photo selection with a centred square preview and explicit save/change/remove actions; owner moderation removal; and photo display with initials fallback on public cards, bookings, call rooms, blog authors and both panels
- **Fixed item 15:** replaced plain blog bodies with validated TipTap JSONB; added the floating rich toolbar, shortcuts, body/cover uploads, captions, autosave and publish controls; derived excerpts/read times; and rendered allowed nodes through React in the public list and 680px reading view
- **Files:** `backend/src/media/`, blog schemas/services/tests, protected media routes, Prisma contract/migration, app CSP, frontend media APIs, avatar/profile/owner/call/blog components, `frontend/src/design.css`, and package manifests
- **Database:** added pending migration `20261003T0224_media_and_rich_blogs`; it creates `MediaAsset`, profile/cover references, excerpt/read-time fields and converts legacy plain-text blog bodies to TipTap JSONB. Migration integrity passes; no database was changed in this task
- **Env vars:** added `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` and `R2_PUBLIC_BASE_URL` to `backend/.env.example`
- **Dependencies:** added backend `@aws-sdk/client-s3`, `file-type`, `helmet`, `multer`, `sharp` and `@types/multer`; added frontend TipTap React, Starter Kit, link, underline, image and placeholder packages
- **Docs updated:** `docs/PENDING_FIXES.md`, `docs/PROGRESS.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DATABASE.md`, `docs/DESIGN_SYSTEM.md`, `docs/SETUP.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/DECISIONS.md`, `docs/PANEL_GUIDE.md`, feature docs 04 and 14, and `docs/CHANGELOG.md`
- **Notes:** R2 is mocked in tests. Backend type-check, all 131 standard tests, migration integrity, frontend lint, all 62 frontend tests and the production build pass. The four opt-in Neon tests skip normally. A real R2 browser flow and database migration remain owner actions. Vite reports the new rich-editor main chunk above 500 kB; Step 16 tracks lazy-loading review.

## 2026-10-03: Brand and responsive UI polish, pending fixes 11 and 16
- **Fixed item 11:** renamed all user-visible AstroWebApp branding to Astromaitreyi; added the unchanged owner-supplied logo to shared app/panel headers, sign-in/offline/call states and Razorpay Checkout; and replaced the placeholder PWA artwork with generated monogram icons, including maskable safe-zone padding
- **Fixed item 16:** added shared app-bar and page-header components; unified user and panel widths; moved navigation into the desktop app bar from 1024px; kept mobile/tablet navigation fixed without covering content; anchored the Home footer; made read-only email neutral and badges content-sized; and standardized displayed day periods to lowercase `am`/`pm`
- **Files:** `frontend/src/App.tsx`, shared brand/header components, user and panel screens, `frontend/src/design.css`, time formatting, Checkout, manifest/PWA asset configuration, generated icons and tests
- **Database:** none
- **Env vars:** none
- **Dependencies:** added direct development dependency `sharp` for the reproducible logo crop used by `npm run generate:pwa-assets`
- **Docs updated:** `docs/PENDING_FIXES.md`, `docs/PROGRESS.md`, `docs/CHANGELOG.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/SETUP.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/DECISIONS.md`, `docs/PANEL_GUIDE.md`
- **Notes:** `frontend/public/logo.jpg` stayed byte-identical. All 18 routed/offline states passed Chrome render and target-size checks at 360px, 768px and 1280px.

## 2026-10-03: Pending-fix repairs, items 1–10 and 12
- **Fixed item 1:** fee-bearing Razorpay webhooks now validate against the stored order amount, Urgent and Subscription payments settle correctly when the customer charge includes a fee, invalid settlements emit non-personal diagnostics, and late-conflict refunds use the full amount fetched from Razorpay
- **Fixed item 2:** the booking slot picker now constrains its grid children, so the date strip is the only horizontal scroller and time chips wrap inside the sheet at mobile and desktop widths
- **Fixed item 3:** Home astrologer cards reserve a separate flexible details row and a fixed action row, keeping Call buttons at their normal height when profile details are empty
- **Fixed item 4:** the astrologer Bookings section now describes all upcoming and past calls instead of incorrectly limiting the subtitle to Normal calls
- **Fixed item 5:** Subscription credit copy now uses a shared plural-aware formatter everywhere, including the call options, booking success and History screens
- **Fixed item 6:** a no-credit Subscription booking summary now states the live pack price, number of calls and that the current booking uses one call
- **Fixed item 7:** deleting an astrologer post now uses Prisma SQL bulk deletes for all matching likes and comments before removing the post
- **Fixed item 8:** every multi-row mutation found by the backend audit now uses an explicit Prisma SQL bulk plan, covering astrologer session revocation, availability replacement and elapsed payment-hold expiry
- **Fixed item 9:** every generic route-level 503 path now logs a fixed operation context plus the sanitized error class and message, without logging request data, identifiers or known personal and secret patterns
- **Fixed item 10:** user and astrologer comment deletion now confirms first; visitor drafts survive Google redirect in session storage; astrologer post counts refresh on focus and editor close; and post-status badges keep their content width
- **Fixed item 12:** Nunito imports now include only Latin and Latin Extended for the four used weights, and the service worker precaches only their eight WOFF2 files instead of forty font files
- **Files:** payment gateway/service/schema tests; owner, astrologer, availability, booking and blog services; all backend route error paths and the shared safe logger; Home, History, Blogs, astrologer panel/card components and tests; `frontend/src/design.css`, font imports and PWA configuration
- **Database:** no schema or migration changes; items 7 and 8 were exercised only on non-primary Neon child branch `pending-fixes-7-8-20261003`
- **Env vars:** added test-only `RUN_NEON_BRANCH_TESTS` and `NEON_BRANCH_NAME` placeholders; no runtime variables changed
- **Dependencies:** none
- **Docs updated:** `docs/PROGRESS.md`, `docs/PENDING_FIXES.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DATABASE.md`, `docs/DESIGN_SYSTEM.md`, `docs/SETUP.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/PANEL_GUIDE.md`, `docs/CHANGELOG.md`
- **Notes:** backend type-check and the standard suite pass with 118 tests (the 4 opt-in Neon tests skip normally); all 4 integration cases pass on the isolated child branch. Frontend lint, all 62 tests and the production build pass. The service worker now precaches 18 entries (547.94 KiB), including 8 WOFF2 font files and no WOFF files. The test branch remains available for review; the production/main database was not used.

## 2026-10-02: Step 15, Installable app and policy pages
- **Added:** an AstroWebApp web manifest; generated 192px, 512px, maskable and Apple touch icons from one SVG; an auto-updating app-shell service worker; offline UI; Android/desktop installation prompting; one-time iPhone/iPad Safari installation guidance; seven public policy pages; live Settings-backed Pricing; and policy links on Home and Settings
- **Changed:** the frontend production build now emits the manifest, registration helper and Workbox service worker; API, WebSocket, call-room and payment/Razorpay paths are denied from navigation fallback and no runtime cache is configured
- **Files:** `frontend/vite.config.ts`, `frontend/pwa-assets.config.ts`, `frontend/public/`, `frontend/src/App.tsx`, `frontend/src/components/InstallPrompt.tsx`, `frontend/src/components/PolicyLinks.tsx`, `frontend/src/screens/PolicyPage.tsx`, `frontend/src/screens/HomePage.tsx`, `frontend/src/screens/SettingsPage.tsx`, `frontend/src/design.css`, and related tests
- **Database:** none
- **Env vars:** none
- **Dependencies:** added frontend development dependencies `vite-plugin-pwa` 1.3.0 and `@vite-pwa/assets-generator` 1.0.4
- **Docs updated:** `docs/PROGRESS.md`, `docs/features/01-foundation-app-shell.md`, `docs/features/05-home-page.md`, `docs/features/06-google-login-details-settings.md`, `docs/features/15-install-app-policy-pages.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/SETUP.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/CHANGELOG.md`
- **Notes:** backend type-check and all 113 tests pass; frontend lint, all 53 tests and production build pass. A stopped-after-check production preview served the app, a policy route, manifest and service worker successfully. Generated output contains 50 app-shell entries and no API, WebSocket, call-room or payment path. Physical-device installation, offline launch and installed-iPhone Google sign-in remain manual; the owner policy placeholders must be replaced before Razorpay live-mode approval

## 2026-10-02: Step 14, Blogs
- **Added:** public 20-post blog pagination and post pages; Google-gated like/comment actions; plain-text comments with throttling; astrologer draft/publish/unpublish/edit/delete workflows; commenter, author and owner comment deletion; and the owner's Recent comments list
- **Changed:** the user Blogs tab and astrologer Blogs section now contain their real Step 14 interfaces; the existing heart-pop animation drives the like toggle; published/draft access and every mutation are scoped on the server
- **Files:** `backend/src/blog/`, `backend/routes/Blogs.ts`, `backend/routes/Astrologer.ts`, `backend/routes/Owner.ts`, `frontend/src/api/blogs.ts`, `frontend/src/screens/BlogsPage.tsx`, `frontend/src/screens/BlogPostPage.tsx`, `frontend/src/components/AstrologerBlogs.tsx`, `frontend/src/components/OwnerRecentComments.tsx`, `frontend/src/design.css`, and related tests
- **Database:** none; Step 14 uses the existing `Blog`, `BlogLike` and `BlogComment` tables
- **Env vars:** none
- **Dependencies:** none
- **Docs updated:** `docs/PROGRESS.md`, `docs/features/04-astrologer-login-profile.md`, `docs/features/14-blogs.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DATABASE.md`, `docs/DESIGN_SYSTEM.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/DECISIONS.md`, `docs/PANEL_GUIDE.md`, `docs/CHANGELOG.md`
- **Notes:** backend type-check and all 113 tests pass; frontend lint, all 42 tests and production build pass; a read-only live Neon public-list query also passes. Real Google and three-role browser moderation remain manual

## 2026-10-02: Step 13, Subscription packs and credits
- **Added:** atomic Subscription credit booking; one-time Settings-priced Razorpay pack orders; pack-size snapshots; zero-price pack handling; remaining-call responses; and calls-left displays in the Home flow, success screen and History
- **Changed:** payment settlement now conditionally claims a Payment before confirming, so verification/webhook races can add a pack only once; Subscription bookings use phone delivery, `usedCredit=true` and the Step 12 phone cards; the call-type sheet and summary switch from pack price to an existing credit when available
- **Files:** `backend/src/booking/booking-service.ts`, `backend/src/payment/payment-service.ts`, `backend/src/booking-history/booking-history-service.ts`, `backend/src/prisma/contract.prisma`, `frontend/src/screens/HomePage.tsx`, `frontend/src/screens/HistoryPage.tsx`, related API types/tests, and the Step 13 migration package
- **Database:** added and applied `20261002T0936_subscription_pack_credits`, which adds non-null `Payment.creditsPurchased` with default `0`; migration status and full schema verification match contract `9608a099…`
- **Env vars:** none
- **Dependencies:** none
- **Docs updated:** `docs/PROGRESS.md`, `docs/features/05-home-page.md`, `docs/features/06-google-login-details-settings.md`, `docs/features/08-booking-free-normal-calls.md`, `docs/features/09-history-and-astrologer-bookings.md`, `docs/features/12-urgent-calls-razorpay.md`, `docs/features/13-subscription-packs.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DATABASE.md`, `docs/DESIGN_SYSTEM.md`, `docs/SETUP.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/DECISIONS.md`, `docs/PANEL_GUIDE.md`, `docs/CHANGELOG.md`
- **Notes:** backend type-check and all 106 tests pass; frontend lint, all 40 tests and the production build pass; Prisma migration integrity, live status and Neon contract verification pass. A real Razorpay test-mode pack payment/webhook remains a manual check

## 2026-10-02: Step 12, Urgent calls with Razorpay
- **Added:** ten-minute paid booking holds; official Razorpay order and refund calls; on-demand Standard Checkout with name/email/phone prefill; timing-safe owned-payment verification; raw signed, de-duplicated webhooks; idempotent confirmation; and automatic full refund when a late payment's slot is gone
- **Changed:** positive-price Urgent calls now book as phone calls; Home shows payment dismissal/failure/refund and phone success states; user History and astrologer Bookings show phone-specific cards with no Join action; Settings prevents removing the phone number while a future confirmed phone call exists; browser price fields are discarded and Settings remains authoritative
- **Files:** `backend/routes/Payments.ts`, `backend/src/payment/`, `backend/src/booking/`, `backend/src/booking-history/`, `backend/src/user/user-service.ts`, `backend/app.ts`, `frontend/src/razorpay-checkout.ts`, `frontend/src/screens/HomePage.tsx`, `frontend/src/components/BookingLists.tsx`, `frontend/src/screens/SettingsPage.tsx`, `frontend/src/design.css`, and related tests
- **Database:** no migration; the existing `Booking`, `Payment`, `WebhookEvent`, Settings fields, unique provider ids and `Booking_no_overlap` constraint are used
- **Env vars:** no new names; existing `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` placeholders are now active
- **Dependencies:** added official backend `razorpay` 2.9.8
- **Docs updated:** `docs/PROGRESS.md`, `docs/features/05-home-page.md`, `docs/features/06-google-login-details-settings.md`, `docs/features/08-booking-free-normal-calls.md`, `docs/features/09-history-and-astrologer-bookings.md`, `docs/features/12-urgent-calls-razorpay.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DATABASE.md`, `docs/DESIGN_SYSTEM.md`, `docs/SETUP.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/PANEL_GUIDE.md`, `docs/CHANGELOG.md`
- **Notes:** backend type-check and all 102 tests pass; frontend lint, all 39 tests and the production build pass. Subscription packs remain Step 13. Real Razorpay test-mode success/failure/webhook/refund delivery remains a manual check

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

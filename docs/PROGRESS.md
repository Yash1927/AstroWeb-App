# Progress

Last updated: 2026-10-02

## Build steps

The steps come from [BUILD_PROMPTS.md](../BUILD_PROMPTS.md). Each status is one of: Not started · In progress · Done · Blocked.

| # | Step | Status | Feature doc | Notes |
|---|---|---|---|---|
| 1 | Foundation, design.css, app shell | Done | [01-foundation-app-shell.md](features/01-foundation-app-shell.md) | Backend foundation, shared design system and routed app shell are in place. |
| 2 | Database and seed | Done | [02-database-and-seed.md](features/02-database-and-seed.md) | Neon marker and schema match the contract; the idempotent seed rows exist. |
| 3 | Owner panel | Done | [03-owner-panel.md](features/03-owner-panel.md) | Owner sessions, protected account/settings API and the `/owner` UI are in place. |
| 4 | Astrologer login and profile | Done | [04-astrologer-login-profile.md](features/04-astrologer-login-profile.md) | Astrologer login, forced password change, own-profile editing and shared Home-card preview are in place. |
| 5 | Home page | Done | [05-home-page.md](features/05-home-page.md) | Public privacy-limited cards, responsive Home states and the settings-backed call-type picker are in place. |
| 6 | Google login, details form, Settings | Done | [06-google-login-details-settings.md](features/06-google-login-details-settings.md) | Google redirect sign-in, user sessions/details and Settings underpin the current Home flow. |
| 7 | Availability and time slots | Done | [07-availability-time-slots.md](features/07-availability-time-slots.md) | Weekly hours, date exceptions, the IST slot engine and Home date/time picker are in place. |
| 8 | Booking free Normal calls | Done | [08-booking-free-normal-calls.md](features/08-booking-free-normal-calls.md) | Transactional zero-price booking creation, overlap handling and the Home summary/success flow are in place. |
| 9 | History and astrologer bookings | Done | [09-history-and-astrologer-bookings.md](features/09-history-and-astrologer-bookings.md) | Private History, astrologer Bookings and protected call placeholders are in place. |
| 10 | In-app call, part 1 | Done | [10-in-app-call-part-1.md](features/10-in-app-call-part-1.md) | Authenticated booking rooms, STUN WebRTC audio and the four live call states are in place. |
| 11 | In-app call, part 2 | Done | [11-in-app-call-part-2.md](features/11-in-app-call-part-2.md) | Countdown/end handling, transient chat, supported device controls, speaking indicators and booking-scoped TURN credentials are in place. |
| 12 | Urgent calls with Razorpay | Done | [12-urgent-calls-razorpay.md](features/12-urgent-calls-razorpay.md) | Ten-minute holds, Razorpay verification/webhooks/refunds, Urgent phone delivery and phone cards are in place. |
| 13 | Subscription packs | Done | [13-subscription-packs.md](features/13-subscription-packs.md) | Existing credits confirm atomically; zero balances buy a snapshotted one-time pack through Razorpay. |
| 14 | Blogs | Done | [14-blogs.md](features/14-blogs.md) | Public reading, Google-gated reactions, own authoring and scoped comment moderation are in place. |
| 15 | Install as an app, policy pages | Done | [15-install-app-policy-pages.md](features/15-install-app-policy-pages.md) | Install assets, auto-updating app-shell service worker, offline handling, install guidance and public policy pages are in place. |
| 16 | Security review and launch checklist | Not started | — | |

## Next up

Apply every item in `docs/PENDING_FIXES.md`, then start Step 16.

## Known issues

Bugs, limitations and loose ends that aren't fixed yet. When one is fixed, remove it here and mention the fix in [CHANGELOG.md](CHANGELOG.md).

| Issue | Where | Found | Plan |
|---|---|---|---|
| **16 items are open in PENDING_FIXES.md: bugs 1–10 from the Steps 12–15 reviews (3 high severity: webhook fee, blog post delete, session revocation) and owner change requests 11–16 (brand "Astro Shashank" and logo, font precache, R2 media, astrologer photos, Medium-style blogs, UI polish; spec in README §19)** | See [PENDING_FIXES.md](PENDING_FIXES.md) | Steps 12–15 reviews (2026-10-02) | Apply every item in PENDING_FIXES.md before Step 16 |
| Owner and astrologer login throttling is stored in one backend process, so multiple production instances would not share attempt counts | `backend/src/auth/login-rate-limit.ts` | Step 3 | Choose the production topology or a shared limiter store in Step 16 |
| Blog comment throttling is stored in one backend process, so multiple production instances would not share attempt counts | `backend/src/blog/comment-rate-limit.ts` | Step 14 | Choose the production topology or a shared limiter store in Step 16 |
| `npm audit` reports 5 moderate and 8 high issues in the backend development dependency tree; the production-only audit reports 0 | `backend/package-lock.json` | Step 1 | Review dependency upgrades with the Prisma stable upgrade before launch |

# Progress

Last updated: 2026-10-01

## Build steps

The steps come from [BUILD_PROMPTS.md](../BUILD_PROMPTS.md). Each status is one of: Not started · In progress · Done · Blocked.

| # | Step | Status | Feature doc | Notes |
|---|---|---|---|---|
| 1 | Foundation, design.css, app shell | Done | [01-foundation-app-shell.md](features/01-foundation-app-shell.md) | Backend foundation, shared design system and routed app shell are in place. |
| 2 | Database and seed | Done | [02-database-and-seed.md](features/02-database-and-seed.md) | Neon marker and schema match the contract; the idempotent seed rows exist. |
| 3 | Owner panel | Done | [03-owner-panel.md](features/03-owner-panel.md) | Owner sessions, protected account/settings API and the `/owner` UI are in place. |
| 4 | Astrologer login and profile | Done | [04-astrologer-login-profile.md](features/04-astrologer-login-profile.md) | Astrologer login, forced password change, own-profile editing and shared Home-card preview are in place. |
| 5 | Home page | Done | [05-home-page.md](features/05-home-page.md) | Public privacy-limited cards, responsive Home states and the settings-backed call-type picker are in place. |
| 6 | Google login, details form, Settings | Done | [06-google-login-details-settings.md](features/06-google-login-details-settings.md) | Google redirect sign-in, user sessions/details, Settings and the pre-slot Home flow are in place. |
| 7 | Availability and time slots | Not started | — | |
| 8 | Booking free Normal calls | Not started | — | |
| 9 | History and astrologer bookings | Not started | — | |
| 10 | In-app call, part 1 | Not started | — | |
| 11 | In-app call, part 2 | Not started | — | |
| 12 | Urgent calls with Razorpay | Not started | — | |
| 13 | Subscription packs | Not started | — | |
| 14 | Blogs | Not started | — | |
| 15 | Install as an app, policy pages | Not started | — | |
| 16 | Security review and launch checklist | Not started | — | |

## Next up

Step 7: Astrologer availability and the time-slot picker.

## Known issues

Bugs, limitations and loose ends that aren't fixed yet. When one is fixed, remove it here and mention the fix in [CHANGELOG.md](CHANGELOG.md).

| Issue | Where | Found | Plan |
|---|---|---|---|
| The WebSocket handler is attached at the wrong level and supports only one global call | `backend/src/realtime/` | Before Step 1 | Rebuilt in Step 10 |
| Owner and astrologer login throttling is stored in one backend process, so multiple production instances would not share attempt counts | `backend/src/auth/login-rate-limit.ts` | Step 3 | Choose the production topology or a shared limiter store in Step 16 |
| `npm audit` reports 5 moderate and 8 high issues in the backend development dependency tree; the production-only audit reports 0 | `backend/package-lock.json` | Step 1 | Review dependency upgrades with the Prisma stable upgrade before launch |

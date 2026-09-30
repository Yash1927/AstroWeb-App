# Progress

Last updated: 2026-09-30

## Build steps

The steps come from [BUILD_PROMPTS.md](../BUILD_PROMPTS.md). Each status is one of: Not started · In progress · Done · Blocked.

| # | Step | Status | Feature doc | Notes |
|---|---|---|---|---|
| 1 | Foundation, design.css, app shell | Done | [01-foundation-app-shell.md](features/01-foundation-app-shell.md) | Backend foundation, shared design system and routed app shell are in place. |
| 2 | Database and seed | In progress | [02-database-and-seed.md](features/02-database-and-seed.md) | Contract, checked migration, seed, tests and endpoints are built; Neon apply/seed awaits the required environment values. |
| 3 | Owner panel | Not started | — | |
| 4 | Astrologer login and profile | Not started | — | |
| 5 | Home page | Not started | — | |
| 6 | Google login, details form, Settings | Not started | — | |
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

Step 2: database and seed.

## Known issues

Bugs, limitations and loose ends that aren't fixed yet. When one is fixed, remove it here and mention the fix in [CHANGELOG.md](CHANGELOG.md).

| Issue | Where | Found | Plan |
|---|---|---|---|
| The WebSocket handler is attached at the wrong level and supports only one global call | `backend/src/realtime/` | Before Step 1 | Rebuilt in Step 10 |
| Neon still has the boilerplate schema until the checked Step 2 migration is applied | `backend/migrations/app/20260930T0841_database_schema/` | Step 2 | Configure the direct URL, then run `npm run db:migrate` |
| `npm audit` reports 5 moderate and 8 high issues in the backend development dependency tree; the production-only audit reports 0 | `backend/package-lock.json` | Step 1 | Review dependency upgrades with the Prisma stable upgrade before launch |

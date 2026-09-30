# Progress

Last updated: 2026-09-30

## Build steps

The steps come from [BUILD_PROMPTS.md](../BUILD_PROMPTS.md). Each status is one of: Not started · In progress · Done · Blocked.

| # | Step | Status | Feature doc | Notes |
|---|---|---|---|---|
| 1 | Foundation, design.css, app shell | Not started | — | |
| 2 | Database and seed | Not started | — | |
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

Step 1: foundation, design.css and app shell.

## Known issues

Bugs, limitations and loose ends that aren't fixed yet. When one is fixed, remove it here and mention the fix in [CHANGELOG.md](CHANGELOG.md).

| Issue | Where | Found | Plan |
|---|---|---|---|
| Boilerplate bugs listed in README §14: no `app.listen`, routes not mounted, wrong `db` import, broken WebSocket message handler, blog schema can't store likes or comments, CORS open to every site | `backend/` | Before Step 1 | Fixed in Steps 1, 2 and 10 |
| The frontend is still the Vite starter template | `frontend/` | Before Step 1 | Replaced in Step 1 |

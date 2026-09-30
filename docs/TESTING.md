# Testing

Automated tests and manual checks, as they exist now.

Last updated: 2026-09-30

## Automated tests

Run backend tests from `backend/` with `npm test`. Step 1 configures Vitest with `--passWithNoTests`; feature test files start in the step that first requires them.

| Test file | What it covers | Step |
|---|---|---|
| No test files yet | Step 1 requires no automated feature tests | 1 |

## Manual checks

Results of each step's "Try it out" list in [BUILD_PROMPTS.md](../BUILD_PROMPTS.md). Codex records a result whenever you report it in the chat.

| Step | Date | Result | Notes |
|---|---|---|---|
| 1 | 2026-09-30 | Pass | Backend type-check and Vitest command passed. Frontend lint and production build passed. Local runtime checks covered `/api/health`, the Vite proxy and allowed-origin CORS. Exact 360px emulation found no horizontal overflow, confirmed 48px active targets, tab navigation with `fade-up`, overlay controls and reduced motion. The production bundle contains no design-page route or code. |

## Devices

Fill this in as real-device checks happen (README §18).

| Device and browser | Install | Google sign-in | In-app call | Speaker | Earbuds | Payment | Last checked |
|---|---|---|---|---|---|---|---|
| Android phone, Chrome | | | | | | | |
| iPhone, Safari (installed app) | | | | | | | |
| Desktop, Chrome | | | | | | | |

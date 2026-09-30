# Testing

Automated tests and manual checks, as they exist now.

Last updated: 2026-10-01

## Automated tests

Run backend tests from `backend/` with `npm test`, and frontend component tests from `frontend/` with `npm test`.

| Test file | What it covers | Step |
|---|---|---|
| `backend/src/prisma/seed.test.ts` | Owner seed input validation and Argon2id hashing | 2 |
| `backend/src/auth/session.test.ts` | Signed session ids; separate role cookies; 12-hour owner max-age; httpOnly, SameSite and production Secure attributes; root user/astrologer cookie paths | 3, 4 |
| `backend/src/auth/login-rate-limit.test.ts` | Normalized email plus IP keys, five-failure allowance, sixth-attempt blocking, reset and window expiry | 3 |
| `backend/routes/owner.test.ts` | Credential-error parity, login cookie, owner guard, logout deletion, every astrologer action and settings validation | 3 |
| `frontend/src/components/Dialog.test.tsx` | Types a multi-word controlled value while `onClose` changes identity; focus stays in the input and the dialog remains open | Step 3 fix |
| `backend/routes/astrologer.test.ts` | Credential parity, sixth-attempt blocking, cookie attributes, role/active guard, password gate and rotation, logout, own-record scoping and profile validation | 4 |
| `frontend/src/components/AstrologerCard.test.tsx` | All Home-card fields and the supplied Call action | 4 |

## Manual checks

Results of each step's "Try it out" list in [BUILD_PROMPTS.md](../BUILD_PROMPTS.md). Codex records a result whenever you report it in the chat.

| Step | Date | Result | Notes |
|---|---|---|---|
| 1 | 2026-09-30 | Pass | Backend type-check and Vitest command passed. Frontend lint and production build passed. Local runtime checks covered `/api/health`, the Vite proxy and allowed-origin CORS. Exact 360px emulation found no horizontal overflow, confirmed 48px active targets, tab navigation with `fade-up`, overlay controls and reduced motion. The production bundle contains no design-page route or code. |
| 2 | 2026-09-30 | Pass | Contract emission, migration integrity, backend type-check/tests, frontend lint/build and production audit passed. Prisma confirmed both migrations are applied and the Neon marker and schema match the contract. The idempotent seed found the existing owner and settings rows and changed neither. |
| 3 | 2026-09-30 | Reported Chrome issues fixed; manual retest needed | The owner found focus loss in dialogs, fixed overlays confined by `.screen`, one generic settings error and stale add-form values. The fixes now use body portals, open-only focus, latest-callback Escape handling, field-linked errors and form reset. The new frontend regression, frontend lint/build, backend type-check and all 19 backend tests pass. Please retest the four reported cases in Chrome. |
| 4 | 2026-10-01 | Automated pass; manual panel flow needed | Backend type-check and all 28 tests pass. Frontend TypeScript, ESLint, the production Vite bundle and both component tests pass. Prisma migration integrity/status and live Neon contract verification pass. The temporary-password, save/relogin, owner view, revocation and 360px rendered flows remain for the owner to try with real credentials. |

## Devices

Fill this in as real-device checks happen (README §18).

| Device and browser | Install | Google sign-in | In-app call | Speaker | Earbuds | Payment | Last checked |
|---|---|---|---|---|---|---|---|
| Android phone, Chrome | | | | | | | |
| iPhone, Safari (installed app) | | | | | | | |
| Desktop, Chrome | | | | | | | |

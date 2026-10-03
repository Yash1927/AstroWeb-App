# Step 3: Owner panel

- **Status:** Done
- **Spec:** README §2, §3, §4, §9, §10 and §12
- **Started:** 2026-09-30
- **Finished:** 2026-09-30

## Goal

Add the reusable server-side session foundation and the protected owner panel. The owner can sign in, manage astrologer accounts and edit every pricing and call-duration setting without exposing password hashes or session details.

## Plan

- **Screens and UI:** Replace the `/owner` placeholder with a responsive login state and an authenticated panel containing “Astrologers” and “Pricing & call settings”. Reuse the Step 1 components and add only owner-panel classes to `design.css`.
- **API:** Add owner login outside the protected prefix, then protect every `/api/owner/*` route with `requireOwner`. Add logout, session status, astrologer management and settings endpoints with Zod validation and calm generic errors.
- **Database:** Reuse `Owner`, `Session`, `Astrologer` and `Settings`. Store opaque signed session ids server-side for 12 hours, hash temporary passwords with Argon2id, and update settings in paise.
- **Real-time:** No changes.
- **New libraries:** Add `zod` for server validation and `supertest` plus its type package for HTTP authorization tests.

## Edge cases

- Wrong and unknown owner credentials return the same response and take the Argon2 verification path.
- Five failed attempts for the same normalized email and IP block further attempts for 15 minutes; a successful login clears that key.
- Missing, malformed, expired or wrong-role sessions return 401 and clear the owner cookie. Logout deletes the server row before clearing the cookie.
- Inactive astrologers are always hidden. Showing an inactive astrologer is rejected until the owner reactivates the account.
- Duplicate astrologer email addresses return a conflict without exposing database details.
- Deactivation hides the account; reactivation does not silently relist it.
- Rupee inputs are converted to integer paise in the UI. The API accepts only non-negative integer paise values and durations of 10, 15 or 30 minutes.
- Empty, loading, error and success states remain usable at 360px and with larger text.

## Test plan

- **Automated:** Test cookie signing and attributes, owner session authorization, logout deletion, login error parity and rate limiting, every astrologer mutation, settings validation/conversion helpers, backend type-check/tests, frontend lint/build and production dependency audit.
- **Manual:** Follow Step 3's “Try it out” list in `BUILD_PROMPTS.md`, including the sixth failed login, every astrologer action, the ₹350 round trip and post-logout 401.

## As built

- `backend/src/auth/session.ts` provides signed opaque session ids, separate cookie names and paths for all three roles, and database-backed create, resolve, expiry and delete operations. Owner sessions and cookies last 12 hours.
- `backend/src/auth/require-owner.ts` rejects a missing, expired, wrong-role or orphaned owner session. The middleware protects the whole `/api/owner` router.
- `POST /api/auth/owner/login` verifies Argon2id hashes through a constant missing-account path and applies a five-failure, 15-minute in-memory limit per normalized email and observed IP. `POST /api/owner/logout` removes the database row and clears the cookie.
- The protected owner API lists, creates and reads astrologers; edits names and emails; changes listing and active state; resets temporary passwords; and reads or updates all seven settings values. Zod validates body, params and query data.
- New astrologers receive a UUID, Argon2id password hash, `mustChangePassword = true` and `isListed = true`. Deactivation also hides them; reactivation leaves them hidden until the owner chooses to show them.
- `/owner` now has logged-out, checking, loading, empty, error and authenticated states. The authenticated panel contains the requested two sections, dialogs for add/edit/reset work, status chips and toast feedback.
- Prices are entered in rupees but sent to the server as whole paise. Each duration select contains only 10, 15 and 30 minutes.
- Dialog and BottomSheet focus only when opening and call the latest close callback on Escape. Dialog, BottomSheet and Toast render through body portals so the screen animation cannot constrain fixed overlays.
- Invalid settings fields show their own linked error, and the add-astrologer form is cleared whenever it closes or opens again.
- Added runtime `zod`; development-only backend `supertest` and `@types/supertest`; and frontend `vitest`, `jsdom`, Testing Library and user-event.

## How to try it

1. Start `npm run dev` in `backend/`, then `npm run dev` in `frontend/`.
2. Open `http://localhost:5173/owner` and sign in with the seeded `OWNER_EMAIL` and `OWNER_PASSWORD`.
3. Add an astrologer with a temporary password of at least 10 characters. Use the card actions to view and edit the profile, hide or show it, deactivate or reactivate it, and set another temporary password.
4. Open **Pricing & call settings**. Change a price and duration, save, and inspect `http://localhost:5173/api/settings/public` to confirm the price is stored in paise. Restore the intended value afterward.
5. Log out. Reloading `/owner` shows the login form, and `http://localhost:5173/api/owner/astrologers` returns 401.
6. Five failed attempts for one email and IP use the allowance. The sixth returns 429. Restart the backend development process to clear the in-memory development limit without waiting 15 minutes.

## Follow-ups and known issues

- Launch uses one backend instance so the process-local login limiter is authoritative; multiple instances require a shared limiter store.
- The automated suite and live Neon smoke test passed. The owner's Chrome test then found four overlay/form issues; they were corrected with a frontend jsdom regression. The four cases need a final manual Chrome retest.

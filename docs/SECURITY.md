# Security

The status of every item in README §12. Update this file whenever code that touches login, sessions, permissions, payments, validation, security headers or logging changes.

Last updated: 2026-10-01

Each status is one of: Not started · Done · Needs manual check.

| # | Area | Item (README §12) | Status | Where in the code | How it was verified |
|---|---|---|---|---|---|
| 1 | Payments | Razorpay secrets exist only in backend env vars; only the key id reaches the browser | Not started | | |
| 2 | Payments | The amount comes from `Settings`; the browser never sends a price | Not started | | |
| 3 | Payments | Every payment is verified on the server before a booking is confirmed or credits are added | Not started | | |
| 4 | Payments | Webhook signature checked on the raw body; duplicate events skipped; payment id unique | Not started | | |
| 5 | Payments | Test mode: success, failure, closed checkout, forged signature, replayed webhook | Not started | | |
| 6 | Accounts | Google ID token verified on the server; `email_verified`; `sub` stored; `g_csrf_token` checked | Not started | | |
| 7 | Accounts | Session cookies are httpOnly, Secure and SameSite=Lax, separate per panel, with the right lifetimes | Needs manual check | `backend/src/auth/session.ts` | Automated tests verify separate names, owner scope, root user/astrologer scope, 12-hour panel lifetime, httpOnly, SameSite and production Secure. Owner login has a live smoke test; astrologer production HTTPS remains for Step 16. |
| 8 | Accounts | argon2id passwords of at least 10 characters; login rate limit; same error for wrong email or password | Done | `backend/src/prisma/seed-helpers.ts`, `backend/src/owner/owner-schemas.ts`, `backend/src/astrologer/astrologer-schemas.ts`, `backend/src/auth/login-rate-limit.ts`, `backend/routes/OwnerAuth.ts`, `backend/routes/AstrologerAuth.ts` | Owner and astrologer password paths use Argon2id and 10-character validation. HTTP tests verify equal credential errors and sixth-attempt blocking for both roles. |
| 9 | Accounts | Astrologers must change their temporary password at first login | Done | `backend/src/astrologer/astrologer-service.ts`, `backend/routes/Astrologer.ts`, `frontend/src/screens/AstrologerPage.tsx` | The session response exposes the gate, profile methods reject gated accounts, the panel shows only password replacement, and HTTP tests cover both states. |
| 10 | Access | Every route checks the role and the specific record, with tests | Needs manual check | `backend/src/auth/require-owner.ts`, `backend/src/auth/require-astrologer.ts`, `backend/routes/Owner.ts`, `backend/routes/Astrologer.ts` | Both protected routers check role and a live account. Astrologer profile routes derive the record id only from the session. HTTP tests reject no/wrong/inactive sessions and verify own-record scoping. Later user, booking and blog routes still need their checks. |
| 11 | Access | WebSocket: session auth on upgrade, `Origin` check, booking participants only, only during the call window | Not started | | |
| 12 | Access | Short-lived TURN credentials for each call | Not started | | |
| 13 | General | HTTPS only with HSTS; CORS limited to `APP_ORIGIN` | Needs manual check | `backend/app.ts` (CORS); HTTPS and HSTS are not built | Local requests verified that the configured origin receives credentialed CORS headers and another origin does not receive permission for itself. Production HTTPS and HSTS remain for Step 16. |
| 14 | General | Security headers with a Content Security Policy that still allows Razorpay and Google sign-in | Not started | | |
| 15 | General | Every request validated with `zod` | Needs manual check | `backend/src/http/validation.ts`, `backend/src/owner/owner-schemas.ts`, `backend/src/astrologer/astrologer-schemas.ts`, `backend/routes/Owner*.ts`, `backend/routes/Astrologer*.ts` | All current owner and astrologer bodies, params and query strings use strict schemas. Earlier bodyless public endpoints and later-step routes remain to be audited in Step 16. |
| 16 | General | User and blog text never rendered as HTML | Not started | | |
| 17 | General | No birth details, phone numbers or tokens in logs | Not started | | |
| 18 | General | Neon connections keep `sslmode=require`; `.env` never committed | Done | `backend/.env.example`, `backend/prisma.config.ts`, `backend/src/prisma/db.ts` | Prisma connected through the configured URLs and verified the live schema. `.env` remains ignored and no values were printed. |

Step 1 defaults CORS to deny cross-origin access when `APP_ORIGIN` is absent. The public routes accept no request data. Owner and astrologer routes validate request data, return generic service errors and never return hashes or session ids. Both login limiters hash normalized email plus IP before storing the key in process memory. Passwords, cookie values and database errors are not logged.

Panel sessions are server-side and revocable. The browser receives only a signed random id in a role-specific httpOnly cookie. `Secure` is enabled when `NODE_ENV=production`, SameSite is Lax, and expiry is checked against the database on every protected request. The owner path is `/api/owner`; astrologer and future user paths are `/`. Logout deletes the row before clearing the cookie. Astrologer password replacement, owner reset and owner deactivation revoke that astrologer's existing sessions; password replacement then issues one fresh session to the current browser.

`npm audit --omit=dev` reports no production dependency vulnerabilities as of 2026-09-30. The full backend audit reports 5 moderate and 8 high findings in development dependencies; the planned dependency review is tracked in `docs/PROGRESS.md`.

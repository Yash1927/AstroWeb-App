# Security

The status of every item in README §12. Update this file whenever code that touches login, sessions, permissions, payments, validation, security headers or logging changes.

Last updated: 2026-09-30

Each status is one of: Not started · Done · Needs manual check.

| # | Area | Item (README §12) | Status | Where in the code | How it was verified |
|---|---|---|---|---|---|
| 1 | Payments | Razorpay secrets exist only in backend env vars; only the key id reaches the browser | Not started | | |
| 2 | Payments | The amount comes from `Settings`; the browser never sends a price | Not started | | |
| 3 | Payments | Every payment is verified on the server before a booking is confirmed or credits are added | Not started | | |
| 4 | Payments | Webhook signature checked on the raw body; duplicate events skipped; payment id unique | Not started | | |
| 5 | Payments | Test mode: success, failure, closed checkout, forged signature, replayed webhook | Not started | | |
| 6 | Accounts | Google ID token verified on the server; `email_verified`; `sub` stored; `g_csrf_token` checked | Not started | | |
| 7 | Accounts | Session cookies are httpOnly, Secure and SameSite=Lax, separate per panel, with the right lifetimes | Not started | | |
| 8 | Accounts | argon2id passwords of at least 10 characters; login rate limit; same error for wrong email or password | Not started | `backend/src/prisma/seed.ts`, `backend/src/prisma/seed-helpers.ts` cover only the seed | The Step 2 seed rejects shorter passwords and stores an Argon2id hash. Login and rate limiting remain for Steps 3 and 4. |
| 9 | Accounts | Astrologers must change their temporary password at first login | Not started | | |
| 10 | Access | Every route checks the role and the specific record, with tests | Not started | | |
| 11 | Access | WebSocket: session auth on upgrade, `Origin` check, booking participants only, only during the call window | Not started | | |
| 12 | Access | Short-lived TURN credentials for each call | Not started | | |
| 13 | General | HTTPS only with HSTS; CORS limited to `APP_ORIGIN` | Needs manual check | `backend/index.ts` (CORS); HTTPS and HSTS are not built | Local requests verified that the configured origin receives credentialed CORS headers and another origin does not receive permission for itself. Production HTTPS and HSTS remain for Step 16. |
| 14 | General | Security headers with a Content Security Policy that still allows Razorpay and Google sign-in | Not started | | |
| 15 | General | Every request validated with `zod` | Not started | | |
| 16 | General | User and blog text never rendered as HTML | Not started | | |
| 17 | General | No birth details, phone numbers or tokens in logs | Not started | | |
| 18 | General | Neon connections keep `sslmode=require`; `.env` never committed | Needs manual check | `backend/.env.example`, `backend/prisma.config.ts`, `backend/src/prisma/db.ts` | Example URLs require SSL and `.env` is ignored. The real connection cannot be verified until the missing Step 2 values are configured. |

Step 1 also defaults CORS to deny cross-origin access when `APP_ORIGIN` is absent. The three public routes accept no body, params or query, so they have no request data to validate. Database failures return generic messages and do not log connection details. No login, sessions, payments, personal data logging or protected records exist yet.

`npm audit --omit=dev` reports no production dependency vulnerabilities as of 2026-09-30. The full backend audit reports 5 moderate and 8 high findings in development dependencies; the planned dependency review is tracked in `docs/PROGRESS.md`.

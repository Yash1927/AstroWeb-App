# Setup

How to install and run the project as it is now. The planned setup is in README §13.

Last updated: 2026-10-01

## Requirements

- Node.js 24 and npm
- Windows 11 (the dev machine), with PowerShell or VS Code terminals
- A Neon Postgres project for database commands
- A Google Cloud OAuth client of type **Web application** for user sign-in

## Install

```powershell
cd backend
npm install
cd ..\frontend
npm install
```

## Environment variables

| Variable | File | What it's for | Needed from step | Example |
|---|---|---|---|---|
| `PORT` | `backend/.env` | Backend HTTP port; optional | 1 | `3000` |
| `NODE_ENV` | `backend/.env` | Enables Secure cookies when set to `production`; optional in development | 3 | `development` |
| `APP_ORIGIN` | `backend/.env` | The one browser origin allowed by CORS | 1 | `http://localhost:5173` |
| `DATABASE_URL` | `backend/.env` | Neon pooled runtime connection | 2 | See `backend/.env.example` |
| `DIRECT_DATABASE_URL` | `backend/.env` | Neon direct migration connection | 2 | See `backend/.env.example` |
| `SESSION_SECRET` | `backend/.env` | Sign server sessions | 3 | At least 32 random characters |
| `GOOGLE_CLIENT_ID` | `backend/.env` | Verify Google user sign-in | 6 | `xxxx.apps.googleusercontent.com` |
| `VITE_GOOGLE_CLIENT_ID` | `frontend/.env` | Render Google Identity Services in the browser; this client id is public | 6 | `xxxx.apps.googleusercontent.com` |
| `RAZORPAY_KEY_ID` | `backend/.env` | Create Razorpay checkout orders | 12 | `rzp_test_xxxx` |
| `RAZORPAY_KEY_SECRET` | `backend/.env` | Authenticate Razorpay server calls | 12 | Placeholder only in the example |
| `RAZORPAY_WEBHOOK_SECRET` | `backend/.env` | Verify Razorpay webhooks | 12 | Placeholder only in the example |
| `OWNER_EMAIL` | `backend/.env` | Seed the first owner account | 2 | `owner@example.com` |
| `OWNER_PASSWORD` | `backend/.env` | Seed the first owner password | 2 | At least 10 characters |
| `TURN_URLS` | `backend/.env` | TURN relay addresses | 11 | See `backend/.env.example` |
| `TURN_SECRET` | `backend/.env` | Derive short-lived TURN credentials | 11 | Placeholder only in the example |
| `APP_TIMEZONE` | `backend/.env` | App timezone for display and slot rules | 2 | `Asia/Kolkata` |

`backend/.env.example` and `frontend/.env.example` contain placeholders only. Use the same Web client id for `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`.

## Commands

| What | Folder | Command |
|---|---|---|
| Backend dev server | `backend/` | `npm run dev` |
| Create a development Normal booking | `backend/` | `npm run dev:make-booking -- --user USER_EMAIL --astrologer ASTROLOGER_EMAIL --starts-in MINUTES --duration MINUTES` |
| Backend type check | `backend/` | `npm run typecheck` |
| Backend tests | `backend/` | `npm test` |
| Frontend dev server | `frontend/` | `npm run dev` |
| Frontend production build | `frontend/` | `npm run build` |
| Frontend lint | `frontend/` | `npm run lint` |
| Frontend tests | `frontend/` | `npm test` |
| Emit the Prisma contract | `backend/` | `npm run contract:emit` |
| Plan a named migration | `backend/` | `npm run migration:plan -- --name <name>` |
| Check migration packages | `backend/` | `npm run migration:check` |
| Show migration status | `backend/` | `npm run migration:status` |
| Apply pending migrations | `backend/` | `npm run db:migrate` |
| Verify Neon against the contract | `backend/` | `npm run db:verify` |
| Seed owner and settings | `backend/` | `npm run seed` |

`dev:make-booking` looks up an existing user and astrologer by email, creates one confirmed free Normal call at the requested minute offset, and uses the supplied positive duration. A negative offset is allowed for testing Past cards. The command refuses to run when `NODE_ENV=production`; it can still be rejected by the database overlap constraint.

## Running locally

1. From `backend/`, copy `.env.example` to `.env`. Keep `PORT="3000"`, `NODE_ENV="development"` and `APP_ORIGIN="http://localhost:5173"` for the normal local setup. Set `SESSION_SECRET` to at least 32 random characters.
2. In Google Cloud, configure the Web client with `http://localhost:5173` as an authorised JavaScript origin and `http://localhost:5173/api/auth/google` as an authorised redirect URI. Add the equivalent exact HTTPS origin and `/api/auth/google` URI for production.
3. Put the Google client id in `GOOGLE_CLIENT_ID` in `backend/.env`. Copy `frontend/.env.example` to `frontend/.env` and put the same id in `VITE_GOOGLE_CLIENT_ID`.
4. Run `npm install`, then `npm run dev` in `backend/`.
5. In another terminal, run `npm install`, then `npm run dev` in `frontend/`.
6. Open `http://localhost:5173`. Vite forwards `/api` and `/ws` to `http://localhost:3000`.
7. Open `http://localhost:5173/api/health` to verify the proxy and backend. It should show `{"ok":true}`.
8. Open `http://localhost:5173/owner` and log in with the seeded owner credentials. The browser must go through the Vite origin so its `/api/owner` cookie and requests share one origin.
9. Use the owner panel to create an astrologer, then open `http://localhost:5173/astrologer` in a separate browser profile. Sign in with the temporary credentials and replace the password before editing the profile.

The backend denies cross-origin access when `APP_ORIGIN` is missing. Requests through the Vite proxy remain same-origin.

## Database setup

1. In Neon, copy the pooled connection string into `DATABASE_URL` and the direct connection string into `DIRECT_DATABASE_URL`. Keep `sslmode=require` in both. The direct hostname does not contain `-pooler`.
2. Set `OWNER_EMAIL` and set `OWNER_PASSWORD` to at least 10 characters. The seed stores an Argon2id hash, not the password.
3. From `backend/`, run:

```powershell
npm run db:migrate
npm run seed
npm run seed
npm run db:verify
```

The second seed run should report that neither row was created. Applied migration packages are `20260930T0841_database_schema` and `20260930T1814_astrologer_profile_saved_at`. The Step 4 package was generated with `npm run migration:plan -- --name astrologer_profile_saved_at`, applied with `npm run db:migrate`, and checked with `npm run migration:check` and `npm run db:verify`.

## Testing on a phone (HTTPS tunnel)

_Write the first time it's set up (from Step 11)._

## Production

_Write in Step 16:_ building and starting the app, production env vars, HTTPS and WebSockets, and switching Razorpay to live keys.

## Troubleshooting

| Problem | Fix |
|---|---|
| `/api/health` does not load through Vite | Make sure both dev servers are running and the backend is on port 3000. |
| A direct cross-origin request has no CORS permission | Set `APP_ORIGIN` to the exact frontend origin, without a trailing slash, and restart the backend. |
| Migration commands cannot connect | Set `DIRECT_DATABASE_URL` to Neon's direct connection string, not the pooled `-pooler` hostname. |
| The seed rejects its environment | Set a valid `OWNER_EMAIL` and an `OWNER_PASSWORD` of at least 10 characters. |
| Owner or astrologer login always returns 503 | Check `DATABASE_URL` and `SESSION_SECRET`; the session secret must contain at least 32 characters. |
| “Google sign-in is not configured yet” appears | Set `VITE_GOOGLE_CLIENT_ID` in `frontend/.env`, then restart Vite. |
| Google rejects the redirect | Add the exact browser callback, such as `http://localhost:5173/api/auth/google`, to the Web client's authorised redirect URIs. Also confirm both Google client-id variables use that client. |
| The sixth owner or astrologer login attempt returns 429 during development | Wait for the 15-minute window, or restart the backend process to clear the process-local development limiter. |
| An astrologer sees “Set a new password” after an owner reset | This is expected. Enter a new password of at least 10 characters before returning to the panel. |
| Prisma reports `RUNTIME.TEMPORAL_UNAVAILABLE` | Run `npm install`; `temporal-polyfill` must be installed and is loaded by `src/prisma/db.ts`. |

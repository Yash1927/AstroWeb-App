# Setup

How to install and run the project as it is now. The planned setup is in README §13.

Last updated: 2026-09-30

## Requirements

- Node.js 24 and npm
- Windows 11 (the dev machine), with PowerShell or VS Code terminals
- A Neon Postgres project for Step 2 database commands

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
| `APP_ORIGIN` | `backend/.env` | The one browser origin allowed by CORS | 1 | `http://localhost:5173` |
| `DATABASE_URL` | `backend/.env` | Neon pooled runtime connection | 2 | See `backend/.env.example` |
| `DIRECT_DATABASE_URL` | `backend/.env` | Neon direct migration connection | 2 | See `backend/.env.example` |
| `SESSION_SECRET` | `backend/.env` | Sign server sessions | 3 | At least 32 random characters |
| `GOOGLE_CLIENT_ID` | `backend/.env` | Verify Google user sign-in | 6 | `xxxx.apps.googleusercontent.com` |
| `RAZORPAY_KEY_ID` | `backend/.env` | Create Razorpay checkout orders | 12 | `rzp_test_xxxx` |
| `RAZORPAY_KEY_SECRET` | `backend/.env` | Authenticate Razorpay server calls | 12 | Placeholder only in the example |
| `RAZORPAY_WEBHOOK_SECRET` | `backend/.env` | Verify Razorpay webhooks | 12 | Placeholder only in the example |
| `OWNER_EMAIL` | `backend/.env` | Seed the first owner account | 2 | `owner@example.com` |
| `OWNER_PASSWORD` | `backend/.env` | Seed the first owner password | 2 | At least 10 characters |
| `TURN_URLS` | `backend/.env` | TURN relay addresses | 11 | See `backend/.env.example` |
| `TURN_SECRET` | `backend/.env` | Derive short-lived TURN credentials | 11 | Placeholder only in the example |
| `APP_TIMEZONE` | `backend/.env` | App timezone for display and slot rules | 2 | `Asia/Kolkata` |

`backend/.env.example` contains placeholders only. The frontend Google client variable from README §13 is added when Google sign-in is built in Step 6.

## Commands

| What | Folder | Command |
|---|---|---|
| Backend dev server | `backend/` | `npm run dev` |
| Backend type check | `backend/` | `npm run typecheck` |
| Backend tests | `backend/` | `npm test` |
| Frontend dev server | `frontend/` | `npm run dev` |
| Frontend production build | `frontend/` | `npm run build` |
| Frontend lint | `frontend/` | `npm run lint` |
| Emit the Prisma contract | `backend/` | `npm run contract:emit` |
| Plan a named migration | `backend/` | `npm run migration:plan -- --name <name>` |
| Check migration packages | `backend/` | `npm run migration:check` |
| Show migration status | `backend/` | `npm run migration:status` |
| Apply pending migrations | `backend/` | `npm run db:migrate` |
| Verify Neon against the contract | `backend/` | `npm run db:verify` |
| Seed owner and settings | `backend/` | `npm run seed` |

## Running locally

1. From `backend/`, copy `.env.example` to `.env`. Keep `PORT="3000"` and `APP_ORIGIN="http://localhost:5173"` for the normal local setup. The service placeholders are not used in Step 1.
2. Run `npm install`, then `npm run dev` in `backend/`.
3. In another terminal, run `npm install`, then `npm run dev` in `frontend/`.
4. Open `http://localhost:5173`. Vite forwards `/api` and `/ws` to `http://localhost:3000`.
5. Open `http://localhost:5173/api/health` to verify the proxy and backend. It should show `{"ok":true}`.

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

The second seed run should report that neither row was created. The migration package is `20260930T0841_database_schema`. It was generated with `npm run migration:plan -- --name database_schema` and checked with `npm run migration:check`.

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
| Prisma reports `RUNTIME.TEMPORAL_UNAVAILABLE` | Run `npm install`; `temporal-polyfill` must be installed and is loaded by `src/prisma/db.ts`. |

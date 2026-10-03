# Setup

How to install and run the project as it is now. The planned setup is in README §13.

Last updated: 2026-10-03

## Requirements

- Node.js 24 and npm
- Windows 11 (the dev machine), with PowerShell or VS Code terminals
- A Neon Postgres project for database commands
- A Google Cloud OAuth client of type **Web application** for user sign-in
- A coturn server or compatible managed TURN service with a REST shared secret for reliable in-app calls
- A Razorpay account with test API keys and a test webhook secret
- A Cloudflare account with R2 enabled for profile and blog images
- An HTTPS tunnel to the Vite server for real-phone microphone, earbuds and mobile-data checks

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
| `RUN_NEON_BRANCH_TESTS` | Temporary test shell only | Opt in to the item 7â€“8 destructive integration suite; keep `0` for normal tests | Pending fixes | `0` |
| `NEON_BRANCH_NAME` | Temporary test shell only | Prove the integration target uses the dedicated pending-fix branch naming pattern | Pending fixes | `pending-fixes-7-8-YYYYMMDD` |
| `SESSION_SECRET` | `backend/.env` | Sign server sessions | 3 | At least 32 random characters |
| `GOOGLE_CLIENT_ID` | `backend/.env` | Verify Google user sign-in | 6 | `xxxx.apps.googleusercontent.com` |
| `VITE_GOOGLE_CLIENT_ID` | `frontend/.env` | Render Google Identity Services in the browser; this client id is public | 6 | `xxxx.apps.googleusercontent.com` |
| `VITE_FORCE_RELAY` | `frontend/.env` | Force relay-only WebRTC while proving TURN locally; ignored by production builds | 11 | `false` |
| `RAZORPAY_KEY_ID` | `backend/.env` | Create Razorpay checkout orders | 12 | `rzp_test_xxxx` |
| `RAZORPAY_KEY_SECRET` | `backend/.env` | Authenticate Razorpay server calls | 12 | Placeholder only in the example |
| `RAZORPAY_WEBHOOK_SECRET` | `backend/.env` | Verify Razorpay webhooks | 12 | Placeholder only in the example |
| `OWNER_EMAIL` | `backend/.env` | Seed the first owner account | 2 | `owner@example.com` |
| `OWNER_PASSWORD` | `backend/.env` | Seed the first owner password | 2 | At least 10 characters |
| `TURN_URLS` | `backend/.env` | TURN relay addresses | 11 | See `backend/.env.example` |
| `TURN_SECRET` | `backend/.env` | Derive short-lived TURN credentials | 11 | Placeholder only in the example |
| `APP_TIMEZONE` | `backend/.env` | App timezone for display and slot rules | 2 | `Asia/Kolkata` |
| `R2_ACCOUNT_ID` | `backend/.env` | Cloudflare account that owns the media bucket | Pending fix 13 | See the R2 Account Details page |
| `R2_ACCESS_KEY_ID` | `backend/.env` | Server-only R2 API token key id | Pending fix 13 | Placeholder only in the example |
| `R2_SECRET_ACCESS_KEY` | `backend/.env` | Server-only R2 API token secret | Pending fix 13 | Placeholder only in the example |
| `R2_BUCKET` | `backend/.env` | R2 bucket used for processed WebP objects | Pending fix 13 | `astro-shashank-media` |
| `R2_PUBLIC_BASE_URL` | `backend/.env` | HTTPS public media origin, without a trailing slash | Pending fix 13 | Development `r2.dev` URL or production custom domain |

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
| Frontend production preview | `frontend/` | `npm run preview` |
| Regenerate install icons | `frontend/` | `npm run generate:pwa-assets` |
| Frontend lint | `frontend/` | `npm run lint` |
| Frontend tests | `frontend/` | `npm test` |
| Emit the Prisma contract | `backend/` | `npm run contract:emit` |
| Plan a named migration | `backend/` | `npm run migration:plan -- --name <name>` |
| Check migration packages | `backend/` | `npm run migration:check` |
| Show migration status | `backend/` | `npm run migration:status` |
| Apply pending migrations | `backend/` | `npm run db:migrate` |
| Verify Neon against the contract | `backend/` | `npm run db:verify` |
| Seed owner and settings | `backend/` | `npm run seed` |
| Delete unreferenced uploads older than 24 hours | `backend/` | `npm run media:cleanup` |

`dev:make-booking` looks up an existing user and astrologer by email, creates one confirmed free Normal call at the requested minute offset, and uses the supplied positive duration. A negative offset is allowed for testing Past cards. The command refuses to run when `NODE_ENV=production`; it can still be rejected by the database overlap constraint.

After creating any migration, run `npm run migration:check`, `npm run db:migrate`, `npm run migration:status` and `npm run db:verify` from `backend/` before reporting the work complete. If the target database must deliberately remain unchanged, state clearly in the report that the owner must run the apply/status/verify commands.

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

The backend denies cross-origin access when `APP_ORIGIN` is missing. Requests through the Vite proxy remain same-origin. The backend's one Node listener serves both HTTP and `/ws`; do not start a separate realtime process or open port 8080.

The call room fetches Google's public STUN address and configured TURN values from the protected booking API only after Join. `localhost` is accepted by browsers for microphone development. Real phones still need an HTTPS origin.

## Installable app checks

The manifest and service worker are production-build output. Run `npm run build`, then `npm run preview` in `frontend/`; the normal Vite development server does not install the generated service worker. Use a fresh browser profile when retesting install banners because dismissal is remembered in local storage.

`frontend/public/logo.jpg` is the owner-supplied brand source and must not be edited by the icon workflow. Run `npm run generate:pwa-assets` from `frontend/`; `scripts/create-pwa-icon-source.mjs` isolates and centres its AM ring on `#FFFBEB` in `public/app-icon-source.png` and creates the 96px `public/app-icon-header.png`. Then `pwa-assets.config.ts` replaces the 192px, 512px, maskable 512px and Apple touch PNGs. The maskable preset adds same-colour safe-zone padding so the source does not show as a square. Do not edit generated PNGs separately.

Real Android/desktop installation and iPhone/iPad Add to Home Screen checks need localhost or HTTPS. Physical-device checks need HTTPS. After a successful online load, disabling the connection shows the offline message from README §5.7; API, WebSocket, call-room and payment paths are not cached.

## TURN setup

1. Configure coturn's REST API shared-secret authentication, or choose a managed service that accepts the same time-limited HMAC-SHA1 credential format.
2. Put one or more comma-separated relay addresses in backend `TURN_URLS`, for example the placeholder UDP and TLS forms in `backend/.env.example`. Put only the matching shared secret in backend `TURN_SECRET`.
3. Restart the backend. During an active confirmed Normal call, `GET /api/calls/:bookingId/ice-servers` now returns STUN plus a TURN username that expires at that booking's end. The response is participant-only and is not cached.
4. For a local relay proof, set `VITE_FORCE_RELAY="true"` in `frontend/.env` and restart Vite. This selects relay-only ICE in development; production builds ignore it. Return the value to `false` after testing.

Static usernames and passwords must not be added to frontend source or `VITE_` variables. If a managed provider supplies only fixed credentials instead of a REST shared secret, it does not match the current short-lived credential integration.

## Razorpay test setup

1. In the Razorpay Dashboard, switch to test mode and create API keys. Put the test key id in `RAZORPAY_KEY_ID` and its secret in `RAZORPAY_KEY_SECRET` in `backend/.env`.
2. Create a separate webhook secret and put it in `RAZORPAY_WEBHOOK_SECRET`. Do not reuse or expose either secret in `frontend/.env`.
3. Give Razorpay a public HTTPS URL ending in `/api/razorpay/webhook`. For local testing, an HTTPS tunnel to Vite can forward that `/api` path through the existing proxy. Subscribe to `payment.captured`, `order.paid` and `payment.failed`.
4. Restart the backend. Sign in as a user with complete details and a valid phone, choose an Urgent slot, and confirm that Checkout shows the Settings price with the name, email and phone prefilled.
5. Run one test success, close Checkout once, and use Razorpay's test failure path. Confirm History and the astrologer Bookings section show a phone call with no Join button.
6. With a user whose Subscription balance is zero, choose Subscription and confirm Checkout charges the current pack price. After payment, History should show the pack size minus the call just booked.

The backend uses the official `razorpay` Node SDK. Orders and refunds require backend keys; the browser receives only the public key id with its server-created order. The webhook must receive its untouched `application/json` body, so its Express handler remains mounted before the global JSON parser.

## Cloudflare R2 media setup

1. Create or sign in to the Cloudflare account that will own the app. Open **R2 object storage** and enable R2. Cloudflare may ask for a payment card even when usage remains inside its free allowance.
2. Create a private bucket, for example `astro-shashank-media`. Put its exact name in `R2_BUCKET`.
3. On the R2 Account Details page, copy the account id into `R2_ACCOUNT_ID`.
4. Create an R2 API token with **Object Read & Write** permission scoped only to this bucket. Put its access-key id and one-time secret in `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`. These values stay in `backend/.env`; never add them to frontend variables.
5. For development, enable the bucket's **Public Development URL** and put its HTTPS `https://pub-….r2.dev` origin in `R2_PUBLIC_BASE_URL`. The `r2.dev` address is for development only.
6. For production, connect a dedicated custom media domain to the bucket, wait for HTTPS to become active, and replace `R2_PUBLIC_BASE_URL` with that origin. Restart the backend so upload responses and the Content Security Policy use it.
7. Run `npm run db:migrate` before the first upload. Schedule `npm run media:cleanup` at least daily in the production job runner. It deletes only media older than 24 hours that is not a profile photo, post cover or post-body image.

Uploads accept real JPG, PNG or WebP bytes up to 5 MB. The backend re-encodes them to metadata-free WebP before R2 receives them. A changed or removed profile image and images belonging to a deleted post are removed from both R2 and `MediaAsset`.

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

The second seed run should report that neither row was created. Migration `20261003T0224_media_and_rich_blogs` was applied by the owner reviewer on 2026-10-03. A later status and full verification confirmed that the live marker and schema match contract `4d019937…`.

### Isolated Neon integration test

`backend/src/blog/blog-service-neon.integration.test.ts` inserts and deletes temporary rows. Never point it at Neon's primary/default branch. Create a child branch first, confirm Neon reports `primary: false` and `default: false`, then set `DATABASE_URL` to that branch for this command only:

```powershell
$env:RUN_NEON_BRANCH_TESTS = "1"
$env:NEON_BRANCH_NAME = "pending-fixes-7-8-YYYYMMDD"
$env:DATABASE_URL = "<isolated Neon branch connection string>"
npm test -- src/blog/blog-service-neon.integration.test.ts
```

The suite covers a post with two likes and comments, two-session revocation through all three account flows, multiple availability rows and two elapsed payment holds. Set `RUN_NEON_BRANCH_TESTS` back to `0` and restore the normal `DATABASE_URL` before running the app.

## Testing on a phone (HTTPS tunnel)

1. Start the backend on port 3000 and Vite on port 5173.
2. Start an HTTPS tunnel that forwards its public address to `http://localhost:5173`. Keep that public URL private when it exposes the development app.
3. Give the exact tunnel hostname to the project before testing so it can be added to Vite's `server.allowedHosts`. The repo does not enable every host, and no hostname is preconfigured because tunnel addresses vary.
4. Set backend `APP_ORIGIN` to the exact public HTTPS origin, without a trailing slash, then restart the backend. This same value is enforced for CORS and the WebSocket `Origin` check.
5. If Google sign-in is needed, add the exact HTTPS origin to the OAuth client's authorised JavaScript origins and `<origin>/api/auth/google` to its authorised redirect URIs.
6. Open the HTTPS address on the phone. Join an active Normal call and test permission, mobile data, Speaker where the browser exposes it, and connecting/disconnecting wired or Bluetooth earbuds.

Vite continues to proxy `/api` and `/ws` to the one backend listener, so the browser cookies stay first-party. A Razorpay webhook can use the same HTTPS tunnel's `/api/razorpay/webhook` path while Step 12 is tested locally.

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
| The call page says the connection ended immediately | Open the frontend through the exact `APP_ORIGIN`, confirm the correct user or astrologer session is signed in, and confirm current time is inside the stored booking window. |
| Microphone access is blocked | Allow the microphone for the frontend origin in browser site settings, return to the room and choose **Try again**. Production and real-phone access require HTTPS. |
| Join reports “Call audio is unavailable” | Set valid `TURN_URLS` and `TURN_SECRET` for a coturn REST-compatible service, restart the backend and confirm the booking is currently active. |
| A call works normally but fails with `VITE_FORCE_RELAY="true"` | The TURN relay is unreachable or its URL/shared secret does not match. Check coturn/provider logs without copying credentials into application logs. |
| Vite rejects the HTTPS tunnel host | Add only the tunnel's exact hostname to `server.allowedHosts` in `frontend/vite.config.ts`, then restart Vite. Do not enable every host. |
| Two peers cannot establish audio on a restrictive or mobile network | Confirm TURN is configured, then repeat with the development relay-only flag. A successful relay-only call proves media is not falling back to direct STUN. |
| Checkout says payment is unavailable | Confirm all three Razorpay backend variables use test-mode values, restart the backend, and allow `https://checkout.razorpay.com` in any local browser/content blocker. Never put the key secret in the frontend. |
| An image upload says media storage is not configured | Fill all five `R2_` variables, use an HTTPS public base URL, and restart the backend. |
| An uploaded image returns 404 in the browser | Confirm the R2 bucket has a public development URL or production custom domain and that `R2_PUBLIC_BASE_URL` matches it. |
| Razorpay shows a paid order but the booking stays pending | Confirm the browser called `/api/payments/verify`; also check that the Dashboard webhook points to the exact public `/api/razorpay/webhook` URL and uses the same webhook secret configured in the backend. |
| Prisma reports `RUNTIME.TEMPORAL_UNAVAILABLE` | Run `npm install`; `temporal-polyfill` must be installed and is loaded by `src/prisma/db.ts`. |

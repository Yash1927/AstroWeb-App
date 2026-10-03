# Step 16: Security review and launch checklist

- **Status:** Done
- **Spec:** README §1, §12, §14, §17 and §18
- **Started:** 2026-10-03
- **Finished:** 2026-10-03

## Goal

Verify the security checklist and access boundaries, then make the existing app deployable as one HTTPS Node service for the frontend, API and WebSocket endpoint.

## Plan

- **Screens and UI:** Serve the existing production frontend build with an SPA fallback.
- **API:** Verify every route, add missing access-control coverage, production proxy handling and production-only static hosting.
- **Database:** Check for a stable Prisma 8 release and keep the schema unchanged.
- **Real-time:** Keep `/ws` on the backend HTTP server and document proxy requirements.
- **New libraries:** None planned.

## Edge cases

- API and WebSocket paths must never fall through to the SPA shell.
- Static hosting must be disabled outside production and must fail clearly when the frontend has not been built.
- Proxy-derived protocol and client IP data must only be trusted in production.
- Development helpers and flags must remain unavailable in production.

## Test plan

- **Automated:** Production trust proxy/static shell behavior, access-control boundaries for id routes, security headers, CORS, cookies and development-only gates.
- **Manual:** The Step 16 checks in `BUILD_PROMPTS.md`, including real-device installation, payments, TURN audio and Lighthouse.

## As built

- Audited README §12 and added the missing booking rate limit plus strict input checks on the remaining public/webhook routes.
- Added access-control regressions for foreign user/astrologer records and user sessions attempting every protected panel id route.
- Added a cross-platform production build and start path. Express trusts one production proxy hop, redirects browser HTTP to HTTPS, serves the Vite build and keeps `/api` and `/ws` out of the SPA fallback.
- Confirmed production bundles omit frontend secrets and development-only helpers. Prisma 8 remains a release candidate, so no stable upgrade was available.

## How to try it

1. From `backend/`, run `npm run build`, set the production variables described in `docs/SETUP.md`, then run `npm start`.
2. Open a browser route, `/api/health` and a WebSocket call through the same HTTPS domain.
3. Complete the Razorpay, install, TURN call and Lighthouse checks below on real devices before launch.

## Follow-ups and known issues

Razorpay/Google live flows, physical-device install and audio behavior, and Lighthouse require the owner's production accounts and real Android/iPhone hardware. Launch remains limited to one backend instance until rate-limit counters move to shared storage.

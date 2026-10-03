# Step 15: Install as an app and policy pages

- **Status:** Done
- **Spec:** README §3, §5.7, §10 and §17
- **Started:** 2026-10-02
- **Finished:** 2026-10-02

## Goal

Make AstroWebApp installable with a placeholder manifest and icons, an auto-updating service worker and clear offline handling. Replace the policy placeholders with public, readable pages, including live Settings-backed pricing.

## Plan

- **Screens and UI:** Add a Home install banner for supported Android/desktop browsers, a one-time iPhone/iPad Add to Home Screen hint, a global offline screen, a compact Home policy footer and seven public policy pages. Reuse the existing tokens and shared components.
- **API:** Reuse `GET /api/settings/public` for `/pricing`; add no endpoint.
- **Database:** No changes.
- **Real-time:** Do not cache `/ws` or either call-room route. No signalling changes.
- **New libraries:** Add `vite-plugin-pwa` for manifest/service-worker generation and `@vite-pwa/assets-generator` for reproducible icon generation from one SVG source.

## Edge cases

- Do not show either install prompt when the app is already running in standalone mode.
- Remember explicit banner dismissal and the one-time iOS hint locally without storing personal data.
- Keep API, WebSocket, call-room and payment requests out of runtime caches.
- Show a calm offline screen when browser connectivity is lost, and restore the current route when it returns.
- Keep policy pages public even when the Settings-backed Pricing request fails.

## Test plan

- **Automated:** Cover desktop install prompting, persistent dismissal, one-time iOS guidance, standalone suppression, offline state changes, policy routing/content and live Pricing loading/error states. Run frontend tests, lint and production build, plus backend type-check and tests.
- **Manual:** Follow the Step 15 “Try it out” list in `BUILD_PROMPTS.md`, including manifest inspection, Android installation, iPhone installation and Google sign-in, offline startup, and every policy route.

## As built

- `frontend/vite.config.ts` uses `vite-plugin-pwa` in `generateSW` mode with auto-update registration. The generated manifest uses the temporary AstroWebApp name, `/` start URL, standalone display and `#FFFBEB` theme/background from README §5.7.
- `frontend/public/app-icon.svg` is the single editable icon source. `frontend/pwa-assets.config.ts` and `npm run generate:pwa-assets` create the 192px, 512px, maskable 512px and 180px Apple touch PNGs.
- The production service worker precaches only the HTML, compiled JavaScript/CSS, local fonts, manifest and icons. It has no runtime cache. Navigation fallback denies `/api`, `/ws`, user and astrologer call rooms, and payment/Razorpay paths.
- `frontend/src/App.tsx` shows “You're offline. Please check your internet connection.” while the browser reports no connection and restores the current route after an online event.
- `frontend/src/components/InstallPrompt.tsx` keeps the browser install event for a small Home banner on supported Android/desktop browsers. Explicit or native dismissal is stored locally. iPhone/iPad Safari gets a one-time Share → Add to Home Screen hint; neither prompt appears in standalone mode.
- `/terms`, `/privacy`, `/refunds`, `/shipping`, `/contact`, `/about` and `/pricing` are public readable pages. Every page marks owner-supplied text with square-bracket placeholders. Shipping states that nothing is shipped; Pricing reads all displayed prices, pack size and durations from `GET /api/settings/public`.
- `PolicyLinks` exposes all seven routes from Settings and a compact Home footer. All new layouts use the existing design tokens, 48px targets and reduced-motion behavior.
- No backend, database, environment-variable or API change was needed.

## How to try it

1. In `frontend/`, run `npm install`, then `npm run build` and `npm run preview`.
2. Open the preview URL. In browser developer tools, inspect the manifest and service worker. Confirm the app name, standalone mode, cream theme/background and all icon sizes.
3. In Chrome or Edge, use a fresh profile that has not dismissed the prompt. Confirm the small Home banner appears when `beforeinstallprompt` is available; choose **Not now**, reload, and confirm it stays dismissed.
4. In iPhone/iPad Safari over HTTPS, confirm the one-time **Share → Add to Home Screen** hint appears before installation and not after dismissal or standalone launch.
5. Install and launch the app on Android/desktop. Turn off the connection after the shell has loaded and confirm the exact offline message. Confirm `/api`, `/ws`, call-room and payment requests are absent from the precache.
6. With the normal backend and frontend development servers running, open `/terms`, `/privacy`, `/refunds`, `/shipping`, `/contact`, `/about` and `/pricing` from Home and signed-in Settings. Compare Pricing with the owner’s current Settings values.
7. Before launch, fill the five remaining `[OWNER: ...]` business facts and complete legal and Razorpay policy review.

## Follow-ups and known issues

- Real install, standalone launch and installed-iPhone Google sign-in behavior require physical devices and HTTPS.
- The dated policy copy is in place. Five business-contact, tax and jurisdiction facts remain clearly marked for the owner before Razorpay live-mode approval.

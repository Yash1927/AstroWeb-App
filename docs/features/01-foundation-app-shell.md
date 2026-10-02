# Step 1: Foundation, design.css and app shell

- **Status:** Done
- **Spec:** README §1, §3, §5.6, §10, §13 and §14
- **Started:** 2026-09-30
- **Finished:** 2026-09-30

## Goal

Replace the starter frontend with the AstroWebApp shell and shared design system. Make the existing backend start safely, expose a health endpoint under `/api`, and provide the environment and development setup needed by later steps.

## Plan

- **Screens and UI:** Add the four-tab user shell, placeholder routes from README §3, later-step panel placeholders, shared UI components, and a development-only design reference page. Implement the tokens, component classes, animations and accessibility foundations from README §10 in `frontend/src/design.css`.
- **API:** Mount the existing empty routers under `/api`, restrict CORS to `APP_ORIGIN`, listen on `PORT` or 3000, and add `GET /api/health`.
- **Database:** No schema, migration, seed or real data changes.
- **Real-time:** No changes; Step 10 replaces the current stubs.
- **New libraries:** Add React Router and self-hosted Nunito to the frontend, and `tsx` to the backend development tools.

## Edge cases

- If `APP_ORIGIN` is absent, cross-origin requests receive no CORS permission instead of falling back to a wildcard.
- Avatar initials work for one-word, multi-word and non-Latin names, and their colours remain stable for the same id.
- The bottom navigation remains usable at 360px and with larger text.
- Modal components expose labelled dialogs, close controls and Escape-key handling.
- The design route is registered only in development builds.
- Reduced-motion preferences reduce all movement and stop repeating animations.

## Test plan

- **Automated:** No feature tests are required by Step 1. Run the repository's existing test command, backend type-check, frontend lint and frontend production build.
- **Manual:** Follow the Step 1 "Try it out" list in `BUILD_PROMPTS.md`, including health proxy, 360px layout, component states and reduced motion.

## As built

- `backend/index.ts` now loads environment variables, allows credentialed CORS only for `APP_ORIGIN`, mounts the existing empty routers at `/api`, exposes `GET /api/health`, validates `PORT`, and listens on port 3000 by default.
- The empty authentication stubs were removed. `routes/User.ts` now imports the exported Prisma `db`, while the real user, astrologer and blog handlers remain for later steps.
- `backend/.env.example` contains placeholder values for every backend variable in README §13, plus the optional `PORT` used by the server.
- The backend now has `dev`, `typecheck` and passing Vitest scripts. `cors` is recorded as a runtime dependency; `tsx`, TypeScript and Vitest are development dependencies.
- `frontend/src/design.css` is the single design stylesheet. It contains the README §10 tokens, responsive base styles, every named component class, all required motion, exit motion for overlays, and the reduced-motion override.
- The starter UI and assets were removed. React Router serves every user route from README §3, the four-tab shell and a not-found page. Later steps replaced the original route and panel placeholders with their real screens.
- Shared `Button`, `Card`, `Avatar`, `BottomSheet`, `Dialog`, `Toast`, `Skeleton` and `StatusBadge` components live in `frontend/src/components/`.
- `/_design` demonstrates all colours, components and animations only in development. The conditional lazy route and its code are absent from the production bundle.
- Vite proxies `/api` and `/ws` to the backend. The document title, language and theme colour match the spec.
- No database schema, login flow, real data or real-time code was changed.

## How to try it

1. Copy `backend/.env.example` to `backend/.env`. The local defaults work for this step; later steps need the service credentials.
2. Run `npm install` and `npm run dev` in `backend/`.
3. Run `npm install` and `npm run dev` in `frontend/`.
4. Open `http://localhost:5173` and switch among Home, History, Blogs and Settings.
5. Open `http://localhost:5173/api/health`; it returns `{"ok":true}` through the Vite proxy.
6. In development, open `http://localhost:5173/_design`. Try the sheet, dialog, toast and animated controls, then emulate reduced motion in browser developer tools.
7. Run `npm run typecheck` and `npm test` in `backend/`, then `npm run lint` and `npm run build` in `frontend/`.

## Follow-ups and known issues

- Steps 10 and 11 replaced the realtime and call-room stubs with authenticated WebSocket/WebRTC calls.
- Step 15 replaced every policy placeholder and added the installable app shell.
- The backend's production dependency audit reports no vulnerabilities. The full audit reports 13 issues in development dependencies; these are recorded in `docs/PROGRESS.md` for the planned dependency upgrade before launch.

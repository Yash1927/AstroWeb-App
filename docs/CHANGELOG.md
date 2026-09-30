# Changelog

Every change to the project, newest first, with one entry per task. Use this format:

```markdown
## YYYY-MM-DD: Step N, title (or a short description)
- **Added / Changed / Fixed / Removed:** what changed, in plain words
- **Files:** the main files touched
- **Database:** migrations (or "none")
- **Env vars:** new or changed variables (or "none")
- **Docs updated:** which docs
- **Notes:** breaking changes, follow-ups (optional)
```

---

## 2026-09-30: Step 2, database and seed (Neon apply pending)
- **Added:**
  - the complete 13-table Prisma 8 contract, generated artifacts and a checked migration package
  - the `btree_gist` extension and `Booking_no_overlap` exclusion constraint in the migration
  - an idempotent owner/settings seed with Argon2id hashing and seed validation tests
  - `GET /api/health/db` and the narrow `GET /api/settings/public` response
- **Changed:** Prisma 8 packages to the current release candidates, migration scripts, the direct migration connection, and Node 24 Temporal support
- **Removed:** the legacy `Astro`, `Blogs` and incomplete `User` schema from the target contract
- **Files:** `backend/src/prisma/`, `backend/migrations/`, `backend/routes/Public.ts`, `backend/index.ts`, `backend/prisma.config.ts`, `backend/package.json`, `backend/.env.example`
- **Database:** added `20260930T0841_database_schema`; generated and checked locally, not yet applied to Neon
- **Env vars:** no new names; Step 2 now uses `DATABASE_URL`, `DIRECT_DATABASE_URL`, `OWNER_EMAIL` and `OWNER_PASSWORD`
- **Docs updated:** `docs/PROGRESS.md`, `docs/features/02-database-and-seed.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DATABASE.md`, `docs/SETUP.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md`
- **Notes:** applying/verifying Neon and running the real seed remain pending until the required values are set in `backend/.env`.

## 2026-09-30: Step 1, foundation, design.css and app shell
- **Added:**
  - a runnable Express server, `GET /api/health`, restricted credentialed CORS and `/api` router mounting
  - the shared design tokens, component styles, animations and reduced-motion behaviour in `frontend/src/design.css`
  - shared frontend components, the routed four-tab app shell and development-only `/_design` gallery
  - Vite development proxies for `/api` and `/ws`
- **Changed:** backend development and verification scripts, environment placeholders, the page metadata, and the empty route modules
- **Removed:** Vite demo styles, content and unused starter assets
- **Files:** `backend/index.ts`, `backend/routes/`, `backend/.env.example`, `backend/package.json`, `frontend/src/`, `frontend/vite.config.ts`, `frontend/index.html`
- **Database:** none
- **Env vars:** added placeholders for `PORT` and every backend variable in README §13
- **Docs updated:** `docs/PROGRESS.md`, `docs/features/01-foundation-app-shell.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/API.md`, `docs/SETUP.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/PANEL_GUIDE.md`, `docs/CHANGELOG.md`
- **Notes:** no login, real data, database rebuild or real-time implementation was added. `backend/src/realtime/` remains unchanged for Step 10.

## 2026-09-30: Project spec and docs set up
- **Added:**
  - `README.md` (the product spec)
  - `BUILD_PROMPTS.md` (the 16 build steps, with setup instructions for Codex in VS Code)
  - `AGENTS.md` (rules for coding agents, including keeping these docs up to date)
  - `docs/`, with templates for the as-built documentation
- **Files:** `README.md`, `BUILD_PROMPTS.md`, `AGENTS.md`, `docs/`
- **Database:** none
- **Env vars:** none
- **Docs updated:** all docs created
- **Notes:** No app code has changed yet, so the boilerplate bugs in README §14 are still there.

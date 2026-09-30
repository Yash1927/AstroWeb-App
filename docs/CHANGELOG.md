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

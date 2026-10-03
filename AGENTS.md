# AGENTS.md

Instructions for AI coding agents (such as Codex) working in this repository. Follow them in every task.

## The project

AstroWebApp is an installable astrology web app (PWA) where users book calls with astrologers:

- **Normal** calls are free, in-app audio calls.
- **Urgent** calls (paid per call) and **Subscription** calls (a paid pack of calls) are phone calls: the astrologer phones the user at the booked time.

Other parts of the app:
- Payments use Razorpay.
- Astrologers have their own panel: profile, availability, bookings and blogs.
- The owner has a panel for managing astrologers, prices and call durations.
- Users can read, like and comment on blogs.

The app is built one step at a time from `BUILD_PROMPTS.md`.

## Where things are

| Path | What it is | Who edits it |
|---|---|---|
| `README.md` | The product spec: what to build. The source of truth. | Only when the user asks |
| `BUILD_PROMPTS.md` | The 16 build steps, in order | Only when the user asks |
| `AGENTS.md` | These instructions | Only when the user asks |
| `docs/` | As-built documentation: what the code does now | You, in every task (see [Docs](#docs)) |
| `frontend/` | React 19 + Vite 8 + TypeScript. All styles live in `frontend/src/design.css`. | You |
| `backend/` | Node + Express 5 + TypeScript, `ws` for WebSockets, Prisma 8 (`backend/src/prisma/contract.prisma`) on Neon Postgres | You |

**The spec and the docs are different things.** `README.md` says what the app *should* do; `docs/` says what the code *does now*. Don't copy the spec into `docs/`. Describe the real implementation, and link to the README section it implements (e.g. "README §6.4").

## Environment

- The dev machine runs Windows 11, PowerShell, Node.js 24 and npm. npm scripts must work on Windows: no `VAR=value command`, so use cross-platform tools instead.
- Don't start long-running processes (dev servers, watchers) and leave them running. To check that a server starts, run it briefly and then stop it. The user runs the dev servers themselves.

## Commands

Run each command inside its folder. Steps 1 and 2 add the commands that don't exist yet; `docs/SETUP.md` always has the current list.

| What | Folder | Command |
|---|---|---|
| Dev server | `backend/` | `npm run dev` |
| Type check | `backend/` | `npm run typecheck` |
| Tests | `backend/` | `npm test` |
| Dev server | `frontend/` | `npm run dev` |
| Production build | `frontend/` | `npm run build` |
| Lint | `frontend/` | `npm run lint` |

## Rules

1. **Build only what's asked.** For a build step, build only what that step lists: nothing from later steps, and nothing listed in README §15. Don't invent features, settings or screens.
2. **The README wins.** Before writing code, read the README sections the step names. If the request and the README disagree, follow the README and tell the user about the conflict.
3. **Assumptions.** Where the README marks something "(Assumption)", build that default (README §16.2).
4. **Stack.** Use the existing stack and folders. Add a dependency only when the task needs it. List each new dependency in your report and in `docs/ARCHITECTURE.md`.
5. **Styling:**
   - use only the tokens and classes in `frontend/src/design.css` (README §10); never hard-code colours or durations
   - build mobile-first and check the layout at 360px wide
   - make tap targets at least 48px
   - respect `prefers-reduced-motion`
   - write on-screen text that is calm, plain and in sentence case (README §10.5)
6. **Security** (README §12), for everything you touch:
   - on the server, check both the role and the specific record for every request
   - validate every request body, params and query with `zod`
   - never put secrets in the frontend; only `VITE_` variables go there
   - never log birth details, phone numbers, tokens or secrets
7. **Data:**
   - money is stored as whole paise (integers)
   - times are stored as UTC (`timestamptz`) and shown in IST
   - prices and durations always come from the `Settings` table
8. **Environment variables.** Add every new one to `backend/.env.example` or `frontend/.env.example` with a placeholder value, and to `docs/SETUP.md`. Never print or copy real values from `.env` files into code, docs, logs or your replies.
9. **Tests.** Write the tests the step asks for, using Vitest.
10. **Dev-only helpers.** Preview pages, test scripts and debug flags must never ship or run in production.
11. **Before you finish:**
    - `npm run build` passes in `frontend/`
    - the backend type-checks
    - all tests pass

    Run these full checks **once, at the end**. Run them again only if you change code afterwards. While you work, run only the test files for the code you changed (`npx vitest run <file>`). Docs-only changes need no checks.
12. **Ask first** before anything destructive or hard to undo:
    - dropping or resetting database tables, or deleting data
    - deleting files you didn't create
    - changing `README.md`, `BUILD_PROMPTS.md` or `AGENTS.md`
13. **Git.** Don't commit, push or create branches unless the user asks. The user reviews and commits each step.

## Step workflow

1. **Read:** the step, the README sections it names, `docs/PROGRESS.md`, and the docs for every area you'll touch.
2. **Plan:** copy `docs/features/_TEMPLATE.md` to `docs/features/NN-short-name.md` (e.g. `03-owner-panel.md`) and fill in Goal, Plan, Edge cases and Test plan. Mark the step "In progress" in `docs/PROGRESS.md`. If the user asked for the plan only, stop here and wait.
3. **Build:** the step and its tests.
4. **Check:** everything in rule 11.
5. **Document:**
   - fill in the "As built" and "How to try it" sections of the feature doc
   - mark the step "Done" in `docs/PROGRESS.md`
   - update every other doc the change affects (see [Docs](#docs))
6. **Report** in the format below, then stop. Don't start the next step.

Small tasks outside the build steps (fixes, tweaks, questions that lead to changes) don't need a feature doc. They update `docs/CHANGELOG.md` and mark items in `docs/PENDING_FIXES.md`. They touch another doc only when a fact recorded there changed, such as an endpoint, table, env var, script, permission or something the owner or astrologers see.

## Docs

A task isn't finished until `docs/` matches the code. Update the docs in the same task as the change, but **keep doc work small**:

- Edit only the lines whose facts changed. Don't rewrite, reorganise or re-read whole docs.
- Write each fact in one doc and link to it from others; don't repeat it.
- Keep a CHANGELOG entry to at most 6 short lines.
- Don't document internal refactors, styling tweaks or test-only changes beyond the CHANGELOG line.

| If you… | Update |
|---|---|
| change anything at all | `docs/CHANGELOG.md` (new entry at the top) |
| start or finish a build step, or find a problem you won't fix now | `docs/PROGRESS.md` |
| work on a build step | its feature doc in `docs/features/` |
| add or change folders, services, libraries, integrations or data flows | `docs/ARCHITECTURE.md` |
| change `design.css`, shared components, screens, animations or on-screen wording | `docs/DESIGN_SYSTEM.md` |
| add or change an HTTP endpoint, WebSocket message or webhook | `docs/API.md` |
| change the schema, a migration or the seed data | `docs/DATABASE.md` |
| add env vars, scripts, setup steps or external services | `docs/SETUP.md` |
| add or change automated tests, or the user reports manual test results | `docs/TESTING.md` |
| touch login, sessions, permissions, payments, validation, security headers, rate limits or logging | `docs/SECURITY.md` |
| make a choice the README doesn't settle, differ from the README, or record the user's answer to an open question | `docs/DECISIONS.md` |
| change anything the owner or astrologers see or do | `docs/PANEL_GUIDE.md` (plain language, no jargon) |

How to write the docs:

- Describe what exists now. Plans belong only in the "Plan" section of a feature doc.
- Write short sentences in plain English, and use tables for lists (endpoints, tables, env vars).
- Link to code paths (e.g. `backend/routes/Bookings.ts`) and README sections instead of copying them.
- Use Mermaid diagrams where a picture helps, such as flows and architecture.
- Write dates as YYYY-MM-DD, and update the "Last updated" line of every doc you change.
- Never put secrets, real phone numbers or other real personal data in the docs. Use placeholders.

## Report

End every task with these five headings, a few lines each:

1. **Built / changed:** what you did, and the main files
2. **Docs updated:** which files
3. **Setup needed:** accounts, keys, env vars or commands the user must run
4. **Try it out:** exact steps
5. **Notes:** assumptions, anything unfinished, known issues

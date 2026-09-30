# Decisions

Choices made while building, and why. Newest entries go last. This file also records the owner's answers to the README's open questions (README §16.2).

Use this format:

```markdown
## D-NNN: Title
- **Date:** YYYY-MM-DD
- **Status:** Accepted, or "Superseded by D-NNN"
- **Context:** why a decision was needed
- **Decision:** what was chosen
- **Consequences:** what follows from it, including trade-offs
```

---

## D-001: README is the spec; docs/ describe what's built
- **Date:** 2026-09-30
- **Status:** Accepted
- **Context:** A coding agent builds the app step by step, so the plan and the real code can drift apart.
- **Decision:** `README.md` is the only spec. `docs/` records what the code actually does, and is updated in the same task as each change (rules in `AGENTS.md`).
- **Consequences:** Every task updates the docs, and any difference from the README is recorded here.

## D-002: Stack
- **Date:** 2026-09-30
- **Status:** Accepted
- **Context:** The repo started from a boilerplate, and the brief named Neon and Razorpay.
- **Decision:**
  - frontend: React 19, Vite 8 and TypeScript
  - backend: Express 5, TypeScript and `ws`
  - database: Prisma 8 on Neon Postgres
  - payments: Razorpay
  - user login: Google Identity Services
  - in-app calls: WebRTC with a TURN relay
- **Consequences:** Prisma 8 is still a release candidate (a stable release is expected in October 2026), so it must be upgraded before launch (README §14).

## D-003: The call type decides how the call happens
- **Date:** 2026-09-30
- **Status:** Accepted (owner's instruction)
- **Context:** Urgent and Subscription bookings require a phone number because "we will call back".
- **Decision:**
  - Normal calls happen in the app, with Join / Join now buttons.
  - For Urgent and Subscription, the astrologer phones the user at the booked time. These bookings never show a Join button. Instead they say "{astrologer} will call you at {time} on {number}".
- **Consequences:** The in-app call room serves Normal bookings only. It's still open whether a Normal booking that includes a phone number should also become a phone call (README §16.2, question 1).

## D-004: Open questions use the README's defaults
- **Date:** 2026-09-30
- **Status:** Accepted
- **Context:** README §16.2 lists 19 open questions.
- **Decision:** Build each default until the owner answers. Record each answer here as a new decision, and update the README to match.
- **Consequences:** Some behaviour may change later, e.g. subscription expiry or refunds.

## D-005: Build with Codex, one step at a time
- **Date:** 2026-09-30
- **Status:** Accepted
- **Context:** The owner wants to try each feature as soon as it's built.
- **Decision:** Follow the 16 steps in `BUILD_PROMPTS.md`, using one Codex chat per step and the rules in `AGENTS.md`. The owner tests and commits each step.
- **Consequences:** After every step the app still runs and the docs are up to date.

## D-006: User details are nullable until booking
- **Date:** 2026-09-30
- **Status:** Accepted
- **Context:** README §11 lists birth details and gender on `User`, while README §5.2 allows Google-signed-in users to like and comment before they complete the booking details form.
- **Decision:** `birthDate`, `birthTime`, `birthPlace` and `gender` are nullable in the database, as `phone` already is. `googleSub`, `email` and `name` are required at sign-in.
- **Consequences:** Step 6 can create a user immediately after verified Google sign-in. Booking routes must validate and require the missing details before creating a booking.

## D-007: Use native temporal columns with a Node 24 polyfill
- **Date:** 2026-09-30
- **Status:** Accepted
- **Context:** Prisma 8 release-candidate contracts map PostgreSQL `date`, `time` and `timestamptz` to the Temporal API. Node.js 24 does not provide that API globally.
- **Decision:** Keep the native temporal contract types and load `temporal-polyfill/global` once in `backend/src/prisma/db.ts`.
- **Consequences:** The database types stay faithful to README §11, while the Prisma runtime works on the project's Node.js 24 environment. `temporal-polyfill` is a runtime dependency.

## D-008: New astrologers start listed but remain absent from Home until their profile is saved
- **Date:** 2026-09-30
- **Status:** Accepted (owner's instruction)
- **Context:** The `Astrologer.isListed` schema default is false, while README §8.2 says a saved profile appears on Home immediately. Step 3 explicitly requires owner-created accounts to start with `isListed = true`.
- **Decision:** The owner create route sets `isListed = true`. Step 4 will add the saved-profile marker, and the public Home query in Step 5 will require all three conditions: active, listed and profile saved.
- **Consequences:** Creating an account expresses the owner's intent to list it, but no unfinished profile can appear publicly. Deactivation sets `isListed = false`; reactivation does not relist the account without another owner action.

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

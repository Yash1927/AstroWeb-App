# Decisions

Choices made while building, and why. Newest entries go last. This file also records the owner's answers to the README's open questions (README §16.2).

Last updated: 2026-10-02

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
- **Decision:** The owner create route sets `isListed = true`. Step 4 adds the saved-profile marker, and the public Home query requires all three conditions: active, listed and profile saved.
- **Consequences:** Creating an account expresses the owner's intent to list it, but no unfinished profile can appear publicly. Deactivation sets `isListed = false`; reactivation does not relist the account without another owner action.

## D-009: User and astrologer cookies use the root path
- **Date:** 2026-09-30
- **Status:** Accepted (owner's instruction)
- **Context:** Later user and astrologer features use shared routes such as `/api/me` and `/api/bookings`, and authenticated call setup uses `/ws`. Cookies scoped to `/api/user` or `/api/astrologer` would not be sent to those paths.
- **Decision:** Scope the separate user and astrologer cookies to `/`. Keep the owner cookie scoped to `/api/owner` because every protected owner endpoint stays under that prefix.
- **Consequences:** Shared API routes and the WebSocket upgrade can receive the appropriate future cookie. Role-specific cookie names and server-side role checks still isolate the three account types.

## D-010: Profile tag storage limits
- **Date:** 2026-09-30
- **Status:** Accepted
- **Context:** README §8.2 allows free-form expertise and language tags but does not set storage limits or say the lists are required.
- **Decision:** Accept zero through 20 entries in each list, trim each entry, remove case-insensitive duplicates, and limit one entry to 40 characters.
- **Consequences:** Empty lists remain valid, custom labels are supported, and request sizes stay bounded. The UI explains how to add tags and suggests Vedic, Tarot and Numerology for expertise.

## D-011: Home cards use a stable alphabetical order
- **Date:** 2026-10-01
- **Status:** Accepted
- **Context:** README §5.1 defines which astrologers appear but does not define their order. Database row order is not stable.
- **Decision:** Order eligible public astrologers by display name ascending.
- **Consequences:** Refreshing Home produces a predictable list. A later ranking or availability requirement can replace this ordering explicitly.

## D-012: Google redirect continuation uses validated local button state
- **Date:** 2026-10-01
- **Status:** Accepted
- **Context:** Google Identity Services redirect mode replaces the page and posts its result to the backend. Step 6 requires History, Settings and a selected Home astrologer/call type to survive that round trip, but the README does not prescribe the storage mechanism.
- **Decision:** Put a local return route in the GIS button `state`. The backend accepts it only when it resolves to `APP_ORIGIN`; otherwise it returns to Home. Home's route contains only the astrologer id and call type and removes those query parameters after restoring the flow.
- **Consequences:** No personal details or credentials are stored in browser persistence or placed in the URL, and the callback cannot be used as an external open redirect. The selected public booking context survives the Google round trip.

## D-013: Google re-login refreshes email but preserves user-edited details
- **Date:** 2026-10-01
- **Status:** Accepted
- **Context:** The README identifies a user by Google `sub` and makes email read-only, but it does not say whether later Google claims overwrite a name the user edited in Settings.
- **Decision:** Find by `googleSub`. On first sign-in, prefill the stored name from Google. On later sign-ins, refresh the verified Google email but keep the stored name, birth details, phone number and credits.
- **Consequences:** Settings changes are not unexpectedly lost. The displayed read-only email follows the current verified Google claim.

## D-014: Date blocks take precedence over added hours
- **Date:** 2026-10-01
- **Status:** Accepted
- **Context:** README §8.3 says a date can block all or part of the weekly schedule or add extra hours, but it does not define precedence when those exception kinds meet.
- **Decision:** Build a date's base windows from its weekly hours plus `extra` ranges, merge adjacent windows, then subtract `blocked` ranges. A whole-date block must be the date's only exception, and timed exceptions on one date cannot overlap each other.
- **Consequences:** A block always removes time and can never accidentally reopen it. The editor and server reject ambiguous combinations, and the slot engine has one deterministic interpretation.

## D-015: Avatar initials ignore non-letter-leading words
- **Date:** 2026-10-01
- **Status:** Accepted (owner's instruction)
- **Context:** README §5.6 defines initials from the first and last space-separated words, but labels such as `007` are not useful initials.
- **Decision:** Before choosing the first and last words, discard any word whose first Unicode character is not a letter. Continue to use `Intl.Segmenter` for the selected characters.
- **Consequences:** `sumit 007` displays `S`, while Latin, Hindi and other letter-based names keep their existing initials behavior. A name with no letter-leading word displays `?`.

## D-016: Step 10 is STUN-only and Step 11 finishes the call room
- **Date:** 2026-10-01
- **Status:** Accepted (owner's instruction)
- **Context:** README §7.1–§7.3 describes the finished call room with a timer, two-minute notice, TURN relay and additional controls. The Step 10 request explicitly limits this build to microphone permission, Mute, Leave, STUN and the four room states, and assigns TURN and the remaining features to Step 11. The README does not select a STUN provider.
- **Decision:** Step 10 uses `stun:stun.l.google.com:19302` directly in the browser and implements perfect negotiation over the authenticated `/ws` channel. It intentionally omits the timer, two-minute notice, TURN, chat, speaker switch, earbuds handling and speaking ring until Step 11.
- **Consequences:** Basic peer-to-peer audio worked without a new account, key or environment variable during Step 10. Step 11 supersedes the STUN-only runtime by fetching STUN and short-lived TURN configuration before joining.

## D-017: TURN credentials end with the booking and relay forcing stays development-only
- **Date:** 2026-10-02
- **Status:** Accepted
- **Context:** README §7.3 requires short-lived credentials but does not choose their exact lifetime, and Step 11 requests a development flag without naming it. The call API is usable only during the stored booking window.
- **Decision:** Use the booking's `endsAt` Unix seconds as the coturn REST expiry, followed by the booking id in the username. Name the frontend flag `VITE_FORCE_RELAY`; honor it only when Vite reports a development build.
- **Consequences:** A credential naturally expires when that booking ends and remains scoped in its username. The server still rechecks participant ownership and the active window before issuing it. Developers can prove TURN works with relay-only ICE, while a production bundle cannot accidentally force all calls through the relay.

## D-018: Each subscription payment snapshots its pack size
- **Date:** 2026-10-02
- **Status:** Accepted
- **Context:** README §4 says changes to the pack price or size affect new purchases only. `Payment.amountPaise` already preserves price, but the README §11 fields did not say where to preserve the number of calls bought by an order that settles later.
- **Decision:** Add `Payment.creditsPurchased`, defaulting to zero. A `subscription_pack` Payment stores the current `Settings.subscriptionCallsPerPack`; other payment purposes store zero. Settlement adds that stored number and consumes one call for the linked booking.
- **Consequences:** An owner edit made after order creation cannot change what that purchase delivers. The schema needs one additive Step 13 migration, and payment settlement can remain idempotent without trusting current Settings or provider-supplied notes.

## D-019: Blog moderation bounds and public commenter identity
- **Date:** 2026-10-02
- **Status:** Accepted
- **Context:** README §5.4 and §16.2 question 11 define who can comment and delete, but do not define the comment rate, the size of the owner's “Recent comments” list, or how to keep avatar colours stable without exposing a user's database id.
- **Decision:** Accept five comment attempts per minute per signed-in user and IP in one backend process. Show the newest 50 comments to the owner. Public comments contain the first name and a SHA-256-derived avatar key, not the user id or full name.
- **Consequences:** Normal conversation remains easy while simple bursts are throttled. A multi-instance deployment needs a shared limiter in Step 16. The owner list is bounded, and one commenter keeps a stable avatar colour without exposing a profile identifier.

# Step 5: Home page

- **Status:** Done
- **Spec:** README §2, §5.1, §5.6, §6.1 step 2 and §10.4
- **Started:** 2026-10-01
- **Finished:** 2026-10-01

## Goal

Replace the Home placeholder with a public, privacy-limited astrologer list and the first call-type picker. Reuse the exact `AstrologerCard` from Step 4 while keeping login, slots and booking behavior out of this step.

## Plan

- **Screens and UI:** Add an AstroWebApp header, responsive one/two/three-column card grid, skeleton cards, the specified empty state, first-six staggered entry motion, and a call-type BottomSheet backed by public settings. Selecting a call type closes the sheet and shows the specified later-step toast.
- **API:** Add public `GET /api/astrologers`, returning only id, display name, expertise, languages and experience for active, listed, profile-saved accounts. Validate its empty params, query and body with Zod, order cards predictably, and test the privacy boundary.
- **Database:** No contract or migration. Read the existing `Astrologer` and `Settings` rows.
- **Real-time:** No changes.
- **New libraries:** None.

## Edge cases

- Accounts that are inactive, hidden or have never saved a profile never pass the database filter.
- The public response never selects or returns email, password/session data, listing flags or timestamps.
- An empty eligible list shows exactly: “No astrologers are available right now. Please check again later.”
- Card and settings requests fail independently: card failure has a retry action; unavailable settings do not hide otherwise-public cards and the sheet offers a retry.
- A zero Normal price is shown as “Free”; non-zero prices use rupees derived from integer paise. Subscription shows the current pack size and per-call duration.
- Only the first six rendered cards receive staggered delays. Reduced-motion rules continue to collapse the animation.
- At Step 5 completion, choosing a call type did not check login or create booking state. Step 6 now continues through login and details but still creates no booking.

## Test plan

- **Automated:** Verify the public HTTP response and invalid-input/service-error handling. Verify Home loading, card rendering, empty state, call-sheet values and later-step toast. Run backend tests/type-check and frontend tests/lint/build.
- **Manual:** Run the Step 5 “Try it out” flow in `BUILD_PROMPTS.md`, including eligible/ineligible owner states, current settings, phone and wide layouts, and browsing without login.

## As built

- Public `GET /api/astrologers` selects only active, listed, profile-saved records and only the five `AstrologerCard` fields. The route applies a second field whitelist before serialization, validates empty request input, needs no session, and returns a generic `503` on failure.
- Eligible cards are ordered by display name for a stable public list. No email, account flags, password/session data or timestamps reach the response.
- `/` now shows an AstroWebApp header, three skeleton cards while loading, the specified empty text, a retry state, and the shared Step 4 `AstrologerCard` in a one/two/three-column responsive grid.
- The first six cards use 40ms staggered `fade-up` delays; later cards do not animate individually. The shared reduced-motion rule collapses these animations.
- **Call** opens the existing portaled BottomSheet for the selected astrologer. Normal, Urgent and Subscription show current Settings prices, duration, pack size where relevant, and the README call-mode description.
- Step 6 replaced the temporary selection toast, Step 7 added the real date/time picker, Step 8 added free confirmation, Step 12 added Razorpay Checkout and Urgent phone-call success, and Step 13 added Subscription credits and packs.
- Astrologer cards and settings load independently. Browsing and opening Home never requires authentication.
- No database, session, real-time, dependency or environment change was needed.

## How to try it

1. Start the backend and frontend, then open `/` in a logged-out or private browser window.
2. Confirm only active, owner-shown astrologers who saved a profile appear. Hide, deactivate or create an unsaved account in `/owner`, refresh Home, and confirm it is absent.
3. Confirm each card shows only initials, display name, expertise, languages, experience and **Call**. There is no email or profile link.
4. Choose **Call** and compare all three prices, durations and subscription pack size with `/owner` pricing settings.
5. Choose Normal and follow the current sign-in/details/date/time flow through the Step 8 summary and success screen.
6. Temporarily make every saved profile hidden and confirm the exact empty message appears.
7. Check at 360px that cards use one column. Check wider layouts for two and then three columns, the first-six stagger, keyboard focus and reduced motion.

## Follow-ups and known issues

- Step 6 added user login and details while Home browsing remained public.
- Steps 7, 8, 12 and 13 now carry Home through slots, free or paid confirmation, and all three call types.

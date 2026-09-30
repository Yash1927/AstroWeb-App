# Build prompts

Build the app from [README.md](README.md) one step at a time, using Codex in VS Code. Each step ends with something you can open and try before moving on. Do the steps **in order**, because each one builds on the ones before it.

## Set up Codex in VS Code (once)

1. In VS Code, open **Extensions** (Ctrl+Shift+X), search for **Codex** (published by OpenAI) and install it.
2. Open this project with **File → Open Folder** and choose the `astrowebapp` folder. Codex works inside the open folder and loads [AGENTS.md](AGENTS.md) automatically. That file holds the rules for every step, including keeping `docs/` up to date.
3. Open Codex from its icon in the sidebar. If you can't see the icon, run **Codex: Open Codex Sidebar** from the Command Palette (Ctrl+Shift+P). Sign in with your ChatGPT account.
4. Pick a mode:
   - **Agent** (use this one): Codex edits files and runs commands inside the project folder. It asks you first before going online (e.g. for `npm install`) or touching anything outside the folder.
   - **Agent (Full Access)**: don't use it.
   - **Chat**: for when you only want to ask questions or plan.
5. On Windows, Codex runs its commands inside a Windows sandbox. If it asks to set the sandbox up (a one-time administrator approval), accept.

## For each step

1. Start a **new chat** in the Codex panel, so each step begins with a clean context. A new chat also forgets earlier approvals, so Codex will ask again before commands like `npm install`.
2. Copy the step's prompt from its box below, paste it and send.
3. Codex writes its plan to `docs/features/` first. For the big steps (10, 11 and 12), you can add "Write the plan only, then wait for me." to the prompt, read the plan, and then reply "go".
4. Approve commands that fit the step, such as installing packages, running tests or type checks. Decline anything unrelated.
5. When Codex finishes, read its report. Review the changes in VS Code's **Source Control** view (Ctrl+Shift+G), which lists every changed file, including the updated docs.
6. Start the dev servers yourself in VS Code terminals (**Terminal → New Terminal**), then work through the step's **Try it out** list.
7. If something is wrong, describe it in the same chat (see [If something doesn't work](#if-something-doesnt-work)).
8. When everything works, commit in Source Control with a message like "Step 3: owner panel". Then start the next step in a new chat.

If you answer one of the README's open questions (§16.2) differently from its default, update the spec first with the [decision prompt](#if-you-change-a-decision). Codex builds whatever the README says.

## Before you start

| You need | From step | Notes |
|---|---|---|
| The Codex extension in VS Code, signed in | 1 | See [Set up Codex in VS Code](#set-up-codex-in-vs-code-once) |
| Node.js 24 | 1 | Already installed on this machine |
| A Neon account and project | 2 | You'll copy its pooled and direct connection strings |
| A Google Cloud OAuth client (Web application) | 6 | Setup is in Step 6 |
| Two Google accounts and two browser windows (e.g. a normal window and an incognito window) | 6 | One acts as the user; the other as a second user or the astrologer |
| A microphone and headphones | 10 | Headphones stop echo when both sides of a call are on one computer |
| An HTTPS tunnel, e.g. Cloudflare Tunnel or ngrok | 11 | See [Testing on your phone](#testing-on-your-phone) |
| A TURN server or a managed TURN service | 11 | README §13, setup step 4 |
| A Razorpay account in test mode | 12 | Test keys start with `rzp_test_` |

### Testing on your phone

Phones only allow the microphone and app install on HTTPS pages, and Razorpay webhooks need a public address. So from Step 11 onwards, run a tunnel (e.g. Cloudflare Tunnel or ngrok) pointing at `http://localhost:5173`, then paste this into Codex:

```text
I'm testing through an HTTPS tunnel at https://<my-tunnel-address>. Set the project up for it: APP_ORIGIN, Vite's allowed hosts, and anything else the app needs. Tell me what to add to my Google OAuth client and my Razorpay webhook settings. Don't change any features.
```

## Steps at a glance

| # | Step | What you'll be able to try |
|---|---|---|
| 1 | Foundation, design.css, app shell | The yellow app with its four tabs, plus a preview page with every component and animation |
| 2 | Database and seed | Tables in Neon, default prices, the owner account |
| 3 | Owner panel | Log in as the owner, add astrologers, edit prices |
| 4 | Astrologer login and profile | Log in as an astrologer, fill in the profile, preview the card |
| 5 | Home page | Astrologer cards on Home and the call-type picker |
| 6 | Google login, details form, Settings | Sign in, enter birth details, edit them later |
| 7 | Availability and time slots | Set hours as an astrologer and see the free times as a user |
| 8 | Booking free Normal calls | Book a call and watch double booking get blocked |
| 9 | History and astrologer bookings | Your calls, with the right button at the right time |
| 10 | In-app call, part 1 | Talk between two browsers; waiting screens; mute |
| 11 | In-app call, part 2 | Chat, timer, speaker, earbuds, calls over mobile data |
| 12 | Urgent calls with Razorpay | Pay in test mode; phone-call bookings with no Join button |
| 13 | Subscription packs | Buy 4 calls, then spend the credits |
| 14 | Blogs | Write, publish, like and comment |
| 15 | Install as an app, policy pages | The app icon on your phone, the offline screen, the legal pages |
| 16 | Security review and launch checklist | A pass/fix report against README §12 and §18, and a docs check |

## Rules and docs

The rules for every step are in [AGENTS.md](AGENTS.md), which Codex loads automatically in every chat, so the prompts below don't repeat them. They cover:
- building only what the step asks
- security
- styling with `design.css`
- the step workflow
- keeping the docs up to date
- how Codex reports back

The docs Codex maintains are in [docs/](docs/README.md):
- a design doc for every step (plan, then what was built)
- architecture
- design system
- API
- database
- setup
- testing
- security status
- decisions
- a changelog
- a progress tracker
- a plain-language guide for the owner and astrologers

---

## Step 1 — Foundation, design.css and app shell

**Needs:** nothing.

```text
Build Step 1: foundation, design.css and the app shell. Follow AGENTS.md (rules, step workflow and docs). README.md is the spec.

Read first: README §1, §3, §10, §13 (setup step 5) and §14.

Backend
- Fix these README §14 items: mount the routers under /api; add app.listen (PORT from env, default 3000); restrict CORS to APP_ORIGIN with credentials; fix the `client`/`db` import in routes/User.ts; remove the empty stub handlers (later steps add the real routes). Leave src/realtime/ alone, because Step 10 rewrites it.
- Add `dev` (tsx watch) and `typecheck` scripts.
- Add GET /api/health returning { ok: true }.
- Rewrite backend/.env.example with every variable in README §13 (placeholders only).

Frontend
- Remove the Vite starter content: the demo App.tsx, App.css, index.css and the unused starter assets.
- Create frontend/src/design.css exactly as README §10 describes. It holds the tokens (§10.2); base styles (page background, Nunito via @fontsource/nunito, rem sizes, focus ring, 48px tap targets); a class for every component in §10.3; and all the keyframes plus the reduced-motion rule (§10.4). Import it once in main.tsx.
- Build shared components for later steps: Button, Card, Avatar (initials, colours and sizes exactly as README §5.6), BottomSheet, Dialog, Toast, Skeleton, StatusBadge.
- Add React Router with the user-app routes from README §3. Home, History, Blogs and Settings are placeholder screens for now. Add the bottom tab bar: four tabs, with the active tab in gold. /astrologer and /owner say "Coming in a later step".
- Screens appear with the fade-up animation.
- index.html: lang="en", title "AstroWebApp", theme-color #FFFBEB.
- Vite dev proxy: send /api and /ws to the backend.
- Development only: a /_design page showing every component, colour token and animation from README §10. Include buttons, cards, chips, bottom sheet, dialog, toast, skeleton, breathing circle, speaking ring, heart pop, checkmark and soft glow, plus avatars for several names including one in Hindi. It must not exist in production builds.

Don't build yet: the database, logins or any real data.
```

**Try it out**
1. In one terminal: `cd backend`, `npm install`, `npm run dev`. It should say it's listening.
2. In a second terminal: `cd frontend`, `npm install`, `npm run dev`. Then open http://localhost:5173.
3. You see the light-yellow app with four tabs at the bottom. Switching tabs fades each screen in.
4. Open http://localhost:5173/api/health. It shows `{"ok":true}`, so the frontend can reach the backend.
5. Open http://localhost:5173/_design and look at every component and animation. Then, in Chrome DevTools, open the Rendering panel (⋮ → More tools → Rendering) and set `prefers-reduced-motion` to `reduce`. The animations stop.
6. Switch on the DevTools device toolbar and pick a phone size. Nothing should overflow sideways.

## Step 2 — Database and seed

**Needs:** Step 1, plus a Neon project. In `backend/.env`:
- set `DATABASE_URL` to the **pooled** connection string and `DIRECT_DATABASE_URL` to the **direct** one
- set `OWNER_EMAIL`, and `OWNER_PASSWORD` (at least 10 characters)

```text
Build Step 2: the database schema on Neon and the seed script. Follow AGENTS.md (rules, step workflow and docs). README.md is the spec.

Read first: README §4, §11, §13 (setup step 1), §14 (the schema and package.json rows) and §17 (Database).

- Rewrite backend/src/prisma/contract.prisma with every table in README §11: camelCase names, money as whole paise, times as timestamptz, the listed enums, unique constraints, relations and defaults. Replace the old Astro, User and Blogs models; the database holds no real data yet.
- Point prisma.config.ts at DIRECT_DATABASE_URL. src/prisma/db.ts keeps using DATABASE_URL (pooled).
- Create and apply the migration to Neon with the Prisma 8 CLI. Prisma 8 is a release candidate, so check its current docs for the exact commands, and add npm scripts for them.
- Add the btree_gist extension and the Booking_no_overlap constraint from README §11. Use a SQL migration if the contract can't express them.
- Add an `npm run seed` script. It creates the owner account from OWNER_EMAIL / OWNER_PASSWORD (argon2id hash) and the single Settings row with the README §4 defaults. Running it again must change nothing.
- Add GET /api/health/db (runs a trivial query) and GET /api/settings/public (returns the current prices, pack size and durations, and nothing else).
- Tell me the exact commands to run the migration and the seed.

Don't build yet: logins, panels or UI.
```

**Try it out**
1. Run the migration and seed commands Codex gives you. Run the seed twice; the second run should change nothing.
2. In the Neon console, open **Tables**. Every table from README §11 is there.
3. `Settings` has one row: 0 / 30000 / 99900 / 4 / 15 / 15 / 15. `Owner` has one row, and its password column holds a long hash, not your password.
4. http://localhost:5173/api/health/db shows ok, and http://localhost:5173/api/settings/public shows the prices.
5. Ask Codex for an SQL snippet that inserts two overlapping bookings for one astrologer, and run it in Neon's SQL editor. The second insert must fail.

## Step 3 — Owner panel

**Needs:** Step 2.

```text
Build Step 3: the owner panel. Follow AGENTS.md (rules, step workflow and docs). README.md is the spec.

Read first: README §2, §3, §4, §9, §10 and §12 (Accounts and sessions; Access control).

- Build the session system that later steps reuse:
  - server-side sessions in the Session table
  - httpOnly cookies (Secure in production, SameSite=Lax), with a separate cookie for each panel
  - a 12-hour lifetime for the owner
  - logout that deletes the session
  - a requireOwner middleware
- Owner login and logout. Check the password against its argon2id hash. Limit logins to 5 tries per 15 minutes per email + IP. Give the same error for a wrong email and a wrong password.
- Owner UI at /owner: a login screen, then two sections, "Astrologers" and "Pricing & call settings".
- Astrologers, as README §9 lists:
  - list them all
  - add one: name, email, temporary password of at least 10 characters (mustChangePassword = true). Set isListed = true on create: README §8.2 says the card appears on Home once the astrologer saves their profile, and the schema default is false. Step 4 keeps astrologers who haven't saved a profile off Home. Record this in docs/DECISIONS.md.
  - view a full profile
  - edit name and email
  - hide from Home / show again (isListed)
  - deactivate / reactivate (isActive)
  - reset the password to a new temporary one (mustChangePassword = true)
- Pricing & call settings: every value in README §4. Show prices in rupees and store them in paise. Each call type's duration is a choice of 10, 15 or 30 minutes. Show "Changes apply to new bookings only." Validate on the server.
- Every /api/owner/* route requires the owner session.

Don't build yet: astrologer login, or anything in the user app.
```

**Try it out**
1. Open http://localhost:5173/owner and log in with your `OWNER_EMAIL` and `OWNER_PASSWORD`.
2. Get the password wrong 6 times: you're blocked for a while. Ask Codex how to clear the block if you don't want to wait.
3. Add an astrologer and write down the temporary password.
4. Try hide/show, deactivate/reactivate and reset password. The list updates each time.
5. Change the Urgent price to ₹350. http://localhost:5173/api/settings/public now shows `35000`. Change it back.
6. Log out. /owner asks you to log in again, and http://localhost:5173/api/owner/astrologers returns 401.

## Step 4 — Astrologer login and profile with preview

**Needs:** Step 3, plus an astrologer account created in the owner panel.

```text
Build Step 4: astrologer login and the profile with preview. Follow AGENTS.md (rules, step workflow and docs). README.md is the spec.

Read first: README §2, §5.1 (what a Home card shows), §5.6, §8.1, §8.2, §9 and §12.

- Astrologer login and logout at /astrologer: email + password, its own session cookie (12 hours), and the same rate limit as the owner. Deactivated astrologers can't log in.
- Cookie paths: in backend/src/auth/session.ts, change the astrologer and user cookie paths from /api/astrologer and /api/user to "/". Later steps put their routes outside those paths (e.g. /api/me, /api/bookings) and the call WebSocket at /ws, so path-scoped cookies would never be sent there. The owner cookie can stay at /api/owner. Record this in docs/DECISIONS.md.
- When the owner deactivates an astrologer or resets their password, delete that astrologer's existing sessions, so the change takes effect immediately.
- If mustChangePassword is true, show "Set a new password" (at least 10 characters) before anything else.
- Panel layout: Profile, Availability, Bookings and Blogs in the navigation, plus Log out. For now, Availability, Bookings and Blogs say "Coming in a later step".
- Profile form:
  - display name
  - expertise: tags, suggesting Vedic, Tarot and Numerology but allowing others to be typed
  - languages: tags
  - years of experience: 0–60
- Build AstrologerCard, the component Home will use: a 56px initials avatar, name, expertise, languages, experience, and a large Call button.
- A Preview button shows AstrologerCard with the unsaved form data inside a phone-width frame. The Call button in the preview does nothing.
- Save stores the profile. Record when the profile was first saved (add a nullable timestamp to Astrologer). Home will only list astrologers who are active, listed and have saved their profile.
- The owner's "view full profile" now shows these fields too.

Don't build yet: availability, bookings or blogs.
```

**Try it out**
1. Open http://localhost:5173/astrologer and log in with the temporary password. You're asked to set a new one.
2. Fill in the profile, tap **Preview**, and check the card. Then tap **Save**.
3. Log out and log back in with the new password. Your profile is still there.
4. As the owner, open that astrologer's full profile: the new fields appear.
5. As the owner, deactivate the astrologer, then try to log in as them. It's refused. Reactivate them.

## Step 5 — Home page

**Needs:** Step 4, with at least one saved astrologer profile.

```text
Build Step 5: the Home page. Follow AGENTS.md (rules, step workflow and docs). README.md is the spec.

Read first: README §2, §5.1, §5.6, §6.1 (step 2) and §10.4.

- GET /api/astrologers (public). It returns only astrologers who are active, listed and have saved their profile, and only the card fields: never emails or other private fields.
- Home screen:
  - the app name in the header
  - a list of AstrologerCard, the same component as the Step 4 preview
  - one column on phones, 2–3 columns on wide screens
  - skeleton cards while loading
  - the empty-state text from README §5.1
  - cards fade up in turn (first 6 only)
- Call opens a bottom sheet with Normal, Urgent and Subscription. Each option shows its price, duration and the one-line description from README §6.1 step 2, using values from /api/settings/public. For now, picking an option shows a toast: "Booking comes in a later step".
- Browsing Home needs no login.

Don't build yet: login, slots or booking.
```

**Try it out**
1. Open http://localhost:5173. Your astrologer's card is there, and the avatar colour stays the same after a reload.
2. Hide the astrologer in the owner panel and reload Home: the card is gone. Show it again.
3. In DevTools → Network, set throttling to a slow connection and reload. You see skeleton cards, not a spinner.
4. Tap **Call**. The sheet shows Free, ₹300, and ₹999 for 4 calls. Change a price in the owner panel and reopen the sheet: the new price shows.
5. Open http://localhost:5173/api/astrologers and check there are no emails in it.

## Step 6 — Google login, details form and Settings

**Needs:** Step 5, plus a Google OAuth client:
1. In Google Cloud Console, create an OAuth client of type **Web application**. You may have to set up the consent screen first.
2. Under **Authorized JavaScript origins**, add `http://localhost:5173`.
3. Under **Authorized redirect URIs**, add `http://localhost:5173/api/auth/google`.
4. Put the client ID in `GOOGLE_CLIENT_ID` (in `backend/.env`) and in `VITE_GOOGLE_CLIENT_ID` (in `frontend/.env`).

```text
Build Step 6: Continue with Google, the details form and Settings. Follow AGENTS.md (rules, step workflow and docs). README.md is the spec.

Read first: README §2, §5.2, §5.5, §5.6, §12 (Accounts and sessions) and §17 (Google sign-in).

- "Continue with Google" using Google Identity Services in redirect mode (ux_mode "redirect", login_uri = /api/auth/google), as README §17 recommends. The endpoint:
  - checks the g_csrf_token cookie against the value in the body
  - verifies the ID token with google-auth-library's verifyIdToken (aud = GOOGLE_CLIENT_ID, iss, exp)
  - requires email_verified
  - finds or creates the User by googleSub
  User sessions last 30 days, in their own cookie with path "/" (so it reaches /api/me, /api/bookings and /ws). After sign-in, return the user to where they were; keep the chosen astrologer and call type across the Google redirect.
- History and Settings show a "Continue with Google" screen when signed out.
- Continue the Home booking flow from the call-type sheet:
  - signed out → sign in
  - details missing → the details form
  - Urgent or Subscription chosen with no saved phone number → ask for the number (one field)
  - then a placeholder: "Choosing a time comes in the next step"
- Details form: the fields and validation in the README §5.2 table, enforced on the server too. Include the privacy line and a link to /privacy (a placeholder page until Step 15).
- GET and PUT /api/me: a user can read and update only their own details.
- Settings, as README §5.5: avatar, name, read-only email, the editable details with a "Saved" toast, links to the policy pages (placeholders until Step 15), and Log out. The "can't remove your phone number" rule comes in Step 12.

Don't build yet: time slots or booking.
```

**Try it out**
1. Tap **Call → Normal**, then **Continue with Google**, and sign in. The details form appears with your name filled in. Fill it in, and you reach the placeholder.
2. Tap **Call → Urgent**. If you left the phone number empty, you're asked for it. `12345` gives an error; a real number is saved.
3. In **Settings**, change the place of birth, save, and reload. The change stuck. The email can't be edited.
4. Log out. History now asks you to sign in. Sign in again: this time there's no details form.
5. In DevTools → Application → Cookies, the session cookie is marked HttpOnly.

## Step 7 — Availability and time slots

**Needs:** Step 6.

```text
Build Step 7: astrologer availability and the slot picker. Follow AGENTS.md (rules, step workflow and docs). README.md is the spec.

Read first: README §4 (durations), §6.1 (step 4), §6.2 (the Urgent-vs-Normal rule), §6.3 and §8.3.

- Availability page in the astrologer panel (README §8.3):
  - weekly hours: one or more time ranges per day, or a day off
  - date exceptions: block all or part of a date, or add extra hours on a date
  - validation: end after start, and no overlapping ranges on the same day
- One server-side slot function. Input: astrologer, call type and date range. Output: free slots. It follows README §6.3:
  - uses that call type's duration from Settings
  - cuts slots from each window in steps of the duration
  - leaves out past slots, and slots overlapping a confirmed booking or an unexpired pending_payment hold
  - applies the Urgent-vs-Normal rule from README §6.2: Normal starts tomorrow (IST); Urgent and Subscription include today
  - stores UTC and shows IST
- GET /api/astrologers/:id/slots?type=normal|urgent|subscription, covering the next 14 days.
- In the booking flow, after login and details:
  - date chips for the next 14 days, with days that have no slots disabled
  - time chips for the chosen day
  - the empty-day message from README §6.1
  - picking a time shows a placeholder: "Confirming comes in the next step"
- Vitest tests for the slot function: windows, exceptions, 10/15/30-minute durations, past slots, overlapping bookings and holds, the Normal-from-tomorrow rule, and IST↔UTC conversion.

Don't build yet: creating bookings.
```

**Try it out**
1. As the astrologer, set Mon–Fri 10:00–12:00, block next Wednesday, and add extra hours next Saturday, 16:00–17:00.
2. As a user, tap **Call → Normal**:
   - today isn't offered
   - next Wednesday has no times
   - next Saturday shows 4:00, 4:15, 4:30 and 4:45 PM
3. Tap **Call → Urgent**. Today's remaining times appear, if any are left today.
4. As the owner, change the Normal duration to 30 minutes. Normal times on a weekday become 10:00, 10:30, 11:00 and 11:30 AM.
5. Run the tests in `backend`. They pass.

## Step 8 — Booking free Normal calls

**Needs:** Step 7.

```text
Build Step 8: booking a free Normal call. Follow AGENTS.md (rules, step workflow and docs). README.md is the spec.

Read first: README §4 (rules), §6.1 (steps 5–7), §6.2 (Normal and the free-call limit), §6.3 (no double booking), §6.4 (step 1) and §11 (Booking and the constraint).

- POST /api/bookings with astrologerId, callType and startsAt.
  - The server checks that the user is signed in with complete details, the astrologer is active and listed, and the time is a free slot from the Step 7 slot function.
  - Duration and price come from Settings.
  - In one transaction, it marks that astrologer's expired holds as expired, then inserts the booking.
- A price of ₹0 means the booking is confirmed straight away. A Normal booking gets callMode in_app and pricePaise 0. Build this rule for any call type, as README §4 says. For now, a call type priced above ₹0 returns a clear "Paid bookings come in a later step".
- If the database constraint rejects an overlap, return 409 and show "Sorry, this time was just booked. Please pick another time."
- Free-call limit: one upcoming Normal booking per user, with a friendly message.
- The summary screen (README §6.1 step 5), then the success screen with the scale-in and check-draw animation (step 7). "Go to History" leads to /history.
- A Vitest test that sends two bookings for the same slot at once: exactly one succeeds.

Don't build yet: History content, payments or the call room.
```

**Try it out**
1. Book a Normal call. The summary says Free and shows the date, time and duration. **Confirm booking** shows the success animation.
2. Try to book a second Normal call. You get the one-upcoming-Normal-call message.
3. In another browser window, signed in with your other Google account, open the same astrologer and date. The time you booked is gone.
4. Run the tests in `backend`. The double-booking test passes.
5. In Neon, the `Booking` row has status `confirmed`, callMode `in_app` and pricePaise `0`.

## Step 9 — History and astrologer bookings

**Needs:** Step 8.

```text
Build Step 9: the user's History and the astrologer's Bookings. Follow AGENTS.md (rules, step workflow and docs). README.md is the spec.

Read first: README §2, §5.3, §7.1 (Completed/Missed), §8.4 and §12 (Access control).

- GET /api/me/bookings returns only the signed-in user's bookings, split into Upcoming (soonest first) and Past (newest first). Cards show what README §5.3 lists, with status badges.
- Normal-call buttons follow the README §5.3 table:
  - before the start time: Join (secondary)
  - once started: Join now (primary, soft-glow)
  - after the end time: no button, and a Completed or Missed status worked out as README §7.1 describes
  Buttons change on their own as time passes; no refresh needed.
- Join and Join now open /call/:bookingId. The room itself is built in Step 10. For now, it shows "Please wait. Your call will start at {time}." before the start time, and "Coming in the next step" after it.
- Astrologer Bookings page (README §8.4): Upcoming and Past, the same Join rules, and the user's name, date/time/place of birth, gender and phone number (when there is one). Never the user's email.
- Vitest access tests: user A can't read user B's booking; an astrologer can't read another astrologer's bookings or those users' details.
- Development only: an `npm run dev:make-booking` script. It creates a confirmed Normal booking for a given user email and astrologer email, starting N minutes from now, with a given duration. It refuses to run in production.

Don't build yet: the call room itself, phone-call cards (Step 12) or subscription credits (Step 13).
```

**Try it out**
1. As the user, open **History**. Your booking is under Upcoming with a **Join** button.
2. Tap **Join** before the start time: you see "Please wait. Your call will start at …".
3. Use `npm run dev:make-booking` (Codex will show you how) to make a booking that starts in 2 minutes and lasts 5. Without reloading, the card switches to **Join now** at the start time. At the end time the button goes and the call is marked Missed, since nobody joined.
4. As the astrologer, open **Bookings**. You see the user's birth details and phone number, but not their email.
5. Run the tests in `backend`. The access tests pass.

## Step 10 — In-app call, part 1: room states and audio

**Needs:** Step 9, plus a microphone, headphones and two browser windows. For example: a normal Chrome window signed in as the user, and an incognito window logged into the astrologer panel.

```text
Build Step 10: the in-app call room, with its states and audio. Follow AGENTS.md (rules, step workflow and docs). README.md is the spec.

Read first: README §1 (hosting), §7.1, §7.2 (Mute, Leave call and microphone permission only), §7.3, §10.4 (breathe), §12 (the WebSocket item) and §14 (the realtime rows).

- Rewrite backend/src/realtime:
  - attach the WebSocket server to the main HTTP server at /ws, with no separate port
  - on upgrade, authenticate from the user or astrologer session cookie, and check that Origin equals APP_ORIGIN
  - key rooms by booking id; only that booking's user and astrologer may join, only for in_app bookings, and only between startsAt and endsAt
  - validate every message with zod and limit message size
- Message types: join, leave, presence, offer, answer, ICE candidate, mute state.
- Record userJoinedAt and astrologerJoinedAt on first join. After the end time, set Completed or Missed (README §7.1).
- Call room at /call/:bookingId (user) and /astrologer/call/:bookingId (astrologer). It shows exactly the four states in README §7.1 and switches between them on its own. Waiting states show the breathing circle. Announce state changes with aria-live.
- WebRTC audio with the getUserMedia constraints in README §7.3. Use STUN only for now; TURN comes in Step 11. Use the "perfect negotiation" pattern so rejoining and simultaneous joins work.
- Controls in this step:
  - Mute/Unmute: the other side sees a muted icon on your avatar
  - Leave call
  - ask for the microphone when the person taps Join; if they deny it, show how to allow it and a Try again button
- Either person can leave and rejoin until the end time.

Don't build yet: chat, the speaker switch, earbuds handling, the speaking ring, the timer or TURN.
```

**Try it out**
1. Use `npm run dev:make-booking` to make a booking that starts in 3 minutes and lasts 10.
2. In window A (the user), go to **History → Join**. You see "Please wait…" with the breathing circle.
3. At the start time, window A switches to "Waiting for {astrologer} to join…" on its own.
4. In window B (the astrologer), go to **Bookings → Join now**. Both sides connect, and with headphones on you hear each other.
5. Mute in A: B shows the muted icon. Unmute.
6. Leave in B: A goes back to waiting. Rejoin in B: you're connected again.
7. Block the microphone in the browser's site settings and tap Join. You see help text and a **Try again** button.
8. After the end time you see "This call has ended.", and History shows Completed. A booking where only one person joined shows Missed.
9. Change the booking id in the address bar to someone else's booking. You're refused.

## Step 11 — In-app call, part 2: chat, timer, speaker, earbuds and TURN

**Needs:** Step 10; a TURN server or service, with `TURN_URLS` and `TURN_SECRET` set; the tunnel from [Testing on your phone](#testing-on-your-phone).

```text
Build Step 11: the rest of the in-app call. Follow AGENTS.md (rules, step workflow and docs). README.md is the spec.

Read first: README §7.1 (timer and end of call), §7.2 (all controls), §7.3 (TURN), §10.4 and §17 (In-app calls).

- A timer showing the time left. At 2 minutes left, a gentle "2 minutes left" notice. At the end time, the server closes the room and the call ends for both people.
- Chat panel:
  - text messages over the room's WebSocket, up to 500 characters
  - not saved anywhere
  - new messages fade up and are announced with aria-live
  - rate-limited to about 1 message per second
- Speaker: show the button only when HTMLMediaElement.prototype.setSinkId exists; it switches between the available audio outputs. Hide it everywhere else (e.g. Chrome on Android).
- Earbuds: on the devicechange event, get the new default microphone, swap it into the call with RTCRtpSender.replaceTrack, and show the toast "Audio device changed."
- Speaking indicator: an AnalyserNode on each stream drives the speak-ring animation on the avatar of whoever is talking.
- TURN: GET /api/calls/:bookingId/ice-servers returns STUN plus TURN, with short-lived credentials made from TURN_SECRET (coturn REST-API style: username = "<expiry>:<bookingId>", credential = base64 HMAC-SHA1 of the username). Only the booking's two participants can fetch it.
- Development only: a flag that forces relay-only ICE (iceTransportPolicy "relay"), so I can check that TURN works.
```

**Try it out**
1. Make a booking that starts now and join from both sides.
2. Chat in both directions. After the call ends, the messages are gone.
3. The timer counts down. At 2 minutes you see the notice, and at 0 the call ends for both sides.
4. On desktop Chrome, the **Speaker** button appears and switches the output. On Android Chrome, it's hidden.
5. On your phone (through the tunnel), plug in or connect earbuds mid-call. You see the toast, the sound moves to the earbuds, and the other side still hears you.
6. Turn on the force-relay flag and call again. It still connects, which proves TURN works. Also try the phone on mobile data (Wi-Fi off) while the laptop is on Wi-Fi.
7. A ring pulses around whoever is talking. With `prefers-reduced-motion` set to `reduce`, it doesn't animate.

## Step 12 — Urgent calls with Razorpay (phone calls)

**Needs:** Step 9, plus:
- Razorpay test keys in `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
- for webhooks, the tunnel from [Testing on your phone](#testing-on-your-phone), and a webhook in the Razorpay dashboard (test mode):
  - URL: `https://<tunnel-address>/api/razorpay/webhook`
  - events: `payment.captured`, `payment.failed` and `order.paid`
  - put its secret in `RAZORPAY_WEBHOOK_SECRET`

```text
Build Step 12: Urgent bookings, paid with Razorpay and delivered as phone calls. Follow AGENTS.md (rules, step workflow and docs). README.md is the spec.

Read first: README §4, §5.2 (phone number), §5.3 (phone-call cards), §5.5 (phone removal rule), §6.1, §6.2, §6.4 (all of it), §8.4, §11 (Payment and WebhookEvent), §12 (Payments) and §17 (Razorpay).

- Build README §6.4 exactly, for any call type priced above ₹0 (this step turns on Urgent):
  - the 10-minute pending_payment hold
  - the order created on the server with the official razorpay Node SDK, with the amount from Settings
  - Checkout with the name, email and phone pre-filled
  - POST /api/payments/verify: HMAC check with crypto.timingSafeEqual, check the order belongs to this user and booking, then confirm and record the payment in one transaction
  - the webhook: raw body (express.raw mounted before express.json), signature check, de-duplication by x-razorpay-event-id, idempotent confirmation
  - an automatic refund for a late payment whose slot is gone
  - the user-facing messages in §6.4
- Urgent bookings get callMode phone and need a valid phone number (checked on the server too).
- Summary screen: "{Astrologer name} will call you on {number} at {time}", with a way to change the number (which updates the profile).
- The phone version of the success screen (README §6.1 step 7).
- History phone-call cards (README §5.3): never a Join button; show the "will call you" message and "Wrong number? Update it in Settings."
- Astrologer Bookings (README §8.4): phone bookings show "Phone call · {date} · {time}" and the number as a tel: link, with no Join button.
- Settings: block removing the phone number while an upcoming phone call exists (README §5.5).
- Vitest tests, with Razorpay mocked:
  - a valid signature is accepted and a forged one rejected
  - a replayed webhook changes nothing
  - a price sent by the browser is ignored
  - verify + webhook together confirm only once
  - a late payment for a taken slot triggers a refund

Don't build yet: subscription packs.
```

**Try it out** (Razorpay test mode; test payment details are on [Razorpay's test card and UPI page](https://razorpay.com/docs/payment-gateway/test-card-upi-details))
1. Tap **Call → Urgent** and pick a time. The summary shows ₹300 and "{Astrologer} will call you on … at …". Tap **Pay ₹300**, choose UPI and enter `success@razorpay`. You see the phone version of the success screen.
2. In **History**, the booking shows the phone message and never a Join button, even at the call time.
3. In the astrologer's **Bookings**, it shows "Phone call" with a tap-to-call number.
4. Start another booking and close the checkout window before paying. You see "Payment was not completed…". The time becomes free again after 10 minutes.
5. Pay with `failure@razorpay`. You see the failure message.
6. In the Razorpay dashboard (test mode) → Webhooks, the deliveries succeeded. Resend one: nothing changes in the app.
7. In **Settings**, try to clear your phone number. It's blocked.
8. As the owner, set Urgent to ₹350. The next checkout charges ₹350, and the earlier booking still shows ₹300.

## Step 13 — Subscription packs

**Needs:** Step 12.

```text
Build Step 13: subscription packs and credits. Follow AGENTS.md (rules, step workflow and docs). README.md is the spec.

Read first: README §4, §5.3 (calls left), §6.1 (steps 2 and 5–7), §6.2 (Subscription) and §11 (User.subscriptionCredits; Payment purpose subscription_pack).

- The call-type sheet shows "₹999 for 4 calls", or "N calls left" when the user has credits. The values come from Settings and the user.
- With credits: the booking is confirmed straight away using 1 credit (usedCredit true), in a transaction that can never take credits below 0.
- With 0 credits: the user pays the pack price through the Step 12 payment flow (purpose subscription_pack). After verification, in one transaction, add subscriptionCallsPerPack credits and use 1 for this booking. This must be idempotent: verify + webhook add the credits only once.
- Subscription bookings get callMode phone and need a phone number, exactly like Urgent.
- Show "Subscription calls left: N" at the top of History. The success screen also says how many calls are left.
- Changes to the pack price or size affect new purchases only.
- Vitest tests: concurrent credit bookings never go below 0; a pack payment confirmed twice adds credits once.
```

**Try it out**
1. With 0 credits, tap **Call → Subscription** and pay ₹999 with `success@razorpay`. The booking is made, and History shows "Subscription calls left: 3".
2. Book another Subscription call. There's no payment, and it now says 2 left.
3. As the owner, set the pack to 5 calls. Use up your credits and buy again: you get 5.
4. Resend the pack's webhook in the Razorpay dashboard. The credit count doesn't change.
5. Subscription bookings show the phone-call message and no Join button.

## Step 14 — Blogs

**Needs:** Steps 4 and 6.

```text
Build Step 14: blogs. Follow AGENTS.md (rules, step workflow and docs). README.md is the spec.

Read first: README §2, §5.4, §8.5, §10.4 (heart-pop), §12 and §16.2 (question 11).

- Astrologer panel → Blogs (README §8.5):
  - list their own posts, drafts and published
  - write and edit: title up to 120 characters, plain-text body
  - Save draft, Publish, Unpublish, and Delete with a confirmation dialog
- Public API: published posts only; a list, newest first, 20 per page; and a single post.
- User app → Blogs tab, as README §5.4:
  - the list: "Load more", title, author avatar and name, date, 2-line excerpt, like and comment counts
  - the post page: full text (plain text in paragraphs, never HTML), a like toggle with heart-pop, comments oldest first (initials avatar, first name, time), and a comment box (up to 500 characters)
  - a visitor who taps like or comment signs in with Google first (no details form)
- Deleting comments, per the default for open question 11:
  - the commenter, in the user app
  - the post's astrologer, in the astrologer panel
  - the owner, from a simple "Recent comments" list with Delete in the owner panel (the owner panel's only blog feature)
- Rate-limit comments.
```

**Try it out**
1. As the astrologer, write a post and tap **Save draft**. It isn't on the Blogs tab. Tap **Publish**, and it is.
2. As a visitor, read the post and tap like. You're asked to sign in.
3. As a user, like it (the heart pops), tap again to unlike, add a comment, then delete it.
4. As the astrologer, delete a user's comment on your post. As the owner, delete one from **Recent comments**.
5. Post the comment `<script>alert(1)</script>`. It shows as plain text and nothing pops up.
6. **Unpublish** the post. It disappears from the Blogs tab.

## Step 15 — Install as an app, and policy pages

**Needs:** Steps 1–14 working, and the tunnel from [Testing on your phone](#testing-on-your-phone). The app name and icon are placeholders until you decide them (README §16.2, question 15).

```text
Build Step 15: the installable app and the policy pages. Follow AGENTS.md (rules, step workflow and docs). README.md is the spec.

Read first: README §3 (policy pages), §5.7, §10 and §17 (Razorpay policy pages; Installing the app).

- vite-plugin-pwa with the manifest from README §5.7: name and short name "AstroWebApp" for now, theme and background #FFFBEB, start_url "/", display "standalone". Generate placeholder icons from one simple SVG (a golden circle with a white "A"): 192, 512, maskable 512, and an apple-touch-icon.
- Service worker:
  - auto-update
  - precache only the app shell
  - never cache /api, /ws, the /call pages or anything payment-related
  - with no connection, show the offline message from README §5.7
- Install prompts:
  - Android and desktop: a small, dismissible "Install app" banner from beforeinstallprompt (remember the dismissal)
  - iPhone/iPad Safari, when the app isn't installed: the one-time "Share → Add to Home Screen" hint
- Policy pages /terms, /privacy, /refunds, /shipping, /contact, /about and /pricing:
  - simple, readable pages with clearly marked placeholder text for the owner to replace, e.g. "[Owner: write your refund policy here]"
  - /pricing shows the live prices from Settings
  - /shipping says services are delivered online or by phone, and nothing is shipped
  - link them from Settings and from a small footer on Home
```

**Try it out**
1. In `frontend`, run `npm run build`, then `npm run preview`, and open it through the tunnel. Ask Codex how to point the tunnel at the preview server.
2. On Android Chrome, the install banner appears. Tap **Install**. The icon lands on your home screen and opens full-screen.
3. On iPhone Safari, the hint appears. Tap **Share → Add to Home Screen**; the icon opens full-screen. **Also sign in with Google inside the installed iPhone app** (README §17 explains why this matters).
4. Turn on airplane mode and open the app. You see the offline message, not a broken page.
5. In desktop Chrome, open DevTools → Application → Manifest. There are no errors.
6. Open each policy page. /pricing shows the current prices.

## Step 16 — Security review and launch checklist

**Needs:** everything above.

```text
Do Step 16: security hardening and the launch checklist. Don't add features. Follow AGENTS.md (rules, step workflow and docs). README.md is the spec.

Read first: README §12, §14, §17 and §18.

- Check every item in README §12 against the code and fix what's missing. In particular:
  - helmet, with a Content Security Policy that still allows Razorpay Checkout and Google sign-in
  - HSTS and Secure cookies in production
  - CORS
  - rate limits on logins, bookings, comments and chat
  - zod on every route
  - no dangerouslySetInnerHTML
  - logs free of birth details, phone numbers and tokens
  - no secrets in the frontend bundle (search the built files for them)
- Add Vitest access-control tests for every route that takes an id: user vs user, astrologer vs astrologer, and users calling astrologer or owner routes.
- Check that the development-only helpers (/_design, dev:make-booking, the force-relay flag) are absent or disabled in production.
- Add a production start script for the backend.
- Check whether Prisma 8 has a stable release now (README §14). If it does, upgrade following Prisma's guide. If not, tell me.
- Check every doc in docs/ against the code (endpoints, tables, env vars, security status, the panel guide) and fix any doc that's out of date. Fill in the Production section of docs/SETUP.md: building and starting the app, production env vars, HTTPS and WebSockets, and switching Razorpay to live keys.
- Reply with a table mapping each README §12 item to passed / fixed / needs a manual check. Then go through README §18 and, for each item, say how you verified it or exactly what I must test by hand on real phones.
```

**Try it out**
1. Read Codex's report and do every manual check it lists, on a real Android phone and a real iPhone.
2. Run all the tests in `backend`. They pass.
3. Switch Razorpay to live keys only once the policy pages have real text and Razorpay has approved your website.

---

## If something doesn't work

Fill this in and paste it into the same session:

```text
Step N isn't working the way README.md says.
What I did: …
What I expected (README §…): …
What happened instead: … (paste any error from the terminal or the browser console)
Find the cause and fix it. Don't change anything unrelated. Update the docs the fix affects, including docs/CHANGELOG.md.
```

## If you change a decision

When you answer one of the README's open questions (§16.2) differently from its default:

```text
I've decided README §16.2 question N: <your answer>.
Update README.md so the whole spec matches: that row, and every section that mentions it. Record the decision in docs/DECISIONS.md. Then list the already-built code that has to change, and wait for my go-ahead before changing it.
```

## Checking the docs

Run this every few steps, or whenever the docs look out of date:

```text
Check every doc in docs/ against the code. Fix anything that's wrong or missing, and list what you changed. Don't change any code.
```

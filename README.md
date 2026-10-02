# Astro Shashank

> **App name: "Astro Shashank"** (decided 2026-10-02; it replaces the working name "AstroWebApp" everywhere users can see it).
> **Logo:** `frontend/public/logo.jpg`, a gold "AM" monogram in a ring above a wordmark, on cream. Use it wherever a logo appears: app header, panels, login screens, offline screen, Razorpay Checkout and the PWA icons (§5.7). The wordmark on the current file reads "Astromaitreyi"; the owner must confirm or replace the logo before launch.

An installable astrology web app (PWA). Users browse astrologers, book a call and pay with Razorpay. Depending on the call type, they talk to the astrologer inside the app or the astrologer phones them at the booked time. Astrologers manage their availability and blogs from their own panel. The owner manages astrologers, prices and call durations.

**This README is the specification.** The code in this repo is an early boilerplate, and everything below describes what to build. Last updated 30 Sep 2026.

## Ground rules

1. **Build only what is written here.** If something isn't in this README, don't build it: ask the owner first. [§15](#15-out-of-scope-do-not-build) lists extras that must not be added.
2. **Calm, simple and trustworthy.** Many people come to astrology apps when they are anxious or low. Every screen has one clear main action, plain words, large tap targets and no pressure tactics.
3. **Prices and call durations are never hard-coded.** They live in the database, and the owner can change them at any time ([§4](#4-pricing-and-call-settings-owner-can-edit)).
4. **Payments and personal data are security-critical.** Follow [§12](#12-security-checklist) exactly.
5. **Assumptions are marked "(Assumption)".** Where the brief was unclear, this README picks a default. Each one is listed in [§16](#16-gaps-and-open-questions) for the owner to confirm or change.

## Contents

1. [Tech stack](#1-tech-stack)
2. [Roles and access](#2-roles-and-access)
3. [App map](#3-app-map)
4. [Pricing and call settings (owner can edit)](#4-pricing-and-call-settings-owner-can-edit)
5. [User app](#5-user-app)
6. [Booking and payment](#6-booking-and-payment)
7. [In-app audio call (Normal calls)](#7-in-app-audio-call-normal-calls)
8. [Astrologer panel](#8-astrologer-panel)
9. [Owner panel](#9-owner-panel)
10. [Design system (design.css)](#10-design-system-designcss)
11. [Data model](#11-data-model)
12. [Security checklist](#12-security-checklist)
13. [Setup and environment variables](#13-setup-and-environment-variables)
14. [Fixes needed in the current boilerplate](#14-fixes-needed-in-the-current-boilerplate)
15. [Out of scope (do not build)](#15-out-of-scope-do-not-build)
16. [Gaps and open questions](#16-gaps-and-open-questions)
17. [Research notes and platform limits](#17-research-notes-and-platform-limits)
18. [Definition of done](#18-definition-of-done)
19. [Version 2 changes: brand, media, photos, Medium-style blogs, UI polish](#19-version-2-changes-brand-media-photos-medium-style-blogs-ui-polish)

---

## 1. Tech stack

| Part | Choice | State of the repo today |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite 8 (`frontend/`) | Vite starter template only |
| Installable app | `vite-plugin-pwa` (web app manifest + service worker) | Not added |
| Backend | Node + Express 5 + TypeScript (`backend/`) | Skeleton with bugs, see [§14](#14-fixes-needed-in-the-current-boilerplate) |
| Real-time | WebSocket (`ws`) for in-app call signalling and in-call chat | Skeleton |
| In-app calls | WebRTC, audio only, with STUN and a **TURN** relay | Not started |
| Database | Neon (serverless Postgres) through Prisma 8 (`backend/src/prisma/contract.prisma`) | Early schema |
| User login | Google Identity Services ("Continue with Google") | Not started |
| Astrologer and owner login | Email + password | Not started |
| Payments | Razorpay Standard Checkout + Orders API + webhooks | Not started |
| Media storage | Cloudflare R2 (S3-compatible, free tier: 10 GB storage, zero egress fees), for astrologer photos and blog images. Images go through the backend, which resizes them with `sharp`, converts them to WebP and strips metadata before upload (§19). | Not started |

Hosting requirements:

- The whole app is served over **HTTPS** in production. Installing the app, microphone access and secure cookies all need it.
- The backend keeps long-lived WebSocket connections open, so it must run on a normal Node server or VPS. Short-lived serverless functions won't work.
- Serve the API at `/api` and WebSockets at `/ws` on the **same domain** as the frontend, so login cookies work without cross-site setup.

## 2. Roles and access

| Role | How they log in | Where |
|---|---|---|
| Visitor | Not logged in | User app |
| User | Continue with Google | User app |
| Astrologer | Email + password. The owner creates the account. | Astrologer panel (separate link) |
| Owner | Email + password. One account, created by a seed script. | Owner panel (separate link) |

| Data | Visitor | User | Astrologer | Owner |
|---|---|---|---|---|
| Astrologer cards on Home | Yes | Yes | Own preview | Yes |
| An astrologer's full profile (email and all form fields) | No | No | Own only | Yes, all |
| A user's details (name, birth date, time and place, phone, gender) | No | Own only | Only users who booked **them** | No screen |
| Bookings | No | Own | Own | No screen (Assumption) |
| Blogs | Read | Read, like, comment | Write own | — |

Rules:

- There is **no public astrologer profile page**. Users only see the card on Home.
- There are **no user profile pages**. No user can open another user's details. Blog comments show only the commenter's initials avatar and first name.
- The **server** enforces every rule above on every request. Hiding a button in the UI is not access control.

## 3. App map

**User app.** A bottom tab bar with four tabs: Home, History, Blogs, Settings.

| Path | Screen | Login needed |
|---|---|---|
| `/` | Home: all astrologers | No |
| `/history` | Upcoming and past calls | Yes |
| `/blogs`, `/blogs/:id` | Blog list and blog post | To read: no. To like or comment: yes |
| `/settings` | Your details, legal links, log out | Yes |
| `/call/:bookingId` | In-app call room (Normal calls only) | Yes, and only the booked user |
| `/terms`, `/privacy`, `/refunds`, `/shipping`, `/contact`, `/about`, `/pricing` | Policy pages, required by Razorpay before going live ([§17](#17-research-notes-and-platform-limits)). The owner writes the text. | No |

**Astrologer panel** at `/astrologer`: login, profile and preview, availability, bookings, call room, blogs. One link shared by all astrologers (Assumption). Nothing in the user app links to it.

**Owner panel** at `/owner`: login, astrologers, pricing and call settings. Nothing in the user app links to it.

## 4. Pricing and call settings (owner can edit)

All values live in one `Settings` row in the database, and the owner edits them in the owner panel. The server reads them every time it creates a booking or a Razorpay order.

| Setting | Default | Notes |
|---|---|---|
| Normal call price | ₹0 (free) | If the owner ever sets this above ₹0, Normal bookings go through payment the same way Urgent ones do. |
| Urgent call price | ₹300 per call | |
| Subscription pack price | ₹999 | |
| Calls in one subscription pack | 4 | |
| Normal call duration | 15 min | The owner picks 10, 15 or 30 minutes for each call type (Assumption). The brief gives no default, so 15 is a placeholder. |
| Urgent call duration | 15 min | |
| Subscription call duration | 15 min | |

Rules:

- The price shown to the user and the amount charged both come from the server. The browser never sends a price.
- A price change affects **new** bookings only. Every booking and payment stores the amount actually charged, so history never changes.
- Subscription calls that a user has already bought stay valid after a price change.
- Any call type whose price is ₹0 skips the payment step automatically.
- Money is stored as whole paise (₹300 = `30000`). Razorpay also works in paise.

---

## 5. User app

### 5.1 Home

Take the layout from the Astrotalk app's astrologer list (a simple vertical list of cards, each with a clear call button), with less on screen and a calmer look.

- Header: app name and logo only.
- A vertical list of astrologer cards: one per row on phones, 2–3 columns on wide screens. Only active, listed astrologers appear.
- Each card shows the initials avatar ([§5.6](#56-avatars-astrologer-photos-otherwise-initials)), name, expertise, languages and years of experience (Assumption: these fields come from the Astrotalk reference), plus one large **Call** button.
- **Call** starts the booking flow ([§6](#6-booking-and-payment)). Browsing Home needs no login.
- While loading, show skeleton cards, not a spinner. With no astrologers, show "No astrologers are available right now. Please check again later."
- If the app isn't installed, show a small install banner that can be dismissed ([§5.7](#57-install-as-an-app-pwa)).

### 5.2 Login and the details form

- Users sign in only when they need to: to book, to like or comment on a blog, or to open History or Settings.
- Sign-in is **Continue with Google** only.
- The first time a user books, if their details aren't saved yet, they fill in the form below once. Returning users skip it. Liking or commenting on a blog only needs the Google sign-in, not this form.

| Field | Required | Validation |
|---|---|---|
| Name | Yes | 2–60 characters. Pre-filled from Google. |
| Date of birth | Yes | Date picker, can't be in the future. |
| Time of birth | Yes (see open question 16) | Time picker, shown in 12-hour format (e.g. 5:30 AM). Stored as the local time entered, with no timezone conversion. |
| Place of birth | Yes | Free text (city, state or country), up to 100 characters. |
| Phone number | Optional for Normal. **Required for Urgent and Subscription**, because the astrologer will phone the user. | +91 followed by 10 digits starting with 6–9 (Assumption: India only). |
| Gender | Yes | Male / Female / Other |

- Show under the form: "Your details are private. Only the astrologer you book can see them." plus a link to the Privacy Policy.
- If a user without a saved phone number picks Urgent or Subscription, ask for the phone number (one field) before payment and save it to their details.

### 5.3 History

Two sections: **Upcoming** (soonest first) and **Past** (newest first).

Each card shows the astrologer's avatar and name, the call type, the date and time (e.g. "Tue, 4 Oct · 5:30 PM"), the duration, what was paid ("Free", "₹300" or "Subscription call") and the status.

**Normal calls (in-app):**

| When | What the card shows |
|---|---|
| Before the start time | A **Join** button (secondary style). It opens the call room, which says "Please wait. Your call will start at 5:30 PM." |
| Started, not yet ended | A **Join now** button (primary style, gentle glow) |
| Ended | No buttons. Status "Completed" or "Missed". |

**Urgent and Subscription calls (phone calls): never a Join button.**

| When | What the card shows |
|---|---|
| Until the end time | No buttons. The message "{Astrologer name} will call you at 5:30 PM on +91 98765 43210. Please keep your phone nearby." with a phone icon, and a small link: "Wrong number? Update it in Settings." |
| Ended | No buttons. Label "Phone call". |

If the user has subscription credits, show "Subscription calls left: N" at the top of History.

### 5.4 Blogs

The blog reading and writing experience is modelled closely on **Medium** (§19.3).

- **List:** newest first, 20 per page with a "Load more" button. Each item shows the cover image (when the post has one), the title, the astrologer's photo or initials and name, the date, the reading time (e.g. "4 min read"), a 2-line plain-text excerpt, and the like and comment counts.
- **Post page:** Medium-style reading view: a centred column about 680px wide, a large title, an author row (photo, name, date, reading time), then the formatted body: headings, bold, italic, underline, quotes, lists, links and images with captions. Then the like button, comments (oldest first) and a comment box.
- **Likes:** one like per user per post. Tapping again removes it.
- **Comments:** plain text, up to 500 characters. Each shows the commenter's initials avatar, first name and time.
- A visitor who taps like or comment is asked to Continue with Google first.
- The blog body is **rich text stored as structured JSON** (TipTap/ProseMirror document), never raw HTML. Only an allow-list of formatting is accepted (§19.3), and it is rendered by React components, never with `dangerouslySetInnerHTML`. Comments stay plain text.

### 5.5 Settings

- Shows the user's avatar, name and email. The email comes from Google and can't be edited.
- The user can edit and save their name, date of birth, time of birth, place of birth, phone number and gender. The same validation as [§5.2](#52-login-and-the-details-form) applies.
- The phone number can't be removed while the user has an upcoming Urgent or Subscription call. Show: "You have an upcoming phone call, so we need your number."
- Links: Terms, Privacy, Cancellation & Refunds, Contact us.
- A **Log out** button.

### 5.6 Avatars (astrologer photos, otherwise initials)

**Astrologers can upload a profile photo** (§8.2, §19.2). Wherever an astrologer appears (Home card, booking summary, History, the astrologer's own panel, the call room, blog author rows), show their photo as a circle. If they have no photo, show their initials. **Users never upload photos**; they always appear as initials. Initials follow the rules below, the way Google Meet and Zoom show them.

- Split the name on spaces. With two or more words, take the first letter of the first word and the first letter of the last word ("Yash Kumar Rastogi" → **YR**). With one word, take its first letter ("Yash" → **Y**). Uppercase.
- Get the first character with `Intl.Segmenter`, so names in Hindi and other scripts display correctly.
- Background: one of these six warm colours, chosen from a hash of the person's id so it never changes: `#F6D365`, `#F4B860`, `#E9C46A`, `#F2A65A`, `#D9B26F`, `#EACB8A`. Text colour: `--color-text`. All six have a contrast of 7.8:1 or better.
- Sizes: 32px in comments, 40px in lists, 56px on Home cards, 96px in the call room.

### 5.7 Install as an app (PWA)

- **Manifest:** `name`, `short_name`, `start_url: "/"`, `display: "standalone"`, `background_color` and `theme_color` = `#FFFBEB`. Icons: 192×192 and 512×512 PNG, plus a *maskable* 512×512 icon so Android launchers don't shrink the logo into a white circle.
- **Service worker** with a fetch handler, which Chrome needs before it shows its install prompt. It caches only the app shell (HTML, JS, CSS, fonts, icons). **Never cache API responses, payment pages or the call room.**
- **Android, and desktop Chrome/Edge:** listen for `beforeinstallprompt` and show our own small "Install app" banner.
- **iPhone and iPad:** Safari has no install prompt. When the app is open in iOS Safari and not yet installed, show a one-time hint: "To install: tap **Share**, then **Add to Home Screen**."
- **Offline:** show "You're offline. Please check your internet connection." instead of a broken page.

---

## 6. Booking and payment

### 6.1 Steps for the user

1. On Home, tap **Call** on an astrologer.
2. A bottom sheet opens with three options: **Normal**, **Urgent** and **Subscription**. Each shows its price, duration and one line on how the call happens:
   - Normal: "Free · 15 min · Talk inside the app"
   - Urgent: "₹300 · 15 min · The astrologer calls your phone"
   - Subscription: "₹999 for 4 calls · The astrologer calls your phone" (or "3 calls left" if the user has credits)
3. If the user isn't signed in: Continue with Google. If their details aren't saved: the details form ([§5.2](#52-login-and-the-details-form)). If they chose Urgent or Subscription without a saved phone number: ask for it.
4. Pick a date from the next 14 days (Assumption), then a time slot. For a day with no free slots, show "No free times on this day. Please try another day."
5. **Summary:** astrologer, call type, date and time, duration, price. For Urgent and Subscription, also show "{Astrologer name} will call you on +91 98765 43210 at 5:30 PM", with an option to change the number. The button reads **Confirm booking** (free, or paid with a subscription credit) or **Pay ₹300** / **Pay ₹999**.
6. Razorpay Checkout, only if payment is needed.
7. **Success screen** with a checkmark animation:
   - Normal: "Your call is booked for Tue, 4 Oct at 5:30 PM. You can join from History."
   - Urgent/Subscription: "Booked! {Astrologer name} will call you on +91 98765 43210 at 5:30 PM on Tue, 4 Oct. Please keep your phone nearby."

   A button leads to History.

### 6.2 Call types

| | Normal | Urgent | Subscription |
|---|---|---|---|
| Default price | Free | ₹300 per call | ₹999 for a pack of 4 calls |
| Phone number | Optional | **Required** | **Required** |
| How the call happens | **In-app audio call** ([§7](#7-in-app-audio-call-normal-calls)) | **Phone call**: the astrologer phones the user's number at the booked time | **Phone call**, same as Urgent |
| Join / Join now button | Yes | **Never** | **Never** |
| Instead of a Join button | — | "{Astrologer name} will call you at {time} on {number}" (summary, success screen, History) | Same as Urgent |
| Time slots | From the astrologer's availability | Same | Same |

- **Call mode is fixed by the call type** and saved on the booking (`in_app` or `phone`). A Normal booking stays an in-app call even if the user entered their optional phone number (Assumption, open question 1).
- **Subscription** (Assumption): a one-time payment that adds 4 call credits to the user's account. It is **not** an auto-renewing Razorpay Subscription. Credits work with any astrologer and don't expire. Each Subscription booking uses 1 credit. A user with 0 credits buys a pack during the booking flow: pay ₹999, get 4 credits, this booking uses 1, and History shows "3 calls left".
- **Urgent vs Normal** (Assumption): the brief doesn't say what makes Urgent different besides the price and phone call. Suggested rule: Normal can only be booked from tomorrow onwards, while Urgent can also book today's free slots.
- **Free-call limit** (Assumption): a user can have only one upcoming Normal booking at a time.

### 6.3 Slots and availability

- Astrologers set weekly hours (e.g. Mon 10:00–13:00) plus exceptions for specific dates: a day off, or extra hours ([§8.3](#83-availability)).
- Slots for a call type are cut from the free hours using that type's duration. For example, 15-minute calls in a 10:00–11:00 window give 10:00, 10:15, 10:30 and 10:45.
- Leave out slots in the past and slots that overlap an existing booking (confirmed, or held for payment and not yet expired).
- All times are **shown in IST** (Asia/Kolkata) (Assumption) and **stored as UTC** (`timestamptz`).
- Changing availability never cancels existing bookings. If an astrologer removes hours that contain a booking, warn them and keep the booking.
- **No double booking.** The database itself must reject two active bookings for the same astrologer that overlap in time ([§11](#11-data-model)). If two people tap the same slot at the same moment, one succeeds and the other sees "Sorry, this time was just booked. Please pick another time."

### 6.4 Payment flow (Razorpay, server-side)

1. **Create the booking and hold the slot.** `POST /api/bookings` with the astrologer, call type and start time. The server checks the slot is still free, reads the price from `Settings`, and saves the booking as `pending_payment` with a 10-minute hold. If the price is ₹0 or a subscription credit covers it, the booking is confirmed right away and payment is skipped.
2. **Create the Razorpay order on the server** using the Orders API: `amount` in paise taken from `Settings`, `currency: "INR"`, `receipt` = the booking id, and `notes` holding the booking id and user id. Send the order id, the amount and the public key id to the browser.
3. **Open Razorpay Checkout** in the browser with that `order_id` and the user's name, email and phone pre-filled.
4. **Verify on the server.** Checkout returns `razorpay_order_id`, `razorpay_payment_id` and `razorpay_signature`. The browser posts them to `POST /api/payments/verify`, and the server:
   1. computes `HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET)`,
   2. compares it to the signature with `crypto.timingSafeEqual`,
   3. checks the order belongs to this user and this booking, and
   4. in one database transaction, confirms the booking (or adds the credits) and records the payment.
5. **Webhook as a backup.** `POST /api/razorpay/webhook` handles `payment.captured`, `order.paid` and `payment.failed`.
   - Verify the `X-Razorpay-Signature` header: an HMAC SHA256 of the **raw** request body, keyed with `RAZORPAY_WEBHOOK_SECRET`. Mount this route with `express.raw()` **before** `express.json()`.
   - Skip events that were already processed, using the `x-razorpay-event-id` header.
   - Step 4 and the webhook may both arrive, in either order, so confirming must be idempotent.
6. **Late payments.** A payment can succeed after the 10-minute hold expired and someone else took the slot. In that case, refund it automatically with the Razorpay Refunds API and tell the user: "This time was booked by someone else, so we've refunded your payment."
7. Turn on **auto-capture** in the Razorpay dashboard.

What the user sees:

- Checkout closed: back to the summary with "Payment was not completed. You can try again."
- Payment failed: "Payment didn't go through. If any money was deducted, it will be returned automatically."
- Never show raw error codes.

---

## 7. In-app audio call (Normal calls)

Only Normal bookings have a call room. Urgent and Subscription bookings are phone calls and never open it ([§6.2](#62-call-types)).

### 7.1 Room states

The call room (`/call/:bookingId` for users, `/astrologer/call/:bookingId` for astrologers) always shows exactly one of these states:

| When | What the person sees |
|---|---|
| Before the start time | "Please wait. Your call will start at 5:30 PM." with the breathing-circle animation. No audio is connected yet. |
| After the start time, other person not in the room | User: "Waiting for {astrologer name} to join…" Astrologer: "Waiting for {user's first name} to join…" Breathing circle. |
| Both in the room | Connected: both avatars, a timer showing the time left, and the controls below |
| After the end time | "This call has ended." The only button is "Back to History". |

- The room switches state on its own; nobody needs to refresh.
- Either person can leave and rejoin until the end time.
- **End of call** (Assumption): with 2 minutes left, show a gentle notice: "2 minutes left." At the end time, the call ends for both people.
- After the end time, the booking becomes **Completed** if both people joined at some point, or **Missed** if not.

### 7.2 Controls

Use large buttons with a text label under each icon, never icon-only buttons.

| Control | Behaviour |
|---|---|
| **Mute / Unmute** | Turns the microphone track off and on. The other person sees a muted icon on your avatar. |
| **Speaker** | Switches between earpiece and loudspeaker with `HTMLMediaElement.setSinkId()`. **Show it only where the browser supports this.** Chrome on Android does not ([§17](#17-research-notes-and-platform-limits)); there, the phone decides where the sound goes. |
| **Earbuds (automatic)** | The phone switches to wired or Bluetooth earbuds by itself. Listen for the `devicechange` event on `navigator.mediaDevices`. When the microphone changes, get the new default mic and swap it into the call with `RTCRtpSender.replaceTrack()`. Show a short toast: "Audio device changed." |
| **Chat** | Opens a panel for text messages during the call, up to 500 characters each. Messages go over the call's WebSocket and are not saved after the call (Assumption). |
| **Leave call** | Leaves the room. Rejoining works until the end time. |

- **Microphone permission:** ask when the person taps **Join**. If they deny it, explain how to allow the microphone in their browser settings and show a "Try again" button.
- **Speaking indicator:** a soft ring pulses around the avatar of whoever is talking. Measure this with a Web Audio `AnalyserNode` on each audio stream.

### 7.3 Connection

- Peer-to-peer audio over WebRTC. The WebSocket carries the signalling (offer, answer, ICE) and the chat.
- Capture the microphone with `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false })`.
- **A TURN server is required.** About 10–20% of users can't connect peer-to-peer and need a relay; mobile networks are a common cause. Run coturn on a small server or use a managed TURN service. The backend generates short-lived TURN credentials for each call.
- Before the start time, the room is a clock-driven screen and doesn't connect. From the start time to the end time, the WebSocket admits only the two people on that booking.

---

## 8. Astrologer panel

### 8.1 Login

- Email + password. The owner creates the account with a temporary password, and the astrologer must set a new one at first login.
- Forgotten password: the owner resets it (Assumption).

### 8.2 Profile and preview

- **Profile photo:** upload, change or remove a photo (JPG, PNG or WebP, up to 5 MB). Show a square crop step before saving. The server stores a 512×512 WebP (§19.2). Until a photo is saved, the card uses initials.
- **Form fields:** display name, expertise (e.g. Vedic, Tarot, Numerology), languages and years of experience (Assumption: taken from the Astrotalk reference).
- **Preview** button: renders the exact Home card component with the unsaved form data inside a phone-width frame, so the astrologer sees exactly how they'll look on Home.
- **Save:** the card appears on Home straight away (Assumption). The owner can hide any astrologer at any time.

### 8.3 Availability

- **Weekly hours:** for each day, one or more time ranges (e.g. Mon 10:00–13:00 and 17:00–19:00), or mark the day off.
- **Date exceptions:** block a whole date or part of it, or add extra hours on a specific date.
- Changes only affect future free slots. Existing bookings are kept ([§6.3](#63-slots-and-availability)).

### 8.4 Bookings

- Upcoming and past bookings, laid out like the user's History ([§5.3](#53-history)).
- Each booking shows the user's name, date, time and place of birth, gender, and phone number (when there is one). It never shows the user's email.
- **Normal bookings:** Join / Join now buttons, with the same rules as the user's side, opening the call room ([§7](#7-in-app-audio-call-normal-calls)).
- **Urgent and Subscription bookings:** "Phone call · Tue, 4 Oct · 5:30 PM", with the user's number as a tap-to-call (`tel:`) link. There is no Join button. The astrologer calls the user at the booked time.

### 8.5 Blogs

- A list of their own posts, both drafts and published.
- **Write or edit** in a **Medium-style editor** (§19.3): title (up to 120 characters), optional cover image, and a rich-text body with headings, bold, italic, underline, quotes, lists, links and inline images with captions. Buttons: Save draft, Publish, Unpublish, and Delete (with a confirmation dialog).

## 9. Owner panel

- **Login:** email + password. A seed script creates the single owner account from `OWNER_EMAIL` and `OWNER_PASSWORD`, storing only the password hash.
- **Astrologers:**
  - see a list of all astrologers
  - add an astrologer (name, email, temporary password)
  - view any astrologer's full profile (only the owner can)
  - edit a profile
  - hide an astrologer from Home, or show them again
  - deactivate an account (the astrologer can't log in and is hidden from Home)
  - reset a password (sets a new temporary one)
- **Pricing and call settings:** edit every value in [§4](#4-pricing-and-call-settings-owner-can-edit). Show the note "Changes apply to new bookings only."

---

## 10. Design system (design.css)

**Create `frontend/src/design.css`** and import it once in `frontend/src/main.tsx`. It replaces the Vite starter styles (`index.css` and `App.css`). It is the single source for colours, type, spacing and motion. Components use its CSS variables and never hard-code a colour or a duration.

### 10.1 Look and feel

- Light yellow page background, white cards, golden primary buttons, dark warm-brown text.
- Plenty of white space, one main action per screen, rounded corners and soft shadows.
- Body text is at least 16px. Use `rem` units so the phone's text-size setting still works. Line height 1.6.
- Every tap target is at least 48×48px.
- Font: **Nunito** (rounded and friendly), self-hosted through `@fontsource/nunito` so it works offline, with a system-font fallback.
- Light theme only; dark mode is out of scope.

### 10.2 Tokens (top of `design.css`)

```css
:root {
  /* Colour: every text pairing below passes WCAG AA */
  --color-bg: #FFFBEB;            /* page background, light yellow */
  --color-surface: #FFFFFF;       /* cards, sheets, inputs */
  --color-surface-soft: #FFF3C4;  /* selected chips, highlights */
  --color-primary: #F5C542;       /* golden: primary buttons, active tab. Never for text */
  --color-primary-hover: #EDB82E;
  --color-on-primary: #2B2111;    /* text on golden buttons, 9.8:1 */
  --color-text: #2B2111;          /* main text, 15.2:1 on bg */
  --color-text-muted: #6B5A3A;    /* secondary text, 6.4:1 on bg */
  --color-link: #8A5A00;          /* links and focus ring, 5.7:1 on bg */
  --color-border: #EFE2B8;        /* card dividers, decorative only */
  --color-border-strong: #A08445; /* input borders, 3.4:1 on bg */
  --color-success: #1F6B3F;  --color-success-bg: #E6F4EA;
  --color-danger:  #A8261B;  --color-danger-bg:  #FDECEA;

  /* Type */
  --font-body: "Nunito", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --text-sm: 0.875rem;  --text-base: 1rem;  --text-lg: 1.125rem;
  --text-xl: 1.375rem;  --text-2xl: 1.75rem;
  --leading: 1.6;

  /* Spacing (4px steps) */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;  --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px;

  /* Shape and depth */
  --radius-sm: 8px;  --radius-md: 12px;  --radius-lg: 20px;  --radius-full: 999px;
  --shadow-card:   0 1px 2px rgb(92 64 0 / 6%), 0 4px 12px rgb(92 64 0 / 6%);
  --shadow-raised: 0 8px 24px rgb(92 64 0 / 12%);
  --tap-min: 48px;

  /* Motion */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in:  cubic-bezier(0.4, 0, 1, 1);
  --dur-fast: 120ms;  --dur-base: 200ms;  --dur-slow: 300ms;
}
```

Colour rules:

- Use golden (`--color-primary`) only as a background: buttons, the active tab, selected states. Golden text on white has a contrast of just 1.6:1.
- Errors use `--color-danger` plus a message that says what to do next. Colour is never the only signal.
- Every interactive element gets a visible focus style: `outline: 3px solid var(--color-link); outline-offset: 2px;`

### 10.3 Components to style in `design.css`

Buttons (primary, secondary, text), cards, inputs and selects, chips (dates and time slots), bottom sheet, dialog, toast, bottom tab bar, avatar, status badges (Upcoming, Completed, Missed, Phone call), skeleton loader and call controls.

### 10.4 Animations

Motion should be soft and slow, to calm people rather than excite them. Animate only `transform` and `opacity`, which stay smooth on cheap phones.

| Where | Animation | Timing |
|---|---|---|
| Any screen appearing | `fade-up`: fades in while rising 8px | 240ms, `--ease-out` |
| Astrologer cards on Home | `fade-up`, staggered by 40ms per card (first 6 cards only) | 240ms |
| Pressing a button | Shrinks to `scale(0.97)`. Colour change on hover. | 120ms |
| Hovering a card (desktop only) | Lifts with `translateY(-2px)` and `--shadow-raised` | 200ms |
| Call-type picker, slot picker, install banner | `sheet-up`: the bottom sheet slides up while the backdrop fades in | 300ms in (`--ease-out`), 200ms out (`--ease-in`) |
| Confirmation dialogs | `scale-in` from 0.96 with a fade | 200ms |
| Loading | Skeleton `shimmer` in soft gold. No spinners anywhere. | 1.4s linear, repeating |
| Call-room waiting screens ("Your call will start at…", "Waiting for… to join") | `breathe`: a soft golden circle slowly grows and shrinks, like calm breathing | 8s ease-in-out, repeating |
| Someone talking in an in-app call | `speak-ring`: a ring ripples out from their avatar | 1.2s, repeating while they talk |
| Mute / speaker toggle | Icon cross-fade and background colour change | 150ms |
| New chat message | `fade-up` by 4px | 180ms |
| Liking a blog | `heart-pop`: the heart grows to 1.25×, settles back, and fills with colour | 300ms |
| Toasts | `fade-up` in and fade out, hiding automatically after 4s | 220ms in, 180ms out |
| Booking or payment success | The circle does a `scale-in`, then the checkmark draws itself (`check-draw`) | 300ms, then 450ms |
| **Join now** button (only while a call is live) | `soft-glow`: a gentle golden glow | 2.4s ease-in-out, repeating |

```css
@keyframes fade-up    { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes fade-in    { from { opacity: 0; } to { opacity: 1; } }
@keyframes sheet-up   { from { transform: translateY(100%); } to { transform: none; } }
@keyframes scale-in   { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: none; } }
@keyframes breathe    { 0%, 100% { transform: scale(1); opacity: 0.55; } 50% { transform: scale(1.12); opacity: 1; } }
@keyframes speak-ring { from { transform: scale(1); opacity: 0.6; } to { transform: scale(1.35); opacity: 0; } }
@keyframes heart-pop  { 0% { transform: scale(1); } 40% { transform: scale(1.25); } 100% { transform: scale(1); } }
@keyframes soft-glow  { 0%, 100% { box-shadow: 0 0 0 0 rgb(245 197 66 / 0%); } 50% { box-shadow: 0 0 0 6px rgb(245 197 66 / 35%); } }

/* Skeleton: use with background-size: 400% 100% on a soft-gold gradient */
@keyframes shimmer    { from { background-position: 100% 0; } to { background-position: 0 0; } }

/* Checkmark: set stroke-dasharray and stroke-dashoffset to the path length first */
@keyframes check-draw { to { stroke-dashoffset: 0; } }

/* Respect the phone's "reduce motion" setting: no movement, no looping */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Don't use:**

- bouncy or elastic easing
- shaking, even for errors
- spinning loaders
- parallax, confetti, or carousels that slide on their own
- anything that flashes more than 3 times a second (WCAG 2.3.1)
- animations on `width`, `height`, `top`, `left` or `margin`
- UI transitions longer than 400ms. Only the three ambient loops (`breathe`, `soft-glow`, `shimmer`) run longer.

### 10.5 Words on screen

- Plain, warm and short. Sentence case, no ALL CAPS, no astrology jargon on buttons.
- No pressure tactics: no "Only 2 slots left!", no sale countdowns, no pre-ticked boxes, no hidden charges. Show the exact price before any payment button.
- Every error says what happened and what to do next.
- Examples: "Please wait. Your call will start at 5:30 PM." · "Waiting for {astrologer name} to join…" · "{Astrologer name} will call you at 5:30 PM on +91 98765 43210." · "Payment didn't go through. If any money was deducted, it will be returned automatically."

### 10.6 Accessibility

- All text meets WCAG AA contrast (the colours in [§10.2](#102-tokens-top-of-designcss) have been checked).
- Every input has a visible label, and error messages are linked to their fields.
- Call-room state changes and new chat messages are announced with `aria-live="polite"`.
- Layouts cope with the phone's larger-text setting: `rem` units, no fixed heights on text containers.
- `<html lang="en">`.

---

## 11. Data model

The current schema (`backend/src/prisma/contract.prisma`) needs to grow into the tables below. Use camelCase column names. Store money as whole paise and times as `timestamptz` (UTC).

| Table | Key fields | Notes |
|---|---|---|
| `Owner` | id, email (unique), passwordHash | One row, created by the seed script |
| `Astrologer` | id, email (unique), passwordHash, mustChangePassword, displayName, expertise[], languages[], experienceYears, photoMediaId (nullable), isActive, isListed, createdAt | Replaces `Astro` |
| `User` | id, googleSub (unique), email, name, birthDate, birthTime, birthPlace, phone (nullable), gender, subscriptionCredits (default 0), createdAt | Identify users by Google's `sub`, not by email |
| `AvailabilityRule` | id, astrologerId, weekday (0–6), startTime, endTime | Weekly hours |
| `AvailabilityException` | id, astrologerId, date, kind (`blocked` / `extra`), startTime (nullable), endTime (nullable) | Date overrides |
| `Booking` | id, userId, astrologerId, callType (`normal` / `urgent` / `subscription`), callMode (`in_app` / `phone`), startsAt, endsAt, status (`pending_payment` / `confirmed` / `completed` / `missed` / `expired`), holdExpiresAt (nullable), pricePaise, usedCredit, userJoinedAt (nullable), astrologerJoinedAt (nullable), createdAt | Price copied from `Settings` at booking time. Joined-at times apply to in-app calls only. |
| `Payment` | id, userId, bookingId (nullable), purpose (`normal_call` / `urgent_call` / `subscription_pack`), razorpayOrderId (unique), razorpayPaymentId (unique, nullable), amountPaise, status (`created` / `paid` / `failed` / `refunded`), createdAt | |
| `WebhookEvent` | eventId (unique), receivedAt | De-duplicates Razorpay webhooks |
| `Settings` | One row: normalPricePaise, urgentPricePaise, subscriptionPricePaise, subscriptionCallsPerPack, normalDurationMin, urgentDurationMin, subscriptionDurationMin, updatedAt | The owner edits these ([§4](#4-pricing-and-call-settings-owner-can-edit)) |
| `Blog` | id, astrologerId, title, body (JSONB rich-text document, §19.3), excerpt (plain text, derived), readingMinutes, coverMediaId (nullable), status (`draft` / `published`), publishedAt (nullable), createdAt, updatedAt | Replaces `Blogs` |
| `MediaAsset` | id, ownerAstrologerId, kind (`profile_photo` / `blog_image`), storageKey (unique), width, height, bytes, createdAt | One row per stored image in R2 (§19.1) |
| `BlogLike` | blogId, userId, createdAt, unique on (blogId, userId) | Replaces the `Blogs.Like` number |
| `BlogComment` | id, blogId, userId, body, createdAt | Replaces the `Blogs.Comment` string |
| `Session` | id, role (`user` / `astrologer` / `owner`), subjectId, expiresAt, createdAt | Server-side sessions that can be revoked |

The database must make overlapping bookings impossible. If the Prisma contract can't express this constraint, add it in a SQL migration (Neon supports `btree_gist`):

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_no_overlap"
  EXCLUDE USING gist ("astrologerId" WITH =, tstzrange("startsAt", "endsAt") WITH &&)
  WHERE (status IN ('pending_payment', 'confirmed'));
```

Before inserting a booking, in the same transaction, set that astrologer's expired holds (`status = 'pending_payment' AND "holdExpiresAt" < now()`) to `expired` so they stop blocking the slot.

## 12. Security checklist

**Payments**

- [ ] The Razorpay key secret and webhook secret exist only in backend environment variables. Only the key id reaches the browser.
- [ ] The server takes the amount from `Settings`. The browser never sends a price.
- [ ] Every payment is verified on the server (signature, plus the order belongs to this user and booking) before a booking is confirmed or credits are added.
- [ ] The webhook signature is checked against the raw body. Duplicate events are skipped using `x-razorpay-event-id`. `razorpayPaymentId` is unique, so one payment can never be used twice.
- [ ] In Razorpay test mode, test a successful payment, a failed payment and a closed checkout, plus two attacks: a forged signature (must be rejected) and a replayed webhook (must be ignored).

**Accounts and sessions**

- [ ] The Google ID token is verified on the server with `google-auth-library`'s `verifyIdToken`, which checks the signature, `aud` (our client id), `iss` and `exp`. Also require `email_verified`, and store `sub` as the Google user id. In redirect mode, check that the `g_csrf_token` cookie matches the value in the request body.
- [ ] Sessions use httpOnly, Secure, SameSite=Lax cookies, with separate cookies for the user app, astrologer panel and owner panel. Lifetimes (Assumption): 30 days for users, 12 hours for astrologers and the owner.
- [ ] Owner and astrologer passwords are hashed with argon2id (or bcrypt with cost 12 or more) and must be at least 10 characters. Logins are rate-limited (e.g. 5 tries per 15 minutes per email and IP address). A wrong email and a wrong password get the same error message.
- [ ] New astrologers must replace their temporary password at first login.

**Access control**

- [ ] Every API route checks the role **and** the specific record: a user can only read their own bookings, and an astrologer can only read users who booked them. Test this by requesting someone else's id through the API; it must return 403 or 404.
- [ ] WebSocket connections are authenticated from the session cookie during the upgrade, and the `Origin` header must match `APP_ORIGIN`. Only the user and astrologer of an in-app booking can join its room, and only during the call window.
- [ ] TURN credentials are short-lived and generated for each call.

**General**

- [ ] HTTPS only, with HSTS. CORS allows only `APP_ORIGIN`; today's `cors()` call allows every site.
- [ ] Security headers (e.g. `helmet`) with a Content Security Policy that still allows Razorpay Checkout (`checkout.razorpay.com`) and Google sign-in (`accounts.google.com`).
- [ ] Every request body is validated (e.g. with `zod`): types, lengths, allowed values and dates.
- [ ] User and blog text is never rendered as HTML (no `dangerouslySetInnerHTML`). Rich blog bodies are validated against an allow-list on the server and rendered as React components (§19.3).
- [ ] Image uploads (§19.1):
  - check the real file type from its bytes (JPG, PNG or WebP only), with a 5 MB limit
  - re-encode with `sharp` and strip all metadata, including GPS location
  - only astrologers can upload, and only for their own profile or posts
  - the R2 secret keys stay on the server
  - the Content Security Policy `img-src` allows only our own origin and the media domain
- [ ] Logs never contain birth details, phone numbers or tokens.
- [ ] Neon connection strings keep `sslmode=require`, and `.env` is never committed (`backend/.gitignore` already covers it).

## 13. Setup and environment variables

`backend/.env` (update `backend/.env.example` to match):

```dotenv
# Neon POOLED connection string (host contains "-pooler"), used by the running app
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
# Neon DIRECT connection string, used only for migrations (prisma.config.ts)
DIRECT_DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Exact frontend origin, used for CORS, cookies and the WebSocket origin check
APP_ORIGIN="http://localhost:5173"
SESSION_SECRET="at-least-32-random-characters"

# Google sign-in (OAuth client of type "Web application")
GOOGLE_CLIENT_ID="xxxx.apps.googleusercontent.com"

# Razorpay (test keys start with rzp_test_). The secrets never go to the browser.
RAZORPAY_KEY_ID="rzp_test_xxxx"
RAZORPAY_KEY_SECRET="xxxx"
RAZORPAY_WEBHOOK_SECRET="xxxx"

# Owner account: read once by the seed script, which stores only a hash
OWNER_EMAIL="owner@example.com"
OWNER_PASSWORD="change-me"

# TURN relay for in-app calls (short-lived credentials are derived from TURN_SECRET)
TURN_URLS="turn:turn.example.com:3478?transport=udp,turns:turn.example.com:5349?transport=tcp"
TURN_SECRET="xxxx"

APP_TIMEZONE="Asia/Kolkata"

# Cloudflare R2 media storage (§19.1). The keys never go to the browser.
R2_ACCOUNT_ID="xxxx"
R2_ACCESS_KEY_ID="xxxx"
R2_SECRET_ACCESS_KEY="xxxx"
R2_BUCKET="astro-shashank-media"
# Public base URL for images: the r2.dev URL in development, a custom domain on Cloudflare in production
R2_PUBLIC_BASE_URL="https://pub-xxxx.r2.dev"
```

`frontend/.env`:

```dotenv
VITE_GOOGLE_CLIENT_ID="xxxx.apps.googleusercontent.com"
```

Setup steps:

1. **Neon.** Create a project. Copy the **pooled** connection string into `DATABASE_URL` and the **direct** one into `DIRECT_DATABASE_URL`. Point `backend/prisma.config.ts` at `DIRECT_DATABASE_URL`, because migrations don't run reliably through the pooler. `backend/src/prisma/db.ts` keeps using `DATABASE_URL`.
2. **Google.** In Google Cloud Console, create an OAuth client of type "Web application". Add `http://localhost:5173` and the production domain as authorised JavaScript origins.
3. **Razorpay.** Use test-mode keys while developing. Add a webhook pointing to `https://<your-domain>/api/razorpay/webhook` for the events `payment.captured`, `payment.failed` and `order.paid`, with a secret. Turn on auto-capture. Publish the policy pages before asking for live mode ([§17](#17-research-notes-and-platform-limits)).
4. **TURN.** Set up coturn or a managed TURN service, then fill in `TURN_URLS` and `TURN_SECRET`.
5. **Install and run:**

   ```bash
   cd backend && npm install
   cd ../frontend && npm install && npm run dev
   ```

   The backend has no `dev` or `start` script yet. Add them (e.g. `tsx watch index.ts`). In development, use Vite's `server.proxy` to forward `/api` and `/ws` to the backend so everything stays same-origin.
6. **Testing on a real phone.** Installing the app, the microphone and earbuds must be tested on real phones. Phones only allow the microphone on HTTPS pages, so open the dev server over HTTPS (e.g. through a tunnel).

## 14. Fixes needed in the current boilerplate

Found while reviewing the repo on 30 Sep 2026:

| File | Problem | Fix |
|---|---|---|
| `backend/index.ts` | `app.post('/signup', )` has no handler, the routers in `routes/` are never mounted, and there is no `app.listen` | Mount the routers under `/api`, add `listen`, remove the stub |
| `backend/routes/User.ts` | Imports `{ client }`, but `src/prisma/db.ts` exports `db` | Import `{ db }` |
| `backend/src/realtime/index.ts` | Listens with `wss.on('message')`. Messages arrive on each socket, so this never fires. | Use `ws.on('message')` inside the connection handler |
| `backend/src/realtime/index.ts` | A single global `senderSocket` / `receiverSocket` pair allows only one call in the whole app. No authentication, and it runs on a separate port (8080). | Use rooms keyed by booking id, authenticate during the upgrade, and attach to the main server at `/ws` |
| `backend/routes/Blogs.ts`, `src/realtime/chat.ts`, `src/realtime/signaling.ts` | Empty files | Implement them as this README describes |
| `backend/src/prisma/contract.prisma` | `Blogs.Like` (a number) can't track who liked. `Blogs.Comment` (a string) holds only one comment. `User` has no birth details, phone, gender or Google id. `Astro` has no password. There are no bookings, availability, payments or settings. Naming is mixed (`Descr`, `Like`). | Rebuild it per [§11](#11-data-model) |
| `backend/index.ts` | `cors()` allows any origin | Allow only `APP_ORIGIN`, with credentials |
| `backend/.env.example` | Lists only `DATABASE_URL` | Add every variable from [§13](#13-setup-and-environment-variables) |
| `backend/package.json` | Prisma 8 is still a release candidate, so its APIs can change before the stable release (expected October 2026) | Keep `prisma` and `@prisma/orm-postgres` together on `latest`, as Prisma advises, and move to the stable 8.0 release before launch |
| `frontend/` | Still the Vite starter: `App.tsx`, `App.css`, `index.css`, `hero.png`, and the page title "frontend" | Replace it with the app. Styles go in `design.css`. |

## 15. Out of scope (do not build)

Don't build any of these unless the owner asks for them later:

- Video calls, chat-only consultations, per-minute billing, wallets
- Ratings and reviews, public astrologer profile pages, search, filters, categories
- Photo uploads by **users** (users are always initials). Astrologer profile photos and blog images *are* in scope (§19).
- Video or audio uploads, or files other than images
- Horoscopes, kundli or birth charts, panchang, or other astrology content
- Live sessions, call recording
- Push notifications, SMS, WhatsApp or email reminders
- Coupons, referrals, offers, gift cards
- Multiple languages, dark mode
- Earnings or payout screens for astrologers, analytics dashboards
- Any login method besides Google (users) and email + password (astrologers and owner)

## 16. Gaps and open questions

### 16.1 Added because the listed features can't work without them

These weren't in the brief but are included above:

- **Policy pages:** Terms, Privacy, Cancellation & Refunds, Shipping, Contact, About and Pricing. Razorpay won't activate live payments without them.
- **A TURN server,** without which many in-app calls on mobile data fail to connect.
- **Slot holds during payment,** plus a database rule that blocks double bookings.
- **Webhook handling for payments:** idempotent confirmation, and automatic refunds when a late payment's slot is already gone.
- **In-app call basics:** a Leave call button, microphone-permission help, and Completed/Missed statuses.
- **Account basics:** a seed script for the owner account, and temporary astrologer passwords that must be changed at first login.
- **Installing on iPhone:** a service worker, manifest and icons, plus the "Add to Home Screen" hint for iPhone users.
- **Time and phone rules:** one timezone rule (show IST, store UTC), and blocking removal of the phone number while a phone call is upcoming.
- **Hardening:** login rate limits and WebSocket authentication.

### 16.2 Open questions for the owner

Until a question is answered, build the default in the right-hand column.

| # | Question | Default until answered |
|---|---|---|
| 1 | If a user enters their (optional) phone number on a **Normal** booking, is it still an in-app call, or does the astrologer phone them? | Still an in-app call with a Join button. The number is only a backup. |
| 2 | What makes Urgent different from Normal, apart from price and the phone call? | Normal: bookable from tomorrow. Urgent: can also book today's slots. |
| 3 | Subscription: does it expire? Can it be used with any astrologer or just one? Should it renew automatically every month? | One-time payment, 4 credits, any astrologer, no expiry, no auto-renew |
| 4 | Should free Normal calls be limited? | One upcoming Normal booking per user |
| 5 | Cancellations and refunds: can users cancel? What happens if the astrologer doesn't call or join? Is a subscription credit used up if the user misses the call? | No in-app cancellation. The owner refunds from the Razorpay dashboard. Missed calls use the credit. The policy must be written on the Refund Policy page. |
| 6 | For phone calls, an astrologer dialling from their personal phone shows their own number to the user. Users could then contact them directly and skip the app and its payments. Use a number-masking telephony service? | The astrologer calls from their own phone, as the brief describes. Masking is a separate paid service and is not built. |
| 7 | Should astrologers mark phone calls as "Done" or "Didn't answer" so History can show a status? | No. Past phone calls show "Phone call". |
| 8 | Call duration: one setting per call type or one for all? What default length? | Per call type, choosing 10/15/30 min, default 15 min |
| 9 | What happens when an in-app call runs out of time? | A "2 minutes left" notice, then the call ends |
| 10 | Should in-app chat messages be saved? | No |
| 11 | Who can delete blog comments? (Important with a vulnerable audience.) | The commenter, the post's astrologer and the owner |
| 12 | Which fields go on the astrologer card? | Name, expertise, languages, years of experience |
| 13 | Does "custom link for astrologers" mean one shared panel link, or a personal link for each astrologer? | One shared link: `/astrologer` |
| 14 | Should the owner see a list of bookings and payments in the owner panel? | No. Use the Razorpay dashboard. |
| 15 | App name, logo and icon (needed for the install manifest) | **Decided 2026-10-02:** name "Astro Shashank", logo `frontend/public/logo.jpg`. The logo's wordmark reads "Astromaitreyi"; owner to confirm or replace it before launch. |
| 16 | Many people don't know their exact birth time. Offer an "I don't know" option? | No. It stays required, as in the brief. |
| 17 | Show a small mental-health helpline note in Settings, e.g. Tele-MANAS (free, 24×7): **14416**? | Recommended, but not built until the owner approves |
| 18 | India's DPDP Rules (notified Nov 2025, fully in force around May 2027) give users the right to have their data erased. Add a "Delete my account" option? | Not built. Deletion requests come in through the Contact page. Check with a lawyer. |
| 19 | India only (IST times, +91 numbers)? | Yes |

## 17. Research notes and platform limits

Checked on 30 Sep 2026.

**Razorpay**

- Orders must be created on the server with the amount in paise. Razorpay can't capture payments made without an `order_id` and refunds them automatically. The signature check is `HMAC_SHA256(order_id + "|" + razorpay_payment_id, key_secret)`, done on the server. ([Razorpay: integration steps](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/))
- The webhook `X-Razorpay-Signature` is an HMAC SHA256 of the **raw** body, keyed with the webhook secret. Duplicate deliveries share the same `x-razorpay-event-id`. ([Razorpay: validate webhooks](https://razorpay.com/docs/webhooks/validate-test/))
- **Live mode needs policy pages.** Razorpay checks your website before activating payments. It requires Terms and Conditions, Privacy Policy, Shipping Policy, Contact Us, and Cancellation and Refunds pages, plus About Us and Pricing for additional websites. For "Shipping", state that the service is delivered online or by phone and nothing is shipped. ([Razorpay: business website details](https://razorpay.com/docs/payments/dashboard/account-settings/business-website-details/))
- Astrology businesses do use Razorpay (Astrotalk is a published Razorpay customer), but activation still depends on Razorpay's review. ([Razorpay blog: Astrotalk](https://razorpay.com/blog/astrotalk-explores-global-payments-with-razorpay-international-payments/))
- Razorpay's "Subscriptions" product is for automatic recurring charges. "₹999 for 4 calls", as described, is a one-time pack, so it is a normal order.

**Installing the app (PWA)**

- Chrome needs HTTPS and a manifest (name, icons, start_url, display). Its published criteria also require a service worker with a fetch handler before Chrome shows its install prompt. ([Chrome: installability criteria](https://developer.chrome.com/blog/update-install-criteria))
- Safari on iPhone and iPad has no install prompt (`beforeinstallprompt` isn't supported). Users have to tap Share → Add to Home Screen, which is why the app shows those steps. ([web.dev: installation prompt](https://web.dev/learn/pwa/installation-prompt))

**In-app calls**

- The speaker/earpiece switch relies on `setSinkId()`.
  - **Supported:** Chrome and Edge on desktop, Firefox on desktop (116+), Safari 18.4+ on Mac and iPhone.
  - **Not supported:** Chrome for Android, Firefox for Android, Samsung Internet. That covers most Android phones, so on those the button is hidden and the phone decides where sound goes.
  - Whether an iPhone offers both earpiece and loudspeaker must be tested on a real device.
  - ([caniuse: setSinkId](https://caniuse.com/mdn-api_htmlmediaelement_setsinkid))
- Phones route audio to wired or Bluetooth earbuds by themselves, but Chromium has had Bluetooth routing bugs on Android, so test with real earbuds. ([Chromium issue 40222537](https://issues.chromium.org/issues/40222537))
- Without a TURN relay, roughly 10–20% of calls can't connect, often because of mobile-carrier NAT. ([BlogGeek.me: TURN](https://bloggeek.me/webrtcglossary/turn/))

**Google sign-in**

- Verify the ID token on the server (signature, `aud`, `iss`, `exp`) and use `sub` as the user id. ([Google: verify the ID token](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token))
- Sign-in inside an installed iPhone app is fragile. Popups and redirects to other sites can open in a separate Safari context whose cookies the installed app can't see, leaving users stuck on the login screen. Start with Google's redirect mode (`ux_mode: "redirect"` with `login_uri` pointing at our own `/api/auth/google`), and **test sign-in from the installed app on a real iPhone** before launch.

**Database**

- On Neon, use the pooled connection (`-pooler`) for the app and the direct connection for migrations, and keep `sslmode=require`. ([Neon: connection pooling](https://neon.com/docs/connect/connection-pooling))
- Neon supports `btree_gist`, which the no-overlap constraint needs. ([Neon: btree_gist](https://neon.com/docs/extensions/btree_gist))
- Prisma 8 is a release candidate. Prisma doesn't recommend it for production yet and expects the stable release in October 2026. ([Prisma: release status](https://www.prisma.io/docs/orm/release-status))

**Privacy law (India)**

- The DPDP Rules were notified on 13 Nov 2025 and phase in over 18 months, giving users rights that include erasure. The app stores birth details and phone numbers, so the Privacy Policy must explain what is collected and why. ([PIB: DPDP Rules 2025](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190014))

## 18. Definition of done

- [ ] The app installs on Android (Chrome's install button) and on iPhone (Add to Home Screen), and opens full-screen from its icon.
- [ ] A visitor sees the astrologer list without logging in.
- [ ] Each call type books correctly. The phone number is required only for Urgent and Subscription.
- [ ] Urgent and Subscription bookings **never** show a Join button. The summary, success screen and History all show "{Astrologer name} will call you at {time} on {number}".
- [ ] When the owner changes a price, new bookings charge the new price and old bookings are unchanged.
- [ ] If two people book the same slot at the same moment, only one succeeds.
- [ ] The payment tests in [§12](#12-security-checklist) pass.
- [ ] For Normal calls, the call room shows the right message before the start time, while waiting, during the call and after it.
- [ ] An in-app call between an Android phone and an iPhone on mobile data works (TURN), including mute, chat, plugging in earbuds mid-call, and the speaker switch where supported.
- [ ] A user can't see another user's data, and an astrologer can't see users who didn't book them (tested through the API, not just the UI).
- [ ] The astrologer preview looks exactly like the real Home card.
- [ ] A Lighthouse accessibility audit shows no contrast or tap-target failures, and animations stop when "reduce motion" is on.

## 19. Version 2 changes: brand, media, photos, Medium-style blogs, UI polish

The owner requested these on 2026-10-02, after Steps 1–15. They extend the spec above. Where they conflict with an earlier section, **§19 wins**. They're tracked as items 11–17 in `docs/PENDING_FIXES.md`.

### 19.1 Media storage (Cloudflare R2)

**Why R2:** it was the best free option for images, checked 2026-10-02.

| Option | Free storage | Downloads | Verdict |
|---|---|---|---|
| **Cloudflare R2** | **10 GB** | **Unlimited, $0** | **Chosen**: free downloads matter most for images shown to every user. Cloudflare may ask for a card or PayPal to enable R2 (no charge within the free tier). |
| Neon Object Storage | 5 GB per project | Only 5 GB a month on the Free plan, **shared with database traffic** | Fine for development tests, too small to serve images to users |
| Cloudinary / ImageKit | Small credit-based quotas | Counted against the quota | Good image tools, but quotas run out quickly |
| AWS S3 | 5 GB for 12 months only | Paid egress | Not free long-term |

**How it works:**
- **Upload path:** the browser sends the file to our backend (`multipart/form-data`, 5 MB maximum). The backend:
  - checks the real type from the file's bytes (JPG, PNG or WebP only)
  - resizes with `sharp`: profile photos to 512×512 square WebP, blog images to at most 1600px wide WebP
  - strips all metadata, including GPS location
  - uploads to R2 with `@aws-sdk/client-s3`, using R2's S3-compatible endpoint
  - records a `MediaAsset` row
- **Serving:** images are public, read-only URLs under `R2_PUBLIC_BASE_URL`. Use the `r2.dev` URL **in development only**, because Cloudflare rate-limits it. Production needs a custom domain on Cloudflare, e.g. `media.<yourdomain>`.
- **Storage keys:** use random keys, e.g. `astrologers/<id>/photo-<uuid>.webp` and `blogs/<postId>/<uuid>.webp`. Never use the original filenames.
- **Cleanup:** when a photo is replaced or removed, or a post or image is deleted, delete the R2 object and its `MediaAsset` row. Clean up images uploaded to a draft but never used after 24 hours.
- **Security:** see §12, "Image uploads".

### 19.2 Astrologer profile photos

- **Upload:** in the astrologer's Profile, upload, crop to a square, preview, save, change or remove a photo (§8.2). The Preview card shows the photo.
- **Where it shows:** wherever an astrologer appears (§5.6). If loading fails, fall back to initials.
- **Owner panel:** the owner's "view full profile" shows the photo with a **Remove photo** button, for moderation.
- **Accessibility:** the photo's alt text is the astrologer's name.

### 19.3 Medium-style blogs (writing and reading)

Take the look and flow from Medium: a calm, distraction-free writing canvas and a clean reading column.

**Editor (astrologer panel)**, built with **TipTap**, a headless editor built on ProseMirror:
- A large borderless **Title** field, then the body. No visible toolbar until you need it.
- A **floating formatting toolbar** appears when text is selected. It offers:
  - **Bold**, *Italic*, Underline
  - Heading (H2) and Subheading (H3)
  - Quote
  - Bulleted and numbered lists
  - Link: http/https only, opens in a new tab with `rel="noopener noreferrer nofollow ugc"`
- Keyboard shortcuts: Ctrl/Cmd+B, I, U and K.
- A **"+" button** on an empty line inserts an **image**. It uploads through §19.1, shows progress, and accepts an optional caption.
- **Cover image:** optional, picked or uploaded at the top. If none is set, the first image in the body is used on the list.
- **Autosave:** drafts save automatically every few seconds while typing, showing "Saving…" then "Saved". Save draft, Publish, Unpublish and Delete stay as before.
- **Mobile:** the toolbar works with touch selection, and the editor is usable at 360px.

**Storage and safety:**
- The body is stored as TipTap JSON (JSONB).
- On save, the server validates the document against an allow-list:
  - nodes: doc, paragraph, heading levels 2–3, blockquote, bulletList, orderedList, listItem, image (only our own `MediaAsset` URLs), hardBreak
  - marks: bold, italic, underline, link
- Limits: at most 200 KB of JSON and 20 images per post. Anything else is rejected.
- On save, the server also derives `excerpt` (plain text, about 200 characters) and `readingMinutes` (about 200 words per minute, at least 1).
- **Migration:** convert existing plain-text posts to JSON paragraphs, splitting on blank lines.

**Reading view (user app):**
- A centred column of about 680px.
- A large title, then the author row: photo, name, date, "N min read".
- Comfortable body text, about 1.125rem with line-height 1.7.
- Headings, quotes with a left rule, lists, and full-column images with captions.
- Then likes and comments as before.

**List:** see §5.4. Cards show the cover thumbnail, title, excerpt, author, date and reading time. Keep them readable at 360px.

### 19.4 UI consistency and polish

The owner reported the UI as inconsistent and broken in places. Make every screen look like one calm, simple app, using the `design.css` tokens.

**Layout:**
- **One shared layout** for every user page (Home, Blogs, blog post, History, Settings, policy pages): a **top app bar** with the logo and "Astro Shashank", and one content width, centred (about 960px for lists, 680px for reading and forms).
- **One page-header pattern:** title and optional subtitle, the same size and spacing everywhere. Today Home, Blogs, History and the policy pages each look different.
- **Home:** a centred, responsive card grid (1 column on phones, 2 on tablets, 3 on desktop). Cards have equal heights and the Call button keeps its normal height.
- **Footer:** policy links sit at the end of page content, not floating mid-page. No content may be hidden behind the bottom tab bar: reserve its height plus the safe area.
- **Bottom tab bar:** on wide screens, align it with the content width, or switch to top navigation at 1024px and above.
- **Panels:** the astrologer and owner panels use the same app bar (logo plus "Astrologer panel" or "Owner panel"), the same content width, and the same section tabs as each other.

**Components:**
- The read-only email field looks disabled (neutral), not highlighted in yellow.
- Status badges size to their text.
- Buttons, cards, chips and inputs use consistent sizes, padding and radius.
- One time format everywhere, e.g. "5:30 pm".

**Known bugs to fix as part of this** (see `docs/PENDING_FIXES.md`): the overflowing time picker, the double-height Call button, and stretched badges.

**Checks:**
- Check every screen at 360px, 768px and 1280px: no sideways scroll, all tap targets at least 48px.
- Lighthouse accessibility: no contrast failures.
- Update `docs/DESIGN_SYSTEM.md` with the final layout rules.

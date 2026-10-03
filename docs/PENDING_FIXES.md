# Pending fixes

These fixes come from browser reviews of Steps 12–15, done on 2026-10-02 against the running app with real Razorpay **test-mode** payments. They're in two groups:
- **Items 1–10 are bugs.** Items 1–6 were requested twice and never applied. Items 7–10 came from the Step 14 review.
- **Items 11–16 are owner change requests** (brand, media, photos, Medium-style blogs, UI polish). Their full spec is in README §19.

Do the bugs (1–10) first, then 11–16.

Work through them in order. When an item is fixed:
- mark it **Done** in the table
- add a line to [CHANGELOG.md](CHANGELOG.md)
- remove its row from "Known issues" in [PROGRESS.md](PROGRESS.md)

Delete this file once every item is Done.

Last updated: 2026-10-03

## Summary

| # | Area | Problem | Severity | Status |
|---|---|---|---|---|
| 1 | Payments | The webhook rejects payments that include Razorpay's customer fee, but still replies 204 | **High**: a user can pay and get no booking or credits | **Done** |
| 2 | Booking UI | The time picker grid overflows, so time chips are 560px wide and the sheet scrolls sideways | Medium | **Done** |
| 3 | Home | The Call button is double height on cards without expertise or languages | Low | **Done** |
| 4 | Astrologer panel | The Bookings subtitle still says "Normal calls" | Low | **Done** |
| 5 | Credits | Shows "1 calls left" | Low | **Done** |
| 6 | Pack summary | "Price ₹999" reads like the price of one call | Medium | **Done** |
| 7 | Blogs | Deleting a post that has comments fails with a 503 | **High** | **Done** |
| 8 | Sessions | The same multi-row delete revokes astrologer sessions on deactivate and reset password | **High**: deactivation may not take effect | **Done** |
| 9 | Logging | Generic 503 responses hide the real error | Medium | **Done** |
| 10 | Polish | Comment-delete confirmation, kept comment drafts, stale counts, stretched badges | Low | **Done** |
| 11 | Brand | Use the Astromaitreyi name and `frontend/public/logo.jpg` everywhere, PWA icons included | Change request | **Done** |
| 12 | PWA | 40 of the 50 precached files are fonts (942 KB), 24 of them in unused scripts | Medium | **Done** |
| 13 | Media | Cloudflare R2 storage and a safe image upload pipeline | Change request | **Done** |
| 14 | Astrologers | Profile photo upload, shown everywhere an astrologer appears | Change request | **Done** |
| 15 | Blogs | Medium-style rich editor (headings, bold, italic, underline…), images, reading view | Change request | **Done** |
| 16 | UI | Consistent, polished layout across every screen and panel | Change request | **Done** |

### C3 browser review

| # | Fix | Status |
|---|---|---|
| 0 | Rename user-visible branding to Astromaitreyi | **Done** |
| 1–2 | Keep the editor mounted during first save; stop autosave after a failure until the next edit | **Done** |
| 3–6 | Load italic fonts, suppress initial close animations, neutralize the email field and update the test fixture | **Done** |
| 7–10 | Return 400 for media ownership, reposition image insert, add a small header asset and trim lazy chunks from precache | **Done** |
| 11–13 | Theme crop sliders, style cover upload and confirm profile-photo removal | **Done** |

There is also one **owner action** that isn't a code change: in the Razorpay dashboard, switch the fee bearer from the customer to the business. Until then, customers silently pay about 2% more than the price the app shows, which breaks README §10.5 ("no hidden charges"). Item 1 must be fixed either way, because the fee setting can change.

## Details

### 1. Webhook amount check fails when Razorpay adds a customer fee

**Evidence.** Payments read back from the Razorpay test API:

| Payment | `payment.amount` | `payment.fee` | Order amount |
|---|---|---|---|
| Urgent | 30600 | 600 | 30000 |
| Pack | 101898 | 1998 | 99900 |

**The bug:**
- `webhook()` in `backend/src/payment/payment-service.ts` passes `payment.amount` to `settle()`.
- `settle()` compares it with the stored order amount, gets a mismatch and returns `kind: "invalid"`.
- The route still replies **204**, so Razorpay never retries.

**What happens to users.** If the browser closes after paying but before `/api/payments/verify` runs:
- the Urgent booking is never confirmed
- pack credits are never added
- no refund is made

The late-payment refund also refunds only the order amount, not what the customer actually paid.

**Fix:**
- Validate against the **order** amount. `payment.order_id` maps to our stored order, so use `payment.amount - payment.fee` or fetch the order.
- Log non-sensitive details whenever a webhook is treated as invalid.
- Refund the full amount actually paid.

**Tests:** a webhook for an Urgent payment and for a pack payment, each including a customer fee, must confirm the booking or add the credits.

### 2. Time picker overflow

**The bug:**
- `.slot-picker` in `frontend/src/design.css` is a grid with no column template.
- Its column grows to the width of the 14-date row: `scrollWidth` 1705px inside a 608px sheet.
- As a result, each time chip is 560px wide and the whole sheet scrolls sideways.

**Fix:** add `grid-template-columns: minmax(0, 1fr)` to `.slot-picker`, and `min-width: 0` to its children. Then only the date row scrolls, and the time chips wrap.

**Check:** at 360px and at 1280px, the time chips wrap, and only the date row scrolls horizontally.

### 3. Call button height

On an `AstrologerCard` without expertise or languages (for example "Yash Rastogi"), the Call button stretches to fill the card height. Keep it the normal button height in every card.

### 4. Astrologer Bookings subtitle

In `frontend/src/screens/AstrologerPage.tsx`, change "Your upcoming and past Normal calls." to "Your upcoming and past calls." Phone calls are listed there too.

### 5. Plural for credits

The call-type sheet in `frontend/src/screens/HomePage.tsx` shows "1 calls left". Use "1 call left" or "N calls left" everywhere credits appear.

### 6. Pack price wording on the summary

With 0 credits, the summary shows "Price ₹999", which reads like the price of one call. Show "₹999 for 4 calls (this booking uses 1)", using `subscriptionPricePaise` and `subscriptionCallsPerPack` from Settings.

### 7. Deleting a blog post that has comments fails

**Evidence:**
- `DELETE /api/astrologer/blogs/:id` returned **503**, "The post could not be deleted. Please try again.", twice, for a post with 2 comments and 0 likes.
- After those 2 comments were deleted one at a time, the same request returned **204**.

**Likely cause:** in `deleteAstrologerPost()` (`backend/src/blog/blog-service.ts`), `transaction.orm.public.BlogComment.where({ blogId }).delete()` fails when more than one row matches. Prisma 8's `.delete()` may expect a single row.

**Fix:** use the Prisma 8 way to delete all matching rows.

**Test:** run against a **Neon branch, never the main database**. It should delete a post that has 2 likes and 2 comments.

### 8. The same pattern may break session revocation

**Where:** in `backend/src/owner/owner-service.ts`, deactivate and reset-password call `transaction.orm.public.Session.where({ role: "astrologer", subjectId: id }).delete()`. `replaceTemporaryPassword()` in `backend/src/astrologer/astrologer-service.ts` does the same.

**The risk:** if an astrologer is logged in on two devices, this may fail. Their sessions would then survive a deactivation or a password reset.

**Fix:**
- Check this works with 2 or more sessions, and fix it as in item 7.
- Search the backend for every other `.where(...).delete()` and `.where(...).update()` that can match several rows, for example `expireElapsedHolds` and webhook updates, and check each one.

### 9. Log real errors behind generic 503s

Many routes catch every error and return a 503 without logging. That hid the cause of item 7. Log the error class and message wherever a route returns a generic 503, without personal data such as birth details, phone numbers or tokens (see `AGENTS.md`).

### 10. Polish

- Ask for a short confirmation, or offer Undo, when a user or astrologer deletes a comment. Today it deletes instantly. The owner's Recent comments list already confirms.
- Keep a visitor's typed comment across the Google sign-in redirect, using `sessionStorage`. Today the text is lost.
- Refresh the like and comment counts in the astrologer's post list after changes, or when reopening the list.
- Stop the "Draft" and "Published" badges in the astrologer's post list stretching to full width.

### 11. Brand: Astromaitreyi and the logo

**Done 2026-10-03.** User-visible branding, Checkout and the manifest use Astromaitreyi. Shared app/panel branding uses the unchanged JPEG. Generated install icons use a scripted monogram crop with maskable safe-zone padding.

**The name Astromaitreyi replaces AstroWebApp everywhere users see it:**
- `index.html` `<title>` and the PWA manifest `name` and `short_name`
- the app header and the panel headers
- the install banner text and the offline screen
- the policy pages
- the Razorpay Checkout `name`

Docs can keep describing the codebase as-is.

**Use `frontend/public/logo.jpg` (1254×1254 JPEG) as the logo:**
- **App header and panels:** show the logo next to the name, about 32–40px tall, with alt text "Astromaitreyi".
- **Login screens and the offline screen:** show it larger.
- **Razorpay:** pass the logo as Checkout's `image`.

**PWA icons:** the full logo includes a small wordmark that is unreadable at icon size. So:
- Crop the **"AM" ring monogram** on its cream background.
- Generate 192 and 512 icons, a maskable 512 icon with the monogram inside the 80% safe zone, and an `apple-touch-icon`, using `pwa-assets.config.ts`.
- Use the cream background as the manifest `background_color`.
- Remove the placeholder "A" icon.

**Check:** run `npm run build`; DevTools → Application → Manifest shows the new name and icons with no errors, and the header shows the logo on every screen.

### 12. Trim precached fonts

The service worker precaches 50 files (942 KB). 40 of them are Nunito fonts: 24 are Cyrillic or Vietnamese subsets, and each weight has a legacy `.woff` duplicate of its `.woff2`.

**Fix:**
- Precache only the `.woff2` files for `latin` and `latin-ext`, and import only those subsets.
- Leave any other font files to load on demand. Don't precache them.

**Check:** the build's precache size drops by roughly 700 KB, and text still renders in Nunito.

### 13. Media storage: Cloudflare R2 and the upload pipeline

**Done 2026-10-03.** Added the R2-backed, metadata-stripping WebP pipeline, media records, replacement/deletion and 24-hour cleanup, CSP media origin, mocked storage tests and owner setup instructions.

Build README §19.1:
- Add the R2 env vars to `backend/.env.example` and `docs/SETUP.md`.
- Add the `MediaAsset` table.
- Add a shared upload service. For each upload it checks the real file type, 5 MB maximum, then resizes and re-encodes with `sharp` to WebP, stripping metadata including GPS, uploads with `@aws-sdk/client-s3` under random keys, and records the `MediaAsset` row.
- Deleting or replacing an image removes the R2 object.
- Clean up unused draft uploads after 24 hours.
- Add the media domain to the CSP `img-src`.
- In tests, mock R2.
- Document the owner's setup in `docs/SETUP.md`: create a Cloudflare account, enable R2 (it may ask for a card), create a bucket and an API token, then development on `r2.dev` and production on a custom domain.

### 14. Astrologer profile photos

**Done 2026-10-03.** Astrologers can preview a square crop and save, change or remove their own photo. Public cards, bookings, calls, blog author rows and owner views use it with initials fallback; the owner can remove it.

Build README §19.2, using the item 13 pipeline:
- **Astrologer Profile:** upload, square crop, preview, save, change or remove.
- **Display:** the photo shows wherever an astrologer appears, falling back to initials.
- **Owner panel:** "view full profile" shows the photo with **Remove photo**.
- **Access:** only the astrologer can change their own photo; the owner can remove it.

**Tests:** the access rules, plus rejection of non-images and files over 5 MB.

### 15. Medium-style blogs

**Done 2026-10-03.** Blog bodies are validated TipTap JSONB with rich editing, body/cover uploads, autosave, derived summaries, safe React rendering, richer list/reading layouts and a migration for existing text.

Build README §19.3:
- **Editor:** TipTap with a floating toolbar offering bold, italic, underline, H2, H3, quote, lists and link, plus a "+" image insert with captions, an optional cover image, autosave, and Ctrl/Cmd shortcuts.
- **Server:**
  - validate the JSON against the allow-list
  - limits: 200 KB and 20 images
  - images only from our own `MediaAsset` URLs
  - derive `excerpt` and `readingMinutes` on save
- **Migration:** convert existing plain-text posts.
- **Reading view:** a centred column of about 680px, the author row with "N min read", and comfortable typography. Render with React from the JSON, never `dangerouslySetInnerHTML`.
- **List:** cards with a cover thumbnail and reading time.

**Tests:**
- disallowed nodes or marks, `javascript:` links and foreign image URLs are rejected
- a valid document round-trips unchanged
- the plain-text migration works

### 16. UI consistency and polish

**Done 2026-10-03.** User screens and panels share the app-brand/app-bar treatment, content widths and page headers. Navigation moves from the bottom to the app bar at 1024px. Read-only fields, badges, time text and the Home footer now follow one pattern. All 18 routed/offline states passed rendered checks at 360px, 768px and 1280px.

Build README §19.4: one shared app bar with the logo, one content width and page-header pattern, a centred Home grid with equal cards, a fixed footer position, nothing hidden behind the tab bar, matching panels, a neutral read-only field style, consistent components and one time format.

Items 2, 3 and the badge part of 10 belong here too.

**Check:** every screen at 360px, 768px and 1280px, with before and after notes in `docs/DESIGN_SYSTEM.md`.

## Owner actions (not code)

- **Razorpay:** switch the fee bearer to the business (see item 1).
- **Cloudflare R2:** create the account, enable R2, create the bucket and an API token, and put the values in `backend/.env` (item 13).
- **Logo:** confirm or replace it, since the wordmark reads "Astromaitreyi" (item 11).
- **Policy pages:** replace every "[Owner: …]" placeholder before applying for Razorpay live mode.

## Verified working in the reviews

Don't change these:
- payment signature checks
- ownership checks
- browser price ignored
- replayed webhooks ignored
- credits never below 0
- pack added once
- phone-call cards with no Join button
- the phone-removal rule
- the blog permission scopes
- plain-text rendering of posts and comments
- the comment rate limit (5 per minute)

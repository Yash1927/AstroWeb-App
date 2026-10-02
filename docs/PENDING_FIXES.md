# Pending fixes

These fixes come from browser reviews of Steps 12–14, done on 2026-10-02 against the running app with real Razorpay **test-mode** payments. Items 1–6 were requested twice and never applied. Items 7–10 are new from the Step 14 review.

Work through them in order. When an item is fixed:
- mark it **Done** in the table
- add a line to [CHANGELOG.md](CHANGELOG.md)
- remove its row from "Known issues" in [PROGRESS.md](PROGRESS.md)

Delete this file once every item is Done.

Last updated: 2026-10-02

## Summary

| # | Area | Problem | Severity | Status |
|---|---|---|---|---|
| 1 | Payments | The webhook rejects payments that include Razorpay's customer fee, but still replies 204 | **High**: a user can pay and get no booking or credits | Not started |
| 2 | Booking UI | The time picker grid overflows, so time chips are 560px wide and the sheet scrolls sideways | Medium | Not started |
| 3 | Home | The Call button is double height on cards without expertise or languages | Low | Not started |
| 4 | Astrologer panel | The Bookings subtitle still says "Normal calls" | Low | Not started |
| 5 | Credits | Shows "1 calls left" | Low | Not started |
| 6 | Pack summary | "Price ₹999" reads like the price of one call | Medium | Not started |
| 7 | Blogs | Deleting a post that has comments fails with a 503 | **High** | Not started |
| 8 | Sessions | The same multi-row delete revokes astrologer sessions on deactivate and reset password | **High**: deactivation may not take effect | Not started |
| 9 | Logging | Generic 503 responses hide the real error | Medium | Not started |
| 10 | Polish | Comment-delete confirmation, kept comment drafts, stale counts, stretched badges | Low | Not started |

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

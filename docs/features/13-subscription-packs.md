# Step 13: Subscription packs and credits

- **Status:** Done
- **Spec:** README §4, §5.3, §6.1, §6.2 and §11
- **Started:** 2026-10-02
- **Finished:** 2026-10-02

## Goal

Let a signed-in user book a Subscription phone call with an existing credit or buy a one-time Razorpay pack during booking. Credit consumption and pack settlement remain atomic and idempotent, and the current balance appears in the booking flow, success screen and History.

## Plan

- **Screens and UI:** Show the Settings-backed pack price and size or the signed-in user's available credits in the call-type sheet and summary; reuse the phone booking and Razorpay flow; show the remaining balance after success and at the top of History.
- **API:** Return subscription credits with the signed-in user's own session/details and booking history; make `POST /api/bookings` consume an existing credit or create a `subscription_pack` payment/order when none remain; return the resulting balance after direct or paid confirmation.
- **Database:** Use the existing `User.subscriptionCredits`, `Booking.usedCredit` and `Payment.purpose=subscription_pack` fields. Guard credit consumption with an atomic positive-balance update, and make pack settlement add the purchased pack size and consume one credit only on the first successful confirmation.
- **Real-time:** No changes.
- **New libraries:** None.

## Edge cases

- Two simultaneous Subscription bookings against one remaining credit cannot both confirm or take the balance below zero.
- Checkout verification and a webhook for the same pack add credits and confirm the booking only once.
- A pack stores the amount charged when the order is created; later Settings changes apply only to later purchases.
- A purchased pack size is resolved from the payment-time snapshot rather than a later owner edit.
- Subscription bookings always require a valid saved phone number and always use phone delivery.

## Test plan

- **Automated:** Add concurrency coverage for one remaining credit, pack settlement replay/verify-webhook convergence, Settings-owned pack price and size, API shaping, Home/History balance wording, and the existing backend/frontend checks.
- **Manual:** Follow the Step 13 flow once with credits and once with no credits, verify Razorpay charges the current pack price, confirm the remaining balance in success and History, and inspect phone-call cards in both user and astrologer views.

## As built

- Home silently reads the signed-in user's current balance for the call-type sheet. Subscription shows the Settings pack price/size at zero credits, or the number of calls left when credits exist. Summary uses **Confirm booking** and one credit when covered; otherwise it uses the pack price and Razorpay Checkout.
- `POST /api/bookings` first attempts a conditional positive-balance decrement inside the booking transaction. A winner creates a confirmed phone booking with `usedCredit=true`; a concurrent loser cannot make the balance negative and continues into the pack-purchase path.
- With no credit, a positive pack price creates a ten-minute hold, server-priced Razorpay order and `Payment(purpose=subscription_pack)`. A zero-price pack adds the configured calls and uses one immediately without Checkout.
- Migration `20261002T0936_subscription_pack_credits` adds `Payment.creditsPurchased`. Order creation stores the current pack size so a later owner edit cannot change an in-flight purchase.
- Payment settlement conditionally claims the stored Payment. Only that database winner can add the snapshotted credits, consume one for the linked booking, set `usedCredit=true` and confirm it. Verification, webhook races and retries return the existing state without adding the pack twice.
- Subscription confirmation returns the current balance. Success shows it, and `GET /api/me/bookings` includes it so History can show **Subscription calls left: N**.
- Subscription bookings reuse the Step 12 phone summary, success and user/astrologer booking cards, including the saved-phone requirement and no Join action.

## How to try it

1. Start both development servers with Razorpay test credentials and the signed webhook from `docs/SETUP.md`.
2. Sign in as a complete user with a valid phone and zero credits. Choose Subscription, a date and a time.
3. Confirm the sheet and summary use the current Settings pack price and size, then complete Checkout.
4. Confirm the success screen and History show the pack size minus one. The booking must be a phone call with no Join button; the astrologer Bookings section must show its tap-to-call number.
5. Book another Subscription slot. It should say **N calls left**, use **Confirm booking**, skip Checkout and reduce the History balance by one.
6. For a concurrency check, send two Subscription booking requests against one remaining credit for different free slots. At most one can consume that credit; the other must receive a pack Checkout response rather than taking the balance below zero.

## Follow-ups and known issues

A real Razorpay test-mode pack payment and Dashboard webhook delivery remain a manual check. Automated tests mock the provider and prove the application-side signature, ownership, idempotency and credit accounting behavior.

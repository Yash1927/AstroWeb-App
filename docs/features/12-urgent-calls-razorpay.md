# Step 12: Urgent calls with Razorpay

- **Status:** Done
- **Spec:** README §4, §5.2, §5.3, §5.5, §6.1, §6.2, §6.4, §8.4, §11, §12 and §17
- **Started:** 2026-10-02
- **Finished:** 2026-10-02

## Goal

Add ten-minute payment holds and Razorpay payment confirmation for paid Normal and Urgent bookings. Urgent bookings are delivered by phone, appear correctly in both booking lists, and protect the saved phone number while a future phone call exists.

Subscription credit packs remain outside this step.

## Plan

- **Screens and UI:** Load Razorpay Checkout only when payment starts, prefill the signed-in user's contact details, handle dismissal/failure/late-refund messages, and add phone-specific summary, success and booking-card states.
- **API:** Extend booking creation to return a server-priced Razorpay order for a paid booking; add signed verification and raw-body webhook endpoints; keep all ownership, signature and amount checks on the server.
- **Database:** Use the existing `Payment`, `WebhookEvent` and booking hold fields. Confirm a booking and record its payment together, deduplicate webhooks, and mark/refund a paid booking if its slot has since been taken.
- **Real-time:** No changes.
- **New libraries:** Official `razorpay` Node SDK in the backend.

## Edge cases

- A browser-supplied price cannot affect the amount; Settings is authoritative.
- The same payment arriving through verification and a webhook confirms only once.
- A replayed webhook is a no-op.
- A payment that arrives after another booking took the held time is refunded automatically.
- Closing Checkout or receiving a payment failure leaves a calm, retryable message.
- A saved phone number cannot be cleared while a confirmed future phone booking exists.

## Test plan

- **Automated:** Test valid and forged signatures, webhook replay, server-owned prices, verify/webhook idempotency, late-payment refund, phone-number removal protection, backend type checking, all backend tests, frontend lint/tests/build.
- **Manual:** Create an Urgent booking, inspect Checkout prefill and amount, test dismissal/retry and success, then inspect both user and astrologer phone-call cards and the Settings phone rule.

## As built

- `POST /api/bookings` still confirms zero-price calls immediately. A positive-price Normal or Urgent call now creates a server-priced Razorpay order, ten-minute `pending_payment` hold and linked created Payment. Positive-price Subscription stays deferred to Step 13.
- The official `razorpay` 2.9.8 SDK creates orders and issues full late-conflict refunds. Only the public key id, order details, expiry and user prefill reach the browser.
- `POST /api/payments/verify` checks the timing-safe Checkout HMAC and stored user/booking/order ownership. `POST /api/razorpay/webhook` is mounted with a bounded raw body before JSON parsing, checks its separate HMAC, de-duplicates event ids and shares idempotent settlement with verification.
- Home loads Standard Checkout only when payment starts, preserves the order for safe retry after dismissal/failure and shows the specified refund/success wording.
- History and astrologer Bookings render phone calls without Join actions. Users see their call message and Settings link; astrologers get the user's number as a `tel:` link.
- Settings returns the README wording beside the phone field when a user tries to remove it while a confirmed future phone call exists.
- Tests mock the payment gateway and browser Checkout. They cover server-owned amount, signatures, ownership, replay, verify/webhook convergence, overlap refund, phone cards and phone removal.

No database migration was created because the Step 2 contract already contains every field and uniqueness rule used here.

## How to try it

1. Configure Razorpay test keys and a test webhook as described in `docs/SETUP.md`, then start both development servers.
2. Sign in as a complete user with a valid phone, choose an astrologer, select Urgent and pick a free time.
3. Confirm the summary shows the exact number and Settings price, then choose **Pay**. Check Checkout's name, email, phone and amount prefill.
4. Close Checkout once to see the retry message, then complete a test payment. The success screen should say the astrologer will call; History must have no Join button.
5. Open the astrologer panel's Bookings section. The same booking should show **Phone call · date · time** and a tap-to-call number.
6. Before the booking ends, try clearing the user's phone in Settings. The field should show “You have an upcoming phone call, so we need your number.”

## Follow-ups and known issues

Subscription packs and credits are Step 13. A real Razorpay test success/failure/webhook/refund round trip still needs manual testing; automated tests use provider mocks and cannot prove Dashboard delivery.

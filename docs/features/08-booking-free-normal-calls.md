# Step 8: Booking free Normal calls

- **Status:** Done
- **Spec:** README §4, §6.1 steps 5–7, §6.2–§6.4 step 1 and §11
- **Started:** 2026-10-01
- **Finished:** 2026-10-01
- **Last updated:** 2026-10-02

## Goal

Turn a selected free slot into a confirmed Normal booking. Recheck every server-side rule at confirmation time, rely on the database overlap constraint for races, and finish the Home flow with a summary and animated success screen.

## Plan

- **Screens and UI:** Replace the Step 8 placeholder with a booking summary containing astrologer, call type, IST date/time, duration and server-sourced price. Submit confirmation once, show friendly field-level flow errors, and render the existing scale/check animation with a link to History after success.
- **API:** Add authenticated `POST /api/bookings` with strict Zod validation. Require complete user details, revalidate astrologer eligibility and the exact slot, enforce one upcoming Normal booking, and translate overlap conflicts to `409`.
- **Database:** Reuse `Booking`, `Settings` and the existing `Booking_no_overlap` constraint. In one transaction, expire the selected astrologer's elapsed payment holds and create a confirmed zero-price booking; no migration is planned.
- **Real-time:** No changes.
- **New libraries:** None.

## Edge cases

- Reject missing or wrong-role sessions, incomplete user details, malformed ids/types/timestamps, inactive or hidden astrologers, and starts that are not an exact current slot.
- Read duration and price only from `Settings`. Confirm any zero-price call type immediately; reject a positive price without creating a hold because paid bookings arrive later.
- Reject a second upcoming Normal booking for the same user with a friendly message.
- Let the database exclusion constraint decide simultaneous overlap races. Exactly one insert succeeds and the loser receives the specified `409` message.
- Expire only elapsed `pending_payment` holds for the selected astrologer, inside the same transaction as the insert.

## Test plan

- **Automated:** Test validation/auth/details/eligibility failures, server-owned price and duration, positive-price deferral, zero-price call-mode mapping, free-call limit, expired-hold cleanup, invalid-slot rejection, overlap error mapping, and two concurrent requests for one slot with exactly one success. Extend the Home test through summary, confirmation, success and History navigation.
- **Manual:** Follow the Step 8 Try it out list in `BUILD_PROMPTS.md`, including a second Normal attempt, two-account slot refresh and Neon row inspection.

## As built

- `POST /api/bookings` accepts `astrologerId`, `callType` and an absolute `startsAt` timestamp. Unknown body fields are discarded, so even an added browser price cannot affect the Settings-owned amount. The user guard supplies the account id from the signed user session; the browser cannot choose identity, duration, price, mode or status.
- `backend/src/booking/booking-service.ts` requires complete user details, a phone number for phone-call types, current astrologer eligibility and an exact slot from the Step 7 slot service. It reads price and duration from the singleton `Settings` row.
- A zero-price call skips payment and is inserted as `confirmed`. Normal is always `in_app`; zero-price Urgent or Subscription calls use `phone`. Step 12 turns positive-price Normal/Urgent into a ten-minute hold and Razorpay order; Step 13 does the same for a Subscription pack when no credit remains.
- The booking transaction expires the selected astrologer's elapsed payment holds, enforces the user's one-upcoming-Normal limit and inserts the booking. PostgreSQL's existing `Booking_no_overlap` constraint remains the final arbiter for concurrent requests. Prisma 8's `SqlQueryError.sqlState = "23P01"` shape, including a transaction `cause`, is translated to the specified `409` response.
- Home now moves from slot selection to a summary with server-sourced settings, then submits once and shows the animated success state with a History link. A same-slot conflict stays an error. The Normal-limit response is a calm notice and replaces the repeat confirmation action with **Go to History**.
- The slot service starts the independent Settings, weekly-hours, exception and booking reads together after its eligibility check. A database-service regression holds all four promises open and confirms that every query has started before resolving any one of them.
- Backend service tests cover rule mapping and transaction behavior. HTTP tests issue two same-slot requests concurrently and prove one returns `201` while the constraint loser returns `409`; both now use Prisma's installed `SqlQueryError` class. Home tests cover summary, payload, success, History navigation, overlap feedback and the Normal-limit notice/action.

## How to try it

1. Keep the README default Normal price at ₹0. Sign in as a user with complete details and choose an eligible astrologer, a Normal date and a free time.
2. Check that the summary shows the astrologer, Normal, the IST date and time, duration and “Free”. Select **Confirm booking**.
3. Check that the animated success message shows the same IST time and that **Go to History** opens `/history`, where the call appears under Upcoming.
4. Try to start another upcoming Normal booking with the same user. The summary should show “You already have an upcoming Normal call. You can book another after it ends.” as a calm notice, with **Go to History** instead of **Confirm booking**.
5. With two different signed-in users, load the same slot in two browsers and confirm it at nearly the same time. One should succeed; the other should see “Sorry, this time was just booked. Please pick another time.”
6. In Neon, inspect the successful row: it should be `confirmed`, `normal`, `in_app`, `pricePaise = 0`, have UTC `startsAt`/`endsAt`, and have no hold expiry.
7. A positive-price call opens Razorpay Checkout when it is not covered by a Subscription credit.

## Follow-ups and known issues

- Step 12 added Normal/Urgent payments and phone delivery, Step 13 added Subscription packs, and Steps 10 and 11 completed the Normal call room.
- The simultaneous-request regression uses a deterministic repository for the race but throws Prisma 8's real installed `SqlQueryError` shape. The error shape was confirmed from Prisma's current transaction documentation and installed 8.0.0-rc.13 implementation without querying the main database. A two-browser check against Neon remains manual.

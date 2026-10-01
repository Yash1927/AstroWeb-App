# Step 7: Availability and time slots

- **Status:** Done
- **Spec:** README §4, §6.1 step 4, §6.2, §6.3 and §8.3
- **Started:** 2026-10-01
- **Finished:** 2026-10-01
- **Last updated:** 2026-10-01

## Goal

Let each authenticated astrologer maintain weekly availability and date exceptions. Expose one public, settings-backed slot calculation for the next 14 IST dates and continue the Home booking flow through date and time selection without creating a booking.

## Plan

- **Screens and UI:** Replace the astrologer Availability placeholder with weekly ranges, day-off controls and dated blocked/extra exceptions. Add disabled date chips, time chips, the specified empty-day message and the Step 8 confirmation placeholder to the Home flow.
- **API:** Add protected read/write availability endpoints and `GET /api/astrologers/:id/slots?type=normal|urgent|subscription`. Validate all ranges and calculate slots on the server from the authenticated astrologer's records or the requested public astrologer.
- **Database:** Reuse `AvailabilityRule`, `AvailabilityException`, `Booking` and `Settings`; no contract or migration change is planned. Replace an astrologer's availability in one transaction while preserving bookings.
- **Real-time:** No changes.
- **New libraries:** None.

## Edge cases

- Reject a range unless its end is after its start. Reject overlapping weekly ranges for one weekday and overlapping exception ranges on one date. A whole-date block cannot share its date with another exception.
- Treat weekly ranges as base windows, union extra exception windows, then subtract partial or whole-date blocked exceptions. Adjacent windows may merge; date exceptions never alter another date.
- Use the duration currently stored in `Settings`. Keep only complete duration-sized slots, future starts, and intervals that do not overlap a confirmed booking or an unexpired payment hold.
- Interpret availability clocks and requested dates in `Asia/Kolkata`, emit UTC timestamps, disable today for Normal, and allow today for Urgent and Subscription.
- Reject missing/ineligible astrologers and malformed ids, query strings or availability bodies without exposing private account fields.

## Test plan

- **Automated:** Test weekly windows, blocked and extra exceptions, 10/15/30-minute durations, past removal, confirmed-booking and hold overlap, expired holds, Normal-from-tomorrow, IST-to-UTC timestamps, availability validation/scoping, the public route, and the Home date/time continuation.
- **Manual:** Use the Step 7 Try it out list in `BUILD_PROMPTS.md`, including day-off behavior, partial blocks, extra hours, disabled empty dates and no booking creation.

## As built

- `backend/src/availability/availability-schemas.ts` validates bounded weekly and exception arrays, real dates, `HH:mm` times, end-after-start, whole-date blocks and non-overlap on each day/date. Protected `GET` and `PUT /api/astrologer/availability` derive the astrologer id from the session.
- `backend/src/availability/availability-service.ts` reads and atomically replaces only that astrologer's rules and exceptions. It never updates a Booking row and reports confirmed future bookings that fall outside the new hours so the panel can warn that they remain booked.
- `backend/src/availability/slot-service.ts` is the single slot calculation. It combines weekly and extra windows, subtracts blocks, reads the selected call duration from `Settings`, filters past starts and active booking/hold overlaps, applies Normal-from-tomorrow and converts IST clocks into UTC timestamps.
- Public `GET /api/astrologers/:id/slots?type=…` returns 14 IST dates only for an active, listed, profile-saved astrologer. Home formats the returned UTC instants in IST, disables empty date chips, keeps dates horizontally scrollable with a next-date cue, wraps times into phone-friendly rows and stops after a time is chosen without writing a booking.
- `frontend/src/components/AvailabilityEditor.tsx` supplies the mobile-first weekly/day-off and date-exception editor with field-level errors, first-invalid focus/scroll, a Save-adjacent validation summary, responsive non-overlapping desktop fields, save feedback and the existing-booking warning.
- The existing schema already contained every required table and column, so no migration or dependency was needed. Exception precedence is recorded in [D-014](../DECISIONS.md).

## How to try it

1. Log in at `/astrologer`, replace the temporary password if needed, then open **Availability**.
2. Turn Monday on, add two non-overlapping ranges, mark another weekday off, then save.
3. Add one whole-date block, one partial block on another date and one extra-hours exception, then save. Try overlapping ranges and confirm the page focuses the first error and shows the summary beside Save. At desktop width, confirm the exception fields do not overlap.
4. On Home at 360px, choose this astrologer and a call type, complete the sign-in/details steps, and inspect 14 date chips. Empty dates are disabled, part of the next date remains visible, and time chips wrap to about three per row.
5. Choose a date and time. Confirm the flow shows “Confirming comes in the next step” and no Booking row is created.
6. Change the owner's duration between 10, 15 and 30 minutes and confirm newly requested slots use that step size.

## Follow-ups and known issues

- Booking creation remains Step 8 work.
- A rendered desktop/360px panel and live Neon availability round trip remain part of the manual try-out.

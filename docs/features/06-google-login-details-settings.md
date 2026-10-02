# Step 6: Google login, details form and Settings

- **Status:** Done
- **Spec:** README §2, §5.2, §5.5, §5.6, §12 and §17
- **Started:** 2026-10-01
- **Finished:** 2026-10-01
- **Last updated:** 2026-10-02

## Goal

Add Google Identity Services sign-in in redirect mode, 30-day user sessions, and self-only user details APIs. Continue the Home call flow through sign-in and details collection, and replace the History and Settings placeholders with their signed-out and signed-in Step 6 states.

## Plan

- **Screens and UI:** Add a reusable Continue with Google screen, a validated details form, the authenticated Settings screen, the History sign-in gate, and the Home continuation through the Step 7 time-choice placeholder. Preserve the selected astrologer and call type through Google's redirect by using a server-validated local continuation URL.
- **API:** Add `POST /api/auth/google`, `GET /api/me`, `PUT /api/me` and user logout. Verify Google's double-submit CSRF token and ID token, require a verified email, and resolve every user operation from the user session rather than a request-supplied user id.
- **Database:** Use the existing `User` and `Session` tables. No schema or migration change is planned.
- **Real-time:** No changes.
- **New libraries:** Add `google-auth-library` to the backend for server-side ID-token verification.

## Edge cases

- Reject missing or mismatched Google CSRF tokens, invalid or expired ID tokens, unverified email addresses, missing required claims, and unsafe continuation URLs.
- Keep an existing user's saved details and credits when Google profile claims change; update only the Google email and use the Google name only when creating a user.
- Treat incomplete details as needing the details form. Require a phone only after the common details are complete and the selected call type is Urgent or Subscription.
- Validate future birth dates, local birth times, name and place lengths, gender values, and Indian phone numbers on both client and server.
- Keep History and Settings usable when the Google script or client id is unavailable by showing a calm configuration/loading error instead of a broken control.

## Test plan

- **Automated:** Test Google CSRF/token checks, verified-email enforcement, safe redirects, session creation, user creation/update behavior, self-only `/api/me`, logout, schemas, signed-out gates, details validation, continuation restoration, the phone-only step and Settings saves.
- **Manual:** Follow the Step 6 Try it out list in `BUILD_PROMPTS.md`, including persistence after reload and the HttpOnly cookie check.

## As built

- `backend/routes/UserAuth.ts` accepts the GIS redirect form at `POST /api/auth/google`, compares the double-submit CSRF token, verifies the ID token through `google-auth-library`, requires a verified email, finds or creates by Google subject, creates a 30-day user session and redirects only to a local app URL.
- `backend/routes/User.ts`, `backend/src/auth/require-user.ts` and `backend/src/user/` implement self-only `GET /api/me`, `PUT /api/me` and user logout. Required details, local birth time, non-future birth date, gender and the optional Indian phone format are validated on the server.
- `frontend/src/components/GoogleSignInButton.tsx` renders Google's standard **Continue with Google** button with `ux_mode: "redirect"`, `/api/auth/google` as the callback and the current local flow as button state.
- `frontend/src/components/UserDetailsForm.tsx` supplies the shared field-level validated details form and privacy link. Its phone control shows a fixed `+91` prefix, accepts local digits with spaces/dashes ignored, and submits the canonical number. Empty date of birth has a specific message. `frontend/src/screens/SettingsPage.tsx` adds the avatar, read-only Google email, editable details, policy links, Saved toast and logout. `HistoryPage.tsx` adds the signed-out gate.
- `frontend/src/screens/HomePage.tsx` continues from call type through session check, Google sign-in, missing details and a phone-only Urgent/Subscription step. Step 7 added date/time selection, Step 8 added free confirmation, and Step 12 added paid Urgent Checkout. The astrologer id and call type survive redirect and are removed from the URL after restoration.
- Step 12 prevents the saved phone from being cleared while a confirmed future phone call exists. The server returns the README message at the phone field; changing the number remains allowed and updates later phone-call cards.
- The current `User` and `Session` tables support the implementation without a schema or migration change. See [D-012 and D-013](../DECISIONS.md) for redirect-state and Google-claim reconciliation choices.

## How to try it

1. Configure the Google client exactly as described in [SETUP.md](../SETUP.md), then start both development servers.
2. On Home choose **Call**, **Normal**, then **Continue with Google**. Complete the details form and confirm the Step 7 date/time picker appears.
3. Choose **Urgent** with no saved phone. Confirm the field shows a fixed `+91`, accepts ten local digits (including pasted spaces or dashes), rejects an invalid number and saves the canonical `+91` number.
4. Open **Settings**, edit the place of birth, save, reload and confirm it persists. Confirm the email is read-only and the Saved toast appears.
5. Log out, open **History**, and confirm the Continue with Google screen appears. Sign in again and confirm completed details are skipped.
6. In browser developer tools, confirm `astrowebapp_user_session` is HttpOnly, SameSite=Lax, scoped to `/`, and has a 30-day lifetime.

## Follow-ups and known issues

- Step 7 added time slots, Step 8 added free booking, Step 12 added paid Urgent booking, and Step 13 added Subscription credit/pack booking.
- Real Google redirect behavior must be checked on desktop and in the installed app on a physical iPhone before launch, as required by README §17.

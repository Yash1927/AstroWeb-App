# Guide for the owner and astrologers

Plain-language instructions for running the app day to day, written for people who aren't technical. Update this guide whenever something in the owner panel or the astrologer panel changes.

Last updated: 2026-10-01

The owner route at `/owner` and astrologer route at `/astrologer` are working. Both are separate from the user app and do not show its bottom tabs.

## For the owner

### Log in and out

1. Open `/owner`.
2. Enter the owner email and password created by the database seed.
3. Use **Log out** when you finish. Logging out ends the server session, so the old cookie cannot be reused.

Five failed attempts for the same email and internet address use the login allowance. The sixth is blocked for the rest of the 15-minute window. During local development, restarting the backend clears this in-memory block.

### Add and manage an astrologer

1. In **Astrologers**, choose **Add astrologer**.
2. Enter their name, email and a temporary password of at least 10 characters.
3. Send the temporary password to them through a secure private channel. The app never shows it again. They must replace it on their first astrologer login.

Each card has these actions:

| Action | What it does |
|---|---|
| **View and edit** | Shows the name, email, expertise, languages, experience and whether the profile has been saved. The owner can change the name or email. |
| **Hide from Home** / **Show on Home** | Changes whether an eligible, saved profile may appear to users. Unsaved profiles remain off Home. |
| **Deactivate** | Stops login, hides the account from Home and ends all of that astrologer's signed-in sessions. |
| **Reactivate** | Restores the account, but leaves it hidden until you choose **Show on Home**. |
| **Reset password** | Stores a new temporary password, ends all current sessions and requires the astrologer to replace it on their next login. |

### Change prices and call durations

1. Open **Pricing & call settings**.
2. Enter prices in rupees. The app stores them as whole paise.
3. Choose 10, 15 or 30 minutes for each call type.
4. Set how many calls belong in one subscription pack.
5. Choose **Save changes**.

The note “Changes apply to new bookings only.” means existing booking history will keep the amount originally charged once bookings are built.

Deleting blog comments arrives in Step 14. Payment refunds are handled in the Razorpay dashboard after payments are built.

## For astrologers

### Log in and set your password

1. Open `/astrologer` and enter the email and temporary password supplied by the owner.
2. On the first login, **Set a new password** appears before anything else. Enter the same new password twice. It must be at least 10 characters.
3. Use **Log out** when you finish.

If the owner resets your password, all of your open sessions end. Sign in with the new temporary password and replace it again. If the owner deactivates the account, you cannot sign in and current sessions stop working.

Five failed attempts for the same email and internet address use the login allowance. The sixth is blocked for the rest of the 15-minute window.

### Fill in and preview your profile

1. Open **Profile**.
2. Enter the display name users should see.
3. Add expertise tags. Vedic, Tarot and Numerology are suggestions; another short label is allowed.
4. Add the languages you speak and set whole years of experience from 0 to 60.
5. Choose **Preview** to see the exact card planned for Home. Preview uses the unsaved form values. Its **Call** button does nothing.
6. Choose **Save profile**. The first save records that the profile is ready for Home. It appears there in Step 5 only while the owner has it shown and the account is active.

**Availability**, **Bookings** and **Blogs** currently say “Coming in a later step.” Weekly hours arrive in Step 7, bookings in Step 9, and writing/publishing blogs in Step 14.

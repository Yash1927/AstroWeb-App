# Guide for the owner and astrologers

Plain-language instructions for running the app day to day, written for people who aren't technical. Update this guide whenever something in the owner panel or the astrologer panel changes.

Last updated: 2026-09-30

The owner route at `/owner` is working. The astrologer route at `/astrologer` still shows “Coming in a later step.” Both are separate from the user app and do not show its bottom tabs.

## For the owner

### Log in and out

1. Open `/owner`.
2. Enter the owner email and password created by the database seed.
3. Use **Log out** when you finish. Logging out ends the server session, so the old cookie cannot be reused.

Five failed attempts for the same email and internet address use the login allowance. The sixth is blocked for the rest of the 15-minute window. During local development, restarting the backend clears this in-memory block.

### Add and manage an astrologer

1. In **Astrologers**, choose **Add astrologer**.
2. Enter their name, email and a temporary password of at least 10 characters.
3. Send the temporary password to them through a secure private channel. The app never shows it again. They will have to replace it when astrologer login is built in Step 4.

Each card has these actions:

| Action | What it does |
|---|---|
| **View and edit** | Shows the full stored profile and lets you change the name or email. |
| **Hide from Home** / **Show on Home** | Changes whether an eligible, saved profile may appear to users. Unsaved profiles remain off Home when Step 4 adds the saved-profile check. |
| **Deactivate** | Stops the future astrologer login and hides the account from Home. |
| **Reactivate** | Restores the account, but leaves it hidden until you choose **Show on Home**. |
| **Reset password** | Stores a new temporary password and requires the astrologer to replace it on their next login. |

### Change prices and call durations

1. Open **Pricing & call settings**.
2. Enter prices in rupees. The app stores them as whole paise.
3. Choose 10, 15 or 30 minutes for each call type.
4. Set how many calls belong in one subscription pack.
5. Choose **Save changes**.

The note “Changes apply to new bookings only.” means existing booking history will keep the amount originally charged once bookings are built.

Deleting blog comments arrives in Step 14. Payment refunds are handled in the Razorpay dashboard after payments are built.

## For astrologers

_Written from Step 4._ Cover how to:
- log in and set your own password
- fill in your profile and preview your card
- set your weekly hours and days off (Step 7)
- see your bookings, and the difference between in-app calls (join in the app) and phone calls (you call the user) (Steps 9 and 12)
- write and publish blogs (Step 14)

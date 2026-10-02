# Guide for the owner and astrologers

Plain-language instructions for running the app day to day, written for people who aren't technical. Update this guide whenever something in the owner panel or the astrologer panel changes.

Last updated: 2026-10-02

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
| **Hide from Home** / **Show on Home** | Removes or restores an active, saved profile on public Home. Unsaved profiles remain off Home. |
| **Deactivate** | Stops login, hides the account from Home and ends all of that astrologer's signed-in sessions. |
| **Reactivate** | Restores the account, but leaves it hidden until you choose **Show on Home**. |
| **Reset password** | Stores a new temporary password, ends all current sessions and requires the astrologer to replace it on their next login. |

Public Home shows only the astrologer's initials, display name, expertise, languages and experience. It never shows their email or account details. Cards appear only when the account is active, the owner has chosen **Show on Home**, and the astrologer has saved the profile at least once.

### Change prices and call durations

1. Open **Pricing & call settings**.
2. Enter prices in rupees. The app stores them as whole paise.
3. Choose 10, 15 or 30 minutes for each call type.
4. Set how many calls belong in one subscription pack.
5. Choose **Save changes**.

The note “Changes apply to new bookings only.” means existing booking history keeps the amount originally charged. A Subscription pack order also keeps the number of calls offered when that order was created; changing the pack price or size affects later purchases only.

The app automatically refunds a late payment if its held time has already been taken; other payment refunds are handled in the Razorpay Dashboard under the current policy.

### Review recent blog comments

1. Open **Recent comments**.
2. The newest comments show the commenter's first name, post title, text and time. Email and full account details are never shown.
3. Choose **Delete**, review the confirmation, then choose **Delete comment**. This permanently removes the comment.

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
5. Choose **Preview** to see the exact card used on Home. Preview uses the unsaved form values. Its **Call** button does nothing.
6. Choose **Save profile**. The first save makes the profile eligible for Home immediately while the owner has it shown and the account is active.

### Set availability

1. Open **Availability**.
2. For each weekday, leave **Day off** selected or turn it off to create working hours.
3. Use **Add hours** when a day has a second working period. The ranges cannot overlap and each end must be after its start.
4. Under **Date exceptions**, choose **Block whole day**, **Block part of day** or **Add extra hours** for a specific date.
5. Choose **Save availability**. All clocks are IST. If hours are invalid, the page moves to the first highlighted field and repeats the instruction beside the Save button.

A whole-day block must be the only exception for that date. Other changes on one date cannot overlap. Availability changes affect future free times only and never cancel existing bookings. If confirmed bookings fall outside the new hours, the save message says how many remain booked.

On a wider screen, date-exception controls wrap into as many rows as they need. The date, change type and times remain fully readable and never overlap.

### Review bookings

1. Open **Bookings** to see Upcoming calls soonest first and Past calls newest first.
2. Every call shows the user's name, birth date, birth time, birth place, gender and phone number when one was saved. The user's email is never shown.
3. For a Normal call, choose **Join** before the start to see the waiting time. From the start until the end, choose the glowing **Join now** button. After the end there is no Join button; it is Completed only after both people joined, otherwise Missed.
4. An Urgent or Subscription phone booking says **Phone call · date · time**. Its phone number is a tap-to-call link. It never has a Join button; call the user at the booked time. Past phone calls keep the **Phone call** label.

The cards change as the start and end times pass without reloading the page.

### Write and manage blogs

1. Open **Blogs** and choose **Write a post**.
2. Enter a title of up to 120 characters and a plain-text body.
3. Choose **Save draft** to keep it private, or **Publish** to make it appear on the user Blogs tab.
4. Choose **Edit** on an existing post. A published post can be updated with **Publish changes** or returned to a private draft with **Unpublish**.
5. Comments on the selected post appear below the editor. Choose **Delete** to remove a comment from your post.
6. To remove a post, choose **Delete**, then confirm **Delete post**. Its likes and comments are removed with it.

The editor never treats the body as HTML. Paragraph breaks remain visible, and text that looks like a script stays ordinary text.

### Join a Normal call

1. Open the call from **Bookings**. Before its start, the room shows the start time and does not ask for the microphone or connect audio.
2. At the start time, choose **Join call**. Allow microphone access when the browser asks. If access is blocked, allow it in the browser's site settings and choose **Try again**.
3. While waiting for the user, the breathing circle stays visible. When both people are present, the room shows both avatars, says **Connected.** and starts the **Time left** countdown. A gentle **2 minutes left.** notice appears near the end.
4. Use **Mute** or **Unmute** to control your microphone. A muted badge appears for the other person. A soft ring appears around either avatar while that person is speaking.
5. Use **Chat** for a short message of up to 500 characters. Messages are only live during this room; leaving clears them and the app does not save them. The Send button waits about one second between messages.
6. **Speaker** appears only in browsers that can choose an audio output. Choose it to move through the outputs the browser reports. On browsers such as Chrome on Android, the button is absent and the phone controls the output.
7. When the default microphone changes after earbuds or another device connects, the call swaps to it and shows **Audio device changed.** The current Mute state stays the same.
8. Use **Leave call** to disconnect; you can choose **Join call** again until the booked end time. At the end time, the server closes audio for both people and the room says **This call has ended.** Choose **Back to Bookings** to return directly to the panel's Bookings section.

An audio warning appears only if the peer connection fails or has not connected about 15 seconds after the other person joins. It disappears if the connection succeeds. The room can use the configured TURN relay when a direct connection is blocked, including on many mobile networks. Real phone, mobile-data, Speaker and earbuds behavior must still be checked on the actual devices listed in `docs/TESTING.md`.

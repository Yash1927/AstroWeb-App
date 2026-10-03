# Step 4: Astrologer login and profile

- **Status:** Done
- **Spec:** README §2, §5.1, §5.6, §8.1, §8.2, §9 and §12
- **Started:** 2026-09-30
- **Finished:** 2026-10-01

## Goal

Add the protected astrologer panel and complete the reusable email/password session path for astrologers. An astrologer must replace a temporary password, can edit and save only their own profile, and can preview the exact card that Home will reuse in Step 5.

## Plan

- **Screens and UI:** Replace the `/astrologer` placeholder with login, forced-password-change and authenticated panel states. Add Profile, Availability, Bookings and Blogs navigation, a tag-based profile form, and a phone-width preview using a shared `AstrologerCard`; only Profile is functional in this step.
- **API:** Add astrologer login outside the protected prefix and protect every `/api/astrologer/*` route with an active-record-aware `requireAstrologer`. Add session status, logout, password replacement, and own-profile read/save endpoints with strict Zod validation and the same generic credential error/rate-limit behavior as owner login.
- **Database:** Add nullable `Astrologer.profileSavedAt`, set it only on the first profile save, and apply/verify the additive Prisma migration on Neon. Revoke astrologer sessions when the owner deactivates or resets that account, and when the astrologer replaces a temporary password.
- **Real-time:** Do not change `src/realtime/`. Change the future user and astrologer cookie paths to `/` so their cookies can reach `/ws` when Step 10 replaces real-time.
- **New libraries:** None. Reuse Argon2id, Zod, Supertest, Vitest, Testing Library and the shared Step 3 session foundation.

## Edge cases

- Unknown email, wrong password and deactivated account return the same credential error and count toward the five-failure, 15-minute email-plus-IP limit.
- Missing, expired, wrong-role or deactivated-account sessions return 401 and clear only the astrologer cookie.
- A temporary-password session cannot read or save the profile until a valid replacement password of at least 10 characters is stored.
- Owner deactivation and password reset revoke every existing astrologer session. Reactivation does not restore old sessions.
- Profile saves trim and de-duplicate tags, reject more than 20 tags or tags over 40 characters, and limit experience to an integer from 0 through 60. Empty tag lists remain valid because the README does not mark them required.
- Re-saving a profile updates its fields without changing the first-saved timestamp or the owner's current listing choice.
- Unsaved form edits appear in Preview but are not sent to the server until Save.

## Test plan

- **Automated:** Cover root cookie paths, credential parity, deactivated login, sixth-attempt blocking, wrong-role/inactive session rejection, forced password change and profile validation. Cover the shared Home card in the frontend. Run backend tests/type-check plus frontend tests/lint/build. Transactional session revocation and first-save timestamp handling are verified by type-check, migration verification and code review; the real-account flow remains in the manual test list.
- **Manual:** Follow Step 4's “Try it out” list in `BUILD_PROMPTS.md`: temporary-password replacement, preview before save, persistence after relogin, owner full-profile view, and immediate deactivation denial.

## As built

- `/astrologer` checks its own 12-hour server session, shows email/password login, forces temporary-password replacement, and then opens a four-section panel. Availability, Bookings and Blogs now contain their later-step implementations.
- `POST /api/auth/astrologer/login` uses the same five-failures-per-15-minutes email-plus-IP policy and indistinguishable credential error as owner login. The protected `/api/astrologer/*` router checks the astrologer role and the live account's active state.
- Password replacement uses Argon2id, deletes every earlier astrologer session in the same transaction, and issues a fresh session to the current browser. Logout deletes its Session row.
- The Profile screen edits display name, expertise tags, language tags and 0–60 years of experience. Preview renders unsaved values with the same `AstrologerCard` that Home will use; its Call button has no action in preview.
- The profile also accepts JPG, PNG or WebP photos up to 5 MB. It previews the centred square crop before an explicit photo save, supports change/remove, and uses the processed 512×512 WebP everywhere the astrologer appears. The owner can remove a photo for moderation. See README §19.1–§19.2.
- The first successful save sets `profileSavedAt`; later saves preserve it. Migration `20260930T1814_astrologer_profile_saved_at` is applied on Neon and the live schema matches the contract.
- Owner profile details include the saved-profile state. Owner deactivation unlists the astrologer and revokes every astrologer session atomically; password reset also revokes every astrologer session and restores the forced-password gate.
- User and astrologer cookie paths are `/`, while the owner cookie stays scoped to `/api/owner`. Separate cookie names keep the roles isolated.
- Step 4 itself added no availability, booking, blog, public Home query or real-time behavior; later feature docs record the first four areas as they are built.

## How to try it

1. Start both development servers and log in at `/owner`.
2. Add an astrologer with a temporary password of at least 10 characters.
3. Open `/astrologer` in a separate browser profile, sign in, and confirm **Set a new password** appears before the panel. Save a new password of at least 10 characters.
4. Add expertise and language tags, set experience from 0 through 60, and change the display name. Choose **Preview** before saving and confirm the card uses those unsaved values and its **Call** button does nothing.
5. Choose a profile image, check the centred square preview, save it, and confirm Preview/Home use the photo. Remove it and confirm initials return.
6. Save the profile, refresh, and confirm the saved values return. Log out, log back in with the new password, and confirm the temporary password no longer works.
7. Back at `/owner`, choose **View and edit** and confirm the photo, expertise, languages, experience and profile-saved time appear. Try **Remove photo**.
8. While the astrologer is signed in, deactivate or reset that account from `/owner`. The next protected astrologer request must return to login; a reset requires the new temporary password and another replacement.

## Follow-ups and known issues

- Launch uses one backend instance so the process-local login limiter is authoritative; multiple instances require a shared limiter store.

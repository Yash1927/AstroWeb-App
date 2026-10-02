# Step 14: Blogs

- **Status:** Done
- **Spec:** README §2, §5.4, §8.5, §10.4, §12 and §16.2 question 11
- **Started:** 2026-10-02
- **Finished:** 2026-10-02

## Goal

Astrologers can draft, publish and manage their own plain-text posts. Visitors can read published posts, signed-in users can like and comment without completing booking details, and each permitted role can delete comments within its own scope.

## Plan

- **Screens and UI:** Replace the user Blogs placeholders with a paged list and post page; add the astrologer Blogs workspace and the owner's Recent comments section; reuse avatars, dialogs, cards, Google sign-in and the existing heart animation.
- **API:** Add public published-post list/detail routes; protected user like/comment routes; protected own-post astrologer routes; and protected owner recent-comment deletion routes. Validate all bodies, params and pagination and rate-limit comment creation.
- **Database:** Use the existing `Blog`, `BlogLike` and `BlogComment` tables. Add indexes only if query review shows the existing schema lacks the access paths required by the new list and comment screens.
- **Real-time:** None.
- **New libraries:** None.

## Edge cases

- Drafts and unpublished posts must never appear from public endpoints.
- An astrologer may edit or delete only their own posts and may delete comments only from those posts.
- A user may delete only their own comments; the owner may delete any comment.
- Repeated likes remain one row per user and post, and unliking is safe.
- Comment text is trimmed, limited to 500 characters, rendered as text, and throttled without logging its content.
- Publishing an already-published post keeps its original publication time; republishing an unpublished post receives a new publication time.

## Test plan

- **Automated:** API tests for public draft exclusion and pagination, record-level post/comment access, like toggle, comment validation/rate limiting and each deletion role; frontend tests for list/load-more, sign-in gates, heart state, plain-text rendering, comment creation/deletion and panel actions.
- **Manual:** Follow the Step 14 Try it out list in `BUILD_PROMPTS.md`, including posting a script tag as plain text.

## As built

- `backend/src/blog/` now validates blog input, shapes privacy-limited public responses, pages published posts, toggles one like per user, stores/comments in oldest-first order, scopes every mutation and throttles comment bursts.
- `backend/routes/Blogs.ts` serves public reading plus user likes/comments. `backend/routes/Astrologer.ts` serves own drafts, publishing, unpublishing, editing, post deletion and own-post comment deletion. `backend/routes/Owner.ts` serves the bounded Recent comments list and owner deletion.
- `frontend/src/screens/BlogsPage.tsx` and `BlogPostPage.tsx` replace both placeholders with public reading, Load more, plain-text paragraphs, heart-pop likes, Google-gated reactions and commenter deletion.
- `frontend/src/components/AstrologerBlogs.tsx` supplies the own-post editor/list and moderation UI. `OwnerRecentComments.tsx` adds the owner's only blog feature.
- No schema or migration changed. Step 14 uses the existing `Blog`, `BlogLike` and `BlogComment` tables. No library or environment variable was added.
- The rate, owner-list bound and public avatar-key choice are recorded in [D-019](../DECISIONS.md#d-019-blog-moderation-bounds-and-public-commenter-identity).

## How to try it

- Start both development servers and open `/astrologer`. In **Blogs**, write a title and plain-text body, choose **Save draft**, then **Publish**. The draft is absent from `/blogs`; the published post appears there.
- Open the post while signed out. Reading works. Choose the heart or submit a comment to see **Continue with Google**; after the redirect, neither action asks for birth details.
- Like/unlike, post a comment and delete it. Script-tag text remains visible text and never runs.
- From the astrologer post editor, delete a comment on that post. From `/owner`, open **Recent comments** and delete another one.
- Choose **Unpublish** in the astrologer editor and reload `/blogs`; the post is no longer public.
Fill this in when the step is done.

## Follow-ups and known issues

- Comment throttling is process-local. A shared production limiter remains part of the Step 16 topology review.
- Real Google redirect and three-role browser moderation remain manual checks.

# Step 14: Blogs

- **Status:** Done
- **Spec:** README §2, §5.4, §8.5, §10.4, §12 and §16.2 question 11
- **Started:** 2026-10-02
- **Finished:** 2026-10-02

## Goal

Astrologers can draft, publish and manage their own rich-text posts. Visitors can read published posts, signed-in users can like and comment without completing booking details, and each permitted role can delete comments within its own scope.

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

- **Automated:** API tests for public draft exclusion and pagination, record-level post/comment access, like toggle, comment validation/rate limiting and each deletion role; rich-document tests for allow-listing, links, limits, ownership, round trip and legacy conversion; frontend tests for list/load-more, sign-in gates, heart state, safe React rendering, comment creation/deletion and panel actions.
- **Manual:** Follow the Step 14 Try it out list in `BUILD_PROMPTS.md`, then check the rich toolbar, image/cover upload, autosave, 360px editor and public reading view with configured R2 storage.

## As built

- `backend/src/blog/` validates allow-listed TipTap JSON, owned media URLs, size/image limits and blog input; derives excerpts and reading time; shapes privacy-limited public responses; pages published posts; toggles one like per user; stores comments in oldest-first order; scopes every mutation; and throttles comment bursts.
- `backend/routes/Blogs.ts` serves public reading plus user likes/comments. `backend/routes/Astrologer.ts` serves own drafts, publishing, unpublishing, editing, post deletion and own-post comment deletion. `backend/routes/Owner.ts` serves the bounded Recent comments list and owner deletion.
- `frontend/src/screens/BlogsPage.tsx`, `BlogPostPage.tsx` and `BlogDocument.tsx` provide cover/list summaries and a 680px rich reading view rendered node by node in React, plus heart-pop likes, Google-gated reactions and commenter deletion.
- `frontend/src/components/AstrologerBlogs.tsx` and `RichBlogEditor.tsx` supply the TipTap authoring workspace, image/cover upload, autosave and moderation UI. `OwnerRecentComments.tsx` adds the owner's only blog feature.
- Pending-fix migration `20261003T0224_media_and_rich_blogs` converts the original body strings to TipTap JSONB and adds excerpt, reading-time and cover fields. The TipTap and media dependencies are listed in `docs/ARCHITECTURE.md`.
- The rate, owner-list bound and public avatar-key choice are recorded in [D-019](../DECISIONS.md#d-019-blog-moderation-bounds-and-public-commenter-identity).

## How to try it

- Start both development servers and open `/astrologer`. In **Blogs**, write a title and rich body, select text to use the floating toolbar, add a body/cover image, choose **Save draft**, then **Publish**. The draft is absent from `/blogs`; the published post appears there with its excerpt, cover and reading time.
- Open the post while signed out. Reading works. Choose the heart or submit a comment to see **Continue with Google**; after the redirect, neither action asks for birth details.
- Like/unlike, post a comment and delete it. Unsupported document nodes and unsafe links are rejected; displayed content is rendered by React without raw HTML.
- From the astrologer post editor, delete a comment on that post. From `/owner`, open **Recent comments** and delete another one.
- Choose **Unpublish** in the astrologer editor and reload `/blogs`; the post is no longer public.
Fill this in when the step is done.

## Follow-ups and known issues

- Launch uses one backend instance so process-local comment throttling is authoritative; multiple instances require a shared limiter store.
- Real Google redirect and three-role browser moderation remain manual checks.

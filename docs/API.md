# API

Every HTTP endpoint, WebSocket message and webhook, as built. HTTP routes live under `/api` and WebSockets under `/ws`, both on the same domain as the frontend.

Last updated: 2026-10-02

## Conventions

- HTTP endpoints are mounted below `/api` (README §1).
- Health, public settings, public astrologer cards, eligible astrologer slots and published blogs need no session. Login/callback endpoints are public; protected endpoints run the matching role guard.
- Current account, profile, blog, public-card and booking bodies, parameters and query strings are Zod-validated. Invalid non-login input returns `400` with `{"error":"Check the information and try again."}`. Booking creation discards unrecognized body fields so a browser-supplied price cannot affect the server-owned Settings amount. Password logins deliberately use the same 401 response for invalid input and bad credentials. The Google form accepts its documented fields and ignores extra provider fields.
- Owner authentication uses `astrowebapp_owner_session` scoped to `/api/owner`. Astrologer and user authentication use separate cookies scoped to `/` so shared APIs and `/ws` receive them. All three are httpOnly, use SameSite=Lax and are Secure when `NODE_ENV=production`; the owner and astrologer last 12 hours and the user lasts 30 days.
- Missing or invalid authentication returns `401`. Missing records return `404`; duplicate email, password-gate failures and invalid state transitions return `409`; database/service failures return a generic `503`.

## Endpoints

| Method | Path | Who can call it | What it does | Step |
|---|---|---|---|---|
| GET | `/api/health` | Public | Confirms that the Express process can answer requests | 1 |
| GET | `/api/health/db` | Public | Runs a small database query and reports whether Neon is reachable | 2 |
| GET | `/api/settings/public` | Public | Returns only current prices, pack size and call durations | 2 |
| GET | `/api/astrologers` | Public | Returns only eligible Home-card fields | 5 |
| GET | `/api/astrologers/:id/slots?type=normal\|urgent\|subscription` | Public | Returns 14 days of current free slots | 7 |
| POST | `/api/bookings` | User | Revalidates a slot, then confirms a free/credit booking or creates a ten-minute paid hold and Razorpay order | 8, 12, 13 |
| POST | `/api/payments/verify` | User | Verifies one owned Checkout payment and confirms or refunds its booking | 12 |
| POST | `/api/razorpay/webhook` | Razorpay | Processes signed payment events from the untouched raw request body | 12 |
| GET | `/api/calls/:bookingId/ice-servers` | Booked user or astrologer | Returns STUN and short-lived TURN configuration for an active in-app call | 11 |
| POST | `/api/auth/google` | Public Google redirect | Verifies a Google credential and creates a user session | 6 |
| GET | `/api/me` | User | Returns the signed-in user's own account and details | 6 |
| PUT | `/api/me` | User | Replaces the signed-in user's own editable details | 6 |
| GET | `/api/me/bookings` | User | Returns the signed-in user's own confirmed Normal and phone bookings as Upcoming and Past | 9, 12 |
| GET | `/api/me/bookings/:bookingId` | User | Returns one owned Normal booking for protected call-room navigation | 9 |
| POST | `/api/auth/logout` | User | Deletes the current user session and clears its cookie | 6 |
| GET | `/api/blogs?page=N` | Public | Returns 20 published post summaries, newest first | 14 |
| GET | `/api/blogs/:id` | Public | Returns one published plain-text post and oldest-first comments; a valid user cookie adds viewer state | 14 |
| PUT | `/api/blogs/:id/like` | User | Toggles the signed-in user's one like | 14 |
| POST | `/api/blogs/:id/comments` | User | Adds a rate-limited plain-text comment of up to 500 characters | 14 |
| DELETE | `/api/blogs/:id/comments/:commentId` | Commenter | Deletes only that user's own comment | 14 |
| POST | `/api/auth/owner/login` | Public | Verifies owner credentials and creates an owner session | 3 |
| POST | `/api/auth/astrologer/login` | Public | Verifies an active astrologer and creates an astrologer session | 4 |
| GET | `/api/owner/session` | Owner | Confirms that the owner session is valid | 3 |
| POST | `/api/owner/logout` | Owner | Deletes the session and clears the cookie | 3 |
| GET | `/api/owner/astrologers` | Owner | Lists all astrologer profiles | 3 |
| POST | `/api/owner/astrologers` | Owner | Creates an astrologer with a temporary password | 3 |
| GET | `/api/owner/astrologers/:id` | Owner | Returns one full astrologer profile | 3 |
| PATCH | `/api/owner/astrologers/:id` | Owner | Changes the astrologer's name and email | 3 |
| PATCH | `/api/owner/astrologers/:id/listing` | Owner | Hides or shows an active astrologer | 3 |
| PATCH | `/api/owner/astrologers/:id/active` | Owner | Deactivates or reactivates an account | 3 |
| POST | `/api/owner/astrologers/:id/reset-password` | Owner | Stores a new temporary password | 3 |
| GET | `/api/owner/settings` | Owner | Returns all owner-editable settings | 3 |
| PUT | `/api/owner/settings` | Owner | Replaces all seven owner-editable settings | 3 |
| GET | `/api/owner/comments/recent` | Owner | Returns the newest 50 blog comments with post titles | 14 |
| DELETE | `/api/owner/comments/:commentId` | Owner | Deletes one blog comment | 14 |
| GET | `/api/astrologer/session` | Astrologer | Confirms the session and reports whether password replacement is required | 4 |
| POST | `/api/astrologer/logout` | Astrologer | Deletes the session and clears the astrologer cookie | 4 |
| PUT | `/api/astrologer/password` | Astrologer | Replaces a temporary password and rotates all astrologer sessions | 4 |
| GET | `/api/astrologer/profile` | Astrologer | Returns only the signed-in astrologer's profile | 4 |
| PUT | `/api/astrologer/profile` | Astrologer | Saves only the signed-in astrologer's profile | 4 |
| GET | `/api/astrologer/availability` | Astrologer | Returns only the signed-in astrologer's hours and exceptions | 7 |
| PUT | `/api/astrologer/availability` | Astrologer | Atomically replaces only the signed-in astrologer's availability | 7 |
| GET | `/api/astrologer/bookings` | Astrologer | Returns only that astrologer's confirmed Normal/phone bookings and booked-user details | 9, 12 |
| GET | `/api/astrologer/bookings/:bookingId` | Astrologer | Returns one booking owned by that astrologer for protected call-room navigation | 9 |
| GET | `/api/astrologer/blogs` | Astrologer | Returns that astrologer's drafts and published posts with comments | 14 |
| POST | `/api/astrologer/blogs` | Astrologer | Creates an own draft or published post | 14 |
| PUT | `/api/astrologer/blogs/:id` | Astrologer | Edits, publishes or unpublishes an own post | 14 |
| DELETE | `/api/astrologer/blogs/:id` | Astrologer | Deletes an own post, its likes and comments | 14 |
| DELETE | `/api/astrologer/blogs/:id/comments/:commentId` | Astrologer | Deletes a comment only from an own post | 14 |

### GET /api/health

- **Who:** Public.
- **Request:** No body, parameters or query.
- **Response:** `200 OK` with `{"ok":true}`.
- **Errors:** No endpoint-specific errors. Connection failures mean the backend process or development proxy is unavailable.
- **Rate limit:** None yet.

## User authentication and details

### POST /api/auth/google

- **Request:** Google Identity Services posts `application/x-www-form-urlencoded` fields including `credential`, `g_csrf_token`, optional `select_by` and optional button `state`.
- **CSRF:** The body token must match the `g_csrf_token` cookie before the credential is verified.
- **Identity:** `google-auth-library` verifies the ID token with `GOOGLE_CLIENT_ID` as its audience, including signature, issuer and expiry checks. The route additionally requires `email_verified = true`, `sub` and `email`.
- **Account:** The service finds the `User` by `googleSub` or creates it with the Google email and name. Existing birth details, phone number, chosen name and credits are preserved; a changed verified Google email is refreshed.
- **Response:** `303` to the validated same-origin button state, or Home when state is absent or unsafe, with a signed 30-day `astrowebapp_user_session` cookie.
- **Errors:** Missing/mismatched CSRF or malformed provider input returns `400`; an unaccepted token returns `401`; missing Google configuration or a service failure returns `503`. Tokens and personal claims are not logged.

### GET and PUT /api/me

Both routes resolve the record id only from the valid user session. They do not accept a user id.

| Endpoint | Valid request data | Success response |
|---|---|---|
| `GET /api/me` | No body, params or query | `{user}` with id, Google email, editable details, credits and computed `detailsComplete` |
| `PUT /api/me` | Name 2–60 chars; non-future `YYYY-MM-DD` birth date; `HH:mm` local birth time; birth place 1–100 chars; optional null or `+91` mobile; `male`, `female` or `other` gender | `{user}` after replacing those editable fields |

The email, Google subject and credits cannot be changed through `PUT`. Birth time is stored as the local clock time entered, without timezone conversion. Removing an existing phone number returns `409` with `field:"phone"` while the user has a confirmed phone booking whose end is still in the future. `POST /api/auth/logout` deletes the current Session row, clears the root-path user cookie and returns `204`.

### User booking history

Both endpoints resolve the user only from the valid session. They accept no user id, body or query. The detail endpoint accepts one UUID booking id and returns the same `404 Booking not found` response when the row is missing or belongs to someone else.

| Endpoint | Success response |
|---|---|
| `GET /api/me/bookings` | `{upcoming,past,subscriptionCredits}`; Upcoming is soonest first and Past is newest first |
| `GET /api/me/bookings/:bookingId` | `{booking}` for one owned Normal call |

Each item contains the booking id, call type/mode, UTC start/end, duration, stored price, credit flag, current status, eventual ended status, the user's current phone number and only the astrologer's id/display name. Normal status is Upcoming until the end; after the end it is Completed only when both participant join timestamps exist, otherwise Missed. A phone booking is Upcoming until its end and then has `phone-call` status. The browser keeps applying those rules at the time boundaries without fetching again. The detail endpoint remains Normal-only because only in-app Normal calls have a room.

### GET /api/health/db

- **Who:** Public.
- **Request:** No body, parameters or query.
- **Response:** `200 OK` with `{"ok":true}` after a successful query.
- **Errors:** `503 Service Unavailable` with `{"ok":false}` when the query fails.
- **Rate limit:** None yet.

### GET /api/settings/public

- **Who:** Public.
- **Request:** No body, parameters or query.
- **Response:** `200 OK` with `normalPricePaise`, `urgentPricePaise`, `subscriptionPricePaise`, `subscriptionCallsPerPack`, `normalDurationMin`, `urgentDurationMin` and `subscriptionDurationMin`.
- **Errors:** `503 Service Unavailable` with a generic message when the singleton row is missing or the database query fails.
- **Data boundary:** The response excludes the settings id and update timestamp.
- **Rate limit:** None yet.

### GET /api/astrologers

- **Who:** Public visitors and signed-in users. No cookie or login is required.
- **Request:** No body, parameters or query.
- **Response:** `200 OK` with `{astrologers}`. Each item contains only `id`, `displayName`, `expertise`, `languages` and `experienceYears`.
- **Eligibility:** The database query requires `isActive = true`, `isListed = true` and a non-null `profileSavedAt`. Results are ordered by display name.
- **Privacy boundary:** The query does not select email, password/session data, account flags or timestamps. The route also reconstructs each response from the five public fields.
- **Errors:** Unexpected request input returns `400`. A database/service failure returns `503` with `{"error":"Astrologers are unavailable. Please try again."}`.
- **Rate limit:** None yet.

### GET /api/astrologers/:id/slots

- **Who:** Public visitors and signed-in users. No cookie or login is required.
- **Request:** UUID astrologer path id and exactly one `type` query with `normal`, `urgent` or `subscription`. No body or extra query fields.
- **Eligibility:** The astrologer must be active, listed and profile-saved. An ineligible or missing record returns the same `404` response.
- **Date range:** Fourteen IST calendar dates starting today. For Normal, today's day object is returned with no slots; Urgent and Subscription can contain future starts today.
- **Response:** `{timeZone:"Asia/Kolkata",durationMin,days}`. Every day contains `date` (`YYYY-MM-DD`) and `slots`; each slot has UTC `startsAt` and `endsAt` timestamps. The duration comes from the current `Settings` row.
- **Free-time rules:** Weekly and extra windows are combined, blocks are subtracted, incomplete duration fragments and past starts are omitted, and confirmed bookings plus unexpired `pending_payment` holds remove overlapping intervals.
- **Errors:** Malformed input returns `400`; missing/ineligible astrologers return `404`; settings/database failures return `503` with a generic message.
- **Side effects:** None. Reading or choosing one of these times does not create or hold a booking.

### POST /api/bookings

- **Who:** A signed-in user whose account still exists. The user id always comes from the root-path user session cookie.
- **Request:** JSON with `astrologerId` (UUID), `callType` (`normal`, `urgent` or `subscription`) and `startsAt` (an absolute ISO timestamp). Unknown body fields are discarded; in particular, a submitted price is ignored. The route accepts no parameters or query fields.
- **Checks:** The user's required details must be complete, phone-call types require a saved phone, the astrologer must still be active/listed/profile-saved, and `startsAt` must exactly match a current slot from the shared 14-day slot service. Duration and price are reread from `Settings`.
- **Zero price:** Any call type priced at zero is saved immediately as `confirmed`, with no payment hold. Normal is always `in_app`; Urgent and Subscription are `phone`. A zero-price Subscription pack adds the current pack size and consumes one call atomically.
- **Subscription credit:** When the user has a credit, a conditional positive-balance update consumes exactly one and inserts a confirmed Subscription booking with `usedCredit=true` and `pricePaise=0`. The response includes the remaining `subscriptionCredits`; concurrent requests cannot reduce the balance below zero.
- **Positive price:** Normal and Urgent create a `pending_payment` booking whose hold expires after ten minutes plus a linked `Payment(status=created)`. Subscription does the same only when no credit remains; its Payment uses `purpose=subscription_pack` and snapshots the current pack size. The `201` response adds `checkout` with the public key id, order id, server amount/currency, expiry and the signed-in user's name/email/phone prefill.
- **Response:** `{booking}` contains id, astrologer id, call type/mode, UTC start/end, status, stored price, duration and `usedCredit`. Subscription confirmations also return the remaining `subscriptionCredits`.
- **Transaction:** Before inserting, the server changes elapsed `pending_payment` holds for that astrologer to `expired`, then checks the one-upcoming-Normal rule where applicable. PostgreSQL's `Booking_no_overlap` exclusion constraint decides a simultaneous conflict.
- **Errors:** Malformed required input returns `400`; no valid user session returns `401`; a missing or ineligible astrologer returns `404`. Incomplete details, an invalid/missing required phone, an unavailable/overlapping slot and a second upcoming Normal booking return `409` with a friendly message. Prisma 8 exposes the exclusion violation as `SqlQueryError.sqlState = "23P01"`; the mapper also follows a transaction `cause`. Order/database failures return `503` with a generic message.

### POST /api/payments/verify

- **Who:** The signed-in user who owns both the stored Payment and Booking.
- **Request:** Strict JSON with `bookingId`, `razorpayOrderId`, `razorpayPaymentId` and the 64-hex-character `razorpaySignature`; no params or query.
- **Verification:** The backend computes HMAC-SHA256 over `orderId|paymentId` with `RAZORPAY_KEY_SECRET`, compares equal-length bytes with `crypto.timingSafeEqual`, then checks the stored order, user, booking and amount.
- **Success:** One transaction conditionally claims the Payment, changes the booking to `confirmed`, clears its hold and stores the unique Razorpay payment id. For `subscription_pack`, only the claim winner adds the snapshotted calls, consumes one for this booking, sets `usedCredit=true` and returns `subscriptionCredits`. Repeated verification or a racing webhook returns the same confirmed state without adding credits again.
- **Late conflict:** If `Booking_no_overlap` rejects confirmation because the slot is now occupied, the backend issues a full Razorpay refund and stores Payment `refunded` plus Booking `expired`. The `200` response returns `status:"refunded"` and the specified user-facing message.
- **Errors:** Invalid signatures return `400`, foreign/missing orders return `404`, invalid payment state returns `409`, and unavailable services return the generic `503` verification message.

### GET /api/calls/:bookingId/ice-servers

- **Who:** The signed-in user or astrologer on this booking. The route resolves both root-path participant cookies, but the session role never replaces the booking ownership check.
- **Request:** A UUID booking id and no body or query values. The booking must be confirmed, use `in_app` mode and be inside its stored start/end window.
- **Response:** `200` with `{iceServers}` and `Cache-Control: no-store`. The array contains the public STUN URL and the configured TURN URLs with username `<booking-end-unix-seconds>:<bookingId>` and a base64 HMAC-SHA1 credential derived from backend-only `TURN_SECRET`.
- **Errors:** No participant session returns `401`. A missing, foreign or unavailable booking returns the same `404 Call not found` response. Missing/invalid TURN configuration or another service failure returns the generic `503 Call audio is unavailable` response without configuration details.

## Owner authentication

### POST /api/auth/owner/login

- **Request:** `{email, password}`. Email is normalized to lowercase. Password length is limited to 256 characters.
- **Response:** `200` with `{"ok":true}` and a signed, 12-hour owner cookie.
- **Errors:** Wrong email, wrong password and structurally invalid input all return `401` with `{"error":"The email or password is incorrect."}`. A database failure returns `503`.
- **Rate limit:** Five failures per 15 minutes for the normalized email plus observed IP. The sixth attempt returns `429` with `Retry-After`. A successful login clears that key.

### GET /api/owner/session

- **Response:** `200` with `{"authenticated":true}` for a valid owner cookie.

### POST /api/owner/logout

- **Request:** Empty body and query.
- **Response:** `204`. The Session row is deleted before the cookie is cleared.

## Owner astrologer management

All responses omit password hashes.

| Endpoint | Valid request data | Success response |
|---|---|---|
| `GET /api/owner/astrologers` | No body or query | `{astrologers: AstrologerProfile[]}` |
| `POST /api/owner/astrologers` | `displayName` 2–80 chars, valid `email`, `temporaryPassword` 10–256 chars | `201` with `{astrologer}`; it starts active, listed and requiring a password change |
| `GET /api/owner/astrologers/:id` | UUID path id | `{astrologer}` with email, expertise, languages, experience, states, creation time and first profile-save time |
| `PATCH /api/owner/astrologers/:id` | UUID path id plus `displayName` and `email` | `{astrologer}` |
| `PATCH /api/owner/astrologers/:id/listing` | UUID path id plus `{isListed: boolean}` | `{astrologer}`; an inactive account cannot be shown |
| `PATCH /api/owner/astrologers/:id/active` | UUID path id plus `{isActive: boolean}` | `{astrologer}`; deactivation also unlists it and deletes its astrologer sessions |
| `POST /api/owner/astrologers/:id/reset-password` | UUID path id plus `temporaryPassword` 10–256 chars | `{"ok":true}`; sets `mustChangePassword` and deletes its astrologer sessions |

## Owner settings

`GET /api/owner/settings` returns the same seven business values as the public settings route. `PUT /api/owner/settings` requires all seven values. Prices must be non-negative integer paise, pack size must be a positive integer, and each duration must be exactly 10, 15 or 30.

## Astrologer authentication, profile and availability

### POST /api/auth/astrologer/login

- **Request:** `{email, password}`. Email is normalized to lowercase. Password length is limited to 256 characters.
- **Response:** `200` with `{mustChangePassword}` and a signed, 12-hour astrologer cookie.
- **Errors:** Unknown email, wrong password, deactivated account and structurally invalid input all return `401` with `{"error":"The email or password is incorrect."}`. A database failure returns `503`.
- **Rate limit:** Five failures per 15 minutes for the normalized email plus observed IP. The sixth attempt returns `429` with `Retry-After`. A successful login clears that key.

### Protected session and password endpoints

| Endpoint | Request | Success |
|---|---|---|
| `GET /api/astrologer/session` | Empty body and query | `{authenticated:true,mustChangePassword}` |
| `POST /api/astrologer/logout` | Empty body and query | `204`; deletes the Session row and clears the cookie |
| `PUT /api/astrologer/password` | `{newPassword}` with 10–256 characters | `{"ok":true}`; hashes the password with Argon2id, deletes all old astrologer sessions and sets one fresh cookie |

The role guard resolves only an astrologer session and then checks the matching account is still active. A router-level password gate requires `mustChangePassword = false` before profile, availability or booking access; session, logout and password replacement stay available while the gate is active.

### Own profile endpoints

| Endpoint | Valid request data | Success response |
|---|---|---|
| `GET /api/astrologer/profile` | No body or query | `{profile}` with id, email, display name, tags, experience and `profileSavedAt` |
| `PUT /api/astrologer/profile` | `displayName` 2–80 chars; zero to 20 expertise tags; zero to 20 language tags; each tag 1–40 chars; integer `experienceYears` 0–60 | `{profile}` after trimming and case-insensitive tag de-duplication |

Both endpoints use the session subject id rather than accepting an astrologer id. The first successful save sets `profileSavedAt`; later saves keep that original time.

### Own availability endpoints

Both endpoints use the astrologer session subject id and require an active account whose temporary password has been replaced.

| Endpoint | Valid request data | Success response |
|---|---|---|
| `GET /api/astrologer/availability` | No body, params or query | `{availability:{weekly,exceptions}}` |
| `PUT /api/astrologer/availability` | `{weekly,exceptions}` with the shapes below | `{availability:{weekly,exceptions,displacedBookingCount}}` |

Weekly entries contain integer `weekday` from `0` (Sunday) through `6` (Saturday), plus `HH:mm` `startTime` and `endTime`. A day with no entries is off; one day may have multiple non-overlapping ranges.

Exception entries contain `YYYY-MM-DD` `date`, `kind` (`blocked` or `extra`) and nullable start/end times. A whole-date block has both times null. Partial blocks and all extra hours require both times. Every end must be after its start, timed entries on one date cannot overlap, and a whole-date block must be the only exception for that date. Requests are bounded to 70 weekly and 100 exception rows.

Saving deletes and recreates only this astrologer's availability inside one transaction. It does not change bookings. `displacedBookingCount` counts confirmed, not-yet-ended bookings that no longer fit the saved hours so the panel can warn that they remain booked.

### Own booking history

`GET /api/astrologer/bookings` returns `{upcoming,past}` with the same time ordering and mode-specific status rules as user History. Every database read is filtered by the astrologer id from the valid session. Each item contains the booked user's id, name, birth date, local birth time, birth place, gender and optional phone number. The query does not select or return user email. Phone bookings never expose a call-room action; the UI renders the saved number as `tel:`.

`GET /api/astrologer/bookings/:bookingId` supports direct protected navigation to `/astrologer/call/:bookingId`. It accepts a UUID and returns `{booking}` only for an owned Normal booking; another astrologer's id, a phone booking or a missing row returns the same `404 Booking not found` response. Both endpoints reject extra body or query data.

## Blogs

Public list pagination accepts only an integer `page` from 1 through 10,000. It returns `{posts,nextPage}`; each summary contains the title, two-line-ready excerpt, public astrologer identity, publication time and current counts. Drafts and unpublished posts return no public row. The detail response contains the plain-text body and oldest-first comments with only a first name and stable public avatar key.

User mutations use the user session subject and never accept a user id. Like is an empty `PUT`. Comment creation accepts `{body}` after trimming, with 1–500 characters, and allows five accepted attempts per minute for one user and IP in the current backend process. A limited request returns `429` and `Retry-After`. User comment deletion combines the session user, post id and comment id; foreign comments return `404`.

Astrologer routes sit behind both the active-account guard and the temporary-password gate. Write bodies are `{title,body,status}` with a trimmed 1–120 character title, a non-empty plain-text body, and `draft` or `published`. Every read, update and delete includes the session astrologer id. The owner routes use the owner guard and expose no user email or full name.

## WebSocket messages

### Connection and admission

- **URL:** `/ws?role=user` or `/ws?role=astrologer` on the same host as the page. The query must contain exactly that one role selector.
- **Upgrade checks:** the `Origin` header must exactly equal `APP_ORIGIN`, and the selected role's signed, unexpired server session cookie must resolve during the upgrade. Missing sessions are rejected before a WebSocket opens.
- **Room admission:** a valid `join` is accepted only when the session subject is that booking's user or astrologer, the booking is confirmed and `in_app`, and current time is from `startsAt` inclusive to `endsAt` exclusive. A generic unavailable close reason does not reveal which check failed.
- **Format and limit:** text JSON only, at most 16 KiB. Every client and server message is checked by a strict Zod schema. Binary, malformed, oversized and out-of-order messages close the socket.
- **Isolation:** rooms are keyed by booking UUID. Offers, answers, ICE candidates, mute state and chat go only to the other participant in that room. A newer socket replaces only the same role's older socket.

| Type | Direction | Payload | Who can send it | Step |
|---|---|---|---|---|
| `join` | Client → server | `{type:"join",bookingId}` | An upgraded user or astrologer; the server performs booking/window authorization | 10 |
| `join` | Server → client | `{type:"join",bookingId,participant}` | Server acknowledgement after admission and first-join recording | 10 |
| `leave` | Client → server | `{type:"leave"}` | A participant currently in a room | 10 |
| `leave` | Server → client | `{type:"leave",participant,reason:"left"\|"ended"}` | Server when the other participant leaves or the room ends | 10 |
| `presence` | Server → client | `{type:"presence",participants:{user,astrologer}}`; each participant has `present` and `muted` booleans | Server after joins and departures | 10 |
| `offer` | Client → server / server → peer | Client sends `{type:"offer",sdp}`; peer receives `{type:"offer",from,sdp}` | A participant currently in the room | 10 |
| `answer` | Client → server / server → peer | Client sends `{type:"answer",sdp}`; peer receives `{type:"answer",from,sdp}` | A participant currently in the room | 10 |
| `ice-candidate` | Client → server / server → peer | `{type:"ice-candidate",candidate}`; relayed form also includes `from` | A participant currently in the room | 10 |
| `mute-state` | Client → server / server → peer | Client sends `{type:"mute-state",muted}`; peer receives `{type:"mute-state",participant,muted}` | A participant currently in the room | 10 |
| `chat` | Client → server / server → peer | Client sends `{type:"chat",text}`; peer receives `{type:"chat",from,text}`. Text is trimmed and must contain 1–500 characters | A participant currently in the room, at most once per second per socket | 11 |

Chat is relay-only: the server does not store or replay it. The first admitted join updates only the matching `userJoinedAt` or `astrologerJoinedAt` null field. At `endsAt`, the authoritative server timer closes every active room socket with code `4000` and finalizes the booking; a server sweep covers confirmed in-app bookings without an active room. The stored status becomes `completed` only when both first-join timestamps exist, otherwise `missed`.

## Webhooks

| Source | Path | Events handled | How it's verified | Step |
|---|---|---|---|---|
| Razorpay | `POST /api/razorpay/webhook` | `payment.captured`, `order.paid`, `payment.failed` | HMAC-SHA256 of the untouched raw bytes with `RAZORPAY_WEBHOOK_SECRET`; `x-razorpay-event-id` is inserted once | 12 |

The raw-body handler is mounted before `express.json()`. Captured/paid events use the same idempotent settlement/refund path as browser verification. Failed events change a still-created Payment to `failed` but leave its booking hold to expire normally. A duplicate event id returns `204` without applying the event again; invalid signatures or payloads return `400`.

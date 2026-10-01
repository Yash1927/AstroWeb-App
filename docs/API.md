# API

Every HTTP endpoint, WebSocket message and webhook, as built. HTTP routes live under `/api` and WebSockets under `/ws`, both on the same domain as the frontend.

Last updated: 2026-10-01

## Conventions

- HTTP endpoints are mounted below `/api` (README §1).
- Health, public settings, public astrologer cards and eligible astrologer slots need no session. Owner, astrologer and Google callback endpoints are public; protected endpoints run the matching role guard.
- Current account, profile and public-card bodies, parameters and query strings are Zod-validated. Invalid non-login input returns `400` with `{"error":"Check the information and try again."}`. Password logins deliberately use the same 401 response for invalid input and bad credentials. The Google form accepts its documented fields and ignores extra provider fields.
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
| POST | `/api/auth/google` | Public Google redirect | Verifies a Google credential and creates a user session | 6 |
| GET | `/api/me` | User | Returns the signed-in user's own account and details | 6 |
| PUT | `/api/me` | User | Replaces the signed-in user's own editable details | 6 |
| POST | `/api/auth/logout` | User | Deletes the current user session and clears its cookie | 6 |
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
| GET | `/api/astrologer/session` | Astrologer | Confirms the session and reports whether password replacement is required | 4 |
| POST | `/api/astrologer/logout` | Astrologer | Deletes the session and clears the astrologer cookie | 4 |
| PUT | `/api/astrologer/password` | Astrologer | Replaces a temporary password and rotates all astrologer sessions | 4 |
| GET | `/api/astrologer/profile` | Astrologer | Returns only the signed-in astrologer's profile | 4 |
| PUT | `/api/astrologer/profile` | Astrologer | Saves only the signed-in astrologer's profile | 4 |
| GET | `/api/astrologer/availability` | Astrologer | Returns only the signed-in astrologer's hours and exceptions | 7 |
| PUT | `/api/astrologer/availability` | Astrologer | Atomically replaces only the signed-in astrologer's availability | 7 |

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

The email, Google subject and credits cannot be changed through `PUT`. Birth time is stored as the local clock time entered, without timezone conversion. `POST /api/auth/logout` deletes the current Session row, clears the root-path user cookie and returns `204`.

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

The role guard resolves only an astrologer session and then checks the matching account is still active. Profile access also requires `mustChangePassword = false`.

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

## WebSocket messages

| Type | Direction | Payload | Who can send it | Step |
|---|---|---|---|---|

## Webhooks

| Source | Path | Events handled | How it's verified | Step |
|---|---|---|---|---|

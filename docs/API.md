# API

Every HTTP endpoint, WebSocket message and webhook, as built. HTTP routes live under `/api` and WebSockets under `/ws`, both on the same domain as the frontend.

Last updated: 2026-10-01

## Conventions

- HTTP endpoints are mounted below `/api` (README §1).
- The health and public settings endpoints are public. Owner and astrologer login are public; every `/api/owner/*` and `/api/astrologer/*` endpoint runs its role guard first.
- Owner and astrologer bodies, parameters and query strings are strict Zod objects. Invalid protected input returns `400` with `{"error":"Check the information and try again."}`. Invalid login input deliberately uses the same 401 response as bad credentials.
- Owner authentication uses `astrowebapp_owner_session` scoped to `/api/owner`. Astrologer authentication uses `astrowebapp_astrologer_session` scoped to `/` so later shared APIs and `/ws` receive it. Both are httpOnly, last 12 hours, use SameSite=Lax and are Secure when `NODE_ENV=production`.
- Missing or invalid authentication returns `401`. Missing records return `404`; duplicate email, password-gate failures and invalid state transitions return `409`; database/service failures return a generic `503`.

## Endpoints

| Method | Path | Who can call it | What it does | Step |
|---|---|---|---|---|
| GET | `/api/health` | Public | Confirms that the Express process can answer requests | 1 |
| GET | `/api/health/db` | Public | Runs a small database query and reports whether Neon is reachable | 2 |
| GET | `/api/settings/public` | Public | Returns only current prices, pack size and call durations | 2 |
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

### GET /api/health

- **Who:** Public.
- **Request:** No body, parameters or query.
- **Response:** `200 OK` with `{"ok":true}`.
- **Errors:** No endpoint-specific errors. Connection failures mean the backend process or development proxy is unavailable.
- **Rate limit:** None yet.

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

## Astrologer authentication and profile

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

## WebSocket messages

| Type | Direction | Payload | Who can send it | Step |
|---|---|---|---|---|

## Webhooks

| Source | Path | Events handled | How it's verified | Step |
|---|---|---|---|---|

# API

Every HTTP endpoint, WebSocket message and webhook, as built. HTTP routes live under `/api` and WebSockets under `/ws`, both on the same domain as the frontend.

Last updated: 2026-09-30

## Conventions

- HTTP endpoints are mounted below `/api` (README §1).
- The health and public settings endpoints are public. Owner login is public; every `/api/owner/*` endpoint runs `requireOwner` first.
- Owner bodies, parameters and query strings are strict Zod objects. Invalid owner input returns `400` with `{"error":"Check the information and try again."}`. Invalid login input deliberately uses the same 401 response as bad credentials.
- Owner authentication uses the httpOnly `astrowebapp_owner_session` cookie scoped to `/api/owner`. It expires after 12 hours and is Secure when `NODE_ENV=production`.
- Missing or invalid owner authentication returns `401`. Missing records return `404`; duplicate email and invalid state transitions return `409`; database/service failures return a generic `503`.

## Endpoints

| Method | Path | Who can call it | What it does | Step |
|---|---|---|---|---|
| GET | `/api/health` | Public | Confirms that the Express process can answer requests | 1 |
| GET | `/api/health/db` | Public | Runs a small database query and reports whether Neon is reachable | 2 |
| GET | `/api/settings/public` | Public | Returns only current prices, pack size and call durations | 2 |
| POST | `/api/auth/owner/login` | Public | Verifies owner credentials and creates an owner session | 3 |
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
| `GET /api/owner/astrologers/:id` | UUID path id | `{astrologer}` with email, expertise, languages, experience, states and creation time |
| `PATCH /api/owner/astrologers/:id` | UUID path id plus `displayName` and `email` | `{astrologer}` |
| `PATCH /api/owner/astrologers/:id/listing` | UUID path id plus `{isListed: boolean}` | `{astrologer}`; an inactive account cannot be shown |
| `PATCH /api/owner/astrologers/:id/active` | UUID path id plus `{isActive: boolean}` | `{astrologer}`; deactivation also unlists it |
| `POST /api/owner/astrologers/:id/reset-password` | UUID path id plus `temporaryPassword` 10–256 chars | `{"ok":true}` and `mustChangePassword` becomes true |

## Owner settings

`GET /api/owner/settings` returns the same seven business values as the public settings route. `PUT /api/owner/settings` requires all seven values. Prices must be non-negative integer paise, pack size must be a positive integer, and each duration must be exactly 10, 15 or 30.

## WebSocket messages

| Type | Direction | Payload | Who can send it | Step |
|---|---|---|---|---|

## Webhooks

| Source | Path | Events handled | How it's verified | Step |
|---|---|---|---|---|

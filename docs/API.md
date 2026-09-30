# API

Every HTTP endpoint, WebSocket message and webhook, as built. HTTP routes live under `/api` and WebSockets under `/ws`, both on the same domain as the frontend.

Last updated: 2026-09-30

## Conventions

- HTTP endpoints are mounted below `/api` (README §1).
- The health and public settings endpoints are public and have no request data to validate.
- Authentication, error response shapes and rate limits are not built yet. They are added with the first protected routes in Step 3.

## Endpoints

| Method | Path | Who can call it | What it does | Step |
|---|---|---|---|---|
| GET | `/api/health` | Public | Confirms that the Express process can answer requests | 1 |
| GET | `/api/health/db` | Public | Runs a small database query and reports whether Neon is reachable | 2 |
| GET | `/api/settings/public` | Public | Returns only current prices, pack size and call durations | 2 |

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

## WebSocket messages

| Type | Direction | Payload | Who can send it | Step |
|---|---|---|---|---|

## Webhooks

| Source | Path | Events handled | How it's verified | Step |
|---|---|---|---|---|

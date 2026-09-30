# API

Every HTTP endpoint, WebSocket message and webhook, as built. HTTP routes live under `/api` and WebSockets under `/ws`, both on the same domain as the frontend.

Last updated: 2026-09-30

## Conventions

- HTTP endpoints are mounted below `/api` (README §1).
- The Step 1 health endpoint is public and has no request data to validate.
- Authentication, error response shapes and rate limits are not built yet. They are added with the first protected routes in Step 3.

## Endpoints

| Method | Path | Who can call it | What it does | Step |
|---|---|---|---|---|
| GET | `/api/health` | Public | Confirms that the Express process can answer requests | 1 |

### GET /api/health

- **Who:** Public.
- **Request:** No body, parameters or query.
- **Response:** `200 OK` with `{"ok":true}`.
- **Errors:** No endpoint-specific errors. Connection failures mean the backend process or development proxy is unavailable.
- **Rate limit:** None yet.

## WebSocket messages

| Type | Direction | Payload | Who can send it | Step |
|---|---|---|---|---|

## Webhooks

| Source | Path | Events handled | How it's verified | Step |
|---|---|---|---|---|

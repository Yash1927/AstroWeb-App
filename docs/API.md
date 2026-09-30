# API

Every HTTP endpoint, WebSocket message and webhook, as built. HTTP routes live under `/api` and WebSockets under `/ws`, both on the same domain as the frontend.

Last updated: 2026-09-30 (no endpoints yet)

## Conventions

_Write in Steps 1 and 3:_ how each role authenticates (cookies), the shape of error responses, how requests are validated, and the rate limits.

## Endpoints

| Method | Path | Who can call it | What it does | Step |
|---|---|---|---|---|

Below the table, add one section per endpoint, in this format:

```markdown
### METHOD /api/path
- **Who:** public / user / astrologer / owner
- **Request:** body, params and query, with types and limits
- **Response:** its shape, with an example that uses placeholder data only
- **Errors:** status codes, and when each happens
- **Rate limit:** if there is one
```

## WebSocket messages

| Type | Direction | Payload | Who can send it | Step |
|---|---|---|---|---|

## Webhooks

| Source | Path | Events handled | How it's verified | Step |
|---|---|---|---|---|

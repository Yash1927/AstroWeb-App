# Architecture

How the app is put together, as built. For what it should do, see [README.md](../README.md).

Last updated: 2026-09-30

## Current state

Only the boilerplate exists. README §14 lists its problems.

- `frontend/`: the Vite + React starter template.
- `backend/`:
  - an Express app with no mounted routes and no `listen`
  - a Prisma 8 schema with three models: `Astro`, `User` and `Blogs`
  - a WebSocket stub in `backend/src/realtime/`

## Overview

_Write this in Step 1 and keep it current._ Describe the parts of the system and how they talk to each other, with a Mermaid diagram.

## Folder structure

_Keep a short tree of the important folders and what each one holds._

## Key libraries

| Library | Used for | Added in step |
|---|---|---|

## External services

| Service | Used for | Env vars | Added in step |
|---|---|---|---|

## Main flows

Describe each flow once it's built, with a sequence diagram where it helps. Link each row to its section below.

| Flow | Built in steps | Section |
|---|---|---|
| Owner and astrologer login | 3, 4 | — |
| User sign-in with Google | 6 | — |
| Time slots and booking holds | 7, 8 | — |
| In-app call (WebSocket signalling, WebRTC, TURN) | 10, 11 | — |
| Payments (Razorpay orders, verification, webhooks, refunds) | 12, 13 | — |
| Blogs | 14 | — |
| Install and offline support (service worker) | 15 | — |

## Differences from the spec

List anything that works differently from the README, and link to the decision in [DECISIONS.md](DECISIONS.md).

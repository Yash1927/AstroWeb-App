# Setup

How to install and run the project as it is now. The planned setup is in README §13.

Last updated: 2026-09-30

## Requirements

- Node.js 24 and npm
- Windows 11 (the dev machine), with PowerShell or VS Code terminals

## Install

```powershell
cd backend
npm install
cd ..\frontend
npm install
```

## Environment variables

| Variable | File | What it's for | Needed from step | Example |
|---|---|---|---|---|
| `DATABASE_URL` | `backend/.env` | Postgres connection (boilerplate) | — | `postgresql://user:password@localhost:5432/mydb` |

## Commands

| What | Folder | Command |
|---|---|---|
| Frontend dev server | `frontend/` | `npm run dev` |
| Frontend production build | `frontend/` | `npm run build` |
| Frontend lint | `frontend/` | `npm run lint` |
| Emit the Prisma contract | `backend/` | `npm run contract:emit` |

The backend has no `dev` or `start` script yet. Step 1 adds them.

## Running locally

_Write in Step 1._

## Testing on a phone (HTTPS tunnel)

_Write the first time it's set up (from Step 11)._

## Production

_Write in Step 16:_ building and starting the app, production env vars, HTTPS and WebSockets, and switching Razorpay to live keys.

## Troubleshooting

| Problem | Fix |
|---|---|

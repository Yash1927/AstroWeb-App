# Step 2: Database and seed

- **Status:** Done
- **Spec:** README §4, §5.2, §11, §13, §14 and §17
- **Started:** 2026-09-30
- **Finished:** 2026-09-30

## Goal

Replace the boilerplate database contract with the complete AstroWebApp data model and a reviewable Prisma 8 migration. Add idempotent owner/settings seeding and the two public database-backed endpoints, then apply and verify the migration on Neon.

## Plan

- **Screens and UI:** No frontend or panel changes.
- **API:** Add `GET /api/health/db` and a narrowly selected `GET /api/settings/public` response.
- **Database:** Define every README §11 model, enum, relation, unique constraint and default. Emit the Prisma 8 contract, plan a migration, add resumable raw operations for `btree_gist` and `Booking_no_overlap`, validate the migration package, apply it with the direct Neon connection, and verify the database contract.
- **Real-time:** No changes.
- **New libraries:** Upgrade `prisma` and `@prisma/orm-postgres` together to their current release-candidate versions. Add `argon2` for the owner password hash. Remove the obsolete direct `@prisma/cli-engine` dependency and import config helpers from `prisma/config`.

## Edge cases

- User birth details and gender remain nullable after Google sign-in until the booking details form is completed; phone is also nullable until a phone call is booked.
- The settings seed checks the fixed singleton id before inserting, so a second run changes no timestamps or values.
- The owner seed stores only an Argon2id hash and never logs the email or password.
- Missing or invalid seed environment variables stop before any database write.
- Pending-payment and confirmed bookings for one astrologer cannot overlap; completed, missed and expired bookings do not block a time range.
- Migration commands use `DIRECT_DATABASE_URL`; runtime endpoints and the seed use pooled `DATABASE_URL`.
- Database failures return a generic unavailable response without connection details.

## Test plan

- **Automated:** Test seed input validation, Argon2id hashing, idempotent insert behaviour, public settings response shape and database failure responses with Vitest where practical. Run migration integrity checks, backend type-check/tests, frontend lint/build, and a production-dependency audit.
- **Manual:** Apply the migration, run the seed twice, inspect all Neon tables and seeded rows, call both endpoints through Vite, verify database drift, and confirm a second overlapping booking is rejected.

## As built

- `backend/src/prisma/contract.prisma` defines all 13 README §11 models, nine enums, relations, defaults, unique keys, paise amounts and PostgreSQL temporal columns.
- Prisma 8 emitted the runtime contract and planned `20260930T0841_database_schema`. The migration intentionally drops the empty boilerplate `Astro`, `Blogs` and `User` tables instead of inventing a `googleSub` backfill.
- The migration's raw, resumable operations enable `btree_gist` and add `Booking_no_overlap`. Its compiled 45-operation package passes `prisma migration check`.
- `prisma.config.ts` uses the direct migration URL. `src/prisma/db.ts` keeps the pooled runtime URL and loads the Node 24 Temporal polyfill.
- `npm run seed` validates the owner inputs, creates an Argon2id hash only when the owner is absent, and creates Settings id `1` only when absent. Both writes share a transaction.
- `GET /api/health/db` reports query availability. `GET /api/settings/public` selects only seven public price, pack and duration fields.
- Vitest covers seed input normalization/rejection and verifies the password output is Argon2id.
- New runtime dependencies are `argon2` and `temporal-polyfill`. Prisma CLI and PostgreSQL runtime packages were upgraded to their current release-candidate versions.

## How to try it

1. Add the direct Neon URL, owner email and an owner password of at least 10 characters to `backend/.env`.
2. From `backend/`, run `npm run db:migrate`, `npm run seed`, `npm run seed`, then `npm run db:verify`.
3. Confirm the second seed reports both rows as already present.
4. Start both development servers and open `/api/health/db` and `/api/settings/public` through `http://localhost:5173`.
5. In Neon, confirm all README §11 tables, the one owner, the Settings defaults and the `Booking_no_overlap` constraint.

## Follow-ups and known issues

- Prisma currently warns that a future `pg` major version will change `sslmode=require` semantics. README §13 explicitly requires `sslmode=require`; review the warning when upgrading `pg` or Prisma.

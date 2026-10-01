# Database

Neon Postgres, accessed through Prisma 8. The source contract is `backend/src/prisma/contract.prisma`, and the product model is README §11.

Last updated: 2026-10-01

## Current state

The complete 13-table contract is applied to Neon. Migration `20260930T0841_database_schema` replaced the empty boilerplate tables, enabled `btree_gist` and added the active-booking overlap constraint. Step 4 migration `20260930T1814_astrologer_profile_saved_at` adds the nullable first-profile-save marker. Prisma reports that the database marker and live schema match the emitted contract.

The running app and seed use pooled `DATABASE_URL`. Migration commands use direct `DIRECT_DATABASE_URL`. Money columns are whole paise. Instants are PostgreSQL `timestamptz`; local calendar dates and availability clock times use `date` and `time`.

## Tables

### `Owner`

| Column | Type | Nullable | Default / notes |
|---|---|---|---|
| `id` | text | No | UUID in normal ORM creates; the seed uses the stable value `owner` |
| `email` | text | No | Unique |
| `passwordHash` | text | No | Argon2id hash; never the plain password |

The Step 2 seed creates the one owner row. Step 3 reads its hash for owner login; neither the API nor UI returns the hash.

### `Astrologer`

| Column | Type | Nullable | Default / notes |
|---|---|---|---|
| `id` | text | No | UUID |
| `email` | text | No | Unique |
| `passwordHash` | text | No | Owner actions create/reset an Argon2id temporary hash; Step 4 astrologer password replacement stores a new Argon2id hash |
| `mustChangePassword` | boolean | No | `true` |
| `displayName` | text | No | — |
| `expertise` | text[] | No | Empty array; null array elements are rejected |
| `languages` | text[] | No | Empty array; null array elements are rejected |
| `experienceYears` | integer | No | `0` |
| `isActive` | boolean | No | `true` |
| `isListed` | boolean | No | `false` |
| `profileSavedAt` | timestamptz(3) | Yes | Set once by the first successful profile save |
| `createdAt` | timestamptz(3) | No | Current time |

Relations: availability rules, availability exceptions, bookings and blogs.

Owner creates override the database's `isListed = false` default with `true` and leave `mustChangePassword = true`. Step 4 records `profileSavedAt` without changing an owner's listing choice; the public query requires active, listed and saved. Deactivation sets both `isActive = false` and `isListed = false`; reactivation changes only `isActive`.

### `User`

| Column | Type | Nullable | Default / notes |
|---|---|---|---|
| `id` | text | No | UUID |
| `googleSub` | text | No | Unique Google account identifier |
| `email` | text | No | Not used as account identity |
| `name` | text | No | — |
| `birthDate` | date | Yes | Filled before the first booking |
| `birthTime` | time(0) | Yes | Filled before the first booking |
| `birthPlace` | text | Yes | Filled before the first booking |
| `phone` | text | Yes | Required later for phone calls |
| `gender` | text enum | Yes | `male`, `female` or `other` |
| `subscriptionCredits` | integer | No | `0` |
| `createdAt` | timestamptz(3) | No | Current time |

Relations: bookings, payments, blog likes and blog comments. Nullable onboarding fields are recorded in `docs/DECISIONS.md`. Step 6 creates an account by the verified Google `sub`, refreshes its verified email on later sign-ins, and writes the editable details through self-only `/api/me`; birth time remains the local clock value with no timezone conversion.

### `AvailabilityRule`

| Column | Type | Nullable | Default / notes |
|---|---|---|---|
| `id` | text | No | UUID |
| `astrologerId` | text | No | Foreign key to `Astrologer.id` |
| `weekday` | integer | No | Application validation limits this to 0–6 in Step 7 |
| `startTime` | time(0) | No | Local availability clock time |
| `endTime` | time(0) | No | Local availability clock time |

Step 7 stores zero or more rows per weekday for each astrologer. Zero rows means the day is off. The protected replacement validates weekday `0`–`6`, end-after-start and non-overlap before deleting/recreating only the signed-in astrologer's rows in one transaction.

### `AvailabilityException`

| Column | Type | Nullable | Default / notes |
|---|---|---|---|
| `id` | text | No | UUID |
| `astrologerId` | text | No | Foreign key to `Astrologer.id` |
| `date` | date | No | Date being overridden |
| `kind` | text enum | No | `blocked` or `extra` |
| `startTime` | time(0) | Yes | Optional partial-day boundary |
| `endTime` | time(0) | Yes | Optional partial-day boundary |

Step 7 uses null start/end only for a whole-date `blocked` exception. Partial blocks and every `extra` exception have both local clock times. A whole-date block is the date's only exception; timed exceptions on one date cannot overlap. The slot engine adds extra windows before subtracting blocks.

### `Booking`

| Column | Type | Nullable | Default / notes |
|---|---|---|---|
| `id` | text | No | UUID |
| `userId` | text | No | Foreign key to `User.id` |
| `astrologerId` | text | No | Foreign key to `Astrologer.id` |
| `callType` | text enum | No | `normal`, `urgent` or `subscription` |
| `callMode` | text enum | No | `in_app` or `phone` |
| `startsAt`, `endsAt` | timestamptz(3) | No | UTC booking interval |
| `status` | text enum | No | `pending_payment`, `confirmed`, `completed`, `missed` or `expired` |
| `holdExpiresAt` | timestamptz(3) | Yes | Payment hold expiry |
| `pricePaise` | integer | No | Price copied at booking time |
| `usedCredit` | boolean | No | `false` |
| `userJoinedAt` | timestamptz(3) | Yes | In-app calls only |
| `astrologerJoinedAt` | timestamptz(3) | Yes | In-app calls only |
| `createdAt` | timestamptz(3) | No | Current time |

Relations: one user, one astrologer and optional related payments.

Step 7 reads confirmed intervals and `pending_payment` intervals whose `holdExpiresAt` is still in the future when calculating slots. It never inserts, updates or deletes a Booking. Expired holds do not remove a displayed slot; Step 8 will expire them transactionally before inserting a booking as required by README §6.3.

### `Payment`

| Column | Type | Nullable | Default / notes |
|---|---|---|---|
| `id` | text | No | UUID |
| `userId` | text | No | Foreign key to `User.id` |
| `bookingId` | text | Yes | Foreign key to `Booking.id` |
| `purpose` | text enum | No | `normal_call`, `urgent_call` or `subscription_pack` |
| `razorpayOrderId` | text | No | Unique |
| `razorpayPaymentId` | text | Yes | Unique when present |
| `amountPaise` | integer | No | Charged amount in whole paise |
| `status` | text enum | No | `created`, `paid`, `failed` or `refunded` |
| `createdAt` | timestamptz(3) | No | Current time |

### `WebhookEvent`

| Column | Type | Nullable | Default / notes |
|---|---|---|---|
| `eventId` | text | No | Primary key; de-duplicates Razorpay deliveries |
| `receivedAt` | timestamptz(3) | No | Current time |

### `Settings`

| Column | Type | Nullable | Default / notes |
|---|---|---|---|
| `id` | integer | No | Primary key, default `1`; the app uses the singleton row `1` |
| `normalPricePaise` | integer | No | `0` |
| `urgentPricePaise` | integer | No | `30000` |
| `subscriptionPricePaise` | integer | No | `99900` |
| `subscriptionCallsPerPack` | integer | No | `4` |
| `normalDurationMin` | integer | No | `15` |
| `urgentDurationMin` | integer | No | `15` |
| `subscriptionDurationMin` | integer | No | `15` |
| `updatedAt` | timestamptz | No | Set on create and each non-empty ORM update |

The server reads this row for the public settings endpoint and reads the matching duration on every Step 7 slot request. Booking and payment creation are built in later steps.

### `Blog`

| Column | Type | Nullable | Default / notes |
|---|---|---|---|
| `id` | text | No | UUID |
| `astrologerId` | text | No | Foreign key to `Astrologer.id` |
| `title`, `body` | text | No | — |
| `status` | text enum | No | `draft` by default; also `published` |
| `publishedAt` | timestamptz(3) | Yes | — |
| `createdAt` | timestamptz(3) | No | Current time |
| `updatedAt` | timestamptz | No | Set on create and each non-empty ORM update |

### `BlogLike`

| Column | Type | Nullable | Default / notes |
|---|---|---|---|
| `blogId` | text | No | Foreign key to `Blog.id`; part of composite primary key |
| `userId` | text | No | Foreign key to `User.id`; part of composite primary key |
| `createdAt` | timestamptz(3) | No | Current time |

The composite key makes `(blogId, userId)` unique.

### `BlogComment`

| Column | Type | Nullable | Default / notes |
|---|---|---|---|
| `id` | text | No | UUID |
| `blogId` | text | No | Foreign key to `Blog.id` |
| `userId` | text | No | Foreign key to `User.id` |
| `body` | text | No | — |
| `createdAt` | timestamptz(3) | No | Current time |

### `Session`

| Column | Type | Nullable | Default / notes |
|---|---|---|---|
| `id` | text | No | UUID |
| `role` | text enum | No | `user`, `astrologer` or `owner` |
| `subjectId` | text | No | Polymorphic account id |
| `expiresAt` | timestamptz(3) | No | Revocation and expiry boundary |
| `createdAt` | timestamptz(3) | No | Current time |

The session manager stores a random UUID as the session id and sends a signed form of that id in the role-specific cookie. Resolution verifies the signature, expected role and `expiresAt`. Logout and expired-session cleanup delete the row. User rows expire 30 days after Google sign-in; owner and astrologer rows expire after 12 hours. Astrologer password replacement, owner password reset and owner deactivation delete all sessions for that astrologer.

## Rules the database enforces

| Rule | Table | How | Step |
|---|---|---|---|
| One account per owner email | `Owner` | Unique constraint on `email` | 2 |
| One account per astrologer email | `Astrologer` | Unique constraint on `email` | 2 |
| One account per Google identity | `User` | Unique constraint on `googleSub` | 2 |
| One like per user and blog | `BlogLike` | Composite primary key on `blogId`, `userId` | 2 |
| Razorpay order and payment ids cannot be reused | `Payment` | Unique constraints | 2 |
| Enum fields contain only listed values | Several | Planner-generated check constraints | 2 |
| List fields contain no null elements | `Astrologer` | Planner-generated check constraints | 2 |
| Related ids must exist | Availability, bookings, payments and blogs | Foreign keys and supporting indexes | 2 |
| One astrologer cannot have overlapping active bookings | `Booking` | `btree_gist` plus `Booking_no_overlap` exclusion constraint for `pending_payment` and `confirmed` | 2 |

## Migrations

| Migration | What it does | Step | Date | Applied |
|---|---|---|---|---|
| `20260926T0607_add_blog_relation` | Boilerplate: creates `Astro`, `User` and `Blogs` | Before Step 1 | 2026-09-26 | Existing baseline |
| `20260930T0841_database_schema` | Replaces the boilerplate with the complete contract, extension and overlap constraint | 2 | 2026-09-30 | Applied |
| `20260930T1814_astrologer_profile_saved_at` | Adds nullable `Astrologer.profileSavedAt` | 4 | 2026-09-30 | Applied |

The application migrations were generated and self-emitted with Prisma 8. `npm run migration:check` reports that the packages and compiled operations are valid. `npm run migration:status` and `npm run db:verify` confirm the Step 4 migration is applied and Neon matches contract hash `4d9b1a55…`.

Step 7 changes no contract or migration. It begins using the availability rows defined in Step 2 and reads active booking intervals for conflict filtering.

## Seed data

`npm run seed` creates only:

| Row | Source | Behaviour on another run |
|---|---|---|
| One `Owner` | `OWNER_EMAIL`; Argon2id hash of `OWNER_PASSWORD` | Existing owner is left unchanged |
| `Settings` id `1` | README §4 defaults | Existing singleton is left unchanged |

The seed validates the email and requires a password of at least 10 characters before opening a transaction. It does not log either value or the hash.

## How to

From `backend/`, after setting the pooled and direct Neon URLs and owner seed values:

```powershell
npm run db:migrate
npm run seed
npm run seed
npm run db:verify
```

The second seed is the idempotency check. Use Neon's Tables view to inspect the rows. Resetting or dropping a database deletes data, so it always requires the user's approval.

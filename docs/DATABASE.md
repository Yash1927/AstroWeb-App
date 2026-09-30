# Database

Neon Postgres, accessed through Prisma 8. The schema is in `backend/src/prisma/contract.prisma`, and the spec is README §11.

Last updated: 2026-09-30

## Current state

The boilerplate schema has three tables, `Astro`, `User` and `Blogs`, created by migration `20260926T0607_add_blog_relation`. Step 2 replaces them with the tables in README §11.

## Tables

Add one section per table covering:
- what the table is for
- its columns: name, type, nullable, default, notes
- its keys, indexes and relations

## Rules the database enforces

Constraints such as unique keys and the booking no-overlap rule, and why each one exists.

| Rule | Table | How | Step |
|---|---|---|---|

## Migrations

| Migration | What it does | Step | Date |
|---|---|---|---|
| `20260926T0607_add_blog_relation` | Boilerplate: creates `Astro`, `User` and `Blogs` | Before Step 1 | 2026-09-26 |

## Seed data

What `npm run seed` creates. The script is added in Step 2.

## How to

How to run migrations, run the seed, and look at the data in the Neon console. Resetting a database deletes its data, so always ask the user first.

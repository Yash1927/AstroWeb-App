#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4d0199379797ac877863f254474c634219f08ffe8504decc5cb28ec5cfc199f5/contract';
import endContract from '../../snapshots/4d0199379797ac877863f254474c634219f08ffe8504decc5cb28ec5cfc199f5/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/9608a0999bb006847f875e40b5f4d8248025a6139f897a09fe56ece30982dd11/contract';
import startContract from '../../snapshots/9608a0999bb006847f875e40b5f4d8248025a6139f897a09fe56ece30982dd11/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
  rawSql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'MediaAsset',
        columns: [
          col('bytes', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1', typeParams: { precision: 3 } },
          }),
          col('height', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ownerAstrologerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('storageKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('width', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'MediaAsset_kind_check_851939b5',
            "\"kind\" IN ('profile_photo', 'blog_image')",
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Astrologer',
        column: col('profileMediaId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Blog',
        column: col('coverMediaId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Blog',
        column: col('readingMinutes', 'int4', {
          notNull: true,
          default: lit(1),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Blog',
        column: col('excerpt', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      rawSql({
        id: 'data.public.Blog.excerpt',
        label: 'Backfill blog excerpts',
        operationClass: 'data',
        target: { id: 'postgres', details: { schema: 'public', objectType: 'column', name: 'excerpt', table: 'Blog' } },
        precheck: [{ description: 'allow excerpt backfill', sql: 'SELECT true AS "result"' }],
        execute: [{ description: 'derive excerpts from plain text', sql: 'UPDATE "public"."Blog" SET "excerpt" = left(regexp_replace("body", E\'\\s+\', \' \', \'g\'), 200) WHERE "excerpt" IS NULL' }],
        postcheck: [{ description: 'verify excerpts are filled', sql: 'SELECT NOT EXISTS (SELECT 1 FROM "public"."Blog" WHERE "excerpt" IS NULL) AS "result"' }],
      }),
      this.setNotNull({ schema: 'public', table: 'Blog', column: 'excerpt' }),
      rawSql({
        id: 'column.public.Blog.body.rich-text',
        label: 'Convert blog bodies to TipTap JSON',
        operationClass: 'data',
        target: { id: 'postgres', details: { schema: 'public', objectType: 'column', name: 'body', table: 'Blog' } },
        precheck: [{ description: 'verify blog body is plain text', sql: 'SELECT (data_type = \'text\') AS "result" FROM information_schema.columns WHERE table_schema = \'public\' AND table_name = \'Blog\' AND column_name = \'body\'' }],
        execute: [
          { description: 'add temporary JSONB body', sql: 'ALTER TABLE "public"."Blog" ADD COLUMN "bodyRich" jsonb' },
          {
            description: 'split plain text paragraphs into a TipTap document',
            sql: `UPDATE "public"."Blog" AS blog SET "bodyRich" = jsonb_build_object('type', 'doc', 'content', COALESCE((SELECT jsonb_agg(jsonb_build_object('type', 'paragraph', 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', btrim(paragraph))))) FROM regexp_split_to_table(blog."body", E'\\n\\s*\\n') AS paragraph WHERE btrim(paragraph) <> ''), '[]'::jsonb))`,
          },
          { description: 'replace plain text body', sql: 'ALTER TABLE "public"."Blog" DROP COLUMN "body"' },
          { description: 'rename rich body', sql: 'ALTER TABLE "public"."Blog" RENAME COLUMN "bodyRich" TO "body"' },
          { description: 'require rich body', sql: 'ALTER TABLE "public"."Blog" ALTER COLUMN "body" SET NOT NULL' },
        ],
        postcheck: [{ description: 'verify blog body is JSONB', sql: 'SELECT (data_type = \'jsonb\') AS "result" FROM information_schema.columns WHERE table_schema = \'public\' AND table_name = \'Blog\' AND column_name = \'body\'' }],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Astrologer',
        constraint: 'Astrologer_profileMediaId_key',
        columns: ['profileMediaId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'MediaAsset',
        constraint: 'MediaAsset_storageKey_key',
        columns: ['storageKey'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Blog',
        index: 'Blog_coverMediaId_idx_a9883159',
        columns: ['coverMediaId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'MediaAsset',
        index: 'MediaAsset_ownerAstrologerId_idx_59bdb05e',
        columns: ['ownerAstrologerId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'MediaAsset',
        foreignKey: {
          name: 'MediaAsset_ownerAstrologerId_fkey',
          columns: ['ownerAstrologerId'],
          references: { schema: 'public', table: 'Astrologer', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Astrologer',
        foreignKey: {
          name: 'Astrologer_profileMediaId_fkey',
          columns: ['profileMediaId'],
          references: { schema: 'public', table: 'MediaAsset', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Blog',
        foreignKey: {
          name: 'Blog_coverMediaId_fkey',
          columns: ['coverMediaId'],
          references: { schema: 'public', table: 'MediaAsset', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

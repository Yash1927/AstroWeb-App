#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/fe22a661c41567837b8057b7b51d49151c81df49fb6b9cd20d83b9b739711b46/contract';
import endContract from '../../snapshots/fe22a661c41567837b8057b7b51d49151c81df49fb6b9cd20d83b9b739711b46/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'Astro',
        columns: [
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Blogs',
        columns: [
          col('Comment', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('Descr', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('Like', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('astroId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'User',
        columns: [
          col('credits', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Astro',
        constraint: 'Astro_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_email_key',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Blogs',
        index: 'Blogs_astroId_idx_032c8db5',
        columns: ['astroId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Blogs',
        foreignKey: {
          name: 'Blogs_astroId_fkey',
          columns: ['astroId'],
          references: { schema: 'public', table: 'Astro', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

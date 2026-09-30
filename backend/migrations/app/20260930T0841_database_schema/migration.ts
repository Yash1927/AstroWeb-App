#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/ead2cfe23b889616882ccec88684ddc2e6ee78a685c46c72ea4b98dc8ee305e4/contract';
import endContract from '../../snapshots/ead2cfe23b889616882ccec88684ddc2e6ee78a685c46c72ea4b98dc8ee305e4/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fe22a661c41567837b8057b7b51d49151c81df49fb6b9cd20d83b9b739711b46/contract';
import startContract from '../../snapshots/fe22a661c41567837b8057b7b51d49151c81df49fb6b9cd20d83b9b739711b46/contract.json' with { type: 'json' };
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
      rawSql({
        id: 'extension.btree_gist',
        label: 'Enable extension "btree_gist"',
        operationClass: 'additive',
        target: { id: 'postgres' },
        precheck: [
          {
            description: 'Check whether btree_gist still needs to be enabled',
            sql: "SELECT NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gist') AS ok",
          },
        ],
        execute: [
          {
            description: 'Enable btree_gist',
            sql: 'CREATE EXTENSION IF NOT EXISTS btree_gist',
          },
        ],
        postcheck: [
          {
            description: 'Verify btree_gist is enabled',
            sql: "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gist') AS ok",
          },
        ],
      }),
      this.dropTable({ schema: 'public', table: 'Blogs' }),
      this.dropTable({ schema: 'public', table: 'Astro' }),
      this.dropTable({ schema: 'public', table: 'User' }),
      this.createTable({
        schema: 'public',
        table: 'Astrologer',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1', typeParams: { precision: 3 } },
          }),
          col('displayName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('experienceYears', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('expertise', 'text[]', {
            notNull: true,
            default: lit([]),
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('isListed', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('languages', 'text[]', {
            notNull: true,
            default: lit([]),
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('mustChangePassword', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Astrologer_expertise_elem_not_null_0a98fe9c',
            'array_position("expertise", NULL) IS NULL',
          ),
          checkExpression(
            'Astrologer_languages_elem_not_null_d4aa0a00',
            'array_position("languages", NULL) IS NULL',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'AvailabilityException',
        columns: [
          col('astrologerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('date', 'date', { notNull: true, codecRef: { codecId: 'pg/date-temporal@1' } }),
          col('endTime', 'time(0)', {
            codecRef: { codecId: 'pg/time-temporal@1', typeParams: { precision: 0 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('startTime', 'time(0)', {
            codecRef: { codecId: 'pg/time-temporal@1', typeParams: { precision: 0 } },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'AvailabilityException_kind_check_f80667a4',
            "\"kind\" IN ('blocked', 'extra')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'AvailabilityRule',
        columns: [
          col('astrologerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('endTime', 'time(0)', {
            notNull: true,
            codecRef: { codecId: 'pg/time-temporal@1', typeParams: { precision: 0 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('startTime', 'time(0)', {
            notNull: true,
            codecRef: { codecId: 'pg/time-temporal@1', typeParams: { precision: 0 } },
          }),
          col('weekday', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Blog',
        columns: [
          col('astrologerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('body', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('publishedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1', typeParams: { precision: 3 } },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('draft'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('Blog_status_check_e888e82e', "\"status\" IN ('draft', 'published')"),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'BlogComment',
        columns: [
          col('blogId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('body', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'BlogLike',
        columns: [
          col('blogId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['blogId', 'userId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Booking',
        columns: [
          col('astrologerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('astrologerJoinedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1', typeParams: { precision: 3 } },
          }),
          col('callMode', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('callType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1', typeParams: { precision: 3 } },
          }),
          col('endsAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1', typeParams: { precision: 3 } },
          }),
          col('holdExpiresAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('pricePaise', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('startsAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1', typeParams: { precision: 3 } },
          }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('usedCredit', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userJoinedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('Booking_callMode_check_a73543f2', "\"callMode\" IN ('in_app', 'phone')"),
          checkExpression(
            'Booking_callType_check_b6916e36',
            "\"callType\" IN ('normal', 'urgent', 'subscription')",
          ),
          checkExpression(
            'Booking_status_check_7dcd0cb1',
            "\"status\" IN ('pending_payment', 'confirmed', 'completed', 'missed', 'expired')",
          ),
        ],
      }),
      rawSql({
        id: 'constraint.Booking_no_overlap',
        label: 'Prevent overlapping active bookings',
        operationClass: 'additive',
        target: { id: 'postgres' },
        precheck: [
          {
            description: 'Check whether Booking_no_overlap still needs to be added',
            sql: `SELECT NOT EXISTS (
              SELECT 1
              FROM pg_constraint
              WHERE conname = 'Booking_no_overlap'
                AND conrelid = '"public"."Booking"'::regclass
            ) AS ok`,
          },
        ],
        execute: [
          {
            description: 'Add Booking_no_overlap',
            sql: `ALTER TABLE "Booking" ADD CONSTRAINT "Booking_no_overlap"
              EXCLUDE USING gist ("astrologerId" WITH =, tstzrange("startsAt", "endsAt") WITH &&)
              WHERE (status IN ('pending_payment', 'confirmed'))`,
          },
        ],
        postcheck: [
          {
            description: 'Verify Booking_no_overlap exists',
            sql: `SELECT EXISTS (
              SELECT 1
              FROM pg_constraint
              WHERE conname = 'Booking_no_overlap'
                AND conrelid = '"public"."Booking"'::regclass
            ) AS ok`,
          },
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Owner',
        columns: [
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Payment',
        columns: [
          col('amountPaise', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('bookingId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('purpose', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('razorpayOrderId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('razorpayPaymentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Payment_purpose_check_e6409c14',
            "\"purpose\" IN ('normal_call', 'urgent_call', 'subscription_pack')",
          ),
          checkExpression(
            'Payment_status_check_348270cb',
            "\"status\" IN ('created', 'paid', 'failed', 'refunded')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Session',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1', typeParams: { precision: 3 } },
          }),
          col('expiresAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('subjectId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Session_role_check_d574a543',
            "\"role\" IN ('user', 'astrologer', 'owner')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Settings',
        columns: [
          col('id', 'int4', { notNull: true, default: lit(1), codecRef: { codecId: 'pg/int4@1' } }),
          col('normalDurationMin', 'int4', {
            notNull: true,
            default: lit(15),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('normalPricePaise', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('subscriptionCallsPerPack', 'int4', {
            notNull: true,
            default: lit(4),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('subscriptionDurationMin', 'int4', {
            notNull: true,
            default: lit(15),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('subscriptionPricePaise', 'int4', {
            notNull: true,
            default: lit(99900),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('urgentDurationMin', 'int4', {
            notNull: true,
            default: lit(15),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('urgentPricePaise', 'int4', {
            notNull: true,
            default: lit(30000),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'WebhookEvent',
        columns: [
          col('eventId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('receivedAt', 'timestamptz(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['eventId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'User',
        columns: [
          col('birthDate', 'date', { codecRef: { codecId: 'pg/date-temporal@1' } }),
          col('birthPlace', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('birthTime', 'time(0)', {
            codecRef: { codecId: 'pg/time-temporal@1', typeParams: { precision: 0 } },
          }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1', typeParams: { precision: 3 } },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('gender', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('googleSub', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('subscriptionCredits', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('User_gender_check_f90b1c49', '"gender" IN (\'male\', \'female\', \'other\')'),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Astrologer',
        constraint: 'Astrologer_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Owner',
        constraint: 'Owner_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Payment',
        constraint: 'Payment_razorpayOrderId_key',
        columns: ['razorpayOrderId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Payment',
        constraint: 'Payment_razorpayPaymentId_key',
        columns: ['razorpayPaymentId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_googleSub_key',
        columns: ['googleSub'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AvailabilityException',
        index: 'AvailabilityException_astrologerId_idx_e78e3c7e',
        columns: ['astrologerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AvailabilityRule',
        index: 'AvailabilityRule_astrologerId_idx_e78e3c7e',
        columns: ['astrologerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Blog',
        index: 'Blog_astrologerId_idx_e78e3c7e',
        columns: ['astrologerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BlogComment',
        index: 'BlogComment_blogId_idx_47542c9e',
        columns: ['blogId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BlogComment',
        index: 'BlogComment_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BlogLike',
        index: 'BlogLike_blogId_idx_47542c9e',
        columns: ['blogId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BlogLike',
        index: 'BlogLike_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Booking',
        index: 'Booking_astrologerId_idx_e78e3c7e',
        columns: ['astrologerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Booking',
        index: 'Booking_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Payment',
        index: 'Payment_bookingId_idx_17848f4a',
        columns: ['bookingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Payment',
        index: 'Payment_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AvailabilityException',
        foreignKey: {
          name: 'AvailabilityException_astrologerId_fkey',
          columns: ['astrologerId'],
          references: { schema: 'public', table: 'Astrologer', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AvailabilityRule',
        foreignKey: {
          name: 'AvailabilityRule_astrologerId_fkey',
          columns: ['astrologerId'],
          references: { schema: 'public', table: 'Astrologer', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Blog',
        foreignKey: {
          name: 'Blog_astrologerId_fkey',
          columns: ['astrologerId'],
          references: { schema: 'public', table: 'Astrologer', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BlogComment',
        foreignKey: {
          name: 'BlogComment_blogId_fkey',
          columns: ['blogId'],
          references: { schema: 'public', table: 'Blog', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BlogComment',
        foreignKey: {
          name: 'BlogComment_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BlogLike',
        foreignKey: {
          name: 'BlogLike_blogId_fkey',
          columns: ['blogId'],
          references: { schema: 'public', table: 'Blog', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BlogLike',
        foreignKey: {
          name: 'BlogLike_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Booking',
        foreignKey: {
          name: 'Booking_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Booking',
        foreignKey: {
          name: 'Booking_astrologerId_fkey',
          columns: ['astrologerId'],
          references: { schema: 'public', table: 'Astrologer', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Payment',
        foreignKey: {
          name: 'Payment_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Payment',
        foreignKey: {
          name: 'Payment_bookingId_fkey',
          columns: ['bookingId'],
          references: { schema: 'public', table: 'Booking', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

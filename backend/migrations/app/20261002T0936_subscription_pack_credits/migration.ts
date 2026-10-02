#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/4d9b1a553102fb288aa80876cedfcba7c9e01fa9bb25f532514de9524c22d9d7/contract';
import startContract from '../../snapshots/4d9b1a553102fb288aa80876cedfcba7c9e01fa9bb25f532514de9524c22d9d7/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/9608a0999bb006847f875e40b5f4d8248025a6139f897a09fe56ece30982dd11/contract';
import endContract from '../../snapshots/9608a0999bb006847f875e40b5f4d8248025a6139f897a09fe56ece30982dd11/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Payment',
        column: col('creditsPurchased', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

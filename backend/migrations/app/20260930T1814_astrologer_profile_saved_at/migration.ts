#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4d9b1a553102fb288aa80876cedfcba7c9e01fa9bb25f532514de9524c22d9d7/contract';
import endContract from '../../snapshots/4d9b1a553102fb288aa80876cedfcba7c9e01fa9bb25f532514de9524c22d9d7/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ead2cfe23b889616882ccec88684ddc2e6ee78a685c46c72ea4b98dc8ee305e4/contract';
import startContract from '../../snapshots/ead2cfe23b889616882ccec88684ddc2e6ee78a685c46c72ea4b98dc8ee305e4/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Astrologer',
        column: col('profileSavedAt', 'timestamptz(3)', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1', typeParams: { precision: 3 } },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

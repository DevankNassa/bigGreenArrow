import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'big-green-arrow.db';

/** The subset of expo-sqlite the data layer uses, so tests can supply another SQLite. */
export type Db = Pick<SQLiteDatabase, 'execAsync' | 'runAsync' | 'getAllAsync' | 'getFirstAsync'>;

const MIGRATIONS: string[] = [
  // 1: weigh-ins and preferences
  `
  CREATE TABLE weigh_ins (
    id TEXT PRIMARY KEY NOT NULL,
    timestamp TEXT NOT NULL,
    weight_kg REAL NOT NULL,
    source TEXT NOT NULL,
    external_id TEXT,
    origin_app TEXT,
    note TEXT,
    excluded INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX weigh_ins_timestamp ON weigh_ins (timestamp);
  CREATE UNIQUE INDEX weigh_ins_external ON weigh_ins (source, external_id)
    WHERE external_id IS NOT NULL;
  CREATE TABLE preferences (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
];

/** Brings the schema up to date, tracking the version in `PRAGMA user_version`. */
export async function migrate(db: Db): Promise<void> {
  await db.execAsync(`PRAGMA journal_mode = 'wal'`);
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (let version = current; version < MIGRATIONS.length; version++) {
    await db.execAsync(`BEGIN; ${MIGRATIONS[version]} PRAGMA user_version = ${version + 1}; COMMIT;`);
  }
}

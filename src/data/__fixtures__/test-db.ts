/// <reference types="node" />
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import type { Db } from '../db';

type Params = SQLInputValue[];

/** An in-memory SQLite (Node's built-in) behind the same interface as expo-sqlite. */
export function openTestDb(): Db {
  const raw = new DatabaseSync(':memory:');
  const args = (params: unknown[]): Params =>
    (Array.isArray(params[0]) ? params[0] : params) as Params;

  const db = {
    async execAsync(sql: string) {
      raw.exec(sql);
    },
    async runAsync(sql: string, ...params: unknown[]) {
      const r = raw.prepare(sql).run(...args(params));
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    async getAllAsync(sql: string, ...params: unknown[]) {
      return raw.prepare(sql).all(...args(params));
    },
    async getFirstAsync(sql: string, ...params: unknown[]) {
      return raw.prepare(sql).get(...args(params)) ?? null;
    },
  };
  return db as unknown as Db;
}

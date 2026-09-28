// lib/db.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { SCHEMA_SQL, SEED_SQL } from './schema';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = process.env.DATABASE_PATH || './data/ap-agent.db';
  const dir = path.dirname(dbPath);

  // Create data directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);

  // Run schema
  db.exec(SCHEMA_SQL);

  // Seed only if empty
  const vendorCount = (db.prepare('SELECT COUNT(*) as count FROM vendors').get() as any).count;
  if (vendorCount === 0) {
    db.exec(SEED_SQL);
    console.log('[DB] Seeded initial data');
  }

  console.log('[DB] Connected to SQLite at', dbPath);
  return db;
}

// Helper: run a query and return all rows
export function dbAll<T>(sql: string, params: any[] = []): T[] {
  return getDb().prepare(sql).all(...params) as T[];
}

// Helper: run a query and return one row
export function dbGet<T>(sql: string, params: any[] = []): T | undefined {
  return getDb().prepare(sql).get(...params) as T | undefined;
}

// Helper: run insert/update/delete
export function dbRun(sql: string, params: any[] = []) {
  return getDb().prepare(sql).run(...params);
}

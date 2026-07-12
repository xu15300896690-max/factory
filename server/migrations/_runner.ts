import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = __dirname;

export function ensureMigrationsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function checksumOf(sql: string): string {
  return createHash('sha256').update(sql).digest('hex');
}

export function runMigrations(db: Database.Database): { applied: string[]; skipped: string[] } {
  ensureMigrationsTable(db);
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const getStmt = db.prepare<[number]>(
    'SELECT version, checksum FROM _migrations WHERE version = ?',
  );
  const insertStmt = db.prepare(
    'INSERT INTO _migrations (version, name, checksum) VALUES (?, ?, ?)',
  );

  const applied: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const versionMatch = file.match(/^(\d+)_/);
    if (!versionMatch) continue;
    const version = Number(versionMatch[1]);
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    const checksum = checksumOf(sql);
    const existing = getStmt.get(version) as { version: number; checksum: string } | undefined;
    if (existing) {
      if (existing.checksum !== checksum) {
        throw new Error(
          `Migration ${file} checksum mismatch: stored=${existing.checksum}, computed=${checksum}. Refusing to start.`,
        );
      }
      skipped.push(file);
      continue;
    }
    db.transaction(() => {
      db.exec(sql);
      insertStmt.run(version, file, checksum);
    })();
    applied.push(file);
  }

  return { applied, skipped };
}
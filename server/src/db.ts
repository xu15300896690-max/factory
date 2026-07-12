import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from './config.js';

let _db: Database.Database | null = null;

function ensureMigrationsTable(db: Database.Database): void {
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

function getMigrationsDir(): string {
  // When running from src/ (tsx): ../migrations
  // When running from dist/ (compiled): ../../migrations
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const candidate1 = resolve(__dirname, '..', 'migrations');
  if (existsSync(candidate1)) return candidate1;
  return resolve(__dirname, '..', '..', 'migrations');
}

function runMigrations(db: Database.Database): void {
  ensureMigrationsTable(db);
  const dir = getMigrationsDir();
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  const getStmt = db.prepare<[number]>(
    'SELECT version, checksum FROM _migrations WHERE version = ?',
  );
  const insertStmt = db.prepare(
    'INSERT INTO _migrations (version, name, checksum) VALUES (?, ?, ?)',
  );

  for (const file of files) {
    const versionMatch = file.match(/^(\d+)_/);
    if (!versionMatch) continue;
    const version = Number(versionMatch[1]);
    const sql = readFileSync(join(dir, file), 'utf8');
    const checksum = checksumOf(sql);
    const existing = getStmt.get(version) as { version: number; checksum: string } | undefined;
    if (existing) {
      if (existing.checksum !== checksum) {
        throw new Error(
          `Migration ${file} checksum mismatch: stored=${existing.checksum}, computed=${checksum}. Refusing to start.`,
        );
      }
      continue;
    }
    db.transaction(() => {
      db.exec(sql);
      insertStmt.run(version, file, checksum);
    })();
  }
}

export function getDb(): Database.Database {
  if (!_db) {
    const dbPath = resolve(process.cwd(), env.DB_PATH);
    if (!existsSync(dirname(dbPath))) {
      mkdirSync(dirname(dbPath), { recursive: true });
    }
    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    runMigrations(_db);
  }
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
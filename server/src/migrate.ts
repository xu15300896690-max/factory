import { getDb, closeDb } from './db.js';

const result = (() => {
  const db = getDb();
  // Migrations run automatically inside getDb(); this script just exists for explicitness.
  const rows = db
    .prepare('SELECT version, name, applied_at FROM _migrations ORDER BY version')
    .all() as { version: number; name: string; applied_at: string }[];
  return { rows };
})();

console.log('Migrations applied:');
for (const row of result.rows) {
  console.log(`  v${row.version} ${row.name} @ ${row.applied_at}`);
}
closeDb();
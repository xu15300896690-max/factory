import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate, getValid } from '../middleware/validate.js';

const router = Router();
router.use(requireAuth);

router.get('/', (_req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT key, value FROM settings`).all() as { key: string; value: string }[];
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  res.json(out);
});

const PatchSchema = z.record(z.string(), z.string());

router.patch('/', requireRole('admin'), validate(PatchSchema), (req, res) => {
  const data = getValid<Record<string, string>>(req, 'body');
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  );
  db.transaction(() => {
    for (const [k, v] of Object.entries(data)) {
      stmt.run(k, v);
    }
  })();
  res.json({ ok: true });
});

export default router;
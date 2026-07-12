import { Router } from 'express';
import { unlinkSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from '../config.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { closeDb, getDb } from '../db.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

router.post('/reset', requireAuth, requireRole('admin'), (_req, res) => {
  if (env.NODE_ENV === 'production') {
    throw new HttpError(403, 'FORBIDDEN_IN_PROD', 'Reset disabled in production');
  }
  closeDb();
  const dbPath = resolve(process.cwd(), env.DB_PATH);
  for (const ext of ['', '-shm', '-wal']) {
    const p = dbPath + ext;
    if (existsSync(p)) {
      try {
        unlinkSync(p);
      } catch {
        // ignore
      }
    }
  }
  // Re-init via getDb which runs migrations
  getDb();
  // Re-run seed by spawning tsx seed script would require child_process; just instruct client to call /seed
  res.json({ ok: true, message: 'DB reset. POST /api/dev/seed to repopulate.' });
});

export default router;
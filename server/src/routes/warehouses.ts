import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate, getValid } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { WarehouseCreateSchema } from '../types/domain.js';

const router = Router();
router.use(requireAuth);

const PatchSchema = WarehouseCreateSchema.partial();

router.get('/', (_req, res) => {
  const db = getDb();
  const rows = db
    .prepare(`SELECT w.*, (SELECT COUNT(*) FROM items i WHERE i.warehouse_id = w.id) as item_count FROM warehouses w ORDER BY w.name`)
    .all();
  res.json({ warehouses: rows });
});

router.post('/', requireRole('admin'), validate(WarehouseCreateSchema), (req, res) => {
  const data = getValid<z.infer<typeof WarehouseCreateSchema>>(req, 'body');
  const db = getDb();
  const info = db
    .prepare(`INSERT INTO warehouses (name, location, capacity) VALUES (?, ?, ?)`)
    .run(data.name, data.location, data.capacity ?? 0);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.patch('/:id', requireRole('admin'), validate(PatchSchema), (req, res) => {
  const id = Number(req.params.id);
  const data = getValid<z.infer<typeof PatchSchema>>(req, 'body');
  const db = getDb();
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    fields.push(`${k} = @${k}`);
    params[k] = v;
  }
  if (!fields.length) {
    res.json({ ok: true, unchanged: true });
    return;
  }
  fields.push(`updated_at = datetime('now')`);
  db.prepare(`UPDATE warehouses SET ${fields.join(', ')} WHERE id = @id`).run(params);
  res.json({ ok: true });
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const info = db.prepare('DELETE FROM warehouses WHERE id = ?').run(id);
  if (info.changes === 0) throw new HttpError(404, 'WAREHOUSE_NOT_FOUND');
  res.json({ ok: true });
});

export default router;
import { Router } from 'express';
import { getDb } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate, getValid } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { CategoryCreateSchema } from '../types/domain.js';
import { z } from 'zod';

const router = Router();
router.use(requireAuth);

const PatchSchema = CategoryCreateSchema.partial();

router.get('/', (_req, res) => {
  const db = getDb();
  const rows = db
    .prepare(`SELECT c.*, (SELECT COUNT(*) FROM items i WHERE i.category_id = c.id) as item_count FROM categories c ORDER BY c.name`)
    .all();
  res.json({ categories: rows });
});

router.post('/', requireRole('admin'), validate(CategoryCreateSchema), (req, res) => {
  const data = getValid<z.infer<typeof CategoryCreateSchema>>(req, 'body');
  const db = getDb();
  const info = db
    .prepare(`INSERT INTO categories (name, color) VALUES (?, ?)`)
    .run(data.name, data.color);
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
  db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = @id`).run(params);
  res.json({ ok: true });
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const info = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  if (info.changes === 0) throw new HttpError(404, 'CATEGORY_NOT_FOUND');
  res.json({ ok: true });
});

export default router;
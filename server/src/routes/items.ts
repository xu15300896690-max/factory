import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate, getValid } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { ItemCreateSchema, ItemUpdateSchema } from '../types/domain.js';

const router = Router();

const ListQuery = z.object({
  q: z.string().optional(),
  categoryId: z.coerce.number().int().optional(),
  warehouseId: z.coerce.number().int().optional(),
  lowStock: z
    .string()
    .optional()
    .transform((v) => v === '1' || v === 'true'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

router.use(requireAuth);

router.get('/', validate(ListQuery, 'query'), (req, res) => {
  const q = getValid<z.infer<typeof ListQuery>>(req, 'query');
  const db = getDb();
  const where: string[] = [];
  const params: unknown[] = [];
  if (q.q) {
    where.push('(i.name LIKE ? OR i.sku LIKE ? OR i.barcode LIKE ?)');
    const like = `%${q.q}%`;
    params.push(like, like, like);
  }
  if (q.categoryId) {
    where.push('i.category_id = ?');
    params.push(q.categoryId);
  }
  if (q.warehouseId) {
    where.push('i.warehouse_id = ?');
    params.push(q.warehouseId);
  }
  if (q.lowStock) {
    where.push('i.stock <= i.min_stock');
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (q.page - 1) * q.pageSize;

  const total = (
    db.prepare(`SELECT COUNT(*) as c FROM items i ${whereSql}`).get(...params) as { c: number }
  ).c;

  const rows = db
    .prepare(
      `SELECT i.*, c.name as category_name, c.color as category_color, w.name as warehouse_name
       FROM items i
       LEFT JOIN categories c ON c.id = i.category_id
       LEFT JOIN warehouses w ON w.id = i.warehouse_id
       ${whereSql}
       ORDER BY i.name
       LIMIT ? OFFSET ?`,
    )
    .all(...params, q.pageSize, offset);

  res.json({ items: rows, total, page: q.page, pageSize: q.pageSize });
});

router.get('/lookup', (req, res) => {
  const code = String(req.query.code ?? '').trim();
  if (!code) throw new HttpError(400, 'MISSING_CODE', 'Provide ?code=SKU or barcode');
  const db = getDb();
  const row = db
    .prepare(
      `SELECT i.*, c.name as category_name, w.name as warehouse_name
       FROM items i
       LEFT JOIN categories c ON c.id = i.category_id
       LEFT JOIN warehouses w ON w.id = i.warehouse_id
       WHERE i.sku = ? OR i.barcode = ?
       LIMIT 1`,
    )
    .get(code, code);
  if (!row) throw new HttpError(404, 'ITEM_NOT_FOUND');
  res.json(row);
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new HttpError(400, 'BAD_ID');
  const db = getDb();
  const row = db
    .prepare(
      `SELECT i.*, c.name as category_name, c.color as category_color, w.name as warehouse_name
       FROM items i
       LEFT JOIN categories c ON c.id = i.category_id
       LEFT JOIN warehouses w ON w.id = i.warehouse_id
       WHERE i.id = ?`,
    )
    .get(id);
  if (!row) throw new HttpError(404, 'ITEM_NOT_FOUND');
  res.json(row);
});

router.post('/', requireRole('admin'), validate(ItemCreateSchema), (req, res) => {
  const data = getValid<z.infer<typeof ItemCreateSchema>>(req, 'body');
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO items (sku, barcode, name, category_id, warehouse_id, location, stock, min_stock, supplier, unit_price)
       VALUES (@sku, @barcode, @name, @category_id, @warehouse_id, @location, @stock, @min_stock, @supplier, @unit_price)`,
    )
    .run({
      sku: data.sku,
      barcode: data.barcode ?? null,
      name: data.name,
      category_id: data.category_id ?? null,
      warehouse_id: data.warehouse_id ?? null,
      location: data.location ?? '',
      stock: data.stock ?? 0,
      min_stock: data.min_stock ?? 0,
      supplier: data.supplier ?? '',
      unit_price: data.unit_price ?? 0,
    });
  res.status(201).json({ id: info.lastInsertRowid });
});

router.patch('/:id', requireRole('admin'), validate(ItemUpdateSchema), (req, res) => {
  const id = Number(req.params.id);
  const data = getValid<z.infer<typeof ItemUpdateSchema>>(req, 'body');
  const db = getDb();
  const existing = db.prepare('SELECT id FROM items WHERE id = ?').get(id);
  if (!existing) throw new HttpError(404, 'ITEM_NOT_FOUND');
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
  if (data.stock !== undefined) {
    fields.push(`last_updated = date('now')`);
  }
  db.prepare(`UPDATE items SET ${fields.join(', ')} WHERE id = @id`).run(params);
  res.json({ ok: true });
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const info = db.prepare('DELETE FROM items WHERE id = ?').run(id);
  if (info.changes === 0) throw new HttpError(404, 'ITEM_NOT_FOUND');
  res.json({ ok: true });
});

export default router;
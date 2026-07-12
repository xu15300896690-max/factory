import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate, getValid } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { AuditCreateSchema } from '../types/domain.js';
import { approveAudit, createAudit, rejectAudit } from '../services/audit.js';

const router = Router();
router.use(requireAuth);

const ListQuery = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  type: z.enum(['inbound', 'outbound']).optional(),
  itemId: z.coerce.number().int().optional(),
  operatorId: z.coerce.number().int().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

router.get('/', validate(ListQuery, 'query'), (req, res) => {
  const q = getValid<z.infer<typeof ListQuery>>(req, 'query');
  const db = getDb();
  const where: string[] = [];
  const params: unknown[] = [];
  if (q.status) {
    where.push('a.status = ?');
    params.push(q.status);
  }
  if (q.type) {
    where.push('a.type = ?');
    params.push(q.type);
  }
  if (q.itemId) {
    where.push('a.item_id = ?');
    params.push(q.itemId);
  }
  if (q.operatorId) {
    where.push('a.operator_user_id = ?');
    params.push(q.operatorId);
  }
  if (q.startDate) {
    where.push('a.created_at >= ?');
    params.push(q.startDate);
  }
  if (q.endDate) {
    where.push('a.created_at <= ?');
    params.push(q.endDate);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (q.page - 1) * q.pageSize;

  const total = (
    db.prepare(`SELECT COUNT(*) as c FROM audits a ${whereSql}`).get(...params) as { c: number }
  ).c;

  const rows = db
    .prepare(
      `SELECT a.*,
              i.name as item_name, i.sku as item_sku,
              op.display_name as operator_name,
              rv.display_name as reviewer_name,
              p.name as personnel_name
       FROM audits a
       LEFT JOIN items i ON i.id = a.item_id
       LEFT JOIN users op ON op.id = a.operator_user_id
       LEFT JOIN users rv ON rv.id = a.reviewer_user_id
       LEFT JOIN personnel p ON p.id = a.personnel_id
       ${whereSql}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, q.pageSize, offset);

  res.json({ audits: rows, total, page: q.page, pageSize: q.pageSize });
});

router.post('/', validate(AuditCreateSchema), (req, res) => {
  const data = getValid<z.infer<typeof AuditCreateSchema>>(req, 'body');
  const result = createAudit({
    type: data.type,
    item_id: data.item_id,
    quantity: data.quantity,
    note: data.note,
    source: data.source,
    personnel_id: data.personnel_id ?? null,
    operator_user_id: req.user!.id,
  });
  res.status(201).json(result);
});

router.post('/:id/approve', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new HttpError(400, 'BAD_ID');
  approveAudit(id, req.user!.id);
  res.json({ ok: true });
});

router.post('/:id/reject', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new HttpError(400, 'BAD_ID');
  rejectAudit(id, req.user!.id);
  res.json({ ok: true });
});

export default router;
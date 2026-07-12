import { getDb } from '../db.js';
import { HttpError } from '../middleware/error.js';
import { env } from '../config.js';

export interface AuditCreateInput {
  type: 'inbound' | 'outbound';
  item_id: number;
  quantity: number;
  personnel_id: number | null;
  note?: string;
  source?: 'web' | 'android' | 'api';
  operator_user_id: number;
}

export interface CreatedAudit {
  id: number;
  status: 'pending' | 'approved';
  autoApproved: boolean;
}

export function createAudit(input: AuditCreateInput): CreatedAudit {
  const db = getDb();
  const item = db.prepare('SELECT id, stock FROM items WHERE id = ?').get(input.item_id) as
    | { id: number; stock: number }
    | undefined;
  if (!item) throw new HttpError(404, 'ITEM_NOT_FOUND');

  // Auto-approval: admin submits inbound with qty <= autoApprovalLimit => instant approval
  const user = db
    .prepare('SELECT role FROM users WHERE id = ?')
    .get(input.operator_user_id) as { role: 'admin' | 'operator' } | undefined;
  const isAdmin = user?.role === 'admin';
  const autoApprove =
    isAdmin && input.type === 'inbound' && input.quantity <= env.AUTO_APPROVAL_LIMIT;

  if (input.type === 'outbound' && item.stock < input.quantity) {
    throw new HttpError(409, 'INSUFFICIENT_STOCK', `Only ${item.stock} in stock`);
  }

  return db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO audits (type, item_id, quantity, operator_user_id, personnel_id, status, applied, source, note, created_at, reviewed_at, reviewer_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)`,
      )
      .run(
        input.type,
        input.item_id,
        input.quantity,
        input.operator_user_id,
        input.personnel_id ?? null,
        autoApprove ? 'approved' : 'pending',
        autoApprove ? 1 : 0,
        input.source ?? 'web',
        input.note ?? null,
        autoApprove ? new Date().toISOString() : null,
        autoApprove ? input.operator_user_id : null,
      );

    if (autoApprove) {
      const delta = input.type === 'inbound' ? input.quantity : -input.quantity;
      db.prepare(
        `UPDATE items SET stock = stock + ?, last_updated = date('now'), updated_at = datetime('now') WHERE id = ?`,
      ).run(delta, input.item_id);
    }

    return {
      id: Number(info.lastInsertRowid),
      status: (autoApprove ? 'approved' : 'pending') as 'pending' | 'approved',
      autoApproved: autoApprove,
    };
  })();
}

export function approveAudit(auditId: number, reviewerId: number): void {
  const db = getDb();
  db.transaction(() => {
    const audit = db
      .prepare(`SELECT * FROM audits WHERE id = ? AND status = 'pending'`)
      .get(auditId) as
      | {
          id: number;
          type: 'inbound' | 'outbound';
          item_id: number;
          quantity: number;
          applied: number;
        }
      | undefined;
    if (!audit) throw new HttpError(404, 'AUDIT_NOT_FOUND');
    if (audit.applied) {
      throw new HttpError(409, 'ALREADY_APPLIED', 'Audit already applied to inventory');
    }
    const item = db.prepare('SELECT id, stock FROM items WHERE id = ?').get(audit.item_id) as
      | { id: number; stock: number }
      | undefined;
    if (!item) throw new HttpError(404, 'ITEM_NOT_FOUND');
    if (audit.type === 'outbound' && item.stock < audit.quantity) {
      throw new HttpError(409, 'INSUFFICIENT_STOCK', `Only ${item.stock} in stock`);
    }
    const delta = audit.type === 'inbound' ? audit.quantity : -audit.quantity;
    db.prepare(
      `UPDATE items SET stock = stock + ?, last_updated = date('now'), updated_at = datetime('now') WHERE id = ?`,
    ).run(delta, audit.item_id);
    db.prepare(
      `UPDATE audits SET status='approved', reviewer_user_id=?, applied=1, reviewed_at=datetime('now') WHERE id=?`,
    ).run(reviewerId, auditId);
  })();
}

export function rejectAudit(auditId: number, reviewerId: number): void {
  const db = getDb();
  const info = db
    .prepare(
      `UPDATE audits SET status='rejected', reviewer_user_id=?, reviewed_at=datetime('now') WHERE id=? AND status='pending'`,
    )
    .run(reviewerId, auditId);
  if (info.changes === 0) throw new HttpError(404, 'AUDIT_NOT_FOUND');
}
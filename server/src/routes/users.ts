import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate, getValid } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { UserCreateSchema, UserUpdateSchema } from '../types/domain.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', (_req, res) => {
  const db = getDb();
  const rows = db
    .prepare(`SELECT id, username, display_name, role, active, created_at FROM users ORDER BY username`)
    .all();
  res.json({ users: rows });
});

router.post('/', validate(UserCreateSchema), (req, res) => {
  const data = getValid<z.infer<typeof UserCreateSchema>>(req, 'body');
  const db = getDb();
  const hash = bcrypt.hashSync(data.password, 10);
  const info = db
    .prepare(
      `INSERT INTO users (username, password_hash, display_name, role, active) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(data.username, hash, data.display_name, data.role, data.active ? 1 : 0);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.patch('/:id', validate(UserUpdateSchema), (req, res) => {
  const id = Number(req.params.id);
  const data = getValid<z.infer<typeof UserUpdateSchema>>(req, 'body');
  const db = getDb();
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (k === 'password') {
      fields.push('password_hash = @password_hash');
      params.password_hash = bcrypt.hashSync(v as string, 10);
    } else if (k === 'active') {
      fields.push('active = @active');
      params.active = v ? 1 : 0;
    } else {
      fields.push(`${k} = @${k}`);
      params[k] = v;
    }
  }
  if (!fields.length) {
    res.json({ ok: true, unchanged: true });
    return;
  }
  fields.push(`updated_at = datetime('now')`);
  const info = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = @id`).run(params);
  if (info.changes === 0) throw new HttpError(404, 'USER_NOT_FOUND');
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user!.id) {
    throw new HttpError(400, 'CANNOT_DELETE_SELF', 'Cannot delete your own account');
  }
  const db = getDb();
  const info = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  if (info.changes === 0) throw new HttpError(404, 'USER_NOT_FOUND');
  res.json({ ok: true });
});

export default router;
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';
import { HttpError } from '../middleware/error.js';
import { requireAuth, signToken, setAuthCookie, clearAuthCookie } from '../middleware/auth.js';
import { LoginSchema } from '../types/domain.js';
import { validate, getValid } from '../middleware/validate.js';
import { loginLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/login', loginLimiter, validate(LoginSchema), (req, res) => {
  const { username, password } = getValid<{ username: string; password: string }>(req, 'body');
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, username, password_hash, display_name, role, active FROM users WHERE username = ?`,
    )
    .get(username) as
    | { id: number; username: string; password_hash: string; display_name: string; role: 'admin' | 'operator'; active: number }
    | undefined;
  if (!row || !row.active) throw new HttpError(401, 'INVALID_CREDENTIALS');
  const ok = bcrypt.compareSync(password, row.password_hash);
  if (!ok) throw new HttpError(401, 'INVALID_CREDENTIALS');
  const token = signToken({ id: row.id, username: row.username, role: row.role });
  setAuthCookie(res, token);
  res.json({
    user: {
      id: row.id,
      username: row.username,
      display_name: row.display_name,
      role: row.role,
      active: Boolean(row.active),
    },
  });
});

router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, username, display_name, role, active, created_at FROM users WHERE id = ?`,
    )
    .get(req.user!.id) as
    | { id: number; username: string; display_name: string; role: 'admin' | 'operator'; active: number; created_at: string }
    | undefined;
  if (!row) throw new HttpError(404, 'USER_NOT_FOUND');
  res.json({
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    role: row.role,
    active: Boolean(row.active),
    created_at: row.created_at,
  });
});

export default router;
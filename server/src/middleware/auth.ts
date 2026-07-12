import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config.js';
import { HttpError } from './error.js';
import type { Role } from '../types/domain.js';

export interface AuthUser {
  id: number;
  username: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const COOKIE_NAME = 'token';

export interface JwtPayload {
  sub: number;
  username: string;
  role: Role;
}

export function signToken(user: AuthUser): string {
  const payload: JwtPayload = { sub: user.id, username: user.username, role: user.role };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw new HttpError(401, 'UNAUTHORIZED', 'Missing auth token');
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as unknown as JwtPayload;
    req.user = {
      id: decoded.sub,
      username: decoded.username,
      role: decoded.role,
    };
    next();
  } catch {
    throw new HttpError(401, 'UNAUTHORIZED', 'Invalid or expired token');
  }
}

export function requireRole(role: Role) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new HttpError(401, 'UNAUTHORIZED');
    if (req.user.role !== role) throw new HttpError(403, 'FORBIDDEN', `Requires role: ${role}`);
    next();
  };
}
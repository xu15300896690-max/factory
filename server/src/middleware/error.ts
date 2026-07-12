import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
    public details?: unknown,
  ) {
    super(message ?? code);
  }
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: err.flatten(),
      },
    });
    return;
  }
  // SQLite constraint errors
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('UNIQUE constraint failed')) {
    res.status(409).json({
      error: { code: 'CONFLICT', message: 'Resource already exists or unique constraint violated' },
    });
    return;
  }
  if (msg.includes('FOREIGN KEY constraint failed')) {
    res.status(409).json({
      error: { code: 'FK_CONSTRAINT', message: 'Referenced resource does not exist or is in use' },
    });
    return;
  }
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: { code: 'INTERNAL', message: 'Internal server error' },
  });
}
import type { NextFunction, Request, Response } from 'express';
import { ZodTypeAny } from 'zod';

type Source = 'body' | 'query' | 'params';

declare module 'express-serve-static-core' {
  interface Request {
    valid?: { body?: unknown; query?: unknown; params?: unknown };
  }
}

export function validate<T extends ZodTypeAny>(schema: T, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.valid = {
      ...req.valid,
      [source]: result.data,
    };
    next();
  };
}

export function getValid<T>(req: Request, source: Source = 'body'): T {
  return req.valid?.[source] as T;
}
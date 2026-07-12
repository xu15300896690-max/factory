import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  DB_PATH: z.string().default('./data/app.sqlite'),
  AUTO_APPROVAL_LIMIT: z.coerce.number().default(50),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
});

export const env = schema.parse(process.env);
export type Env = typeof env;
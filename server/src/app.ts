import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config.js';
import authRoutes from './routes/auth.js';
import itemRoutes from './routes/items.js';
import warehouseRoutes from './routes/warehouses.js';
import categoryRoutes from './routes/categories.js';
import personnelRoutes from './routes/personnel.js';
import auditRoutes from './routes/audits.js';
import dashboardRoutes from './routes/dashboard.js';
import reportRoutes from './routes/reports.js';
import settingRoutes from './routes/settings.js';
import userRoutes from './routes/users.js';
import { errorHandler, notFound } from './middleware/error.js';
import devRoutes from './dev/reset.js';

export function createApp(): express.Express {
  const app = express();

  app.set('trust proxy', 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: env.WEB_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/items', itemRoutes);
  app.use('/api/warehouses', warehouseRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/personnel', personnelRoutes);
  app.use('/api/audits', auditRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/settings', settingRoutes);
  app.use('/api/users', userRoutes);

  if (env.NODE_ENV !== 'production') {
    app.use('/api/dev', devRoutes);
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
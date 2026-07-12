import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate, getValid } from '../middleware/validate.js';
import {
  categoryReport,
  flowReport,
  lowStockCsv,
  auditsCsv,
  stockCsv,
  topMoversReport,
  turnoverReport,
} from '../services/reports.js';

const router = Router();
router.use(requireAuth);

const PeriodQuery = z.object({
  period: z.enum(['7d', '30d', '90d']).default('30d'),
});

router.get('/flow', validate(PeriodQuery, 'query'), (req, res) => {
  const q = getValid<z.infer<typeof PeriodQuery>>(req, 'query');
  res.json({ flow: flowReport(q.period) });
});

router.get('/categories', (_req, res) => {
  res.json({ categories: categoryReport() });
});

router.get('/turnover', validate(PeriodQuery, 'query'), (req, res) => {
  const q = getValid<z.infer<typeof PeriodQuery>>(req, 'query');
  res.json({ turnover: turnoverReport(q.period) });
});

router.get('/top-movers', validate(PeriodQuery, 'query'), (req, res) => {
  const q = getValid<z.infer<typeof PeriodQuery>>(req, 'query');
  res.json({ topMovers: topMoversReport(q.period) });
});

const ExportQuery = z.object({
  type: z.enum(['stock', 'audits', 'lowStock']),
});

router.get('/export.csv', validate(ExportQuery, 'query'), (req, res) => {
  const q = getValid<z.infer<typeof ExportQuery>>(req, 'query');
  let csv: string;
  let filename: string;
  switch (q.type) {
    case 'stock':
      csv = stockCsv();
      filename = 'stock.csv';
      break;
    case 'audits':
      csv = auditsCsv();
      filename = 'audits.csv';
      break;
    case 'lowStock':
      csv = lowStockCsv();
      filename = 'low-stock.csv';
      break;
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

export default router;
import { Router } from 'express';
import { getDb } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/summary', (_req, res) => {
  const db = getDb();
  const totalItems = (db.prepare('SELECT COUNT(*) as c FROM items').get() as { c: number }).c;
  const totalStock = (
    db.prepare('SELECT COALESCE(SUM(stock * unit_price), 0) as v FROM items').get() as { v: number }
  ).v;
  const lowStock = (
    db
      .prepare('SELECT COUNT(*) as c FROM items WHERE stock <= min_stock')
      .get() as { c: number }
  ).c;
  const pendingAudits = (
    db.prepare(`SELECT COUNT(*) as c FROM audits WHERE status = 'pending'`).get() as { c: number }
  ).c;

  const todayInbound = (
    db
      .prepare(
        `SELECT COALESCE(SUM(quantity), 0) as q FROM audits WHERE type='inbound' AND date(created_at) = date('now') AND status='approved'`,
      )
      .get() as { q: number }
  ).q;
  const todayOutbound = (
    db
      .prepare(
        `SELECT COALESCE(SUM(quantity), 0) as q FROM audits WHERE type='outbound' AND date(created_at) = date('now') AND status='approved'`,
      )
      .get() as { q: number }
  ).q;

  // Last 7 days trend
  const trend = db
    .prepare(
      `SELECT date(created_at) as day,
              SUM(CASE WHEN type='inbound' AND status='approved' THEN quantity ELSE 0 END) as inbound,
              SUM(CASE WHEN type='outbound' AND status='approved' THEN quantity ELSE 0 END) as outbound
       FROM audits
       WHERE created_at >= datetime('now', '-7 days')
       GROUP BY date(created_at)
       ORDER BY day`,
    )
    .all() as { day: string; inbound: number; outbound: number }[];

  res.json({
    totalItems,
    totalStockValue: totalStock,
    lowStockCount: lowStock,
    pendingAudits,
    todayInbound,
    todayOutbound,
    trend,
  });
});

export default router;
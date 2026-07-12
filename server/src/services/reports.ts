import { getDb } from '../db.js';

export interface PeriodFilter {
  period?: '7d' | '30d' | '90d';
}

function periodClause(p: string | undefined): string {
  switch (p) {
    case '7d':
      return "datetime('now', '-7 days')";
    case '30d':
      return "datetime('now', '-30 days')";
    case '90d':
      return "datetime('now', '-90 days')";
    default:
      return "datetime('now', '-30 days')";
  }
}

export function flowReport(period?: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT date(created_at) as day,
              SUM(CASE WHEN type='inbound' AND status='approved' THEN quantity ELSE 0 END) as inbound,
              SUM(CASE WHEN type='outbound' AND status='approved' THEN quantity ELSE 0 END) as outbound
       FROM audits
       WHERE created_at >= ${periodClause(period)}
       GROUP BY date(created_at)
       ORDER BY day`,
    )
    .all();
}

export function categoryReport() {
  const db = getDb();
  return db
    .prepare(
      `SELECT COALESCE(c.name, 'Uncategorized') as name,
              COALESCE(c.color, '#94a3b8') as color,
              COUNT(i.id) as item_count,
              COALESCE(SUM(i.stock), 0) as total_stock,
              COALESCE(SUM(i.stock * i.unit_price), 0) as value
       FROM items i
       LEFT JOIN categories c ON c.id = i.category_id
       GROUP BY c.id
       ORDER BY total_stock DESC`,
    )
    .all();
}

export function turnoverReport(period?: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT date(a.created_at) as day,
              COUNT(*) as movements,
              SUM(a.quantity) as units
       FROM audits a
       WHERE a.status='approved' AND a.created_at >= ${periodClause(period)}
       GROUP BY date(a.created_at)
       ORDER BY day`,
    )
    .all();
}

export function topMoversReport(period?: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT i.id, i.sku, i.name,
              COUNT(a.id) as movements,
              SUM(a.quantity) as units
       FROM audits a
       JOIN items i ON i.id = a.item_id
       WHERE a.status='approved' AND a.created_at >= ${periodClause(period)}
       GROUP BY i.id
       ORDER BY movements DESC
       LIMIT 10`,
    )
    .all();
}

export function stockCsv(): string {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT i.sku, i.name, c.name as category, w.name as warehouse, i.location,
              i.stock, i.min_stock, i.supplier, i.unit_price, i.last_updated
       FROM items i
       LEFT JOIN categories c ON c.id = i.category_id
       LEFT JOIN warehouses w ON w.id = i.warehouse_id
       ORDER BY i.name`,
    )
    .all() as Record<string, unknown>[];
  return toCsv(rows, [
    'sku',
    'name',
    'category',
    'warehouse',
    'location',
    'stock',
    'min_stock',
    'supplier',
    'unit_price',
    'last_updated',
  ]);
}

export function auditsCsv(): string {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT a.id, a.type, i.sku, i.name as item_name, a.quantity, a.status,
              op.display_name as operator, rv.display_name as reviewer, a.note, a.created_at, a.reviewed_at
       FROM audits a
       LEFT JOIN items i ON i.id = a.item_id
       LEFT JOIN users op ON op.id = a.operator_user_id
       LEFT JOIN users rv ON rv.id = a.reviewer_user_id
       ORDER BY a.created_at DESC`,
    )
    .all() as Record<string, unknown>[];
  return toCsv(rows, [
    'id',
    'type',
    'sku',
    'item_name',
    'quantity',
    'status',
    'operator',
    'reviewer',
    'note',
    'created_at',
    'reviewed_at',
  ]);
}

export function lowStockCsv(): string {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT i.sku, i.name, c.name as category, w.name as warehouse, i.location,
              i.stock, i.min_stock, i.supplier
       FROM items i
       LEFT JOIN categories c ON c.id = i.category_id
       LEFT JOIN warehouses w ON w.id = i.warehouse_id
       WHERE i.stock <= i.min_stock
       ORDER BY (i.stock - i.min_stock) ASC`,
    )
    .all() as Record<string, unknown>[];
  return toCsv(rows, ['sku', 'name', 'category', 'warehouse', 'location', 'stock', 'min_stock', 'supplier']);
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const header = columns.join(',');
  const body = rows.map((r) => columns.map((c) => escape(r[c])).join(',')).join('\n');
  return `${header}\n${body}\n`;
}
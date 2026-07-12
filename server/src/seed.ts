import bcrypt from 'bcryptjs';
import { getDb, closeDb } from './db.js';

const db = getDb();

const userCount = (
  db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }
).c;
if (userCount > 0) {
  console.log('Database already seeded, skipping.');
  closeDb();
  process.exit(0);
}

const now = new Date().toISOString();

console.log('Seeding database...');

db.transaction(() => {
  // Users
  const adminHash = bcrypt.hashSync('admin123', 10);
  const operatorHash = bcrypt.hashSync('operator123', 10);
  db.prepare(
    `INSERT INTO users (username, password_hash, display_name, role, active) VALUES (?, ?, ?, ?, 1)`,
  ).run('admin', adminHash, 'System Administrator', 'admin');
  db.prepare(
    `INSERT INTO users (username, password_hash, display_name, role, active) VALUES (?, ?, ?, ?, 1)`,
  ).run('operator', operatorHash, 'Floor Operator', 'operator');

  // Personnel
  const personnel = [
    ['Alice Chen', 'Senior Operator'],
    ['Bob Lee', 'Shift Lead'],
    ['Carlos Diaz', 'Operator'],
    ['Dana Wu', 'Operator'],
    ['Evan Park', 'Quality Inspector'],
    ['Fiona Zhang', 'Warehouse Manager'],
  ];
  const insPersonnel = db.prepare(
    `INSERT INTO personnel (name, title, active) VALUES (?, ?, 1)`,
  );
  for (const [name, title] of personnel) insPersonnel.run(name, title);

  // Warehouses
  const warehouses = [
    ['Warehouse A', 'Building 1, Floor 1', 5000],
    ['Warehouse B', 'Building 1, Floor 2', 3500],
    ['Cold Storage', 'Building 2', 1200],
  ];
  const insWh = db.prepare(
    `INSERT INTO warehouses (name, location, capacity) VALUES (?, ?, ?)`,
  );
  for (const [n, l, c] of warehouses) insWh.run(n, l, c);

  // Categories
  const categories = [
    ['Raw Materials', '#3b82f6'],
    ['Components', '#10b981'],
    ['Finished Goods', '#f59e0b'],
    ['Packaging', '#8b5cf6'],
    ['Tools', '#ef4444'],
  ];
  const insCat = db.prepare(
    `INSERT INTO categories (name, color) VALUES (?, ?)`,
  );
  for (const [n, c] of categories) insCat.run(n, c);

  // Items
  const items = [
    ['RM-001', '8901234567890', 'Steel Coil 5mm', 1, 1, 'A-01-03', 120, 50, 'Acme Steel', 85.5],
    ['RM-002', '8901234567891', 'Aluminum Sheet 2mm', 1, 1, 'A-02-01', 45, 60, 'MetalCorp', 120.0],
    ['CP-101', '8901234567892', 'PCB Board v3', 2, 2, 'B-04-02', 320, 100, 'ChipWorks', 12.5],
    ['CP-102', '8901234567893', 'LED Driver IC', 2, 2, 'B-04-04', 18, 50, 'ChipWorks', 3.2],
    ['FG-201', '8901234567894', 'Control Panel X1', 3, 1, 'A-05-01', 24, 10, 'In-House', 245.0],
    ['PK-301', '8901234567895', 'Cardboard Box (L)', 4, 3, 'C-01-02', 8, 100, 'PackPro', 1.8],
  ];
  const insItem = db.prepare(
    `INSERT INTO items (sku, barcode, name, category_id, warehouse_id, location, stock, min_stock, supplier, unit_price)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const row of items) insItem.run(...(row as (string | number)[]));

  // Settings
  const insSetting = db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)`,
  );
  insSetting.run('autoApprovalLimit', '50');
  insSetting.run('lowStockThreshold', '1.0');
  insSetting.run('companyName', 'Acme Manufacturing');
  insSetting.run('siteName', 'Shanghai Plant');

  // Demo audits
  const insAudit = db.prepare(
    `INSERT INTO audits (type, item_id, quantity, operator_user_id, personnel_id, status, applied, source, created_at, reviewed_at, reviewer_user_id, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  insAudit.run('inbound', 1, 50, 1, 1, 'approved', 1, 'web', now, now, 1, 'Initial stock');
  insAudit.run('inbound', 3, 200, 1, 2, 'approved', 1, 'web', now, now, 1, 'Q3 restock');
  insAudit.run('outbound', 5, 5, 2, 3, 'approved', 1, 'android', now, now, 1, 'Customer order #1024');
  insAudit.run('outbound', 6, 30, 2, 4, 'pending', 0, 'android', now, null, null, 'Production line B');
})();

console.log('Seed complete.');
console.log('Default accounts:');
console.log('  admin    / admin123');
console.log('  operator / operator123');
closeDb();
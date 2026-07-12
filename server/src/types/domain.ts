import { z } from 'zod';

// ============== Users & Auth ==============
export const RoleSchema = z.enum(['admin', 'operator']);
export type Role = z.infer<typeof RoleSchema>;

export const LoginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
});

export const UserSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  display_name: z.string(),
  role: RoleSchema,
  active: z.union([z.boolean(), z.number()]).transform((v) => Boolean(v)),
  created_at: z.string(),
});

// ============== Items ==============
export const ItemSchema = z.object({
  id: z.number().int(),
  sku: z.string(),
  barcode: z.string().nullable().optional(),
  name: z.string(),
  category_id: z.number().int().nullable(),
  warehouse_id: z.number().int().nullable(),
  location: z.string(),
  stock: z.number().int(),
  min_stock: z.number().int(),
  supplier: z.string(),
  unit_price: z.number(),
  last_updated: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Item = z.infer<typeof ItemSchema>;

export const ItemCreateSchema = z.object({
  sku: z.string().min(1).max(64),
  barcode: z.string().max(64).nullable().optional(),
  name: z.string().min(1).max(255),
  category_id: z.number().int().nullable().optional(),
  warehouse_id: z.number().int().nullable().optional(),
  location: z.string().max(255).default(''),
  stock: z.number().int().min(0).default(0),
  min_stock: z.number().int().min(0).default(0),
  supplier: z.string().max(255).default(''),
  unit_price: z.number().min(0).default(0),
});

export const ItemUpdateSchema = ItemCreateSchema.partial();

// ============== Audits ==============
export const AuditTypeSchema = z.enum(['inbound', 'outbound']);
export const AuditStatusSchema = z.enum(['pending', 'approved', 'rejected']);

export const AuditSchema = z.object({
  id: z.number().int(),
  type: AuditTypeSchema,
  item_id: z.number().int(),
  item_name: z.string().optional(),
  item_sku: z.string().optional(),
  quantity: z.number().int(),
  operator_user_id: z.number().int().nullable(),
  operator_name: z.string().optional(),
  personnel_id: z.number().int().nullable(),
  personnel_name: z.string().optional(),
  status: AuditStatusSchema,
  reviewer_user_id: z.number().int().nullable(),
  reviewer_name: z.string().optional(),
  note: z.string().nullable().optional(),
  applied: z.union([z.boolean(), z.number()]).transform((v) => Boolean(v)),
  source: z.enum(['web', 'android', 'api']),
  created_at: z.string(),
  reviewed_at: z.string().nullable().optional(),
});

export const AuditCreateSchema = z.object({
  type: AuditTypeSchema,
  item_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
  personnel_id: z.number().int().positive().nullable().optional(),
  note: z.string().max(500).optional(),
  source: z.enum(['web', 'android', 'api']).default('web'),
});

// ============== Settings ==============
export const SettingsSchema = z.object({
  autoApprovalLimit: z.coerce.number().int().min(0).default(50),
  lowStockThreshold: z.coerce.number().min(0).default(1.0),
  companyName: z.string().default('Factory'),
  siteName: z.string().default('Main Site'),
});

// ============== Generic CRUD entities ==============
export const WarehouseSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  location: z.string(),
  capacity: z.number().int(),
});
export const WarehouseCreateSchema = z.object({
  name: z.string().min(1).max(120),
  location: z.string().min(1).max(255),
  capacity: z.number().int().min(0).default(0),
});

export const CategorySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  color: z.string(),
});
export const CategoryCreateSchema = z.object({
  name: z.string().min(1).max(64),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#3b82f6'),
});

export const PersonnelSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  title: z.string(),
  active: z.union([z.boolean(), z.number()]).transform((v) => Boolean(v)),
});
export const PersonnelCreateSchema = z.object({
  name: z.string().min(1).max(120),
  title: z.string().min(1).max(64).default('Operator'),
  active: z.boolean().default(true),
});

export const UserCreateSchema = z.object({
  username: z.string().min(3).max(64).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6).max(128),
  display_name: z.string().min(1).max(120),
  role: RoleSchema,
  active: z.boolean().default(true),
});

export const UserUpdateSchema = z.object({
  password: z.string().min(6).max(128).optional(),
  display_name: z.string().min(1).max(120).optional(),
  role: RoleSchema.optional(),
  active: z.boolean().optional(),
});
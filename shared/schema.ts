import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Roles enum
export const USER_ROLES = ["super_admin", "supervisor", "auditor"] as const;
export type UserRole = typeof USER_ROLES[number];

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("auditor"),
  phone: text("phone"),
  status: text("status").notNull().default("active"),
  mustChangePassword: boolean("must_change_password").default(false),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  loginAttempts: integer("login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  lastLoginAt: timestamp("last_login_at"),
  accessScope: jsonb("access_scope").$type<{ clientIds?: string[]; outletIds?: string[]; global?: boolean }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  riskScore: integer("risk_score").default(0),
  varianceThreshold: decimal("variance_threshold", { precision: 5, scale: 2 }).default("5.00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const outlets = pgTable("outlets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  outletId: varchar("outlet_id").notNull().references(() => outlets.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const items = pgTable("items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sku: text("sku"),
  category: text("category").notNull().default("general"),
  unit: text("unit").notNull().default("pcs"),
  costPrice: decimal("cost_price", { precision: 12, scale: 2 }).default("0.00"),
  sellingPrice: decimal("selling_price", { precision: 12, scale: 2 }).default("0.00"),
  reorderLevel: integer("reorder_level").default(10),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchaseLines = pgTable("purchase_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  purchaseId: varchar("purchase_id").notNull().references(() => purchases.id, { onDelete: "cascade" }),
  itemId: varchar("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stockCounts = pgTable("stock_counts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  departmentId: varchar("department_id").notNull().references(() => departments.id, { onDelete: "cascade" }),
  itemId: varchar("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  openingQty: decimal("opening_qty", { precision: 10, scale: 2 }).default("0.00"),
  receivedQty: decimal("received_qty", { precision: 10, scale: 2 }).default("0.00"),
  soldQty: decimal("sold_qty", { precision: 10, scale: 2 }).default("0.00"),
  expectedClosingQty: decimal("expected_closing_qty", { precision: 10, scale: 2 }).default("0.00"),
  actualClosingQty: decimal("actual_closing_qty", { precision: 10, scale: 2 }),
  varianceQty: decimal("variance_qty", { precision: 10, scale: 2 }).default("0.00"),
  varianceValue: decimal("variance_value", { precision: 12, scale: 2 }).default("0.00"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const salesEntries = pgTable("sales_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  departmentId: varchar("department_id").notNull().references(() => departments.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  shift: text("shift").default("full"),
  cashAmount: decimal("cash_amount", { precision: 12, scale: 2 }).default("0.00"),
  posAmount: decimal("pos_amount", { precision: 12, scale: 2 }).default("0.00"),
  transferAmount: decimal("transfer_amount", { precision: 12, scale: 2 }).default("0.00"),
  voidsAmount: decimal("voids_amount", { precision: 12, scale: 2 }).default("0.00"),
  discountsAmount: decimal("discounts_amount", { precision: 12, scale: 2 }).default("0.00"),
  totalSales: decimal("total_sales", { precision: 12, scale: 2 }).notNull(),
  mode: text("mode").default("summary"),
  evidenceUrl: text("evidence_url"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchases = pgTable("purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  outletId: varchar("outlet_id").notNull().references(() => outlets.id, { onDelete: "cascade" }),
  supplierName: text("supplier_name").notNull(),
  invoiceRef: text("invoice_ref").notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").default("draft"),
  evidenceUrl: text("evidence_url"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stockMovements = pgTable("stock_movements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  outletId: varchar("outlet_id").notNull().references(() => outlets.id, { onDelete: "cascade" }),
  movementType: text("movement_type").notNull(),
  sourceLocation: text("source_location"),
  destinationLocation: text("destination_location"),
  itemsDescription: text("items_description").notNull(),
  totalValue: decimal("total_value", { precision: 12, scale: 2 }).default("0.00"),
  authorizedBy: text("authorized_by"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reconciliations = pgTable("reconciliations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  departmentId: varchar("department_id").notNull().references(() => departments.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  openingStock: jsonb("opening_stock").notNull(),
  additions: jsonb("additions").notNull(),
  expectedUsage: jsonb("expected_usage").notNull(),
  physicalCount: jsonb("physical_count").notNull(),
  varianceQty: decimal("variance_qty", { precision: 10, scale: 2 }).default("0.00"),
  varianceValue: decimal("variance_value", { precision: 12, scale: 2 }).default("0.00"),
  status: text("status").default("pending"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const exceptions = pgTable("exceptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseNumber: text("case_number").notNull().unique(),
  outletId: varchar("outlet_id").notNull().references(() => outlets.id, { onDelete: "cascade" }),
  departmentId: varchar("department_id").references(() => departments.id, { onDelete: "set null" }),
  summary: text("summary").notNull(),
  description: text("description"),
  impact: text("impact"),
  severity: text("severity").default("medium"),
  status: text("status").default("open"),
  evidenceUrls: text("evidence_urls").array(),
  assignedTo: varchar("assigned_to").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const exceptionComments = pgTable("exception_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  exceptionId: varchar("exception_id").notNull().references(() => exceptions.id, { onDelete: "cascade" }),
  comment: text("comment").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: varchar("entity_id"),
  details: text("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminActivityLogs = pgTable("admin_activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id").notNull().references(() => users.id, { onDelete: "set null" }),
  targetUserId: varchar("target_user_id").references(() => users.id, { onDelete: "set null" }),
  actionType: text("action_type").notNull(),
  beforeState: jsonb("before_state"),
  afterState: jsonb("after_state"),
  reason: text("reason"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });
export const insertOutletSchema = createInsertSchema(outlets).omit({ id: true, createdAt: true });
export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true, createdAt: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true });
export const insertItemSchema = createInsertSchema(items).omit({ id: true, createdAt: true });
export const insertPurchaseLineSchema = createInsertSchema(purchaseLines).omit({ id: true, createdAt: true });
export const insertStockCountSchema = createInsertSchema(stockCounts).omit({ id: true, createdAt: true });
export const insertSalesEntrySchema = createInsertSchema(salesEntries).omit({ id: true, createdAt: true });
export const insertPurchaseSchema = createInsertSchema(purchases).omit({ id: true, createdAt: true });
export const insertStockMovementSchema = createInsertSchema(stockMovements).omit({ id: true, createdAt: true });
export const insertReconciliationSchema = createInsertSchema(reconciliations).omit({ id: true, createdAt: true });
export const insertExceptionSchema = createInsertSchema(exceptions).omit({ id: true, createdAt: true, caseNumber: true });
export const insertExceptionCommentSchema = createInsertSchema(exceptionComments).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertAdminActivityLogSchema = createInsertSchema(adminActivityLogs).omit({ id: true, createdAt: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertOutlet = z.infer<typeof insertOutletSchema>;
export type Outlet = typeof outlets.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof items.$inferSelect;
export type InsertPurchaseLine = z.infer<typeof insertPurchaseLineSchema>;
export type PurchaseLine = typeof purchaseLines.$inferSelect;
export type InsertStockCount = z.infer<typeof insertStockCountSchema>;
export type StockCount = typeof stockCounts.$inferSelect;
export type InsertSalesEntry = z.infer<typeof insertSalesEntrySchema>;
export type SalesEntry = typeof salesEntries.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;
export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertReconciliation = z.infer<typeof insertReconciliationSchema>;
export type Reconciliation = typeof reconciliations.$inferSelect;
export type InsertException = z.infer<typeof insertExceptionSchema>;
export type Exception = typeof exceptions.$inferSelect;
export type InsertExceptionComment = z.infer<typeof insertExceptionCommentSchema>;
export type ExceptionComment = typeof exceptionComments.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAdminActivityLog = z.infer<typeof insertAdminActivityLogSchema>;
export type AdminActivityLog = typeof adminActivityLogs.$inferSelect;

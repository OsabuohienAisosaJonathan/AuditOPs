import { sql } from "drizzle-orm";
import { pgTable as mysqlTable, text, varchar, integer as int, timestamp, decimal, jsonb as json, boolean, date, foreignKey } from "drizzle-orm/pg-core";
const datetime = timestamp; // Alias datetime to timestamp for PG compatibility
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Roles enum
export const USER_ROLES = ["super_admin", "supervisor", "auditor"] as const;
export type UserRole = typeof USER_ROLES[number];

// Organization roles for multi-user tenant support
export const ORG_ROLES = ["owner", "admin", "member"] as const;
export type OrgRole = typeof ORG_ROLES[number];

// Organization types
export const ORG_TYPES = ["company", "auditor"] as const;
export type OrgType = typeof ORG_TYPES[number];

// Organizations table (tenants)
export const organizations = mysqlTable("organizations", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull().default("company"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  currencyCode: text("currency_code").notNull().default("NGN"),
  isSuspended: boolean("is_suspended").default(false),
  suspendedAt: datetime("suspended_at"),
  suspendedReason: text("suspended_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id", { length: 36 }).references(() => organizations.id),
  organizationRole: text("organization_role").default("member"),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("auditor"),
  phone: text("phone"),
  status: text("status").notNull().default("active"),
  emailVerified: boolean("email_verified").default(false),
  verificationToken: text("verification_token"),
  verificationExpiry: datetime("verification_expiry"),
  mustChangePassword: boolean("must_change_password").default(false),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiry: datetime("password_reset_expiry"),
  loginAttempts: int("login_attempts").default(0),
  lockedUntil: datetime("locked_until"),
  isLocked: boolean("is_locked").default(false),
  lockedReason: text("locked_reason"),
  lastLoginAt: datetime("last_login_at"),
  accessScope: json("access_scope").$type<{ clientIds?: string[]; departmentIds?: string[]; global?: boolean }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clients = mysqlTable("clients", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id", { length: 36 }).references(() => organizations.id),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  riskScore: int("risk_score").default(0),
  varianceThreshold: decimal("variance_threshold", { precision: 5, scale: 2 }).default("5.00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Categories are optional grouping labels under a client (e.g., F&B, Front Desk, Admin)
export const categories = mysqlTable("categories", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: datetime("deleted_at"),
  deletedBy: varchar("deleted_by", { length: 36 }).references(() => users.id),
});

// Organization settings for company profile and currency (tenant-scoped)
export const organizationSettings = mysqlTable("organization_settings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id", { length: 36 }).notNull().references(() => organizations.id).unique(),
  companyName: text("company_name"),
  address: text("address"),
  email: text("email"),
  phone: text("phone"),
  currency: text("currency").notNull().default("NGN"),
  logoUrl: text("logo_url"),
  reportFooterNote: text("report_footer_note"),
  updatedBy: varchar("updated_by", { length: 36 }).references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User settings for individual preferences (user-scoped)
export const userSettings = mysqlTable("user_settings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id).unique(),
  theme: text("theme").notNull().default("light"),
  autoSaveEnabled: boolean("auto_save_enabled").notNull().default(true),
  autoSaveIntervalSeconds: int("auto_save_interval_seconds").notNull().default(60),
  varianceThresholdPercent: decimal("variance_threshold_percent", { precision: 5, scale: 2 }).notNull().default("5.00"),
  emailNotificationsEnabled: boolean("email_notifications_enabled").notNull().default(true),
  exceptionAlertsEnabled: boolean("exception_alerts_enabled").notNull().default(true),
  varianceAlertsEnabled: boolean("variance_alerts_enabled").notNull().default(true),
  dailyDigestEnabled: boolean("daily_digest_enabled").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Notifications for in-app and email alerts
export const notifications = mysqlTable("notifications", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id", { length: 36 }).notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'exception', 'variance', 'system', 'export'
  title: text("title").notNull(),
  message: text("message").notNull(),
  refType: text("ref_type"), // 'exception', 'reconciliation', 'export', etc.
  refId: varchar("ref_id", { length: 36 }),
  isRead: boolean("is_read").notNull().default(false),
  emailSent: boolean("email_sent").notNull().default(false),
  emailSentAt: datetime("email_sent_at"),
  emailError: text("email_error"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Data exports for tenant backup/export functionality
export const dataExports = mysqlTable("data_exports", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id", { length: 36 }).notNull().references(() => organizations.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by", { length: 36 }).notNull().references(() => users.id),
  format: text("format").notNull(), // 'csv', 'excel', 'json'
  status: text("status").notNull().default("pending"), // 'pending', 'processing', 'completed', 'failed'
  filename: text("filename"),
  filePath: text("file_path"),
  fileSize: int("file_size"),
  dataTypes: json("data_types").notNull(), // Changed from text[].array() to json
  dateRangeStart: date("date_range_start"),
  dateRangeEnd: date("date_range_end"),
  recordCount: int("record_count"),
  error: text("error"),
  expiresAt: datetime("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: datetime("completed_at"), // Fixed from timestamp
});

// Departments are the core operational unit - all transactions and reconciliations tie to departments
export const departments = mysqlTable("departments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id", { length: 36 }).references(() => categories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  suspendReason: text("suspend_reason"),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const suppliers = mysqlTable("suppliers", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const items = mysqlTable("items", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id", { length: 36 }).references(() => categories.id, { onDelete: "set null" }),
  supplierId: varchar("supplier_id", { length: 36 }).references(() => suppliers.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  sku: text("sku"),
  category: text("category").notNull().default("general"),
  unit: text("unit").notNull().default("pcs"),
  costPrice: decimal("cost_price", { precision: 12, scale: 2 }).default("0.00"),
  sellingPrice: decimal("selling_price", { precision: 12, scale: 2 }).default("0.00"),
  wholesalePrice: decimal("wholesale_price", { precision: 12, scale: 2 }),
  retailPrice: decimal("retail_price", { precision: 12, scale: 2 }),
  vipPrice: decimal("vip_price", { precision: 12, scale: 2 }),
  customPrice: decimal("custom_price", { precision: 12, scale: 2 }),
  reorderLevel: int("reorder_level").default(10),
  serialTracking: text("serial_tracking").notNull().default("none"),
  serialNotes: text("serial_notes"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchaseLines = mysqlTable("purchase_lines", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  purchaseId: varchar("purchase_id", { length: 36 }).notNull().references(() => purchases.id, { onDelete: "cascade" }),
  itemId: varchar("item_id", { length: 36 }).notNull().references(() => items.id, { onDelete: "cascade" }),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stockCounts = mysqlTable("stock_counts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  departmentId: varchar("department_id", { length: 36 }).notNull().references(() => departments.id, { onDelete: "cascade" }),
  storeDepartmentId: varchar("store_department_id", { length: 36 }).references(() => inventoryDepartments.id, { onDelete: "set null" }),
  itemId: varchar("item_id", { length: 36 }).notNull().references(() => items.id, { onDelete: "cascade" }),
  date: datetime("date").notNull(),
  openingQty: decimal("opening_qty", { precision: 10, scale: 2 }).default("0.00"),
  addedQty: decimal("added_qty", { precision: 10, scale: 2 }).default("0.00"),
  receivedQty: decimal("received_qty", { precision: 10, scale: 2 }).default("0.00"),
  soldQty: decimal("sold_qty", { precision: 10, scale: 2 }).default("0.00"),
  expectedClosingQty: decimal("expected_closing_qty", { precision: 10, scale: 2 }).default("0.00"),
  actualClosingQty: decimal("actual_closing_qty", { precision: 10, scale: 2 }),
  varianceQty: decimal("variance_qty", { precision: 10, scale: 2 }).default("0.00"),
  varianceValue: decimal("variance_value", { precision: 12, scale: 2 }).default("0.00"),
  costPriceSnapshot: decimal("cost_price_snapshot", { precision: 12, scale: 2 }).default("0.00"),
  sellingPriceSnapshot: decimal("selling_price_snapshot", { precision: 12, scale: 2 }).default("0.00"),
  notes: text("notes"),
  createdBy: varchar("created_by", { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const salesEntries = mysqlTable("sales_entries", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  departmentId: varchar("department_id", { length: 36 }).notNull().references(() => departments.id, { onDelete: "cascade" }),
  date: datetime("date").notNull(),
  shift: text("shift").default("full"),
  amount: decimal("amount", { precision: 12, scale: 2 }).default("0.00"),
  complimentaryAmount: decimal("complimentary_amount", { precision: 12, scale: 2 }).default("0.00"),
  vouchersAmount: decimal("vouchers_amount", { precision: 12, scale: 2 }).default("0.00"),
  voidsAmount: decimal("voids_amount", { precision: 12, scale: 2 }).default("0.00"),
  othersAmount: decimal("others_amount", { precision: 12, scale: 2 }).default("0.00"),
  cashAmount: decimal("cash_amount", { precision: 12, scale: 2 }).default("0.00"),
  posAmount: decimal("pos_amount", { precision: 12, scale: 2 }).default("0.00"),
  transferAmount: decimal("transfer_amount", { precision: 12, scale: 2 }).default("0.00"),
  discountsAmount: decimal("discounts_amount", { precision: 12, scale: 2 }).default("0.00"),
  totalSales: decimal("total_sales", { precision: 12, scale: 2 }).notNull(),
  mode: text("mode").default("summary"),
  evidenceUrl: text("evidence_url"),
  createdBy: varchar("created_by", { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Purchases are now tied to departments (e.g., "Store" department for inventory purchases)
export const purchases = mysqlTable("purchases", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  departmentId: varchar("department_id", { length: 36 }).notNull().references(() => departments.id, { onDelete: "cascade" }),
  supplierName: text("supplier_name").notNull(),
  invoiceRef: text("invoice_ref").notNull(),
  invoiceDate: datetime("invoice_date").notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").default("draft"),
  evidenceUrl: text("evidence_url"),
  createdBy: varchar("created_by", { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Stock movements are now tied to departments and SRDs
// "issue" = Main Store -> Department issuance (posts to Main ReqDep / Dept Added)
// "transfer" = Department -> Main or Department -> Department (posts to Transfer columns)
// "adjustment" = Increase/decrease stock (posts to Adjustment column only)
// "write_off" / "waste" = Reduce stock (posts to WriteOff/Waste columns)
export const MOVEMENT_TYPES = ["issue", "transfer", "adjustment", "write_off", "waste"] as const;
export const STOCK_MOVEMENT_TYPES = MOVEMENT_TYPES; // Alias for convenience
export type MovementType = typeof MOVEMENT_TYPES[number];

export const ADJUSTMENT_DIRECTIONS = ["increase", "decrease"] as const;
export type AdjustmentDirection = typeof ADJUSTMENT_DIRECTIONS[number];

export const stockMovements = mysqlTable("stock_movements", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  departmentId: varchar("department_id", { length: 36 }).notNull().references(() => departments.id, { onDelete: "cascade" }),
  outletId: varchar("outlet_id", { length: 36 }),
  movementType: text("movement_type").notNull(),
  fromSrdId: varchar("from_srd_id", { length: 36 }),
  toSrdId: varchar("to_srd_id", { length: 36 }),
  date: datetime("date").default(sql`(now())`).notNull(),
  adjustmentDirection: text("adjustment_direction"),
  sourceLocation: text("source_location"),
  destinationLocation: text("destination_location"),
  itemsDescription: text("items_description"),
  totalQty: decimal("total_qty", { precision: 10, scale: 2 }).default("0.00"),
  totalValue: decimal("total_value", { precision: 12, scale: 2 }).default("0.00"),
  notes: text("notes"),
  authorizedBy: text("authorized_by"),
  approvedBy: varchar("approved_by", { length: 36 }).references(() => users.id),
  approvedAt: datetime("approved_at"),
  createdBy: varchar("created_by", { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 255 }),
  sourceRef: varchar("source_ref", { length: 255 }),
});

// Stock movement line items for per-item tracking
export const stockMovementLines = mysqlTable("stock_movement_lines", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  movementId: varchar("movement_id", { length: 36 }).notNull().references(() => stockMovements.id, { onDelete: "cascade" }),
  itemId: varchar("item_id", { length: 36 }).notNull().references(() => items.id, { onDelete: "cascade" }),
  qty: decimal("qty", { precision: 10, scale: 2 }).notNull(),
  unitCost: decimal("unit_cost", { precision: 12, scale: 2 }).notNull(),
  lineValue: decimal("line_value", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reconciliations = mysqlTable("reconciliations", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  departmentId: varchar("department_id", { length: 36 }).notNull().references(() => departments.id, { onDelete: "cascade" }),
  date: datetime("date").notNull(),
  openingStock: json("opening_stock").notNull(), // jsonb -> json
  additions: json("additions").notNull(),
  expectedUsage: json("expected_usage").notNull(),
  physicalCount: json("physical_count").notNull(),
  varianceQty: decimal("variance_qty", { precision: 10, scale: 2 }).default("0.00"),
  varianceValue: decimal("variance_value", { precision: 12, scale: 2 }).default("0.00"),
  status: text("status").default("pending"),
  approvedBy: varchar("approved_by", { length: 36 }).references(() => users.id),
  approvedAt: datetime("approved_at"),
  createdBy: varchar("created_by", { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Exceptions are tied to departments
export const exceptions = mysqlTable("exceptions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  caseNumber: varchar("case_number", { length: 255 }).notNull().unique(),
  clientId: varchar("client_id", { length: 36 }).references(() => clients.id, { onDelete: "cascade" }),
  outletId: varchar("outlet_id", { length: 36 }),
  departmentId: varchar("department_id", { length: 36 }).references(() => departments.id, { onDelete: "cascade" }),
  date: text("date").notNull().default(sql`CURRENT_DATE`), // MySQL CURRENT_DATE string is fine, or use date()
  summary: text("summary").notNull(),
  description: text("description"),
  impact: text("impact"),
  severity: text("severity").default("medium"),
  status: text("status").default("open"),
  outcome: text("outcome").default("pending"), // pending, true, false, mismatched, partial
  evidenceUrls: json("evidence_urls"), // text[].array() -> json
  assignedTo: varchar("assigned_to", { length: 36 }).references(() => users.id),
  resolvedAt: datetime("resolved_at"),
  createdBy: varchar("created_by", { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: datetime("deleted_at"),
  deletedBy: varchar("deleted_by", { length: 36 }).references(() => users.id),
  deleteReason: text("delete_reason"),
});

export const exceptionComments = mysqlTable("exception_comments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  exceptionId: varchar("exception_id", { length: 36 }).notNull().references(() => exceptions.id, { onDelete: "cascade" }),
  comment: text("comment").notNull(),
  createdBy: varchar("created_by", { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Exception activity feed for investigation timeline
export const exceptionActivity = mysqlTable("exception_activity", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  exceptionId: varchar("exception_id", { length: 36 }).notNull().references(() => exceptions.id, { onDelete: "cascade" }),
  activityType: text("activity_type").notNull().default("note"), // note, status_change, outcome_change, system
  message: text("message").notNull(),
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  createdBy: varchar("created_by", { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: varchar("entity_id", { length: 36 }),
  details: text("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminActivityLogs = mysqlTable("admin_activity_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // Removed .notNull()
  targetUserId: varchar("target_user_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  actionType: text("action_type").notNull(),
  beforeState: json("before_state"), // jsonb -> json
  afterState: json("after_state"),
  reason: text("reason"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const systemSettings = mysqlTable("system_settings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(), // text in mysql cannot be unique key directly unless hashed or strict length, but drizzle might handle it as VARCHAR(255) if type=text? No, drizzle text is TEXT. Use varchar for unique keys.
  // Wait, system_settings key should be varchar if unique.
  // In PG text can be unique. In MySQL TEXT requires prefix length.
  // I will change `key` to `varchar`? Or assume Drizzle text maps to a type? Drizzle MySQL `text` -> TEXT.
  // To be safe, I'll change `key` to `varchar` with length 255 for compatibility.
  // BUT the user prompt had issues with "Identifier too long" not "BLOB used as key".
  // If I change to varchar(255) it is safer.
  value: json("value").notNull(),
  updatedBy: varchar("updated_by", { length: 36 }).references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payment declarations are now tied to client + department + date
export const paymentDeclarations = mysqlTable("payment_declarations", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  departmentId: varchar("department_id", { length: 36 }).notNull().references(() => departments.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  reportedCash: decimal("reported_cash", { precision: 12, scale: 2 }).default("0.00"),
  reportedPosSettlement: decimal("reported_pos_settlement", { precision: 12, scale: 2 }).default("0.00"),
  reportedTransfers: decimal("reported_transfers", { precision: 12, scale: 2 }).default("0.00"),
  totalReported: decimal("total_reported", { precision: 12, scale: 2 }).default("0.00"),
  notes: text("notes"),
  supportingDocuments: json("supporting_documents").$type<{ name: string; url: string; type: string }[]>(), // jsonb -> json
  createdBy: varchar("created_by", { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// USER-CLIENT ACCESS CONTROL
// ============================================================

export const ACCESS_STATUS = ["assigned", "suspended", "removed"] as const;
export type AccessStatus = typeof ACCESS_STATUS[number];

export const userClientAccess = mysqlTable("user_client_access", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("assigned"),
  assignedBy: varchar("assigned_by", { length: 36 }).notNull().references(() => users.id),
  assignedAt: datetime("assigned_at").default(sql`(now())`).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  suspendReason: text("suspend_reason"),
  notes: text("notes"),
});

// ============================================================
// AUDIT CONTEXT (Session-based audit period tracking)
// ============================================================

export const AUDIT_PERIOD = ["daily", "weekly", "monthly", "custom"] as const;
export type AuditPeriod = typeof AUDIT_PERIOD[number];

export const AUDIT_CONTEXT_STATUS = ["active", "cleared"] as const;
export type AuditContextStatus = typeof AUDIT_CONTEXT_STATUS[number];

export const auditContexts = mysqlTable("audit_contexts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  departmentId: varchar("department_id", { length: 36 }).references(() => departments.id, { onDelete: "cascade" }),
  period: text("period").notNull().default("daily"),
  startDate: datetime("start_date").notNull(),
  endDate: datetime("end_date").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActiveAt: datetime("last_active_at").default(sql`(now())`).notNull(),
});

// ============================================================
// AUDIT LIFECYCLE (Draft/Submitted/Locked status tracking)
// ============================================================

export const AUDIT_STATUS = ["draft", "submitted", "locked"] as const;
export type AuditStatus = typeof AUDIT_STATUS[number];

export const audits = mysqlTable("audits", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  departmentId: varchar("department_id", { length: 36 }).notNull().references(() => departments.id, { onDelete: "cascade" }),
  period: text("period").notNull().default("daily"),
  startDate: datetime("start_date").notNull(),
  endDate: datetime("end_date").notNull(),
  status: text("status").notNull().default("draft"),
  submittedBy: varchar("submitted_by", { length: 36 }).references(() => users.id),
  submittedAt: datetime("submitted_at"),
  lockedBy: varchar("locked_by", { length: 36 }).references(() => users.id),
  lockedAt: datetime("locked_at"),
  notes: text("notes"),
  createdBy: varchar("created_by", { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// AUDIT REISSUE PERMISSIONS (Super Admin grants for editing submitted audits)
// ============================================================

export const auditReissuePermissions = mysqlTable("audit_reissue_permissions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id", { length: 36 }).notNull().references(() => audits.id, { onDelete: "cascade" }),
  grantedTo: varchar("granted_to", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  grantedBy: varchar("granted_by", { length: 36 }).notNull().references(() => users.id),
  grantedAt: datetime("granted_at").default(sql`(now())`).notNull(),
  expiresAt: datetime("expires_at"),
  scope: text("scope").notNull().default("edit_after_submission"),
  reason: text("reason"),
  active: boolean("active").default(true),
});

// ============================================================
// ENHANCED AUDIT TRAIL (for state changes with before/after snapshots)
// ============================================================

export const auditChangeLog = mysqlTable("audit_change_log", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id", { length: 36 }).references(() => audits.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  clientId: varchar("client_id", { length: 36 }).references(() => clients.id),
  departmentId: varchar("department_id", { length: 36 }).references(() => departments.id),
  actionType: text("action_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id", { length: 36 }),
  beforeState: json("before_state"), // jsonb -> json
  afterState: json("after_state"),
  reason: text("reason"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// STORE ISSUES (Store → Department transfers) - LEGACY
// ============================================================

export const storeIssues = mysqlTable("store_issues", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  issueDate: datetime("issue_date").notNull(),
  fromDepartmentId: varchar("from_department_id", { length: 36 }).notNull().references(() => inventoryDepartments.id, { onDelete: "cascade" }),
  toDepartmentId: varchar("to_department_id", { length: 36 }).notNull().references(() => inventoryDepartments.id, { onDelete: "cascade" }),
  notes: text("notes"),
  status: text("status").notNull().default("posted"),
  createdBy: varchar("created_by", { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const storeIssueLines = mysqlTable("store_issue_lines", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  storeIssueId: varchar("store_issue_id", { length: 36 }).notNull().references(() => storeIssues.id, { onDelete: "cascade" }),
  itemId: varchar("item_id", { length: 36 }).notNull().references(() => items.id, { onDelete: "cascade" }),
  qtyIssued: decimal("qty_issued", { precision: 10, scale: 2 }).notNull(),
  costPriceSnapshot: decimal("cost_price_snapshot", { precision: 12, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// SRD TRANSFERS (Unified SRD ↔ SRD movement: Issue, Return, Transfer)
// ============================================================

export const SRD_TRANSFER_TYPES = ["issue", "return", "transfer"] as const;
export type SrdTransferType = typeof SRD_TRANSFER_TYPES[number];

export const srdTransfers = mysqlTable("srd_transfers", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  refId: varchar("ref_id", { length: 255 }).notNull(),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  fromSrdId: varchar("from_srd_id", { length: 36 }).notNull().references(() => inventoryDepartments.id, { onDelete: "cascade" }),
  toSrdId: varchar("to_srd_id", { length: 36 }).notNull().references(() => inventoryDepartments.id, { onDelete: "cascade" }),
  itemId: varchar("item_id", { length: 36 }).notNull().references(() => items.id, { onDelete: "cascade" }),
  qty: decimal("qty", { precision: 10, scale: 2 }).notNull(),
  transferDate: datetime("transfer_date").notNull(),
  transferType: text("transfer_type").notNull().default("transfer"),
  notes: text("notes"),
  status: text("status").notNull().default("posted"),
  createdBy: varchar("created_by", { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// SRD LEDGER DAILY (Source of truth for SRD daily balances)
// One row per day per SRD per item - used by SrdLedgerService
// ============================================================

export const SRD_LEDGER_TYPES = ["MAIN", "DEPARTMENT"] as const;
export type SrdLedgerType = typeof SRD_LEDGER_TYPES[number];

export const SRD_MOVEMENT_EVENT_TYPES = [
  "PURCHASE",
  "REQ_MAIN_TO_DEP",
  "RETURN_DEP_TO_MAIN",
  "TRANSFER_DEP_TO_DEP",
  "WASTE",
  "WRITE_OFF",
  "ADJUSTMENT",
  "SOLD"
] as const;
export type SrdMovementEventType = typeof SRD_MOVEMENT_EVENT_TYPES[number];

export const srdLedgerDaily = mysqlTable("srd_ledger_daily", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  srdId: varchar("srd_id", { length: 36 }).notNull().references(() => inventoryDepartments.id, { onDelete: "cascade" }),
  srdType: text("srd_type").notNull(), // 'MAIN' or 'DEPARTMENT'
  itemId: varchar("item_id", { length: 36 }).notNull().references(() => items.id, { onDelete: "cascade" }),
  ledgerDate: date("ledger_date").notNull(),

  // Opening/Closing
  openingQty: decimal("opening_qty", { precision: 18, scale: 2 }).notNull().default("0"),
  closingQty: decimal("closing_qty", { precision: 18, scale: 2 }).notNull().default("0"),

  // MAIN store movements
  purchaseAddedQty: decimal("purchase_added_qty", { precision: 18, scale: 2 }).notNull().default("0"),
  returnsInQty: decimal("returns_in_qty", { precision: 18, scale: 2 }).notNull().default("0"), // dept -> main returns received
  reqDepTotalQty: decimal("req_dep_total_qty", { precision: 18, scale: 2 }).notNull().default("0"), // main -> dept requisitions issued

  // DEPARTMENT store movements
  fromMainQty: decimal("from_main_qty", { precision: 18, scale: 2 }).notNull().default("0"), // received from main requisitions
  interInQty: decimal("inter_in_qty", { precision: 18, scale: 2 }).notNull().default("0"), // received from other dept SRD
  interOutQty: decimal("inter_out_qty", { precision: 18, scale: 2 }).notNull().default("0"), // sent to other dept SRD
  returnsOutToMain: decimal("returns_out_to_main", { precision: 18, scale: 2 }).notNull().default("0"), // dept -> main returns sent
  soldQty: decimal("sold_qty", { precision: 18, scale: 2 }).notNull().default("0"),

  // Shared movements
  wasteQty: decimal("waste_qty", { precision: 18, scale: 2 }).notNull().default("0"),
  writeOffQty: decimal("write_off_qty", { precision: 18, scale: 2 }).notNull().default("0"),
  adjustmentQty: decimal("adjustment_qty", { precision: 18, scale: 2 }).notNull().default("0"), // can be negative

  // Audit fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// SRD STOCK MOVEMENTS (Unified event log for edit/reversal safety)
// All movements go through SrdLedgerService
// ============================================================

export const srdStockMovements = mysqlTable("srd_stock_movements", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  movementDate: date("movement_date").notNull(),
  eventType: text("event_type").notNull(), // PURCHASE, REQ_MAIN_TO_DEP, etc.
  fromSrdId: varchar("from_srd_id", { length: 36 }).references(() => inventoryDepartments.id, { onDelete: "set null" }),
  toSrdId: varchar("to_srd_id", { length: 36 }).references(() => inventoryDepartments.id, { onDelete: "set null" }),
  itemId: varchar("item_id", { length: 36 }).notNull().references(() => items.id, { onDelete: "cascade" }),
  qty: decimal("qty", { precision: 18, scale: 2 }).notNull(),
  description: text("description"),
  isDeleted: boolean("is_deleted").notNull().default(false), // for edit/reversal tracking
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// STORE STOCK (Daily store inventory balances) - LEGACY
// ============================================================

export const storeStock = mysqlTable("store_stock", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  storeDepartmentId: varchar("store_department_id", { length: 36 }).notNull().references(() => inventoryDepartments.id, { onDelete: "cascade" }),
  itemId: varchar("item_id", { length: 36 }).notNull().references(() => items.id, { onDelete: "cascade" }),
  date: datetime("date").notNull(),
  openingQty: decimal("opening_qty", { precision: 10, scale: 2 }).default("0.00"),
  addedQty: decimal("added_qty", { precision: 10, scale: 2 }).default("0.00"),
  issuedQty: decimal("issued_qty", { precision: 10, scale: 2 }).default("0.00"),
  transfersInQty: decimal("transfers_in_qty", { precision: 10, scale: 2 }).default("0.00"),
  transfersOutQty: decimal("transfers_out_qty", { precision: 10, scale: 2 }).default("0.00"),
  returnInQty: decimal("return_in_qty", { precision: 10, scale: 2 }).default("0.00"),
  interDeptInQty: decimal("inter_dept_in_qty", { precision: 10, scale: 2 }).default("0.00"),
  interDeptOutQty: decimal("inter_dept_out_qty", { precision: 10, scale: 2 }).default("0.00"),
  wasteQty: decimal("waste_qty", { precision: 10, scale: 2 }).default("0.00"),
  writeOffQty: decimal("write_off_qty", { precision: 10, scale: 2 }).default("0.00"),
  adjustmentQty: decimal("adjustment_qty", { precision: 10, scale: 2 }).default("0.00"),
  soldQty: decimal("sold_qty", { precision: 10, scale: 2 }).default("0.00"),
  closingQty: decimal("closing_qty", { precision: 10, scale: 2 }).default("0.00"),
  physicalClosingQty: decimal("physical_closing_qty", { precision: 10, scale: 2 }),
  varianceQty: decimal("variance_qty", { precision: 10, scale: 2 }).default("0.00"),
  costPriceSnapshot: decimal("cost_price_snapshot", { precision: 12, scale: 2 }).default("0.00"),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// GOODS RECEIVED NOTES (GRN)
// ============================================================

export const GRN_STATUS = ["pending", "received"] as const;
export type GRNStatus = typeof GRN_STATUS[number];

export const goodsReceivedNotes = mysqlTable("goods_received_notes", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  supplierId: varchar("supplier_id", { length: 36 }).references(() => suppliers.id, { onDelete: "set null" }),
  supplierName: text("supplier_name").notNull(),
  date: datetime("date").notNull(),
  invoiceRef: text("invoice_ref").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  evidenceUrl: text("evidence_url"),
  evidenceFileName: text("evidence_file_name"),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// STORE NAMES (SRDs - Stock Reconciliation Departments, client-specific)
// ============================================================

export const storeNames = mysqlTable("store_names", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// INVENTORY DEPARTMENTS (Links store names to clients with type)
// ============================================================

export const INVENTORY_TYPES = ["MAIN_STORE", "DEPARTMENT_STORE"] as const;
export type InventoryType = typeof INVENTORY_TYPES[number];

export const inventoryDepartments = mysqlTable("inventory_departments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  storeNameId: varchar("store_name_id", { length: 36 }).notNull().references(() => storeNames.id, { onDelete: "restrict" }),
  departmentId: varchar("department_id", { length: 36 }).references(() => departments.id, { onDelete: "set null" }),
  inventoryType: text("inventory_type").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// INVENTORY DEPARTMENT CATEGORIES (Category assignments per SRD)
// ============================================================

export const inventoryDepartmentCategories = mysqlTable("inventory_department_categories", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  // Use manual FK to avoid long identifier error
  inventoryDepartmentId: varchar("inventory_department_id", { length: 36 }).notNull(),
  categoryId: varchar("category_id", { length: 36 }).notNull().references(() => categories.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  invDeptFk: foreignKey({
    columns: [t.inventoryDepartmentId],
    foreignColumns: [inventoryDepartments.id],
    name: "inv_dept_cat_inv_dept_id_fk"
  }).onDelete("cascade")
}));

// ============================================================
// RECEIVABLES REGISTER (Cash Shortages from Department Comparison)
// ============================================================

export const RECEIVABLE_STATUSES = ["open", "part_paid", "settled", "written_off"] as const;
export type ReceivableStatus = typeof RECEIVABLE_STATUSES[number];

export const receivables = mysqlTable("receivables", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  departmentId: varchar("department_id").notNull().references(() => departments.id, { onDelete: "cascade" }),
  auditDate: timestamp("audit_date").notNull(),
  varianceAmount: decimal("variance_amount", { precision: 12, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).default("0.00"),
  balanceRemaining: decimal("balance_remaining", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("open"),
  comments: text("comments"),
  evidenceUrl: text("evidence_url"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const receivableHistory = mysqlTable("receivable_history", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  receivableId: varchar("receivable_id").notNull().references(() => receivables.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// SURPLUS REGISTER (Excess Cash from Department Comparison)
// ============================================================

export const SURPLUS_STATUSES = ["open", "classified", "cleared", "posted"] as const;
export type SurplusStatus = typeof SURPLUS_STATUSES[number];

export const surpluses = mysqlTable("surpluses", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  departmentId: varchar("department_id").notNull().references(() => departments.id, { onDelete: "cascade" }),
  auditDate: timestamp("audit_date").notNull(),
  surplusAmount: decimal("surplus_amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("open"),
  classification: text("classification"),
  comments: text("comments"),
  evidenceUrl: text("evidence_url"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const surplusHistory = mysqlTable("surplus_history", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  surplusId: varchar("surplus_id").notNull().references(() => surpluses.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// ITEM SERIAL EVENTS (Serial Number Tracking)
// ============================================================

export const SERIAL_EVENT_TYPES = ["count", "transfer", "adjustment", "waste", "write_off", "received"] as const;
export type SerialEventType = typeof SERIAL_EVENT_TYPES[number];

export const itemSerialEvents = mysqlTable("item_serial_events", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  date: datetime("date").notNull(),
  srdId: varchar("srd_id", { length: 36 }).notNull().references(() => inventoryDepartments.id, { onDelete: "cascade" }),
  itemId: varchar("item_id", { length: 36 }).notNull().references(() => items.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  refId: varchar("ref_id", { length: 255 }),
  serialNumber: varchar("serial_number", { length: 255 }).notNull(),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertItemSerialEventSchema = createInsertSchema(itemSerialEvents).omit({ id: true, createdAt: true }).extend({
  date: z.coerce.date(),
});
export const insertStoreNameSchema = createInsertSchema(storeNames).omit({ id: true, createdAt: true });
export const insertReceivableSchema = createInsertSchema(receivables).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReceivableHistorySchema = createInsertSchema(receivableHistory).omit({ id: true, createdAt: true });
export const insertSurplusSchema = createInsertSchema(surpluses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSurplusHistorySchema = createInsertSchema(surplusHistory).omit({ id: true, createdAt: true });
export const insertInventoryDepartmentSchema = createInsertSchema(inventoryDepartments).omit({ id: true, createdAt: true });
export const insertInventoryDepartmentCategorySchema = createInsertSchema(inventoryDepartmentCategories).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true });
export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true, createdAt: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true });
export const insertItemSchema = createInsertSchema(items).omit({ id: true, createdAt: true });
export const insertPurchaseLineSchema = createInsertSchema(purchaseLines).omit({ id: true, createdAt: true });
export const insertStockCountSchema = createInsertSchema(stockCounts).omit({ id: true, createdAt: true });
export const insertSalesEntrySchema = createInsertSchema(salesEntries).omit({ id: true, createdAt: true });
export const insertPurchaseSchema = createInsertSchema(purchases).omit({ id: true, createdAt: true });
export const insertStockMovementSchema = createInsertSchema(stockMovements).omit({ id: true, createdAt: true });
export const insertStockMovementLineSchema = createInsertSchema(stockMovementLines).omit({ id: true, createdAt: true });
export const insertReconciliationSchema = createInsertSchema(reconciliations).omit({ id: true, createdAt: true });
export const insertExceptionSchema = createInsertSchema(exceptions).omit({ id: true, createdAt: true, caseNumber: true, updatedAt: true });
export const insertExceptionCommentSchema = createInsertSchema(exceptionComments).omit({ id: true, createdAt: true });
export const insertExceptionActivitySchema = createInsertSchema(exceptionActivity).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertAdminActivityLogSchema = createInsertSchema(adminActivityLogs).omit({ id: true, createdAt: true });
export const insertPaymentDeclarationSchema = createInsertSchema(paymentDeclarations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserClientAccessSchema = createInsertSchema(userClientAccess).omit({ id: true, assignedAt: true, updatedAt: true });
export const insertAuditContextSchema = createInsertSchema(auditContexts).omit({ id: true, createdAt: true, lastActiveAt: true });
export const insertAuditSchema = createInsertSchema(audits).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAuditReissuePermissionSchema = createInsertSchema(auditReissuePermissions).omit({ id: true, grantedAt: true });
export const insertAuditChangeLogSchema = createInsertSchema(auditChangeLog).omit({ id: true, createdAt: true });
export const insertStoreIssueSchema = createInsertSchema(storeIssues).omit({ id: true, createdAt: true });
export const insertStoreIssueLineSchema = createInsertSchema(storeIssueLines).omit({ id: true, createdAt: true });
export const insertStoreStockSchema = createInsertSchema(storeStock).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  date: z.coerce.date(),
});
export const insertGoodsReceivedNoteSchema = createInsertSchema(goodsReceivedNotes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSrdTransferSchema = createInsertSchema(srdTransfers).omit({ id: true, createdAt: true }).extend({
  transferDate: z.coerce.date(),
});
export const insertOrganizationSettingsSchema = createInsertSchema(organizationSettings).omit({ id: true, updatedAt: true });
export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({ id: true, updatedAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertDataExportSchema = createInsertSchema(dataExports).omit({ id: true, createdAt: true });
export const insertSrdLedgerDailySchema = createInsertSchema(srdLedgerDaily).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSrdStockMovementSchema = createInsertSchema(srdStockMovements).omit({ id: true, createdAt: true, updatedAt: true });

// Purchase Item Events - history/audit trail of all item purchases
export const purchaseItemEvents = mysqlTable("purchase_item_events", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id", { length: 36 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  srdId: varchar("srd_id", { length: 36 }).references(() => inventoryDepartments.id, { onDelete: "set null" }),
  itemId: varchar("item_id", { length: 36 }).notNull().references(() => items.id, { onDelete: "cascade" }),
  date: datetime("date").notNull(),
  qty: decimal("qty", { precision: 10, scale: 2 }).notNull(),
  unitCostAtPurchase: decimal("unit_cost_at_purchase", { precision: 12, scale: 2 }).notNull(),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).notNull(),
  supplierName: text("supplier_name"),
  invoiceNo: text("invoice_no"),
  notes: text("notes"),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPurchaseItemEventSchema = createInsertSchema(purchaseItemEvents).omit({ id: true, createdAt: true, updatedAt: true });

// Subscription Plans enum
export const SUBSCRIPTION_PLANS = ["starter", "growth", "business", "enterprise"] as const;
export type SubscriptionPlan = typeof SUBSCRIPTION_PLANS[number];

export const BILLING_PERIODS = ["monthly", "quarterly", "yearly"] as const;
export type BillingPeriod = typeof BILLING_PERIODS[number];

export const SUBSCRIPTION_STATUSES = ["trial", "active", "past_due", "suspended", "cancelled"] as const;
export type SubscriptionStatus = typeof SUBSCRIPTION_STATUSES[number];

// Subscription provider types
export const SUBSCRIPTION_PROVIDERS = ["manual", "manual_free", "paystack", "stripe"] as const;
export type SubscriptionProvider = typeof SUBSCRIPTION_PROVIDERS[number];

// Subscriptions table for tenant billing and feature access
export const subscriptions = mysqlTable("subscriptions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id", { length: 36 }).notNull().references(() => organizations.id),
  planName: text("plan_name").notNull().default("starter"),
  billingPeriod: text("billing_period").notNull().default("monthly"),
  slotsPurchased: int("slots_purchased").notNull().default(1),
  status: text("status").notNull().default("active"),
  provider: text("provider").default("manual"),
  startDate: timestamp("start_date").defaultNow().notNull(),
  nextBillingDate: datetime("next_billing_date"),
  expiresAt: datetime("expires_at"),
  endDate: datetime("end_date"),
  notes: text("notes"),
  updatedBy: varchar("updated_by", { length: 36 }),
  // Owner overrides (null = use plan defaults)
  maxClientsOverride: int("max_clients_override"),
  maxSrdDepartmentsOverride: int("max_srd_departments_override"),
  maxMainStoreOverride: int("max_main_store_override"),
  maxSeatsOverride: int("max_seats_override"),
  retentionDaysOverride: int("retention_days_override"),
  // Paystack integration fields
  paystackCustomerCode: text("paystack_customer_code"),
  paystackSubscriptionCode: text("paystack_subscription_code"),
  paystackPlanCode: text("paystack_plan_code"),
  paystackEmailToken: text("paystack_email_token"),
  lastPaymentDate: datetime("last_payment_date"),
  lastPaymentAmount: decimal("last_payment_amount", { precision: 12, scale: 2 }),
  lastPaymentReference: text("last_payment_reference"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });

// Entitlements computed per subscription plan
export interface Entitlements {
  maxClients: number;
  maxSrdDepartmentsPerClient: number;
  maxMainStorePerClient: number;
  maxSeats: number;
  retentionDays: number;
  canViewReports: boolean;
  canDownloadReports: boolean;
  canPrintReports: boolean;
  canAccessPurchasesRegisterPage: boolean;
  canAccessSecondHitPage: boolean;
  canDownloadSecondHitFullTable: boolean;
  canDownloadMainStoreLedgerSummary: boolean;
  canUseBetaFeatures: boolean;
}

// Plan limits configuration
export const PLAN_LIMITS: Record<SubscriptionPlan, Entitlements> = {
  starter: {
    maxClients: 1,
    maxSrdDepartmentsPerClient: 4,
    maxMainStorePerClient: 1,
    maxSeats: 2,
    retentionDays: 30,
    canViewReports: true,
    canDownloadReports: false,
    canPrintReports: false,
    canAccessPurchasesRegisterPage: false,
    canAccessSecondHitPage: false,
    canDownloadSecondHitFullTable: false,
    canDownloadMainStoreLedgerSummary: false,
    canUseBetaFeatures: false,
  },
  growth: {
    maxClients: 3,
    maxSrdDepartmentsPerClient: 7,
    maxMainStorePerClient: 1,
    maxSeats: 5,
    retentionDays: 90,
    canViewReports: true,
    canDownloadReports: true,
    canPrintReports: true,
    canAccessPurchasesRegisterPage: true,
    canAccessSecondHitPage: false,
    canDownloadSecondHitFullTable: false,
    canDownloadMainStoreLedgerSummary: false,
    canUseBetaFeatures: false,
  },
  business: {
    maxClients: 5,
    maxSrdDepartmentsPerClient: 12,
    maxMainStorePerClient: 1,
    maxSeats: 12,
    retentionDays: 365,
    canViewReports: true,
    canDownloadReports: true,
    canPrintReports: true,
    canAccessPurchasesRegisterPage: true,
    canAccessSecondHitPage: true,
    canDownloadSecondHitFullTable: true,
    canDownloadMainStoreLedgerSummary: true,
    canUseBetaFeatures: false,
  },
  enterprise: {
    maxClients: 10,
    maxSrdDepartmentsPerClient: 999,
    maxMainStorePerClient: 1,
    maxSeats: 999,
    retentionDays: 9999,
    canViewReports: true,
    canDownloadReports: true,
    canPrintReports: true,
    canAccessPurchasesRegisterPage: true,
    canAccessSecondHitPage: true,
    canDownloadSecondHitFullTable: true,
    canDownloadMainStoreLedgerSummary: true,
    canUseBetaFeatures: true,
  },
};

// Configurable Subscription Plans (editable by Owner/Platform Admin)
export const subscriptionPlans = mysqlTable("subscription_plans", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug", { length: 255 }).notNull().unique(), // starter, growth, business, enterprise
  displayName: text("display_name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  // Pricing (in smallest currency unit, e.g., kobo for NGN)
  monthlyPrice: decimal("monthly_price", { precision: 12, scale: 2 }).notNull().default("0"),
  quarterlyPrice: decimal("quarterly_price", { precision: 12, scale: 2 }).notNull().default("0"),
  yearlyPrice: decimal("yearly_price", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("NGN"),
  // Slot & Capacity Limits
  maxClients: int("max_clients").notNull().default(1),
  maxSrdDepartmentsPerClient: int("max_srd_departments_per_client").notNull().default(4),
  maxMainStorePerClient: int("max_main_store_per_client").notNull().default(1),
  maxSeats: int("max_seats").notNull().default(2),
  retentionDays: int("retention_days").notNull().default(30),
  // Feature Flags (entitlements)
  canViewReports: boolean("can_view_reports").notNull().default(true),
  canDownloadReports: boolean("can_download_reports").notNull().default(false),
  canPrintReports: boolean("can_print_reports").notNull().default(false),
  canAccessPurchasesRegisterPage: boolean("can_access_purchases_register_page").notNull().default(false),
  canAccessSecondHitPage: boolean("can_access_second_hit_page").notNull().default(false),
  canDownloadSecondHitFullTable: boolean("can_download_second_hit_full_table").notNull().default(false),
  canDownloadMainStoreLedgerSummary: boolean("can_download_main_store_ledger_summary").notNull().default(false),
  canUseBetaFeatures: boolean("can_use_beta_features").notNull().default(false),
  // Audit
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true, createdAt: true, updatedAt: true });

// Payments table for tenant billing history
export const PAYMENT_STATUSES = ["pending", "completed", "failed", "refunded"] as const;
export type PaymentStatus = typeof PAYMENT_STATUSES[number];

export const payments = mysqlTable("payments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id", { length: 36 }).notNull().references(() => organizations.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("NGN"),
  periodCoveredStart: datetime("period_covered_start").notNull(),
  periodCoveredEnd: datetime("period_covered_end").notNull(),
  status: text("status").notNull().default("pending"),
  reference: text("reference"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(payments);

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
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
export type InsertStockMovementLine = z.infer<typeof insertStockMovementLineSchema>;
export type StockMovementLine = typeof stockMovementLines.$inferSelect;
export type InsertReconciliation = z.infer<typeof insertReconciliationSchema>;
export type Reconciliation = typeof reconciliations.$inferSelect;
export type InsertException = z.infer<typeof insertExceptionSchema>;
export type Exception = typeof exceptions.$inferSelect;
export type InsertExceptionComment = z.infer<typeof insertExceptionCommentSchema>;
export type ExceptionComment = typeof exceptionComments.$inferSelect;
export type InsertExceptionActivity = z.infer<typeof insertExceptionActivitySchema>;
export type ExceptionActivity = typeof exceptionActivity.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAdminActivityLog = z.infer<typeof insertAdminActivityLogSchema>;
export type AdminActivityLog = typeof adminActivityLogs.$inferSelect;
export type InsertPaymentDeclaration = z.infer<typeof insertPaymentDeclarationSchema>;
export type PaymentDeclaration = typeof paymentDeclarations.$inferSelect;
export type InsertUserClientAccess = z.infer<typeof insertUserClientAccessSchema>;
export type UserClientAccess = typeof userClientAccess.$inferSelect;
export type InsertAuditContext = z.infer<typeof insertAuditContextSchema>;
export type AuditContext = typeof auditContexts.$inferSelect;
export type InsertAudit = z.infer<typeof insertAuditSchema>;
export type Audit = typeof audits.$inferSelect;
export type InsertAuditReissuePermission = z.infer<typeof insertAuditReissuePermissionSchema>;
export type AuditReissuePermission = typeof auditReissuePermissions.$inferSelect;
export type InsertAuditChangeLog = z.infer<typeof insertAuditChangeLogSchema>;
export type AuditChangeLog = typeof auditChangeLog.$inferSelect;
export type InsertStoreIssue = z.infer<typeof insertStoreIssueSchema>;
export type StoreIssue = typeof storeIssues.$inferSelect;
export type InsertStoreIssueLine = z.infer<typeof insertStoreIssueLineSchema>;
export type StoreIssueLine = typeof storeIssueLines.$inferSelect;
export type InsertStoreStock = z.infer<typeof insertStoreStockSchema>;
export type StoreStock = typeof storeStock.$inferSelect;
export type InsertStoreName = z.infer<typeof insertStoreNameSchema>;
export type StoreName = typeof storeNames.$inferSelect;
export type InsertInventoryDepartment = z.infer<typeof insertInventoryDepartmentSchema>;
export type InventoryDepartment = typeof inventoryDepartments.$inferSelect;
export type InsertInventoryDepartmentCategory = z.infer<typeof insertInventoryDepartmentCategorySchema>;
export type InventoryDepartmentCategory = typeof inventoryDepartmentCategories.$inferSelect;
export type InsertGoodsReceivedNote = z.infer<typeof insertGoodsReceivedNoteSchema>;
export type GoodsReceivedNote = typeof goodsReceivedNotes.$inferSelect;
export type InsertReceivable = z.infer<typeof insertReceivableSchema>;
export type Receivable = typeof receivables.$inferSelect;
export type InsertReceivableHistory = z.infer<typeof insertReceivableHistorySchema>;
export type ReceivableHistory = typeof receivableHistory.$inferSelect;
export type InsertSurplus = z.infer<typeof insertSurplusSchema>;
export type Surplus = typeof surpluses.$inferSelect;
export type InsertSurplusHistory = z.infer<typeof insertSurplusHistorySchema>;
export type SurplusHistory = typeof surplusHistory.$inferSelect;
export type InsertSrdTransfer = z.infer<typeof insertSrdTransferSchema>;
export type SrdTransfer = typeof srdTransfers.$inferSelect;
export type InsertItemSerialEvent = z.infer<typeof insertItemSerialEventSchema>;
export type ItemSerialEvent = typeof itemSerialEvents.$inferSelect;
export type InsertOrganizationSettings = z.infer<typeof insertOrganizationSettingsSchema>;
export type OrganizationSettings = typeof organizationSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertDataExport = z.infer<typeof insertDataExportSchema>;
export type DataExport = typeof dataExports.$inferSelect;
export type InsertPurchaseItemEvent = z.infer<typeof insertPurchaseItemEventSchema>;
export type PurchaseItemEvent = typeof purchaseItemEvents.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscriptionPlanConfig = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlanConfig = typeof subscriptionPlans.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertSrdLedgerDaily = z.infer<typeof insertSrdLedgerDailySchema>;
export type SrdLedgerDaily = typeof srdLedgerDaily.$inferSelect;
export type InsertSrdStockMovement = z.infer<typeof insertSrdStockMovementSchema>;
export type SrdStockMovement = typeof srdStockMovements.$inferSelect;

// =====================================================
// PLATFORM ADMIN TABLES (MiAuditOps Internal Staff)
// =====================================================

// Platform Admin Roles
export const PLATFORM_ADMIN_ROLES = [
  "platform_super_admin",
  "billing_admin",
  "support_admin",
  "compliance_admin",
  "readonly_admin"
] as const;
export type PlatformAdminRole = typeof PLATFORM_ADMIN_ROLES[number];

// Platform Admin Users - separate from tenant users
export const platformAdminUsers = mysqlTable("platform_admin_users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("readonly_admin"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: datetime("last_login_at"),
  loginAttempts: int("login_attempts").default(0),
  lockedUntil: datetime("locked_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlatformAdminUserSchema = createInsertSchema(platformAdminUsers).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlatformAdminUser = z.infer<typeof insertPlatformAdminUserSchema>;
export type PlatformAdminUser = typeof platformAdminUsers.$inferSelect;

// Platform Admin Audit Log - tracks all admin actions
export const platformAdminAuditLog = mysqlTable("platform_admin_audit_log", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id", { length: 36 }).notNull().references(() => platformAdminUsers.id),
  actionType: text("action_type").notNull(),
  targetType: text("target_type").notNull(),
  targetId: varchar("target_id", { length: 36 }),
  beforeJson: json("before_json"),
  afterJson: json("after_json"),
  notes: text("notes"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPlatformAdminAuditLogSchema = createInsertSchema(platformAdminAuditLog).omit({ id: true, createdAt: true });
export type InsertPlatformAdminAuditLog = z.infer<typeof insertPlatformAdminAuditLogSchema>;
export type PlatformAdminAuditLog = typeof platformAdminAuditLog.$inferSelect;

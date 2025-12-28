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
  accessScope: jsonb("access_scope").$type<{ clientIds?: string[]; departmentIds?: string[]; global?: boolean }>(),
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

// Categories are optional grouping labels under a client (e.g., F&B, Front Desk, Admin)
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Departments are the core operational unit - all transactions and reconciliations tie to departments
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id").references(() => categories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  suspendReason: text("suspend_reason"),
  createdBy: varchar("created_by").references(() => users.id),
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
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  departmentId: varchar("department_id").notNull().references(() => departments.id, { onDelete: "cascade" }),
  itemId: varchar("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
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
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const salesEntries = pgTable("sales_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
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

// Purchases are now tied to departments (e.g., "Store" department for inventory purchases)
export const purchases = pgTable("purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  departmentId: varchar("department_id").notNull().references(() => departments.id, { onDelete: "cascade" }),
  supplierName: text("supplier_name").notNull(),
  invoiceRef: text("invoice_ref").notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").default("draft"),
  evidenceUrl: text("evidence_url"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Stock movements are now tied to departments
export const stockMovements = pgTable("stock_movements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  departmentId: varchar("department_id").notNull().references(() => departments.id, { onDelete: "cascade" }),
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
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
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

// Exceptions are tied to departments
export const exceptions = pgTable("exceptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseNumber: text("case_number").notNull().unique(),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  departmentId: varchar("department_id").notNull().references(() => departments.id, { onDelete: "cascade" }),
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

// Payment declarations are now tied to client + department + date
export const paymentDeclarations = pgTable("payment_declarations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  departmentId: varchar("department_id").notNull().references(() => departments.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  reportedCash: decimal("reported_cash", { precision: 12, scale: 2 }).default("0.00"),
  reportedPosSettlement: decimal("reported_pos_settlement", { precision: 12, scale: 2 }).default("0.00"),
  reportedTransfers: decimal("reported_transfers", { precision: 12, scale: 2 }).default("0.00"),
  totalReported: decimal("total_reported", { precision: 12, scale: 2 }).default("0.00"),
  notes: text("notes"),
  supportingDocuments: jsonb("supporting_documents").$type<{ name: string; url: string; type: string }[]>(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// USER-CLIENT ACCESS CONTROL
// ============================================================

export const ACCESS_STATUS = ["assigned", "suspended", "removed"] as const;
export type AccessStatus = typeof ACCESS_STATUS[number];

export const userClientAccess = pgTable("user_client_access", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("assigned"),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
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

export const auditContexts = pgTable("audit_contexts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  departmentId: varchar("department_id").references(() => departments.id, { onDelete: "cascade" }),
  period: text("period").notNull().default("daily"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
});

// ============================================================
// AUDIT LIFECYCLE (Draft/Submitted/Locked status tracking)
// ============================================================

export const AUDIT_STATUS = ["draft", "submitted", "locked"] as const;
export type AuditStatus = typeof AUDIT_STATUS[number];

export const audits = pgTable("audits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  departmentId: varchar("department_id").notNull().references(() => departments.id, { onDelete: "cascade" }),
  period: text("period").notNull().default("daily"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("draft"),
  submittedBy: varchar("submitted_by").references(() => users.id),
  submittedAt: timestamp("submitted_at"),
  lockedBy: varchar("locked_by").references(() => users.id),
  lockedAt: timestamp("locked_at"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// AUDIT REISSUE PERMISSIONS (Super Admin grants for editing submitted audits)
// ============================================================

export const auditReissuePermissions = pgTable("audit_reissue_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").notNull().references(() => audits.id, { onDelete: "cascade" }),
  grantedTo: varchar("granted_to").notNull().references(() => users.id, { onDelete: "cascade" }),
  grantedBy: varchar("granted_by").notNull().references(() => users.id),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  scope: text("scope").notNull().default("edit_after_submission"),
  reason: text("reason"),
  active: boolean("active").default(true),
});

// ============================================================
// ENHANCED AUDIT TRAIL (for state changes with before/after snapshots)
// ============================================================

export const auditChangeLog = pgTable("audit_change_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").references(() => audits.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  clientId: varchar("client_id").references(() => clients.id),
  departmentId: varchar("department_id").references(() => departments.id),
  actionType: text("action_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id"),
  beforeState: jsonb("before_state"),
  afterState: jsonb("after_state"),
  reason: text("reason"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// STORE ISSUES (Store → Department transfers)
// ============================================================

export const storeIssues = pgTable("store_issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  issueDate: timestamp("issue_date").notNull(),
  fromDepartmentId: varchar("from_department_id").notNull().references(() => inventoryDepartments.id, { onDelete: "cascade" }),
  toDepartmentId: varchar("to_department_id").notNull().references(() => inventoryDepartments.id, { onDelete: "cascade" }),
  notes: text("notes"),
  status: text("status").notNull().default("posted"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const storeIssueLines = pgTable("store_issue_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeIssueId: varchar("store_issue_id").notNull().references(() => storeIssues.id, { onDelete: "cascade" }),
  itemId: varchar("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  qtyIssued: decimal("qty_issued", { precision: 10, scale: 2 }).notNull(),
  costPriceSnapshot: decimal("cost_price_snapshot", { precision: 12, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// STORE STOCK (Daily store inventory balances)
// ============================================================

export const storeStock = pgTable("store_stock", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  storeDepartmentId: varchar("store_department_id").notNull().references(() => inventoryDepartments.id, { onDelete: "cascade" }),
  itemId: varchar("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  openingQty: decimal("opening_qty", { precision: 10, scale: 2 }).default("0.00"),
  addedQty: decimal("added_qty", { precision: 10, scale: 2 }).default("0.00"),
  issuedQty: decimal("issued_qty", { precision: 10, scale: 2 }).default("0.00"),
  closingQty: decimal("closing_qty", { precision: 10, scale: 2 }).default("0.00"),
  physicalClosingQty: decimal("physical_closing_qty", { precision: 10, scale: 2 }),
  varianceQty: decimal("variance_qty", { precision: 10, scale: 2 }).default("0.00"),
  costPriceSnapshot: decimal("cost_price_snapshot", { precision: 12, scale: 2 }).default("0.00"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// GOODS RECEIVED NOTES (GRN)
// ============================================================

export const GRN_STATUS = ["pending", "received"] as const;
export type GRNStatus = typeof GRN_STATUS[number];

export const goodsReceivedNotes = pgTable("goods_received_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  supplierId: varchar("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  supplierName: text("supplier_name").notNull(),
  date: timestamp("date").notNull(),
  invoiceRef: text("invoice_ref").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  evidenceUrl: text("evidence_url"),
  evidenceFileName: text("evidence_file_name"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// STORE NAMES (Master list of store names for linking)
// ============================================================

export const storeNames = pgTable("store_names", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// INVENTORY DEPARTMENTS (Links store names to clients with type)
// ============================================================

export const INVENTORY_TYPES = ["MAIN_STORE", "DEPARTMENT_STORE"] as const;
export type InventoryType = typeof INVENTORY_TYPES[number];

export const inventoryDepartments = pgTable("inventory_departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  storeNameId: varchar("store_name_id").notNull().references(() => storeNames.id, { onDelete: "restrict" }),
  departmentId: varchar("department_id").references(() => departments.id, { onDelete: "set null" }),
  inventoryType: text("inventory_type").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertStoreNameSchema = createInsertSchema(storeNames).omit({ id: true, createdAt: true });
export const insertInventoryDepartmentSchema = createInsertSchema(inventoryDepartments).omit({ id: true, createdAt: true });
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
export const insertReconciliationSchema = createInsertSchema(reconciliations).omit({ id: true, createdAt: true });
export const insertExceptionSchema = createInsertSchema(exceptions).omit({ id: true, createdAt: true, caseNumber: true });
export const insertExceptionCommentSchema = createInsertSchema(exceptionComments).omit({ id: true, createdAt: true });
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
export const insertStoreStockSchema = createInsertSchema(storeStock).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGoodsReceivedNoteSchema = createInsertSchema(goodsReceivedNotes).omit({ id: true, createdAt: true, updatedAt: true });

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
export type InsertGoodsReceivedNote = z.infer<typeof insertGoodsReceivedNoteSchema>;
export type GoodsReceivedNote = typeof goodsReceivedNotes.$inferSelect;

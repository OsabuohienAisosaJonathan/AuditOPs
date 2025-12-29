import { db } from "./db";
import { 
  users, clients, categories, departments, salesEntries, purchases,
  stockMovements, reconciliations, exceptions, exceptionComments, auditLogs, adminActivityLogs, systemSettings,
  suppliers, items, purchaseLines, stockCounts, paymentDeclarations,
  userClientAccess, auditContexts, audits, auditReissuePermissions, auditChangeLog,
  storeIssues, storeIssueLines, storeStock, storeNames, inventoryDepartments, goodsReceivedNotes,
  receivables, receivableHistory, surpluses, surplusHistory,
  type User, type InsertUser, type Client, type InsertClient,
  type Category, type InsertCategory, type Department, type InsertDepartment,
  type SalesEntry, type InsertSalesEntry, type Purchase, type InsertPurchase,
  type StockMovement, type InsertStockMovement, type Reconciliation, type InsertReconciliation,
  type Exception, type InsertException, type ExceptionComment, type InsertExceptionComment,
  type AuditLog, type InsertAuditLog, type AdminActivityLog, type InsertAdminActivityLog,
  type Supplier, type InsertSupplier, type Item, type InsertItem,
  type PurchaseLine, type InsertPurchaseLine, type StockCount, type InsertStockCount,
  type PaymentDeclaration, type InsertPaymentDeclaration,
  type UserClientAccess, type InsertUserClientAccess,
  type AuditContext, type InsertAuditContext,
  type Audit, type InsertAudit,
  type AuditReissuePermission, type InsertAuditReissuePermission,
  type AuditChangeLog, type InsertAuditChangeLog,
  type StoreIssue, type InsertStoreIssue,
  type StoreIssueLine, type InsertStoreIssueLine,
  type StoreStock, type InsertStoreStock,
  type StoreName, type InsertStoreName,
  type InventoryDepartment, type InsertInventoryDepartment,
  type GoodsReceivedNote, type InsertGoodsReceivedNote,
  type Receivable, type InsertReceivable,
  type ReceivableHistory, type InsertReceivableHistory,
  type Surplus, type InsertSurplus,
  type SurplusHistory, type InsertSurplusHistory
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql, or, ilike, count, sum, countDistinct } from "drizzle-orm";

export interface DashboardFilters {
  clientId?: string;
  categoryId?: string;
  departmentId?: string;
  date?: string;
}

export interface DashboardSummary {
  totalClients: number;
  totalDepartments: number;
  totalSalesToday: number;
  totalPurchasesToday: number;
  totalSales: number;
  totalPurchases: number;
  totalExceptions: number;
  openExceptions: number;
  totalVarianceValue: number;
  pendingReconciliations: number;
  recentExceptions: Exception[];
  redFlags: { type: string; message: string; severity: string }[];
}

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(filters?: { role?: string; status?: string; search?: string }): Promise<User[]>;
  getUserCount(): Promise<number>;
  getSuperAdminCount(): Promise<number>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;

  // Categories
  getCategories(clientId: string): Promise<Category[]>;
  getAllCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  // Departments
  getDepartments(clientId: string): Promise<Department[]>;
  getDepartmentsByCategory(categoryId: string): Promise<Department[]>;
  getAllDepartments(): Promise<Department[]>;
  getDepartment(id: string): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  createDepartmentsBulk(departments: InsertDepartment[]): Promise<Department[]>;
  updateDepartment(id: string, department: Partial<InsertDepartment>): Promise<Department | undefined>;
  deleteDepartment(id: string): Promise<boolean>;
  checkDepartmentUsage(id: string): Promise<boolean>;
  checkDepartmentNameExists(clientId: string, name: string, excludeId?: string): Promise<boolean>;

  // Suppliers
  getSuppliers(clientId: string): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: string): Promise<boolean>;

  // Items
  getItems(clientId: string): Promise<Item[]>;
  getItem(id: string): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: string, item: Partial<InsertItem>): Promise<Item | undefined>;
  deleteItem(id: string): Promise<boolean>;

  // Purchase Lines
  getPurchaseLines(purchaseId: string): Promise<PurchaseLine[]>;
  createPurchaseLine(line: InsertPurchaseLine): Promise<PurchaseLine>;
  deletePurchaseLines(purchaseId: string): Promise<boolean>;

  // Stock Counts
  getStockCounts(departmentId: string, date?: Date): Promise<StockCount[]>;
  getStockCount(id: string): Promise<StockCount | undefined>;
  createStockCount(stockCount: InsertStockCount): Promise<StockCount>;
  updateStockCount(id: string, stockCount: Partial<InsertStockCount>): Promise<StockCount | undefined>;
  deleteStockCount(id: string): Promise<boolean>;

  // Sales
  getSalesEntries(departmentId: string, startDate?: Date, endDate?: Date): Promise<SalesEntry[]>;
  getSalesEntriesByClient(clientId: string, startDate?: Date, endDate?: Date): Promise<SalesEntry[]>;
  getAllSalesEntries(): Promise<SalesEntry[]>;
  getSalesEntry(id: string): Promise<SalesEntry | undefined>;
  createSalesEntry(entry: InsertSalesEntry): Promise<SalesEntry>;
  updateSalesEntry(id: string, entry: Partial<InsertSalesEntry>): Promise<SalesEntry | undefined>;
  deleteSalesEntry(id: string): Promise<boolean>;

  // Purchases
  getPurchases(clientId: string): Promise<Purchase[]>;
  getPurchasesByDepartment(departmentId: string): Promise<Purchase[]>;
  getAllPurchases(): Promise<Purchase[]>;
  getPurchase(id: string): Promise<Purchase | undefined>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  updatePurchase(id: string, purchase: Partial<InsertPurchase>): Promise<Purchase | undefined>;
  deletePurchase(id: string): Promise<boolean>;

  // Stock Movements
  getStockMovements(clientId: string): Promise<StockMovement[]>;
  getStockMovementsByDepartment(departmentId: string): Promise<StockMovement[]>;
  getStockMovement(id: string): Promise<StockMovement | undefined>;
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;
  updateStockMovement(id: string, movement: Partial<InsertStockMovement>): Promise<StockMovement | undefined>;
  deleteStockMovement(id: string): Promise<boolean>;

  // Reconciliations
  getReconciliations(departmentId: string, date?: Date): Promise<Reconciliation[]>;
  getReconciliationsByClient(clientId: string, startDate?: Date, endDate?: Date): Promise<Reconciliation[]>;
  getAllReconciliations(): Promise<Reconciliation[]>;
  getReconciliation(id: string): Promise<Reconciliation | undefined>;
  createReconciliation(reconciliation: InsertReconciliation): Promise<Reconciliation>;
  updateReconciliation(id: string, reconciliation: Partial<InsertReconciliation>): Promise<Reconciliation | undefined>;
  deleteReconciliation(id: string): Promise<boolean>;

  // Exceptions
  getExceptions(filters?: { clientId?: string; departmentId?: string; status?: string; severity?: string }): Promise<Exception[]>;
  getException(id: string): Promise<Exception | undefined>;
  createException(exception: InsertException): Promise<Exception>;
  updateException(id: string, exception: Partial<InsertException>): Promise<Exception | undefined>;
  deleteException(id: string): Promise<boolean>;
  generateExceptionCaseNumber(): Promise<string>;

  // Exception Comments
  getExceptionComments(exceptionId: string): Promise<ExceptionComment[]>;
  createExceptionComment(comment: InsertExceptionComment): Promise<ExceptionComment>;

  // Audit Logs
  getAuditLogs(filters?: { limit?: number; offset?: number; userId?: string; entity?: string; startDate?: Date; endDate?: Date }): Promise<{ logs: AuditLog[]; total: number }>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Admin Activity Logs
  getAdminActivityLogs(filters?: { actorId?: string; targetUserId?: string; actionType?: string; startDate?: Date; endDate?: Date }): Promise<AdminActivityLog[]>;
  createAdminActivityLog(log: InsertAdminActivityLog): Promise<AdminActivityLog>;

  // System Settings
  getSetting(key: string): Promise<any>;
  setSetting(key: string, value: any, updatedBy: string): Promise<void>;

  // Dashboard
  getDashboardSummary(filters?: DashboardFilters): Promise<DashboardSummary>;
  
  // Payment Declarations
  getPaymentDeclaration(clientId: string, departmentId: string, date: Date): Promise<PaymentDeclaration | undefined>;
  getPaymentDeclarationById(id: string): Promise<PaymentDeclaration | undefined>;
  getPaymentDeclarations(departmentId: string, startDate?: Date, endDate?: Date): Promise<PaymentDeclaration[]>;
  createPaymentDeclaration(declaration: InsertPaymentDeclaration): Promise<PaymentDeclaration>;
  updatePaymentDeclaration(id: string, declaration: Partial<InsertPaymentDeclaration>): Promise<PaymentDeclaration | undefined>;
  deletePaymentDeclaration(id: string): Promise<boolean>;
  
  // Sales summary for reconciliation
  getSalesSummaryForDepartment(departmentId: string, date: Date): Promise<{ totalCash: number; totalPos: number; totalTransfer: number; totalSales: number }>;
  getSalesSummaryForClient(clientId: string, date: Date, departmentId?: string): Promise<{ totalAmount: number; totalComplimentary: number; totalVouchers: number; totalVoids: number; totalOthers: number; totalCash: number; totalPos: number; totalTransfer: number; grandTotal: number; entriesCount: number; departmentsCount: number; avgPerEntry: number }>;
  getDepartmentComparison(clientId: string, date: Date): Promise<Array<{ departmentId: string; departmentName: string; totalCaptured: number; totalDeclared: number; auditTotal: number; variance1stHit: number; variance2ndHit: number; finalVariance: number; varianceStatus: "shortage" | "surplus" | "balanced" }>>;

  // User-Client Access
  getUserClientAccess(userId: string, clientId: string): Promise<UserClientAccess | undefined>;
  getUserClientAccessList(userId: string): Promise<UserClientAccess[]>;
  getClientUserAccessList(clientId: string): Promise<UserClientAccess[]>;
  createUserClientAccess(access: InsertUserClientAccess): Promise<UserClientAccess>;
  updateUserClientAccess(id: string, access: Partial<InsertUserClientAccess>): Promise<UserClientAccess | undefined>;
  deleteUserClientAccess(id: string): Promise<boolean>;
  getAssignedClientsForUser(userId: string): Promise<Client[]>;

  // Audit Contexts
  getActiveAuditContext(userId: string): Promise<AuditContext | undefined>;
  getAuditContext(id: string): Promise<AuditContext | undefined>;
  createAuditContext(context: InsertAuditContext): Promise<AuditContext>;
  updateAuditContext(id: string, context: Partial<InsertAuditContext>): Promise<AuditContext | undefined>;
  clearAuditContext(userId: string): Promise<boolean>;

  // Audits
  getAudit(id: string): Promise<Audit | undefined>;
  getAuditByPeriod(clientId: string, departmentId: string, startDate: Date, endDate: Date): Promise<Audit | undefined>;
  getAudits(filters?: { clientId?: string; departmentId?: string; status?: string }): Promise<Audit[]>;
  createAudit(audit: InsertAudit): Promise<Audit>;
  updateAudit(id: string, audit: Partial<InsertAudit>): Promise<Audit | undefined>;
  submitAudit(id: string, submittedBy: string): Promise<Audit | undefined>;
  lockAudit(id: string, lockedBy: string): Promise<Audit | undefined>;

  // Audit Reissue Permissions
  getAuditReissuePermission(auditId: string, userId: string): Promise<AuditReissuePermission | undefined>;
  getAuditReissuePermissions(auditId: string): Promise<AuditReissuePermission[]>;
  createAuditReissuePermission(permission: InsertAuditReissuePermission): Promise<AuditReissuePermission>;
  revokeAuditReissuePermission(id: string): Promise<boolean>;

  // Audit Change Log
  createAuditChangeLog(log: InsertAuditChangeLog): Promise<AuditChangeLog>;
  getAuditChangeLogs(auditId: string): Promise<AuditChangeLog[]>;

  // Store Issues
  getStoreIssues(clientId: string, date?: Date): Promise<StoreIssue[]>;
  getStoreIssue(id: string): Promise<StoreIssue | undefined>;
  getStoreIssuesByDepartment(toDepartmentId: string, date?: Date): Promise<StoreIssue[]>;
  createStoreIssue(issue: InsertStoreIssue): Promise<StoreIssue>;
  updateStoreIssue(id: string, issue: Partial<InsertStoreIssue>): Promise<StoreIssue | undefined>;
  deleteStoreIssue(id: string): Promise<boolean>;

  // Store Issue Lines
  getStoreIssueLines(storeIssueId: string): Promise<StoreIssueLine[]>;
  createStoreIssueLine(line: InsertStoreIssueLine): Promise<StoreIssueLine>;
  createStoreIssueLinesBulk(lines: InsertStoreIssueLine[]): Promise<StoreIssueLine[]>;
  deleteStoreIssueLines(storeIssueId: string): Promise<boolean>;
  getIssuedQtyForDepartment(departmentId: string, itemId: string, date: Date): Promise<number>;

  // Store Stock
  getStoreStock(clientId: string, storeDepartmentId: string, date?: Date): Promise<StoreStock[]>;
  getStoreStockByItem(storeDepartmentId: string, itemId: string, date: Date): Promise<StoreStock | undefined>;
  getPreviousDayClosing(storeDepartmentId: string, itemId: string, date: Date): Promise<string>;
  createStoreStock(stock: InsertStoreStock): Promise<StoreStock>;
  updateStoreStock(id: string, stock: Partial<InsertStoreStock>): Promise<StoreStock | undefined>;
  upsertStoreStock(stock: InsertStoreStock): Promise<StoreStock>;

  // Store Names
  getStoreNames(): Promise<StoreName[]>;
  getStoreName(id: string): Promise<StoreName | undefined>;
  getStoreNameByName(name: string): Promise<StoreName | undefined>;
  createStoreName(storeName: InsertStoreName): Promise<StoreName>;
  updateStoreName(id: string, storeName: Partial<InsertStoreName>): Promise<StoreName | undefined>;
  deleteStoreName(id: string): Promise<boolean>;

  // Inventory Departments
  getInventoryDepartments(clientId: string): Promise<InventoryDepartment[]>;
  getInventoryDepartment(id: string): Promise<InventoryDepartment | undefined>;
  getInventoryDepartmentByType(clientId: string, inventoryType: string): Promise<InventoryDepartment | undefined>;
  getInventoryDepartmentsByTypes(clientId: string, inventoryTypes: string[]): Promise<InventoryDepartment[]>;
  checkInventoryDepartmentDuplicate(clientId: string, storeNameId: string, inventoryType: string, excludeId?: string): Promise<boolean>;
  createInventoryDepartment(dept: InsertInventoryDepartment): Promise<InventoryDepartment>;
  updateInventoryDepartment(id: string, dept: Partial<InsertInventoryDepartment>): Promise<InventoryDepartment | undefined>;
  deleteInventoryDepartment(id: string): Promise<boolean>;
  addPurchaseToStoreStock(clientId: string, storeDepartmentId: string, itemId: string, quantity: number, costPrice: string, date: Date): Promise<StoreStock>;

  // Goods Received Notes (GRN)
  getGoodsReceivedNotes(clientId: string, date?: Date): Promise<GoodsReceivedNote[]>;
  getGoodsReceivedNote(id: string): Promise<GoodsReceivedNote | undefined>;
  getGoodsReceivedNotesByDate(clientId: string, date: Date): Promise<GoodsReceivedNote[]>;
  getDailyGRNTotal(clientId: string, date: Date): Promise<number>;
  createGoodsReceivedNote(grn: InsertGoodsReceivedNote): Promise<GoodsReceivedNote>;
  updateGoodsReceivedNote(id: string, grn: Partial<InsertGoodsReceivedNote>): Promise<GoodsReceivedNote | undefined>;
  deleteGoodsReceivedNote(id: string): Promise<boolean>;

  // Receivables
  getReceivables(clientId: string, filters?: { status?: string; departmentId?: string }): Promise<Receivable[]>;
  getReceivable(id: string): Promise<Receivable | undefined>;
  createReceivable(receivable: InsertReceivable): Promise<Receivable>;
  updateReceivable(id: string, receivable: Partial<InsertReceivable>): Promise<Receivable | undefined>;
  getReceivableHistory(receivableId: string): Promise<ReceivableHistory[]>;
  createReceivableHistory(history: InsertReceivableHistory): Promise<ReceivableHistory>;

  // Surpluses
  getSurpluses(clientId: string, filters?: { status?: string; departmentId?: string }): Promise<Surplus[]>;
  getSurplus(id: string): Promise<Surplus | undefined>;
  createSurplus(surplus: InsertSurplus): Promise<Surplus>;
  updateSurplus(id: string, surplus: Partial<InsertSurplus>): Promise<Surplus | undefined>;
  getSurplusHistory(surplusId: string): Promise<SurplusHistory[]>;
  createSurplusHistory(history: InsertSurplusHistory): Promise<SurplusHistory>;
}

export class DbStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUsers(filters?: { role?: string; status?: string; search?: string }): Promise<User[]> {
    let conditions = [];
    
    if (filters?.role) {
      conditions.push(eq(users.role, filters.role));
    }
    if (filters?.status) {
      conditions.push(eq(users.status, filters.status));
    }
    if (filters?.search) {
      conditions.push(or(
        ilike(users.fullName, `%${filters.search}%`),
        ilike(users.email, `%${filters.search}%`),
        ilike(users.username, `%${filters.search}%`)
      ));
    }

    if (conditions.length > 0) {
      return db.select().from(users).where(and(...conditions)).orderBy(desc(users.createdAt));
    }
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(users);
    return result[0]?.count || 0;
  }

  async getSuperAdminCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(users).where(eq(users.role, "super_admin"));
    return result[0]?.count || 0;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set({ ...updateData, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    await db.delete(users).where(eq(users.id, id));
    return true;
  }

  // Clients
  async getClients(): Promise<Client[]> {
    return db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: string, updateData: Partial<InsertClient>): Promise<Client | undefined> {
    const [client] = await db.update(clients).set(updateData).where(eq(clients.id, id)).returning();
    return client;
  }

  async deleteClient(id: string): Promise<boolean> {
    await db.delete(clients).where(eq(clients.id, id));
    return true;
  }

  // Categories
  async getCategories(clientId: string): Promise<Category[]> {
    return db.select().from(categories).where(eq(categories.clientId, clientId)).orderBy(categories.name);
  }

  async getAllCategories(): Promise<Category[]> {
    return db.select().from(categories).orderBy(categories.name);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(insertCategory).returning();
    return category;
  }

  async updateCategory(id: string, updateData: Partial<InsertCategory>): Promise<Category | undefined> {
    const [category] = await db.update(categories).set(updateData).where(eq(categories.id, id)).returning();
    return category;
  }

  async deleteCategory(id: string): Promise<boolean> {
    // Set categoryId to null for all departments in this category before deleting
    await db.update(departments).set({ categoryId: null }).where(eq(departments.categoryId, id));
    await db.delete(categories).where(eq(categories.id, id));
    return true;
  }

  // Departments
  async getDepartments(clientId: string): Promise<Department[]> {
    return db.select().from(departments).where(eq(departments.clientId, clientId)).orderBy(departments.name);
  }

  async getDepartmentsByCategory(categoryId: string): Promise<Department[]> {
    return db.select().from(departments).where(eq(departments.categoryId, categoryId)).orderBy(departments.name);
  }

  async getAllDepartments(): Promise<Department[]> {
    return db.select().from(departments).orderBy(departments.name);
  }

  async getDepartment(id: string): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department;
  }

  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> {
    const [department] = await db.insert(departments).values(insertDepartment).returning();
    return department;
  }

  async createDepartmentsBulk(insertDepartments: InsertDepartment[]): Promise<Department[]> {
    if (insertDepartments.length === 0) return [];
    return db.insert(departments).values(insertDepartments).returning();
  }

  async updateDepartment(id: string, updateData: Partial<InsertDepartment>): Promise<Department | undefined> {
    const [department] = await db.update(departments).set(updateData).where(eq(departments.id, id)).returning();
    return department;
  }

  async deleteDepartment(id: string): Promise<boolean> {
    await db.delete(departments).where(eq(departments.id, id));
    return true;
  }

  async checkDepartmentUsage(id: string): Promise<boolean> {
    const [salesUsage] = await db.select({ count: count() }).from(salesEntries).where(eq(salesEntries.departmentId, id));
    if ((salesUsage?.count || 0) > 0) return true;
    
    const [stockCountUsage] = await db.select({ count: count() }).from(stockCounts).where(eq(stockCounts.departmentId, id));
    if ((stockCountUsage?.count || 0) > 0) return true;
    
    const [reconUsage] = await db.select({ count: count() }).from(reconciliations).where(eq(reconciliations.departmentId, id));
    if ((reconUsage?.count || 0) > 0) return true;
    
    const [exceptionUsage] = await db.select({ count: count() }).from(exceptions).where(eq(exceptions.departmentId, id));
    if ((exceptionUsage?.count || 0) > 0) return true;

    const [purchaseUsage] = await db.select({ count: count() }).from(purchases).where(eq(purchases.departmentId, id));
    if ((purchaseUsage?.count || 0) > 0) return true;

    const [movementUsage] = await db.select({ count: count() }).from(stockMovements).where(eq(stockMovements.departmentId, id));
    if ((movementUsage?.count || 0) > 0) return true;
    
    return false;
  }

  async checkDepartmentNameExists(clientId: string, name: string, excludeId?: string): Promise<boolean> {
    const conditions = [
      eq(departments.clientId, clientId),
      sql`LOWER(${departments.name}) = LOWER(${name})`
    ];
    
    if (excludeId) {
      conditions.push(sql`${departments.id} != ${excludeId}`);
    }
    
    const [result] = await db.select({ count: count() }).from(departments).where(and(...conditions));
    return (result?.count || 0) > 0;
  }

  // Suppliers
  async getSuppliers(clientId: string): Promise<Supplier[]> {
    return db.select().from(suppliers).where(eq(suppliers.clientId, clientId)).orderBy(desc(suppliers.createdAt));
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier;
  }

  async createSupplier(insertSupplier: InsertSupplier): Promise<Supplier> {
    const [supplier] = await db.insert(suppliers).values(insertSupplier).returning();
    return supplier;
  }

  async updateSupplier(id: string, updateData: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [supplier] = await db.update(suppliers).set(updateData).where(eq(suppliers.id, id)).returning();
    return supplier;
  }

  async deleteSupplier(id: string): Promise<boolean> {
    await db.delete(suppliers).where(eq(suppliers.id, id));
    return true;
  }

  // Items
  async getItems(clientId: string): Promise<Item[]> {
    return db.select().from(items).where(eq(items.clientId, clientId)).orderBy(desc(items.createdAt));
  }

  async getItem(id: string): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item;
  }

  async createItem(insertItem: InsertItem): Promise<Item> {
    const client = await this.getClient(insertItem.clientId);
    if (!client) throw new Error("Client not found");

    const initials = client.name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase();
    
    const categoryPrefix = (insertItem.category || "GEN")
      .substring(0, 3)
      .toUpperCase();

    // Query entire database (including archived/deleted if they existed, though here we just query all items)
    // The requirement says "highest numerical value ever assigned to that specific client"
    const clientItems = await db.select({ sku: items.sku })
      .from(items)
      .where(eq(items.clientId, insertItem.clientId));

    let maxSerial = 0;
    clientItems.forEach(item => {
      if (item.sku) {
        const parts = item.sku.split("-");
        const serialStr = parts[parts.length - 1];
        const serialNum = parseInt(serialStr);
        if (!isNaN(serialNum) && serialNum > maxSerial) {
          maxSerial = serialNum;
        }
      }
    });

    const nextSerial = (maxSerial + 1).toString().padStart(4, "0");
    const generatedSku = `${initials}-${categoryPrefix}-${nextSerial}`;

    const [item] = await db.insert(items).values({
      ...insertItem,
      sku: generatedSku
    }).returning();
    
    // Log the creation for audit trail
    try {
      await this.createAuditLog({
        userId: insertItem.clientId, 
        action: "Created Item",
        entity: "Item",
        entityId: item.id,
        details: `Generated SKU: ${generatedSku}`
      });
    } catch (e) {
      console.error("Failed to create audit log for item creation:", e);
    }

    return item;
  }

  async updateItem(id: string, updateData: Partial<InsertItem>): Promise<Item | undefined> {
    const [item] = await db.update(items).set(updateData).where(eq(items.id, id)).returning();
    return item;
  }

  async deleteItem(id: string): Promise<boolean> {
    await db.delete(items).where(eq(items.id, id));
    return true;
  }

  // Purchase Lines
  async getPurchaseLines(purchaseId: string): Promise<PurchaseLine[]> {
    return db.select().from(purchaseLines).where(eq(purchaseLines.purchaseId, purchaseId));
  }

  async createPurchaseLine(insertLine: InsertPurchaseLine): Promise<PurchaseLine> {
    const [line] = await db.insert(purchaseLines).values(insertLine).returning();
    return line;
  }

  async deletePurchaseLines(purchaseId: string): Promise<boolean> {
    await db.delete(purchaseLines).where(eq(purchaseLines.purchaseId, purchaseId));
    return true;
  }

  // Stock Counts
  async getStockCounts(departmentId: string, date?: Date): Promise<StockCount[]> {
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      return db.select().from(stockCounts).where(
        and(
          eq(stockCounts.departmentId, departmentId),
          gte(stockCounts.date, startOfDay),
          lte(stockCounts.date, endOfDay)
        )
      ).orderBy(desc(stockCounts.createdAt));
    }
    return db.select().from(stockCounts).where(eq(stockCounts.departmentId, departmentId)).orderBy(desc(stockCounts.createdAt));
  }

  async getStockCount(id: string): Promise<StockCount | undefined> {
    const [stockCount] = await db.select().from(stockCounts).where(eq(stockCounts.id, id));
    return stockCount;
  }

  async createStockCount(insertStockCount: InsertStockCount): Promise<StockCount> {
    const [stockCount] = await db.insert(stockCounts).values(insertStockCount).returning();
    return stockCount;
  }

  async updateStockCount(id: string, updateData: Partial<InsertStockCount>): Promise<StockCount | undefined> {
    const [stockCount] = await db.update(stockCounts).set(updateData).where(eq(stockCounts.id, id)).returning();
    return stockCount;
  }

  async deleteStockCount(id: string): Promise<boolean> {
    await db.delete(stockCounts).where(eq(stockCounts.id, id));
    return true;
  }

  // Sales
  async getSalesEntries(departmentId: string, startDate?: Date, endDate?: Date): Promise<SalesEntry[]> {
    if (startDate && endDate) {
      return db.select().from(salesEntries).where(
        and(
          eq(salesEntries.departmentId, departmentId),
          gte(salesEntries.date, startDate),
          lte(salesEntries.date, endDate)
        )
      ).orderBy(desc(salesEntries.date));
    }
    
    return db.select().from(salesEntries).where(eq(salesEntries.departmentId, departmentId)).orderBy(desc(salesEntries.date));
  }

  async getSalesEntriesByClient(clientId: string, startDate?: Date, endDate?: Date): Promise<SalesEntry[]> {
    if (startDate && endDate) {
      return db.select().from(salesEntries).where(
        and(
          eq(salesEntries.clientId, clientId),
          gte(salesEntries.date, startDate),
          lte(salesEntries.date, endDate)
        )
      ).orderBy(desc(salesEntries.date));
    }
    
    return db.select().from(salesEntries).where(eq(salesEntries.clientId, clientId)).orderBy(desc(salesEntries.date));
  }

  async getAllSalesEntries(): Promise<SalesEntry[]> {
    return db.select().from(salesEntries).orderBy(desc(salesEntries.date));
  }

  async getSalesEntry(id: string): Promise<SalesEntry | undefined> {
    const [entry] = await db.select().from(salesEntries).where(eq(salesEntries.id, id));
    return entry;
  }

  async createSalesEntry(insertEntry: InsertSalesEntry): Promise<SalesEntry> {
    const [entry] = await db.insert(salesEntries).values(insertEntry).returning();
    return entry;
  }

  async updateSalesEntry(id: string, updateData: Partial<InsertSalesEntry>): Promise<SalesEntry | undefined> {
    const [entry] = await db.update(salesEntries).set(updateData).where(eq(salesEntries.id, id)).returning();
    return entry;
  }

  async deleteSalesEntry(id: string): Promise<boolean> {
    await db.delete(salesEntries).where(eq(salesEntries.id, id));
    return true;
  }

  // Purchases
  async getPurchases(clientId: string): Promise<Purchase[]> {
    return db.select().from(purchases).where(eq(purchases.clientId, clientId)).orderBy(desc(purchases.createdAt));
  }

  async getPurchasesByDepartment(departmentId: string): Promise<Purchase[]> {
    return db.select().from(purchases).where(eq(purchases.departmentId, departmentId)).orderBy(desc(purchases.createdAt));
  }

  async getAllPurchases(): Promise<Purchase[]> {
    return db.select().from(purchases).orderBy(desc(purchases.createdAt));
  }

  async getPurchase(id: string): Promise<Purchase | undefined> {
    const [purchase] = await db.select().from(purchases).where(eq(purchases.id, id));
    return purchase;
  }

  async createPurchase(insertPurchase: InsertPurchase): Promise<Purchase> {
    const [purchase] = await db.insert(purchases).values(insertPurchase).returning();
    return purchase;
  }

  async updatePurchase(id: string, updateData: Partial<InsertPurchase>): Promise<Purchase | undefined> {
    const [purchase] = await db.update(purchases).set(updateData).where(eq(purchases.id, id)).returning();
    return purchase;
  }

  async deletePurchase(id: string): Promise<boolean> {
    await db.delete(purchases).where(eq(purchases.id, id));
    return true;
  }

  // Stock Movements
  async getStockMovements(clientId: string): Promise<StockMovement[]> {
    return db.select().from(stockMovements).where(eq(stockMovements.clientId, clientId)).orderBy(desc(stockMovements.createdAt));
  }

  async getStockMovementsByDepartment(departmentId: string): Promise<StockMovement[]> {
    return db.select().from(stockMovements).where(eq(stockMovements.departmentId, departmentId)).orderBy(desc(stockMovements.createdAt));
  }

  async createStockMovement(insertMovement: InsertStockMovement): Promise<StockMovement> {
    const [movement] = await db.insert(stockMovements).values(insertMovement).returning();
    return movement;
  }

  async getStockMovement(id: string): Promise<StockMovement | undefined> {
    const [movement] = await db.select().from(stockMovements).where(eq(stockMovements.id, id));
    return movement;
  }

  async updateStockMovement(id: string, updateData: Partial<InsertStockMovement>): Promise<StockMovement | undefined> {
    const [movement] = await db.update(stockMovements).set(updateData).where(eq(stockMovements.id, id)).returning();
    return movement;
  }

  async deleteStockMovement(id: string): Promise<boolean> {
    await db.delete(stockMovements).where(eq(stockMovements.id, id));
    return true;
  }

  // Reconciliations
  async getReconciliations(departmentId: string, date?: Date): Promise<Reconciliation[]> {
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      return db.select().from(reconciliations).where(
        and(
          eq(reconciliations.departmentId, departmentId),
          gte(reconciliations.date, startOfDay),
          lte(reconciliations.date, endOfDay)
        )
      ).orderBy(desc(reconciliations.createdAt));
    }
    return db.select().from(reconciliations).where(eq(reconciliations.departmentId, departmentId)).orderBy(desc(reconciliations.createdAt));
  }

  async getReconciliationsByClient(clientId: string, startDate?: Date, endDate?: Date): Promise<Reconciliation[]> {
    if (startDate && endDate) {
      return db.select().from(reconciliations).where(
        and(
          eq(reconciliations.clientId, clientId),
          gte(reconciliations.date, startDate),
          lte(reconciliations.date, endDate)
        )
      ).orderBy(desc(reconciliations.date));
    }
    return db.select().from(reconciliations).where(eq(reconciliations.clientId, clientId)).orderBy(desc(reconciliations.date));
  }

  async getAllReconciliations(): Promise<Reconciliation[]> {
    return db.select().from(reconciliations).orderBy(desc(reconciliations.createdAt));
  }

  async getReconciliation(id: string): Promise<Reconciliation | undefined> {
    const [reconciliation] = await db.select().from(reconciliations).where(eq(reconciliations.id, id));
    return reconciliation;
  }

  async createReconciliation(insertReconciliation: InsertReconciliation): Promise<Reconciliation> {
    const [reconciliation] = await db.insert(reconciliations).values(insertReconciliation).returning();
    return reconciliation;
  }

  async updateReconciliation(id: string, updateData: Partial<InsertReconciliation>): Promise<Reconciliation | undefined> {
    const [reconciliation] = await db.update(reconciliations).set(updateData).where(eq(reconciliations.id, id)).returning();
    return reconciliation;
  }

  async deleteReconciliation(id: string): Promise<boolean> {
    await db.delete(reconciliations).where(eq(reconciliations.id, id));
    return true;
  }

  // Exceptions
  async getExceptions(filters?: { clientId?: string; departmentId?: string; status?: string; severity?: string }): Promise<Exception[]> {
    const conditions = [];
    
    if (filters?.clientId) {
      conditions.push(eq(exceptions.clientId, filters.clientId));
    }
    if (filters?.departmentId) {
      conditions.push(eq(exceptions.departmentId, filters.departmentId));
    }
    if (filters?.status) {
      conditions.push(eq(exceptions.status, filters.status));
    }
    if (filters?.severity) {
      conditions.push(eq(exceptions.severity, filters.severity));
    }
    
    if (conditions.length > 0) {
      return db.select().from(exceptions).where(and(...conditions)).orderBy(desc(exceptions.createdAt));
    }
    return db.select().from(exceptions).orderBy(desc(exceptions.createdAt));
  }

  async getException(id: string): Promise<Exception | undefined> {
    const [exception] = await db.select().from(exceptions).where(eq(exceptions.id, id));
    return exception;
  }

  async createException(insertException: InsertException): Promise<Exception> {
    const caseNumber = await this.generateExceptionCaseNumber();
    const [exception] = await db.insert(exceptions).values({ ...insertException, caseNumber }).returning();
    return exception;
  }

  async updateException(id: string, updateData: Partial<InsertException>): Promise<Exception | undefined> {
    const [exception] = await db.update(exceptions).set(updateData).where(eq(exceptions.id, id)).returning();
    return exception;
  }

  async deleteException(id: string): Promise<boolean> {
    await db.delete(exceptions).where(eq(exceptions.id, id));
    return true;
  }

  async generateExceptionCaseNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const [result] = await db.select({ count: count() }).from(exceptions);
    const nextNum = (result?.count || 0) + 1;
    return `EXC-${year}-${String(nextNum).padStart(5, "0")}`;
  }

  // Exception Comments
  async getExceptionComments(exceptionId: string): Promise<ExceptionComment[]> {
    return db.select().from(exceptionComments).where(eq(exceptionComments.exceptionId, exceptionId)).orderBy(desc(exceptionComments.createdAt));
  }

  async createExceptionComment(insertComment: InsertExceptionComment): Promise<ExceptionComment> {
    const [comment] = await db.insert(exceptionComments).values(insertComment).returning();
    return comment;
  }

  // Audit Logs
  async getAuditLogs(filters?: { limit?: number; offset?: number; userId?: string; entity?: string; startDate?: Date; endDate?: Date }): Promise<{ logs: AuditLog[]; total: number }> {
    const conditions = [];
    
    if (filters?.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters?.entity) {
      conditions.push(eq(auditLogs.entity, filters.entity));
    }
    if (filters?.startDate) {
      conditions.push(gte(auditLogs.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(auditLogs.createdAt, filters.endDate));
    }
    
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    
    let logs: AuditLog[];
    let totalResult: { count: number }[];
    
    if (conditions.length > 0) {
      logs = await db.select().from(auditLogs).where(and(...conditions)).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);
      totalResult = await db.select({ count: count() }).from(auditLogs).where(and(...conditions));
    } else {
      logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);
      totalResult = await db.select({ count: count() }).from(auditLogs);
    }
    
    return { logs, total: totalResult[0]?.count || 0 };
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(insertLog).returning();
    return log;
  }

  // Admin Activity Logs
  async getAdminActivityLogs(filters?: { actorId?: string; targetUserId?: string; actionType?: string; startDate?: Date; endDate?: Date }): Promise<AdminActivityLog[]> {
    const conditions = [];
    
    if (filters?.actorId) {
      conditions.push(eq(adminActivityLogs.actorId, filters.actorId));
    }
    if (filters?.targetUserId) {
      conditions.push(eq(adminActivityLogs.targetUserId, filters.targetUserId));
    }
    if (filters?.actionType) {
      conditions.push(eq(adminActivityLogs.actionType, filters.actionType));
    }
    if (filters?.startDate) {
      conditions.push(gte(adminActivityLogs.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(adminActivityLogs.createdAt, filters.endDate));
    }
    
    if (conditions.length > 0) {
      return db.select().from(adminActivityLogs).where(and(...conditions)).orderBy(desc(adminActivityLogs.createdAt));
    }
    return db.select().from(adminActivityLogs).orderBy(desc(adminActivityLogs.createdAt));
  }

  async createAdminActivityLog(insertLog: InsertAdminActivityLog): Promise<AdminActivityLog> {
    const [log] = await db.insert(adminActivityLogs).values(insertLog).returning();
    return log;
  }

  // System Settings
  async getSetting(key: string): Promise<any> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting?.value;
  }

  async setSetting(key: string, value: any, updatedBy: string): Promise<void> {
    const existing = await this.getSetting(key);
    if (existing !== undefined) {
      await db.update(systemSettings).set({ value, updatedBy, updatedAt: new Date() }).where(eq(systemSettings.key, key));
    } else {
      await db.insert(systemSettings).values({ key, value, updatedBy });
    }
  }

  // Dashboard
  async getDashboardSummary(filters?: DashboardFilters): Promise<DashboardSummary> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Get total clients
    const [clientsResult] = await db.select({ count: count() }).from(clients);
    const totalClients = clientsResult?.count || 0;

    // Get total departments (with optional filters)
    let deptConditions: any[] = [];
    if (filters?.clientId) {
      deptConditions.push(eq(departments.clientId, filters.clientId));
    }
    const [deptsResult] = deptConditions.length > 0 
      ? await db.select({ count: count() }).from(departments).where(and(...deptConditions))
      : await db.select({ count: count() }).from(departments);
    const totalDepartments = deptsResult?.count || 0;

    // Sales conditions
    let salesConditions: any[] = [
      gte(salesEntries.date, today),
      lte(salesEntries.date, endOfToday)
    ];
    if (filters?.clientId) {
      salesConditions.push(eq(salesEntries.clientId, filters.clientId));
    }
    if (filters?.departmentId) {
      salesConditions.push(eq(salesEntries.departmentId, filters.departmentId));
    }

    // Get total sales today
    const [salesTodayResult] = await db.select({ 
      total: sum(salesEntries.totalSales) 
    }).from(salesEntries).where(and(...salesConditions));
    const totalSalesToday = parseFloat(salesTodayResult?.total || "0");

    // Get all-time sales
    let allSalesConditions: any[] = [];
    if (filters?.clientId) {
      allSalesConditions.push(eq(salesEntries.clientId, filters.clientId));
    }
    if (filters?.departmentId) {
      allSalesConditions.push(eq(salesEntries.departmentId, filters.departmentId));
    }
    const [allSalesResult] = allSalesConditions.length > 0
      ? await db.select({ total: sum(salesEntries.totalSales) }).from(salesEntries).where(and(...allSalesConditions))
      : await db.select({ total: sum(salesEntries.totalSales) }).from(salesEntries);
    const totalSales = parseFloat(allSalesResult?.total || "0");

    // Purchases conditions
    let purchaseConditions: any[] = [
      gte(purchases.invoiceDate, today),
      lte(purchases.invoiceDate, endOfToday)
    ];
    if (filters?.clientId) {
      purchaseConditions.push(eq(purchases.clientId, filters.clientId));
    }
    if (filters?.departmentId) {
      purchaseConditions.push(eq(purchases.departmentId, filters.departmentId));
    }

    // Get total purchases today
    const [purchasesTodayResult] = await db.select({ 
      total: sum(purchases.totalAmount) 
    }).from(purchases).where(and(...purchaseConditions));
    const totalPurchasesToday = parseFloat(purchasesTodayResult?.total || "0");

    // Get all-time purchases
    let allPurchaseConditions: any[] = [];
    if (filters?.clientId) {
      allPurchaseConditions.push(eq(purchases.clientId, filters.clientId));
    }
    if (filters?.departmentId) {
      allPurchaseConditions.push(eq(purchases.departmentId, filters.departmentId));
    }
    const [allPurchasesResult] = allPurchaseConditions.length > 0
      ? await db.select({ total: sum(purchases.totalAmount) }).from(purchases).where(and(...allPurchaseConditions))
      : await db.select({ total: sum(purchases.totalAmount) }).from(purchases);
    const totalPurchases = parseFloat(allPurchasesResult?.total || "0");

    // Exception conditions
    let exceptionConditions: any[] = [];
    if (filters?.clientId) {
      exceptionConditions.push(eq(exceptions.clientId, filters.clientId));
    }
    if (filters?.departmentId) {
      exceptionConditions.push(eq(exceptions.departmentId, filters.departmentId));
    }

    // Get exceptions counts
    const [exceptionsResult] = exceptionConditions.length > 0
      ? await db.select({ count: count() }).from(exceptions).where(and(...exceptionConditions))
      : await db.select({ count: count() }).from(exceptions);
    const totalExceptions = exceptionsResult?.count || 0;

    const openConditions = [...exceptionConditions, eq(exceptions.status, "open")];
    const [openExceptionsResult] = await db.select({ count: count() }).from(exceptions).where(and(...openConditions));
    const openExceptions = openExceptionsResult?.count || 0;

    // Reconciliation conditions
    let reconConditions: any[] = [];
    if (filters?.clientId) {
      reconConditions.push(eq(reconciliations.clientId, filters.clientId));
    }
    if (filters?.departmentId) {
      reconConditions.push(eq(reconciliations.departmentId, filters.departmentId));
    }

    // Get variance value
    const [varianceResult] = reconConditions.length > 0
      ? await db.select({ total: sum(reconciliations.varianceValue) }).from(reconciliations).where(and(...reconConditions))
      : await db.select({ total: sum(reconciliations.varianceValue) }).from(reconciliations);
    const totalVarianceValue = parseFloat(varianceResult?.total || "0");

    // Get pending reconciliations
    const pendingConditions = [...reconConditions, eq(reconciliations.status, "pending")];
    const [pendingResult] = await db.select({ count: count() }).from(reconciliations).where(and(...pendingConditions));
    const pendingReconciliations = pendingResult?.count || 0;

    // Get recent exceptions
    const recentExceptions = exceptionConditions.length > 0
      ? await db.select().from(exceptions).where(and(...exceptionConditions)).orderBy(desc(exceptions.createdAt)).limit(5)
      : await db.select().from(exceptions).orderBy(desc(exceptions.createdAt)).limit(5);

    // Generate red flags based on data
    const redFlags: { type: string; message: string; severity: string }[] = [];
    
    if (openExceptions > 5) {
      redFlags.push({
        type: "exceptions",
        message: `${openExceptions} open exceptions require attention`,
        severity: "high"
      });
    }
    
    if (pendingReconciliations > 0) {
      redFlags.push({
        type: "reconciliation",
        message: `${pendingReconciliations} reconciliations pending review`,
        severity: "medium"
      });
    }

    if (Math.abs(totalVarianceValue) > 10000) {
      redFlags.push({
        type: "variance",
        message: `High variance detected: ₦${Math.abs(totalVarianceValue).toLocaleString()}`,
        severity: "high"
      });
    }

    return {
      totalClients,
      totalDepartments,
      totalSalesToday,
      totalPurchasesToday,
      totalSales,
      totalPurchases,
      totalExceptions,
      openExceptions,
      totalVarianceValue,
      pendingReconciliations,
      recentExceptions,
      redFlags
    };
  }

  // Payment Declarations
  async getPaymentDeclaration(clientId: string, departmentId: string, date: Date): Promise<PaymentDeclaration | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const [declaration] = await db.select().from(paymentDeclarations).where(
      and(
        eq(paymentDeclarations.clientId, clientId),
        eq(paymentDeclarations.departmentId, departmentId),
        gte(paymentDeclarations.date, startOfDay),
        lte(paymentDeclarations.date, endOfDay)
      )
    );
    return declaration;
  }

  async getPaymentDeclarationById(id: string): Promise<PaymentDeclaration | undefined> {
    const [declaration] = await db.select().from(paymentDeclarations).where(eq(paymentDeclarations.id, id));
    return declaration;
  }

  async getPaymentDeclarations(departmentId: string, startDate?: Date, endDate?: Date): Promise<PaymentDeclaration[]> {
    if (startDate && endDate) {
      return db.select().from(paymentDeclarations).where(
        and(
          eq(paymentDeclarations.departmentId, departmentId),
          gte(paymentDeclarations.date, startDate),
          lte(paymentDeclarations.date, endDate)
        )
      ).orderBy(desc(paymentDeclarations.date));
    }
    return db.select().from(paymentDeclarations).where(eq(paymentDeclarations.departmentId, departmentId)).orderBy(desc(paymentDeclarations.date));
  }

  async createPaymentDeclaration(insertDeclaration: InsertPaymentDeclaration): Promise<PaymentDeclaration> {
    // Calculate total
    const total = (parseFloat(insertDeclaration.reportedCash || "0") +
                  parseFloat(insertDeclaration.reportedPosSettlement || "0") +
                  parseFloat(insertDeclaration.reportedTransfers || "0")).toString();
    
    const [declaration] = await db.insert(paymentDeclarations).values({
      ...insertDeclaration,
      totalReported: total
    }).returning();
    return declaration;
  }

  async updatePaymentDeclaration(id: string, updateData: Partial<InsertPaymentDeclaration>): Promise<PaymentDeclaration | undefined> {
    // Recalculate total if any amount field is updated
    const existing = await this.getPaymentDeclarationById(id);
    if (!existing) return undefined;

    const cash = updateData.reportedCash !== undefined ? updateData.reportedCash : existing.reportedCash;
    const pos = updateData.reportedPosSettlement !== undefined ? updateData.reportedPosSettlement : existing.reportedPosSettlement;
    const transfers = updateData.reportedTransfers !== undefined ? updateData.reportedTransfers : existing.reportedTransfers;
    
    const total = (parseFloat(cash || "0") + parseFloat(pos || "0") + parseFloat(transfers || "0")).toString();

    const [declaration] = await db.update(paymentDeclarations).set({
      ...updateData,
      totalReported: total,
      updatedAt: new Date()
    }).where(eq(paymentDeclarations.id, id)).returning();
    return declaration;
  }

  async deletePaymentDeclaration(id: string): Promise<boolean> {
    await db.delete(paymentDeclarations).where(eq(paymentDeclarations.id, id));
    return true;
  }

  // Sales summary for reconciliation
  async getSalesSummaryForDepartment(departmentId: string, date: Date): Promise<{ totalCash: number; totalPos: number; totalTransfer: number; totalSales: number }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const [result] = await db.select({
      totalCash: sum(salesEntries.cashAmount),
      totalPos: sum(salesEntries.posAmount),
      totalTransfer: sum(salesEntries.transferAmount),
      totalSales: sum(salesEntries.totalSales)
    }).from(salesEntries).where(
      and(
        eq(salesEntries.departmentId, departmentId),
        gte(salesEntries.date, startOfDay),
        lte(salesEntries.date, endOfDay)
      )
    );
    
    return {
      totalCash: parseFloat(result?.totalCash || "0"),
      totalPos: parseFloat(result?.totalPos || "0"),
      totalTransfer: parseFloat(result?.totalTransfer || "0"),
      totalSales: parseFloat(result?.totalSales || "0")
    };
  }

  async getSalesSummaryForClient(clientId: string, date: Date, departmentId?: string): Promise<{ totalAmount: number; totalComplimentary: number; totalVouchers: number; totalVoids: number; totalOthers: number; totalCash: number; totalPos: number; totalTransfer: number; grandTotal: number; entriesCount: number; departmentsCount: number; avgPerEntry: number }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const conditions = [
      eq(salesEntries.clientId, clientId),
      gte(salesEntries.date, startOfDay),
      lte(salesEntries.date, endOfDay)
    ];

    if (departmentId) {
      conditions.push(eq(salesEntries.departmentId, departmentId));
    }

    const [result] = await db.select({
      totalAmount: sum(salesEntries.amount),
      totalComplimentary: sum(salesEntries.complimentaryAmount),
      totalVouchers: sum(salesEntries.vouchersAmount),
      totalVoids: sum(salesEntries.voidsAmount),
      totalOthers: sum(salesEntries.othersAmount),
      totalCash: sum(salesEntries.cashAmount),
      totalPos: sum(salesEntries.posAmount),
      totalTransfer: sum(salesEntries.transferAmount),
      grandTotal: sum(salesEntries.totalSales),
      entriesCount: count(salesEntries.id),
      departmentsCount: countDistinct(salesEntries.departmentId)
    }).from(salesEntries).where(and(...conditions));
    
    const entriesCount = parseInt(result?.entriesCount?.toString() || "0");
    const grandTotal = parseFloat(result?.grandTotal || "0");
    
    return {
      totalAmount: parseFloat(result?.totalAmount || "0"),
      totalComplimentary: parseFloat(result?.totalComplimentary || "0"),
      totalVouchers: parseFloat(result?.totalVouchers || "0"),
      totalVoids: parseFloat(result?.totalVoids || "0"),
      totalOthers: parseFloat(result?.totalOthers || "0"),
      totalCash: parseFloat(result?.totalCash || "0"),
      totalPos: parseFloat(result?.totalPos || "0"),
      totalTransfer: parseFloat(result?.totalTransfer || "0"),
      grandTotal,
      entriesCount,
      departmentsCount: parseInt(result?.departmentsCount?.toString() || "0"),
      avgPerEntry: entriesCount > 0 ? grandTotal / entriesCount : 0
    };
  }

  async getDepartmentComparison(clientId: string, date: Date): Promise<Array<{
    departmentId: string;
    departmentName: string;
    totalCaptured: number;
    totalDeclared: number;
    auditTotal: number;
    variance1stHit: number;
    variance2ndHit: number;
    finalVariance: number;
    varianceStatus: "shortage" | "surplus" | "balanced";
  }>> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const clientDepts = await db.select().from(departments).where(eq(departments.clientId, clientId));

    const results = await Promise.all(clientDepts.map(async (dept) => {
      const [salesResult] = await db.select({
        totalSales: sum(salesEntries.totalSales)
      }).from(salesEntries).where(
        and(
          eq(salesEntries.departmentId, dept.id),
          gte(salesEntries.date, startOfDay),
          lte(salesEntries.date, endOfDay)
        )
      );
      const totalCaptured = parseFloat(salesResult?.totalSales || "0");

      const [declaredResult] = await db.select({
        totalReported: sum(paymentDeclarations.totalReported)
      }).from(paymentDeclarations).where(
        and(
          eq(paymentDeclarations.departmentId, dept.id),
          gte(paymentDeclarations.date, startOfDay),
          lte(paymentDeclarations.date, endOfDay)
        )
      );
      const totalDeclared = parseFloat(declaredResult?.totalReported || "0");

      // Get auditTotal from SRD Department Store ledger
      // Find the inventory department linked to this department with DEPARTMENT_STORE type
      const [invDept] = await db.select().from(inventoryDepartments).where(
        and(
          eq(inventoryDepartments.clientId, clientId),
          eq(inventoryDepartments.inventoryType, "DEPARTMENT_STORE"),
          eq(inventoryDepartments.departmentId, dept.id)
        )
      );

      let auditTotal = 0;
      if (invDept) {
        // Get store stock records for this inventory department on the selected date
        const storeStockRecords = await db.select({
          openingQty: storeStock.openingQty,
          addedQty: storeStock.addedQty,
          physicalClosingQty: storeStock.physicalClosingQty,
          itemId: storeStock.itemId
        }).from(storeStock).where(
          and(
            eq(storeStock.storeDepartmentId, invDept.id),
            gte(storeStock.date, startOfDay),
            lte(storeStock.date, endOfDay)
          )
        );

        // Calculate Amount Sold = (Opening + Added - Closing) × Selling Price for each item
        for (const record of storeStockRecords) {
          if (record.physicalClosingQty !== null) {
            const opening = parseFloat(record.openingQty || "0");
            const added = parseFloat(record.addedQty || "0");
            const closing = parseFloat(record.physicalClosingQty || "0");
            const sold = (opening + added) - closing;
            
            // Get the item's selling price
            const [item] = await db.select({ sellingPrice: items.sellingPrice })
              .from(items).where(eq(items.id, record.itemId));
            const sellingPrice = parseFloat(item?.sellingPrice || "0");
            
            auditTotal += sold * sellingPrice;
          }
        }
      }

      const variance1stHit = totalDeclared - totalCaptured;
      const variance2ndHit = auditTotal - totalCaptured;
      const finalVariance = totalDeclared - auditTotal;

      let varianceStatus: "shortage" | "surplus" | "balanced" = "balanced";
      if (finalVariance < -0.01) {
        varianceStatus = "shortage";
      } else if (finalVariance > 0.01) {
        varianceStatus = "surplus";
      }

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        totalCaptured,
        totalDeclared,
        auditTotal,
        variance1stHit,
        variance2ndHit,
        finalVariance,
        varianceStatus
      };
    }));

    return results;
  }

  // User-Client Access
  async getUserClientAccess(userId: string, clientId: string): Promise<UserClientAccess | undefined> {
    const [access] = await db.select().from(userClientAccess).where(
      and(
        eq(userClientAccess.userId, userId),
        eq(userClientAccess.clientId, clientId)
      )
    );
    return access;
  }

  async getUserClientAccessList(userId: string): Promise<UserClientAccess[]> {
    return db.select().from(userClientAccess).where(eq(userClientAccess.userId, userId));
  }

  async getClientUserAccessList(clientId: string): Promise<UserClientAccess[]> {
    return db.select().from(userClientAccess).where(eq(userClientAccess.clientId, clientId));
  }

  async createUserClientAccess(insertAccess: InsertUserClientAccess): Promise<UserClientAccess> {
    const [access] = await db.insert(userClientAccess).values(insertAccess).returning();
    return access;
  }

  async updateUserClientAccess(id: string, updateData: Partial<InsertUserClientAccess>): Promise<UserClientAccess | undefined> {
    const [access] = await db.update(userClientAccess).set({
      ...updateData,
      updatedAt: new Date()
    }).where(eq(userClientAccess.id, id)).returning();
    return access;
  }

  async deleteUserClientAccess(id: string): Promise<boolean> {
    await db.delete(userClientAccess).where(eq(userClientAccess.id, id));
    return true;
  }

  async getAssignedClientsForUser(userId: string): Promise<Client[]> {
    const accessRecords = await db.select().from(userClientAccess).where(
      and(
        eq(userClientAccess.userId, userId),
        eq(userClientAccess.status, "assigned")
      )
    );
    
    if (accessRecords.length === 0) return [];
    
    const clientIds = accessRecords.map(a => a.clientId);
    return db.select().from(clients).where(
      sql`${clients.id} IN (${sql.join(clientIds.map(id => sql`${id}`), sql`, `)})`
    );
  }

  // Audit Contexts
  async getActiveAuditContext(userId: string): Promise<AuditContext | undefined> {
    const [context] = await db.select().from(auditContexts).where(
      and(
        eq(auditContexts.userId, userId),
        eq(auditContexts.status, "active")
      )
    ).orderBy(desc(auditContexts.createdAt)).limit(1);
    return context;
  }

  async getAuditContext(id: string): Promise<AuditContext | undefined> {
    const [context] = await db.select().from(auditContexts).where(eq(auditContexts.id, id));
    return context;
  }

  async createAuditContext(insertContext: InsertAuditContext): Promise<AuditContext> {
    await db.update(auditContexts).set({ status: "cleared" }).where(
      and(
        eq(auditContexts.userId, insertContext.userId),
        eq(auditContexts.status, "active")
      )
    );
    const [context] = await db.insert(auditContexts).values(insertContext).returning();
    return context;
  }

  async updateAuditContext(id: string, updateData: Partial<InsertAuditContext>): Promise<AuditContext | undefined> {
    const [context] = await db.update(auditContexts).set({
      ...updateData,
      lastActiveAt: new Date()
    }).where(eq(auditContexts.id, id)).returning();
    return context;
  }

  async clearAuditContext(userId: string): Promise<boolean> {
    await db.update(auditContexts).set({ status: "cleared" }).where(
      and(
        eq(auditContexts.userId, userId),
        eq(auditContexts.status, "active")
      )
    );
    return true;
  }

  // Audits
  async getAudit(id: string): Promise<Audit | undefined> {
    const [audit] = await db.select().from(audits).where(eq(audits.id, id));
    return audit;
  }

  async getAuditByPeriod(clientId: string, departmentId: string, startDate: Date, endDate: Date): Promise<Audit | undefined> {
    const [audit] = await db.select().from(audits).where(
      and(
        eq(audits.clientId, clientId),
        eq(audits.departmentId, departmentId),
        eq(audits.startDate, startDate),
        eq(audits.endDate, endDate)
      )
    );
    return audit;
  }

  async getAudits(filters?: { clientId?: string; departmentId?: string; status?: string }): Promise<Audit[]> {
    let conditions = [];
    if (filters?.clientId) conditions.push(eq(audits.clientId, filters.clientId));
    if (filters?.departmentId) conditions.push(eq(audits.departmentId, filters.departmentId));
    if (filters?.status) conditions.push(eq(audits.status, filters.status));
    
    if (conditions.length > 0) {
      return db.select().from(audits).where(and(...conditions)).orderBy(desc(audits.createdAt));
    }
    return db.select().from(audits).orderBy(desc(audits.createdAt));
  }

  async createAudit(insertAudit: InsertAudit): Promise<Audit> {
    const [audit] = await db.insert(audits).values(insertAudit).returning();
    return audit;
  }

  async updateAudit(id: string, updateData: Partial<InsertAudit>): Promise<Audit | undefined> {
    const [audit] = await db.update(audits).set({
      ...updateData,
      updatedAt: new Date()
    }).where(eq(audits.id, id)).returning();
    return audit;
  }

  async submitAudit(id: string, submittedBy: string): Promise<Audit | undefined> {
    const [audit] = await db.update(audits).set({
      status: "submitted",
      submittedBy,
      submittedAt: new Date(),
      updatedAt: new Date()
    }).where(eq(audits.id, id)).returning();
    return audit;
  }

  async lockAudit(id: string, lockedBy: string): Promise<Audit | undefined> {
    const [audit] = await db.update(audits).set({
      status: "locked",
      lockedBy,
      lockedAt: new Date(),
      updatedAt: new Date()
    }).where(eq(audits.id, id)).returning();
    return audit;
  }

  // Audit Reissue Permissions
  async getAuditReissuePermission(auditId: string, userId: string): Promise<AuditReissuePermission | undefined> {
    const now = new Date();
    const [permission] = await db.select().from(auditReissuePermissions).where(
      and(
        eq(auditReissuePermissions.auditId, auditId),
        eq(auditReissuePermissions.grantedTo, userId),
        eq(auditReissuePermissions.active, true),
        or(
          sql`${auditReissuePermissions.expiresAt} IS NULL`,
          gte(auditReissuePermissions.expiresAt, now)
        )
      )
    );
    return permission;
  }

  async getAuditReissuePermissions(auditId: string): Promise<AuditReissuePermission[]> {
    return db.select().from(auditReissuePermissions).where(eq(auditReissuePermissions.auditId, auditId));
  }

  async createAuditReissuePermission(insertPermission: InsertAuditReissuePermission): Promise<AuditReissuePermission> {
    const [permission] = await db.insert(auditReissuePermissions).values(insertPermission).returning();
    return permission;
  }

  async revokeAuditReissuePermission(id: string): Promise<boolean> {
    await db.update(auditReissuePermissions).set({ active: false }).where(eq(auditReissuePermissions.id, id));
    return true;
  }

  // Audit Change Log
  async createAuditChangeLog(insertLog: InsertAuditChangeLog): Promise<AuditChangeLog> {
    const [log] = await db.insert(auditChangeLog).values(insertLog).returning();
    return log;
  }

  async getAuditChangeLogs(auditId: string): Promise<AuditChangeLog[]> {
    return db.select().from(auditChangeLog).where(eq(auditChangeLog.auditId, auditId)).orderBy(desc(auditChangeLog.createdAt));
  }

  // Store Issues
  async getStoreIssues(clientId: string, date?: Date): Promise<StoreIssue[]> {
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      return db.select().from(storeIssues).where(
        and(
          eq(storeIssues.clientId, clientId),
          gte(storeIssues.issueDate, startOfDay),
          lte(storeIssues.issueDate, endOfDay)
        )
      ).orderBy(desc(storeIssues.createdAt));
    }
    return db.select().from(storeIssues).where(eq(storeIssues.clientId, clientId)).orderBy(desc(storeIssues.createdAt));
  }

  async getStoreIssue(id: string): Promise<StoreIssue | undefined> {
    const [issue] = await db.select().from(storeIssues).where(eq(storeIssues.id, id));
    return issue;
  }

  async getStoreIssuesByDepartment(toDepartmentId: string, date?: Date): Promise<StoreIssue[]> {
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      return db.select().from(storeIssues).where(
        and(
          eq(storeIssues.toDepartmentId, toDepartmentId),
          gte(storeIssues.issueDate, startOfDay),
          lte(storeIssues.issueDate, endOfDay)
        )
      ).orderBy(desc(storeIssues.createdAt));
    }
    return db.select().from(storeIssues).where(eq(storeIssues.toDepartmentId, toDepartmentId)).orderBy(desc(storeIssues.createdAt));
  }

  async createStoreIssue(insertIssue: InsertStoreIssue): Promise<StoreIssue> {
    const [issue] = await db.insert(storeIssues).values(insertIssue).returning();
    return issue;
  }

  async updateStoreIssue(id: string, updateData: Partial<InsertStoreIssue>): Promise<StoreIssue | undefined> {
    const [issue] = await db.update(storeIssues).set(updateData).where(eq(storeIssues.id, id)).returning();
    return issue;
  }

  async deleteStoreIssue(id: string): Promise<boolean> {
    await db.delete(storeIssueLines).where(eq(storeIssueLines.storeIssueId, id));
    await db.delete(storeIssues).where(eq(storeIssues.id, id));
    return true;
  }

  // Store Issue Lines
  async getStoreIssueLines(storeIssueId: string): Promise<StoreIssueLine[]> {
    return db.select().from(storeIssueLines).where(eq(storeIssueLines.storeIssueId, storeIssueId));
  }

  async createStoreIssueLine(insertLine: InsertStoreIssueLine): Promise<StoreIssueLine> {
    const [line] = await db.insert(storeIssueLines).values(insertLine).returning();
    return line;
  }

  async createStoreIssueLinesBulk(insertLines: InsertStoreIssueLine[]): Promise<StoreIssueLine[]> {
    if (insertLines.length === 0) return [];
    return db.insert(storeIssueLines).values(insertLines).returning();
  }

  async deleteStoreIssueLines(storeIssueId: string): Promise<boolean> {
    await db.delete(storeIssueLines).where(eq(storeIssueLines.storeIssueId, storeIssueId));
    return true;
  }

  async getIssuedQtyForDepartment(departmentId: string, itemId: string, date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await db
      .select({ totalQty: sum(storeIssueLines.qtyIssued) })
      .from(storeIssueLines)
      .innerJoin(storeIssues, eq(storeIssueLines.storeIssueId, storeIssues.id))
      .where(
        and(
          eq(storeIssues.toDepartmentId, departmentId),
          eq(storeIssueLines.itemId, itemId),
          gte(storeIssues.issueDate, startOfDay),
          lte(storeIssues.issueDate, endOfDay),
          eq(storeIssues.status, "posted")
        )
      );
    
    return parseFloat(result[0]?.totalQty || "0");
  }

  // Store Stock
  async getStoreStock(clientId: string, storeDepartmentId: string, date?: Date): Promise<StoreStock[]> {
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      return db.select().from(storeStock).where(
        and(
          eq(storeStock.clientId, clientId),
          eq(storeStock.storeDepartmentId, storeDepartmentId),
          gte(storeStock.date, startOfDay),
          lte(storeStock.date, endOfDay)
        )
      );
    }
    return db.select().from(storeStock).where(
      and(
        eq(storeStock.clientId, clientId),
        eq(storeStock.storeDepartmentId, storeDepartmentId)
      )
    );
  }

  async getStoreStockByItem(storeDepartmentId: string, itemId: string, date: Date): Promise<StoreStock | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const [stock] = await db.select().from(storeStock).where(
      and(
        eq(storeStock.storeDepartmentId, storeDepartmentId),
        eq(storeStock.itemId, itemId),
        gte(storeStock.date, startOfDay),
        lte(storeStock.date, endOfDay)
      )
    );
    return stock;
  }

  async getPreviousDayClosing(storeDepartmentId: string, itemId: string, date: Date): Promise<string> {
    const previousDay = new Date(date);
    previousDay.setDate(previousDay.getDate() - 1);
    const startOfPrevDay = new Date(previousDay);
    startOfPrevDay.setHours(0, 0, 0, 0);
    const endOfPrevDay = new Date(previousDay);
    endOfPrevDay.setHours(23, 59, 59, 999);
    
    const [prevStock] = await db.select().from(storeStock).where(
      and(
        eq(storeStock.storeDepartmentId, storeDepartmentId),
        eq(storeStock.itemId, itemId),
        gte(storeStock.date, startOfPrevDay),
        lte(storeStock.date, endOfPrevDay)
      )
    ).orderBy(desc(storeStock.updatedAt)).limit(1);
    
    if (prevStock) {
      return prevStock.physicalClosingQty !== null && prevStock.physicalClosingQty !== undefined
        ? prevStock.physicalClosingQty
        : prevStock.closingQty || "0";
    }
    return "0";
  }

  async createStoreStock(insertStock: InsertStoreStock): Promise<StoreStock> {
    const [stock] = await db.insert(storeStock).values(insertStock).returning();
    return stock;
  }

  async updateStoreStock(id: string, updateData: Partial<InsertStoreStock>): Promise<StoreStock | undefined> {
    const [stock] = await db.update(storeStock).set({
      ...updateData,
      updatedAt: new Date()
    }).where(eq(storeStock.id, id)).returning();
    return stock;
  }

  async upsertStoreStock(insertStock: InsertStoreStock): Promise<StoreStock> {
    const existing = await this.getStoreStockByItem(
      insertStock.storeDepartmentId,
      insertStock.itemId,
      insertStock.date
    );
    
    if (existing) {
      const [updated] = await db.update(storeStock).set({
        openingQty: insertStock.openingQty,
        addedQty: insertStock.addedQty,
        issuedQty: insertStock.issuedQty,
        closingQty: insertStock.closingQty,
        physicalClosingQty: insertStock.physicalClosingQty,
        varianceQty: insertStock.varianceQty,
        costPriceSnapshot: insertStock.costPriceSnapshot,
        updatedAt: new Date()
      }).where(eq(storeStock.id, existing.id)).returning();
      return updated;
    }
    
    return this.createStoreStock(insertStock);
  }

  // Store Names
  async getStoreNames(): Promise<StoreName[]> {
    return db.select().from(storeNames).orderBy(storeNames.name);
  }

  async getStoreName(id: string): Promise<StoreName | undefined> {
    const [storeName] = await db.select().from(storeNames).where(eq(storeNames.id, id));
    return storeName;
  }

  async getStoreNameByName(name: string): Promise<StoreName | undefined> {
    const [storeName] = await db.select().from(storeNames).where(eq(storeNames.name, name));
    return storeName;
  }

  async createStoreName(insertStoreName: InsertStoreName): Promise<StoreName> {
    const [storeName] = await db.insert(storeNames).values(insertStoreName).returning();
    return storeName;
  }

  async updateStoreName(id: string, updateData: Partial<InsertStoreName>): Promise<StoreName | undefined> {
    const [storeName] = await db.update(storeNames).set(updateData).where(eq(storeNames.id, id)).returning();
    return storeName;
  }

  async deleteStoreName(id: string): Promise<boolean> {
    await db.delete(storeNames).where(eq(storeNames.id, id));
    return true;
  }

  // Inventory Departments
  async getInventoryDepartments(clientId: string): Promise<InventoryDepartment[]> {
    return db.select().from(inventoryDepartments).where(eq(inventoryDepartments.clientId, clientId));
  }

  async getInventoryDepartment(id: string): Promise<InventoryDepartment | undefined> {
    const [dept] = await db.select().from(inventoryDepartments).where(eq(inventoryDepartments.id, id));
    return dept;
  }

  async getInventoryDepartmentByType(clientId: string, inventoryType: string): Promise<InventoryDepartment | undefined> {
    const [dept] = await db.select().from(inventoryDepartments).where(
      and(
        eq(inventoryDepartments.clientId, clientId),
        eq(inventoryDepartments.inventoryType, inventoryType)
      )
    );
    return dept;
  }

  async checkInventoryDepartmentDuplicate(clientId: string, storeNameId: string, inventoryType: string, excludeId?: string): Promise<boolean> {
    let conditions = [
      eq(inventoryDepartments.clientId, clientId),
      eq(inventoryDepartments.storeNameId, storeNameId),
      eq(inventoryDepartments.inventoryType, inventoryType)
    ];
    
    if (excludeId) {
      const result = await db.select().from(inventoryDepartments).where(
        and(...conditions, sql`${inventoryDepartments.id} != ${excludeId}`)
      );
      return result.length > 0;
    }
    
    const result = await db.select().from(inventoryDepartments).where(and(...conditions));
    return result.length > 0;
  }

  async createInventoryDepartment(insertDept: InsertInventoryDepartment): Promise<InventoryDepartment> {
    const [dept] = await db.insert(inventoryDepartments).values(insertDept).returning();
    return dept;
  }

  async updateInventoryDepartment(id: string, updateData: Partial<InsertInventoryDepartment>): Promise<InventoryDepartment | undefined> {
    const [dept] = await db.update(inventoryDepartments).set(updateData).where(eq(inventoryDepartments.id, id)).returning();
    return dept;
  }

  async deleteInventoryDepartment(id: string): Promise<boolean> {
    await db.delete(inventoryDepartments).where(eq(inventoryDepartments.id, id));
    return true;
  }

  async getInventoryDepartmentsByTypes(clientId: string, inventoryTypes: string[]): Promise<InventoryDepartment[]> {
    if (inventoryTypes.length === 0) return [];
    
    const typeConditions = inventoryTypes.map(t => eq(inventoryDepartments.inventoryType, t));
    return db.select().from(inventoryDepartments).where(
      and(
        eq(inventoryDepartments.clientId, clientId),
        or(...typeConditions)
      )
    );
  }

  async addPurchaseToStoreStock(clientId: string, storeDepartmentId: string, itemId: string, quantity: number, costPrice: string, date: Date): Promise<StoreStock> {
    const existing = await this.getStoreStockByItem(storeDepartmentId, itemId, date);
    
    if (existing) {
      const currentAddedQty = parseFloat(existing.addedQty || "0");
      const newAddedQty = (currentAddedQty + quantity).toString();
      const currentClosing = parseFloat(existing.closingQty || "0");
      const newClosing = (currentClosing + quantity).toString();
      
      const [updated] = await db.update(storeStock).set({
        addedQty: newAddedQty,
        closingQty: newClosing,
        costPriceSnapshot: costPrice,
        updatedAt: new Date()
      }).where(eq(storeStock.id, existing.id)).returning();
      return updated;
    }
    
    return this.createStoreStock({
      clientId,
      storeDepartmentId,
      itemId,
      date,
      openingQty: "0",
      addedQty: quantity.toString(),
      issuedQty: "0",
      closingQty: quantity.toString(),
      physicalClosingQty: null,
      varianceQty: null,
      costPriceSnapshot: costPrice
    });
  }

  // Goods Received Notes (GRN)
  async getGoodsReceivedNotes(clientId: string, date?: Date): Promise<GoodsReceivedNote[]> {
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      return db.select().from(goodsReceivedNotes)
        .where(and(
          eq(goodsReceivedNotes.clientId, clientId),
          gte(goodsReceivedNotes.date, startOfDay),
          lte(goodsReceivedNotes.date, endOfDay)
        ))
        .orderBy(desc(goodsReceivedNotes.date));
    }
    return db.select().from(goodsReceivedNotes)
      .where(eq(goodsReceivedNotes.clientId, clientId))
      .orderBy(desc(goodsReceivedNotes.date));
  }

  async getGoodsReceivedNote(id: string): Promise<GoodsReceivedNote | undefined> {
    const [grn] = await db.select().from(goodsReceivedNotes).where(eq(goodsReceivedNotes.id, id));
    return grn;
  }

  async getGoodsReceivedNotesByDate(clientId: string, date: Date): Promise<GoodsReceivedNote[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return db.select().from(goodsReceivedNotes)
      .where(and(
        eq(goodsReceivedNotes.clientId, clientId),
        gte(goodsReceivedNotes.date, startOfDay),
        lte(goodsReceivedNotes.date, endOfDay)
      ))
      .orderBy(desc(goodsReceivedNotes.createdAt));
  }

  async getDailyGRNTotal(clientId: string, date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const result = await db.select({ total: sum(goodsReceivedNotes.amount) })
      .from(goodsReceivedNotes)
      .where(and(
        eq(goodsReceivedNotes.clientId, clientId),
        gte(goodsReceivedNotes.date, startOfDay),
        lte(goodsReceivedNotes.date, endOfDay)
      ));
    return parseFloat(result[0]?.total || "0");
  }

  async createGoodsReceivedNote(insertGrn: InsertGoodsReceivedNote): Promise<GoodsReceivedNote> {
    const [grn] = await db.insert(goodsReceivedNotes).values(insertGrn).returning();
    return grn;
  }

  async updateGoodsReceivedNote(id: string, updateData: Partial<InsertGoodsReceivedNote>): Promise<GoodsReceivedNote | undefined> {
    const [grn] = await db.update(goodsReceivedNotes)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(goodsReceivedNotes.id, id))
      .returning();
    return grn;
  }

  async deleteGoodsReceivedNote(id: string): Promise<boolean> {
    await db.delete(goodsReceivedNotes).where(eq(goodsReceivedNotes.id, id));
    return true;
  }

  // Receivables
  async getReceivables(clientId: string, filters?: { status?: string; departmentId?: string }): Promise<Receivable[]> {
    let conditions = [eq(receivables.clientId, clientId)];
    if (filters?.status) {
      conditions.push(eq(receivables.status, filters.status));
    }
    if (filters?.departmentId) {
      conditions.push(eq(receivables.departmentId, filters.departmentId));
    }
    return db.select().from(receivables)
      .where(and(...conditions))
      .orderBy(desc(receivables.auditDate));
  }

  async getReceivable(id: string): Promise<Receivable | undefined> {
    const [receivable] = await db.select().from(receivables).where(eq(receivables.id, id));
    return receivable;
  }

  async createReceivable(insertReceivable: InsertReceivable): Promise<Receivable> {
    const [receivable] = await db.insert(receivables).values(insertReceivable).returning();
    return receivable;
  }

  async updateReceivable(id: string, updateData: Partial<InsertReceivable>): Promise<Receivable | undefined> {
    const [receivable] = await db.update(receivables)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(receivables.id, id))
      .returning();
    return receivable;
  }

  async getReceivableHistory(receivableId: string): Promise<ReceivableHistory[]> {
    return db.select().from(receivableHistory)
      .where(eq(receivableHistory.receivableId, receivableId))
      .orderBy(desc(receivableHistory.createdAt));
  }

  async createReceivableHistory(insertHistory: InsertReceivableHistory): Promise<ReceivableHistory> {
    const [history] = await db.insert(receivableHistory).values(insertHistory).returning();
    return history;
  }

  // Surpluses
  async getSurpluses(clientId: string, filters?: { status?: string; departmentId?: string }): Promise<Surplus[]> {
    let conditions = [eq(surpluses.clientId, clientId)];
    if (filters?.status) {
      conditions.push(eq(surpluses.status, filters.status));
    }
    if (filters?.departmentId) {
      conditions.push(eq(surpluses.departmentId, filters.departmentId));
    }
    return db.select().from(surpluses)
      .where(and(...conditions))
      .orderBy(desc(surpluses.auditDate));
  }

  async getSurplus(id: string): Promise<Surplus | undefined> {
    const [surplus] = await db.select().from(surpluses).where(eq(surpluses.id, id));
    return surplus;
  }

  async createSurplus(insertSurplus: InsertSurplus): Promise<Surplus> {
    const [surplus] = await db.insert(surpluses).values(insertSurplus).returning();
    return surplus;
  }

  async updateSurplus(id: string, updateData: Partial<InsertSurplus>): Promise<Surplus | undefined> {
    const [surplus] = await db.update(surpluses)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(surpluses.id, id))
      .returning();
    return surplus;
  }

  async getSurplusHistory(surplusId: string): Promise<SurplusHistory[]> {
    return db.select().from(surplusHistory)
      .where(eq(surplusHistory.surplusId, surplusId))
      .orderBy(desc(surplusHistory.createdAt));
  }

  async createSurplusHistory(insertHistory: InsertSurplusHistory): Promise<SurplusHistory> {
    const [history] = await db.insert(surplusHistory).values(insertHistory).returning();
    return history;
  }
}

export const storage = new DbStorage();

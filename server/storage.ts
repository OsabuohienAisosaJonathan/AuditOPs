import { db } from "./db";
import { 
  users, clients, outlets, departments, salesEntries, purchases,
  stockMovements, reconciliations, exceptions, exceptionComments, auditLogs, adminActivityLogs, systemSettings,
  suppliers, items, purchaseLines, stockCounts,
  type User, type InsertUser, type Client, type InsertClient,
  type Outlet, type InsertOutlet, type Department, type InsertDepartment,
  type SalesEntry, type InsertSalesEntry, type Purchase, type InsertPurchase,
  type StockMovement, type InsertStockMovement, type Reconciliation, type InsertReconciliation,
  type Exception, type InsertException, type ExceptionComment, type InsertExceptionComment,
  type AuditLog, type InsertAuditLog, type AdminActivityLog, type InsertAdminActivityLog,
  type Supplier, type InsertSupplier, type Item, type InsertItem,
  type PurchaseLine, type InsertPurchaseLine, type StockCount, type InsertStockCount
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql, or, ilike, count, sum } from "drizzle-orm";

export interface DashboardSummary {
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

  // Outlets
  getOutlets(clientId: string): Promise<Outlet[]>;
  getAllOutlets(): Promise<Outlet[]>;
  getOutlet(id: string): Promise<Outlet | undefined>;
  createOutlet(outlet: InsertOutlet): Promise<Outlet>;
  updateOutlet(id: string, outlet: Partial<InsertOutlet>): Promise<Outlet | undefined>;
  deleteOutlet(id: string): Promise<boolean>;

  // Departments
  getDepartments(outletId: string): Promise<Department[]>;
  getAllDepartments(): Promise<Department[]>;
  getDepartment(id: string): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: string, department: Partial<InsertDepartment>): Promise<Department | undefined>;
  deleteDepartment(id: string): Promise<boolean>;

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
  getAllSalesEntries(): Promise<SalesEntry[]>;
  getSalesEntry(id: string): Promise<SalesEntry | undefined>;
  createSalesEntry(entry: InsertSalesEntry): Promise<SalesEntry>;
  updateSalesEntry(id: string, entry: Partial<InsertSalesEntry>): Promise<SalesEntry | undefined>;
  deleteSalesEntry(id: string): Promise<boolean>;

  // Purchases
  getPurchases(outletId: string): Promise<Purchase[]>;
  getAllPurchases(): Promise<Purchase[]>;
  getPurchase(id: string): Promise<Purchase | undefined>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  updatePurchase(id: string, purchase: Partial<InsertPurchase>): Promise<Purchase | undefined>;
  deletePurchase(id: string): Promise<boolean>;

  // Stock Movements
  getStockMovements(outletId: string): Promise<StockMovement[]>;
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;

  // Reconciliations
  getReconciliations(departmentId: string, date?: Date): Promise<Reconciliation[]>;
  getAllReconciliations(): Promise<Reconciliation[]>;
  getReconciliation(id: string): Promise<Reconciliation | undefined>;
  createReconciliation(reconciliation: InsertReconciliation): Promise<Reconciliation>;
  updateReconciliation(id: string, reconciliation: Partial<InsertReconciliation>): Promise<Reconciliation | undefined>;
  deleteReconciliation(id: string): Promise<boolean>;

  // Exceptions
  getExceptions(filters?: { outletId?: string; status?: string; severity?: string }): Promise<Exception[]>;
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
  getDashboardSummary(): Promise<DashboardSummary>;
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

  // Outlets
  async getOutlets(clientId: string): Promise<Outlet[]> {
    return db.select().from(outlets).where(eq(outlets.clientId, clientId));
  }

  async getAllOutlets(): Promise<Outlet[]> {
    return db.select().from(outlets);
  }

  async getOutlet(id: string): Promise<Outlet | undefined> {
    const [outlet] = await db.select().from(outlets).where(eq(outlets.id, id));
    return outlet;
  }

  async createOutlet(insertOutlet: InsertOutlet): Promise<Outlet> {
    const [outlet] = await db.insert(outlets).values(insertOutlet).returning();
    return outlet;
  }

  async updateOutlet(id: string, updateData: Partial<InsertOutlet>): Promise<Outlet | undefined> {
    const [outlet] = await db.update(outlets).set(updateData).where(eq(outlets.id, id)).returning();
    return outlet;
  }

  async deleteOutlet(id: string): Promise<boolean> {
    await db.delete(outlets).where(eq(outlets.id, id));
    return true;
  }

  // Departments
  async getDepartments(outletId: string): Promise<Department[]> {
    return db.select().from(departments).where(eq(departments.outletId, outletId));
  }

  async getAllDepartments(): Promise<Department[]> {
    return db.select().from(departments);
  }

  async getDepartment(id: string): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department;
  }

  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> {
    const [department] = await db.insert(departments).values(insertDepartment).returning();
    return department;
  }

  async updateDepartment(id: string, updateData: Partial<InsertDepartment>): Promise<Department | undefined> {
    const [department] = await db.update(departments).set(updateData).where(eq(departments.id, id)).returning();
    return department;
  }

  async deleteDepartment(id: string): Promise<boolean> {
    await db.delete(departments).where(eq(departments.id, id));
    return true;
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
    const [item] = await db.insert(items).values(insertItem).returning();
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
  async getPurchases(outletId: string): Promise<Purchase[]> {
    return db.select().from(purchases).where(eq(purchases.outletId, outletId)).orderBy(desc(purchases.createdAt));
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
    await db.delete(purchaseLines).where(eq(purchaseLines.purchaseId, id));
    await db.delete(purchases).where(eq(purchases.id, id));
    return true;
  }

  // Stock Movements
  async getStockMovements(outletId: string): Promise<StockMovement[]> {
    return db.select().from(stockMovements).where(eq(stockMovements.outletId, outletId)).orderBy(desc(stockMovements.createdAt));
  }

  async createStockMovement(insertMovement: InsertStockMovement): Promise<StockMovement> {
    const [movement] = await db.insert(stockMovements).values(insertMovement).returning();
    return movement;
  }

  // Reconciliations
  async getReconciliations(departmentId: string, date?: Date): Promise<Reconciliation[]> {
    if (date) {
      return db.select().from(reconciliations).where(
        and(
          eq(reconciliations.departmentId, departmentId),
          eq(reconciliations.date, date)
        )
      ).orderBy(desc(reconciliations.createdAt));
    }
    return db.select().from(reconciliations).where(eq(reconciliations.departmentId, departmentId)).orderBy(desc(reconciliations.createdAt));
  }

  async getAllReconciliations(): Promise<Reconciliation[]> {
    return db.select().from(reconciliations).orderBy(desc(reconciliations.createdAt));
  }

  async getReconciliation(id: string): Promise<Reconciliation | undefined> {
    const [recon] = await db.select().from(reconciliations).where(eq(reconciliations.id, id));
    return recon;
  }

  async createReconciliation(insertRecon: InsertReconciliation): Promise<Reconciliation> {
    const [recon] = await db.insert(reconciliations).values(insertRecon).returning();
    return recon;
  }

  async updateReconciliation(id: string, updateData: Partial<InsertReconciliation>): Promise<Reconciliation | undefined> {
    const [recon] = await db.update(reconciliations).set(updateData).where(eq(reconciliations.id, id)).returning();
    return recon;
  }

  async deleteReconciliation(id: string): Promise<boolean> {
    await db.delete(reconciliations).where(eq(reconciliations.id, id));
    return true;
  }

  // Exceptions
  async getExceptions(filters?: { outletId?: string; status?: string; severity?: string }): Promise<Exception[]> {
    let conditions = [];
    
    if (filters?.outletId) {
      conditions.push(eq(exceptions.outletId, filters.outletId));
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

  async generateExceptionCaseNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    const countResult = await db.select({ count: count() }).from(exceptions).where(
      and(
        gte(exceptions.createdAt, todayStart),
        lte(exceptions.createdAt, todayEnd)
      )
    );
    const sequence = (countResult[0]?.count || 0) + 1;
    
    return `EXC-${dateStr}-${String(sequence).padStart(3, '0')}`;
  }

  async createException(insertException: InsertException): Promise<Exception> {
    const caseNumber = await this.generateExceptionCaseNumber();
    
    const [exception] = await db.insert(exceptions).values({
      ...insertException,
      caseNumber,
    }).returning();
    return exception;
  }

  async updateException(id: string, updateData: Partial<InsertException>): Promise<Exception | undefined> {
    const [exception] = await db.update(exceptions).set(updateData).where(eq(exceptions.id, id)).returning();
    return exception;
  }

  async deleteException(id: string): Promise<boolean> {
    await db.delete(exceptionComments).where(eq(exceptionComments.exceptionId, id));
    await db.delete(exceptions).where(eq(exceptions.id, id));
    return true;
  }

  // Exception Comments
  async getExceptionComments(exceptionId: string): Promise<ExceptionComment[]> {
    return db.select().from(exceptionComments).where(eq(exceptionComments.exceptionId, exceptionId)).orderBy(exceptionComments.createdAt);
  }

  async createExceptionComment(insertComment: InsertExceptionComment): Promise<ExceptionComment> {
    const [comment] = await db.insert(exceptionComments).values(insertComment).returning();
    return comment;
  }

  // Audit Logs
  async getAuditLogs(filters?: { limit?: number; offset?: number; userId?: string; entity?: string; startDate?: Date; endDate?: Date }): Promise<{ logs: AuditLog[]; total: number }> {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    
    let conditions = [];
    
    if (filters?.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters?.entity) {
      conditions.push(ilike(auditLogs.entity, `%${filters.entity}%`));
    }
    if (filters?.startDate) {
      conditions.push(gte(auditLogs.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(auditLogs.createdAt, filters.endDate));
    }

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
    let conditions = [];
    
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
      return db.select().from(adminActivityLogs).where(and(...conditions)).orderBy(desc(adminActivityLogs.createdAt)).limit(100);
    }
    return db.select().from(adminActivityLogs).orderBy(desc(adminActivityLogs.createdAt)).limit(100);
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

  // Dashboard Summary
  async getDashboardSummary(): Promise<DashboardSummary> {
    const allSales: SalesEntry[] = await db.select().from(salesEntries);
    const totalSales = allSales.reduce((acc: number, s: SalesEntry) => acc + parseFloat(s.totalSales || "0"), 0);

    const allPurchases: Purchase[] = await db.select().from(purchases);
    const totalPurchases = allPurchases.reduce((acc: number, p: Purchase) => acc + parseFloat(p.totalAmount || "0"), 0);

    const allExceptions: Exception[] = await db.select().from(exceptions);
    const totalExceptions = allExceptions.length;
    const openExceptions = allExceptions.filter((e: Exception) => e.status === "open").length;

    const allRecons: Reconciliation[] = await db.select().from(reconciliations);
    const totalVarianceValue = allRecons.reduce((acc: number, r: Reconciliation) => acc + Math.abs(parseFloat(r.varianceValue || "0")), 0);
    const pendingReconciliations = allRecons.filter((r: Reconciliation) => r.status === "pending").length;

    const recentExceptions = allExceptions.slice(0, 5);

    const redFlags: { type: string; message: string; severity: string }[] = [];

    if (openExceptions > 10) {
      redFlags.push({
        type: "exceptions",
        message: `${openExceptions} open exceptions require attention`,
        severity: "high"
      });
    }

    if (pendingReconciliations > 5) {
      redFlags.push({
        type: "reconciliations",
        message: `${pendingReconciliations} reconciliations pending approval`,
        severity: "medium"
      });
    }

    const highVarianceRecons = allRecons.filter((r: Reconciliation) => Math.abs(parseFloat(r.varianceValue || "0")) > 1000);
    if (highVarianceRecons.length > 0) {
      redFlags.push({
        type: "variance",
        message: `${highVarianceRecons.length} reconciliations with high variance (>$1000)`,
        severity: "high"
      });
    }

    const criticalExceptions = allExceptions.filter((e: Exception) => e.severity === "critical" && e.status === "open");
    if (criticalExceptions.length > 0) {
      redFlags.push({
        type: "critical",
        message: `${criticalExceptions.length} critical exceptions open`,
        severity: "critical"
      });
    }

    return {
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
}

export const storage = new DbStorage();

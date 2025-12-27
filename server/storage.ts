import { db } from "./db";
import { 
  users, clients, categories, departments, salesEntries, purchases,
  stockMovements, reconciliations, exceptions, exceptionComments, auditLogs, adminActivityLogs, systemSettings,
  suppliers, items, purchaseLines, stockCounts, paymentDeclarations,
  type User, type InsertUser, type Client, type InsertClient,
  type Category, type InsertCategory, type Department, type InsertDepartment,
  type SalesEntry, type InsertSalesEntry, type Purchase, type InsertPurchase,
  type StockMovement, type InsertStockMovement, type Reconciliation, type InsertReconciliation,
  type Exception, type InsertException, type ExceptionComment, type InsertExceptionComment,
  type AuditLog, type InsertAuditLog, type AdminActivityLog, type InsertAdminActivityLog,
  type Supplier, type InsertSupplier, type Item, type InsertItem,
  type PurchaseLine, type InsertPurchaseLine, type StockCount, type InsertStockCount,
  type PaymentDeclaration, type InsertPaymentDeclaration
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql, or, ilike, count, sum } from "drizzle-orm";

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
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;

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
}

export const storage = new DbStorage();

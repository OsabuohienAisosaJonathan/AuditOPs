import { db } from "./db";
import { 
  users, clients, outlets, departments, salesEntries, purchases,
  stockMovements, reconciliations, exceptions, exceptionComments, auditLogs,
  type User, type InsertUser, type Client, type InsertClient,
  type Outlet, type InsertOutlet, type Department, type InsertDepartment,
  type SalesEntry, type InsertSalesEntry, type Purchase, type InsertPurchase,
  type StockMovement, type InsertStockMovement, type Reconciliation, type InsertReconciliation,
  type Exception, type InsertException, type ExceptionComment, type InsertExceptionComment,
  type AuditLog, type InsertAuditLog
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;

  // Outlets
  getOutlets(clientId: string): Promise<Outlet[]>;
  getOutlet(id: string): Promise<Outlet | undefined>;
  createOutlet(outlet: InsertOutlet): Promise<Outlet>;

  // Departments
  getDepartments(outletId: string): Promise<Department[]>;
  getDepartment(id: string): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;

  // Sales
  getSalesEntries(departmentId: string, startDate?: Date, endDate?: Date): Promise<SalesEntry[]>;
  getSalesEntry(id: string): Promise<SalesEntry | undefined>;
  createSalesEntry(entry: InsertSalesEntry): Promise<SalesEntry>;
  updateSalesEntry(id: string, entry: Partial<InsertSalesEntry>): Promise<SalesEntry | undefined>;

  // Purchases
  getPurchases(outletId: string): Promise<Purchase[]>;
  getPurchase(id: string): Promise<Purchase | undefined>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  updatePurchase(id: string, purchase: Partial<InsertPurchase>): Promise<Purchase | undefined>;

  // Stock Movements
  getStockMovements(outletId: string): Promise<StockMovement[]>;
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;

  // Reconciliations
  getReconciliations(departmentId: string, date?: Date): Promise<Reconciliation[]>;
  getReconciliation(id: string): Promise<Reconciliation | undefined>;
  createReconciliation(reconciliation: InsertReconciliation): Promise<Reconciliation>;
  updateReconciliation(id: string, reconciliation: Partial<InsertReconciliation>): Promise<Reconciliation | undefined>;

  // Exceptions
  getExceptions(outletId?: string): Promise<Exception[]>;
  getException(id: string): Promise<Exception | undefined>;
  createException(exception: InsertException): Promise<Exception>;
  updateException(id: string, exception: Partial<InsertException>): Promise<Exception | undefined>;

  // Exception Comments
  getExceptionComments(exceptionId: string): Promise<ExceptionComment[]>;
  createExceptionComment(comment: InsertExceptionComment): Promise<ExceptionComment>;

  // Audit Logs
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
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

  // Outlets
  async getOutlets(clientId: string): Promise<Outlet[]> {
    return db.select().from(outlets).where(eq(outlets.clientId, clientId));
  }

  async getOutlet(id: string): Promise<Outlet | undefined> {
    const [outlet] = await db.select().from(outlets).where(eq(outlets.id, id));
    return outlet;
  }

  async createOutlet(insertOutlet: InsertOutlet): Promise<Outlet> {
    const [outlet] = await db.insert(outlets).values(insertOutlet).returning();
    return outlet;
  }

  // Departments
  async getDepartments(outletId: string): Promise<Department[]> {
    return db.select().from(departments).where(eq(departments.outletId, outletId));
  }

  async getDepartment(id: string): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department;
  }

  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> {
    const [department] = await db.insert(departments).values(insertDepartment).returning();
    return department;
  }

  // Sales
  async getSalesEntries(departmentId: string, startDate?: Date, endDate?: Date): Promise<SalesEntry[]> {
    let query = db.select().from(salesEntries).where(eq(salesEntries.departmentId, departmentId));
    
    if (startDate && endDate) {
      return db.select().from(salesEntries).where(
        and(
          eq(salesEntries.departmentId, departmentId),
          gte(salesEntries.date, startDate),
          lte(salesEntries.date, endDate)
        )
      ).orderBy(desc(salesEntries.date));
    }
    
    return query.orderBy(desc(salesEntries.date));
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

  // Purchases
  async getPurchases(outletId: string): Promise<Purchase[]> {
    return db.select().from(purchases).where(eq(purchases.outletId, outletId)).orderBy(desc(purchases.createdAt));
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

  // Exceptions
  async getExceptions(outletId?: string): Promise<Exception[]> {
    if (outletId) {
      return db.select().from(exceptions).where(eq(exceptions.outletId, outletId)).orderBy(desc(exceptions.createdAt));
    }
    return db.select().from(exceptions).orderBy(desc(exceptions.createdAt));
  }

  async getException(id: string): Promise<Exception | undefined> {
    const [exception] = await db.select().from(exceptions).where(eq(exceptions.id, id));
    return exception;
  }

  async createException(insertException: InsertException): Promise<Exception> {
    // Generate case number
    const count = await db.select({ count: sql<number>`count(*)` }).from(exceptions);
    const caseNumber = `EX-${String((count[0]?.count || 0) + 200).padStart(3, '0')}`;
    
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

  // Exception Comments
  async getExceptionComments(exceptionId: string): Promise<ExceptionComment[]> {
    return db.select().from(exceptionComments).where(eq(exceptionComments.exceptionId, exceptionId)).orderBy(exceptionComments.createdAt);
  }

  async createExceptionComment(insertComment: InsertExceptionComment): Promise<ExceptionComment> {
    const [comment] = await db.insert(exceptionComments).values(insertComment).returning();
    return comment;
  }

  // Audit Logs
  async getAuditLogs(limit: number = 50): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(insertLog).returning();
    return log;
  }
}

export const storage = new DbStorage();

import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hash, compare } from "bcrypt";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { 
  insertUserSchema, insertClientSchema, insertCategorySchema, insertDepartmentSchema, 
  insertSalesEntrySchema, insertPurchaseSchema, insertStockMovementSchema, 
  insertReconciliationSchema, insertExceptionSchema, insertExceptionCommentSchema,
  insertSupplierSchema, insertItemSchema, insertPurchaseLineSchema, insertStockCountSchema,
  insertPaymentDeclarationSchema, insertStoreIssueSchema, insertStoreIssueLineSchema, insertStoreStockSchema,
  insertStoreNameSchema, insertInventoryDepartmentSchema, insertGoodsReceivedNoteSchema, INVENTORY_TYPES,
  type UserRole 
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomBytes } from "crypto";

declare module "express-session" {
  interface SessionData {
    userId: string;
    role: string;
  }
}

function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);
}

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function checkRateLimit(identifier: string): { allowed: boolean; remainingAttempts: number } {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier);
  
  if (!attempts) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }
  
  if (now - attempts.lastAttempt > LOCKOUT_MINUTES * 60 * 1000) {
    loginAttempts.delete(identifier);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }
  
  if (attempts.count >= MAX_ATTEMPTS) {
    return { allowed: false, remainingAttempts: 0 };
  }
  
  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - attempts.count };
}

function recordFailedAttempt(identifier: string): void {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier);
  
  if (attempts) {
    attempts.count++;
    attempts.lastAttempt = now;
  } else {
    loginAttempts.set(identifier, { count: 1, lastAttempt: now });
  }
}

function clearAttempts(identifier: string): void {
  loginAttempts.delete(identifier);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const PgStore = connectPgSimple(session);
  
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }
  
  app.use(
    session({
      store: new PgStore({
        pool: pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "audit-ops-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      proxy: process.env.NODE_ENV === "production",
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  const requireRole = (...roles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ error: "You don't have permission to perform this action" });
      }
      
      next();
    };
  };

  const requireSuperAdmin = requireRole("super_admin");
  const requireSupervisorOrAbove = requireRole("super_admin", "supervisor");

  const requireClientAccess = (clientIdParam: string = "clientId") => {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (user?.role === "super_admin") {
        return next();
      }
      
      const clientId = req.params[clientIdParam] || req.body.clientId || req.query.clientId;
      if (!clientId) {
        return next();
      }
      
      const access = await storage.getUserClientAccess(req.session.userId, clientId as string);
      
      if (!access) {
        return res.status(403).json({ error: "You do not have access to this client" });
      }
      
      if (access.status === "removed") {
        return res.status(403).json({ error: "Your access to this client has been removed" });
      }
      
      if (access.status === "suspended") {
        if (req.method !== "GET") {
          return res.status(403).json({ error: "Your access to this client is suspended (read-only)" });
        }
      }
      
      (req as any).clientAccess = access;
      next();
    };
  };

  const requireAuditContext = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const context = await storage.getActiveAuditContext(req.session.userId);
    if (!context) {
      return res.status(400).json({ 
        error: "No active audit context", 
        code: "NO_AUDIT_CONTEXT",
        message: "Please select an audit period before accessing this resource" 
      });
    }
    
    (req as any).auditContext = context;
    next();
  };

  // ============== BOOTSTRAP SETUP ==============
  app.get("/api/setup/status", async (req, res) => {
    try {
      const superAdminCount = await storage.getSuperAdminCount();
      const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
      
      res.json({
        setupRequired: superAdminCount === 0,
        requiresSecret: !!bootstrapSecret,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/setup/bootstrap", async (req, res) => {
    try {
      const superAdminCount = await storage.getSuperAdminCount();
      
      if (superAdminCount > 0) {
        return res.status(403).json({ error: "Setup already completed. A Super Admin already exists." });
      }

      const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
      if (bootstrapSecret && req.body.bootstrapSecret !== bootstrapSecret) {
        return res.status(403).json({ error: "Invalid bootstrap secret" });
      }

      const { fullName, email, password, username } = req.body;

      if (!fullName || !email || !password || !username) {
        return res.status(400).json({ error: "Full name, email, username, and password are required" });
      }

      if (!isStrongPassword(password)) {
        return res.status(400).json({ error: "Password must be at least 8 characters with uppercase, lowercase, and numbers" });
      }

      const hashedPassword = await hash(password, 12);
      
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        fullName,
        role: "super_admin",
        status: "active",
        mustChangePassword: true,
        accessScope: { global: true },
      });

      await storage.createAdminActivityLog({
        actorId: user.id,
        targetUserId: user.id,
        actionType: "bootstrap_admin_created",
        afterState: { fullName, email, role: "super_admin" },
        ipAddress: req.ip || "Unknown",
      });

      req.session.userId = user.id;
      req.session.role = user.role;

      res.json({ 
        success: true, 
        message: "Super Admin created successfully",
        mustChangePassword: true,
        user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName, role: user.role }
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== AUTH ROUTES ==============
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const identifier = username || req.ip;
      
      const rateLimit = checkRateLimit(identifier);
      if (!rateLimit.allowed) {
        return res.status(429).json({ error: `Too many login attempts. Please try again in ${LOCKOUT_MINUTES} minutes.` });
      }

      let user = await storage.getUserByUsername(username);
      if (!user) {
        user = await storage.getUserByEmail(username);
      }

      if (!user) {
        recordFailedAttempt(identifier);
        await storage.createAuditLog({
          userId: null,
          action: "Login Failed",
          entity: "Session",
          details: `Failed login attempt for: ${username}`,
          ipAddress: req.ip || "Unknown",
        });
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.status === "deactivated") {
        return res.status(403).json({ error: "Your account has been deactivated. Please contact your administrator." });
      }

      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        return res.status(403).json({ error: "Account is temporarily locked. Please try again later." });
      }

      if (!(await compare(password, user.password))) {
        recordFailedAttempt(identifier);
        
        const newAttempts = (user.loginAttempts || 0) + 1;
        const updateData: any = { loginAttempts: newAttempts };
        
        if (newAttempts >= MAX_ATTEMPTS) {
          updateData.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        }
        
        await storage.updateUser(user.id, updateData);
        
        await storage.createAuditLog({
          userId: user.id,
          action: "Login Failed",
          entity: "Session",
          details: `Invalid password attempt (${newAttempts}/${MAX_ATTEMPTS})`,
          ipAddress: req.ip || "Unknown",
        });

        return res.status(401).json({ error: "Invalid credentials" });
      }

      clearAttempts(identifier);
      
      await storage.updateUser(user.id, {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      });

      req.session.userId = user.id;
      req.session.role = user.role;
      
      await storage.createAuditLog({
        userId: user.id,
        action: "Login",
        entity: "Session",
        details: "Successful login via web",
        ipAddress: req.ip || "Unknown",
      });

      res.json({ 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        fullName: user.fullName, 
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        accessScope: user.accessScope,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await storage.getUser(req.session.userId!);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!(await compare(currentPassword, user.password))) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      if (!isStrongPassword(newPassword)) {
        return res.status(400).json({ error: "Password must be at least 8 characters with uppercase, lowercase, and numbers" });
      }

      const hashedPassword = await hash(newPassword, 12);
      await storage.updateUser(user.id, { password: hashedPassword, mustChangePassword: false });

      await storage.createAuditLog({
        userId: user.id,
        action: "Password Changed",
        entity: "User",
        entityId: user.id,
        details: "User changed their password",
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true, message: "Password changed successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        fullName: user.fullName, 
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        accessScope: user.accessScope,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== DASHBOARD ==============
  app.get("/api/dashboard/summary", requireAuth, async (req, res) => {
    try {
      const { clientId, departmentId, date } = req.query;
      const filters = {
        clientId: clientId as string | undefined,
        departmentId: departmentId as string | undefined,
        date: date as string | undefined,
      };
      const summary = await storage.getDashboardSummary(filters);
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/departments/by-client/:clientId", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const departments = await storage.getDepartments(clientId);
      res.json(departments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== PAYMENT DECLARATIONS ==============
  app.get("/api/payment-declarations/:departmentId", requireAuth, async (req, res) => {
    try {
      const { departmentId } = req.params;
      const { startDate, endDate } = req.query;
      const declarations = await storage.getPaymentDeclarations(
        departmentId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(declarations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/payment-declarations/:clientId/:departmentId/:date", requireAuth, async (req, res) => {
    try {
      const { clientId, departmentId, date } = req.params;
      const declaration = await storage.getPaymentDeclaration(clientId, departmentId, new Date(date));
      if (!declaration) {
        return res.status(404).json({ error: "No payment declaration found for this date" });
      }
      res.json(declaration);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/payment-declarations", requireAuth, async (req, res) => {
    try {
      const parsed = insertPaymentDeclarationSchema.safeParse({
        ...req.body,
        createdBy: req.session.userId,
        date: new Date(req.body.date)
      });
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      // Check if declaration already exists for this client/department/date
      const existing = await storage.getPaymentDeclaration(
        parsed.data.clientId,
        parsed.data.departmentId,
        parsed.data.date
      );
      
      if (existing) {
        // Update instead of create
        const updated = await storage.updatePaymentDeclaration(existing.id, parsed.data);
        
        await storage.createAuditLog({
          userId: req.session.userId,
          action: "update",
          entity: "payment_declaration",
          entityId: existing.id,
          details: `Updated payment declaration for ${parsed.data.date}`,
          ipAddress: req.ip
        });
        
        return res.json(updated);
      }
      
      const declaration = await storage.createPaymentDeclaration(parsed.data);
      
      await storage.createAuditLog({
        userId: req.session.userId,
        action: "create",
        entity: "payment_declaration",
        entityId: declaration.id,
        details: `Created payment declaration for ${parsed.data.date}`,
        ipAddress: req.ip
      });
      
      res.status(201).json(declaration);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/payment-declarations/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getPaymentDeclarationById(id);
      
      if (!existing) {
        return res.status(404).json({ error: "Payment declaration not found" });
      }
      
      const updated = await storage.updatePaymentDeclaration(id, req.body);
      
      await storage.createAuditLog({
        userId: req.session.userId,
        action: "update",
        entity: "payment_declaration",
        entityId: id,
        details: `Updated payment declaration`,
        ipAddress: req.ip
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/payment-declarations/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getPaymentDeclarationById(id);
      
      if (!existing) {
        return res.status(404).json({ error: "Payment declaration not found" });
      }
      
      await storage.deletePaymentDeclaration(id);
      
      await storage.createAuditLog({
        userId: req.session.userId,
        action: "delete",
        entity: "payment_declaration",
        entityId: id,
        details: `Deleted payment declaration`,
        ipAddress: req.ip
      });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get sales summary and reconciliation hint for a department on a date
  app.get("/api/reconciliation-hint/:departmentId/:date", requireAuth, async (req, res) => {
    try {
      const { departmentId, date } = req.params;
      const dateObj = new Date(date);
      
      // Get department to get clientId
      const department = await storage.getDepartment(departmentId);
      if (!department) {
        return res.status(404).json({ error: "Department not found" });
      }
      
      // Get captured sales summary
      const salesSummary = await storage.getSalesSummaryForDepartment(departmentId, dateObj);
      
      // Get payment declaration if exists
      const declaration = await storage.getPaymentDeclaration(department.clientId, departmentId, dateObj);
      
      const reportedTotal = declaration ? parseFloat(declaration.totalReported || "0") : 0;
      const capturedTotal = salesSummary.totalSales;
      const difference = capturedTotal - reportedTotal;
      
      res.json({
        captured: salesSummary,
        reported: declaration ? {
          cash: parseFloat(declaration.reportedCash || "0"),
          pos: parseFloat(declaration.reportedPosSettlement || "0"),
          transfers: parseFloat(declaration.reportedTransfers || "0"),
          total: reportedTotal,
          notes: declaration.notes,
          documents: declaration.supportingDocuments
        } : null,
        difference: {
          cash: salesSummary.totalCash - (declaration ? parseFloat(declaration.reportedCash || "0") : 0),
          pos: salesSummary.totalPos - (declaration ? parseFloat(declaration.reportedPosSettlement || "0") : 0),
          transfers: salesSummary.totalTransfer - (declaration ? parseFloat(declaration.reportedTransfers || "0") : 0),
          total: difference
        },
        hasDeclaration: !!declaration,
        status: Math.abs(difference) < 0.01 ? "balanced" : difference > 0 ? "over_declared" : "under_declared"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== USER MANAGEMENT (Super Admin Only) ==============
  app.get("/api/users", requireSuperAdmin, async (req, res) => {
    try {
      const { role, status, search } = req.query;
      const users = await storage.getUsers({
        role: role as string,
        status: status as string,
        search: search as string,
      });
      
      const safeUsers = users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        status: u.status,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        accessScope: u.accessScope,
        phone: u.phone,
      }));
      
      res.json(safeUsers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/:id", requireSuperAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        accessScope: user.accessScope,
        phone: user.phone,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/users", requireSuperAdmin, async (req, res) => {
    try {
      const { fullName, email, username, role, phone, accessScope, sendInvite } = req.body;

      if (!fullName || !email || !username || !role) {
        return res.status(400).json({ error: "Full name, email, username, and role are required" });
      }

      if (!["supervisor", "auditor"].includes(role)) {
        return res.status(400).json({ error: "Role must be supervisor or auditor" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already in use" });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already in use" });
      }

      const tempPassword = randomBytes(12).toString("base64").slice(0, 12);
      const hashedPassword = await hash(tempPassword, 12);

      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        fullName,
        role,
        phone,
        status: "active",
        mustChangePassword: true,
        accessScope: accessScope || { global: role === "supervisor" },
      });

      await storage.createAdminActivityLog({
        actorId: req.session.userId!,
        targetUserId: user.id,
        actionType: "user_created",
        afterState: { fullName, email, role, accessScope },
        ipAddress: req.ip || "Unknown",
      });

      res.json({ 
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
        temporaryPassword: tempPassword,
        message: "User created. Please share the temporary password securely.",
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/users/:id", requireSuperAdmin, async (req, res) => {
    try {
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const { fullName, role, phone, accessScope, status } = req.body;

      if (targetUser.role === "super_admin" && role && role !== "super_admin") {
        return res.status(403).json({ error: "Cannot change the role of a Super Admin" });
      }

      const beforeState = {
        fullName: targetUser.fullName,
        role: targetUser.role,
        phone: targetUser.phone,
        accessScope: targetUser.accessScope,
        status: targetUser.status,
      };

      const updateData: any = {};
      if (fullName !== undefined) updateData.fullName = fullName;
      if (role !== undefined && ["supervisor", "auditor"].includes(role)) updateData.role = role;
      if (phone !== undefined) updateData.phone = phone;
      if (accessScope !== undefined) updateData.accessScope = accessScope;
      if (status !== undefined && ["active", "deactivated"].includes(status)) updateData.status = status;

      const user = await storage.updateUser(req.params.id, updateData);

      await storage.createAdminActivityLog({
        actorId: req.session.userId!,
        targetUserId: req.params.id,
        actionType: "user_updated",
        beforeState,
        afterState: updateData,
        ipAddress: req.ip || "Unknown",
      });

      res.json({
        id: user!.id,
        username: user!.username,
        email: user!.email,
        fullName: user!.fullName,
        role: user!.role,
        status: user!.status,
        accessScope: user!.accessScope,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/users/:id/deactivate", requireSuperAdmin, async (req, res) => {
    try {
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      if (targetUser.role === "super_admin") {
        const superAdminCount = await storage.getSuperAdminCount();
        if (superAdminCount <= 1) {
          return res.status(403).json({ error: "Cannot deactivate the last Super Admin" });
        }
      }

      const { reason } = req.body;

      await storage.updateUser(req.params.id, { status: "deactivated" });

      await storage.createAdminActivityLog({
        actorId: req.session.userId!,
        targetUserId: req.params.id,
        actionType: "user_deactivated",
        beforeState: { status: targetUser.status },
        afterState: { status: "deactivated" },
        reason,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true, message: "User deactivated successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/users/:id/reactivate", requireSuperAdmin, async (req, res) => {
    try {
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.updateUser(req.params.id, { status: "active" });

      await storage.createAdminActivityLog({
        actorId: req.session.userId!,
        targetUserId: req.params.id,
        actionType: "user_reactivated",
        beforeState: { status: targetUser.status },
        afterState: { status: "active" },
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true, message: "User reactivated successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/users/:id/reset-password", requireSuperAdmin, async (req, res) => {
    try {
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const tempPassword = randomBytes(12).toString("base64").slice(0, 12);
      const hashedPassword = await hash(tempPassword, 12);

      await storage.updateUser(req.params.id, { 
        password: hashedPassword, 
        mustChangePassword: true,
        loginAttempts: 0,
        lockedUntil: null,
      });

      await storage.createAdminActivityLog({
        actorId: req.session.userId!,
        targetUserId: req.params.id,
        actionType: "password_reset",
        ipAddress: req.ip || "Unknown",
      });

      res.json({ 
        success: true, 
        temporaryPassword: tempPassword,
        message: "Password reset. User must change password on next login.",
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/users/:id", requireSuperAdmin, async (req, res) => {
    try {
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      if (targetUser.role === "super_admin") {
        const superAdminCount = await storage.getSuperAdminCount();
        if (superAdminCount <= 1) {
          return res.status(403).json({ error: "Cannot delete the last Super Admin" });
        }
      }

      if (targetUser.id === req.session.userId) {
        return res.status(403).json({ error: "Cannot delete your own account" });
      }

      const { reason, confirmation } = req.body;

      if (confirmation !== targetUser.email) {
        return res.status(400).json({ error: "Please type the user's email to confirm deletion" });
      }

      await storage.createAdminActivityLog({
        actorId: req.session.userId!,
        targetUserId: req.params.id,
        actionType: "user_deleted",
        beforeState: { 
          fullName: targetUser.fullName, 
          email: targetUser.email, 
          role: targetUser.role 
        },
        reason,
        ipAddress: req.ip || "Unknown",
      });

      await storage.deleteUser(req.params.id);

      res.json({ success: true, message: "User permanently deleted" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== ADMIN ACTIVITY LOGS ==============
  app.get("/api/admin-activity-logs", requireSuperAdmin, async (req, res) => {
    try {
      const { actorId, targetUserId, actionType, startDate, endDate } = req.query;
      
      const logs = await storage.getAdminActivityLogs({
        actorId: actorId as string,
        targetUserId: targetUserId as string,
        actionType: actionType as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== USER-CLIENT ACCESS ==============
  
  app.get("/api/user-client-access/user/:userId", requireSuperAdmin, async (req, res) => {
    try {
      const accessList = await storage.getUserClientAccessList(req.params.userId);
      res.json(accessList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/user-client-access/client/:clientId", requireSuperAdmin, async (req, res) => {
    try {
      const accessList = await storage.getClientUserAccessList(req.params.clientId);
      res.json(accessList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/user-client-access/:userId/:clientId", requireAuth, async (req, res) => {
    try {
      const access = await storage.getUserClientAccess(req.params.userId, req.params.clientId);
      res.json(access || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/user-client-access", requireSuperAdmin, async (req, res) => {
    try {
      const { userId, clientId, status, notes } = req.body;
      
      const existing = await storage.getUserClientAccess(userId, clientId);
      if (existing) {
        const updated = await storage.updateUserClientAccess(existing.id, { 
          status, 
          notes,
          assignedBy: req.session.userId! 
        });
        
        await storage.createAdminActivityLog({
          actorId: req.session.userId!,
          targetUserId: userId,
          actionType: `client_access_${status}`,
          beforeState: { status: existing.status },
          afterState: { status },
          reason: notes,
          ipAddress: req.ip || "Unknown",
        });
        
        return res.json(updated);
      }
      
      const access = await storage.createUserClientAccess({
        userId,
        clientId,
        status: status || "assigned",
        assignedBy: req.session.userId!,
        notes,
      });
      
      await storage.createAdminActivityLog({
        actorId: req.session.userId!,
        targetUserId: userId,
        actionType: "client_access_assigned",
        afterState: { clientId, status: access.status },
        reason: notes,
        ipAddress: req.ip || "Unknown",
      });
      
      res.status(201).json(access);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/user-client-access/:id", requireSuperAdmin, async (req, res) => {
    try {
      const { status, notes, suspendReason } = req.body;
      
      const updated = await storage.updateUserClientAccess(req.params.id, { 
        status, 
        notes,
        suspendReason: status === "suspended" ? suspendReason : null,
      });
      
      if (!updated) {
        return res.status(404).json({ error: "Access record not found" });
      }
      
      await storage.createAdminActivityLog({
        actorId: req.session.userId!,
        targetUserId: updated.userId,
        actionType: `client_access_${status}`,
        afterState: { clientId: updated.clientId, status },
        reason: notes || suspendReason,
        ipAddress: req.ip || "Unknown",
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/user-client-access/:id", requireSuperAdmin, async (req, res) => {
    try {
      await storage.deleteUserClientAccess(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== AUDIT CONTEXT ==============

  app.get("/api/audit-context", requireAuth, async (req, res) => {
    try {
      const context = await storage.getActiveAuditContext(req.session.userId!);
      res.json(context || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/audit-context", requireAuth, async (req, res) => {
    try {
      const { clientId, departmentId, period, startDate, endDate } = req.body;
      
      if (!clientId || !startDate || !endDate) {
        return res.status(400).json({ error: "clientId, startDate, and endDate are required" });
      }
      
      const context = await storage.createAuditContext({
        userId: req.session.userId!,
        clientId,
        departmentId,
        period: period || "daily",
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: "active",
      });
      
      res.status(201).json(context);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/audit-context", requireAuth, async (req, res) => {
    try {
      await storage.clearAuditContext(req.session.userId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== AUDITS ==============

  app.get("/api/audits", requireAuth, async (req, res) => {
    try {
      const { clientId, departmentId, status } = req.query;
      const audits = await storage.getAudits({
        clientId: clientId as string,
        departmentId: departmentId as string,
        status: status as string,
      });
      res.json(audits);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/audits/:id", requireAuth, async (req, res) => {
    try {
      const audit = await storage.getAudit(req.params.id);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      res.json(audit);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/audits", requireAuth, async (req, res) => {
    try {
      const { clientId, departmentId, period, startDate, endDate, notes } = req.body;
      
      const existingAudit = await storage.getAuditByPeriod(
        clientId, 
        departmentId, 
        new Date(startDate), 
        new Date(endDate)
      );
      
      if (existingAudit) {
        return res.json(existingAudit);
      }
      
      const audit = await storage.createAudit({
        clientId,
        departmentId,
        period: period || "daily",
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: "draft",
        notes,
        createdBy: req.session.userId!,
      });
      
      res.status(201).json(audit);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/audits/:id", requireAuth, async (req, res) => {
    try {
      const audit = await storage.getAudit(req.params.id);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      
      const user = await storage.getUser(req.session.userId!);
      
      if (audit.status !== "draft" && user?.role !== "super_admin") {
        const hasReissuePermission = await storage.getAuditReissuePermission(audit.id, req.session.userId!);
        if (!hasReissuePermission) {
          return res.status(403).json({ error: "Cannot edit submitted audit without reissue permission" });
        }
      }
      
      const updated = await storage.updateAudit(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/audits/:id/submit", requireAuth, async (req, res) => {
    try {
      const audit = await storage.getAudit(req.params.id);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      
      if (audit.status !== "draft") {
        return res.status(400).json({ error: "Audit has already been submitted" });
      }
      
      const submitted = await storage.submitAudit(req.params.id, req.session.userId!);
      
      await storage.createAuditChangeLog({
        auditId: audit.id,
        userId: req.session.userId!,
        clientId: audit.clientId,
        departmentId: audit.departmentId,
        actionType: "audit_submitted",
        entityType: "audit",
        entityId: audit.id,
        beforeState: { status: "draft" },
        afterState: { status: "submitted" },
      });
      
      res.json(submitted);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/audits/:id/lock", requireSuperAdmin, async (req, res) => {
    try {
      const audit = await storage.getAudit(req.params.id);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      
      const locked = await storage.lockAudit(req.params.id, req.session.userId!);
      
      await storage.createAuditChangeLog({
        auditId: audit.id,
        userId: req.session.userId!,
        clientId: audit.clientId,
        departmentId: audit.departmentId,
        actionType: "audit_locked",
        entityType: "audit",
        entityId: audit.id,
        beforeState: { status: audit.status },
        afterState: { status: "locked" },
      });
      
      res.json(locked);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== AUDIT REISSUE PERMISSIONS ==============

  app.get("/api/audits/:id/reissue-permissions", requireSuperAdmin, async (req, res) => {
    try {
      const permissions = await storage.getAuditReissuePermissions(req.params.id);
      res.json(permissions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/audits/:id/reissue-permissions", requireSuperAdmin, async (req, res) => {
    try {
      const { grantedTo, expiresAt, scope, reason } = req.body;
      
      const permission = await storage.createAuditReissuePermission({
        auditId: req.params.id,
        grantedTo,
        grantedBy: req.session.userId!,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        scope: scope || "edit_after_submission",
        reason,
      });
      
      const audit = await storage.getAudit(req.params.id);
      
      await storage.createAuditChangeLog({
        auditId: req.params.id,
        userId: req.session.userId!,
        clientId: audit?.clientId,
        departmentId: audit?.departmentId,
        actionType: "reissue_permission_granted",
        entityType: "audit_reissue_permission",
        entityId: permission.id,
        afterState: { grantedTo, scope, reason },
      });
      
      res.status(201).json(permission);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/audits/:id/reissue-permissions/:permissionId", requireSuperAdmin, async (req, res) => {
    try {
      await storage.revokeAuditReissuePermission(req.params.permissionId);
      
      await storage.createAuditChangeLog({
        auditId: req.params.id,
        userId: req.session.userId!,
        actionType: "reissue_permission_revoked",
        entityType: "audit_reissue_permission",
        entityId: req.params.permissionId,
      });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== AUDIT CHANGE LOG ==============

  app.get("/api/audits/:id/change-log", requireAuth, async (req, res) => {
    try {
      const logs = await storage.getAuditChangeLogs(req.params.id);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== CLIENTS ==============
  app.get("/api/clients", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      const clients = await storage.getClients();
      
      if (user?.role !== "super_admin" && user?.accessScope && !user.accessScope.global) {
        const filteredClients = clients.filter(c => 
          user.accessScope?.clientIds?.includes(c.id)
        );
        return res.json(filteredClients);
      }
      
      res.json(clients);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clients", requireSuperAdmin, async (req, res) => {
    try {
      const data = insertClientSchema.parse(req.body);
      const client = await storage.createClient(data);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Client",
        entity: client.name,
        entityId: client.id,
        details: `New client added: ${client.name}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(client);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/clients/:id", requireSuperAdmin, async (req, res) => {
    try {
      const client = await storage.updateClient(req.params.id, req.body);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/clients/:id", requireSuperAdmin, async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Client",
        entity: "Client",
        entityId: req.params.id,
        details: `Client deleted`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== CATEGORIES ==============
  app.get("/api/clients/:clientId/categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getCategories(req.params.clientId);
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      const category = await storage.getCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/categories", requireSupervisorOrAbove, async (req, res) => {
    try {
      const data = insertCategorySchema.parse({
        ...req.body,
        createdBy: req.session.userId
      });
      const category = await storage.createCategory(data);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Category",
        entity: "Category",
        entityId: category.id,
        details: `New category added: ${category.name}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(category);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/categories/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      const category = await storage.updateCategory(req.params.id, req.body);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/categories/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Category",
        entity: "Category",
        entityId: req.params.id,
        details: `Category deleted`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== DEPARTMENTS ==============
  
  // Get departments for a client
  app.get("/api/clients/:clientId/departments", requireAuth, async (req, res) => {
    try {
      const departments = await storage.getDepartments(req.params.clientId);
      res.json(departments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get departments by category
  app.get("/api/categories/:categoryId/departments", requireAuth, async (req, res) => {
    try {
      const departments = await storage.getDepartmentsByCategory(req.params.categoryId);
      res.json(departments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create department for a client
  app.post("/api/clients/:clientId/departments", requireSupervisorOrAbove, async (req, res) => {
    try {
      const { clientId } = req.params;
      
      // Check for duplicate name
      const nameExists = await storage.checkDepartmentNameExists(clientId, req.body.name);
      if (nameExists) {
        return res.status(400).json({ error: "A department with this name already exists for this client" });
      }
      
      const data = { 
        ...req.body, 
        clientId,
        createdBy: req.session.userId
      };
      const parsed = insertDepartmentSchema.parse(data);
      const department = await storage.createDepartment(parsed);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Department",
        entity: "Department",
        entityId: department.id,
        details: `New department added: ${department.name}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(department);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Bulk create departments for a client
  app.post("/api/departments/bulk", requireSupervisorOrAbove, async (req, res) => {
    try {
      const { departments: deptList, clientId, categoryId } = req.body;
      
      if (!Array.isArray(deptList) || deptList.length === 0) {
        return res.status(400).json({ error: "departments array is required" });
      }
      
      if (!clientId) {
        return res.status(400).json({ error: "clientId is required" });
      }
      
      const insertData = deptList.map((name: string) => ({
        name: name.trim(),
        clientId,
        categoryId: categoryId || null,
        status: "active",
        createdBy: req.session.userId,
      })).filter((d: { name: string }) => d.name.length > 0);
      
      const created = await storage.createDepartmentsBulk(insertData);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Bulk Created Departments",
        entity: "Department",
        entityId: null,
        details: `Bulk created ${created.length} departments`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(created);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/departments", requireAuth, async (req, res) => {
    try {
      const departments = await storage.getAllDepartments();
      res.json(departments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/departments/:id", requireAuth, async (req, res) => {
    try {
      const department = await storage.getDepartment(req.params.id);
      if (!department) {
        return res.status(404).json({ error: "Department not found" });
      }
      res.json(department);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Check if department can be deleted (not used in any records)
  app.get("/api/departments/:id/usage", requireAuth, async (req, res) => {
    try {
      const isUsed = await storage.checkDepartmentUsage(req.params.id);
      res.json({ isUsed });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/departments", requireSupervisorOrAbove, async (req, res) => {
    try {
      const data = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(data);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Department",
        entity: "Department",
        entityId: department.id,
        details: `New department added: ${department.name}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(department);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/departments/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      const existingDept = await storage.getDepartment(req.params.id);
      const department = await storage.updateDepartment(req.params.id, req.body);
      if (!department) {
        return res.status(404).json({ error: "Department not found" });
      }
      
      if (req.body.status === "inactive" && existingDept?.status === "active") {
        await storage.createAuditLog({
          userId: req.session.userId!,
          action: "Deactivated Department",
          entity: "Department",
          entityId: department.id,
          details: `Department deactivated: ${department.name}. Reason: ${req.body.deactivationReason || "Not specified"}`,
          ipAddress: req.ip || "Unknown",
        });
      }
      
      res.json(department);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/departments/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      const isUsed = await storage.checkDepartmentUsage(req.params.id);
      if (isUsed) {
        return res.status(400).json({ 
          error: "Cannot delete department that has been used in records. Deactivate it instead." 
        });
      }
      
      await storage.deleteDepartment(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Department",
        entity: "Department",
        entityId: req.params.id,
        details: `Department deleted`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== SUPPLIERS ==============
  app.get("/api/suppliers", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.query;
      if (!clientId) {
        return res.status(400).json({ error: "clientId query parameter is required" });
      }
      const suppliers = await storage.getSuppliers(clientId as string);
      res.json(suppliers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/suppliers/:id", requireAuth, async (req, res) => {
    try {
      const supplier = await storage.getSupplier(req.params.id);
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/suppliers", requireAuth, async (req, res) => {
    try {
      const data = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(data);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Supplier",
        entity: "Supplier",
        entityId: supplier.id,
        details: `New supplier added: ${supplier.name}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(supplier);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/suppliers/:id", requireAuth, async (req, res) => {
    try {
      const supplier = await storage.updateSupplier(req.params.id, req.body);
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/suppliers/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      await storage.deleteSupplier(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Supplier",
        entity: "Supplier",
        entityId: req.params.id,
        details: `Supplier deleted`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== ITEMS ==============
  app.get("/api/items", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.query;
      if (!clientId) {
        return res.status(400).json({ error: "clientId query parameter is required" });
      }
      const items = await storage.getItems(clientId as string);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/items/:id", requireAuth, async (req, res) => {
    try {
      const item = await storage.getItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/items", requireAuth, async (req, res) => {
    try {
      const data = insertItemSchema.parse(req.body);
      const item = await storage.createItem(data);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Item",
        entity: "Item",
        entityId: item.id,
        details: `New item added: ${item.name}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/items/:id", requireAuth, async (req, res) => {
    try {
      const { purchaseQty, ...updateData } = req.body;
      
      const existingItem = await storage.getItem(req.params.id);
      if (!existingItem) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      const item = await storage.updateItem(req.params.id, updateData);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      if (purchaseQty && parseFloat(purchaseQty) > 0) {
        // Find departments where name contains "Main Store" or "Warehouse" OR inventoryType is MAIN_STORE/WAREHOUSE
        const allDepts = await storage.getInventoryDepartments(item.clientId);
        const storeNamesList = await storage.getStoreNames();
        const storeNameMap = new Map(storeNamesList.map(s => [s.id, s.name]));

        // Get the client-level departments (the "SRD" departments the user likely refers to)
        const clientDepts = await storage.getDepartments(item.clientId);
        const clientDeptMap = new Map(clientDepts.map(d => [d.id, d]));

        const qualifyingDepts = allDepts.filter(d => {
          const storeName = storeNameMap.get(d.storeNameId)?.toLowerCase() || "";
          // Check if this inventory department links to a department named "Main Store" or "Warehouse"
          // In this schema, inventory_departments link to store_names, which might be linked to departments
          return (
            d.inventoryType === "MAIN_STORE" || 
            d.inventoryType === "WAREHOUSE" ||
            storeName.includes("main store") ||
            storeName.includes("warehouse")
          );
        });
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (const dept of qualifyingDepts) {
          await storage.addPurchaseToStoreStock(
            item.clientId,
            dept.id,
            item.id,
            parseFloat(purchaseQty),
            item.costPrice || "0.00",
            today
          );
        }
        
        if (qualifyingDepts.length > 0) {
          await storage.createAuditLog({
            userId: req.session.userId!,
            action: "Item Purchase Captured",
            entity: "Item",
            entityId: item.id,
            details: `Purchase of ${purchaseQty} ${item.purchaseUnit || item.unit} captured for ${qualifyingDepts.length} store(s)`,
            ipAddress: req.ip || "Unknown",
          });
        }
      }
      
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/items/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      await storage.deleteItem(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Item",
        entity: "Item",
        entityId: req.params.id,
        details: `Item deleted`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== STOCK COUNTS ==============
  app.get("/api/stock-counts", requireAuth, async (req, res) => {
    try {
      const { departmentId, date } = req.query;
      if (!departmentId) {
        return res.status(400).json({ error: "departmentId query parameter is required" });
      }
      const stockCounts = await storage.getStockCounts(
        departmentId as string,
        date ? new Date(date as string) : undefined
      );
      res.json(stockCounts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/stock-counts/:id", requireAuth, async (req, res) => {
    try {
      const stockCount = await storage.getStockCount(req.params.id);
      if (!stockCount) {
        return res.status(404).json({ error: "Stock count not found" });
      }
      res.json(stockCount);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stock-counts", requireAuth, async (req, res) => {
    try {
      const data = insertStockCountSchema.parse({
        ...req.body,
        createdBy: req.session.userId!,
      });
      const stockCount = await storage.createStockCount(data);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Stock Count",
        entity: "StockCount",
        entityId: stockCount.id,
        details: `Stock count recorded`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(stockCount);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/stock-counts/:id", requireAuth, async (req, res) => {
    try {
      const stockCount = await storage.updateStockCount(req.params.id, req.body);
      if (!stockCount) {
        return res.status(404).json({ error: "Stock count not found" });
      }
      res.json(stockCount);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/stock-counts/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      await storage.deleteStockCount(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Stock Count",
        entity: "StockCount",
        entityId: req.params.id,
        details: `Stock count deleted`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== STORE ISSUES ==============
  app.get("/api/store-issues", requireAuth, async (req, res) => {
    try {
      const { clientId, date, toDepartmentId } = req.query;
      
      if (toDepartmentId) {
        const dateFilter = date ? new Date(date as string) : undefined;
        const issues = await storage.getStoreIssuesByDepartment(toDepartmentId as string, dateFilter);
        return res.json(issues);
      }
      
      if (!clientId) {
        return res.status(400).json({ error: "clientId is required" });
      }
      
      const dateFilter = date ? new Date(date as string) : undefined;
      const issues = await storage.getStoreIssues(clientId as string, dateFilter);
      res.json(issues);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/store-issues/:id", requireAuth, async (req, res) => {
    try {
      const issue = await storage.getStoreIssue(req.params.id);
      if (!issue) {
        return res.status(404).json({ error: "Store issue not found" });
      }
      res.json(issue);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/store-issues/:id/lines", requireAuth, async (req, res) => {
    try {
      const lines = await storage.getStoreIssueLines(req.params.id);
      res.json(lines);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/store-issues", requireAuth, async (req, res) => {
    try {
      const { lines, ...issueData } = req.body;
      
      const data = insertStoreIssueSchema.parse({
        ...issueData,
        issueDate: issueData.issueDate ? new Date(issueData.issueDate) : undefined,
        createdBy: req.session.userId!,
      });
      
      const issue = await storage.createStoreIssue(data);
      
      if (lines && Array.isArray(lines) && lines.length > 0) {
        const lineData = lines.map((line: any) => 
          insertStoreIssueLineSchema.parse({
            storeIssueId: issue.id,
            itemId: line.itemId,
            qtyIssued: line.qtyIssued,
            costPriceSnapshot: line.costPriceSnapshot || "0.00",
          })
        );
        await storage.createStoreIssueLinesBulk(lineData);
      }
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Store Issue",
        entity: "StoreIssue",
        entityId: issue.id,
        details: `Store issue created for ${issue.issueDate}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(issue);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/store-issues/:id", requireAuth, async (req, res) => {
    try {
      const { lines, ...updateData } = req.body;
      
      const issue = await storage.updateStoreIssue(req.params.id, updateData);
      if (!issue) {
        return res.status(404).json({ error: "Store issue not found" });
      }
      
      if (lines && Array.isArray(lines)) {
        await storage.deleteStoreIssueLines(req.params.id);
        if (lines.length > 0) {
          const lineData = lines.map((line: any) => 
            insertStoreIssueLineSchema.parse({
              storeIssueId: issue.id,
              itemId: line.itemId,
              qtyIssued: line.qtyIssued,
              costPriceSnapshot: line.costPriceSnapshot || "0.00",
            })
          );
          await storage.createStoreIssueLinesBulk(lineData);
        }
      }
      
      res.json(issue);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/store-issues/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      await storage.deleteStoreIssue(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Store Issue",
        entity: "StoreIssue",
        entityId: req.params.id,
        details: `Store issue deleted`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get issued qty for a department/item on a specific date
  app.get("/api/store-issues/issued-qty", requireAuth, async (req, res) => {
    try {
      const { departmentId, itemId, date } = req.query;
      
      if (!departmentId || !itemId || !date) {
        return res.status(400).json({ error: "departmentId, itemId, and date are required" });
      }
      
      const issuedQty = await storage.getIssuedQtyForDepartment(
        departmentId as string,
        itemId as string,
        new Date(date as string)
      );
      
      res.json({ issuedQty });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== STORE STOCK ==============
  app.get("/api/store-stock", requireAuth, async (req, res) => {
    try {
      const { clientId, storeDepartmentId, date } = req.query;
      
      if (!clientId || !storeDepartmentId) {
        return res.status(400).json({ error: "clientId and storeDepartmentId are required" });
      }
      
      const dateFilter = date ? new Date(date as string) : undefined;
      const stock = await storage.getStoreStock(
        clientId as string,
        storeDepartmentId as string,
        dateFilter
      );
      res.json(stock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/store-stock", requireAuth, async (req, res) => {
    try {
      const data = insertStoreStockSchema.parse({
        ...req.body,
        createdBy: req.session.userId!,
      });
      
      const stock = await storage.upsertStoreStock(data);
      res.json(stock);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/store-stock/:id", requireAuth, async (req, res) => {
    try {
      const stock = await storage.updateStoreStock(req.params.id, req.body);
      if (!stock) {
        return res.status(404).json({ error: "Store stock not found" });
      }
      res.json(stock);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== STORE NAMES ==============
  app.get("/api/store-names", requireAuth, async (req, res) => {
    try {
      const storeNames = await storage.getStoreNames();
      res.json(storeNames);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/store-names/:id", requireAuth, async (req, res) => {
    try {
      const storeName = await storage.getStoreName(req.params.id);
      if (!storeName) {
        return res.status(404).json({ error: "Store name not found" });
      }
      res.json(storeName);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/store-names", requireAuth, async (req, res) => {
    try {
      const data = insertStoreNameSchema.parse(req.body);
      
      const existing = await storage.getStoreNameByName(data.name);
      if (existing) {
        return res.status(409).json({ error: "Store name already exists" });
      }
      
      const storeName = await storage.createStoreName(data);
      res.status(201).json(storeName);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/store-names/:id", requireAuth, async (req, res) => {
    try {
      const data = insertStoreNameSchema.partial().parse(req.body);
      
      if (data.name) {
        const existing = await storage.getStoreNameByName(data.name);
        if (existing && existing.id !== req.params.id) {
          return res.status(409).json({ error: "Store name already exists" });
        }
      }
      
      const storeName = await storage.updateStoreName(req.params.id, data);
      if (!storeName) {
        return res.status(404).json({ error: "Store name not found" });
      }
      res.json(storeName);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/store-names/:id", requireAuth, requireRole(["super_admin"]), async (req, res) => {
    try {
      await storage.deleteStoreName(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message?.includes("violates foreign key")) {
        return res.status(400).json({ error: "Cannot delete store name - it is linked to inventory departments" });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // ============== INVENTORY DEPARTMENTS ==============
  app.get("/api/clients/:clientId/inventory-departments", requireAuth, async (req, res) => {
    try {
      const inventoryDepts = await storage.getInventoryDepartments(req.params.clientId);
      res.json(inventoryDepts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/inventory-departments/:id", requireAuth, async (req, res) => {
    try {
      const dept = await storage.getInventoryDepartment(req.params.id);
      if (!dept) {
        return res.status(404).json({ error: "Inventory department not found" });
      }
      res.json(dept);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clients/:clientId/inventory-departments", requireAuth, async (req, res) => {
    try {
      const clientId = req.params.clientId;
      const data = insertInventoryDepartmentSchema.parse({
        ...req.body,
        clientId
      });
      
      if (!INVENTORY_TYPES.includes(data.inventoryType as any)) {
        return res.status(400).json({ error: "Invalid inventory type" });
      }
      
      if (data.inventoryType === "MAIN_STORE" || data.inventoryType === "WAREHOUSE") {
        const existing = await storage.getInventoryDepartmentByType(clientId, data.inventoryType);
        if (existing) {
          return res.status(409).json({ 
            error: `Only one ${data.inventoryType.replace("_", " ").toLowerCase()} is allowed per client` 
          });
        }
      }
      
      const isDuplicate = await storage.checkInventoryDepartmentDuplicate(
        clientId, 
        data.storeNameId, 
        data.inventoryType
      );
      if (isDuplicate) {
        return res.status(409).json({ error: "This store name is already linked with this inventory type" });
      }
      
      const dept = await storage.createInventoryDepartment(data);
      res.status(201).json(dept);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/inventory-departments/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getInventoryDepartment(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Inventory department not found" });
      }
      
      const data = insertInventoryDepartmentSchema.partial().parse(req.body);
      
      if (data.inventoryType && (data.inventoryType === "MAIN_STORE" || data.inventoryType === "WAREHOUSE")) {
        const typeExists = await storage.getInventoryDepartmentByType(existing.clientId, data.inventoryType);
        if (typeExists && typeExists.id !== req.params.id) {
          return res.status(409).json({ 
            error: `Only one ${data.inventoryType.replace("_", " ").toLowerCase()} is allowed per client` 
          });
        }
      }
      
      if (data.storeNameId || data.inventoryType) {
        const isDuplicate = await storage.checkInventoryDepartmentDuplicate(
          existing.clientId,
          data.storeNameId || existing.storeNameId,
          data.inventoryType || existing.inventoryType,
          req.params.id
        );
        if (isDuplicate) {
          return res.status(409).json({ error: "This store name is already linked with this inventory type" });
        }
      }
      
      const dept = await storage.updateInventoryDepartment(req.params.id, data);
      res.json(dept);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/inventory-departments/:id", requireAuth, requireRole(["super_admin"]), async (req, res) => {
    try {
      await storage.deleteInventoryDepartment(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== CLIENT-SCOPED STORE STOCK ==============
  app.get("/api/clients/:clientId/store-stock", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { departmentId, date } = req.query;
      
      if (!departmentId) {
        return res.status(400).json({ error: "departmentId is required" });
      }
      
      const dateFilter = date ? new Date(date as string) : undefined;
      const stock = await storage.getStoreStock(
        clientId,
        departmentId as string,
        dateFilter
      );
      res.json(stock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clients/:clientId/store-stock", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const data = insertStoreStockSchema.parse({
        ...req.body,
        clientId,
        createdBy: req.session.userId!,
      });
      
      const stock = await storage.upsertStoreStock(data);
      res.json(stock);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== CLIENT-SCOPED STORE ISSUES ==============
  app.get("/api/clients/:clientId/store-issues", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { date } = req.query;
      
      const dateFilter = date ? new Date(date as string) : undefined;
      const issues = await storage.getStoreIssues(clientId, dateFilter);
      res.json(issues);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clients/:clientId/store-issues", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { fromDepartmentId, toDepartmentId, issueDate, notes, lines } = req.body;
      
      if (!fromDepartmentId || !toDepartmentId || !issueDate || !lines || lines.length === 0) {
        return res.status(400).json({ error: "fromDepartmentId, toDepartmentId, issueDate, and lines are required" });
      }
      
      const issue = await storage.createStoreIssue({
        clientId,
        fromDepartmentId,
        toDepartmentId,
        issueDate: new Date(issueDate),
        notes: notes || null,
        status: "posted",
        createdBy: req.session.userId!,
      });
      
      for (const line of lines) {
        await storage.createStoreIssueLine({
          storeIssueId: issue.id,
          itemId: line.itemId,
          qtyIssued: line.qtyIssued.toString(),
        });
        
        const dateForStock = new Date(issueDate);
        
        const fromItem = await storage.getItem(line.itemId);
        const costPrice = fromItem?.costPrice || "0.00";
        
        const existingFromStock = await storage.getStoreStockByItem(fromDepartmentId, line.itemId, dateForStock);
        if (existingFromStock) {
          const currentIssued = parseFloat(existingFromStock.issuedQty || "0");
          const newIssued = currentIssued + parseFloat(line.qtyIssued);
          await storage.updateStoreStock(existingFromStock.id, { issuedQty: newIssued.toString() });
        } else {
          await storage.createStoreStock({
            clientId,
            storeDepartmentId: fromDepartmentId,
            itemId: line.itemId,
            date: dateForStock,
            openingQty: "0",
            addedQty: "0",
            issuedQty: line.qtyIssued.toString(),
            closingQty: "0",
            costPriceSnapshot: costPrice,
            createdBy: req.session.userId!,
          });
        }
        
        const existingToStock = await storage.getStoreStockByItem(toDepartmentId, line.itemId, dateForStock);
        if (existingToStock) {
          const currentAdded = parseFloat(existingToStock.addedQty || "0");
          const newAdded = currentAdded + parseFloat(line.qtyIssued);
          await storage.updateStoreStock(existingToStock.id, { addedQty: newAdded.toString() });
        } else {
          await storage.createStoreStock({
            clientId,
            storeDepartmentId: toDepartmentId,
            itemId: line.itemId,
            date: dateForStock,
            openingQty: "0",
            addedQty: line.qtyIssued.toString(),
            issuedQty: "0",
            closingQty: "0",
            costPriceSnapshot: costPrice,
            createdBy: req.session.userId!,
          });
        }
      }
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Store Issue",
        entity: "StoreIssue",
        entityId: issue.id,
        details: `Issue from ${fromDepartmentId} to ${toDepartmentId}, ${lines.length} item(s)`,
        ipAddress: req.ip || "Unknown",
      });
      
      res.status(201).json(issue);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== SALES ENTRIES ==============
  app.get("/api/sales-entries", requireAuth, async (req, res) => {
    try {
      const { clientId, departmentId, date, startDate, endDate } = req.query;
      
      if (departmentId) {
        // If a specific date is provided, use it as both start and end
        const dateFilter = date ? new Date(date as string) : undefined;
        const start = dateFilter || (startDate ? new Date(startDate as string) : undefined);
        const end = dateFilter || (endDate ? new Date(endDate as string) : undefined);
        
        const sales = await storage.getSalesEntries(
          departmentId as string,
          start,
          end
        );
        return res.json(sales);
      }
      
      if (clientId) {
        const dateFilter = date ? new Date(date as string) : undefined;
        const start = dateFilter || (startDate ? new Date(startDate as string) : undefined);
        const end = dateFilter || (endDate ? new Date(endDate as string) : undefined);
        
        const sales = await storage.getSalesEntriesByClient(
          clientId as string,
          start,
          end
        );
        return res.json(sales);
      }
      
      const sales = await storage.getAllSalesEntries();
      res.json(sales);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Sales summary endpoint - supports clientId+date with optional departmentId filter
  app.get("/api/sales-entries/summary", requireAuth, async (req, res) => {
    try {
      const { clientId, departmentId, date } = req.query;
      
      if (!clientId || !date) {
        return res.json({
          totalCash: 0,
          totalPos: 0,
          totalTransfer: 0,
          totalVoids: 0,
          grandTotal: 0,
          entriesCount: 0,
          departmentsCount: 0,
          avgPerEntry: 0
        });
      }
      
      const dateObj = new Date(date as string);
      
      // Use the new storage method that aggregates across departments
      const summary = await storage.getSalesSummaryForClient(
        clientId as string, 
        dateObj, 
        departmentId as string | undefined
      );
      
      res.json({
        ...summary,
        avgPerEntry: summary.entriesCount > 0 ? Math.round(summary.grandTotal / summary.entriesCount) : 0
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/departments/:departmentId/sales", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const sales = await storage.getSalesEntries(
        req.params.departmentId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(sales);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sales-entries/:id", requireAuth, async (req, res) => {
    try {
      const entry = await storage.getSalesEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Sales entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sales-entries", requireAuth, async (req, res) => {
    try {
      // Convert date string to Date object if needed
      const bodyWithDate = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined,
        createdBy: req.session.userId!,
      };
      const data = insertSalesEntrySchema.parse(bodyWithDate);
      const entry = await storage.createSalesEntry(data);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Sales Entry",
        entity: "Sales",
        entityId: entry.id,
        details: `Sales entry for ${req.body.shift || 'full'} shift`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/sales", requireAuth, async (req, res) => {
    try {
      // Convert date string to Date object if needed
      const bodyWithDate = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined,
        createdBy: req.session.userId!,
      };
      const data = insertSalesEntrySchema.parse(bodyWithDate);
      const entry = await storage.createSalesEntry(data);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Sales Entry",
        entity: "Sales",
        entityId: entry.id,
        details: `Sales entry for ${req.body.shift || 'full'} shift`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/sales-entries/import", requireAuth, async (req, res) => {
    try {
      res.json({
        success: true,
        message: "POS import functionality is a placeholder. Implement integration with POS system.",
        importedCount: 0,
        status: "stub"
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/sales-entries/:id", requireAuth, async (req, res) => {
    try {
      const entry = await storage.updateSalesEntry(req.params.id, req.body);
      if (!entry) {
        return res.status(404).json({ error: "Sales entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/sales/:id", requireAuth, async (req, res) => {
    try {
      const entry = await storage.updateSalesEntry(req.params.id, req.body);
      if (!entry) {
        return res.status(404).json({ error: "Sales entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/sales-entries/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      await storage.deleteSalesEntry(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Sales Entry",
        entity: "Sales",
        entityId: req.params.id,
        details: `Sales entry deleted`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== PURCHASES ==============
  app.get("/api/purchases", requireAuth, async (req, res) => {
    try {
      const { outletId } = req.query;
      
      if (outletId) {
        const purchases = await storage.getPurchases(outletId as string);
        return res.json(purchases);
      }
      
      const purchases = await storage.getAllPurchases();
      res.json(purchases);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/outlets/:outletId/purchases", requireAuth, async (req, res) => {
    try {
      const purchases = await storage.getPurchases(req.params.outletId);
      res.json(purchases);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/purchases/:id", requireAuth, async (req, res) => {
    try {
      const purchase = await storage.getPurchase(req.params.id);
      if (!purchase) {
        return res.status(404).json({ error: "Purchase not found" });
      }
      res.json(purchase);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/purchases/:id/lines", requireAuth, async (req, res) => {
    try {
      const lines = await storage.getPurchaseLines(req.params.id);
      res.json(lines);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/purchases", requireAuth, async (req, res) => {
    try {
      const { lines, ...purchaseData } = req.body;
      
      const data = insertPurchaseSchema.parse({
        ...purchaseData,
        invoiceDate: purchaseData.invoiceDate ? new Date(purchaseData.invoiceDate) : undefined,
        createdBy: req.session.userId!,
      });
      const purchase = await storage.createPurchase(data);

      if (lines && Array.isArray(lines)) {
        for (const line of lines) {
          const lineData = insertPurchaseLineSchema.parse({
            ...line,
            purchaseId: purchase.id,
          });
          await storage.createPurchaseLine(lineData);
        }
      }
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Purchase",
        entity: "Purchase",
        entityId: purchase.id,
        details: `Purchase invoice: ${purchase.invoiceRef}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(purchase);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/purchases/:id", requireAuth, async (req, res) => {
    try {
      const purchase = await storage.updatePurchase(req.params.id, req.body);
      if (!purchase) {
        return res.status(404).json({ error: "Purchase not found" });
      }
      res.json(purchase);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/purchases/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      await storage.deletePurchase(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Purchase",
        entity: "Purchase",
        entityId: req.params.id,
        details: `Purchase deleted`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== STOCK MOVEMENTS ==============
  app.get("/api/stock-movements", requireAuth, async (req, res) => {
    try {
      const { clientId, departmentId } = req.query;
      
      if (departmentId) {
        const movements = await storage.getStockMovementsByDepartment(departmentId as string);
        return res.json(movements);
      }
      
      if (clientId) {
        const movements = await storage.getStockMovements(clientId as string);
        return res.json(movements);
      }
      
      res.json([]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/outlets/:outletId/movements", requireAuth, async (req, res) => {
    try {
      const movements = await storage.getStockMovements(req.params.outletId);
      res.json(movements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stock-movements", requireAuth, async (req, res) => {
    try {
      const data = insertStockMovementSchema.parse({
        ...req.body,
        createdBy: req.session.userId!,
      });
      const movement = await storage.createStockMovement(data);
      res.json(movement);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/movements", requireAuth, async (req, res) => {
    try {
      const data = insertStockMovementSchema.parse({
        ...req.body,
        createdBy: req.session.userId!,
      });
      const movement = await storage.createStockMovement(data);
      res.json(movement);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/stock-movements/:id", requireAuth, async (req, res) => {
    try {
      const movement = await storage.getStockMovement(req.params.id);
      if (!movement) {
        return res.status(404).json({ error: "Stock movement not found" });
      }
      res.json(movement);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/stock-movements/:id", requireAuth, async (req, res) => {
    try {
      const movement = await storage.updateStockMovement(req.params.id, req.body);
      if (!movement) {
        return res.status(404).json({ error: "Stock movement not found" });
      }
      res.json(movement);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/stock-movements/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      await storage.deleteStockMovement(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Stock Movement",
        entity: "StockMovement",
        entityId: req.params.id,
        details: `Stock movement deleted`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== RECONCILIATIONS ==============
  app.get("/api/reconciliations", requireAuth, async (req, res) => {
    try {
      const { departmentId, date } = req.query;
      
      if (departmentId) {
        const reconciliations = await storage.getReconciliations(
          departmentId as string,
          date ? new Date(date as string) : undefined
        );
        return res.json(reconciliations);
      }
      
      const reconciliations = await storage.getAllReconciliations();
      res.json(reconciliations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/departments/:departmentId/reconciliations", requireAuth, async (req, res) => {
    try {
      const { date } = req.query;
      const reconciliations = await storage.getReconciliations(
        req.params.departmentId,
        date ? new Date(date as string) : undefined
      );
      res.json(reconciliations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reconciliations/:id", requireAuth, async (req, res) => {
    try {
      const reconciliation = await storage.getReconciliation(req.params.id);
      if (!reconciliation) {
        return res.status(404).json({ error: "Reconciliation not found" });
      }
      res.json(reconciliation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/reconciliations", requireAuth, async (req, res) => {
    try {
      const data = insertReconciliationSchema.parse({
        ...req.body,
        createdBy: req.session.userId!,
      });
      const reconciliation = await storage.createReconciliation(data);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Reconciliation",
        entity: "Reconciliation",
        entityId: reconciliation.id,
        details: `Reconciliation created for department`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(reconciliation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/reconciliations/compute", requireAuth, async (req, res) => {
    try {
      const { departmentId, date, openingStock, additions, physicalCount } = req.body;

      if (!departmentId || !date) {
        return res.status(400).json({ error: "Missing departmentId or date" });
      }

      // If detailed data provided, compute with it
      if (openingStock && additions && physicalCount) {
        const openingQty = parseFloat(openingStock.quantity || openingStock.totalQty || 0);
        const additionsQty = parseFloat(additions.quantity || additions.totalQty || 0);
        const physicalQty = parseFloat(physicalCount.quantity || physicalCount.totalQty || 0);

        const expectedClosing = openingQty + additionsQty;
        const varianceQty = physicalQty - expectedClosing;
        const unitValue = parseFloat(openingStock.unitValue || 10);
        const varianceValue = varianceQty * unitValue;

        return res.json({
          departmentId,
          date,
          openingStock,
          additions,
          expectedUsage: { quantity: 0 },
          physicalCount,
          expectedClosingQty: expectedClosing.toFixed(2),
          actualClosingQty: physicalQty.toFixed(2),
          varianceQty: varianceQty.toFixed(2),
          varianceValue: varianceValue.toFixed(2),
          status: varianceQty === 0 ? "balanced" : (Math.abs(varianceQty) > 10 ? "significant_variance" : "minor_variance")
        });
      }

      // Otherwise, create a simple reconciliation record from aggregated data
      const salesSummary = await storage.getSalesSummaryForDepartment(departmentId, new Date(date));
      const purchases = await storage.getPurchasesByDepartment(departmentId);
      const stockCounts = await storage.getStockCounts(departmentId, new Date(date));
      
      const purchasesTotal = purchases.reduce((sum, p) => sum + parseFloat(p.totalAmount || "0"), 0);
      const varianceQty = stockCounts.reduce((sum, c) => sum + parseFloat(c.varianceQty || "0"), 0);
      
      const reconciliation = await storage.createReconciliation({
        clientId: purchases[0]?.clientId || "",
        departmentId,
        date: new Date(date),
        openingQty: "0",
        purchasesQty: String(purchasesTotal),
        salesQty: String(salesSummary.totalSales),
        expectedClosingQty: "0",
        actualClosingQty: "0",
        varianceQty: String(varianceQty),
        varianceValue: String(varianceQty * 10),
        status: "submitted",
        createdBy: req.session.userId!,
      });

      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Submitted Reconciliation",
        entity: "Reconciliation",
        entityId: reconciliation.id,
        details: `Audit submitted for department ${departmentId}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(reconciliation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/reconciliations/:id", requireAuth, async (req, res) => {
    try {
      const reconciliation = await storage.updateReconciliation(req.params.id, req.body);
      if (!reconciliation) {
        return res.status(404).json({ error: "Reconciliation not found" });
      }
      res.json(reconciliation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/reconciliations/:id/approve", requireSupervisorOrAbove, async (req, res) => {
    try {
      const reconciliation = await storage.updateReconciliation(req.params.id, {
        status: "approved",
        approvedBy: req.session.userId!,
        approvedAt: new Date(),
      });
      
      if (!reconciliation) {
        return res.status(404).json({ error: "Reconciliation not found" });
      }

      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Approved Reconciliation",
        entity: "Reconciliation",
        entityId: req.params.id,
        details: `Reconciliation approved`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(reconciliation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/reconciliations/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      await storage.deleteReconciliation(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Reconciliation",
        entity: "Reconciliation",
        entityId: req.params.id,
        details: `Reconciliation deleted`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== EXCEPTIONS ==============
  app.get("/api/exceptions", requireAuth, async (req, res) => {
    try {
      const { clientId, departmentId, status, severity } = req.query;
      const exceptions = await storage.getExceptions({
        clientId: clientId as string | undefined,
        departmentId: departmentId as string | undefined,
        status: status as string | undefined,
        severity: severity as string | undefined,
      });
      res.json(exceptions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/exceptions/:id", requireAuth, async (req, res) => {
    try {
      const exception = await storage.getException(req.params.id);
      if (!exception) {
        return res.status(404).json({ error: "Exception not found" });
      }
      res.json(exception);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/exceptions", requireAuth, async (req, res) => {
    try {
      const data = insertExceptionSchema.parse({
        ...req.body,
        createdBy: req.session.userId!,
      });
      const exception = await storage.createException(data);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Exception",
        entity: exception.caseNumber,
        entityId: exception.id,
        details: exception.summary,
        ipAddress: req.ip || "Unknown",
      });

      res.json(exception);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/exceptions/:id", requireAuth, async (req, res) => {
    try {
      const updateData = { ...req.body };
      
      if (req.body.status === "resolved" && !req.body.resolvedAt) {
        updateData.resolvedAt = new Date();
      }
      
      const exception = await storage.updateException(req.params.id, updateData);
      if (!exception) {
        return res.status(404).json({ error: "Exception not found" });
      }
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Updated Exception",
        entity: exception.caseNumber,
        entityId: exception.id,
        details: `Exception status: ${exception.status}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(exception);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/exceptions/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      const exception = await storage.getException(req.params.id);
      if (!exception) {
        return res.status(404).json({ error: "Exception not found" });
      }
      
      await storage.deleteException(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Exception",
        entity: exception.caseNumber,
        entityId: req.params.id,
        details: `Exception deleted`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== EXCEPTION COMMENTS ==============
  app.get("/api/exceptions/:exceptionId/comments", requireAuth, async (req, res) => {
    try {
      const comments = await storage.getExceptionComments(req.params.exceptionId);
      res.json(comments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/exceptions/:exceptionId/comments", requireAuth, async (req, res) => {
    try {
      const data = insertExceptionCommentSchema.parse({
        exceptionId: req.params.exceptionId,
        comment: req.body.comment,
        createdBy: req.session.userId!,
      });
      const comment = await storage.createExceptionComment(data);
      res.json(comment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== GOODS RECEIVED NOTES (GRN) ==============
  const grnUploadsDir = path.join(process.cwd(), "uploads", "grn");
  if (!fs.existsSync(grnUploadsDir)) {
    fs.mkdirSync(grnUploadsDir, { recursive: true });
  }

  const grnUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, grnUploadsDir),
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + "-" + file.originalname);
      }
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf"];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and PDF are allowed."));
      }
    }
  });

  app.get("/api/grn", requireAuth, async (req, res) => {
    try {
      const { clientId, date } = req.query;
      if (!clientId) {
        return res.status(400).json({ error: "clientId is required" });
      }
      const grns = await storage.getGoodsReceivedNotes(
        clientId as string, 
        date ? new Date(date as string) : undefined
      );
      res.json(grns);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/grn/daily-total", requireAuth, async (req, res) => {
    try {
      const { clientId, date } = req.query;
      if (!clientId || !date) {
        return res.status(400).json({ error: "clientId and date are required" });
      }
      const total = await storage.getDailyGRNTotal(clientId as string, new Date(date as string));
      res.json({ total });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/grn/:id", requireAuth, async (req, res) => {
    try {
      const grn = await storage.getGoodsReceivedNote(req.params.id);
      if (!grn) {
        return res.status(404).json({ error: "GRN not found" });
      }
      res.json(grn);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/grn", requireAuth, grnUpload.single("evidence"), async (req, res) => {
    try {
      const file = req.file;
      const data = insertGoodsReceivedNoteSchema.parse({
        clientId: req.body.clientId,
        supplierId: req.body.supplierId || null,
        supplierName: req.body.supplierName,
        date: new Date(req.body.date),
        invoiceRef: req.body.invoiceRef,
        amount: req.body.amount,
        status: req.body.status || "pending",
        evidenceUrl: file ? `/uploads/grn/${file.filename}` : null,
        evidenceFileName: file ? file.originalname : null,
        createdBy: req.session.userId!,
      });

      const grn = await storage.createGoodsReceivedNote(data);

      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created GRN",
        entity: "GoodsReceivedNote",
        entityId: grn.id,
        details: `Invoice: ${grn.invoiceRef}, Amount: ${grn.amount}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(grn);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/grn/:id", requireAuth, grnUpload.single("evidence"), async (req, res) => {
    try {
      const existing = await storage.getGoodsReceivedNote(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "GRN not found" });
      }

      const file = req.file;
      const updateData: any = {
        supplierId: req.body.supplierId || null,
        supplierName: req.body.supplierName,
        date: new Date(req.body.date),
        invoiceRef: req.body.invoiceRef,
        amount: req.body.amount,
        status: req.body.status,
      };

      if (file) {
        updateData.evidenceUrl = `/uploads/grn/${file.filename}`;
        updateData.evidenceFileName = file.originalname;
        if (existing.evidenceUrl) {
          const oldPath = path.join(process.cwd(), existing.evidenceUrl);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
      }

      const grn = await storage.updateGoodsReceivedNote(req.params.id, updateData);

      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Updated GRN",
        entity: "GoodsReceivedNote",
        entityId: req.params.id,
        details: `Invoice: ${grn?.invoiceRef}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(grn);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/grn/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      const grn = await storage.getGoodsReceivedNote(req.params.id);
      if (!grn) {
        return res.status(404).json({ error: "GRN not found" });
      }

      if (grn.evidenceUrl) {
        const filePath = path.join(process.cwd(), grn.evidenceUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await storage.deleteGoodsReceivedNote(req.params.id);

      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted GRN",
        entity: "GoodsReceivedNote",
        entityId: req.params.id,
        details: `Invoice: ${grn.invoiceRef}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  const express = await import("express");
  app.use("/uploads", (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  }, express.default.static(path.join(process.cwd(), "uploads")));

  // ============== REPORTS ==============
  app.get("/api/reports/generate", requireAuth, async (req, res) => {
    try {
      const { type, startDate, endDate, reportType } = req.query;

      if (!type || !["pdf", "excel"].includes(type as string)) {
        return res.status(400).json({ error: "type query parameter is required (pdf or excel)" });
      }

      const report = {
        id: `RPT-${Date.now()}`,
        type: type,
        format: type === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        generatedAt: new Date().toISOString(),
        parameters: {
          startDate: startDate || null,
          endDate: endDate || null,
          reportType: reportType || "summary",
        },
        status: "stub",
        message: "Report generation is a placeholder. Implement PDF/Excel generation library.",
        downloadUrl: null
      };

      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Generated Report",
        entity: "Report",
        entityId: report.id,
        details: `Report type: ${type}, Report: ${reportType || 'summary'}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== AUDIT LOGS ==============
  app.get("/api/audit-logs", requireAuth, async (req, res) => {
    try {
      const { limit, offset, userId, entity, startDate, endDate } = req.query;
      
      const result = await storage.getAuditLogs({
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
        userId: userId as string,
        entity: entity as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}

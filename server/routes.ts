import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hash, compare } from "bcrypt";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { 
  insertUserSchema, insertClientSchema, insertOutletSchema, insertDepartmentSchema, 
  insertSalesEntrySchema, insertPurchaseSchema, insertStockMovementSchema, 
  insertReconciliationSchema, insertExceptionSchema, insertExceptionCommentSchema,
  insertSupplierSchema, insertItemSchema, insertPurchaseLineSchema, insertStockCountSchema,
  type UserRole 
} from "@shared/schema";
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
      const departments = await storage.getDepartmentsByClient(clientId);
      res.json(departments);
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

  // ============== OUTLETS ==============
  app.get("/api/clients/:clientId/outlets", requireAuth, async (req, res) => {
    try {
      const outlets = await storage.getOutlets(req.params.clientId);
      res.json(outlets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/outlets", requireAuth, async (req, res) => {
    try {
      const outlets = await storage.getAllOutlets();
      res.json(outlets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/outlets/:id", requireAuth, async (req, res) => {
    try {
      const outlet = await storage.getOutlet(req.params.id);
      if (!outlet) {
        return res.status(404).json({ error: "Outlet not found" });
      }
      res.json(outlet);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/outlets", requireSuperAdmin, async (req, res) => {
    try {
      const data = insertOutletSchema.parse(req.body);
      const outlet = await storage.createOutlet(data);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Outlet",
        entity: "Outlet",
        entityId: outlet.id,
        details: `New outlet added: ${outlet.name}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(outlet);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/outlets/:id", requireSuperAdmin, async (req, res) => {
    try {
      const outlet = await storage.updateOutlet(req.params.id, req.body);
      if (!outlet) {
        return res.status(404).json({ error: "Outlet not found" });
      }
      res.json(outlet);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/outlets/:id", requireSuperAdmin, async (req, res) => {
    try {
      await storage.deleteOutlet(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Outlet",
        entity: "Outlet",
        entityId: req.params.id,
        details: `Outlet deleted`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== DEPARTMENTS ==============
  
  // Get outlet-specific departments
  app.get("/api/outlets/:outletId/departments", requireAuth, async (req, res) => {
    try {
      const departments = await storage.getDepartments(req.params.outletId);
      res.json(departments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get effective departments for an outlet (respects inheritance mode)
  app.get("/api/outlets/:outletId/effective-departments", requireAuth, async (req, res) => {
    try {
      const departments = await storage.getEffectiveDepartmentsForOutlet(req.params.outletId);
      res.json(departments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create outlet-specific department
  app.post("/api/outlets/:outletId/departments", requireSupervisorOrAbove, async (req, res) => {
    try {
      const { outletId } = req.params;
      const data = { ...req.body, outletId, scope: "outlet" };
      const parsed = insertDepartmentSchema.parse(data);
      const department = await storage.createDepartment(parsed);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Outlet Department",
        entity: "Department",
        entityId: department.id,
        details: `New outlet department added: ${department.name}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(department);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get client-level departments
  app.get("/api/clients/:clientId/departments", requireAuth, async (req, res) => {
    try {
      const departments = await storage.getClientDepartments(req.params.clientId);
      res.json(departments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create client-level department
  app.post("/api/clients/:clientId/departments", requireSupervisorOrAbove, async (req, res) => {
    try {
      const { clientId } = req.params;
      const data = { ...req.body, clientId, scope: "client" };
      const parsed = insertDepartmentSchema.parse(data);
      const department = await storage.createDepartment(parsed);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Client Department",
        entity: "Department",
        entityId: department.id,
        details: `New client-level department added: ${department.name}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(department);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Bulk create departments (client or outlet level)
  app.post("/api/departments/bulk", requireSupervisorOrAbove, async (req, res) => {
    try {
      const { departments: deptList, clientId, outletId, scope } = req.body;
      
      if (!Array.isArray(deptList) || deptList.length === 0) {
        return res.status(400).json({ error: "departments array is required" });
      }
      
      const insertData = deptList.map((name: string) => ({
        name: name.trim(),
        clientId: scope === "client" ? clientId : null,
        outletId: scope === "outlet" ? outletId : null,
        scope: scope || "outlet",
        status: "active",
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

  // Get outlet department links (for inheritance toggle)
  app.get("/api/outlets/:outletId/department-links", requireAuth, async (req, res) => {
    try {
      const links = await storage.getOutletDepartmentLinks(req.params.outletId);
      res.json(links);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Toggle outlet department link (enable/disable inherited department for outlet)
  app.post("/api/outlets/:outletId/department-links", requireSupervisorOrAbove, async (req, res) => {
    try {
      const { outletId } = req.params;
      const { departmentId, isActive } = req.body;
      
      const existingLinks = await storage.getOutletDepartmentLinks(outletId);
      const existing = existingLinks.find(l => l.departmentId === departmentId);
      
      let link;
      if (existing) {
        link = await storage.updateOutletDepartmentLink(outletId, departmentId, isActive);
      } else {
        link = await storage.createOutletDepartmentLink({ outletId, departmentId, isActive });
      }
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: isActive ? "Enabled Department for Outlet" : "Disabled Department for Outlet",
        entity: "OutletDepartmentLink",
        entityId: `${outletId}:${departmentId}`,
        details: `Department ${departmentId} ${isActive ? "enabled" : "disabled"} for outlet ${outletId}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(link);
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
      const item = await storage.updateItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
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

  // ============== SALES ENTRIES ==============
  app.get("/api/sales-entries", requireAuth, async (req, res) => {
    try {
      const { departmentId, startDate, endDate } = req.query;
      
      if (departmentId) {
        const sales = await storage.getSalesEntries(
          departmentId as string,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        );
        return res.json(sales);
      }
      
      const sales = await storage.getAllSalesEntries();
      res.json(sales);
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
      const data = insertSalesEntrySchema.parse({
        ...req.body,
        createdBy: req.session.userId!,
      });
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
      const data = insertSalesEntrySchema.parse({
        ...req.body,
        createdBy: req.session.userId!,
      });
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
  app.get("/api/outlets/:outletId/movements", requireAuth, async (req, res) => {
    try {
      const movements = await storage.getStockMovements(req.params.outletId);
      res.json(movements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

      if (!departmentId || !date || !openingStock || !additions || !physicalCount) {
        return res.status(400).json({ error: "Missing required fields for reconciliation computation" });
      }

      const openingQty = parseFloat(openingStock.quantity || openingStock.totalQty || 0);
      const additionsQty = parseFloat(additions.quantity || additions.totalQty || 0);
      const physicalQty = parseFloat(physicalCount.quantity || physicalCount.totalQty || 0);

      const expectedClosing = openingQty + additionsQty;
      const varianceQty = physicalQty - expectedClosing;
      const unitValue = parseFloat(openingStock.unitValue || 10);
      const varianceValue = varianceQty * unitValue;

      res.json({
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
      const { outletId, status, severity } = req.query;
      const exceptions = await storage.getExceptions({
        outletId: outletId as string | undefined,
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

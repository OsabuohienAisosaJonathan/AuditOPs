import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hash, compare } from "bcrypt";
import session from "express-session";
import { insertUserSchema, insertClientSchema, insertOutletSchema, insertDepartmentSchema, insertSalesEntrySchema, insertPurchaseSchema, insertStockMovementSchema, insertReconciliationSchema, insertExceptionSchema, insertExceptionCommentSchema, type UserRole } from "@shared/schema";
import { randomBytes } from "crypto";

declare module "express-session" {
  interface SessionData {
    userId: string;
    role: string;
  }
}

// Password validation
function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);
}

// Rate limiting store
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
  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "audit-ops-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  // Auth middleware
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  // Role-based access middleware
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

      const user = await storage.getUserByUsername(username);

      if (!user) {
        recordFailedAttempt(identifier);
        await storage.createAuditLog({
          userId: null,
          action: "Login Failed",
          entity: "Session",
          details: `Failed login attempt for username: ${username}`,
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

  // ============== USER MANAGEMENT (Super Admin Only) ==============
  app.get("/api/users", requireSuperAdmin, async (req, res) => {
    try {
      const { role, status, search } = req.query;
      const users = await storage.getUsers({
        role: role as string,
        status: status as string,
        search: search as string,
      });
      
      // Remove password from response
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

      // Check if email or username already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already in use" });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already in use" });
      }

      // Generate temporary password
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

      // Cannot change super_admin role
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
      
      // Filter by access scope if not super_admin or global access
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

  app.post("/api/outlets", requireSuperAdmin, async (req, res) => {
    try {
      const data = insertOutletSchema.parse(req.body);
      const outlet = await storage.createOutlet(data);
      res.json(outlet);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== DEPARTMENTS ==============
  app.get("/api/outlets/:outletId/departments", requireAuth, async (req, res) => {
    try {
      const departments = await storage.getDepartments(req.params.outletId);
      res.json(departments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/departments", requireSuperAdmin, async (req, res) => {
    try {
      const data = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(data);
      res.json(department);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== SALES ENTRIES ==============
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

  // ============== PURCHASES ==============
  app.get("/api/outlets/:outletId/purchases", requireAuth, async (req, res) => {
    try {
      const purchases = await storage.getPurchases(req.params.outletId);
      res.json(purchases);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/purchases", requireAuth, async (req, res) => {
    try {
      const data = insertPurchaseSchema.parse({
        ...req.body,
        createdBy: req.session.userId!,
      });
      const purchase = await storage.createPurchase(data);
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

  app.post("/api/reconciliations", requireAuth, async (req, res) => {
    try {
      const data = insertReconciliationSchema.parse({
        ...req.body,
        createdBy: req.session.userId!,
      });
      const reconciliation = await storage.createReconciliation(data);
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

  // ============== EXCEPTIONS ==============
  app.get("/api/exceptions", requireAuth, async (req, res) => {
    try {
      const { outletId } = req.query;
      const exceptions = await storage.getExceptions(outletId as string | undefined);
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
      const exception = await storage.updateException(req.params.id, req.body);
      if (!exception) {
        return res.status(404).json({ error: "Exception not found" });
      }
      res.json(exception);
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

  // ============== AUDIT LOGS ==============
  app.get("/api/audit-logs", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getAuditLogs(limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}

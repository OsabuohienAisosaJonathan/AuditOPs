import { Express, Request, Response, NextFunction } from "express";
import { platformAdminStorage, canPlatformAdmin } from "./platform-admin-storage";
import { PlatformAdminUser, PlatformAdminRole, PLATFORM_ADMIN_ROLES, SUBSCRIPTION_PLANS, BILLING_PERIODS, users } from "@shared/schema";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { storage } from "./storage";
import { db } from "./db";
import { eq } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    platformAdminId?: string;
    platformAdminRole?: PlatformAdminRole;
  }
}

const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.platformAdminId) {
    return res.status(401).json({ message: "Platform admin authentication required" });
  }
  next();
}

function requirePlatformAdminPermission(action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.platformAdminId || !req.session.platformAdminRole) {
      return res.status(401).json({ message: "Platform admin authentication required" });
    }
    if (!canPlatformAdmin(req.session.platformAdminRole, action)) {
      return res.status(403).json({ message: "Insufficient permissions for this action" });
    }
    next();
  };
}

async function logAdminAction(
  adminId: string,
  actionType: string,
  targetType: string,
  targetId: string | null,
  beforeJson: any,
  afterJson: any,
  notes: string | null,
  req: Request
) {
  await platformAdminStorage.logPlatformAdminAction({
    adminId,
    actionType,
    targetType,
    targetId,
    beforeJson,
    afterJson,
    notes,
    ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString() || null,
    userAgent: req.headers["user-agent"] || null,
  });
}

export function registerPlatformAdminRoutes(app: Express) {
  // =====================================================
  // AUTHENTICATION
  // =====================================================

  app.post("/api/owner/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      const admin = await platformAdminStorage.getPlatformAdminByEmail(email.toLowerCase());
      
      if (!admin) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!admin.isActive) {
        return res.status(403).json({ message: "Account is disabled" });
      }

      if (admin.lockedUntil && admin.lockedUntil > new Date()) {
        const minutesLeft = Math.ceil((admin.lockedUntil.getTime() - Date.now()) / 60000);
        return res.status(423).json({ message: `Account locked. Try again in ${minutesLeft} minutes.` });
      }

      const validPassword = await bcrypt.compare(password, admin.password);
      
      if (!validPassword) {
        const attempts = (admin.loginAttempts || 0) + 1;
        const lockedUntil = attempts >= LOCKOUT_ATTEMPTS ? new Date(Date.now() + LOCKOUT_DURATION_MS) : undefined;
        await platformAdminStorage.updatePlatformAdminLoginAttempts(admin.id, attempts, lockedUntil);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      await platformAdminStorage.updatePlatformAdminLastLogin(admin.id);
      
      req.session.platformAdminId = admin.id;
      req.session.platformAdminRole = admin.role as PlatformAdminRole;

      await logAdminAction(admin.id, "login", "platform_admin", admin.id, null, null, null, req);

      return res.json({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      });
    } catch (error: any) {
      console.error("Platform admin login error:", error);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/owner/auth/logout", requirePlatformAdmin, async (req, res) => {
    const adminId = req.session.platformAdminId!;
    await logAdminAction(adminId, "logout", "platform_admin", adminId, null, null, null, req);
    
    req.session.platformAdminId = undefined;
    req.session.platformAdminRole = undefined;
    
    return res.json({ message: "Logged out" });
  });

  app.get("/api/owner/auth/me", requirePlatformAdmin, async (req, res) => {
    const admin = await platformAdminStorage.getPlatformAdminById(req.session.platformAdminId!);
    if (!admin) {
      req.session.platformAdminId = undefined;
      req.session.platformAdminRole = undefined;
      return res.status(401).json({ message: "Admin not found" });
    }
    return res.json({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });
  });

  // =====================================================
  // DASHBOARD
  // =====================================================

  app.get("/api/owner/dashboard/stats", requirePlatformAdmin, async (req, res) => {
    try {
      const stats = await platformAdminStorage.getPlatformStats();
      return res.json(stats);
    } catch (error: any) {
      console.error("Dashboard stats error:", error);
      return res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/owner/dashboard/expiring", requirePlatformAdmin, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const expiring = await platformAdminStorage.getExpiringSubscriptions(days);
      return res.json(expiring);
    } catch (error: any) {
      console.error("Expiring subscriptions error:", error);
      return res.status(500).json({ message: "Failed to fetch expiring subscriptions" });
    }
  });

  // =====================================================
  // ORGANIZATIONS
  // =====================================================

  app.get("/api/owner/organizations", requirePlatformAdminPermission("view_orgs"), async (req, res) => {
    try {
      const { status, planName, search, limit, offset } = req.query;
      const result = await platformAdminStorage.getAllOrganizations({
        status: status as string,
        planName: planName as string,
        search: search as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });
      return res.json(result);
    } catch (error: any) {
      console.error("Get organizations error:", error);
      return res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  app.get("/api/owner/organizations/:id", requirePlatformAdminPermission("view_orgs"), async (req, res) => {
    try {
      const org = await platformAdminStorage.getOrganizationWithDetails(req.params.id);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }
      return res.json(org);
    } catch (error: any) {
      console.error("Get organization error:", error);
      return res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  app.post("/api/owner/organizations/:id/suspend", requirePlatformAdminPermission("edit_billing"), async (req, res) => {
    try {
      const { reason } = req.body;
      const orgBefore = await platformAdminStorage.getOrganizationWithDetails(req.params.id);
      
      await platformAdminStorage.suspendOrganization(req.params.id, reason || "Suspended by platform admin");
      
      const orgAfter = await platformAdminStorage.getOrganizationWithDetails(req.params.id);
      await logAdminAction(req.session.platformAdminId!, "suspend_org", "organization", req.params.id, orgBefore, orgAfter, reason, req);
      
      return res.json({ message: "Organization suspended" });
    } catch (error: any) {
      console.error("Suspend organization error:", error);
      return res.status(500).json({ message: "Failed to suspend organization" });
    }
  });

  app.post("/api/owner/organizations/:id/unsuspend", requirePlatformAdminPermission("edit_billing"), async (req, res) => {
    try {
      const orgBefore = await platformAdminStorage.getOrganizationWithDetails(req.params.id);
      
      await platformAdminStorage.unsuspendOrganization(req.params.id);
      
      const orgAfter = await platformAdminStorage.getOrganizationWithDetails(req.params.id);
      await logAdminAction(req.session.platformAdminId!, "unsuspend_org", "organization", req.params.id, orgBefore, orgAfter, null, req);
      
      return res.json({ message: "Organization unsuspended" });
    } catch (error: any) {
      console.error("Unsuspend organization error:", error);
      return res.status(500).json({ message: "Failed to unsuspend organization" });
    }
  });

  app.delete("/api/owner/organizations/:id", async (req, res) => {
    if (req.session.platformAdminRole !== "platform_super_admin") {
      return res.status(403).json({ message: "Only Platform Super Admin can delete organizations" });
    }
    
    try {
      const orgBefore = await platformAdminStorage.getOrganizationWithDetails(req.params.id);
      
      await platformAdminStorage.deleteOrganization(req.params.id);
      
      await logAdminAction(req.session.platformAdminId!, "delete_org", "organization", req.params.id, orgBefore, null, null, req);
      
      return res.json({ message: "Organization deleted" });
    } catch (error: any) {
      console.error("Delete organization error:", error);
      return res.status(500).json({ message: "Failed to delete organization" });
    }
  });

  // =====================================================
  // USERS
  // =====================================================

  app.get("/api/owner/users", requirePlatformAdminPermission("view_users"), async (req, res) => {
    try {
      const { organizationId, role, status, search, limit, offset } = req.query;
      const result = await platformAdminStorage.getAllUsers({
        organizationId: organizationId as string,
        role: role as string,
        status: status as string,
        search: search as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });
      return res.json(result);
    } catch (error: any) {
      console.error("Get users error:", error);
      return res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/owner/users/:id/lock", requirePlatformAdminPermission("lock_user"), async (req, res) => {
    try {
      const { reason } = req.body;
      const userBefore = await storage.getUser(req.params.id);
      
      await platformAdminStorage.lockUser(req.params.id, reason || "Locked by platform admin");
      
      const userAfter = await storage.getUser(req.params.id);
      await logAdminAction(req.session.platformAdminId!, "lock_user", "user", req.params.id, 
        { isLocked: userBefore?.status === 'inactive' }, 
        { isLocked: true, reason }, 
        reason, req);
      
      return res.json({ message: "User locked" });
    } catch (error: any) {
      console.error("Lock user error:", error);
      return res.status(500).json({ message: "Failed to lock user" });
    }
  });

  app.post("/api/owner/users/:id/unlock", requirePlatformAdminPermission("unlock_user"), async (req, res) => {
    try {
      const userBefore = await storage.getUser(req.params.id);
      
      await platformAdminStorage.unlockUser(req.params.id);
      
      await logAdminAction(req.session.platformAdminId!, "unlock_user", "user", req.params.id, 
        { isLocked: true }, 
        { isLocked: false }, 
        null, req);
      
      return res.json({ message: "User unlocked" });
    } catch (error: any) {
      console.error("Unlock user error:", error);
      return res.status(500).json({ message: "Failed to unlock user" });
    }
  });

  app.post("/api/owner/users/:id/resend-verification", requirePlatformAdminPermission("resend_verification"), async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const token = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      await db.update(users)
        .set({ verificationToken: token, verificationExpiry: expiry, updatedAt: new Date() })
        .where(eq(users.id, req.params.id));
      
      await logAdminAction(req.session.platformAdminId!, "resend_verification", "user", req.params.id, null, null, null, req);
      
      return res.json({ message: "Verification email resent" });
    } catch (error: any) {
      console.error("Resend verification error:", error);
      return res.status(500).json({ message: "Failed to resend verification" });
    }
  });

  app.post("/api/owner/users/:id/send-password-reset", requirePlatformAdminPermission("reset_password"), async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const token = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 60 * 60 * 1000);
      
      await db.update(users)
        .set({ passwordResetToken: token, passwordResetExpiry: expiry, updatedAt: new Date() })
        .where(eq(users.id, req.params.id));
      
      await logAdminAction(req.session.platformAdminId!, "send_password_reset", "user", req.params.id, null, null, null, req);
      
      return res.json({ message: "Password reset email sent" });
    } catch (error: any) {
      console.error("Send password reset error:", error);
      return res.status(500).json({ message: "Failed to send password reset" });
    }
  });

  // =====================================================
  // BILLING & SUBSCRIPTIONS
  // =====================================================

  app.patch("/api/owner/organizations/:id/subscription", requirePlatformAdminPermission("edit_billing"), async (req, res) => {
    try {
      const { planName, billingPeriod, status, expiresAt, nextBillingDate, provider, notes } = req.body;
      
      if (planName && !SUBSCRIPTION_PLANS.includes(planName)) {
        return res.status(400).json({ message: "Invalid plan name" });
      }
      if (billingPeriod && !BILLING_PERIODS.includes(billingPeriod)) {
        return res.status(400).json({ message: "Invalid billing period" });
      }

      const result = await platformAdminStorage.updateSubscriptionAsAdmin(
        req.params.id,
        {
          planName,
          billingPeriod,
          status,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          nextBillingDate: nextBillingDate ? new Date(nextBillingDate) : undefined,
          provider,
          notes,
        },
        req.session.platformAdminId!
      );

      await logAdminAction(req.session.platformAdminId!, "update_subscription", "subscription", req.params.id, result.before, result.after, notes, req);

      return res.json({ message: "Subscription updated", subscription: result.after });
    } catch (error: any) {
      console.error("Update subscription error:", error);
      return res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  app.post("/api/owner/organizations/:id/grant-free-access", requirePlatformAdminPermission("grant_free_access"), async (req, res) => {
    try {
      const { planName, expiresAt, notes } = req.body;
      
      if (!expiresAt) {
        return res.status(400).json({ message: "Expiry date is required for free access" });
      }
      if (planName && !SUBSCRIPTION_PLANS.includes(planName)) {
        return res.status(400).json({ message: "Invalid plan name" });
      }

      const result = await platformAdminStorage.updateSubscriptionAsAdmin(
        req.params.id,
        {
          planName: planName || "starter",
          status: "active",
          provider: "manual_free",
          expiresAt: new Date(expiresAt),
          notes: notes || "Free access granted by platform admin",
        },
        req.session.platformAdminId!
      );

      await logAdminAction(req.session.platformAdminId!, "grant_free_access", "subscription", req.params.id, result.before, result.after, notes, req);

      return res.json({ message: "Free access granted", subscription: result.after });
    } catch (error: any) {
      console.error("Grant free access error:", error);
      return res.status(500).json({ message: "Failed to grant free access" });
    }
  });

  app.post("/api/owner/organizations/:id/extend-subscription", requirePlatformAdminPermission("extend_subscription"), async (req, res) => {
    try {
      const { days, newExpiresAt, notes } = req.body;
      
      const org = await platformAdminStorage.getOrganizationWithDetails(req.params.id);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      let expiresAt: Date;
      if (newExpiresAt) {
        expiresAt = new Date(newExpiresAt);
      } else if (days) {
        const currentExpiry = org.subscription?.expiresAt ? new Date(org.subscription.expiresAt) : new Date();
        expiresAt = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);
      } else {
        return res.status(400).json({ message: "Either days or newExpiresAt is required" });
      }

      const result = await platformAdminStorage.updateSubscriptionAsAdmin(
        req.params.id,
        { expiresAt, notes },
        req.session.platformAdminId!
      );

      await logAdminAction(req.session.platformAdminId!, "extend_subscription", "subscription", req.params.id, result.before, result.after, notes, req);

      return res.json({ message: "Subscription extended", subscription: result.after });
    } catch (error: any) {
      console.error("Extend subscription error:", error);
      return res.status(500).json({ message: "Failed to extend subscription" });
    }
  });

  // =====================================================
  // AUDIT LOGS
  // =====================================================

  app.get("/api/owner/audit-logs", requirePlatformAdminPermission("view_logs"), async (req, res) => {
    try {
      const { adminId, targetType, limit, offset } = req.query;
      const result = await platformAdminStorage.getPlatformAdminAuditLogs({
        adminId: adminId as string,
        targetType: targetType as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });
      return res.json(result);
    } catch (error: any) {
      console.error("Get audit logs error:", error);
      return res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // =====================================================
  // PLATFORM ADMIN USER MANAGEMENT
  // =====================================================

  app.get("/api/owner/admins", async (req, res) => {
    if (req.session.platformAdminRole !== "platform_super_admin") {
      return res.status(403).json({ message: "Only Platform Super Admin can view admin list" });
    }
    
    try {
      const admins = await platformAdminStorage.getAllPlatformAdmins();
      return res.json(admins.map(a => ({
        id: a.id,
        email: a.email,
        name: a.name,
        role: a.role,
        isActive: a.isActive,
        lastLoginAt: a.lastLoginAt,
        createdAt: a.createdAt,
      })));
    } catch (error: any) {
      console.error("Get admins error:", error);
      return res.status(500).json({ message: "Failed to fetch admins" });
    }
  });

  app.post("/api/owner/admins", async (req, res) => {
    if (req.session.platformAdminRole !== "platform_super_admin") {
      return res.status(403).json({ message: "Only Platform Super Admin can create admins" });
    }
    
    try {
      const { email, password, name, role } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({ message: "Email, password, and name are required" });
      }
      if (role && !PLATFORM_ADMIN_ROLES.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const existing = await platformAdminStorage.getPlatformAdminByEmail(email.toLowerCase());
      if (existing) {
        return res.status(409).json({ message: "Admin with this email already exists" });
      }

      const admin = await platformAdminStorage.createPlatformAdmin({
        email: email.toLowerCase(),
        password,
        name,
        role: role || "readonly_admin",
        isActive: true,
      });

      await logAdminAction(req.session.platformAdminId!, "create_admin", "platform_admin", admin.id, null, { email: admin.email, role: admin.role }, null, req);

      return res.status(201).json({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      });
    } catch (error: any) {
      console.error("Create admin error:", error);
      return res.status(500).json({ message: "Failed to create admin" });
    }
  });

  app.delete("/api/owner/admins/:id", async (req, res) => {
    if (req.session.platformAdminRole !== "platform_super_admin") {
      return res.status(403).json({ message: "Only Platform Super Admin can delete admins" });
    }
    
    if (req.params.id === req.session.platformAdminId) {
      return res.status(400).json({ message: "Cannot delete yourself" });
    }
    
    try {
      const adminBefore = await platformAdminStorage.getPlatformAdminById(req.params.id);
      
      await platformAdminStorage.deletePlatformAdmin(req.params.id);
      
      await logAdminAction(req.session.platformAdminId!, "delete_admin", "platform_admin", req.params.id, adminBefore, null, null, req);
      
      return res.json({ message: "Admin deleted" });
    } catch (error: any) {
      console.error("Delete admin error:", error);
      return res.status(500).json({ message: "Failed to delete admin" });
    }
  });

  // =====================================================
  // BOOTSTRAP FIRST PLATFORM ADMIN
  // =====================================================

  app.post("/api/owner/bootstrap", async (req, res) => {
    console.log("[BOOTSTRAP] Request received:", { 
      email: req.body.email, 
      hasPassword: !!req.body.password,
      hasBootstrapKey: !!req.body.bootstrapKey,
      fullName: req.body.fullName 
    });
    
    try {
      const admins = await platformAdminStorage.getAllPlatformAdmins();
      console.log("[BOOTSTRAP] Existing admins count:", admins.length);
      
      if (admins.length > 0) {
        return res.status(403).json({ message: "Platform admin already exists. Use login." });
      }

      const { email, password, name, bootstrapKey, fullName } = req.body;
      
      const expectedKey = process.env.ADMIN_BOOTSTRAP_KEY || "miauditops-platform-admin-setup";
      console.log("[BOOTSTRAP] Key check:", { provided: !!bootstrapKey, expected: !!expectedKey, match: bootstrapKey === expectedKey });
      
      if (bootstrapKey !== expectedKey) {
        return res.status(403).json({ message: "Invalid bootstrap key" });
      }
      
      const adminName = name || fullName;

      if (!email || !password || !adminName) {
        return res.status(400).json({ message: "Email, password, and name are required" });
      }

      const admin = await platformAdminStorage.createPlatformAdmin({
        email: email.toLowerCase(),
        password,
        name: adminName,
        role: "platform_super_admin",
        isActive: true,
      });

      return res.status(201).json({
        message: "Platform Super Admin created successfully",
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
      });
    } catch (error: any) {
      console.error("Bootstrap platform admin error:", error);
      return res.status(500).json({ message: "Failed to bootstrap platform admin" });
    }
  });

  // =====================================================
  // SUBSCRIPTION PLANS MANAGEMENT
  // =====================================================

  app.get("/api/owner/subscription-plans", requirePlatformAdmin, async (req, res) => {
    try {
      const plans = await platformAdminStorage.getAllSubscriptionPlans();
      return res.json(plans);
    } catch (error: any) {
      console.error("Get subscription plans error:", error);
      return res.status(500).json({ message: "Failed to get subscription plans" });
    }
  });

  app.get("/api/owner/subscription-plans/:id", requirePlatformAdmin, async (req, res) => {
    try {
      const plan = await platformAdminStorage.getSubscriptionPlanById(req.params.id);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }
      return res.json(plan);
    } catch (error: any) {
      console.error("Get subscription plan error:", error);
      return res.status(500).json({ message: "Failed to get subscription plan" });
    }
  });

  app.post("/api/owner/subscription-plans", requirePlatformAdminPermission("edit_billing"), async (req, res) => {
    try {
      const plan = await platformAdminStorage.createSubscriptionPlan(req.body);
      await logAdminAction(req.session.platformAdminId!, "create_plan", "subscription_plan", plan.id, null, plan, null, req);
      return res.status(201).json(plan);
    } catch (error: any) {
      console.error("Create subscription plan error:", error);
      return res.status(500).json({ message: "Failed to create subscription plan" });
    }
  });

  app.patch("/api/owner/subscription-plans/:id", requirePlatformAdminPermission("edit_billing"), async (req, res) => {
    try {
      const planBefore = await platformAdminStorage.getSubscriptionPlanById(req.params.id);
      const plan = await platformAdminStorage.updateSubscriptionPlan(req.params.id, req.body);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }
      await logAdminAction(req.session.platformAdminId!, "update_plan", "subscription_plan", plan.id, planBefore, plan, null, req);
      return res.json(plan);
    } catch (error: any) {
      console.error("Update subscription plan error:", error);
      return res.status(500).json({ message: "Failed to update subscription plan" });
    }
  });

  app.delete("/api/owner/subscription-plans/:id", requirePlatformAdminPermission("edit_billing"), async (req, res) => {
    try {
      const planBefore = await platformAdminStorage.getSubscriptionPlanById(req.params.id);
      await platformAdminStorage.deleteSubscriptionPlan(req.params.id);
      await logAdminAction(req.session.platformAdminId!, "delete_plan", "subscription_plan", req.params.id, planBefore, null, null, req);
      return res.json({ message: "Plan deleted" });
    } catch (error: any) {
      console.error("Delete subscription plan error:", error);
      return res.status(500).json({ message: "Failed to delete subscription plan" });
    }
  });

  // =====================================================
  // ORGANIZATION SLOT OVERRIDES
  // =====================================================

  app.patch("/api/owner/organizations/:id/slot-overrides", requirePlatformAdminPermission("edit_billing"), async (req, res) => {
    try {
      const org = await platformAdminStorage.getOrganizationWithDetails(req.params.id);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      const overridesBefore = org.subscription ? {
        maxClientsOverride: org.subscription.maxClientsOverride,
        maxSrdDepartmentsOverride: org.subscription.maxSrdDepartmentsOverride,
        maxMainStoreOverride: org.subscription.maxMainStoreOverride,
        maxSeatsOverride: org.subscription.maxSeatsOverride,
        retentionDaysOverride: org.subscription.retentionDaysOverride,
      } : null;
      
      const result = await platformAdminStorage.updateSubscriptionOverrides(req.params.id, req.body, req.session.platformAdminId!);
      
      await logAdminAction(req.session.platformAdminId!, "update_slot_overrides", "organization", req.params.id, overridesBefore, req.body, null, req);
      
      return res.json(result);
    } catch (error: any) {
      console.error("Update slot overrides error:", error);
      return res.status(500).json({ message: "Failed to update slot overrides" });
    }
  });

  // =====================================================
  // USER ACTIONS (Force Logout, Delete)
  // =====================================================

  app.post("/api/owner/users/:id/force-logout", requirePlatformAdminPermission("lock_user"), async (req, res) => {
    try {
      await platformAdminStorage.forceLogoutUser(req.params.id);
      await logAdminAction(req.session.platformAdminId!, "force_logout", "user", req.params.id, null, null, null, req);
      return res.json({ message: "User session invalidated" });
    } catch (error: any) {
      console.error("Force logout user error:", error);
      return res.status(500).json({ message: "Failed to force logout user" });
    }
  });

  app.delete("/api/owner/users/:id", requirePlatformAdminPermission("lock_user"), async (req, res) => {
    try {
      const { reason } = req.body;
      if (!reason || reason.trim().length < 5) {
        return res.status(400).json({ message: "Delete reason is required (minimum 5 characters)" });
      }
      
      await platformAdminStorage.deleteUser(req.params.id);
      await logAdminAction(req.session.platformAdminId!, "delete_user", "user", req.params.id, null, null, reason, req);
      return res.json({ message: "User deleted" });
    } catch (error: any) {
      console.error("Delete user error:", error);
      return res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // =====================================================
  // PUBLIC PRICING ENDPOINT (No Auth Required)
  // =====================================================

  app.get("/api/public/pricing", async (req, res) => {
    try {
      const plans = await platformAdminStorage.getAllSubscriptionPlans();
      // Only return active plans with public-safe fields
      const publicPlans = plans
        .filter(p => p.isActive)
        .map(p => ({
          slug: p.slug,
          displayName: p.displayName,
          description: p.description,
          monthlyPrice: p.monthlyPrice,
          quarterlyPrice: p.quarterlyPrice,
          yearlyPrice: p.yearlyPrice,
          currency: p.currency,
          maxClients: p.maxClients,
          maxSrdDepartmentsPerClient: p.maxSrdDepartmentsPerClient,
          maxMainStorePerClient: p.maxMainStorePerClient,
          maxSeats: p.maxSeats,
          retentionDays: p.retentionDays,
          canViewReports: p.canViewReports,
          canDownloadReports: p.canDownloadReports,
          canPrintReports: p.canPrintReports,
          canAccessPurchasesRegisterPage: p.canAccessPurchasesRegisterPage,
          canAccessSecondHitPage: p.canAccessSecondHitPage,
          canDownloadSecondHitFullTable: p.canDownloadSecondHitFullTable,
          canDownloadMainStoreLedgerSummary: p.canDownloadMainStoreLedgerSummary,
          canUseBetaFeatures: p.canUseBetaFeatures,
        }));
      return res.json(publicPlans);
    } catch (error: any) {
      console.error("Get public pricing error:", error);
      return res.status(500).json({ message: "Failed to get pricing" });
    }
  });
}

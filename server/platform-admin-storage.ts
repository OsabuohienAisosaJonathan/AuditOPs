import { db } from "./db";
import { randomUUID } from "crypto";
import {
  platformAdminUsers,
  platformAdminAuditLog,
  organizations,
  users,
  subscriptions,
  subscriptionPlans,
  clients,
  InsertPlatformAdminUser,
  PlatformAdminUser,
  InsertPlatformAdminAuditLog,
  PlatformAdminAuditLog,
  PlatformAdminRole,
  PLATFORM_ADMIN_ROLES,
  InsertSubscriptionPlanConfig,
  SubscriptionPlanConfig
} from "@shared/schema";
import { eq, desc, and, or, ilike, count, sql, gte, lte } from "drizzle-orm";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export interface PlatformAdminStorage {
  // Platform Admin User Management
  createPlatformAdmin(data: InsertPlatformAdminUser): Promise<PlatformAdminUser>;
  getPlatformAdminByEmail(email: string): Promise<PlatformAdminUser | null>;
  getPlatformAdminById(id: string): Promise<PlatformAdminUser | null>;
  getAllPlatformAdmins(): Promise<PlatformAdminUser[]>;
  updatePlatformAdmin(id: string, data: Partial<InsertPlatformAdminUser>): Promise<PlatformAdminUser | null>;
  deletePlatformAdmin(id: string): Promise<boolean>;
  updatePlatformAdminLoginAttempts(id: string, attempts: number, lockedUntil?: Date): Promise<void>;
  updatePlatformAdminLastLogin(id: string): Promise<void>;

  // Audit Log
  logPlatformAdminAction(data: InsertPlatformAdminAuditLog): Promise<PlatformAdminAuditLog>;
  getPlatformAdminAuditLogs(params: {
    adminId?: string;
    targetType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: PlatformAdminAuditLog[]; total: number }>;

  // Organization Management (cross-tenant)
  getAllOrganizations(params: {
    status?: string;
    planName?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ organizations: any[]; total: number }>;
  getOrganizationWithDetails(id: string): Promise<any>;
  suspendOrganization(id: string, reason: string): Promise<void>;
  unsuspendOrganization(id: string): Promise<void>;
  deleteOrganization(id: string): Promise<void>;

  // User Management (cross-tenant)
  getAllUsers(params: {
    organizationId?: string;
    role?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ users: any[]; total: number }>;
  lockUser(id: string, reason: string): Promise<void>;
  unlockUser(id: string): Promise<void>;

  // Subscription Management
  updateSubscriptionAsAdmin(organizationId: string, data: {
    planName?: string;
    billingPeriod?: string;
    status?: string;
    expiresAt?: Date | null;
    nextBillingDate?: Date | null;
    provider?: string;
    notes?: string;
  }, adminId: string): Promise<any>;
  getExpiringSubscriptions(daysAhead: number): Promise<any[]>;

  // Dashboard Stats
  getPlatformStats(): Promise<{
    totalOrganizations: number;
    activeSubscriptions: number;
    inactiveSubscriptions: number;
    expiringWithin7Days: number;
    expiringWithin14Days: number;
    expiringWithin30Days: number;
  }>;

  // Subscription Plans Management
  getAllSubscriptionPlans(): Promise<SubscriptionPlanConfig[]>;
  getSubscriptionPlanBySlug(slug: string): Promise<SubscriptionPlanConfig | null>;
  getSubscriptionPlanById(id: string): Promise<SubscriptionPlanConfig | null>;
  createSubscriptionPlan(data: InsertSubscriptionPlanConfig): Promise<SubscriptionPlanConfig>;
  updateSubscriptionPlan(id: string, data: Partial<InsertSubscriptionPlanConfig>): Promise<SubscriptionPlanConfig | null>;
  deleteSubscriptionPlan(id: string): Promise<boolean>;

  // Subscription Override Management
  updateSubscriptionOverrides(organizationId: string, overrides: {
    maxClientsOverride?: number | null;
    maxSrdDepartmentsOverride?: number | null;
    maxMainStoreOverride?: number | null;
    maxSeatsOverride?: number | null;
    retentionDaysOverride?: number | null;
  }, adminId: string): Promise<any>;

  // User Management - additional actions
  forceLogoutUser(id: string): Promise<void>;
  deleteUser(id: string): Promise<void>;
}

export const platformAdminStorage: PlatformAdminStorage = {
  async createPlatformAdmin(data: InsertPlatformAdminUser): Promise<PlatformAdminUser> {
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
    const id = randomUUID();
    await db.insert(platformAdminUsers).values({
      ...data,
      id,
      password: hashedPassword,
    });
    const [admin] = await db.select().from(platformAdminUsers).where(eq(platformAdminUsers.id, id));
    return admin;
  },

  async getPlatformAdminByEmail(email: string): Promise<PlatformAdminUser | null> {
    const [admin] = await db.select().from(platformAdminUsers)
      .where(eq(platformAdminUsers.email, email.toLowerCase()));
    return admin || null;
  },

  async getPlatformAdminById(id: string): Promise<PlatformAdminUser | null> {
    const [admin] = await db.select().from(platformAdminUsers)
      .where(eq(platformAdminUsers.id, id));
    return admin || null;
  },

  async getAllPlatformAdmins(): Promise<PlatformAdminUser[]> {
    return db.select().from(platformAdminUsers).orderBy(desc(platformAdminUsers.createdAt));
  },

  async updatePlatformAdmin(id: string, data: Partial<InsertPlatformAdminUser>): Promise<PlatformAdminUser | null> {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, SALT_ROUNDS);
    }
    await db.update(platformAdminUsers).set(updateData).where(eq(platformAdminUsers.id, id));
    const [admin] = await db.select().from(platformAdminUsers).where(eq(platformAdminUsers.id, id));
    return admin || null;
  },

  async deletePlatformAdmin(id: string): Promise<boolean> {
    const result = await db.delete(platformAdminUsers).where(eq(platformAdminUsers.id, id));
    return true;
  },

  async updatePlatformAdminLoginAttempts(id: string, attempts: number, lockedUntil?: Date): Promise<void> {
    await db.update(platformAdminUsers)
      .set({ loginAttempts: attempts, lockedUntil: lockedUntil || null, updatedAt: new Date() })
      .where(eq(platformAdminUsers.id, id));
  },

  async updatePlatformAdminLastLogin(id: string): Promise<void> {
    await db.update(platformAdminUsers)
      .set({ lastLoginAt: new Date(), loginAttempts: 0, lockedUntil: null, updatedAt: new Date() })
      .where(eq(platformAdminUsers.id, id));
  },

  async logPlatformAdminAction(data: InsertPlatformAdminAuditLog): Promise<PlatformAdminAuditLog> {
    const id = randomUUID();
    await db.insert(platformAdminAuditLog).values({ ...data, id });
    const [log] = await db.select().from(platformAdminAuditLog).where(eq(platformAdminAuditLog.id, id));
    return log;
  },

  async getPlatformAdminAuditLogs(params: {
    adminId?: string;
    targetType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: PlatformAdminAuditLog[]; total: number }> {
    const conditions = [];
    if (params.adminId) conditions.push(eq(platformAdminAuditLog.adminId, params.adminId));
    if (params.targetType) conditions.push(eq(platformAdminAuditLog.targetType, params.targetType));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db.select({ count: count() }).from(platformAdminAuditLog)
      .where(whereClause);

    const logs = await db.select().from(platformAdminAuditLog)
      .where(whereClause)
      .orderBy(desc(platformAdminAuditLog.createdAt))
      .limit(params.limit || 50)
      .offset(params.offset || 0);

    return { logs, total: Number(countResult?.count || 0) };
  },

  async getAllOrganizations(params: {
    status?: string;
    planName?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ organizations: any[]; total: number }> {
    const conditions = [];

    if (params.search) {
      conditions.push(or(
        ilike(organizations.name, `%${params.search}%`),
        ilike(organizations.email, `%${params.search}%`)
      ));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db.select({ count: count() }).from(organizations)
      .where(whereClause);

    const orgs = await db.select({
      id: organizations.id,
      name: organizations.name,
      email: organizations.email,
      phone: organizations.phone,
      type: organizations.type,
      isSuspended: organizations.isSuspended,
      suspendedAt: organizations.suspendedAt,
      suspendedReason: organizations.suspendedReason,
      createdAt: organizations.createdAt,
    }).from(organizations)
      .where(whereClause)
      .orderBy(desc(organizations.createdAt))
      .limit(params.limit || 50)
      .offset(params.offset || 0);

    const orgsWithSubscriptions = await Promise.all(orgs.map(async (org) => {
      const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, org.id));
      const [clientCount] = await db.select({ count: count() }).from(clients).where(eq(clients.organizationId, org.id));
      const [userCount] = await db.select({ count: count() }).from(users).where(eq(users.organizationId, org.id));

      return {
        ...org,
        subscription: sub || null,
        clientCount: Number(clientCount?.count || 0),
        userCount: Number(userCount?.count || 0),
      };
    }));

    let filteredOrgs = orgsWithSubscriptions;
    if (params.status) {
      filteredOrgs = filteredOrgs.filter(o => o.subscription?.status === params.status);
    }
    if (params.planName) {
      filteredOrgs = filteredOrgs.filter(o => o.subscription?.planName === params.planName);
    }

    return { organizations: filteredOrgs, total: Number(countResult?.count || 0) };
  },

  async getOrganizationWithDetails(id: string): Promise<any> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    if (!org) return null;

    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, id));
    const [clientCount] = await db.select({ count: count() }).from(clients).where(eq(clients.organizationId, id));
    const [userCount] = await db.select({ count: count() }).from(users).where(eq(users.organizationId, id));
    const orgUsers = await db.select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      status: users.status,
      isLocked: users.isLocked,
      emailVerified: users.emailVerified,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.organizationId, id));

    return {
      ...org,
      subscription: sub || null,
      clientCount: Number(clientCount?.count || 0),
      userCount: Number(userCount?.count || 0),
      users: orgUsers,
    };
  },

  async suspendOrganization(id: string, reason: string): Promise<void> {
    await db.update(organizations)
      .set({ isSuspended: true, suspendedAt: new Date(), suspendedReason: reason, updatedAt: new Date() })
      .where(eq(organizations.id, id));
  },

  async unsuspendOrganization(id: string): Promise<void> {
    await db.update(organizations)
      .set({ isSuspended: false, suspendedAt: null, suspendedReason: null, updatedAt: new Date() })
      .where(eq(organizations.id, id));
  },

  async deleteOrganization(id: string): Promise<void> {
    await db.delete(organizations).where(eq(organizations.id, id));
  },

  async getAllUsers(params: {
    organizationId?: string;
    role?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ users: any[]; total: number }> {
    const conditions = [];

    if (params.organizationId) conditions.push(eq(users.organizationId, params.organizationId));
    if (params.role) conditions.push(eq(users.role, params.role));
    if (params.status) conditions.push(eq(users.status, params.status));
    if (params.search) {
      conditions.push(or(
        ilike(users.email, `%${params.search}%`),
        ilike(users.fullName, `%${params.search}%`),
        ilike(users.username, `%${params.search}%`)
      ));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db.select({ count: count() }).from(users).where(whereClause);

    const userList = await db.select({
      id: users.id,
      organizationId: users.organizationId,
      email: users.email,
      username: users.username,
      fullName: users.fullName,
      role: users.role,
      status: users.status,
      isLocked: users.isLocked,
      lockedReason: users.lockedReason,
      emailVerified: users.emailVerified,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    }).from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(params.limit || 50)
      .offset(params.offset || 0);

    const usersWithOrg = await Promise.all(userList.map(async (u) => {
      const [org] = await db.select({ id: organizations.id, name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, u.organizationId!));
      return { ...u, organization: org || null };
    }));

    return { users: usersWithOrg, total: Number(countResult?.count || 0) };
  },

  async lockUser(id: string, reason: string): Promise<void> {
    await db.update(users)
      .set({ isLocked: true, lockedReason: reason, status: 'inactive', updatedAt: new Date() })
      .where(eq(users.id, id));
  },

  async unlockUser(id: string): Promise<void> {
    await db.update(users)
      .set({ isLocked: false, lockedReason: null, status: 'active', updatedAt: new Date() })
      .where(eq(users.id, id));
  },

  async updateSubscriptionAsAdmin(organizationId: string, data: {
    planName?: string;
    billingPeriod?: string;
    status?: string;
    expiresAt?: Date | null;
    nextBillingDate?: Date | null;
    provider?: string;
    notes?: string;
  }, adminId: string): Promise<any> {
    const [existing] = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, organizationId));

    const updateData: any = { updatedAt: new Date(), updatedBy: adminId };
    if (data.planName !== undefined) updateData.planName = data.planName;
    if (data.billingPeriod !== undefined) updateData.billingPeriod = data.billingPeriod;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt;
    if (data.nextBillingDate !== undefined) updateData.nextBillingDate = data.nextBillingDate;
    if (data.provider !== undefined) updateData.provider = data.provider;
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (existing) {
      await db.update(subscriptions)
        .set(updateData)
        .where(eq(subscriptions.organizationId, organizationId));
      const [updated] = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, organizationId));
      return { before: existing, after: updated };
    } else {
      const id = randomUUID();
      await db.insert(subscriptions).values({
        organizationId,
        planName: data.planName || 'starter',
        billingPeriod: data.billingPeriod || 'monthly',
        status: data.status || 'active',
        expiresAt: data.expiresAt,
        nextBillingDate: data.nextBillingDate,
        provider: data.provider || 'manual',
        notes: data.notes,
        updatedBy: adminId,
        id,
      });
      const [created] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
      return { before: null, after: created };
    }
  },

  async getExpiringSubscriptions(daysAhead: number): Promise<any[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const subs = await db.select({
      id: subscriptions.id,
      organizationId: subscriptions.organizationId,
      planName: subscriptions.planName,
      status: subscriptions.status,
      expiresAt: subscriptions.expiresAt,
    }).from(subscriptions)
      .where(and(
        lte(subscriptions.expiresAt, futureDate),
        gte(subscriptions.expiresAt, new Date())
      ));

    const subsWithOrg = await Promise.all(subs.map(async (s) => {
      const [org] = await db.select({ id: organizations.id, name: organizations.name, email: organizations.email })
        .from(organizations)
        .where(eq(organizations.id, s.organizationId));
      return { ...s, organization: org };
    }));

    return subsWithOrg;
  },

  async getPlatformStats(): Promise<{
    totalOrganizations: number;
    activeSubscriptions: number;
    inactiveSubscriptions: number;
    expiringWithin7Days: number;
    expiringWithin14Days: number;
    expiringWithin30Days: number;
  }> {
    const [orgCount] = await db.select({ count: count() }).from(organizations);

    const [activeCount] = await db.select({ count: count() }).from(subscriptions)
      .where(eq(subscriptions.status, 'active'));

    const [inactiveCount] = await db.select({ count: count() }).from(subscriptions)
      .where(or(
        eq(subscriptions.status, 'inactive'),
        eq(subscriptions.status, 'cancelled'),
        eq(subscriptions.status, 'suspended')
      ));

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [exp7] = await db.select({ count: count() }).from(subscriptions)
      .where(and(lte(subscriptions.expiresAt, in7Days), gte(subscriptions.expiresAt, now)));
    const [exp14] = await db.select({ count: count() }).from(subscriptions)
      .where(and(lte(subscriptions.expiresAt, in14Days), gte(subscriptions.expiresAt, now)));
    const [exp30] = await db.select({ count: count() }).from(subscriptions)
      .where(and(lte(subscriptions.expiresAt, in30Days), gte(subscriptions.expiresAt, now)));

    return {
      totalOrganizations: Number(orgCount?.count || 0),
      activeSubscriptions: Number(activeCount?.count || 0),
      inactiveSubscriptions: Number(inactiveCount?.count || 0),
      expiringWithin7Days: Number(exp7?.count || 0),
      expiringWithin14Days: Number(exp14?.count || 0),
      expiringWithin30Days: Number(exp30?.count || 0),
    };
  },

  // Subscription Plans Management
  async getAllSubscriptionPlans(): Promise<SubscriptionPlanConfig[]> {
    return db.select().from(subscriptionPlans).orderBy(subscriptionPlans.sortOrder);
  },

  async getSubscriptionPlanBySlug(slug: string): Promise<SubscriptionPlanConfig | null> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.slug, slug));
    return plan || null;
  },

  async getSubscriptionPlanById(id: string): Promise<SubscriptionPlanConfig | null> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan || null;
  },

  async createSubscriptionPlan(data: InsertSubscriptionPlanConfig): Promise<SubscriptionPlanConfig> {
    const id = randomUUID();
    await db.insert(subscriptionPlans).values({ ...data, id });
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan;
  },

  async updateSubscriptionPlan(id: string, data: Partial<InsertSubscriptionPlanConfig>): Promise<SubscriptionPlanConfig | null> {
    await db.update(subscriptionPlans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptionPlans.id, id));
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan || null;
  },

  async deleteSubscriptionPlan(id: string): Promise<boolean> {
    const result = await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return true;
  },

  // Subscription Override Management
  async updateSubscriptionOverrides(organizationId: string, overrides: {
    maxClientsOverride?: number | null;
    maxSrdDepartmentsOverride?: number | null;
    maxMainStoreOverride?: number | null;
    maxSeatsOverride?: number | null;
    retentionDaysOverride?: number | null;
  }, adminId: string): Promise<any> {
    await db.update(subscriptions)
      .set({
        ...overrides,
        updatedBy: adminId,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.organizationId, organizationId));
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, organizationId));
    return sub;
  },

  // User Management - additional actions
  async forceLogoutUser(id: string): Promise<void> {
    // Force logout by updating the user record (triggers session invalidation on next request)
    // The actual session cleanup happens via the session store middleware
    await db.update(users)
      .set({
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
  },

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  },
};

// Helper to check platform admin permissions
export function canPlatformAdmin(role: PlatformAdminRole, action: string): boolean {
  const permissions: Record<PlatformAdminRole, string[]> = {
    platform_super_admin: ['*'],
    billing_admin: ['view_orgs', 'view_users', 'edit_billing', 'extend_subscription', 'grant_free_access', 'change_plan', 'cancel_subscription', 'view_logs'],
    support_admin: ['view_orgs', 'view_users', 'resend_verification', 'reset_password', 'lock_user', 'unlock_user', 'view_logs'],
    compliance_admin: ['view_orgs', 'view_users', 'view_logs', 'download_logs'],
    readonly_admin: ['view_orgs', 'view_users', 'view_logs'],
  };

  const allowed = permissions[role];
  if (allowed.includes('*')) return true;
  return allowed.includes(action);
}

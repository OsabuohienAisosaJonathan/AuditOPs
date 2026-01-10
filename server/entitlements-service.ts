import { storage } from "./storage";
import { platformAdminStorage } from "./platform-admin-storage";
import { PLAN_LIMITS, type SubscriptionPlan, type Entitlements } from "@shared/schema";

export interface TenantUsage {
  clientsUsed: number;
  srdUsageByClient: Record<string, { mainStoreCount: number; deptStoreCount: number; clientName: string }>;
  totalMainStores: number;
  totalDeptStores: number;
  seatsUsed: number;
}

export interface TenantEntitlements {
  plan: SubscriptionPlan;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  entitlements: Entitlements;
  usage: TenantUsage;
  isActive: boolean;
}

async function getEntitlementsForPlan(planSlug: string, subscription: any): Promise<Entitlements> {
  try {
    const dbPlan = await platformAdminStorage.getSubscriptionPlanBySlug(planSlug);
    if (dbPlan) {
      const baseEntitlements: Entitlements = {
        maxClients: dbPlan.maxClients,
        maxSrdDepartmentsPerClient: dbPlan.maxSrdDepartmentsPerClient,
        maxMainStorePerClient: dbPlan.maxMainStorePerClient,
        maxSeats: dbPlan.maxSeats,
        retentionDays: dbPlan.retentionDays,
        canViewReports: dbPlan.canViewReports,
        canDownloadReports: dbPlan.canDownloadReports,
        canPrintReports: dbPlan.canPrintReports,
        canAccessPurchasesRegisterPage: dbPlan.canAccessPurchasesRegisterPage,
        canAccessSecondHitPage: dbPlan.canAccessSecondHitPage,
        canDownloadSecondHitFullTable: dbPlan.canDownloadSecondHitFullTable,
        canDownloadMainStoreLedgerSummary: dbPlan.canDownloadMainStoreLedgerSummary,
        canUseBetaFeatures: dbPlan.canUseBetaFeatures,
      };
      
      if (subscription) {
        if (subscription.maxClientsOverride != null) baseEntitlements.maxClients = subscription.maxClientsOverride;
        if (subscription.maxSrdDepartmentsOverride != null) baseEntitlements.maxSrdDepartmentsPerClient = subscription.maxSrdDepartmentsOverride;
        if (subscription.maxMainStoreOverride != null) baseEntitlements.maxMainStorePerClient = subscription.maxMainStoreOverride;
        if (subscription.maxSeatsOverride != null) baseEntitlements.maxSeats = subscription.maxSeatsOverride;
        if (subscription.retentionDaysOverride != null) baseEntitlements.retentionDays = subscription.retentionDaysOverride;
      }
      
      return baseEntitlements;
    }
  } catch (err) {
  }
  
  return PLAN_LIMITS[planSlug as SubscriptionPlan] || PLAN_LIMITS.starter;
}

export async function getTenantEntitlements(organizationId: string): Promise<TenantEntitlements> {
  const subscription = await storage.getSubscription(organizationId);
  
  const plan: SubscriptionPlan = (subscription?.planName as SubscriptionPlan) || "starter";
  const entitlements = await getEntitlementsForPlan(plan, subscription);
  
  const usage = await computeTenantUsage(organizationId);
  
  const now = new Date();
  const isActive = subscription ? 
    (subscription.status === "active" || subscription.status === "trial") && 
    (!subscription.endDate || new Date(subscription.endDate) > now) : 
    true;

  return {
    plan,
    status: subscription?.status || "trial",
    startDate: subscription?.startDate || null,
    endDate: subscription?.endDate || null,
    entitlements,
    usage,
    isActive,
  };
}

export async function computeTenantUsage(organizationId: string): Promise<TenantUsage> {
  const clients = await storage.getClients(organizationId);
  const users = await storage.getUsersByOrganization(organizationId, {});
  
  const srdUsageByClient: Record<string, { mainStoreCount: number; deptStoreCount: number; clientName: string }> = {};
  let totalMainStores = 0;
  let totalDeptStores = 0;

  for (const client of clients) {
    const inventoryDepts = await storage.getInventoryDepartments(client.id);
    
    const mainStoreCount = inventoryDepts.filter((d: any) => d.storeType === "main_store").length;
    const deptStoreCount = inventoryDepts.filter((d: any) => d.storeType === "dept_store").length;
    
    srdUsageByClient[client.id] = {
      mainStoreCount,
      deptStoreCount,
      clientName: client.name,
    };
    
    totalMainStores += mainStoreCount;
    totalDeptStores += deptStoreCount;
  }

  return {
    clientsUsed: clients.length,
    srdUsageByClient,
    totalMainStores,
    totalDeptStores,
    seatsUsed: users.length,
  };
}

export async function checkClientCreationLimit(organizationId: string): Promise<{ allowed: boolean; message?: string }> {
  const { entitlements, usage, isActive } = await getTenantEntitlements(organizationId);
  
  if (!isActive) {
    return { allowed: false, message: "Your subscription is inactive. Please renew to add clients." };
  }
  
  if (usage.clientsUsed >= entitlements.maxClients) {
    return { 
      allowed: false, 
      message: `Plan limit reached. Your ${entitlements.maxClients === 1 ? "Starter" : "current"} plan allows ${entitlements.maxClients} client(s). Upgrade to add more clients.` 
    };
  }
  
  return { allowed: true };
}

export async function checkSrdCreationLimit(organizationId: string, clientId: string, storeType: "main_store" | "dept_store"): Promise<{ allowed: boolean; message?: string }> {
  const { entitlements, usage, isActive } = await getTenantEntitlements(organizationId);
  
  if (!isActive) {
    return { allowed: false, message: "Your subscription is inactive. Please renew to add SRD stores." };
  }
  
  const clientUsage = usage.srdUsageByClient[clientId];
  
  if (storeType === "main_store") {
    const currentMainStores = clientUsage?.mainStoreCount || 0;
    if (currentMainStores >= entitlements.maxMainStorePerClient) {
      return { 
        allowed: false, 
        message: `Each client can only have ${entitlements.maxMainStorePerClient} Main Store.` 
      };
    }
  } else {
    const currentDeptStores = clientUsage?.deptStoreCount || 0;
    if (currentDeptStores >= entitlements.maxSrdDepartmentsPerClient) {
      return { 
        allowed: false, 
        message: `Plan limit reached. Your plan allows ${entitlements.maxSrdDepartmentsPerClient} Department Stores per client. Upgrade to add more.` 
      };
    }
  }
  
  return { allowed: true };
}

export async function checkFeatureAccess(organizationId: string, feature: keyof Entitlements): Promise<{ allowed: boolean; message?: string }> {
  const { entitlements, isActive, plan } = await getTenantEntitlements(organizationId);
  
  if (!isActive) {
    return { allowed: false, message: "Your subscription is inactive. Please renew to access this feature." };
  }
  
  const value = entitlements[feature];
  
  if (typeof value === "boolean") {
    if (!value) {
      const featureNames: Record<string, string> = {
        canAccessPurchasesRegisterPage: "Purchases Register",
        canAccessSecondHitPage: "Department Comparison (2nd Hit)",
        canDownloadSecondHitFullTable: "2nd Hit Full Table Download",
        canDownloadMainStoreLedgerSummary: "Main Store Ledger Summary Download",
        canDownloadReports: "Report Downloads",
        canPrintReports: "Report Printing",
      };
      
      return { 
        allowed: false, 
        message: `${featureNames[feature] || feature} is not available on your ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan. Upgrade to access this feature.` 
      };
    }
  }
  
  return { allowed: true };
}

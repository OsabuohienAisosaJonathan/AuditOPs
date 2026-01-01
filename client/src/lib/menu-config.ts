import { Building2, LayoutDashboard, ClipboardCheck, ShoppingBag, PackageSearch, FileCheck, AlertOctagon, FileText, History, Users, ShieldCheck, Settings, UserCog, BookOpen, Receipt } from "lucide-react";
import type { Entitlements } from "./entitlements-context";

export interface NavItem {
  icon: any;
  label: string;
  shortLabel?: string;
  href: string;
  adminOnly?: boolean;
  requiredEntitlement?: keyof Entitlements;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", shortLabel: "Dash", href: "/dashboard" },
  { icon: Building2, label: "Clients", href: "/clients" },
  { icon: ClipboardCheck, label: "Audit Workspace", shortLabel: "Audit", href: "/audit-workspace" },
  { icon: ShoppingBag, label: "Sales Capture", shortLabel: "Sales", href: "/sales-capture" },
  { icon: PackageSearch, label: "Inventory & Purchases", shortLabel: "Inventory", href: "/inventory" },
  { icon: BookOpen, label: "Inventory Ledger", shortLabel: "Ledger", href: "/inventory-ledger" },
  { icon: Receipt, label: "Item Purchases", shortLabel: "Purchases", href: "/item-purchases", requiredEntitlement: "canAccessPurchasesRegisterPage" },
  { icon: FileCheck, label: "Reconciliation", shortLabel: "Recon", href: "/reconciliation" },
  { icon: AlertOctagon, label: "Exceptions", shortLabel: "Except", href: "/exceptions" },
  { icon: FileText, label: "Reports", href: "/reports" },
  { icon: History, label: "Audit Trail", shortLabel: "Trail", href: "/audit-trail" },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { icon: Users, label: "User Management", shortLabel: "Users", href: "/users", adminOnly: true },
  { icon: UserCog, label: "Client Access", shortLabel: "Access", href: "/client-access", adminOnly: true },
  { icon: ShieldCheck, label: "Admin Activity", shortLabel: "Activity", href: "/admin-activity", adminOnly: true },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export const ALL_NAV_ITEMS = [...MAIN_NAV_ITEMS, ...ADMIN_NAV_ITEMS];

export function isFeatureEnabled(item: NavItem, entitlements: Entitlements | null): boolean {
  if (!item.requiredEntitlement) return true;
  if (!entitlements) return false;
  return entitlements[item.requiredEntitlement] === true;
}

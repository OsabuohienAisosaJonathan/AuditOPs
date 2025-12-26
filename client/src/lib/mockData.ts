import { 
  Building2, 
  LayoutDashboard, 
  ClipboardCheck, 
  ShoppingBag, 
  PackageSearch, 
  FileCheck, 
  AlertOctagon, 
  FileText, 
  Settings, 
  History 
} from "lucide-react";

export const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Building2, label: "Clients", href: "/clients" },
  { icon: ClipboardCheck, label: "Audit Workspace", href: "/audit-workspace" },
  { icon: ShoppingBag, label: "Sales Capture", href: "/sales-capture" },
  { icon: PackageSearch, label: "Inventory & Purchases", href: "/inventory" },
  { icon: FileCheck, label: "Reconciliation", href: "/reconciliation" },
  { icon: AlertOctagon, label: "Exceptions", href: "/exceptions" },
  { icon: FileText, label: "Reports", href: "/reports" },
  { icon: Settings, label: "Settings", href: "/settings" },
  { icon: History, label: "Audit Trail", href: "/audit-trail" },
];

export const CLIENTS = [
  { id: "c1", name: "The Grand Lounge", outlets: 3, riskScore: 85, status: "Active" },
  { id: "c2", name: "Ocean View Restaurant", outlets: 2, riskScore: 45, status: "Active" },
  { id: "c3", name: "Skybar Rooftop", outlets: 4, riskScore: 92, status: "Warning" },
  { id: "c4", name: "Urban Bistro", outlets: 1, riskScore: 20, status: "Active" },
];

export const OUTLETS = [
  { id: "o1", name: "Main Bar", clientId: "c1" },
  { id: "o2", name: "VIP Lounge", clientId: "c1" },
  { id: "o3", name: "Kitchen", clientId: "c1" },
];

export const DEPARTMENTS = [
  { id: "d1", name: "Beverage", outletId: "o1" },
  { id: "d2", name: "Food", outletId: "o3" },
  { id: "d3", name: "Tobacco", outletId: "o1" },
];

export const KPIS = {
  sales: { value: "₦ 4,250,000", trend: "+12%", status: "success" },
  cogs: { value: "32%", trend: "-2%", status: "success" },
  variance: { value: "- ₦ 125,000", trend: "+5%", status: "destructive" },
  grossMargin: { value: "68%", trend: "+1%", status: "success" },
};

export const ALERTS = [
  { id: 1, type: "critical", message: "High variance detected in Main Bar (>15%)", time: "2 hrs ago" },
  { id: 2, type: "warning", message: "Missing GRN for Invoice #INV-2024-001", time: "4 hrs ago" },
  { id: 3, type: "info", message: "Stock count pending for VIP Lounge", time: "5 hrs ago" },
];

export const AUDIT_TASKS = [
  { id: 1, label: "Sales Captured", status: "completed", time: "09:45 AM", user: "John Doe" },
  { id: 2, label: "Purchases Captured", status: "completed", time: "10:15 AM", user: "John Doe" },
  { id: 3, label: "Transfers/Adjustments", status: "pending", time: "-", user: "-" },
  { id: 4, label: "Stock Counts", status: "pending", time: "-", user: "-" },
  { id: 5, label: "Reconciliation", status: "pending", time: "-", user: "-" },
];

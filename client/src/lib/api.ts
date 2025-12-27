import { toast } from "sonner";

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  status?: string;
  lastLoginAt?: Date | null;
  createdAt?: Date;
  accessScope?: { clientIds?: string[]; departmentIds?: string[]; global?: boolean } | null;
  phone?: string | null;
  mustChangePassword?: boolean;
}

export interface AdminActivityLog {
  id: string;
  actorId: string;
  targetUserId: string | null;
  actionType: string;
  beforeState: any;
  afterState: any;
  reason: string | null;
  ipAddress: string | null;
  createdAt: Date;
}

export interface SetupStatus {
  setupRequired: boolean;
  requiresSecret: boolean;
}

export interface Client {
  id: string;
  name: string;
  status: string;
  riskScore: number | null;
  varianceThreshold: string;
  createdAt: Date;
}

export interface Category {
  id: string;
  clientId: string;
  name: string;
  status: string;
  createdBy: string | null;
  createdAt: Date;
}

export interface Department {
  id: string;
  clientId: string;
  categoryId: string | null;
  name: string;
  status: string;
  suspendReason: string | null;
  createdBy: string | null;
  createdAt: Date;
}

export interface SupportingDocument {
  name: string;
  url: string;
  type: string;
}

export interface PaymentDeclaration {
  id: string;
  clientId: string;
  departmentId: string;
  date: string;
  reportedCash: string | null;
  reportedPosSettlement: string | null;
  reportedTransfers: string | null;
  totalReported: string | null;
  notes: string | null;
  supportingDocuments: SupportingDocument[] | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReconciliationHint {
  captured: {
    totalCash: number;
    totalPos: number;
    totalTransfer: number;
    totalSales: number;
  };
  reported: {
    cash: number;
    pos: number;
    transfers: number;
    total: number;
    notes: string | null;
    documents: SupportingDocument[] | null;
  } | null;
  difference: {
    cash: number;
    pos: number;
    transfers: number;
    total: number;
  };
  hasDeclaration: boolean;
  status: 'balanced' | 'over_declared' | 'under_declared';
}

export interface Supplier {
  id: string;
  clientId: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: string;
  createdAt: Date;
}

export interface Item {
  id: string;
  clientId: string;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  reorderLevel: number;
  status: string;
  createdAt: Date;
}

export interface PurchaseLine {
  id: string;
  purchaseId: string;
  itemId: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  createdAt: Date;
}

export interface StockCount {
  id: string;
  departmentId: string;
  itemId: string;
  date: Date;
  openingQty: string;
  receivedQty: string;
  soldQty: string;
  expectedClosingQty: string;
  actualClosingQty: string | null;
  varianceQty: string;
  varianceValue: string;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface SalesEntry {
  id: string;
  clientId: string;
  departmentId: string;
  date: Date;
  shift: string | null;
  cashAmount: string;
  posAmount: string;
  transferAmount: string;
  voidsAmount: string;
  discountsAmount: string;
  totalSales: string;
  mode: string | null;
  evidenceUrl: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface Purchase {
  id: string;
  clientId: string;
  departmentId: string;
  supplierName: string;
  invoiceRef: string;
  invoiceDate: Date;
  totalAmount: string;
  status: string | null;
  evidenceUrl: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface StockMovement {
  id: string;
  clientId: string;
  departmentId: string;
  movementType: string;
  sourceLocation: string | null;
  destinationLocation: string | null;
  itemsDescription: string;
  totalValue: string;
  authorizedBy: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface Reconciliation {
  id: string;
  clientId: string;
  departmentId: string;
  date: Date;
  openingStock: any;
  additions: any;
  expectedUsage: any;
  physicalCount: any;
  varianceQty: string;
  varianceValue: string;
  status: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdBy: string;
  createdAt: Date;
}

export interface Exception {
  id: string;
  caseNumber: string;
  clientId: string;
  departmentId: string;
  summary: string;
  description: string | null;
  impact: string | null;
  severity: string | null;
  status: string | null;
  evidenceUrls: string[] | null;
  assignedTo: string | null;
  resolvedAt: Date | null;
  createdBy: string;
  createdAt: Date;
}

export interface ExceptionComment {
  id: string;
  exceptionId: string;
  comment: string;
  createdBy: string;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: Date;
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

const API_BASE = "/api";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Request failed" }));
      const errorMessage = error.error || error.message || "Request failed";

      switch (response.status) {
        case 401:
          toast.error("Session expired, please log in again");
          break;
        case 403:
          toast.error("You don't have permission to perform this action");
          break;
        case 404:
          toast.error("Resource not found");
          break;
        case 422:
          toast.error(errorMessage || "Validation error");
          break;
        case 500:
          toast.error("Server error, please try again");
          break;
        default:
          if (response.status >= 400) {
            toast.error(errorMessage);
          }
      }

      throw new ApiError(response.status, errorMessage);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }
    return {} as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof TypeError && error.message.includes("fetch")) {
      toast.error("Network error, please check your connection");
      throw new ApiError(0, "Network error, please check your connection");
    }
    throw error;
  }
}

export const authApi = {
  login: (username: string, password: string) =>
    fetchApi<User>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  register: (data: { username: string; password: string; fullName: string; email: string; role?: string; phone?: string }) =>
    fetchApi<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  logout: () =>
    fetchApi<{ success: boolean }>("/auth/logout", {
      method: "POST",
    }),

  me: () => fetchApi<User>("/auth/me"),
};

export interface DashboardFilters {
  clientId?: string;
  categoryId?: string;
  departmentId?: string;
  date?: string;
}

export const dashboardApi = {
  getSummary: (filters?: DashboardFilters) => {
    const params = new URLSearchParams();
    if (filters?.clientId) params.set("clientId", filters.clientId);
    if (filters?.categoryId) params.set("categoryId", filters.categoryId);
    if (filters?.departmentId) params.set("departmentId", filters.departmentId);
    if (filters?.date) params.set("date", filters.date);
    const queryString = params.toString();
    return fetchApi<DashboardSummary>(`/dashboard/summary${queryString ? `?${queryString}` : ""}`);
  },
};

export const categoriesApi = {
  getAll: () => fetchApi<Category[]>("/categories"),
  getByClient: (clientId: string) => fetchApi<Category[]>(`/clients/${clientId}/categories`),
  get: (id: string) => fetchApi<Category>(`/categories/${id}`),
  create: (data: { clientId: string; name: string }) =>
    fetchApi<Category>("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<{ name: string; status: string }>) =>
    fetchApi<Category>(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<{ success: boolean }>(`/categories/${id}`, {
      method: "DELETE",
    }),
};

export const departmentsApi = {
  getAll: () => fetchApi<Department[]>("/departments"),
  getByClient: (clientId: string) => fetchApi<Department[]>(`/clients/${clientId}/departments`),
  getByCategory: (categoryId: string) => fetchApi<Department[]>(`/categories/${categoryId}/departments`),
  get: (id: string) => fetchApi<Department>(`/departments/${id}`),
  checkUsage: (id: string) => fetchApi<{ isUsed: boolean }>(`/departments/${id}/usage`),
  
  create: (clientId: string, data: { name: string; categoryId?: string }) =>
    fetchApi<Department>(`/clients/${clientId}/departments`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  createBulk: (data: { departments: string[]; clientId: string; categoryId?: string }) =>
    fetchApi<Department[]>("/departments/bulk", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<{ name: string; categoryId: string | null; status: string; suspendReason: string }>) =>
    fetchApi<Department>(`/departments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<{ success: boolean } | { error: string }>(`/departments/${id}`, {
      method: "DELETE",
    }),
};

export const clientsApi = {
  getAll: () => fetchApi<Client[]>("/clients"),
  get: (id: string) => fetchApi<Client>(`/clients/${id}`),
  create: (data: { name: string; varianceThreshold?: string }) =>
    fetchApi<Client>("/clients", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<{ name: string; status: string; varianceThreshold: string }>) =>
    fetchApi<Client>(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<void>(`/clients/${id}`, {
      method: "DELETE",
    }),
};

export const paymentDeclarationsApi = {
  getByDepartment: (departmentId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const queryString = params.toString();
    return fetchApi<PaymentDeclaration[]>(`/payment-declarations/${departmentId}${queryString ? `?${queryString}` : ""}`);
  },
  get: (clientId: string, departmentId: string, date: string) => 
    fetchApi<PaymentDeclaration>(`/payment-declarations/${clientId}/${departmentId}/${date}`),
  create: (data: {
    clientId: string;
    departmentId: string;
    date: string;
    reportedCash?: string;
    reportedPosSettlement?: string;
    reportedTransfers?: string;
    notes?: string;
    supportingDocuments?: SupportingDocument[];
  }) =>
    fetchApi<PaymentDeclaration>("/payment-declarations", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<{
    reportedCash: string;
    reportedPosSettlement: string;
    reportedTransfers: string;
    notes: string;
    supportingDocuments: SupportingDocument[];
  }>) =>
    fetchApi<PaymentDeclaration>(`/payment-declarations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<{ success: boolean }>(`/payment-declarations/${id}`, {
      method: "DELETE",
    }),
};

export const reconciliationHintApi = {
  get: (departmentId: string, date: string) => 
    fetchApi<ReconciliationHint>(`/reconciliation-hint/${departmentId}/${date}`),
};

export const suppliersApi = {
  getByClient: (clientId: string) => fetchApi<Supplier[]>(`/suppliers?clientId=${clientId}`),
  get: (id: string) => fetchApi<Supplier>(`/suppliers/${id}`),
  create: (data: any) =>
    fetchApi<Supplier>("/suppliers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    fetchApi<Supplier>(`/suppliers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<void>(`/suppliers/${id}`, {
      method: "DELETE",
    }),
};

export const itemsApi = {
  getByClient: (clientId: string) => fetchApi<Item[]>(`/items?clientId=${clientId}`),
  get: (id: string) => fetchApi<Item>(`/items/${id}`),
  create: (data: any) =>
    fetchApi<Item>("/items", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    fetchApi<Item>(`/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<void>(`/items/${id}`, {
      method: "DELETE",
    }),
};

export const purchasesApi = {
  getAll: (clientId?: string, departmentId?: string) => {
    const params = new URLSearchParams();
    if (clientId) params.append("clientId", clientId);
    if (departmentId) params.append("departmentId", departmentId);
    return fetchApi<Purchase[]>(`/purchases${params.toString() ? `?${params}` : ""}`);
  },
  get: (id: string) => fetchApi<Purchase>(`/purchases/${id}`),
  getLines: (id: string) => fetchApi<PurchaseLine[]>(`/purchases/${id}/lines`),
  create: (data: any) =>
    fetchApi<Purchase>("/purchases", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    fetchApi<Purchase>(`/purchases/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<void>(`/purchases/${id}`, {
      method: "DELETE",
    }),
};

export interface SalesSummary {
  totalCash: number;
  totalPos: number;
  totalTransfer: number;
  totalVoids: number;
  grandTotal: number;
  entriesCount: number;
  departmentsCount?: number;
  avgPerEntry: number;
}

export const salesEntriesApi = {
  getAll: (params?: { clientId?: string; departmentId?: string; date?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.clientId) searchParams.append("clientId", params.clientId);
    if (params?.departmentId) searchParams.append("departmentId", params.departmentId);
    if (params?.date) searchParams.append("date", params.date);
    return fetchApi<SalesEntry[]>(`/sales-entries${searchParams.toString() ? `?${searchParams}` : ""}`);
  },
  getSummary: (params: { clientId: string; departmentId?: string; date: string }) => {
    const searchParams = new URLSearchParams();
    searchParams.append("clientId", params.clientId);
    if (params.departmentId) searchParams.append("departmentId", params.departmentId);
    searchParams.append("date", params.date);
    return fetchApi<SalesSummary>(`/sales-entries/summary?${searchParams}`);
  },
  get: (id: string) => fetchApi<SalesEntry>(`/sales-entries/${id}`),
  create: (data: {
    clientId: string;
    departmentId: string;
    date: string;
    shift: string;
    cashAmount: string;
    posAmount: string;
    transferAmount: string;
    voidsAmount?: string;
    discountsAmount?: string;
    totalSales: string;
    mode?: string;
    notes?: string;
  }) =>
    fetchApi<SalesEntry>("/sales-entries", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<{
    shift: string;
    cashAmount: string;
    posAmount: string;
    transferAmount: string;
    voidsAmount: string;
    discountsAmount: string;
    totalSales: string;
    notes: string;
  }>) =>
    fetchApi<SalesEntry>(`/sales-entries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<void>(`/sales-entries/${id}`, {
      method: "DELETE",
    }),
  import: (data: any) =>
    fetchApi<any>("/sales-entries/import", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const stockCountsApi = {
  getAll: (departmentId: string, date?: string) => {
    const params = new URLSearchParams({ departmentId });
    if (date) params.append("date", date);
    return fetchApi<StockCount[]>(`/stock-counts?${params}`);
  },
  get: (id: string) => fetchApi<StockCount>(`/stock-counts/${id}`),
  create: (data: any) =>
    fetchApi<StockCount>("/stock-counts", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    fetchApi<StockCount>(`/stock-counts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<void>(`/stock-counts/${id}`, {
      method: "DELETE",
    }),
};

export const stockMovementsApi = {
  getAll: (filters?: { clientId?: string; departmentId?: string; date?: string }) => {
    const params = new URLSearchParams();
    if (filters?.clientId) params.append("clientId", filters.clientId);
    if (filters?.departmentId) params.append("departmentId", filters.departmentId);
    if (filters?.date) params.append("date", filters.date);
    return fetchApi<StockMovement[]>(`/stock-movements${params.toString() ? `?${params}` : ""}`);
  },
  get: (id: string) => fetchApi<StockMovement>(`/stock-movements/${id}`),
  create: (data: any) =>
    fetchApi<StockMovement>("/stock-movements", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    fetchApi<StockMovement>(`/stock-movements/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<void>(`/stock-movements/${id}`, {
      method: "DELETE",
    }),
};

export const reconciliationsApi = {
  getAll: (departmentId?: string, date?: string) => {
    const params = new URLSearchParams();
    if (departmentId) params.append("departmentId", departmentId);
    if (date) params.append("date", date);
    return fetchApi<Reconciliation[]>(`/reconciliations${params.toString() ? `?${params}` : ""}`);
  },
  get: (id: string) => fetchApi<Reconciliation>(`/reconciliations/${id}`),
  create: (data: any) =>
    fetchApi<Reconciliation>("/reconciliations", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    fetchApi<Reconciliation>(`/reconciliations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<void>(`/reconciliations/${id}`, {
      method: "DELETE",
    }),
  compute: (departmentId: string, date: string) =>
    fetchApi<any>("/reconciliations/compute", {
      method: "POST",
      body: JSON.stringify({ departmentId, date }),
    }),
};

export const exceptionsApi = {
  getAll: (filters?: { clientId?: string; departmentId?: string; status?: string; severity?: string }) => {
    const params = new URLSearchParams();
    if (filters?.clientId) params.append("clientId", filters.clientId);
    if (filters?.departmentId) params.append("departmentId", filters.departmentId);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.severity) params.append("severity", filters.severity);
    return fetchApi<Exception[]>(`/exceptions${params.toString() ? `?${params}` : ""}`);
  },
  get: (id: string) => fetchApi<Exception>(`/exceptions/${id}`),
  create: (data: any) =>
    fetchApi<Exception>("/exceptions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    fetchApi<Exception>(`/exceptions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<void>(`/exceptions/${id}`, {
      method: "DELETE",
    }),
  getComments: (exceptionId: string) => fetchApi<ExceptionComment[]>(`/exceptions/${exceptionId}/comments`),
  addComment: (id: string, comment: string) =>
    fetchApi<ExceptionComment>(`/exceptions/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    }),
};

export const reportsApi = {
  generate: (type: "pdf" | "excel", params?: Record<string, string>) => {
    const searchParams = new URLSearchParams({ type, ...params });
    return fetchApi<{ url: string; filename: string }>(`/reports/generate?${searchParams}`);
  },
};

export const auditLogsApi = {
  getAll: (filters?: {
    userId?: string;
    entity?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.userId) params.append("userId", filters.userId);
    if (filters?.entity) params.append("entity", filters.entity);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.offset) params.append("offset", filters.offset.toString());
    return fetchApi<{ logs: AuditLog[]; total: number }>(`/audit-logs?${params}`);
  },
};

export const setupApi = {
  getStatus: () => fetchApi<SetupStatus>("/setup/status"),
  bootstrap: (data: { fullName: string; email: string; username: string; password: string; bootstrapSecret?: string }) =>
    fetchApi<{ success: boolean; message: string; mustChangePassword: boolean; user: User }>("/setup/bootstrap", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const usersApi = {
  getAll: (filters?: { role?: string; status?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.role) params.append("role", filters.role);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.search) params.append("search", filters.search);
    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchApi<User[]>(`/users${query}`);
  },
  getOne: (id: string) => fetchApi<User>(`/users/${id}`),
  create: (data: { fullName: string; email: string; username: string; role: string; phone?: string; accessScope?: any }) =>
    fetchApi<{ user: User; temporaryPassword: string; message: string }>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<User>) =>
    fetchApi<User>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deactivate: (id: string, reason?: string) =>
    fetchApi<{ success: boolean; message: string }>(`/users/${id}/deactivate`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  reactivate: (id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/users/${id}/reactivate`, {
      method: "POST",
    }),
  resetPassword: (id: string) =>
    fetchApi<{ success: boolean; temporaryPassword: string; message: string }>(`/users/${id}/reset-password`, {
      method: "POST",
    }),
  delete: (id: string, confirmation: string, reason?: string) =>
    fetchApi<{ success: boolean; message: string }>(`/users/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ confirmation, reason }),
    }),
};

export const adminActivityLogsApi = {
  getAll: (filters?: {
    actorId?: string;
    targetUserId?: string;
    actionType?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.actorId) params.append("actorId", filters.actorId);
    if (filters?.targetUserId) params.append("targetUserId", filters.targetUserId);
    if (filters?.actionType) params.append("actionType", filters.actionType);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    return fetchApi<AdminActivityLog[]>(`/admin-activity-logs?${params}`);
  },
};

export const passwordApi = {
  change: (currentPassword: string, newPassword: string) =>
    fetchApi<{ success: boolean; message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

export interface UserClientAccess {
  id: string;
  userId: string;
  clientId: string;
  status: "assigned" | "suspended" | "removed";
  assignedBy: string;
  notes: string | null;
  suspendReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditContext {
  id: string;
  userId: string;
  clientId: string;
  departmentId: string | null;
  period: string;
  startDate: Date;
  endDate: Date;
  status: string;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface Audit {
  id: string;
  clientId: string;
  departmentId: string | null;
  period: string;
  startDate: Date;
  endDate: Date;
  status: "draft" | "submitted" | "locked";
  notes: string | null;
  createdBy: string;
  submittedBy: string | null;
  submittedAt: Date | null;
  lockedBy: string | null;
  lockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditReissuePermission {
  id: string;
  auditId: string;
  grantedTo: string;
  grantedBy: string;
  expiresAt: Date | null;
  scope: string;
  reason: string | null;
  active: boolean;
  createdAt: Date;
}

export interface AuditChangeLog {
  id: string;
  auditId: string;
  userId: string;
  clientId: string | null;
  departmentId: string | null;
  actionType: string;
  entityType: string | null;
  entityId: string | null;
  beforeState: any;
  afterState: any;
  notes: string | null;
  createdAt: Date;
}

export const userClientAccessApi = {
  getByUser: (userId: string) => fetchApi<UserClientAccess[]>(`/user-client-access/user/${userId}`),
  getByClient: (clientId: string) => fetchApi<UserClientAccess[]>(`/user-client-access/client/${clientId}`),
  check: (userId: string, clientId: string) => fetchApi<UserClientAccess | null>(`/user-client-access/${userId}/${clientId}`),
  assign: (data: { userId: string; clientId: string; status?: string; notes?: string }) =>
    fetchApi<UserClientAccess>("/user-client-access", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { status?: string; notes?: string; suspendReason?: string }) =>
    fetchApi<UserClientAccess>(`/user-client-access/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<{ success: boolean }>(`/user-client-access/${id}`, {
      method: "DELETE",
    }),
};

export const auditContextApi = {
  getCurrent: () => fetchApi<AuditContext | null>("/audit-context"),
  set: (data: { clientId: string; departmentId?: string; period?: string; startDate: string; endDate: string }) =>
    fetchApi<AuditContext>("/audit-context", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  clear: () =>
    fetchApi<{ success: boolean }>("/audit-context", {
      method: "DELETE",
    }),
};

export const auditsApi = {
  getAll: (filters?: { clientId?: string; departmentId?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.clientId) params.append("clientId", filters.clientId);
    if (filters?.departmentId) params.append("departmentId", filters.departmentId);
    if (filters?.status) params.append("status", filters.status);
    return fetchApi<Audit[]>(`/audits${params.toString() ? `?${params}` : ""}`);
  },
  get: (id: string) => fetchApi<Audit>(`/audits/${id}`),
  create: (data: { clientId: string; departmentId?: string; period?: string; startDate: string; endDate: string; notes?: string }) =>
    fetchApi<Audit>("/audits", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Audit>) =>
    fetchApi<Audit>(`/audits/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  submit: (id: string) =>
    fetchApi<Audit>(`/audits/${id}/submit`, {
      method: "POST",
    }),
  lock: (id: string) =>
    fetchApi<Audit>(`/audits/${id}/lock`, {
      method: "POST",
    }),
  getReissuePermissions: (auditId: string) => fetchApi<AuditReissuePermission[]>(`/audits/${auditId}/reissue-permissions`),
  grantReissuePermission: (auditId: string, data: { grantedTo: string; expiresAt?: string; scope?: string; reason?: string }) =>
    fetchApi<AuditReissuePermission>(`/audits/${auditId}/reissue-permissions`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  revokeReissuePermission: (auditId: string, permissionId: string) =>
    fetchApi<{ success: boolean }>(`/audits/${auditId}/reissue-permissions/${permissionId}`, {
      method: "DELETE",
    }),
  getChangeLog: (auditId: string) => fetchApi<AuditChangeLog[]>(`/audits/${auditId}/change-log`),
};

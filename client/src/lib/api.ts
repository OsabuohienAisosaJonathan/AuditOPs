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
  accessScope?: { clientIds?: string[]; outletIds?: string[]; global?: boolean } | null;
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

export interface Outlet {
  id: string;
  clientId: string;
  name: string;
  createdAt: Date;
}

export interface Department {
  id: string;
  outletId: string;
  name: string;
  status: string;
  createdAt: Date;
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
  outletId: string;
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
  outletId: string;
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
  outletId: string;
  departmentId: string | null;
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
  activeOutlets: number;
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
  departmentId?: string;
  date?: string;
}

export const dashboardApi = {
  getSummary: (filters?: DashboardFilters) => {
    const params = new URLSearchParams();
    if (filters?.clientId) params.set("clientId", filters.clientId);
    if (filters?.departmentId) params.set("departmentId", filters.departmentId);
    if (filters?.date) params.set("date", filters.date);
    const queryString = params.toString();
    return fetchApi<DashboardSummary>(`/dashboard/summary${queryString ? `?${queryString}` : ""}`);
  },
};

export const departmentsApi = {
  getAll: () => fetchApi<Department[]>("/departments"),
  getByClient: (clientId: string) => fetchApi<Department[]>(`/departments/by-client/${clientId}`),
  getByOutlet: (outletId: string) => fetchApi<Department[]>(`/outlets/${outletId}/departments`),
  get: (id: string) => fetchApi<Department>(`/departments/${id}`),
  create: (outletId: string, data: any) =>
    fetchApi<Department>(`/outlets/${outletId}/departments`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    fetchApi<Department>(`/departments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<void>(`/departments/${id}`, {
      method: "DELETE",
    }),
};

export const clientsApi = {
  getAll: () => fetchApi<Client[]>("/clients"),
  get: (id: string) => fetchApi<Client>(`/clients/${id}`),
  create: (data: any) =>
    fetchApi<Client>("/clients", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    fetchApi<Client>(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<void>(`/clients/${id}`, {
      method: "DELETE",
    }),
};

export const outletsApi = {
  getByClient: (clientId: string) => fetchApi<Outlet[]>(`/outlets?clientId=${clientId}`),
  get: (id: string) => fetchApi<Outlet>(`/outlets/${id}`),
  create: (data: any) =>
    fetchApi<Outlet>("/outlets", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    fetchApi<Outlet>(`/outlets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<void>(`/outlets/${id}`, {
      method: "DELETE",
    }),
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
  getAll: (outletId?: string) => fetchApi<Purchase[]>(`/purchases${outletId ? `?outletId=${outletId}` : ""}`),
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

export const salesEntriesApi = {
  getAll: (departmentId?: string, date?: string) => {
    const params = new URLSearchParams();
    if (departmentId) params.append("departmentId", departmentId);
    if (date) params.append("date", date);
    return fetchApi<SalesEntry[]>(`/sales-entries${params.toString() ? `?${params}` : ""}`);
  },
  get: (id: string) => fetchApi<SalesEntry>(`/sales-entries/${id}`),
  create: (data: any) =>
    fetchApi<SalesEntry>("/sales-entries", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
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

export const reconciliationsApi = {
  getAll: (departmentId?: string) =>
    fetchApi<Reconciliation[]>(`/reconciliations${departmentId ? `?departmentId=${departmentId}` : ""}`),
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
  getAll: (filters?: { outletId?: string; status?: string; severity?: string }) => {
    const params = new URLSearchParams();
    if (filters?.outletId) params.append("outletId", filters.outletId);
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
  getAll: (filters?: { actorId?: string; targetUserId?: string; actionType?: string; startDate?: string; endDate?: string }) => {
    const params = new URLSearchParams();
    if (filters?.actorId) params.append("actorId", filters.actorId);
    if (filters?.targetUserId) params.append("targetUserId", filters.targetUserId);
    if (filters?.actionType) params.append("actionType", filters.actionType);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchApi<AdminActivityLog[]>(`/admin-activity-logs${query}`);
  },
};

export const changePasswordApi = {
  change: (currentPassword: string, newPassword: string) =>
    fetchApi<{ success: boolean; message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

export const movementsApi = {
  getByOutlet: (outletId: string) => fetchApi<StockMovement[]>(`/outlets/${outletId}/movements`),
  create: (data: Partial<StockMovement>) =>
    fetchApi<StockMovement>("/movements", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const salesApi = {
  getByDepartment: (departmentId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchApi<SalesEntry[]>(`/departments/${departmentId}/sales${query}`);
  },
  create: (data: Partial<SalesEntry>) =>
    fetchApi<SalesEntry>("/sales", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<SalesEntry>) =>
    fetchApi<SalesEntry>(`/sales/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// API Client for Miemploya AuditOps

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
  details: string | null;
  ipAddress: string | null;
  createdAt: Date;
}

const API_BASE = "/api";

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }

  return response.json();
}

// Auth
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

// Clients
export const clientsApi = {
  getAll: () => fetchApi<Client[]>("/clients"),
  getOne: (id: string) => fetchApi<Client>(`/clients/${id}`),
  create: (data: Partial<Client>) =>
    fetchApi<Client>("/clients", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Client>) =>
    fetchApi<Client>(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// Outlets
export const outletsApi = {
  getByClient: (clientId: string) =>
    fetchApi<Outlet[]>(`/clients/${clientId}/outlets`),
  create: (data: Partial<Outlet>) =>
    fetchApi<Outlet>("/outlets", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Departments
export const departmentsApi = {
  getByOutlet: (outletId: string) =>
    fetchApi<Department[]>(`/outlets/${outletId}/departments`),
  create: (data: Partial<Department>) =>
    fetchApi<Department>("/departments", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Sales
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

// Purchases
export const purchasesApi = {
  getByOutlet: (outletId: string) =>
    fetchApi<Purchase[]>(`/outlets/${outletId}/purchases`),
  create: (data: Partial<Purchase>) =>
    fetchApi<Purchase>("/purchases", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Purchase>) =>
    fetchApi<Purchase>(`/purchases/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// Stock Movements
export const movementsApi = {
  getByOutlet: (outletId: string) =>
    fetchApi<StockMovement[]>(`/outlets/${outletId}/movements`),
  create: (data: Partial<StockMovement>) =>
    fetchApi<StockMovement>("/movements", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Exceptions
export const exceptionsApi = {
  getAll: (outletId?: string) => {
    const query = outletId ? `?outletId=${outletId}` : "";
    return fetchApi<Exception[]>(`/exceptions${query}`);
  },
  getOne: (id: string) => fetchApi<Exception>(`/exceptions/${id}`),
  create: (data: Partial<Exception>) =>
    fetchApi<Exception>("/exceptions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Exception>) =>
    fetchApi<Exception>(`/exceptions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  getComments: (exceptionId: string) =>
    fetchApi<ExceptionComment[]>(`/exceptions/${exceptionId}/comments`),
  addComment: (exceptionId: string, comment: string) =>
    fetchApi<ExceptionComment>(`/exceptions/${exceptionId}/comments`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    }),
};

// Audit Logs
export const auditLogsApi = {
  getAll: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : "";
    return fetchApi<AuditLog[]>(`/audit-logs${query}`);
  },
};

// Setup (Bootstrap)
export const setupApi = {
  getStatus: () => fetchApi<SetupStatus>("/setup/status"),
  bootstrap: (data: { fullName: string; email: string; username: string; password: string; bootstrapSecret?: string }) =>
    fetchApi<{ success: boolean; message: string; mustChangePassword: boolean; user: User }>("/setup/bootstrap", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// User Management (Super Admin only)
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

// Admin Activity Logs
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

// Change Password
export const changePasswordApi = {
  change: (currentPassword: string, newPassword: string) =>
    fetchApi<{ success: boolean; message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

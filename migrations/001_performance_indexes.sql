-- Performance Indexes Migration
-- Created: 2026-01-03
-- Purpose: Add missing indexes to improve query performance and prevent timeouts

-- User lookups by organization
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);

-- Client lookups by organization (critical for multi-tenant isolation)
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON clients(organization_id);

-- Department lookups by client
CREATE INDEX IF NOT EXISTS idx_departments_client_id ON departments(client_id);

-- Category lookups by client
CREATE INDEX IF NOT EXISTS idx_categories_client_id ON categories(client_id);

-- Notification lookups by organization and user
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Sales entries lookups
CREATE INDEX IF NOT EXISTS idx_sales_entries_department_id ON sales_entries(department_id);
CREATE INDEX IF NOT EXISTS idx_sales_entries_client_id ON sales_entries(client_id);

-- Stock movements by client
CREATE INDEX IF NOT EXISTS idx_stock_movements_client_id ON stock_movements(client_id);

-- Items and suppliers by client
CREATE INDEX IF NOT EXISTS idx_items_client_id ON items(client_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_client_id ON suppliers(client_id);

-- User client access lookups (for permission checks)
CREATE INDEX IF NOT EXISTS idx_user_client_access_user_id ON user_client_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_client_access_client_id ON user_client_access(client_id);

-- Additional composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sales_entries_client_date ON sales_entries(client_id, date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_client_date ON stock_movements(client_id, date);
CREATE INDEX IF NOT EXISTS idx_exceptions_client_status ON exceptions(client_id, status);

# Miemploya AuditOps

## Overview

Miemploya AuditOps is a multi-client audit operations platform for the hospitality industry (lounges and restaurants). It enables Miemploya's internal audit team to conduct daily and weekly audits across multiple clients, outlets, and departments. The platform facilitates sales capture, inventory and purchase tracking, daily reconciliation, exception management, and comprehensive reporting, all supported by robust role-based access control and audit trails.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **UI Components**: shadcn/ui built on Radix UI
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Offline Resilience**: Network status detection, IndexedDB caching via `localforage`, and stale-while-revalidate strategy using `useCachedQuery` for improved reliability and performance.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Session Management**: express-session with connect-pg-simple
- **Authentication**: Custom bcrypt-based implementation with role-based and scope-based access control.
- **API Pattern**: RESTful endpoints.
- **Multi-Tenant Data Isolation**: Critical security pattern ensuring all data access is scoped by `organizationId` via middleware and storage methods.

### Database Schema
PostgreSQL database supporting core entities like `users`, `clients`, `outlets`, `departments`, `salesEntries`, `purchases`, `goodsReceivedNotes`, `reconciliations`, `exceptions`, and audit logs. Includes flexible department management with inheritance options and robust serial number tracking (`none`, `serial`, `batch`, `lot`, `imei`).

### Department Architecture
Supports client-level and outlet-level departments with configurable inheritance modes (`inherit_only`, `outlet_only`, `inherit_add`) and individual inheritance toggles for client departments per outlet.

### Authentication & Authorization
Session-based authentication with `super_admin`, `supervisor`, `auditor` roles. Features include rate limiting, strong password requirements, and email verification. A bootstrap flow is available for initial super admin creation.

### Owner Console (Platform Admin)
A separate, isolated administrative interface at `/owner/*` routes for MiAuditOps internal staff. Uses distinct authentication (login at `/owner/login`), roles (`platform_super_admin`, `billing_admin`, `support_admin`, `compliance_admin`, `readonly_admin`), and database tables. Provides features for managing tenants (organizations), users, billing, entitlements, and audit logs. API endpoints use `/api/owner/*` namespace. Tenant billing is read-only; all subscription management flows through the Owner Console.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store.
- **Drizzle Kit**: For database migrations.

### Authentication
- **bcrypt**: Password hashing.
- **connect-pg-simple**: PostgreSQL session storage.
- **express-session**: Session management middleware.

### UI Libraries
- **Radix UI**: Accessible component primitives.
- **Recharts**: Data visualization.
- **date-fns**: Date manipulation.
- **lucide-react**: Icon library.

### Development Tools
- **Replit Vite Plugins**: Integration with Replit environment.
- **TypeScript**: Full-stack type safety.

### Email Service
- **Resend**: Transactional email sending (e.g., verification, password reset).

## Recent Changes

### SR-D Ledger Issue vs Transfer Column Fix (2026-01-07)
Fixed a critical bug where Issue movements (Main Store → Department Store) were incorrectly populating Transfer columns instead of Added/Issued columns.

**Root Causes Identified:**
1. Database schema mismatch: 8 columns in `store_stock` table were `text` type instead of `numeric`, causing "invalid input syntax for type numeric" errors during backfill
2. Empty string handling: Historic rows contained empty strings ("") that caused NaN when parsed
3. Silent error logging: console.error output wasn't visible in workflow logs

**Fixes Applied:**
1. Converted 8 columns to `numeric(10,2)`: transfers_in_qty, transfers_out_qty, inter_dept_in_qty, inter_dept_out_qty, waste_qty, write_off_qty, adjustment_qty, sold_qty
2. Added `ensureFinite()` and `safeToFixed()` helpers to prevent NaN values from reaching database
3. Enhanced `parseDecimal()` to handle empty strings
4. Changed error logging to console.log for visibility in workflow logs

**Correct Column Mapping for Issue Movements:**
- Main Store (sending): `issued_qty` column (Req Dep)
- Department Store (receiving): `added_qty` column (Added)
- Transfer columns remain 0 for Issue movements

### Stock Movements Page Enhancements (2026-01-07)
Enhanced the Stock Movements functionality with:

**A) SRD Details Display:**
- Added `getSrdType()` helper to determine MAIN vs DEPT
- FROM/TO columns now show type badges (MAIN/DEPT) with color coding
- Updated StockMovement interface to include fromSrdId/toSrdId

**B) Posting Date Field:**
- Added required "Posting Date" field to Record Stock Movement form
- Default value set from dashboard header date picker
- Date is passed to backend and used as ledger posting date

**C) Date Filtering:**
- Stock Movements list now filters by header date picker
- Query includes date parameter for daily filtering
- Backend /api/stock-movements supports optional `date` query param

**D) Dept→Dept Transfer Columns:**
- Verified correct column mapping: interDeptInQty / interDeptOutQty for Dept→Dept
- Fixed movement-breakdown API to not duplicate Issue data in received[]

**E) Reverse/Recall Architecture:**
- srdTransfers (from Inventory Ledger Issue button) use "recall" endpoint
- stockMovements (from Stock Movements page) use "reverse" endpoint
- Both trigger recalculateForward() to update ledger correctly

**F) Posting Rules (Main→Dept Blocking):**
- Frontend validation blocks Main→Dept transfers
- Backend validation in /api/stock-movements/with-lines blocks Main→Dept
- Error message directs users to use Issue button on Inventory Ledger

### Inventory Management Enhancements (2026-01-07)

**A) Dept→Main Return Inward:**
- Added `return_in_qty` column to `store_stock` table for tracking department returns to Main Store
- Main Store ledger now shows "Return In" column with per-department breakdown
- Return In quantity feeds into Main Store closing formula: Closing = Opening + Purchase + ReturnIn - Issued - Losses

**B) Purchase Register Edit/Delete:**
- 24-hour edit window: Only purchases created within last 24 hours can be edited (except by super admin)
- Super admin-only deletion: Delete requires super admin role + mandatory reason
- Both operations trigger ledger recalculation to maintain data integrity

**C) GRN Sentence Case Formatting:**
- Text inputs (supplier name, notes, invoice number) auto-format to sentence case on blur
- Ensures consistent data entry style across the platform

**D) CSV Export Functionality:**
- Added export buttons with Download icon to Stock Count and Stock Movement pages
- Exports include date-stamped filenames (e.g., MiAuditOps_StockCounts_2026-01-07.csv)
- Proper CSV escaping for special characters and commas

**E) Stock Count Ledger Integration:**
- Editing stock count now updates `physicalClosingQty` in store_stock
- Triggers forward recalculation from next day to cascade changes
- Creates audit log entry for tracking

**F) Item Supplier Field:**
- Added `supplier_id` column to items table with foreign key to suppliers
- Create Item form now includes "Default Supplier" dropdown
- Auto-fills supplier in GRN form when item is selected

### SR-D Ledger Auto-Calculation Improvements (2026-01-09)
Fixed critical issues with Main Store and Department Store ledger calculations to ensure proper auto-calculation when movements are posted.

**Changes Applied:**
1. **Store Issues Endpoints**: Updated create and recall endpoints to use `recalculateForward()` instead of manually calculating closing. This ensures all movement types (Return-In, Losses, Adjustments, Waste, Write-off) are properly included in closing calculations.

2. **Store Stock Seed Endpoint**: Updated to use `recalculateForward()` instead of manual closing calculation, ensuring consistent ledger behavior.

3. **Issue Page Available Stock**: Fixed the `getAvailableQty` calculation in InventoryLedger.tsx to include Return-In, Adjustments, and Losses when there are pending edits. Previously, edited values only considered Opening + Purchase.

**Design Principle:**
All ledger closing calculations now flow through `recalculateForward()` in `srd-ledger-service.ts`, which uses the comprehensive `calculateExpectedClosing()` formula:
- Additions: Opening + Added + ReturnIn + TransfersIn + InterDeptIn + Positive Adjustments
- Deductions: Issued + TransfersOut + InterDeptOut + Waste + WriteOff + Sold + Negative Adjustments

**Department Store Opening**: Correctly uses previous day's `closingQty` (via `getLastClosingBefore` function), falling back to `physicalClosingQty` if a stock count was performed.

### Paystack Subscription Integration (2026-01-10)
Added Paystack payment gateway integration for subscription management with the following components:

**A) Database Schema Enhancements:**
- Added Paystack-specific columns to subscriptions table: `paystack_customer_code`, `paystack_subscription_code`, `paystack_plan_code`, `last_payment_date`, `last_payment_amount`, `last_payment_reference`
- Storage methods: `findSubscriptionsByPaystackCustomer` and `findSubscriptionsByPaystackSubscription` for webhook processing

**B) Paystack Service (`server/paystack-service.ts`):**
- Transaction initialization and verification
- Subscription management endpoints
- Webhook signature validation with HMAC SHA512
- Early renewal logic: extends from current expiry (not today)

**C) Webhook Endpoint (`/api/webhooks/paystack`):**
- No auth required, signature-verified
- Handles `charge.success`, `subscription.create`, payment failures
- Automatic subscription updates and payment record creation

**D) Billing API Enhancements:**
- `/api/billing/details` - Comprehensive billing data with Paystack fields
- `/api/billing/paystack/initialize` - Checkout initialization
- `/api/billing/paystack/verify/:reference` - Transaction verification

**E) Enhanced Billing UI (Settings.tsx):**
- Start Date, Expiry Date, Next Billing Date fields
- Last Payment Date and Amount display
- Conditional Renew/Extend Subscription button (based on `paystackConfigured`)
- Expired subscription warning banner

### Subscription Enforcement (2026-01-10)
Implemented subscription enforcement middleware to block features when subscription is expired while still allowing access to billing-related endpoints for renewal.

**A) Global Subscription Middleware (`server/routes.ts`):**
- Checks subscription status on all API requests
- Returns HTTP 402 with `SUBSCRIPTION_EXPIRED` code when expired
- Exempt paths: `/api/auth`, `/api/billing`, `/api/subscription`, `/api/organization`, `/api/user`, `/api/health`, `/api/owner`, `/api/webhooks`
- Uses `req.originalUrl` for correct path comparison

**B) Frontend Subscription Expired Handling:**
- `SubscriptionExpiredModal` component shows when API returns 402
- Entitlements context detects 402 and triggers modal
- API fetcher dispatches `subscription-expired` custom event on 402
- Modal links to Settings page for renewal

**Flow for Expired Tenant:**
1. User logs in successfully (auth exempt)
2. Entitlements fetch triggers modal display
3. User can access Settings/Billing for renewal
4. Non-exempt routes (clients, audits, inventory) blocked with 402
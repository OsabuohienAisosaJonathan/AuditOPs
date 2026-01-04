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

### Platform Admin Console
A separate, isolated administrative interface (`/platform-admin/*`) for MiAuditOps internal staff. It uses distinct authentication, roles (`platform_super_admin`, `billing_admin`, `support_admin`, `compliance_admin`, `readonly_admin`), and database tables. Provides features for managing organizations, users, billing, and auditing platform admin actions.

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
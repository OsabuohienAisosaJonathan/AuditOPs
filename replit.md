# Miemploya AuditOps

## Overview

Miemploya AuditOps is a multi-client audit operations platform designed for the hospitality industry (lounges and restaurants). The platform enables Miemploya's internal audit team to conduct daily and weekly audits across multiple clients, outlets, and departments.

Key capabilities include:
- Multi-tenant client management with outlets and departments hierarchy
- Sales capture with POS import and manual entry modes
- Inventory and purchase tracking with GRN (Goods Received Notes)
- Daily reconciliation comparing theoretical vs physical stock
- Exception/case management for audit discrepancies
- Role-based access control (Super Admin, Supervisor, Auditor)
- Comprehensive audit trail and admin activity logging
- Report generation for audit compliance

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration
- **Build Tool**: Vite with custom plugins for Replit integration

The frontend follows a page-based architecture with shared components. Protected routes check authentication via React context before rendering.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Session Management**: express-session with connect-pg-simple for persistent sessions
- **Authentication**: Custom implementation with bcrypt password hashing
- **API Pattern**: RESTful endpoints under `/api` prefix

The server uses a storage abstraction layer (`server/storage.ts`) that wraps all database operations, making it easier to test and maintain.

### Database Schema
PostgreSQL database with the following core entities:
- **users**: Authentication, roles, access scope
- **clients**: Top-level tenant organization
- **outlets**: Locations within a client
- **departments**: Units within outlets (Main Bar, Kitchen, etc.)
- **salesEntries**: Daily sales records
- **purchases/stockMovements**: Inventory tracking
- **reconciliations**: Daily stock comparisons
- **exceptions/exceptionComments**: Audit discrepancy cases
- **auditLogs/adminActivityLogs**: Compliance logging

### Authentication & Authorization
- Session-based authentication stored in PostgreSQL
- Three-tier role system: super_admin, supervisor, auditor
- Rate limiting on login attempts (5 attempts, 15-minute lockout)
- Password requirements: 8+ characters, mixed case, numbers
- Bootstrap flow for first super admin creation with optional secret key
- Scope-based access control (users can be limited to specific clients/outlets)

### Build System
- Development: Vite dev server with HMR
- Production: Custom build script using esbuild for server, Vite for client
- Server dependencies are bundled to reduce cold start times

## External Dependencies

### Database
- **PostgreSQL**: Primary data store (configured via DATABASE_URL environment variable)
- **Drizzle Kit**: Database migrations and schema push

### Authentication
- **bcrypt**: Password hashing
- **connect-pg-simple**: Session storage in PostgreSQL
- **express-session**: Session middleware

### UI Libraries
- **Radix UI**: Accessible component primitives (dialogs, dropdowns, forms, etc.)
- **Recharts**: Data visualization for dashboard charts
- **date-fns**: Date formatting and manipulation
- **lucide-react**: Icon library

### Development Tools
- **Replit Vite Plugins**: Error overlay, cartographer, dev banner for Replit environment
- **TypeScript**: Type safety across full stack
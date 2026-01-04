import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getTenantEntitlements, checkClientCreationLimit, checkSrdCreationLimit, checkFeatureAccess } from "./entitlements-service";
import { hash, compare } from "bcrypt";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import MemoryStore from "memorystore";
import { pool } from "./db";
import { CachedSessionStore } from "./cached-session-store";
import { 
  insertUserSchema, insertClientSchema, insertCategorySchema, insertDepartmentSchema, 
  insertSalesEntrySchema, insertPurchaseSchema, insertStockMovementSchema, insertStockMovementLineSchema,
  insertReconciliationSchema, insertExceptionSchema, insertExceptionCommentSchema, insertExceptionActivitySchema,
  insertSupplierSchema, insertItemSchema, insertPurchaseLineSchema, insertStockCountSchema,
  insertPaymentDeclarationSchema, insertStoreIssueSchema, insertStoreIssueLineSchema, insertStoreStockSchema,
  insertStoreNameSchema, insertInventoryDepartmentSchema, insertGoodsReceivedNoteSchema, INVENTORY_TYPES,
  insertReceivableSchema, insertReceivableHistorySchema, insertSurplusSchema, insertSurplusHistorySchema,
  RECEIVABLE_STATUSES, SURPLUS_STATUSES, STOCK_MOVEMENT_TYPES,
  PLAN_LIMITS, type SubscriptionPlan,
  type UserRole 
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomBytes } from "crypto";
import { registerPlatformAdminRoutes } from "./platform-admin-routes";
import * as XLSX from "xlsx";
import archiver from "archiver";
import { backfillSrdLedger, backfillAllSrdsForClient, postMovementToLedgers, recalculateForward } from "./srd-ledger-service";

declare module "express-session" {
  interface SessionData {
    userId: string;
    role: string;
  }
}

function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);
}

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const passwordResetRequests = new Map<string, number>();
const PASSWORD_RESET_COOLDOWN_SECONDS = 60;

// Cache of recently-used verification tokens for idempotency (5 minute TTL)
const usedVerificationTokens = new Map<string, { email: string; usedAt: number }>();
const VERIFICATION_TOKEN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cacheUsedVerificationToken(token: string, email: string): void {
  usedVerificationTokens.set(token, { email, usedAt: Date.now() });
  // Cleanup old entries periodically
  if (usedVerificationTokens.size > 100) {
    const now = Date.now();
    usedVerificationTokens.forEach((value, key) => {
      if (now - value.usedAt > VERIFICATION_TOKEN_CACHE_TTL_MS) {
        usedVerificationTokens.delete(key);
      }
    });
  }
}

function getUsedVerificationTokenEmail(token: string): string | null {
  const entry = usedVerificationTokens.get(token);
  if (!entry) return null;
  if (Date.now() - entry.usedAt > VERIFICATION_TOKEN_CACHE_TTL_MS) {
    usedVerificationTokens.delete(token);
    return null;
  }
  return entry.email;
}

function checkRateLimit(identifier: string): { allowed: boolean; remainingAttempts: number } {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier);
  
  if (!attempts) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }
  
  if (now - attempts.lastAttempt > LOCKOUT_MINUTES * 60 * 1000) {
    loginAttempts.delete(identifier);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }
  
  if (attempts.count >= MAX_ATTEMPTS) {
    return { allowed: false, remainingAttempts: 0 };
  }
  
  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - attempts.count };
}

function recordFailedAttempt(identifier: string): void {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier);
  
  if (attempts) {
    attempts.count++;
    attempts.lastAttempt = now;
  } else {
    loginAttempts.set(identifier, { count: 1, lastAttempt: now });
  }
}

function clearAttempts(identifier: string): void {
  loginAttempts.delete(identifier);
}

// Helper function to normalize department names: uppercase + ensure ends with " OUTLET"
function normalizeDepartmentName(name: string): string {
  // Trim and uppercase
  let normalized = name.trim().toUpperCase();
  
  // Normalize multiple spaces to single space
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Ensure it ends with " OUTLET" (avoid duplicates like "GRILL OUTLET OUTLET")
  if (!normalized.endsWith(' OUTLET')) {
    normalized = normalized + ' OUTLET';
  }
  
  return normalized;
}

// Helper function to normalize category names: uppercase only (no OUTLET suffix)
function normalizeCategoryName(name: string): string {
  // Trim, uppercase, and normalize spaces
  return name.trim().toUpperCase().replace(/\s+/g, ' ');
}

// Validate name length (at least 2 characters after trimming)
function validateNameLength(name: string, minLength: number = 2): boolean {
  return name.trim().length >= minLength;
}

// Helper function to convert text to Title Case (capitalize first letter of each word)
function toTitleCase(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const PgStore = connectPgSimple(session);
  
  // ALWAYS trust proxy - Replit uses reverse proxy in all environments
  // This ensures req.secure is set correctly from X-Forwarded-Proto header
  app.set("trust proxy", true);
  
  // Configure session cookie domain for production to support both www and non-www
  const cookieDomain = process.env.NODE_ENV === "production" && process.env.COOKIE_DOMAIN 
    ? process.env.COOKIE_DOMAIN 
    : undefined;
  
  // Session configuration with sliding expiry
  const SESSION_IDLE_MAX_AGE = 2 * 60 * 60 * 1000; // 2 hours idle timeout
  const SESSION_ABSOLUTE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days absolute max
  const SESSION_REFRESH_THRESHOLD = 10 * 60 * 1000; // Refresh if session expires in less than 10 minutes
  
  // Session middleware - use secure cookies when behind HTTPS proxy
  // Both production (custom domain) and development (Replit webview) use HTTPS
  const isProduction = process.env.NODE_ENV === "production";
  
  // Cookie secure flag strategy:
  // - Production: always true (HTTPS required, explicit for safety)
  // - Development: 'auto' - express-session automatically sets based on req.secure
  //   which is determined by trust proxy + X-Forwarded-Proto header
  //
  // Using 'auto' in dev allows:
  // - HTTPS on Replit webview (secure=true)
  // - HTTP for local testing (secure=false)
  //
  // The previous dynamic middleware approach was removed because it caused race
  // conditions - the cookie was being modified after session creation.
  const useSecureCookies: boolean | "auto" = isProduction ? true : "auto";
  
  console.log(`[SESSION CONFIG] Production: ${isProduction}, CookieDomain: ${cookieDomain || 'not set'}, SecureCookies: ${useSecureCookies}`);
  
  // Session store setup with in-memory caching layer
  // This dramatically reduces DB pressure by caching sessions and batching writes
  const MemoryStoreFactory = MemoryStore(session);
  
  let sessionStore: session.Store;
  
  // In development, prefer pure memory store to completely avoid DB session issues
  // In production, use PostgreSQL with caching layer for persistence across restarts
  if (isProduction) {
    // Production: PostgreSQL store with in-memory cache layer
    const pgStore = new PgStore({
      pool: pool,
      tableName: "session",
      createTableIfMissing: true,
      pruneSessionInterval: false, // DISABLE automatic pruning - we do it manually
    });
    
    // Wrap PostgreSQL store with caching layer
    // - Reads from cache for 30 seconds before hitting DB
    // - Writes batched every 30 seconds
    sessionStore = new CachedSessionStore(pgStore, {
      cacheTtlMs: 30000, // Cache reads for 30 seconds
      syncIntervalMs: 30000, // Sync writes every 30 seconds
    });
    
    console.log("[Session Store] Using PostgreSQL with memory cache layer (production)");
  } else {
    // Development: Pure memory store - no DB dependency for sessions
    // Sessions won't persist across server restarts, but that's fine for dev
    sessionStore = new MemoryStoreFactory({
      checkPeriod: 86400000, // Prune expired entries every 24h
    });
    
    console.log("[Session Store] Using pure memory store (development)");
  }
  
  // Background session pruning for production PostgreSQL - runs every 30 minutes
  if (isProduction) {
    const SESSION_PRUNE_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
    setInterval(async () => {
      try {
        console.log("[Session Prune] Starting background session cleanup...");
        const startTime = Date.now();
        const result = await pool.query(
          `DELETE FROM session WHERE expire < NOW()`
        );
        const duration = Date.now() - startTime;
        console.log(`[Session Prune] Cleaned up ${result.rowCount || 0} expired sessions in ${duration}ms`);
      } catch (err: any) {
        console.error("[Session Prune] Failed to prune sessions:", err.message);
      }
    }, SESSION_PRUNE_INTERVAL_MS);
  }
  
  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "audit-ops-secret-key-change-in-production",
      resave: true, // Allow resave for sliding sessions
      saveUninitialized: false,
      proxy: true, // Always behind proxy on Replit
      rolling: true, // Enable sliding sessions - extends expiry on each request
      cookie: {
        httpOnly: true,
        // FIXED: Always use secure cookies - Replit uses HTTPS in both dev and prod
        // The previous dynamic approach caused race conditions where cookies weren't sent back
        secure: useSecureCookies,
        sameSite: "lax",
        maxAge: SESSION_IDLE_MAX_AGE,
        domain: cookieDomain,
        path: "/",
      },
    })
  );
  
  // NOTE: Removed dynamic cookie.secure middleware - it was causing inconsistency
  // With trust proxy enabled and secure: true, cookies work correctly in HTTPS environments
  
  // Sliding session middleware - extends session on authenticated requests
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.session?.userId && req.session.cookie) {
      // Check if session was created, enforce absolute max age
      const sessionCreatedAt = (req.session as any).createdAt;
      if (sessionCreatedAt) {
        const sessionAge = Date.now() - sessionCreatedAt;
        if (sessionAge > SESSION_ABSOLUTE_MAX_AGE) {
          // Session exceeded absolute max age, destroy it
          req.session.destroy(() => {});
          return res.status(401).json({ error: "Session expired", code: "SESSION_EXPIRED" });
        }
      }
      
      // Extend session expiry (rolling: true handles this, but we ensure it here)
      req.session.touch();
    }
    next();
  });

  // Request correlation ID middleware for debugging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] as string || `srv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    (req as any).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    
    const startTime = Date.now();
    
    // Log request completion with timing
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const userId = req.session?.userId || 'anonymous';
      
      // Log slow requests (>3s) or errors
      if (duration > 3000 || res.statusCode >= 500) {
        console.warn(`[SLOW/ERROR] ${req.method} ${req.path} ${res.statusCode} ${duration}ms userId=${userId} reqId=${requestId}`);
      }
    });
    
    next();
  });

  // Register platform admin routes (separate from tenant routes)
  registerPlatformAdminRoutes(app);

  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  const requireRole = (...roles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ error: "You don't have permission to perform this action" });
      }
      
      next();
    };
  };

  const requireSuperAdmin = requireRole("super_admin");
  const requireSupervisorOrAbove = requireRole("super_admin", "supervisor");

  const requireClientAccess = (clientIdParam: string = "clientId") => {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }
      
      const clientId = req.params[clientIdParam] || req.body.clientId || req.query.clientId;
      if (!clientId) {
        // No specific client requested, allow through
        (req as any).userOrganizationId = user.organizationId;
        return next();
      }
      
      // CRITICAL: Always verify client belongs to user's organization (tenant isolation)
      const client = await storage.getClientWithOrgCheck(clientId as string, user.organizationId);
      if (!client) {
        return res.status(403).json({ error: "You do not have access to this client" });
      }
      
      // Super admin within same org has full access
      if (user.role === "super_admin") {
        (req as any).userOrganizationId = user.organizationId;
        return next();
      }
      
      // Check fine-grained user-client access for non-super_admin users
      const access = await storage.getUserClientAccess(req.session.userId, clientId as string);
      
      if (!access) {
        return res.status(403).json({ error: "You do not have access to this client" });
      }
      
      if (access.status === "removed") {
        return res.status(403).json({ error: "Your access to this client has been removed" });
      }
      
      if (access.status === "suspended") {
        if (req.method !== "GET") {
          return res.status(403).json({ error: "Your access to this client is suspended (read-only)" });
        }
      }
      
      (req as any).clientAccess = access;
      (req as any).userOrganizationId = user.organizationId;
      next();
    };
  };

  const requireAuditContext = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const context = await storage.getActiveAuditContext(req.session.userId);
    if (!context) {
      return res.status(400).json({ 
        error: "No active audit context", 
        code: "NO_AUDIT_CONTEXT",
        message: "Please select an audit period before accessing this resource" 
      });
    }
    
    (req as any).auditContext = context;
    next();
  };

  // ============== HEALTH & DIAGNOSTICS ==============
  app.get("/api/health", async (req, res) => {
    const startTime = Date.now();
    try {
      // Test database connection with latency measurement
      const dbStartTime = Date.now();
      const dbResult = await pool.query("SELECT 1 as test");
      const dbLatency = Date.now() - dbStartTime;
      const dbOk = dbResult.rows.length > 0;
      
      res.json({
        ok: true,
        serverTime: new Date().toISOString(),
        db: {
          ok: dbOk,
          latencyMs: dbLatency
        },
        env: {
          DATABASE_URL: !!process.env.DATABASE_URL,
          RESEND_API_KEY: !!process.env.RESEND_API_KEY,
          FROM_EMAIL: !!process.env.FROM_EMAIL,
          APP_URL: !!process.env.APP_URL,
          NODE_ENV: process.env.NODE_ENV || "development"
        },
        responseTimeMs: Date.now() - startTime,
        version: "1.0.0"
      });
    } catch (error: any) {
      // Return 503 for DB connectivity issues
      res.status(503).json({
        ok: false,
        serverTime: new Date().toISOString(),
        db: {
          ok: false,
          latencyMs: null,
          error: error.message
        },
        env: {
          DATABASE_URL: !!process.env.DATABASE_URL,
          RESEND_API_KEY: !!process.env.RESEND_API_KEY,
          FROM_EMAIL: !!process.env.FROM_EMAIL,
          APP_URL: !!process.env.APP_URL,
          NODE_ENV: process.env.NODE_ENV || "development"
        },
        responseTimeMs: Date.now() - startTime,
        version: "1.0.0",
        code: "SERVICE_UNAVAILABLE"
      });
    }
  });

  // Fast DB ping endpoint - returns timing only
  app.get("/api/health/db", async (req, res) => {
    const startTime = Date.now();
    try {
      const dbResult = await pool.query("SELECT 1 as test");
      const latencyMs = Date.now() - startTime;
      
      if (dbResult.rows.length > 0) {
        return res.json({
          ok: true,
          latencyMs,
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error("Query returned no rows");
      }
    } catch (error: any) {
      console.error(`[HEALTH/DB] Database unreachable: ${error.message}`);
      return res.status(503).json({
        ok: false,
        latencyMs: Date.now() - startTime,
        error: "Database unreachable",
        code: "SERVICE_UNAVAILABLE",
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get("/api/diag/session", async (req, res) => {
    const startTime = Date.now();
    const requestId = (req as any).requestId || 'unknown';
    const sessionIdPrefix = req.sessionID ? req.sessionID.substring(0, 8) : 'none';
    
    // Log session diagnostic request
    console.log(`[SESSION DIAGNOSTIC] Request: requestId=${requestId}, sessionId=${sessionIdPrefix}..., host=${req.headers.host}, protocol=${req.protocol}, secure=${req.secure}, xForwardedProto=${req.headers['x-forwarded-proto']}, hasCookie=${!!req.headers.cookie}, cookieNames=${req.headers.cookie?.split(';').map(c => c.trim().split('=')[0]).join(', ') || 'none'}`);
    
    try {
      if (!req.session?.userId) {
        const response = {
          authed: false,
          userId: null,
          organizationId: null,
          role: null,
          sessionCookie: !!req.headers.cookie?.includes("connect.sid"),
          sessionId: sessionIdPrefix + '...',
          requestId,
          host: req.headers.host,
          protocol: req.protocol,
          secure: req.secure,
          xForwardedProto: req.headers['x-forwarded-proto'] || 'not set',
          cookieDomain: process.env.COOKIE_DOMAIN || 'not set',
          trustProxy: 'enabled', // Always enabled on Replit
          responseTimeMs: Date.now() - startTime
        };
        console.log(`[SESSION DIAGNOSTIC] Response (not authed):`, JSON.stringify(response));
        return res.json(response);
      }
      
      const user = await storage.getUser(req.session.userId);
      const subscription = user?.organizationId ? await storage.getSubscription(user.organizationId) : null;
      
      const response = {
        authed: true,
        userId: req.session.userId,
        organizationId: user?.organizationId || null,
        role: user?.role || null,
        planName: subscription?.planName || null,
        subscriptionStatus: subscription?.status || null,
        requestId,
        host: req.headers.host,
        protocol: req.protocol,
        secure: req.secure,
        xForwardedProto: req.headers['x-forwarded-proto'] || 'not set',
        cookieDomain: process.env.COOKIE_DOMAIN || 'not set',
        sessionId: req.sessionID?.substring(0, 8) + '...',
        responseTimeMs: Date.now() - startTime
      };
      console.log(`[SESSION DIAGNOSTIC] Response (authed):`, JSON.stringify(response));
      res.json(response);
    } catch (error: any) {
      res.status(500).json({
        authed: false,
        error: error.message,
        requestId,
        responseTimeMs: Date.now() - startTime
      });
    }
  });

  // ============== BOOTSTRAP SETUP ==============
  app.get("/api/setup/status", async (req, res) => {
    try {
      const superAdminCount = await storage.getSuperAdminCount();
      const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
      
      res.json({
        setupRequired: superAdminCount === 0,
        requiresSecret: !!bootstrapSecret,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/setup/bootstrap", async (req, res) => {
    try {
      const superAdminCount = await storage.getSuperAdminCount();
      
      if (superAdminCount > 0) {
        return res.status(403).json({ error: "Setup already completed. A Super Admin already exists." });
      }

      const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
      if (bootstrapSecret && req.body.bootstrapSecret !== bootstrapSecret) {
        return res.status(403).json({ error: "Invalid bootstrap secret" });
      }

      const { fullName, email, password, username, companyName } = req.body;

      if (!fullName || !email || !password || !username) {
        return res.status(400).json({ error: "Full name, email, username, and password are required" });
      }

      if (!isStrongPassword(password)) {
        return res.status(400).json({ error: "Password must be at least 8 characters with uppercase, lowercase, and numbers" });
      }

      const hashedPassword = await hash(password, 12);
      
      // Create organization, user, and subscription atomically in a transaction
      const { organization, user } = await storage.bootstrapOrganizationWithOwner(
        {
          name: companyName || `${fullName}'s Organization`,
          type: "auditor",
          email,
          currencyCode: "NGN",
        },
        {
          username,
          email,
          password: hashedPassword,
          fullName,
          role: "super_admin",
          status: "active",
          mustChangePassword: true,
          accessScope: { global: true },
        }
      );

      await storage.createAdminActivityLog({
        actorId: user.id,
        targetUserId: user.id,
        actionType: "bootstrap_admin_created",
        afterState: { fullName, email, role: "super_admin", organizationId: organization.id },
        ipAddress: req.ip || "Unknown",
      });

      req.session.userId = user.id;
      req.session.role = user.role;

      res.json({ 
        success: true, 
        message: "Super Admin created successfully",
        mustChangePassword: true,
        user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName, role: user.role }
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== AUTH ROUTES ==============
  
  // Auth flow diagnostic logging helper
  function logAuthDiagnostic(req: Request, res: Response, event: string, details: Record<string, any>) {
    const requestId = (req as any).requestId || 'unknown';
    const isProduction = process.env.NODE_ENV === 'production';
    const diagnosticData = {
      event,
      requestId,
      host: req.headers.host,
      origin: req.headers.origin,
      protocol: req.protocol,
      secure: req.secure,
      xForwardedProto: req.headers['x-forwarded-proto'],
      xForwardedFor: req.headers['x-forwarded-for'],
      hasCookieHeader: !!req.headers.cookie,
      cookieNames: req.headers.cookie?.split(';').map(c => c.trim().split('=')[0]).join(', ') || 'none',
      sessionExists: !!req.session,
      sessionUserId: req.session?.userId || null,
      isProduction,
      trustProxy: 'enabled', // Always enabled on Replit
      cookieDomain: process.env.COOKIE_DOMAIN || 'not set',
      ...details,
    };
    console.log(`[AUTH DIAGNOSTIC] ${event}:`, JSON.stringify(diagnosticData, null, 2));
  }
  
  app.post("/api/auth/login", async (req, res) => {
    const requestId = (req as any).requestId || `login-${Date.now()}`;
    const timings: Record<string, number> = {};
    const loginStart = Date.now();
    
    try {
      const { username, password } = req.body;
      const identifier = username || req.ip;
      
      // Log incoming request diagnostics
      logAuthDiagnostic(req, res, 'LOGIN_ATTEMPT', { username });
      
      const rateLimit = checkRateLimit(identifier);
      if (!rateLimit.allowed) {
        return res.status(429).json({ error: `Too many login attempts. Please try again in ${LOCKOUT_MINUTES} minutes.` });
      }

      // Timing: User lookup
      const userLookupStart = Date.now();
      let user = await storage.getUserByUsername(username);
      if (!user) {
        user = await storage.getUserByEmail(username);
      }
      timings.userLookup = Date.now() - userLookupStart;

      if (!user) {
        recordFailedAttempt(identifier);
        await storage.createAuditLog({
          userId: null,
          action: "Login Failed",
          entity: "Session",
          details: `Failed login attempt for: ${username}`,
          ipAddress: req.ip || "Unknown",
        });
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.status === "deactivated") {
        return res.status(403).json({ error: "Your account has been deactivated. Please contact your administrator." });
      }

      if (!user.emailVerified) {
        return res.status(403).json({ 
          error: "Please verify your email address before logging in.",
          code: "EMAIL_NOT_VERIFIED",
          email: user.email,
        });
      }

      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        return res.status(403).json({ error: "Account is temporarily locked. Please try again later." });
      }

      // Timing: Password verification (bcrypt is CPU-intensive)
      const passwordStart = Date.now();
      const passwordValid = await compare(password, user.password);
      timings.passwordVerify = Date.now() - passwordStart;

      if (!passwordValid) {
        recordFailedAttempt(identifier);
        
        const newAttempts = (user.loginAttempts || 0) + 1;
        const updateData: any = { loginAttempts: newAttempts };
        
        if (newAttempts >= MAX_ATTEMPTS) {
          updateData.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        }
        
        await storage.updateUser(user.id, updateData);
        
        await storage.createAuditLog({
          userId: user.id,
          action: "Login Failed",
          entity: "Session",
          details: `Invalid password attempt (${newAttempts}/${MAX_ATTEMPTS})`,
          ipAddress: req.ip || "Unknown",
        });

        return res.status(401).json({ error: "Invalid credentials" });
      }

      clearAttempts(identifier);
      
      await storage.updateUser(user.id, {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      });

      const sessionIdBeforeLogin = req.sessionID;
      console.log(`[LOGIN] Starting session setup: oldSessionId=${sessionIdBeforeLogin?.substring(0, 8)}..., userId=${user.id}`);
      
      // Timing: Session operations
      const sessionStart = Date.now();
      
      // CRITICAL FIX: Use Promise wrappers to ensure session is fully persisted
      // to PostgreSQL before sending response. This prevents the race condition
      // where client calls /auth/me before session row has userId.
      
      // Step 1: Regenerate session (prevents session fixation attacks)
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) {
            console.error(`[LOGIN] Session regeneration failed:`, err);
            logAuthDiagnostic(req, res, 'LOGIN_SESSION_REGEN_ERROR', { 
              userId: user.id, 
              error: err.message 
            });
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      const newSessionId = req.sessionID;
      console.log(`[LOGIN] Session regenerated: oldId=${sessionIdBeforeLogin?.substring(0, 8)}..., newId=${newSessionId?.substring(0, 8)}...`);
      
      // Step 2: Set user data on the NEW session
      req.session.userId = user.id;
      req.session.role = user.role;
      (req.session as any).createdAt = Date.now();
      
      // Step 3: Save the session and WAIT for PostgreSQL write to complete
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error(`[LOGIN] Session save failed:`, err);
            logAuthDiagnostic(req, res, 'LOGIN_SESSION_SAVE_ERROR', { 
              userId: user.id, 
              sessionId: newSessionId?.substring(0, 8),
              error: err.message 
            });
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      // Session is now fully persisted to PostgreSQL
      timings.sessionOps = Date.now() - sessionStart;
      timings.total = Date.now() - loginStart;
      
      // Log successful login with cookie metadata and timings
      const setCookieHeader = res.getHeader('Set-Cookie');
      const setCookieStr = Array.isArray(setCookieHeader) ? setCookieHeader.join('; ') : String(setCookieHeader || 'none');
      
      console.log(`[LOGIN] Session saved successfully: sessionId=${newSessionId?.substring(0, 8)}..., userId=${user.id}, setCookie=${!!setCookieHeader}`);
      console.log(`[LOGIN TIMING] requestId=${requestId}, userLookup=${timings.userLookup}ms, passwordVerify=${timings.passwordVerify}ms, sessionOps=${timings.sessionOps}ms, total=${timings.total}ms`);
      
      logAuthDiagnostic(req, res, 'LOGIN_SUCCESS', { 
        userId: user.id,
        sessionIdBefore: sessionIdBeforeLogin?.substring(0, 8),
        sessionIdAfter: newSessionId?.substring(0, 8),
        sessionIdChanged: sessionIdBeforeLogin !== newSessionId,
        setCookiePresent: !!setCookieHeader,
        setCookieHasSecure: setCookieStr.includes('Secure'),
        setCookieHasDomain: setCookieStr.includes('Domain'),
        cookieSecure: req.session.cookie.secure,
        cookieDomain: req.session.cookie.domain || 'not set',
        cookieSameSite: req.session.cookie.sameSite,
      });
      
      // Non-blocking audit log (don't await - session is already persisted)
      storage.createAuditLog({
        userId: user.id,
        action: "Login",
        entity: "Session",
        details: "Successful login via web",
        ipAddress: req.ip || "Unknown",
      });

      // Send response ONLY after session is fully persisted
      res.json({ 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        fullName: user.fullName, 
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        accessScope: user.accessScope,
      });
    } catch (error: any) {
      const totalTime = Date.now() - loginStart;
      const errorMessage = error.message || 'Unknown error';
      
      // Log with timing info
      console.error(`[LOGIN ERROR] requestId=${requestId}, error=${errorMessage}, timings=${JSON.stringify(timings)}, totalMs=${totalTime}`);
      logAuthDiagnostic(req, res, 'LOGIN_ERROR', { error: errorMessage, timings, totalMs: totalTime });
      
      // Check if this is a database connectivity/timeout error
      const isDbError = errorMessage.includes('timeout exceeded') || 
                        errorMessage.includes('connection') || 
                        errorMessage.includes('ECONNREFUSED') ||
                        errorMessage.includes('ETIMEDOUT') ||
                        errorMessage.includes('database') ||
                        error.code === 'ECONNRESET' ||
                        error.code === 'ENOTFOUND';
      
      if (isDbError) {
        // Return 503 Service Unavailable for DB errors - client should NOT redirect to login
        return res.status(503).json({ 
          error: "Service temporarily unavailable. Please try again.", 
          code: "SERVICE_UNAVAILABLE",
          retryAfter: 5 
        });
      }
      
      // Other errors (validation, etc.) return 400
      res.status(400).json({ error: errorMessage });
    }
  });

  // Demo login for development preview - creates or reuses a demo account
  app.post("/api/auth/demo-login", async (req, res) => {
    try {
      // Only allow demo login in development mode for security
      if (process.env.NODE_ENV === "production") {
        return res.status(403).json({ error: "Demo login is not available in production" });
      }

      const DEMO_EMAIL = "demo@miauditops.com";
      const DEMO_USERNAME = "demo_user";
      const DEMO_PASSWORD = "DemoPass123!";
      const DEMO_FULLNAME = "Demo User";

      // Check if demo user exists
      let demoUser = await storage.getUserByEmail(DEMO_EMAIL);
      
      if (!demoUser) {
        // Use bootstrapOrganizationWithOwner for atomic creation of org + user + subscription
        const hashedPassword = await hash(DEMO_PASSWORD, 12);
        const { organization, user } = await storage.bootstrapOrganizationWithOwner(
          {
            name: "Demo Organization",
            type: "demo",
            email: DEMO_EMAIL,
            currencyCode: "NGN",
          },
          {
            username: DEMO_USERNAME,
            email: DEMO_EMAIL,
            password: hashedPassword,
            fullName: DEMO_FULLNAME,
            role: "super_admin",
            status: "active",
            mustChangePassword: false,
            emailVerified: true,
            accessScope: { global: true },
          }
        );

        demoUser = user;

        // Create a demo client for the demo organization
        await storage.createClient({
          name: "Demo Restaurant",
          organizationId: organization.id,
          status: "active",
        });
      } else if (!demoUser.organizationId) {
        // Remediation: Demo user exists but has no organization - create new org and link user
        const demoOrg = await storage.createOrganization({
          name: "Demo Organization",
          type: "demo",
          email: DEMO_EMAIL,
          currencyCode: "NGN",
        });

        // Create subscription for the organization
        await storage.createSubscription({
          organizationId: demoOrg.id,
          planName: "starter",
          billingPeriod: "monthly",
          slotsPurchased: 1,
          status: "trial",
          startDate: new Date(),
        });

        // Link user to organization
        await storage.updateUser(demoUser.id, {
          organizationId: demoOrg.id,
          organizationRole: "owner",
        });

        // Create a demo client
        await storage.createClient({
          name: "Demo Restaurant",
          organizationId: demoOrg.id,
          status: "active",
        });

        // Refresh demo user to get updated organizationId
        demoUser = await storage.getUser(demoUser.id) || demoUser;
      } else {
        // Ensure demo user has subscription (handle legacy state without subscription)
        const existingSubscription = await storage.getSubscription(demoUser.organizationId);
        if (!existingSubscription) {
          await storage.createSubscription({
            organizationId: demoUser.organizationId,
            planName: "starter",
            billingPeriod: "monthly",
            slotsPurchased: 1,
            status: "trial",
            startDate: new Date(),
          });
        }

        // Ensure demo user has at least one client (handle partial setup scenarios)
        const existingClients = await storage.getClients(demoUser.organizationId);
        if (existingClients.length === 0) {
          await storage.createClient({
            name: "Demo Restaurant",
            organizationId: demoUser.organizationId,
            status: "active",
          });
        }
      }

      // Auto login the demo user
      req.session.userId = demoUser.id;
      req.session.role = demoUser.role;
      (req.session as any).createdAt = Date.now();
      
      // Save session and WAIT for PostgreSQL write to complete
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error(`[DEMO-LOGIN] Session save failed:`, err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      await storage.updateUser(demoUser.id, {
        lastLoginAt: new Date(),
      });

      await storage.createAuditLog({
        userId: demoUser.id,
        action: "Demo Login",
        entity: "Session",
        details: "Demo account login for development preview",
        ipAddress: req.ip || "Unknown",
      });

      res.json({ 
        id: demoUser.id, 
        username: demoUser.username, 
        email: demoUser.email, 
        fullName: demoUser.fullName, 
        role: demoUser.role,
        mustChangePassword: false,
        accessScope: demoUser.accessScope,
        isDemo: true,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await storage.getUser(req.session.userId!);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!(await compare(currentPassword, user.password))) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      if (!isStrongPassword(newPassword)) {
        return res.status(400).json({ error: "Password must be at least 8 characters with uppercase, lowercase, and numbers" });
      }

      const hashedPassword = await hash(newPassword, 12);
      await storage.updateUser(user.id, { password: hashedPassword, mustChangePassword: false });

      await storage.createAuditLog({
        userId: user.id,
        action: "Password Changed",
        entity: "User",
        entityId: user.id,
        details: "User changed their password",
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true, message: "Password changed successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // Session refresh endpoint - explicitly extends session expiry
  app.post("/api/auth/refresh", async (req, res) => {
    const requestId = (req as any).requestId || 'unknown';
    
    // Log refresh request
    console.log(`[AUTH REFRESH] Request: requestId=${requestId}, host=${req.headers.host}, protocol=${req.protocol}, secure=${req.secure}, hasCookie=${!!req.headers.cookie}, sessionUserId=${req.session?.userId || 'none'}`);
    
    try {
      if (!req.session?.userId) {
        console.log(`[AUTH REFRESH] No session: requestId=${requestId}, cookieNames=${req.headers.cookie?.split(';').map(c => c.trim().split('=')[0]).join(', ') || 'none'}`);
        return res.status(401).json({ error: "No active session", code: "NO_SESSION" });
      }
      
      // Verify user still exists and is active
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "User not found", code: "USER_NOT_FOUND" });
      }
      
      if (user.status !== "active") {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "Account is not active", code: "ACCOUNT_INACTIVE" });
      }
      
      // Check absolute max age
      const sessionCreatedAt = (req.session as any).createdAt;
      if (sessionCreatedAt) {
        const sessionAge = Date.now() - sessionCreatedAt;
        if (sessionAge > SESSION_ABSOLUTE_MAX_AGE) {
          req.session.destroy(() => {});
          return res.status(401).json({ error: "Session expired", code: "SESSION_EXPIRED" });
        }
      }
      
      // Extend the session by touching it
      req.session.touch();
      
      // Save session to persist the extended expiry - await completion
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("[Auth] Session save error during refresh:", err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      // Return session info after save completes
      res.json({
        success: true,
        expiresAt: req.session.cookie.expires?.toISOString(),
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        }
      });
    } catch (error: any) {
      console.error("[Auth] Refresh error:", error);
      res.status(500).json({ error: "Failed to refresh session" });
    }
  });

  // ============== REGISTRATION & EMAIL VERIFICATION ==============
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password, fullName, accountType, organizationName } = req.body;

      if (!email || !password || !fullName || !organizationName) {
        return res.status(400).json({ error: "Email, password, full name, and organization name are required" });
      }

      if (!isStrongPassword(password)) {
        return res.status(400).json({ error: "Password must be at least 8 characters with uppercase, lowercase, and numbers" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }

      const existingUsername = await storage.getUserByUsername(username || email);
      if (existingUsername) {
        return res.status(400).json({ error: "An account with this username already exists" });
      }

      const hashedPassword = await hash(password, 12);
      const verificationToken = randomBytes(32).toString('hex');
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const { organization, user } = await storage.bootstrapOrganizationWithOwner(
        {
          name: organizationName,
          type: accountType === "auditor" ? "auditor" : "company",
          email,
          currencyCode: "NGN",
        },
        {
          username: username || email,
          email,
          password: hashedPassword,
          fullName,
          role: "super_admin",
          status: "active",
          mustChangePassword: false,
          accessScope: { global: true },
          emailVerified: false,
          verificationToken,
          verificationExpiry,
        }
      );

      // Send verification email
      const { sendVerificationEmail } = await import('./email');
      const emailResult = await sendVerificationEmail(email, verificationToken, fullName, req);
      
      if (!emailResult.success) {
        console.warn(`[Auth] Failed to send verification email to ${email}: ${emailResult.error}`);
      }

      await storage.createAdminActivityLog({
        actorId: user.id,
        targetUserId: user.id,
        actionType: "user_registered",
        afterState: { fullName, email, role: "super_admin", organizationId: organization.id },
        ipAddress: req.ip || "Unknown",
      });

      res.json({ 
        success: true, 
        message: "Account created. Please check your email to verify your account.",
        emailSent: emailResult.success,
      });
    } catch (error: any) {
      console.error('[Auth] Registration error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: "Verification token is required" });
      }

      const user = await storage.getUserByVerificationToken(token);
      
      // If token not found in DB, check short-lived cache for recently-used tokens
      if (!user) {
        const cachedEmail = getUsedVerificationTokenEmail(token);
        if (cachedEmail) {
          // Token was recently used - check if user is now verified
          const verifiedUser = await storage.getUserByEmail(cachedEmail);
          if (verifiedUser?.emailVerified) {
            return res.json({ 
              success: true, 
              message: "Email is already verified. You can log in.", 
              alreadyVerified: true 
            });
          }
        }
        return res.status(400).json({ error: "Invalid or expired verification token" });
      }

      // Already verified - idempotent success (token still in DB, user already verified)
      if (user.emailVerified) {
        return res.json({ success: true, message: "Email is already verified. You can log in.", alreadyVerified: true });
      }

      // Check if token has expired
      if (user.verificationExpiry && new Date(user.verificationExpiry) < new Date()) {
        return res.status(400).json({ 
          error: "Verification token has expired. Please request a new one.",
          code: "TOKEN_EXPIRED",
          email: user.email
        });
      }

      // Cache the token before clearing it (for 5-minute idempotency window)
      cacheUsedVerificationToken(token, user.email);

      // Mark as verified and clear the token (properly invalidate)
      await storage.updateUser(user.id, {
        emailVerified: true,
        verificationToken: null,
        verificationExpiry: null,
      });

      await storage.createAuditLog({
        userId: user.id,
        action: "Email Verified",
        entity: "User",
        entityId: user.id,
        details: "User verified their email address",
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true, message: "Email verified successfully. You can now log in." });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Don't reveal if user exists
        return res.json({ success: true, message: "If an account exists with this email, a verification link will be sent." });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: "Email is already verified" });
      }

      const verificationToken = randomBytes(32).toString('hex');
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await storage.updateUser(user.id, {
        verificationToken,
        verificationExpiry,
      });

      const { sendVerificationEmail } = await import('./email');
      const emailResult = await sendVerificationEmail(email, verificationToken, user.fullName, req);

      if (!emailResult.success) {
        console.warn(`[Auth] Failed to resend verification email to ${email}: ${emailResult.error}`);
        return res.status(500).json({ error: "Failed to send verification email. Please try again." });
      }

      res.json({ success: true, message: "Verification email sent. Please check your inbox." });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Forgot password - request reset email
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Rate limit: one reset request per email every 60 seconds
      const normalizedEmail = email.toLowerCase().trim();
      const lastRequest = passwordResetRequests.get(normalizedEmail);
      const now = Date.now();
      
      if (lastRequest && now - lastRequest < PASSWORD_RESET_COOLDOWN_SECONDS * 1000) {
        const remainingSeconds = Math.ceil((PASSWORD_RESET_COOLDOWN_SECONDS * 1000 - (now - lastRequest)) / 1000);
        return res.status(429).json({ 
          error: `Please wait ${remainingSeconds} seconds before requesting another reset link.` 
        });
      }

      const user = await storage.getUserByEmail(email);
      
      // Always return the same generic response to prevent email enumeration
      const genericResponse = { success: true, message: "If an account exists with this email, a password reset link will be sent." };
      
      if (!user) {
        console.log(`[Auth] Password reset requested for non-existent email: ${email}`);
        // Still record the request to prevent enumeration via timing
        passwordResetRequests.set(normalizedEmail, now);
        return res.json(genericResponse);
      }

      // Generate new token (this invalidates any existing token automatically)
      const resetToken = randomBytes(32).toString('hex');
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await storage.updateUser(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetExpiry,
      });
      
      // Record the request time for rate limiting
      passwordResetRequests.set(normalizedEmail, now);

      const { sendPasswordResetEmail } = await import('./email');
      const emailResult = await sendPasswordResetEmail(email, resetToken, user.fullName, req);

      if (!emailResult.success) {
        // Log error but still return generic success to prevent enumeration
        console.warn(`[Auth] Failed to send password reset email to ${email}: ${emailResult.error}`);
      }

      // Always return same response regardless of outcome
      res.json(genericResponse);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Reset password with token
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      // Find user by reset token
      const user = await storage.getUserByResetToken(token);
      
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Check if token has expired
      if (user.passwordResetExpiry && new Date() > new Date(user.passwordResetExpiry)) {
        return res.status(400).json({ error: "Reset token has expired. Please request a new one." });
      }

      // Hash new password
      const hashedPassword = await hash(password, 12);

      // Update user password and clear reset token
      await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
        mustChangePassword: false,
        loginAttempts: 0,
        lockedUntil: null,
      });

      await storage.createAuditLog({
        userId: user.id,
        action: "Password Reset",
        entity: "User",
        entityId: user.id,
        details: "Password reset via email link",
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true, message: "Password has been reset successfully. You can now log in." });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const requestId = (req as any).requestId || 'unknown';
    const sessionIdPrefix = req.sessionID ? req.sessionID.substring(0, 8) : 'none';
    
    // Log detailed session diagnostics for /api/auth/me
    console.log(`[AUTH /api/auth/me] Request: requestId=${requestId}, sessionId=${sessionIdPrefix}..., host=${req.headers.host}, protocol=${req.protocol}, secure=${req.secure}, xForwardedProto=${req.headers['x-forwarded-proto']}, hasCookie=${!!req.headers.cookie}, sessionUserId=${req.session?.userId || 'none'}, cookieSecure=${req.session?.cookie?.secure}`);
    
    if (!req.session?.userId) {
      console.log(`[AUTH /api/auth/me] No session userId - sessionId=${sessionIdPrefix}..., returning 401. Cookies present: ${req.headers.cookie?.split(';').map(c => c.trim().split('=')[0]).join(', ') || 'none'}`);
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      console.log(`[AUTH /api/auth/me] Success: userId=${user.id}, org=${user.organizationId}`);
      
      res.json({ 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        fullName: user.fullName, 
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        accessScope: user.accessScope,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== SUBSCRIPTION & ENTITLEMENTS ==============
  app.get("/api/subscription/entitlements", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.organizationId) {
        return res.status(400).json({ error: "User not associated with an organization" });
      }

      const organizationId = user.organizationId;
      let subscription = await storage.getSubscription(organizationId);
      
      if (!subscription) {
        subscription = await storage.createSubscription({
          organizationId,
          planName: "starter",
          billingPeriod: "monthly",
          slotsPurchased: 1,
          status: "trial",
          startDate: new Date(),
        });
      }

      const organization = await storage.getOrganization(organizationId);
      const planName = (subscription.planName || "starter") as SubscriptionPlan;
      const baseLimits = PLAN_LIMITS[planName] || PLAN_LIMITS.starter;
      
      // Get usage counts
      const clientsUsed = await storage.getClientCountByOrganization(organizationId);
      
      const entitlements = {
        ...baseLimits,
        maxClients: baseLimits.maxClients * (subscription.slotsPurchased || 1),
        clientsUsed,
        currencyCode: organization?.currencyCode || "NGN",
        subscription: {
          id: subscription.id,
          planName: subscription.planName,
          billingPeriod: subscription.billingPeriod,
          slotsPurchased: subscription.slotsPurchased,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
        }
      };

      res.json(entitlements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/subscription", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !user.organizationId) {
        return res.status(404).json({ error: "User not found or not in organization" });
      }
      
      const subscription = await storage.getSubscription(user.organizationId);
      res.json(subscription || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update subscription plan (super admin only - manual mode)
  app.patch("/api/subscription", requireSuperAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !user.organizationId) {
        return res.status(404).json({ error: "User not found or not in organization" });
      }
      
      const { planName, billingPeriod, slotsPurchased, status } = req.body;
      
      // Validate plan name
      const validPlans = ["starter", "growth", "business", "enterprise"];
      if (planName && !validPlans.includes(planName)) {
        return res.status(400).json({ error: `Invalid plan. Must be one of: ${validPlans.join(", ")}` });
      }
      
      // Validate billing period
      const validPeriods = ["monthly", "quarterly", "yearly"];
      if (billingPeriod && !validPeriods.includes(billingPeriod)) {
        return res.status(400).json({ error: `Invalid billing period. Must be one of: ${validPeriods.join(", ")}` });
      }
      
      // Validate status
      const validStatuses = ["trial", "active", "past_due", "suspended", "cancelled"];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      }
      
      // Get existing subscription or create new one
      let subscription = await storage.getSubscription(user.organizationId);
      
      const updateData: any = {};
      if (planName) updateData.planName = planName;
      if (billingPeriod) updateData.billingPeriod = billingPeriod;
      if (slotsPurchased !== undefined) updateData.slotsPurchased = slotsPurchased;
      if (status) updateData.status = status;
      
      if (subscription) {
        subscription = await storage.updateSubscription(subscription.id, updateData);
      } else {
        // Create new subscription if none exists
        subscription = await storage.createSubscription({
          organizationId: user.organizationId,
          planName: planName || "starter",
          billingPeriod: billingPeriod || "monthly",
          slotsPurchased: slotsPurchased || 1,
          status: status || "trial",
          startDate: new Date(),
        });
      }
      
      // Log admin activity
      await storage.createAdminActivityLog({
        actorId: req.session.userId!,
        actionType: "subscription_updated",
        reason: `Plan updated to: ${planName || subscription?.planName}`,
        ipAddress: req.ip || "Unknown",
      });
      
      res.json(subscription);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get organization details
  app.get("/api/organization", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !user.organizationId) {
        return res.status(404).json({ error: "User not found or not in organization" });
      }
      
      const organization = await storage.getOrganization(user.organizationId);
      res.json(organization || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update organization details
  app.patch("/api/organization", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !user.organizationId) {
        return res.status(404).json({ error: "User not found or not in organization" });
      }
      
      // Only org owners can update
      if (user.organizationRole !== "owner" && user.role !== "super_admin") {
        return res.status(403).json({ error: "Only organization owners can update settings" });
      }
      
      const { name, email, phone, address, currencyCode } = req.body;
      const updated = await storage.updateOrganization(user.organizationId, {
        name, email, phone, address, currencyCode
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== DASHBOARD ==============
  app.get("/api/dashboard/summary", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }
      
      const { clientId, departmentId, date } = req.query;
      const filters = {
        organizationId: user.organizationId,  // CRITICAL: Scope to user's organization
        clientId: clientId as string | undefined,
        departmentId: departmentId as string | undefined,
        date: date as string | undefined,
      };
      const summary = await storage.getDashboardSummary(filters);
      
      const duration = Date.now() - startTime;
      if (duration > 3000) {
        console.warn(`[SLOW] GET /api/dashboard/summary took ${duration}ms for org ${user.organizationId}`);
      }
      
      res.json(summary);
    } catch (error: any) {
      console.error(`[ERROR] GET /api/dashboard/summary failed after ${Date.now() - startTime}ms:`, error.message);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/departments/by-client/:clientId", requireAuth, requireClientAccess(), async (req, res) => {
    try {
      const { clientId } = req.params;
      const departments = await storage.getDepartments(clientId);
      res.json(departments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== PAYMENT DECLARATIONS ==============
  app.get("/api/payment-declarations/:departmentId", requireAuth, async (req, res) => {
    try {
      const { departmentId } = req.params;
      const { startDate, endDate } = req.query;
      const declarations = await storage.getPaymentDeclarations(
        departmentId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(declarations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/payment-declarations/:clientId/:departmentId/:date", requireAuth, async (req, res) => {
    try {
      const { clientId, departmentId, date } = req.params;
      const declaration = await storage.getPaymentDeclaration(clientId, departmentId, new Date(date));
      if (!declaration) {
        return res.status(404).json({ error: "No payment declaration found for this date" });
      }
      res.json(declaration);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/payment-declarations", requireAuth, async (req, res) => {
    try {
      const parsed = insertPaymentDeclarationSchema.safeParse({
        ...req.body,
        createdBy: req.session.userId,
        date: new Date(req.body.date)
      });
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      // Backend validation: If captured sales = 0, declared must also be 0
      // Get sales entries for the department on the specific date
      const declarationDate = parsed.data.date;
      const startOfDay = new Date(declarationDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(declarationDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const salesEntries = await storage.getSalesEntries(parsed.data.departmentId, startOfDay, endOfDay);
      const totalCaptured = salesEntries.reduce((sum, e) => sum + Number(e.totalSales || 0), 0);
      
      const totalDeclared = Number(parsed.data.reportedCash || 0) + 
                           Number(parsed.data.reportedPosSettlement || 0) + 
                           Number(parsed.data.reportedTransfers || 0);
      
      if (totalCaptured === 0 && totalDeclared > 0) {
        return res.status(400).json({ 
          error: "No captured sales for this department today. Capture sales first or declare ₦0 for no transactions." 
        });
      }
      
      // Check if declaration already exists for this client/department/date
      const existing = await storage.getPaymentDeclaration(
        parsed.data.clientId,
        parsed.data.departmentId,
        parsed.data.date
      );
      
      if (existing) {
        // Update instead of create
        const updated = await storage.updatePaymentDeclaration(existing.id, parsed.data);
        
        await storage.createAuditLog({
          userId: req.session.userId,
          action: "update",
          entity: "payment_declaration",
          entityId: existing.id,
          details: `Updated payment declaration for ${parsed.data.date}`,
          ipAddress: req.ip
        });
        
        return res.json(updated);
      }
      
      const declaration = await storage.createPaymentDeclaration(parsed.data);
      
      await storage.createAuditLog({
        userId: req.session.userId,
        action: "create",
        entity: "payment_declaration",
        entityId: declaration.id,
        details: `Created payment declaration for ${parsed.data.date}`,
        ipAddress: req.ip
      });
      
      res.status(201).json(declaration);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/payment-declarations/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getPaymentDeclarationById(id);
      
      if (!existing) {
        return res.status(404).json({ error: "Payment declaration not found" });
      }
      
      const updated = await storage.updatePaymentDeclaration(id, req.body);
      
      await storage.createAuditLog({
        userId: req.session.userId,
        action: "update",
        entity: "payment_declaration",
        entityId: id,
        details: `Updated payment declaration`,
        ipAddress: req.ip
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/payment-declarations/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getPaymentDeclarationById(id);
      
      if (!existing) {
        return res.status(404).json({ error: "Payment declaration not found" });
      }
      
      await storage.deletePaymentDeclaration(id);
      
      await storage.createAuditLog({
        userId: req.session.userId,
        action: "delete",
        entity: "payment_declaration",
        entityId: id,
        details: `Deleted payment declaration`,
        ipAddress: req.ip
      });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get sales summary and reconciliation hint for a department on a date
  app.get("/api/reconciliation-hint/:departmentId/:date", requireAuth, async (req, res) => {
    try {
      const { departmentId, date } = req.params;
      const dateObj = new Date(date);
      
      // Get department to get clientId
      const department = await storage.getDepartment(departmentId);
      if (!department) {
        return res.status(404).json({ error: "Department not found" });
      }
      
      // Get captured sales summary
      const salesSummary = await storage.getSalesSummaryForDepartment(departmentId, dateObj);
      
      // Get payment declaration if exists
      const declaration = await storage.getPaymentDeclaration(department.clientId, departmentId, dateObj);
      
      const reportedTotal = declaration ? parseFloat(declaration.totalReported || "0") : 0;
      const capturedTotal = salesSummary.totalSales;
      const difference = capturedTotal - reportedTotal;
      
      res.json({
        captured: salesSummary,
        reported: declaration ? {
          cash: parseFloat(declaration.reportedCash || "0"),
          pos: parseFloat(declaration.reportedPosSettlement || "0"),
          transfers: parseFloat(declaration.reportedTransfers || "0"),
          total: reportedTotal,
          notes: declaration.notes,
          documents: declaration.supportingDocuments
        } : null,
        difference: {
          cash: salesSummary.totalCash - (declaration ? parseFloat(declaration.reportedCash || "0") : 0),
          pos: salesSummary.totalPos - (declaration ? parseFloat(declaration.reportedPosSettlement || "0") : 0),
          transfers: salesSummary.totalTransfer - (declaration ? parseFloat(declaration.reportedTransfers || "0") : 0),
          total: difference
        },
        hasDeclaration: !!declaration,
        status: Math.abs(difference) < 0.01 ? "balanced" : difference > 0 ? "over_declared" : "under_declared"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== USER MANAGEMENT (Super Admin Only) ==============
  app.get("/api/users", requireSuperAdmin, async (req, res) => {
    try {
      const { role, status, search } = req.query;
      const users = await storage.getUsers({
        role: role as string,
        status: status as string,
        search: search as string,
      });
      
      const safeUsers = users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        status: u.status,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        accessScope: u.accessScope,
        phone: u.phone,
      }));
      
      res.json(safeUsers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/:id", requireSuperAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        accessScope: user.accessScope,
        phone: user.phone,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/users", requireSuperAdmin, async (req, res) => {
    try {
      const { fullName, email, username, role, phone, accessScope, sendInvite } = req.body;

      if (!fullName || !email || !username || !role) {
        return res.status(400).json({ error: "Full name, email, username, and role are required" });
      }

      if (!["supervisor", "auditor"].includes(role)) {
        return res.status(400).json({ error: "Role must be supervisor or auditor" });
      }

      // Get current user's organization
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already in use" });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already in use" });
      }

      const tempPassword = randomBytes(12).toString("base64").slice(0, 12);
      const hashedPassword = await hash(tempPassword, 12);

      const user = await storage.createUser({
        organizationId: currentUser.organizationId,
        organizationRole: "member",
        username,
        email,
        password: hashedPassword,
        fullName,
        role,
        phone,
        status: "active",
        mustChangePassword: true,
        accessScope: accessScope || { global: role === "supervisor" },
      });

      await storage.createAdminActivityLog({
        actorId: req.session.userId!,
        targetUserId: user.id,
        actionType: "user_created",
        afterState: { fullName, email, role, accessScope },
        ipAddress: req.ip || "Unknown",
      });

      res.json({ 
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
        temporaryPassword: tempPassword,
        message: "User created. Please share the temporary password securely.",
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/users/:id", requireSuperAdmin, async (req, res) => {
    try {
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const { fullName, role, phone, accessScope, status } = req.body;

      if (targetUser.role === "super_admin" && role && role !== "super_admin") {
        return res.status(403).json({ error: "Cannot change the role of a Super Admin" });
      }

      const beforeState = {
        fullName: targetUser.fullName,
        role: targetUser.role,
        phone: targetUser.phone,
        accessScope: targetUser.accessScope,
        status: targetUser.status,
      };

      const updateData: any = {};
      if (fullName !== undefined) updateData.fullName = fullName;
      if (role !== undefined && ["supervisor", "auditor"].includes(role)) updateData.role = role;
      if (phone !== undefined) updateData.phone = phone;
      if (accessScope !== undefined) updateData.accessScope = accessScope;
      if (status !== undefined && ["active", "deactivated"].includes(status)) updateData.status = status;

      const user = await storage.updateUser(req.params.id, updateData);

      await storage.createAdminActivityLog({
        actorId: req.session.userId!,
        targetUserId: req.params.id,
        actionType: "user_updated",
        beforeState,
        afterState: updateData,
        ipAddress: req.ip || "Unknown",
      });

      res.json({
        id: user!.id,
        username: user!.username,
        email: user!.email,
        fullName: user!.fullName,
        role: user!.role,
        status: user!.status,
        accessScope: user!.accessScope,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/users/:id/deactivate", requireSuperAdmin, async (req, res) => {
    try {
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      if (targetUser.role === "super_admin") {
        const superAdminCount = await storage.getSuperAdminCount();
        if (superAdminCount <= 1) {
          return res.status(403).json({ error: "Cannot deactivate the last Super Admin" });
        }
      }

      const { reason } = req.body;

      await storage.updateUser(req.params.id, { status: "deactivated" });

      await storage.createAdminActivityLog({
        actorId: req.session.userId!,
        targetUserId: req.params.id,
        actionType: "user_deactivated",
        beforeState: { status: targetUser.status },
        afterState: { status: "deactivated" },
        reason,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true, message: "User deactivated successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/users/:id/reactivate", requireSuperAdmin, async (req, res) => {
    try {
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.updateUser(req.params.id, { status: "active" });

      await storage.createAdminActivityLog({
        actorId: req.session.userId!,
        targetUserId: req.params.id,
        actionType: "user_reactivated",
        beforeState: { status: targetUser.status },
        afterState: { status: "active" },
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true, message: "User reactivated successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/users/:id/reset-password", requireSuperAdmin, async (req, res) => {
    try {
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const tempPassword = randomBytes(12).toString("base64").slice(0, 12);
      const hashedPassword = await hash(tempPassword, 12);

      await storage.updateUser(req.params.id, { 
        password: hashedPassword, 
        mustChangePassword: true,
        loginAttempts: 0,
        lockedUntil: null,
      });

      await storage.createAdminActivityLog({
        actorId: req.session.userId!,
        targetUserId: req.params.id,
        actionType: "password_reset",
        ipAddress: req.ip || "Unknown",
      });

      res.json({ 
        success: true, 
        temporaryPassword: tempPassword,
        message: "Password reset. User must change password on next login.",
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/users/:id", requireSuperAdmin, async (req, res) => {
    try {
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      if (targetUser.role === "super_admin") {
        const superAdminCount = await storage.getSuperAdminCount();
        if (superAdminCount <= 1) {
          return res.status(403).json({ error: "Cannot delete the last Super Admin" });
        }
      }

      if (targetUser.id === req.session.userId) {
        return res.status(403).json({ error: "Cannot delete your own account" });
      }

      const { reason, confirmation } = req.body;

      if (confirmation !== targetUser.email) {
        return res.status(400).json({ error: "Please type the user's email to confirm deletion" });
      }

      await storage.createAdminActivityLog({
        actorId: req.session.userId!,
        targetUserId: req.params.id,
        actionType: "user_deleted",
        beforeState: { 
          fullName: targetUser.fullName, 
          email: targetUser.email, 
          role: targetUser.role 
        },
        reason,
        ipAddress: req.ip || "Unknown",
      });

      await storage.deleteUser(req.params.id);

      res.json({ success: true, message: "User permanently deleted" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== ADMIN ACTIVITY LOGS ==============
  app.get("/api/admin-activity-logs", requireSuperAdmin, async (req, res) => {
    try {
      const { actorId, targetUserId, actionType, startDate, endDate } = req.query;
      
      const logs = await storage.getAdminActivityLogs({
        actorId: actorId as string,
        targetUserId: targetUserId as string,
        actionType: actionType as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== USER-CLIENT ACCESS ==============
  
  app.get("/api/user-client-access/user/:userId", requireSuperAdmin, async (req, res) => {
    try {
      const accessList = await storage.getUserClientAccessList(req.params.userId);
      res.json(accessList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/user-client-access/client/:clientId", requireSuperAdmin, async (req, res) => {
    try {
      const accessList = await storage.getClientUserAccessList(req.params.clientId);
      res.json(accessList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/user-client-access/:userId/:clientId", requireAuth, async (req, res) => {
    try {
      const access = await storage.getUserClientAccess(req.params.userId, req.params.clientId);
      res.json(access || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/user-client-access", requireSuperAdmin, async (req, res) => {
    try {
      const { userId, clientId, status, notes } = req.body;
      
      const existing = await storage.getUserClientAccess(userId, clientId);
      if (existing) {
        const updated = await storage.updateUserClientAccess(existing.id, { 
          status, 
          notes,
          assignedBy: req.session.userId! 
        });
        
        await storage.createAdminActivityLog({
          actorId: req.session.userId!,
          targetUserId: userId,
          actionType: `client_access_${status}`,
          beforeState: { status: existing.status },
          afterState: { status },
          reason: notes,
          ipAddress: req.ip || "Unknown",
        });
        
        return res.json(updated);
      }
      
      const access = await storage.createUserClientAccess({
        userId,
        clientId,
        status: status || "assigned",
        assignedBy: req.session.userId!,
        notes,
      });
      
      await storage.createAdminActivityLog({
        actorId: req.session.userId!,
        targetUserId: userId,
        actionType: "client_access_assigned",
        afterState: { clientId, status: access.status },
        reason: notes,
        ipAddress: req.ip || "Unknown",
      });
      
      res.status(201).json(access);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/user-client-access/:id", requireSuperAdmin, async (req, res) => {
    try {
      const { status, notes, suspendReason } = req.body;
      
      const updated = await storage.updateUserClientAccess(req.params.id, { 
        status, 
        notes,
        suspendReason: status === "suspended" ? suspendReason : null,
      });
      
      if (!updated) {
        return res.status(404).json({ error: "Access record not found" });
      }
      
      await storage.createAdminActivityLog({
        actorId: req.session.userId!,
        targetUserId: updated.userId,
        actionType: `client_access_${status}`,
        afterState: { clientId: updated.clientId, status },
        reason: notes || suspendReason,
        ipAddress: req.ip || "Unknown",
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/user-client-access/:id", requireSuperAdmin, async (req, res) => {
    try {
      await storage.deleteUserClientAccess(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== AUDIT CONTEXT ==============

  app.get("/api/audit-context", requireAuth, async (req, res) => {
    try {
      const context = await storage.getActiveAuditContext(req.session.userId!);
      res.json(context || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/audit-context", requireAuth, async (req, res) => {
    try {
      const { clientId, departmentId, period, startDate, endDate } = req.body;
      
      if (!clientId || !startDate || !endDate) {
        return res.status(400).json({ error: "clientId, startDate, and endDate are required" });
      }
      
      const context = await storage.createAuditContext({
        userId: req.session.userId!,
        clientId,
        departmentId,
        period: period || "daily",
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: "active",
      });
      
      res.status(201).json(context);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/audit-context", requireAuth, async (req, res) => {
    try {
      await storage.clearAuditContext(req.session.userId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== AUDITS ==============

  app.get("/api/audits", requireAuth, async (req, res) => {
    try {
      const { clientId, departmentId, status } = req.query;
      const audits = await storage.getAudits({
        clientId: clientId as string,
        departmentId: departmentId as string,
        status: status as string,
      });
      res.json(audits);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/audits/:id", requireAuth, async (req, res) => {
    try {
      const audit = await storage.getAudit(req.params.id);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      res.json(audit);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/audits", requireAuth, async (req, res) => {
    try {
      const { clientId, departmentId, period, startDate, endDate, notes } = req.body;
      
      const existingAudit = await storage.getAuditByPeriod(
        clientId, 
        departmentId, 
        new Date(startDate), 
        new Date(endDate)
      );
      
      if (existingAudit) {
        return res.json(existingAudit);
      }
      
      const audit = await storage.createAudit({
        clientId,
        departmentId,
        period: period || "daily",
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: "draft",
        notes,
        createdBy: req.session.userId!,
      });
      
      res.status(201).json(audit);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/audits/:id", requireAuth, async (req, res) => {
    try {
      const audit = await storage.getAudit(req.params.id);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      
      const user = await storage.getUser(req.session.userId!);
      
      if (audit.status !== "draft" && user?.role !== "super_admin") {
        const hasReissuePermission = await storage.getAuditReissuePermission(audit.id, req.session.userId!);
        if (!hasReissuePermission) {
          return res.status(403).json({ error: "Cannot edit submitted audit without reissue permission" });
        }
      }
      
      const updated = await storage.updateAudit(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/audits/:id/submit", requireAuth, async (req, res) => {
    try {
      const audit = await storage.getAudit(req.params.id);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      
      if (audit.status !== "draft") {
        return res.status(400).json({ error: "Audit has already been submitted" });
      }
      
      const submitted = await storage.submitAudit(req.params.id, req.session.userId!);
      
      await storage.createAuditChangeLog({
        auditId: audit.id,
        userId: req.session.userId!,
        clientId: audit.clientId,
        departmentId: audit.departmentId,
        actionType: "audit_submitted",
        entityType: "audit",
        entityId: audit.id,
        beforeState: { status: "draft" },
        afterState: { status: "submitted" },
      });
      
      res.json(submitted);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/audits/:id/lock", requireSuperAdmin, async (req, res) => {
    try {
      const audit = await storage.getAudit(req.params.id);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      
      const locked = await storage.lockAudit(req.params.id, req.session.userId!);
      
      await storage.createAuditChangeLog({
        auditId: audit.id,
        userId: req.session.userId!,
        clientId: audit.clientId,
        departmentId: audit.departmentId,
        actionType: "audit_locked",
        entityType: "audit",
        entityId: audit.id,
        beforeState: { status: audit.status },
        afterState: { status: "locked" },
      });
      
      res.json(locked);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== AUDIT REISSUE PERMISSIONS ==============

  app.get("/api/audits/:id/reissue-permissions", requireSuperAdmin, async (req, res) => {
    try {
      const permissions = await storage.getAuditReissuePermissions(req.params.id);
      res.json(permissions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/audits/:id/reissue-permissions", requireSuperAdmin, async (req, res) => {
    try {
      const { grantedTo, expiresAt, scope, reason } = req.body;
      
      const permission = await storage.createAuditReissuePermission({
        auditId: req.params.id,
        grantedTo,
        grantedBy: req.session.userId!,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        scope: scope || "edit_after_submission",
        reason,
      });
      
      const audit = await storage.getAudit(req.params.id);
      
      await storage.createAuditChangeLog({
        auditId: req.params.id,
        userId: req.session.userId!,
        clientId: audit?.clientId,
        departmentId: audit?.departmentId,
        actionType: "reissue_permission_granted",
        entityType: "audit_reissue_permission",
        entityId: permission.id,
        afterState: { grantedTo, scope, reason },
      });
      
      res.status(201).json(permission);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/audits/:id/reissue-permissions/:permissionId", requireSuperAdmin, async (req, res) => {
    try {
      await storage.revokeAuditReissuePermission(req.params.permissionId);
      
      await storage.createAuditChangeLog({
        auditId: req.params.id,
        userId: req.session.userId!,
        actionType: "reissue_permission_revoked",
        entityType: "audit_reissue_permission",
        entityId: req.params.permissionId,
      });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== AUDIT CHANGE LOG ==============

  app.get("/api/audits/:id/change-log", requireAuth, async (req, res) => {
    try {
      const logs = await storage.getAuditChangeLogs(req.params.id);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== CLIENTS ==============
  app.get("/api/clients", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }
      
      // CRITICAL: Filter clients by user's organization for tenant isolation
      let allClients = await storage.getClients(user.organizationId);
      
      // Further filter by accessScope if user doesn't have global access
      if (user.role !== "super_admin" && user.accessScope && !user.accessScope.global) {
        allClients = allClients.filter(c => 
          user.accessScope?.clientIds?.includes(c.id)
        );
      }
      
      const duration = Date.now() - startTime;
      if (duration > 3000) {
        console.warn(`[SLOW] GET /api/clients took ${duration}ms for org ${user.organizationId}`);
      }
      
      res.json(allClients);
    } catch (error: any) {
      console.error(`[ERROR] GET /api/clients failed after ${Date.now() - startTime}ms:`, error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }
      
      // CRITICAL: Only return client if it belongs to user's organization
      const client = await storage.getClientWithOrgCheck(req.params.id, user.organizationId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clients", requireSuperAdmin, async (req, res) => {
    try {
      // Validate and normalize client name
      if (!req.body.name || !validateNameLength(req.body.name)) {
        return res.status(400).json({ error: "Client name must be at least 2 characters" });
      }
      if (req.body.name.trim().length > 20) {
        return res.status(400).json({ error: "Client name cannot exceed 20 characters" });
      }

      // Get user's organization and check entitlements
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }

      const subscription = await storage.getSubscription(user.organizationId);
      const planName = (subscription?.planName || "starter") as SubscriptionPlan;
      const baseLimits = PLAN_LIMITS[planName] || PLAN_LIMITS.starter;
      const maxClients = baseLimits.maxClients * (subscription?.slotsPurchased || 1);
      
      const clientsUsed = await storage.getClientCountByOrganization(user.organizationId);
      if (clientsUsed >= maxClients) {
        return res.status(403).json({ 
          code: "PLAN_RESTRICTED", 
          error: `Client limit reached (${clientsUsed}/${maxClients}). Upgrade your plan to add more clients.` 
        });
      }

      const normalizedName = req.body.name.trim().toUpperCase().replace(/\s+/g, ' ');
      
      const data = insertClientSchema.parse({ 
        ...req.body, 
        name: normalizedName,
        organizationId: user.organizationId  // Link client to organization
      });
      const client = await storage.createClient(data);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Client",
        entity: client.name,
        entityId: client.id,
        details: `New client added: ${client.name}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(client);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/clients/:id", requireSuperAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }
      
      // CRITICAL: Verify client belongs to user's organization
      const existingClient = await storage.getClientWithOrgCheck(req.params.id, user.organizationId);
      if (!existingClient) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Normalize name if being updated
      const updateData = { ...req.body };
      if (updateData.name) {
        if (!validateNameLength(updateData.name)) {
          return res.status(400).json({ error: "Client name must be at least 2 characters" });
        }
        if (updateData.name.trim().length > 20) {
          return res.status(400).json({ error: "Client name cannot exceed 20 characters" });
        }
        updateData.name = updateData.name.trim().toUpperCase().replace(/\s+/g, ' ');
      }
      // Prevent changing organizationId
      delete updateData.organizationId;
      
      const client = await storage.updateClient(req.params.id, updateData);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/clients/:id", requireSuperAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }
      
      // CRITICAL: Verify client belongs to user's organization
      const existingClient = await storage.getClientWithOrgCheck(req.params.id, user.organizationId);
      if (!existingClient) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      await storage.deleteClient(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Client",
        entity: "Client",
        entityId: req.params.id,
        details: `Client deleted: ${existingClient.name}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== CATEGORIES ==============
  app.get("/api/clients/:clientId/categories", requireAuth, requireClientAccess(), async (req, res) => {
    try {
      const categories = await storage.getCategories(req.params.clientId);
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/categories", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }
      
      const categories = await storage.getCategoriesByOrganization(user.organizationId);
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      const category = await storage.getCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/categories", requireSupervisorOrAbove, async (req, res) => {
    try {
      // Validate and normalize category name
      if (!req.body.name || !validateNameLength(req.body.name)) {
        return res.status(400).json({ error: "Category name must be at least 2 characters" });
      }
      const normalizedName = normalizeCategoryName(req.body.name);
      
      const data = insertCategorySchema.parse({
        ...req.body,
        name: normalizedName,
        createdBy: req.session.userId
      });
      const category = await storage.createCategory(data);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Category",
        entity: "Category",
        entityId: category.id,
        details: `New category added: ${category.name}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(category);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/categories/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      // Normalize name if being updated
      const updateData = { ...req.body };
      if (updateData.name) {
        if (!validateNameLength(updateData.name)) {
          return res.status(400).json({ error: "Category name must be at least 2 characters" });
        }
        updateData.name = normalizeCategoryName(updateData.name);
        
        // Check for duplicate name within same client
        const existingCategory = await storage.getCategory(req.params.id);
        if (existingCategory) {
          const allCategories = await storage.getCategories(existingCategory.clientId);
          const duplicate = allCategories.find(
            c => c.id !== req.params.id && c.name.toLowerCase() === updateData.name.toLowerCase()
          );
          if (duplicate) {
            return res.status(400).json({ error: "A category with this name already exists" });
          }
        }
      }
      
      const category = await storage.updateCategory(req.params.id, updateData);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/categories/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      // Soft delete - mark as deleted instead of removing
      const category = await storage.softDeleteCategory(req.params.id, req.session.userId!);
      
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Category",
        entity: "Category",
        entityId: req.params.id,
        details: `Category soft-deleted: ${category.name}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== SETTINGS ==============
  
  // Get tenant (organization) settings
  app.get("/api/organization-settings", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }
      const settings = await storage.getOrganizationSettings(user.organizationId);
      res.json(settings || { currency: "NGN", organizationId: user.organizationId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update tenant (organization) settings
  app.patch("/api/organization-settings", requireSuperAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }
      
      // Validate email format if provided
      if (req.body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      
      const settings = await storage.upsertOrganizationSettings(user.organizationId, {
        ...req.body,
        updatedBy: req.session.userId,
      });
      res.json(settings);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get user settings
  app.get("/api/user-settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getUserSettings(req.session.userId!);
      res.json(settings || { 
        userId: req.session.userId,
        theme: "light",
        autoSaveEnabled: true,
        autoSaveIntervalSeconds: 60,
        varianceThresholdPercent: "5.00"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update user settings
  app.patch("/api/user-settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.upsertUserSettings(req.session.userId!, req.body);
      res.json(settings);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== NOTIFICATIONS ==============

  // Get notifications for current user
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }
      
      const limit = parseInt(req.query.limit as string) || 20;
      const notifications = await storage.getNotifications(user.organizationId, user.id, limit);
      const unreadCount = await storage.getUnreadNotificationCount(user.organizationId, user.id);
      
      res.json({ notifications, unreadCount });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }
      
      await storage.markNotificationRead(req.params.id, user.organizationId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }
      
      await storage.markAllNotificationsRead(user.organizationId, user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== BILLING & SUBSCRIPTIONS ==============

  // Get current billing plan and usage
  app.get("/api/billing/plan", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }
      
      const tenantData = await getTenantEntitlements(user.organizationId);
      const organization = await storage.getOrganization(user.organizationId);
      
      res.json({
        plan: tenantData.plan,
        status: tenantData.status,
        startDate: tenantData.startDate,
        endDate: tenantData.endDate,
        isActive: tenantData.isActive,
        entitlements: tenantData.entitlements,
        usage: {
          clientsUsed: tenantData.usage.clientsUsed,
          clientsAllowed: tenantData.entitlements.maxClients,
          totalMainStores: tenantData.usage.totalMainStores,
          totalDeptStores: tenantData.usage.totalDeptStores,
          srdUsageByClient: tenantData.usage.srdUsageByClient,
          seatsUsed: tenantData.usage.seatsUsed,
          seatsAllowed: tenantData.entitlements.maxSeats,
        },
        organizationName: organization?.name,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get payment history
  app.get("/api/billing/payments", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }
      
      const payments = await storage.getPayments(user.organizationId);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Mark payment as complete (Super Admin only)
  app.post("/api/billing/mark-paid", requireSuperAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }
      
      const { amount, currency, periodMonths, reference, notes } = req.body;
      
      if (!amount || !periodMonths || periodMonths < 1) {
        return res.status(400).json({ error: "Amount and period (in months) are required" });
      }
      
      const now = new Date();
      const subscription = await storage.getSubscription(user.organizationId);
      
      // Calculate period dates
      const periodStart = subscription?.endDate && new Date(subscription.endDate) > now 
        ? new Date(subscription.endDate) 
        : now;
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + parseInt(periodMonths));
      
      // Create payment record
      const payment = await storage.createPayment({
        organizationId: user.organizationId,
        amount: amount.toString(),
        currency: currency || "NGN",
        periodCoveredStart: periodStart,
        periodCoveredEnd: periodEnd,
        status: "completed",
        reference: reference || null,
        notes: notes || null,
      });
      
      // Update subscription status and end date
      if (subscription) {
        await storage.updateSubscription(subscription.id, {
          status: "active",
          endDate: periodEnd,
        });
      }
      
      res.json({ 
        success: true, 
        payment,
        message: `Subscription extended until ${periodEnd.toLocaleDateString()}` 
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Upgrade plan (Super Admin only)
  app.post("/api/billing/upgrade", requireSuperAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }
      
      const { planName } = req.body;
      
      const validPlans = ["starter", "growth", "business", "enterprise"];
      if (!planName || !validPlans.includes(planName)) {
        return res.status(400).json({ error: "Invalid plan name" });
      }
      
      const subscription = await storage.getSubscription(user.organizationId);
      
      if (subscription) {
        await storage.updateSubscription(subscription.id, { planName });
        res.json({ success: true, message: `Plan upgraded to ${planName}` });
      } else {
        // Create new subscription if none exists
        await storage.createSubscription({
          organizationId: user.organizationId,
          planName,
          billingPeriod: "monthly",
          slotsPurchased: 1,
          status: "trial",
          startDate: new Date(),
        });
        res.json({ success: true, message: `Subscription created with ${planName} plan` });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== DATA EXPORTS ==============

  // Get export history
  app.get("/api/exports", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }
      
      const exports = await storage.getDataExports(user.organizationId);
      res.json(exports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create new export
  app.post("/api/exports", requireSuperAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }
      
      const { format, dataTypes, dateRangeStart, dateRangeEnd } = req.body;
      
      if (!format || !dataTypes || !Array.isArray(dataTypes) || dataTypes.length === 0) {
        return res.status(400).json({ error: "Format and at least one data type are required" });
      }
      
      // Create export record
      const exportRecord = await storage.createDataExport({
        organizationId: user.organizationId,
        createdBy: user.id,
        format,
        dataTypes,
        dateRangeStart: dateRangeStart || null,
        dateRangeEnd: dateRangeEnd || null,
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });
      
      // TODO: Start background export job (for now, just mark as completed with placeholder)
      // In production, this would queue a background job
      
      res.json({ 
        success: true, 
        message: "Export started. You will be notified when it's ready.",
        export: exportRecord 
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Download export file
  app.get("/api/exports/:id/download", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }
      
      const exportRecord = await storage.getDataExport(req.params.id, user.organizationId);
      if (!exportRecord) {
        return res.status(404).json({ error: "Export not found" });
      }
      
      if (exportRecord.status !== "completed" || !exportRecord.filePath) {
        return res.status(400).json({ error: "Export is not ready for download" });
      }
      
      // TODO: Stream file from storage
      res.status(501).json({ error: "Export download not yet implemented" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== DEPARTMENTS ==============
  
  // Get departments for a client
  app.get("/api/clients/:clientId/departments", requireAuth, requireClientAccess(), async (req, res) => {
    try {
      const departments = await storage.getDepartments(req.params.clientId);
      res.json(departments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get departments by category
  app.get("/api/categories/:categoryId/departments", requireAuth, async (req, res) => {
    try {
      const departments = await storage.getDepartmentsByCategory(req.params.categoryId);
      res.json(departments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create department for a client
  app.post("/api/clients/:clientId/departments", requireSupervisorOrAbove, async (req, res) => {
    try {
      const { clientId } = req.params;
      
      // Validate and normalize department name
      if (!req.body.name || !validateNameLength(req.body.name)) {
        return res.status(400).json({ error: "Department name must be at least 2 characters" });
      }
      const normalizedName = normalizeDepartmentName(req.body.name);
      
      // Check for duplicate name
      const nameExists = await storage.checkDepartmentNameExists(clientId, normalizedName);
      if (nameExists) {
        return res.status(400).json({ error: "A department with this name already exists for this client" });
      }
      
      const data = { 
        ...req.body, 
        name: normalizedName,
        clientId,
        createdBy: req.session.userId
      };
      const parsed = insertDepartmentSchema.parse(data);
      const department = await storage.createDepartment(parsed);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Department",
        entity: "Department",
        entityId: department.id,
        details: `New department added: ${department.name}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(department);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Bulk create departments for a client
  app.post("/api/departments/bulk", requireSupervisorOrAbove, async (req, res) => {
    try {
      const { departments: deptList, clientId, categoryId } = req.body;
      
      if (!Array.isArray(deptList) || deptList.length === 0) {
        return res.status(400).json({ error: "departments array is required" });
      }
      
      if (!clientId) {
        return res.status(400).json({ error: "clientId is required" });
      }
      
      // Check if client has at least one category before allowing department creation
      const categories = await storage.getCategories(clientId);
      if (!categories || categories.length === 0) {
        return res.status(400).json({ 
          error: "Create at least 1 CATEGORY before adding Departments. Categories help group Departments for inventory and reporting.",
          code: "CATEGORY_REQUIRED"
        });
      }
      
      const insertData = deptList
        .map((name: string) => name.trim())
        .filter((name: string) => validateNameLength(name))
        .map((name: string) => ({
          name: normalizeDepartmentName(name),
          clientId,
          categoryId: categoryId || null,
          status: "active",
          createdBy: req.session.userId,
        }));
      
      const created = await storage.createDepartmentsBulk(insertData);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Bulk Created Departments",
        entity: "Department",
        entityId: null,
        details: `Bulk created ${created.length} departments`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(created);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/departments", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }
      
      const departments = await storage.getDepartmentsByOrganization(user.organizationId);
      res.json(departments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/departments/:id", requireAuth, async (req, res) => {
    try {
      const department = await storage.getDepartment(req.params.id);
      if (!department) {
        return res.status(404).json({ error: "Department not found" });
      }
      res.json(department);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Check if department can be deleted (not used in any records)
  app.get("/api/departments/:id/usage", requireAuth, async (req, res) => {
    try {
      const isUsed = await storage.checkDepartmentUsage(req.params.id);
      res.json({ isUsed });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/departments", requireSupervisorOrAbove, async (req, res) => {
    try {
      const { clientId } = req.body;
      if (!clientId) {
        return res.status(400).json({ error: "Client ID is required" });
      }

      // Get user's organization and check entitlements for SRD department limit
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }

      const subscription = await storage.getSubscription(user.organizationId);
      const planName = (subscription?.planName || "starter") as SubscriptionPlan;
      const baseLimits = PLAN_LIMITS[planName] || PLAN_LIMITS.starter;
      const maxDepts = baseLimits.maxSrdDepartmentsPerClient;
      
      const deptsUsed = await storage.getDepartmentCountByClientAndOrganization(clientId, user.organizationId);
      if (deptsUsed >= maxDepts) {
        return res.status(403).json({ 
          code: "PLAN_RESTRICTED", 
          error: `Department limit reached for this client (${deptsUsed}/${maxDepts}). Upgrade your plan to add more SRD departments.` 
        });
      }

      const data = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(data);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Department",
        entity: "Department",
        entityId: department.id,
        details: `New department added: ${department.name}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(department);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/departments/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      const existingDept = await storage.getDepartment(req.params.id);
      
      // Normalize name if being updated
      const updateData = { ...req.body };
      if (updateData.name) {
        if (!validateNameLength(updateData.name)) {
          return res.status(400).json({ error: "Department name must be at least 2 characters" });
        }
        updateData.name = normalizeDepartmentName(updateData.name);
        
        // Check for duplicate name (excluding current department)
        if (existingDept) {
          const nameExists = await storage.checkDepartmentNameExists(existingDept.clientId, updateData.name, req.params.id);
          if (nameExists) {
            return res.status(400).json({ error: "A department with this name already exists for this client" });
          }
        }
      }
      
      const department = await storage.updateDepartment(req.params.id, updateData);
      if (!department) {
        return res.status(404).json({ error: "Department not found" });
      }
      
      if (req.body.status === "inactive" && existingDept?.status === "active") {
        await storage.createAuditLog({
          userId: req.session.userId!,
          action: "Deactivated Department",
          entity: "Department",
          entityId: department.id,
          details: `Department deactivated: ${department.name}. Reason: ${req.body.deactivationReason || "Not specified"}`,
          ipAddress: req.ip || "Unknown",
        });
      }
      
      res.json(department);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/departments/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      const isUsed = await storage.checkDepartmentUsage(req.params.id);
      if (isUsed) {
        return res.status(400).json({ 
          error: "Cannot delete department that has been used in records. Deactivate it instead." 
        });
      }
      
      await storage.deleteDepartment(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Department",
        entity: "Department",
        entityId: req.params.id,
        details: `Department deleted`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== SUPPLIERS ==============
  app.get("/api/suppliers", requireAuth, requireClientAccess(), async (req, res) => {
    try {
      const { clientId } = req.query;
      if (!clientId) {
        return res.status(400).json({ error: "clientId query parameter is required" });
      }
      const suppliers = await storage.getSuppliers(clientId as string);
      res.json(suppliers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/suppliers/:id", requireAuth, async (req, res) => {
    try {
      const supplier = await storage.getSupplier(req.params.id);
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/suppliers", requireAuth, async (req, res) => {
    try {
      const data = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(data);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Supplier",
        entity: "Supplier",
        entityId: supplier.id,
        details: `New supplier added: ${supplier.name}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(supplier);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/suppliers/:id", requireAuth, async (req, res) => {
    try {
      const supplier = await storage.updateSupplier(req.params.id, req.body);
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/suppliers/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      await storage.deleteSupplier(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Supplier",
        entity: "Supplier",
        entityId: req.params.id,
        details: `Supplier deleted`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== ITEMS ==============
  app.get("/api/items", requireAuth, requireClientAccess(), async (req, res) => {
    try {
      const { clientId } = req.query;
      if (!clientId) {
        return res.status(400).json({ error: "clientId query parameter is required" });
      }
      const items = await storage.getItems(clientId as string);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/items/:id", requireAuth, async (req, res) => {
    try {
      const item = await storage.getItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/items", requireAuth, async (req, res) => {
    try {
      // Normalize item name to Title Case
      const normalizedData = { ...req.body };
      if (normalizedData.name) {
        normalizedData.name = toTitleCase(normalizedData.name);
      }
      
      const data = insertItemSchema.parse(normalizedData);
      const item = await storage.createItem(data);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Item",
        entity: "Item",
        entityId: item.id,
        details: `New item added: ${item.name}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/items/:id", requireAuth, async (req, res) => {
    try {
      const { purchaseQty, purchaseDate, ...updateData } = req.body;
      
      // Normalize item name to Title Case if being updated
      if (updateData.name) {
        updateData.name = toTitleCase(updateData.name);
      }
      
      const existingItem = await storage.getItem(req.params.id);
      if (!existingItem) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      const item = await storage.updateItem(req.params.id, updateData);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      if (purchaseQty && parseFloat(purchaseQty) > 0) {
        // Use provided date or default to today
        let targetDate: Date;
        if (purchaseDate) {
          // Parse date in UTC-safe way to preserve the exact date the user selected
          // purchaseDate comes as "YYYY-MM-DD" from the HTML date input
          const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(purchaseDate);
          if (!dateMatch) {
            return res.status(400).json({ error: "Invalid date format. Expected YYYY-MM-DD" });
          }
          const [, year, month, day] = dateMatch;
          const yearNum = parseInt(year);
          const monthNum = parseInt(month);
          const dayNum = parseInt(day);
          
          // Create date at midnight UTC to preserve the exact calendar date
          targetDate = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
          
          // Validate: check if date is valid
          if (isNaN(targetDate.getTime())) {
            return res.status(400).json({ error: "Invalid purchase date" });
          }
          
          // Validate: ensure date components match (Date.UTC normalizes invalid dates)
          if (
            targetDate.getUTCFullYear() !== yearNum ||
            targetDate.getUTCMonth() !== monthNum - 1 ||
            targetDate.getUTCDate() !== dayNum
          ) {
            return res.status(400).json({ error: "Invalid date - day/month out of range" });
          }
          
          // Validate: don't allow future dates (compare in UTC)
          const today = new Date();
          const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
          if (targetDate > todayUTC) {
            return res.status(400).json({ error: "Purchase date cannot be in the future" });
          }
        } else {
          // Default to today at midnight UTC
          const today = new Date();
          targetDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
        }
        
        console.log(`[Purchase Capture] Client: ${item.clientId}, Item: ${item.name}, Qty: ${purchaseQty}`);
        
        // Find the Main Store inventory department for posting purchases
        // store_stock uses storeDepartmentId which is the inventory_departments.id
        const mainStoreInvDept = await storage.getInventoryDepartmentByType(item.clientId, "MAIN_STORE");
        
        if (mainStoreInvDept) {
          console.log(`[Purchase Capture] Using Main Store inventory dept: ${mainStoreInvDept.id}`);
          
          // Use the item's current cost price as the purchase price
          // Note: The actual cost price at purchase time is captured
          const purchaseCostPrice = item.costPrice || "0.00";
          
          await storage.addPurchaseToStoreStock(
            item.clientId,
            mainStoreInvDept.id, // Use inventory department ID, not linked department ID
            item.id,
            parseFloat(purchaseQty),
            purchaseCostPrice,
            targetDate
          );
          
          // Record purchase item event for the register
          // Only log if we have a valid cost price
          if (item.costPrice && parseFloat(item.costPrice) > 0) {
            const qty = parseFloat(purchaseQty);
            const unitCost = parseFloat(purchaseCostPrice);
            const totalCost = qty * unitCost;
            await storage.createPurchaseItemEvent({
              clientId: item.clientId,
              srdId: mainStoreInvDept.id,
              itemId: item.id,
              date: targetDate,
              qty: purchaseQty,
              unitCostAtPurchase: purchaseCostPrice,
              totalCost: totalCost.toFixed(2),
              supplierName: null,
              invoiceNo: null,
              notes: `Auto-logged from inventory purchase capture`,
              createdBy: req.session.userId!,
            });
          }
          
          const dateStr = targetDate.toISOString().split('T')[0];
          await storage.createAuditLog({
            userId: req.session.userId!,
            action: "Item Purchase Captured",
            entity: "Item",
            entityId: item.id,
            details: `Purchase of ${purchaseQty} ${item.unit} posted to Main Store SRD for ${dateStr}`,
            ipAddress: req.ip || "Unknown",
          });
          
          console.log(`[Purchase Capture] Successfully posted to store_stock`);
        } else {
          console.warn(`[Purchase Capture] No Main Store department found for client ${item.clientId}`);
        }
      }
      
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/items/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      await storage.deleteItem(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Item",
        entity: "Item",
        entityId: req.params.id,
        details: `Item deleted`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== STOCK COUNTS ==============
  app.get("/api/stock-counts", requireAuth, async (req, res) => {
    try {
      const { departmentId, date } = req.query;
      if (!departmentId) {
        return res.status(400).json({ error: "departmentId query parameter is required" });
      }
      const stockCounts = await storage.getStockCounts(
        departmentId as string,
        date ? new Date(date as string) : undefined
      );
      res.json(stockCounts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/stock-counts/:id", requireAuth, async (req, res) => {
    try {
      const stockCount = await storage.getStockCount(req.params.id);
      if (!stockCount) {
        return res.status(404).json({ error: "Stock count not found" });
      }
      res.json(stockCount);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stock-counts", requireAuth, async (req, res) => {
    try {
      const { storeDepartmentId, ...stockCountData } = req.body;
      
      // Check for existing stock count for same item/date/department
      if (stockCountData.clientId && stockCountData.departmentId && stockCountData.itemId && stockCountData.date) {
        const checkDate = new Date(stockCountData.date);
        const startOfDay = new Date(checkDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(checkDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        const existingCount = await storage.getExistingStockCount(
          stockCountData.clientId,
          stockCountData.departmentId,
          stockCountData.itemId,
          startOfDay,
          endOfDay
        );
        
        if (existingCount) {
          return res.status(409).json({ 
            error: "Count already exists for this item today. Please edit the existing count.",
            existingId: existingCount.id
          });
        }
      }
      
      // Convert date string to Date object for Zod validation
      const dateValue = stockCountData.date ? new Date(stockCountData.date) : undefined;
      
      const data = insertStockCountSchema.parse({
        ...stockCountData,
        storeDepartmentId: storeDepartmentId || null,
        date: dateValue,
        createdBy: req.session.userId!,
      });
      const stockCount = await storage.createStockCount(data);
      
      // If storeDepartmentId is provided, update storeStock.physicalClosingQty
      // This connects Stock Counts to the SRD ledger
      if (storeDepartmentId && stockCountData.itemId && stockCountData.clientId && stockCountData.date) {
        const stockDate = new Date(stockCountData.date);
        const physicalCount = stockCountData.actualClosingQty || "0";
        
        // First recalculate the ledger for the count date - this will create/update the row
        // with correct opening, movements, and closing based on all source data
        try {
          await recalculateForward(stockCountData.clientId, storeDepartmentId, stockCountData.itemId, stockDate);
          console.log(`[Stock Count] Ledger recalc for count date ${stockDate.toISOString().split('T')[0]}`);
        } catch (err: any) {
          console.error(`[Stock Count] Ledger recalc failed:`, err.message);
        }
        
        // Now get the ledger row (which now exists with correct movements) and set physical closing
        const ledgerRow = await storage.getStoreStockByItem(storeDepartmentId, stockCountData.itemId, stockDate);
        if (ledgerRow) {
          // Calculate variance = physicalClosing - expectedClosing
          const expectedClosing = parseFloat(ledgerRow.closingQty || "0");
          const physicalNum = parseFloat(physicalCount);
          const variance = physicalNum - expectedClosing;
          
          await storage.updateStoreStock(ledgerRow.id, { 
            physicalClosingQty: physicalCount,
            varianceQty: variance.toFixed(2),
          });
        }
        
        // Physical closing affects next day's opening - trigger forward recalculation
        // from the next day so that opening(D+1) = physicalClosing(D)
        const nextDay = new Date(stockDate);
        nextDay.setDate(nextDay.getDate() + 1);
        try {
          await recalculateForward(stockCountData.clientId, storeDepartmentId, stockCountData.itemId, nextDay);
          console.log(`[Stock Count] Forward recalc triggered from ${nextDay.toISOString().split('T')[0]}`);
        } catch (err: any) {
          console.error(`[Stock Count] Forward recalc failed:`, err.message);
        }
      }
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Stock Count",
        entity: "StockCount",
        entityId: stockCount.id,
        details: `Stock count recorded${storeDepartmentId ? ' (SRD updated)' : ''}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(stockCount);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/stock-counts/:id", requireAuth, async (req, res) => {
    try {
      const stockCount = await storage.updateStockCount(req.params.id, req.body);
      if (!stockCount) {
        return res.status(404).json({ error: "Stock count not found" });
      }
      res.json(stockCount);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/stock-counts/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      // Get the stock count before deleting to reverse store_stock
      const stockCount = await storage.getStockCount(req.params.id);
      if (!stockCount) {
        return res.status(404).json({ error: "Stock count not found" });
      }
      
      // Find and clear the associated storeStock physicalClosingQty
      let affectedSrdId: string | null = null;
      if (stockCount.storeDepartmentId) {
        // Use the stored storeDepartmentId (preferred)
        const storeStockRecord = await storage.getStoreStockByItem(
          stockCount.storeDepartmentId, 
          stockCount.itemId, 
          stockCount.date
        );
        if (storeStockRecord && storeStockRecord.physicalClosingQty !== null) {
          await storage.updateStoreStock(storeStockRecord.id, {
            physicalClosingQty: null,
          });
          affectedSrdId = stockCount.storeDepartmentId;
        }
      } else {
        // Fallback for existing counts without storeDepartmentId:
        // Find any DEPARTMENT_STORE SRD that has a matching store_stock record
        const invDepts = await storage.getInventoryDepartments(stockCount.clientId);
        const deptStoreSrds = invDepts.filter((d: any) => d.inventoryType === "DEPARTMENT_STORE");
        
        for (const srd of deptStoreSrds) {
          const storeStockRecord = await storage.getStoreStockByItem(srd.id, stockCount.itemId, stockCount.date);
          if (storeStockRecord && storeStockRecord.physicalClosingQty !== null) {
            await storage.updateStoreStock(storeStockRecord.id, {
              physicalClosingQty: null,
            });
            affectedSrdId = srd.id;
            break;
          }
        }
      }
      
      await storage.deleteStockCount(req.params.id);
      
      // Trigger forward recalculation from next day if we cleared a physical count
      if (affectedSrdId) {
        const nextDay = new Date(stockCount.date);
        nextDay.setDate(nextDay.getDate() + 1);
        try {
          await recalculateForward(stockCount.clientId, affectedSrdId, stockCount.itemId, nextDay);
          console.log(`[Stock Count Delete] Forward recalc triggered from ${nextDay.toISOString().split('T')[0]}`);
        } catch (err: any) {
          console.error(`[Stock Count Delete] Forward recalc failed:`, err.message);
        }
      }
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Stock Count",
        entity: "StockCount",
        entityId: req.params.id,
        details: `Stock count deleted and SRD ledger reversed`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== STORE ISSUES ==============
  app.get("/api/store-issues", requireAuth, async (req, res) => {
    try {
      const { clientId, date, toDepartmentId } = req.query;
      
      if (toDepartmentId) {
        const dateFilter = date ? new Date(date as string) : undefined;
        const issues = await storage.getStoreIssuesByDepartment(toDepartmentId as string, dateFilter);
        return res.json(issues);
      }
      
      if (!clientId) {
        return res.status(400).json({ error: "clientId is required" });
      }
      
      const dateFilter = date ? new Date(date as string) : undefined;
      const issues = await storage.getStoreIssues(clientId as string, dateFilter);
      res.json(issues);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/store-issues/:id", requireAuth, async (req, res) => {
    try {
      const issue = await storage.getStoreIssue(req.params.id);
      if (!issue) {
        return res.status(404).json({ error: "Store issue not found" });
      }
      res.json(issue);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/store-issues/:id/lines", requireAuth, async (req, res) => {
    try {
      const lines = await storage.getStoreIssueLines(req.params.id);
      res.json(lines);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/store-issues", requireAuth, async (req, res) => {
    try {
      const { lines, ...issueData } = req.body;
      
      const data = insertStoreIssueSchema.parse({
        ...issueData,
        issueDate: issueData.issueDate ? new Date(issueData.issueDate) : undefined,
        createdBy: req.session.userId!,
      });
      
      const issue = await storage.createStoreIssue(data);
      
      if (lines && Array.isArray(lines) && lines.length > 0) {
        const lineData = lines.map((line: any) => 
          insertStoreIssueLineSchema.parse({
            storeIssueId: issue.id,
            itemId: line.itemId,
            qtyIssued: line.qtyIssued,
            costPriceSnapshot: line.costPriceSnapshot || "0.00",
          })
        );
        await storage.createStoreIssueLinesBulk(lineData);
      }
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Store Issue",
        entity: "StoreIssue",
        entityId: issue.id,
        details: `Store issue created for ${issue.issueDate}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(issue);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/store-issues/:id", requireAuth, async (req, res) => {
    try {
      const { lines, ...updateData } = req.body;
      
      const issue = await storage.updateStoreIssue(req.params.id, updateData);
      if (!issue) {
        return res.status(404).json({ error: "Store issue not found" });
      }
      
      if (lines && Array.isArray(lines)) {
        await storage.deleteStoreIssueLines(req.params.id);
        if (lines.length > 0) {
          const lineData = lines.map((line: any) => 
            insertStoreIssueLineSchema.parse({
              storeIssueId: issue.id,
              itemId: line.itemId,
              qtyIssued: line.qtyIssued,
              costPriceSnapshot: line.costPriceSnapshot || "0.00",
            })
          );
          await storage.createStoreIssueLinesBulk(lineData);
        }
      }
      
      res.json(issue);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/store-issues/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      await storage.deleteStoreIssue(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Store Issue",
        entity: "StoreIssue",
        entityId: req.params.id,
        details: `Store issue deleted`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Recall issued stock back to Main Store
  app.post("/api/store-issues/:id/recall", requireAuth, async (req, res) => {
    try {
      const issue = await storage.getStoreIssue(req.params.id);
      if (!issue) {
        return res.status(404).json({ error: "Store issue not found" });
      }
      
      if (issue.status === "recalled") {
        return res.status(400).json({ error: "This issue has already been recalled" });
      }
      
      const lines = await storage.getStoreIssueLines(issue.id);
      const dateForStock = new Date(issue.issueDate);
      
      for (const line of lines) {
        const qtyToRecall = parseFloat(line.qtyIssued || "0");
        
        const fromStock = await storage.getStoreStockByItem(issue.fromDepartmentId, line.itemId, dateForStock);
        if (fromStock) {
          const currentIssued = parseFloat(fromStock.issuedQty || "0");
          const newIssued = Math.max(0, currentIssued - qtyToRecall);
          const opening = parseFloat(fromStock.openingQty || "0");
          const added = parseFloat(fromStock.addedQty || "0");
          const newClosing = opening + added - newIssued;
          await storage.updateStoreStock(fromStock.id, { 
            issuedQty: newIssued.toString(),
            closingQty: newClosing.toString()
          });
        }
        
        const toStock = await storage.getStoreStockByItem(issue.toDepartmentId, line.itemId, dateForStock);
        if (toStock) {
          const currentAdded = parseFloat(toStock.addedQty || "0");
          const newAdded = Math.max(0, currentAdded - qtyToRecall);
          const opening = parseFloat(toStock.openingQty || "0");
          const issued = parseFloat(toStock.issuedQty || "0");
          const newClosing = opening + newAdded - issued;
          await storage.updateStoreStock(toStock.id, { 
            addedQty: newAdded.toString(),
            closingQty: newClosing.toString()
          });
        }
      }
      
      const updatedIssue = await storage.updateStoreIssue(issue.id, { status: "recalled" });
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Recalled Store Issue",
        entity: "StoreIssue",
        entityId: issue.id,
        details: `Issue recalled from ${issue.toDepartmentId} back to ${issue.fromDepartmentId}`,
        ipAddress: req.ip || "Unknown",
      });
      
      res.json(updatedIssue);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get issued qty for a department/item on a specific date
  app.get("/api/store-issues/issued-qty", requireAuth, async (req, res) => {
    try {
      const { departmentId, itemId, date } = req.query;
      
      if (!departmentId || !itemId || !date) {
        return res.status(400).json({ error: "departmentId, itemId, and date are required" });
      }
      
      const issuedQty = await storage.getIssuedQtyForDepartment(
        departmentId as string,
        itemId as string,
        new Date(date as string)
      );
      
      res.json({ issuedQty });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== STORE STOCK ==============
  app.get("/api/store-stock", requireAuth, async (req, res) => {
    try {
      const { clientId, storeDepartmentId, date } = req.query;
      
      if (!clientId || !storeDepartmentId) {
        return res.status(400).json({ error: "clientId and storeDepartmentId are required" });
      }
      
      const dateFilter = date ? new Date(date as string) : undefined;
      const stock = await storage.getStoreStock(
        clientId as string,
        storeDepartmentId as string,
        dateFilter
      );
      res.json(stock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/store-stock", requireAuth, async (req, res) => {
    try {
      const data = insertStoreStockSchema.parse({
        ...req.body,
        createdBy: req.session.userId!,
      });
      
      const stock = await storage.upsertStoreStock(data);
      res.json(stock);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/store-stock/:id", requireAuth, async (req, res) => {
    try {
      const stock = await storage.updateStoreStock(req.params.id, req.body);
      if (!stock) {
        return res.status(404).json({ error: "Store stock not found" });
      }
      res.json(stock);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== STORE NAMES (SRDs - Client-specific) ==============
  app.get("/api/clients/:clientId/store-names", requireAuth, requireClientAccess(), async (req, res) => {
    try {
      const { clientId } = req.params;
      const storeNames = await storage.getStoreNamesByClient(clientId);
      res.json(storeNames);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/store-names/:id", requireAuth, async (req, res) => {
    try {
      const storeName = await storage.getStoreName(req.params.id);
      if (!storeName) {
        return res.status(404).json({ error: "Store name not found" });
      }
      
      // Verify client access
      const user = await storage.getUser(req.session.userId!);
      if (user?.role !== "super_admin") {
        const accessScope = user?.accessScope as { global?: boolean; clientIds?: string[] } | null;
        if (!accessScope?.global && (!accessScope?.clientIds || !accessScope.clientIds.includes(storeName.clientId))) {
          return res.status(403).json({ error: "Access denied to this client's SRDs" });
        }
      }
      
      res.json(storeName);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const normalizeSRDName = (name: string): string => {
    // Convert to uppercase first, then trim
    const trimmed = name.toUpperCase().trim();
    const suffix = "SR-D";
    if (trimmed.endsWith(suffix)) {
      return trimmed.slice(0, -suffix.length).trim() + " " + suffix;
    }
    return trimmed + " " + suffix;
  };

  app.post("/api/clients/:clientId/store-names", requireAuth, requireClientAccess(), async (req, res) => {
    try {
      const { clientId } = req.params;
      const normalizedName = normalizeSRDName(req.body.name || "");
      const data = insertStoreNameSchema.parse({
        ...req.body,
        name: normalizedName,
        clientId,
        createdBy: req.session.userId,
      });
      
      const existing = await storage.getStoreNameByName(clientId, data.name);
      if (existing) {
        return res.status(409).json({ error: "Store name already exists for this client" });
      }
      
      const storeName = await storage.createStoreName(data);
      res.status(201).json(storeName);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/store-names/:id", requireAuth, async (req, res) => {
    try {
      const existingStoreName = await storage.getStoreName(req.params.id);
      if (!existingStoreName) {
        return res.status(404).json({ error: "Store name not found" });
      }
      
      // Verify client access
      const user = await storage.getUser(req.session.userId!);
      if (user?.role !== "super_admin") {
        const accessScope = user?.accessScope as { global?: boolean; clientIds?: string[] } | null;
        if (!accessScope?.global && (!accessScope?.clientIds || !accessScope.clientIds.includes(existingStoreName.clientId))) {
          return res.status(403).json({ error: "Access denied to this client's SRDs" });
        }
      }
      
      const data = insertStoreNameSchema.partial().parse(req.body);
      
      if (data.name) {
        const normalizedName = normalizeSRDName(data.name);
        data.name = normalizedName;
        const duplicate = await storage.getStoreNameByName(existingStoreName.clientId, normalizedName);
        if (duplicate && duplicate.id !== req.params.id) {
          return res.status(409).json({ error: "Store name already exists for this client" });
        }
      }
      
      const storeName = await storage.updateStoreName(req.params.id, data);
      res.json(storeName);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/store-names/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const existingStoreName = await storage.getStoreName(req.params.id);
      if (!existingStoreName) {
        return res.status(404).json({ error: "Store name not found" });
      }
      
      // Verify client access (super admin is already enforced by requireRole)
      await storage.deleteStoreName(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message?.includes("violates foreign key")) {
        return res.status(400).json({ error: "Cannot delete store name - it is linked to inventory departments" });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // ============== INVENTORY DEPARTMENTS ==============
  app.get("/api/clients/:clientId/inventory-departments", requireAuth, requireClientAccess(), async (req, res) => {
    try {
      const inventoryDepts = await storage.getInventoryDepartments(req.params.clientId);
      res.json(inventoryDepts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/inventory-departments/:id", requireAuth, async (req, res) => {
    try {
      const dept = await storage.getInventoryDepartment(req.params.id);
      if (!dept) {
        return res.status(404).json({ error: "Inventory department not found" });
      }
      res.json(dept);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clients/:clientId/inventory-departments", requireAuth, async (req, res) => {
    try {
      const clientId = req.params.clientId;
      const data = insertInventoryDepartmentSchema.parse({
        ...req.body,
        clientId
      });
      
      if (!INVENTORY_TYPES.includes(data.inventoryType as any)) {
        return res.status(400).json({ error: "Invalid inventory type" });
      }
      
      // Get user's organization for subscription limits
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }
      
      // Check subscription limits for SRD creation
      const isMainStore = data.inventoryType === "MAIN_STORE" || data.inventoryType === "WAREHOUSE";
      const storeType = isMainStore ? "main_store" : "dept_store";
      
      const limitCheck = await checkSrdCreationLimit(user.organizationId, clientId, storeType);
      if (!limitCheck.allowed) {
        return res.status(403).json({ 
          error: limitCheck.message,
          code: "PLAN_LIMIT_REACHED"
        });
      }
      
      if (data.inventoryType === "MAIN_STORE" || data.inventoryType === "WAREHOUSE") {
        const existing = await storage.getInventoryDepartmentByType(clientId, data.inventoryType);
        if (existing) {
          return res.status(409).json({ 
            error: `Only one ${data.inventoryType.replace("_", " ").toLowerCase()} is allowed per client` 
          });
        }
      }
      
      const isDuplicate = await storage.checkInventoryDepartmentDuplicate(
        clientId, 
        data.storeNameId, 
        data.inventoryType
      );
      if (isDuplicate) {
        return res.status(409).json({ error: "This store name is already linked with this inventory type" });
      }
      
      const dept = await storage.createInventoryDepartment(data);
      res.status(201).json(dept);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/inventory-departments/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getInventoryDepartment(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Inventory department not found" });
      }
      
      const data = insertInventoryDepartmentSchema.partial().parse(req.body);
      
      if (data.inventoryType && (data.inventoryType === "MAIN_STORE" || data.inventoryType === "WAREHOUSE")) {
        const typeExists = await storage.getInventoryDepartmentByType(existing.clientId, data.inventoryType);
        if (typeExists && typeExists.id !== req.params.id) {
          return res.status(409).json({ 
            error: `Only one ${data.inventoryType.replace("_", " ").toLowerCase()} is allowed per client` 
          });
        }
      }
      
      if (data.storeNameId || data.inventoryType) {
        const isDuplicate = await storage.checkInventoryDepartmentDuplicate(
          existing.clientId,
          data.storeNameId || existing.storeNameId,
          data.inventoryType || existing.inventoryType,
          req.params.id
        );
        if (isDuplicate) {
          return res.status(409).json({ error: "This store name is already linked with this inventory type" });
        }
      }
      
      const dept = await storage.updateInventoryDepartment(req.params.id, data);
      res.json(dept);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/inventory-departments/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      await storage.deleteInventoryDepartment(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get categories assigned to an inventory department
  app.get("/api/inventory-departments/:id/categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getInventoryDepartmentCategories(req.params.id);
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Replace categories for an inventory department
  app.put("/api/inventory-departments/:id/categories", requireAuth, async (req, res) => {
    try {
      const { categoryIds } = req.body;
      if (!Array.isArray(categoryIds)) {
        return res.status(400).json({ error: "categoryIds must be an array" });
      }
      
      const invDept = await storage.getInventoryDepartment(req.params.id);
      if (!invDept) {
        return res.status(404).json({ error: "Inventory department not found" });
      }
      
      const assignments = await storage.replaceInventoryDepartmentCategories(
        invDept.clientId,
        req.params.id,
        categoryIds
      );
      res.json(assignments);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get items filtered by inventory department's category assignments
  app.get("/api/inventory-departments/:id/items", requireAuth, async (req, res) => {
    try {
      const items = await storage.getItemsForInventoryDepartment(req.params.id);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Client-scoped: Get items filtered by inventory department's category assignments
  app.get("/api/clients/:clientId/inventory-departments/:inventoryDeptId/items", requireAuth, requireClientAccess(), async (req, res) => {
    try {
      const items = await storage.getItemsForInventoryDepartment(req.params.inventoryDeptId);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== CLIENT-SCOPED STORE STOCK ==============
  // GET is now PURE READ - no auto-seed writes to prevent DB pressure
  app.get("/api/clients/:clientId/store-stock", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { departmentId, date, withCarryOver } = req.query;
      
      if (!departmentId) {
        return res.status(400).json({ error: "departmentId is required" });
      }
      
      const dateFilter = date ? new Date(date as string) : undefined;
      const stock = await storage.getStoreStock(
        clientId,
        departmentId as string,
        dateFilter
      );
      
      // If withCarryOver=true, compute virtual opening balances WITHOUT writing to DB
      // This is a read-only operation that calculates what the opening should be
      if (withCarryOver === "true" && dateFilter) {
        const items = await storage.getItemsForInventoryDepartment(departmentId as string);
        const stockMap = new Map(stock.map(s => [s.itemId, s]));
        const result = [];
        
        for (const item of items) {
          const existingRecord = stockMap.get(item.id);
          
          if (existingRecord) {
            // Return existing record with computed carry-over opening if needed
            const { closing: correctOpening } = await storage.getLatestClosingBeforeDate(
              departmentId as string,
              item.id,
              dateFilter
            );
            
            // Include computed opening in response for UI display
            result.push({
              ...existingRecord,
              computedOpening: correctOpening,
              needsSync: existingRecord.openingQty !== correctOpening,
            });
          } else {
            // Return virtual record (not in DB yet) for display
            const { closing: correctOpening, sourceDate } = await storage.getLatestClosingBeforeDate(
              departmentId as string,
              item.id,
              dateFilter
            );
            
            result.push({
              id: `virtual-${item.id}`,
              clientId,
              storeDepartmentId: departmentId,
              itemId: item.id,
              date: dateFilter,
              openingQty: correctOpening,
              addedQty: "0",
              issuedQty: "0",
              closingQty: correctOpening,
              physicalClosingQty: null,
              varianceQty: "0",
              costPriceSnapshot: item.costPrice || "0.00",
              createdBy: null,
              createdAt: null,
              updatedAt: null,
              computedOpening: correctOpening,
              sourceDate,
              isVirtual: true,
            });
          }
        }
        
        return res.json(result);
      }
      
      res.json(stock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // POST endpoint for auto-seeding (creates records with carry-over)
  // Call this explicitly when user wants to initialize/sync ledger entries
  app.post("/api/clients/:clientId/store-stock/seed", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { departmentId, date } = req.body;
      
      if (!departmentId || !date) {
        return res.status(400).json({ error: "departmentId and date are required" });
      }
      
      const dateFilter = new Date(date);
      const items = await storage.getItemsForInventoryDepartment(departmentId);
      const existingStock = await storage.getStoreStock(clientId, departmentId, dateFilter);
      const existingItemIds = new Set(existingStock.map(s => s.itemId));
      const stockMap = new Map(existingStock.map(s => [s.itemId, s]));
      
      const results = [];
      let created = 0;
      let updated = 0;
      
      for (const item of items) {
        const { closing: correctOpening, sourceDate } = await storage.getLatestClosingBeforeDate(
          departmentId,
          item.id,
          dateFilter
        );
        
        if (!existingItemIds.has(item.id)) {
          // Create new record
          const newStock = await storage.createStoreStock({
            clientId,
            storeDepartmentId: departmentId,
            itemId: item.id,
            date: dateFilter,
            openingQty: correctOpening,
            addedQty: "0",
            issuedQty: "0",
            closingQty: correctOpening,
            physicalClosingQty: null,
            varianceQty: "0",
            costPriceSnapshot: item.costPrice || "0.00",
            createdBy: req.session.userId!,
          });
          results.push(newStock);
          created++;
        } else {
          // Check if existing record needs opening correction
          const existingRecord = stockMap.get(item.id)!;
          const currentOpening = existingRecord.openingQty || "0";
          
          if (currentOpening !== correctOpening) {
            const added = parseFloat(existingRecord.addedQty || "0");
            const issued = parseFloat(existingRecord.issuedQty || "0");
            const newClosing = parseFloat(correctOpening) + added - issued;
            
            const updatedRecord = await storage.updateStoreStock(existingRecord.id, {
              openingQty: correctOpening,
              closingQty: newClosing.toString(),
            });
            
            results.push(updatedRecord || existingRecord);
            updated++;
          } else {
            results.push(existingRecord);
          }
        }
      }
      
      console.log(`[Store Stock Seed] ${departmentId} on ${date}: Created ${created}, Updated ${updated}`);
      res.json({ stock: results, created, updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Bulk store-stock endpoint for fetching multiple SRDs in one call
  app.get("/api/clients/:clientId/store-stock/bulk", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { departmentIds, date } = req.query;
      
      if (!departmentIds) {
        return res.status(400).json({ error: "departmentIds is required" });
      }
      
      const deptIdList = (departmentIds as string).split(",").filter(Boolean);
      if (deptIdList.length === 0) {
        return res.json([]);
      }
      
      const dateFilter = date ? new Date(date as string) : undefined;
      const allStock: any[] = [];
      
      for (const deptId of deptIdList) {
        const stock = await storage.getStoreStock(clientId, deptId, dateFilter);
        allStock.push(...stock);
      }
      
      res.json(allStock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clients/:clientId/store-stock", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const data = insertStoreStockSchema.parse({
        ...req.body,
        clientId,
        createdBy: req.session.userId!,
      });
      
      const stock = await storage.upsertStoreStock(data);
      res.json(stock);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== CLIENT-SCOPED SRD TRANSFERS (Unified Transfer Engine) ==============
  app.get("/api/clients/:clientId/srd-transfers", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { date, srdId } = req.query;
      
      const dateFilter = date ? new Date(date as string) : undefined;
      
      if (srdId) {
        const transfers = await storage.getSrdTransfersBySrd(srdId as string, dateFilter);
        return res.json(transfers);
      }
      
      const transfers = await storage.getSrdTransfers(clientId, dateFilter);
      res.json(transfers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clients/:clientId/srd-transfers", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { fromSrdId, toSrdId, itemId, qty, transferDate, transferType, notes } = req.body;
      
      if (!fromSrdId || !toSrdId || !itemId || !qty || !transferDate) {
        return res.status(400).json({ error: "fromSrdId, toSrdId, itemId, qty, and transferDate are required" });
      }
      
      if (fromSrdId === toSrdId) {
        return res.status(400).json({ error: "Cannot transfer to the same SRD" });
      }
      
      const parsedDate = new Date(transferDate);
      const refId = await storage.generateTransferRefId(clientId, parsedDate);
      const parsedQty = parseFloat(qty);
      
      // Get item details for cost price
      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(400).json({ error: "Item not found" });
      }
      const costPrice = item.costPrice || "0.00";
      
      // Create the transfer record
      const transfer = await storage.createSrdTransfer({
        refId,
        clientId,
        fromSrdId,
        toSrdId,
        itemId,
        qty: parsedQty.toString(),
        transferDate: parsedDate,
        transferType: transferType || "transfer",
        notes: notes || null,
        status: "posted",
        createdBy: req.session.userId!,
      });
      
      console.log(`[SRD Transfer] RefId: ${refId}, From: ${fromSrdId}, To: ${toSrdId}, Item: ${item.name}, Qty: ${parsedQty}, Type: ${transferType || 'transfer'}`);
      
      // Recalculate ledger for BOTH affected SRDs using the design-rule approach
      // The transfer record is already saved above, recalculateForward will pick it up
      // from the srdTransfers table and correctly compute all ledger columns
      try {
        await recalculateForward(clientId, fromSrdId, itemId, parsedDate);
        await recalculateForward(clientId, toSrdId, itemId, parsedDate);
      } catch (err: any) {
        console.error(`[SRD Transfer] Ledger recalc failed:`, err.message);
      }
      
      res.json(transfer);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/srd-transfers/:refId/recall", requireAuth, async (req, res) => {
    try {
      const { refId } = req.params;
      
      // Get all transfers with this refId
      const transfers = await storage.getSrdTransfersByRefId(refId);
      if (transfers.length === 0) {
        return res.status(404).json({ error: "Transfer not found" });
      }
      
      // Verify all are in posted status
      const allPosted = transfers.every(t => t.status === "posted");
      if (!allPosted) {
        return res.status(400).json({ error: "Transfer already recalled" });
      }
      
      // Collect affected SRDs and items for recalculation
      const affectedData = transfers.map(t => ({
        clientId: t.clientId,
        fromSrdId: t.fromSrdId,
        toSrdId: t.toSrdId,
        itemId: t.itemId,
        date: new Date(t.transferDate),
      }));
      
      // Mark transfers as recalled FIRST (so recalculateForward won't include them)
      await storage.recallSrdTransfer(refId);
      
      console.log(`[SRD Transfer Recall] RefId: ${refId}, Count: ${transfers.length}`);
      
      // Recalculate ledger for all affected SRDs - now that transfers are recalled,
      // recalculateForward will compute correct totals without the recalled transfers
      for (const data of affectedData) {
        try {
          await recalculateForward(data.clientId, data.fromSrdId, data.itemId, data.date);
          await recalculateForward(data.clientId, data.toSrdId, data.itemId, data.date);
        } catch (err: any) {
          console.error(`[SRD Transfer Recall] Ledger recalc failed:`, err.message);
        }
      }
      
      res.json({ success: true, message: "Transfer recalled successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== SRD LEDGER BACKFILL API ==============
  
  // Backfill ledger for a specific SRD (supervisors and above)
  app.post("/api/clients/:clientId/srd/:srdId/backfill-ledger", requireAuth, requireSupervisorOrAbove, async (req, res) => {
    try {
      const { clientId, srdId } = req.params;
      const { startDate, endDate, itemId } = req.body;
      
      if (!startDate) {
        return res.status(400).json({ error: "startDate is required" });
      }
      
      const parsedStartDate = new Date(startDate);
      const parsedEndDate = endDate ? new Date(endDate) : new Date();
      
      console.log(`[Ledger Backfill] Manual trigger for SRD ${srdId}, item: ${itemId || 'all'}, range: ${startDate} to ${endDate || 'today'}`);
      
      const result = await backfillSrdLedger({
        clientId,
        srdId,
        itemId,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
      });
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Ledger Backfill",
        entity: "StoreStock",
        entityId: srdId,
        details: `Backfilled ledger: ${result.rowsProcessed} rows (${result.rowsCreated} created, ${result.rowsUpdated} updated)`,
        ipAddress: req.ip || "Unknown",
      });
      
      res.json(result);
    } catch (error: any) {
      console.error("[Ledger Backfill] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Backfill ledger for ALL SRDs of a client (supervisors and above)
  app.post("/api/clients/:clientId/backfill-all-ledgers", requireAuth, requireSupervisorOrAbove, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { startDate, endDate } = req.body;
      
      if (!startDate) {
        return res.status(400).json({ error: "startDate is required" });
      }
      
      const parsedStartDate = new Date(startDate);
      const parsedEndDate = endDate ? new Date(endDate) : new Date();
      
      console.log(`[Ledger Backfill] Full client backfill for client ${clientId}, range: ${startDate} to ${endDate || 'today'}`);
      
      const result = await backfillAllSrdsForClient(clientId, parsedStartDate, parsedEndDate);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Full Client Ledger Backfill",
        entity: "Client",
        entityId: clientId,
        details: `Backfilled ${result.srdCount} SRDs: ${result.totalRows} rows (${result.totalCreated} created, ${result.totalUpdated} updated)`,
        ipAddress: req.ip || "Unknown",
      });
      
      res.json(result);
    } catch (error: any) {
      console.error("[Ledger Backfill] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============== MOVEMENT BREAKDOWNS (Computed summaries for ledger) ==============
  // Returns waste, write-off, returns, adjustments per item for a given SRD and date
  app.get("/api/clients/:clientId/movement-breakdown", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { srdId, date } = req.query;
      
      if (!srdId || !date) {
        return res.status(400).json({ error: "srdId and date are required" });
      }
      
      const targetDate = new Date(date as string);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Get all inventory departments for this client (to map SRD IDs to names)
      const allInvDepts = await storage.getInventoryDepartments(clientId);
      const storeNamesList = await storage.getStoreNamesByClient(clientId);
      const getSrdName = (srdId: string) => {
        const dept = allInvDepts.find((d: any) => d.id === srdId);
        if (!dept) return "Unknown";
        const storeName = storeNamesList.find((s: any) => s.id === dept.storeNameId);
        return storeName?.name || "Unknown";
      };
      
      // Get stock movements affecting this SRD (where fromSrdId matches)
      const movements = await storage.getStockMovementsBySrd(srdId as string);
      const dayMovements = movements.filter(m => {
        const mDate = new Date(m.date);
        return mDate >= startOfDay && mDate <= endOfDay;
      });
      
      // Get SRD transfers affecting this SRD
      const srdTransfers = await storage.getSrdTransfersBySrd(srdId as string, targetDate);
      
      // Build breakdown per item
      // Structure: { [itemId]: { waste, writeOff, adjustmentIn, adjustmentOut, returnIn: {[fromSrdId]: qty}, returnOut: {[toSrdId]: qty}, received: {[fromSrdId]: qty}, issuedTo: {[toSrdId]: qty} } }
      const breakdown: Record<string, {
        waste: number;
        writeOff: number;
        adjustmentIn: number;
        adjustmentOut: number;
        returnIn: Record<string, number>;
        returnOut: Record<string, number>;
        received: Record<string, number>;
        issuedTo: Record<string, number>;
      }> = {};
      
      const initItem = (itemId: string) => {
        if (!breakdown[itemId]) {
          breakdown[itemId] = {
            waste: 0,
            writeOff: 0,
            adjustmentIn: 0,
            adjustmentOut: 0,
            returnIn: {},
            returnOut: {},
            received: {},
            issuedTo: {},
          };
        }
      };
      
      // Process stock movements
      for (const movement of dayMovements) {
        if (movement.movementType === "waste" && movement.fromSrdId === srdId) {
          const lines = await storage.getStockMovementLines(movement.id);
          for (const line of lines) {
            initItem(line.itemId);
            breakdown[line.itemId].waste += parseFloat(line.qty);
          }
        } else if (movement.movementType === "write_off" && movement.fromSrdId === srdId) {
          const lines = await storage.getStockMovementLines(movement.id);
          for (const line of lines) {
            initItem(line.itemId);
            breakdown[line.itemId].writeOff += parseFloat(line.qty);
          }
        } else if (movement.movementType === "adjustment") {
          const lines = await storage.getStockMovementLines(movement.id);
          for (const line of lines) {
            if (movement.fromSrdId === srdId) {
              initItem(line.itemId);
              if (movement.adjustmentDirection === "increase") {
                breakdown[line.itemId].adjustmentIn += parseFloat(line.qty);
              } else {
                breakdown[line.itemId].adjustmentOut += parseFloat(line.qty);
              }
            }
          }
        } else if (movement.movementType === "transfer") {
          const lines = await storage.getStockMovementLines(movement.id);
          for (const line of lines) {
            initItem(line.itemId);
            if (movement.fromSrdId === srdId && movement.toSrdId) {
              // Outgoing transfer
              breakdown[line.itemId].issuedTo[movement.toSrdId] = 
                (breakdown[line.itemId].issuedTo[movement.toSrdId] || 0) + parseFloat(line.qty);
            } else if (movement.toSrdId === srdId && movement.fromSrdId) {
              // Incoming transfer (received)
              breakdown[line.itemId].received[movement.fromSrdId] = 
                (breakdown[line.itemId].received[movement.fromSrdId] || 0) + parseFloat(line.qty);
            }
          }
        }
      }
      
      // Process SRD transfers (new transfer engine)
      for (const transfer of srdTransfers) {
        if (transfer.status === "recalled") continue;
        
        initItem(transfer.itemId);
        const qty = parseFloat(transfer.qty);
        
        if (transfer.transferType === "issue") {
          if (transfer.fromSrdId === srdId) {
            // Issued out from this SRD
            breakdown[transfer.itemId].issuedTo[transfer.toSrdId] = 
              (breakdown[transfer.itemId].issuedTo[transfer.toSrdId] || 0) + qty;
          } else if (transfer.toSrdId === srdId) {
            // Received into this SRD
            breakdown[transfer.itemId].received[transfer.fromSrdId] = 
              (breakdown[transfer.itemId].received[transfer.fromSrdId] || 0) + qty;
          }
        } else if (transfer.transferType === "return") {
          if (transfer.fromSrdId === srdId) {
            // Returned out from this SRD (to Main Store usually)
            breakdown[transfer.itemId].returnOut[transfer.toSrdId] = 
              (breakdown[transfer.itemId].returnOut[transfer.toSrdId] || 0) + qty;
          } else if (transfer.toSrdId === srdId) {
            // Return inward to this SRD (from department)
            breakdown[transfer.itemId].returnIn[transfer.fromSrdId] = 
              (breakdown[transfer.itemId].returnIn[transfer.fromSrdId] || 0) + qty;
          }
        } else if (transfer.transferType === "transfer") {
          if (transfer.fromSrdId === srdId) {
            breakdown[transfer.itemId].issuedTo[transfer.toSrdId] = 
              (breakdown[transfer.itemId].issuedTo[transfer.toSrdId] || 0) + qty;
          } else if (transfer.toSrdId === srdId) {
            breakdown[transfer.itemId].received[transfer.fromSrdId] = 
              (breakdown[transfer.itemId].received[transfer.fromSrdId] || 0) + qty;
          }
        }
      }
      
      // Include SRD name and type mapping
      const srdNames: Record<string, string> = {};
      const srdTypes: Record<string, string> = {};
      allInvDepts.forEach((d: any) => {
        srdNames[d.id] = getSrdName(d.id);
        srdTypes[d.id] = d.inventoryType;
      });
      
      res.json({ breakdown, srdNames, srdTypes });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== CLIENT-SCOPED STORE ISSUES (LEGACY) ==============
  app.get("/api/clients/:clientId/store-issues", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { date } = req.query;
      
      const dateFilter = date ? new Date(date as string) : undefined;
      const issues = await storage.getStoreIssues(clientId, dateFilter);
      res.json(issues);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clients/:clientId/store-issues", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { fromDepartmentId, toDepartmentId, issueDate, notes, lines } = req.body;
      
      if (!fromDepartmentId || !toDepartmentId || !issueDate || !lines || lines.length === 0) {
        return res.status(400).json({ error: "fromDepartmentId, toDepartmentId, issueDate, and lines are required" });
      }
      
      const issue = await storage.createStoreIssue({
        clientId,
        fromDepartmentId,
        toDepartmentId,
        issueDate: new Date(issueDate),
        notes: notes || null,
        status: "posted",
        createdBy: req.session.userId!,
      });
      
      for (const line of lines) {
        await storage.createStoreIssueLine({
          storeIssueId: issue.id,
          itemId: line.itemId,
          qtyIssued: line.qtyIssued.toString(),
        });
        
        const dateForStock = new Date(issueDate);
        
        const fromItem = await storage.getItem(line.itemId);
        const costPrice = fromItem?.costPrice || "0.00";
        
        const qtyIssued = parseFloat(line.qtyIssued);
        
        const existingFromStock = await storage.getStoreStockByItem(fromDepartmentId, line.itemId, dateForStock);
        if (existingFromStock) {
          const currentIssued = parseFloat(existingFromStock.issuedQty || "0");
          const newIssued = currentIssued + qtyIssued;
          const opening = parseFloat(existingFromStock.openingQty || "0");
          const added = parseFloat(existingFromStock.addedQty || "0");
          const newClosing = opening + added - newIssued;
          await storage.updateStoreStock(existingFromStock.id, { 
            issuedQty: newIssued.toString(),
            closingQty: newClosing.toString()
          });
        } else {
          const prevDayClosing = await storage.getPreviousDayClosing(fromDepartmentId, line.itemId, dateForStock);
          const opening = parseFloat(prevDayClosing);
          const newClosing = opening - qtyIssued;
          await storage.createStoreStock({
            clientId,
            storeDepartmentId: fromDepartmentId,
            itemId: line.itemId,
            date: dateForStock,
            openingQty: prevDayClosing,
            addedQty: "0",
            issuedQty: line.qtyIssued.toString(),
            closingQty: newClosing.toString(),
            costPriceSnapshot: costPrice,
            createdBy: req.session.userId!,
          });
        }
        
        const existingToStock = await storage.getStoreStockByItem(toDepartmentId, line.itemId, dateForStock);
        if (existingToStock) {
          const currentAdded = parseFloat(existingToStock.addedQty || "0");
          const newAdded = currentAdded + qtyIssued;
          const opening = parseFloat(existingToStock.openingQty || "0");
          const issued = parseFloat(existingToStock.issuedQty || "0");
          const newClosing = opening + newAdded - issued;
          await storage.updateStoreStock(existingToStock.id, { 
            addedQty: newAdded.toString(),
            closingQty: newClosing.toString()
          });
        } else {
          const prevDayClosingTo = await storage.getPreviousDayClosing(toDepartmentId, line.itemId, dateForStock);
          const opening = parseFloat(prevDayClosingTo);
          const newClosing = opening + qtyIssued;
          await storage.createStoreStock({
            clientId,
            storeDepartmentId: toDepartmentId,
            itemId: line.itemId,
            date: dateForStock,
            openingQty: prevDayClosingTo,
            addedQty: line.qtyIssued.toString(),
            issuedQty: "0",
            closingQty: newClosing.toString(),
            costPriceSnapshot: costPrice,
            createdBy: req.session.userId!,
          });
        }
      }
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Store Issue",
        entity: "StoreIssue",
        entityId: issue.id,
        details: `Issue from ${fromDepartmentId} to ${toDepartmentId}, ${lines.length} item(s)`,
        ipAddress: req.ip || "Unknown",
      });
      
      res.status(201).json(issue);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== SALES ENTRIES ==============
  app.get("/api/sales-entries", requireAuth, requireClientAccess(), async (req, res) => {
    try {
      const { clientId, departmentId, date, startDate, endDate } = req.query;
      
      if (departmentId) {
        // If a specific date is provided, use it as both start and end
        const dateFilter = date ? new Date(date as string) : undefined;
        const start = dateFilter || (startDate ? new Date(startDate as string) : undefined);
        const end = dateFilter || (endDate ? new Date(endDate as string) : undefined);
        
        const sales = await storage.getSalesEntries(
          departmentId as string,
          start,
          end
        );
        return res.json(sales);
      }
      
      if (clientId) {
        const dateFilter = date ? new Date(date as string) : undefined;
        const start = dateFilter || (startDate ? new Date(startDate as string) : undefined);
        const end = dateFilter || (endDate ? new Date(endDate as string) : undefined);
        
        const sales = await storage.getSalesEntriesByClient(
          clientId as string,
          start,
          end
        );
        return res.json(sales);
      }
      
      const sales = await storage.getAllSalesEntries();
      res.json(sales);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Sales summary endpoint - supports clientId+date with optional departmentId filter
  app.get("/api/sales-entries/summary", requireAuth, requireClientAccess(), async (req, res) => {
    try {
      const { clientId, departmentId, date } = req.query;
      
      if (!clientId || !date) {
        return res.json({
          totalCash: 0,
          totalPos: 0,
          totalTransfer: 0,
          totalVoids: 0,
          grandTotal: 0,
          entriesCount: 0,
          departmentsCount: 0,
          avgPerEntry: 0
        });
      }
      
      const dateObj = new Date(date as string);
      
      // Use the new storage method that aggregates across departments
      const summary = await storage.getSalesSummaryForClient(
        clientId as string, 
        dateObj, 
        departmentId as string | undefined
      );
      
      res.json({
        ...summary,
        avgPerEntry: summary.entriesCount > 0 ? Math.round(summary.grandTotal / summary.entriesCount) : 0
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/departments/:departmentId/sales", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const sales = await storage.getSalesEntries(
        req.params.departmentId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(sales);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sales-entries/:id", requireAuth, async (req, res) => {
    try {
      const entry = await storage.getSalesEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Sales entry not found" });
      }
      
      // Verify organization access via client
      const user = await storage.getUser(req.session.userId!);
      if (user?.organizationId && entry.clientId) {
        const client = await storage.getClientWithOrgCheck(entry.clientId, user.organizationId);
        if (!client) {
          return res.status(403).json({ error: "You do not have access to this resource" });
        }
      }
      
      res.json(entry);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sales-entries", requireAuth, async (req, res) => {
    try {
      // Convert date string to Date object if needed
      const bodyWithDate = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined,
        createdBy: req.session.userId!,
      };
      const data = insertSalesEntrySchema.parse(bodyWithDate);
      const entry = await storage.createSalesEntry(data);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Sales Entry",
        entity: "Sales",
        entityId: entry.id,
        details: `Sales entry for ${req.body.shift || 'full'} shift`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/sales", requireAuth, async (req, res) => {
    try {
      // Convert date string to Date object if needed
      const bodyWithDate = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined,
        createdBy: req.session.userId!,
      };
      const data = insertSalesEntrySchema.parse(bodyWithDate);
      const entry = await storage.createSalesEntry(data);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Sales Entry",
        entity: "Sales",
        entityId: entry.id,
        details: `Sales entry for ${req.body.shift || 'full'} shift`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/sales-entries/import", requireAuth, async (req, res) => {
    try {
      res.json({
        success: true,
        message: "POS import functionality is a placeholder. Implement integration with POS system.",
        importedCount: 0,
        status: "stub"
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/sales-entries/:id", requireAuth, async (req, res) => {
    try {
      const entry = await storage.updateSalesEntry(req.params.id, req.body);
      if (!entry) {
        return res.status(404).json({ error: "Sales entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/sales/:id", requireAuth, async (req, res) => {
    try {
      const entry = await storage.updateSalesEntry(req.params.id, req.body);
      if (!entry) {
        return res.status(404).json({ error: "Sales entry not found" });
      }
      res.json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/sales-entries/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      await storage.deleteSalesEntry(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Sales Entry",
        entity: "Sales",
        entityId: req.params.id,
        details: `Sales entry deleted`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== PURCHASES ==============
  app.get("/api/purchases", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.query;
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }
      
      if (clientId) {
        // Verify client belongs to user's organization
        const client = await storage.getClientWithOrgCheck(clientId as string, user.organizationId);
        if (!client) {
          return res.status(403).json({ error: "You do not have access to this client" });
        }
        const purchases = await storage.getPurchases(clientId as string);
        return res.json(purchases);
      }
      
      // Get all purchases for user's organization
      const purchases = await storage.getPurchasesByOrganization(user.organizationId);
      res.json(purchases);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/purchases/:id", requireAuth, async (req, res) => {
    try {
      const purchase = await storage.getPurchase(req.params.id);
      if (!purchase) {
        return res.status(404).json({ error: "Purchase not found" });
      }
      
      // Verify organization access via client
      const user = await storage.getUser(req.session.userId!);
      if (user?.organizationId && purchase.clientId) {
        const client = await storage.getClientWithOrgCheck(purchase.clientId, user.organizationId);
        if (!client) {
          return res.status(403).json({ error: "You do not have access to this resource" });
        }
      }
      
      res.json(purchase);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/purchases/:id/lines", requireAuth, async (req, res) => {
    try {
      // First verify purchase access
      const purchase = await storage.getPurchase(req.params.id);
      if (!purchase) {
        return res.status(404).json({ error: "Purchase not found" });
      }
      
      const user = await storage.getUser(req.session.userId!);
      if (user?.organizationId && purchase.clientId) {
        const client = await storage.getClientWithOrgCheck(purchase.clientId, user.organizationId);
        if (!client) {
          return res.status(403).json({ error: "You do not have access to this resource" });
        }
      }
      
      const lines = await storage.getPurchaseLines(req.params.id);
      res.json(lines);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/purchases", requireAuth, async (req, res) => {
    try {
      const { lines, ...purchaseData } = req.body;
      
      const data = insertPurchaseSchema.parse({
        ...purchaseData,
        invoiceDate: purchaseData.invoiceDate ? new Date(purchaseData.invoiceDate) : undefined,
        createdBy: req.session.userId!,
      });
      const purchase = await storage.createPurchase(data);

      if (lines && Array.isArray(lines)) {
        for (const line of lines) {
          const lineData = insertPurchaseLineSchema.parse({
            ...line,
            purchaseId: purchase.id,
          });
          await storage.createPurchaseLine(lineData);
        }
      }
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Purchase",
        entity: "Purchase",
        entityId: purchase.id,
        details: `Purchase invoice: ${purchase.invoiceRef}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(purchase);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/purchases/:id", requireAuth, async (req, res) => {
    try {
      const purchase = await storage.updatePurchase(req.params.id, req.body);
      if (!purchase) {
        return res.status(404).json({ error: "Purchase not found" });
      }
      res.json(purchase);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/purchases/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      await storage.deletePurchase(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Purchase",
        entity: "Purchase",
        entityId: req.params.id,
        details: `Purchase deleted`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== STOCK MOVEMENTS ==============
  app.get("/api/stock-movements", requireAuth, requireClientAccess(), async (req, res) => {
    try {
      const { clientId, departmentId } = req.query;
      
      if (departmentId) {
        const movements = await storage.getStockMovementsByDepartment(departmentId as string);
        return res.json(movements);
      }
      
      if (clientId) {
        const movements = await storage.getStockMovements(clientId as string);
        return res.json(movements);
      }
      
      res.json([]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/outlets/:outletId/movements", requireAuth, async (req, res) => {
    try {
      const movements = await storage.getStockMovements(req.params.outletId);
      res.json(movements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stock-movements", requireAuth, async (req, res) => {
    try {
      const data = insertStockMovementSchema.parse({
        ...req.body,
        createdBy: req.session.userId!,
      });
      const movement = await storage.createStockMovement(data);
      res.json(movement);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/movements", requireAuth, async (req, res) => {
    try {
      const data = insertStockMovementSchema.parse({
        ...req.body,
        createdBy: req.session.userId!,
      });
      const movement = await storage.createStockMovement(data);
      res.json(movement);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/stock-movements/:id", requireAuth, async (req, res) => {
    try {
      const movement = await storage.getStockMovement(req.params.id);
      if (!movement) {
        return res.status(404).json({ error: "Stock movement not found" });
      }
      
      // Verify organization access via client
      const user = await storage.getUser(req.session.userId!);
      if (user?.organizationId && movement.clientId) {
        const client = await storage.getClientWithOrgCheck(movement.clientId, user.organizationId);
        if (!client) {
          return res.status(403).json({ error: "You do not have access to this resource" });
        }
      }
      
      res.json(movement);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/stock-movements/:id", requireAuth, async (req, res) => {
    try {
      const movement = await storage.updateStockMovement(req.params.id, req.body);
      if (!movement) {
        return res.status(404).json({ error: "Stock movement not found" });
      }
      res.json(movement);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/stock-movements/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      await storage.deleteStockMovement(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Stock Movement",
        entity: "StockMovement",
        entityId: req.params.id,
        details: `Stock movement deleted`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get stock movement with lines
  app.get("/api/stock-movements/:id/with-lines", requireAuth, async (req, res) => {
    try {
      const result = await storage.getStockMovementWithLines(req.params.id);
      if (!result) {
        return res.status(404).json({ error: "Stock movement not found" });
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get stock movements by SRD (inventory department)
  app.get("/api/inventory-departments/:srdId/movements", requireAuth, async (req, res) => {
    try {
      const movements = await storage.getStockMovementsBySrd(req.params.srdId);
      res.json(movements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create stock movement with lines (transactional)
  app.post("/api/stock-movements/with-lines", requireAuth, async (req, res) => {
    try {
      const { movement: movementData, lines } = req.body;
      
      if (!movementData || !lines || !Array.isArray(lines)) {
        return res.status(400).json({ error: "Movement and lines array are required" });
      }
      
      if (lines.length === 0) {
        return res.status(400).json({ error: "At least one item line is required" });
      }
      
      const movementType = movementData.movementType;
      if (!STOCK_MOVEMENT_TYPES.includes(movementType)) {
        return res.status(400).json({ error: `Invalid movement type: ${movementType}` });
      }
      
      // Validate movement type requirements
      if (movementType === "transfer") {
        if (!movementData.fromSrdId || !movementData.toSrdId) {
          return res.status(400).json({ error: "Transfer requires both From and To SRD" });
        }
        if (movementData.fromSrdId === movementData.toSrdId) {
          return res.status(400).json({ error: "From and To SRD must be different" });
        }
      } else if (movementType === "adjustment") {
        if (!movementData.adjustmentDirection || !["increase", "decrease"].includes(movementData.adjustmentDirection)) {
          return res.status(400).json({ error: "Adjustment requires a direction (increase or decrease)" });
        }
        if (!movementData.fromSrdId) {
          return res.status(400).json({ error: "Adjustment requires a target SRD" });
        }
      } else if (movementType === "write_off" || movementType === "waste") {
        if (!movementData.fromSrdId) {
          return res.status(400).json({ error: `${movementType.replace("_", "-")} requires a From SRD` });
        }
      }
      
      // Calculate total quantity
      let totalQty = 0;
      for (const line of lines) {
        if (!line.itemId || !line.qty || line.qty <= 0) {
          return res.status(400).json({ error: "Each line must have an item and positive quantity" });
        }
        totalQty += Number(line.qty);
      }
      
      // Check for duplicate items
      const itemIds = lines.map((l: any) => l.itemId);
      if (new Set(itemIds).size !== itemIds.length) {
        return res.status(400).json({ error: "Duplicate items not allowed in a single movement" });
      }
      
      // Validate that all items are in allowed categories for the From SRD
      const fromSrdIdForValidation = movementData.fromSrdId;
      if (fromSrdIdForValidation) {
        const allowedItems = await storage.getItemsForInventoryDepartment(fromSrdIdForValidation);
        const allowedItemIds = new Set(allowedItems.map((item: any) => item.id));
        for (const line of lines) {
          if (!allowedItemIds.has(line.itemId)) {
            const item = await storage.getItem(line.itemId);
            return res.status(400).json({ 
              error: `Item "${item?.name || line.itemId}" is not in the allowed categories for this SRD` 
            });
          }
        }
      }
      
      const movementDate = movementData.date ? new Date(movementData.date) : new Date();
      
      // For movements that decrease stock, validate available quantities
      if (movementType === "transfer" || movementType === "write_off" || movementType === "waste" ||
          (movementType === "adjustment" && movementData.adjustmentDirection === "decrease")) {
        const fromSrdId = movementData.fromSrdId;
        for (const line of lines) {
          const stockRecord = await storage.getStoreStockByItem(fromSrdId, line.itemId, movementDate);
          let availableQty: number;
          if (stockRecord) {
            availableQty = parseFloat(stockRecord.closingQty || "0");
          } else {
            // No record for today - check previous day's closing
            const prevClosing = await storage.getPreviousDayClosing(fromSrdId, line.itemId, movementDate);
            availableQty = parseFloat(prevClosing);
          }
          if (Number(line.qty) > availableQty) {
            const item = await storage.getItem(line.itemId);
            return res.status(400).json({ 
              error: `Insufficient stock for ${item?.name || "item"}: available ${availableQty}, requested ${line.qty}` 
            });
          }
        }
      }

      // Parse and validate the main movement data
      const parsedMovement = insertStockMovementSchema.parse({
        ...movementData,
        createdBy: req.session.userId!,
        totalQty: String(totalQty),
        date: movementDate,
      });
      
      // Create the movement
      const movement = await storage.createStockMovement(parsedMovement);
      
      // Build itemsDescription and totalValue from lines
      const itemDescParts: string[] = [];
      let calculatedTotalValue = 0;
      
      for (const line of lines) {
        const item = await storage.getItem(line.itemId);
        const itemName = item?.name || "Unknown";
        const qty = Number(line.qty);
        const unitCost = Number(line.unitCost || item?.costPrice || 0);
        
        itemDescParts.push(`${itemName} (${qty})`);
        calculatedTotalValue += qty * unitCost;
        
        // Update line with correct unitCost if not provided
        if (!line.unitCost && item?.costPrice) {
          line.unitCost = Number(item.costPrice);
        }
      }
      
      const itemsDescription = itemDescParts.join(", ");
      
      // Create the lines
      const lineInserts = lines.map((line: any) => ({
        movementId: movement.id,
        itemId: line.itemId,
        qty: String(line.qty),
        unitCost: String(line.unitCost || 0),
        lineValue: String(Number(line.qty) * Number(line.unitCost || 0)),
      }));
      
      const createdLines = await storage.createStockMovementLinesBulk(lineInserts);
      
      // Update movement with itemsDescription and totalValue
      await storage.updateStockMovement(movement.id, {
        itemsDescription,
        totalValue: String(calculatedTotalValue),
      });
      
      // Recalculate ledger for affected SRDs using the design-rule approach:
      // Movement records are already saved above, now trigger forward recalculation
      // which recomputes ledger rows from source data (movements, transfers, purchases)
      const clientId = movementData.clientId;
      const affectedSrds = new Set<string>();
      const affectedItems = new Set<string>();
      
      if (movementData.fromSrdId) affectedSrds.add(movementData.fromSrdId);
      if (movementData.toSrdId) affectedSrds.add(movementData.toSrdId);
      for (const line of lines) {
        affectedItems.add(line.itemId);
      }
      
      // Trigger forward recalculation for each SRD and item combination
      // This ensures opening(D) = closing(D-1) and all movements are properly reflected
      for (const srdId of Array.from(affectedSrds)) {
        for (const itemId of Array.from(affectedItems)) {
          try {
            await recalculateForward(clientId, srdId, itemId, movementDate);
          } catch (err: any) {
            console.error(`[Stock Movement] Ledger recalc failed for SRD ${srdId}, item ${itemId}:`, err.message);
          }
        }
      }
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: `Created Stock Movement`,
        entity: "StockMovement",
        entityId: movement.id,
        details: `Created ${movementType} movement with ${lines.length} items, total qty: ${totalQty}`,
        ipAddress: req.ip || "Unknown",
      });
      
      // Return the updated movement with description and value
      const updatedMovement = await storage.getStockMovement(movement.id);
      res.json({ movement: updatedMovement, lines: createdLines });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Reverse a stock movement (creates a compensating movement)
  app.post("/api/stock-movements/:id/reverse", requireSupervisorOrAbove, async (req, res) => {
    try {
      const movementId = req.params.id;
      const { reason } = req.body;
      
      if (!reason?.trim()) {
        return res.status(400).json({ error: "Reversal reason is required" });
      }
      
      // Get the original movement with lines
      const original = await storage.getStockMovementWithLines(movementId);
      if (!original) {
        return res.status(404).json({ error: "Stock movement not found" });
      }
      
      const { movement: origMovement, lines: origLines } = original;
      
      // Determine reversal logic based on movement type
      let reversedMovementType = origMovement.movementType;
      let reversedDirection = null;
      let reversedFromSrdId = origMovement.fromSrdId;
      let reversedToSrdId = origMovement.toSrdId;
      let reversedSourceLocation = origMovement.sourceLocation;
      let reversedDestLocation = origMovement.destinationLocation;
      
      if (origMovement.movementType === "transfer") {
        // Swap from/to for reversal
        reversedFromSrdId = origMovement.toSrdId;
        reversedToSrdId = origMovement.fromSrdId;
        reversedSourceLocation = origMovement.destinationLocation;
        reversedDestLocation = origMovement.sourceLocation;
      } else if (origMovement.movementType === "adjustment") {
        // Flip the direction
        reversedDirection = origMovement.adjustmentDirection === "increase" ? "decrease" : "increase";
      } else if (origMovement.movementType === "write_off" || origMovement.movementType === "waste") {
        // Convert to adjustment increase to restore stock
        reversedMovementType = "adjustment";
        reversedDirection = "increase";
        reversedToSrdId = null;
      }
      
      const now = new Date();
      const reversalNotes = `REVERSAL of movement ${movementId.slice(0, 8)}... Reason: ${reason}`;
      
      // Create the reversal movement
      const reversalMovement = await storage.createStockMovement({
        clientId: origMovement.clientId,
        departmentId: origMovement.departmentId,
        outletId: origMovement.outletId,
        movementType: reversedMovementType,
        fromSrdId: reversedFromSrdId,
        toSrdId: reversedToSrdId,
        date: now,
        adjustmentDirection: reversedDirection,
        sourceLocation: reversedSourceLocation,
        destinationLocation: reversedDestLocation,
        itemsDescription: `[REVERSAL] ${origMovement.itemsDescription || ""}`,
        totalQty: origMovement.totalQty,
        totalValue: origMovement.totalValue,
        notes: reversalNotes,
        authorizedBy: origMovement.authorizedBy,
        createdBy: req.session.userId!,
      });
      
      // Create reversal lines
      const reversalLines = origLines.map((line: any) => ({
        movementId: reversalMovement.id,
        itemId: line.itemId,
        qty: line.qty,
        unitCost: line.unitCost,
        lineValue: line.lineValue,
      }));
      
      await storage.createStockMovementLinesBulk(reversalLines);
      
      // Recalculate ledger for affected SRDs - the reversal movement is already saved above
      // so recalculateForward will pick it up from the stockMovements table
      const clientId = origMovement.clientId;
      const affectedSrds = new Set<string>();
      const affectedItems = new Set<string>();
      
      if (origMovement.fromSrdId) affectedSrds.add(origMovement.fromSrdId);
      if (origMovement.toSrdId) affectedSrds.add(origMovement.toSrdId);
      for (const line of origLines) {
        affectedItems.add(line.itemId);
      }
      
      for (const srdId of Array.from(affectedSrds)) {
        for (const itemId of Array.from(affectedItems)) {
          try {
            await recalculateForward(clientId, srdId, itemId, now);
          } catch (err: any) {
            console.error(`[Stock Movement Reversal] Ledger recalc failed for SRD ${srdId}, item ${itemId}:`, err.message);
          }
        }
      }
      
      // Mark the original as reversed
      await storage.updateStockMovement(movementId, {
        notes: `${origMovement.notes || ""}\n[REVERSED on ${now.toISOString()} - Reversal ID: ${reversalMovement.id.slice(0, 8)}]`,
      });
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: `Reversed Stock Movement`,
        entity: "StockMovement",
        entityId: movementId,
        details: `Reversed ${origMovement.movementType} movement. Reversal ID: ${reversalMovement.id}. Reason: ${reason}`,
        ipAddress: req.ip || "Unknown",
      });
      
      res.json({ 
        success: true, 
        reversalMovement,
        message: `Movement reversed successfully. Reversal ID: ${reversalMovement.id.slice(0, 8)}` 
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== RECONCILIATIONS ==============
  app.get("/api/reconciliations", requireAuth, requireClientAccess(), async (req, res) => {
    try {
      const { departmentId, date, clientId } = req.query;
      const user = await storage.getUser(req.session.userId!);
      
      if (departmentId) {
        const reconciliations = await storage.getReconciliations(
          departmentId as string,
          date ? new Date(date as string) : undefined
        );
        return res.json(reconciliations);
      }
      
      // If clientId provided, filter by client (already validated by middleware)
      if (clientId) {
        const reconciliations = await storage.getReconciliationsByClient(clientId as string);
        return res.json(reconciliations);
      }
      
      // Only return reconciliations for user's organization
      if (user?.organizationId) {
        const reconciliations = await storage.getReconciliationsByOrganization(user.organizationId);
        return res.json(reconciliations);
      }
      
      res.json([]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/departments/:departmentId/reconciliations", requireAuth, async (req, res) => {
    try {
      const { date } = req.query;
      const reconciliations = await storage.getReconciliations(
        req.params.departmentId,
        date ? new Date(date as string) : undefined
      );
      res.json(reconciliations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reconciliations/:id", requireAuth, async (req, res) => {
    try {
      const reconciliation = await storage.getReconciliation(req.params.id);
      if (!reconciliation) {
        return res.status(404).json({ error: "Reconciliation not found" });
      }
      
      // Verify organization access via client
      const user = await storage.getUser(req.session.userId!);
      if (user?.organizationId && reconciliation.clientId) {
        const client = await storage.getClientWithOrgCheck(reconciliation.clientId, user.organizationId);
        if (!client) {
          return res.status(403).json({ error: "You do not have access to this resource" });
        }
      }
      
      res.json(reconciliation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/reconciliations", requireAuth, async (req, res) => {
    try {
      const data = insertReconciliationSchema.parse({
        ...req.body,
        createdBy: req.session.userId!,
      });
      const reconciliation = await storage.createReconciliation(data);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Reconciliation",
        entity: "Reconciliation",
        entityId: reconciliation.id,
        details: `Reconciliation created for department`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(reconciliation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/reconciliations/compute", requireAuth, async (req, res) => {
    try {
      const { departmentId, date, openingStock, additions, physicalCount } = req.body;

      if (!departmentId || !date) {
        return res.status(400).json({ error: "Missing departmentId or date" });
      }

      // If detailed data provided, compute with it
      if (openingStock && additions && physicalCount) {
        const openingQty = parseFloat(openingStock.quantity || openingStock.totalQty || 0);
        const additionsQty = parseFloat(additions.quantity || additions.totalQty || 0);
        const physicalQty = parseFloat(physicalCount.quantity || physicalCount.totalQty || 0);

        const expectedClosing = openingQty + additionsQty;
        const varianceQty = physicalQty - expectedClosing;
        const unitValue = parseFloat(openingStock.unitValue || 10);
        const varianceValue = varianceQty * unitValue;

        return res.json({
          departmentId,
          date,
          openingStock,
          additions,
          expectedUsage: { quantity: 0 },
          physicalCount,
          expectedClosingQty: expectedClosing.toFixed(2),
          actualClosingQty: physicalQty.toFixed(2),
          varianceQty: varianceQty.toFixed(2),
          varianceValue: varianceValue.toFixed(2),
          status: varianceQty === 0 ? "balanced" : (Math.abs(varianceQty) > 10 ? "significant_variance" : "minor_variance")
        });
      }

      // Otherwise, create a simple reconciliation record from aggregated data
      const salesSummary = await storage.getSalesSummaryForDepartment(departmentId, new Date(date));
      const purchases = await storage.getPurchasesByDepartment(departmentId);
      const stockCounts = await storage.getStockCounts(departmentId, new Date(date));
      
      const purchasesTotal = purchases.reduce((sum, p) => sum + parseFloat(p.totalAmount || "0"), 0);
      const varianceQty = stockCounts.reduce((sum, c) => sum + parseFloat(c.varianceQty || "0"), 0);
      
      // Get department to find clientId
      const department = await storage.getDepartment(departmentId);
      if (!department) {
        return res.status(404).json({ error: "Department not found" });
      }
      
      const reconciliation = await storage.createReconciliation({
        clientId: department.clientId,
        departmentId,
        date: new Date(date),
        openingStock: { quantity: 0, value: 0 },
        additions: { quantity: purchasesTotal, value: purchasesTotal },
        expectedUsage: { quantity: salesSummary.totalSales, value: salesSummary.totalSales },
        physicalCount: { quantity: 0, value: 0 },
        varianceQty: String(varianceQty),
        varianceValue: String(varianceQty * 10),
        status: "submitted",
        createdBy: req.session.userId!,
      });

      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Submitted Reconciliation",
        entity: "Reconciliation",
        entityId: reconciliation.id,
        details: `Audit submitted for department ${departmentId}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(reconciliation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/reconciliations/:id", requireAuth, async (req, res) => {
    try {
      const reconciliation = await storage.updateReconciliation(req.params.id, req.body);
      if (!reconciliation) {
        return res.status(404).json({ error: "Reconciliation not found" });
      }
      res.json(reconciliation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/reconciliations/:id/approve", requireSupervisorOrAbove, async (req, res) => {
    try {
      const reconciliation = await storage.updateReconciliation(req.params.id, {
        status: "approved",
        approvedBy: req.session.userId!,
        approvedAt: new Date(),
      });
      
      if (!reconciliation) {
        return res.status(404).json({ error: "Reconciliation not found" });
      }

      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Approved Reconciliation",
        entity: "Reconciliation",
        entityId: req.params.id,
        details: `Reconciliation approved`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(reconciliation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/reconciliations/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      await storage.deleteReconciliation(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Reconciliation",
        entity: "Reconciliation",
        entityId: req.params.id,
        details: `Reconciliation deleted`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== EXCEPTIONS ==============
  app.get("/api/exceptions", requireAuth, requireClientAccess(), async (req, res) => {
    try {
      const { clientId, departmentId, status, severity, includeDeleted } = req.query;
      const user = await storage.getUser(req.session.userId!);
      
      const exceptions = await storage.getExceptions({
        clientId: clientId as string | undefined,
        departmentId: departmentId as string | undefined,
        status: status as string | undefined,
        severity: severity as string | undefined,
        includeDeleted: includeDeleted === "true",
        organizationId: user?.organizationId || undefined,
      });
      res.json(exceptions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/exceptions/:id", requireAuth, async (req, res) => {
    try {
      const exception = await storage.getException(req.params.id);
      if (!exception) {
        return res.status(404).json({ error: "Exception not found" });
      }
      
      // Verify organization access via client
      const user = await storage.getUser(req.session.userId!);
      if (user?.organizationId && exception.clientId) {
        const client = await storage.getClientWithOrgCheck(exception.clientId, user.organizationId);
        if (!client) {
          return res.status(403).json({ error: "You do not have access to this resource" });
        }
      }
      
      res.json(exception);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get exception with activity feed
  app.get("/api/exceptions/:id/details", requireAuth, async (req, res) => {
    try {
      const result = await storage.getExceptionWithActivity(req.params.id);
      if (!result) {
        return res.status(404).json({ error: "Exception not found" });
      }
      
      // Verify organization access via client
      const user = await storage.getUser(req.session.userId!);
      if (user?.organizationId && result.exception.clientId) {
        const client = await storage.getClientWithOrgCheck(result.exception.clientId, user.organizationId);
        if (!client) {
          return res.status(403).json({ error: "You do not have access to this resource" });
        }
      }
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/exceptions", requireAuth, async (req, res) => {
    try {
      const data = insertExceptionSchema.parse({
        ...req.body,
        createdBy: req.session.userId!,
      });
      const exception = await storage.createException(data);
      
      // Create initial activity entry
      await storage.createExceptionActivity({
        exceptionId: exception.id,
        activityType: "system",
        message: `Exception created with status "${exception.status}" and severity "${exception.severity}"`,
        createdBy: req.session.userId!,
      });
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Exception",
        entity: exception.caseNumber,
        entityId: exception.id,
        details: exception.summary,
        ipAddress: req.ip || "Unknown",
      });

      res.json(exception);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/exceptions/:id", requireAuth, async (req, res) => {
    try {
      const existingException = await storage.getException(req.params.id);
      if (!existingException) {
        return res.status(404).json({ error: "Exception not found" });
      }
      
      const updateData = { ...req.body };
      
      if (req.body.status === "resolved" && !req.body.resolvedAt) {
        updateData.resolvedAt = new Date();
      }
      
      const exception = await storage.updateException(req.params.id, updateData);
      if (!exception) {
        return res.status(404).json({ error: "Exception not found" });
      }
      
      // Create activity entries for status/outcome changes
      if (req.body.status && req.body.status !== existingException.status) {
        await storage.createExceptionActivity({
          exceptionId: exception.id,
          activityType: "status_change",
          message: `Status changed from "${existingException.status}" to "${req.body.status}"`,
          previousValue: existingException.status || undefined,
          newValue: req.body.status,
          createdBy: req.session.userId!,
        });
      }
      
      if (req.body.outcome && req.body.outcome !== existingException.outcome) {
        await storage.createExceptionActivity({
          exceptionId: exception.id,
          activityType: "outcome_change",
          message: `Outcome set to "${req.body.outcome.toUpperCase()}"`,
          previousValue: existingException.outcome || undefined,
          newValue: req.body.outcome,
          createdBy: req.session.userId!,
        });
      }
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Updated Exception",
        entity: exception.caseNumber,
        entityId: exception.id,
        details: `Exception status: ${exception.status}, outcome: ${exception.outcome}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(exception);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Soft delete with reason required
  app.delete("/api/exceptions/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      const { reason } = req.body;
      if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
        return res.status(400).json({ error: "Delete reason is required" });
      }
      
      const exception = await storage.getException(req.params.id);
      if (!exception) {
        return res.status(404).json({ error: "Exception not found" });
      }
      
      const deletedException = await storage.softDeleteException(
        req.params.id, 
        req.session.userId!, 
        reason.trim()
      );
      
      // Create activity entry for deletion
      await storage.createExceptionActivity({
        exceptionId: exception.id,
        activityType: "system",
        message: `Exception deleted. Reason: ${reason.trim()}`,
        createdBy: req.session.userId!,
      });
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Exception",
        entity: exception.caseNumber,
        entityId: req.params.id,
        details: `Exception soft deleted. Reason: ${reason.trim()}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true, exception: deletedException });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== EXCEPTION ACTIVITY ==============
  app.get("/api/exceptions/:exceptionId/activity", requireAuth, async (req, res) => {
    try {
      const activity = await storage.getExceptionActivity(req.params.exceptionId);
      res.json(activity);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/exceptions/:exceptionId/feedback", requireAuth, async (req, res) => {
    try {
      const data = insertExceptionActivitySchema.parse({
        exceptionId: req.params.exceptionId,
        activityType: "note",
        message: req.body.message,
        createdBy: req.session.userId!,
      });
      const activity = await storage.createExceptionActivity(data);
      
      // Update the exception's updatedAt timestamp
      await storage.updateException(req.params.exceptionId, {});
      
      res.json(activity);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== EXCEPTION COMMENTS ==============
  app.get("/api/exceptions/:exceptionId/comments", requireAuth, async (req, res) => {
    try {
      const comments = await storage.getExceptionComments(req.params.exceptionId);
      res.json(comments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/exceptions/:exceptionId/comments", requireAuth, async (req, res) => {
    try {
      const data = insertExceptionCommentSchema.parse({
        exceptionId: req.params.exceptionId,
        comment: req.body.comment,
        createdBy: req.session.userId!,
      });
      const comment = await storage.createExceptionComment(data);
      res.json(comment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== GOODS RECEIVED NOTES (GRN) ==============
  const grnUploadsDir = path.join(process.cwd(), "uploads", "grn");
  if (!fs.existsSync(grnUploadsDir)) {
    fs.mkdirSync(grnUploadsDir, { recursive: true });
  }

  const grnUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, grnUploadsDir),
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + "-" + file.originalname);
      }
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf"];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and PDF are allowed."));
      }
    }
  });

  app.get("/api/grn", requireAuth, async (req, res) => {
    try {
      const { clientId, date } = req.query;
      if (!clientId) {
        return res.status(400).json({ error: "clientId is required" });
      }
      const grns = await storage.getGoodsReceivedNotes(
        clientId as string, 
        date ? new Date(date as string) : undefined
      );
      res.json(grns);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/grn/daily-total", requireAuth, async (req, res) => {
    try {
      const { clientId, date } = req.query;
      if (!clientId || !date) {
        return res.status(400).json({ error: "clientId and date are required" });
      }
      const total = await storage.getDailyGRNTotal(clientId as string, new Date(date as string));
      res.json({ total });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/grn/:id", requireAuth, async (req, res) => {
    try {
      const grn = await storage.getGoodsReceivedNote(req.params.id);
      if (!grn) {
        return res.status(404).json({ error: "GRN not found" });
      }
      res.json(grn);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/grn", requireAuth, grnUpload.single("evidence"), async (req, res) => {
    try {
      const file = req.file;
      const data = insertGoodsReceivedNoteSchema.parse({
        clientId: req.body.clientId,
        supplierId: req.body.supplierId || null,
        supplierName: req.body.supplierName,
        date: new Date(req.body.date),
        invoiceRef: req.body.invoiceRef,
        amount: req.body.amount,
        status: req.body.status || "pending",
        evidenceUrl: file ? `/uploads/grn/${file.filename}` : null,
        evidenceFileName: file ? file.originalname : null,
        createdBy: req.session.userId!,
      });

      const grn = await storage.createGoodsReceivedNote(data);

      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created GRN",
        entity: "GoodsReceivedNote",
        entityId: grn.id,
        details: `Invoice: ${grn.invoiceRef}, Amount: ${grn.amount}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(grn);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/grn/:id", requireAuth, grnUpload.single("evidence"), async (req, res) => {
    try {
      const existing = await storage.getGoodsReceivedNote(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "GRN not found" });
      }

      const file = req.file;
      const updateData: any = {
        supplierId: req.body.supplierId || null,
        supplierName: req.body.supplierName,
        date: new Date(req.body.date),
        invoiceRef: req.body.invoiceRef,
        amount: req.body.amount,
        status: req.body.status,
      };

      if (file) {
        updateData.evidenceUrl = `/uploads/grn/${file.filename}`;
        updateData.evidenceFileName = file.originalname;
        if (existing.evidenceUrl) {
          const oldPath = path.join(process.cwd(), existing.evidenceUrl);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
      }

      const grn = await storage.updateGoodsReceivedNote(req.params.id, updateData);

      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Updated GRN",
        entity: "GoodsReceivedNote",
        entityId: req.params.id,
        details: `Invoice: ${grn?.invoiceRef}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(grn);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/grn/:id", requireSupervisorOrAbove, async (req, res) => {
    try {
      const grn = await storage.getGoodsReceivedNote(req.params.id);
      if (!grn) {
        return res.status(404).json({ error: "GRN not found" });
      }

      if (grn.evidenceUrl) {
        const filePath = path.join(process.cwd(), grn.evidenceUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await storage.deleteGoodsReceivedNote(req.params.id);

      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted GRN",
        entity: "GoodsReceivedNote",
        entityId: req.params.id,
        details: `Invoice: ${grn.invoiceRef}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  const express = await import("express");
  app.use("/uploads", (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  }, express.default.static(path.join(process.cwd(), "uploads")));

  // ============== REPORTS ==============
  app.get("/api/reports/generate", requireAuth, async (req, res) => {
    try {
      const { type, startDate, endDate, reportType } = req.query;

      if (!type || !["pdf", "excel"].includes(type as string)) {
        return res.status(400).json({ error: "type query parameter is required (pdf or excel)" });
      }

      const report = {
        id: `RPT-${Date.now()}`,
        type: type,
        format: type === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        generatedAt: new Date().toISOString(),
        parameters: {
          startDate: startDate || null,
          endDate: endDate || null,
          reportType: reportType || "summary",
        },
        status: "stub",
        message: "Report generation is a placeholder. Implement PDF/Excel generation library.",
        downloadUrl: null
      };

      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Generated Report",
        entity: "Report",
        entityId: report.id,
        details: `Report type: ${type}, Report: ${reportType || 'summary'}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============== DATA EXPORT ==============
  app.get("/api/export", requireSuperAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.organizationId) {
        return res.status(400).json({ error: "Your account is not associated with an organization" });
      }
      
      const { format = "xlsx", startDate, endDate } = req.query;
      
      // Calculate date range (default to last 30 days)
      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Fetch all data scoped to organization
      const clients = await storage.getClients(user.organizationId);
      const clientIds = clients.map((c: any) => c.id);
      
      // Collect all data for each client
      const allCategories: any[] = [];
      const allDepartments: any[] = [];
      const allItems: any[] = [];
      const allSuppliers: any[] = [];
      const allGRNs: any[] = [];
      const allStoreNames: any[] = [];
      const allExceptions: any[] = [];
      const allReceivables: any[] = [];
      const allSurplus: any[] = [];
      
      for (const clientId of clientIds) {
        try {
          const clientName = clients.find((cl: any) => cl.id === clientId)?.name;
          
          const categories = await storage.getCategories(clientId);
          allCategories.push(...categories.map((c: any) => ({ ...c, clientName })));
          
          const departments = await storage.getDepartments(clientId);
          allDepartments.push(...departments.map((d: any) => ({ ...d, clientName })));
          
          const items = await storage.getItems(clientId);
          allItems.push(...items.map((i: any) => ({ ...i, clientName })));
          
          const suppliers = await storage.getSuppliers(clientId);
          allSuppliers.push(...suppliers.map((s: any) => ({ ...s, clientName })));
          
          const grns = await storage.getGoodsReceivedNotes(clientId);
          const filteredGRNs = grns.filter((g: any) => new Date(g.createdAt) >= start && new Date(g.createdAt) <= end);
          allGRNs.push(...filteredGRNs.map((g: any) => ({ ...g, clientName })));
          
          const storeNames = await storage.getStoreNamesByClient(clientId);
          allStoreNames.push(...storeNames.map((s: any) => ({ ...s, clientName })));
          
          const exceptions = await storage.getExceptions({ clientId });
          const filteredExceptions = exceptions.filter((e: any) => new Date(e.createdAt) >= start && new Date(e.createdAt) <= end);
          allExceptions.push(...filteredExceptions.map((e: any) => ({ ...e, clientName })));
          
          const receivables = await storage.getReceivables(clientId);
          allReceivables.push(...receivables.map((r: any) => ({ ...r, clientName })));
          
          const surplus = await storage.getSurpluses(clientId);
          allSurplus.push(...surplus.map((s: any) => ({ ...s, clientName })));
        } catch (e) {
          // Continue with next client if one fails
          console.error(`Export error for client ${clientId}:`, e);
        }
      }
      
      // Create workbook with all sheets
      const workbook = XLSX.utils.book_new();
      
      // Helper to convert data to sheet with flattened objects
      const addSheet = (data: any[], sheetName: string) => {
        if (data.length === 0) {
          const emptySheet = XLSX.utils.json_to_sheet([{ note: "No data available" }]);
          XLSX.utils.book_append_sheet(workbook, emptySheet, sheetName);
        } else {
          const flatData = data.map(item => {
            const flat: Record<string, any> = {};
            for (const [key, value] of Object.entries(item)) {
              if (value instanceof Date) {
                flat[key] = value.toISOString();
              } else if (typeof value === "object" && value !== null) {
                flat[key] = JSON.stringify(value);
              } else {
                flat[key] = value;
              }
            }
            return flat;
          });
          const sheet = XLSX.utils.json_to_sheet(flatData);
          XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
        }
      };
      
      addSheet(clients.map((c: any) => ({ id: c.id, name: c.name, status: c.status, createdAt: c.createdAt })), "Clients");
      addSheet(allCategories, "Categories");
      addSheet(allDepartments, "Departments");
      addSheet(allItems, "Items");
      addSheet(allSuppliers, "Suppliers");
      addSheet(allGRNs, "GRNs");
      addSheet(allStoreNames, "SRDs");
      addSheet(allExceptions, "Exceptions");
      addSheet(allReceivables, "Receivables");
      addSheet(allSurplus, "Surplus");
      
      if (format === "csv") {
        // Create CSV zip file
        const archive = archiver("zip");
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", `attachment; filename=audit-export-${new Date().toISOString().split("T")[0]}.zip`);
        
        archive.pipe(res);
        
        // Add each sheet as a CSV file
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          archive.append(csv, { name: `${sheetName}.csv` });
        }
        
        await archive.finalize();
      } else {
        // Generate Excel file
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=audit-export-${new Date().toISOString().split("T")[0]}.xlsx`);
        res.send(buffer);
      }
      
      // Log the export
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Data Export",
        entity: "Export",
        entityId: null,
        details: `Exported data in ${format} format. Date range: ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}`,
        ipAddress: req.ip || "Unknown",
      });
    } catch (error: any) {
      console.error("Export error:", error);
      res.status(500).json({ error: error.message || "Failed to generate export" });
    }
  });

  // ============== AUDIT LOGS ==============
  app.get("/api/audit-logs", requireAuth, async (req, res) => {
    try {
      const { limit, offset, userId, entity, startDate, endDate } = req.query;
      
      const result = await storage.getAuditLogs({
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
        userId: userId as string,
        entity: entity as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== RECEIVABLES ==============
  app.get("/api/clients/:clientId/receivables", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { status, departmentId } = req.query;
      const receivables = await storage.getReceivables(clientId, {
        status: status as string,
        departmentId: departmentId as string,
      });
      res.json(receivables);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/receivables/:id", requireAuth, async (req, res) => {
    try {
      const receivable = await storage.getReceivable(req.params.id);
      if (!receivable) {
        return res.status(404).json({ error: "Receivable not found" });
      }
      res.json(receivable);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clients/:clientId/receivables", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const validated = insertReceivableSchema.parse({
        ...req.body,
        clientId,
        createdBy: req.session.userId!,
        auditDate: req.body.auditDate ? new Date(req.body.auditDate) : new Date(),
      });
      const receivable = await storage.createReceivable(validated);
      
      await storage.createReceivableHistory({
        receivableId: receivable.id,
        action: "created",
        newStatus: receivable.status,
        notes: "Initial receivable created",
        createdBy: req.session.userId!,
      });
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Receivable",
        entity: "Receivable",
        entityId: receivable.id,
        details: `Amount: ${receivable.varianceAmount}`,
        ipAddress: req.ip || "Unknown",
      });
      
      res.json(receivable);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/receivables/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getReceivable(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Receivable not found" });
      }

      const { status, amountPaid, comments, notes } = req.body;
      const updateData: any = {};
      
      if (status && RECEIVABLE_STATUSES.includes(status)) {
        updateData.status = status;
      }
      if (amountPaid !== undefined) {
        const newAmountPaid = parseFloat(existing.amountPaid || "0") + parseFloat(amountPaid);
        updateData.amountPaid = newAmountPaid.toString();
        updateData.balanceRemaining = (parseFloat(existing.varianceAmount) - newAmountPaid).toString();
        if (parseFloat(updateData.balanceRemaining) <= 0) {
          updateData.status = "settled";
          updateData.balanceRemaining = "0.00";
        } else if (newAmountPaid > 0) {
          updateData.status = "part_paid";
        }
      }
      if (comments !== undefined) {
        updateData.comments = comments;
      }

      const receivable = await storage.updateReceivable(req.params.id, updateData);
      
      await storage.createReceivableHistory({
        receivableId: req.params.id,
        action: "updated",
        previousStatus: existing.status,
        newStatus: updateData.status || existing.status,
        amountPaid: amountPaid?.toString(),
        notes: notes || `Status changed from ${existing.status} to ${updateData.status || existing.status}`,
        createdBy: req.session.userId!,
      });

      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Updated Receivable",
        entity: "Receivable",
        entityId: req.params.id,
        details: `Status: ${updateData.status || existing.status}, Amount paid: ${amountPaid || 0}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(receivable);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/receivables/:id/history", requireAuth, async (req, res) => {
    try {
      const history = await storage.getReceivableHistory(req.params.id);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== SURPLUSES ==============
  app.get("/api/clients/:clientId/surpluses", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { status, departmentId } = req.query;
      const surpluses = await storage.getSurpluses(clientId, {
        status: status as string,
        departmentId: departmentId as string,
      });
      res.json(surpluses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/surpluses/:id", requireAuth, async (req, res) => {
    try {
      const surplus = await storage.getSurplus(req.params.id);
      if (!surplus) {
        return res.status(404).json({ error: "Surplus not found" });
      }
      res.json(surplus);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clients/:clientId/surpluses", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const validated = insertSurplusSchema.parse({
        ...req.body,
        clientId,
        createdBy: req.session.userId!,
        auditDate: req.body.auditDate ? new Date(req.body.auditDate) : new Date(),
      });
      const surplus = await storage.createSurplus(validated);
      
      await storage.createSurplusHistory({
        surplusId: surplus.id,
        action: "created",
        newStatus: surplus.status,
        notes: "Initial surplus logged",
        createdBy: req.session.userId!,
      });
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Surplus",
        entity: "Surplus",
        entityId: surplus.id,
        details: `Amount: ${surplus.surplusAmount}`,
        ipAddress: req.ip || "Unknown",
      });
      
      res.json(surplus);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/surpluses/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getSurplus(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Surplus not found" });
      }

      const { status, classification, comments, notes } = req.body;
      const updateData: any = {};
      
      if (status && SURPLUS_STATUSES.includes(status)) {
        updateData.status = status;
      }
      if (classification !== undefined) {
        updateData.classification = classification;
      }
      if (comments !== undefined) {
        updateData.comments = comments;
      }

      const surplus = await storage.updateSurplus(req.params.id, updateData);
      
      await storage.createSurplusHistory({
        surplusId: req.params.id,
        action: "updated",
        previousStatus: existing.status,
        newStatus: updateData.status || existing.status,
        notes: notes || `Status changed from ${existing.status} to ${updateData.status || existing.status}`,
        createdBy: req.session.userId!,
      });

      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Updated Surplus",
        entity: "Surplus",
        entityId: req.params.id,
        details: `Status: ${updateData.status || existing.status}`,
        ipAddress: req.ip || "Unknown",
      });

      res.json(surplus);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/surpluses/:id/history", requireAuth, async (req, res) => {
    try {
      const history = await storage.getSurplusHistory(req.params.id);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== DEPARTMENT COMPARISON (2nd Hit) ==============
  app.get("/api/clients/:clientId/department-comparison", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { date } = req.query;
      const targetDate = date ? new Date(date as string) : new Date();
      
      const comparisonData = await storage.getDepartmentComparison(clientId, targetDate);
      res.json(comparisonData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============== PURCHASE ITEM EVENTS REGISTER ==============
  app.get("/api/clients/:clientId/purchase-item-events", requireAuth, requireClientAccess(), async (req, res) => {
    try {
      const { clientId } = req.params;
      const { srdId, itemId, dateFrom, dateTo } = req.query;
      
      const events = await storage.getPurchaseItemEvents({
        clientId,
        srdId: srdId as string | undefined,
        itemId: itemId as string | undefined,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
      });
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clients/:clientId/purchase-item-events", requireAuth, requireClientAccess(), async (req, res) => {
    try {
      const { clientId } = req.params;
      
      // Validate required fields
      const { itemId, date, qty, unitCostAtPurchase } = req.body;
      if (!itemId || !date || !qty || !unitCostAtPurchase) {
        return res.status(400).json({ error: "Missing required fields: itemId, date, qty, unitCostAtPurchase" });
      }
      
      const qtyNum = parseFloat(qty);
      const unitCostNum = parseFloat(unitCostAtPurchase);
      if (isNaN(qtyNum) || qtyNum <= 0) {
        return res.status(400).json({ error: "Quantity must be a positive number" });
      }
      if (isNaN(unitCostNum) || unitCostNum < 0) {
        return res.status(400).json({ error: "Unit cost must be a non-negative number" });
      }
      
      const totalCost = (qtyNum * unitCostNum).toFixed(2);
      
      const data = {
        ...req.body,
        clientId,
        date: new Date(date),
        totalCost,
        createdBy: req.session.userId,
      };
      
      const event = await storage.createPurchaseItemEvent(data);
      
      // Trigger forward recalculation if purchase is linked to an SRD
      const srdId = req.body.srdId;
      if (srdId) {
        const purchaseDate = new Date(date);
        try {
          await recalculateForward(clientId, srdId, itemId, purchaseDate);
          console.log(`[Purchase Event] Forward recalc triggered for SRD ${srdId} from ${purchaseDate.toISOString().split('T')[0]}`);
        } catch (err: any) {
          console.error(`[Purchase Event] Forward recalc failed:`, err.message);
        }
      }
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Created Purchase Event",
        entity: "PurchaseItemEvent",
        entityId: event.id,
        details: `Item: ${itemId}, Qty: ${qty}, Total: ${totalCost}`,
        ipAddress: req.ip || "Unknown",
      });
      
      res.status(201).json(event);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/purchase-item-events/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      // Get the event first to trigger recalculation after delete
      const eventToDelete = await storage.getPurchaseItemEvent(req.params.id);
      
      const deleted = await storage.deletePurchaseItemEvent(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Purchase event not found" });
      }
      
      // Trigger forward recalculation if purchase was linked to an SRD
      if (eventToDelete && eventToDelete.srdId) {
        try {
          await recalculateForward(eventToDelete.clientId, eventToDelete.srdId, eventToDelete.itemId, eventToDelete.date);
          console.log(`[Purchase Event Delete] Forward recalc triggered for SRD ${eventToDelete.srdId}`);
        } catch (err: any) {
          console.error(`[Purchase Event Delete] Forward recalc failed:`, err.message);
        }
      }
      
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: "Deleted Purchase Event",
        entity: "PurchaseItemEvent",
        entityId: req.params.id,
        details: "",
        ipAddress: req.ip || "Unknown",
      });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { initializePool, checkDbHealth, getPoolStats, isCircuitBreakerOpen } from "./db";

// Force production mode when deployed on Replit
// REPLIT_DEPLOYMENT is set to "1" when the app is published
if (process.env.REPLIT_DEPLOYMENT === "1" && !process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
  console.log("[STARTUP] Detected Replit deployment, setting NODE_ENV=production");
}

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '10mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

const SLOW_ROUTE_THRESHOLD_MS = 2000;
const SERVER_REQUEST_TIMEOUT_MS = 15000; // 15 second server-side timeout

// Routes exempt from timeout (streaming, downloads, uploads)
const TIMEOUT_EXEMPT_PATTERNS = [
  '/api/exports/',
  '/api/upload',
  '/api/files/',
  '/api/health', // Health check should be fast, exempt to avoid false positives
];

// Server-side request timeout middleware using native res.setTimeout
app.use((req, res, next) => {
  // Skip timeout for non-API routes
  if (!req.path.startsWith("/api")) {
    return next();
  }
  
  // Skip timeout for exempt routes (streaming, uploads, downloads)
  const isExempt = TIMEOUT_EXEMPT_PATTERNS.some(pattern => req.path.startsWith(pattern));
  if (isExempt) {
    return next();
  }
  
  // Track if request has timed out
  (req as any).__timedOut = false;
  
  // Wrap res.json and res.send to prevent writes after timeout
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  const originalEnd = res.end.bind(res);
  
  res.json = function(body: any) {
    if ((req as any).__timedOut || res.destroyed || res.headersSent) {
      console.debug(`[SKIP WRITE] ${req.method} ${req.path} - response already handled`);
      return res;
    }
    return originalJson(body);
  };
  
  res.send = function(body: any) {
    if ((req as any).__timedOut || res.destroyed || res.headersSent) {
      console.debug(`[SKIP WRITE] ${req.method} ${req.path} - response already handled`);
      return res;
    }
    return originalSend(body);
  };
  
  // Use res.setTimeout for cooperative timeout
  res.setTimeout(SERVER_REQUEST_TIMEOUT_MS, () => {
    (req as any).__timedOut = true;
    if (!res.headersSent && !res.destroyed) {
      console.error(`[REQUEST TIMEOUT] ${req.method} ${req.path} exceeded ${SERVER_REQUEST_TIMEOUT_MS}ms - aborting`);
      try {
        res.status(504);
        originalJson({ error: "timeout", message: "Request took too long. Please try again." });
      } catch (e) {
        // Response may already be destroyed
      }
    }
  });
  
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const status = res.statusCode;
      let logLine = `${req.method} ${path} ${status} in ${duration}ms`;
      
      // Truncate response body for logging (max 200 chars)
      if (capturedJsonResponse) {
        const bodyStr = JSON.stringify(capturedJsonResponse);
        const truncated = bodyStr.length > 200 ? bodyStr.slice(0, 200) + "..." : bodyStr;
        logLine += ` :: ${truncated}`;
      }

      // SLOW ROUTE alert for any request over threshold
      if (duration > SLOW_ROUTE_THRESHOLD_MS) {
        console.warn(`[SLOW ROUTE] ${req.method} ${path} took ${duration}ms (threshold: ${SLOW_ROUTE_THRESHOLD_MS}ms) status=${status}`);
      }
      
      // Log 500 errors with details
      if (status >= 500) {
        console.error(`[SERVER ERROR] ${req.method} ${path} ${status} in ${duration}ms`);
      }

      log(logLine);
    }
  });

  next();
});

// =============================================================================
// CRITICAL: Health check endpoints MUST be registered BEFORE async initialization
// This ensures deployment health probes succeed even when DB is slow/unavailable
// =============================================================================

// Lightweight health check for deployment probes - responds immediately
app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: Date.now() });
});

// Root health check for Replit deployment (returns minimal response quickly)
app.get("/", (req, res, next) => {
  // If this is a health check probe (no Accept header or accepts JSON), respond quickly
  const acceptHeader = req.headers.accept || "";
  if (!acceptHeader || acceptHeader.includes("application/json") || req.headers["user-agent"]?.includes("health")) {
    return res.status(200).send("OK");
  }
  // Otherwise, let static file serving handle it (for browser requests)
  next();
});

// Track initialization state for /api/health endpoint
let dbInitialized = false;
let dbInitError: string | null = null;

// Basic /api/health that works before full init
app.get("/api/health", (_req, res) => {
  res.status(200).json({ 
    status: "ok", 
    dbInitialized,
    dbInitError,
    timestamp: Date.now() 
  });
});

// Start server IMMEDIATELY so health checks respond
// This MUST happen BEFORE async DB initialization
const port = parseInt(process.env.PORT || "5000", 10);
httpServer.listen(
  {
    port,
    host: "0.0.0.0",
    reusePort: true,
  },
  () => {
    log(`serving on port ${port} (health checks ready)`);
  },
);

// =============================================================================
// Async initialization - DB and routes setup in background
// Server is already listening, so health checks will pass during this phase
// =============================================================================
(async () => {
  // Initialize database pool with retry at startup
  console.log("[STARTUP] Initializing database pool...");
  try {
    await initializePool();
    dbInitialized = true;
    console.log("[STARTUP] Database pool initialized successfully");
  } catch (err: any) {
    dbInitError = err.message;
    console.error("[STARTUP] Failed to initialize database pool:", err.message);
    console.error("[STARTUP] Server will attempt to connect on first request");
  }

  // Add /api/health/db endpoint before other routes (fast, no auth)
  app.get("/api/health/db", async (_req, res) => {
    try {
      const health = await checkDbHealth();
      const statusCode = health.ok ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (err: any) {
      res.status(503).json({ ok: false, error: err.message, poolStats: getPoolStats() });
    }
  });
  
  // Add /api/health/pool endpoint for pool diagnostics
  app.get("/api/health/pool", (_req, res) => {
    const stats = getPoolStats();
    const circuitOpen = isCircuitBreakerOpen();
    res.json({
      pool: stats,
      circuitBreakerOpen: circuitOpen,
      timestamp: new Date().toISOString(),
    });
  });
  
  // Circuit breaker middleware - return 503 early if DB is overloaded
  app.use("/api", (req, res, next) => {
    // Skip health endpoints
    if (req.path.startsWith("/api/health")) {
      return next();
    }
    
    if (isCircuitBreakerOpen()) {
      console.warn(`[Circuit Breaker] Rejecting ${req.method} ${req.path} - DB overloaded`);
      return res.status(503).json({
        error: "Database temporarily unavailable",
        message: "Please wait a moment and try again",
        retryAfter: 30,
      });
    }
    
    next();
  });

  // Log email configuration status
  const { logEmailConfigStatus } = await import('./email');
  logEmailConfigStatus();

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Health check endpoints are already registered before async init (above)
  // No need to duplicate them here

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Server is already listening (started before async init)
  console.log("[STARTUP] Async initialization complete - all routes registered");
})();

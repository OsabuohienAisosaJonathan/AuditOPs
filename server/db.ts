import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";

let _pool: pkg.Pool | null = null;
let _db: NodePgDatabase<typeof schema> | null = null;
let _initPromise: Promise<void> | null = null;

const isProduction = process.env.NODE_ENV === 'production';

// Circuit breaker state
let circuitBreakerOpen = false;
let circuitBreakerOpenedAt = 0;
let consecutiveTimeouts = 0;
const CIRCUIT_BREAKER_THRESHOLD = 5; // Open after 5 timeouts
const CIRCUIT_BREAKER_RESET_MS = 30000; // Reset after 30s
const FAST_ACQUIRE_TIMEOUT_MS = 3000; // Fast fail for connection acquisition

// Pool statistics for diagnostics
export function getPoolStats(): { totalCount: number; idleCount: number; waitingCount: number; circuitBreakerOpen: boolean } | null {
  if (!_pool) return null;
  return {
    totalCount: _pool.totalCount,
    idleCount: _pool.idleCount,
    waitingCount: _pool.waitingCount,
    circuitBreakerOpen,
  };
}

// Check if circuit breaker should allow requests
export function isCircuitBreakerOpen(): boolean {
  if (!circuitBreakerOpen) return false;
  
  // Check if enough time has passed to reset
  if (Date.now() - circuitBreakerOpenedAt > CIRCUIT_BREAKER_RESET_MS) {
    console.log('[Circuit Breaker] Resetting - cooldown period ended');
    circuitBreakerOpen = false;
    consecutiveTimeouts = 0;
    return false;
  }
  
  return true;
}

// Record a timeout and potentially open circuit breaker
export function recordDbTimeout(): void {
  consecutiveTimeouts++;
  console.warn(`[Circuit Breaker] Timeout recorded. Count: ${consecutiveTimeouts}/${CIRCUIT_BREAKER_THRESHOLD}`);
  
  if (consecutiveTimeouts >= CIRCUIT_BREAKER_THRESHOLD && !circuitBreakerOpen) {
    circuitBreakerOpen = true;
    circuitBreakerOpenedAt = Date.now();
    console.error('[Circuit Breaker] OPENED - Too many DB timeouts. Routes will return 503 for 30s.');
  }
}

// Record a successful DB operation
export function recordDbSuccess(): void {
  if (consecutiveTimeouts > 0) {
    consecutiveTimeouts = 0;
  }
}

// Log timing for DB operations
export function logDbTiming(operation: string, startTime: number, context?: Record<string, any>) {
  const duration = Date.now() - startTime;
  const stats = getPoolStats();
  const warnThreshold = 2000; // 2 seconds
  
  if (duration > warnThreshold) {
    console.warn(`[DB SLOW] ${operation} took ${duration}ms`, {
      ...context,
      poolStats: stats,
    });
  }
}

// Retry connection with exponential backoff (only at pool creation)
async function connectWithRetry(pool: pkg.Pool, maxRetries = 2): Promise<void> {
  const delays = [300, 800, 1500];
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log(`[DB Pool] Connection established on attempt ${attempt + 1}`);
      return;
    } catch (err: any) {
      console.error(`[DB Pool] Connection attempt ${attempt + 1} failed:`, err.message);
      if (attempt < maxRetries) {
        const delay = delays[attempt] || 1500;
        console.log(`[DB Pool] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
}

function ensureDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  
  // Log DB connection info at first init (safe, no secrets)
  if (!_pool) {
    const dbUrl = new URL(process.env.DATABASE_URL);
    const isPooled = dbUrl.hostname.includes('pooler') || dbUrl.port === '6543';
    console.log(`[DB Config] host=${dbUrl.hostname}, pooled=${isPooled}, ssl=${dbUrl.searchParams.get('sslmode') || 'default'}`);
    
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // CRITICAL: Reduced pool for serverless DB stability
      max: 5, // Small pool to avoid exhausting serverless DB
      min: 0, // Allow pool to shrink to 0 when idle
      idleTimeoutMillis: 30000, // Close idle connections after 30s
      connectionTimeoutMillis: 4000, // Fast fail - 4s max wait for connection
      statement_timeout: 20000, // Statement timeout: 20s
      keepAlive: true, // Enable TCP keepalive
      keepAliveInitialDelayMillis: 10000, // Start keepalive after 10s idle
      allowExitOnIdle: true, // Allow process to exit when pool is idle
    });
    
    // Log pool errors and detect timeout patterns
    _pool.on('error', (err) => {
      console.error('[DB Pool] Unexpected error on idle client:', err.message);
      // Check for timeout-related errors to trigger circuit breaker
      if (err.message.includes('timeout') || err.message.includes('ETIMEDOUT') || err.message.includes('ECONNREFUSED')) {
        recordDbTimeout();
      }
    });
    
    // Log pool connection events in production too for debugging
    _pool.on('connect', (client) => {
      const stats = getPoolStats();
      console.log('[DB Pool] New connection established', stats);
      
      // Intercept client queries to detect timeouts
      const originalQuery = client.query.bind(client);
      (client as any).query = async function(...args: any[]) {
        const startTime = Date.now();
        try {
          const result = await originalQuery(...args);
          recordDbSuccess();
          return result;
        } catch (err: any) {
          const duration = Date.now() - startTime;
          if (err.message.includes('timeout') || duration > 15000) {
            console.error(`[DB Pool] Query timeout after ${duration}ms:`, err.message);
            recordDbTimeout();
          }
          throw err;
        }
      };
    });
    
    _pool.on('remove', () => {
      const stats = getPoolStats();
      console.log('[DB Pool] Connection removed', stats);
    });
  }
  
  if (!_db) {
    _db = drizzle({ client: _pool, schema });
  }
  
  return { pool: _pool, db: _db };
}

// Initialize pool with retry (call once at startup)
export async function initializePool(): Promise<void> {
  if (_initPromise) return _initPromise;
  
  _initPromise = (async () => {
    const { pool } = ensureDatabase();
    await connectWithRetry(pool, 2);
  })();
  
  return _initPromise;
}

// Health check - fast timeout for monitoring
export async function checkDbHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string; poolStats?: ReturnType<typeof getPoolStats> }> {
  const startTime = Date.now();
  try {
    const { pool } = ensureDatabase();
    
    // Use a separate connection with shorter timeout for health check
    const client = await Promise.race([
      pool.connect(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Health check connection timeout')), 2000)
      )
    ]) as pkg.PoolClient;
    
    try {
      await client.query('SELECT 1');
      const latencyMs = Date.now() - startTime;
      recordDbSuccess();
      return { ok: true, latencyMs, poolStats: getPoolStats() };
    } finally {
      client.release();
    }
  } catch (err: any) {
    recordDbTimeout();
    return { 
      ok: false, 
      latencyMs: Date.now() - startTime, 
      error: err.message,
      poolStats: getPoolStats()
    };
  }
}

// Acquire a connection with fast-fail guard
export async function acquireConnectionWithGuard(): Promise<{ client: pkg.PoolClient | null; error?: string }> {
  // Check circuit breaker first
  if (isCircuitBreakerOpen()) {
    return { client: null, error: 'Database temporarily unavailable (circuit breaker open)' };
  }
  
  const startTime = Date.now();
  try {
    const { pool } = ensureDatabase();
    
    // Fast-fail acquisition with shorter timeout
    const client = await Promise.race([
      pool.connect(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Connection acquisition timeout')), FAST_ACQUIRE_TIMEOUT_MS)
      )
    ]) as pkg.PoolClient;
    
    const acquireTime = Date.now() - startTime;
    if (acquireTime > 2000) {
      console.warn(`[DB Pool] Slow connection acquisition: ${acquireTime}ms`, getPoolStats());
    }
    
    recordDbSuccess();
    return { client };
  } catch (err: any) {
    const acquireTime = Date.now() - startTime;
    console.error(`[DB Pool] Failed to acquire connection in ${acquireTime}ms:`, err.message, getPoolStats());
    recordDbTimeout();
    return { client: null, error: err.message };
  }
}

export const pool = new Proxy({} as pkg.Pool, {
  get(_target, prop) {
    const { pool } = ensureDatabase();
    return (pool as any)[prop];
  }
});

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop) {
    const { db } = ensureDatabase();
    return (db as any)[prop];
  }
});

import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";
import * as circuitBreaker from "./circuitBreaker";

console.log('[DB STARTUP] Environment check:', {
  DATABASE_URL: !!process.env.DATABASE_URL,
  PGHOST: !!process.env.PGHOST,
  PGPORT: !!process.env.PGPORT,
  PGUSER: !!process.env.PGUSER,
  PGPASSWORD: !!process.env.PGPASSWORD,
  PGDATABASE: !!process.env.PGDATABASE,
  NODE_ENV: process.env.NODE_ENV || 'not set',
  APP_URL: !!process.env.APP_URL,
});

let _pool: pkg.Pool | null = null;
let _db: NodePgDatabase<typeof schema> | null = null;
let _initPromise: Promise<void> | null = null;

const isProduction = process.env.NODE_ENV === 'production';

export function getPoolStats(): { 
  totalCount: number; 
  idleCount: number; 
  waitingCount: number; 
  circuitBreakerState: string;
  circuitBreakerOpen: boolean;
} | null {
  if (!_pool) return null;
  const cbStats = circuitBreaker.getCircuitStats();
  return {
    totalCount: _pool.totalCount,
    idleCount: _pool.idleCount,
    waitingCount: _pool.waitingCount,
    circuitBreakerState: cbStats.state,
    circuitBreakerOpen: cbStats.isOpen,
  };
}

export function isCircuitBreakerOpen(): boolean {
  return circuitBreaker.isCircuitOpen();
}

export function recordDbTimeout(): void {
  circuitBreaker.recordFailure('db_pool');
}

export function recordDbSuccess(): void {
  circuitBreaker.recordSuccess('db_pool');
}

export function logDbTiming(operation: string, startTime: number, context?: Record<string, any>) {
  const duration = Date.now() - startTime;
  const stats = getPoolStats();
  const warnThreshold = 1000;
  
  if (duration > warnThreshold) {
    console.warn(`[DB SLOW] ${operation} took ${duration}ms`, {
      ...context,
      poolStats: stats,
    });
  }
}

async function connectWithRetry(pool: pkg.Pool, maxRetries = 3): Promise<void> {
  // Longer delays for Neon cold-start tolerance (can take 1-3s to wake up)
  const delays = [500, 1500, 3000, 5000];
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log(`[DB Pool] Connection established on attempt ${attempt + 1}${attempt > 0 ? ' (cold-start recovery)' : ''}`);
      return;
    } catch (err: any) {
      const isColdStart = err.message.includes('timeout') || err.message.includes('ETIMEDOUT');
      console.error(`[DB Pool] Connection attempt ${attempt + 1} failed${isColdStart ? ' (possible cold-start)' : ''}:`, err.message);
      if (attempt < maxRetries) {
        const delay = delays[attempt] || 5000;
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
    const errorMsg = isProduction
      ? "DATABASE_URL is missing in production secrets. Add it in the Secrets panel."
      : "DATABASE_URL must be set. Did you forget to provision a database?";
    console.error(`[DB FATAL] ${errorMsg}`);
    throw new Error(errorMsg);
  }
  
  if (!_pool) {
    const dbUrl = new URL(process.env.DATABASE_URL);
    const isPooled = dbUrl.hostname.includes('pooler') || dbUrl.port === '6543';
    console.log(`[DB Config] host=${dbUrl.hostname}, pooled=${isPooled}, ssl=${dbUrl.searchParams.get('sslmode') || 'default'}, env=${isProduction ? 'production' : 'development'}`);
    
    const maxConnections = isProduction ? 5 : 8;
    
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: maxConnections,
      min: 0,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // 10s to handle Neon cold-starts
      statement_timeout: 15000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      allowExitOnIdle: true,
    });
    
    console.log(`[DB Pool] Created singleton pool with max=${maxConnections} connections`);
    
    _pool.on('error', (err) => {
      console.error('[DB Pool] Unexpected error on idle client:', err.message);
      if (err.message.includes('timeout') || err.message.includes('ETIMEDOUT') || err.message.includes('ECONNREFUSED')) {
        recordDbTimeout();
      }
    });
    
    _pool.on('connect', () => {
      const stats = getPoolStats();
      console.log('[DB Pool] New connection established', stats);
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

export async function initializePool(): Promise<void> {
  if (_initPromise) return _initPromise;
  
  _initPromise = (async () => {
    const { pool } = ensureDatabase();
    await connectWithRetry(pool, 3); // Allow 3 retries for cold-start tolerance
  })();
  
  return _initPromise;
}

export async function checkDbHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string; poolStats?: ReturnType<typeof getPoolStats> }> {
  const startTime = Date.now();
  
  if (!process.env.DATABASE_URL) {
    return {
      ok: false,
      latencyMs: 0,
      error: 'DATABASE_URL not configured',
      poolStats: null,
    };
  }
  
  try {
    const { pool } = ensureDatabase();
    
    const client = await Promise.race([
      pool.connect(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Health check connection timeout')), 5000)
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

export async function probeDatabase(): Promise<boolean> {
  try {
    const { pool } = ensureDatabase();
    const client = await Promise.race([
      pool.connect(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Probe timeout')), 5000)
      )
    ]) as pkg.PoolClient;
    
    try {
      await client.query('SELECT 1');
      recordDbSuccess();
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    recordDbTimeout();
    return false;
  }
}

/**
 * Fast DB probe for auth routes - fails fast (2s) without affecting circuit breaker.
 * Used for graceful degraded login when DB is cold/unavailable.
 * 
 * Uses a separate promise to ensure connections are always released,
 * even if the timeout wins the race.
 */
export async function fastProbeForAuth(): Promise<{ available: boolean; coldStart: boolean }> {
  const FAST_TIMEOUT_MS = 2000;
  let timeoutHandle: NodeJS.Timeout | null = null;
  
  try {
    const { pool } = ensureDatabase();
    
    // Track if we've timed out
    let timedOut = false;
    
    // Create timeout promise with clearable handle
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        reject(new Error('Fast probe timeout'));
      }, FAST_TIMEOUT_MS);
    });
    
    // Create connection promise that always releases the client
    const connectPromise = (async () => {
      const client = await pool.connect();
      
      // If we already timed out, release immediately and return silently
      if (timedOut) {
        client.release();
        return false; // Indicate late arrival, don't throw
      }
      
      try {
        await client.query('SELECT 1');
        return true; // Success indicator
      } finally {
        client.release();
      }
    })();
    
    // Attach catch handler to prevent unhandled rejection if timeout wins
    connectPromise.catch(() => { /* Swallow late rejection */ });
    
    // Race the connection against timeout
    await Promise.race([connectPromise, timeoutPromise]);
    
    // Clear timeout to prevent late rejection
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
    
    return { available: true, coldStart: false };
  } catch (err: any) {
    // Clear timeout to prevent late rejection
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
    
    // Detect cold-start vs hard failure
    const isColdStart = err.message.includes('timeout') || 
                        err.message.includes('ETIMEDOUT') ||
                        err.message.includes('connection');
    console.log(`[DB FastProbe] Failed in ${FAST_TIMEOUT_MS}ms: ${err.message} (coldStart=${isColdStart})`);
    // Do NOT record as circuit breaker failure - this is just a fast probe
    return { available: false, coldStart: isColdStart };
  }
}

export async function acquireConnectionWithGuard(): Promise<{ client: pkg.PoolClient | null; error?: string }> {
  if (isCircuitBreakerOpen()) {
    return { client: null, error: 'Database temporarily unavailable (circuit breaker open)' };
  }
  
  const startTime = Date.now();
  try {
    const { pool } = ensureDatabase();
    
    const client = await Promise.race([
      pool.connect(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Connection acquisition timeout')), 5000)
      )
    ]) as pkg.PoolClient;
    
    const acquireTime = Date.now() - startTime;
    if (acquireTime > 1000) {
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

export { circuitBreaker };

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

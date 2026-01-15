import { drizzle, MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@shared/schema";
import * as circuitBreaker from "./circuitBreaker";

console.log('[DB STARTUP] Environment check:', {
  DATABASE_URL: !!process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV || 'not set',
  APP_URL: !!process.env.APP_URL,
});

let _pool: mysql.Pool | null = null;
let _db: MySql2Database<typeof schema> | null = null;
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
  // mysql2 pool doesn't expose easy stats like pg pool does in the same properties
  // We can mock basic availability or inspect internal (undocumented) pool structure if needed
  // For now, return placeholders or simplified stats
  return {
    totalCount: 0, // Not directly exposed in standard public API
    idleCount: 0,
    waitingCount: 0,
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

async function connectWithRetry(pool: mysql.Pool, maxRetries = 3): Promise<void> {
  const delays = [500, 1500, 3000, 5000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const connection = await pool.getConnection();
      await connection.query('SELECT 1');
      connection.release();
      console.log(`[DB Pool] Connection established on attempt ${attempt + 1}`);
      return;
    } catch (err: any) {
      console.error(`[DB Pool] Connection attempt ${attempt + 1} failed:`, err.message);
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
      ? "DATABASE_URL is missing in production secrets."
      : "DATABASE_URL must be set.";
    console.error(`[DB FATAL] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  if (!_pool) {
    console.log(`[DB Config] Initializing MySQL pool, env=${isProduction ? 'production' : 'development'}`);

    // Parse DATABASE_URL if needed or pass directly if mysql2 supports connection string (it does)
    _pool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: isProduction ? 5 : 10,
      queueLimit: 0,
      multipleStatements: true, // Often useful for migrations or batch queries
      connectTimeout: 10000
    });

    console.log(`[DB Pool] Created singleton MySQL pool`);
  }

  if (!_db) {
    _db = drizzle(_pool, { mode: "default", schema });
  }

  return { pool: _pool, db: _db };
}

export async function initializePool(): Promise<void> {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const { pool } = ensureDatabase();
    await connectWithRetry(pool, 3);
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

    // MySQL2 pool.getConnection() is roughly equivalent to pg pool.connect()
    const connection = await Promise.race([
      pool.getConnection(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Health check connection timeout')), 5000)
      )
    ]) as mysql.PoolConnection;

    try {
      await connection.query('SELECT 1');
      const latencyMs = Date.now() - startTime;
      recordDbSuccess();
      return { ok: true, latencyMs, poolStats: getPoolStats() };
    } finally {
      connection.release();
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
    const connection = await Promise.race([
      pool.getConnection(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Probe timeout')), 5000)
      )
    ]) as mysql.PoolConnection;

    try {
      await connection.query('SELECT 1');
      recordDbSuccess();
      return true;
    } finally {
      connection.release();
    }
  } catch (err) {
    recordDbTimeout();
    return false;
  }
}

export async function acquireConnectionWithGuard(): Promise<{ client: mysql.PoolConnection | null; error?: string }> {
  if (isCircuitBreakerOpen()) {
    return { client: null, error: 'Database temporarily unavailable (circuit breaker open)' };
  }

  const startTime = Date.now();
  try {
    const { pool } = ensureDatabase();

    const client = await Promise.race([
      pool.getConnection(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection acquisition timeout')), 5000)
      )
    ]) as mysql.PoolConnection;

    // Note: client is a PoolConnection, closest to PoolClient in pg

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

// Proxies for export
export const pool = new Proxy({} as mysql.Pool, {
  get(_target, prop) {
    const { pool } = ensureDatabase();
    return (pool as any)[prop];
  }
});

export const db = new Proxy({} as MySql2Database<typeof schema>, {
  get(_target, prop) {
    const { db } = ensureDatabase();
    return (db as any)[prop];
  }
});

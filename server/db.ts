import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";

let _pool: pkg.Pool | null = null;
let _db: NodePgDatabase<typeof schema> | null = null;
let _initPromise: Promise<void> | null = null;

const isProduction = process.env.NODE_ENV === 'production';

// Pool statistics for diagnostics
export function getPoolStats(): { totalCount: number; idleCount: number; waitingCount: number } | null {
  if (!_pool) return null;
  return {
    totalCount: _pool.totalCount,
    idleCount: _pool.idleCount,
    waitingCount: _pool.waitingCount,
  };
}

// Log timing for DB operations
export function logDbTiming(operation: string, startTime: number, context?: Record<string, any>) {
  const duration = Date.now() - startTime;
  const stats = getPoolStats();
  const warnThreshold = 2000; // 2 seconds
  
  if (duration > warnThreshold || !isProduction) {
    console.log(`[DB] ${operation} took ${duration}ms`, {
      ...context,
      poolStats: stats,
      slow: duration > warnThreshold,
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
  
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Optimized pool settings for Neon/serverless with production reliability
      max: 10, // Reduced from 20 - less pressure on serverless DB
      min: 1, // Keep at least 1 connection ready
      idleTimeoutMillis: 20000, // Close idle connections after 20s
      connectionTimeoutMillis: 8000, // Reduced from 15s - fail fast, retry logic handles reconnection
      statement_timeout: 25000, // Statement timeout: 25s
      keepAlive: true, // Enable TCP keepalive
      keepAliveInitialDelayMillis: 10000, // Start keepalive after 10s idle
    });
    
    // Log pool errors (never crash)
    _pool.on('error', (err) => {
      console.error('[DB Pool] Unexpected error on idle client:', err.message);
    });
    
    // Log pool connection events
    _pool.on('connect', () => {
      if (!isProduction) {
        console.log('[DB Pool] New connection established');
      }
    });
    
    _pool.on('acquire', () => {
      if (!isProduction) {
        const stats = getPoolStats();
        console.debug('[DB Pool] Connection acquired', stats);
      }
    });
    
    _pool.on('remove', () => {
      if (!isProduction) {
        console.debug('[DB Pool] Connection removed from pool');
      }
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
        setTimeout(() => reject(new Error('Health check connection timeout')), 3000)
      )
    ]) as pkg.PoolClient;
    
    try {
      await client.query('SELECT 1');
      const latencyMs = Date.now() - startTime;
      return { ok: true, latencyMs, poolStats: getPoolStats() };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return { 
      ok: false, 
      latencyMs: Date.now() - startTime, 
      error: err.message,
      poolStats: getPoolStats()
    };
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

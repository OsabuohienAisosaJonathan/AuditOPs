import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";

let _pool: pkg.Pool | null = null;
let _db: NodePgDatabase<typeof schema> | null = null;

function ensureDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Connection pool settings for production reliability
      max: 20, // Maximum 20 connections in pool (reasonable for Neon/serverless)
      min: 2, // Keep at least 2 connections ready
      idleTimeoutMillis: 30000, // Close idle connections after 30s
      connectionTimeoutMillis: 15000, // Timeout for acquiring connection: 15s (production reliability)
      statement_timeout: 30000, // Statement timeout: 30s
    });
    
    // Log pool errors
    _pool.on('error', (err) => {
      console.error('[DB Pool] Unexpected error on idle client:', err.message);
    });
    
    // Log pool connection events in development
    if (process.env.NODE_ENV !== 'production') {
      _pool.on('connect', () => {
        console.debug('[DB Pool] New connection established');
      });
    }
  }
  
  if (!_db) {
    _db = drizzle({ client: _pool, schema });
  }
  
  return { pool: _pool, db: _db };
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

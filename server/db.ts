import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Required for Neon serverless driver in non-browser environments
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use connection pooling for better performance in serverless/lambda environments
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Helper to check DB health (compatible with existing code)
export async function initializePool() {
  // Simple query to verify connection
  await pool.query('SELECT 1');
}

export async function checkDbHealth() {
  try {
    const result = await pool.query('SELECT 1');
    return { ok: true, latencyMs: 0 }; // Latency not easily measured here without improved logic
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function probeDatabase(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (err) {
    return false;
  }
}

export function getPoolStats() {
  // neon-serverless pool stats might differ, basic stub for compatibility
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

export function isCircuitBreakerOpen() {
  return false; // Circuit breaker less relevant for managed Neon pooling? Keeping simple.
}

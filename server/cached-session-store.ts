import { Store, SessionData } from "express-session";

interface CachedSession {
  data: SessionData;
  lastDbSync: number;
  dirty: boolean;
}

/**
 * CachedSessionStore wraps any session store with an in-memory cache layer.
 * 
 * This dramatically reduces DB pressure by:
 * - Caching session reads in memory for a configurable TTL (default 30s)
 * - Only writing to DB every syncIntervalMs or when session is destroyed
 * - Batching writes to reduce total DB queries
 * - Circuit breaker to stop sync attempts for 5 minutes after DB failures
 * 
 * This is critical for preventing connection pool exhaustion when using
 * PostgreSQL-backed session stores like connect-pg-simple.
 */
export class CachedSessionStore extends Store {
  private cache = new Map<string, CachedSession>();
  private backingStore: Store;
  private cacheTtlMs: number;
  private syncIntervalMs: number;
  private syncTimer: NodeJS.Timeout | null = null;
  
  // Circuit breaker state for sync operations
  private syncCircuitOpen = false;
  private syncCircuitOpenedAt = 0;
  private syncCircuitCooldownMs = 5 * 60 * 1000; // 5 minutes
  private lastCircuitWarningLogged = 0;

  constructor(
    backingStore: Store,
    options: {
      cacheTtlMs?: number;
      syncIntervalMs?: number;
    } = {}
  ) {
    super();
    this.backingStore = backingStore;
    this.cacheTtlMs = options.cacheTtlMs || 30000; // 30 seconds default
    this.syncIntervalMs = options.syncIntervalMs || 30000; // Sync to DB every 30s
    
    // Start background sync timer
    this.startSyncTimer();
    
    console.log(`[CachedSessionStore] Initialized with cacheTtl=${this.cacheTtlMs}ms, syncInterval=${this.syncIntervalMs}ms`);
  }

  private isSyncCircuitOpen(): boolean {
    if (!this.syncCircuitOpen) return false;
    
    // Check if cooldown has passed
    if (Date.now() - this.syncCircuitOpenedAt > this.syncCircuitCooldownMs) {
      console.log('[CachedSessionStore] Circuit breaker reset - attempting sync again');
      this.syncCircuitOpen = false;
      return false;
    }
    
    return true;
  }

  private openSyncCircuit(reason: string): void {
    if (this.syncCircuitOpen) return; // Already open
    
    this.syncCircuitOpen = true;
    this.syncCircuitOpenedAt = Date.now();
    console.warn(`[CachedSessionStore] Circuit breaker OPENED: ${reason}. Sync paused for 5 minutes.`);
  }

  private startSyncTimer(): void {
    if (this.syncTimer) return;
    
    this.syncTimer = setInterval(() => {
      // Use setImmediate to ensure this never blocks the event loop
      setImmediate(() => {
        this.syncDirtySessions().catch(() => {
          // Errors already handled inside syncDirtySessions
        });
        this.cleanupCache();
      });
    }, this.syncIntervalMs);
    
    // Don't let this timer keep the process alive
    this.syncTimer.unref();
  }

  private async syncDirtySessions(): Promise<void> {
    // Check circuit breaker first
    if (this.isSyncCircuitOpen()) {
      // Log warning only once per minute to avoid spam
      const now = Date.now();
      if (now - this.lastCircuitWarningLogged > 60000) {
        const remaining = Math.round((this.syncCircuitCooldownMs - (now - this.syncCircuitOpenedAt)) / 1000);
        console.log(`[CachedSessionStore] Sync skipped - circuit open, ${remaining}s remaining`);
        this.lastCircuitWarningLogged = now;
      }
      return;
    }

    const dirtyEntries = Array.from(this.cache.entries()).filter(([, v]) => v.dirty);
    if (dirtyEntries.length === 0) return;

    const startTime = Date.now();
    let synced = 0;
    let errors = 0;
    let timeoutError = false;

    for (const [sid, cached] of dirtyEntries) {
      try {
        await Promise.race([
          new Promise<void>((resolve, reject) => {
            this.backingStore.set(sid, cached.data, (err) => {
              if (err) reject(err);
              else resolve();
            });
          }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Session sync timeout')), 5000)
          )
        ]);
        cached.dirty = false;
        cached.lastDbSync = Date.now();
        synced++;
      } catch (err: any) {
        errors++;
        // Check for timeout-related errors
        if (err.message.includes('timeout') || err.message.includes('ETIMEDOUT') || err.message.includes('ECONNREFUSED')) {
          timeoutError = true;
        }
        // Log only once per batch, not per session
        if (errors === 1) {
          console.error(`[CachedSessionStore] Sync error:`, err.message);
        }
      }
    }

    const duration = Date.now() - startTime;
    
    // Open circuit breaker if we had timeout errors
    if (timeoutError) {
      this.openSyncCircuit('DB timeout during session sync');
    }
    
    if (synced > 0) {
      console.log(`[CachedSessionStore] Synced ${synced}/${dirtyEntries.length} sessions in ${duration}ms`);
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    const staleThreshold = this.cacheTtlMs * 3; // Remove entries 3x older than TTL
    
    this.cache.forEach((cached, sid) => {
      if (now - cached.lastDbSync > staleThreshold && !cached.dirty) {
        this.cache.delete(sid);
      }
    });
  }

  get(sid: string, callback: (err: any, session?: SessionData | null) => void): void {
    const cached = this.cache.get(sid);
    const now = Date.now();

    // If we have a fresh cache hit, return it immediately
    if (cached && (now - cached.lastDbSync) < this.cacheTtlMs) {
      return callback(null, cached.data);
    }

    // If circuit is open, use stale cache or return null
    if (this.isSyncCircuitOpen()) {
      if (cached) {
        return callback(null, cached.data);
      }
      return callback(null, null);
    }

    // Fetch from backing store (no timeout wrapper - just let it complete or fail naturally)
    this.backingStore.get(sid, (err, session) => {
      if (err) {
        // Check for timeout errors
        if (err.message?.includes('timeout') || err.message?.includes('ETIMEDOUT')) {
          this.openSyncCircuit('DB timeout on session read');
        }
        // If we have stale cache and DB failed, use stale data
        if (cached) {
          return callback(null, cached.data);
        }
        return callback(null, null); // Don't propagate error, just return no session
      }

      if (session) {
        this.cache.set(sid, {
          data: session,
          lastDbSync: now,
          dirty: false,
        });
      } else {
        // Session not found, remove from cache
        this.cache.delete(sid);
      }

      callback(null, session);
    });
  }

  set(sid: string, session: SessionData, callback?: (err?: any) => void): void {
    const now = Date.now();
    const existing = this.cache.get(sid);

    // Update cache immediately - this ensures /auth/me reads succeed right away
    this.cache.set(sid, {
      data: session,
      lastDbSync: existing?.lastDbSync || 0,
      dirty: true,
    });

    // CRITICAL: Callback immediately so login doesn't block on DB writes
    // The session is already in memory cache - /auth/me will read from cache
    callback?.();

    // If circuit is open, don't try to write to DB (background only)
    if (this.isSyncCircuitOpen()) {
      return;
    }

    // Schedule async DB write - non-blocking, errors logged but don't fail request
    // This runs in background after callback has already been called
    const shouldWriteImmediately = !existing || (now - (existing.lastDbSync || 0)) > this.syncIntervalMs;

    if (shouldWriteImmediately) {
      // Use setImmediate to ensure this never blocks the current request
      setImmediate(() => {
        this.backingStore.set(sid, session, (err) => {
          if (!err) {
            const cached = this.cache.get(sid);
            if (cached) {
              cached.dirty = false;
              cached.lastDbSync = Date.now();
            }
          } else {
            console.log(`[CachedSessionStore] Async DB write error (non-blocking): ${err.message}`);
            if (err.message?.includes('timeout')) {
              this.openSyncCircuit('DB timeout on session write');
            }
          }
        });
      });
    }
    // Otherwise defer to background sync timer
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    // Remove from cache immediately - logout appears instant to user
    this.cache.delete(sid);
    
    // CRITICAL: Callback immediately so logout doesn't block on DB
    callback?.();
    
    // If circuit is open, don't try to write to DB
    if (this.isSyncCircuitOpen()) {
      return;
    }
    
    // Schedule async DB delete - non-blocking
    setImmediate(() => {
      this.backingStore.destroy(sid, (err) => {
        if (err) {
          console.log(`[CachedSessionStore] Async session destroy error (non-blocking): ${err.message}`);
          if (err.message?.includes('timeout')) {
            this.openSyncCircuit('DB timeout on session destroy');
          }
        }
      });
    });
  }

  touch(sid: string, session: SessionData, callback?: (err?: any) => void): void {
    const cached = this.cache.get(sid);
    
    if (cached) {
      // Update cache with touched session
      cached.data = session;
      cached.dirty = true;
      callback?.();
    } else {
      // If circuit is open, just callback
      if (this.isSyncCircuitOpen()) {
        callback?.();
        return;
      }
      // No cache entry, just update backing store
      this.backingStore.touch?.(sid, session, callback) || callback?.();
    }
  }

  async close(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    // Only attempt final sync if circuit is closed
    if (!this.isSyncCircuitOpen()) {
      await this.syncDirtySessions();
    }
    console.log("[CachedSessionStore] Closed");
  }

  getStats(): { cacheSize: number; dirtyCount: number; circuitOpen: boolean } {
    let dirtyCount = 0;
    this.cache.forEach((cached) => {
      if (cached.dirty) dirtyCount++;
    });
    return {
      cacheSize: this.cache.size,
      dirtyCount,
      circuitOpen: this.syncCircuitOpen,
    };
  }
  
  isCircuitOpen(): boolean {
    return this.isSyncCircuitOpen();
  }
}

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

  private startSyncTimer(): void {
    if (this.syncTimer) return;
    
    this.syncTimer = setInterval(() => {
      this.syncDirtySessions().catch(err => {
        console.error("[CachedSessionStore] Error syncing dirty sessions:", err.message);
      });
      // Clean up stale cache entries after each sync
      this.cleanupCache();
    }, this.syncIntervalMs);
    
    // Don't let this timer keep the process alive
    this.syncTimer.unref();
  }

  private async syncDirtySessions(): Promise<void> {
    const dirtyEntries = Array.from(this.cache.entries()).filter(([, v]) => v.dirty);
    if (dirtyEntries.length === 0) return;

    const startTime = Date.now();
    let synced = 0;
    let errors = 0;

    for (const [sid, cached] of dirtyEntries) {
      try {
        await new Promise<void>((resolve, reject) => {
          this.backingStore.set(sid, cached.data, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        cached.dirty = false;
        cached.lastDbSync = Date.now();
        synced++;
      } catch (err: any) {
        errors++;
        console.error(`[CachedSessionStore] Failed to sync session ${sid.substring(0, 8)}...:`, err.message);
      }
    }

    const duration = Date.now() - startTime;
    if (synced > 0 || errors > 0) {
      console.log(`[CachedSessionStore] Synced ${synced} sessions, ${errors} errors in ${duration}ms`);
    }
  }

  // Clean up stale cache entries periodically
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

    // Otherwise, fetch from backing store
    this.backingStore.get(sid, (err, session) => {
      if (err) {
        // If we have stale cache and DB failed, use stale data
        if (cached) {
          console.warn(`[CachedSessionStore] DB read failed, using stale cache for ${sid.substring(0, 8)}...`);
          return callback(null, cached.data);
        }
        return callback(err);
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

    // Update cache immediately
    this.cache.set(sid, {
      data: session,
      lastDbSync: existing?.lastDbSync || 0, // Keep last sync time
      dirty: true, // Mark as needing sync
    });

    // If this is a new session or it's been a while since last DB write,
    // write immediately to ensure session persistence
    const shouldWriteImmediately = !existing || (now - (existing.lastDbSync || 0)) > this.syncIntervalMs;

    if (shouldWriteImmediately) {
      this.backingStore.set(sid, session, (err) => {
        if (!err) {
          const cached = this.cache.get(sid);
          if (cached) {
            cached.dirty = false;
            cached.lastDbSync = Date.now();
          }
        }
        callback?.(err);
      });
    } else {
      // Defer to background sync
      callback?.();
    }
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    // Remove from cache immediately
    this.cache.delete(sid);
    
    // Remove from backing store
    this.backingStore.destroy(sid, callback);
  }

  touch(sid: string, session: SessionData, callback?: (err?: any) => void): void {
    const cached = this.cache.get(sid);
    
    if (cached) {
      // Update cache with touched session
      cached.data = session;
      cached.dirty = true;
      callback?.();
    } else {
      // No cache entry, just update backing store
      this.backingStore.touch?.(sid, session, callback) || callback?.();
    }
  }

  // Cleanup method for graceful shutdown
  async close(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    // Final sync of dirty sessions
    await this.syncDirtySessions();
    console.log("[CachedSessionStore] Closed, final sync complete");
  }

  // Get cache stats for monitoring
  getStats(): { cacheSize: number; dirtyCount: number } {
    let dirtyCount = 0;
    this.cache.forEach((cached) => {
      if (cached.dirty) dirtyCount++;
    });
    return {
      cacheSize: this.cache.size,
      dirtyCount,
    };
  }
}

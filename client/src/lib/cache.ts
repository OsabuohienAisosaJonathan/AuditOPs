import localforage from 'localforage';

const CACHE_PREFIX = 'miaudit_cache';
const CACHE_VERSION = 1;
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: number;
}

const cacheStore = localforage.createInstance({
  name: 'miaudit-cache',
  storeName: 'api_cache',
  description: 'Cached API responses for offline support',
});

function generateCacheKey(organizationId: string | number, endpoint: string, params?: Record<string, unknown>): string {
  const paramsHash = params ? JSON.stringify(params) : '';
  return `${CACHE_PREFIX}:${organizationId}:${endpoint}:${paramsHash}`;
}

export async function getCached<T>(
  organizationId: string | number,
  endpoint: string,
  params?: Record<string, unknown>,
  maxAgeMs: number = DEFAULT_MAX_AGE_MS
): Promise<{ data: T; timestamp: number; isStale: boolean } | null> {
  try {
    const key = generateCacheKey(organizationId, endpoint, params);
    const entry = await cacheStore.getItem<CacheEntry<T>>(key);
    
    if (!entry || entry.version !== CACHE_VERSION) {
      return null;
    }
    
    const age = Date.now() - entry.timestamp;
    const isStale = age > maxAgeMs;
    
    return {
      data: entry.data,
      timestamp: entry.timestamp,
      isStale,
    };
  } catch (error) {
    console.warn('[Cache] Error reading from cache:', error);
    return null;
  }
}

export async function setCache<T>(
  organizationId: string | number,
  endpoint: string,
  data: T,
  params?: Record<string, unknown>
): Promise<void> {
  try {
    const key = generateCacheKey(organizationId, endpoint, params);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
    await cacheStore.setItem(key, entry);
  } catch (error) {
    console.warn('[Cache] Error writing to cache:', error);
  }
}

export async function clearCache(organizationId?: string | number): Promise<void> {
  try {
    if (organizationId) {
      const keys = await cacheStore.keys();
      const prefix = `${CACHE_PREFIX}:${organizationId}:`;
      await Promise.all(
        keys
          .filter(key => key.startsWith(prefix))
          .map(key => cacheStore.removeItem(key))
      );
    } else {
      await cacheStore.clear();
    }
  } catch (error) {
    console.warn('[Cache] Error clearing cache:', error);
  }
}

export async function getCacheTimestamp(
  organizationId: string | number,
  endpoint: string,
  params?: Record<string, unknown>
): Promise<number | null> {
  try {
    const key = generateCacheKey(organizationId, endpoint, params);
    const entry = await cacheStore.getItem<CacheEntry<unknown>>(key);
    return entry?.timestamp || null;
  } catch {
    return null;
  }
}

export function formatLastUpdated(timestamp: number | null): string {
  if (!timestamp) return '';
  
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useEffect, useState, useRef } from 'react';
import { getCached, setCache, formatLastUpdated } from './cache';
import { useAuth } from './auth-context';
import { useNetworkStatus } from './network-status';

interface CachedQueryResult<T> extends Omit<UseQueryResult<T>, 'data'> {
  data: T | undefined;
  cachedData: T | undefined;
  isUsingCache: boolean;
  lastUpdated: string;
  cacheTimestamp: number | null;
}

interface UseCachedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  cacheEndpoint?: string;
  cacheParams?: Record<string, unknown>;
  maxAgeMs?: number;
}

export function useCachedQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: UseCachedQueryOptions<T> = {}
): CachedQueryResult<T> {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const organizationId = user?.organizationId;
  const cacheEndpoint = options.cacheEndpoint || queryKey.join('/');
  
  const [cachedData, setCachedData] = useState<T | undefined>(undefined);
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);
  
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  useEffect(() => {
    if (!organizationId) return;
    
    getCached<T>(organizationId, cacheEndpoint, options.cacheParams, options.maxAgeMs)
      .then(result => {
        if (result) {
          setCachedData(result.data);
          setCacheTimestamp(result.timestamp);
        }
      });
  }, [organizationId, cacheEndpoint, options.cacheParams, options.maxAgeMs]);

  const query = useQuery<T>({
    queryKey,
    queryFn: async () => {
      const result = await queryFnRef.current();
      
      if (organizationId) {
        setCache(organizationId, cacheEndpoint, result, options.cacheParams);
        setCacheTimestamp(Date.now());
        setCachedData(result);
      }
      
      return result;
    },
    ...options,
    enabled: options.enabled !== false && isOnline,
  });

  const hasFreshData = query.data !== undefined;
  const showingCachedData = !hasFreshData && !!cachedData;
  const dataToShow = hasFreshData ? query.data : cachedData;

  return {
    ...query,
    data: dataToShow,
    cachedData,
    isUsingCache: showingCachedData,
    lastUpdated: formatLastUpdated(cacheTimestamp),
    cacheTimestamp,
  };
}

interface CacheStatusProps {
  isUsingCache: boolean;
  lastUpdated: string;
  isError?: boolean;
  className?: string;
}

export function CacheStatus({ 
  isUsingCache, 
  lastUpdated,
  isError,
  className 
}: CacheStatusProps) {
  if (!isUsingCache && !isError) return null;

  return (
    <div className={`text-xs text-muted-foreground ${className || ''}`} data-testid="cache-status">
      {isUsingCache && lastUpdated && (
        <span className="inline-flex items-center gap-1 text-amber-600">
          Showing cached data from {lastUpdated}
        </span>
      )}
      {isError && !isUsingCache && (
        <span className="text-amber-600">Unable to load latest data</span>
      )}
    </div>
  );
}

export function safeArray<T>(arr: T[] | undefined | null): T[] {
  return Array.isArray(arr) ? arr : [];
}

export function safeNumber(val: number | string | undefined | null, fallback = 0): number {
  if (val === undefined || val === null) return fallback;
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(num) ? fallback : num;
}

export function safeFormat(dateStr: string | undefined | null, formatFn: (d: Date) => string, fallback = 'N/A'): string {
  if (!dateStr) return fallback;
  try {
    return formatFn(new Date(dateStr));
  } catch {
    return fallback;
  }
}

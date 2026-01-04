import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { handle401Redirect, setQueryClientRef, attemptSilentRefresh, ApiError } from "./api";

const QUERY_TIMEOUT_MS = 12000; // 12 second timeout (matches api.ts)

function createTimeoutController(timeoutMs: number = QUERY_TIMEOUT_MS): { 
  controller: AbortController; 
  clear: () => void;
  isTimedOut: () => boolean;
} {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  
  return {
    controller,
    clear: () => clearTimeout(timeoutId),
    isTimedOut: () => timedOut,
  };
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const { controller, clear, isTimedOut } = createTimeoutController();
  
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: controller.signal,
    });
    
    clear();
    
    if (res.status === 401) {
      // Try to refresh session before giving up
      const refreshed = await attemptSilentRefresh();
      if (refreshed) {
        // Retry the request
        return apiRequest(method, url, data);
      }
      // Notify auth context of session expiration - no hard redirect
      handle401Redirect();
      // Throw error instead of hanging - let UI handle auth state
      throw new ApiError(401, "Session expired", { code: "SESSION_EXPIRED" });
    }
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    clear();
    if (error instanceof DOMException && error.name === "AbortError") {
      if (isTimedOut()) {
        throw new Error("Request timed out. Please try again.");
      }
      const cancelError = new Error("Request cancelled");
      (cancelError as any).isAborted = true;
      throw cancelError;
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

// Helper to make a single fetch attempt
async function makeFetchAttempt(
  queryKeyStr: string,
  requestId: string,
  controller: AbortController
): Promise<Response> {
  return fetch(queryKeyStr, {
    credentials: "include",
    signal: controller.signal,
    headers: {
      "X-Request-Id": requestId,
    },
  });
}

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal }) => {
    const queryKeyStr = queryKey.join("/");
    const { controller, clear, isTimedOut } = createTimeoutController();
    const startTime = Date.now();
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (signal) {
      signal.addEventListener('abort', () => {
        controller.abort();
        clear();
      });
    }
    
    try {
      let res = await makeFetchAttempt(queryKeyStr, requestId, controller);
      
      clear();
      
      const duration = Date.now() - startTime;
      if (duration > 3000) {
        console.warn(`[Query] Slow request: ${queryKeyStr} took ${duration}ms`);
      }

      if (res.status === 401) {
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
        
        // Try to refresh session before giving up
        const refreshed = await attemptSilentRefresh();
        if (refreshed) {
          // Retry the request with a new controller
          console.debug(`[Query] Retrying request after session refresh: ${queryKeyStr}`);
          const { controller: retryController, clear: retryClear } = createTimeoutController();
          try {
            res = await makeFetchAttempt(queryKeyStr, requestId + "-retry", retryController);
            retryClear();
            
            if (res.status === 401) {
              // Still 401 after refresh - notify auth context, no hard redirect
              handle401Redirect();
              throw new ApiError(401, "Session expired", { code: "SESSION_EXPIRED" });
            }
          } catch (retryError) {
            retryClear();
            throw retryError;
          }
        } else {
          // Refresh failed - notify auth context, no hard redirect
          handle401Redirect();
          throw new ApiError(401, "Session expired", { code: "SESSION_EXPIRED" });
        }
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      clear();
      
      if (error instanceof DOMException && error.name === "AbortError") {
        if (isTimedOut()) {
          console.error(`[Query] Timeout: ${queryKeyStr} exceeded ${QUERY_TIMEOUT_MS}ms`);
          throw new Error("Request timed out. Please try again.");
        }
        const cancelError = new Error("Request cancelled");
        (cancelError as any).isAborted = true;
        throw cancelError;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error) => {
        if (error instanceof Error && (error.message.includes("401") || error.message.includes("Unauthorized"))) {
          return false;
        }
        if (error instanceof Error && ((error as any).isAborted || error.message === "Request cancelled")) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(400 * 2 ** attemptIndex, 2000),
    },
    mutations: {
      retry: false,
    },
  },
});

setQueryClientRef(queryClient);

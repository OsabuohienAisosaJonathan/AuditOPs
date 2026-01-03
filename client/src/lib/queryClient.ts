import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { handle401Redirect, setQueryClientRef, ApiError } from "./api";

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
    if (res.status === 401) {
      handle401Redirect();
    }
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
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal }) => {
    const queryKeyStr = queryKey.join("/");
    const { controller, clear, isTimedOut } = createTimeoutController();
    const startTime = Date.now();
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // If React Query provides a signal (for cancellation), listen to it
    if (signal) {
      signal.addEventListener('abort', () => {
        controller.abort();
        clear();
      });
    }
    
    try {
      const res = await fetch(queryKeyStr as string, {
        credentials: "include",
        signal: controller.signal,
        headers: {
          "X-Request-Id": requestId,
        },
      });
      
      clear();
      
      const duration = Date.now() - startTime;
      if (duration > 3000) {
        console.warn(`[Query] Slow request: ${queryKeyStr} took ${duration}ms`);
      }

      if (res.status === 401) {
        if (unauthorizedBehavior === "returnNull") {
          return null;
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
        // Request was cancelled by React Query (component unmount, refetch, etc.)
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
        // Don't retry on auth errors
        if (error instanceof Error && (error.message.includes("401") || error.message.includes("Unauthorized"))) {
          return false;
        }
        // Don't retry cancelled requests
        if (error instanceof Error && ((error as any).isAborted || error.message === "Request cancelled")) {
          return false;
        }
        // Retry up to 2 times for other errors (including timeouts)
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(400 * 2 ** attemptIndex, 2000), // 400ms, 800ms
    },
    mutations: {
      retry: false,
    },
  },
});

// Set reference for 401 handling to clear cache
setQueryClientRef(queryClient);

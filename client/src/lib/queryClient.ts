import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { handle401Redirect, setQueryClientRef } from "./api";

const QUERY_TIMEOUT_MS = 10000; // 10 second timeout

function createTimeoutController(timeoutMs: number = QUERY_TIMEOUT_MS): { controller: AbortController; clear: () => void } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return {
    controller,
    clear: () => clearTimeout(timeoutId),
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
  const { controller, clear } = createTimeoutController();
  
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
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const { controller, clear } = createTimeoutController();
    const startTime = Date.now();
    
    try {
      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
        signal: controller.signal,
      });
      
      clear();
      
      const duration = Date.now() - startTime;
      if (duration > 3000) {
        console.warn(`[Query] Slow request: ${queryKey.join("/")} took ${duration}ms`);
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
        console.error(`[Query] Timeout: ${queryKey.join("/")} exceeded ${QUERY_TIMEOUT_MS}ms`);
        throw new Error("Request timed out. Please try again.");
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
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Set reference for 401 handling to clear cache
setQueryClientRef(queryClient);

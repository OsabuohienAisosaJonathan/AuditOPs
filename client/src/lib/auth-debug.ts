// Auth Debug Logger - Records auth events for debugging timeouts and race conditions
// Enable via URL param ?debugAuth=1 or by setting window.__DEBUG_AUTH = true

export type AuthEventType = 
  | "LOGIN_START" 
  | "LOGIN_OK" 
  | "LOGIN_FAIL"
  | "LOGOUT"
  | "REFRESH_START" 
  | "REFRESH_OK" 
  | "REFRESH_FAIL"
  | "VERIFY_START"
  | "VERIFY_OK"
  | "VERIFY_FAIL"
  | "POST_LOGIN_VERIFY"
  | "POST_LOGIN_VERIFY_OK"
  | "POST_LOGIN_VERIFY_FAIL"
  | "REDIRECT_LOGIN"
  | "SESSION_EXPIRED"
  | "SESSION_EXPIRED_CALLBACK"
  | "API_401"
  | "API_TIMEOUT"
  | "API_NETWORK_ERROR"
  | "API_ERROR"
  | "HEALTH_CHECK";

export interface AuthEvent {
  timestamp: string;
  eventType: AuthEventType;
  endpoint?: string;
  method?: string;
  status?: number | "TIMEOUT" | "NETWORK";
  message?: string;
  duration?: number;
}

const MAX_EVENTS = 200;
const events: AuthEvent[] = [];

function isDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  
  // Check URL param
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("debugAuth") === "1") return true;
  
  // Check global flag
  if ((window as any).__DEBUG_AUTH === true) return true;
  
  // Check env (for dev builds)
  if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_AUTH === "true") return true;
  
  return false;
}

export function logAuthEvent(
  eventType: AuthEventType,
  details?: {
    endpoint?: string;
    method?: string;
    status?: number | "TIMEOUT" | "NETWORK";
    message?: string;
    duration?: number;
  }
): void {
  const event: AuthEvent = {
    timestamp: new Date().toISOString(),
    eventType,
    ...details,
  };
  
  events.push(event);
  
  // Keep only last MAX_EVENTS
  if (events.length > MAX_EVENTS) {
    events.shift();
  }
  
  // Console log if debug enabled
  if (isDebugEnabled()) {
    const logParts = [
      `[AuthDebug] ${eventType}`,
      details?.endpoint && `endpoint=${details.endpoint}`,
      details?.method && `method=${details.method}`,
      details?.status && `status=${details.status}`,
      details?.duration && `duration=${details.duration}ms`,
      details?.message && `msg="${details.message}"`,
    ].filter(Boolean);
    
    console.log(logParts.join(" | "));
  }
}

export function getAuthEvents(): AuthEvent[] {
  return [...events];
}

export function clearAuthEvents(): void {
  events.length = 0;
}

export function getRecentFailures(): AuthEvent[] {
  return events.filter(e => 
    e.eventType.includes("FAIL") || 
    e.eventType.includes("TIMEOUT") || 
    e.eventType.includes("401") ||
    e.eventType.includes("ERROR")
  );
}

// Expose to window for debugging in console
if (typeof window !== "undefined") {
  (window as any).__authDebug = {
    getEvents: getAuthEvents,
    getFailures: getRecentFailures,
    clear: clearAuthEvents,
    enable: () => { (window as any).__DEBUG_AUTH = true; },
    disable: () => { (window as any).__DEBUG_AUTH = false; },
  };
}

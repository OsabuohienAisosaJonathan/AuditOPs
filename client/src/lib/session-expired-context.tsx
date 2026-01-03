import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface SessionExpiredContextType {
  isSessionExpired: boolean;
  returnUrl: string | null;
  setSessionExpired: (returnUrl?: string) => void;
  clearSessionExpired: () => void;
}

const SessionExpiredContext = createContext<SessionExpiredContextType | undefined>(undefined);

const RETURN_URL_KEY = "auth_return_url";

export function SessionExpiredProvider({ children }: { children: ReactNode }) {
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);

  const setSessionExpired = useCallback((url?: string) => {
    const currentPath = url || window.location.pathname + window.location.search;
    const publicPaths = ["/", "/login", "/signup", "/about", "/contact", "/setup", "/forgot-password", "/reset-password", "/check-email", "/verify-email"];
    
    if (!publicPaths.includes(window.location.pathname)) {
      setReturnUrl(currentPath);
      sessionStorage.setItem(RETURN_URL_KEY, currentPath);
    }
    setIsSessionExpired(true);
  }, []);

  const clearSessionExpired = useCallback(() => {
    setIsSessionExpired(false);
    setReturnUrl(null);
  }, []);

  return (
    <SessionExpiredContext.Provider value={{ isSessionExpired, returnUrl, setSessionExpired, clearSessionExpired }}>
      {children}
    </SessionExpiredContext.Provider>
  );
}

export function useSessionExpired() {
  const context = useContext(SessionExpiredContext);
  if (!context) {
    throw new Error("useSessionExpired must be used within SessionExpiredProvider");
  }
  return context;
}

export function getStoredReturnUrl(): string | null {
  return sessionStorage.getItem(RETURN_URL_KEY);
}

export function clearStoredReturnUrl(): void {
  sessionStorage.removeItem(RETURN_URL_KEY);
}

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { authApi, type User, resetRedirectState, setSessionExpiredCallback } from "./api";
import { logAuthEvent } from "./auth-debug";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  authError: string | null;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = useCallback(() => setAuthError(null), []);
  
  // Register callback for session expiration from API layer
  // This allows 401 errors to update auth state without hard redirects
  useEffect(() => {
    const handleSessionExpired = () => {
      logAuthEvent("SESSION_EXPIRED_CALLBACK", { message: "Session expired, clearing user state" });
      setUser(null);
      setAuthError(null); // Don't show error - just show login page
    };
    
    setSessionExpiredCallback(handleSessionExpired);
    
    return () => {
      setSessionExpiredCallback(null);
    };
  }, []);

  const refreshUser = useCallback(async () => {
    logAuthEvent("VERIFY_START", { endpoint: "/auth/me" });
    const startTime = Date.now();
    try {
      const userData = await authApi.me();
      const duration = Date.now() - startTime;
      logAuthEvent("VERIFY_OK", { endpoint: "/auth/me", duration, status: 200 });
      setUser(userData);
      setAuthError(null);
    } catch (err: any) {
      const duration = Date.now() - startTime;
      logAuthEvent("VERIFY_FAIL", { 
        endpoint: "/auth/me", 
        duration, 
        status: err.status || "ERROR",
        message: err.message 
      });
      // CRITICAL: If verify fails, user is NOT authenticated
      setUser(null);
      // Only set auth error if it's a genuine error (not just "not logged in")
      if (err.status !== 401) {
        setAuthError(err.isTimeout ? "timeout" : err.message || "Verification failed");
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const verifySession = async () => {
      logAuthEvent("VERIFY_START", { endpoint: "/auth/me", message: "Initial session check" });
      const startTime = Date.now();
      
      try {
        const userData = await authApi.me();
        const duration = Date.now() - startTime;
        
        if (mounted) {
          logAuthEvent("VERIFY_OK", { endpoint: "/auth/me", duration, status: 200 });
          setUser(userData);
          setAuthError(null);
        }
      } catch (err: any) {
        const duration = Date.now() - startTime;
        
        if (mounted) {
          logAuthEvent("VERIFY_FAIL", { 
            endpoint: "/auth/me", 
            duration, 
            status: err.status || "ERROR",
            message: err.message 
          });
          
          // Handle 503 (Service Unavailable) - don't clear user, show retry banner
          if (err.status === 503) {
            setAuthError("service_unavailable");
            // Don't clear user - keep existing session if any
          } else if (err.status === 401 || err.status === 403) {
            // User is not authenticated - clear state, don't show error
            setUser(null);
          } else {
            // Other errors (timeout, network) - clear user, show error
            setUser(null);
            setAuthError(err.isTimeout ? "timeout" : "network");
          }
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    verifySession();
    
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<User> => {
    logAuthEvent("LOGIN_START", { endpoint: "/auth/login", method: "POST" });
    const startTime = Date.now();
    
    try {
      const userData = await authApi.login(username, password);
      const duration = Date.now() - startTime;
      logAuthEvent("LOGIN_OK", { endpoint: "/auth/login", duration, status: 200 });
      
      // CRITICAL FIX: Wait a brief moment for session to fully persist to database
      // This prevents the race condition where /auth/me is called before session is saved
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify the session is actually working by calling /auth/me
      // This ensures the cookie is properly set and session is persisted
      try {
        logAuthEvent("POST_LOGIN_VERIFY", { message: "Verifying session after login" });
        const verifiedUser = await authApi.me();
        logAuthEvent("POST_LOGIN_VERIFY_OK", { message: `Session verified for user ${verifiedUser.id}` });
        setUser(verifiedUser);
      } catch (verifyErr: any) {
        // If verification fails, log it but still use the login response data
        // This is a fallback - the login response has the user data
        logAuthEvent("POST_LOGIN_VERIFY_FAIL", { 
          message: `${verifyErr.message} - Using login response data`,
          status: verifyErr.status,
        });
        setUser(userData);
      }
      
      setAuthError(null);
      resetRedirectState(); // Clear any redirect flags on successful login
      return userData;
    } catch (err: any) {
      const duration = Date.now() - startTime;
      logAuthEvent("LOGIN_FAIL", { 
        endpoint: "/auth/login", 
        duration, 
        status: err.status || "ERROR",
        message: err.message 
      });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    logAuthEvent("LOGOUT", { message: "User initiated logout" });
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors - we're clearing state anyway
    }
    setUser(null);
    setAuthError(null);
    resetRedirectState();
    // Clear all tenant-scoped localStorage data on logout
    if (typeof window !== "undefined") {
      localStorage.removeItem("selectedClientId");
      localStorage.removeItem("selectedCategoryId");
      localStorage.removeItem("selectedDepartmentId");
      localStorage.removeItem("selectedDate");
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, authError, login, logout, refreshUser, clearAuthError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

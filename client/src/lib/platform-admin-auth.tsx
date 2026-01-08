import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface PlatformAdmin {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface PlatformAdminAuthContextType {
  admin: PlatformAdmin | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const PlatformAdminAuthContext = createContext<PlatformAdminAuthContextType | undefined>(undefined);

export function PlatformAdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/owner/auth/me", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setAdmin(data);
      } else {
        setAdmin(null);
      }
    } catch {
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/owner/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Login failed");
    }

    const data = await response.json();
    setAdmin(data);
  };

  const logout = async () => {
    await fetch("/api/owner/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setAdmin(null);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <PlatformAdminAuthContext.Provider value={{ admin, isLoading, login, logout, checkAuth }}>
      {children}
    </PlatformAdminAuthContext.Provider>
  );
}

export function usePlatformAdminAuth() {
  const context = useContext(PlatformAdminAuthContext);
  if (!context) {
    throw new Error("usePlatformAdminAuth must be used within PlatformAdminAuthProvider");
  }
  return context;
}

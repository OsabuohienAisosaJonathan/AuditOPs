import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";

interface NavigationHistoryEntry {
  path: string;
  timestamp: number;
}

interface LayoutContextType {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
  currentPath: string;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

const SIDEBAR_STATE_KEY = "miemploya-sidebar-collapsed";
const NAV_HISTORY_KEY = "miemploya-nav-history";
const NAV_INDEX_KEY = "miemploya-nav-index";

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
    return stored === "true";
  });
  
  const [history, setHistory] = useState<NavigationHistoryEntry[]>(() => {
    try {
      const stored = sessionStorage.getItem(NAV_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  const [historyIndex, setHistoryIndex] = useState<number>(() => {
    try {
      const stored = sessionStorage.getItem(NAV_INDEX_KEY);
      return stored ? parseInt(stored, 10) : -1;
    } catch {
      return -1;
    }
  });

  const isNavigatingRef = useRef(false);
  const lastPathRef = useRef(location);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    localStorage.setItem(SIDEBAR_STATE_KEY, String(collapsed));
  }, []);

  useEffect(() => {
    if (location === "/" || location === "/setup") return;
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      lastPathRef.current = location;
      return;
    }
    if (location === lastPathRef.current) return;
    
    lastPathRef.current = location;
    
    setHistory(prev => {
      const newEntry: NavigationHistoryEntry = { path: location, timestamp: Date.now() };
      const truncated = prev.slice(0, historyIndex + 1);
      if (truncated.length > 0 && truncated[truncated.length - 1].path === location) {
        return truncated;
      }
      const updated = [...truncated, newEntry].slice(-50);
      sessionStorage.setItem(NAV_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
    
    setHistoryIndex(prev => {
      const newIndex = Math.min(prev + 1, 49);
      sessionStorage.setItem(NAV_INDEX_KEY, String(newIndex));
      return newIndex;
    });
  }, [location, historyIndex]);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const goBack = useCallback(() => {
    if (!canGoBack) return;
    const newIndex = historyIndex - 1;
    const entry = history[newIndex];
    if (entry) {
      isNavigatingRef.current = true;
      setHistoryIndex(newIndex);
      sessionStorage.setItem(NAV_INDEX_KEY, String(newIndex));
      setLocation(entry.path);
    }
  }, [canGoBack, historyIndex, history, setLocation]);

  const goForward = useCallback(() => {
    if (!canGoForward) return;
    const newIndex = historyIndex + 1;
    const entry = history[newIndex];
    if (entry) {
      isNavigatingRef.current = true;
      setHistoryIndex(newIndex);
      sessionStorage.setItem(NAV_INDEX_KEY, String(newIndex));
      setLocation(entry.path);
    }
  }, [canGoForward, historyIndex, history, setLocation]);

  return (
    <LayoutContext.Provider value={{
      sidebarCollapsed,
      setSidebarCollapsed,
      canGoBack,
      canGoForward,
      goBack,
      goForward,
      currentPath: location,
    }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within LayoutProvider");
  }
  return context;
}

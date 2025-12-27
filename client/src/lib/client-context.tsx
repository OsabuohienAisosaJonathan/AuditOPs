import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { clientsApi, outletsApi, Client, Outlet } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { format } from "date-fns";

interface ClientContextType {
  selectedClient: Client | null;
  selectedClientId: string | null;
  setSelectedClientId: (clientId: string | null) => void;
  clients: Client[];
  isLoading: boolean;
  
  selectedOutlet: Outlet | null;
  selectedOutletId: string | null;
  setSelectedOutletId: (outletId: string | null) => void;
  outlets: Outlet[];
  isLoadingOutlets: boolean;
  
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedClientId, setSelectedClientIdState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedClientId") || null;
    }
    return null;
  });
  
  const [selectedOutletId, setSelectedOutletIdState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedOutletId") || null;
    }
    return null;
  });
  
  const [selectedDate, setSelectedDateState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedDate") || format(new Date(), "yyyy-MM-dd");
    }
    return format(new Date(), "yyyy-MM-dd");
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: clientsApi.getAll,
    staleTime: 0,
    refetchOnWindowFocus: true,
    enabled: !!user,
  });

  const { data: outlets = [], isLoading: isLoadingOutlets } = useQuery({
    queryKey: ["outlets", selectedClientId],
    queryFn: () => selectedClientId ? outletsApi.getByClient(selectedClientId) : Promise.resolve([]),
    enabled: !!user && !!selectedClientId,
  });

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;
  const selectedOutlet = outlets.find((o) => o.id === selectedOutletId) || null;

  const setSelectedClientId = (clientId: string | null) => {
    setSelectedClientIdState(clientId);
    setSelectedOutletIdState(null);
    if (typeof window !== "undefined") {
      if (clientId) {
        localStorage.setItem("selectedClientId", clientId);
      } else {
        localStorage.removeItem("selectedClientId");
      }
      localStorage.removeItem("selectedOutletId");
    }
  };

  const setSelectedOutletId = (outletId: string | null) => {
    setSelectedOutletIdState(outletId);
    if (typeof window !== "undefined") {
      if (outletId) {
        localStorage.setItem("selectedOutletId", outletId);
      } else {
        localStorage.removeItem("selectedOutletId");
      }
    }
  };

  const setSelectedDate = (date: string) => {
    setSelectedDateState(date);
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedDate", date);
    }
  };

  useEffect(() => {
    if (selectedClientId && clients.length > 0 && !clients.find((c) => c.id === selectedClientId)) {
      setSelectedClientId(null);
    }
  }, [selectedClientId, clients]);

  useEffect(() => {
    if (selectedOutletId && outlets.length > 0 && !outlets.find((o) => o.id === selectedOutletId)) {
      setSelectedOutletId(null);
    }
  }, [selectedOutletId, outlets]);

  return (
    <ClientContext.Provider
      value={{
        selectedClient,
        selectedClientId,
        setSelectedClientId,
        clients,
        isLoading,
        selectedOutlet,
        selectedOutletId,
        setSelectedOutletId,
        outlets,
        isLoadingOutlets,
        selectedDate,
        setSelectedDate,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useClientContext() {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error("useClientContext must be used within a ClientProvider");
  }
  return context;
}

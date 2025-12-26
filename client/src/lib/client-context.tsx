import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { clientsApi, Client } from "@/lib/api";

interface ClientContextType {
  selectedClient: Client | null;
  selectedClientId: string | null;
  setSelectedClientId: (clientId: string | null) => void;
  clients: Client[];
  isLoading: boolean;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  const [selectedClientId, setSelectedClientIdState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedClientId") || null;
    }
    return null;
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: clientsApi.getAll,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

  const setSelectedClientId = (clientId: string | null) => {
    setSelectedClientIdState(clientId);
    if (typeof window !== "undefined") {
      if (clientId) {
        localStorage.setItem("selectedClientId", clientId);
      } else {
        localStorage.removeItem("selectedClientId");
      }
    }
  };

  useEffect(() => {
    if (selectedClientId && clients.length > 0 && !clients.find((c) => c.id === selectedClientId)) {
      setSelectedClientId(null);
    }
  }, [selectedClientId, clients]);

  return (
    <ClientContext.Provider
      value={{
        selectedClient,
        selectedClientId,
        setSelectedClientId,
        clients,
        isLoading,
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

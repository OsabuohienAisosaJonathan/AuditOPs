import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { clientsApi, categoriesApi, departmentsApi, Client, Category, Department } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { format } from "date-fns";
import { useCachedQuery } from "@/lib/useCachedQuery";

interface ClientContextType {
  selectedClient: Client | null;
  selectedClientId: string | null;
  setSelectedClientId: (clientId: string | null) => void;
  clients: Client[];
  isLoading: boolean;
  
  selectedCategory: Category | null;
  selectedCategoryId: string | null;
  setSelectedCategoryId: (categoryId: string | null) => void;
  categories: Category[];
  isLoadingCategories: boolean;
  
  selectedDepartment: Department | null;
  selectedDepartmentId: string | null;
  setSelectedDepartmentId: (departmentId: string | null) => void;
  departments: Department[];
  isLoadingDepartments: boolean;
  
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
  
  const [selectedCategoryId, setSelectedCategoryIdState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedCategoryId") || null;
    }
    return null;
  });
  
  const [selectedDepartmentId, setSelectedDepartmentIdState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedDepartmentId") || null;
    }
    return null;
  });
  
  const [selectedDate, setSelectedDateState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedDate") || format(new Date(), "yyyy-MM-dd");
    }
    return format(new Date(), "yyyy-MM-dd");
  });

  const { data: clientsData, isLoading: clientsQueryLoading } = useCachedQuery(
    ["clients"],
    clientsApi.getAll,
    { 
      cacheEndpoint: "clients",
      staleTime: 0,
      refetchOnWindowFocus: true,
      enabled: !!user,
    }
  );
  
  const clients = clientsData || [];
  const isLoading = clientsQueryLoading && clients.length === 0;

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ["categories", selectedClientId],
    queryFn: () => selectedClientId ? categoriesApi.getByClient(selectedClientId) : Promise.resolve([]),
    enabled: !!user && !!selectedClientId,
  });

  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery({
    queryKey: ["departments", selectedClientId],
    queryFn: () => selectedClientId ? departmentsApi.getByClient(selectedClientId) : Promise.resolve([]),
    enabled: !!user && !!selectedClientId,
  });

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) || null;
  const selectedDepartment = departments.find((d) => d.id === selectedDepartmentId) || null;

  const setSelectedClientId = (clientId: string | null) => {
    setSelectedClientIdState(clientId);
    setSelectedCategoryIdState(null);
    setSelectedDepartmentIdState(null);
    if (typeof window !== "undefined") {
      if (clientId) {
        localStorage.setItem("selectedClientId", clientId);
      } else {
        localStorage.removeItem("selectedClientId");
      }
      localStorage.removeItem("selectedCategoryId");
      localStorage.removeItem("selectedDepartmentId");
    }
  };

  const setSelectedCategoryId = (categoryId: string | null) => {
    setSelectedCategoryIdState(categoryId);
    setSelectedDepartmentIdState(null);
    if (typeof window !== "undefined") {
      if (categoryId) {
        localStorage.setItem("selectedCategoryId", categoryId);
      } else {
        localStorage.removeItem("selectedCategoryId");
      }
      localStorage.removeItem("selectedDepartmentId");
    }
  };

  const setSelectedDepartmentId = (departmentId: string | null) => {
    setSelectedDepartmentIdState(departmentId);
    if (typeof window !== "undefined") {
      if (departmentId) {
        localStorage.setItem("selectedDepartmentId", departmentId);
      } else {
        localStorage.removeItem("selectedDepartmentId");
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
    if (selectedCategoryId && categories.length > 0 && !categories.find((c) => c.id === selectedCategoryId)) {
      setSelectedCategoryId(null);
    }
  }, [selectedCategoryId, categories]);

  useEffect(() => {
    if (selectedDepartmentId && departments.length > 0 && !departments.find((d) => d.id === selectedDepartmentId)) {
      setSelectedDepartmentId(null);
    }
  }, [selectedDepartmentId, departments]);

  return (
    <ClientContext.Provider
      value={{
        selectedClient,
        selectedClientId,
        setSelectedClientId,
        clients,
        isLoading,
        selectedCategory,
        selectedCategoryId,
        setSelectedCategoryId,
        categories,
        isLoadingCategories,
        selectedDepartment,
        selectedDepartmentId,
        setSelectedDepartmentId,
        departments,
        isLoadingDepartments,
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

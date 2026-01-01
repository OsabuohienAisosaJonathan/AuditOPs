import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationSettingsApi, OrganizationSettings } from "./api";
import { toast } from "sonner";

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
  EUR: "€",
};

const CURRENCY_OPTIONS = [
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "EUR", symbol: "€", name: "Euro" },
];

interface CurrencyContextType {
  currency: string;
  symbol: string;
  setCurrency: (code: string) => void;
  formatMoney: (amount: number | string | null | undefined) => string;
  options: typeof CURRENCY_OPTIONS;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [localCurrency, setLocalCurrency] = useState(() => {
    return localStorage.getItem("currency") || "NGN";
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["organization-settings"],
    queryFn: organizationSettingsApi.get,
    staleTime: 1000 * 60 * 5,
  });

  const updateMutation = useMutation({
    mutationFn: (currency: string) => organizationSettingsApi.update({ currency }),
    onSuccess: (data) => {
      queryClient.setQueryData(["organization-settings"], data);
      toast.success("Currency saved");
    },
    onError: () => {
      toast.error("Failed to save currency");
    },
  });

  useEffect(() => {
    if (settings?.currency) {
      setLocalCurrency(settings.currency);
      localStorage.setItem("currency", settings.currency);
    }
  }, [settings?.currency]);

  const setCurrency = useCallback((code: string) => {
    setLocalCurrency(code);
    localStorage.setItem("currency", code);
    updateMutation.mutate(code);
  }, [updateMutation]);

  const symbol = CURRENCY_SYMBOLS[localCurrency] || "₦";

  const formatMoney = useCallback((amount: number | string | null | undefined): string => {
    if (amount === null || amount === undefined) return `${symbol}0.00`;
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(num)) return `${symbol}0.00`;
    return `${symbol}${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [symbol]);

  return (
    <CurrencyContext.Provider value={{
      currency: localCurrency,
      symbol,
      setCurrency,
      formatMoney,
      options: CURRENCY_OPTIONS,
      isLoading,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}

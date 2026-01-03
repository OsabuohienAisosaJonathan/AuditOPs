import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./auth-context";
import { LockedFeatureModal } from "@/components/LockedFeatureModal";

export interface Entitlements {
  maxClients: number;
  maxSrdDepartmentsPerClient: number;
  maxMainStorePerClient: number;
  maxSeats: number;
  retentionDays: number;
  canViewReports: boolean;
  canDownloadReports: boolean;
  canPrintReports: boolean;
  canAccessPurchasesRegisterPage: boolean;
  canAccessSecondHitPage: boolean;
  canDownloadSecondHitFullTable: boolean;
  canDownloadMainStoreLedgerSummary: boolean;
  canUseBetaFeatures: boolean;
  clientsUsed: number;
  currencyCode: string;
  subscription: {
    id: string;
    planName: string;
    billingPeriod: string;
    slotsPurchased: number;
    status: string;
    startDate: string;
    endDate: string | null;
  } | null;
}

interface EntitlementsContextType {
  entitlements: Entitlements | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  showLockedModal: (feature: string, requiredPlan?: string, description?: string) => void;
  checkAndShowLocked: (feature: keyof Pick<Entitlements, 'canDownloadReports' | 'canPrintReports' | 'canAccessPurchasesRegisterPage' | 'canAccessSecondHitPage' | 'canDownloadSecondHitFullTable' | 'canDownloadMainStoreLedgerSummary' | 'canUseBetaFeatures'>, featureLabel: string, requiredPlan?: string) => boolean;
}

const defaultEntitlements: Entitlements = {
  maxClients: 1,
  maxSrdDepartmentsPerClient: 4,
  maxMainStorePerClient: 1,
  maxSeats: 2,
  retentionDays: 30,
  canViewReports: true,
  canDownloadReports: false,
  canPrintReports: false,
  canAccessPurchasesRegisterPage: false,
  canAccessSecondHitPage: false,
  canDownloadSecondHitFullTable: false,
  canDownloadMainStoreLedgerSummary: false,
  canUseBetaFeatures: false,
  clientsUsed: 0,
  currencyCode: "NGN",
  subscription: null,
};

const EntitlementsContext = createContext<EntitlementsContextType | undefined>(undefined);

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lockedModalOpen, setLockedModalOpen] = useState(false);
  const [lockedFeature, setLockedFeature] = useState({ feature: "", requiredPlan: "Growth", description: "" });

  const refresh = async () => {
    if (!user) {
      setEntitlements(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/subscription/entitlements", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setEntitlements(data);
      } else {
        setEntitlements(defaultEntitlements);
      }
    } catch (error) {
      console.error("Failed to fetch entitlements:", error);
      setEntitlements(defaultEntitlements);
    } finally {
      setIsLoading(false);
    }
  };

  const showLockedModal = (feature: string, requiredPlan = "Growth", description = "") => {
    setLockedFeature({ feature, requiredPlan, description });
    setLockedModalOpen(true);
  };

  const checkAndShowLocked = (
    feature: keyof Pick<Entitlements, 'canDownloadReports' | 'canPrintReports' | 'canAccessPurchasesRegisterPage' | 'canAccessSecondHitPage' | 'canDownloadSecondHitFullTable' | 'canDownloadMainStoreLedgerSummary' | 'canUseBetaFeatures'>,
    featureLabel: string,
    requiredPlan = "Growth"
  ): boolean => {
    // If still loading or no entitlements data, allow access (fail-open for better UX)
    // Server-side enforcement is the authoritative check
    if (isLoading || !entitlements) {
      return true;
    }
    
    if (!entitlements[feature]) {
      showLockedModal(featureLabel, requiredPlan);
      return false;
    }
    return true;
  };

  useEffect(() => {
    refresh();
  }, [user]);

  return (
    <EntitlementsContext.Provider value={{ entitlements, isLoading, refresh, showLockedModal, checkAndShowLocked }}>
      {children}
      <LockedFeatureModal
        open={lockedModalOpen}
        onOpenChange={setLockedModalOpen}
        feature={lockedFeature.feature}
        requiredPlan={lockedFeature.requiredPlan}
        description={lockedFeature.description}
      />
    </EntitlementsContext.Provider>
  );
}

export function useEntitlements() {
  const context = useContext(EntitlementsContext);
  if (!context) {
    throw new Error("useEntitlements must be used within EntitlementsProvider");
  }
  return context;
}

export function formatCurrency(amount: number, currencyCode: string = "NGN"): string {
  const formatter = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
}

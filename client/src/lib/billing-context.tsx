import { createContext, useContext, ReactNode, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { billingApi, type BillingPlan } from "./api";
import { useAuth } from "./auth-context";
import { LockedFeatureModal } from "@/components/LockedFeatureModal";

interface BillingContextType {
  billingData: BillingPlan | null;
  isLoading: boolean;
  canDownloadReports: boolean;
  canExportData: boolean;
  canAccessApi: boolean;
  canCustomBranding: boolean;
  checkFeature: (feature: string, requiredPlan?: string) => boolean;
  showLockedModal: (feature: string, requiredPlan?: string, description?: string) => void;
}

const BillingContext = createContext<BillingContextType | null>(null);

export function BillingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lockedModalOpen, setLockedModalOpen] = useState(false);
  const [lockedFeature, setLockedFeature] = useState({ feature: "", requiredPlan: "Growth", description: "" });

  const { data: billingData, isLoading } = useQuery({
    queryKey: ["billing-plan"],
    queryFn: billingApi.getPlan,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const canDownloadReports = billingData?.entitlements?.canDownloadReports ?? true;
  const canExportData = billingData?.entitlements?.canExportData ?? true;
  const canAccessApi = billingData?.entitlements?.canAccessApi ?? false;
  const canCustomBranding = billingData?.entitlements?.canCustomBranding ?? false;

  const checkFeature = (feature: string, requiredPlan?: string): boolean => {
    switch (feature) {
      case "reports":
        return canDownloadReports;
      case "exports":
        return canExportData;
      case "api":
        return canAccessApi;
      case "branding":
        return canCustomBranding;
      default:
        return true;
    }
  };

  const showLockedModal = (feature: string, requiredPlan = "Growth", description = "") => {
    setLockedFeature({ feature, requiredPlan, description });
    setLockedModalOpen(true);
  };

  return (
    <BillingContext.Provider
      value={{
        billingData: billingData ?? null,
        isLoading,
        canDownloadReports,
        canExportData,
        canAccessApi,
        canCustomBranding,
        checkFeature,
        showLockedModal,
      }}
    >
      {children}
      <LockedFeatureModal
        open={lockedModalOpen}
        onOpenChange={setLockedModalOpen}
        feature={lockedFeature.feature}
        requiredPlan={lockedFeature.requiredPlan}
        description={lockedFeature.description}
      />
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error("useBilling must be used within a BillingProvider");
  }
  return context;
}

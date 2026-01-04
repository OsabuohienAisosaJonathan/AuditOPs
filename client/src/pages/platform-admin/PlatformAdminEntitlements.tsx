import { PlatformAdminLayout } from "@/components/platform-admin/PlatformAdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, XCircle, Shield } from "lucide-react";

const PLAN_FEATURES = {
  starter: {
    maxClients: 1,
    maxSrdDepartmentsPerClient: 4,
    maxSeats: 2,
    retentionDays: 30,
    canDownloadReports: false,
    canPrintReports: false,
    canAccessPurchasesRegisterPage: false,
    canAccessSecondHitPage: false,
    canDownloadSecondHitFullTable: false,
    canDownloadMainStoreLedgerSummary: false,
    canUseBetaFeatures: false,
  },
  growth: {
    maxClients: 3,
    maxSrdDepartmentsPerClient: 7,
    maxSeats: 5,
    retentionDays: 90,
    canDownloadReports: true,
    canPrintReports: true,
    canAccessPurchasesRegisterPage: true,
    canAccessSecondHitPage: false,
    canDownloadSecondHitFullTable: false,
    canDownloadMainStoreLedgerSummary: false,
    canUseBetaFeatures: false,
  },
  business: {
    maxClients: 5,
    maxSrdDepartmentsPerClient: 12,
    maxSeats: 12,
    retentionDays: 365,
    canDownloadReports: true,
    canPrintReports: true,
    canAccessPurchasesRegisterPage: true,
    canAccessSecondHitPage: true,
    canDownloadSecondHitFullTable: true,
    canDownloadMainStoreLedgerSummary: true,
    canUseBetaFeatures: false,
  },
  enterprise: {
    maxClients: 10,
    maxSrdDepartmentsPerClient: 999,
    maxSeats: 999,
    retentionDays: 9999,
    canDownloadReports: true,
    canPrintReports: true,
    canAccessPurchasesRegisterPage: true,
    canAccessSecondHitPage: true,
    canDownloadSecondHitFullTable: true,
    canDownloadMainStoreLedgerSummary: true,
    canUseBetaFeatures: true,
  },
};

const FEATURE_LABELS: Record<string, string> = {
  maxClients: "Max Clients",
  maxSrdDepartmentsPerClient: "Max SRD Departments/Client",
  maxSeats: "Max Seats (Users)",
  retentionDays: "Data Retention (Days)",
  canDownloadReports: "Download Reports",
  canPrintReports: "Print Reports",
  canAccessPurchasesRegisterPage: "Purchases Register Page",
  canAccessSecondHitPage: "Second Hit Page",
  canDownloadSecondHitFullTable: "Download Second Hit Full Table",
  canDownloadMainStoreLedgerSummary: "Download Main Store Ledger Summary",
  canUseBetaFeatures: "Beta Features Access",
};

export default function PlatformAdminEntitlements() {
  const plans = ["starter", "growth", "business", "enterprise"] as const;
  const features = Object.keys(FEATURE_LABELS);

  const renderValue = (value: number | boolean) => {
    if (typeof value === "boolean") {
      return value ? (
        <CheckCircle className="w-5 h-5 text-green-500" />
      ) : (
        <XCircle className="w-5 h-5 text-slate-300" />
      );
    }
    return <span className="font-medium">{value === 999 || value === 9999 ? "Unlimited" : value}</span>;
  };

  const getPlanColor = (plan: string) => {
    const colors: Record<string, string> = {
      starter: "bg-slate-100 text-slate-700 border-slate-200",
      growth: "bg-blue-100 text-blue-700 border-blue-200",
      business: "bg-purple-100 text-purple-700 border-purple-200",
      enterprise: "bg-amber-100 text-amber-700 border-amber-200",
    };
    return colors[plan] || colors.starter;
  };

  return (
    <PlatformAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Entitlements & Features</h1>
          <p className="text-slate-500">View feature access by subscription plan</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <Card key={plan} className={`border-2 ${getPlanColor(plan)}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  {plan.charAt(0).toUpperCase() + plan.slice(1)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Clients:</span>
                    <Badge variant="secondary">{PLAN_FEATURES[plan].maxClients}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>SRDs/Client:</span>
                    <Badge variant="secondary">
                      {PLAN_FEATURES[plan].maxSrdDepartmentsPerClient === 999 
                        ? "Unlimited" 
                        : PLAN_FEATURES[plan].maxSrdDepartmentsPerClient}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Seats:</span>
                    <Badge variant="secondary">
                      {PLAN_FEATURES[plan].maxSeats === 999 
                        ? "Unlimited" 
                        : PLAN_FEATURES[plan].maxSeats}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Feature Comparison</CardTitle>
            <CardDescription>Complete breakdown of features by plan</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Feature</TableHead>
                  {plans.map((plan) => (
                    <TableHead key={plan} className="text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPlanColor(plan)}`}>
                        {plan.toUpperCase()}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {features.map((feature) => (
                  <TableRow key={feature} data-testid={`feature-row-${feature}`}>
                    <TableCell className="font-medium">
                      {FEATURE_LABELS[feature]}
                    </TableCell>
                    {plans.map((plan) => (
                      <TableCell key={plan} className="text-center">
                        {renderValue(PLAN_FEATURES[plan][feature as keyof typeof PLAN_FEATURES.starter])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PlatformAdminLayout>
  );
}

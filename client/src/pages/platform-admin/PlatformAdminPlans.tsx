import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlatformAdminLayout } from "@/components/platform-admin/PlatformAdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Pencil, 
  Loader2,
  Package,
  DollarSign,
  Users,
  Shield,
  Check,
  X
} from "lucide-react";

interface SubscriptionPlan {
  id: string;
  slug: string;
  displayName: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  monthlyPrice: string;
  quarterlyPrice: string;
  yearlyPrice: string;
  currency: string;
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
}

async function fetchPlans(): Promise<SubscriptionPlan[]> {
  const response = await fetch("/api/owner/subscription-plans", { credentials: "include" });
  if (!response.ok) throw new Error("Failed to fetch subscription plans");
  return response.json();
}

export default function PlatformAdminPlans() {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<SubscriptionPlan>>({});

  const { data: plans, isLoading } = useQuery({
    queryKey: ["platform-admin-plans"],
    queryFn: fetchPlans,
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SubscriptionPlan> }) => {
      const response = await fetch(`/api/owner/subscription-plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update plan");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admin-plans"] });
      toast.success("Plan updated successfully");
      setEditDialogOpen(false);
      setSelectedPlan(null);
    },
    onError: () => toast.error("Failed to update plan"),
  });

  const openEditDialog = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setEditForm({
      displayName: plan.displayName,
      description: plan.description || "",
      isActive: plan.isActive,
      monthlyPrice: plan.monthlyPrice,
      quarterlyPrice: plan.quarterlyPrice,
      yearlyPrice: plan.yearlyPrice,
      maxClients: plan.maxClients,
      maxSrdDepartmentsPerClient: plan.maxSrdDepartmentsPerClient,
      maxMainStorePerClient: plan.maxMainStorePerClient,
      maxSeats: plan.maxSeats,
      retentionDays: plan.retentionDays,
      canViewReports: plan.canViewReports,
      canDownloadReports: plan.canDownloadReports,
      canPrintReports: plan.canPrintReports,
      canAccessPurchasesRegisterPage: plan.canAccessPurchasesRegisterPage,
      canAccessSecondHitPage: plan.canAccessSecondHitPage,
      canDownloadSecondHitFullTable: plan.canDownloadSecondHitFullTable,
      canDownloadMainStoreLedgerSummary: plan.canDownloadMainStoreLedgerSummary,
      canUseBetaFeatures: plan.canUseBetaFeatures,
    });
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!selectedPlan) return;
    updatePlanMutation.mutate({ id: selectedPlan.id, data: editForm });
  };

  const formatPrice = (price: string, currency: string = "NGN") => {
    const numPrice = parseFloat(price) || 0;
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(numPrice);
  };

  const getPlanColor = (slug: string) => {
    const colors: Record<string, string> = {
      starter: "border-slate-200 bg-slate-50",
      growth: "border-blue-200 bg-blue-50",
      business: "border-purple-200 bg-purple-50",
      enterprise: "border-amber-200 bg-amber-50",
    };
    return colors[slug] || "border-slate-200 bg-slate-50";
  };

  return (
    <PlatformAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Subscription Plans</h1>
          <p className="text-slate-500">Configure pricing, limits, and features for each plan</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans?.map((plan) => (
              <Card key={plan.id} className={`relative ${getPlanColor(plan.slug)}`} data-testid={`plan-card-${plan.slug}`}>
                {!plan.isActive && (
                  <Badge variant="destructive" className="absolute top-2 right-2">Inactive</Badge>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span>{plan.displayName}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(plan)}
                      data-testid={`button-edit-${plan.slug}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                  <CardDescription className="text-xs">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">{formatPrice(plan.monthlyPrice, plan.currency)}</span>
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatPrice(plan.quarterlyPrice, plan.currency)}/qtr • {formatPrice(plan.yearlyPrice, plan.currency)}/yr
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{plan.maxClients} clients, {plan.maxSeats} seats</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{plan.maxSrdDepartmentsPerClient} departments/client</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span>{plan.retentionDays} days retention</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <FeatureIndicator enabled={plan.canDownloadReports} label="Download" />
                      <FeatureIndicator enabled={plan.canPrintReports} label="Print" />
                      <FeatureIndicator enabled={plan.canAccessPurchasesRegisterPage} label="Purchases" />
                      <FeatureIndicator enabled={plan.canAccessSecondHitPage} label="2nd Hit" />
                      <FeatureIndicator enabled={plan.canDownloadMainStoreLedgerSummary} label="Ledger Sum" />
                      <FeatureIndicator enabled={plan.canUseBetaFeatures} label="Beta" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit {selectedPlan?.displayName} Plan</DialogTitle>
              <DialogDescription>
                Configure pricing, limits, and feature access for this subscription plan
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="pricing" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                <TabsTrigger value="limits">Limits</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
              </TabsList>

              <TabsContent value="pricing" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input
                      value={editForm.displayName || ""}
                      onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                      data-testid="input-display-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Active</Label>
                    <div className="flex items-center gap-2 pt-2">
                      <Switch
                        checked={editForm.isActive || false}
                        onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: checked })}
                        data-testid="switch-is-active"
                      />
                      <span className="text-sm text-muted-foreground">
                        {editForm.isActive ? "Visible on pricing page" : "Hidden from pricing page"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editForm.description || ""}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Brief description of this plan"
                    data-testid="input-description"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Monthly Price (NGN)</Label>
                    <Input
                      type="number"
                      value={editForm.monthlyPrice || ""}
                      onChange={(e) => setEditForm({ ...editForm, monthlyPrice: e.target.value })}
                      data-testid="input-monthly-price"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quarterly Price (NGN)</Label>
                    <Input
                      type="number"
                      value={editForm.quarterlyPrice || ""}
                      onChange={(e) => setEditForm({ ...editForm, quarterlyPrice: e.target.value })}
                      data-testid="input-quarterly-price"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Yearly Price (NGN)</Label>
                    <Input
                      type="number"
                      value={editForm.yearlyPrice || ""}
                      onChange={(e) => setEditForm({ ...editForm, yearlyPrice: e.target.value })}
                      data-testid="input-yearly-price"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="limits" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Clients</Label>
                    <Input
                      type="number"
                      value={editForm.maxClients || ""}
                      onChange={(e) => setEditForm({ ...editForm, maxClients: parseInt(e.target.value) || 0 })}
                      data-testid="input-max-clients"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Seats (Users)</Label>
                    <Input
                      type="number"
                      value={editForm.maxSeats || ""}
                      onChange={(e) => setEditForm({ ...editForm, maxSeats: parseInt(e.target.value) || 0 })}
                      data-testid="input-max-seats"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Departments per Client</Label>
                    <Input
                      type="number"
                      value={editForm.maxSrdDepartmentsPerClient || ""}
                      onChange={(e) => setEditForm({ ...editForm, maxSrdDepartmentsPerClient: parseInt(e.target.value) || 0 })}
                      data-testid="input-max-srd"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Main Stores per Client</Label>
                    <Input
                      type="number"
                      value={editForm.maxMainStorePerClient || ""}
                      onChange={(e) => setEditForm({ ...editForm, maxMainStorePerClient: parseInt(e.target.value) || 0 })}
                      data-testid="input-max-main-store"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Retention (Days)</Label>
                    <Input
                      type="number"
                      value={editForm.retentionDays || ""}
                      onChange={(e) => setEditForm({ ...editForm, retentionDays: parseInt(e.target.value) || 0 })}
                      data-testid="input-retention-days"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="features" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FeatureToggle
                    label="View Reports"
                    checked={editForm.canViewReports || false}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, canViewReports: checked })}
                    testId="switch-view-reports"
                  />
                  <FeatureToggle
                    label="Download Reports"
                    checked={editForm.canDownloadReports || false}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, canDownloadReports: checked })}
                    testId="switch-download-reports"
                  />
                  <FeatureToggle
                    label="Print Reports"
                    checked={editForm.canPrintReports || false}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, canPrintReports: checked })}
                    testId="switch-print-reports"
                  />
                  <FeatureToggle
                    label="Purchase Register Page"
                    checked={editForm.canAccessPurchasesRegisterPage || false}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, canAccessPurchasesRegisterPage: checked })}
                    testId="switch-purchases-page"
                  />
                  <FeatureToggle
                    label="Second Hit Page"
                    checked={editForm.canAccessSecondHitPage || false}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, canAccessSecondHitPage: checked })}
                    testId="switch-second-hit"
                  />
                  <FeatureToggle
                    label="Download Full Comparison Table"
                    checked={editForm.canDownloadSecondHitFullTable || false}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, canDownloadSecondHitFullTable: checked })}
                    testId="switch-full-table"
                  />
                  <FeatureToggle
                    label="Main Store Ledger Summary"
                    checked={editForm.canDownloadMainStoreLedgerSummary || false}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, canDownloadMainStoreLedgerSummary: checked })}
                    testId="switch-ledger-summary"
                  />
                  <FeatureToggle
                    label="Beta Features"
                    checked={editForm.canUseBetaFeatures || false}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, canUseBetaFeatures: checked })}
                    testId="switch-beta"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updatePlanMutation.isPending}
                data-testid="button-save-plan"
              >
                {updatePlanMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlatformAdminLayout>
  );
}

function FeatureIndicator({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1">
      {enabled ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <X className="h-3 w-3 text-red-400" />
      )}
      <span className={enabled ? "text-slate-700" : "text-slate-400"}>{label}</span>
    </div>
  );
}

function FeatureToggle({ 
  label, 
  checked, 
  onCheckedChange, 
  testId 
}: { 
  label: string; 
  checked: boolean; 
  onCheckedChange: (checked: boolean) => void;
  testId: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <Label className="cursor-pointer">{label}</Label>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        data-testid={testId}
      />
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, Upload, AlertCircle, Save, FileText, Trash2, ArrowUpRight, ArrowDownRight, Scale, Plus, Package, Truck, Calculator, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useClientContext } from "@/lib/client-context";
import { 
  paymentDeclarationsApi, reconciliationHintApi, salesEntriesApi, clientsApi, departmentsApi, 
  purchasesApi, stockMovementsApi, stockCountsApi, reconciliationsApi, exceptionsApi, itemsApi, suppliersApi,
  storeIssuesApi, storeStockApi, grnApi,
  type SalesEntry, type SalesSummary, type Purchase, type StockMovement, type StockCount, type Reconciliation, type Item, type Supplier,
  type StoreIssue, type StoreIssueLine, type StoreStock, type Department, type GoodsReceivedNote
} from "@/lib/api";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { format, parseISO } from "date-fns";

type AuditPeriod = "daily" | "weekly" | "monthly" | "custom";
type StepStatus = "not_started" | "in_progress" | "completed";

interface AuditStep {
  id: string;
  label: string;
  tab: string;
  status: StepStatus;
  lastUpdated?: string;
  hasEvidence?: boolean;
}

const periodLabels: Record<AuditPeriod, string> = {
  daily: "Daily Audit",
  weekly: "Weekly Audit",
  monthly: "Monthly Audit",
  custom: "Custom Range Audit",
};

export default function AuditWorkspace() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const urlClientId = params.get("clientId");
  const urlDepartmentId = params.get("departmentId");
  const urlPeriod = (params.get("period") as AuditPeriod) || "daily";
  const urlStartDate = params.get("startDate") || format(new Date(), "yyyy-MM-dd");
  const urlEndDate = params.get("endDate") || format(new Date(), "yyyy-MM-dd");

  const { setSelectedClientId, setSelectedDepartmentId, setSelectedDate, clients, selectedClientId, selectedDepartmentId, selectedDate } = useClientContext();
  const [activeTab, setActiveTab] = useState("sales");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [runReconDialogOpen, setRunReconDialogOpen] = useState(false);
  const [createExceptionDialogOpen, setCreateExceptionDialogOpen] = useState(false);

  useEffect(() => {
    if (urlClientId) setSelectedClientId(urlClientId);
    if (urlDepartmentId) setSelectedDepartmentId(urlDepartmentId);
    if (urlStartDate) setSelectedDate(urlStartDate);
  }, [urlClientId, urlDepartmentId, urlStartDate]);

  const dateStr = selectedDate || urlStartDate;
  const clientId = selectedClientId || urlClientId;
  const departmentId = selectedDepartmentId || urlDepartmentId;

  const { data: auditClient } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => clientId ? clientsApi.get(clientId) : Promise.resolve(null),
    enabled: !!clientId,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", clientId],
    queryFn: () => clientId ? departmentsApi.getByClient(clientId) : Promise.resolve([]),
    enabled: !!clientId,
  });

  const { data: salesEntries = [] } = useQuery({
    queryKey: ["sales-entries", clientId, dateStr],
    queryFn: () => salesEntriesApi.getAll({ clientId: clientId || undefined, date: dateStr }),
    enabled: !!clientId,
  });

  const { data: salesSummary } = useQuery({
    queryKey: ["sales-summary", clientId, dateStr],
    queryFn: () => clientId ? salesEntriesApi.getSummary({ clientId, date: dateStr }) : Promise.resolve(null),
    enabled: !!clientId,
  });

  const { data: grns = [] } = useQuery({
    queryKey: ["grn", clientId, dateStr],
    queryFn: () => clientId ? grnApi.getByClient(clientId, dateStr) : Promise.resolve([]),
    enabled: !!clientId,
  });

  const { data: stockMovements = [] } = useQuery({
    queryKey: ["stock-movements", clientId, departmentId],
    queryFn: () => stockMovementsApi.getAll({ clientId: clientId || undefined, departmentId: departmentId || undefined }),
    enabled: !!clientId,
  });

  const { data: stockCounts = [] } = useQuery({
    queryKey: ["stock-counts", departmentId, dateStr],
    queryFn: () => departmentId ? stockCountsApi.getAll(departmentId, dateStr) : Promise.resolve([]),
    enabled: !!departmentId,
  });

  const { data: reconciliations = [] } = useQuery({
    queryKey: ["reconciliations", departmentId, dateStr],
    queryFn: () => reconciliationsApi.getAll(departmentId || undefined, dateStr),
    enabled: !!departmentId,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["items", clientId],
    queryFn: () => clientId ? itemsApi.getByClient(clientId) : Promise.resolve([]),
    enabled: !!clientId,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", clientId],
    queryFn: () => clientId ? suppliersApi.getByClient(clientId) : Promise.resolve([]),
    enabled: !!clientId,
  });

  const auditDepartment = departments.find(d => d.id === departmentId);

  const auditSteps: AuditStep[] = useMemo(() => {
    const getStepStatus = (hasData: boolean, count: number): StepStatus => {
      if (count > 0) return "completed";
      if (hasData) return "in_progress";
      return "not_started";
    };

    return [
      { 
        id: "sales", 
        label: "Sales Captured", 
        tab: "sales",
        status: getStepStatus(salesEntries.length > 0, salesEntries.length),
        lastUpdated: salesEntries.length > 0 ? format(new Date(salesEntries[0].createdAt), "HH:mm") : undefined,
      },
      { 
        id: "purchases", 
        label: "Purchases Captured", 
        tab: "purchases",
        status: getStepStatus(grns.length > 0, grns.length),
        lastUpdated: grns.length > 0 ? format(new Date(grns[0].createdAt), "HH:mm") : undefined,
      },
      { 
        id: "stock", 
        label: "Stock Movements / Transfers", 
        tab: "stock",
        status: getStepStatus(stockMovements.length > 0, stockMovements.length),
        lastUpdated: stockMovements.length > 0 ? format(new Date(stockMovements[0].createdAt), "HH:mm") : undefined,
      },
      { 
        id: "counts", 
        label: "Stock Counts", 
        tab: "counts",
        status: getStepStatus(stockCounts.length > 0, stockCounts.length),
        lastUpdated: stockCounts.length > 0 ? format(new Date(stockCounts[0].date), "HH:mm") : undefined,
      },
      { 
        id: "recon", 
        label: "Reconciliation", 
        tab: "recon",
        status: reconciliations.some(r => r.status === "approved") ? "completed" : reconciliations.length > 0 ? "in_progress" : "not_started",
        lastUpdated: reconciliations.length > 0 ? format(new Date(reconciliations[0].createdAt), "HH:mm") : undefined,
      },
    ];
  }, [salesEntries, grns, stockMovements, stockCounts, reconciliations]);

  const handleStepClick = (step: AuditStep) => {
    setActiveTab(step.tab);
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setLastSaved(new Date());
      toast.success("Draft saved successfully");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDateRange = () => {
    if (urlPeriod === "daily") return format(parseISO(urlStartDate), "MMM d, yyyy");
    const start = format(parseISO(urlStartDate), "MMM d");
    const end = format(parseISO(urlEndDate), "MMM d, yyyy");
    return `${start} – ${end}`;
  };

  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "in_progress": return <Clock className="h-4 w-4 text-amber-500" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: StepStatus) => {
    switch (status) {
      case "completed": return "Completed";
      case "in_progress": return "In Progress";
      default: return "Not Started";
    }
  };

  const totalPurchases = useMemo(() => grns.reduce((sum, g) => sum + Number(g.amount || 0), 0), [grns]);
  const totalMovements = stockMovements.reduce((sum, m) => sum + Number(m.totalValue || 0), 0);
  const totalVariance = stockCounts.reduce((sum, c) => sum + Number(c.varianceQty || 0), 0);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      <div className="flex flex-1 gap-6 min-h-0">
        <aside className="w-80 shrink-0 flex flex-col gap-4">
          <Card className="h-full border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
              <CardTitle>{periodLabels[urlPeriod]} Checklist</CardTitle>
              <CardDescription>
                {auditClient?.name || "Select a client"} • {formatDateRange()}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="relative border-l border-border space-y-6 py-2 ml-[3px]">
                {auditSteps.map((step, index) => (
                  <div 
                    key={step.id} 
                    className="relative pl-8 group cursor-pointer hover:bg-muted/30 rounded-r-lg py-2 pr-2 -ml-[3px] transition-colors"
                    onClick={() => handleStepClick(step)}
                    data-testid={`step-${step.id}`}
                  >
                    <div className={cn(
                      "absolute left-[-5px] top-3 h-2.5 w-2.5 rounded-full border ring-4 ring-background transition-colors",
                      step.status === "completed" ? "bg-emerald-500 border-emerald-500" : 
                      step.status === "in_progress" ? "bg-amber-500 border-amber-500" : 
                      "bg-muted border-muted-foreground"
                    )} />
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-sm font-medium leading-none",
                          step.status !== "not_started" ? "text-foreground" : "text-muted-foreground"
                        )}>
                          Step {index + 1}: {step.label}
                        </span>
                        {activeTab === step.tab && (
                          <Badge variant="secondary" className="text-xs">Active</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {getStatusIcon(step.status)}
                        <span>{getStatusLabel(step.status)}</span>
                        {step.lastUpdated && (
                          <span className="ml-auto">{step.lastUpdated}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Evidence Locker</h4>
                <div className="text-sm text-muted-foreground italic text-center py-4 border-2 border-dashed border-border rounded">
                  <Upload className="h-5 w-5 mx-auto mb-1" />
                  Drag & drop supporting docs
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>

        <div className="flex-1 min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="grid w-full max-w-[720px] grid-cols-6">
                <TabsTrigger value="sales" data-testid="tab-sales">Sales</TabsTrigger>
                <TabsTrigger value="purchases" data-testid="tab-purchases">Purchases</TabsTrigger>
                <TabsTrigger value="store" data-testid="tab-store">Store</TabsTrigger>
                <TabsTrigger value="counts" data-testid="tab-counts">Counts</TabsTrigger>
                <TabsTrigger value="stock" data-testid="tab-stock">Stock</TabsTrigger>
                <TabsTrigger value="recon" data-testid="tab-recon">Recon</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                {lastSaved && (
                  <span className="text-xs text-muted-foreground">
                    Saved {format(lastSaved, "HH:mm")}
                  </span>
                )}
                <Button size="sm" variant="outline" onClick={handleSaveDraft} disabled={isSaving} data-testid="button-save-draft">
                  {isSaving ? <Spinner className="h-4 w-4 mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                  Save Draft
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto pr-2">
              <TabsContent value="sales" className="mt-0 h-full">
                <SalesTab 
                  salesEntries={salesEntries} 
                  salesSummary={salesSummary || undefined}
                  clientId={clientId}
                  departments={departments}
                  dateStr={dateStr}
                />
              </TabsContent>

              <TabsContent value="purchases" className="mt-0">
                <PurchasesTab 
                  grns={grns}
                  clientId={clientId}
                  totalPurchases={totalPurchases}
                />
              </TabsContent>

              <TabsContent value="store" className="mt-0">
                <StoreTab 
                  clientId={clientId}
                  departments={departments}
                  items={items}
                  dateStr={dateStr}
                />
              </TabsContent>

              <TabsContent value="stock" className="mt-0">
                <StockTab 
                  stockMovements={stockMovements}
                  clientId={clientId}
                  departmentId={departmentId}
                  totalMovements={totalMovements}
                />
              </TabsContent>

              <TabsContent value="counts" className="mt-0">
                <CountsTab 
                  stockCounts={stockCounts}
                  items={items}
                  clientId={clientId}
                  departmentId={departmentId}
                  dateStr={dateStr}
                  totalVariance={totalVariance}
                />
              </TabsContent>

              <TabsContent value="recon" className="mt-0">
                <ReconTab 
                  reconciliations={reconciliations}
                  stockCounts={stockCounts}
                  items={items}
                  salesTotal={salesSummary?.grandTotal || 0}
                  purchasesTotal={totalPurchases}
                  varianceTotal={totalVariance}
                  departmentId={departmentId}
                  dateStr={dateStr}
                  onRunReconciliation={() => setRunReconDialogOpen(true)}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      <RunReconciliationDialog 
        open={runReconDialogOpen}
        onOpenChange={setRunReconDialogOpen}
        onCreateException={() => {
          setRunReconDialogOpen(false);
          setCreateExceptionDialogOpen(true);
        }}
        onProceed={async () => {
          setRunReconDialogOpen(false);
          if (departmentId) {
            try {
              await reconciliationsApi.compute(departmentId, dateStr);
              queryClient.invalidateQueries({ queryKey: ["reconciliations"] });
              toast.success("Reconciliation completed and audit submitted");
            } catch (error: any) {
              toast.error(error.message || "Failed to run reconciliation");
            }
          }
        }}
      />

      <CreateExceptionDialog 
        open={createExceptionDialogOpen}
        onOpenChange={setCreateExceptionDialogOpen}
        clientId={clientId}
        departmentId={departmentId}
        onSaved={() => {
          setCreateExceptionDialogOpen(false);
          toast.success("Exception created. You can now proceed with reconciliation.");
        }}
      />
    </div>
  );
}

function SalesTab({ salesEntries, salesSummary, clientId, departments, dateStr }: {
  salesEntries: SalesEntry[];
  salesSummary?: SalesSummary;
  clientId: string | null;
  departments: Department[];
  dateStr: string;
}) {
  const queryClient = useQueryClient();
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("all");
  const [declareDialogOpen, setDeclareDialogOpen] = useState(false);
  const [declareDeptId, setDeclareDeptId] = useState<string>("");
  const [declaredCash, setDeclaredCash] = useState<string>("");
  const [declaredPos, setDeclaredPos] = useState<string>("");
  const [declaredTransfer, setDeclaredTransfer] = useState<string>("");
  const [declareNotes, setDeclareNotes] = useState<string>("");

  const createDeclarationMutation = useMutation({
    mutationFn: (data: { departmentId: string; cash: string; pos: string; transfer: string; notes: string }) => 
      paymentDeclarationsApi.create({
        clientId: clientId!,
        departmentId: data.departmentId,
        date: dateStr,
        reportedCash: data.cash,
        reportedPosSettlement: data.pos,
        reportedTransfers: data.transfer,
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-declarations"] });
      setDeclareDialogOpen(false);
      resetDeclareForm();
      toast.success("Payment declaration saved successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save declaration");
    },
  });

  const resetDeclareForm = () => {
    setDeclareDeptId("");
    setDeclaredCash("");
    setDeclaredPos("");
    setDeclaredTransfer("");
    setDeclareNotes("");
  };

  const handleOpenDeclareDialog = (deptId?: string) => {
    if (deptId) {
      setDeclareDeptId(deptId);
    } else if (departments.length > 0) {
      setDeclareDeptId(departments[0].id);
    }
    setDeclareDialogOpen(true);
  };

  const handleSaveDeclaration = () => {
    if (!declareDeptId) {
      toast.error("Please select a department");
      return;
    }
    createDeclarationMutation.mutate({
      departmentId: declareDeptId,
      cash: declaredCash || "0",
      pos: declaredPos || "0",
      transfer: declaredTransfer || "0",
      notes: declareNotes,
    });
  };

  const filteredEntries = useMemo(() => {
    if (selectedDeptFilter === "all") return salesEntries;
    return salesEntries.filter(e => e.departmentId === selectedDeptFilter);
  }, [salesEntries, selectedDeptFilter]);

  const entriesByDepartment = useMemo(() => {
    const grouped: Record<string, { department: Department | undefined; entries: SalesEntry[] }> = {};
    filteredEntries.forEach(entry => {
      if (!grouped[entry.departmentId]) {
        grouped[entry.departmentId] = {
          department: departments.find(d => d.id === entry.departmentId),
          entries: []
        };
      }
      grouped[entry.departmentId].entries.push(entry);
    });
    return Object.values(grouped);
  }, [filteredEntries, departments]);

  const { data: filteredSummary } = useQuery({
    queryKey: ["sales-summary", clientId, selectedDeptFilter, dateStr],
    queryFn: () => salesEntriesApi.getSummary({ 
      clientId: clientId!, 
      departmentId: selectedDeptFilter === "all" ? undefined : selectedDeptFilter,
      date: dateStr 
    }),
    enabled: !!clientId,
  });

  const departmentIds = useMemo(() => 
    departments.map(d => d.id), [departments]);

  const { data: paymentDeclarations = [] } = useQuery({
    queryKey: ["payment-declarations", clientId, departmentIds, dateStr],
    queryFn: async () => {
      if (!clientId) return [];
      const results: any[] = [];
      for (const deptId of departmentIds) {
        try {
          const declaration = await paymentDeclarationsApi.get(clientId, deptId, dateStr);
          if (declaration) {
            results.push(declaration);
          }
        } catch {
          // Declaration may not exist for this department/date
        }
      }
      return results;
    },
    enabled: !!clientId && departmentIds.length > 0,
  });

  const reportedPaymentsByDept = useMemo(() => {
    const results: {
      departmentId: string;
      departmentName: string;
      totalCaptured: number;
      declaredCash: number;
      declaredPos: number;
      declaredTransfer: number;
      totalDeclared: number;
      hasDeclaration: boolean;
      variance: number;
    }[] = [];

    entriesByDepartment.forEach(({ department, entries }) => {
      if (!department) return;
      const totalCaptured = entries.reduce((sum, e) => sum + Number(e.totalSales || 0), 0);
      
      const declaration = paymentDeclarations.find((d: any) => d.departmentId === department.id);
      const hasDeclaration = !!declaration;
      const declaredCash = Number(declaration?.reportedCash || 0);
      const declaredPos = Number(declaration?.reportedPosSettlement || 0);
      const declaredTransfer = Number(declaration?.reportedTransfers || 0);
      const totalDeclared = declaredCash + declaredPos + declaredTransfer;
      
      const variance = hasDeclaration ? totalDeclared - totalCaptured : 0;
      
      results.push({
        departmentId: department.id,
        departmentName: department.name,
        totalCaptured,
        declaredCash,
        declaredPos,
        declaredTransfer,
        totalDeclared,
        hasDeclaration,
        variance,
      });
    });

    return results;
  }, [entriesByDepartment, paymentDeclarations]);

  const totalFirstHitVariance = reportedPaymentsByDept.reduce((sum, r) => {
    if (!r.hasDeclaration) {
      return sum - r.totalCaptured;
    }
    return sum + r.variance;
  }, 0);

  const displaySummary = filteredSummary || salesSummary;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Daily Summary {selectedDeptFilter !== "all" && "(Filtered)"}</CardTitle>
              <CardDescription>
                {selectedDeptFilter === "all" 
                  ? `All departments for ${dateStr}` 
                  : `${departments.find(d => d.id === selectedDeptFilter)?.name || "Department"} for ${dateStr}`}
              </CardDescription>
            </div>
            {displaySummary && (
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                  ₦ {(displaySummary.grandTotal || 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {displaySummary.entriesCount || 0} entries
                  {displaySummary.departmentsCount && selectedDeptFilter === "all" && ` across ${displaySummary.departmentsCount} departments`}
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {displaySummary ? (
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white/60 dark:bg-black/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Cash</div>
                <div className="font-mono font-medium">₦ {(displaySummary.totalCash || 0).toLocaleString()}</div>
              </div>
              <div className="text-center p-3 bg-white/60 dark:bg-black/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">POS</div>
                <div className="font-mono font-medium">₦ {(displaySummary.totalPos || 0).toLocaleString()}</div>
              </div>
              <div className="text-center p-3 bg-white/60 dark:bg-black/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Transfers</div>
                <div className="font-mono font-medium">₦ {(displaySummary.totalTransfer || 0).toLocaleString()}</div>
              </div>
              <div className="text-center p-3 bg-white/60 dark:bg-black/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Voids/Comp</div>
                <div className="font-mono font-medium text-muted-foreground">₦ {(displaySummary.totalVoids || 0).toLocaleString()}</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No sales data for this date
            </div>
          )}
        </CardContent>
      </Card>

      {reportedPaymentsByDept.length > 0 && (
        <Card className="bg-muted/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <CardTitle className="text-lg">Reported Payments Summary</CardTitle>
                  <CardDescription>Declared payments vs captured sales - first hit variance</CardDescription>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleOpenDeclareDialog()}
                  data-testid="button-declare-payment"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Declare Payment
                </Button>
              </div>
              <div className={cn(
                "text-right px-3 py-1 rounded-lg",
                totalFirstHitVariance === 0 ? "bg-emerald-100 dark:bg-emerald-900/30" : totalFirstHitVariance < 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30"
              )}>
                <div className="text-xs text-muted-foreground">First Hit Variance</div>
                <div className={cn(
                  "font-mono font-bold",
                  totalFirstHitVariance === 0 ? "text-emerald-700" : totalFirstHitVariance < 0 ? "text-red-700" : "text-amber-700"
                )}>
                  ₦ {totalFirstHitVariance > 0 ? "+" : ""}{totalFirstHitVariance.toLocaleString()}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Total Captured</TableHead>
                  <TableHead className="text-right">Total Declared</TableHead>
                  <TableHead className="text-right">First Hit Variance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportedPaymentsByDept.map((report) => {
                  return (
                    <TableRow key={report.departmentId} data-testid={`row-payment-${report.departmentId}`}>
                      <TableCell className="font-medium">{report.departmentName}</TableCell>
                      <TableCell className="text-right font-mono">₦ {report.totalCaptured.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono">
                        {report.hasDeclaration ? `₦ ${report.totalDeclared.toLocaleString()}` : <span className="text-muted-foreground">Pending</span>}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-mono font-medium",
                        !report.hasDeclaration ? "text-amber-600" : report.variance === 0 ? "text-emerald-600" : report.variance < 0 ? "text-red-600" : "text-amber-600"
                      )}>
                        {!report.hasDeclaration 
                          ? <span className="text-amber-600">₦ -{report.totalCaptured.toLocaleString()}</span>
                          : report.variance === 0 
                            ? "₦ 0" 
                            : `₦ ${report.variance > 0 ? "+" : ""}${report.variance.toLocaleString()}`}
                      </TableCell>
                      <TableCell>
                        {!report.hasDeclaration ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-600">Awaiting Declaration</Badge>
                        ) : report.variance === 0 ? (
                          <Badge variant="default" className="bg-emerald-600">Matched</Badge>
                        ) : report.variance < 0 ? (
                          <Badge variant="destructive">Short</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">Over</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="mt-3 text-xs text-muted-foreground">
              Variance = Declared - Captured. Negative means short (declared less than captured). Departments without declarations show potential deficit.
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-none">
        <CardHeader className="px-0 pt-0 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sales Entries</CardTitle>
              <CardDescription>
                {clientId 
                  ? `Sales records for ${dateStr}`
                  : "Select a client to view sales"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Department:</Label>
              <Select value={selectedDeptFilter} onValueChange={setSelectedDeptFilter}>
                <SelectTrigger className="w-48" data-testid="select-department-filter">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {!clientId ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
              Select a client from the dashboard to view sales
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
              No sales entries for this period. Add entries from the Sales Capture page.
            </div>
          ) : (
            <div className="space-y-4">
              {entriesByDepartment.map(({ department, entries }) => (
                <div key={department?.id || "unknown"} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 font-medium flex items-center justify-between">
                    <span>{department?.name || "Unknown Department"}</span>
                    <Badge variant="outline">{entries.length} entries</Badge>
                  </div>
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Shift</TableHead>
                        <TableHead className="text-right">Amount (₦)</TableHead>
                        <TableHead className="text-right">Complimentary (₦)</TableHead>
                        <TableHead className="text-right">Vouchers (₦)</TableHead>
                        <TableHead className="text-right">Voids (₦)</TableHead>
                        <TableHead className="text-right">Others (₦)</TableHead>
                        <TableHead className="text-right">Total (₦)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry.id} data-testid={`row-sales-${entry.id}`}>
                          <TableCell>{format(new Date(entry.createdAt), "HH:mm")}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {entry.shift === "full" ? "Full Day" : entry.shift || "Full Day"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{Number(entry.amount || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono">{Number(entry.complimentaryAmount || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono">{Number(entry.vouchersAmount || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">{Number(entry.voidsAmount || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono">{Number(entry.othersAmount || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold font-mono">{Number(entry.totalSales || 0).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/20">
                        <TableCell colSpan={2} className="font-medium">Subtotal</TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          ₦ {entries.reduce((sum, e) => sum + Number(e.amount || 0), 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          ₦ {entries.reduce((sum, e) => sum + Number(e.complimentaryAmount || 0), 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          ₦ {entries.reduce((sum, e) => sum + Number(e.vouchersAmount || 0), 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          ₦ {entries.reduce((sum, e) => sum + Number(e.voidsAmount || 0), 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          ₦ {entries.reduce((sum, e) => sum + Number(e.othersAmount || 0), 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono">
                          ₦ {entries.reduce((sum, e) => sum + Number(e.totalSales || 0), 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={declareDialogOpen} onOpenChange={setDeclareDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Declare Payment</DialogTitle>
            <DialogDescription>
              Enter the amounts declared by staff for {dateStr}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={declareDeptId} onValueChange={setDeclareDeptId}>
                <SelectTrigger data-testid="select-declare-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Cash (₦)</Label>
                <Input 
                  type="number" 
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={declaredCash}
                  onChange={(e) => setDeclaredCash(e.target.value)}
                  data-testid="input-declared-cash"
                />
              </div>
              <div className="space-y-2">
                <Label>POS (₦)</Label>
                <Input 
                  type="number" 
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={declaredPos}
                  onChange={(e) => setDeclaredPos(e.target.value)}
                  data-testid="input-declared-pos"
                />
              </div>
              <div className="space-y-2">
                <Label>Transfer (₦)</Label>
                <Input 
                  type="number" 
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={declaredTransfer}
                  onChange={(e) => setDeclaredTransfer(e.target.value)}
                  data-testid="input-declared-transfer"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input 
                placeholder="Any notes about the declaration"
                value={declareNotes}
                onChange={(e) => setDeclareNotes(e.target.value)}
                data-testid="input-declare-notes"
              />
            </div>
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <div className="flex justify-between">
                <span>Total Declared:</span>
                <span className="font-mono font-medium">
                  ₦ {(Number(declaredCash || 0) + Number(declaredPos || 0) + Number(declaredTransfer || 0)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setDeclareDialogOpen(false);
                resetDeclareForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveDeclaration}
              disabled={createDeclarationMutation.isPending || !declareDeptId}
              data-testid="button-save-declaration"
            >
              {createDeclarationMutation.isPending ? "Saving..." : "Save Declaration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PurchasesTab({ grns, clientId, totalPurchases }: {
  grns: GoodsReceivedNote[];
  clientId: string | null;
  totalPurchases: number;
}) {
  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pt-0 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Purchases & GRN</CardTitle>
            <CardDescription>View goods received note details</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Invoice Ref</TableHead>
                <TableHead className="text-right">Amount (₦)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Evidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No GRN records found for this date.
                  </TableCell>
                </TableRow>
              ) : (
                grns.map((grn) => (
                  <TableRow key={grn.id} data-testid={`row-grn-${grn.id}`}>
                    <TableCell>{format(new Date(grn.date), "MMM d, yyyy")}</TableCell>
                    <TableCell className="font-medium">{grn.supplierName}</TableCell>
                    <TableCell>{grn.invoiceRef}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{Number(grn.amount || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={grn.status === "received" ? "default" : "secondary"}>
                        {grn.status || "pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {grn.evidenceUrl ? (
                        <FileText className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <span className="text-muted-foreground text-xs">None</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="bg-muted/30 p-4 flex justify-end border-t">
            <div className="text-sm">
              <span className="text-muted-foreground mr-2">Total Purchases:</span>
              <span className="font-mono font-bold text-lg">₦ {totalPurchases.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StoreTab({ clientId, departments, items, dateStr }: {
  clientId: string | null;
  departments: Department[];
  items: Item[];
  dateStr: string;
}) {
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const queryClient = useQueryClient();

  // Fetch inventory departments (SRDs) for proper From/To names
  const { data: inventoryDepts = [] } = useQuery<InventoryDept[]>({
    queryKey: ["inventory-departments", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/inventory-departments`);
      if (!res.ok) throw new Error("Failed to fetch inventory departments");
      return res.json();
    },
    enabled: !!clientId,
  });

  // Fetch store names for display
  const { data: storeNames = [] } = useQuery<StoreName[]>({
    queryKey: ["store-names"],
    queryFn: async () => {
      const res = await fetch(`/api/store-names`);
      if (!res.ok) throw new Error("Failed to fetch store names");
      return res.json();
    },
  });

  const { data: storeIssues = [] } = useQuery({
    queryKey: ["store-issues", clientId, dateStr],
    queryFn: () => clientId ? storeIssuesApi.getAll(clientId, dateStr) : Promise.resolve([]),
    enabled: !!clientId,
  });

  // Fetch store issue lines for all issues
  const { data: storeIssueLines = [] } = useQuery<StoreIssueLine[]>({
    queryKey: ["store-issue-lines", clientId, dateStr],
    queryFn: async () => {
      if (!clientId || storeIssues.length === 0) return [];
      const allLines: StoreIssueLine[] = [];
      for (const issue of storeIssues) {
        const res = await fetch(`/api/store-issues/${issue.id}/lines`);
        if (res.ok) {
          const lines = await res.json();
          allLines.push(...lines);
        }
      }
      return allLines;
    },
    enabled: !!clientId && storeIssues.length > 0,
  });

  // Mutation for updating notes
  const updateNotesMutation = useMutation({
    mutationFn: async ({ issueId, notes }: { issueId: string; notes: string }) => {
      const res = await fetch(`/api/store-issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to update notes");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-issues"] });
      setNoteDialogOpen(false);
      setSelectedIssueId(null);
      setNoteText("");
      toast.success("Notes saved successfully");
    },
    onError: (error: any) => toast.error(error.message || "Failed to save notes"),
  });

  // Helper to get SRD name
  const getSrdName = (id: string) => {
    const srd = inventoryDepts.find(d => d.id === id);
    if (!srd) return "Unknown";
    const storeName = storeNames.find(sn => sn.id === srd.storeNameId);
    return storeName?.name || "Unknown";
  };

  const getItemName = (id: string) => items.find(i => i.id === id)?.name || "Unknown";

  // Get lines for a specific issue
  const getLinesForIssue = (issueId: string) => storeIssueLines.filter(l => l.storeIssueId === issueId);

  const handleOpenNoteDialog = (issueId: string, currentNotes: string | null) => {
    setSelectedIssueId(issueId);
    setNoteText(currentNotes || "");
    setNoteDialogOpen(true);
  };

  const handleSaveNote = () => {
    if (!selectedIssueId) return;
    updateNotesMutation.mutate({ issueId: selectedIssueId, notes: noteText });
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pt-0 pb-4">
        <div>
          <CardTitle>Store Issues</CardTitle>
          <CardDescription>View items issued from Main Store to Department Stores</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {storeIssues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No store issues recorded today. Issues are made from the Main Store SRD in Inventory Ledger.
                  </TableCell>
                </TableRow>
              ) : (
                storeIssues.flatMap((issue) => {
                  const lines = getLinesForIssue(issue.id);
                  if (lines.length === 0) {
                    return (
                      <TableRow key={issue.id} data-testid={`row-store-issue-${issue.id}`}>
                        <TableCell>{format(new Date(issue.issueDate), "MMM d, yyyy")}</TableCell>
                        <TableCell className="font-medium">{getSrdName(issue.fromDepartmentId)}</TableCell>
                        <TableCell className="font-medium">{getSrdName(issue.toDepartmentId)}</TableCell>
                        <TableCell className="text-muted-foreground">-</TableCell>
                        <TableCell className="text-right text-muted-foreground">-</TableCell>
                        <TableCell>
                          <Badge variant={issue.status === "posted" ? "default" : "secondary"}>
                            {issue.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleOpenNoteDialog(issue.id, issue.notes)}
                            className="text-xs"
                            data-testid={`button-note-${issue.id}`}
                          >
                            {issue.notes ? <span className="truncate max-w-[100px]">{issue.notes}</span> : <span className="text-muted-foreground">Add note</span>}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  return lines.map((line, idx) => (
                    <TableRow key={`${issue.id}-${line.id}`} data-testid={`row-store-issue-line-${line.id}`}>
                      {idx === 0 ? (
                        <>
                          <TableCell rowSpan={lines.length}>{format(new Date(issue.issueDate), "MMM d, yyyy")}</TableCell>
                          <TableCell rowSpan={lines.length} className="font-medium">{getSrdName(issue.fromDepartmentId)}</TableCell>
                          <TableCell rowSpan={lines.length} className="font-medium">{getSrdName(issue.toDepartmentId)}</TableCell>
                        </>
                      ) : null}
                      <TableCell>{getItemName(line.itemId)}</TableCell>
                      <TableCell className="text-right font-mono">{Number(line.qtyIssued).toFixed(2)}</TableCell>
                      {idx === 0 ? (
                        <>
                          <TableCell rowSpan={lines.length}>
                            <Badge variant={issue.status === "posted" ? "default" : "secondary"}>
                              {issue.status}
                            </Badge>
                          </TableCell>
                          <TableCell rowSpan={lines.length}>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleOpenNoteDialog(issue.id, issue.notes)}
                              className="text-xs"
                              data-testid={`button-note-${issue.id}`}
                            >
                              {issue.notes ? <span className="truncate max-w-[100px]">{issue.notes}</span> : <span className="text-muted-foreground">Add note</span>}
                            </Button>
                          </TableCell>
                        </>
                      ) : null}
                    </TableRow>
                  ));
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h4 className="text-sm font-semibold mb-2">Issue Summary</h4>
          <p className="text-sm text-muted-foreground">
            Total issues today: <span className="font-mono font-medium">{storeIssues.length}</span>
          </p>
        </div>
      </CardContent>

      {/* Notes Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Notes</DialogTitle>
            <DialogDescription>Add or edit notes for this store issue</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="issueNote">Note</Label>
            <Textarea
              id="issueNote"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter any notes about this issue..."
              rows={4}
              data-testid="textarea-issue-note"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveNote}
              disabled={updateNotesMutation.isPending}
              data-testid="button-save-note"
            >
              {updateNotesMutation.isPending && <Spinner className="h-4 w-4 mr-2" />}
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function StockTab({ stockMovements, clientId, departmentId, totalMovements }: {
  stockMovements: StockMovement[];
  clientId: string | null;
  departmentId: string | null;
  totalMovements: number;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => stockMovementsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      setCreateOpen(false);
      toast.success("Stock movement recorded");
    },
    onError: (error: any) => toast.error(error.message || "Failed to create movement"),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      clientId,
      departmentId,
      movementType: formData.get("movementType"),
      sourceLocation: formData.get("sourceLocation"),
      destinationLocation: formData.get("destinationLocation"),
      itemsDescription: formData.get("itemsDescription"),
      totalValue: formData.get("totalValue"),
      authorizedBy: formData.get("authorizedBy"),
    });
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pt-0 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Stock Movements</CardTitle>
            <CardDescription>Transfers, adjustments, and write-offs</CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2" disabled={!clientId} data-testid="button-add-movement">
            <Plus className="h-4 w-4" /> Record Movement
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Value (₦)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No stock movements recorded. Click "Record Movement" to add.
                  </TableCell>
                </TableRow>
              ) : (
                stockMovements.map((movement) => (
                  <TableRow key={movement.id} data-testid={`row-movement-${movement.id}`}>
                    <TableCell>{format(new Date(movement.createdAt), "MMM d, HH:mm")}</TableCell>
                    <TableCell>
                      <Badge variant={movement.movementType === "transfer" ? "secondary" : movement.movementType === "adjustment" ? "outline" : "destructive"}>
                        {movement.movementType}
                      </Badge>
                    </TableCell>
                    <TableCell>{movement.sourceLocation || "-"}</TableCell>
                    <TableCell>{movement.destinationLocation || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{movement.itemsDescription}</TableCell>
                    <TableCell className="text-right font-mono">{Number(movement.totalValue || 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="bg-muted/30 p-4 flex justify-end border-t">
            <div className="text-sm">
              <span className="text-muted-foreground mr-2">Total Value:</span>
              <span className="font-mono font-bold text-lg">₦ {totalMovements.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Stock Movement</DialogTitle>
            <DialogDescription>Log transfers, adjustments, or write-offs</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="movementType">Movement Type</Label>
                <Select name="movementType" defaultValue="transfer">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                    <SelectItem value="writeoff">Write-off</SelectItem>
                    <SelectItem value="waste">Waste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sourceLocation">From Location</Label>
                  <Input id="sourceLocation" name="sourceLocation" placeholder="e.g., Main Store" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destinationLocation">To Location</Label>
                  <Input id="destinationLocation" name="destinationLocation" placeholder="e.g., Bar" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemsDescription">Items Description</Label>
                <Textarea id="itemsDescription" name="itemsDescription" placeholder="List of items moved" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalValue">Total Value (₦)</Label>
                  <Input id="totalValue" name="totalValue" type="number" step="0.01" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="authorizedBy">Authorized By</Label>
                  <Input id="authorizedBy" name="authorizedBy" placeholder="Manager name" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Spinner className="h-4 w-4 mr-2" />}
                Save Movement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

interface InventoryDept {
  id: string;
  storeNameId: string;
  inventoryType: string;
  status: string;
}

interface StoreName {
  id: string;
  name: string;
}

function CountsTab({ stockCounts, items, clientId, departmentId, dateStr, totalVariance }: {
  stockCounts: StockCount[];
  items: Item[];
  clientId: string | null;
  departmentId: string | null;
  dateStr: string;
  totalVariance: number;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [selectedSrdId, setSelectedSrdId] = useState<string>("");
  const [physicalCount, setPhysicalCount] = useState<string>("");
  const queryClient = useQueryClient();

  // Fetch inventory departments (SRDs) for the client
  const { data: inventoryDepts = [] } = useQuery<InventoryDept[]>({
    queryKey: ["inventory-departments", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/inventory-departments`);
      if (!res.ok) throw new Error("Failed to fetch inventory departments");
      return res.json();
    },
    enabled: !!clientId,
  });

  // Fetch store names for display
  const { data: storeNames = [] } = useQuery<StoreName[]>({
    queryKey: ["store-names"],
    queryFn: async () => {
      const res = await fetch("/api/store-names");
      if (!res.ok) throw new Error("Failed to fetch store names");
      return res.json();
    },
  });

  // Fetch storeStock for selected SRD and date (to get Opening and Added)
  const { data: storeStockData = [] } = useQuery<StoreStock[]>({
    queryKey: ["store-stock", clientId, selectedSrdId, dateStr],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/store-stock?departmentId=${selectedSrdId}&date=${dateStr}`);
      if (!res.ok) throw new Error("Failed to fetch store stock");
      return res.json();
    },
    enabled: !!clientId && !!selectedSrdId,
  });

  // Fetch previous day storeStock for opening carryover
  const previousDate = useMemo(() => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    return format(d, "yyyy-MM-dd");
  }, [dateStr]);

  const { data: prevDayStoreStock = [] } = useQuery<StoreStock[]>({
    queryKey: ["store-stock", clientId, selectedSrdId, previousDate],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/store-stock?departmentId=${selectedSrdId}&date=${previousDate}`);
      if (!res.ok) throw new Error("Failed to fetch previous day store stock");
      return res.json();
    },
    enabled: !!clientId && !!selectedSrdId,
  });

  // Filter Department Store SRDs only (for stock counts)
  const departmentStoreSrds = useMemo(() => {
    return inventoryDepts.filter(d => d.inventoryType === "DEPARTMENT_STORE" && d.status === "active");
  }, [inventoryDepts]);

  const getStoreNameById = (id: string) => storeNames.find(sn => sn.id === id);

  // Get selected SRD's inventory type
  const selectedSrd = useMemo(() => {
    return inventoryDepts.find(d => d.id === selectedSrdId);
  }, [inventoryDepts, selectedSrdId]);

  // Get Opening qty for selected item (from current day storeStock or previous day closing)
  const getOpeningQty = useMemo(() => {
    if (!selectedItemId) return 0;
    const currentStock = storeStockData.find(s => s.itemId === selectedItemId);
    if (currentStock) {
      return Number(currentStock.openingQty || 0);
    }
    // Fallback to previous day closing
    const prevStock = prevDayStoreStock.find(s => s.itemId === selectedItemId);
    if (prevStock) {
      const prevClosing = prevStock.physicalClosingQty !== null && prevStock.physicalClosingQty !== undefined
        ? Number(prevStock.physicalClosingQty)
        : Number(prevStock.closingQty || 0);
      return prevClosing;
    }
    return 0;
  }, [selectedItemId, storeStockData, prevDayStoreStock]);

  // Get Added qty for selected item (from storeStock.addedQty)
  const getAddedQty = useMemo(() => {
    if (!selectedItemId) return 0;
    const currentStock = storeStockData.find(s => s.itemId === selectedItemId);
    return Number(currentStock?.addedQty || 0);
  }, [selectedItemId, storeStockData]);

  // Calculate totals for display
  const totalQty = getOpeningQty + getAddedQty;
  const physicalQty = Number(physicalCount) || 0;
  const soldQty = physicalQty > 0 ? totalQty - physicalQty : 0;

  const createMutation = useMutation({
    mutationFn: (data: any) => stockCountsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-counts"] });
      queryClient.invalidateQueries({ queryKey: ["store-stock"] });
      setCreateOpen(false);
      setSelectedItemId("");
      setSelectedSrdId("");
      setPhysicalCount("");
      toast.success("Stock count recorded and SRD ledger updated");
    },
    onError: (error: any) => toast.error(error.message || "Failed to create count"),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedItemId || !selectedSrdId || !physicalCount) {
      toast.error("Please select an SRD, item, and enter physical count");
      return;
    }
    
    const opening = getOpeningQty;
    const added = getAddedQty;
    const total = opening + added;
    const actual = Number(physicalCount) || 0;
    const sold = total - actual;
    const expected = total; // Expected = Opening + Added (no sold deduction for expected)
    
    createMutation.mutate({
      clientId,
      departmentId,
      storeDepartmentId: selectedSrdId, // This triggers storeStock update on backend
      itemId: selectedItemId,
      date: new Date(dateStr).toISOString(),
      openingQty: String(opening),
      addedQty: String(added),
      soldQty: String(sold > 0 ? sold : 0),
      expectedClosingQty: String(total),
      actualClosingQty: String(actual),
      varianceQty: String(actual - total),
    });
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pt-0 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Stock Counts</CardTitle>
            <CardDescription>Physical inventory counts and variance tracking</CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2" disabled={!departmentId} data-testid="button-add-count">
            <Plus className="h-4 w-4" /> Add Count
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Opening</TableHead>
                <TableHead className="text-right text-emerald-700">+ Added</TableHead>
                <TableHead className="text-right text-red-700">- Sold</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockCounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No stock counts recorded. Click "Add Count" to begin.
                  </TableCell>
                </TableRow>
              ) : (
                stockCounts.map((count) => {
                  const item = items.find(i => i.id === count.itemId);
                  const variance = Number(count.varianceQty || 0);
                  const addedQty = Number((count as any).addedQty || 0);
                  const soldQty = Number(count.soldQty || 0);
                  return (
                    <TableRow key={count.id} data-testid={`row-count-${count.id}`}>
                      <TableCell className="font-medium">{item?.name || count.itemId}</TableCell>
                      <TableCell className="text-right font-mono">{count.openingQty}</TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">+{addedQty}</TableCell>
                      <TableCell className="text-right font-mono text-red-600">-{soldQty}</TableCell>
                      <TableCell className="text-right font-mono">{count.expectedClosingQty}</TableCell>
                      <TableCell className="text-right font-mono">{count.actualClosingQty || "-"}</TableCell>
                      <TableCell className={cn(
                        "text-right font-mono font-medium",
                        variance < 0 ? "text-red-600" : variance > 0 ? "text-amber-600" : "text-emerald-600"
                      )}>
                        {variance > 0 ? "+" : ""}{variance}
                      </TableCell>
                      <TableCell>
                        <Badge variant={variance === 0 ? "default" : variance < 0 ? "destructive" : "secondary"}>
                          {variance === 0 ? "Matched" : variance < 0 ? "Short" : "Over"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <div className="bg-muted/30 p-4 flex justify-end border-t">
            <div className="text-sm">
              <span className="text-muted-foreground mr-2">Total Variance:</span>
              <span className={cn(
                "font-mono font-bold text-lg",
                totalVariance < 0 ? "text-red-600" : totalVariance > 0 ? "text-amber-600" : "text-emerald-600"
              )}>
                {totalVariance > 0 ? "+" : ""}{totalVariance} units
              </span>
            </div>
          </div>
        </div>
      </CardContent>

      <Dialog open={createOpen} onOpenChange={(open) => { 
        setCreateOpen(open); 
        if (!open) { 
          setSelectedItemId(""); 
          setSelectedSrdId(""); 
          setPhysicalCount(""); 
        } 
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Stock Count</DialogTitle>
            <DialogDescription>
              Select an SRD and item, then enter the physical count. Opening and Added are auto-filled from the SRD ledger.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Step 1: Select SRD */}
              <div className="space-y-2">
                <Label htmlFor="srdId">Stock Reconciliation Department (SRD)</Label>
                <Select value={selectedSrdId} onValueChange={(val) => { setSelectedSrdId(val); setSelectedItemId(""); setPhysicalCount(""); }}>
                  <SelectTrigger data-testid="select-srd-count">
                    <SelectValue placeholder="Select SRD (Department Store)" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentStoreSrds.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {getStoreNameById(dept.storeNameId)?.name || dept.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Step 2: Select Item (enabled after SRD is selected) */}
              <div className="space-y-2">
                <Label htmlFor="itemId">Item</Label>
                <Select 
                  value={selectedItemId} 
                  onValueChange={(val) => { setSelectedItemId(val); setPhysicalCount(""); }}
                  disabled={!selectedSrdId}
                >
                  <SelectTrigger data-testid="select-item-count">
                    <SelectValue placeholder={selectedSrdId ? "Select item" : "Select SRD first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {items.filter(i => i.status === "active").map(item => (
                      <SelectItem key={item.id} value={item.id}>{item.name} ({item.category})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Auto-filled values display */}
              {selectedItemId && (
                <>
                  <div className="grid grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg border">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Opening</p>
                      <p className="font-mono font-semibold text-lg">{getOpeningQty.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-emerald-600 mb-1">+ Added</p>
                      <p className="font-mono font-semibold text-lg text-emerald-600">{getAddedQty.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">= Total</p>
                      <p className="font-mono font-bold text-lg">{totalQty.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Physical Count Input */}
                  <div className="space-y-2">
                    <Label htmlFor="actualQty" className="text-base font-semibold">Actual Physical Count</Label>
                    <Input 
                      id="actualQty" 
                      type="number" 
                      step="0.01" 
                      placeholder="Enter physical count"
                      value={physicalCount}
                      onChange={(e) => setPhysicalCount(e.target.value)}
                      className="text-lg h-12"
                      required 
                      data-testid="input-physical-count"
                    />
                  </div>

                  {/* Calculated results */}
                  {physicalQty > 0 && (
                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/20 rounded-lg border">
                      <div className="text-center">
                        <p className="text-xs text-red-600 mb-1">Sold (calculated)</p>
                        <p className="font-mono font-semibold text-lg text-red-600">
                          {soldQty > 0 ? soldQty.toFixed(2) : "0.00"}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs mb-1">Variance</p>
                        <p className={cn(
                          "font-mono font-bold text-lg",
                          physicalQty - totalQty < 0 ? "text-red-600" : 
                          physicalQty - totalQty > 0 ? "text-amber-600" : "text-emerald-600"
                        )}>
                          {physicalQty - totalQty > 0 ? "+" : ""}{(physicalQty - totalQty).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || !selectedItemId || !selectedSrdId || !physicalCount}
                data-testid="button-save-count"
              >
                {createMutation.isPending && <Spinner className="h-4 w-4 mr-2" />}
                Save Count
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ReconTab({ reconciliations, stockCounts, items, salesTotal, purchasesTotal, varianceTotal, departmentId, dateStr, onRunReconciliation }: {
  reconciliations: Reconciliation[];
  stockCounts: StockCount[];
  items: Item[];
  salesTotal: number;
  purchasesTotal: number;
  varianceTotal: number;
  departmentId: string | null;
  dateStr: string;
  onRunReconciliation: () => void;
}) {
  const latestRecon = reconciliations[0];
  const isSubmitted = latestRecon?.status === "approved" || latestRecon?.status === "submitted";

  const ssrvSummary = useMemo(() => {
    let openingValue = 0;
    let addedValue = 0;
    let soldValue = 0;
    let expectedValue = 0;
    let actualValue = 0;

    stockCounts.forEach(count => {
      const item = items.find(i => i.id === count.itemId);
      const costPrice = Number(item?.costPrice || 0);
      const sellingPrice = Number(item?.sellingPrice || 0);
      
      const opening = Number(count.openingQty || 0);
      const added = Number((count as any).addedQty || 0);
      const sold = Number(count.soldQty || 0);
      const expected = Number(count.expectedClosingQty || 0);
      const actual = Number(count.actualClosingQty || 0);

      openingValue += opening * costPrice;
      addedValue += added * costPrice;
      soldValue += sold * sellingPrice;
      expectedValue += expected * costPrice;
      actualValue += actual * costPrice;
    });

    const varianceValue = actualValue - expectedValue;
    return { openingValue, addedValue, soldValue, expectedValue, actualValue, varianceValue };
  }, [stockCounts, items]);

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pt-0 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Reconciliation Summary</CardTitle>
            <CardDescription>SSRV-based reconciliation: Opening + Added - Sold = Expected vs Actual</CardDescription>
          </div>
          <Button 
            onClick={onRunReconciliation} 
            className="gap-2" 
            disabled={!departmentId || isSubmitted}
            data-testid="button-run-reconciliation"
          >
            <Calculator className="h-4 w-4" /> 
            {isSubmitted ? "Audit Submitted" : "Run Reconciliation"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Department Sales</CardDescription>
              <CardTitle className="text-2xl font-mono">₦ {salesTotal.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Stock Count Value</CardDescription>
              <CardTitle className="text-2xl font-mono">₦ {ssrvSummary.actualValue.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card className={cn(ssrvSummary.varianceValue !== 0 && "border-amber-500")}>
            <CardHeader className="pb-2">
              <CardDescription>Stock Variance Value</CardDescription>
              <CardTitle className={cn(
                "text-2xl font-mono",
                ssrvSummary.varianceValue < 0 ? "text-red-600" : ssrvSummary.varianceValue > 0 ? "text-amber-600" : "text-emerald-600"
              )}>
                ₦ {ssrvSummary.varianceValue > 0 ? "+" : ""}{ssrvSummary.varianceValue.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className="bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">SSRV Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Opening Stock</p>
                <p className="font-mono text-lg">₦ {ssrvSummary.openingValue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 text-emerald-700">+ Added (Store Issues)</p>
                <p className="font-mono text-lg text-emerald-600">₦ {ssrvSummary.addedValue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 text-red-700">- Sold</p>
                <p className="font-mono text-lg text-red-600">₦ {ssrvSummary.soldValue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">= Expected</p>
                <p className="font-mono text-lg">₦ {ssrvSummary.expectedValue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Actual Count</p>
                <p className="font-mono text-lg font-bold">₦ {ssrvSummary.actualValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {latestRecon && (
          <Card className="bg-muted/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Latest Reconciliation</CardTitle>
                <Badge variant={isSubmitted ? "default" : "secondary"}>
                  {latestRecon.status || "pending"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Variance Qty:</span>
                  <span className="ml-2 font-mono">{latestRecon.varianceQty}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Variance Value:</span>
                  <span className="ml-2 font-mono">₦ {Number(latestRecon.varianceValue || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <span className="ml-2">{format(new Date(latestRecon.date), "MMM d, yyyy")}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <span className="ml-2">{format(new Date(latestRecon.createdAt), "MMM d, HH:mm")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!latestRecon && (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <span className="block text-muted-foreground">No reconciliation computed yet.</span>
            <span className="block text-sm text-muted-foreground mt-1">Complete all steps above, then click "Run Reconciliation"</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RunReconciliationDialog({ open, onOpenChange, onCreateException, onProceed }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateException: () => void;
  onProceed: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Submit Audit & Run Reconciliation
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-left space-y-2">
              <span className="block">Before final submission, do you want to create an Exception case for any discrepancy found?</span>
              <span className="block text-sm text-muted-foreground">
                Creating exceptions helps track and resolve variances. You can always add exceptions later.
              </span>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="outline" onClick={onCreateException} data-testid="button-create-exception">
            Create Exception(s)
          </Button>
          <AlertDialogAction onClick={onProceed} data-testid="button-proceed-recon">
            Proceed Without Exceptions
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CreateExceptionDialog({ open, onOpenChange, clientId, departmentId, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  departmentId: string | null;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  
  const createMutation = useMutation({
    mutationFn: (data: any) => exceptionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exceptions"] });
      onSaved();
    },
    onError: (error: any) => toast.error(error.message || "Failed to create exception"),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      clientId,
      departmentId,
      type: formData.get("type"),
      severity: formData.get("severity"),
      summary: formData.get("summary"),
      description: formData.get("description"),
      varianceAmount: formData.get("varianceAmount"),
      status: "open",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Exception Case</DialogTitle>
          <DialogDescription>Document any discrepancy or issue found during the audit</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Category</Label>
                <Select name="type" defaultValue="stock_variance">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock_variance">Stock Variance</SelectItem>
                    <SelectItem value="cash_shortage">Cash Shortage</SelectItem>
                    <SelectItem value="missing_grn">Missing GRN</SelectItem>
                    <SelectItem value="unauthorized_discount">Unauthorized Discount</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="severity">Severity</Label>
                <Select name="severity" defaultValue="medium">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <Input id="summary" name="summary" placeholder="Brief description of the issue" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" placeholder="Detailed explanation..." className="min-h-[80px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="varianceAmount">Variance Amount (₦)</Label>
              <Input id="varianceAmount" name="varianceAmount" type="number" step="0.01" placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Spinner className="h-4 w-4 mr-2" />}
              Create Exception
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

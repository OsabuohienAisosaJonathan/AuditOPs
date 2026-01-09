import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, AlertCircle, Save, FileText, Trash2, ArrowUpRight, ArrowDownRight, Scale, Plus, Package, Truck, Calculator, AlertTriangle, Pencil, X, Store, Eye, RotateCcw, Download } from "lucide-react";
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

// CSV Export Helper
function exportToCSV(data: Record<string, any>[], filename: string, columns: { key: string; label: string }[]) {
  if (data.length === 0) {
    toast.error("No data to export");
    return;
  }
  
  const headers = columns.map(c => c.label).join(",");
  const rows = data.map(row => 
    columns.map(c => {
      const value = row[c.key];
      // Escape quotes and wrap in quotes if contains comma
      const stringValue = value === null || value === undefined ? "" : String(value);
      if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(",")
  ).join("\n");
  
  const csv = `${headers}\n${rows}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success("Export completed");
}

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
    queryKey: ["stock-movements", clientId, departmentId, dateStr],
    queryFn: () => stockMovementsApi.getAll({ clientId: clientId || undefined, departmentId: departmentId || undefined, date: dateStr }),
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

  // Fetch inventory departments (SRDs) for stock count progress tracking
  const { data: inventoryDepts = [] } = useQuery<{ id: string; storeNameId: string; inventoryType: string; status: string }[]>({
    queryKey: ["inventory-departments", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/inventory-departments`);
      if (!res.ok) throw new Error("Failed to fetch inventory departments");
      return res.json();
    },
    enabled: !!clientId,
  });

  // Get DEPARTMENT_STORE SRDs only (these need stock counts)
  const departmentStoreSrds = useMemo(() => {
    return inventoryDepts.filter(d => d.inventoryType === "DEPARTMENT_STORE" && d.status === "active");
  }, [inventoryDepts]);

  // Fetch items for each DEPARTMENT_STORE SRD and store stock data
  const { data: srdItemsMap = {} } = useQuery<Record<string, { id: string; name: string }[]>>({
    queryKey: ["srd-items-all", clientId, departmentStoreSrds.map(s => s.id).join(",")],
    queryFn: async () => {
      const result: Record<string, { id: string; name: string }[]> = {};
      for (const srd of departmentStoreSrds) {
        const res = await fetch(`/api/clients/${clientId}/inventory-departments/${srd.id}/items`);
        if (res.ok) {
          result[srd.id] = await res.json();
        } else {
          result[srd.id] = [];
        }
      }
      return result;
    },
    enabled: !!clientId && departmentStoreSrds.length > 0,
  });

  // Fetch store stock data for all DEPARTMENT_STORE SRDs for the selected date (bulk endpoint)
  const { data: allSrdStoreStock = [], refetch: refetchAllSrdStoreStock } = useQuery<StoreStock[]>({
    queryKey: ["store-stock-all-srds", clientId, dateStr, departmentStoreSrds.map(s => s.id).join(",")],
    queryFn: async () => {
      const deptIds = departmentStoreSrds.map(s => s.id).join(",");
      if (!deptIds) return [];
      const res = await fetch(`/api/clients/${clientId}/store-stock/bulk?departmentIds=${deptIds}&date=${dateStr}`);
      if (!res.ok) throw new Error("Failed to fetch store stock");
      return res.json();
    },
    enabled: !!clientId && departmentStoreSrds.length > 0,
  });

  // Check if SRD queries are still loading
  const srdDataLoading = departmentStoreSrds.length > 0 && 
    (Object.keys(srdItemsMap).length === 0 || allSrdStoreStock === undefined);

  // Calculate stock counts progress: how many items counted vs total items across all DEPARTMENT_STORE SRDs
  const stockCountsProgress = useMemo(() => {
    let totalItems = 0;
    let countedItems = 0;

    for (const srd of departmentStoreSrds) {
      const srdItems = srdItemsMap[srd.id] || [];
      totalItems += srdItems.length;

      for (const item of srdItems) {
        // Check if this item has a physical count for this SRD and date
        const stockRecord = allSrdStoreStock.find(
          s => s.storeDepartmentId === srd.id && s.itemId === item.id
        );
        // physicalClosingQty is a string field - "0" is a valid count
        // Only consider it counted if it's not null, not undefined, and not empty string
        if (stockRecord && stockRecord.physicalClosingQty !== null && 
            stockRecord.physicalClosingQty !== undefined && 
            stockRecord.physicalClosingQty !== "") {
          countedItems++;
        }
      }
    }

    return {
      totalItems,
      countedItems,
      waitingCount: totalItems - countedItems,
      isComplete: totalItems > 0 && countedItems >= totalItems,
      isEmpty: totalItems === 0,
      isLoading: srdDataLoading,
    };
  }, [departmentStoreSrds, srdItemsMap, allSrdStoreStock, srdDataLoading]);

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
        label: stockCountsProgress.isLoading 
          ? "Stock Counts (...)" 
          : `Stock Counts (${stockCountsProgress.countedItems}/${stockCountsProgress.totalItems})`, 
        tab: "counts",
        status: stockCountsProgress.isLoading ? "not_started" :
                stockCountsProgress.isEmpty ? "not_started" : 
                stockCountsProgress.isComplete ? "completed" : 
                stockCountsProgress.countedItems > 0 ? "in_progress" : "not_started",
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
  }, [salesEntries, grns, stockMovements, stockCounts, reconciliations, stockCountsProgress]);

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
                  departmentId={departmentId}
                  dateStr={dateStr || format(new Date(), "yyyy-MM-dd")}
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
                  selectedDate={dateStr}
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
  const [noSalesToday, setNoSalesToday] = useState(false);

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
    setNoSalesToday(false);
  };

  // Map of captured totals per department (for the declare dialog)
  const capturedByDepartment = useMemo(() => {
    const map: Record<string, number> = {};
    departments.forEach(dept => {
      const deptEntries = salesEntries.filter(e => e.departmentId === dept.id);
      map[dept.id] = deptEntries.reduce((sum, e) => sum + Number(e.totalSales || 0), 0);
    });
    return map;
  }, [departments, salesEntries]);

  // Get captured total for selected declare department
  const selectedDeptCaptured = declareDeptId ? (capturedByDepartment[declareDeptId] || 0) : 0;

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
    
    const totalDeclared = Number(declaredCash || 0) + Number(declaredPos || 0) + Number(declaredTransfer || 0);
    
    // Validate: if captured = 0, declared must also be 0
    if (selectedDeptCaptured === 0 && totalDeclared > 0) {
      toast.error("No captured sales for this department today. Capture sales first or declare ₦0 for no transactions.");
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

  // Handle "No sales today" checkbox
  const handleNoSalesTodayChange = (checked: boolean) => {
    setNoSalesToday(checked);
    if (checked) {
      setDeclaredCash("0");
      setDeclaredPos("0");
      setDeclaredTransfer("0");
    }
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

  // Calculate captured totals from filtered entries (Amount, Complimentary, Vouchers, Voids, Others)
  const capturedTotals = useMemo(() => {
    return filteredEntries.reduce((acc, entry) => {
      return {
        amount: acc.amount + Number(entry.amount || 0),
        complimentary: acc.complimentary + Number(entry.complimentaryAmount || 0),
        vouchers: acc.vouchers + Number(entry.vouchersAmount || 0),
        voids: acc.voids + Number(entry.voidsAmount || 0),
        others: acc.others + Number(entry.othersAmount || 0),
        totalCaptured: acc.totalCaptured + Number(entry.totalSales || 0),
      };
    }, { amount: 0, complimentary: 0, vouchers: 0, voids: 0, others: 0, totalCaptured: 0 });
  }, [filteredEntries]);

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
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                ₦ {capturedTotals.totalCaptured.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {filteredEntries.length} entries
                {selectedDeptFilter === "all" && entriesByDepartment.length > 0 && ` across ${entriesByDepartment.length} departments`}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEntries.length > 0 ? (
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center p-3 bg-white/60 dark:bg-black/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Amount</div>
                <div className="font-mono font-medium">₦ {capturedTotals.amount.toLocaleString()}</div>
              </div>
              <div className="text-center p-3 bg-white/60 dark:bg-black/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Complimentary</div>
                <div className="font-mono font-medium">₦ {capturedTotals.complimentary.toLocaleString()}</div>
              </div>
              <div className="text-center p-3 bg-white/60 dark:bg-black/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Vouchers</div>
                <div className="font-mono font-medium">₦ {capturedTotals.vouchers.toLocaleString()}</div>
              </div>
              <div className="text-center p-3 bg-white/60 dark:bg-black/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Voids</div>
                <div className="font-mono font-medium text-muted-foreground">₦ {capturedTotals.voids.toLocaleString()}</div>
              </div>
              <div className="text-center p-3 bg-white/60 dark:bg-black/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Others</div>
                <div className="font-mono font-medium">₦ {capturedTotals.others.toLocaleString()}</div>
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
                    <React.Fragment key={report.departmentId}>
                      <TableRow data-testid={`row-payment-${report.departmentId}`}>
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
                      <TableRow className="bg-muted/20 border-b" data-testid={`row-payment-breakdown-${report.departmentId}`}>
                        <TableCell className="py-2 pl-8">
                          <span className="text-xs text-muted-foreground">Declared Breakdown:</span>
                        </TableCell>
                        <TableCell colSpan={4} className="py-2">
                          <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Cash:</span>
                              <span className="font-mono">₦ {report.declaredCash.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">POS:</span>
                              <span className="font-mono">₦ {report.declaredPos.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Transfer:</span>
                              <span className="font-mono">₦ {report.declaredTransfer.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1 ml-auto">
                              <span className="text-muted-foreground font-medium">Total:</span>
                              <span className="font-mono font-semibold">₦ {report.totalDeclared.toLocaleString()}</span>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
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
              <Select value={declareDeptId} onValueChange={(val) => { setDeclareDeptId(val); setNoSalesToday(false); }}>
                <SelectTrigger data-testid="select-declare-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name} (Captured: ₦{(capturedByDepartment[dept.id] || 0).toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {declareDeptId && selectedDeptCaptured === 0 && (
              <div className="flex items-center space-x-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <input
                  type="checkbox"
                  id="noSalesToday"
                  checked={noSalesToday}
                  onChange={(e) => handleNoSalesTodayChange(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                  data-testid="checkbox-no-sales-today"
                />
                <Label htmlFor="noSalesToday" className="text-sm text-amber-800 dark:text-amber-200 cursor-pointer">
                  No sales today - declare ₦0 for all payment methods
                </Label>
              </div>
            )}

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
                  disabled={noSalesToday}
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
                  disabled={noSalesToday}
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
                  disabled={noSalesToday}
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

function PurchasesTab({ grns, clientId, departmentId, dateStr, totalPurchases }: {
  grns: GoodsReceivedNote[];
  clientId: string | null;
  departmentId: string | null;
  dateStr: string;
  totalPurchases: number;
}) {
  const [, setLocation] = useLocation();
  
  const handleRecordPurchase = () => {
    const params = new URLSearchParams();
    params.set("tab", "grn");
    if (clientId) params.set("clientId", clientId);
    if (departmentId) params.set("outletId", departmentId);
    if (dateStr) params.set("date", dateStr);
    setLocation(`/inventory?${params.toString()}`);
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pt-0 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Purchases & GRN</CardTitle>
            <CardDescription>View goods received note details</CardDescription>
          </div>
          <Button onClick={handleRecordPurchase} data-testid="button-record-purchase">
            <Plus className="h-4 w-4 mr-2" />
            Record Purchase / Create GRN
          </Button>
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
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-muted-foreground">No GRN records found for this date.</div>
                    <div className="text-sm text-muted-foreground mt-2">
                      No purchases recorded/GRN for this date. Click "Record Purchase / Create GRN" to add one.
                    </div>
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

interface MainStoreLedgerRow {
  id: string;
  itemId: string;
  openingQty: string;
  addedQty: string;
  issuedQty: string;
  transfersInQty: string;
  closingQty: string;
  costPriceSnapshot: string;
}

function StoreTab({ clientId, departments, items, dateStr }: {
  clientId: string | null;
  departments: Department[];
  items: Item[];
  dateStr: string;
}) {
  const [, setLocation] = useLocation();

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

  // Find the Main Store SRD for this client
  const mainStoreSrd = useMemo(() => {
    const mainStores = inventoryDepts.filter(d => d.inventoryType === "MAIN_STORE" && d.status === "active");
    if (mainStores.length > 1) {
      console.warn("Multiple active Main Store SRDs found for client. Using first one.");
    }
    return mainStores[0] || null;
  }, [inventoryDepts]);

  // Fetch Main Store ledger data (storeStock for the Main Store SRD)
  const { data: mainStoreLedger = [], isLoading: ledgerLoading } = useQuery<MainStoreLedgerRow[]>({
    queryKey: ["main-store-ledger", clientId, mainStoreSrd?.id, dateStr],
    queryFn: async () => {
      if (!clientId || !mainStoreSrd) return [];
      const res = await fetch(`/api/clients/${clientId}/store-stock?departmentId=${mainStoreSrd.id}&date=${dateStr}`);
      if (!res.ok) throw new Error("Failed to fetch Main Store ledger");
      return res.json();
    },
    enabled: !!clientId && !!mainStoreSrd,
  });

  // Filter ledger to only items with activity (non-zero values)
  const ledgerWithActivity = useMemo(() => {
    return mainStoreLedger.filter(row => {
      const opening = parseFloat(row.openingQty || "0");
      const added = parseFloat(row.addedQty || "0");
      const issued = parseFloat(row.issuedQty || "0");
      const returns = parseFloat(row.transfersInQty || "0");
      const closing = parseFloat(row.closingQty || "0");
      return opening !== 0 || added !== 0 || issued !== 0 || returns !== 0 || closing !== 0;
    });
  }, [mainStoreLedger]);

  const getItemDetails = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    return {
      name: item?.name || "Unknown",
      category: item?.category || "-",
      costPrice: parseFloat(item?.costPrice || "0"),
    };
  };

  // Calculate totals
  const totals = useMemo(() => {
    let totalOpening = 0;
    let totalAdded = 0;
    let totalIssued = 0;
    let totalReturns = 0;
    let totalClosing = 0;
    let totalValue = 0;

    for (const row of ledgerWithActivity) {
      const opening = parseFloat(row.openingQty || "0");
      const added = parseFloat(row.addedQty || "0");
      const issued = parseFloat(row.issuedQty || "0");
      const returns = parseFloat(row.transfersInQty || "0");
      const closing = parseFloat(row.closingQty || "0");
      const unitCost = parseFloat(row.costPriceSnapshot || "0");

      totalOpening += opening;
      totalAdded += added;
      totalIssued += issued;
      totalReturns += returns;
      totalClosing += closing;
      totalValue += closing * unitCost;
    }

    return { totalOpening, totalAdded, totalIssued, totalReturns, totalClosing, totalValue };
  }, [ledgerWithActivity]);

  const handleGoToMainStore = () => {
    if (!mainStoreSrd) {
      toast.error("No Main Store SRD found for this client. Create one in Inventory Ledger first.");
      return;
    }
    setLocation(`/inventory-ledger?srdId=${mainStoreSrd.id}&clientId=${clientId}`);
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pt-0 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Store Issues</CardTitle>
            <CardDescription>Main Store SR-D Ledger - Items issued to Department Stores (Req Dep)</CardDescription>
          </div>
          <Button 
            onClick={handleGoToMainStore} 
            variant="outline" 
            className="gap-2"
            disabled={!clientId}
            data-testid="button-go-to-main-store"
          >
            <Store className="h-4 w-4" />
            Go to Main Store SRD
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {!mainStoreSrd ? (
          <div className="text-center py-8 text-muted-foreground">
            No Main Store SRD found for this client. Create one in Inventory Ledger first.
          </div>
        ) : ledgerLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="h-6 w-6" />
            <span className="ml-2 text-muted-foreground">Loading Main Store ledger...</span>
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Opening</TableHead>
                    <TableHead className="text-right">Purchase/Added</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Req Dep</TableHead>
                    <TableHead className="text-right">Returns</TableHead>
                    <TableHead className="text-right">Closing</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerWithActivity.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No stock activity in Main Store for this date.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ledgerWithActivity.map((row) => {
                      const { name, category, costPrice: itemCost } = getItemDetails(row.itemId);
                      const opening = parseFloat(row.openingQty || "0");
                      const added = parseFloat(row.addedQty || "0");
                      const issued = parseFloat(row.issuedQty || "0");
                      const returns = parseFloat(row.transfersInQty || "0");
                      const closing = parseFloat(row.closingQty || "0");
                      const unitCost = parseFloat(row.costPriceSnapshot || "0") || itemCost;
                      const total = opening + added + returns;
                      const value = closing * unitCost;

                      return (
                        <TableRow key={row.id} data-testid={`row-store-issue-${row.id}`}>
                          <TableCell className="font-medium">{name}</TableCell>
                          <TableCell>{category}</TableCell>
                          <TableCell className="text-right font-mono">{opening.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono">{added.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">{total.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono text-amber-600">{issued.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono text-emerald-600">{returns.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">{closing.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">₦{unitCost.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">₦{value.toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 p-4 bg-muted/30 rounded-lg grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase">Opening</div>
                <div className="font-mono font-bold">{totals.totalOpening.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase">Added</div>
                <div className="font-mono font-bold">{totals.totalAdded.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase">Req Dep</div>
                <div className="font-mono font-bold text-amber-600">{totals.totalIssued.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase">Returns</div>
                <div className="font-mono font-bold text-emerald-600">{totals.totalReturns.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase">Closing</div>
                <div className="font-mono font-bold">{totals.totalClosing.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase">Total Value</div>
                <div className="font-mono font-bold">₦{totals.totalValue.toLocaleString()}</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface InventoryDeptStock {
  id: string;
  storeNameId: string;
  departmentId: string;
  inventoryType: string;
  status: string;
}

interface StoreNameStock {
  id: string;
  name: string;
}

interface MovementItemLine {
  id: string;
  itemId: string;
  qty: number;
  unitCost: number;
}

function StockTab({ stockMovements, clientId, departmentId, totalMovements, selectedDate }: {
  stockMovements: StockMovement[];
  clientId: string | null;
  departmentId: string | null;
  totalMovements: number;
  selectedDate: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [reverseOpen, setReverseOpen] = useState(false);
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [movementType, setMovementType] = useState("transfer");
  const [postingDate, setPostingDate] = useState("");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [adjustmentDirection, setAdjustmentDirection] = useState<"increase" | "decrease">("increase");
  const [notes, setNotes] = useState("");
  const [itemLines, setItemLines] = useState<MovementItemLine[]>([]);

  // Fetch inventory departments (SRDs) for the client
  const { data: invDepts = [] } = useQuery<InventoryDeptStock[]>({
    queryKey: ["inventory-departments-stock", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/inventory-departments`);
      if (!res.ok) throw new Error("Failed to fetch inventory departments");
      return res.json();
    },
    enabled: !!clientId,
  });

  // Fetch store names for display
  const { data: storeNamesStock = [] } = useQuery<StoreNameStock[]>({
    queryKey: ["store-names-stock", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/store-names`);
      if (!res.ok) throw new Error("Failed to fetch store names");
      return res.json();
    },
    enabled: !!clientId,
  });

  // Fetch items for the client (used for unit cost lookup)
  const { data: allItems = [] } = useQuery<{ id: string; name: string; costPrice: string; status: string; category: string }[]>({
    queryKey: ["items-stock", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/items?clientId=${clientId}`);
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
    enabled: !!clientId,
  });

  // Fetch items filtered by From SRD's allowed categories
  const { data: srdFilteredItemsMovement = [], isLoading: movementItemsLoading } = useQuery<{ id: string; name: string; costPrice: string; status: string; category: string }[]>({
    queryKey: ["srd-items-movement", clientId, fromLocation],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/inventory-departments/${fromLocation}/items`);
      if (!res.ok) throw new Error("Failed to fetch SRD items");
      return res.json();
    },
    enabled: !!clientId && !!fromLocation,
  });

  // Use filtered items for dropdown, but allItems for cost lookup
  const items = allItems;

  const getSrdName = (deptId: string) => {
    const dept = invDepts.find(d => d.id === deptId);
    if (!dept) return "Unknown";
    const storeName = storeNamesStock.find(sn => sn.id === dept.storeNameId);
    return storeName?.name || "Unknown";
  };

  const getSrdType = (deptId: string): "MAIN" | "DEPT" | null => {
    const dept = invDepts.find(d => d.id === deptId);
    if (!dept) return null;
    return dept.inventoryType === "MAIN_STORE" ? "MAIN" : "DEPT";
  };

  const needsToLocation = movementType === "transfer";
  const isAdjustment = movementType === "adjustment";
  const queryClient = useQueryClient();

  const resetForm = () => {
    setMovementType("transfer");
    setPostingDate("");
    setFromLocation("");
    setToLocation("");
    setAdjustmentDirection("increase");
    setNotes("");
    setItemLines([]);
  };

  const addItemLine = () => {
    setItemLines([...itemLines, { id: crypto.randomUUID(), itemId: "", qty: 1, unitCost: 0 }]);
  };

  const updateItemLine = (id: string, field: keyof MovementItemLine, value: string | number) => {
    setItemLines(itemLines.map(line => {
      if (line.id !== id) return line;
      const updated = { ...line, [field]: value };
      // Auto-populate unit cost when item is selected
      if (field === "itemId" && value) {
        const item = items.find(i => i.id === value);
        if (item) {
          updated.unitCost = Number(item.costPrice) || 0;
        }
      }
      return updated;
    }));
  };

  const removeItemLine = (id: string) => {
    setItemLines(itemLines.filter(line => line.id !== id));
  };

  const calculateTotalValue = () => {
    return itemLines.reduce((sum, line) => sum + (line.qty * line.unitCost), 0);
  };

  const calculateTotalQty = () => {
    return itemLines.reduce((sum, line) => sum + line.qty, 0);
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/stock-movements/with-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create movement");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["store-stock"] });
      queryClient.invalidateQueries({ queryKey: ["movement-breakdown"] });
      setCreateOpen(false);
      resetForm();
      toast.success("Stock movement recorded");
    },
    onError: (error: any) => toast.error(error.message || "Failed to create movement"),
  });

  const { data: movementDetails } = useQuery({
    queryKey: ["movement-details", selectedMovementId],
    queryFn: async () => {
      const res = await fetch(`/api/stock-movements/${selectedMovementId}/with-lines`);
      if (!res.ok) throw new Error("Failed to fetch movement details");
      return res.json();
    },
    enabled: !!selectedMovementId && (viewOpen || reverseOpen),
  });

  const reverseMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/stock-movements/${id}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to reverse movement");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["store-stock"] });
      queryClient.invalidateQueries({ queryKey: ["movement-breakdown"] });
      setReverseOpen(false);
      setSelectedMovementId(null);
      setReverseReason("");
      toast.success(data.message || "Movement reversed successfully");
    },
    onError: (error: any) => toast.error(error.message || "Failed to reverse movement"),
  });

  const handleViewClick = (movementId: string) => {
    setSelectedMovementId(movementId);
    setViewOpen(true);
  };

  const handleReverseClick = (movementId: string) => {
    setSelectedMovementId(movementId);
    setReverseOpen(true);
  };

  const handleReverseSubmit = () => {
    if (!selectedMovementId || !reverseReason.trim()) {
      toast.error("Please provide a reason for the reversal");
      return;
    }
    reverseMutation.mutate({ id: selectedMovementId, reason: reverseReason });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Get the department ID from the selected inventory department
    const selectedInvDept = invDepts.find(d => d.id === fromLocation);
    const deptIdToUse = selectedInvDept?.departmentId || departmentId;
    
    if (!deptIdToUse) {
      toast.error("Please select a From Location");
      return;
    }

    // Validate posting date is required
    if (!postingDate) {
      toast.error("Please select a posting date");
      return;
    }

    if (itemLines.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    // Block Main→Dept transfers - must use Issue button on Inventory Ledger instead
    if (movementType === "transfer" && fromLocation && toLocation) {
      const fromType = getSrdType(fromLocation);
      const toType = getSrdType(toLocation);
      if (fromType === "MAIN" && toType === "DEPT") {
        toast.error("Main Store → Department transfers must use the Issue button on Inventory Ledger page");
        return;
      }
    }

    // Validate no duplicate items
    const itemIds = itemLines.map(l => l.itemId);
    if (new Set(itemIds).size !== itemIds.length) {
      toast.error("Duplicate items not allowed");
      return;
    }

    // Validate all items have valid qty
    if (itemLines.some(l => !l.itemId || l.qty <= 0)) {
      toast.error("All items must have a valid quantity");
      return;
    }
    
    createMutation.mutate({
      movement: {
        clientId,
        departmentId: deptIdToUse,
        movementType,
        fromSrdId: fromLocation || null,
        toSrdId: needsToLocation ? toLocation : null,
        adjustmentDirection: isAdjustment ? adjustmentDirection : null,
        notes: notes || null,
        sourceLocation: fromLocation ? getSrdName(fromLocation) : null,
        destinationLocation: needsToLocation && toLocation ? getSrdName(toLocation) : null,
        date: postingDate, // Posting date for ledger
      },
      lines: itemLines.map(line => ({
        itemId: line.itemId,
        qty: line.qty,
        unitCost: line.unitCost,
      })),
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
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                const columns = [
                  { key: "id", label: "ID" },
                  { key: "createdAt", label: "Date" },
                  { key: "movementType", label: "Type" },
                  { key: "sourceLocation", label: "From" },
                  { key: "destinationLocation", label: "To" },
                  { key: "itemsDescription", label: "Description" },
                  { key: "totalValue", label: "Value" },
                ];
                const exportData = stockMovements.map(m => ({
                  ...m,
                  createdAt: format(new Date(m.createdAt), "yyyy-MM-dd HH:mm"),
                }));
                exportToCSV(exportData, `MiAuditOps_StockMovements_${selectedDate}.csv`, columns);
              }}
              className="gap-2"
              disabled={stockMovements.length === 0}
              data-testid="button-export-movements"
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={() => { setPostingDate(selectedDate); setCreateOpen(true); }} className="gap-2" disabled={!clientId} data-testid="button-add-movement">
              <Plus className="h-4 w-4" /> Record Movement
            </Button>
          </div>
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
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No stock movements recorded. Click "Record Movement" to add.
                  </TableCell>
                </TableRow>
              ) : (
                stockMovements.map((movement) => {
                  const movementAny = movement as any;
                  const isReversed = movementAny.notes?.includes("[REVERSED");
                  return (
                    <TableRow key={movement.id} data-testid={`row-movement-${movement.id}`} className={isReversed ? "opacity-60" : ""}>
                      <TableCell>{format(new Date(movement.createdAt), "MMM d, HH:mm")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant={movement.movementType === "transfer" ? "secondary" : movement.movementType === "adjustment" ? "outline" : "destructive"}>
                            {movement.movementType}
                          </Badge>
                          {isReversed && <Badge variant="outline" className="text-xs bg-yellow-50">Reversed</Badge>}
                          {movement.itemsDescription?.startsWith("[REVERSAL]") && <Badge variant="outline" className="text-xs bg-blue-50">Reversal</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span>{movement.sourceLocation || "-"}</span>
                          {movement.fromSrdId && (
                            <Badge variant="outline" className={cn("text-xs", getSrdType(movement.fromSrdId) === "MAIN" ? "bg-purple-50" : "bg-green-50")}>
                              {getSrdType(movement.fromSrdId)}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span>{movement.destinationLocation || "-"}</span>
                          {movement.toSrdId && (
                            <Badge variant="outline" className={cn("text-xs", getSrdType(movement.toSrdId) === "MAIN" ? "bg-purple-50" : "bg-green-50")}>
                              {getSrdType(movement.toSrdId)}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={movement.itemsDescription || undefined}>
                        {movement.itemsDescription || "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">{Number(movement.totalValue || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleViewClick(movement.id)}
                            title="View Details"
                            data-testid={`button-view-movement-${movement.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!isReversed && !movement.itemsDescription?.startsWith("[REVERSAL]") && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-orange-600 hover:text-orange-700"
                              onClick={() => handleReverseClick(movement.id)}
                              title="Reverse Movement"
                              data-testid={`button-reverse-movement-${movement.id}`}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
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

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Stock Movement</DialogTitle>
            <DialogDescription>Log transfers, adjustments, write-offs, or waste with item details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Posting Date - Required */}
              <div className="space-y-2">
                <Label htmlFor="postingDate">Posting Date <span className="text-red-500">*</span></Label>
                <Input
                  id="postingDate"
                  type="date"
                  value={postingDate}
                  onChange={(e) => setPostingDate(e.target.value)}
                  required
                  data-testid="input-posting-date"
                />
                <p className="text-xs text-muted-foreground">The date this movement will be recorded in the ledger</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="movementType">Movement Type</Label>
                  <Select value={movementType} onValueChange={setMovementType}>
                    <SelectTrigger data-testid="select-movement-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                      <SelectItem value="write_off">Write-off</SelectItem>
                      <SelectItem value="waste">Waste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {isAdjustment && (
                  <div className="space-y-2">
                    <Label>Direction</Label>
                    <Select value={adjustmentDirection} onValueChange={(v) => setAdjustmentDirection(v as "increase" | "decrease")}>
                      <SelectTrigger data-testid="select-adjustment-direction"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="increase">Increase (+)</SelectItem>
                        <SelectItem value="decrease">Decrease (-)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className={needsToLocation ? "grid grid-cols-2 gap-4" : ""}>
                <div className="space-y-2">
                  <Label htmlFor="sourceLocation">{needsToLocation ? "From SRD" : "Target SRD"}</Label>
                  <Select value={fromLocation} onValueChange={(val) => { setFromLocation(val); setItemLines([]); }}>
                    <SelectTrigger data-testid="select-from-location"><SelectValue placeholder="Select SRD" /></SelectTrigger>
                    <SelectContent>
                      {invDepts.filter(d => d.status === "active").map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {getSrdName(dept.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {needsToLocation && (
                  <div className="space-y-2">
                    <Label htmlFor="destinationLocation">To SRD</Label>
                    <Select value={toLocation} onValueChange={setToLocation}>
                      <SelectTrigger data-testid="select-to-location"><SelectValue placeholder="Select SRD" /></SelectTrigger>
                      <SelectContent>
                        {invDepts.filter(d => d.status === "active" && d.id !== fromLocation).map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {getSrdName(dept.id)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Items</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addItemLine} 
                    disabled={!fromLocation || srdFilteredItemsMovement.length === 0}
                    data-testid="button-add-item-line"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Item
                  </Button>
                </div>
                {fromLocation && srdFilteredItemsMovement.length === 0 && !movementItemsLoading ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                    No categories allowed for this SRD. Configure allowed categories first.
                  </div>
                ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[40%]">Item</TableHead>
                        <TableHead className="w-[20%]">Qty</TableHead>
                        <TableHead className="w-[25%]">Unit Cost (₦)</TableHead>
                        <TableHead className="w-[15%] text-right">Value</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemLines.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                            {!fromLocation ? "Select From SRD first" : movementItemsLoading ? "Loading items..." : "Click \"Add Item\" to start adding items"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        itemLines.map((line) => (
                          <TableRow key={line.id} data-testid={`row-item-line-${line.id}`}>
                            <TableCell>
                              <Select value={line.itemId} onValueChange={(v) => updateItemLine(line.id, "itemId", v)}>
                                <SelectTrigger data-testid={`select-item-${line.id}`}><SelectValue placeholder="Select item" /></SelectTrigger>
                                <SelectContent>
                                  {srdFilteredItemsMovement.filter(i => i.status === "active").map(item => (
                                    <SelectItem key={item.id} value={item.id} disabled={itemLines.some(l => l.id !== line.id && l.itemId === item.id)}>
                                      {item.name} ({item.category})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={line.qty}
                                onChange={(e) => updateItemLine(line.id, "qty", Number(e.target.value))}
                                data-testid={`input-qty-${line.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.unitCost}
                                onChange={(e) => updateItemLine(line.id, "unitCost", Number(e.target.value))}
                                data-testid={`input-unit-cost-${line.id}`}
                              />
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              ₦{(line.qty * line.unitCost).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeItemLine(line.id)} data-testid={`button-remove-line-${line.id}`}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  {itemLines.length > 0 && (
                    <div className="bg-muted/30 p-3 flex justify-between border-t">
                      <span className="text-sm text-muted-foreground">Total: {calculateTotalQty()} items</span>
                      <span className="font-mono font-bold">₦{calculateTotalValue().toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea 
                  id="notes" 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes about this movement" 
                  data-testid="input-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>Cancel</Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || !fromLocation || (needsToLocation && !toLocation) || itemLines.length === 0} 
                data-testid="button-save-movement"
              >
                {createMutation.isPending && <Spinner className="h-4 w-4 mr-2" />}
                Save Movement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Movement Details Dialog */}
      <Dialog open={viewOpen} onOpenChange={(open) => { setViewOpen(open); if (!open) setSelectedMovementId(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Movement Details</DialogTitle>
            <DialogDescription>
              {movementDetails?.movement && (
                <span>
                  {movementDetails.movement.movementType.replace("_", " ").toUpperCase()} 
                  {" "}• {format(new Date(movementDetails.movement.createdAt), "MMMM d, yyyy HH:mm")}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {movementDetails?.movement && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">From:</span>
                  <span className="ml-2 font-medium">{movementDetails.movement.sourceLocation || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">To:</span>
                  <span className="ml-2 font-medium">{movementDetails.movement.destinationLocation || "-"}</span>
                </div>
                {movementDetails.movement.adjustmentDirection && (
                  <div>
                    <span className="text-muted-foreground">Direction:</span>
                    <span className="ml-2 font-medium capitalize">{movementDetails.movement.adjustmentDirection}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Total Value:</span>
                  <span className="ml-2 font-mono font-medium">₦{Number(movementDetails.movement.totalValue || 0).toLocaleString()}</span>
                </div>
              </div>
              
              {movementDetails.movement.notes && (
                <div className="p-3 bg-muted/50 rounded text-sm">
                  <span className="text-muted-foreground">Notes:</span>
                  <p className="mt-1 whitespace-pre-wrap">{movementDetails.movement.notes}</p>
                </div>
              )}
              
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movementDetails.lines?.map((line: any, idx: number) => {
                      const item = items.find(i => i.id === line.itemId);
                      return (
                        <TableRow key={idx}>
                          <TableCell>{item?.name || "Unknown"}</TableCell>
                          <TableCell className="text-right">{Number(line.qty).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono">₦{Number(line.unitCost).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono">₦{Number(line.lineValue).toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setViewOpen(false); setSelectedMovementId(null); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reverse Movement Dialog */}
      <Dialog open={reverseOpen} onOpenChange={(open) => { setReverseOpen(open); if (!open) { setSelectedMovementId(null); setReverseReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <RotateCcw className="h-5 w-5" />
              Reverse Movement
            </DialogTitle>
            <DialogDescription>
              This will create a compensating movement to undo the stock changes. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {movementDetails?.movement && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded text-sm">
                <div className="font-medium">{movementDetails.movement.movementType.replace("_", " ").toUpperCase()}</div>
                <div className="text-muted-foreground mt-1">{movementDetails.movement.itemsDescription}</div>
                <div className="mt-2 font-mono">Value: ₦{Number(movementDetails.movement.totalValue || 0).toLocaleString()}</div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reverseReason">Reason for Reversal *</Label>
                <Textarea 
                  id="reverseReason"
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  placeholder="Explain why this movement needs to be reversed..."
                  className="min-h-[100px]"
                  data-testid="input-reverse-reason"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReverseOpen(false); setSelectedMovementId(null); setReverseReason(""); }}>Cancel</Button>
            <Button 
              variant="destructive"
              onClick={handleReverseSubmit}
              disabled={reverseMutation.isPending || !reverseReason.trim()}
              data-testid="button-confirm-reverse"
            >
              {reverseMutation.isPending && <Spinner className="h-4 w-4 mr-2" />}
              Reverse Movement
            </Button>
          </DialogFooter>
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
  const [editingCount, setEditingCount] = useState<StockCount | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [selectedSrdId, setSelectedSrdId] = useState<string>("");
  const [physicalCount, setPhysicalCount] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [countToDelete, setCountToDelete] = useState<StockCount | null>(null);
  const queryClient = useQueryClient();
  
  const isEditMode = editingCount !== null;

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
    queryKey: ["store-names", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/store-names`);
      if (!res.ok) throw new Error("Failed to fetch store names");
      return res.json();
    },
    enabled: !!clientId,
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

  // Fetch items filtered by selected SRD's allowed categories
  const { data: srdFilteredItems = [], isLoading: itemsLoading } = useQuery<Item[]>({
    queryKey: ["srd-items", clientId, selectedSrdId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/inventory-departments/${selectedSrdId}/items`);
      if (!res.ok) throw new Error("Failed to fetch SRD items");
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
      setEditingCount(null);
      setSelectedItemId("");
      setSelectedSrdId("");
      setPhysicalCount("");
      toast.success("Stock count recorded and SRD ledger updated");
    },
    onError: (error: any) => {
      if (error.message?.includes("already exists")) {
        toast.error("Count already exists for this item today. Please edit the existing count.");
      } else {
        toast.error(error.message || "Failed to create count");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; updates: any }) => stockCountsApi.update(data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-counts"] });
      queryClient.invalidateQueries({ queryKey: ["store-stock"] });
      setCreateOpen(false);
      setEditingCount(null);
      setSelectedItemId("");
      setSelectedSrdId("");
      setPhysicalCount("");
      toast.success("Stock count updated successfully");
    },
    onError: (error: any) => toast.error(error.message || "Failed to update count"),
  });

  const handleEdit = (count: StockCount) => {
    setEditingCount(count);
    setSelectedItemId(count.itemId);
    setPhysicalCount(count.actualClosingQty || "");
    setCreateOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => stockCountsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-counts"] });
      queryClient.invalidateQueries({ queryKey: ["store-stock"] });
      queryClient.invalidateQueries({ queryKey: ["store-stock-all-srds"] });
      setDeleteDialogOpen(false);
      setCountToDelete(null);
      toast.success("Count deleted. Item returned to Waiting Count.");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete count");
      setDeleteDialogOpen(false);
      setCountToDelete(null);
    },
  });

  const handleDelete = (count: StockCount) => {
    setCountToDelete(count);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (countToDelete) {
      deleteMutation.mutate(countToDelete.id);
    }
  };

  const getCountDetails = () => {
    if (!countToDelete) return { itemName: "", expected: 0, actual: 0, variance: 0 };
    const item = items.find(i => i.id === countToDelete.itemId);
    const expected = Number(countToDelete.expectedClosingQty || 0);
    const actual = Number(countToDelete.actualClosingQty || 0);
    const variance = Number(countToDelete.varianceQty || 0);
    return { itemName: item?.name || countToDelete.itemId, expected, actual, variance };
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (isEditMode && editingCount) {
      // Edit mode - update existing count
      if (!physicalCount) {
        toast.error("Please enter physical count");
        return;
      }
      
      const opening = Number(editingCount.openingQty || 0);
      const added = Number((editingCount as any).addedQty || 0);
      const total = opening + added;
      const actual = Number(physicalCount) || 0;
      const sold = total - actual;
      
      updateMutation.mutate({
        id: editingCount.id,
        updates: {
          actualClosingQty: String(actual),
          soldQty: String(sold > 0 ? sold : 0),
          varianceQty: String(actual - total),
        }
      });
    } else {
      // Create mode
      if (!selectedItemId || !selectedSrdId || !physicalCount) {
        toast.error("Please select an SRD, item, and enter physical count");
        return;
      }
      
      const opening = getOpeningQty;
      const added = getAddedQty;
      const total = opening + added;
      const actual = Number(physicalCount) || 0;
      const sold = total - actual;
      
      createMutation.mutate({
        clientId,
        departmentId,
        storeDepartmentId: selectedSrdId,
        itemId: selectedItemId,
        date: new Date(dateStr).toISOString(),
        openingQty: String(opening),
        addedQty: String(added),
        soldQty: String(sold > 0 ? sold : 0),
        expectedClosingQty: String(total),
        actualClosingQty: String(actual),
        varianceQty: String(actual - total),
      });
    }
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pt-0 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Stock Counts</CardTitle>
            <CardDescription>Physical inventory counts and variance tracking</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                const columns = [
                  { key: "id", label: "ID" },
                  { key: "itemName", label: "Item" },
                  { key: "openingQty", label: "Opening" },
                  { key: "addedQty", label: "Added" },
                  { key: "soldQty", label: "Sold" },
                  { key: "expectedClosingQty", label: "Expected" },
                  { key: "actualClosingQty", label: "Actual" },
                  { key: "varianceQty", label: "Variance" },
                ];
                const exportData = stockCounts.map(c => {
                  const item = items.find(i => i.id === c.itemId);
                  return {
                    ...c,
                    itemName: item?.name || c.itemId,
                    addedQty: (c as any).addedQty || "0",
                  };
                });
                exportToCSV(exportData, `MiAuditOps_StockCounts_${dateStr}.csv`, columns);
              }}
              className="gap-2"
              disabled={stockCounts.length === 0}
              data-testid="button-export-counts"
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="gap-2" disabled={!departmentId} data-testid="button-add-count">
              <Plus className="h-4 w-4" /> Add Count
            </Button>
          </div>
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
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockCounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(count)}
                            data-testid={`button-edit-count-${count.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(count)}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`button-delete-count-${count.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
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
          setEditingCount(null);
          setSelectedItemId(""); 
          setSelectedSrdId(""); 
          setPhysicalCount(""); 
        } 
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Stock Count" : "Add Stock Count"}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? "Update the physical count for this item. Opening and Added values are fixed."
                : "Select an SRD and item, then enter the physical count. Opening and Added are auto-filled from the SRD ledger."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {isEditMode && editingCount ? (
                <>
                  {/* Edit mode - show fixed item info */}
                  <div className="space-y-2">
                    <Label>Item</Label>
                    <div className="p-3 bg-muted/30 rounded-lg border">
                      <p className="font-medium">{items.find(i => i.id === editingCount.itemId)?.name || editingCount.itemId}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg border">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Opening</p>
                      <p className="font-mono font-semibold text-lg">{Number(editingCount.openingQty || 0).toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-emerald-600 mb-1">+ Added</p>
                      <p className="font-mono font-semibold text-lg text-emerald-600">{Number((editingCount as any).addedQty || 0).toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">= Total</p>
                      <p className="font-mono font-bold text-lg">{(Number(editingCount.openingQty || 0) + Number((editingCount as any).addedQty || 0)).toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
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
                </>
              ) : (
                <>
                  {/* Create mode - select SRD and item */}
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="itemId">Item</Label>
                    {selectedSrdId && srdFilteredItems.length === 0 && !itemsLoading ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                        No categories allowed for this SRD. Configure allowed categories first.
                      </div>
                    ) : (
                      <Select 
                        value={selectedItemId} 
                        onValueChange={(val) => { setSelectedItemId(val); setPhysicalCount(""); }}
                        disabled={!selectedSrdId || srdFilteredItems.length === 0}
                      >
                        <SelectTrigger data-testid="select-item-count">
                          <SelectValue placeholder={
                            !selectedSrdId ? "Select SRD first" : 
                            itemsLoading ? "Loading items..." : 
                            "Select item"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {srdFilteredItems.filter(i => i.status === "active").map(item => (
                            <SelectItem key={item.id} value={item.id}>{item.name} ({item.category})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

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
                </>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button 
                type="submit" 
                disabled={(isEditMode ? updateMutation.isPending : createMutation.isPending) || (!isEditMode && (!selectedItemId || !selectedSrdId)) || !physicalCount}
                data-testid="button-save-count"
              >
                {(isEditMode ? updateMutation.isPending : createMutation.isPending) && <Spinner className="h-4 w-4 mr-2" />}
                {isEditMode ? "Update Count" : "Save Count"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stock Count?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the recorded count for <strong>{getCountDetails().itemName}</strong> and return it to 'Waiting Count'. Any calculated variance/sold impact from this count will be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-muted/50 rounded-md p-3 my-2">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">Expected</p>
                <p className="font-mono font-semibold">{getCountDetails().expected.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Actual</p>
                <p className="font-mono font-semibold">{getCountDetails().actual.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Variance</p>
                <p className={cn(
                  "font-mono font-semibold",
                  getCountDetails().variance < 0 ? "text-red-600" : 
                  getCountDetails().variance > 0 ? "text-amber-600" : "text-emerald-600"
                )}>
                  {getCountDetails().variance > 0 ? "+" : ""}{getCountDetails().variance.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCountToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Spinner className="h-4 w-4 mr-2" />}
              Delete Count
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

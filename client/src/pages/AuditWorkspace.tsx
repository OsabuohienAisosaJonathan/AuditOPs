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
  storeIssuesApi, storeStockApi,
  type SalesEntry, type SalesSummary, type Purchase, type StockMovement, type StockCount, type Reconciliation, type Item, type Supplier,
  type StoreIssue, type StoreIssueLine, type StoreStock, type Department
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
    queryFn: () => salesEntriesApi.getSummary({ clientId: clientId!, date: dateStr }),
    enabled: !!clientId,
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases", clientId, departmentId],
    queryFn: () => purchasesApi.getAll(clientId || undefined, departmentId || undefined),
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
        status: getStepStatus(purchases.length > 0, purchases.length),
        lastUpdated: purchases.length > 0 ? format(new Date(purchases[0].createdAt), "HH:mm") : undefined,
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
  }, [salesEntries, purchases, stockMovements, stockCounts, reconciliations]);

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

  const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
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
                  salesSummary={salesSummary}
                  clientId={clientId}
                  departments={departments}
                  dateStr={dateStr}
                />
              </TabsContent>

              <TabsContent value="purchases" className="mt-0">
                <PurchasesTab 
                  purchases={purchases}
                  suppliers={suppliers}
                  items={items}
                  clientId={clientId}
                  departmentId={departmentId}
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
                        <TableHead className="text-right">Cash (₦)</TableHead>
                        <TableHead className="text-right">POS (₦)</TableHead>
                        <TableHead className="text-right">Transfer (₦)</TableHead>
                        <TableHead className="text-right">Voids (₦)</TableHead>
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
                          <TableCell className="text-right font-mono">{Number(entry.cashAmount || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono">{Number(entry.posAmount || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono">{Number(entry.transferAmount || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">{Number(entry.voidsAmount || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold font-mono">{Number(entry.totalSales || 0).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/20">
                        <TableCell colSpan={2} className="font-medium">Subtotal</TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          ₦ {entries.reduce((sum, e) => sum + Number(e.cashAmount || 0), 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          ₦ {entries.reduce((sum, e) => sum + Number(e.posAmount || 0), 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          ₦ {entries.reduce((sum, e) => sum + Number(e.transferAmount || 0), 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          ₦ {entries.reduce((sum, e) => sum + Number(e.voidsAmount || 0), 0).toLocaleString()}
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
    </div>
  );
}

function PurchasesTab({ purchases, suppliers, items, clientId, departmentId, totalPurchases }: {
  purchases: Purchase[];
  suppliers: Supplier[];
  items: Item[];
  clientId: string | null;
  departmentId: string | null;
  totalPurchases: number;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => purchasesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      setCreateOpen(false);
      toast.success("Purchase recorded");
    },
    onError: (error: any) => toast.error(error.message || "Failed to create purchase"),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      clientId,
      departmentId,
      supplierName: formData.get("supplier"),
      invoiceRef: formData.get("invoiceRef"),
      invoiceDate: formData.get("invoiceDate"),
      totalAmount: formData.get("totalAmount"),
    });
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pt-0 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Purchases & GRN</CardTitle>
            <CardDescription>Record purchases and goods received</CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2" disabled={!clientId} data-testid="button-add-purchase">
            <Plus className="h-4 w-4" /> Record Purchase
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
              {purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No purchases recorded. Click "Record Purchase" to add.
                  </TableCell>
                </TableRow>
              ) : (
                purchases.map((purchase) => (
                  <TableRow key={purchase.id} data-testid={`row-purchase-${purchase.id}`}>
                    <TableCell>{format(new Date(purchase.invoiceDate), "MMM d, yyyy")}</TableCell>
                    <TableCell className="font-medium">{purchase.supplierName}</TableCell>
                    <TableCell>{purchase.invoiceRef}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{Number(purchase.totalAmount || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={purchase.status === "received" ? "default" : "secondary"}>
                        {purchase.status || "pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {purchase.evidenceUrl ? (
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Purchase</DialogTitle>
            <DialogDescription>Enter purchase details and attach invoice if available</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Input id="supplier" name="supplier" placeholder="Supplier name" required data-testid="input-supplier" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceRef">Invoice Reference</Label>
                  <Input id="invoiceRef" name="invoiceRef" placeholder="INV-001" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoiceDate">Invoice Date</Label>
                  <Input id="invoiceDate" name="invoiceDate" type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Amount (₦)</Label>
                <Input id="totalAmount" name="totalAmount" type="number" step="0.01" placeholder="0.00" required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Spinner className="h-4 w-4 mr-2" />}
                Save Purchase
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function StoreTab({ clientId, departments, items, dateStr }: {
  clientId: string | null;
  departments: Department[];
  items: Item[];
  dateStr: string;
}) {
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [selectedFromDept, setSelectedFromDept] = useState<string>("");
  const [selectedToDept, setSelectedToDept] = useState<string>("");
  const [issueLines, setIssueLines] = useState<{ itemId: string; qtyIssued: string; costPriceSnapshot: string }[]>([]);
  const queryClient = useQueryClient();

  const storeDepartments = departments.filter(d => d.name.toLowerCase().includes("store") || d.name.toLowerCase().includes("main"));
  const otherDepartments = departments.filter(d => !d.name.toLowerCase().includes("store") || d.name.toLowerCase() !== "main");

  const { data: storeIssues = [] } = useQuery({
    queryKey: ["store-issues", clientId, dateStr],
    queryFn: () => clientId ? storeIssuesApi.getAll(clientId, dateStr) : Promise.resolve([]),
    enabled: !!clientId,
  });

  const createIssueMutation = useMutation({
    mutationFn: (data: any) => storeIssuesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-issues"] });
      setIssueDialogOpen(false);
      setIssueLines([]);
      setSelectedFromDept("");
      setSelectedToDept("");
      toast.success("Store issue created successfully");
    },
    onError: (error: any) => toast.error(error.message || "Failed to create store issue"),
  });

  const handleAddLine = () => {
    setIssueLines([...issueLines, { itemId: "", qtyIssued: "", costPriceSnapshot: "0" }]);
  };

  const handleRemoveLine = (index: number) => {
    setIssueLines(issueLines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, value: string) => {
    const updatedLines = [...issueLines];
    updatedLines[index] = { ...updatedLines[index], [field]: value };
    if (field === "itemId") {
      const item = items.find(i => i.id === value);
      if (item) {
        updatedLines[index].costPriceSnapshot = item.costPrice;
      }
    }
    setIssueLines(updatedLines);
  };

  const handleSubmitIssue = () => {
    if (!clientId || !selectedFromDept || !selectedToDept || issueLines.length === 0) {
      toast.error("Please fill all required fields and add at least one item");
      return;
    }

    createIssueMutation.mutate({
      clientId,
      issueDate: dateStr,
      fromDepartmentId: selectedFromDept,
      toDepartmentId: selectedToDept,
      status: "posted",
      lines: issueLines.filter(l => l.itemId && l.qtyIssued),
    });
  };

  const getDepartmentName = (id: string) => departments.find(d => d.id === id)?.name || "Unknown";
  const getItemName = (id: string) => items.find(i => i.id === id)?.name || "Unknown";

  const totalIssuedValue = storeIssues.reduce((sum, _issue) => sum, 0);

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pt-0 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Store Issues</CardTitle>
            <CardDescription>Issue items from store to departments</CardDescription>
          </div>
          <Button onClick={() => setIssueDialogOpen(true)} className="gap-2" disabled={!clientId} data-testid="button-issue-to-dept">
            <ArrowUpRight className="h-4 w-4" /> Issue to Department
          </Button>
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
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {storeIssues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No store issues recorded today. Click "Issue to Department" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                storeIssues.map((issue) => (
                  <TableRow key={issue.id} data-testid={`row-store-issue-${issue.id}`}>
                    <TableCell>{format(new Date(issue.issueDate), "MMM d, yyyy")}</TableCell>
                    <TableCell className="font-medium">{getDepartmentName(issue.fromDepartmentId)}</TableCell>
                    <TableCell className="font-medium">{getDepartmentName(issue.toDepartmentId)}</TableCell>
                    <TableCell>
                      <Badge variant={issue.status === "posted" ? "default" : "secondary"}>
                        {issue.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{issue.notes || "-"}</TableCell>
                  </TableRow>
                ))
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

      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Issue Items to Department</DialogTitle>
            <DialogDescription>Select store and destination department, then add items to issue</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Department (Store)</Label>
                <Select value={selectedFromDept} onValueChange={setSelectedFromDept}>
                  <SelectTrigger data-testid="select-from-dept">
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To Department</Label>
                <Select value={selectedToDept} onValueChange={setSelectedToDept}>
                  <SelectTrigger data-testid="select-to-dept">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.filter(d => d.id !== selectedFromDept).map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items to Issue</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>
              
              {issueLines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  Click "Add Item" to add items to issue
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-32">Quantity</TableHead>
                      <TableHead className="w-32">Unit Cost</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issueLines.map((line, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select value={line.itemId} onValueChange={(v) => handleLineChange(index, "itemId", v)}>
                            <SelectTrigger data-testid={`select-item-${index}`}>
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {items.map((item) => (
                                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            step="0.01" 
                            value={line.qtyIssued} 
                            onChange={(e) => handleLineChange(index, "qtyIssued", e.target.value)}
                            placeholder="0"
                            data-testid={`input-qty-${index}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          ₦ {Number(line.costPriceSnapshot || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveLine(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIssueDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmitIssue} 
              disabled={createIssueMutation.isPending || !selectedFromDept || !selectedToDept || issueLines.length === 0}
              data-testid="button-submit-issue"
            >
              {createIssueMutation.isPending && <Spinner className="h-4 w-4 mr-2" />}
              Post Issue
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
  const queryClient = useQueryClient();

  const { data: storeIssues = [] } = useQuery({
    queryKey: ["store-issues", clientId, dateStr],
    queryFn: () => clientId ? storeIssuesApi.getAll(clientId, dateStr) : Promise.resolve([]),
    enabled: !!clientId,
  });

  const issuedQtyByItem = useMemo(() => {
    const map: Record<string, number> = {};
    storeIssues.forEach((issue: StoreIssue & { lines?: StoreIssueLine[] }) => {
      if (issue.toDepartmentId === departmentId && issue.lines) {
        issue.lines.forEach((line) => {
          map[line.itemId] = (map[line.itemId] || 0) + Number(line.qtyIssued || 0);
        });
      }
    });
    return map;
  }, [storeIssues, departmentId]);

  const createMutation = useMutation({
    mutationFn: (data: any) => stockCountsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-counts"] });
      setCreateOpen(false);
      toast.success("Stock count recorded");
    },
    onError: (error: any) => toast.error(error.message || "Failed to create count"),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const opening = Number(formData.get("openingQty")) || 0;
    const added = issuedQtyByItem[selectedItemId] || 0;
    const sold = Number(formData.get("soldQty")) || 0;
    const expected = opening + added - sold;
    const actual = Number(formData.get("actualQty")) || 0;
    createMutation.mutate({
      clientId,
      departmentId,
      itemId: selectedItemId,
      date: dateStr,
      openingQty: String(opening),
      addedQty: String(added),
      soldQty: String(sold),
      expectedClosingQty: String(expected),
      actualClosingQty: String(actual),
      varianceQty: String(actual - expected),
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

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setSelectedItemId(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stock Count</DialogTitle>
            <DialogDescription>Record physical count using SSRV formula: Opening + Added - Sold = Expected</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="itemId">Item</Label>
                <Select name="itemId" value={selectedItemId} onValueChange={setSelectedItemId}>
                  <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                  <SelectContent>
                    {items.map(item => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="openingQty">Opening Qty</Label>
                  <Input id="openingQty" name="openingQty" type="number" step="0.01" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addedQty" className="text-emerald-700">+ Added (from Store)</Label>
                  <Input 
                    id="addedQty" 
                    value={selectedItemId ? (issuedQtyByItem[selectedItemId] || 0) : 0} 
                    className="bg-emerald-50 text-emerald-700 font-mono" 
                    disabled 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="soldQty" className="text-red-700">- Sold</Label>
                  <Input id="soldQty" name="soldQty" type="number" step="0.01" placeholder="0" />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="actualQty">Actual Physical Count</Label>
                <Input id="actualQty" name="actualQty" type="number" step="0.01" placeholder="0" required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || !selectedItemId}>
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

function ReconTab({ reconciliations, salesTotal, purchasesTotal, varianceTotal, departmentId, dateStr, onRunReconciliation }: {
  reconciliations: Reconciliation[];
  salesTotal: number;
  purchasesTotal: number;
  varianceTotal: number;
  departmentId: string | null;
  dateStr: string;
  onRunReconciliation: () => void;
}) {
  const latestRecon = reconciliations[0];
  const isSubmitted = latestRecon?.status === "approved" || latestRecon?.status === "submitted";

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pt-0 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Reconciliation Summary</CardTitle>
            <CardDescription>Final audit review and submission</CardDescription>
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
              <CardDescription>Total Sales</CardDescription>
              <CardTitle className="text-2xl font-mono">₦ {salesTotal.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Purchases</CardDescription>
              <CardTitle className="text-2xl font-mono">₦ {purchasesTotal.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card className={cn(varianceTotal !== 0 && "border-amber-500")}>
            <CardHeader className="pb-2">
              <CardDescription>Stock Variance</CardDescription>
              <CardTitle className={cn(
                "text-2xl font-mono",
                varianceTotal < 0 ? "text-red-600" : varianceTotal > 0 ? "text-amber-600" : "text-emerald-600"
              )}>
                {varianceTotal > 0 ? "+" : ""}{varianceTotal} units
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

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

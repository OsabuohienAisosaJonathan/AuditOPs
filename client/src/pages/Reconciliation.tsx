import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, FileCheck, Plus, Calculator, ArrowDown, ArrowUp, Minus, TrendingDown, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reconciliationsApi, departmentsApi, clientsApi, departmentComparisonApi, receivablesApi, surplusesApi, DepartmentComparison, Receivable, Surplus } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { toast } from "sonner";
import { format, addDays, subDays } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { useClientContext } from "@/lib/client-context";

export default function ReconciliationPage() {
  const [computeDialogOpen, setComputeDialogOpen] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [receivableDialogOpen, setReceivableDialogOpen] = useState(false);
  const [surplusDialogOpen, setSurplusDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentComparison | null>(null);
  const queryClient = useQueryClient();

  // Use global client and date from header context
  const { selectedClientId: contextClientId, selectedDate: contextDate, clients } = useClientContext();
  const selectedDate = contextDate || format(new Date(), "yyyy-MM-dd");

  // Derive clientId from context
  const clientId = contextClientId || clients?.[0]?.id || "";

  // Fetch departments for the selected client only
  const { data: departments } = useQuery({
    queryKey: ["departments", clientId],
    queryFn: () => departmentsApi.getByClient(clientId),
    enabled: !!clientId,
  });

  // Reset selectedDepartmentId when client changes or departments load
  useEffect(() => {
    if (departments && departments.length > 0) {
      setSelectedDepartmentId(departments[0].id);
    } else {
      setSelectedDepartmentId("");
    }
  }, [departments, clientId]);

  const { data: reconciliations, isLoading } = useQuery({
    queryKey: ["reconciliations", selectedDepartmentId, selectedDate],
    queryFn: () => reconciliationsApi.getAll(selectedDepartmentId, selectedDate),
    enabled: !!selectedDepartmentId,
  });

  const { data: comparisonData, isLoading: isComparisonLoading } = useQuery({
    queryKey: ["department-comparison", clientId, selectedDate],
    queryFn: () => departmentComparisonApi.get(clientId, selectedDate),
    enabled: !!clientId,
  });

  const { data: receivablesData } = useQuery({
    queryKey: ["receivables", clientId],
    queryFn: () => receivablesApi.getByClient(clientId),
    enabled: !!clientId,
  });

  const { data: surplusesData } = useQuery({
    queryKey: ["surpluses", clientId],
    queryFn: () => surplusesApi.getByClient(clientId),
    enabled: !!clientId,
  });

  const computeMutation = useMutation({
    mutationFn: (data: { departmentId: string; date: string }) => 
      reconciliationsApi.compute(data.departmentId, data.date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reconciliations"] });
      setComputeDialogOpen(false);
      toast.success("Reconciliation computed successfully");
    },
    onError: () => {
      toast.error("Failed to compute reconciliation");
    },
  });

  const createReceivableMutation = useMutation({
    mutationFn: (data: { departmentId: string; auditDate: string; varianceAmount: string; balanceRemaining: string; comments?: string }) =>
      receivablesApi.create(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      setReceivableDialogOpen(false);
      setSelectedDepartment(null);
      toast.success("Receivable created successfully");
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to create receivable");
    },
  });

  const createSurplusMutation = useMutation({
    mutationFn: (data: { departmentId: string; auditDate: string; surplusAmount: string; comments?: string }) =>
      surplusesApi.create(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surpluses"] });
      setSurplusDialogOpen(false);
      setSelectedDepartment(null);
      toast.success("Surplus logged successfully");
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to log surplus");
    },
  });

  const totalVariance = reconciliations?.reduce((sum, r) => sum + Number(r.varianceValue || 0), 0) || 0;

  const handleCreateReceivable = (dept: DepartmentComparison) => {
    setSelectedDepartment(dept);
    setReceivableDialogOpen(true);
  };

  const handleLogSurplus = (dept: DepartmentComparison) => {
    setSelectedDepartment(dept);
    setSurplusDialogOpen(true);
  };

  const grandTotalCaptured = comparisonData?.reduce((sum, d) => sum + d.totalCaptured, 0) || 0;
  const grandTotalDeclared = comparisonData?.reduce((sum, d) => sum + d.totalDeclared, 0) || 0;
  const grandTotalAudit = comparisonData?.reduce((sum, d) => sum + d.auditTotal, 0) || 0;
  const grandTotal1stHit = comparisonData?.reduce((sum, d) => sum + d.variance1stHit, 0) || 0;
  const grandTotal2ndHit = comparisonData?.reduce((sum, d) => sum + d.variance2ndHit, 0) || 0;
  const grandFinalVariance = comparisonData?.reduce((sum, d) => sum + d.finalVariance, 0) || 0;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">Daily Reconciliation</h1>
          <p className="text-muted-foreground">Compare theoretical vs physical stock to identify variances</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-print-worksheet">Print Worksheet</Button>
          <Dialog open={computeDialogOpen} onOpenChange={setComputeDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-run-reconciliation">
                <Calculator className="h-4 w-4" /> Run Reconciliation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Compute Reconciliation</DialogTitle>
                <DialogDescription>Run the reconciliation calculation for a specific date.</DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!selectedDepartmentId) {
                  toast.error("No department available");
                  return;
                }
                const formData = new FormData(e.currentTarget);
                computeMutation.mutate({
                  departmentId: selectedDepartmentId,
                  date: formData.get("date") as string,
                });
              }}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input 
                      id="date" 
                      name="date" 
                      type="date" 
                      defaultValue={format(new Date(), "yyyy-MM-dd")}
                      required 
                      data-testid="input-recon-date"
                    />
                  </div>
                  {departments && departments.length > 0 && (
                    <div className="p-3 bg-muted/50 rounded-md text-sm">
                      <span className="text-muted-foreground">Department: </span>
                      <span className="font-medium">{departments[0].name}</span>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setComputeDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={computeMutation.isPending} data-testid="button-submit-recon">
                    {computeMutation.isPending && <Spinner className="mr-2" />}
                    Compute
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="comparison" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="comparison" data-testid="tab-comparison">2nd Hit Comparison</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
          <TabsTrigger value="registers" data-testid="tab-registers">Registers</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="border-b">
              <div>
                <CardTitle>Department Comparison (2nd Hit)</CardTitle>
                <CardDescription>
                  Compare Total Captured, Total Declared, and Audit totals per department for {format(new Date(selectedDate), "MMMM d, yyyy")}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isComparisonLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : !comparisonData || comparisonData.length === 0 ? (
                <Empty className="py-12">
                  <EmptyMedia variant="icon">
                    <FileCheck className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>No department data</EmptyTitle>
                    <EmptyDescription>No departments found for comparison on this date.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="font-semibold">Department</TableHead>
                        <TableHead className="text-right font-semibold">Total Captured</TableHead>
                        <TableHead className="text-right font-semibold">Total Declared</TableHead>
                        <TableHead className="text-right font-semibold">Audit (Dep)</TableHead>
                        <TableHead className="text-right font-semibold">Variance 1st Hit</TableHead>
                        <TableHead className="text-right font-semibold">Variance 2nd Hit</TableHead>
                        <TableHead className="text-right font-semibold">Final Variance</TableHead>
                        <TableHead className="text-center font-semibold">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonData.map((dept) => (
                        <TableRow key={dept.departmentId} data-testid={`row-comparison-${dept.departmentId}`}>
                          <TableCell className="font-medium">{dept.departmentName}</TableCell>
                          <TableCell className="text-right font-mono">
                            ₦{dept.totalCaptured.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ₦{dept.totalDeclared.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ₦{dept.auditTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className={cn(
                            "text-right font-mono font-semibold",
                            dept.variance1stHit < 0 ? "text-destructive" : dept.variance1stHit > 0 ? "text-emerald-600" : "text-muted-foreground"
                          )}>
                            <span className="inline-flex items-center gap-1">
                              {dept.variance1stHit < 0 ? <ArrowDown className="h-3 w-3" /> : dept.variance1stHit > 0 ? <ArrowUp className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                              ₦{Math.abs(dept.variance1stHit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </TableCell>
                          <TableCell className={cn(
                            "text-right font-mono font-semibold",
                            dept.variance2ndHit < 0 ? "text-destructive" : dept.variance2ndHit > 0 ? "text-emerald-600" : "text-muted-foreground"
                          )}>
                            <span className="inline-flex items-center gap-1">
                              {dept.variance2ndHit < 0 ? <ArrowDown className="h-3 w-3" /> : dept.variance2ndHit > 0 ? <ArrowUp className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                              ₦{Math.abs(dept.variance2ndHit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </TableCell>
                          <TableCell className={cn(
                            "text-right font-mono font-bold",
                            dept.finalVariance < 0 ? "text-destructive" : dept.finalVariance > 0 ? "text-emerald-600" : "text-muted-foreground"
                          )}>
                            <span className="inline-flex items-center gap-1">
                              {dept.finalVariance < 0 ? <TrendingDown className="h-4 w-4" /> : dept.finalVariance > 0 ? <TrendingUp className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                              ₦{Math.abs(dept.finalVariance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {dept.varianceStatus === "shortage" && (
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => handleCreateReceivable(dept)}
                                data-testid={`button-create-receivable-${dept.departmentId}`}
                              >
                                <Plus className="h-3 w-3 mr-1" /> Receivable
                              </Button>
                            )}
                            {dept.varianceStatus === "surplus" && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                onClick={() => handleLogSurplus(dept)}
                                data-testid={`button-log-surplus-${dept.departmentId}`}
                              >
                                <Plus className="h-3 w-3 mr-1" /> Log Surplus
                              </Button>
                            )}
                            {dept.varianceStatus === "balanced" && (
                              <Badge variant="outline" className="bg-muted">Balanced</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>GRAND TOTAL</TableCell>
                        <TableCell className="text-right font-mono">
                          ₦{grandTotalCaptured.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ₦{grandTotalDeclared.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ₦{grandTotalAudit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono",
                          grandTotal1stHit < 0 ? "text-destructive" : grandTotal1stHit > 0 ? "text-emerald-600" : ""
                        )}>
                          ₦{Math.abs(grandTotal1stHit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono",
                          grandTotal2ndHit < 0 ? "text-destructive" : grandTotal2ndHit > 0 ? "text-emerald-600" : ""
                        )}>
                          ₦{Math.abs(grandTotal2ndHit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono",
                          grandFinalVariance < 0 ? "text-destructive" : grandFinalVariance > 0 ? "text-emerald-600" : ""
                        )}>
                          ₦{Math.abs(grandFinalVariance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="bg-slate-900 text-white border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Net Final Variance</CardTitle>
                <CardDescription className="text-slate-400">Declared vs Audit total</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-3xl font-bold font-mono tracking-tight",
                  grandFinalVariance < 0 ? "text-red-400" : grandFinalVariance > 0 ? "text-emerald-400" : "text-white"
                )} data-testid="text-final-variance">
                  {grandFinalVariance < 0 ? "- " : grandFinalVariance > 0 ? "+ " : ""}
                  ₦{Math.abs(grandFinalVariance).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  Shortages Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive font-mono" data-testid="text-shortages-count">
                  {comparisonData?.filter(d => d.varianceStatus === "shortage").length || 0}
                </div>
                <p className="text-sm text-muted-foreground">departments with receivables</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  Surpluses Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600 font-mono" data-testid="text-surpluses-count">
                  {comparisonData?.filter(d => d.varianceStatus === "surplus").length || 0}
                </div>
                <p className="text-sm text-muted-foreground">departments with excess</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Reconciliation History</CardTitle>
                  <CardDescription>
                    {departments && departments.length > 0 
                      ? `Showing reconciliations for ${departments[0].name}` 
                      : "No department selected"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12" data-testid="loading-reconciliations">
                      <Spinner className="h-8 w-8" />
                    </div>
                  ) : !departments || departments.length === 0 ? (
                    <Empty className="py-12" data-testid="empty-no-departments">
                      <EmptyMedia variant="icon">
                        <FileCheck className="h-6 w-6" />
                      </EmptyMedia>
                      <EmptyHeader>
                        <EmptyTitle>No departments available</EmptyTitle>
                        <EmptyDescription>Create departments first to run reconciliations.</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : !reconciliations || reconciliations.length === 0 ? (
                    <Empty className="py-12" data-testid="empty-reconciliations">
                      <EmptyMedia variant="icon">
                        <FileCheck className="h-6 w-6" />
                      </EmptyMedia>
                      <EmptyHeader>
                        <EmptyTitle>No reconciliations yet</EmptyTitle>
                        <EmptyDescription>Run your first reconciliation to compare stock levels.</EmptyDescription>
                      </EmptyHeader>
                      <Button className="gap-2" onClick={() => setComputeDialogOpen(true)} data-testid="button-run-first">
                        <Calculator className="h-4 w-4" /> Run First Reconciliation
                      </Button>
                    </Empty>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Opening Stock</TableHead>
                          <TableHead>Additions</TableHead>
                          <TableHead>Expected</TableHead>
                          <TableHead>Physical</TableHead>
                          <TableHead className="text-right">Variance (₦)</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reconciliations.map((recon) => {
                          const varianceNum = Number(recon.varianceValue || 0);
                          const isNegative = varianceNum < 0;
                          
                          return (
                            <TableRow key={recon.id} data-testid={`row-recon-${recon.id}`}>
                              <TableCell className="font-medium" data-testid={`text-recon-date-${recon.id}`}>
                                {format(new Date(recon.date), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {typeof recon.openingStock === 'object' 
                                  ? JSON.stringify(recon.openingStock).slice(0, 20) + '...' 
                                  : recon.openingStock || "-"}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {typeof recon.additions === 'object' 
                                  ? JSON.stringify(recon.additions).slice(0, 20) + '...' 
                                  : recon.additions || "-"}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {typeof recon.expectedUsage === 'object' 
                                  ? JSON.stringify(recon.expectedUsage).slice(0, 20) + '...' 
                                  : recon.expectedUsage || "-"}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {typeof recon.physicalCount === 'object' 
                                  ? JSON.stringify(recon.physicalCount).slice(0, 20) + '...' 
                                  : recon.physicalCount || "-"}
                              </TableCell>
                              <TableCell className={cn(
                                "text-right font-mono font-bold",
                                isNegative ? "text-destructive" : varianceNum > 0 ? "text-emerald-600" : "text-muted-foreground"
                              )} data-testid={`text-recon-variance-${recon.id}`}>
                                {isNegative ? `- ₦${Math.abs(varianceNum).toLocaleString()}` : 
                                 varianceNum > 0 ? `+ ₦${varianceNum.toLocaleString()}` : 
                                 "₦0"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn(
                                  recon.status === "approved" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                                  recon.status === "pending" && "bg-amber-50 text-amber-700 border-amber-200",
                                  recon.status === "rejected" && "bg-red-50 text-red-700 border-red-200",
                                  !recon.status && "bg-muted text-muted-foreground"
                                )} data-testid={`badge-recon-status-${recon.id}`}>
                                  {recon.status || "Pending"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-slate-900 text-white border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Total Variance</CardTitle>
                  <CardDescription className="text-slate-400">Net loss/gain across all reconciliations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    "text-4xl font-bold font-mono tracking-tight",
                    totalVariance < 0 ? "text-red-400" : totalVariance > 0 ? "text-emerald-400" : "text-white"
                  )} data-testid="text-total-variance">
                    {totalVariance < 0 
                      ? `- ₦ ${Math.abs(totalVariance).toLocaleString()}` 
                      : totalVariance > 0 
                      ? `+ ₦ ${totalVariance.toLocaleString()}`
                      : "₦ 0"}
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Total Entries</span>
                      <span className="font-mono" data-testid="text-recon-count">{reconciliations?.length || 0}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="secondary" className="w-full" data-testid="button-create-exception">
                    Create Exception Case
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Variance Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reconciliations && reconciliations.length > 0 ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Positive Variances</span>
                        <span className="font-mono text-emerald-600">
                          {reconciliations.filter(r => Number(r.varianceValue || 0) > 0).length}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Negative Variances</span>
                        <span className="font-mono text-destructive">
                          {reconciliations.filter(r => Number(r.varianceValue || 0) < 0).length}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Balanced</span>
                        <span className="font-mono">
                          {reconciliations.filter(r => Number(r.varianceValue || 0) === 0).length}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No reconciliation data to summarize.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="registers" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  Receivables Register
                </CardTitle>
                <CardDescription>Track cash shortages from department comparison</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {!receivablesData || receivablesData.length === 0 ? (
                  <Empty className="py-8">
                    <EmptyMedia variant="icon">
                      <FileCheck className="h-6 w-6" />
                    </EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle>No receivables</EmptyTitle>
                      <EmptyDescription>Receivables will appear here when shortages are recorded.</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receivablesData.map((rec) => (
                        <TableRow key={rec.id} data-testid={`row-receivable-${rec.id}`}>
                          <TableCell className="font-medium">
                            {format(new Date(rec.auditDate), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="font-mono text-destructive">
                            ₦{parseFloat(rec.varianceAmount).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-mono text-emerald-600">
                            ₦{parseFloat(rec.amountPaid || "0").toLocaleString()}
                          </TableCell>
                          <TableCell className="font-mono font-semibold">
                            ₦{parseFloat(rec.balanceRemaining).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              rec.status === "open" && "bg-amber-50 text-amber-700 border-amber-200",
                              rec.status === "part_paid" && "bg-blue-50 text-blue-700 border-blue-200",
                              rec.status === "settled" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                              rec.status === "written_off" && "bg-gray-50 text-gray-700 border-gray-200"
                            )}>
                              {rec.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  Surplus Register
                </CardTitle>
                <CardDescription>Track excess cash from department comparison</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {!surplusesData || surplusesData.length === 0 ? (
                  <Empty className="py-8">
                    <EmptyMedia variant="icon">
                      <FileCheck className="h-6 w-6" />
                    </EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle>No surpluses</EmptyTitle>
                      <EmptyDescription>Surpluses will appear here when excess cash is logged.</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Classification</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {surplusesData.map((sur) => (
                        <TableRow key={sur.id} data-testid={`row-surplus-${sur.id}`}>
                          <TableCell className="font-medium">
                            {format(new Date(sur.auditDate), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="font-mono text-emerald-600">
                            ₦{parseFloat(sur.surplusAmount).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm">
                            {sur.classification || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              sur.status === "open" && "bg-amber-50 text-amber-700 border-amber-200",
                              sur.status === "classified" && "bg-blue-50 text-blue-700 border-blue-200",
                              sur.status === "cleared" && "bg-purple-50 text-purple-700 border-purple-200",
                              sur.status === "posted" && "bg-emerald-50 text-emerald-700 border-emerald-200"
                            )}>
                              {sur.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={receivableDialogOpen} onOpenChange={setReceivableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Receivable</DialogTitle>
            <DialogDescription>
              Record a cash shortage for {selectedDepartment?.departmentName}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!selectedDepartment) return;
            const formData = new FormData(e.currentTarget);
            createReceivableMutation.mutate({
              departmentId: selectedDepartment.departmentId,
              auditDate: selectedDate,
              varianceAmount: Math.abs(selectedDepartment.finalVariance).toString(),
              balanceRemaining: Math.abs(selectedDepartment.finalVariance).toString(),
              comments: formData.get("comments") as string,
            });
          }}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Department</Label>
                  <div className="text-sm font-medium mt-1">{selectedDepartment?.departmentName}</div>
                </div>
                <div>
                  <Label>Date</Label>
                  <div className="text-sm font-medium mt-1">{format(new Date(selectedDate), "MMM d, yyyy")}</div>
                </div>
              </div>
              <div>
                <Label>Shortage Amount</Label>
                <div className="text-2xl font-bold text-destructive mt-1">
                  ₦{Math.abs(selectedDepartment?.finalVariance || 0).toLocaleString()}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="comments">Comments (Optional)</Label>
                <Textarea id="comments" name="comments" placeholder="Add any notes about this shortage..." data-testid="input-receivable-comments" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReceivableDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={createReceivableMutation.isPending} data-testid="button-submit-receivable">
                {createReceivableMutation.isPending && <Spinner className="mr-2" />}
                Create Receivable
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={surplusDialogOpen} onOpenChange={setSurplusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Surplus</DialogTitle>
            <DialogDescription>
              Record excess cash for {selectedDepartment?.departmentName}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!selectedDepartment) return;
            const formData = new FormData(e.currentTarget);
            createSurplusMutation.mutate({
              departmentId: selectedDepartment.departmentId,
              auditDate: selectedDate,
              surplusAmount: Math.abs(selectedDepartment.finalVariance).toString(),
              comments: formData.get("comments") as string,
            });
          }}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Department</Label>
                  <div className="text-sm font-medium mt-1">{selectedDepartment?.departmentName}</div>
                </div>
                <div>
                  <Label>Date</Label>
                  <div className="text-sm font-medium mt-1">{format(new Date(selectedDate), "MMM d, yyyy")}</div>
                </div>
              </div>
              <div>
                <Label>Surplus Amount</Label>
                <div className="text-2xl font-bold text-emerald-600 mt-1">
                  ₦{Math.abs(selectedDepartment?.finalVariance || 0).toLocaleString()}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="surplus-comments">Comments (Optional)</Label>
                <Textarea id="surplus-comments" name="comments" placeholder="Add any notes about this surplus..." data-testid="input-surplus-comments" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSurplusDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={createSurplusMutation.isPending} data-testid="button-submit-surplus">
                {createSurplusMutation.isPending && <Spinner className="mr-2" />}
                Log Surplus
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

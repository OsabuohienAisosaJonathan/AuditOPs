import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, FileCheck, Plus, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reconciliationsApi, departmentsApi, Reconciliation } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ReconciliationPage() {
  const [computeDialogOpen, setComputeDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: departmentsApi.getAll,
  });

  const selectedDepartmentId = departments?.[0]?.id;

  const { data: reconciliations, isLoading } = useQuery({
    queryKey: ["reconciliations", selectedDepartmentId],
    queryFn: () => reconciliationsApi.getAll(selectedDepartmentId),
    enabled: !!selectedDepartmentId,
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

  const totalVariance = reconciliations?.reduce((sum, r) => sum + Number(r.varianceValue || 0), 0) || 0;

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
    </div>
  );
}

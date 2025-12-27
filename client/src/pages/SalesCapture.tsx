import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, ShoppingCart, Search, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesEntriesApi, departmentsApi, SalesEntry } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { toast } from "sonner";
import { format } from "date-fns";

export default function SalesCapture() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: departmentsApi.getAll,
  });

  const selectedDepartmentId = departments?.[0]?.id;

  const { data: salesEntries, isLoading } = useQuery({
    queryKey: ["sales-entries", selectedDepartmentId],
    queryFn: () => salesEntriesApi.getAll(selectedDepartmentId),
    enabled: !!selectedDepartmentId,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<SalesEntry>) => salesEntriesApi.create({
      ...data,
      departmentId: selectedDepartmentId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-entries"] });
      setCreateDialogOpen(false);
      toast.success("Sales entry recorded successfully");
    },
    onError: () => {
      toast.error("Failed to record sales entry");
    },
  });

  const totalCash = salesEntries?.reduce((sum, entry) => sum + Number(entry.cashAmount || 0), 0) || 0;
  const totalPos = salesEntries?.reduce((sum, entry) => sum + Number(entry.posAmount || 0), 0) || 0;
  const totalTransfer = salesEntries?.reduce((sum, entry) => sum + Number(entry.transferAmount || 0), 0) || 0;
  const grandTotal = salesEntries?.reduce((sum, entry) => sum + Number(entry.totalSales || 0), 0) || 0;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">Sales Capture</h1>
          <p className="text-muted-foreground">Record and validate daily sales data</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-record-sales">
              <Plus className="h-4 w-4" />
              Record Sales
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Sales Entry</DialogTitle>
              <DialogDescription>Enter sales data for the selected department.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const cashAmount = formData.get("cashAmount") as string;
              const posAmount = formData.get("posAmount") as string;
              const transferAmount = formData.get("transferAmount") as string;
              const totalSales = (Number(cashAmount) + Number(posAmount) + Number(transferAmount)).toString();
              
              createMutation.mutate({
                date: new Date(formData.get("date") as string),
                shift: formData.get("shift") as string,
                cashAmount,
                posAmount,
                transferAmount,
                voidsAmount: "0",
                discountsAmount: "0",
                totalSales,
                mode: "summary",
              });
            }}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input 
                      id="date" 
                      name="date" 
                      type="date" 
                      defaultValue={format(new Date(), "yyyy-MM-dd")}
                      required 
                      data-testid="input-sales-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shift">Shift</Label>
                    <Select name="shift" defaultValue="full">
                      <SelectTrigger data-testid="select-sales-shift">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Full Day</SelectItem>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="evening">Evening</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cashAmount">Cash Amount (₦)</Label>
                  <Input 
                    id="cashAmount" 
                    name="cashAmount" 
                    type="number" 
                    step="0.01" 
                    defaultValue="0"
                    required 
                    data-testid="input-sales-cash"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="posAmount">POS Amount (₦)</Label>
                  <Input 
                    id="posAmount" 
                    name="posAmount" 
                    type="number" 
                    step="0.01" 
                    defaultValue="0"
                    required 
                    data-testid="input-sales-pos"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transferAmount">Transfer Amount (₦)</Label>
                  <Input 
                    id="transferAmount" 
                    name="transferAmount" 
                    type="number" 
                    step="0.01" 
                    defaultValue="0"
                    required 
                    data-testid="input-sales-transfer"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-sales">
                  {createMutation.isPending && <Spinner className="mr-2" />}
                  Record Sales
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sales Entries</CardTitle>
                  <CardDescription>
                    {departments && departments.length > 0 
                      ? `Showing entries for ${departments[0].name}` 
                      : "No department selected"}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative w-48">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 h-9" placeholder="Search..." data-testid="input-search-sales" />
                  </div>
                  <Button variant="outline" size="sm" className="h-9 gap-2" data-testid="button-filter-sales">
                    <Filter className="h-3 w-3" /> Filter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12" data-testid="loading-sales">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : !departments || departments.length === 0 ? (
                <Empty className="py-12" data-testid="empty-no-departments">
                  <EmptyMedia variant="icon">
                    <ShoppingCart className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>No departments available</EmptyTitle>
                    <EmptyDescription>Create departments first to record sales.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : !salesEntries || salesEntries.length === 0 ? (
                <Empty className="py-12" data-testid="empty-sales">
                  <EmptyMedia variant="icon">
                    <ShoppingCart className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>No sales entries yet</EmptyTitle>
                    <EmptyDescription>Record your first sales entry to get started.</EmptyDescription>
                  </EmptyHeader>
                  <Button className="gap-2" onClick={() => setCreateDialogOpen(true)} data-testid="button-add-first-sales">
                    <Plus className="h-4 w-4" /> Record First Entry
                  </Button>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead className="text-right">Cash (₦)</TableHead>
                      <TableHead className="text-right">POS (₦)</TableHead>
                      <TableHead className="text-right">Transfer (₦)</TableHead>
                      <TableHead className="text-right">Total (₦)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesEntries.map((entry) => (
                      <TableRow key={entry.id} data-testid={`row-sales-${entry.id}`}>
                        <TableCell className="font-medium" data-testid={`text-sales-date-${entry.id}`}>
                          {format(new Date(entry.date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal capitalize">
                            {entry.shift || "Full Day"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(entry.cashAmount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(entry.posAmount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(entry.transferAmount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold" data-testid={`text-sales-total-${entry.id}`}>
                          {Number(entry.totalSales).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Cash</span>
                  <span className="font-mono font-medium" data-testid="text-summary-cash">₦ {totalCash.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total POS</span>
                  <span className="font-mono font-medium" data-testid="text-summary-pos">₦ {totalPos.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Transfer</span>
                  <span className="font-mono font-medium" data-testid="text-summary-transfer">₦ {totalTransfer.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-bold">
                  <span>Grand Total</span>
                  <span className="font-mono" data-testid="text-summary-total">₦ {grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entries Count</span>
                  <span className="font-medium" data-testid="text-entries-count">{salesEntries?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg per Entry</span>
                  <span className="font-mono font-medium" data-testid="text-avg-entry">
                    ₦ {salesEntries && salesEntries.length > 0 
                      ? Math.round(grandTotal / salesEntries.length).toLocaleString() 
                      : "0"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

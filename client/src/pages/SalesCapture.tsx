import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, ShoppingCart, Search, Filter, Pencil, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesEntriesApi, SalesEntry, SalesSummary } from "@/lib/api";
import { useClientContext } from "@/lib/client-context";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { toast } from "sonner";
import { format } from "date-fns";

interface SalesFormData {
  shift: string;
  cashAmount: string;
  posAmount: string;
  transferAmount: string;
  voidsAmount: string;
  notes: string;
}

const defaultFormData: SalesFormData = {
  shift: "full",
  cashAmount: "0",
  posAmount: "0",
  transferAmount: "0",
  voidsAmount: "0",
  notes: "",
};

export default function SalesCapture() {
  const { 
    selectedClientId, 
    selectedClient,
    selectedDepartmentId, 
    selectedDepartment,
    selectedDate,
    departments 
  } = useClientContext();
  
  const queryClient = useQueryClient();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<SalesEntry | null>(null);
  const [formData, setFormData] = useState<SalesFormData>(defaultFormData);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [shiftFilter, setShiftFilter] = useState<string>("all");

  const queryKey = ["sales-entries", selectedClientId, selectedDepartmentId, selectedDate];
  const summaryQueryKey = ["sales-summary", selectedDepartmentId, selectedDate];

  const { data: salesEntries = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => salesEntriesApi.getAll({
      clientId: selectedClientId || undefined,
      departmentId: selectedDepartmentId || undefined,
      date: selectedDate,
    }),
    enabled: !!selectedClientId && !!selectedDepartmentId,
  });

  const { data: summary } = useQuery({
    queryKey: summaryQueryKey,
    queryFn: () => salesEntriesApi.getSummary({
      clientId: selectedClientId!,
      departmentId: selectedDepartmentId!,
      date: selectedDate,
    }),
    enabled: !!selectedClientId && !!selectedDepartmentId,
  });

  const filteredEntries = useMemo(() => {
    let entries = salesEntries;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      entries = entries.filter(e => 
        (e.shift || "").toLowerCase().includes(term) ||
        (e.totalSales || "").includes(term)
      );
    }
    
    if (shiftFilter !== "all") {
      entries = entries.filter(e => e.shift === shiftFilter);
    }
    
    return entries;
  }, [salesEntries, searchTerm, shiftFilter]);

  const createMutation = useMutation({
    mutationFn: (data: SalesFormData) => {
      const totalSales = (
        Number(data.cashAmount) + 
        Number(data.posAmount) + 
        Number(data.transferAmount) - 
        Number(data.voidsAmount)
      ).toString();
      
      return salesEntriesApi.create({
        clientId: selectedClientId!,
        departmentId: selectedDepartmentId!,
        date: selectedDate,
        shift: data.shift,
        cashAmount: data.cashAmount,
        posAmount: data.posAmount,
        transferAmount: data.transferAmount,
        voidsAmount: data.voidsAmount || "0",
        discountsAmount: "0",
        totalSales,
        mode: "summary",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-entries"] });
      queryClient.invalidateQueries({ queryKey: ["sales-summary"] });
      setCreateDialogOpen(false);
      setFormData(defaultFormData);
      toast.success("Sales entry recorded successfully");
    },
    onError: () => {
      toast.error("Failed to record sales entry");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SalesFormData }) => {
      const totalSales = (
        Number(data.cashAmount) + 
        Number(data.posAmount) + 
        Number(data.transferAmount) - 
        Number(data.voidsAmount)
      ).toString();
      
      return salesEntriesApi.update(id, {
        shift: data.shift,
        cashAmount: data.cashAmount,
        posAmount: data.posAmount,
        transferAmount: data.transferAmount,
        voidsAmount: data.voidsAmount || "0",
        totalSales,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-entries"] });
      queryClient.invalidateQueries({ queryKey: ["sales-summary"] });
      setEditDialogOpen(false);
      setSelectedEntry(null);
      setFormData(defaultFormData);
      toast.success("Sales entry updated successfully");
    },
    onError: () => {
      toast.error("Failed to update sales entry");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => salesEntriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-entries"] });
      queryClient.invalidateQueries({ queryKey: ["sales-summary"] });
      setDeleteConfirmOpen(false);
      setSelectedEntry(null);
      toast.success("Sales entry deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete sales entry");
    },
  });

  const handleCreate = () => {
    if (!selectedClientId || !selectedDepartmentId) {
      toast.error("Please select a client and department from the header");
      return;
    }
    setFormData(defaultFormData);
    setCreateDialogOpen(true);
  };

  const handleEdit = (entry: SalesEntry) => {
    setSelectedEntry(entry);
    setFormData({
      shift: entry.shift || "full",
      cashAmount: entry.cashAmount || "0",
      posAmount: entry.posAmount || "0",
      transferAmount: entry.transferAmount || "0",
      voidsAmount: entry.voidsAmount || "0",
      notes: "",
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (entry: SalesEntry) => {
    setSelectedEntry(entry);
    setDeleteConfirmOpen(true);
  };

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEntry) {
      updateMutation.mutate({ id: selectedEntry.id, data: formData });
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setShiftFilter("all");
  };

  const hasActiveFilters = searchTerm || shiftFilter !== "all";

  const contextReady = !!selectedClientId && !!selectedDepartmentId;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">Sales Capture</h1>
          <p className="text-muted-foreground">
            {contextReady 
              ? `Recording sales for ${selectedClient?.name} - ${selectedDepartment?.name} on ${format(new Date(selectedDate), "MMM d, yyyy")}`
              : "Select a client and department from the header to begin"}
          </p>
        </div>
        <Button 
          className="gap-2" 
          onClick={handleCreate}
          disabled={!contextReady}
          data-testid="button-record-sales"
        >
          <Plus className="h-4 w-4" />
          Record Sales
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sales Entries</CardTitle>
                  <CardDescription>
                    {contextReady 
                      ? `Showing entries for ${selectedDepartment?.name} on ${format(new Date(selectedDate), "MMM d, yyyy")}` 
                      : "Select a client and department to view entries"}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative w-48">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      className="pl-9 h-9" 
                      placeholder="Search..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      data-testid="input-search-sales" 
                    />
                  </div>
                  <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button 
                        variant={hasActiveFilters ? "default" : "outline"} 
                        size="sm" 
                        className="h-9 gap-2" 
                        data-testid="button-filter-sales"
                      >
                        <Filter className="h-3 w-3" /> 
                        Filter
                        {hasActiveFilters && (
                          <Badge variant="secondary" className="ml-1 px-1">1</Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64" align="end">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Shift</Label>
                          <Select value={shiftFilter} onValueChange={setShiftFilter}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Shifts</SelectItem>
                              <SelectItem value="full">Full Day</SelectItem>
                              <SelectItem value="morning">Morning</SelectItem>
                              <SelectItem value="evening">Evening</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {hasActiveFilters && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full gap-2"
                            onClick={clearFilters}
                          >
                            <X className="h-3 w-3" /> Clear Filters
                          </Button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!contextReady ? (
                <Empty className="py-12" data-testid="empty-no-context">
                  <EmptyMedia variant="icon">
                    <ShoppingCart className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>Select a context</EmptyTitle>
                    <EmptyDescription>Choose a client and department from the header to view and record sales.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : isLoading ? (
                <div className="flex items-center justify-center py-12" data-testid="loading-sales">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : filteredEntries.length === 0 ? (
                <Empty className="py-12" data-testid="empty-sales">
                  <EmptyMedia variant="icon">
                    <ShoppingCart className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>No sales entries yet</EmptyTitle>
                    <EmptyDescription>
                      {hasActiveFilters 
                        ? "No entries match your filters. Try clearing filters."
                        : "Record your first sales entry to get started."}
                    </EmptyDescription>
                  </EmptyHeader>
                  {!hasActiveFilters && (
                    <Button className="gap-2" onClick={handleCreate} data-testid="button-add-first-sales">
                      <Plus className="h-4 w-4" /> Record First Entry
                    </Button>
                  )}
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead className="text-right">Cash (₦)</TableHead>
                      <TableHead className="text-right">POS (₦)</TableHead>
                      <TableHead className="text-right">Transfer (₦)</TableHead>
                      <TableHead className="text-right">Voids (₦)</TableHead>
                      <TableHead className="text-right">Total (₦)</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.id} data-testid={`row-sales-${entry.id}`}>
                        <TableCell className="font-medium" data-testid={`text-sales-time-${entry.id}`}>
                          {format(new Date(entry.createdAt), "HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal capitalize">
                            {entry.shift === "full" ? "Full Day" : entry.shift || "Full Day"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(entry.cashAmount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(entry.posAmount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(entry.transferAmount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {Number(entry.voidsAmount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold" data-testid={`text-sales-total-${entry.id}`}>
                          {Number(entry.totalSales || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleEdit(entry)}
                              data-testid={`button-edit-sales-${entry.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(entry)}
                              data-testid={`button-delete-sales-${entry.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
                  <span className="font-mono font-medium" data-testid="text-summary-cash">
                    ₦ {(summary?.totalCash || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total POS</span>
                  <span className="font-mono font-medium" data-testid="text-summary-pos">
                    ₦ {(summary?.totalPos || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Transfer</span>
                  <span className="font-mono font-medium" data-testid="text-summary-transfer">
                    ₦ {(summary?.totalTransfer || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Voids/Comp</span>
                  <span className="font-mono font-medium text-muted-foreground" data-testid="text-summary-voids">
                    ₦ {(summary?.totalVoids || 0).toLocaleString()}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-bold">
                  <span>Grand Total</span>
                  <span className="font-mono" data-testid="text-summary-total">
                    ₦ {(summary?.grandTotal || 0).toLocaleString()}
                  </span>
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
                  <span className="font-medium" data-testid="text-entries-count">
                    {summary?.entriesCount || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg per Entry</span>
                  <span className="font-mono font-medium" data-testid="text-avg-entry">
                    ₦ {(summary?.avgPerEntry || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Sales Entry</DialogTitle>
            <DialogDescription>
              Enter sales data for {selectedDepartment?.name} on {format(new Date(selectedDate), "MMM d, yyyy")}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="shift">Shift</Label>
                <Select 
                  value={formData.shift} 
                  onValueChange={(v) => setFormData(f => ({ ...f, shift: v }))}
                >
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
              <div className="space-y-2">
                <Label htmlFor="cashAmount">Cash Amount (₦)</Label>
                <Input 
                  id="cashAmount" 
                  type="number" 
                  step="0.01"
                  value={formData.cashAmount}
                  onChange={(e) => setFormData(f => ({ ...f, cashAmount: e.target.value }))}
                  required 
                  data-testid="input-sales-cash"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="posAmount">POS Amount (₦)</Label>
                <Input 
                  id="posAmount" 
                  type="number" 
                  step="0.01"
                  value={formData.posAmount}
                  onChange={(e) => setFormData(f => ({ ...f, posAmount: e.target.value }))}
                  required 
                  data-testid="input-sales-pos"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transferAmount">Transfer Amount (₦)</Label>
                <Input 
                  id="transferAmount" 
                  type="number" 
                  step="0.01"
                  value={formData.transferAmount}
                  onChange={(e) => setFormData(f => ({ ...f, transferAmount: e.target.value }))}
                  required 
                  data-testid="input-sales-transfer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="voidsAmount">Voids/Comp Amount (₦)</Label>
                <Input 
                  id="voidsAmount" 
                  type="number" 
                  step="0.01"
                  value={formData.voidsAmount}
                  onChange={(e) => setFormData(f => ({ ...f, voidsAmount: e.target.value }))}
                  data-testid="input-sales-voids"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-sales">
                {createMutation.isPending && <Spinner className="mr-2 h-4 w-4" />}
                Record Sales
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Sales Entry</DialogTitle>
            <DialogDescription>
              Update the sales data for this entry.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-shift">Shift</Label>
                <Select 
                  value={formData.shift} 
                  onValueChange={(v) => setFormData(f => ({ ...f, shift: v }))}
                >
                  <SelectTrigger data-testid="select-edit-sales-shift">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Day</SelectItem>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cashAmount">Cash Amount (₦)</Label>
                <Input 
                  id="edit-cashAmount" 
                  type="number" 
                  step="0.01"
                  value={formData.cashAmount}
                  onChange={(e) => setFormData(f => ({ ...f, cashAmount: e.target.value }))}
                  required 
                  data-testid="input-edit-sales-cash"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-posAmount">POS Amount (₦)</Label>
                <Input 
                  id="edit-posAmount" 
                  type="number" 
                  step="0.01"
                  value={formData.posAmount}
                  onChange={(e) => setFormData(f => ({ ...f, posAmount: e.target.value }))}
                  required 
                  data-testid="input-edit-sales-pos"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-transferAmount">Transfer Amount (₦)</Label>
                <Input 
                  id="edit-transferAmount" 
                  type="number" 
                  step="0.01"
                  value={formData.transferAmount}
                  onChange={(e) => setFormData(f => ({ ...f, transferAmount: e.target.value }))}
                  required 
                  data-testid="input-edit-sales-transfer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-voidsAmount">Voids/Comp Amount (₦)</Label>
                <Input 
                  id="edit-voidsAmount" 
                  type="number" 
                  step="0.01"
                  value={formData.voidsAmount}
                  onChange={(e) => setFormData(f => ({ ...f, voidsAmount: e.target.value }))}
                  data-testid="input-edit-sales-voids"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} data-testid="button-update-sales">
                {updateMutation.isPending && <Spinner className="mr-2 h-4 w-4" />}
                Update Entry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sales Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this sales entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedEntry && deleteMutation.mutate(selectedEntry.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-sales"
            >
              {deleteMutation.isPending && <Spinner className="mr-2 h-4 w-4" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

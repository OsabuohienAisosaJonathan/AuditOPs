import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Search, Filter, Download, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { purchaseItemEventsApi, itemsApi, inventoryDepartmentsApi, PurchaseItemEvent, Item, InventoryDepartment } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { format, startOfMonth, endOfMonth, differenceInHours } from "date-fns";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/lib/client-context";
import { useCurrency } from "@/lib/currency-context";
import { useEntitlements } from "@/lib/entitlements-context";
import { LockedPageScreen } from "@/components/LockedPageScreen";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export default function ItemPurchases() {
  const { entitlements, isLoading: entitlementsLoading } = useEntitlements();
  
  if (entitlementsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  
  if (!entitlements?.canAccessPurchasesRegisterPage) {
    return (
      <LockedPageScreen
        feature="Purchases Register"
        requiredPlan="Growth"
        description="Access to the Purchases Register is available on Growth plans and above."
      />
    );
  }
  
  return <ItemPurchasesContent />;
}

function ItemPurchasesContent() {
  const queryClient = useQueryClient();
  const { formatMoney } = useCurrency();
  const { clients, selectedClientId: contextClientId } = useClientContext();
  const selectedClientId = contextClientId || clients?.[0]?.id;
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(endOfMonth(new Date()));
  const [srdFilter, setSrdFilter] = useState<string>("all");
  const [itemFilter, setItemFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<PurchaseItemEvent | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editUnitCost, setEditUnitCost] = useState("");
  const [editSupplier, setEditSupplier] = useState("");
  const [editInvoice, setEditInvoice] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const { data: purchaseEvents, isLoading: eventsLoading, refetch } = useQuery({
    queryKey: ["purchase-item-events", selectedClientId, srdFilter, itemFilter, dateFrom, dateTo],
    queryFn: () => selectedClientId ? purchaseItemEventsApi.getByClient(selectedClientId, {
      srdId: srdFilter !== "all" ? srdFilter : undefined,
      itemId: itemFilter !== "all" ? itemFilter : undefined,
      dateFrom: dateFrom ? format(dateFrom, "yyyy-MM-dd") : undefined,
      dateTo: dateTo ? format(dateTo, "yyyy-MM-dd") : undefined,
    }) : Promise.resolve([]),
    enabled: !!selectedClientId,
  });

  const { data: items } = useQuery({
    queryKey: ["items", selectedClientId],
    queryFn: () => selectedClientId ? itemsApi.getByClient(selectedClientId) : Promise.resolve([]),
    enabled: !!selectedClientId,
  });

  const { data: inventoryDepts } = useQuery({
    queryKey: ["inventory-departments", selectedClientId],
    queryFn: () => selectedClientId ? inventoryDepartmentsApi.getByClient(selectedClientId) : Promise.resolve([]),
    enabled: !!selectedClientId,
  });

  const itemsMap = React.useMemo(() => {
    const map = new Map<string, Item>();
    items?.forEach(item => map.set(item.id, item));
    return map;
  }, [items]);

  const srdsMap = React.useMemo(() => {
    const map = new Map<string, InventoryDepartment>();
    inventoryDepts?.forEach(srd => map.set(srd.id, srd));
    return map;
  }, [inventoryDepts]);

  const filteredEvents = React.useMemo(() => {
    if (!purchaseEvents) return [];
    if (!searchTerm) return purchaseEvents;

    const lowerSearch = searchTerm.toLowerCase();
    return purchaseEvents.filter((event: PurchaseItemEvent) => {
      const item = itemsMap.get(event.itemId);
      const srd = event.srdId ? srdsMap.get(event.srdId) : null;
      return (
        item?.name?.toLowerCase().includes(lowerSearch) ||
        srd?.inventoryType?.toLowerCase().includes(lowerSearch) ||
        event.supplierName?.toLowerCase().includes(lowerSearch) ||
        event.invoiceNo?.toLowerCase().includes(lowerSearch)
      );
    });
  }, [purchaseEvents, searchTerm, itemsMap, srdsMap]);

  const totalValue = React.useMemo(() => {
    return filteredEvents.reduce((sum, event) => sum + parseFloat(event.totalCost || "0"), 0);
  }, [filteredEvents]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => purchaseItemEventsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-item-events"] });
      setEditDialogOpen(false);
      setSelectedEvent(null);
      toast.success("Purchase updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update purchase");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => purchaseItemEventsApi.delete(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-item-events"] });
      setDeleteDialogOpen(false);
      setSelectedEvent(null);
      setDeleteReason("");
      toast.success("Purchase deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete purchase");
    },
  });

  const isWithin24Hours = (createdAt: string) => {
    const hoursDiff = differenceInHours(new Date(), new Date(createdAt));
    return hoursDiff <= 24;
  };

  const canEdit = (event: PurchaseItemEvent) => {
    return isSuperAdmin || isWithin24Hours(event.createdAt);
  };

  const handleEditClick = (event: PurchaseItemEvent) => {
    setSelectedEvent(event);
    setEditQty(event.qty);
    setEditUnitCost(event.unitCostAtPurchase);
    setEditSupplier(event.supplierName || "");
    setEditInvoice(event.invoiceNo || "");
    setEditNotes(event.notes || "");
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (event: PurchaseItemEvent) => {
    setSelectedEvent(event);
    setDeleteReason("");
    setDeleteDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!selectedEvent) return;
    const qtyNum = parseFloat(editQty);
    const unitCostNum = parseFloat(editUnitCost);
    if (!isFinite(qtyNum) || qtyNum <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (!isFinite(unitCostNum) || unitCostNum < 0) {
      toast.error("Please enter a valid unit cost");
      return;
    }
    const totalCost = (qtyNum * unitCostNum).toFixed(2);
    updateMutation.mutate({
      id: selectedEvent.id,
      data: {
        qty: editQty,
        unitCostAtPurchase: editUnitCost,
        totalCost,
        supplierName: editSupplier || null,
        invoiceNo: editInvoice || null,
        notes: editNotes || null,
      },
    });
  };

  const handleDeleteSubmit = () => {
    if (!selectedEvent || !deleteReason.trim()) {
      toast.error("Please provide a reason for deletion");
      return;
    }
    deleteMutation.mutate({ id: selectedEvent.id, reason: deleteReason });
  };

  const handleExportCSV = () => {
    if (!filteredEvents.length) return;

    const headers = ["Date", "Item", "SRD", "Qty", "Unit Cost", "Total Cost", "Supplier", "Invoice No", "Notes"];
    const rows = filteredEvents.map((event: PurchaseItemEvent) => {
      const item = itemsMap.get(event.itemId);
      const srd = event.srdId ? srdsMap.get(event.srdId) : null;
      return [
        format(new Date(event.date), "yyyy-MM-dd"),
        item?.name || "Unknown",
        srd?.inventoryType || "-",
        event.qty,
        event.unitCostAtPurchase,
        event.totalCost,
        event.supplierName || "",
        event.invoiceNo || "",
        event.notes || "",
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `purchase-events-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!selectedClientId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8">
            <Empty>
              <EmptyMedia />
              <EmptyHeader>
                <EmptyTitle>Select a Client</EmptyTitle>
                <EmptyDescription>Please select a client to view purchase events.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Item Purchases Register</h1>
          <p className="text-muted-foreground">View all purchase events for inventory items</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!filteredEvents.length} data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter purchase events by date range, SRD, or item</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}
                    data-testid="button-date-from"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}
                    data-testid="button-date-to"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>SRD</Label>
              <Select value={srdFilter} onValueChange={setSrdFilter}>
                <SelectTrigger data-testid="select-srd">
                  <SelectValue placeholder="All SRDs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All SRDs</SelectItem>
                  {inventoryDepts?.map((srd: InventoryDepartment) => (
                    <SelectItem key={srd.id} value={srd.id}>
                      {srd.inventoryType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Item</Label>
              <Select value={itemFilter} onValueChange={setItemFilter}>
                <SelectTrigger data-testid="select-item">
                  <SelectValue placeholder="All Items" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  {items?.map((item: Item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  data-testid="input-search"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Purchase Events</CardTitle>
              <CardDescription>
                {filteredEvents.length} record{filteredEvents.length !== 1 ? "s" : ""} found
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-xl font-bold" data-testid="text-total-value">{formatMoney(totalValue)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-8 w-8" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <Empty>
              <EmptyMedia />
              <EmptyHeader>
                <EmptyTitle>No Purchase Events</EmptyTitle>
                <EmptyDescription>
                  No purchase events found for the selected filters. Try adjusting the date range or other filters.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>SRD</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event: PurchaseItemEvent) => {
                    const item = itemsMap.get(event.itemId);
                    const srd = event.srdId ? srdsMap.get(event.srdId) : null;
                    const editable = canEdit(event);
                    return (
                      <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(event.date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">{item?.name || "Unknown"}</TableCell>
                        <TableCell>{srd?.inventoryType || "-"}</TableCell>
                        <TableCell className="text-right">{event.qty}</TableCell>
                        <TableCell className="text-right">{formatMoney(parseFloat(event.unitCostAtPurchase))}</TableCell>
                        <TableCell className="text-right font-medium">{formatMoney(parseFloat(event.totalCost))}</TableCell>
                        <TableCell>{event.supplierName || "-"}</TableCell>
                        <TableCell>{event.invoiceNo || "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{event.notes || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(event)}
                              disabled={!editable}
                              title={editable ? "Edit purchase" : "Edit only allowed within 24 hours"}
                              data-testid={`button-edit-${event.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {isSuperAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(event)}
                                className="text-destructive hover:text-destructive"
                                title="Delete purchase (Super Admin only)"
                                data-testid={`button-delete-${event.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Purchase</DialogTitle>
            <DialogDescription>
              {selectedEvent && !isWithin24Hours(selectedEvent.createdAt) && !isSuperAdmin
                ? "This purchase is older than 24 hours and cannot be edited."
                : "Modify the purchase details below."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  data-testid="input-edit-qty"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editUnitCost}
                  onChange={(e) => setEditUnitCost(e.target.value)}
                  data-testid="input-edit-unit-cost"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Supplier Name</Label>
              <Input
                value={editSupplier}
                onChange={(e) => setEditSupplier(e.target.value)}
                data-testid="input-edit-supplier"
              />
            </div>
            <div className="space-y-2">
              <Label>Invoice Number</Label>
              <Input
                value={editInvoice}
                onChange={(e) => setEditInvoice(e.target.value)}
                data-testid="input-edit-invoice"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                data-testid="input-edit-notes"
              />
            </div>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm">
                <strong>Total Cost:</strong> {formatMoney(parseFloat(editQty || "0") * parseFloat(editUnitCost || "0"))}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={updateMutation.isPending} data-testid="button-save-edit">
              {updateMutation.isPending && <Spinner className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Please provide a reason for deleting this purchase record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>Reason for Deletion <span className="text-destructive">*</span></Label>
            <Textarea
              placeholder="Enter the reason for deleting this purchase..."
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="mt-2"
              data-testid="input-delete-reason"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubmit}
              disabled={deleteMutation.isPending || !deleteReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Spinner className="mr-2 h-4 w-4" />}
              Delete Purchase
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

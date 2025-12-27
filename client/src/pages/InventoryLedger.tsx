import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, subDays } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Warehouse, Store, ChefHat, AlertCircle, Package, Settings2 } from "lucide-react";
import { useClientContext } from "@/lib/client-context";
import { cn } from "@/lib/utils";

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin h-4 w-4", className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}

interface InventoryDepartment {
  id: string;
  clientId: string;
  storeNameId: string;
  inventoryType: string;
  status: string;
}

interface StoreName {
  id: string;
  name: string;
  status: string;
}

interface Item {
  id: string;
  clientId: string;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  reorderLevel: number | null;
  status: string;
}

interface StoreStock {
  id: string;
  clientId: string;
  storeDepartmentId: string;
  itemId: string;
  date: string;
  openingQty: string;
  addedQty: string;
  issuedQty: string;
  closingQty: string;
  physicalClosingQty: string | null;
  varianceQty: string;
  costPriceSnapshot: string;
}

interface StoreIssue {
  id: string;
  clientId: string;
  issueDate: string;
  fromDepartmentId: string;
  toDepartmentId: string;
  notes: string | null;
  status: string;
}

interface StoreIssueLine {
  id: string;
  storeIssueId: string;
  itemId: string;
  qtyIssued: string;
}

interface StockCount {
  id: string;
  clientId: string;
  departmentId: string;
  itemId: string;
  date: string;
  actualClosingQty: string | null;
}

export default function InventoryLedger() {
  const { selectedClient, clients } = useClientContext();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedInvDept, setSelectedInvDept] = useState<string | null>(null);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [issueItemId, setIssueItemId] = useState<string | null>(null);
  const [issueToDeptId, setIssueToDeptId] = useState<string | null>(null);
  const [issueQty, setIssueQty] = useState<string>("");
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [visibleDepts, setVisibleDepts] = useState<Set<string>>(new Set());
  
  const selectedClientId = selectedClient?.id || clients[0]?.id;

  // Fetch inventory departments for the client
  const { data: inventoryDepts, isLoading: invDeptsLoading } = useQuery<InventoryDepartment[]>({
    queryKey: ["inventory-departments", selectedClientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${selectedClientId}/inventory-departments`);
      if (!res.ok) throw new Error("Failed to fetch inventory departments");
      return res.json();
    },
    enabled: !!selectedClientId,
  });

  // Fetch store names for display
  const { data: storeNames } = useQuery<StoreName[]>({
    queryKey: ["store-names"],
    queryFn: async () => {
      const res = await fetch("/api/store-names");
      if (!res.ok) throw new Error("Failed to fetch store names");
      return res.json();
    },
  });

  // Fetch items for the client
  const { data: items, isLoading: itemsLoading } = useQuery<Item[]>({
    queryKey: ["items", selectedClientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${selectedClientId}/items`);
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
    enabled: !!selectedClientId,
  });

  // Fetch store stock for selected department and date
  const { data: storeStockData, isLoading: stockLoading } = useQuery<StoreStock[]>({
    queryKey: ["store-stock", selectedClientId, selectedInvDept, selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${selectedClientId}/store-stock?departmentId=${selectedInvDept}&date=${selectedDate}`);
      if (!res.ok) throw new Error("Failed to fetch store stock");
      return res.json();
    },
    enabled: !!selectedClientId && !!selectedInvDept,
  });

  // Fetch previous day stock for opening rollforward
  const previousDate = format(subDays(parseISO(selectedDate), 1), "yyyy-MM-dd");
  const { data: prevDayStock } = useQuery<StoreStock[]>({
    queryKey: ["store-stock", selectedClientId, selectedInvDept, previousDate],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${selectedClientId}/store-stock?departmentId=${selectedInvDept}&date=${previousDate}`);
      if (!res.ok) throw new Error("Failed to fetch previous day stock");
      return res.json();
    },
    enabled: !!selectedClientId && !!selectedInvDept,
  });

  // Fetch store issues for selected department and date
  const { data: storeIssues } = useQuery<StoreIssue[]>({
    queryKey: ["store-issues", selectedClientId, selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${selectedClientId}/store-issues?date=${selectedDate}`);
      if (!res.ok) throw new Error("Failed to fetch store issues");
      return res.json();
    },
    enabled: !!selectedClientId,
  });

  // Fetch issue lines for each store issue
  const { data: issueLines } = useQuery<{ issueId: string; lines: StoreIssueLine[] }[]>({
    queryKey: ["store-issue-lines", storeIssues?.map(i => i.id).join(",")],
    queryFn: async () => {
      if (!storeIssues || storeIssues.length === 0) return [];
      const results = await Promise.all(
        storeIssues.map(async (issue) => {
          const res = await fetch(`/api/store-issues/${issue.id}/lines`);
          if (!res.ok) return { issueId: issue.id, lines: [] };
          const lines = await res.json();
          return { issueId: issue.id, lines };
        })
      );
      return results;
    },
    enabled: !!storeIssues && storeIssues.length > 0,
  });

  // Get store name by ID
  const getStoreNameById = (id: string) => storeNames?.find(sn => sn.id === id);

  // Get selected inventory department details
  const selectedDept = useMemo(() => {
    return inventoryDepts?.find(d => d.id === selectedInvDept);
  }, [inventoryDepts, selectedInvDept]);

  // Filter departments by type for issue destinations (DEPARTMENT_STORE only)
  const departmentStores = useMemo(() => {
    return inventoryDepts?.filter(d => d.inventoryType === "DEPARTMENT_STORE" && d.status === "active") || [];
  }, [inventoryDepts]);

  // Initialize visible depts when department stores load
  useMemo(() => {
    if (departmentStores.length > 0 && visibleDepts.size === 0) {
      setVisibleDepts(new Set(departmentStores.slice(0, 5).map(d => d.id)));
    }
  }, [departmentStores]);

  // Build issue breakdown by department and item
  const issueBreakdown = useMemo(() => {
    const breakdown: Record<string, Record<string, number>> = {};
    
    if (!storeIssues || !issueLines) return breakdown;
    
    storeIssues.forEach(issue => {
      if (issue.fromDepartmentId !== selectedInvDept) return;
      
      const lines = issueLines.find(il => il.issueId === issue.id)?.lines || [];
      lines.forEach(line => {
        if (!breakdown[line.itemId]) breakdown[line.itemId] = {};
        if (!breakdown[line.itemId][issue.toDepartmentId]) breakdown[line.itemId][issue.toDepartmentId] = 0;
        breakdown[line.itemId][issue.toDepartmentId] += parseFloat(line.qtyIssued || "0");
      });
    });
    
    return breakdown;
  }, [storeIssues, issueLines, selectedInvDept]);

  // Create store issue
  const createIssueMutation = useMutation({
    mutationFn: async (data: { itemId: string; toDeptId: string; qty: number }) => {
      const res = await fetch(`/api/clients/${selectedClientId}/store-issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDepartmentId: selectedInvDept,
          toDepartmentId: data.toDeptId,
          issueDate: selectedDate,
          lines: [{ itemId: data.itemId, qtyIssued: data.qty }],
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create issue");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-stock"] });
      queryClient.invalidateQueries({ queryKey: ["store-issues"] });
      queryClient.invalidateQueries({ queryKey: ["store-issue-lines"] });
      setIssueDialogOpen(false);
      setIssueItemId(null);
      setIssueToDeptId(null);
      setIssueQty("");
    },
  });

  // Get opening from previous day closing (rollforward)
  const getOpeningQty = (itemId: string, currentStock?: StoreStock) => {
    if (currentStock && parseFloat(currentStock.openingQty || "0") > 0) {
      return parseFloat(currentStock.openingQty);
    }
    const prevStock = prevDayStock?.find(s => s.itemId === itemId);
    if (prevStock) {
      const prevClosing = parseFloat(prevStock.closingQty || "0");
      return prevClosing;
    }
    return 0;
  };

  // Build ledger data for Main Store/Warehouse with Dep columns
  const mainStoreLedger = useMemo(() => {
    if (!items || !selectedDept || (selectedDept.inventoryType !== "MAIN_STORE" && selectedDept.inventoryType !== "WAREHOUSE")) {
      return [];
    }
    
    const activeItems = items.filter(i => i.status === "active");
    return activeItems.map((item, index) => {
      const stock = storeStockData?.find(s => s.itemId === item.id);
      const opening = getOpeningQty(item.id, stock);
      const purchase = parseFloat(stock?.addedQty || "0");
      const total = opening + purchase;
      
      const depIssues: Record<string, number> = {};
      let totalIssued = 0;
      
      departmentStores.forEach(dept => {
        const qty = issueBreakdown[item.id]?.[dept.id] || 0;
        depIssues[dept.id] = qty;
        totalIssued += qty;
      });
      
      const closing = total - totalIssued;
      const cost = parseFloat(item.costPrice || "0");
      const value = closing * cost;
      
      return {
        sn: index + 1,
        itemId: item.id,
        itemName: item.name,
        unit: item.unit,
        opening,
        purchase,
        total,
        depIssues,
        totalIssued,
        closing,
        cost,
        value,
        stockId: stock?.id,
      };
    });
  }, [items, selectedDept, storeStockData, prevDayStock, departmentStores, issueBreakdown]);

  // Build ledger data for Department Store
  const deptStoreLedger = useMemo(() => {
    if (!items || !selectedDept || selectedDept.inventoryType !== "DEPARTMENT_STORE") {
      return [];
    }
    
    const activeItems = items.filter(i => i.status === "active");
    return activeItems.map((item, index) => {
      const stock = storeStockData?.find(s => s.itemId === item.id);
      const opening = getOpeningQty(item.id, stock);
      const added = parseFloat(stock?.addedQty || "0");
      const total = opening + added;
      const closing = stock?.physicalClosingQty !== null && stock?.physicalClosingQty !== undefined 
        ? parseFloat(stock.physicalClosingQty) 
        : null;
      const sold = closing !== null ? total - closing : null;
      
      return {
        sn: index + 1,
        itemId: item.id,
        itemName: item.name,
        unit: item.unit,
        opening,
        added,
        total,
        sold,
        closing,
        awaitingCount: closing === null,
        stockId: stock?.id,
      };
    });
  }, [items, selectedDept, storeStockData, prevDayStock]);

  const handleIssueClick = (itemId: string) => {
    setIssueItemId(itemId);
    setIssueDialogOpen(true);
  };

  const handleIssueSubmit = () => {
    if (!issueItemId || !issueToDeptId || !issueQty) return;
    createIssueMutation.mutate({
      itemId: issueItemId,
      toDeptId: issueToDeptId,
      qty: parseFloat(issueQty),
    });
  };

  const toggleDeptVisibility = (deptId: string) => {
    const newSet = new Set(visibleDepts);
    if (newSet.has(deptId)) {
      newSet.delete(deptId);
    } else {
      newSet.add(deptId);
    }
    setVisibleDepts(newSet);
  };

  if (!selectedClientId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Please select a client to view inventory ledger.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const visibleDeptList = departmentStores.filter(d => visibleDepts.has(d.id));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Inventory Ledger</h1>
          <p className="text-muted-foreground">Daily inventory tracking for stores and departments</p>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input 
                id="date" 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-[180px]"
                data-testid="input-ledger-date"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Inventory Department</Label>
              <Select value={selectedInvDept || ""} onValueChange={setSelectedInvDept}>
                <SelectTrigger className="w-[250px]" data-testid="select-inv-dept">
                  <SelectValue placeholder="Select inventory department" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryDepts?.filter(d => d.status === "active").map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {getStoreNameById(dept.storeNameId)?.name || "Unknown"} ({dept.inventoryType.replace("_", " ")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedDept && (
              <Badge variant="outline" className={cn(
                "h-9 px-4",
                selectedDept.inventoryType === "MAIN_STORE" 
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : selectedDept.inventoryType === "WAREHOUSE"
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              )} data-testid="badge-inv-type">
                {selectedDept.inventoryType === "MAIN_STORE" && <Store className="h-4 w-4 mr-2" />}
                {selectedDept.inventoryType === "WAREHOUSE" && <Warehouse className="h-4 w-4 mr-2" />}
                {selectedDept.inventoryType === "DEPARTMENT_STORE" && <ChefHat className="h-4 w-4 mr-2" />}
                {selectedDept.inventoryType.replace("_", " ")}
              </Badge>
            )}
            {(selectedDept?.inventoryType === "MAIN_STORE" || selectedDept?.inventoryType === "WAREHOUSE") && departmentStores.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setConfigDialogOpen(true)} data-testid="button-config-deps">
                <Settings2 className="h-4 w-4 mr-2" />
                Configure Columns
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ledger Grid */}
      {!selectedInvDept ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Select an inventory department to view the ledger.</p>
          </CardContent>
        </Card>
      ) : invDeptsLoading || itemsLoading || stockLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Spinner className="h-8 w-8 mx-auto" />
            <p className="text-muted-foreground mt-2">Loading ledger data...</p>
          </CardContent>
        </Card>
      ) : selectedDept?.inventoryType === "MAIN_STORE" || selectedDept?.inventoryType === "WAREHOUSE" ? (
        /* Main Store / Warehouse Ledger with Dep Columns */
        <Card>
          <CardHeader className="px-6 py-4 border-b">
            <CardTitle className="flex items-center gap-2">
              {selectedDept.inventoryType === "MAIN_STORE" ? <Store className="h-5 w-5" /> : <Warehouse className="h-5 w-5" />}
              {getStoreNameById(selectedDept.storeNameId)?.name} Ledger
            </CardTitle>
            <CardDescription>
              Showing inventory for {format(parseISO(selectedDate), "MMMM d, yyyy")} • Opening auto-populated from previous day
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] text-center sticky left-0 bg-background">S/N</TableHead>
                    <TableHead className="min-w-[150px] sticky left-[50px] bg-background">Item Name</TableHead>
                    <TableHead className="w-[60px]">Unit</TableHead>
                    <TableHead className="w-[80px] text-right">Opening</TableHead>
                    <TableHead className="w-[80px] text-right">Purchase</TableHead>
                    <TableHead className="w-[80px] text-right bg-muted/30">Total</TableHead>
                    {visibleDeptList.map((dept, idx) => (
                      <TableHead key={dept.id} className="w-[80px] text-right text-xs" title={getStoreNameById(dept.storeNameId)?.name}>
                        Dep{idx + 1}
                      </TableHead>
                    ))}
                    <TableHead className="w-[80px] text-right bg-muted/30">Closing</TableHead>
                    <TableHead className="w-[80px] text-right">Cost</TableHead>
                    <TableHead className="w-[100px] text-right">Value</TableHead>
                    <TableHead className="w-[80px]">Issue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mainStoreLedger.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11 + visibleDeptList.length} className="text-center py-8 text-muted-foreground">
                        No items found. Add items in the Inventory page first.
                      </TableCell>
                    </TableRow>
                  ) : (
                    mainStoreLedger.map((row) => (
                      <TableRow key={row.itemId} data-testid={`row-ledger-${row.itemId}`}>
                        <TableCell className="text-center sticky left-0 bg-background">{row.sn}</TableCell>
                        <TableCell className="font-medium sticky left-[50px] bg-background">{row.itemName}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{row.unit}</TableCell>
                        <TableCell className="text-right">{row.opening.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{row.purchase.toFixed(2)}</TableCell>
                        <TableCell className="text-right bg-muted/30 font-medium">{row.total.toFixed(2)}</TableCell>
                        {visibleDeptList.map(dept => (
                          <TableCell key={dept.id} className="text-right text-orange-600">
                            {(row.depIssues[dept.id] || 0).toFixed(2)}
                          </TableCell>
                        ))}
                        <TableCell className="text-right bg-muted/30 font-medium">{row.closing.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{row.cost.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">{row.value.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleIssueClick(row.itemId)}
                            disabled={row.closing <= 0}
                            data-testid={`button-issue-${row.itemId}`}
                          >
                            Issue
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {visibleDeptList.length > 0 && (
              <div className="px-6 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
                <strong>Column Key:</strong>{" "}
                {visibleDeptList.map((dept, idx) => (
                  <span key={dept.id} className="mr-3">
                    Dep{idx + 1} = {getStoreNameById(dept.storeNameId)?.name}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : selectedDept?.inventoryType === "DEPARTMENT_STORE" ? (
        /* Department Store Ledger */
        <Card>
          <CardHeader className="px-6 py-4 border-b">
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              {getStoreNameById(selectedDept.storeNameId)?.name} Ledger
            </CardTitle>
            <CardDescription>
              Showing inventory for {format(parseISO(selectedDate), "MMMM d, yyyy")} • Closing from Stock Count
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px] text-center">S/N</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="w-[80px]">Unit</TableHead>
                    <TableHead className="w-[100px] text-right">Opening</TableHead>
                    <TableHead className="w-[100px] text-right">Added</TableHead>
                    <TableHead className="w-[100px] text-right bg-muted/30">Total</TableHead>
                    <TableHead className="w-[100px] text-right">Sold</TableHead>
                    <TableHead className="w-[100px] text-right bg-muted/30">Closing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deptStoreLedger.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No items found. Add items in the Inventory page first.
                      </TableCell>
                    </TableRow>
                  ) : (
                    deptStoreLedger.map((row) => (
                      <TableRow key={row.itemId} data-testid={`row-ledger-${row.itemId}`}>
                        <TableCell className="text-center">{row.sn}</TableCell>
                        <TableCell className="font-medium">{row.itemName}</TableCell>
                        <TableCell className="text-muted-foreground">{row.unit}</TableCell>
                        <TableCell className="text-right">{row.opening.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-green-600">{row.added.toFixed(2)}</TableCell>
                        <TableCell className="text-right bg-muted/30 font-medium">{row.total.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {row.sold !== null ? row.sold.toFixed(2) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right bg-muted/30">
                          {row.awaitingCount ? (
                            <span className="flex items-center justify-end gap-1 text-amber-600">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Awaiting Count
                            </span>
                          ) : (
                            <span className="font-medium">{row.closing?.toFixed(2)}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Issue to Department Dialog */}
      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Item to Department</DialogTitle>
            <DialogDescription>
              Transfer stock from {getStoreNameById(selectedDept?.storeNameId || "")?.name || "store"} to a department.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Item</Label>
              <Input 
                value={items?.find(i => i.id === issueItemId)?.name || ""} 
                disabled 
                data-testid="input-issue-item"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toDept">Destination Department</Label>
              <Select value={issueToDeptId || ""} onValueChange={setIssueToDeptId}>
                <SelectTrigger data-testid="select-issue-to-dept">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departmentStores.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {getStoreNameById(dept.storeNameId)?.name || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qty">Quantity to Issue</Label>
              <Input 
                id="qty" 
                type="number" 
                step="0.01" 
                value={issueQty} 
                onChange={(e) => setIssueQty(e.target.value)}
                placeholder="Enter quantity"
                data-testid="input-issue-qty"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleIssueSubmit} 
              disabled={!issueToDeptId || !issueQty || createIssueMutation.isPending}
              data-testid="button-confirm-issue"
            >
              {createIssueMutation.isPending && <Spinner className="mr-2" />}
              Issue Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configure Dep Columns Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Department Columns</DialogTitle>
            <DialogDescription>
              Select which department columns to show in the ledger (up to 10).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[300px] overflow-y-auto">
            {departmentStores.map(dept => (
              <div key={dept.id} className="flex items-center gap-3">
                <Checkbox 
                  id={`dep-${dept.id}`}
                  checked={visibleDepts.has(dept.id)}
                  onCheckedChange={() => toggleDeptVisibility(dept.id)}
                  disabled={!visibleDepts.has(dept.id) && visibleDepts.size >= 10}
                  data-testid={`checkbox-dep-${dept.id}`}
                />
                <Label htmlFor={`dep-${dept.id}`} className="cursor-pointer">
                  {getStoreNameById(dept.storeNameId)?.name || "Unknown"}
                </Label>
              </div>
            ))}
            {departmentStores.length === 0 && (
              <p className="text-muted-foreground text-sm">No department stores configured yet.</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setConfigDialogOpen(false)} data-testid="button-close-config">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

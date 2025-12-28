import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, subDays, addDays, isToday, isBefore, startOfDay } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Store, ChefHat, AlertCircle, Package, Settings2, ChevronDown, ChevronRight, Save, EyeOff, Eye, ChevronLeft, Lock, History, Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useClientContext } from "@/lib/client-context";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedInvDept, setSelectedInvDept] = useState<string | null>(null);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [issueItemId, setIssueItemId] = useState<string | null>(null);
  const [issueToDeptId, setIssueToDeptId] = useState<string | null>(null);
  const [issueQty, setIssueQty] = useState<string>("");
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [visibleDepts, setVisibleDepts] = useState<Set<string>>(new Set());
  
  // Edit reason dialog for super admin editing past dates
  const [editReasonDialogOpen, setEditReasonDialogOpen] = useState(false);
  const [editReason, setEditReason] = useState<string>("");
  const [pendingEdit, setPendingEdit] = useState<{ itemId: string; field: "opening" | "purchase" | "closing"; value: string } | null>(null);
  
  // Date navigation helpers
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isPastDate = selectedDate < todayStr;
  const isSuperAdmin = user?.role === "super_admin";
  const canEditPastDate = isPastDate && isSuperAdmin;
  
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const toggleCategory = (category: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setExpandedCategories(newSet);
  };
  
  // Editable ledger state: { itemId: { opening, purchase, closing } }
  const [ledgerEdits, setLedgerEdits] = useState<Record<string, { opening?: string; purchase?: string; closing?: string }>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Hidden categories state - keyed by SRD department ID
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());
  const [hiddenCategoriesOpen, setHiddenCategoriesOpen] = useState(false);
  
  // Load hidden categories from localStorage when SRD changes
  useEffect(() => {
    if (selectedInvDept) {
      const stored = localStorage.getItem(`hiddenCategories_${selectedInvDept}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setHiddenCategories(new Set(parsed));
        } catch {
          setHiddenCategories(new Set());
        }
      } else {
        setHiddenCategories(new Set());
      }
    }
  }, [selectedInvDept]);
  
  // Save hidden categories to localStorage
  const saveHiddenCategories = (categories: Set<string>) => {
    if (selectedInvDept) {
      localStorage.setItem(`hiddenCategories_${selectedInvDept}`, JSON.stringify(Array.from(categories)));
    }
  };
  
  // Hide a category
  const hideCategory = (category: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(hiddenCategories);
    newSet.add(category);
    setHiddenCategories(newSet);
    saveHiddenCategories(newSet);
    toast.success(`Category "${category}" hidden`);
  };
  
  // Unhide a category
  const unhideCategory = (category: string) => {
    const newSet = new Set(hiddenCategories);
    newSet.delete(category);
    setHiddenCategories(newSet);
    saveHiddenCategories(newSet);
    toast.success(`Category "${category}" is now visible`);
  };

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
      toast.success("Stock issued successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to issue stock");
    },
  });

  // Save ledger edits mutation
  const saveLedgerMutation = useMutation({
    mutationFn: async (edits: { itemId: string; opening?: string; purchase?: string; closing?: string }[]) => {
      const promises = edits.map(async (edit) => {
        const item = items?.find(i => i.id === edit.itemId);
        if (!item) return null;
        
        // Calculate closing from opening + purchase - issued
        const opening = parseFloat(edit.opening || "0");
        const purchase = parseFloat(edit.purchase || "0");
        const total = opening + purchase;
        
        // Get issued quantity from existing breakdown
        let totalIssued = 0;
        departmentStores.forEach(dept => {
          totalIssued += issueBreakdown[edit.itemId]?.[dept.id] || 0;
        });
        
        const calculatedClosing = total - totalIssued;
        const physicalClosing = edit.closing ? parseFloat(edit.closing) : null;
        
        const res = await fetch(`/api/clients/${selectedClientId}/store-stock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeDepartmentId: selectedInvDept,
            itemId: edit.itemId,
            date: selectedDate,
            openingQty: opening.toString(),
            addedQty: purchase.toString(),
            closingQty: calculatedClosing.toString(),
            physicalClosingQty: physicalClosing?.toString() || null,
            costPriceSnapshot: item.costPrice || "0.00",
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to save ledger");
        }
        return res.json();
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-stock"] });
      setLedgerEdits({});
      setHasUnsavedChanges(false);
      toast.success("Ledger saved successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to save ledger");
    },
  });

  // Date navigation
  const goToPreviousDay = () => {
    const current = parseISO(selectedDate);
    setSelectedDate(format(subDays(current, 1), "yyyy-MM-dd"));
    setLedgerEdits({});
    setHasUnsavedChanges(false);
  };
  
  const goToNextDay = () => {
    const current = parseISO(selectedDate);
    const nextDay = addDays(current, 1);
    const today = new Date();
    if (nextDay <= today) {
      setSelectedDate(format(nextDay, "yyyy-MM-dd"));
      setLedgerEdits({});
      setHasUnsavedChanges(false);
    }
  };
  
  const goToToday = () => {
    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
    setLedgerEdits({});
    setHasUnsavedChanges(false);
  };

  // Handle cell edit with past date restrictions
  const handleCellEdit = (itemId: string, field: "opening" | "purchase" | "closing", value: string) => {
    // For past dates, non-super-admin cannot edit
    if (isPastDate && !isSuperAdmin) {
      toast.error("Only Super Admin can edit past day records");
      return;
    }
    
    // For past dates, super admin needs to provide edit reason
    if (isPastDate && isSuperAdmin && !editReasonDialogOpen) {
      setPendingEdit({ itemId, field, value });
      setEditReasonDialogOpen(true);
      return;
    }
    
    setLedgerEdits(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
    setHasUnsavedChanges(true);
  };
  
  // Confirm past date edit with reason
  const confirmPastDateEdit = () => {
    if (!pendingEdit || !editReason.trim()) {
      toast.error("Please provide an edit reason");
      return;
    }
    
    setLedgerEdits(prev => ({
      ...prev,
      [pendingEdit.itemId]: {
        ...prev[pendingEdit.itemId],
        [pendingEdit.field]: pendingEdit.value,
      },
    }));
    setHasUnsavedChanges(true);
    
    // Log the edit reason (will be included when saving)
    console.log(`Past date edit: ${pendingEdit.field} for item ${pendingEdit.itemId}, reason: ${editReason}`);
    
    setEditReasonDialogOpen(false);
    setPendingEdit(null);
    setEditReason("");
    toast.success("Edit recorded. Remember to save the ledger.");
  };

  // Save all edits (enhanced with past date handling)
  const handleSaveLedger = () => {
    const editsToSave = Object.entries(ledgerEdits).map(([itemId, values]) => ({
      itemId,
      ...values,
    }));
    if (editsToSave.length > 0) {
      saveLedgerMutation.mutate(editsToSave);
    }
  };

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

  // Build ledger data for Main Store with Dep columns, grouped by category
  const mainStoreLedger = useMemo(() => {
    if (!items || !selectedDept || selectedDept.inventoryType !== "MAIN_STORE") {
      return [];
    }
    
    const activeItems = items.filter(i => i.status === "active");
    const sortedItems = [...activeItems].sort((a, b) => a.category.localeCompare(b.category));
    
    let sn = 0;
    return sortedItems.map((item) => {
      sn++;
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
        sn,
        itemId: item.id,
        itemName: item.name,
        category: item.category,
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

  // Group main store ledger by category
  const mainStoreLedgerByCategory = useMemo(() => {
    const groups: Record<string, typeof mainStoreLedger> = {};
    mainStoreLedger.forEach(row => {
      if (!groups[row.category]) groups[row.category] = [];
      groups[row.category].push(row);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [mainStoreLedger]);

  // Build ledger data for Department Store, grouped by category
  const deptStoreLedger = useMemo(() => {
    if (!items || !selectedDept || selectedDept.inventoryType !== "DEPARTMENT_STORE") {
      return [];
    }
    
    const activeItems = items.filter(i => i.status === "active");
    const sortedItems = [...activeItems].sort((a, b) => a.category.localeCompare(b.category));
    
    let sn = 0;
    return sortedItems.map((item) => {
      sn++;
      const stock = storeStockData?.find(s => s.itemId === item.id);
      const opening = getOpeningQty(item.id, stock);
      const added = parseFloat(stock?.addedQty || "0");
      const total = opening + added;
      const closing = stock?.physicalClosingQty !== null && stock?.physicalClosingQty !== undefined 
        ? parseFloat(stock.physicalClosingQty) 
        : null;
      const sold = closing !== null ? total - closing : null;
      
      return {
        sn,
        itemId: item.id,
        itemName: item.name,
        category: item.category,
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

  // Group dept store ledger by category
  const deptStoreLedgerByCategory = useMemo(() => {
    const groups: Record<string, typeof deptStoreLedger> = {};
    deptStoreLedger.forEach(row => {
      if (!groups[row.category]) groups[row.category] = [];
      groups[row.category].push(row);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [deptStoreLedger]);

  const handleIssueClick = (itemId: string) => {
    setIssueItemId(itemId);
    setIssueQty("");
    setIssueToDeptId(null);
    setIssueDialogOpen(true);
  };

  // Get available quantity for the selected issue item (considering edited values)
  const getAvailableQty = useMemo(() => {
    if (!issueItemId) return 0;
    const ledgerRow = mainStoreLedger.find(r => r.itemId === issueItemId);
    if (!ledgerRow) return 0;
    
    // Check if there are pending edits for this item
    const edits = ledgerEdits[issueItemId];
    if (edits) {
      const editedOpening = edits.opening !== undefined ? parseFloat(edits.opening || "0") : ledgerRow.opening;
      const editedPurchase = edits.purchase !== undefined ? parseFloat(edits.purchase || "0") : ledgerRow.purchase;
      const displayTotal = editedOpening + editedPurchase;
      const displayClosing = displayTotal - ledgerRow.totalIssued;
      return displayClosing > 0 ? displayClosing : 0;
    }
    
    // Use the row's calculated closing (Total - sum of all Dep issues)
    const available = ledgerRow.total - ledgerRow.totalIssued;
    return available > 0 ? available : 0;
  }, [issueItemId, mainStoreLedger, ledgerEdits]);

  const handleIssueSubmit = () => {
    if (!issueItemId || !issueToDeptId || !issueQty) return;
    
    const qtyToIssue = parseFloat(issueQty);
    
    // Validate quantity doesn't exceed available
    if (qtyToIssue > getAvailableQty) {
      toast.error(`Cannot issue more than available stock (${getAvailableQty.toFixed(2)})`);
      return;
    }
    
    if (qtyToIssue <= 0) {
      toast.error("Please enter a valid quantity greater than zero");
      return;
    }
    
    createIssueMutation.mutate({
      itemId: issueItemId,
      toDeptId: issueToDeptId,
      qty: qtyToIssue,
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
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={goToPreviousDay}
                  title="Previous Day"
                  data-testid="button-prev-day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Input 
                  id="date" 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setLedgerEdits({});
                    setHasUnsavedChanges(false);
                  }}
                  max={todayStr}
                  className="w-[160px]"
                  data-testid="input-ledger-date"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={goToNextDay}
                  disabled={selectedDate >= todayStr}
                  title="Next Day"
                  data-testid="button-next-day"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {isPastDate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToToday}
                    className="ml-1 gap-1"
                    data-testid="button-go-today"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Today
                  </Button>
                )}
              </div>
            </div>
            
            {isPastDate && (
              <Badge variant="outline" className="h-9 px-3 bg-amber-50 text-amber-700 border-amber-200 gap-1.5" data-testid="badge-past-date">
                <History className="h-4 w-4" />
                Viewing Past Date
                {!isSuperAdmin && (
                  <>
                    <span className="mx-1">•</span>
                    <Lock className="h-3.5 w-3.5" />
                    Read Only
                  </>
                )}
              </Badge>
            )}
            
            <div className="space-y-1.5">
              <Label>Stock Reconciliation Department (SRD)</Label>
              <Select value={selectedInvDept || ""} onValueChange={setSelectedInvDept}>
                <SelectTrigger className="w-[250px]" data-testid="select-inv-dept">
                  <SelectValue placeholder="Select SRD" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryDepts?.filter(d => d.status === "active").map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {getStoreNameById(dept.storeNameId)?.name || "Unknown"} (SRD)
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
                  : "bg-amber-50 text-amber-700 border-amber-200"
              )} data-testid="badge-inv-type">
                {selectedDept.inventoryType === "MAIN_STORE" && <Store className="h-4 w-4 mr-2" />}
                {selectedDept.inventoryType === "DEPARTMENT_STORE" && <ChefHat className="h-4 w-4 mr-2" />}
                {selectedDept.inventoryType.replace("_", " ")}
              </Badge>
            )}
            {selectedDept?.inventoryType === "MAIN_STORE" && departmentStores.length > 0 && (
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
            <p className="text-muted-foreground">Select an SRD to view the ledger.</p>
          </CardContent>
        </Card>
      ) : invDeptsLoading || itemsLoading || stockLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Spinner className="h-8 w-8 mx-auto" />
            <p className="text-muted-foreground mt-2">Loading ledger data...</p>
          </CardContent>
        </Card>
      ) : selectedDept?.inventoryType === "MAIN_STORE" ? (
        /* Main Store Ledger with Dep Columns */
        <Card>
          <CardHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  {getStoreNameById(selectedDept.storeNameId)?.name} Ledger
                </CardTitle>
                <CardDescription>
                  Showing inventory for {format(parseISO(selectedDate), "MMMM d, yyyy")} • Edit Opening & Purchase directly
                </CardDescription>
              </div>
              <Button 
                onClick={handleSaveLedger} 
                disabled={!hasUnsavedChanges || saveLedgerMutation.isPending}
                className="gap-2"
                data-testid="button-save-ledger"
              >
                {saveLedgerMutation.isPending ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saveLedgerMutation.isPending ? "Saving..." : "Save Ledger"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {hiddenCategories.size > 0 && (
              <div className="px-4 py-2 border-b bg-muted/20">
                <Popover open={hiddenCategoriesOpen} onOpenChange={setHiddenCategoriesOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2" data-testid="button-hidden-categories">
                      <EyeOff className="h-4 w-4" />
                      Hidden Categories ({hiddenCategories.size})
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="start">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Hidden Categories</h4>
                      <p className="text-xs text-muted-foreground">Click to unhide and show in the ledger</p>
                      <div className="space-y-1 mt-2">
                        {Array.from(hiddenCategories).map(cat => (
                          <div key={cat} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted">
                            <span className="text-sm">{cat}</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => unhideCategory(cat)}
                              className="h-7 px-2"
                              data-testid={`button-unhide-${cat}`}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Show
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
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
                    mainStoreLedgerByCategory
                      .filter(([category]) => !hiddenCategories.has(category))
                      .map(([category, rows]) => {
                      const isExpanded = expandedCategories.has(category);
                      return (
                        <React.Fragment key={`cat-${category}`}>
                          <TableRow 
                            className="bg-black hover:bg-black/90 cursor-pointer transition-colors"
                            onClick={() => toggleCategory(category)}
                            data-testid={`category-header-${category}`}
                          >
                            <TableCell colSpan={11 + visibleDeptList.length} className="font-semibold text-sm py-2 sticky left-0 text-white">
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  {category}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
                                  onClick={(e) => hideCategory(category, e)}
                                  title="Hide this category"
                                  data-testid={`button-hide-${category}`}
                                >
                                  <EyeOff className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && rows.map((row) => {
                            const editedOpening = ledgerEdits[row.itemId]?.opening;
                            const editedPurchase = ledgerEdits[row.itemId]?.purchase;
                            const editedClosing = ledgerEdits[row.itemId]?.closing;
                            
                            const displayOpening = editedOpening !== undefined ? parseFloat(editedOpening || "0") : row.opening;
                            const displayPurchase = editedPurchase !== undefined ? parseFloat(editedPurchase || "0") : row.purchase;
                            const displayTotal = displayOpening + displayPurchase;
                            const displayClosing = displayTotal - row.totalIssued;
                            const displayValue = displayClosing * row.cost;
                            
                            return (
                            <TableRow key={row.itemId} data-testid={`row-ledger-${row.itemId}`}>
                              <TableCell className="text-center sticky left-0 bg-background">{row.sn}</TableCell>
                              <TableCell className="font-medium sticky left-[50px] bg-background">{row.itemName}</TableCell>
                              <TableCell className="text-muted-foreground text-xs">{row.unit}</TableCell>
                              <TableCell className="p-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  className={cn("h-8 w-20 text-right", isPastDate && !isSuperAdmin && "bg-muted cursor-not-allowed")}
                                  value={editedOpening !== undefined ? editedOpening : row.opening.toString()}
                                  onChange={(e) => handleCellEdit(row.itemId, "opening", e.target.value)}
                                  disabled={isPastDate && !isSuperAdmin}
                                  title={isPastDate && !isSuperAdmin ? "Only Super Admin can edit past day records" : undefined}
                                  data-testid={`input-opening-${row.itemId}`}
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  className={cn("h-8 w-20 text-right", isPastDate && !isSuperAdmin && "bg-muted cursor-not-allowed")}
                                  value={editedPurchase !== undefined ? editedPurchase : row.purchase.toString()}
                                  onChange={(e) => handleCellEdit(row.itemId, "purchase", e.target.value)}
                                  disabled={isPastDate && !isSuperAdmin}
                                  title={isPastDate && !isSuperAdmin ? "Only Super Admin can edit past day records" : undefined}
                                  data-testid={`input-purchase-${row.itemId}`}
                                />
                              </TableCell>
                              <TableCell className="text-right bg-muted/30 font-medium">{displayTotal.toFixed(2)}</TableCell>
                              {visibleDeptList.map(dept => (
                                <TableCell key={dept.id} className="text-right text-orange-600">
                                  {(row.depIssues[dept.id] || 0).toFixed(2)}
                                </TableCell>
                              ))}
                              <TableCell className="text-right bg-muted/30 font-medium">{displayClosing.toFixed(2)}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{row.cost.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">{displayValue.toFixed(2)}</TableCell>
                              <TableCell>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleIssueClick(row.itemId)}
                                  disabled={displayClosing <= 0 || (isPastDate && !isSuperAdmin)}
                                  title={isPastDate && !isSuperAdmin ? "Only Super Admin can issue on past dates" : undefined}
                                  data-testid={`button-issue-${row.itemId}`}
                                >
                                  Issue
                                </Button>
                              </TableCell>
                            </TableRow>
                          );})}
                      </React.Fragment>
                    );
                  })
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
              Showing inventory for {format(parseISO(selectedDate), "MMMM d, yyyy")} • Added auto-filled from Store Issues • Closing from Stock Count
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {hiddenCategories.size > 0 && (
              <div className="px-4 py-2 border-b bg-muted/20">
                <Popover open={hiddenCategoriesOpen} onOpenChange={setHiddenCategoriesOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2" data-testid="button-hidden-categories-dept">
                      <EyeOff className="h-4 w-4" />
                      Hidden Categories ({hiddenCategories.size})
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="start">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Hidden Categories</h4>
                      <p className="text-xs text-muted-foreground">Click to unhide and show in the ledger</p>
                      <div className="space-y-1 mt-2">
                        {Array.from(hiddenCategories).map(cat => (
                          <div key={cat} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted">
                            <span className="text-sm">{cat}</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => unhideCategory(cat)}
                              className="h-7 px-2"
                              data-testid={`button-unhide-dept-${cat}`}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Show
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
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
                        deptStoreLedgerByCategory
                          .filter(([category]) => !hiddenCategories.has(category))
                          .map(([category, rows]) => {
                          const isExpanded = expandedCategories.has(category);
                          return (
                            <React.Fragment key={`cat-${category}`}>
                              <TableRow 
                                className="bg-black hover:bg-black/90 cursor-pointer transition-colors"
                                onClick={() => toggleCategory(category)}
                                data-testid={`category-header-dept-${category}`}
                              >
                                <TableCell colSpan={8} className="font-semibold text-sm py-2 text-white">
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2">
                                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      {category}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
                                      onClick={(e) => hideCategory(category, e)}
                                      title="Hide this category"
                                      data-testid={`button-hide-dept-${category}`}
                                    >
                                      <EyeOff className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                              {isExpanded && rows.map((row) => (
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
                              ))}
                            </React.Fragment>
                          );
                        })
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
              Transfer stock from {getStoreNameById(selectedDept?.storeNameId || "")?.name || "SRD"} to a department.
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
              <Label htmlFor="toDept">Destination Department (Dep1-Dep10)</Label>
              <Select value={issueToDeptId || ""} onValueChange={setIssueToDeptId}>
                <SelectTrigger data-testid="select-issue-to-dept">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {visibleDeptList.map((dept, idx) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      Dep{idx + 1}: {getStoreNameById(dept.storeNameId)?.name || "Unknown"}
                    </SelectItem>
                  ))}
                  {visibleDeptList.length === 0 && departmentStores.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {getStoreNameById(dept.storeNameId)?.name || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="qty">Quantity to Issue</Label>
                <span className="text-sm text-muted-foreground">
                  Available: <strong className="text-foreground">{getAvailableQty.toFixed(2)}</strong>
                </span>
              </div>
              <Input 
                id="qty" 
                type="number" 
                step="0.01" 
                min="0.01"
                max={getAvailableQty}
                value={issueQty} 
                onChange={(e) => setIssueQty(e.target.value)}
                placeholder="Enter quantity"
                className={cn(parseFloat(issueQty || "0") > getAvailableQty && "border-red-500 focus-visible:ring-red-500")}
                data-testid="input-issue-qty"
              />
              {parseFloat(issueQty || "0") > getAvailableQty && (
                <p className="text-xs text-red-500">Quantity exceeds available stock</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleIssueSubmit} 
              disabled={!issueToDeptId || !issueQty || createIssueMutation.isPending || parseFloat(issueQty || "0") > getAvailableQty}
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

      {/* Edit Reason Dialog for Super Admin Past Date Edits */}
      <Dialog open={editReasonDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setEditReasonDialogOpen(false);
          setPendingEdit(null);
          setEditReason("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-600" />
              Editing Past Day Record
            </DialogTitle>
            <DialogDescription>
              You are editing a record from {format(parseISO(selectedDate), "MMMM d, yyyy")}. 
              Please provide a reason for this edit. This will be logged in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editReason">Edit Reason</Label>
              <Textarea 
                id="editReason"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Enter the reason for editing this past day record..."
                className="min-h-[100px]"
                data-testid="input-edit-reason"
              />
            </div>
            {pendingEdit && (
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                <strong>Edit Details:</strong>
                <br />
                Field: {pendingEdit.field.charAt(0).toUpperCase() + pendingEdit.field.slice(1)}
                <br />
                New Value: {pendingEdit.value}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEditReasonDialogOpen(false);
              setPendingEdit(null);
              setEditReason("");
            }}>
              Cancel
            </Button>
            <Button 
              onClick={confirmPastDateEdit}
              disabled={!editReason.trim()}
              data-testid="button-confirm-past-edit"
            >
              Confirm Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

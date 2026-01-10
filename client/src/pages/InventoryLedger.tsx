import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, subDays, addDays, isToday, isBefore, startOfDay } from "date-fns";
import { useSearch } from "wouter";
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
import { Store, ChefHat, AlertCircle, Package, Settings2, ChevronDown, ChevronRight, Save, EyeOff, Eye, ChevronLeft, Lock, History, Calendar, RotateCcw, AlertTriangle, RefreshCw } from "lucide-react";
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
  wholesalePrice: string | null;
  retailPrice: string | null;
  vipPrice: string | null;
  customPrice: string | null;
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

interface SrdTransfer {
  id: string;
  refId: string;
  clientId: string;
  fromSrdId: string;
  toSrdId: string;
  itemId: string;
  qty: string;
  transferDate: string;
  transferType: "issue" | "return" | "transfer";
  notes: string | null;
  status: string;
  createdBy: string;
  createdAt: string;
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
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const srdIdFromUrl = urlParams.get("srdId");
  
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedInvDept, setSelectedInvDept] = useState<string | null>(null);
  const [initialSrdSet, setInitialSrdSet] = useState(false);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [issueItemId, setIssueItemId] = useState<string | null>(null);
  const [issueToDeptId, setIssueToDeptId] = useState<string | null>(null);
  const [issueQty, setIssueQty] = useState<string>("");
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [visibleDepts, setVisibleDepts] = useState<Set<string>>(new Set());
  
  // Category configuration for SRD
  const [categoryConfigOpen, setCategoryConfigOpen] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  
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
  
  // Price tier selection for Department Store ledger (default to sellingPrice)
  type PriceTier = "selling" | "wholesale" | "retail" | "vip" | "custom";
  const [selectedPriceTier, setSelectedPriceTier] = useState<PriceTier>("selling");
  
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
  
  // Set initial SRD from URL parameter if provided
  useEffect(() => {
    if (srdIdFromUrl && !initialSrdSet) {
      setSelectedInvDept(srdIdFromUrl);
      setInitialSrdSet(true);
    }
  }, [srdIdFromUrl, initialSrdSet]);

  // Fetch inventory departments for the client
  const { data: inventoryDepts, isLoading: invDeptsLoading, error: invDeptsError, refetch: refetchInvDepts } = useQuery<InventoryDepartment[]>({
    queryKey: ["inventory-departments", selectedClientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${selectedClientId}/inventory-departments`);
      if (!res.ok) throw new Error("Failed to fetch inventory departments");
      return res.json();
    },
    enabled: !!selectedClientId,
  });

  // Fetch store names for display (client-specific)
  const { data: storeNames } = useQuery<StoreName[]>({
    queryKey: ["store-names", selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const res = await fetch(`/api/clients/${selectedClientId}/store-names`);
      if (!res.ok) throw new Error("Failed to fetch store names");
      return res.json();
    },
    enabled: !!selectedClientId,
  });

  // Fetch categories for the client
  const { data: categories } = useQuery<{ id: string; name: string; status: string }[]>({
    queryKey: ["categories", selectedClientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${selectedClientId}/categories`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
    enabled: !!selectedClientId,
  });

  // Fetch assigned categories for selected SRD
  const { data: assignedCategories } = useQuery<{ id: string; inventoryDepartmentId: string; categoryId: string }[]>({
    queryKey: ["inventory-dept-categories", selectedInvDept],
    queryFn: async () => {
      const res = await fetch(`/api/inventory-departments/${selectedInvDept}/categories`);
      if (!res.ok) throw new Error("Failed to fetch assigned categories");
      return res.json();
    },
    enabled: !!selectedInvDept,
  });

  // Fetch items for the client - filtered by inventory department's assigned categories
  const { data: items, isLoading: itemsLoading, error: itemsError, refetch: refetchItems } = useQuery<Item[]>({
    queryKey: ["items", selectedClientId, selectedInvDept],
    queryFn: async () => {
      // Use filtered endpoint when an inventory department is selected
      const url = selectedInvDept 
        ? `/api/clients/${selectedClientId}/inventory-departments/${selectedInvDept}/items`
        : `/api/clients/${selectedClientId}/items`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
    enabled: !!selectedClientId,
  });

  // Fetch store stock for selected department and date (read-only with computed carry-over)
  const { data: storeStockData, isLoading: stockLoading, error: stockError, refetch: refetchStock } = useQuery<StoreStock[]>({
    queryKey: ["store-stock", selectedClientId, selectedInvDept, selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${selectedClientId}/store-stock?departmentId=${selectedInvDept}&date=${selectedDate}&withCarryOver=true`);
      if (!res.ok) throw new Error("Failed to fetch store stock");
      return res.json();
    },
    enabled: !!selectedClientId && !!selectedInvDept,
    staleTime: 30000, // Cache for 30 seconds to reduce repeated calls
    refetchOnWindowFocus: false, // Don't refetch on window focus to prevent request storms
  });

  // Fetch previous day stock for opening rollforward
  const previousDate = format(subDays(parseISO(selectedDate), 1), "yyyy-MM-dd");
  const { data: prevDayStock, isLoading: prevDayLoading, isFetched: prevDayFetched } = useQuery<StoreStock[]>({
    queryKey: ["store-stock", selectedClientId, selectedInvDept, previousDate],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${selectedClientId}/store-stock?departmentId=${selectedInvDept}&date=${previousDate}`);
      if (!res.ok) throw new Error("Failed to fetch previous day stock");
      return res.json();
    },
    enabled: !!selectedClientId && !!selectedInvDept,
    staleTime: 60000, // Cache previous day for 60 seconds (doesn't change often)
    refetchOnWindowFocus: false,
  });

  // Fetch SRD transfers for selected SRD and date (new unified transfer system)
  const { data: srdTransfers } = useQuery<SrdTransfer[]>({
    queryKey: ["srd-transfers", selectedClientId, selectedInvDept, selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${selectedClientId}/srd-transfers?srdId=${selectedInvDept}&date=${selectedDate}`);
      if (!res.ok) throw new Error("Failed to fetch SRD transfers");
      return res.json();
    },
    enabled: !!selectedClientId && !!selectedInvDept,
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
  });

  // Fetch movement breakdown (waste, write-off, returns, adjustments) for ledger display
  interface MovementBreakdown {
    waste: number;
    writeOff: number;
    adjustmentIn: number;
    adjustmentOut: number;
    returnIn: Record<string, number>;
    returnOut: Record<string, number>;
    received: Record<string, number>;
    issuedTo: Record<string, number>;
  }
  
  const { data: movementBreakdownData } = useQuery<{ breakdown: Record<string, MovementBreakdown>; srdNames: Record<string, string>; srdTypes: Record<string, string> }>({
    queryKey: ["movement-breakdown", selectedClientId, selectedInvDept, selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${selectedClientId}/movement-breakdown?srdId=${selectedInvDept}&date=${selectedDate}`);
      if (!res.ok) throw new Error("Failed to fetch movement breakdown");
      return res.json();
    },
    enabled: !!selectedClientId && !!selectedInvDept,
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
  });
  
  const movementBreakdown = movementBreakdownData?.breakdown || {};
  const srdNameMap = movementBreakdownData?.srdNames || {};
  const srdTypeMap = movementBreakdownData?.srdTypes || {};
  
  // Collapse/expand state for column groups
  const [returnInwardCollapsed, setReturnInwardCollapsed] = useState(true);
  const [lossesCollapsed, setLossesCollapsed] = useState(true);
  const [receivedCollapsed, setReceivedCollapsed] = useState(true);
  const [transfersCollapsed, setTransfersCollapsed] = useState(true);
  const [reqDepCollapsed, setReqDepCollapsed] = useState(true);

  // Legacy store issues (for backward compatibility) - TODO: migrate to srdTransfers
  const { data: storeIssues } = useQuery<StoreIssue[]>({
    queryKey: ["store-issues", selectedClientId, selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${selectedClientId}/store-issues?date=${selectedDate}`);
      if (!res.ok) throw new Error("Failed to fetch store issues");
      return res.json();
    },
    enabled: !!selectedClientId,
  });

  // Fetch issue lines for each store issue (legacy)
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

  // Auto-select first inventory department when loaded
  useEffect(() => {
    if (!selectedInvDept && inventoryDepts && inventoryDepts.length > 0) {
      const activeDepts = inventoryDepts.filter(d => d.status === "active");
      if (activeDepts.length > 0) {
        setSelectedInvDept(activeDepts[0].id);
      }
    }
  }, [inventoryDepts, selectedInvDept]);

  // Initialize visible depts when department stores load
  useEffect(() => {
    if (departmentStores.length > 0 && visibleDepts.size === 0) {
      setVisibleDepts(new Set(departmentStores.slice(0, 5).map(d => d.id)));
    }
  }, [departmentStores]);

  // Build issue breakdown by department and item (combines legacy storeIssues and new srdTransfers)
  const issueBreakdown = useMemo(() => {
    const breakdown: Record<string, Record<string, number>> = {};
    
    // Process new SRD transfers (primary source)
    if (srdTransfers) {
      srdTransfers.forEach(transfer => {
        if (transfer.fromSrdId !== selectedInvDept) return;
        if (transfer.status === "recalled") return;
        
        if (!breakdown[transfer.itemId]) breakdown[transfer.itemId] = {};
        if (!breakdown[transfer.itemId][transfer.toSrdId]) breakdown[transfer.itemId][transfer.toSrdId] = 0;
        breakdown[transfer.itemId][transfer.toSrdId] += parseFloat(transfer.qty || "0");
      });
    }
    
    // Also process legacy store issues for backward compatibility
    if (storeIssues && issueLines) {
      storeIssues.forEach(issue => {
        if (issue.fromDepartmentId !== selectedInvDept) return;
        if (issue.status === "recalled") return;
        
        const lines = issueLines.find(il => il.issueId === issue.id)?.lines || [];
        lines.forEach(line => {
          if (!breakdown[line.itemId]) breakdown[line.itemId] = {};
          if (!breakdown[line.itemId][issue.toDepartmentId]) breakdown[line.itemId][issue.toDepartmentId] = 0;
          breakdown[line.itemId][issue.toDepartmentId] += parseFloat(line.qtyIssued || "0");
        });
      });
    }
    
    return breakdown;
  }, [srdTransfers, storeIssues, issueLines, selectedInvDept]);

  // Create SRD transfer (unified transfer engine)
  const createTransferMutation = useMutation({
    mutationFn: async (data: { itemId: string; toSrdId: string; qty: number; transferType?: string }) => {
      const res = await fetch(`/api/clients/${selectedClientId}/srd-transfers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromSrdId: selectedInvDept,
          toSrdId: data.toSrdId,
          itemId: data.itemId,
          qty: data.qty,
          transferDate: selectedDate,
          transferType: data.transferType || "issue",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create transfer");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-stock"] });
      queryClient.invalidateQueries({ queryKey: ["srd-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["movement-breakdown"] });
      setIssueDialogOpen(false);
      setIssueItemId(null);
      setIssueToDeptId(null);
      setIssueQty("");
      toast.success("Stock transferred successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to transfer stock");
    },
  });

  // Recall SRD transfer
  const recallTransferMutation = useMutation({
    mutationFn: async (refId: string) => {
      const res = await fetch(`/api/srd-transfers/${refId}/recall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to recall transfer");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-stock"] });
      queryClient.invalidateQueries({ queryKey: ["srd-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["movement-breakdown"] });
      toast.success("Transfer recalled successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to recall transfer");
    },
  });

  // Create issue via SRD transfers for proper ledger posting (Main→Dept → Added column)
  const createIssueMutation = useMutation({
    mutationFn: async (data: { itemId: string; toDeptId: string; qty: number }) => {
      const res = await fetch(`/api/clients/${selectedClientId}/srd-transfers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromSrdId: selectedInvDept,
          toSrdId: data.toDeptId,
          itemId: data.itemId,
          qty: data.qty,
          transferDate: selectedDate,
          transferType: "issue",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to issue stock");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-stock"] });
      queryClient.invalidateQueries({ queryKey: ["srd-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["movement-breakdown"] });
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

  // Legacy: Recall store issue
  const recallIssueMutation = useMutation({
    mutationFn: async (issueId: string) => {
      const res = await fetch(`/api/store-issues/${issueId}/recall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to recall issue");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-stock"] });
      queryClient.invalidateQueries({ queryKey: ["store-issues"] });
      queryClient.invalidateQueries({ queryKey: ["store-issue-lines"] });
      queryClient.invalidateQueries({ queryKey: ["movement-breakdown"] });
      toast.success("Stock recalled successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to recall stock");
    },
  });

  // Save category assignments mutation
  const saveCategoriesMutation = useMutation({
    mutationFn: async (categoryIds: string[]) => {
      const res = await fetch(`/api/inventory-departments/${selectedInvDept}/categories`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryIds }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save categories");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-dept-categories", selectedInvDept] });
      queryClient.invalidateQueries({ queryKey: ["items", selectedClientId, selectedInvDept] });
      setCategoryConfigOpen(false);
      toast.success("Allowed categories saved successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to save categories");
    },
  });

  // Load assigned categories when dialog opens
  useEffect(() => {
    if (categoryConfigOpen && assignedCategories) {
      setSelectedCategoryIds(new Set(assignedCategories.map(ac => ac.categoryId)));
    }
  }, [categoryConfigOpen, assignedCategories]);

  // Save ledger edits mutation
  const saveLedgerMutation = useMutation({
    mutationFn: async (edits: { itemId: string; opening?: string; purchase?: string; added?: string; closing?: string; isMainStore?: boolean }[]) => {
      const promises = edits.map(async (edit) => {
        const item = items?.find(i => i.id === edit.itemId);
        if (!item) return null;
        
        const opening = parseFloat(edit.opening || "0");
        const isMainStore = edit.isMainStore !== false;
        
        if (isMainStore) {
          // Main Store: purchase is addedQty, closing = total - issued
          const purchase = parseFloat(edit.purchase || "0");
          const total = opening + purchase;
          
          // Get issued quantity from existing breakdown
          let totalIssued = 0;
          departmentStores.forEach(dept => {
            totalIssued += issueBreakdown[edit.itemId]?.[dept.id] || 0;
          });
          
          const calculatedClosing = total - totalIssued;
          
          const res = await fetch(`/api/clients/${selectedClientId}/store-stock`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              storeDepartmentId: selectedInvDept,
              itemId: edit.itemId,
              date: new Date(selectedDate).toISOString(),
              openingQty: opening.toString(),
              addedQty: purchase.toString(),
              closingQty: calculatedClosing.toString(),
              costPriceSnapshot: item.costPrice || "0.00",
            }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to save ledger");
          }
          return res.json();
        } else {
          // Department Store: only save opening, preserve added from store issues
          const added = parseFloat(edit.added || "0");
          const total = opening + added;
          const physicalClosing = edit.closing ? parseFloat(edit.closing) : null;
          const closingQty = physicalClosing !== null ? physicalClosing : total;
          
          const res = await fetch(`/api/clients/${selectedClientId}/store-stock`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              storeDepartmentId: selectedInvDept,
              itemId: edit.itemId,
              date: new Date(selectedDate).toISOString(),
              openingQty: opening.toString(),
              addedQty: added.toString(),
              closingQty: closingQty.toString(),
              physicalClosingQty: physicalClosing?.toString() || null,
              costPriceSnapshot: item.costPrice || "0.00",
            }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to save ledger");
          }
          return res.json();
        }
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

  // Recalculate ledger row values
  const recalculateLedgerRow = (itemId: string, field: "opening" | "purchase" | "closing", value: string) => {
    const item = items?.find(i => i.id === itemId);
    const stockRecord = storeStockData?.find(s => s.itemId === itemId);
    const isMainStore = selectedDept?.inventoryType === "MAIN_STORE";
    
    // Get current values (from edits or stock data)
    const currentEdits = ledgerEdits[itemId] || {};
    const opening = field === "opening" ? parseFloat(value || "0") : parseFloat(currentEdits.opening || stockRecord?.openingQty || "0");
    const purchase = field === "purchase" ? parseFloat(value || "0") : parseFloat(currentEdits.purchase || stockRecord?.addedQty || "0");
    
    // Calculate total issues for this item (Main Store)
    let totalIssued = 0;
    if (isMainStore) {
      departmentStores.forEach(dept => {
        totalIssued += issueBreakdown[itemId]?.[dept.id] || 0;
      });
    }
    
    // Recalculate: Total = Opening + Purchase, Closing = Total - Issued
    const total = opening + purchase;
    const calculatedClosing = isMainStore ? total - totalIssued : total;
    
    return {
      opening: opening.toString(),
      purchase: purchase.toString(),
      closing: field === "closing" ? value : calculatedClosing.toString(),
    };
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
    
    // Recalculate the row values
    const recalculated = recalculateLedgerRow(itemId, field, value);
    
    setLedgerEdits(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        ...recalculated,
        [field]: value, // Keep original edited value
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

  // Save all ledger data (not just edits - save all items with their current values)
  const handleSaveLedger = () => {
    if (!items || !selectedDept) {
      toast.error("No items to save");
      return;
    }
    
    // Ensure previous day data is loaded for opening carry-over
    if (prevDayLoading || !prevDayFetched) {
      toast.error("Please wait for previous day data to load");
      return;
    }
    
    const activeItems = items.filter(i => i.status === "active");
    const isMainStore = selectedDept.inventoryType === "MAIN_STORE";
    
    const allItemsToSave = activeItems.map((item) => {
      const stock = storeStockData?.find(s => s.itemId === item.id);
      const editedOpening = ledgerEdits[item.id]?.opening;
      const editedPurchase = ledgerEdits[item.id]?.purchase;
      const editedClosing = ledgerEdits[item.id]?.closing;
      
      // Get the display values (edited or calculated)
      const opening = editedOpening !== undefined 
        ? editedOpening 
        : getOpeningQty(item.id, stock).toString();
      
      if (isMainStore) {
        // Main Store: purchase is what we edit
        const purchase = editedPurchase !== undefined 
          ? editedPurchase 
          : (stock?.addedQty || "0");
        
        return {
          itemId: item.id,
          opening,
          purchase,
          isMainStore: true,
        };
      } else {
        // Department Store: added comes from store issues (don't overwrite), only save opening
        const added = stock?.addedQty || "0";
        const closing = editedClosing || (stock?.physicalClosingQty || undefined);
        
        return {
          itemId: item.id,
          opening,
          added,
          closing,
          isMainStore: false,
        };
      }
    });
    
    if (allItemsToSave.length > 0) {
      saveLedgerMutation.mutate(allItemsToSave);
    }
  };

  // Get opening from previous day closing (rollforward)
  // If current stock record exists for today, use its openingQty
  // Otherwise, carry forward from previous day's closing
  const getOpeningQty = (itemId: string, currentStock?: StoreStock) => {
    // If we have a stock record for today, use its saved opening
    if (currentStock) {
      return parseFloat(currentStock.openingQty || "0");
    }
    // No stock record for today - carry forward from previous day's closing
    const prevStock = prevDayStock?.find(s => s.itemId === itemId);
    if (prevStock) {
      // Use physicalClosingQty if available (actual count), otherwise closingQty (calculated)
      const prevClosing = prevStock.physicalClosingQty !== null && prevStock.physicalClosingQty !== undefined
        ? parseFloat(prevStock.physicalClosingQty)
        : parseFloat(prevStock.closingQty || "0");
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
      
      // Get movement breakdown for this item
      const itemBreakdown = movementBreakdown[item.id] || {
        waste: 0, writeOff: 0, adjustmentIn: 0, adjustmentOut: 0,
        returnIn: {}, returnOut: {}, received: {}, issuedTo: {}
      };
      
      // Calculate return inward totals per department
      const returnInward: Record<string, number> = itemBreakdown.returnIn;
      const totalReturnIn = Object.values(returnInward).reduce((sum, val) => sum + val, 0);
      
      // Adjustments (net)
      const adjustmentNet = itemBreakdown.adjustmentIn - itemBreakdown.adjustmentOut;
      
      // Waste and Write-off
      const waste = itemBreakdown.waste;
      const writeOff = itemBreakdown.writeOff;
      
      // Total = Opening + Purchase + Returns In + Adjustments (net) - Waste - Write-off
      const total = opening + purchase + totalReturnIn + adjustmentNet - waste - writeOff;
      
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
        returnInward,
        totalReturnIn,
        adjustmentIn: itemBreakdown.adjustmentIn,
        adjustmentOut: itemBreakdown.adjustmentOut,
        adjustmentNet,
        waste,
        writeOff,
        total,
        depIssues,
        totalIssued,
        closing,
        cost,
        value,
        stockId: stock?.id,
        awaitingCount: stock?.physicalClosingQty !== null ? parseFloat(stock?.physicalClosingQty || "0") : null,
      };
    });
  }, [items, selectedDept, storeStockData, prevDayStock, departmentStores, issueBreakdown, movementBreakdown]);

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
      const issued = parseFloat(stock?.issuedQty || "0");
      
      // Get movement breakdown for this item
      const itemBreakdown = movementBreakdown[item.id] || {
        waste: 0, writeOff: 0, adjustmentIn: 0, adjustmentOut: 0,
        returnIn: {}, returnOut: {}, received: {}, issuedTo: {}
      };
      
      // Received from other SRDs - separate Main Store from Other Departments
      const receivedFrom: Record<string, number> = itemBreakdown.received;
      let receivedFromMainStore = 0;
      let receivedFromOtherDepts = 0;
      Object.entries(receivedFrom).forEach(([srdId, qty]) => {
        if (srdTypeMap[srdId] === "MAIN_STORE") {
          receivedFromMainStore += qty;
        } else {
          receivedFromOtherDepts += qty;
        }
      });
      const totalReceived = receivedFromMainStore + receivedFromOtherDepts;
      
      // Issued to other SRDs - separate Main Store from Other Departments
      const issuedTo: Record<string, number> = itemBreakdown.issuedTo;
      let issuedToMainStore = 0;
      let issuedToOtherDepts = 0;
      Object.entries(issuedTo).forEach(([srdId, qty]) => {
        if (srdTypeMap[srdId] === "MAIN_STORE") {
          issuedToMainStore += qty;
        } else {
          issuedToOtherDepts += qty;
        }
      });
      const totalIssuedOut = issuedToMainStore + issuedToOtherDepts;
      
      // Returned out to Main Store
      const returnedOut = Object.values(itemBreakdown.returnOut).reduce((sum, val) => sum + val, 0);
      
      // Adjustments (net)
      const adjustmentNet = itemBreakdown.adjustmentIn - itemBreakdown.adjustmentOut;
      
      // Waste and Write-off
      const waste = itemBreakdown.waste;
      const writeOff = itemBreakdown.writeOff;
      
      // Total = Opening + Added/Received + Adjustments (net)
      // Note: "added" in store_stock already includes received from transfers
      const total = opening + added + adjustmentNet;
      
      // Adjusted total accounts for issued, waste, write-off, and returns out
      const adjustedTotal = total - issued - waste - writeOff - returnedOut;
      
      // Physical count determines closing; issued movements are shown separately
      const hasPhysicalCount = stock?.physicalClosingQty !== null && stock?.physicalClosingQty !== undefined;
      const closing = hasPhysicalCount ? parseFloat(stock.physicalClosingQty!) : null;
      
      // Sold = adjustedTotal - closing (only when physical count exists)
      // This correctly excludes issued items from sales calculation
      const sold = closing !== null ? adjustedTotal - closing : null;
      
      // Price tiers - parse all available price tiers
      const prices = {
        selling: parseFloat(item.sellingPrice || "0"),
        wholesale: parseFloat(item.wholesalePrice || "0"),
        retail: parseFloat(item.retailPrice || "0"),
        vip: parseFloat(item.vipPrice || "0"),
        custom: parseFloat(item.customPrice || "0"),
      };
      
      // Use selected price tier for calculations
      const selectedPrice = prices[selectedPriceTier] || prices.selling;
      const amountSold = sold !== null ? sold * selectedPrice : null;
      
      return {
        sn,
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        unit: item.unit,
        opening,
        added,
        receivedFrom,
        receivedFromMainStore,
        receivedFromOtherDepts,
        totalReceived,
        issuedTo,
        issuedToMainStore,
        issuedToOtherDepts,
        totalIssuedOut,
        adjustmentIn: itemBreakdown.adjustmentIn,
        adjustmentOut: itemBreakdown.adjustmentOut,
        adjustmentNet,
        waste,
        writeOff,
        returnedOut,
        issued,
        total: adjustedTotal,
        sold,
        closing,
        prices,
        sellingPrice: selectedPrice,
        amountSold,
        awaitingCount: closing === null,
        stockId: stock?.id,
      };
    });
  }, [items, selectedDept, storeStockData, prevDayStock, movementBreakdown, srdTypeMap, selectedPriceTier]);

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
  // Formula: Opening + Purchase + ReturnIn + Adjustments - Waste - WriteOff - Issued
  const getAvailableQty = useMemo(() => {
    if (!issueItemId) return 0;
    const ledgerRow = mainStoreLedger.find(r => r.itemId === issueItemId);
    if (!ledgerRow) return 0;
    
    // Check if there are pending edits for this item
    const edits = ledgerEdits[issueItemId];
    if (edits) {
      const editedOpening = edits.opening !== undefined ? parseFloat(edits.opening || "0") : ledgerRow.opening;
      const editedPurchase = edits.purchase !== undefined ? parseFloat(edits.purchase || "0") : ledgerRow.purchase;
      // Include Return-In, Adjustments, and Losses in the total calculation
      const displayTotal = editedOpening + editedPurchase + ledgerRow.totalReturnIn + ledgerRow.adjustmentNet - ledgerRow.waste - ledgerRow.writeOff;
      const displayClosing = displayTotal - ledgerRow.totalIssued;
      return displayClosing > 0 ? displayClosing : 0;
    }
    
    // Use the row's calculated closing (Total - sum of all Dep issues)
    // Note: ledgerRow.total already includes ReturnIn, Adjustments, Waste, WriteOff
    const available = ledgerRow.total - ledgerRow.totalIssued;
    return available > 0 ? available : 0;
  }, [issueItemId, mainStoreLedger, ledgerEdits]);

  const handleIssueSubmit = () => {
    if (!issueItemId || !issueToDeptId || !issueQty) return;
    
    const qtyToIssue = parseFloat(issueQty);
    
    // Validate quantity doesn't exceed available (only for positive issues)
    if (qtyToIssue > 0 && qtyToIssue > getAvailableQty) {
      toast.error(`Cannot issue more than available stock (${getAvailableQty.toFixed(2)})`);
      return;
    }
    
    if (qtyToIssue === 0) {
      toast.error("Please enter a non-zero quantity");
      return;
    }
    
    // Use new unified SRD transfer API
    createTransferMutation.mutate({
      itemId: issueItemId,
      toSrdId: issueToDeptId,
      qty: qtyToIssue,
      transferType: "issue",
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

  const isDataLoading = invDeptsLoading || (selectedInvDept && stockLoading);
  const dataError = invDeptsError || itemsError || stockError;

  if (isDataLoading && !inventoryDepts && !storeStockData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-ledger">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (dataError && !inventoryDepts && !storeStockData) {
    const errorMessage = dataError instanceof Error ? dataError.message : "Unknown error";
    const isAuthError = errorMessage.includes("401") || errorMessage.includes("Unauthorized") || errorMessage.includes("Session expired");
    const isTimeout = errorMessage.includes("timed out") || errorMessage.includes("timeout");
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {isAuthError ? "Session expired" : isTimeout ? "Request timed out" : "Failed to load ledger"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {isAuthError 
                ? "Your session has expired. Please log in again."
                : isTimeout
                ? "The server took too long to respond. Please check your connection and try again."
                : `Error: ${errorMessage}. Please try again.`}
            </p>
            {isAuthError ? (
              <Button onClick={() => window.location.href = "/login"}>
                Go to Login
              </Button>
            ) : (
              <Button onClick={() => { refetchInvDepts(); refetchItems(); refetchStock(); }}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

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
            {selectedInvDept && (
              <Button variant="outline" size="sm" onClick={() => setCategoryConfigOpen(true)} data-testid="button-config-categories">
                <Package className="h-4 w-4 mr-2" />
                Allowed Categories
                {assignedCategories && assignedCategories.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    {assignedCategories.length}
                  </Badge>
                )}
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
              <div className="flex items-center gap-4">
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
                    {/* Return Inward - Collapsible Group */}
                    <TableHead 
                      className="w-[100px] text-right bg-green-50 cursor-pointer hover:bg-green-100"
                      onClick={() => setReturnInwardCollapsed(!returnInwardCollapsed)}
                      title="Click to expand/collapse Return Inward columns"
                    >
                      <div className="flex items-center justify-end gap-1">
                        {returnInwardCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        <span className="text-xs">Ret In</span>
                      </div>
                    </TableHead>
                    {!returnInwardCollapsed && departmentStores.map((dept, idx) => (
                      <TableHead key={`ret-${dept.id}`} className="w-[70px] text-right text-xs bg-green-50" title={`Return from ${getStoreNameById(dept.storeNameId)?.name}`}>
                        {getStoreNameById(dept.storeNameId)?.name?.slice(0, 8) || `D${idx + 1}`}
                      </TableHead>
                    ))}
                    {/* Losses (Waste/Write-Off) - Collapsible Group */}
                    <TableHead 
                      className="w-[80px] text-right bg-red-50 cursor-pointer hover:bg-red-100"
                      onClick={() => setLossesCollapsed(!lossesCollapsed)}
                      title="Click to expand/collapse Losses columns"
                    >
                      <div className="flex items-center justify-end gap-1">
                        {lossesCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        <span className="text-xs">Losses</span>
                      </div>
                    </TableHead>
                    {!lossesCollapsed && (
                      <>
                        <TableHead className="w-[70px] text-right text-xs bg-red-50">Waste</TableHead>
                        <TableHead className="w-[70px] text-right text-xs bg-red-50">Write-Off</TableHead>
                      </>
                    )}
                    <TableHead className="w-[80px] text-right bg-muted/30">Total</TableHead>
                    {/* Req Dep (Department Issues) - Collapsible Group */}
                    <TableHead 
                      className="w-[80px] text-right bg-orange-50 cursor-pointer hover:bg-orange-100"
                      onClick={() => setReqDepCollapsed(!reqDepCollapsed)}
                      title="Click to expand/collapse Department Issues columns"
                    >
                      <div className="flex items-center justify-end gap-1">
                        {reqDepCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        <span className="text-xs">Req Dep</span>
                      </div>
                    </TableHead>
                    {!reqDepCollapsed && visibleDeptList.map((dept, idx) => (
                      <TableHead key={dept.id} className="w-[80px] text-right text-xs bg-orange-50" title={getStoreNameById(dept.storeNameId)?.name}>
                        {getStoreNameById(dept.storeNameId)?.name?.slice(0, 8) || `Dep${idx + 1}`}
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
                      <TableCell colSpan={11 + (returnInwardCollapsed ? 0 : departmentStores.length) + (lossesCollapsed ? 0 : 2) + (reqDepCollapsed ? 0 : visibleDeptList.length)} className="text-center py-8 text-muted-foreground">
                        No items found. Add items in the Inventory page first.
                      </TableCell>
                    </TableRow>
                  ) : (
                    mainStoreLedgerByCategory
                      .filter(([category]) => !hiddenCategories.has(category))
                      .map(([category, rows]) => {
                      const isExpanded = expandedCategories.has(category);
                      const catTotals = rows.reduce((acc, row) => {
                        const editedOpening = ledgerEdits[row.itemId]?.opening;
                        const editedPurchase = ledgerEdits[row.itemId]?.purchase;
                        const displayOpening = editedOpening !== undefined ? parseFloat(editedOpening || "0") : row.opening;
                        const displayPurchase = editedPurchase !== undefined ? parseFloat(editedPurchase || "0") : row.purchase;
                        // Full formula: Opening + Purchase + ReturnIn + Adjustments - Losses
                        const displayTotal = displayOpening + displayPurchase + row.totalReturnIn + row.adjustmentNet - row.waste - row.writeOff;
                        const displayClosing = displayTotal - row.totalIssued;
                        const displayValue = displayClosing * row.cost;
                        const depTotals: Record<string, number> = {};
                        visibleDeptList.forEach(dept => {
                          depTotals[dept.id] = (acc.depIssues[dept.id] || 0) + (row.depIssues[dept.id] || 0);
                        });
                        return {
                          opening: acc.opening + displayOpening,
                          purchase: acc.purchase + displayPurchase,
                          total: acc.total + displayTotal,
                          closing: acc.closing + displayClosing,
                          value: acc.value + displayValue,
                          depIssues: depTotals,
                        };
                      }, { opening: 0, purchase: 0, total: 0, closing: 0, value: 0, depIssues: {} as Record<string, number> });
                      return (
                        <React.Fragment key={`cat-${category}`}>
                          <TableRow 
                            className="bg-black hover:bg-black/90 cursor-pointer transition-colors"
                            onClick={() => toggleCategory(category)}
                            data-testid={`category-header-${category}`}
                          >
                            <TableCell colSpan={11 + (returnInwardCollapsed ? 0 : departmentStores.length) + (lossesCollapsed ? 0 : 2) + (reqDepCollapsed ? 0 : visibleDeptList.length)} className="font-semibold text-sm py-2 sticky left-0 text-white">
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
                            // Full formula: Opening + Purchase + ReturnIn + Adjustments - Losses
                            const displayTotal = displayOpening + displayPurchase + row.totalReturnIn + row.adjustmentNet - row.waste - row.writeOff;
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
                              {/* Return Inward Summary/Detail */}
                              <TableCell className="text-right text-green-600 bg-green-50">
                                {row.totalReturnIn > 0 ? row.totalReturnIn.toFixed(2) : "-"}
                              </TableCell>
                              {!returnInwardCollapsed && departmentStores.map(dept => (
                                <TableCell key={`ret-${dept.id}`} className="text-right text-green-600 bg-green-50 text-xs">
                                  {(row.returnInward[dept.id] || 0) > 0 ? (row.returnInward[dept.id] || 0).toFixed(2) : "-"}
                                </TableCell>
                              ))}
                              {/* Losses Summary/Detail */}
                              <TableCell className="text-right text-red-600 bg-red-50">
                                {(row.waste + row.writeOff) > 0 ? (row.waste + row.writeOff).toFixed(2) : "-"}
                              </TableCell>
                              {!lossesCollapsed && (
                                <>
                                  <TableCell className="text-right text-red-600 bg-red-50 text-xs">
                                    {row.waste > 0 ? row.waste.toFixed(2) : "-"}
                                  </TableCell>
                                  <TableCell className="text-right text-red-600 bg-red-50 text-xs">
                                    {row.writeOff > 0 ? row.writeOff.toFixed(2) : "-"}
                                  </TableCell>
                                </>
                              )}
                              <TableCell className="text-right bg-muted/30 font-medium">{row.total.toFixed(2)}</TableCell>
                              {/* Req Dep Summary/Detail */}
                              <TableCell className="text-right text-orange-600 bg-orange-50 font-medium">
                                {row.totalIssued > 0 ? row.totalIssued.toFixed(2) : "-"}
                              </TableCell>
                              {!reqDepCollapsed && visibleDeptList.map(dept => (
                                <TableCell key={dept.id} className="text-right text-orange-600 bg-orange-50 text-xs">
                                  {(row.depIssues[dept.id] || 0) > 0 ? (row.depIssues[dept.id] || 0).toFixed(2) : "-"}
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
                          {isExpanded && (
                            <TableRow className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                              <TableCell className="text-center sticky left-0 bg-gray-100">—</TableCell>
                              <TableCell className="font-bold sticky left-[50px] bg-gray-100">{category} Total</TableCell>
                              <TableCell className="bg-gray-100">—</TableCell>
                              <TableCell className="text-right bg-gray-100">{catTotals.opening.toFixed(2)}</TableCell>
                              <TableCell className="text-right bg-gray-100">{catTotals.purchase.toFixed(2)}</TableCell>
                              {/* Return Inward Summary for totals */}
                              <TableCell className="text-right bg-green-50">—</TableCell>
                              {!returnInwardCollapsed && departmentStores.map(dept => (
                                <TableCell key={`tot-ret-${dept.id}`} className="text-right bg-green-50">—</TableCell>
                              ))}
                              {/* Losses Summary for totals */}
                              <TableCell className="text-right bg-red-50">—</TableCell>
                              {!lossesCollapsed && (
                                <>
                                  <TableCell className="text-right bg-red-50">—</TableCell>
                                  <TableCell className="text-right bg-red-50">—</TableCell>
                                </>
                              )}
                              <TableCell className="text-right bg-muted/30 font-bold">{catTotals.total.toFixed(2)}</TableCell>
                              {/* Req Dep totals */}
                              <TableCell className="text-right text-orange-600 font-bold bg-orange-50">
                                {Object.values(catTotals.depIssues).reduce((a, b) => a + b, 0).toFixed(2)}
                              </TableCell>
                              {!reqDepCollapsed && visibleDeptList.map(dept => (
                                <TableCell key={`total-${dept.id}`} className="text-right text-orange-600 font-bold bg-orange-50 text-xs">
                                  {(catTotals.depIssues[dept.id] || 0).toFixed(2)}
                                </TableCell>
                              ))}
                              <TableCell className="text-right bg-muted/30 font-bold">{catTotals.closing.toFixed(2)}</TableCell>
                              <TableCell className="text-right">—</TableCell>
                              <TableCell className="text-right font-bold">{catTotals.value.toFixed(2)}</TableCell>
                              <TableCell>—</TableCell>
                            </TableRow>
                          )}
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  {getStoreNameById(selectedDept.storeNameId)?.name} Ledger
                </CardTitle>
                <CardDescription>
                  Showing inventory for {format(parseISO(selectedDate), "MMMM d, yyyy")} • Edit Opening, Added auto-filled • Closing from Stock Count
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground whitespace-nowrap">Price Tier:</Label>
                  <Select value={selectedPriceTier} onValueChange={(v) => setSelectedPriceTier(v as PriceTier)}>
                    <SelectTrigger className="w-[130px] h-9" data-testid="select-price-tier">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="selling">Selling Price</SelectItem>
                      <SelectItem value="wholesale">Wholesale</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleSaveLedger} 
                  disabled={!hasUnsavedChanges || saveLedgerMutation.isPending}
                  className="gap-2"
                  data-testid="button-save-dept-ledger"
                >
                  {saveLedgerMutation.isPending ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {saveLedgerMutation.isPending ? "Saving..." : "Save Ledger"}
                </Button>
              </div>
            </div>
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
                    {/* Transfers (In/Out) - Collapsible Group */}
                    <TableHead 
                      className="w-[80px] text-right bg-blue-50 cursor-pointer hover:bg-blue-100"
                      onClick={() => setTransfersCollapsed(!transfersCollapsed)}
                      title="Click to expand/collapse Transfers columns"
                    >
                      <div className="flex items-center justify-end gap-1">
                        {transfersCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        <span className="text-xs">Transfers</span>
                      </div>
                    </TableHead>
                    {!transfersCollapsed && (
                      <>
                        <TableHead className="w-[70px] text-right text-xs bg-green-50">In (Main)</TableHead>
                        <TableHead className="w-[70px] text-right text-xs bg-green-50">In (Depts)</TableHead>
                        <TableHead className="w-[70px] text-right text-xs bg-orange-50">Out (Main)</TableHead>
                        <TableHead className="w-[70px] text-right text-xs bg-orange-50">Out (Depts)</TableHead>
                      </>
                    )}
                    {/* Losses (Waste/Write-Off) - Collapsible Group */}
                    <TableHead 
                      className="w-[80px] text-right bg-red-50 cursor-pointer hover:bg-red-100"
                      onClick={() => setLossesCollapsed(!lossesCollapsed)}
                      title="Click to expand/collapse Losses columns"
                    >
                      <div className="flex items-center justify-end gap-1">
                        {lossesCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        <span className="text-xs">Losses</span>
                      </div>
                    </TableHead>
                    {!lossesCollapsed && (
                      <>
                        <TableHead className="w-[70px] text-right text-xs bg-red-50">Waste</TableHead>
                        <TableHead className="w-[70px] text-right text-xs bg-red-50">Write-Off</TableHead>
                      </>
                    )}
                    <TableHead className="w-[100px] text-right bg-muted/30">Total</TableHead>
                    <TableHead className="w-[100px] text-right">Sold</TableHead>
                    <TableHead className="w-[100px] text-right bg-muted/30">Closing</TableHead>
                    <TableHead className="w-[100px] text-right">
                      {selectedPriceTier === "selling" ? "Selling Price" :
                       selectedPriceTier === "wholesale" ? "Wholesale" :
                       selectedPriceTier === "retail" ? "Retail" :
                       selectedPriceTier === "vip" ? "VIP" : "Custom"}
                    </TableHead>
                    <TableHead className="w-[120px] text-right bg-green-50">Amount Sold</TableHead>
                  </TableRow>
                </TableHeader>
                    <TableBody>
                      {deptStoreLedger.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={12 + (transfersCollapsed ? 0 : 4) + (lossesCollapsed ? 0 : 2)} className="text-center py-8 text-muted-foreground">
                            No items found. Add items in the Inventory page first.
                          </TableCell>
                        </TableRow>
                      ) : (
                        deptStoreLedgerByCategory
                          .filter(([category]) => !hiddenCategories.has(category))
                          .map(([category, rows]) => {
                          const isExpanded = expandedCategories.has(category);
                          const catTotals = rows.reduce((acc, row) => {
                            const editedOpening = ledgerEdits[row.itemId]?.opening;
                            const displayOpening = editedOpening !== undefined ? parseFloat(editedOpening || "0") : row.opening;
                            // Total = Opening + Added + Received - Issued Out - Losses
                            const adjustedTotal = displayOpening + row.added + row.totalReceived - row.totalIssuedOut - row.waste - row.writeOff;
                            const displayClosing = row.closing !== null ? row.closing : null;
                            const displaySold = displayClosing !== null ? adjustedTotal - displayClosing : null;
                            const displayAmountSold = displaySold !== null ? displaySold * row.sellingPrice : null;
                            
                            return {
                              opening: acc.opening + displayOpening,
                              added: acc.added + row.added,
                              receivedFromMainStore: acc.receivedFromMainStore + row.receivedFromMainStore,
                              receivedFromOtherDepts: acc.receivedFromOtherDepts + row.receivedFromOtherDepts,
                              totalReceived: acc.totalReceived + row.totalReceived,
                              issuedToMainStore: acc.issuedToMainStore + row.issuedToMainStore,
                              issuedToOtherDepts: acc.issuedToOtherDepts + row.issuedToOtherDepts,
                              totalIssuedOut: acc.totalIssuedOut + row.totalIssuedOut,
                              waste: acc.waste + row.waste,
                              writeOff: acc.writeOff + row.writeOff,
                              total: acc.total + adjustedTotal,
                              sold: acc.sold + (displaySold || 0),
                              closing: acc.closing + (displayClosing || 0),
                              amountSold: acc.amountSold + (displayAmountSold || 0),
                            };
                          }, { opening: 0, added: 0, receivedFromMainStore: 0, receivedFromOtherDepts: 0, totalReceived: 0, issuedToMainStore: 0, issuedToOtherDepts: 0, totalIssuedOut: 0, waste: 0, writeOff: 0, total: 0, sold: 0, closing: 0, amountSold: 0 });
                          return (
                            <React.Fragment key={`cat-${category}`}>
                              <TableRow 
                                className="bg-black hover:bg-black/90 cursor-pointer transition-colors"
                                onClick={() => toggleCategory(category)}
                                data-testid={`category-header-dept-${category}`}
                              >
                                <TableCell colSpan={12 + (transfersCollapsed ? 0 : 4) + (lossesCollapsed ? 0 : 2)} className="font-semibold text-sm py-2 text-white">
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
                              {isExpanded && rows.map((row) => {
                                const editedOpening = ledgerEdits[row.itemId]?.opening;
                                const displayOpening = editedOpening !== undefined ? parseFloat(editedOpening || "0") : row.opening;
                                // Adjusted total = Opening + Added + Received - Issued Out - Losses
                                const displayTotal = displayOpening + row.added + row.totalReceived - row.totalIssuedOut - row.waste - row.writeOff;
                                const editedClosingValue = ledgerEdits[row.itemId]?.closing;
                                const displayClosing = editedClosingValue !== undefined 
                                  ? parseFloat(editedClosingValue) 
                                  : row.closing;
                                const displaySold = displayClosing !== null ? displayTotal - displayClosing : null;
                                const displayAmountSold = displaySold !== null ? displaySold * row.sellingPrice : null;
                                
                                return (
                                <TableRow key={row.itemId} data-testid={`row-ledger-${row.itemId}`}>
                                  <TableCell className="text-center">{row.sn}</TableCell>
                                  <TableCell className="font-medium">{row.itemName}</TableCell>
                                  <TableCell className="text-muted-foreground">{row.unit}</TableCell>
                                  <TableCell className="p-1">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      className={cn("h-8 w-20 text-right", isPastDate && !isSuperAdmin && "bg-muted cursor-not-allowed")}
                                      value={editedOpening !== undefined ? editedOpening : row.opening.toString()}
                                      onChange={(e) => handleCellEdit(row.itemId, "opening", e.target.value)}
                                      disabled={isPastDate && !isSuperAdmin}
                                      title={isPastDate && !isSuperAdmin ? "Only Super Admin can edit past day records" : undefined}
                                      data-testid={`input-dept-opening-${row.itemId}`}
                                    />
                                  </TableCell>
                                  <TableCell className="text-right text-green-600">{row.added.toFixed(2)}</TableCell>
                                  {/* Transfers Summary/Detail */}
                                  <TableCell className="text-right bg-blue-50">
                                    {(row.totalReceived + row.totalIssuedOut) > 0 ? (row.totalReceived - row.totalIssuedOut).toFixed(2) : "-"}
                                  </TableCell>
                                  {!transfersCollapsed && (
                                    <>
                                      <TableCell className="text-right text-green-600 bg-green-50 text-xs">
                                        {row.receivedFromMainStore > 0 ? row.receivedFromMainStore.toFixed(2) : "-"}
                                      </TableCell>
                                      <TableCell className="text-right text-green-600 bg-green-50 text-xs">
                                        {row.receivedFromOtherDepts > 0 ? row.receivedFromOtherDepts.toFixed(2) : "-"}
                                      </TableCell>
                                      <TableCell className="text-right text-orange-600 bg-orange-50 text-xs">
                                        {row.issuedToMainStore > 0 ? row.issuedToMainStore.toFixed(2) : "-"}
                                      </TableCell>
                                      <TableCell className="text-right text-orange-600 bg-orange-50 text-xs">
                                        {row.issuedToOtherDepts > 0 ? row.issuedToOtherDepts.toFixed(2) : "-"}
                                      </TableCell>
                                    </>
                                  )}
                                  {/* Losses Summary/Detail */}
                                  <TableCell className="text-right text-red-600 bg-red-50">
                                    {(row.waste + row.writeOff) > 0 ? (row.waste + row.writeOff).toFixed(2) : "-"}
                                  </TableCell>
                                  {!lossesCollapsed && (
                                    <>
                                      <TableCell className="text-right text-red-600 bg-red-50 text-xs">
                                        {row.waste > 0 ? row.waste.toFixed(2) : "-"}
                                      </TableCell>
                                      <TableCell className="text-right text-red-600 bg-red-50 text-xs">
                                        {row.writeOff > 0 ? row.writeOff.toFixed(2) : "-"}
                                      </TableCell>
                                    </>
                                  )}
                                  <TableCell className="text-right bg-muted/30 font-medium">{displayTotal.toFixed(2)}</TableCell>
                                  <TableCell className="text-right">
                                    {displaySold !== null ? displaySold.toFixed(2) : <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                  <TableCell className="text-right bg-muted/30 p-1">
                                    {row.awaitingCount ? (
                                      // Show input for awaiting count (stays visible during editing)
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="Enter count"
                                        value={ledgerEdits[row.itemId]?.closing ?? ""}
                                        className={cn(
                                          "h-8 w-24 text-right bg-amber-50 border-amber-300",
                                          isPastDate && !isSuperAdmin && "bg-muted cursor-not-allowed"
                                        )}
                                        onChange={(e) => handleCellEdit(row.itemId, "closing", e.target.value)}
                                        disabled={isPastDate && !isSuperAdmin}
                                        title={isPastDate && !isSuperAdmin ? "Only Super Admin can edit past day records" : "Enter physical closing count"}
                                        data-testid={`input-dept-closing-${row.itemId}`}
                                      />
                                    ) : (
                                      // Show static value when count exists
                                      <span className="font-medium">{displayClosing?.toFixed(2)}</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">{row.sellingPrice.toFixed(2)}</TableCell>
                                  <TableCell className="text-right bg-green-50 font-medium text-green-700">
                                    {displayAmountSold !== null ? displayAmountSold.toFixed(2) : <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                </TableRow>
                              );})}
                              {isExpanded && (
                                <TableRow className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                                  <TableCell className="text-center">—</TableCell>
                                  <TableCell className="font-bold">{category} Total</TableCell>
                                  <TableCell>—</TableCell>
                                  <TableCell className="text-right">{catTotals.opening.toFixed(2)}</TableCell>
                                  <TableCell className="text-right text-green-600">{catTotals.added.toFixed(2)}</TableCell>
                                  {/* Transfers totals */}
                                  <TableCell className="text-right bg-blue-50">
                                    {(catTotals.totalReceived - catTotals.totalIssuedOut).toFixed(2)}
                                  </TableCell>
                                  {!transfersCollapsed && (
                                    <>
                                      <TableCell className="text-right text-green-600 bg-green-50 text-xs">{catTotals.receivedFromMainStore.toFixed(2)}</TableCell>
                                      <TableCell className="text-right text-green-600 bg-green-50 text-xs">{catTotals.receivedFromOtherDepts.toFixed(2)}</TableCell>
                                      <TableCell className="text-right text-orange-600 bg-orange-50 text-xs">{catTotals.issuedToMainStore.toFixed(2)}</TableCell>
                                      <TableCell className="text-right text-orange-600 bg-orange-50 text-xs">{catTotals.issuedToOtherDepts.toFixed(2)}</TableCell>
                                    </>
                                  )}
                                  {/* Losses totals */}
                                  <TableCell className="text-right text-red-600 bg-red-50">
                                    {(catTotals.waste + catTotals.writeOff).toFixed(2)}
                                  </TableCell>
                                  {!lossesCollapsed && (
                                    <>
                                      <TableCell className="text-right text-red-600 bg-red-50 text-xs">{catTotals.waste.toFixed(2)}</TableCell>
                                      <TableCell className="text-right text-red-600 bg-red-50 text-xs">{catTotals.writeOff.toFixed(2)}</TableCell>
                                    </>
                                  )}
                                  <TableCell className="text-right bg-muted/30 font-bold">{catTotals.total.toFixed(2)}</TableCell>
                                  <TableCell className="text-right">{catTotals.sold.toFixed(2)}</TableCell>
                                  <TableCell className="text-right bg-muted/30 font-bold">{catTotals.closing.toFixed(2)}</TableCell>
                                  <TableCell className="text-right">—</TableCell>
                                  <TableCell className="text-right bg-green-50 font-bold text-green-700">{catTotals.amountSold.toFixed(2)}</TableCell>
                                </TableRow>
                              )}
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

      {/* Today's Transfers with Recall Option */}
      {selectedDept?.inventoryType === "MAIN_STORE" && srdTransfers && srdTransfers.filter(t => t.fromSrdId === selectedInvDept && t.status === "posted").length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Today's Stock Transfers
            </CardTitle>
            <CardDescription>Click Recall to reverse a transfer and return stock to this SRD</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {srdTransfers
                .filter(t => t.fromSrdId === selectedInvDept && t.status === "posted")
                .map(transfer => {
                  const toDept = inventoryDepts?.find(d => d.id === transfer.toSrdId);
                  const toStoreName = getStoreNameById(toDept?.storeNameId || "")?.name || "Unknown";
                  const item = items?.find(i => i.id === transfer.itemId);
                  
                  return (
                    <div key={transfer.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                      <div className="flex-1">
                        <div className="font-medium text-sm flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{transfer.refId}</Badge>
                          <span>
                            {transfer.transferType === "issue" ? "Issued" : transfer.transferType === "return" ? "Returned" : "Transferred"} to: <span className="text-primary">{toStoreName}</span>
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {item?.name || "Unknown"}: {parseFloat(transfer.qty).toFixed(2)} units
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => recallTransferMutation.mutate(transfer.refId)}
                        disabled={recallTransferMutation.isPending}
                        className="text-orange-600 border-orange-600 hover:bg-orange-50"
                        data-testid={`button-recall-${transfer.refId}`}
                      >
                        {recallTransferMutation.isPending ? <Spinner className="mr-1 h-3 w-3" /> : <RotateCcw className="mr-1 h-3 w-3" />}
                        Recall
                      </Button>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legacy: Today's Issues with Recall Option (backward compatibility) */}
      {selectedDept?.inventoryType === "MAIN_STORE" && storeIssues && storeIssues.filter(i => i.fromDepartmentId === selectedInvDept && i.status !== "recalled").length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Legacy Issues (Old System)
            </CardTitle>
            <CardDescription>Click Recall to return issued items back to Main Store</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {storeIssues
                .filter(i => i.fromDepartmentId === selectedInvDept && i.status !== "recalled")
                .map(issue => {
                  const lines = issueLines?.find(il => il.issueId === issue.id)?.lines || [];
                  const toDept = inventoryDepts?.find(d => d.id === issue.toDepartmentId);
                  const toStoreName = getStoreNameById(toDept?.storeNameId || "")?.name || "Unknown";
                  
                  return (
                    <div key={issue.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          Issued to: <span className="text-primary">{toStoreName}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {lines.map(line => {
                            const item = items?.find(i => i.id === line.itemId);
                            return `${item?.name || "Unknown"}: ${line.qtyIssued}`;
                          }).join(", ")}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => recallIssueMutation.mutate(issue.id)}
                        disabled={recallIssueMutation.isPending}
                        className="text-orange-600 border-orange-600 hover:bg-orange-50"
                        data-testid={`button-recall-legacy-${issue.id}`}
                      >
                        {recallIssueMutation.isPending ? <Spinner className="mr-1 h-3 w-3" /> : <RotateCcw className="mr-1 h-3 w-3" />}
                        Recall
                      </Button>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

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
              disabled={!issueToDeptId || !issueQty || createTransferMutation.isPending || parseFloat(issueQty || "0") > getAvailableQty}
              data-testid="button-confirm-issue"
            >
              {createTransferMutation.isPending && <Spinner className="mr-2" />}
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

      {/* Allowed Categories Dialog */}
      <Dialog open={categoryConfigOpen} onOpenChange={setCategoryConfigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allowed Categories for SRD</DialogTitle>
            <DialogDescription>
              Select which inventory categories should display in this SRD. 
              If none selected, all items will be shown.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[300px] overflow-y-auto">
            {categories?.filter(c => c.status === "active").map(cat => (
              <div key={cat.id} className="flex items-center gap-3">
                <Checkbox 
                  id={`cat-${cat.id}`}
                  checked={selectedCategoryIds.has(cat.id)}
                  onCheckedChange={(checked) => {
                    const newSet = new Set(selectedCategoryIds);
                    if (checked) {
                      newSet.add(cat.id);
                    } else {
                      newSet.delete(cat.id);
                    }
                    setSelectedCategoryIds(newSet);
                  }}
                  data-testid={`checkbox-cat-${cat.id}`}
                />
                <Label htmlFor={`cat-${cat.id}`} className="cursor-pointer">
                  {cat.name}
                </Label>
              </div>
            ))}
            {(!categories || categories.filter(c => c.status === "active").length === 0) && (
              <p className="text-muted-foreground text-sm">No categories configured for this client. Add categories in the Inventory page first.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryConfigOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => saveCategoriesMutation.mutate(Array.from(selectedCategoryIds))}
              disabled={saveCategoriesMutation.isPending}
              data-testid="button-save-categories"
            >
              {saveCategoriesMutation.isPending ? <Spinner className="mr-2" /> : null}
              Save
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

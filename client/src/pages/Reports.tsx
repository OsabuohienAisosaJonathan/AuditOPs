import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { FileText, Download, BarChart3, PieChart, Table as TableIcon, AlertCircle, Printer, X, Eye, TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle, CheckCircle2, Award, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reportsApi, salesEntriesApi, departmentsApi, exceptionsApi, stockMovementsApi, SalesEntry, Exception as ExceptionType, StockMovement, departmentComparisonApi, DepartmentComparison, purchaseItemEventsApi, PurchaseItemEvent, grnApi, GoodsReceivedNote, receivablesApi, Receivable, surplusesApi, Surplus, storeNamesApi, itemsApi, paymentDeclarationsApi, PaymentDeclaration, auditLogsApi, AuditLog } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, eachDayOfInterval, isWithinInterval, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/lib/client-context";
import { useCurrency } from "@/lib/currency-context";
import { organizationSettingsApi } from "@/lib/api";
import { useEntitlements } from "@/lib/entitlements-context";

const REPORT_TYPES = [
  { value: "daily", label: "Daily Audit Report" },
  { value: "weekly", label: "Weekly Audit Report" },
  { value: "monthly", label: "Monthly Audit Report" },
  { value: "department-comparison", label: "Department Comparison Report" },
  { value: "stock-variance", label: "Stock Variance Report" },
  { value: "exceptions", label: "Exceptions Report" },
];

const SECTIONS = {
  existing: [
    { id: "executive-summary", label: "Executive Summary", default: true },
    { id: "metrics-dashboard", label: "Metrics Dashboard (KPIs)", default: true },
    { id: "sales-revenue", label: "Sales & Revenue", default: true },
    { id: "exception-log", label: "Exception Log", default: true },
  ],
  new: [
    { id: "sales-by-department", label: "Sales by Department (Summary)" },
    { id: "payment-methods", label: "Payment Methods Breakdown (Overall)" },
    { id: "payment-matrix", label: "Payment Methods by Department (Matrix)" },
    { id: "declared-vs-system", label: "Declared vs Captured Variance" },
    { id: "department-comparison-full", label: "Department Comparison (2nd Hit) - Full Table", helper: "Matches Reconciliation page 2nd Hit Comparison exactly" },
    { id: "department-comparison", label: "Department Comparison (2nd Hit)" },
    { id: "daily-breakdown", label: "Daily Breakdown (Weekly/Monthly)" },
    { id: "stock-report", label: "Stock Report & Variance (SRDs)" },
    { id: "stock-movements", label: "Stock Movements Summary" },
    { id: "reconciliation-summary", label: "Reconciliation Summary" },
    { id: "audit-evidence", label: "Audit Trail Evidence" },
    { id: "auditor-remarks", label: "Auditor Remarks & Recommendations" },
    { id: "purchases-register", label: "Purchases Register", helper: "All item purchases with supplier and cost details" },
    { id: "grn-register", label: "GRN Register", helper: "Goods Received Notes with supplier and status" },
    { id: "receivables-register", label: "Receivables", helper: "Cash shortages from department comparison" },
    { id: "surplus-register", label: "Surplus", helper: "Excess cash from department comparison" },
    { id: "srd-main-store", label: "SRD Main Store Ledger Summary", helper: "Main Store inventory with variance tracking" },
  ],
};

const QUICK_TEMPLATES = {
  "daily-flash": {
    sections: ["executive-summary", "metrics-dashboard", "sales-by-department", "payment-methods", "payment-matrix", "declared-vs-system", "department-comparison", "stock-report", "stock-movements", "exception-log"],
  },
  "weekly-variance": {
    sections: ["executive-summary", "metrics-dashboard", "daily-breakdown", "sales-by-department", "payment-methods", "payment-matrix", "declared-vs-system", "department-comparison", "stock-report", "stock-movements", "exception-log"],
  },
  "month-end-pack": {
    sections: [...SECTIONS.existing.map(s => s.id), ...SECTIONS.new.map(s => s.id)],
  },
};

export default function Reports() {
  const [reportType, setReportType] = useState("daily");
  const [dateRange, setDateRange] = useState("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedSections, setSelectedSections] = useState<string[]>(
    SECTIONS.existing.filter(s => s.default).map(s => s.id)
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const { selectedClientId, clients } = useClientContext();
  const clientId = selectedClientId || clients?.[0]?.id || "";
  const selectedClient = clients?.find(c => c.id === clientId);
  const { checkAndShowLocked } = useEntitlements();

  const getDateRange = () => {
    const today = new Date();
    switch (dateRange) {
      case "today":
        return { start: today, end: today };
      case "yesterday":
        return { start: subDays(today, 1), end: subDays(today, 1) };
      case "week":
        return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
      case "month":
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case "custom":
        return { 
          start: customStartDate ? new Date(customStartDate) : today, 
          end: customEndDate ? new Date(customEndDate) : today 
        };
      default:
        return { start: today, end: today };
    }
  };

  const { data: departments } = useQuery({
    queryKey: ["departments-report", clientId],
    queryFn: () => departmentsApi.getByClient(clientId),
    enabled: !!clientId,
  });

  const { data: allSalesData, isLoading: salesLoading } = useQuery({
    queryKey: ["sales-report-all", clientId],
    queryFn: async () => {
      return salesEntriesApi.getAll({ clientId });
    },
    enabled: !!clientId && isLoadingData,
  });

  const { data: exceptionsData, isLoading: exceptionsLoading } = useQuery({
    queryKey: ["exceptions-report", clientId],
    queryFn: () => exceptionsApi.getAll({ clientId }),
    enabled: !!clientId && isLoadingData,
  });

  const { data: stockMovementsData, isLoading: stockLoading } = useQuery({
    queryKey: ["stock-movements-report", clientId],
    queryFn: () => stockMovementsApi.getAll({ clientId }),
    enabled: !!clientId && isLoadingData,
  });

  const { data: orgSettings } = useQuery({
    queryKey: ["organization-settings"],
    queryFn: organizationSettingsApi.get,
    staleTime: 1000 * 60 * 5,
  });

  // New data sources for extended report sections
  const { data: departmentComparisonData, isLoading: deptCompLoading } = useQuery({
    queryKey: ["dept-comparison-report", clientId, getDateRange().end.toISOString().split('T')[0]],
    queryFn: () => departmentComparisonApi.get(clientId, format(getDateRange().end, "yyyy-MM-dd")),
    enabled: !!clientId && isLoadingData,
  });

  const { data: purchaseEventsData, isLoading: purchasesLoading } = useQuery({
    queryKey: ["purchase-events-report", clientId],
    queryFn: () => {
      const { start, end } = getDateRange();
      return purchaseItemEventsApi.getByClient(clientId, {
        dateFrom: format(start, "yyyy-MM-dd"),
        dateTo: format(end, "yyyy-MM-dd"),
      });
    },
    enabled: !!clientId && isLoadingData,
  });

  const { data: grnData, isLoading: grnLoading } = useQuery({
    queryKey: ["grn-report", clientId],
    queryFn: () => grnApi.getByClient(clientId),
    enabled: !!clientId && isLoadingData,
  });

  const { data: receivablesData, isLoading: receivablesLoading } = useQuery({
    queryKey: ["receivables-report", clientId],
    queryFn: () => receivablesApi.getByClient(clientId),
    enabled: !!clientId && isLoadingData,
  });

  const { data: surplusData, isLoading: surplusLoading } = useQuery({
    queryKey: ["surplus-report", clientId],
    queryFn: () => surplusesApi.getByClient(clientId),
    enabled: !!clientId && isLoadingData,
  });

  const { data: storeNames } = useQuery({
    queryKey: ["store-names-report", clientId],
    queryFn: () => storeNamesApi.getByClient(clientId),
    enabled: !!clientId && isLoadingData,
  });

  const { data: itemsData } = useQuery({
    queryKey: ["items-report", clientId],
    queryFn: () => itemsApi.getByClient(clientId),
    enabled: !!clientId && isLoadingData,
  });

  // Payment declarations for Sales & Revenue section (matches Audit Workspace)
  const { data: paymentDeclarationsData, isLoading: declarationsLoading } = useQuery({
    queryKey: ["payment-declarations-report", clientId, departments?.map(d => d.id).join(","), getDateRange().start.toISOString().split('T')[0]],
    queryFn: async () => {
      if (!departments || departments.length === 0) return [];
      const declarations: PaymentDeclaration[] = [];
      const { start, end } = getDateRange();
      for (const dept of departments) {
        try {
          const decl = await paymentDeclarationsApi.get(clientId, dept.id, format(start, "yyyy-MM-dd"));
          if (decl) declarations.push(decl);
        } catch {
          // No declaration for this department/date
        }
      }
      return declarations;
    },
    enabled: !!clientId && !!departments && departments.length > 0 && isLoadingData,
  });

  // Audit logs for Audit Trail Evidence section
  const { data: auditLogsData, isLoading: auditLogsLoading } = useQuery({
    queryKey: ["audit-logs-report", getDateRange().start.toISOString(), getDateRange().end.toISOString()],
    queryFn: () => {
      const { start, end } = getDateRange();
      return auditLogsApi.getAll({
        startDate: format(start, "yyyy-MM-dd"),
        endDate: format(end, "yyyy-MM-dd"),
        limit: 500,
      });
    },
    enabled: isLoadingData,
  });

  // Inventory Departments (SRDs) for ledger reports
  const { data: inventoryDepts, isLoading: invDeptsLoading } = useQuery<{ id: string; clientId: string; storeNameId: string; inventoryType: string; status: string }[]>({
    queryKey: ["inventory-departments-report", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/inventory-departments`);
      if (!res.ok) throw new Error("Failed to fetch inventory departments");
      return res.json();
    },
    enabled: !!clientId && isLoadingData,
  });

  // Store stock data for all SRDs (bulk fetch)
  const { data: allSrdStoreStock, isLoading: srdStockLoading } = useQuery<{ storeDepartmentId: string; itemId: string; openingQty: string; addedQty: string; issuedQty: string; closingQty: string; physicalClosingQty: string | null; varianceQty: string; costPriceSnapshot: string }[]>({
    queryKey: ["store-stock-bulk-report", clientId, inventoryDepts?.map(d => d.id).join(","), getDateRange().end.toISOString().split('T')[0]],
    queryFn: async () => {
      if (!inventoryDepts || inventoryDepts.length === 0) return [];
      const deptIds = inventoryDepts.filter(d => d.status === "active").map(d => d.id).join(",");
      if (!deptIds) return [];
      const { end } = getDateRange();
      const res = await fetch(`/api/clients/${clientId}/store-stock/bulk?departmentIds=${deptIds}&date=${format(end, "yyyy-MM-dd")}`);
      if (!res.ok) throw new Error("Failed to fetch store stock");
      return res.json();
    },
    enabled: !!clientId && !!inventoryDepts && inventoryDepts.length > 0 && isLoadingData,
  });

  const dataLoaded = !salesLoading && !exceptionsLoading && !stockLoading && !deptCompLoading && !purchasesLoading && !grnLoading && !receivablesLoading && !surplusLoading && !declarationsLoading && !auditLogsLoading && !invDeptsLoading && !srdStockLoading && allSalesData !== undefined;

  const getFilteredSalesData = () => {
    if (!allSalesData) return [];
    const { start, end } = getDateRange();
    return allSalesData.filter((s: SalesEntry) => {
      const saleDate = new Date(s.date);
      return saleDate >= start && saleDate <= end;
    });
  };

  const getFilteredStockMovements = () => {
    if (!stockMovementsData) return [];
    const { start, end } = getDateRange();
    return stockMovementsData.filter((m: StockMovement) => {
      if (!m.createdAt) return false;
      const moveDate = new Date(m.createdAt);
      return moveDate >= start && moveDate <= end;
    });
  };

  const getFilteredExceptions = () => {
    if (!exceptionsData) return [];
    const { start, end } = getDateRange();
    return exceptionsData.filter((e: ExceptionType) => {
      if (!e.createdAt || e.deletedAt) return false;
      const excDate = new Date(e.createdAt);
      return excDate >= start && excDate <= end;
    });
  };

  const getFilteredGRN = () => {
    if (!grnData) return [];
    const { start, end } = getDateRange();
    return grnData.filter((g: GoodsReceivedNote) => {
      if (!g.date) return false;
      const grnDate = new Date(g.date);
      if (isNaN(grnDate.getTime())) return false;
      return grnDate >= start && grnDate <= end;
    });
  };

  const getFilteredReceivables = () => {
    if (!receivablesData) return [];
    const { start, end } = getDateRange();
    return receivablesData.filter((r: Receivable) => {
      if (!r.auditDate) return false;
      const recDate = new Date(r.auditDate);
      if (isNaN(recDate.getTime())) return false;
      return recDate >= start && recDate <= end;
    });
  };

  const getFilteredSurplus = () => {
    if (!surplusData) return [];
    const { start, end } = getDateRange();
    return surplusData.filter((s: Surplus) => {
      if (!s.auditDate) return false;
      const surDate = new Date(s.auditDate);
      if (isNaN(surDate.getTime())) return false;
      return surDate >= start && surDate <= end;
    });
  };

  useEffect(() => {
    if (isLoadingData && dataLoaded) {
      buildReportData();
      setIsLoadingData(false);
      setPreviewOpen(true);
    }
  }, [isLoadingData, dataLoaded, allSalesData, exceptionsData, stockMovementsData, departmentComparisonData, purchaseEventsData, grnData, receivablesData, surplusData, paymentDeclarationsData, auditLogsData]);

  const toggleSection = (sectionId: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const applyTemplate = (templateKey: string) => {
    const template = QUICK_TEMPLATES[templateKey as keyof typeof QUICK_TEMPLATES];
    if (template) {
      setSelectedSections(template.sections);
      if (templateKey === "daily-flash") {
        setReportType("daily");
        setDateRange("today");
      } else if (templateKey === "weekly-variance") {
        setReportType("weekly");
        setDateRange("week");
      } else if (templateKey === "month-end-pack") {
        setReportType("monthly");
        setDateRange("month");
      }
      toast.success(`Applied "${templateKey.replace(/-/g, " ")}" template`);
    }
  };

  const calculateMetrics = () => {
    const sales: SalesEntry[] = getFilteredSalesData();
    const totalCapturedSales = sales.reduce((sum: number, s: SalesEntry) => sum + parseFloat(s.totalSales || "0"), 0);
    const totalCash = sales.reduce((sum: number, s: SalesEntry) => sum + parseFloat(s.cashAmount || "0"), 0);
    const totalPos = sales.reduce((sum: number, s: SalesEntry) => sum + parseFloat(s.posAmount || "0"), 0);
    const totalTransfer = sales.reduce((sum: number, s: SalesEntry) => sum + parseFloat(s.transferAmount || "0"), 0);
    const totalDeclared = totalCash + totalPos + totalTransfer;
    // CORRECT: variance = declared - captured (positive = surplus, negative = shortage)
    const variance = totalDeclared - totalCapturedSales;
    const variancePercent = totalCapturedSales > 0 ? (variance / totalCapturedSales) * 100 : 0;

    const movements: StockMovement[] = getFilteredStockMovements();
    const wasteTotal = movements.filter((m: StockMovement) => m.movementType === "waste").reduce((sum: number, m: StockMovement) => sum + parseFloat(m.totalValue || "0"), 0);
    const writeOffTotal = movements.filter((m: StockMovement) => m.movementType === "write_off").reduce((sum: number, m: StockMovement) => sum + parseFloat(m.totalValue || "0"), 0);
    const stockVariance = movements.filter((m: StockMovement) => m.movementType === "adjustment").reduce((sum: number, m: StockMovement) => sum + parseFloat(m.totalValue || "0"), 0);
    const transferTotal = movements.filter((m: StockMovement) => m.movementType === "transfer").reduce((sum: number, m: StockMovement) => sum + parseFloat(m.totalValue || "0"), 0);

    const activeExceptions: ExceptionType[] = getFilteredExceptions();
    const exceptionsOpen = activeExceptions.filter((e: ExceptionType) => e.status === "open").length;
    const exceptionsInvestigating = activeExceptions.filter((e: ExceptionType) => e.status === "investigating").length;
    const exceptionsResolved = activeExceptions.filter((e: ExceptionType) => e.status === "resolved").length;
    const exceptionsClosed = activeExceptions.filter((e: ExceptionType) => e.status === "closed").length;
    
    const outcomeTrue = activeExceptions.filter((e: ExceptionType) => e.outcome === "true").length;
    const outcomeFalse = activeExceptions.filter((e: ExceptionType) => e.outcome === "false").length;
    const outcomeMismatched = activeExceptions.filter((e: ExceptionType) => e.outcome === "mismatched").length;
    const outcomePending = activeExceptions.filter((e: ExceptionType) => !e.outcome || e.outcome === "pending").length;

    let complianceScore = 100;
    if (Math.abs(variancePercent) > 5) complianceScore -= 20;
    else if (Math.abs(variancePercent) > 2) complianceScore -= 10;
    complianceScore -= exceptionsOpen * 2;
    complianceScore -= exceptionsInvestigating * 1;
    if (stockVariance < 0) complianceScore -= Math.min(15, Math.abs(stockVariance) / 1000);
    complianceScore = Math.max(0, Math.min(100, complianceScore));

    let complianceBand: "Excellent" | "Good" | "Needs Review" | "Critical" = "Excellent";
    if (complianceScore < 50) complianceBand = "Critical";
    else if (complianceScore < 70) complianceBand = "Needs Review";
    else if (complianceScore < 85) complianceBand = "Good";

    return {
      totalCapturedSales,
      totalDeclared,
      variance,
      variancePercent,
      totalCash,
      totalPos,
      totalTransfer,
      wasteTotal,
      writeOffTotal,
      stockVariance,
      transferTotal,
      exceptionsOpen,
      exceptionsInvestigating,
      exceptionsResolved,
      exceptionsClosed,
      exceptionsTotal: activeExceptions.length,
      outcomeTrue,
      outcomeFalse,
      outcomeMismatched,
      outcomePending,
      complianceScore,
      complianceBand,
    };
  };

  const getSalesByDepartment = () => {
    const sales: SalesEntry[] = getFilteredSalesData();
    const deptMap: Record<string, { sales: number; transactions: number }> = {};
    
    sales.forEach((sale: SalesEntry) => {
      if (!deptMap[sale.departmentId]) {
        deptMap[sale.departmentId] = { sales: 0, transactions: 0 };
      }
      deptMap[sale.departmentId].sales += parseFloat(sale.totalSales || "0");
      deptMap[sale.departmentId].transactions += 1;
    });

    const totalSales = Object.values(deptMap).reduce((s, d) => s + d.sales, 0);
    
    return Object.entries(deptMap).map(([deptId, data]) => {
      const dept = departments?.find(d => d.id === deptId);
      return {
        departmentId: deptId,
        departmentName: dept?.name || "Unknown",
        capturedSales: data.sales,
        percentOfTotal: totalSales > 0 ? (data.sales / totalSales) * 100 : 0,
        transactions: data.transactions,
      };
    }).sort((a, b) => b.capturedSales - a.capturedSales);
  };

  const getPaymentMethodsByDepartment = () => {
    const sales: SalesEntry[] = getFilteredSalesData();
    const deptMap: Record<string, { cash: number; pos: number; transfer: number; total: number }> = {};
    
    sales.forEach((sale: SalesEntry) => {
      if (!deptMap[sale.departmentId]) {
        deptMap[sale.departmentId] = { cash: 0, pos: 0, transfer: 0, total: 0 };
      }
      const cash = parseFloat(sale.cashAmount || "0");
      const pos = parseFloat(sale.posAmount || "0");
      const transfer = parseFloat(sale.transferAmount || "0");
      deptMap[sale.departmentId].cash += cash;
      deptMap[sale.departmentId].pos += pos;
      deptMap[sale.departmentId].transfer += transfer;
      deptMap[sale.departmentId].total += cash + pos + transfer;
    });

    return Object.entries(deptMap).map(([deptId, data]) => {
      const dept = departments?.find(d => d.id === deptId);
      return {
        departmentId: deptId,
        departmentName: dept?.name || "Unknown",
        ...data,
      };
    }).sort((a, b) => b.total - a.total);
  };

  const getDepartmentComparison = () => {
    const sales: SalesEntry[] = getFilteredSalesData();
    const deptMap: Record<string, { captured: number; cash: number; pos: number; transfer: number; declared: number }> = {};
    
    sales.forEach((sale: SalesEntry) => {
      if (!deptMap[sale.departmentId]) {
        deptMap[sale.departmentId] = { captured: 0, cash: 0, pos: 0, transfer: 0, declared: 0 };
      }
      deptMap[sale.departmentId].captured += parseFloat(sale.totalSales || "0");
      deptMap[sale.departmentId].cash += parseFloat(sale.cashAmount || "0");
      deptMap[sale.departmentId].pos += parseFloat(sale.posAmount || "0");
      deptMap[sale.departmentId].transfer += parseFloat(sale.transferAmount || "0");
    });

    Object.keys(deptMap).forEach(deptId => {
      deptMap[deptId].declared = deptMap[deptId].cash + deptMap[deptId].pos + deptMap[deptId].transfer;
    });

    return Object.entries(deptMap).map(([deptId, data]) => {
      const dept = departments?.find(d => d.id === deptId);
      // CORRECT: variance = declared - captured (positive = surplus/over-declared, negative = short)
      const variance = data.declared - data.captured;
      const variancePercent = data.captured > 0 ? (variance / data.captured) * 100 : 0;
      let status: "OK" | "Review" | "Critical" = "OK";
      if (Math.abs(variancePercent) > 5) status = "Critical";
      else if (Math.abs(variancePercent) > 2) status = "Review";
      
      return {
        departmentId: deptId,
        departmentName: dept?.name || "Unknown",
        capturedSales: data.captured,
        declaredSales: data.declared,
        cash: data.cash,
        pos: data.pos,
        transfer: data.transfer,
        variance,
        variancePercent,
        status,
      };
    });
  };

  const getDailyBreakdown = () => {
    const { start, end } = getDateRange();
    const sales: SalesEntry[] = allSalesData || [];
    const movements: StockMovement[] = stockMovementsData || [];
    const exceptions: ExceptionType[] = exceptionsData?.filter((e: ExceptionType) => !e.deletedAt) || [];
    
    const days = eachDayOfInterval({ start, end });
    
    return days.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const daySales = sales.filter(s => format(new Date(s.date), "yyyy-MM-dd") === dateStr);
      
      const capturedSales = daySales.reduce((sum, s) => sum + parseFloat(s.totalSales || "0"), 0);
      const cash = daySales.reduce((sum, s) => sum + parseFloat(s.cashAmount || "0"), 0);
      const pos = daySales.reduce((sum, s) => sum + parseFloat(s.posAmount || "0"), 0);
      const transfer = daySales.reduce((sum, s) => sum + parseFloat(s.transferAmount || "0"), 0);
      const declared = cash + pos + transfer;
      // CORRECT: variance = declared - captured
      const variance = declared - capturedSales;
      const variancePercent = capturedSales > 0 ? (variance / capturedSales) * 100 : 0;
      
      const dayMovements = movements.filter(m => m.createdAt && format(new Date(m.createdAt), "yyyy-MM-dd") === dateStr);
      const stockVariance = dayMovements.filter(m => m.movementType === "adjustment").reduce((sum, m) => sum + parseFloat(m.totalValue || "0"), 0);
      
      const dayExceptions = exceptions.filter(e => e.createdAt && format(new Date(e.createdAt), "yyyy-MM-dd") === dateStr);
      const outcomeTrue = dayExceptions.filter(e => e.outcome === "true").length;
      const outcomeFalse = dayExceptions.filter(e => e.outcome === "false").length;
      const outcomeMismatched = dayExceptions.filter(e => e.outcome === "mismatched").length;
      const outcomePending = dayExceptions.filter(e => !e.outcome || e.outcome === "pending").length;
      
      return {
        date: dateStr,
        displayDate: format(day, "EEE, MMM d"),
        capturedSales,
        declared,
        variance,
        variancePercent,
        pos,
        transfer,
        cash,
        stockVariance,
        exceptionsRaised: dayExceptions.length,
        outcomeTrue,
        outcomeFalse,
        outcomeMismatched,
        outcomePending,
      };
    });
  };

  const getStockMovementsSummary = () => {
    const movements: StockMovement[] = stockMovementsData || [];
    
    const summary: Record<string, { count: number; qtyTotal: number; valueTotal: number }> = {
      transfer: { count: 0, qtyTotal: 0, valueTotal: 0 },
      adjustment: { count: 0, qtyTotal: 0, valueTotal: 0 },
      waste: { count: 0, qtyTotal: 0, valueTotal: 0 },
      write_off: { count: 0, qtyTotal: 0, valueTotal: 0 },
    };
    
    movements.forEach(m => {
      const type = m.movementType;
      if (summary[type]) {
        summary[type].count += 1;
        summary[type].qtyTotal += 1;
        summary[type].valueTotal += parseFloat(m.totalValue || "0");
      }
    });
    
    return Object.entries(summary).map(([type, data]) => ({
      type,
      label: type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
      ...data,
    }));
  };

  // Sales & Revenue: Daily Summary (matches Audit Workspace exactly)
  const getDailySummary = () => {
    const sales: SalesEntry[] = getFilteredSalesData();
    return {
      amount: sales.reduce((sum, e) => sum + Number(e.amount || 0), 0),
      complimentary: sales.reduce((sum, e) => sum + Number(e.complimentaryAmount || 0), 0),
      vouchers: sales.reduce((sum, e) => sum + Number(e.vouchersAmount || 0), 0),
      voids: sales.reduce((sum, e) => sum + Number(e.voidsAmount || 0), 0),
      others: sales.reduce((sum, e) => sum + Number(e.othersAmount || 0), 0),
      totalCaptured: sales.reduce((sum, e) => sum + Number(e.totalSales || 0), 0),
      entryCount: sales.length,
    };
  };

  // Sales & Revenue: Reported Payments Summary (matches Audit Workspace exactly)
  const getReportedPaymentsSummary = () => {
    const sales: SalesEntry[] = getFilteredSalesData();
    const declarations = paymentDeclarationsData || [];
    
    // Group sales by department
    const entriesByDept: Record<string, SalesEntry[]> = {};
    sales.forEach(s => {
      if (!entriesByDept[s.departmentId]) entriesByDept[s.departmentId] = [];
      entriesByDept[s.departmentId].push(s);
    });

    const results = (departments || []).map(dept => {
      const deptSales = entriesByDept[dept.id] || [];
      const totalCaptured = deptSales.reduce((sum, e) => sum + Number(e.totalSales || 0), 0);
      
      const declaration = declarations.find(d => d.departmentId === dept.id);
      const hasDeclaration = !!declaration;
      const declaredCash = Number(declaration?.reportedCash || 0);
      const declaredPos = Number(declaration?.reportedPosSettlement || 0);
      const declaredTransfer = Number(declaration?.reportedTransfers || 0);
      const totalDeclared = declaredCash + declaredPos + declaredTransfer;
      const variance = hasDeclaration ? totalDeclared - totalCaptured : 0;

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        totalCaptured,
        declaredCash,
        declaredPos,
        declaredTransfer,
        totalDeclared,
        hasDeclaration,
        variance,
      };
    }).filter(r => r.totalCaptured > 0 || r.hasDeclaration);

    const totals = {
      totalCaptured: results.reduce((s, r) => s + r.totalCaptured, 0),
      totalDeclared: results.reduce((s, r) => s + r.totalDeclared, 0),
      firstHitVariance: results.reduce((sum, r) => {
        if (!r.hasDeclaration) return sum - r.totalCaptured;
        return sum + r.variance;
      }, 0),
    };

    return { departments: results, totals };
  };

  // Audit Trail Evidence (from audit logs API)
  const getAuditTrailEvidence = () => {
    const logs = auditLogsData?.logs || [];
    return logs.map(log => ({
      id: log.id,
      timestamp: log.createdAt,
      userId: log.userId,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      details: log.details,
      ipAddress: log.ipAddress,
    }));
  };

  // Safe number utility - prevents NaN propagation in aggregations
  const safeNumber = (val: string | number | null | undefined): number => {
    const n = Number(val ?? 0);
    return Number.isFinite(n) ? n : 0;
  };

  // SRD Ledger Summary - Main Store and Department Stores (matches Inventory Ledger exactly)
  const getSrdLedgerSummary = () => {
    const srds = inventoryDepts || [];
    const stockData = allSrdStoreStock || [];
    const items = itemsData || [];
    const names = storeNames || [];

    // Group data by SRD
    const mainStoreSrds = srds.filter(s => s.inventoryType === "MAIN_STORE" && s.status === "active");
    const departmentStoreSrds = srds.filter(s => s.inventoryType === "DEPARTMENT_STORE" && s.status === "active");

    // Build main store summary
    const mainStoreLedger = mainStoreSrds.map(srd => {
      const srdStock = stockData.filter(s => s.storeDepartmentId === srd.id);
      const srdName = names.find(n => n.id === srd.storeNameId);
      
      const totals = srdStock.reduce((acc, stock) => {
        const item = items.find(i => i.id === stock.itemId);
        const costPrice = safeNumber(stock.costPriceSnapshot || item?.costPrice);
        const opening = safeNumber(stock.openingQty);
        const added = safeNumber(stock.addedQty);
        const issued = safeNumber(stock.issuedQty);
        const closing = safeNumber(stock.closingQty);
        // Awaiting count: when physical count is null, exclude from variance totals (matches Inventory Ledger)
        const isAwaitingCount = stock.physicalClosingQty === null;
        const physical = isAwaitingCount ? closing : safeNumber(stock.physicalClosingQty);
        const variance = isAwaitingCount ? 0 : physical - closing;
        
        return {
          openingQty: acc.openingQty + opening,
          addedQty: acc.addedQty + added,
          issuedQty: acc.issuedQty + issued,
          closingQty: acc.closingQty + closing,
          physicalQty: acc.physicalQty + physical,
          varianceQty: acc.varianceQty + variance,
          openingValue: acc.openingValue + (opening * costPrice),
          addedValue: acc.addedValue + (added * costPrice),
          issuedValue: acc.issuedValue + (issued * costPrice),
          closingValue: acc.closingValue + (closing * costPrice),
          varianceValue: acc.varianceValue + (variance * costPrice),
          itemCount: acc.itemCount + 1,
          countedItems: acc.countedItems + (stock.physicalClosingQty !== null ? 1 : 0),
          awaitingCount: acc.awaitingCount + (stock.physicalClosingQty === null ? 1 : 0),
        };
      }, { openingQty: 0, addedQty: 0, issuedQty: 0, closingQty: 0, physicalQty: 0, varianceQty: 0, openingValue: 0, addedValue: 0, issuedValue: 0, closingValue: 0, varianceValue: 0, itemCount: 0, countedItems: 0, awaitingCount: 0 });

      return {
        id: srd.id,
        name: srdName?.name || "Main Store",
        type: "MAIN_STORE",
        ...totals,
        items: srdStock.map(stock => {
          const item = items.find(i => i.id === stock.itemId);
          const { itemId: _itemId, ...stockWithoutItemId } = stock;
          return {
            itemId: stock.itemId,
            itemName: item?.name || "Unknown",
            category: item?.category || "Uncategorized",
            unit: item?.unit || "pcs",
            ...stockWithoutItemId,
          };
        }),
      };
    });

    // Build department store summary  
    const departmentStoreLedger = departmentStoreSrds.map(srd => {
      const srdStock = stockData.filter(s => s.storeDepartmentId === srd.id);
      const srdName = names.find(n => n.id === srd.storeNameId);
      
      const totals = srdStock.reduce((acc, stock) => {
        const item = items.find(i => i.id === stock.itemId);
        const costPrice = safeNumber(stock.costPriceSnapshot || item?.costPrice);
        const opening = safeNumber(stock.openingQty);
        const added = safeNumber(stock.addedQty);
        const issued = safeNumber(stock.issuedQty);
        const closing = safeNumber(stock.closingQty);
        // Awaiting count: when physical count is null, exclude from variance totals (matches Inventory Ledger)
        const isAwaitingCount = stock.physicalClosingQty === null;
        const physical = isAwaitingCount ? closing : safeNumber(stock.physicalClosingQty);
        const variance = isAwaitingCount ? 0 : physical - closing;
        
        return {
          openingQty: acc.openingQty + opening,
          addedQty: acc.addedQty + added,
          issuedQty: acc.issuedQty + issued,
          closingQty: acc.closingQty + closing,
          physicalQty: acc.physicalQty + physical,
          varianceQty: acc.varianceQty + variance,
          openingValue: acc.openingValue + (opening * costPrice),
          addedValue: acc.addedValue + (added * costPrice),
          issuedValue: acc.issuedValue + (issued * costPrice),
          closingValue: acc.closingValue + (closing * costPrice),
          varianceValue: acc.varianceValue + (variance * costPrice),
          itemCount: acc.itemCount + 1,
          countedItems: acc.countedItems + (stock.physicalClosingQty !== null ? 1 : 0),
          awaitingCount: acc.awaitingCount + (stock.physicalClosingQty === null ? 1 : 0),
        };
      }, { openingQty: 0, addedQty: 0, issuedQty: 0, closingQty: 0, physicalQty: 0, varianceQty: 0, openingValue: 0, addedValue: 0, issuedValue: 0, closingValue: 0, varianceValue: 0, itemCount: 0, countedItems: 0, awaitingCount: 0 });

      return {
        id: srd.id,
        name: srdName?.name || "Department Store",
        type: "DEPARTMENT_STORE",
        ...totals,
        items: srdStock.map(stock => {
          const item = items.find(i => i.id === stock.itemId);
          const { itemId: _itemId, ...stockWithoutItemId } = stock;
          return {
            itemId: stock.itemId,
            itemName: item?.name || "Unknown",
            category: item?.category || "Uncategorized",
            unit: item?.unit || "pcs",
            ...stockWithoutItemId,
          };
        }),
      };
    });

    // Combined totals across all department stores (use safeNumber for robustness)
    const combinedDeptTotals = departmentStoreLedger.reduce((acc, dept) => ({
      openingQty: acc.openingQty + safeNumber(dept.openingQty),
      addedQty: acc.addedQty + safeNumber(dept.addedQty),
      issuedQty: acc.issuedQty + safeNumber(dept.issuedQty),
      closingQty: acc.closingQty + safeNumber(dept.closingQty),
      physicalQty: acc.physicalQty + safeNumber(dept.physicalQty),
      varianceQty: acc.varianceQty + safeNumber(dept.varianceQty),
      openingValue: acc.openingValue + safeNumber(dept.openingValue),
      addedValue: acc.addedValue + safeNumber(dept.addedValue),
      issuedValue: acc.issuedValue + safeNumber(dept.issuedValue),
      closingValue: acc.closingValue + safeNumber(dept.closingValue),
      varianceValue: acc.varianceValue + safeNumber(dept.varianceValue),
      itemCount: acc.itemCount + safeNumber(dept.itemCount),
      countedItems: acc.countedItems + safeNumber(dept.countedItems),
      awaitingCount: acc.awaitingCount + safeNumber(dept.awaitingCount),
    }), { openingQty: 0, addedQty: 0, issuedQty: 0, closingQty: 0, physicalQty: 0, varianceQty: 0, openingValue: 0, addedValue: 0, issuedValue: 0, closingValue: 0, varianceValue: 0, itemCount: 0, countedItems: 0, awaitingCount: 0 });

    return {
      mainStore: mainStoreLedger,
      departmentStores: departmentStoreLedger,
      combinedDeptTotals,
    };
  };

  const buildReportData = () => {
    const metrics = calculateMetrics();
    const deptComparison = getDepartmentComparison();
    const salesByDept = getSalesByDepartment();
    const paymentMatrix = getPaymentMethodsByDepartment();
    const dailyBreakdown = getDailyBreakdown();
    const stockMovementsSummary = getStockMovementsSummary();
    const { start, end } = getDateRange();
    
    const topVarianceDrivers: string[] = [];
    const sortedDepts = [...deptComparison].sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
    sortedDepts.slice(0, 3).forEach(d => {
      if (Math.abs(d.variance) > 0) {
        topVarianceDrivers.push(`${d.departmentName} (${formatMoney(d.variance)})`);
      }
    });

    // Process purchase events with item names
    const purchaseRegister = (purchaseEventsData || []).map((p: PurchaseItemEvent) => {
      const item = itemsData?.find(i => i.id === p.itemId);
      const srd = storeNames?.find(s => s.id === p.srdId);
      return {
        ...p,
        itemName: item?.name || "Unknown Item",
        srdName: srd?.name || "N/A",
      };
    });

    // Process GRN register
    const grnRegister = getFilteredGRN().map((g: GoodsReceivedNote) => ({
      ...g,
      itemsCount: 1,
    }));

    // Process receivables with department names
    const receivablesRegister = getFilteredReceivables().map((r: Receivable) => {
      const dept = departments?.find(d => d.id === r.departmentId);
      return {
        ...r,
        departmentName: dept?.name || "Unknown",
      };
    });

    // Process surplus with department names
    const surplusRegister = getFilteredSurplus().map((s: Surplus) => {
      const dept = departments?.find(d => d.id === s.departmentId);
      return {
        ...s,
        departmentName: dept?.name || "Unknown",
      };
    });

    // Full department comparison from API (2nd Hit)
    const deptComparisonFull = (departmentComparisonData || []).map((d: DepartmentComparison) => ({
      ...d,
      grandTotal: {
        totalCaptured: (departmentComparisonData || []).reduce((s, x) => s + x.totalCaptured, 0),
        totalDeclared: (departmentComparisonData || []).reduce((s, x) => s + x.totalDeclared, 0),
        auditTotal: (departmentComparisonData || []).reduce((s, x) => s + x.auditTotal, 0),
        variance1stHit: (departmentComparisonData || []).reduce((s, x) => s + x.variance1stHit, 0),
        variance2ndHit: (departmentComparisonData || []).reduce((s, x) => s + x.variance2ndHit, 0),
        finalVariance: (departmentComparisonData || []).reduce((s, x) => s + x.finalVariance, 0),
      },
    }));
    
    // Sales & Revenue section data (matches Audit Workspace exactly)
    const dailySummary = getDailySummary();
    const reportedPayments = getReportedPaymentsSummary();
    
    // Audit Trail Evidence
    const auditTrailEvidence = getAuditTrailEvidence();
    
    // SRD Ledger Summary (matches Inventory Ledger page)
    const srdLedgerSummary = getSrdLedgerSummary();

    setReportData({
      type: reportType,
      period: {
        start: format(start, "yyyy-MM-dd"),
        end: format(end, "yyyy-MM-dd"),
        label: dateRange === "today" ? "Today" : dateRange === "yesterday" ? "Yesterday" : 
               dateRange === "week" ? "This Week" : dateRange === "month" ? "This Month" : "Custom Range",
      },
      client: selectedClient?.name || "Unknown Client",
      generatedAt: new Date().toISOString(),
      preparedBy: "Miemploya AuditOps",
      metrics,
      departmentComparison: deptComparison,
      departmentComparisonFull: departmentComparisonData || [],
      salesByDepartment: salesByDept,
      paymentMatrix,
      dailyBreakdown,
      stockMovementsSummary,
      topVarianceDrivers,
      sales: getFilteredSalesData(),
      exceptions: getFilteredExceptions(),
      stockMovements: getFilteredStockMovements(),
      purchaseRegister,
      grnRegister,
      receivablesRegister,
      surplusRegister,
      selectedSections,
      storeNames: storeNames || [],
      items: itemsData || [],
      // Sales & Revenue (matches Audit Workspace)
      dailySummary,
      reportedPayments,
      // Audit Trail Evidence
      auditTrailEvidence,
      // SRD Ledger Summary (matches Inventory Ledger)
      srdLedgerSummary,
    });
  };

  const handleGeneratePreview = () => {
    setIsLoadingData(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!checkAndShowLocked("canDownloadReports", "Report Downloads", "Growth")) {
      return;
    }
    window.print();
    toast.success("Use your browser's 'Save as PDF' option in the print dialog");
  };

  const exportExcel = () => {
    if (!checkAndShowLocked("canDownloadReports", "Report Downloads", "Growth")) {
      return;
    }
    if (!reportData) {
      toast.error("Generate a preview first");
      return;
    }
    
    const { metrics, departmentComparison, dailyBreakdown, exceptions, stockMovementsSummary } = reportData;
    let csvContent = "";
    
    csvContent += "=== AUDIT REPORT ===\n";
    csvContent += `Client,${reportData.client}\n`;
    csvContent += `Period,${reportData.period.label} (${reportData.period.start} to ${reportData.period.end})\n`;
    csvContent += `Generated,${format(new Date(reportData.generatedAt), "MMM d, yyyy HH:mm")}\n`;
    csvContent += `Prepared By,${reportData.preparedBy}\n\n`;
    
    csvContent += "=== SUMMARY METRICS ===\n";
    csvContent += "Metric,Value\n";
    csvContent += `Total Captured Sales,${formatMoney(metrics.totalCapturedSales)}\n`;
    csvContent += `Total Declared,${formatMoney(metrics.totalDeclared)}\n`;
    csvContent += `Variance,${formatMoney(metrics.variance)}\n`;
    csvContent += `Variance %,${metrics.variancePercent.toFixed(2)}%\n`;
    csvContent += `Cash,${formatMoney(metrics.totalCash)}\n`;
    csvContent += `POS,${formatMoney(metrics.totalPos)}\n`;
    csvContent += `Transfer,${formatMoney(metrics.totalTransfer)}\n`;
    csvContent += `Stock Variance,${formatMoney(metrics.stockVariance)}\n`;
    csvContent += `Waste + Write-off,${formatMoney(metrics.wasteTotal + metrics.writeOffTotal)}\n`;
    csvContent += `Compliance Score,${metrics.complianceScore.toFixed(0)} (${metrics.complianceBand})\n`;
    csvContent += `Exceptions (Open/Investigating/Resolved/Closed),${metrics.exceptionsOpen}/${metrics.exceptionsInvestigating}/${metrics.exceptionsResolved}/${metrics.exceptionsClosed}\n\n`;
    
    if (selectedSections.includes("department-comparison")) {
      csvContent += "=== DEPARTMENT COMPARISON (2ND HIT) ===\n";
      csvContent += "Department,Captured Sales,Declared Sales,Variance,Variance %,Cash,POS,Transfer,Status\n";
      departmentComparison.forEach((d: any) => {
        csvContent += `"${d.departmentName}",${d.capturedSales.toFixed(2)},${d.declaredSales.toFixed(2)},${d.variance.toFixed(2)},${d.variancePercent.toFixed(2)}%,${d.cash.toFixed(2)},${d.pos.toFixed(2)},${d.transfer.toFixed(2)},${d.status}\n`;
      });
      csvContent += "\n";
    }
    
    if (selectedSections.includes("daily-breakdown") && dailyBreakdown?.length > 0) {
      csvContent += "=== DAILY BREAKDOWN ===\n";
      csvContent += "Date,Captured Sales,Declared,Variance,Variance %,POS,Transfer,Cash,Stock Variance,Exceptions,TRUE,FALSE,MISMATCHED,PENDING\n";
      dailyBreakdown.forEach((d: any) => {
        csvContent += `${d.date},${d.capturedSales.toFixed(2)},${d.declared.toFixed(2)},${d.variance.toFixed(2)},${d.variancePercent.toFixed(2)}%,${d.pos.toFixed(2)},${d.transfer.toFixed(2)},${d.cash.toFixed(2)},${d.stockVariance.toFixed(2)},${d.exceptionsRaised},${d.outcomeTrue},${d.outcomeFalse},${d.outcomeMismatched},${d.outcomePending}\n`;
      });
      csvContent += "\n";
    }
    
    if (selectedSections.includes("exception-log")) {
      csvContent += "=== EXCEPTIONS LOG ===\n";
      csvContent += "Case #,Department,Summary,Severity,Status,Outcome,Created,Last Updated\n";
      exceptions.forEach((e: any) => {
        const dept = departments?.find(d => d.id === e.departmentId);
        csvContent += `"${e.caseNumber}","${dept?.name || ""}","${e.summary}","${e.severity || ""}","${e.status || ""}","${(e.outcome || "PENDING").toUpperCase()}","${e.createdAt ? format(new Date(e.createdAt), "yyyy-MM-dd HH:mm") : ""}","${e.updatedAt ? format(new Date(e.updatedAt), "yyyy-MM-dd HH:mm") : ""}"\n`;
      });
    }
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-report-${reportData.client.replace(/\s+/g, "-")}-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Excel/CSV exported");
  };

  const { formatMoney } = useCurrency();

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto print:max-w-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate comprehensive audit reports and schedules</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 print:hidden">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Report Builder</CardTitle>
              <CardDescription>Configure your report parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Report Type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger data-testid="select-report-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger data-testid="select-date-range">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {dateRange === "custom" && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <Label>Included Sections</Label>
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Core Sections</div>
                  <div className="grid grid-cols-2 gap-3">
                    {SECTIONS.existing.map(section => (
                      <div 
                        key={section.id}
                        className={cn(
                          "flex items-center space-x-2 border p-3 rounded hover:bg-muted/50 transition-colors cursor-pointer",
                          selectedSections.includes(section.id) && "bg-primary/5 border-primary/30"
                        )}
                        onClick={() => toggleSection(section.id)}
                      >
                        <Checkbox 
                          id={`sec-${section.id}`} 
                          checked={selectedSections.includes(section.id)}
                          onCheckedChange={() => toggleSection(section.id)}
                          data-testid={`checkbox-${section.id}`}
                        />
                        <label htmlFor={`sec-${section.id}`} className="text-sm font-medium leading-none cursor-pointer flex-1">{section.label}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Extended Sections</div>
                  <div className="grid grid-cols-2 gap-3">
                    {SECTIONS.new.map(section => (
                      <div 
                        key={section.id}
                        className={cn(
                          "flex items-center space-x-2 border p-3 rounded hover:bg-muted/50 transition-colors cursor-pointer",
                          selectedSections.includes(section.id) && "bg-primary/5 border-primary/30"
                        )}
                        onClick={() => toggleSection(section.id)}
                      >
                        <Checkbox 
                          id={`sec-${section.id}`} 
                          checked={selectedSections.includes(section.id)}
                          onCheckedChange={() => toggleSection(section.id)}
                          data-testid={`checkbox-${section.id}`}
                        />
                        <label htmlFor={`sec-${section.id}`} className="text-sm font-medium leading-none cursor-pointer flex-1">{section.label}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-4 flex-wrap">
                <Button 
                  className="gap-2"
                  onClick={handleGeneratePreview}
                  disabled={isLoadingData}
                  data-testid="button-generate-pdf"
                >
                  {isLoadingData ? <Spinner className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {isLoadingData ? "Loading Data..." : "Preview & Generate PDF"}
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={exportExcel}
                  data-testid="button-generate-excel"
                >
                  <Download className="h-4 w-4" />
                  Download Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Report Templates</h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { title: "Daily Flash", icon: BarChart3, desc: "1-2 pages, top KPIs + key tables", key: "daily-flash" },
                { title: "Weekly Pack", icon: PieChart, desc: "Daily breakdown + weekly totals", key: "weekly-variance" },
                { title: "Month End Pack", icon: TableIcon, desc: "Comprehensive monthly analysis", key: "month-end-pack" },
              ].map((template) => (
                <Card 
                  key={template.key} 
                  className="hover:shadow-md transition-shadow cursor-pointer group" 
                  onClick={() => applyTemplate(template.key)}
                  data-testid={`template-${template.key}`}
                >
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="h-24 bg-muted/30 rounded border border-dashed flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                      <template.icon className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{template.title}</div>
                      <div className="text-xs text-muted-foreground">{template.desc}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="bg-sidebar text-sidebar-foreground border-sidebar-border">
            <CardHeader>
              <CardTitle className="text-sidebar-foreground">Quick Templates</CardTitle>
              <CardDescription className="text-sidebar-foreground/60">Auto-select sections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { title: "Daily Flash", icon: BarChart3, key: "daily-flash" },
                { title: "Weekly Pack", icon: PieChart, key: "weekly-variance" },
                { title: "Month End Pack", icon: TableIcon, key: "month-end-pack" },
              ].map((t) => (
                <Button 
                  key={t.key} 
                  variant="ghost" 
                  className="w-full justify-start hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/80"
                  onClick={() => applyTemplate(t.key)}
                  data-testid={`quick-template-${t.key}`}
                >
                  <t.icon className="mr-2 h-4 w-4" />
                  {t.title}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Selected Sections</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedSections.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sections selected</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {selectedSections.map(s => (
                    <Badge key={s} variant="secondary" className="text-xs">{s.replace(/-/g, " ")}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Report Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden print:max-w-none print:max-h-none print:border-none print:shadow-none print:p-0">
          <DialogHeader className="print:hidden">
            <DialogTitle>Report Preview</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(90vh-200px)] print:h-auto print:overflow-visible">
            <div ref={reportRef} className="p-8 bg-white text-black print:p-0 print:m-0" id="report-content">
              {reportData && (
                <div className="space-y-8">
                  {/* Cover Header */}
                  <div className="border-b-2 border-blue-900 pb-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h1 className="text-3xl font-bold text-blue-900">{reportData.client}</h1>
                        <h2 className="text-xl font-semibold text-gray-700 mt-1">{REPORT_TYPES.find(t => t.value === reportData.type)?.label}</h2>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-semibold text-blue-900">Miemploya AuditOps</div>
                        <div className="text-gray-500">Audit Excellence Platform</div>
                        {orgSettings?.email && <div className="text-gray-500 mt-1">{orgSettings.email}</div>}
                        {orgSettings?.phone && <div className="text-gray-500">{orgSettings.phone}</div>}
                      </div>
                    </div>
                    {orgSettings?.address && (
                      <div className="text-sm text-gray-500 mt-2">{orgSettings.address}</div>
                    )}
                    <div className="grid grid-cols-3 gap-4 mt-6 text-sm bg-gray-50 p-4 rounded">
                      <div><span className="text-gray-500">Period:</span> <span className="font-medium">{reportData.period.label}</span></div>
                      <div><span className="text-gray-500">Date Range:</span> <span className="font-medium">{reportData.period.start} to {reportData.period.end}</span></div>
                      <div><span className="text-gray-500">Generated:</span> <span className="font-medium">{format(new Date(reportData.generatedAt), "MMM d, yyyy HH:mm")}</span></div>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  {selectedSections.includes("executive-summary") && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="font-bold text-lg text-blue-900 mb-3">Executive Summary</h3>
                      <p className="text-gray-700">
                        Declared vs Captured variance is <span className="font-bold">{formatMoney(reportData.metrics.variance)}</span> ({reportData.metrics.variancePercent.toFixed(2)}%).
                        {reportData.topVarianceDrivers.length > 0 && (
                          <> Primary drivers: {reportData.topVarianceDrivers.join(", ")}.</>
                        )}
                      </p>
                      <div className="mt-4 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Award className={cn(
                            "h-5 w-5",
                            reportData.metrics.complianceBand === "Excellent" && "text-green-600",
                            reportData.metrics.complianceBand === "Good" && "text-blue-600",
                            reportData.metrics.complianceBand === "Needs Review" && "text-amber-600",
                            reportData.metrics.complianceBand === "Critical" && "text-red-600"
                          )} />
                          <span className="font-semibold">Compliance Score:</span>
                          <Badge variant={
                            reportData.metrics.complianceBand === "Excellent" ? "default" :
                            reportData.metrics.complianceBand === "Good" ? "secondary" :
                            reportData.metrics.complianceBand === "Needs Review" ? "outline" : "destructive"
                          }>
                            {reportData.metrics.complianceScore.toFixed(0)} - {reportData.metrics.complianceBand}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Metrics Dashboard */}
                  {selectedSections.includes("metrics-dashboard") && (
                    <div>
                      <h3 className="font-bold text-lg mb-4">Metrics Dashboard (KPIs)</h3>
                      <div className="grid grid-cols-4 gap-4">
                        <MetricCard 
                          label="Total Captured Sales" 
                          value={formatMoney(reportData.metrics.totalCapturedSales)} 
                          icon={<DollarSign className="h-4 w-4" />}
                        />
                        <MetricCard 
                          label="Total Declared" 
                          value={formatMoney(reportData.metrics.totalDeclared)} 
                          icon={<DollarSign className="h-4 w-4" />}
                        />
                        <MetricCard 
                          label="Variance" 
                          value={formatMoney(reportData.metrics.variance)} 
                          subValue={`${reportData.metrics.variancePercent.toFixed(2)}%`}
                          icon={reportData.metrics.variance >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          variant={Math.abs(reportData.metrics.variancePercent) > 5 ? "critical" : Math.abs(reportData.metrics.variancePercent) > 2 ? "warning" : "success"}
                        />
                        <MetricCard 
                          label="Compliance Score" 
                          value={`${reportData.metrics.complianceScore.toFixed(0)}/100`} 
                          subValue={reportData.metrics.complianceBand}
                          icon={<Award className="h-4 w-4" />}
                          variant={reportData.metrics.complianceBand === "Excellent" ? "success" : reportData.metrics.complianceBand === "Good" ? "default" : reportData.metrics.complianceBand === "Needs Review" ? "warning" : "critical"}
                        />
                      </div>
                      <div className="grid grid-cols-4 gap-4 mt-4">
                        <MetricCard 
                          label="POS" 
                          value={formatMoney(reportData.metrics.totalPos)} 
                          icon={<DollarSign className="h-4 w-4" />}
                        />
                        <MetricCard 
                          label="Transfer" 
                          value={formatMoney(reportData.metrics.totalTransfer)} 
                          icon={<DollarSign className="h-4 w-4" />}
                        />
                        <MetricCard 
                          label="Cash" 
                          value={formatMoney(reportData.metrics.totalCash)} 
                          icon={<DollarSign className="h-4 w-4" />}
                        />
                        <MetricCard 
                          label="Stock Variance" 
                          value={formatMoney(reportData.metrics.stockVariance)} 
                          icon={<Package className="h-4 w-4" />}
                        />
                      </div>
                      <div className="grid grid-cols-4 gap-4 mt-4">
                        <MetricCard 
                          label="Waste + Write-off" 
                          value={formatMoney(reportData.metrics.wasteTotal + reportData.metrics.writeOffTotal)} 
                          icon={<AlertTriangle className="h-4 w-4" />}
                        />
                        <MetricCard 
                          label="Exceptions" 
                          value={`${reportData.metrics.exceptionsTotal} total`}
                          subValue={`Open: ${reportData.metrics.exceptionsOpen} | Investigating: ${reportData.metrics.exceptionsInvestigating} | Resolved: ${reportData.metrics.exceptionsResolved} | Closed: ${reportData.metrics.exceptionsClosed}`}
                          icon={<AlertCircle className="h-4 w-4" />}
                        />
                        <div className="col-span-2 border p-4 rounded-lg bg-gray-50">
                          <div className="text-sm text-gray-500 mb-2">Exception Outcomes</div>
                          <div className="grid grid-cols-4 gap-2 text-center">
                            <div><Badge variant="default" className="bg-green-600">TRUE: {reportData.metrics.outcomeTrue}</Badge></div>
                            <div><Badge variant="destructive">FALSE: {reportData.metrics.outcomeFalse}</Badge></div>
                            <div><Badge variant="secondary">MISMATCHED: {reportData.metrics.outcomeMismatched}</Badge></div>
                            <div><Badge variant="outline">PENDING: {reportData.metrics.outcomePending}</Badge></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sales & Revenue (matches Audit Workspace exactly) */}
                  {selectedSections.includes("sales-revenue") && reportData.dailySummary && (
                    <div className="page-break-before space-y-6">
                      <h3 className="font-bold text-lg">Sales & Revenue</h3>
                      
                      {/* Variance Statement KPI Block */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="border rounded-lg p-4 bg-emerald-50">
                          <div className="text-xs text-muted-foreground mb-1">Captured Sales Total</div>
                          <div className="text-xl font-bold font-mono text-emerald-700">{formatMoney(reportData.reportedPayments?.totals?.totalCaptured ?? 0)}</div>
                        </div>
                        <div className="border rounded-lg p-4 bg-blue-50">
                          <div className="text-xs text-muted-foreground mb-1">Declared Total</div>
                          <div className="text-xl font-bold font-mono text-blue-700">{formatMoney(reportData.reportedPayments?.totals?.totalDeclared ?? 0)}</div>
                        </div>
                        <div className={cn(
                          "border rounded-lg p-4",
                          (reportData.reportedPayments?.totals?.firstHitVariance ?? 0) === 0 ? "bg-green-50" : 
                          (reportData.reportedPayments?.totals?.firstHitVariance ?? 0) < 0 ? "bg-red-50" : "bg-amber-50"
                        )}>
                          <div className="text-xs text-muted-foreground mb-1">First Hit Variance (Declared - Captured)</div>
                          <div className={cn(
                            "text-xl font-bold font-mono",
                            (reportData.reportedPayments?.totals?.firstHitVariance ?? 0) === 0 ? "text-green-700" : 
                            (reportData.reportedPayments?.totals?.firstHitVariance ?? 0) < 0 ? "text-red-700" : "text-amber-700"
                          )}>
                            {(reportData.reportedPayments?.totals?.firstHitVariance ?? 0) > 0 ? "+" : ""}{formatMoney(reportData.reportedPayments?.totals?.firstHitVariance ?? 0)}
                          </div>
                        </div>
                      </div>

                      {/* Daily Summary Table (matches Audit Workspace) */}
                      <div>
                        <h4 className="font-medium mb-3">Daily Summary</h4>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-4">
                            <div>
                              <span className="text-sm text-muted-foreground">Period: {reportData.period.start} to {reportData.period.end}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold font-mono text-emerald-700">{formatMoney(reportData.dailySummary.totalCaptured)}</div>
                              <div className="text-xs text-muted-foreground">{reportData.dailySummary.entryCount} entries</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-5 gap-4">
                            <div className="text-center p-3 bg-white/60 rounded-lg">
                              <div className="text-xs text-muted-foreground mb-1">Amount</div>
                              <div className="font-mono font-medium">{formatMoney(reportData.dailySummary.amount)}</div>
                            </div>
                            <div className="text-center p-3 bg-white/60 rounded-lg">
                              <div className="text-xs text-muted-foreground mb-1">Complimentary</div>
                              <div className="font-mono font-medium">{formatMoney(reportData.dailySummary.complimentary)}</div>
                            </div>
                            <div className="text-center p-3 bg-white/60 rounded-lg">
                              <div className="text-xs text-muted-foreground mb-1">Vouchers</div>
                              <div className="font-mono font-medium">{formatMoney(reportData.dailySummary.vouchers)}</div>
                            </div>
                            <div className="text-center p-3 bg-white/60 rounded-lg">
                              <div className="text-xs text-muted-foreground mb-1">Voids</div>
                              <div className="font-mono font-medium text-muted-foreground">{formatMoney(reportData.dailySummary.voids)}</div>
                            </div>
                            <div className="text-center p-3 bg-white/60 rounded-lg">
                              <div className="text-xs text-muted-foreground mb-1">Others</div>
                              <div className="font-mono font-medium">{formatMoney(reportData.dailySummary.others)}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Reported Payments Summary Table (matches Audit Workspace) */}
                      {reportData.reportedPayments?.departments?.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-3">Reported Payments Summary</h4>
                          <Table className="text-sm">
                            <TableHeader>
                              <TableRow className="bg-gray-100">
                                <TableHead>Department</TableHead>
                                <TableHead className="text-right">Total Captured</TableHead>
                                <TableHead className="text-right">Total Declared</TableHead>
                                <TableHead className="text-right">First Hit Variance</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {reportData.reportedPayments.departments.map((r: any) => (
                                <>
                                  <TableRow key={r.departmentId}>
                                    <TableCell className="font-medium">{r.departmentName}</TableCell>
                                    <TableCell className="text-right font-mono">{formatMoney(r.totalCaptured)}</TableCell>
                                    <TableCell className="text-right font-mono">
                                      {r.hasDeclaration ? formatMoney(r.totalDeclared) : <span className="text-muted-foreground">Pending</span>}
                                    </TableCell>
                                    <TableCell className={cn(
                                      "text-right font-mono font-medium",
                                      !r.hasDeclaration ? "text-amber-600" : r.variance === 0 ? "text-emerald-600" : r.variance < 0 ? "text-red-600" : "text-amber-600"
                                    )}>
                                      {!r.hasDeclaration 
                                        ? <span className="text-amber-600">-{formatMoney(r.totalCaptured)}</span>
                                        : r.variance === 0 
                                          ? formatMoney(0)
                                          : `${r.variance > 0 ? "+" : ""}${formatMoney(r.variance)}`}
                                    </TableCell>
                                    <TableCell>
                                      {!r.hasDeclaration ? (
                                        <Badge variant="outline" className="text-amber-600 border-amber-600">Awaiting</Badge>
                                      ) : r.variance === 0 ? (
                                        <Badge variant="default" className="bg-emerald-600">Matched</Badge>
                                      ) : r.variance < 0 ? (
                                        <Badge variant="destructive">Short</Badge>
                                      ) : (
                                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">Over</Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                  <TableRow key={`${r.departmentId}-breakdown`} className="bg-muted/20 border-b">
                                    <TableCell className="py-2 pl-8">
                                      <span className="text-xs text-muted-foreground">Breakdown:</span>
                                    </TableCell>
                                    <TableCell colSpan={4} className="py-2">
                                      <div className="flex items-center gap-6 text-xs">
                                        <span><span className="text-muted-foreground">Cash:</span> {formatMoney(r.declaredCash)}</span>
                                        <span><span className="text-muted-foreground">POS:</span> {formatMoney(r.declaredPos)}</span>
                                        <span><span className="text-muted-foreground">Transfer:</span> {formatMoney(r.declaredTransfer)}</span>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                </>
                              ))}
                              <TableRow className="font-bold bg-gray-50">
                                <TableCell>GRAND TOTAL</TableCell>
                                <TableCell className="text-right font-mono">{formatMoney(reportData.reportedPayments.totals.totalCaptured)}</TableCell>
                                <TableCell className="text-right font-mono">{formatMoney(reportData.reportedPayments.totals.totalDeclared)}</TableCell>
                                <TableCell className={cn(
                                  "text-right font-mono",
                                  reportData.reportedPayments.totals.firstHitVariance === 0 ? "text-emerald-600" : 
                                  reportData.reportedPayments.totals.firstHitVariance < 0 ? "text-red-600" : "text-amber-600"
                                )}>
                                  {reportData.reportedPayments.totals.firstHitVariance > 0 ? "+" : ""}{formatMoney(reportData.reportedPayments.totals.firstHitVariance)}
                                </TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                          <div className="mt-2 text-xs text-muted-foreground">
                            Variance = Declared - Captured. Negative = Short (declared less than captured).
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sales by Department */}
                  {selectedSections.includes("sales-by-department") && reportData.salesByDepartment?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-lg mb-4">Sales by Department (Summary)</h3>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-100">
                            <TableHead>Department</TableHead>
                            <TableHead className="text-right">Captured Sales (₦)</TableHead>
                            <TableHead className="text-right">% of Total</TableHead>
                            <TableHead className="text-right">Transactions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.salesByDepartment.map((d: any) => (
                            <TableRow key={d.departmentId}>
                              <TableCell className="font-medium">{d.departmentName}</TableCell>
                              <TableCell className="text-right">{formatMoney(d.capturedSales)}</TableCell>
                              <TableCell className="text-right">{d.percentOfTotal.toFixed(1)}%</TableCell>
                              <TableCell className="text-right">{d.transactions}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-gray-50">
                            <TableCell>TOTAL</TableCell>
                            <TableCell className="text-right">{formatMoney(reportData.salesByDepartment.reduce((s: number, d: any) => s + d.capturedSales, 0))}</TableCell>
                            <TableCell className="text-right">100%</TableCell>
                            <TableCell className="text-right">{reportData.salesByDepartment.reduce((s: number, d: any) => s + d.transactions, 0)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Payment Methods Breakdown (Overall) */}
                  {selectedSections.includes("payment-methods") && (
                    <div>
                      <h3 className="font-bold text-lg mb-4">Payment Methods Breakdown (Overall)</h3>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-100">
                            <TableHead>POS (₦)</TableHead>
                            <TableHead>Transfer (₦)</TableHead>
                            <TableHead>Cash (₦)</TableHead>
                            <TableHead className="font-bold">Total (₦)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>{formatMoney(reportData.metrics.totalPos)}</TableCell>
                            <TableCell>{formatMoney(reportData.metrics.totalTransfer)}</TableCell>
                            <TableCell>{formatMoney(reportData.metrics.totalCash)}</TableCell>
                            <TableCell className="font-bold">{formatMoney(reportData.metrics.totalDeclared)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Payment Methods by Department (Matrix) */}
                  {selectedSections.includes("payment-matrix") && reportData.paymentMatrix?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-lg mb-4">Payment Methods by Department (Matrix)</h3>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-100">
                            <TableHead>Department</TableHead>
                            <TableHead className="text-right">POS (₦)</TableHead>
                            <TableHead className="text-right">Transfer (₦)</TableHead>
                            <TableHead className="text-right">Cash (₦)</TableHead>
                            <TableHead className="text-right font-bold">Total Declared (₦)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.paymentMatrix.map((d: any) => (
                            <TableRow key={d.departmentId}>
                              <TableCell className="font-medium">{d.departmentName}</TableCell>
                              <TableCell className="text-right">{formatMoney(d.pos)}</TableCell>
                              <TableCell className="text-right">{formatMoney(d.transfer)}</TableCell>
                              <TableCell className="text-right">{formatMoney(d.cash)}</TableCell>
                              <TableCell className="text-right font-bold">{formatMoney(d.total)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-gray-50">
                            <TableCell>TOTAL</TableCell>
                            <TableCell className="text-right">{formatMoney(reportData.paymentMatrix.reduce((s: number, d: any) => s + d.pos, 0))}</TableCell>
                            <TableCell className="text-right">{formatMoney(reportData.paymentMatrix.reduce((s: number, d: any) => s + d.transfer, 0))}</TableCell>
                            <TableCell className="text-right">{formatMoney(reportData.paymentMatrix.reduce((s: number, d: any) => s + d.cash, 0))}</TableCell>
                            <TableCell className="text-right">{formatMoney(reportData.paymentMatrix.reduce((s: number, d: any) => s + d.total, 0))}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Declared vs System Variance */}
                  {selectedSections.includes("declared-vs-system") && (
                    <div>
                      <h3 className="font-bold text-lg mb-4">Declared vs Captured Variance</h3>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-100">
                            <TableHead>Captured Total (₦)</TableHead>
                            <TableHead>Declared Total (₦)</TableHead>
                            <TableHead>Variance (₦)</TableHead>
                            <TableHead>Variance (%)</TableHead>
                            <TableHead>Interpretation</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">{formatMoney(reportData.metrics.totalCapturedSales)}</TableCell>
                            <TableCell>{formatMoney(reportData.metrics.totalDeclared)}</TableCell>
                            <TableCell className={cn("font-bold", reportData.metrics.variance < 0 ? "text-red-600" : "text-green-600")}>
                              {formatMoney(reportData.metrics.variance)}
                            </TableCell>
                            <TableCell className={cn("font-bold", reportData.metrics.variance < 0 ? "text-red-600" : "text-green-600")}>
                              {reportData.metrics.variancePercent.toFixed(2)}%
                            </TableCell>
                            <TableCell>
                              <Badge variant={reportData.metrics.variance < 0 ? "destructive" : reportData.metrics.variance > 0 ? "secondary" : "default"}>
                                {reportData.metrics.variance < 0 ? "SHORT" : reportData.metrics.variance > 0 ? "OVER" : "BALANCED"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Department Comparison (2nd Hit) */}
                  {selectedSections.includes("department-comparison") && reportData.departmentComparison?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-lg mb-4">Department Comparison (2nd Hit)</h3>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-100">
                            <TableHead>Department</TableHead>
                            <TableHead className="text-right">Captured Sales (₦)</TableHead>
                            <TableHead className="text-right">Declared Sales (₦)</TableHead>
                            <TableHead className="text-right">Variance (₦)</TableHead>
                            <TableHead className="text-right">Variance (%)</TableHead>
                            <TableHead className="text-right">Cash</TableHead>
                            <TableHead className="text-right">POS</TableHead>
                            <TableHead className="text-right">Transfer</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.departmentComparison.map((d: any) => (
                            <TableRow key={d.departmentId}>
                              <TableCell className="font-medium">{d.departmentName}</TableCell>
                              <TableCell className="text-right">{formatMoney(d.capturedSales)}</TableCell>
                              <TableCell className="text-right">{formatMoney(d.declaredSales)}</TableCell>
                              <TableCell className={cn("text-right font-medium", d.variance < 0 ? "text-red-600" : "text-green-600")}>
                                {formatMoney(d.variance)}
                              </TableCell>
                              <TableCell className={cn("text-right", d.variance < 0 ? "text-red-600" : "text-green-600")}>
                                {d.variancePercent.toFixed(2)}%
                              </TableCell>
                              <TableCell className="text-right">{formatMoney(d.cash)}</TableCell>
                              <TableCell className="text-right">{formatMoney(d.pos)}</TableCell>
                              <TableCell className="text-right">{formatMoney(d.transfer)}</TableCell>
                              <TableCell>
                                <Badge variant={d.status === "OK" ? "default" : d.status === "Review" ? "secondary" : "destructive"}>
                                  {d.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-gray-50">
                            <TableCell>TOTAL</TableCell>
                            <TableCell className="text-right">{formatMoney(reportData.departmentComparison.reduce((s: number, d: any) => s + d.capturedSales, 0))}</TableCell>
                            <TableCell className="text-right">{formatMoney(reportData.departmentComparison.reduce((s: number, d: any) => s + d.declaredSales, 0))}</TableCell>
                            <TableCell className="text-right">{formatMoney(reportData.departmentComparison.reduce((s: number, d: any) => s + d.variance, 0))}</TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-right">{formatMoney(reportData.departmentComparison.reduce((s: number, d: any) => s + d.cash, 0))}</TableCell>
                            <TableCell className="text-right">{formatMoney(reportData.departmentComparison.reduce((s: number, d: any) => s + d.pos, 0))}</TableCell>
                            <TableCell className="text-right">{formatMoney(reportData.departmentComparison.reduce((s: number, d: any) => s + d.transfer, 0))}</TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Daily Breakdown (Weekly/Monthly) */}
                  {selectedSections.includes("daily-breakdown") && reportData.dailyBreakdown?.length > 1 && (
                    <div>
                      <h3 className="font-bold text-lg mb-4">{reportType === "weekly" ? "Weekly" : "Monthly"} Totals - Daily Breakdown</h3>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-100">
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">Captured Sales (₦)</TableHead>
                              <TableHead className="text-right">Declared (₦)</TableHead>
                              <TableHead className="text-right">Variance (₦)</TableHead>
                              <TableHead className="text-right">Var %</TableHead>
                              <TableHead className="text-right">POS (₦)</TableHead>
                              <TableHead className="text-right">Transfer (₦)</TableHead>
                              <TableHead className="text-right">Cash (₦)</TableHead>
                              <TableHead className="text-right">Stock Var (₦)</TableHead>
                              <TableHead className="text-right">Exceptions</TableHead>
                              <TableHead className="text-center">Outcomes (T/F/M/P)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reportData.dailyBreakdown.map((d: any) => (
                              <TableRow key={d.date}>
                                <TableCell className="font-medium whitespace-nowrap">{d.displayDate}</TableCell>
                                <TableCell className="text-right">{formatMoney(d.capturedSales)}</TableCell>
                                <TableCell className="text-right">{formatMoney(d.declared)}</TableCell>
                                <TableCell className={cn("text-right", d.variance < 0 ? "text-red-600" : "text-green-600")}>
                                  {formatMoney(d.variance)}
                                </TableCell>
                                <TableCell className={cn("text-right", d.variance < 0 ? "text-red-600" : "text-green-600")}>
                                  {d.variancePercent.toFixed(1)}%
                                </TableCell>
                                <TableCell className="text-right">{formatMoney(d.pos)}</TableCell>
                                <TableCell className="text-right">{formatMoney(d.transfer)}</TableCell>
                                <TableCell className="text-right">{formatMoney(d.cash)}</TableCell>
                                <TableCell className="text-right">{formatMoney(d.stockVariance)}</TableCell>
                                <TableCell className="text-right">{d.exceptionsRaised}</TableCell>
                                <TableCell className="text-center text-xs">
                                  {d.outcomeTrue}/{d.outcomeFalse}/{d.outcomeMismatched}/{d.outcomePending}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="font-bold bg-blue-50">
                              <TableCell>{reportType === "weekly" ? "WEEKLY" : "MONTHLY"} TOTAL</TableCell>
                              <TableCell className="text-right">{formatMoney(reportData.dailyBreakdown.reduce((s: number, d: any) => s + d.capturedSales, 0))}</TableCell>
                              <TableCell className="text-right">{formatMoney(reportData.dailyBreakdown.reduce((s: number, d: any) => s + d.declared, 0))}</TableCell>
                              <TableCell className="text-right">{formatMoney(reportData.dailyBreakdown.reduce((s: number, d: any) => s + d.variance, 0))}</TableCell>
                              <TableCell></TableCell>
                              <TableCell className="text-right">{formatMoney(reportData.dailyBreakdown.reduce((s: number, d: any) => s + d.pos, 0))}</TableCell>
                              <TableCell className="text-right">{formatMoney(reportData.dailyBreakdown.reduce((s: number, d: any) => s + d.transfer, 0))}</TableCell>
                              <TableCell className="text-right">{formatMoney(reportData.dailyBreakdown.reduce((s: number, d: any) => s + d.cash, 0))}</TableCell>
                              <TableCell className="text-right">{formatMoney(reportData.dailyBreakdown.reduce((s: number, d: any) => s + d.stockVariance, 0))}</TableCell>
                              <TableCell className="text-right">{reportData.dailyBreakdown.reduce((s: number, d: any) => s + d.exceptionsRaised, 0)}</TableCell>
                              <TableCell className="text-center text-xs">
                                {reportData.dailyBreakdown.reduce((s: number, d: any) => s + d.outcomeTrue, 0)}/
                                {reportData.dailyBreakdown.reduce((s: number, d: any) => s + d.outcomeFalse, 0)}/
                                {reportData.dailyBreakdown.reduce((s: number, d: any) => s + d.outcomeMismatched, 0)}/
                                {reportData.dailyBreakdown.reduce((s: number, d: any) => s + d.outcomePending, 0)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Stock Movements Summary */}
                  {selectedSections.includes("stock-movements") && reportData.stockMovementsSummary && (
                    <div>
                      <h3 className="font-bold text-lg mb-4">Stock Movements Summary</h3>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-100">
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Count of Movements</TableHead>
                            <TableHead className="text-right">Qty Total</TableHead>
                            <TableHead className="text-right">Value Total (₦)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.stockMovementsSummary.map((m: any) => (
                            <TableRow key={m.type}>
                              <TableCell className="font-medium">{m.label}</TableCell>
                              <TableCell className="text-right">{m.count}</TableCell>
                              <TableCell className="text-right">{m.qtyTotal.toFixed(2)}</TableCell>
                              <TableCell className="text-right">{formatMoney(m.valueTotal)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-gray-50">
                            <TableCell>TOTAL</TableCell>
                            <TableCell className="text-right">{reportData.stockMovementsSummary.reduce((s: number, m: any) => s + m.count, 0)}</TableCell>
                            <TableCell className="text-right">{reportData.stockMovementsSummary.reduce((s: number, m: any) => s + m.qtyTotal, 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right">{formatMoney(reportData.stockMovementsSummary.reduce((s: number, m: any) => s + m.valueTotal, 0))}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Exceptions Log */}
                  {selectedSections.includes("exception-log") && reportData.exceptions?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-lg mb-4">Exceptions Log (with Outcome)</h3>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-100">
                            <TableHead>Case #</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Summary</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Outcome</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Last Updated</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.exceptions.map((e: any) => {
                            const dept = departments?.find(d => d.id === e.departmentId);
                            return (
                              <TableRow key={e.id}>
                                <TableCell className="font-mono text-xs">{e.caseNumber}</TableCell>
                                <TableCell>{dept?.name || "-"}</TableCell>
                                <TableCell className="max-w-[200px] truncate">{e.summary}</TableCell>
                                <TableCell>
                                  <Badge variant={e.severity === "critical" ? "destructive" : e.severity === "high" ? "secondary" : "outline"}>
                                    {e.severity}
                                  </Badge>
                                </TableCell>
                                <TableCell className="capitalize">{e.status}</TableCell>
                                <TableCell>
                                  <Badge variant={
                                    e.outcome === "true" ? "default" : 
                                    e.outcome === "false" ? "destructive" : 
                                    e.outcome === "mismatched" ? "secondary" : "outline"
                                  } className={e.outcome === "true" ? "bg-green-600" : ""}>
                                    {(e.outcome || "PENDING").toUpperCase()}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs">{e.createdAt ? format(new Date(e.createdAt), "MMM d, HH:mm") : "-"}</TableCell>
                                <TableCell className="text-xs">{e.updatedAt ? format(new Date(e.updatedAt), "MMM d, HH:mm") : "-"}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Department Comparison (2nd Hit) - Full Table (Real API Data) */}
                  {selectedSections.includes("department-comparison-full") && reportData.departmentComparisonFull?.length > 0 && (
                    <div className="page-break-before">
                      <h3 className="font-bold text-lg mb-4">Department Comparison (2nd Hit) - Full Table</h3>
                      <p className="text-sm text-gray-500 mb-2">Data source: Reconciliation 2nd Hit Comparison API</p>
                      <div className="overflow-x-auto">
                        <Table className="text-sm">
                          <TableHeader>
                            <TableRow className="bg-gray-100">
                              <TableHead>Department</TableHead>
                              <TableHead className="text-right">Total Captured</TableHead>
                              <TableHead className="text-right">Total Declared</TableHead>
                              <TableHead className="text-right">Audit (Dep)</TableHead>
                              <TableHead className="text-right">Variance 1st Hit</TableHead>
                              <TableHead className="text-right">Variance 2nd Hit</TableHead>
                              <TableHead className="text-right">Final Variance</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reportData.departmentComparisonFull.map((d: DepartmentComparison) => (
                              <TableRow key={d.departmentId}>
                                <TableCell className="font-medium">{d.departmentName}</TableCell>
                                <TableCell className="text-right">{formatMoney(d.totalCaptured)}</TableCell>
                                <TableCell className="text-right">{formatMoney(d.totalDeclared)}</TableCell>
                                <TableCell className="text-right">{formatMoney(d.auditTotal)}</TableCell>
                                <TableCell className={cn("text-right", d.variance1stHit < 0 ? "text-red-600" : d.variance1stHit > 0 ? "text-green-600" : "")}>
                                  {formatMoney(d.variance1stHit)}
                                </TableCell>
                                <TableCell className={cn("text-right font-medium", d.variance2ndHit < 0 ? "text-red-600" : d.variance2ndHit > 0 ? "text-green-600" : "")}>
                                  {formatMoney(d.variance2ndHit)}
                                </TableCell>
                                <TableCell className={cn("text-right font-medium", d.finalVariance < 0 ? "text-red-600" : d.finalVariance > 0 ? "text-green-600" : "")}>
                                  {formatMoney(d.finalVariance)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={d.varianceStatus === "balanced" ? "default" : d.varianceStatus === "surplus" ? "secondary" : "destructive"}>
                                    {d.varianceStatus.toUpperCase()}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="font-bold bg-blue-50">
                              <TableCell>GRAND TOTAL</TableCell>
                              <TableCell className="text-right">{formatMoney(reportData.departmentComparisonFull.reduce((s: number, d: DepartmentComparison) => s + d.totalCaptured, 0))}</TableCell>
                              <TableCell className="text-right">{formatMoney(reportData.departmentComparisonFull.reduce((s: number, d: DepartmentComparison) => s + d.totalDeclared, 0))}</TableCell>
                              <TableCell className="text-right">{formatMoney(reportData.departmentComparisonFull.reduce((s: number, d: DepartmentComparison) => s + d.auditTotal, 0))}</TableCell>
                              <TableCell className="text-right">{formatMoney(reportData.departmentComparisonFull.reduce((s: number, d: DepartmentComparison) => s + d.variance1stHit, 0))}</TableCell>
                              <TableCell className="text-right">{formatMoney(reportData.departmentComparisonFull.reduce((s: number, d: DepartmentComparison) => s + d.variance2ndHit, 0))}</TableCell>
                              <TableCell className="text-right">{formatMoney(reportData.departmentComparisonFull.reduce((s: number, d: DepartmentComparison) => s + d.finalVariance, 0))}</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Purchases Register */}
                  {selectedSections.includes("purchases-register") && reportData.purchaseRegister?.length > 0 && (
                    <div className="page-break-before">
                      <h3 className="font-bold text-lg mb-4">Purchases Register</h3>
                      <div className="bg-blue-50 p-3 rounded mb-4 text-sm">
                        <div className="grid grid-cols-3 gap-4">
                          <div><strong>Total Qty:</strong> {reportData.purchaseRegister.reduce((s: number, p: any) => s + parseFloat(p.qty ?? "0"), 0).toFixed(2)}</div>
                          <div><strong>Total Value:</strong> {formatMoney(reportData.purchaseRegister.reduce((s: number, p: any) => s + parseFloat(p.totalCost ?? "0"), 0))}</div>
                          <div><strong>Records:</strong> {reportData.purchaseRegister.length}</div>
                        </div>
                      </div>
                      <Table className="text-sm">
                        <TableHeader>
                          <TableRow className="bg-gray-100">
                            <TableHead>Date</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>SRD</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Unit Cost</TableHead>
                            <TableHead className="text-right">Total Cost</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Invoice No</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.purchaseRegister.map((p: any) => (
                            <TableRow key={p.id}>
                              <TableCell className="whitespace-nowrap">{p.date ? format(new Date(p.date), "MMM d, yyyy") : "-"}</TableCell>
                              <TableCell className="font-medium">{p.itemName}</TableCell>
                              <TableCell>{p.srdName}</TableCell>
                              <TableCell className="text-right">{parseFloat(p.qty ?? "0").toFixed(2)}</TableCell>
                              <TableCell className="text-right">{formatMoney(parseFloat(p.unitCostAtPurchase ?? "0"))}</TableCell>
                              <TableCell className="text-right font-medium">{formatMoney(parseFloat(p.totalCost ?? "0"))}</TableCell>
                              <TableCell>{p.supplierName || "-"}</TableCell>
                              <TableCell>{p.invoiceNo || "-"}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-gray-50">
                            <TableCell colSpan={3}>TOTAL</TableCell>
                            <TableCell className="text-right">{reportData.purchaseRegister.reduce((s: number, p: any) => s + parseFloat(p.qty ?? "0"), 0).toFixed(2)}</TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-right">{formatMoney(reportData.purchaseRegister.reduce((s: number, p: any) => s + parseFloat(p.totalCost ?? "0"), 0))}</TableCell>
                            <TableCell colSpan={2}></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* GRN Register */}
                  {selectedSections.includes("grn-register") && reportData.grnRegister?.length > 0 && (
                    <div className="page-break-before">
                      <h3 className="font-bold text-lg mb-4">GRN Register (Goods Received Notes)</h3>
                      <div className="bg-blue-50 p-3 rounded mb-4 text-sm">
                        <div className="grid grid-cols-3 gap-4">
                          <div><strong>Total GRNs:</strong> {reportData.grnRegister.length}</div>
                          <div><strong>Total Value:</strong> {formatMoney(reportData.grnRegister.reduce((s: number, g: any) => s + parseFloat(g.amount ?? "0"), 0))}</div>
                          <div><strong>Period:</strong> {reportData.period.start} to {reportData.period.end}</div>
                        </div>
                      </div>
                      <Table className="text-sm">
                        <TableHeader>
                          <TableRow className="bg-gray-100">
                            <TableHead>GRN No</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Invoice No</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.grnRegister.map((g: any) => (
                            <TableRow key={g.id}>
                              <TableCell className="font-mono text-xs">{g.grnNumber || g.id?.slice(0, 8) || "-"}</TableCell>
                              <TableCell className="whitespace-nowrap">{g.date ? format(new Date(g.date), "MMM d, yyyy") : "-"}</TableCell>
                              <TableCell className="font-medium">{g.supplierName || "-"}</TableCell>
                              <TableCell className="text-right font-medium">{formatMoney(parseFloat(g.amount ?? "0"))}</TableCell>
                              <TableCell>{g.invoiceNo || "-"}</TableCell>
                              <TableCell>
                                <Badge variant={g.status === "posted" ? "default" : g.status === "approved" ? "secondary" : "outline"}>
                                  {(g.status || "pending").toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[150px] truncate">{g.notes || "-"}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-gray-50">
                            <TableCell colSpan={3}>TOTAL</TableCell>
                            <TableCell className="text-right">{formatMoney(reportData.grnRegister.reduce((s: number, g: any) => s + parseFloat(g.amount ?? "0"), 0))}</TableCell>
                            <TableCell colSpan={3}></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Receivables Register */}
                  {selectedSections.includes("receivables-register") && reportData.receivablesRegister?.length > 0 && (
                    <div className="page-break-before">
                      <h3 className="font-bold text-lg mb-4">Receivables Register</h3>
                      <div className="bg-red-50 p-3 rounded mb-4 text-sm">
                        <div className="grid grid-cols-3 gap-4">
                          <div><strong>Total Receivables:</strong> {formatMoney(reportData.receivablesRegister.reduce((s: number, r: any) => s + parseFloat(r.varianceAmount ?? "0"), 0))}</div>
                          <div><strong>Amount Paid:</strong> {formatMoney(reportData.receivablesRegister.reduce((s: number, r: any) => s + parseFloat(r.amountPaid ?? "0"), 0))}</div>
                          <div><strong>Balance Remaining:</strong> {formatMoney(reportData.receivablesRegister.reduce((s: number, r: any) => s + parseFloat(r.balanceRemaining ?? "0"), 0))}</div>
                        </div>
                      </div>
                      <Table className="text-sm">
                        <TableHeader>
                          <TableRow className="bg-gray-100">
                            <TableHead>Department</TableHead>
                            <TableHead>Audit Date</TableHead>
                            <TableHead className="text-right">Variance Amount</TableHead>
                            <TableHead className="text-right">Amount Paid</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Comments</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.receivablesRegister.map((r: any) => (
                            <TableRow key={r.id}>
                              <TableCell className="font-medium">{r.departmentName || "-"}</TableCell>
                              <TableCell className="whitespace-nowrap">{r.auditDate ? format(new Date(r.auditDate), "MMM d, yyyy") : "-"}</TableCell>
                              <TableCell className="text-right text-red-600">{formatMoney(parseFloat(r.varianceAmount ?? "0"))}</TableCell>
                              <TableCell className="text-right text-green-600">{formatMoney(parseFloat(r.amountPaid ?? "0"))}</TableCell>
                              <TableCell className="text-right font-medium">{formatMoney(parseFloat(r.balanceRemaining ?? "0"))}</TableCell>
                              <TableCell>
                                <Badge variant={r.status === "settled" ? "default" : r.status === "part_paid" ? "secondary" : "destructive"}>
                                  {r.status?.replace("_", " ").toUpperCase() || "OPEN"}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[150px] truncate">{r.comments || "-"}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-gray-50">
                            <TableCell colSpan={2}>TOTAL</TableCell>
                            <TableCell className="text-right text-red-600">{formatMoney(reportData.receivablesRegister.reduce((s: number, r: any) => s + parseFloat(r.varianceAmount ?? "0"), 0))}</TableCell>
                            <TableCell className="text-right text-green-600">{formatMoney(reportData.receivablesRegister.reduce((s: number, r: any) => s + parseFloat(r.amountPaid ?? "0"), 0))}</TableCell>
                            <TableCell className="text-right">{formatMoney(reportData.receivablesRegister.reduce((s: number, r: any) => s + parseFloat(r.balanceRemaining ?? "0"), 0))}</TableCell>
                            <TableCell colSpan={2}></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Surplus Register */}
                  {selectedSections.includes("surplus-register") && reportData.surplusRegister?.length > 0 && (
                    <div className="page-break-before">
                      <h3 className="font-bold text-lg mb-4">Surplus Register</h3>
                      <div className="bg-green-50 p-3 rounded mb-4 text-sm">
                        <div className="grid grid-cols-3 gap-4">
                          <div><strong>Total Surplus:</strong> {formatMoney(reportData.surplusRegister.reduce((s: number, x: any) => s + parseFloat(x.surplusAmount ?? "0"), 0))}</div>
                          <div><strong>Records:</strong> {reportData.surplusRegister.length}</div>
                          <div><strong>Period:</strong> {reportData.period.start} to {reportData.period.end}</div>
                        </div>
                      </div>
                      <Table className="text-sm">
                        <TableHeader>
                          <TableRow className="bg-gray-100">
                            <TableHead>Department</TableHead>
                            <TableHead>Audit Date</TableHead>
                            <TableHead className="text-right">Surplus Amount</TableHead>
                            <TableHead>Classification</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Comments</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.surplusRegister.map((s: any) => (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium">{s.departmentName || "-"}</TableCell>
                              <TableCell className="whitespace-nowrap">{s.auditDate ? format(new Date(s.auditDate), "MMM d, yyyy") : "-"}</TableCell>
                              <TableCell className="text-right text-green-600 font-medium">{formatMoney(parseFloat(s.surplusAmount ?? "0"))}</TableCell>
                              <TableCell>{s.classification || "-"}</TableCell>
                              <TableCell>
                                <Badge variant={s.status === "cleared" ? "default" : s.status === "classified" ? "secondary" : "outline"}>
                                  {(s.status || "open").toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[150px] truncate">{s.comments || "-"}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-gray-50">
                            <TableCell colSpan={2}>TOTAL</TableCell>
                            <TableCell className="text-right text-green-600">{formatMoney(reportData.surplusRegister.reduce((s: number, x: any) => s + parseFloat(x.surplusAmount ?? "0"), 0))}</TableCell>
                            <TableCell colSpan={3}></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* SRD Main Store Ledger Summary with real data */}
                  {selectedSections.includes("srd-main-store") && reportData.srdLedgerSummary?.mainStore?.length > 0 && (
                    <div className="page-break-before space-y-6">
                      <h3 className="font-bold text-lg">SRD Main Store Ledger Summary</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Inventory values as of: {reportData.period.end}
                      </p>
                      {reportData.srdLedgerSummary.mainStore.map((srd: any) => (
                        <div key={srd.id} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold text-base">{srd.name}</h4>
                            <div className="flex gap-2">
                              <Badge variant="default">MAIN STORE</Badge>
                              <span className="text-xs text-muted-foreground">
                                Count Progress: {srd.countedItems}/{srd.itemCount}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-5 gap-4 mb-4">
                            <div className="text-center p-3 bg-white rounded border">
                              <div className="text-xs text-muted-foreground mb-1">Opening Value</div>
                              <div className="font-mono font-medium">{formatMoney(srd.openingValue)}</div>
                              <div className="text-xs text-muted-foreground">{srd.openingQty.toFixed(2)} units</div>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded border border-green-200">
                              <div className="text-xs text-muted-foreground mb-1">Added Value</div>
                              <div className="font-mono font-medium text-green-700">{formatMoney(srd.addedValue)}</div>
                              <div className="text-xs text-muted-foreground">{srd.addedQty.toFixed(2)} units</div>
                            </div>
                            <div className="text-center p-3 bg-amber-50 rounded border border-amber-200">
                              <div className="text-xs text-muted-foreground mb-1">Issued Value</div>
                              <div className="font-mono font-medium text-amber-700">{formatMoney(srd.issuedValue)}</div>
                              <div className="text-xs text-muted-foreground">{srd.issuedQty.toFixed(2)} units</div>
                            </div>
                            <div className="text-center p-3 bg-blue-50 rounded border border-blue-200">
                              <div className="text-xs text-muted-foreground mb-1">Closing Value</div>
                              <div className="font-mono font-bold text-blue-700">{formatMoney(srd.closingValue)}</div>
                              <div className="text-xs text-muted-foreground">{srd.closingQty.toFixed(2)} units</div>
                            </div>
                            <div className={cn(
                              "text-center p-3 rounded border",
                              srd.varianceQty === 0 ? "bg-green-50 border-green-200" :
                              srd.varianceQty < 0 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
                            )}>
                              <div className="text-xs text-muted-foreground mb-1">Variance</div>
                              <div className={cn(
                                "font-mono font-medium",
                                srd.varianceQty === 0 ? "text-green-700" :
                                srd.varianceQty < 0 ? "text-red-700" : "text-amber-700"
                              )}>
                                {srd.varianceValue > 0 ? "+" : ""}{formatMoney(srd.varianceValue)}
                              </div>
                              <div className="text-xs text-muted-foreground">{srd.varianceQty.toFixed(2)} units</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stock Report & Variance (Department Stores) */}
                  {selectedSections.includes("stock-report") && reportData.srdLedgerSummary?.departmentStores?.length > 0 && (
                    <div className="page-break-before space-y-6">
                      <h3 className="font-bold text-lg">Stock Report & Variance (Department Stores)</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Inventory values as of: {reportData.period.end}
                      </p>
                      {reportData.srdLedgerSummary.departmentStores.map((srd: any) => (
                        <div key={srd.id} className="border rounded-lg p-4 bg-purple-50/30">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold text-base">{srd.name}</h4>
                            <div className="flex gap-2">
                              <Badge variant="secondary" className="bg-purple-100 text-purple-800">DEPARTMENT STORE</Badge>
                              <span className="text-xs text-muted-foreground">
                                Count Progress: {srd.countedItems}/{srd.itemCount}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-5 gap-4 mb-4">
                            <div className="text-center p-3 bg-white rounded border">
                              <div className="text-xs text-muted-foreground mb-1">Opening Value</div>
                              <div className="font-mono font-medium">{formatMoney(srd.openingValue)}</div>
                              <div className="text-xs text-muted-foreground">{srd.openingQty.toFixed(2)} units</div>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded border border-green-200">
                              <div className="text-xs text-muted-foreground mb-1">Added (Transfers In)</div>
                              <div className="font-mono font-medium text-green-700">{formatMoney(srd.addedValue)}</div>
                              <div className="text-xs text-muted-foreground">{srd.addedQty.toFixed(2)} units</div>
                            </div>
                            <div className="text-center p-3 bg-amber-50 rounded border border-amber-200">
                              <div className="text-xs text-muted-foreground mb-1">Issued (Sales/Usage)</div>
                              <div className="font-mono font-medium text-amber-700">{formatMoney(srd.issuedValue)}</div>
                              <div className="text-xs text-muted-foreground">{srd.issuedQty.toFixed(2)} units</div>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded border border-purple-200">
                              <div className="text-xs text-muted-foreground mb-1">Closing Value</div>
                              <div className="font-mono font-bold text-purple-700">{formatMoney(srd.closingValue)}</div>
                              <div className="text-xs text-muted-foreground">{srd.closingQty.toFixed(2)} units</div>
                            </div>
                            <div className={cn(
                              "text-center p-3 rounded border",
                              srd.varianceQty === 0 ? "bg-green-50 border-green-200" :
                              srd.varianceQty < 0 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
                            )}>
                              <div className="text-xs text-muted-foreground mb-1">Variance</div>
                              <div className={cn(
                                "font-mono font-medium",
                                srd.varianceQty === 0 ? "text-green-700" :
                                srd.varianceQty < 0 ? "text-red-700" : "text-amber-700"
                              )}>
                                {srd.varianceValue > 0 ? "+" : ""}{formatMoney(srd.varianceValue)}
                              </div>
                              <div className="text-xs text-muted-foreground">{srd.varianceQty.toFixed(2)} units</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Combined Department Stores Total */}
                      {reportData.srdLedgerSummary.combinedDeptTotals && (
                        <div className="border-t-2 border-purple-300 pt-4">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-base">Combined Department Stores Total</h4>
                            <span className="text-sm text-muted-foreground">
                              {reportData.srdLedgerSummary.departmentStores.length} stores
                            </span>
                          </div>
                          <div className="grid grid-cols-5 gap-4">
                            <div className="text-center p-3 bg-gray-100 rounded">
                              <div className="text-xs text-muted-foreground mb-1">Opening Value</div>
                              <div className="font-mono font-bold">{formatMoney(reportData.srdLedgerSummary.combinedDeptTotals.openingValue)}</div>
                            </div>
                            <div className="text-center p-3 bg-gray-100 rounded">
                              <div className="text-xs text-muted-foreground mb-1">Added Value</div>
                              <div className="font-mono font-bold text-green-700">{formatMoney(reportData.srdLedgerSummary.combinedDeptTotals.addedValue)}</div>
                            </div>
                            <div className="text-center p-3 bg-gray-100 rounded">
                              <div className="text-xs text-muted-foreground mb-1">Issued Value</div>
                              <div className="font-mono font-bold text-amber-700">{formatMoney(reportData.srdLedgerSummary.combinedDeptTotals.issuedValue)}</div>
                            </div>
                            <div className="text-center p-3 bg-purple-100 rounded">
                              <div className="text-xs text-muted-foreground mb-1">Closing Value</div>
                              <div className="font-mono font-bold text-purple-700">{formatMoney(reportData.srdLedgerSummary.combinedDeptTotals.closingValue)}</div>
                            </div>
                            <div className={cn(
                              "text-center p-3 rounded",
                              reportData.srdLedgerSummary.combinedDeptTotals.varianceValue === 0 ? "bg-green-100" :
                              reportData.srdLedgerSummary.combinedDeptTotals.varianceValue < 0 ? "bg-red-100" : "bg-amber-100"
                            )}>
                              <div className="text-xs text-muted-foreground mb-1">Total Variance</div>
                              <div className={cn(
                                "font-mono font-bold",
                                reportData.srdLedgerSummary.combinedDeptTotals.varianceValue === 0 ? "text-green-700" :
                                reportData.srdLedgerSummary.combinedDeptTotals.varianceValue < 0 ? "text-red-700" : "text-amber-700"
                              )}>
                                {reportData.srdLedgerSummary.combinedDeptTotals.varianceValue > 0 ? "+" : ""}{formatMoney(reportData.srdLedgerSummary.combinedDeptTotals.varianceValue)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Audit Trail Evidence (from Audit Logs API) */}
                  {selectedSections.includes("audit-evidence") && reportData.auditTrailEvidence?.length > 0 && (
                    <div className="page-break-before">
                      <h3 className="font-bold text-lg mb-4">Audit Trail Evidence</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        System-wide activity log for compliance and accountability for period: {reportData.period.start} to {reportData.period.end}
                      </p>
                      <div className="bg-blue-50 p-3 rounded mb-4 text-sm">
                        <div className="grid grid-cols-3 gap-4">
                          <div><strong>Total Logs:</strong> {reportData.auditTrailEvidence.length}</div>
                          <div><strong>Period:</strong> {reportData.period.start} to {reportData.period.end}</div>
                          <div><strong>Generated:</strong> {format(new Date(reportData.generatedAt), "MMM d, yyyy HH:mm")}</div>
                        </div>
                      </div>
                      <Table className="text-sm">
                        <TableHeader>
                          <TableRow className="bg-gray-100">
                            <TableHead className="w-[140px]">Timestamp</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Entity</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead className="text-right">IP Address</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.auditTrailEvidence.slice(0, 100).map((log: any) => (
                            <TableRow key={log.id}>
                              <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                                {log.timestamp ? format(new Date(log.timestamp), "MMM d, h:mm a") : "-"}
                              </TableCell>
                              <TableCell className="font-medium text-sm">
                                {log.userId || "System"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-normal text-xs">
                                  {log.action}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">{log.entity}</TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                                {log.details || "-"}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                {log.ipAddress || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {reportData.auditTrailEvidence.length > 100 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Showing first 100 of {reportData.auditTrailEvidence.length} logs. Full audit trail available in the Audit Trail page.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Auditor Remarks & Recommendations */}
                  {selectedSections.includes("auditor-remarks") && (
                    <div>
                      <h3 className="font-bold text-lg mb-4">Auditor Remarks & Recommendations</h3>
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-semibold mb-2">Key Findings</h4>
                        <ul className="list-disc list-inside text-sm space-y-1 mb-4">
                          {Math.abs(reportData.metrics.variancePercent) > 2 && (
                            <li>Declared vs Captured variance of {reportData.metrics.variancePercent.toFixed(2)}% requires attention</li>
                          )}
                          {reportData.metrics.exceptionsOpen > 0 && (
                            <li>{reportData.metrics.exceptionsOpen} open exception(s) pending investigation</li>
                          )}
                          {reportData.metrics.stockVariance < 0 && (
                            <li>Negative stock variance of {formatMoney(reportData.metrics.stockVariance)} detected</li>
                          )}
                          {(reportData.metrics.wasteTotal + reportData.metrics.writeOffTotal) > 0 && (
                            <li>Waste and write-offs total: {formatMoney(reportData.metrics.wasteTotal + reportData.metrics.writeOffTotal)}</li>
                          )}
                        </ul>
                        
                        <h4 className="font-semibold mb-2">Action Plan</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Issue</TableHead>
                              <TableHead>Recommendation</TableHead>
                              <TableHead>Owner</TableHead>
                              <TableHead>Due Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="text-sm"></TableCell>
                              <TableCell className="text-sm"></TableCell>
                              <TableCell className="text-sm"></TableCell>
                              <TableCell className="text-sm"></TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="text-sm"></TableCell>
                              <TableCell className="text-sm"></TableCell>
                              <TableCell className="text-sm"></TableCell>
                              <TableCell className="text-sm"></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Sign-off Section */}
                  <div className="border-t-2 border-blue-900 pt-6 mt-8">
                    <div className="grid grid-cols-3 gap-8">
                      <div>
                        <div className="border-b border-gray-400 pb-12 mb-2"></div>
                        <div className="text-sm text-gray-500">Prepared By</div>
                        <div className="text-xs text-gray-400">Date: _______________</div>
                      </div>
                      <div>
                        <div className="border-b border-gray-400 pb-12 mb-2"></div>
                        <div className="text-sm text-gray-500">Reviewed By</div>
                        <div className="text-xs text-gray-400">Date: _______________</div>
                      </div>
                      <div>
                        <div className="border-b border-gray-400 pb-12 mb-2"></div>
                        <div className="text-sm text-gray-500">Approved By</div>
                        <div className="text-xs text-gray-400">Date: _______________</div>
                      </div>
                    </div>
                    <div className="text-center text-xs text-gray-400 mt-6">
                      Generated by Miemploya AuditOps | {format(new Date(), "MMMM d, yyyy 'at' HH:mm")}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2 print:hidden">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              <X className="h-4 w-4 mr-2" /> Close
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
            <Button onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" /> Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  subValue, 
  icon, 
  variant = "default" 
}: { 
  label: string; 
  value: string; 
  subValue?: string;
  icon: React.ReactNode; 
  variant?: "default" | "success" | "warning" | "critical";
}) {
  return (
    <div className={cn(
      "border p-4 rounded-lg",
      variant === "success" && "border-green-200 bg-green-50",
      variant === "warning" && "border-amber-200 bg-amber-50",
      variant === "critical" && "border-red-200 bg-red-50"
    )}>
      <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
        {icon}
        {label}
      </div>
      <div className="text-xl font-bold">{value}</div>
      {subValue && <div className="text-xs text-gray-500 mt-1">{subValue}</div>}
    </div>
  );
}

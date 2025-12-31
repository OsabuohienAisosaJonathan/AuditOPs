import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { FileText, Download, BarChart3, PieChart, Table as TableIcon, AlertCircle, Printer, X, Eye, TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle, CheckCircle2, Award, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reportsApi, salesEntriesApi, departmentsApi, exceptionsApi, stockMovementsApi, SalesEntry, Exception as ExceptionType, StockMovement } from "@/lib/api";
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
    { id: "declared-vs-system", label: "Declared vs System Variance" },
    { id: "department-comparison", label: "Department Comparison (2nd Hit)" },
    { id: "daily-breakdown", label: "Daily Breakdown (Weekly/Monthly)" },
    { id: "stock-report", label: "Stock Report & Variance (SRDs)" },
    { id: "stock-movements", label: "Stock Movements Summary" },
    { id: "reconciliation-summary", label: "Reconciliation Summary" },
    { id: "audit-evidence", label: "Audit Trail Evidence" },
    { id: "auditor-remarks", label: "Auditor Remarks & Recommendations" },
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

  const dataLoaded = !salesLoading && !exceptionsLoading && !stockLoading && allSalesData !== undefined;

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

  useEffect(() => {
    if (isLoadingData && dataLoaded) {
      buildReportData();
      setIsLoadingData(false);
      setPreviewOpen(true);
    }
  }, [isLoadingData, dataLoaded, allSalesData, exceptionsData, stockMovementsData]);

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
    const totalSystemSales = sales.reduce((sum: number, s: SalesEntry) => sum + parseFloat(s.totalSales || "0"), 0);
    const totalCash = sales.reduce((sum: number, s: SalesEntry) => sum + parseFloat(s.cashAmount || "0"), 0);
    const totalPos = sales.reduce((sum: number, s: SalesEntry) => sum + parseFloat(s.posAmount || "0"), 0);
    const totalTransfer = sales.reduce((sum: number, s: SalesEntry) => sum + parseFloat(s.transferAmount || "0"), 0);
    const totalDeclared = totalCash + totalPos + totalTransfer;
    const variance = totalSystemSales - totalDeclared;
    const variancePercent = totalSystemSales > 0 ? (variance / totalSystemSales) * 100 : 0;

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
      totalSystemSales,
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
        systemSales: data.sales,
        percentOfTotal: totalSales > 0 ? (data.sales / totalSales) * 100 : 0,
        transactions: data.transactions,
      };
    }).sort((a, b) => b.systemSales - a.systemSales);
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
    const deptMap: Record<string, { system: number; cash: number; pos: number; transfer: number; declared: number }> = {};
    
    sales.forEach((sale: SalesEntry) => {
      if (!deptMap[sale.departmentId]) {
        deptMap[sale.departmentId] = { system: 0, cash: 0, pos: 0, transfer: 0, declared: 0 };
      }
      deptMap[sale.departmentId].system += parseFloat(sale.totalSales || "0");
      deptMap[sale.departmentId].cash += parseFloat(sale.cashAmount || "0");
      deptMap[sale.departmentId].pos += parseFloat(sale.posAmount || "0");
      deptMap[sale.departmentId].transfer += parseFloat(sale.transferAmount || "0");
    });

    Object.keys(deptMap).forEach(deptId => {
      deptMap[deptId].declared = deptMap[deptId].cash + deptMap[deptId].pos + deptMap[deptId].transfer;
    });

    return Object.entries(deptMap).map(([deptId, data]) => {
      const dept = departments?.find(d => d.id === deptId);
      const variance = data.system - data.declared;
      const variancePercent = data.system > 0 ? (variance / data.system) * 100 : 0;
      let status: "OK" | "Review" | "Critical" = "OK";
      if (Math.abs(variancePercent) > 5) status = "Critical";
      else if (Math.abs(variancePercent) > 2) status = "Review";
      
      return {
        departmentId: deptId,
        departmentName: dept?.name || "Unknown",
        systemSales: data.system,
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
      
      const systemSales = daySales.reduce((sum, s) => sum + parseFloat(s.totalSales || "0"), 0);
      const cash = daySales.reduce((sum, s) => sum + parseFloat(s.cashAmount || "0"), 0);
      const pos = daySales.reduce((sum, s) => sum + parseFloat(s.posAmount || "0"), 0);
      const transfer = daySales.reduce((sum, s) => sum + parseFloat(s.transferAmount || "0"), 0);
      const declared = cash + pos + transfer;
      const variance = systemSales - declared;
      const variancePercent = systemSales > 0 ? (variance / systemSales) * 100 : 0;
      
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
        systemSales,
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
        topVarianceDrivers.push(`${d.departmentName} (${formatCurrency(d.variance)})`);
      }
    });
    
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
      salesByDepartment: salesByDept,
      paymentMatrix,
      dailyBreakdown,
      stockMovementsSummary,
      topVarianceDrivers,
      sales: getFilteredSalesData(),
      exceptions: getFilteredExceptions(),
      stockMovements: getFilteredStockMovements(),
      selectedSections,
    });
  };

  const handleGeneratePreview = () => {
    setIsLoadingData(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    window.print();
    toast.success("Use your browser's 'Save as PDF' option in the print dialog");
  };

  const exportExcel = () => {
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
    csvContent += `Total Sales (System),${formatCurrency(metrics.totalSystemSales)}\n`;
    csvContent += `Total Declared,${formatCurrency(metrics.totalDeclared)}\n`;
    csvContent += `Variance,${formatCurrency(metrics.variance)}\n`;
    csvContent += `Variance %,${metrics.variancePercent.toFixed(2)}%\n`;
    csvContent += `Cash,${formatCurrency(metrics.totalCash)}\n`;
    csvContent += `POS,${formatCurrency(metrics.totalPos)}\n`;
    csvContent += `Transfer,${formatCurrency(metrics.totalTransfer)}\n`;
    csvContent += `Stock Variance,${formatCurrency(metrics.stockVariance)}\n`;
    csvContent += `Waste + Write-off,${formatCurrency(metrics.wasteTotal + metrics.writeOffTotal)}\n`;
    csvContent += `Compliance Score,${metrics.complianceScore.toFixed(0)} (${metrics.complianceBand})\n`;
    csvContent += `Exceptions (Open/Investigating/Resolved/Closed),${metrics.exceptionsOpen}/${metrics.exceptionsInvestigating}/${metrics.exceptionsResolved}/${metrics.exceptionsClosed}\n\n`;
    
    if (selectedSections.includes("department-comparison")) {
      csvContent += "=== DEPARTMENT COMPARISON (2ND HIT) ===\n";
      csvContent += "Department,System Sales,Declared Sales,Variance,Variance %,Cash,POS,Transfer,Status\n";
      departmentComparison.forEach((d: any) => {
        csvContent += `"${d.departmentName}",${d.systemSales.toFixed(2)},${d.declaredSales.toFixed(2)},${d.variance.toFixed(2)},${d.variancePercent.toFixed(2)}%,${d.cash.toFixed(2)},${d.pos.toFixed(2)},${d.transfer.toFixed(2)},${d.status}\n`;
      });
      csvContent += "\n";
    }
    
    if (selectedSections.includes("daily-breakdown") && dailyBreakdown?.length > 0) {
      csvContent += "=== DAILY BREAKDOWN ===\n";
      csvContent += "Date,System Sales,Declared,Variance,Variance %,POS,Transfer,Cash,Stock Variance,Exceptions,TRUE,FALSE,MISMATCHED,PENDING\n";
      dailyBreakdown.forEach((d: any) => {
        csvContent += `${d.date},${d.systemSales.toFixed(2)},${d.declared.toFixed(2)},${d.variance.toFixed(2)},${d.variancePercent.toFixed(2)}%,${d.pos.toFixed(2)},${d.transfer.toFixed(2)},${d.cash.toFixed(2)},${d.stockVariance.toFixed(2)},${d.exceptionsRaised},${d.outcomeTrue},${d.outcomeFalse},${d.outcomeMismatched},${d.outcomePending}\n`;
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(value);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate comprehensive audit reports and schedules</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
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
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Report Preview</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(90vh-200px)]">
            <div ref={reportRef} className="p-8 bg-white text-black print:p-0" id="report-content">
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
                      </div>
                    </div>
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
                        System vs Declared variance is <span className="font-bold">{formatCurrency(reportData.metrics.variance)}</span> ({reportData.metrics.variancePercent.toFixed(2)}%).
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
                          label="Total Sales (System)" 
                          value={formatCurrency(reportData.metrics.totalSystemSales)} 
                          icon={<DollarSign className="h-4 w-4" />}
                        />
                        <MetricCard 
                          label="Total Declared" 
                          value={formatCurrency(reportData.metrics.totalDeclared)} 
                          icon={<DollarSign className="h-4 w-4" />}
                        />
                        <MetricCard 
                          label="Variance" 
                          value={formatCurrency(reportData.metrics.variance)} 
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
                          value={formatCurrency(reportData.metrics.totalPos)} 
                          icon={<DollarSign className="h-4 w-4" />}
                        />
                        <MetricCard 
                          label="Transfer" 
                          value={formatCurrency(reportData.metrics.totalTransfer)} 
                          icon={<DollarSign className="h-4 w-4" />}
                        />
                        <MetricCard 
                          label="Cash" 
                          value={formatCurrency(reportData.metrics.totalCash)} 
                          icon={<DollarSign className="h-4 w-4" />}
                        />
                        <MetricCard 
                          label="Stock Variance" 
                          value={formatCurrency(reportData.metrics.stockVariance)} 
                          icon={<Package className="h-4 w-4" />}
                        />
                      </div>
                      <div className="grid grid-cols-4 gap-4 mt-4">
                        <MetricCard 
                          label="Waste + Write-off" 
                          value={formatCurrency(reportData.metrics.wasteTotal + reportData.metrics.writeOffTotal)} 
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

                  {/* Sales by Department */}
                  {selectedSections.includes("sales-by-department") && reportData.salesByDepartment?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-lg mb-4">Sales by Department (Summary)</h3>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-100">
                            <TableHead>Department</TableHead>
                            <TableHead className="text-right">System Sales (₦)</TableHead>
                            <TableHead className="text-right">% of Total</TableHead>
                            <TableHead className="text-right">Transactions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.salesByDepartment.map((d: any) => (
                            <TableRow key={d.departmentId}>
                              <TableCell className="font-medium">{d.departmentName}</TableCell>
                              <TableCell className="text-right">{formatCurrency(d.systemSales)}</TableCell>
                              <TableCell className="text-right">{d.percentOfTotal.toFixed(1)}%</TableCell>
                              <TableCell className="text-right">{d.transactions}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-gray-50">
                            <TableCell>TOTAL</TableCell>
                            <TableCell className="text-right">{formatCurrency(reportData.salesByDepartment.reduce((s: number, d: any) => s + d.systemSales, 0))}</TableCell>
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
                            <TableCell>{formatCurrency(reportData.metrics.totalPos)}</TableCell>
                            <TableCell>{formatCurrency(reportData.metrics.totalTransfer)}</TableCell>
                            <TableCell>{formatCurrency(reportData.metrics.totalCash)}</TableCell>
                            <TableCell className="font-bold">{formatCurrency(reportData.metrics.totalDeclared)}</TableCell>
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
                              <TableCell className="text-right">{formatCurrency(d.pos)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(d.transfer)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(d.cash)}</TableCell>
                              <TableCell className="text-right font-bold">{formatCurrency(d.total)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-gray-50">
                            <TableCell>TOTAL</TableCell>
                            <TableCell className="text-right">{formatCurrency(reportData.paymentMatrix.reduce((s: number, d: any) => s + d.pos, 0))}</TableCell>
                            <TableCell className="text-right">{formatCurrency(reportData.paymentMatrix.reduce((s: number, d: any) => s + d.transfer, 0))}</TableCell>
                            <TableCell className="text-right">{formatCurrency(reportData.paymentMatrix.reduce((s: number, d: any) => s + d.cash, 0))}</TableCell>
                            <TableCell className="text-right">{formatCurrency(reportData.paymentMatrix.reduce((s: number, d: any) => s + d.total, 0))}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Declared vs System Variance */}
                  {selectedSections.includes("declared-vs-system") && (
                    <div>
                      <h3 className="font-bold text-lg mb-4">Declared vs System Variance</h3>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-100">
                            <TableHead>System Total (₦)</TableHead>
                            <TableHead>Declared Total (₦)</TableHead>
                            <TableHead>Variance (₦)</TableHead>
                            <TableHead>Variance (%)</TableHead>
                            <TableHead>Interpretation</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">{formatCurrency(reportData.metrics.totalSystemSales)}</TableCell>
                            <TableCell>{formatCurrency(reportData.metrics.totalDeclared)}</TableCell>
                            <TableCell className={cn("font-bold", reportData.metrics.variance < 0 ? "text-red-600" : "text-green-600")}>
                              {formatCurrency(reportData.metrics.variance)}
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
                            <TableHead className="text-right">System Sales (₦)</TableHead>
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
                              <TableCell className="text-right">{formatCurrency(d.systemSales)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(d.declaredSales)}</TableCell>
                              <TableCell className={cn("text-right font-medium", d.variance < 0 ? "text-red-600" : "text-green-600")}>
                                {formatCurrency(d.variance)}
                              </TableCell>
                              <TableCell className={cn("text-right", d.variance < 0 ? "text-red-600" : "text-green-600")}>
                                {d.variancePercent.toFixed(2)}%
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(d.cash)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(d.pos)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(d.transfer)}</TableCell>
                              <TableCell>
                                <Badge variant={d.status === "OK" ? "default" : d.status === "Review" ? "secondary" : "destructive"}>
                                  {d.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-gray-50">
                            <TableCell>TOTAL</TableCell>
                            <TableCell className="text-right">{formatCurrency(reportData.departmentComparison.reduce((s: number, d: any) => s + d.systemSales, 0))}</TableCell>
                            <TableCell className="text-right">{formatCurrency(reportData.departmentComparison.reduce((s: number, d: any) => s + d.declaredSales, 0))}</TableCell>
                            <TableCell className="text-right">{formatCurrency(reportData.departmentComparison.reduce((s: number, d: any) => s + d.variance, 0))}</TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-right">{formatCurrency(reportData.departmentComparison.reduce((s: number, d: any) => s + d.cash, 0))}</TableCell>
                            <TableCell className="text-right">{formatCurrency(reportData.departmentComparison.reduce((s: number, d: any) => s + d.pos, 0))}</TableCell>
                            <TableCell className="text-right">{formatCurrency(reportData.departmentComparison.reduce((s: number, d: any) => s + d.transfer, 0))}</TableCell>
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
                              <TableHead className="text-right">System Sales (₦)</TableHead>
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
                                <TableCell className="text-right">{formatCurrency(d.systemSales)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(d.declared)}</TableCell>
                                <TableCell className={cn("text-right", d.variance < 0 ? "text-red-600" : "text-green-600")}>
                                  {formatCurrency(d.variance)}
                                </TableCell>
                                <TableCell className={cn("text-right", d.variance < 0 ? "text-red-600" : "text-green-600")}>
                                  {d.variancePercent.toFixed(1)}%
                                </TableCell>
                                <TableCell className="text-right">{formatCurrency(d.pos)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(d.transfer)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(d.cash)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(d.stockVariance)}</TableCell>
                                <TableCell className="text-right">{d.exceptionsRaised}</TableCell>
                                <TableCell className="text-center text-xs">
                                  {d.outcomeTrue}/{d.outcomeFalse}/{d.outcomeMismatched}/{d.outcomePending}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="font-bold bg-blue-50">
                              <TableCell>{reportType === "weekly" ? "WEEKLY" : "MONTHLY"} TOTAL</TableCell>
                              <TableCell className="text-right">{formatCurrency(reportData.dailyBreakdown.reduce((s: number, d: any) => s + d.systemSales, 0))}</TableCell>
                              <TableCell className="text-right">{formatCurrency(reportData.dailyBreakdown.reduce((s: number, d: any) => s + d.declared, 0))}</TableCell>
                              <TableCell className="text-right">{formatCurrency(reportData.dailyBreakdown.reduce((s: number, d: any) => s + d.variance, 0))}</TableCell>
                              <TableCell></TableCell>
                              <TableCell className="text-right">{formatCurrency(reportData.dailyBreakdown.reduce((s: number, d: any) => s + d.pos, 0))}</TableCell>
                              <TableCell className="text-right">{formatCurrency(reportData.dailyBreakdown.reduce((s: number, d: any) => s + d.transfer, 0))}</TableCell>
                              <TableCell className="text-right">{formatCurrency(reportData.dailyBreakdown.reduce((s: number, d: any) => s + d.cash, 0))}</TableCell>
                              <TableCell className="text-right">{formatCurrency(reportData.dailyBreakdown.reduce((s: number, d: any) => s + d.stockVariance, 0))}</TableCell>
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
                              <TableCell className="text-right">{formatCurrency(m.valueTotal)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-gray-50">
                            <TableCell>TOTAL</TableCell>
                            <TableCell className="text-right">{reportData.stockMovementsSummary.reduce((s: number, m: any) => s + m.count, 0)}</TableCell>
                            <TableCell className="text-right">{reportData.stockMovementsSummary.reduce((s: number, m: any) => s + m.qtyTotal, 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(reportData.stockMovementsSummary.reduce((s: number, m: any) => s + m.valueTotal, 0))}</TableCell>
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

                  {/* Auditor Remarks & Recommendations */}
                  {selectedSections.includes("auditor-remarks") && (
                    <div>
                      <h3 className="font-bold text-lg mb-4">Auditor Remarks & Recommendations</h3>
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-semibold mb-2">Key Findings</h4>
                        <ul className="list-disc list-inside text-sm space-y-1 mb-4">
                          {Math.abs(reportData.metrics.variancePercent) > 2 && (
                            <li>System vs Declared variance of {reportData.metrics.variancePercent.toFixed(2)}% requires attention</li>
                          )}
                          {reportData.metrics.exceptionsOpen > 0 && (
                            <li>{reportData.metrics.exceptionsOpen} open exception(s) pending investigation</li>
                          )}
                          {reportData.metrics.stockVariance < 0 && (
                            <li>Negative stock variance of {formatCurrency(reportData.metrics.stockVariance)} detected</li>
                          )}
                          {(reportData.metrics.wasteTotal + reportData.metrics.writeOffTotal) > 0 && (
                            <li>Waste and write-offs total: {formatCurrency(reportData.metrics.wasteTotal + reportData.metrics.writeOffTotal)}</li>
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
          <DialogFooter className="gap-2">
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

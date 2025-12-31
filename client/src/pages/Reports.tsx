import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { FileText, Download, BarChart3, PieChart, Table as TableIcon, AlertCircle, Printer, X, Eye, TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reportsApi, salesEntriesApi, departmentsApi, exceptionsApi, stockMovementsApi, SalesEntry, Exception as ExceptionType, StockMovement } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
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
    { id: "sales-revenue", label: "Sales & Revenue", default: true },
    { id: "purchases-grn", label: "Purchases & GRN", default: true },
    { id: "stock-variance", label: "Stock & Variance", default: true },
    { id: "exception-log", label: "Exception Log", default: true },
  ],
  new: [
    { id: "sales-details", label: "Sales Details" },
    { id: "payment-methods", label: "Payment Methods Breakdown" },
    { id: "total-sales-system", label: "Total Sales Summary (System)" },
    { id: "total-declared", label: "Total Declared Summary" },
    { id: "declared-vs-system", label: "Declared vs System Variance" },
    { id: "department-comparison", label: "Department Comparison (2nd Hit)" },
    { id: "stock-movements", label: "Stock Movements Summary" },
    { id: "reconciliation-summary", label: "Reconciliation Summary" },
    { id: "audit-evidence", label: "Audit Trail Evidence" },
  ],
};

const QUICK_TEMPLATES = {
  "daily-flash": {
    sections: ["sales-revenue", "total-sales-system", "total-declared", "declared-vs-system", "payment-methods", "exception-log"],
  },
  "weekly-variance": {
    sections: ["sales-revenue", "department-comparison", "payment-methods", "stock-variance", "declared-vs-system"],
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

  const { data: salesData, isLoading: salesLoading, refetch: refetchSales } = useQuery({
    queryKey: ["sales-report", clientId, dateRange, customStartDate, customEndDate],
    queryFn: async () => {
      const { start } = getDateRange();
      return salesEntriesApi.getAll({ clientId, date: format(start, "yyyy-MM-dd") });
    },
    enabled: !!clientId && isLoadingData,
  });

  const { data: exceptionsData, isLoading: exceptionsLoading, refetch: refetchExceptions } = useQuery({
    queryKey: ["exceptions-report", clientId],
    queryFn: () => exceptionsApi.getAll({ clientId }),
    enabled: !!clientId && isLoadingData,
  });

  const { data: stockMovementsData, isLoading: stockLoading, refetch: refetchStock } = useQuery({
    queryKey: ["stock-movements-report", clientId],
    queryFn: () => stockMovementsApi.getAll({ clientId }),
    enabled: !!clientId && isLoadingData,
  });

  const dataLoaded = !salesLoading && !exceptionsLoading && !stockLoading && salesData !== undefined;

  useEffect(() => {
    if (isLoadingData && dataLoaded) {
      buildReportData();
      setIsLoadingData(false);
      setPreviewOpen(true);
    }
  }, [isLoadingData, dataLoaded, salesData, exceptionsData, stockMovementsData]);

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
      toast.success(`Applied "${templateKey.replace("-", " ")}" template`);
    }
  };

  const calculateMetrics = () => {
    const sales: SalesEntry[] = salesData || [];
    const totalSystemSales = sales.reduce((sum: number, s: SalesEntry) => sum + parseFloat(s.totalSales || "0"), 0);
    const totalCash = sales.reduce((sum: number, s: SalesEntry) => sum + parseFloat(s.cashAmount || "0"), 0);
    const totalPos = sales.reduce((sum: number, s: SalesEntry) => sum + parseFloat(s.posAmount || "0"), 0);
    const totalTransfer = sales.reduce((sum: number, s: SalesEntry) => sum + parseFloat(s.transferAmount || "0"), 0);
    const totalDeclared = totalCash + totalPos + totalTransfer;
    const variance = totalSystemSales - totalDeclared;
    const variancePercent = totalSystemSales > 0 ? (variance / totalSystemSales) * 100 : 0;

    const movements: StockMovement[] = stockMovementsData || [];
    const wasteTotal = movements.filter((m: StockMovement) => m.movementType === "waste").reduce((sum: number, m: StockMovement) => sum + parseFloat(m.totalValue || "0"), 0);
    const writeOffTotal = movements.filter((m: StockMovement) => m.movementType === "write_off").reduce((sum: number, m: StockMovement) => sum + parseFloat(m.totalValue || "0"), 0);
    const stockVariance = movements.filter((m: StockMovement) => m.movementType === "adjustment").reduce((sum: number, m: StockMovement) => sum + parseFloat(m.totalValue || "0"), 0);

    const exceptions: ExceptionType[] = exceptionsData || [];
    const exceptionsRaised = exceptions.filter((e: ExceptionType) => !e.deletedAt).length;
    const exceptionsResolved = exceptions.filter((e: ExceptionType) => e.status === "resolved" && !e.deletedAt).length;

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
      exceptionsRaised,
      exceptionsResolved,
    };
  };

  const getDepartmentComparison = () => {
    const sales: SalesEntry[] = salesData || [];
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

  const buildReportData = () => {
    const metrics = calculateMetrics();
    const deptComparison = getDepartmentComparison();
    const { start, end } = getDateRange();
    
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
      metrics,
      departmentComparison: deptComparison,
      sales: salesData || [],
      exceptions: exceptionsData?.filter((e: ExceptionType) => !e.deletedAt) || [],
      stockMovements: stockMovementsData || [],
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
    
    const { metrics, departmentComparison, sales, exceptions, stockMovements } = reportData;
    let csvContent = "";
    
    csvContent += "=== SUMMARY METRICS ===\n";
    csvContent += "Metric,Value\n";
    csvContent += `Total Sales (System),${metrics.totalSystemSales.toFixed(2)}\n`;
    csvContent += `Total Declared,${metrics.totalDeclared.toFixed(2)}\n`;
    csvContent += `Variance,${metrics.variance.toFixed(2)}\n`;
    csvContent += `Variance %,${metrics.variancePercent.toFixed(2)}%\n`;
    csvContent += `Cash,${metrics.totalCash.toFixed(2)}\n`;
    csvContent += `POS,${metrics.totalPos.toFixed(2)}\n`;
    csvContent += `Transfer,${metrics.totalTransfer.toFixed(2)}\n`;
    csvContent += `Waste + Write-off,${(metrics.wasteTotal + metrics.writeOffTotal).toFixed(2)}\n`;
    csvContent += `Exceptions Raised,${metrics.exceptionsRaised}\n`;
    csvContent += `Exceptions Resolved,${metrics.exceptionsResolved}\n\n`;
    
    if (selectedSections.includes("department-comparison")) {
      csvContent += "=== DEPARTMENT COMPARISON ===\n";
      csvContent += "Department,System Sales,Declared Sales,Variance,Variance %,Cash,POS,Transfer,Status\n";
      departmentComparison.forEach((d: any) => {
        csvContent += `"${d.departmentName}",${d.systemSales.toFixed(2)},${d.declaredSales.toFixed(2)},${d.variance.toFixed(2)},${d.variancePercent.toFixed(2)}%,${d.cash.toFixed(2)},${d.pos.toFixed(2)},${d.transfer.toFixed(2)},${d.status}\n`;
      });
      csvContent += "\n";
    }
    
    if (selectedSections.includes("exception-log")) {
      csvContent += "=== EXCEPTIONS ===\n";
      csvContent += "Case #,Summary,Severity,Status,Outcome\n";
      exceptions.forEach((e: any) => {
        csvContent += `"${e.caseNumber}","${e.summary}","${e.severity || ""}","${e.status || ""}","${e.outcome || "pending"}"\n`;
      });
    }
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-report-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
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
                { title: "Daily Audit Report", icon: BarChart3, desc: "Complete daily summary", key: "daily-flash" },
                { title: "Variance Analysis", icon: PieChart, desc: "Stock discrepancy report", key: "weekly-variance" },
                { title: "Month End Pack", icon: TableIcon, desc: "Comprehensive monthly", key: "month-end-pack" },
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
                { title: "Weekly Variance", icon: PieChart, key: "weekly-variance" },
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Report Preview</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(90vh-200px)]">
            <div ref={reportRef} className="p-6 bg-white text-black print:p-0" id="report-content">
              {reportData && (
                <div className="space-y-6">
                  {/* Report Header */}
                  <div className="border-b pb-4">
                    <h1 className="text-2xl font-bold">{REPORT_TYPES.find(t => t.value === reportData.type)?.label}</h1>
                    <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                      <div><span className="text-gray-500">Client:</span> {reportData.client}</div>
                      <div><span className="text-gray-500">Period:</span> {reportData.period.label} ({reportData.period.start} to {reportData.period.end})</div>
                      <div><span className="text-gray-500">Generated:</span> {format(new Date(reportData.generatedAt), "MMM d, yyyy HH:mm")}</div>
                    </div>
                  </div>

                  {/* Metrics Cards */}
                  <div className="grid grid-cols-3 gap-4">
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
                      label="Stock Variance" 
                      value={formatCurrency(reportData.metrics.stockVariance)} 
                      icon={<Package className="h-4 w-4" />}
                    />
                    <MetricCard 
                      label="Waste + Write-off" 
                      value={formatCurrency(reportData.metrics.wasteTotal + reportData.metrics.writeOffTotal)} 
                      icon={<AlertTriangle className="h-4 w-4" />}
                    />
                    <MetricCard 
                      label="Exceptions" 
                      value={`${reportData.metrics.exceptionsRaised} raised / ${reportData.metrics.exceptionsResolved} resolved`} 
                      icon={<AlertCircle className="h-4 w-4" />}
                    />
                  </div>

                  {/* Payment Methods Breakdown */}
                  {selectedSections.includes("payment-methods") && (
                    <div>
                      <h3 className="font-bold mb-3 text-lg">Payment Methods Breakdown</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="border p-4 rounded">
                          <div className="text-gray-500 text-sm">Cash</div>
                          <div className="text-xl font-bold">{formatCurrency(reportData.metrics.totalCash)}</div>
                        </div>
                        <div className="border p-4 rounded">
                          <div className="text-gray-500 text-sm">POS</div>
                          <div className="text-xl font-bold">{formatCurrency(reportData.metrics.totalPos)}</div>
                        </div>
                        <div className="border p-4 rounded">
                          <div className="text-gray-500 text-sm">Transfer</div>
                          <div className="text-xl font-bold">{formatCurrency(reportData.metrics.totalTransfer)}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Department Comparison (2nd Hit) */}
                  {selectedSections.includes("department-comparison") && reportData.departmentComparison.length > 0 && (
                    <div>
                      <h3 className="font-bold mb-3 text-lg">Department Comparison (2nd Hit)</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
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

                  {/* Exceptions Log */}
                  {selectedSections.includes("exception-log") && reportData.exceptions.length > 0 && (
                    <div>
                      <h3 className="font-bold mb-3 text-lg">Exceptions Log</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Case #</TableHead>
                            <TableHead>Summary</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Outcome</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.exceptions.map((e: any) => (
                            <TableRow key={e.id}>
                              <TableCell className="font-mono text-xs">{e.caseNumber}</TableCell>
                              <TableCell>{e.summary}</TableCell>
                              <TableCell>
                                <Badge variant={e.severity === "critical" ? "destructive" : e.severity === "high" ? "secondary" : "outline"}>
                                  {e.severity}
                                </Badge>
                              </TableCell>
                              <TableCell>{e.status}</TableCell>
                              <TableCell>
                                <Badge variant={e.outcome === "true" ? "default" : e.outcome === "false" ? "destructive" : "outline"}>
                                  {e.outcome || "pending"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Stock Movements Summary */}
                  {selectedSections.includes("stock-movements") && reportData.stockMovements.length > 0 && (
                    <div>
                      <h3 className="font-bold mb-3 text-lg">Stock Movements Summary</h3>
                      <div className="grid grid-cols-4 gap-4">
                        {["transfer", "adjustment", "waste", "write_off"].map(type => {
                          const typeMovements = reportData.stockMovements.filter((m: any) => m.movementType === type);
                          const total = typeMovements.reduce((s: number, m: any) => s + parseFloat(m.totalValue || "0"), 0);
                          return (
                            <div key={type} className="border p-4 rounded">
                              <div className="text-gray-500 text-sm capitalize">{type.replace("_", " ")}</div>
                              <div className="text-lg font-bold">{typeMovements.length} movements</div>
                              <div className="text-sm">{formatCurrency(total)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sign-off Section */}
                  <div className="border-t pt-6 mt-6">
                    <div className="grid grid-cols-3 gap-8">
                      <div>
                        <div className="border-b border-gray-300 pb-8 mb-2"></div>
                        <div className="text-sm text-gray-500">Prepared By</div>
                      </div>
                      <div>
                        <div className="border-b border-gray-300 pb-8 mb-2"></div>
                        <div className="text-sm text-gray-500">Reviewed By</div>
                      </div>
                      <div>
                        <div className="border-b border-gray-300 pb-8 mb-2"></div>
                        <div className="text-sm text-gray-500">Approved By</div>
                      </div>
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
      {subValue && <div className="text-sm text-gray-500">{subValue}</div>}
    </div>
  );
}

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileText, Plus, Upload, ShoppingCart, BarChart3, AlertOctagon, FileCheck, Building2, Calendar, Download, FileSpreadsheet, CalendarDays, RefreshCw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi, clientsApi, departmentsApi, DashboardSummary, Client, Department, DashboardFilters } from "@/lib/api";
import { useCachedQuery, CacheStatus } from "@/lib/useCachedQuery";
import { useNetworkStatus } from "@/lib/network-status";
import { DashboardSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorCard } from "@/components/ui/error-card";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";

type AuditPeriod = "daily" | "weekly" | "monthly" | "custom";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [startAuditDialogOpen, setStartAuditDialogOpen] = useState(false);
  const [auditPeriod, setAuditPeriod] = useState<AuditPeriod>("daily");
  const [auditStartDate, setAuditStartDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [auditEndDate, setAuditEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [auditMonth, setAuditMonth] = useState<string>(format(new Date(), "yyyy-MM"));

  const filters: DashboardFilters = useMemo(() => ({
    clientId: selectedClientId || undefined,
    departmentId: selectedDepartmentId || undefined,
    date: selectedDate || undefined,
  }), [selectedClientId, selectedDepartmentId, selectedDate]);

  const { isOnline } = useNetworkStatus();
  
  const { 
    data: clients = [], 
    isLoading: clientsLoading,
    isUsingCache: clientsUsingCache,
    lastUpdated: clientsLastUpdated 
  } = useCachedQuery<Client[]>(
    ["clients"],
    clientsApi.getAll,
    { cacheEndpoint: "clients" }
  );

  const { data: departments = [] } = useQuery({
    queryKey: ["departments-by-client", selectedClientId],
    queryFn: () => selectedClientId ? departmentsApi.getByClient(selectedClientId) : Promise.resolve([]),
    enabled: !!selectedClientId,
    staleTime: 0,
  });

  const { 
    data: summary,
    cachedData: cachedSummary,
    isLoading, 
    error, 
    refetch,
    isUsingCache: summaryUsingCache,
    lastUpdated: summaryLastUpdated
  } = useCachedQuery<DashboardSummary>(
    ["dashboard-summary", JSON.stringify(filters)],
    () => dashboardApi.getSummary(filters),
    { cacheEndpoint: "dashboard-summary", cacheParams: filters as unknown as Record<string, unknown> }
  );

  const selectedClient = useMemo(() => 
    clients.find(c => c.id === selectedClientId),
    [clients, selectedClientId]
  );

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId === "all" ? "" : clientId);
    setSelectedDepartmentId("");
    setClientSearchOpen(false);
  };

  const handleDepartmentChange = (departmentId: string) => {
    setSelectedDepartmentId(departmentId === "all" ? "" : departmentId);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleOpenStartAudit = () => {
    setAuditPeriod("daily");
    setAuditStartDate(format(new Date(), "yyyy-MM-dd"));
    setAuditEndDate(format(new Date(), "yyyy-MM-dd"));
    setAuditMonth(format(new Date(), "yyyy-MM"));
    setStartAuditDialogOpen(true);
  };

  const handleAuditPeriodChange = (period: AuditPeriod) => {
    setAuditPeriod(period);
    const today = new Date();
    
    if (period === "daily") {
      setAuditStartDate(format(today, "yyyy-MM-dd"));
      setAuditEndDate(format(today, "yyyy-MM-dd"));
    } else if (period === "weekly") {
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      setAuditStartDate(format(weekStart, "yyyy-MM-dd"));
      setAuditEndDate(format(weekEnd, "yyyy-MM-dd"));
    } else if (period === "monthly") {
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      setAuditStartDate(format(monthStart, "yyyy-MM-dd"));
      setAuditEndDate(format(monthEnd, "yyyy-MM-dd"));
      setAuditMonth(format(today, "yyyy-MM"));
    } else if (period === "custom") {
      setAuditStartDate(format(today, "yyyy-MM-dd"));
      setAuditEndDate(format(today, "yyyy-MM-dd"));
    }
  };

  const handleMonthChange = (monthStr: string) => {
    setAuditMonth(monthStr);
    const [year, month] = monthStr.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    setAuditStartDate(format(monthStart, "yyyy-MM-dd"));
    setAuditEndDate(format(monthEnd, "yyyy-MM-dd"));
  };

  const handleStartAudit = () => {
    if (!selectedClientId) {
      toast.error("Please select a client before starting an audit");
      return;
    }

    const params = new URLSearchParams();
    params.set("clientId", selectedClientId);
    if (selectedDepartmentId) params.set("departmentId", selectedDepartmentId);
    params.set("period", auditPeriod);
    params.set("startDate", auditStartDate);
    params.set("endDate", auditEndDate);
    
    setStartAuditDialogOpen(false);
    setLocation(`/audit${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleImportPOS = () => {
    setImportDialogOpen(true);
  };

  const handleImportSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.success("POS data import initiated. This feature will process your file.");
    setImportDialogOpen(false);
  };

  const handleViewExceptions = () => {
    const params = new URLSearchParams();
    if (selectedClientId) params.set("clientId", selectedClientId);
    if (selectedDepartmentId) params.set("departmentId", selectedDepartmentId);
    if (selectedDate) params.set("date", selectedDate);
    setLocation(`/exceptions${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleQuickPurchase = () => {
    const params = new URLSearchParams();
    if (selectedClientId) params.set("clientId", selectedClientId);
    setLocation(`/inventory${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleQuickStockCount = () => {
    const params = new URLSearchParams();
    if (selectedClientId) params.set("clientId", selectedClientId);
    if (selectedDepartmentId) params.set("departmentId", selectedDepartmentId);
    setLocation(`/reconciliation${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleQuickException = () => {
    const params = new URLSearchParams();
    if (selectedClientId) params.set("clientId", selectedClientId);
    setLocation(`/exceptions${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleAddFirstClient = () => {
    setLocation("/clients");
  };

  const handleGenerateReport = () => {
    setReportDialogOpen(true);
  };

  const handleReportSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const reportType = formData.get("reportType") as string;
    const reportFormat = formData.get("format") as string;
    
    toast.loading("Generating report...", { id: "report-generation" });
    
    setTimeout(() => {
      toast.success(`${reportType} report generated successfully!`, { id: "report-generation" });
      
      const reportContent = generateReportContent(reportType, reportFormat);
      downloadReport(reportContent, reportType, reportFormat);
      
      setReportDialogOpen(false);
    }, 1500);
  };

  const generateReportContent = (reportType: string, reportFormat: string) => {
    const clientName = selectedClient?.name || "All Clients";
    const dateStr = selectedDate || format(new Date(), "yyyy-MM-dd");
    
    if (reportFormat === "excel") {
      const headers = ["Metric", "Value"];
      const data = [
        ["Report Type", reportType],
        ["Client", clientName],
        ["Date", dateStr],
        ["Total Sales", `₦${Number(summary?.totalSalesToday || 0).toLocaleString()}`],
        ["Total Purchases", `₦${Number(summary?.totalPurchasesToday || 0).toLocaleString()}`],
        ["Open Exceptions", String(summary?.openExceptions || 0)],
        ["Pending Reconciliations", String(summary?.pendingReconciliations || 0)],
      ];
      return [headers, ...data].map(row => row.join(",")).join("\n");
    }
    
    return `
MIEMPLOYA AUDITOPS - ${reportType.toUpperCase()}
=====================================

Generated: ${new Date().toLocaleString()}
Client: ${clientName}
Date: ${dateStr}

SUMMARY
-------
Total Sales: ₦${Number(summary?.totalSalesToday || 0).toLocaleString()}
Total Purchases: ₦${Number(summary?.totalPurchasesToday || 0).toLocaleString()}
Open Exceptions: ${summary?.openExceptions || 0}
Pending Reconciliations: ${summary?.pendingReconciliations || 0}

${summary?.recentExceptions?.length ? `
RECENT EXCEPTIONS
-----------------
${summary.recentExceptions.map(e => `- ${e.caseNumber}: ${e.summary} (${e.severity})`).join("\n")}
` : "No recent exceptions."}

${summary?.redFlags?.length ? `
RED FLAGS
---------
${summary.redFlags.map(f => `- ${f.message} (${f.severity})`).join("\n")}
` : "No red flags."}

---
Report generated by Miemploya AuditOps
    `.trim();
  };

  const downloadReport = (content: string, reportType: string, reportFormat: string) => {
    const filename = `${reportType.replace(/\s+/g, "_")}_${selectedDate || new Date().toISOString().split("T")[0]}.${reportFormat === "excel" ? "csv" : "txt"}`;
    const blob = new Blob([content], { type: reportFormat === "excel" ? "text/csv" : "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading && !summary) {
    return <DashboardSkeleton />;
  }

  if (error && !summary && !cachedSummary) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isAuthError = errorMessage.includes("401") || errorMessage.includes("Unauthorized") || errorMessage.includes("Session expired");
    const isTimeout = errorMessage.includes("timed out") || errorMessage.includes("timeout");
    
    if (isAuthError) {
      return (
        <Empty className="min-h-[400px] border" data-testid="error-dashboard">
          <EmptyMedia variant="icon">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>Session expired</EmptyTitle>
            <EmptyDescription>Your session has expired. Please log in again.</EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => setLocation("/login")} className="mt-4">Go to Login</Button>
        </Empty>
      );
    }
    
    return (
      <ErrorCard
        title={isTimeout ? "Request timed out" : "Failed to load dashboard"}
        message={isTimeout 
          ? "The server took too long to respond. Please check your connection and try again."
          : `Error: ${errorMessage}. Please try again.`}
        onRetry={() => refetch()}
        isOffline={!isOnline}
      />
    );
  }

  const hasData = clients.length > 0;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-dashboard-title">
                Audit Command Center
              </h1>
              {summaryUsingCache && (
                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  <Clock className="h-3 w-3 mr-1" />
                  Cached
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground">
                {auditPeriod === "daily" 
                  ? `Overview for ${format(new Date(selectedDate || new Date()), "MMM d, yyyy")}`
                  : auditPeriod === "weekly"
                  ? `Week of ${format(new Date(auditStartDate), "MMM d")} - ${format(new Date(auditEndDate), "MMM d, yyyy")}`
                  : auditPeriod === "monthly"
                  ? `Month of ${format(new Date(auditStartDate), "MMMM yyyy")}`
                  : `${format(new Date(auditStartDate), "MMM d")} - ${format(new Date(auditEndDate), "MMM d, yyyy")}`
                }
              </p>
              {summaryUsingCache && summaryLastUpdated && (
                <span className="text-xs text-amber-600">
                  Last updated {summaryLastUpdated}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleGenerateReport} data-testid="button-generate-report">
              <Download className="h-4 w-4" />
              Generate Report
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleImportPOS} data-testid="button-import-pos">
              <Upload className="h-4 w-4" />
              Import POS Data
            </Button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 p-4 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium whitespace-nowrap">Client:</Label>
            <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientSearchOpen}
                  className="w-[220px] justify-between"
                  data-testid="select-dashboard-client"
                >
                  {selectedClientId ? selectedClient?.name || "Select client..." : "All Clients"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-0">
                <Command>
                  <CommandInput placeholder="Search clients..." data-testid="input-search-client" />
                  <CommandList>
                    <CommandEmpty>No clients found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => handleClientChange("all")}
                        data-testid="option-all-clients"
                      >
                        <Check className={cn("mr-2 h-4 w-4", !selectedClientId ? "opacity-100" : "opacity-0")} />
                        All Clients
                      </CommandItem>
                      {clients.map((client) => (
                        <CommandItem
                          key={client.id}
                          value={client.name}
                          onSelect={() => handleClientChange(client.id)}
                          data-testid={`option-client-${client.id}`}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedClientId === client.id ? "opacity-100" : "opacity-0")} />
                          {client.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium whitespace-nowrap">Department:</Label>
            <Select 
              value={selectedDepartmentId || "all"} 
              onValueChange={handleDepartmentChange}
              disabled={!selectedClientId}
            >
              <SelectTrigger className="w-[180px]" data-testid="select-dashboard-department">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {selectedClientId && departments.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                    No departments created yet.<br/>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-xs"
                      onClick={() => setLocation("/clients")}
                    >
                      Go to Client Setup to add departments
                    </Button>
                  </div>
                ) : (
                  departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium whitespace-nowrap">Period:</Label>
            <Select value={auditPeriod} onValueChange={(v) => handleAuditPeriodChange(v as AuditPeriod)}>
              <SelectTrigger className="w-[120px]" data-testid="select-dashboard-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {auditPeriod === "monthly" ? (
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium whitespace-nowrap">Month:</Label>
              <Input 
                type="month" 
                value={auditMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="w-[160px]"
                data-testid="input-dashboard-month"
              />
            </div>
          ) : auditPeriod === "custom" ? (
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium whitespace-nowrap">From:</Label>
              <Input 
                type="date" 
                value={auditStartDate}
                onChange={(e) => setAuditStartDate(e.target.value)}
                className="w-[140px]"
                data-testid="input-dashboard-start-date"
              />
              <Label className="text-sm font-medium whitespace-nowrap">To:</Label>
              <Input 
                type="date" 
                value={auditEndDate}
                onChange={(e) => setAuditEndDate(e.target.value)}
                className="w-[140px]"
                data-testid="input-dashboard-end-date"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium whitespace-nowrap">Date:</Label>
              <Input 
                type="date" 
                value={selectedDate}
                onChange={handleDateChange}
                className="w-[160px]"
                data-testid="input-dashboard-date"
              />
            </div>
          )}
        </div>
      </div>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import POS Data</DialogTitle>
            <DialogDescription>Upload a CSV or Excel file containing POS sales data.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleImportSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="posFile">Select File</Label>
                <Input 
                  id="posFile" 
                  name="posFile" 
                  type="file" 
                  accept=".csv,.xlsx,.xls"
                  data-testid="input-pos-file"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="importDate">Import Date</Label>
                <Input 
                  id="importDate" 
                  name="importDate" 
                  type="date" 
                  defaultValue={selectedDate}
                  data-testid="input-import-date"
                />
              </div>
              {clients.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="importClient">Client</Label>
                  <Select name="importClient" defaultValue={selectedClientId}>
                    <SelectTrigger data-testid="select-import-client">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setImportDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" data-testid="button-submit-import">
                Import Data
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
            <DialogDescription>Select report type and format to download.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReportSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reportType">Report Type</Label>
                <Select name="reportType" defaultValue="Daily Audit Report">
                  <SelectTrigger data-testid="select-report-type">
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Daily Audit Report">Daily Audit Report</SelectItem>
                    <SelectItem value="Weekly Summary">Weekly Summary</SelectItem>
                    <SelectItem value="Monthly Pack">Monthly Pack</SelectItem>
                    <SelectItem value="P&L Report">P&L Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Scope</Label>
                <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                  <p><strong>Client:</strong> {selectedClient?.name || "All Clients"}</p>
                  <p><strong>Department:</strong> {departments.find(d => d.id === selectedDepartmentId)?.name || "All Departments"}</p>
                  <p><strong>Date:</strong> {selectedDate}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="format">Format</Label>
                <Select name="format" defaultValue="pdf">
                  <SelectTrigger data-testid="select-report-format">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        PDF Report
                      </div>
                    </SelectItem>
                    <SelectItem value="excel">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel Export
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReportDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2" data-testid="button-submit-report">
                <Download className="h-4 w-4" />
                Generate & Download
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={startAuditDialogOpen} onOpenChange={setStartAuditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Start Audit
            </DialogTitle>
            <DialogDescription>
              Select the audit period and date range to begin your audit session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="auditPeriod">Audit Period</Label>
              <Select 
                value={auditPeriod} 
                onValueChange={(value) => handleAuditPeriodChange(value as AuditPeriod)}
              >
                <SelectTrigger data-testid="select-audit-period">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {auditPeriod === "daily" && (
              <div className="space-y-2">
                <Label htmlFor="auditDate">Date</Label>
                <Input 
                  id="auditDate"
                  type="date" 
                  value={auditStartDate}
                  onChange={(e) => {
                    setAuditStartDate(e.target.value);
                    setAuditEndDate(e.target.value);
                  }}
                  data-testid="input-audit-date"
                />
              </div>
            )}
            
            {auditPeriod === "weekly" && (
              <div className="space-y-2">
                <Label>Week Range</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Start (Mon)</Label>
                    <Input 
                      type="date" 
                      value={auditStartDate}
                      onChange={(e) => setAuditStartDate(e.target.value)}
                      data-testid="input-audit-week-start"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">End (Sun)</Label>
                    <Input 
                      type="date" 
                      value={auditEndDate}
                      onChange={(e) => setAuditEndDate(e.target.value)}
                      data-testid="input-audit-week-end"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {auditPeriod === "monthly" && (
              <div className="space-y-2">
                <Label htmlFor="auditMonth">Month</Label>
                <Input 
                  id="auditMonth"
                  type="month" 
                  value={auditMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  data-testid="input-audit-month"
                />
                <p className="text-xs text-muted-foreground">
                  Range: {format(parseISO(auditStartDate), "MMM d")} – {format(parseISO(auditEndDate), "MMM d, yyyy")}
                </p>
              </div>
            )}
            
            {auditPeriod === "custom" && (
              <div className="space-y-2">
                <Label>Custom Date Range</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Start Date</Label>
                    <Input 
                      type="date" 
                      value={auditStartDate}
                      onChange={(e) => setAuditStartDate(e.target.value)}
                      data-testid="input-audit-custom-start"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    <Input 
                      type="date" 
                      value={auditEndDate}
                      onChange={(e) => setAuditEndDate(e.target.value)}
                      data-testid="input-audit-custom-end"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t">
              <Label>Scope</Label>
              <div className="text-sm p-3 bg-muted rounded-lg space-y-1">
                <p><span className="text-muted-foreground">Client:</span> <strong>{selectedClient?.name || "Not selected"}</strong></p>
                <p><span className="text-muted-foreground">Department:</span> <strong>{departments.find(d => d.id === selectedDepartmentId)?.name || "All Departments"}</strong></p>
              </div>
              {!selectedClientId && (
                <p className="text-xs text-destructive">Please select a client from the dashboard before starting an audit.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setStartAuditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleStartAudit} 
              disabled={!selectedClientId}
              className="gap-2"
              data-testid="button-confirm-start-audit"
            >
              <Plus className="h-4 w-4" />
              Start Audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!hasData ? (
        <Empty className="min-h-[300px] border" data-testid="empty-dashboard">
          <EmptyMedia variant="icon">
            <BarChart3 className="h-6 w-6" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No audit data yet</EmptyTitle>
            <EmptyDescription>
              Start by adding clients and departments to begin tracking audit data.
            </EmptyDescription>
          </EmptyHeader>
          <Button className="gap-2" onClick={handleAddFirstClient} data-testid="button-add-first-client">
            <Plus className="h-4 w-4" />
            Add First Client
          </Button>
        </Empty>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard 
              title="Total Sales Today" 
              value={`₦ ${Number(summary?.totalSalesToday || 0).toLocaleString()}`}
              subtitle={selectedDate ? `Sales for ${format(new Date(selectedDate), "MMM d")}` : "Today's captured sales"}
              icon={BarChart3} 
              testId="kpi-sales"
            />
            <KpiCard 
              title="Purchases Today" 
              value={`₦ ${Number(summary?.totalPurchasesToday || 0).toLocaleString()}`}
              subtitle={selectedDate ? `Purchases for ${format(new Date(selectedDate), "MMM d")}` : "Today's purchases"}
              icon={ShoppingCart} 
              testId="kpi-purchases"
            />
            <KpiCard 
              title="Open Exceptions" 
              value={String(summary?.openExceptions || 0)}
              subtitle="Requiring attention"
              icon={AlertOctagon} 
              variant={summary?.openExceptions && summary.openExceptions > 0 ? "destructive" : "default"}
              testId="kpi-exceptions"
            />
            <KpiCard 
              title="Pending Reconciliations" 
              value={String(summary?.pendingReconciliations || 0)}
              subtitle="Awaiting review"
              icon={FileCheck} 
              variant={summary?.pendingReconciliations && summary.pendingReconciliations > 0 ? "warning" : "default"}
              testId="kpi-reconciliations"
            />
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-8">
              <Card className="audit-card">
                <CardHeader>
                  <CardTitle>Overview Stats</CardTitle>
                  <CardDescription>
                    {selectedClientId ? `Stats for ${selectedClient?.name}` : "Aggregated stats across all clients"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-center gap-4 p-4 rounded-lg border">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold" data-testid="text-total-clients">
                          {summary?.totalClients || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {selectedClientId ? "Selected Client" : "Total Clients"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-lg border">
                      <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <BarChart3 className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold" data-testid="text-active-departments">
                          {summary?.totalDepartments || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Departments</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {summary?.recentExceptions && summary.recentExceptions.length > 0 && (
                <Card className="audit-card">
                  <CardHeader>
                    <CardTitle>Recent Exceptions</CardTitle>
                    <CardDescription>Latest reported issues</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {summary.recentExceptions.slice(0, 5).map((exception) => (
                        <div key={exception.id} className="flex items-start gap-3 text-sm">
                          <div className="h-2 w-2 mt-2 rounded-full bg-destructive shrink-0" />
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{exception.caseNumber}</span>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  exception.severity === "critical" && "bg-red-50 text-red-700 border-red-200",
                                  exception.severity === "high" && "bg-orange-50 text-orange-700 border-orange-200",
                                  exception.severity === "medium" && "bg-amber-50 text-amber-700 border-amber-200",
                                  exception.severity === "low" && "bg-emerald-50 text-emerald-700 border-emerald-200"
                                )}
                                data-testid={`badge-severity-${exception.id}`}
                              >
                                {exception.severity}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground">{exception.summary}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-8">
              {summary?.openExceptions && summary.openExceptions > 0 ? (
                <Card className="border-l-4 border-l-destructive shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      Red Flags
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {summary.redFlags?.map((flag, index) => (
                      <div key={index} className="flex gap-3 text-sm p-3 rounded-md bg-destructive/5 border border-destructive/10">
                        <div className="h-2 w-2 mt-1.5 rounded-full bg-destructive shrink-0" />
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{flag.message}</p>
                          <Badge variant="outline" className={cn(
                            "text-xs",
                            flag.severity === "critical" && "bg-red-50 text-red-700",
                            flag.severity === "high" && "bg-orange-50 text-orange-700",
                            flag.severity === "medium" && "bg-amber-50 text-amber-700"
                          )}>
                            {flag.severity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    <Button 
                      variant="ghost" 
                      className="w-full text-xs text-muted-foreground hover:text-foreground" 
                      onClick={handleViewExceptions}
                      data-testid="button-view-exceptions"
                    >
                      View All Exceptions
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-emerald-600">
                      <Check className="h-5 w-5" />
                      All Clear
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">No open exceptions requiring attention.</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left font-normal" 
                    onClick={handleQuickPurchase}
                    data-testid="button-quick-purchase"
                  >
                    <FileText className="mr-2 h-4 w-4" /> Record Purchase / GRN
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left font-normal" 
                    onClick={handleQuickStockCount}
                    data-testid="button-quick-stock"
                  >
                    <BarChart3 className="mr-2 h-4 w-4" /> Start Stock Count
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left font-normal" 
                    onClick={handleQuickException}
                    data-testid="button-quick-exception"
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" /> Open Exception Case
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  variant = "default",
  testId
}: { 
  title: string; 
  value: string;
  subtitle?: string;
  icon: any; 
  variant?: "default" | "destructive" | "warning";
  testId: string;
}) {
  return (
    <Card className="audit-card" data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn(
          "h-4 w-4",
          variant === "destructive" && "text-destructive",
          variant === "warning" && "text-amber-500",
          variant === "default" && "text-muted-foreground"
        )} />
      </CardHeader>
      <CardContent>
        <div className={cn(
          "text-2xl font-bold font-display tracking-tight",
          variant === "destructive" && "text-destructive",
          variant === "warning" && "text-amber-600"
        )} data-testid={`${testId}-value`}>
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

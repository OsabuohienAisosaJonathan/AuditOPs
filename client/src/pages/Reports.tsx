import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Download, BarChart3, PieChart, Table as TableIcon, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { reportsApi } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Reports() {
  const [reportType, setReportType] = useState("daily");
  const [dateRange, setDateRange] = useState("today");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const pdfMutation = useMutation({
    mutationFn: () => reportsApi.generate("pdf", { type: reportType, range: dateRange }),
    onSuccess: (data) => {
      if (data.url) {
        setDownloadUrl(data.url);
        toast.success("PDF report generated successfully");
      }
    },
    onError: () => {
      toast.error("Failed to generate PDF report");
    },
  });

  const excelMutation = useMutation({
    mutationFn: () => reportsApi.generate("excel", { type: reportType, range: dateRange }),
    onSuccess: (data) => {
      if (data.url) {
        setDownloadUrl(data.url);
        toast.success("Excel report generated successfully");
      }
    },
    onError: () => {
      toast.error("Failed to generate Excel report");
    },
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate comprehensive audit reports and schedules</p>
        </div>
      </div>

      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">Report Generation in Development</AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          Full report generation is currently being developed. Some features may have limited functionality.
        </AlertDescription>
      </Alert>

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
                      <SelectItem value="daily">Daily Audit Report</SelectItem>
                      <SelectItem value="weekly">Weekly Variance Summary</SelectItem>
                      <SelectItem value="monthly">Monthly P&L Draft</SelectItem>
                      <SelectItem value="inventory">Inventory Valuation</SelectItem>
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

              <div className="space-y-2">
                <Label>Included Sections</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2 border p-3 rounded hover:bg-muted/50 transition-colors">
                    <Checkbox id="sec-sales" defaultChecked data-testid="checkbox-sales" />
                    <label htmlFor="sec-sales" className="text-sm font-medium leading-none cursor-pointer">Sales & Revenue</label>
                  </div>
                  <div className="flex items-center space-x-2 border p-3 rounded hover:bg-muted/50 transition-colors">
                    <Checkbox id="sec-stock" defaultChecked data-testid="checkbox-stock" />
                    <label htmlFor="sec-stock" className="text-sm font-medium leading-none cursor-pointer">Stock & Variance</label>
                  </div>
                  <div className="flex items-center space-x-2 border p-3 rounded hover:bg-muted/50 transition-colors">
                    <Checkbox id="sec-purchases" defaultChecked data-testid="checkbox-purchases" />
                    <label htmlFor="sec-purchases" className="text-sm font-medium leading-none cursor-pointer">Purchases & GRN</label>
                  </div>
                  <div className="flex items-center space-x-2 border p-3 rounded hover:bg-muted/50 transition-colors">
                    <Checkbox id="sec-exceptions" defaultChecked data-testid="checkbox-exceptions" />
                    <label htmlFor="sec-exceptions" className="text-sm font-medium leading-none cursor-pointer">Exception Log</label>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <Button 
                  className="w-full sm:w-auto gap-2"
                  onClick={() => pdfMutation.mutate()}
                  disabled={pdfMutation.isPending}
                  data-testid="button-generate-pdf"
                >
                  {pdfMutation.isPending ? <Spinner className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  Generate PDF Report
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto gap-2"
                  onClick={() => excelMutation.mutate()}
                  disabled={excelMutation.isPending}
                  data-testid="button-generate-excel"
                >
                  {excelMutation.isPending ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                  Download Excel
                </Button>
              </div>

              {downloadUrl && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">Report Ready</span>
                  </div>
                  <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-1">
                    Your report has been generated. 
                    <a 
                      href={downloadUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline ml-1"
                      data-testid="link-download-report"
                    >
                      Click here to download
                    </a>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Report Templates</h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { title: "Daily Audit Report", icon: BarChart3, desc: "Complete daily summary" },
                { title: "Variance Analysis", icon: PieChart, desc: "Stock discrepancy report" },
                { title: "Exception Summary", icon: TableIcon, desc: "Open cases overview" },
              ].map((template, i) => (
                <Card key={i} className="hover:shadow-md transition-shadow cursor-pointer group" data-testid={`template-${i}`}>
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
              <CardDescription className="text-sidebar-foreground/60">Standardized reporting formats</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { title: "Daily Flash", icon: BarChart3 },
                { title: "Weekly Variance", icon: PieChart },
                { title: "Month End Pack", icon: TableIcon },
              ].map((t) => (
                <Button 
                  key={t.title} 
                  variant="ghost" 
                  className="w-full justify-start hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/80"
                  data-testid={`quick-template-${t.title.toLowerCase().replace(' ', '-')}`}
                >
                  <t.icon className="mr-2 h-4 w-4" />
                  {t.title}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No reports have been generated yet. Generate your first report above.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

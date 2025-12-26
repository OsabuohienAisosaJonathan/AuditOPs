import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, AlertTriangle, FileText, Plus, Upload, ShoppingCart, BarChart3, TrendingUp, AlertOctagon, FileCheck, Building2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi, DashboardSummary } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: dashboardApi.getSummary,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-dashboard">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <Empty className="min-h-[400px] border" data-testid="error-dashboard">
        <EmptyMedia variant="icon">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>Failed to load dashboard</EmptyTitle>
          <EmptyDescription>Please try refreshing the page.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const hasData = summary && (summary.totalClients > 0 || summary.activeOutlets > 0);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-dashboard-title">
            Audit Command Center
          </h1>
          <p className="text-muted-foreground mt-1">Overview for {format(new Date(), "MMM d, yyyy")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" data-testid="button-import-pos">
            <Upload className="h-4 w-4" />
            Import POS Data
          </Button>
          <Button className="gap-2 shadow-lg shadow-primary/20" data-testid="button-start-audit">
            <Plus className="h-4 w-4" />
            Start Daily Audit
          </Button>
        </div>
      </div>

      {!hasData ? (
        <Empty className="min-h-[300px] border" data-testid="empty-dashboard">
          <EmptyMedia variant="icon">
            <BarChart3 className="h-6 w-6" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No audit data yet</EmptyTitle>
            <EmptyDescription>
              Start by adding clients and outlets to begin tracking audit data.
            </EmptyDescription>
          </EmptyHeader>
          <Button className="gap-2" data-testid="button-add-first-client">
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
              subtitle="Today's captured sales"
              icon={BarChart3} 
              testId="kpi-sales"
            />
            <KpiCard 
              title="Purchases Today" 
              value={`₦ ${Number(summary?.totalPurchasesToday || 0).toLocaleString()}`}
              subtitle="Today's purchases"
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
                  <CardDescription>Client and outlet summary</CardDescription>
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
                        <div className="text-sm text-muted-foreground">Total Clients</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-lg border">
                      <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <BarChart3 className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold" data-testid="text-active-outlets">
                          {summary?.activeOutlets || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Active Outlets</div>
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
                    <div className="flex gap-3 text-sm p-3 rounded-md bg-destructive/5 border border-destructive/10">
                      <div className="h-2 w-2 mt-1.5 rounded-full bg-destructive shrink-0" />
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{summary.openExceptions} open exception(s) need attention</p>
                        <p className="text-xs text-muted-foreground">Review and resolve pending cases</p>
                      </div>
                    </div>
                    <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground" data-testid="button-view-exceptions">
                      View All Exceptions
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-emerald-600">
                      <AlertTriangle className="h-5 w-5" />
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
                  <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-quick-purchase">
                    <FileText className="mr-2 h-4 w-4" /> Record Purchase / GRN
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-quick-stock">
                    <BarChart3 className="mr-2 h-4 w-4" /> Start Stock Count
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-quick-exception">
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

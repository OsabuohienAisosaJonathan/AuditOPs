import { KPIS, ALERTS, CLIENTS } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, AlertTriangle, FileText, Plus, Upload, ShoppingCart, BarChart3, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

const CHART_DATA = [
  { day: "Mon", sales: 400000 },
  { day: "Tue", sales: 300000 },
  { day: "Wed", sales: 550000 },
  { day: "Thu", sales: 450000 },
  { day: "Fri", sales: 800000 },
  { day: "Sat", sales: 950000 },
  { day: "Sun", sales: 750000 },
];

export default function Dashboard() {
  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Audit Command Center</h1>
          <p className="text-muted-foreground mt-1">Overview for Dec 26, 2025</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Import POS Data
          </Button>
          <Button className="gap-2 shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" />
            Start Daily Audit
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Sales" data={KPIS.sales} icon={BarChart3} />
        <KpiCard title="COGS" data={KPIS.cogs} icon={ShoppingCart} inverse />
        <KpiCard title="Variance" data={KPIS.variance} icon={AlertTriangle} inverse />
        <KpiCard title="Gross Margin" data={KPIS.grossMargin} icon={ArrowUpRight} />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content Area - 2 Cols */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Sales Trend Chart */}
          <Card className="audit-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Weekly Sales Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={CHART_DATA}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="day" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => `₦${value/1000}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "var(--shadow-md)"
                      }}
                      formatter={(value: number) => [`₦ ${value.toLocaleString()}`, "Sales"]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorSales)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Audit Status Overview */}
          <Card className="audit-card">
            <CardHeader>
              <CardTitle>Today's Audit Status</CardTitle>
              <CardDescription>Progress across all active clients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Clients Audited</span>
                    <span className="text-muted-foreground">3 / 4</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatusCard label="Completed" count={3} color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" border="border-emerald-200 dark:border-emerald-900" />
                  <StatusCard label="Pending" count={1} color="bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" border="border-amber-200 dark:border-amber-900" />
                  <StatusCard label="Overdue" count={0} color="bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400" border="border-red-200 dark:border-red-900" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Risk Departments */}
          <Card className="audit-card">
            <CardHeader>
              <CardTitle>Top Risk Departments</CardTitle>
              <CardDescription>Ranked by variance and operational flags</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Main Bar (Grand Lounge)", risk: "High", variance: "- ₦ 85,000", issues: 3 },
                  { name: "Kitchen (Skybar)", risk: "Medium", variance: "- ₦ 22,000", issues: 1 },
                  { name: "VIP Service (Ocean View)", risk: "Low", variance: "- ₦ 5,000", issues: 0 },
                ].map((dept, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div className="space-y-1">
                      <div className="font-medium">{dept.name}</div>
                      <div className="text-xs text-muted-foreground">{dept.issues} active issues</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-medium text-destructive">{dept.variance}</div>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        dept.risk === "High" ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400" :
                        dept.risk === "Medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" :
                        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                      )}>
                        {dept.risk} Risk
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Area - 1 Col */}
        <div className="space-y-8">
          {/* Alerts Panel */}
          <Card className="border-l-4 border-l-destructive shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Red Flags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ALERTS.map((alert) => (
                <div key={alert.id} className="flex gap-3 text-sm p-3 rounded-md bg-destructive/5 border border-destructive/10">
                  <div className="h-2 w-2 mt-1.5 rounded-full bg-destructive shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">{alert.time}</p>
                  </div>
                </div>
              ))}
              <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground">View All Exceptions</Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <FileText className="mr-2 h-4 w-4" /> Record Purchase / GRN
              </Button>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <BarChart3 className="mr-2 h-4 w-4" /> Start Stock Count
              </Button>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <AlertTriangle className="mr-2 h-4 w-4" /> Open Exception Case
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, data, icon: Icon, inverse = false }: { title: string, data: any, icon: any, inverse?: boolean }) {
  const isPositive = data.trend.startsWith("+");
  const isGood = inverse ? !isPositive : isPositive;
  
  return (
    <Card className="audit-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-display tracking-tight">{data.value}</div>
        <p className={cn(
          "text-xs font-medium flex items-center mt-1",
          isGood ? "text-emerald-600" : "text-destructive"
        )}>
          {isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
          {data.trend}
          <span className="text-muted-foreground ml-1 font-normal">vs yesterday</span>
        </p>
      </CardContent>
    </Card>
  );
}

function StatusCard({ label, count, color, border }: { label: string, count: number, color: string, border: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-3 rounded-lg border", color, border)}>
      <span className="text-2xl font-bold">{count}</span>
      <span className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</span>
    </div>
  );
}

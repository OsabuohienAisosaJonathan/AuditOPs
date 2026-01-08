import { useQuery } from "@tanstack/react-query";
import { PlatformAdminLayout } from "@/components/platform-admin/PlatformAdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { 
  Building2, 
  Users, 
  AlertTriangle, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight
} from "lucide-react";

async function fetchDashboardStats() {
  const response = await fetch("/api/owner/dashboard/stats", { credentials: "include" });
  if (!response.ok) throw new Error("Failed to fetch stats");
  return response.json();
}

async function fetchExpiringSubscriptions() {
  const response = await fetch("/api/owner/dashboard/expiring?days=30", { credentials: "include" });
  if (!response.ok) throw new Error("Failed to fetch expiring subscriptions");
  return response.json();
}

export default function PlatformAdminDashboard() {
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["platform-admin-stats"],
    queryFn: fetchDashboardStats,
  });

  const { data: expiring, isLoading: loadingExpiring } = useQuery({
    queryKey: ["platform-admin-expiring"],
    queryFn: fetchExpiringSubscriptions,
  });

  return (
    <PlatformAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" data-testid="text-dashboard-title">
            Platform Overview
          </h1>
          <p className="text-slate-500">Monitor and manage all MiAuditOps organizations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Organizations</p>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold text-slate-800" data-testid="text-total-orgs">
                      {stats?.totalOrganizations || 0}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Active Subscriptions</p>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold text-green-600" data-testid="text-active-subs">
                      {stats?.activeSubscriptions || 0}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Inactive/Cancelled</p>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold text-red-600" data-testid="text-inactive-subs">
                      {stats?.inactiveSubscriptions || 0}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Expiring (30 days)</p>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold text-amber-600" data-testid="text-expiring-subs">
                      {stats?.expiringWithin30Days || 0}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
                <AlertTriangle className="w-5 h-5" />
                Expiring Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-amber-700">Within 7 days:</span>
                  <Badge variant="destructive">{stats?.expiringWithin7Days || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">Within 14 days:</span>
                  <Badge variant="outline" className="border-amber-500 text-amber-700">{stats?.expiringWithin14Days || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">Within 30 days:</span>
                  <Badge variant="secondary">{stats?.expiringWithin30Days || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/owner/tenants">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-view-orgs">
                    <Building2 className="w-4 h-4 mr-2" />
                    View Tenants
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </Button>
                </Link>
                <Link href="/owner/users">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-view-users">
                    <Users className="w-4 h-4 mr-2" />
                    Manage Users
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </Button>
                </Link>
                <Link href="/owner/billing">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-manage-billing">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Billing Management
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </Button>
                </Link>
                <Link href="/owner/logs">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-view-logs">
                    <Clock className="w-4 h-4 mr-2" />
                    Audit Logs
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subscriptions Expiring Soon</CardTitle>
            <CardDescription>Organizations with subscriptions expiring in the next 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingExpiring ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : expiring?.length > 0 ? (
              <div className="space-y-2">
                {expiring.slice(0, 5).map((sub: any) => (
                  <div 
                    key={sub.id} 
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    data-testid={`expiring-org-${sub.organizationId}`}
                  >
                    <div>
                      <p className="font-medium text-slate-800">{sub.organization?.name || "Unknown"}</p>
                      <p className="text-sm text-slate-500">{sub.organization?.email}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-1">{sub.planName}</Badge>
                      <p className="text-sm text-amber-600">
                        Expires: {new Date(sub.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">No subscriptions expiring soon</p>
            )}
          </CardContent>
        </Card>
      </div>
    </PlatformAdminLayout>
  );
}

import { useQuery } from "@tanstack/react-query";
import { PlatformAdminLayout } from "@/components/platform-admin/PlatformAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { 
  ScrollText, 
  User, 
  Building2, 
  CreditCard, 
  Clock
} from "lucide-react";

async function fetchAuditLogs(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`/api/owner/audit-logs?${query}`, { credentials: "include" });
  if (!response.ok) throw new Error("Failed to fetch audit logs");
  return response.json();
}

export default function PlatformAdminLogs() {
  const [targetTypeFilter, setTargetTypeFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["platform-admin-logs", targetTypeFilter],
    queryFn: () => fetchAuditLogs({ 
      targetType: targetTypeFilter === "all" ? "" : targetTypeFilter,
      limit: "100",
    }),
  });

  const getActionIcon = (targetType: string) => {
    switch (targetType) {
      case "organization":
        return <Building2 className="w-4 h-4" />;
      case "user":
        return <User className="w-4 h-4" />;
      case "subscription":
        return <CreditCard className="w-4 h-4" />;
      case "platform_admin":
        return <ScrollText className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getActionBadge = (actionType: string) => {
    const colors: Record<string, string> = {
      login: "bg-blue-100 text-blue-700",
      logout: "bg-slate-100 text-slate-700",
      suspend_org: "bg-red-100 text-red-700",
      unsuspend_org: "bg-green-100 text-green-700",
      delete_org: "bg-red-100 text-red-700",
      lock_user: "bg-amber-100 text-amber-700",
      unlock_user: "bg-green-100 text-green-700",
      update_subscription: "bg-purple-100 text-purple-700",
      grant_free_access: "bg-emerald-100 text-emerald-700",
      extend_subscription: "bg-cyan-100 text-cyan-700",
      create_admin: "bg-indigo-100 text-indigo-700",
      delete_admin: "bg-red-100 text-red-700",
      resend_verification: "bg-blue-100 text-blue-700",
      send_password_reset: "bg-orange-100 text-orange-700",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[actionType] || "bg-slate-100 text-slate-700"}`}>
        {actionType.replace(/_/g, " ").toUpperCase()}
      </span>
    );
  };

  return (
    <PlatformAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Audit Logs</h1>
          <p className="text-slate-500">Track all platform admin actions</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <Select value={targetTypeFilter} onValueChange={setTargetTypeFilter}>
                <SelectTrigger className="w-48" data-testid="select-target-filter">
                  <SelectValue placeholder="All targets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All targets</SelectItem>
                  <SelectItem value="organization">Organizations</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="subscription">Subscriptions</SelectItem>
                  <SelectItem value="platform_admin">Platform Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.logs?.map((log: any) => (
                    <TableRow key={log.id} data-testid={`log-row-${log.id}`}>
                      <TableCell>
                        {getActionBadge(log.actionType)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.targetType)}
                          <span className="text-sm">
                            {log.targetType}
                            {log.targetId && (
                              <span className="text-slate-400 ml-1">
                                ({log.targetId.slice(0, 8)}...)
                              </span>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600">
                          {log.adminId?.slice(0, 8)}...
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-500 max-w-xs truncate block">
                          {log.notes || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data?.logs?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No audit logs found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PlatformAdminLayout>
  );
}

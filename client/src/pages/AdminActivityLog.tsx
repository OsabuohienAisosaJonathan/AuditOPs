import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminActivityLogsApi, usersApi, type AdminActivityLog } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Filter, Download, UserCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  user_created: { label: "User Created", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  user_updated: { label: "User Updated", color: "bg-blue-100 text-blue-700 border-blue-200" },
  user_deactivated: { label: "User Deactivated", color: "bg-amber-100 text-amber-700 border-amber-200" },
  user_reactivated: { label: "User Reactivated", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  user_deleted: { label: "User Deleted", color: "bg-red-100 text-red-700 border-red-200" },
  password_reset: { label: "Password Reset", color: "bg-purple-100 text-purple-700 border-purple-200" },
  bootstrap_admin_created: { label: "Bootstrap Admin", color: "bg-purple-100 text-purple-700 border-purple-200" },
};

export default function AdminActivityLog() {
  const [actionFilter, setActionFilter] = useState<string>("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-activity-logs", actionFilter],
    queryFn: () => adminActivityLogsApi.getAll({
      actionType: actionFilter || undefined,
    }),
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.getAll({}),
  });

  const getUserName = (userId: string | null) => {
    if (!userId) return "System";
    const user = users?.find((u) => u.id === userId);
    return user?.fullName || userId.slice(0, 8) + "...";
  };

  const renderStateChanges = (log: AdminActivityLog) => {
    if (!log.beforeState && !log.afterState) return "-";

    const changes: string[] = [];
    
    if (log.afterState) {
      Object.entries(log.afterState).forEach(([key, value]) => {
        const before = log.beforeState?.[key];
        if (before !== undefined && before !== value) {
          changes.push(`${key}: ${before} → ${value}`);
        } else if (before === undefined) {
          changes.push(`${key}: ${value}`);
        }
      });
    }

    return changes.length > 0 ? (
      <div className="space-y-1">
        {changes.slice(0, 3).map((change, i) => (
          <div key={i} className="text-xs text-muted-foreground font-mono">{change}</div>
        ))}
        {changes.length > 3 && (
          <div className="text-xs text-muted-foreground">+{changes.length - 3} more</div>
        )}
      </div>
    ) : (
      "-"
    );
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">Admin Activity Log</h1>
          <p className="text-muted-foreground">Track all user management actions and system changes</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Log
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-filter-action">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="user_created">User Created</SelectItem>
                <SelectItem value="user_updated">User Updated</SelectItem>
                <SelectItem value="user_deactivated">User Deactivated</SelectItem>
                <SelectItem value="user_reactivated">User Reactivated</SelectItem>
                <SelectItem value="user_deleted">User Deleted</SelectItem>
                <SelectItem value="password_reset">Password Reset</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading activity logs...</div>
          ) : logs?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No activity logs found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Target User</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log) => {
                  const actionInfo = ACTION_LABELS[log.actionType] || { label: log.actionType, color: "bg-slate-100 text-slate-700" };
                  return (
                    <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("font-normal", actionInfo.color)}>
                          {actionInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserCircle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{getUserName(log.actorId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.targetUserId ? (
                          <span className="text-sm">{getUserName(log.targetUserId)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{renderStateChanges(log)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                        {log.reason || "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.ipAddress || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

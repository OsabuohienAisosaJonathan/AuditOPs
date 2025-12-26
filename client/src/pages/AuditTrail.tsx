import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, History, Filter, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { auditLogsApi, AuditLog } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { format, subDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function AuditTrail() {
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data: auditLogsData, isLoading, refetch } = useQuery({
    queryKey: ["audit-logs", startDate, endDate],
    queryFn: () => auditLogsApi.getAll({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit: 100,
    }),
  });

  const auditLogs = auditLogsData?.logs || [];

  const filteredLogs = auditLogs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleApplyDateFilter = () => {
    refetch();
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">Audit Logs</h1>
          <p className="text-muted-foreground">System-wide activity trail for compliance</p>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold text-sm">Activity Log</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  className="pl-9 h-9" 
                  placeholder="Search logs..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-logs"
                />
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2" data-testid="button-date-filter">
                    <Calendar className="h-3 w-3" /> Date Filter
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Filter by Date</h4>
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input 
                          id="startDate"
                          type="date" 
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          data-testid="input-start-date"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate">End Date</Label>
                        <Input 
                          id="endDate"
                          type="date" 
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          data-testid="input-end-date"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={handleApplyDateFilter}
                        data-testid="button-apply-filter"
                      >
                        Apply
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={handleClearFilters}
                        data-testid="button-clear-filter"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12" data-testid="loading-audit-logs">
              <Spinner className="h-8 w-8" />
            </div>
          ) : !auditLogs || auditLogs.length === 0 ? (
            <Empty className="py-12" data-testid="empty-audit-logs">
              <EmptyMedia variant="icon">
                <History className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No audit logs found</EmptyTitle>
                <EmptyDescription>
                  {startDate || endDate 
                    ? "No logs found for the selected date range. Try adjusting your filters."
                    : "Activity logs will appear here as users interact with the system."}
                </EmptyDescription>
              </EmptyHeader>
              {(startDate || endDate) && (
                <Button variant="outline" onClick={handleClearFilters} data-testid="button-clear-empty">
                  Clear Filters
                </Button>
              )}
            </Empty>
          ) : filteredLogs && filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="no-search-results">
              No logs match your search "{searchTerm}".
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs?.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/50" data-testid={`row-log-${log.id}`}>
                    <TableCell className="font-mono text-xs text-muted-foreground" data-testid={`text-timestamp-${log.id}`}>
                      {format(new Date(log.createdAt), "MMM d, h:mm a")}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {log.userId || "System"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal" data-testid={`badge-action-${log.id}`}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm" data-testid={`text-entity-${log.id}`}>
                      {log.entity}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" data-testid={`text-details-${log.id}`}>
                      {log.details || "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {log.ipAddress || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span data-testid="text-log-count">
          Showing {filteredLogs?.length || 0} of {auditLogs?.length || 0} logs
        </span>
        {auditLogs && auditLogs.length > 0 && (
          <span>
            Latest: {format(new Date(auditLogs[0].createdAt), "MMM d, yyyy h:mm a")}
          </span>
        )}
      </div>
    </div>
  );
}

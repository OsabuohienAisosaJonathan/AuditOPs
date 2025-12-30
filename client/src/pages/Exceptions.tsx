import { useState } from "react";
import { useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Search, AlertOctagon, MoreHorizontal, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { exceptionsApi, departmentsApi, Exception } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/lib/client-context";

export default function Exceptions() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const queryClient = useQueryClient();
  
  // Get date from URL params
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const dateFromUrl = urlParams.get("date") || format(new Date(), "yyyy-MM-dd");

  // Use global client context
  const { selectedClientId, clients } = useClientContext();
  const clientId = selectedClientId || clients?.[0]?.id || "";

  const { data: exceptions, isLoading } = useQuery({
    queryKey: ["exceptions", clientId, statusFilter],
    queryFn: () => exceptionsApi.getAll({ 
      clientId: clientId || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined 
    }),
    enabled: !!clientId,
  });

  const { data: departments } = useQuery({
    queryKey: ["departments-for-exceptions", clientId],
    queryFn: () => departmentsApi.getByClient(clientId),
    enabled: !!clientId,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Exception>) => exceptionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exceptions", clientId] });
      setCreateDialogOpen(false);
      setSelectedDepartmentId("");
      toast.success("Exception raised successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to raise exception");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Exception> }) => exceptionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exceptions", clientId] });
      toast.success("Exception updated successfully");
    },
    onError: () => {
      toast.error("Failed to update exception");
    },
  });

  const filteredExceptions = exceptions?.filter(ex => 
    ex.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.caseNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">Exceptions Register</h1>
          <p className="text-muted-foreground">Track, investigate, and resolve audit discrepancies</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-raise-exception">
              <AlertOctagon className="h-4 w-4" />
              Raise Exception
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Raise New Exception</DialogTitle>
              <DialogDescription>Log a new audit exception for investigation.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const departmentId = selectedDepartmentId;
              const summary = (formData.get("summary") as string || "").trim();
              const description = (formData.get("description") as string || "").trim();
              const severity = formData.get("severity") as string || "medium";
              
              if (!departmentId) {
                toast.error("Please select a department");
                return;
              }
              if (!summary) {
                toast.error("Summary is required");
                return;
              }
              
              createMutation.mutate({
                clientId,
                departmentId,
                date: dateFromUrl,
                summary,
                description: description || null,
                severity,
                status: "open",
              });
            }}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="departmentId">Department</Label>
                  <Select 
                    value={selectedDepartmentId} 
                    onValueChange={setSelectedDepartmentId}
                  >
                    <SelectTrigger data-testid="select-exception-department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments?.filter(d => d.status === "active").map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="summary">Summary</Label>
                  <Input id="summary" name="summary" required data-testid="input-exception-summary" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" rows={3} data-testid="input-exception-description" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity</Label>
                  <Select name="severity" defaultValue="medium">
                    <SelectTrigger data-testid="select-exception-severity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-exception">
                  {createMutation.isPending && <Spinner className="mr-2" />}
                  Raise Exception
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-9 bg-card" 
            placeholder="Search cases..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-exceptions"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-card" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="shrink-0 bg-card" data-testid="button-more-filters">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12" data-testid="loading-exceptions">
              <Spinner className="h-8 w-8" />
            </div>
          ) : !exceptions || exceptions.length === 0 ? (
            <Empty className="py-12" data-testid="empty-exceptions">
              <EmptyMedia variant="icon">
                <AlertOctagon className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No exceptions found</EmptyTitle>
                <EmptyDescription>
                  {statusFilter !== "all" 
                    ? `No exceptions with status "${statusFilter}". Try changing the filter.`
                    : "Great news! No audit exceptions have been raised yet."}
                </EmptyDescription>
              </EmptyHeader>
              {departments && departments.length > 0 && (
                <Button className="gap-2" onClick={() => setCreateDialogOpen(true)} data-testid="button-raise-first">
                  <AlertOctagon className="h-4 w-4" /> Raise Exception
                </Button>
              )}
            </Empty>
          ) : filteredExceptions && filteredExceptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="no-search-results">
              No exceptions match your search.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Case #</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExceptions?.map((ex) => (
                  <TableRow key={ex.id} className="cursor-pointer hover:bg-muted/50 transition-colors" data-testid={`row-exception-${ex.id}`}>
                    <TableCell className="font-mono font-medium text-xs" data-testid={`text-case-number-${ex.id}`}>
                      {ex.caseNumber}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium" data-testid={`text-summary-${ex.id}`}>{ex.summary}</div>
                      {ex.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{ex.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={ex.severity} testId={`badge-severity-${ex.id}`} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ex.status} testId={`badge-status-${ex.id}`} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ex.assignedTo || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(ex.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-actions-${ex.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => updateMutation.mutate({ id: ex.id, data: { status: "investigating" } })}
                            data-testid={`button-investigate-${ex.id}`}
                          >
                            Mark Investigating
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => updateMutation.mutate({ id: ex.id, data: { status: "resolved" } })}
                            data-testid={`button-resolve-${ex.id}`}
                          >
                            Mark Resolved
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => updateMutation.mutate({ id: ex.id, data: { status: "closed" } })}
                            data-testid={`button-close-${ex.id}`}
                          >
                            Close Case
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-4 gap-4">
        <StatCard 
          label="Open" 
          count={exceptions?.filter(e => e.status === "open").length || 0} 
          variant="destructive"
          testId="stat-open"
        />
        <StatCard 
          label="Investigating" 
          count={exceptions?.filter(e => e.status === "investigating").length || 0} 
          variant="warning"
          testId="stat-investigating"
        />
        <StatCard 
          label="Resolved" 
          count={exceptions?.filter(e => e.status === "resolved").length || 0} 
          variant="success"
          testId="stat-resolved"
        />
        <StatCard 
          label="Closed" 
          count={exceptions?.filter(e => e.status === "closed").length || 0} 
          variant="muted"
          testId="stat-closed"
        />
      </div>
    </div>
  );
}

function StatusBadge({ status, testId }: { status: string | null; testId: string }) {
  return (
    <Badge 
      variant="outline" 
      className={cn(
        status === "open" && "bg-red-50 text-red-700 border-red-200",
        status === "investigating" && "bg-amber-50 text-amber-700 border-amber-200",
        status === "resolved" && "bg-emerald-50 text-emerald-700 border-emerald-200",
        status === "closed" && "bg-slate-50 text-slate-700 border-slate-200",
        !status && "bg-muted text-muted-foreground"
      )}
      data-testid={testId}
    >
      {status || "Unknown"}
    </Badge>
  );
}

function SeverityBadge({ severity, testId }: { severity: string | null; testId: string }) {
  return (
    <Badge 
      variant="outline" 
      className={cn(
        severity === "critical" && "bg-red-100 text-red-800 border-red-300",
        severity === "high" && "bg-orange-100 text-orange-800 border-orange-300",
        severity === "medium" && "bg-amber-100 text-amber-800 border-amber-300",
        severity === "low" && "bg-green-100 text-green-800 border-green-300",
        !severity && "bg-muted text-muted-foreground"
      )}
      data-testid={testId}
    >
      {severity || "Unknown"}
    </Badge>
  );
}

function StatCard({ label, count, variant, testId }: { 
  label: string; 
  count: number; 
  variant: "destructive" | "warning" | "success" | "muted";
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className={cn(
            "text-2xl font-bold font-mono",
            variant === "destructive" && "text-destructive",
            variant === "warning" && "text-amber-600",
            variant === "success" && "text-emerald-600",
            variant === "muted" && "text-muted-foreground"
          )} data-testid={`${testId}-count`}>
            {count}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

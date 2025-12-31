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
import { Filter, Search, AlertOctagon, MoreHorizontal, Plus, Eye, Pencil, Trash2, FileText, Download, Printer, Clock, MessageSquare, Send, EyeOff } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { exceptionsApi, departmentsApi, usersApi, Exception, ExceptionActivity } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/lib/client-context";
import { Switch } from "@/components/ui/switch";

export default function Exceptions() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [caseDetailsOpen, setCaseDetailsOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Exception | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [deleteReason, setDeleteReason] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const queryClient = useQueryClient();
  
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const dateFromUrl = urlParams.get("date") || format(new Date(), "yyyy-MM-dd");

  const { selectedClientId, clients } = useClientContext();
  const clientId = selectedClientId || clients?.[0]?.id || "";

  const { data: exceptions, isLoading } = useQuery({
    queryKey: ["exceptions", clientId, statusFilter, showDeleted],
    queryFn: () => exceptionsApi.getAll({ 
      clientId: clientId || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      includeDeleted: showDeleted,
    }),
    enabled: !!clientId,
  });

  const { data: departments } = useQuery({
    queryKey: ["departments-for-exceptions", clientId],
    queryFn: () => departmentsApi.getByClient(clientId),
    enabled: !!clientId,
  });

  const { data: users } = useQuery({
    queryKey: ["users-for-exceptions"],
    queryFn: () => usersApi.getAll(),
  });

  const { data: caseDetails, isLoading: caseDetailsLoading } = useQuery({
    queryKey: ["exception-details", selectedCase?.id],
    queryFn: () => exceptionsApi.getDetails(selectedCase!.id),
    enabled: !!selectedCase?.id && caseDetailsOpen,
  });

  const getUserName = (userId: string | null) => {
    if (!userId) return "System";
    const user = users?.find(u => u.id === userId);
    return user?.fullName || user?.email || userId;
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<Exception>) => exceptionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exceptions"] });
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
      queryClient.invalidateQueries({ queryKey: ["exceptions"] });
      queryClient.invalidateQueries({ queryKey: ["exception-details"] });
      setEditDialogOpen(false);
      toast.success("Exception updated successfully");
    },
    onError: () => {
      toast.error("Failed to update exception");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => exceptionsApi.delete(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exceptions"] });
      setDeleteDialogOpen(false);
      setDeleteReason("");
      setSelectedCase(null);
      setCaseDetailsOpen(false);
      toast.success("Exception deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete exception");
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) => exceptionsApi.addFeedback(id, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exception-details"] });
      setFeedbackMessage("");
      toast.success("Feedback added");
    },
    onError: () => {
      toast.error("Failed to add feedback");
    },
  });

  const filteredExceptions = exceptions?.filter(ex => {
    const matchesSearch = ex.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.caseNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const includeByDeleteStatus = showDeleted ? true : !ex.deletedAt;
    return matchesSearch && includeByDeleteStatus;
  });

  const openCaseDetails = (ex: Exception) => {
    setSelectedCase(ex);
    setCaseDetailsOpen(true);
  };

  const openEditDialog = (ex: Exception) => {
    setSelectedCase(ex);
    setSelectedDepartmentId(ex.departmentId);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (ex: Exception) => {
    setSelectedCase(ex);
    setDeleteDialogOpen(true);
  };

  const exportCSV = () => {
    if (!filteredExceptions?.length) {
      toast.error("No data to export");
      return;
    }
    const headers = ["Case #", "Summary", "Severity", "Status", "Outcome", "Created", "Last Updated"];
    const rows = filteredExceptions.map(ex => [
      ex.caseNumber,
      ex.summary,
      ex.severity || "",
      ex.status || "",
      ex.outcome || "pending",
      format(new Date(ex.createdAt), "yyyy-MM-dd HH:mm"),
      format(new Date(ex.updatedAt), "yyyy-MM-dd HH:mm"),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exceptions-${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto print:max-w-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">Exceptions Register</h1>
          <p className="text-muted-foreground">Track, investigate, and resolve audit discrepancies</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={exportCSV} data-testid="button-export-csv">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" className="gap-2" onClick={printReport} data-testid="button-print">
            <Printer className="h-4 w-4" /> Print
          </Button>
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
              <ExceptionForm
                departments={departments}
                selectedDepartmentId={selectedDepartmentId}
                setSelectedDepartmentId={setSelectedDepartmentId}
                onSubmit={(formData) => {
                  createMutation.mutate({
                    clientId,
                    departmentId: selectedDepartmentId,
                    summary: formData.summary,
                    description: formData.description || null,
                    severity: formData.severity,
                    status: "open",
                  });
                }}
                onCancel={() => setCreateDialogOpen(false)}
                isPending={createMutation.isPending}
                submitLabel="Raise Exception"
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-4 items-center flex-wrap print:hidden">
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
        <div className="flex items-center gap-2">
          <Switch id="show-deleted" checked={showDeleted} onCheckedChange={setShowDeleted} />
          <Label htmlFor="show-deleted" className="text-sm text-muted-foreground flex items-center gap-1">
            <EyeOff className="h-3 w-3" /> Show Deleted
          </Label>
        </div>
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
                  <TableHead>Outcome</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExceptions?.map((ex) => (
                  <TableRow 
                    key={ex.id} 
                    className={cn(
                      "cursor-pointer hover:bg-muted/50 transition-colors",
                      ex.deletedAt && "opacity-50 bg-muted/30"
                    )} 
                    data-testid={`row-exception-${ex.id}`}
                    onClick={() => openCaseDetails(ex)}
                  >
                    <TableCell className="font-mono font-medium text-xs" data-testid={`text-case-number-${ex.id}`}>
                      {ex.caseNumber}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium" data-testid={`text-summary-${ex.id}`}>{ex.summary}</div>
                      {ex.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{ex.description}</div>
                      )}
                      {ex.deletedAt && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs mt-1">Deleted</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={ex.severity} testId={`badge-severity-${ex.id}`} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ex.status} testId={`badge-status-${ex.id}`} />
                    </TableCell>
                    <TableCell>
                      <OutcomeBadge outcome={ex.outcome} testId={`badge-outcome-${ex.id}`} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(ex.updatedAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-actions-${ex.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openCaseDetails(ex)} data-testid={`button-view-${ex.id}`}>
                            <Eye className="h-4 w-4 mr-2" /> View Case
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(ex)} data-testid={`button-edit-${ex.id}`}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit Case
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(ex)} 
                            className="text-red-600"
                            data-testid={`button-delete-${ex.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete Case
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

      <div className="grid md:grid-cols-4 gap-4 print:hidden">
        <StatCard label="Open" count={exceptions?.filter(e => e.status === "open" && !e.deletedAt).length || 0} variant="destructive" testId="stat-open" />
        <StatCard label="Investigating" count={exceptions?.filter(e => e.status === "investigating" && !e.deletedAt).length || 0} variant="warning" testId="stat-investigating" />
        <StatCard label="Resolved" count={exceptions?.filter(e => e.status === "resolved" && !e.deletedAt).length || 0} variant="success" testId="stat-resolved" />
        <StatCard label="Closed" count={exceptions?.filter(e => e.status === "closed" && !e.deletedAt).length || 0} variant="muted" testId="stat-closed" />
      </div>

      {/* Case Details Sheet */}
      <Sheet open={caseDetailsOpen} onOpenChange={setCaseDetailsOpen}>
        <SheetContent className="w-[500px] sm:w-[600px] sm:max-w-none">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertOctagon className="h-5 w-5" />
              {selectedCase?.caseNumber}
            </SheetTitle>
            <SheetDescription>{selectedCase?.summary}</SheetDescription>
          </SheetHeader>
          
          {caseDetailsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : caseDetails ? (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <Select 
                    value={caseDetails.exception.status || "open"} 
                    onValueChange={(v) => updateMutation.mutate({ id: caseDetails.exception.id, data: { status: v } })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Outcome</Label>
                  <Select 
                    value={caseDetails.exception.outcome || "pending"} 
                    onValueChange={(v) => updateMutation.mutate({ id: caseDetails.exception.id, data: { outcome: v } })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="true">True</SelectItem>
                      <SelectItem value="false">False</SelectItem>
                      <SelectItem value="mismatched">Mismatched</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Severity:</span>
                  <SeverityBadge severity={caseDetails.exception.severity} testId="detail-severity" />
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <span className="ml-2">{format(new Date(caseDetails.exception.createdAt), "MMM d, yyyy HH:mm")}</span>
                </div>
              </div>

              {caseDetails.exception.description && (
                <div>
                  <Label className="text-muted-foreground text-xs">Description</Label>
                  <p className="mt-1 text-sm">{caseDetails.exception.description}</p>
                </div>
              )}

              <Separator />

              <div>
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4" /> Investigation Timeline
                </h4>
                <ScrollArea className="h-[200px] pr-4">
                  {!caseDetails.activity || caseDetails.activity.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No activity yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {caseDetails.activity.map((act) => (
                        <div key={act.id} className="border-l-2 border-muted pl-3 py-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{format(new Date(act.createdAt), "MMM d, HH:mm")}</span>
                            <span>•</span>
                            <span>{getUserName(act.createdBy)}</span>
                          </div>
                          <p className="text-sm">{act.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <MessageSquare className="h-4 w-4" /> Add Feedback
                </h4>
                <div className="flex gap-2">
                  <Textarea 
                    placeholder="Add investigation notes..." 
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    className="flex-1"
                    rows={2}
                  />
                  <Button 
                    size="icon" 
                    onClick={() => {
                      if (feedbackMessage.trim()) {
                        feedbackMutation.mutate({ id: caseDetails.exception.id, message: feedbackMessage.trim() });
                      }
                    }}
                    disabled={!feedbackMessage.trim() || feedbackMutation.isPending}
                  >
                    {feedbackMutation.isPending ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => openEditDialog(caseDetails.exception)}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => openDeleteDialog(caseDetails.exception)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Exception</DialogTitle>
            <DialogDescription>Update the exception details.</DialogDescription>
          </DialogHeader>
          {selectedCase && (
            <ExceptionForm
              departments={departments}
              selectedDepartmentId={selectedDepartmentId}
              setSelectedDepartmentId={setSelectedDepartmentId}
              defaultValues={selectedCase}
              onSubmit={(formData) => {
                updateMutation.mutate({
                  id: selectedCase.id,
                  data: {
                    departmentId: selectedDepartmentId,
                    summary: formData.summary,
                    description: formData.description || null,
                    severity: formData.severity,
                  },
                });
              }}
              onCancel={() => setEditDialogOpen(false)}
              isPending={updateMutation.isPending}
              submitLabel="Save Changes"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exception?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{selectedCase?.caseNumber}" from the register but keep it in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="delete-reason">Reason for deletion <span className="text-red-500">*</span></Label>
            <Textarea 
              id="delete-reason"
              placeholder="Please provide a reason..."
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteReason(""); setSelectedCase(null); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedCase && deleteMutation.mutate({ id: selectedCase.id, reason: deleteReason })}
              disabled={!deleteReason.trim() || deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ExceptionForm({
  departments,
  selectedDepartmentId,
  setSelectedDepartmentId,
  defaultValues,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
}: {
  departments: any[] | undefined;
  selectedDepartmentId: string;
  setSelectedDepartmentId: (v: string) => void;
  defaultValues?: Exception;
  onSubmit: (data: { summary: string; description: string; severity: string }) => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
}) {
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const summary = (formData.get("summary") as string || "").trim();
      const description = (formData.get("description") as string || "").trim();
      const severity = formData.get("severity") as string || "medium";
      
      if (!selectedDepartmentId) {
        toast.error("Please select a department");
        return;
      }
      if (!summary) {
        toast.error("Summary is required");
        return;
      }
      
      onSubmit({ summary, description, severity });
    }}>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="departmentId">Department</Label>
          <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
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
          <Input id="summary" name="summary" defaultValue={defaultValues?.summary} required data-testid="input-exception-summary" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" defaultValue={defaultValues?.description || ""} rows={3} data-testid="input-exception-description" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="severity">Severity</Label>
          <Select name="severity" defaultValue={defaultValues?.severity || "medium"}>
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
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending} data-testid="button-submit-exception">
          {isPending && <Spinner className="mr-2" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
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

function OutcomeBadge({ outcome, testId }: { outcome: string | null; testId: string }) {
  const displayOutcome = outcome?.toUpperCase() || "PENDING";
  return (
    <Badge 
      variant="outline" 
      className={cn(
        outcome === "true" && "bg-emerald-100 text-emerald-800 border-emerald-300",
        outcome === "false" && "bg-red-100 text-red-800 border-red-300",
        outcome === "mismatched" && "bg-purple-100 text-purple-800 border-purple-300",
        outcome === "partial" && "bg-amber-100 text-amber-800 border-amber-300",
        (!outcome || outcome === "pending") && "bg-slate-100 text-slate-700 border-slate-300"
      )}
      data-testid={testId}
    >
      {displayOutcome}
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

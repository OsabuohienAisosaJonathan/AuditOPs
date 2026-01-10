import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlatformAdminLayout } from "@/components/platform-admin/PlatformAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Link } from "wouter";
import { 
  Search, 
  Eye, 
  Ban, 
  CheckCircle2, 
  Trash2, 
  Users, 
  Building2,
  Loader2,
  Calendar,
  Settings2
} from "lucide-react";

async function fetchOrganizations(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`/api/owner/organizations?${query}`, { credentials: "include" });
  if (!response.ok) throw new Error("Failed to fetch organizations");
  return response.json();
}

export default function PlatformAdminOrganizations() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    maxClientsOverride: null as number | null,
    maxSrdDepartmentsOverride: null as number | null,
    maxMainStoreOverride: null as number | null,
    maxSeatsOverride: null as number | null,
    retentionDaysOverride: null as number | null,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["platform-admin-orgs", search, statusFilter, planFilter],
    queryFn: () => fetchOrganizations({ 
      search, 
      status: statusFilter,
      planName: planFilter,
    }),
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await fetch(`/api/owner/organizations/${id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error("Failed to suspend organization");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admin-orgs"] });
      toast.success("Organization suspended");
      setSuspendDialogOpen(false);
      setSelectedOrg(null);
      setSuspendReason("");
    },
    onError: () => toast.error("Failed to suspend organization"),
  });

  const unsuspendMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/owner/organizations/${id}/unsuspend`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to unsuspend organization");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admin-orgs"] });
      toast.success("Organization unsuspended");
    },
    onError: () => toast.error("Failed to unsuspend organization"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/owner/organizations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete organization");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admin-orgs"] });
      toast.success("Organization deleted");
      setDeleteDialogOpen(false);
      setSelectedOrg(null);
    },
    onError: () => toast.error("Failed to delete organization"),
  });

  const slotOverrideMutation = useMutation({
    mutationFn: async ({ id, overrides }: { id: string; overrides: typeof overrideForm }) => {
      const response = await fetch(`/api/owner/organizations/${id}/slot-overrides`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(overrides),
      });
      if (!response.ok) throw new Error("Failed to update slot overrides");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admin-orgs"] });
      toast.success("Slot overrides updated");
      setOverrideDialogOpen(false);
      setSelectedOrg(null);
    },
    onError: () => toast.error("Failed to update slot overrides"),
  });

  const openOverrideDialog = (org: any) => {
    setSelectedOrg(org);
    setOverrideForm({
      maxClientsOverride: org.subscription?.maxClientsOverride ?? null,
      maxSrdDepartmentsOverride: org.subscription?.maxSrdDepartmentsOverride ?? null,
      maxMainStoreOverride: org.subscription?.maxMainStoreOverride ?? null,
      maxSeatsOverride: org.subscription?.maxSeatsOverride ?? null,
      retentionDaysOverride: org.subscription?.retentionDaysOverride ?? null,
    });
    setOverrideDialogOpen(true);
  };

  const getStatusBadge = (status: string, isSuspended: boolean) => {
    if (isSuspended) return <Badge variant="destructive">Suspended</Badge>;
    
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      trial: "secondary",
      past_due: "outline",
      cancelled: "destructive",
      suspended: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getPlanBadge = (plan: string) => {
    const colors: Record<string, string> = {
      starter: "bg-slate-100 text-slate-700",
      growth: "bg-blue-100 text-blue-700",
      business: "bg-purple-100 text-purple-700",
      enterprise: "bg-amber-100 text-amber-700",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[plan] || "bg-slate-100"}`}>
        {plan?.toUpperCase()}
      </span>
    );
  };

  return (
    <PlatformAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Organizations</h1>
          <p className="text-slate-500">Manage all tenant organizations</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by name or email..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search-orgs"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-40" data-testid="select-plan-filter">
                  <SelectValue placeholder="All plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All plans</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
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
                    <TableHead>Organization</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Clients</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.organizations?.map((org: any) => (
                    <TableRow key={org.id} data-testid={`org-row-${org.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-sm text-slate-500">{org.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getPlanBadge(org.subscription?.planName)}</TableCell>
                      <TableCell>{getStatusBadge(org.subscription?.status, org.isSuspended)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          {org.clientCount}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-slate-400" />
                          {org.userCount}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Calendar className="w-4 h-4" />
                          {new Date(org.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/owner/tenants/${org.id}`}>
                            <Button variant="ghost" size="sm" data-testid={`button-view-${org.id}`}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          {org.isSuspended ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => unsuspendMutation.mutate(org.id)}
                              data-testid={`button-unsuspend-${org.id}`}
                            >
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedOrg(org);
                                setSuspendDialogOpen(true);
                              }}
                              data-testid={`button-suspend-${org.id}`}
                            >
                              <Ban className="w-4 h-4 text-amber-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openOverrideDialog(org)}
                            title="Slot overrides"
                            data-testid={`button-overrides-${org.id}`}
                          >
                            <Settings2 className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedOrg(org);
                              setDeleteDialogOpen(true);
                            }}
                            data-testid={`button-delete-${org.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data?.organizations?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No organizations found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Organization</DialogTitle>
            <DialogDescription>
              This will prevent all users in "{selectedOrg?.name}" from accessing operational features.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason for suspension</Label>
              <Textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Enter reason..."
                data-testid="input-suspend-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => suspendMutation.mutate({ id: selectedOrg?.id, reason: suspendReason })}
              disabled={suspendMutation.isPending}
              data-testid="button-confirm-suspend"
            >
              {suspendMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete "{selectedOrg?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(selectedOrg?.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Slot Overrides for {selectedOrg?.name}</DialogTitle>
            <DialogDescription>
              Set custom limits that override the plan defaults. Leave empty to use plan defaults.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Max Clients</Label>
              <Input
                type="number"
                min="0"
                value={overrideForm.maxClientsOverride ?? ""}
                onChange={(e) => setOverrideForm({
                  ...overrideForm,
                  maxClientsOverride: e.target.value ? parseInt(e.target.value) : null,
                })}
                placeholder="Use plan default"
                data-testid="input-max-clients-override"
              />
            </div>
            <div className="space-y-2">
              <Label>Max Seats (Users)</Label>
              <Input
                type="number"
                min="0"
                value={overrideForm.maxSeatsOverride ?? ""}
                onChange={(e) => setOverrideForm({
                  ...overrideForm,
                  maxSeatsOverride: e.target.value ? parseInt(e.target.value) : null,
                })}
                placeholder="Use plan default"
                data-testid="input-max-seats-override"
              />
            </div>
            <div className="space-y-2">
              <Label>Max Departments per Client</Label>
              <Input
                type="number"
                min="0"
                value={overrideForm.maxSrdDepartmentsOverride ?? ""}
                onChange={(e) => setOverrideForm({
                  ...overrideForm,
                  maxSrdDepartmentsOverride: e.target.value ? parseInt(e.target.value) : null,
                })}
                placeholder="Use plan default"
                data-testid="input-max-srd-override"
              />
            </div>
            <div className="space-y-2">
              <Label>Max Main Stores per Client</Label>
              <Input
                type="number"
                min="0"
                value={overrideForm.maxMainStoreOverride ?? ""}
                onChange={(e) => setOverrideForm({
                  ...overrideForm,
                  maxMainStoreOverride: e.target.value ? parseInt(e.target.value) : null,
                })}
                placeholder="Use plan default"
                data-testid="input-max-main-store-override"
              />
            </div>
            <div className="space-y-2">
              <Label>Retention Days</Label>
              <Input
                type="number"
                min="0"
                value={overrideForm.retentionDaysOverride ?? ""}
                onChange={(e) => setOverrideForm({
                  ...overrideForm,
                  retentionDaysOverride: e.target.value ? parseInt(e.target.value) : null,
                })}
                placeholder="Use plan default"
                data-testid="input-retention-override"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => slotOverrideMutation.mutate({ id: selectedOrg?.id, overrides: overrideForm })}
              disabled={slotOverrideMutation.isPending}
              data-testid="button-save-overrides"
            >
              {slotOverrideMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Overrides
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlatformAdminLayout>
  );
}

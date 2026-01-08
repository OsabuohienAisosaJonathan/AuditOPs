import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlatformAdminLayout } from "@/components/platform-admin/PlatformAdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { 
  Search, 
  CreditCard, 
  Gift, 
  Calendar,
  Loader2,
  Building2
} from "lucide-react";

async function fetchOrganizations(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`/api/owner/organizations?${query}`, { credentials: "include" });
  if (!response.ok) throw new Error("Failed to fetch organizations");
  return response.json();
}

export default function PlatformAdminBilling() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [freeAccessDialogOpen, setFreeAccessDialogOpen] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  
  const [editForm, setEditForm] = useState({
    planName: "starter",
    billingPeriod: "monthly",
    status: "active",
    notes: "",
  });

  const [freeAccessForm, setFreeAccessForm] = useState({
    planName: "starter",
    expiresAt: "",
    notes: "",
  });

  const [extendForm, setExtendForm] = useState({
    days: 30,
    notes: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["platform-admin-billing", search],
    queryFn: () => fetchOrganizations({ search }),
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ orgId, data }: { orgId: string; data: any }) => {
      const response = await fetch(`/api/owner/organizations/${orgId}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update subscription");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admin-billing"] });
      toast.success("Subscription updated");
      setEditDialogOpen(false);
      setSelectedOrg(null);
    },
    onError: () => toast.error("Failed to update subscription"),
  });

  const grantFreeAccessMutation = useMutation({
    mutationFn: async ({ orgId, data }: { orgId: string; data: any }) => {
      const response = await fetch(`/api/owner/organizations/${orgId}/grant-free-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to grant free access");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admin-billing"] });
      toast.success("Free access granted");
      setFreeAccessDialogOpen(false);
      setSelectedOrg(null);
    },
    onError: () => toast.error("Failed to grant free access"),
  });

  const extendSubscriptionMutation = useMutation({
    mutationFn: async ({ orgId, data }: { orgId: string; data: any }) => {
      const response = await fetch(`/api/owner/organizations/${orgId}/extend-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to extend subscription");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admin-billing"] });
      toast.success("Subscription extended");
      setExtendDialogOpen(false);
      setSelectedOrg(null);
    },
    onError: () => toast.error("Failed to extend subscription"),
  });

  const openEditDialog = (org: any) => {
    setSelectedOrg(org);
    setEditForm({
      planName: org.subscription?.planName || "starter",
      billingPeriod: org.subscription?.billingPeriod || "monthly",
      status: org.subscription?.status || "active",
      notes: "",
    });
    setEditDialogOpen(true);
  };

  const openFreeAccessDialog = (org: any) => {
    setSelectedOrg(org);
    const defaultExpiry = new Date();
    defaultExpiry.setMonth(defaultExpiry.getMonth() + 1);
    setFreeAccessForm({
      planName: "starter",
      expiresAt: defaultExpiry.toISOString().split("T")[0],
      notes: "",
    });
    setFreeAccessDialogOpen(true);
  };

  const openExtendDialog = (org: any) => {
    setSelectedOrg(org);
    setExtendForm({ days: 30, notes: "" });
    setExtendDialogOpen(true);
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

  const getStatusBadge = (status: string, provider?: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      trial: "secondary",
      past_due: "outline",
      cancelled: "destructive",
      suspended: "destructive",
    };
    return (
      <div className="flex items-center gap-1">
        <Badge variant={variants[status] || "secondary"}>{status}</Badge>
        {provider === "manual_free" && (
          <Badge variant="outline" className="text-xs">FREE</Badge>
        )}
      </div>
    );
  };

  return (
    <PlatformAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Billing & Subscriptions</h1>
          <p className="text-slate-500">Manage organization subscriptions and billing</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search organizations..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search-billing"
                />
              </div>
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
                    <TableHead>Billing</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.organizations?.map((org: any) => (
                    <TableRow key={org.id} data-testid={`billing-row-${org.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="font-medium">{org.name}</p>
                            <p className="text-sm text-slate-500">{org.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getPlanBadge(org.subscription?.planName)}</TableCell>
                      <TableCell>
                        <span className="text-sm capitalize">
                          {org.subscription?.billingPeriod || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(org.subscription?.status, org.subscription?.provider)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-500">
                          {org.subscription?.expiresAt 
                            ? new Date(org.subscription.expiresAt).toLocaleDateString()
                            : "N/A"
                          }
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(org)}
                            title="Edit subscription"
                            data-testid={`button-edit-${org.id}`}
                          >
                            <CreditCard className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openFreeAccessDialog(org)}
                            title="Grant free access"
                            data-testid={`button-free-${org.id}`}
                          >
                            <Gift className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openExtendDialog(org)}
                            title="Extend subscription"
                            data-testid={`button-extend-${org.id}`}
                          >
                            <Calendar className="w-4 h-4 text-amber-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data?.organizations?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Update subscription for "{selectedOrg?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Plan</Label>
              <Select 
                value={editForm.planName} 
                onValueChange={(v) => setEditForm({...editForm, planName: v})}
              >
                <SelectTrigger data-testid="select-edit-plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Billing Period</Label>
              <Select 
                value={editForm.billingPeriod} 
                onValueChange={(v) => setEditForm({...editForm, billingPeriod: v})}
              >
                <SelectTrigger data-testid="select-edit-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select 
                value={editForm.status} 
                onValueChange={(v) => setEditForm({...editForm, status: v})}
              >
                <SelectTrigger data-testid="select-edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                placeholder="Reason for change..."
                data-testid="input-edit-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateSubscriptionMutation.mutate({ 
                orgId: selectedOrg?.id, 
                data: editForm 
              })}
              disabled={updateSubscriptionMutation.isPending}
              data-testid="button-save-subscription"
            >
              {updateSubscriptionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={freeAccessDialogOpen} onOpenChange={setFreeAccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Free Access</DialogTitle>
            <DialogDescription>
              Give "{selectedOrg?.name}" free access until a specified date
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Plan</Label>
              <Select 
                value={freeAccessForm.planName} 
                onValueChange={(v) => setFreeAccessForm({...freeAccessForm, planName: v})}
              >
                <SelectTrigger data-testid="select-free-plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expires At</Label>
              <Input
                type="date"
                value={freeAccessForm.expiresAt}
                onChange={(e) => setFreeAccessForm({...freeAccessForm, expiresAt: e.target.value})}
                data-testid="input-free-expires"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={freeAccessForm.notes}
                onChange={(e) => setFreeAccessForm({...freeAccessForm, notes: e.target.value})}
                placeholder="Reason for granting free access..."
                data-testid="input-free-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFreeAccessDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => grantFreeAccessMutation.mutate({ 
                orgId: selectedOrg?.id, 
                data: freeAccessForm 
              })}
              disabled={grantFreeAccessMutation.isPending}
              data-testid="button-grant-free"
            >
              {grantFreeAccessMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Grant Free Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Subscription</DialogTitle>
            <DialogDescription>
              Extend the subscription expiry for "{selectedOrg?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Extend by (days)</Label>
              <Input
                type="number"
                min={1}
                value={extendForm.days}
                onChange={(e) => setExtendForm({...extendForm, days: parseInt(e.target.value) || 0})}
                data-testid="input-extend-days"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={extendForm.notes}
                onChange={(e) => setExtendForm({...extendForm, notes: e.target.value})}
                placeholder="Reason for extension..."
                data-testid="input-extend-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => extendSubscriptionMutation.mutate({ 
                orgId: selectedOrg?.id, 
                data: extendForm 
              })}
              disabled={extendSubscriptionMutation.isPending}
              data-testid="button-extend"
            >
              {extendSubscriptionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Extend Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlatformAdminLayout>
  );
}

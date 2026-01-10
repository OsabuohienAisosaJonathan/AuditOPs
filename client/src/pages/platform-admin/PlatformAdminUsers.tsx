import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlatformAdminLayout } from "@/components/platform-admin/PlatformAdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  Lock, 
  Unlock, 
  Mail, 
  Key,
  Loader2,
  CheckCircle,
  XCircle,
  LogOut,
  Trash2
} from "lucide-react";

async function fetchUsers(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`/api/owner/users?${query}`, { credentials: "include" });
  if (!response.ok) throw new Error("Failed to fetch users");
  return response.json();
}

export default function PlatformAdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [lockReason, setLockReason] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["platform-admin-users", search, roleFilter, statusFilter],
    queryFn: () => fetchUsers({ 
      search, 
      role: roleFilter,
      status: statusFilter,
    }),
  });

  const lockMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await fetch(`/api/owner/users/${id}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error("Failed to lock user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admin-users"] });
      toast.success("User locked");
      setLockDialogOpen(false);
      setSelectedUser(null);
      setLockReason("");
    },
    onError: () => toast.error("Failed to lock user"),
  });

  const unlockMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/owner/users/${id}/unlock`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to unlock user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admin-users"] });
      toast.success("User unlocked");
    },
    onError: () => toast.error("Failed to unlock user"),
  });

  const resendVerificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/owner/users/${id}/resend-verification`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to resend verification");
    },
    onSuccess: () => toast.success("Verification email resent"),
    onError: () => toast.error("Failed to resend verification"),
  });

  const forceLogoutMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/owner/users/${id}/force-logout`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to force logout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admin-users"] });
      toast.success("User session invalidated");
    },
    onError: () => toast.error("Failed to force logout user"),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await fetch(`/api/owner/users/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to delete user");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admin-users"] });
      toast.success("User deleted");
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      setDeleteReason("");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete user"),
  });

  const sendPasswordResetMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/owner/users/${id}/send-password-reset`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to send password reset");
    },
    onSuccess: () => toast.success("Password reset email sent"),
    onError: () => toast.error("Failed to send password reset"),
  });

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: "bg-purple-100 text-purple-700",
      supervisor: "bg-blue-100 text-blue-700",
      auditor: "bg-slate-100 text-slate-700",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[role] || "bg-slate-100"}`}>
        {role?.replace(/_/g, " ").toUpperCase()}
      </span>
    );
  };

  return (
    <PlatformAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Users</h1>
          <p className="text-slate-500">Manage all tenant users across organizations</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by name, email, or username..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search-users"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40" data-testid="select-role-filter">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="auditor">Auditor</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
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
                    <TableHead>User</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.users?.map((user: any) => (
                    <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.fullName}</p>
                          <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{user.organization?.name || "N/A"}</span>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {user.isLocked ? (
                          <Badge variant="destructive">Locked</Badge>
                        ) : user.status === "active" ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">{user.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.emailVerified ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-slate-300" />
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-500">
                          {user.lastLoginAt 
                            ? new Date(user.lastLoginAt).toLocaleDateString()
                            : "Never"
                          }
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {user.isLocked ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => unlockMutation.mutate(user.id)}
                              title="Unlock user"
                              data-testid={`button-unlock-${user.id}`}
                            >
                              <Unlock className="w-4 h-4 text-green-600" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setLockDialogOpen(true);
                              }}
                              title="Lock user"
                              data-testid={`button-lock-${user.id}`}
                            >
                              <Lock className="w-4 h-4 text-amber-600" />
                            </Button>
                          )}
                          {!user.emailVerified && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resendVerificationMutation.mutate(user.id)}
                              disabled={resendVerificationMutation.isPending}
                              title="Resend verification"
                              data-testid={`button-resend-${user.id}`}
                            >
                              <Mail className="w-4 h-4 text-blue-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => sendPasswordResetMutation.mutate(user.id)}
                            disabled={sendPasswordResetMutation.isPending}
                            title="Send password reset"
                            data-testid={`button-reset-${user.id}`}
                          >
                            <Key className="w-4 h-4 text-slate-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => forceLogoutMutation.mutate(user.id)}
                            disabled={forceLogoutMutation.isPending}
                            title="Force logout"
                            data-testid={`button-logout-${user.id}`}
                          >
                            <LogOut className="w-4 h-4 text-orange-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setDeleteDialogOpen(true);
                            }}
                            title="Delete user"
                            data-testid={`button-delete-${user.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data?.users?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lock User Account</DialogTitle>
            <DialogDescription>
              This will prevent "{selectedUser?.fullName}" from logging in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason for locking</Label>
              <Textarea
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                placeholder="Enter reason..."
                data-testid="input-lock-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLockDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => lockMutation.mutate({ id: selectedUser?.id, reason: lockReason })}
              disabled={lockMutation.isPending}
              data-testid="button-confirm-lock"
            >
              {lockMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Lock Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              This will permanently delete "{selectedUser?.fullName}". This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason for deletion (required)</Label>
              <Textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Enter reason..."
                data-testid="input-delete-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteUserMutation.mutate({ id: selectedUser?.id, reason: deleteReason })}
              disabled={deleteUserMutation.isPending || deleteReason.trim().length < 5}
              data-testid="button-confirm-delete"
            >
              {deleteUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlatformAdminLayout>
  );
}

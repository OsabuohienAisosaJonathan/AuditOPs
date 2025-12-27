import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, clientsApi, userClientAccessApi, type User, type Client, type UserClientAccess } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Building2, Users, UserCheck, UserX, Pause, Play } from "lucide-react";
import { format } from "date-fns";

export default function ClientAccess() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [selectedAccess, setSelectedAccess] = useState<UserClientAccess | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.getAll(),
  });

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: clientsApi.getAll,
  });

  const { data: accessList, isLoading } = useQuery({
    queryKey: ["client-access", selectedClient],
    queryFn: () => selectedClient ? userClientAccessApi.getByClient(selectedClient) : Promise.resolve([]),
    enabled: !!selectedClient,
  });

  const assignMutation = useMutation({
    mutationFn: userClientAccessApi.assign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-access"] });
      setAssignDialogOpen(false);
      toast({ title: "User assigned to client" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => userClientAccessApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-access"] });
      setSuspendDialogOpen(false);
      setSelectedAccess(null);
      setSuspendReason("");
      toast({ title: "Access updated" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const handleAssign = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    assignMutation.mutate({
      userId: formData.get("userId") as string,
      clientId: selectedClient,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const handleSuspend = () => {
    if (!selectedAccess) return;
    updateMutation.mutate({
      id: selectedAccess.id,
      data: { status: "suspended", suspendReason },
    });
  };

  const handleReactivate = (access: UserClientAccess) => {
    updateMutation.mutate({
      id: access.id,
      data: { status: "assigned" },
    });
  };

  const handleRemove = (access: UserClientAccess) => {
    updateMutation.mutate({
      id: access.id,
      data: { status: "removed" },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "assigned":
        return <Badge className="bg-green-100 text-green-700 border-green-200">Assigned</Badge>;
      case "suspended":
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Suspended</Badge>;
      case "removed":
        return <Badge className="bg-red-100 text-red-700 border-red-200">Removed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUserName = (userId: string) => {
    const user = users?.find(u => u.id === userId);
    return user ? user.fullName : userId;
  };

  const assignedUsers = accessList?.filter(a => a.status === "assigned") || [];
  const suspendedUsers = accessList?.filter(a => a.status === "suspended") || [];
  const removedUsers = accessList?.filter(a => a.status === "removed") || [];

  const availableUsers = users?.filter(u => 
    u.role !== "super_admin" && 
    !accessList?.some(a => a.userId === u.id && a.status !== "removed")
  ) || [];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">Client Access Management</h1>
          <p className="text-muted-foreground">Manage user assignments and access permissions for each client</p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-100 text-green-600">
                <UserCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assignedUsers.length}</p>
                <p className="text-sm text-muted-foreground">Active Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
                <Pause className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{suspendedUsers.length}</p>
                <p className="text-sm text-muted-foreground">Suspended</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-red-100 text-red-600">
                <UserX className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{removedUsers.length}</p>
                <p className="text-sm text-muted-foreground">Removed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{availableUsers.length}</p>
                <p className="text-sm text-muted-foreground">Available to Assign</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Select Client
              </CardTitle>
              <CardDescription>Choose a client to manage user access</CardDescription>
            </div>
            {selectedClient && (
              <Button onClick={() => setAssignDialogOpen(true)} className="gap-2" data-testid="button-assign-user">
                <Plus className="h-4 w-4" />
                Assign User
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-full max-w-md" data-testid="select-client">
              <SelectValue placeholder="Select a client..." />
            </SelectTrigger>
            <SelectContent>
              {clients?.map(client => (
                <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedClient && (
        <Card>
          <CardHeader>
            <CardTitle>User Access List</CardTitle>
            <CardDescription>
              Users with access to {clients?.find(c => c.id === selectedClient)?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="assigned">
              <TabsList>
                <TabsTrigger value="assigned">Active ({assignedUsers.length})</TabsTrigger>
                <TabsTrigger value="suspended">Suspended ({suspendedUsers.length})</TabsTrigger>
                <TabsTrigger value="removed">Removed ({removedUsers.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="assigned" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned Date</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No users assigned to this client
                        </TableCell>
                      </TableRow>
                    ) : (
                      assignedUsers.map(access => (
                        <TableRow key={access.id} data-testid={`row-access-${access.id}`}>
                          <TableCell className="font-medium">{getUserName(access.userId)}</TableCell>
                          <TableCell>{getStatusBadge(access.status)}</TableCell>
                          <TableCell>{format(new Date(access.createdAt), "MMM d, yyyy")}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{access.notes || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedAccess(access);
                                  setSuspendDialogOpen(true);
                                }}
                                data-testid={`button-suspend-${access.id}`}
                              >
                                <Pause className="h-4 w-4 mr-1" />
                                Suspend
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRemove(access)}
                                data-testid={`button-remove-${access.id}`}
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="suspended" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Suspend Reason</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suspendedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No suspended users
                        </TableCell>
                      </TableRow>
                    ) : (
                      suspendedUsers.map(access => (
                        <TableRow key={access.id} data-testid={`row-access-${access.id}`}>
                          <TableCell className="font-medium">{getUserName(access.userId)}</TableCell>
                          <TableCell>{getStatusBadge(access.status)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{access.suspendReason || "-"}</TableCell>
                          <TableCell>{format(new Date(access.updatedAt), "MMM d, yyyy")}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReactivate(access)}
                              data-testid={`button-reactivate-${access.id}`}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Reactivate
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="removed" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Removed Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {removedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No removed users
                        </TableCell>
                      </TableRow>
                    ) : (
                      removedUsers.map(access => (
                        <TableRow key={access.id} data-testid={`row-access-${access.id}`}>
                          <TableCell className="font-medium">{getUserName(access.userId)}</TableCell>
                          <TableCell>{getStatusBadge(access.status)}</TableCell>
                          <TableCell>{format(new Date(access.updatedAt), "MMM d, yyyy")}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReactivate(access)}
                              data-testid={`button-restore-${access.id}`}
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Restore Access
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign User to Client</DialogTitle>
            <DialogDescription>
              Select a user to grant access to {clients?.find(c => c.id === selectedClient)?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssign} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">User</Label>
              <Select name="userId" required>
                <SelectTrigger data-testid="select-assign-user">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Any notes about this assignment..."
                data-testid="input-assign-notes"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={assignMutation.isPending} data-testid="button-confirm-assign">
                Assign User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend User Access</AlertDialogTitle>
            <AlertDialogDescription>
              This will suspend {selectedAccess ? getUserName(selectedAccess.userId) : ""}'s access to this client.
              They will have read-only access until reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="suspendReason">Reason for Suspension</Label>
            <Textarea
              id="suspendReason"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Enter reason for suspension..."
              className="mt-2"
              data-testid="input-suspend-reason"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setSuspendDialogOpen(false);
              setSelectedAccess(null);
              setSuspendReason("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSuspend} data-testid="button-confirm-suspend">
              Suspend Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

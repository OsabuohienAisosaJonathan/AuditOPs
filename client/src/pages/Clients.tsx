import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Filter, MoreHorizontal, Building2, Trash2, Edit, Eye, ChevronDown, ChevronRight, Layers, PauseCircle, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsApi, outletsApi, departmentsApi, Client, Outlet, Department } from "@/lib/api";
import { format } from "date-fns";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function Clients() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirmClient, setDeleteConfirmClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  
  const [createOutletDialogOpen, setCreateOutletDialogOpen] = useState(false);
  const [selectedClientForOutlet, setSelectedClientForOutlet] = useState<Client | null>(null);
  
  const [createDeptDialogOpen, setCreateDeptDialogOpen] = useState(false);
  const [selectedOutletForDept, setSelectedOutletForDept] = useState<Outlet | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deleteDeptConfirm, setDeleteDeptConfirm] = useState<Department | null>(null);

  const queryClient = useQueryClient();

  const { data: clients, isLoading, error } = useQuery({
    queryKey: ["clients"],
    queryFn: clientsApi.getAll,
  });

  const { data: expandedOutlets = [] } = useQuery({
    queryKey: ["outlets", expandedClientId],
    queryFn: () => expandedClientId ? outletsApi.getByClient(expandedClientId) : Promise.resolve([]),
    enabled: !!expandedClientId,
  });

  const { data: expandedDepartments = [] } = useQuery({
    queryKey: ["departments-by-client", expandedClientId],
    queryFn: () => expandedClientId ? departmentsApi.getByClient(expandedClientId) : Promise.resolve([]),
    enabled: !!expandedClientId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string }) => clientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setCreateDialogOpen(false);
      toast.success("Client created successfully");
    },
    onError: () => {
      toast.error("Failed to create client");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) => clientsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setEditingClient(null);
      toast.success("Client updated successfully");
    },
    onError: () => {
      toast.error("Failed to update client");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setDeleteConfirmClient(null);
      toast.success("Client deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete client");
    },
  });

  const createOutletMutation = useMutation({
    mutationFn: (data: { clientId: string; name: string }) => outletsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outlets", expandedClientId] });
      setCreateOutletDialogOpen(false);
      setSelectedClientForOutlet(null);
      toast.success("Outlet created successfully");
    },
    onError: () => {
      toast.error("Failed to create outlet");
    },
  });

  const createDeptMutation = useMutation({
    mutationFn: (data: { outletId: string; name: string }) => departmentsApi.create(data.outletId, { name: data.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments-by-client", expandedClientId] });
      setCreateDeptDialogOpen(false);
      setSelectedOutletForDept(null);
      toast.success("Department created successfully");
    },
    onError: () => {
      toast.error("Failed to create department");
    },
  });

  const updateDeptMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Department> }) => departmentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments-by-client", expandedClientId] });
      setEditingDepartment(null);
      toast.success("Department updated successfully");
    },
    onError: () => {
      toast.error("Failed to update department");
    },
  });

  const deleteDeptMutation = useMutation({
    mutationFn: (id: string) => departmentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments-by-client", expandedClientId] });
      setDeleteDeptConfirm(null);
      toast.success("Department deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete department");
    },
  });

  const filteredClients = clients?.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (clientId: string) => {
    setExpandedClientId(expandedClientId === clientId ? null : clientId);
  };

  const getDepartmentsForOutlet = (outletId: string) => {
    return expandedDepartments.filter(d => d.outletId === outletId);
  };

  if (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isAuthError = errorMessage.includes("401") || errorMessage.includes("Unauthorized") || errorMessage.includes("Session expired");
    return (
      <Empty className="min-h-[400px] border" data-testid="error-clients">
        <EmptyMedia variant="icon">
          <Building2 className="h-6 w-6 text-destructive" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{isAuthError ? "Session expired" : "Failed to load clients"}</EmptyTitle>
          <EmptyDescription>
            {isAuthError 
              ? "Your session has expired. Please log in again." 
              : `Error: ${errorMessage}. Please try refreshing the page.`}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">Client Management</h1>
          <p className="text-muted-foreground">Manage clients, outlets and departments</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-client">
              <Plus className="h-4 w-4" />
              Add New Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Client</DialogTitle>
              <DialogDescription>Add a new client to the audit system.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createMutation.mutate({ name: formData.get("name") as string });
            }}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Client Name</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    placeholder="Enter client name" 
                    required 
                    data-testid="input-client-name"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-client">
                  {createMutation.isPending && <Spinner className="mr-2" />}
                  Create Client
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search clients..." 
                className="pl-9" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search" 
              />
            </div>
            <Button variant="outline" className="gap-2" data-testid="button-filter">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12" data-testid="loading-clients">
              <Spinner className="h-8 w-8" />
            </div>
          ) : !clients || clients.length === 0 ? (
            <Empty className="py-12" data-testid="empty-clients">
              <EmptyMedia variant="icon">
                <Building2 className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No clients yet</EmptyTitle>
                <EmptyDescription>
                  Get started by adding your first client to the audit system.
                </EmptyDescription>
              </EmptyHeader>
              <Button className="gap-2" onClick={() => setCreateDialogOpen(true)} data-testid="button-add-first-client">
                <Plus className="h-4 w-4" />
                Add First Client
              </Button>
            </Empty>
          ) : filteredClients && filteredClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="no-results">
              No clients match your search.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredClients?.map((client) => (
                <Collapsible 
                  key={client.id} 
                  open={expandedClientId === client.id}
                  onOpenChange={() => toggleExpand(client.id)}
                >
                  <div className="border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-card hover:bg-muted/50 transition-colors">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-3 flex-1 cursor-pointer" data-testid={`row-client-${client.id}`}>
                          {expandedClientId === client.id ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Building2 className="h-5 w-5 text-primary" />
                          <div>
                            <div className="font-medium" data-testid={`text-client-name-${client.id}`}>{client.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Created {format(new Date(client.createdAt), "MMM d, yyyy")}
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className={cn(
                          "font-normal",
                          client.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400" : 
                          "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400"
                        )} data-testid={`badge-status-${client.id}`}>
                          {client.status}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-${client.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedClientForOutlet(client);
                              setCreateOutletDialogOpen(true);
                            }} data-testid={`button-add-outlet-${client.id}`}>
                              <Plus className="mr-2 h-4 w-4" />
                              Add Outlet
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingClient(client)} data-testid={`button-edit-${client.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Client
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive" 
                              onClick={() => setDeleteConfirmClient(client)}
                              data-testid={`button-delete-${client.id}`}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Client
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <CollapsibleContent>
                      <div className="border-t bg-muted/30 p-4">
                        {expandedOutlets.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground">
                            <p className="text-sm">No outlets for this client.</p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-2 gap-2"
                              onClick={() => {
                                setSelectedClientForOutlet(client);
                                setCreateOutletDialogOpen(true);
                              }}
                            >
                              <Plus className="h-3 w-3" />
                              Add First Outlet
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {expandedOutlets.map((outlet) => (
                              <div key={outlet.id} className="bg-card rounded-lg border p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-sm">{outlet.name}</span>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="gap-1 h-7 text-xs"
                                    onClick={() => {
                                      setSelectedOutletForDept(outlet);
                                      setCreateDeptDialogOpen(true);
                                    }}
                                    data-testid={`button-add-dept-${outlet.id}`}
                                  >
                                    <Plus className="h-3 w-3" />
                                    Add Department
                                  </Button>
                                </div>
                                <div className="ml-6 space-y-1">
                                  {getDepartmentsForOutlet(outlet.id).length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic">No departments yet</p>
                                  ) : (
                                    getDepartmentsForOutlet(outlet.id).map((dept) => (
                                      <div 
                                        key={dept.id} 
                                        className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50 group hover:bg-muted"
                                        data-testid={`row-dept-${dept.id}`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm">{dept.name}</span>
                                          <Badge variant="outline" className={cn(
                                            "text-xs font-normal",
                                            dept.status === "active" 
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400" 
                                              : "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400"
                                          )}>
                                            {dept.status || "active"}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6"
                                            onClick={() => setEditingDepartment(dept)}
                                            data-testid={`button-edit-dept-${dept.id}`}
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6"
                                            onClick={() => {
                                              const newStatus = dept.status === "active" ? "suspended" : "active";
                                              updateDeptMutation.mutate({ id: dept.id, data: { status: newStatus } });
                                            }}
                                            data-testid={`button-toggle-dept-${dept.id}`}
                                          >
                                            {dept.status === "active" ? (
                                              <PauseCircle className="h-3 w-3 text-amber-600" />
                                            ) : (
                                              <PlayCircle className="h-3 w-3 text-emerald-600" />
                                            )}
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 text-destructive hover:text-destructive"
                                            onClick={() => setDeleteDeptConfirm(dept)}
                                            data-testid={`button-delete-dept-${dept.id}`}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update client information.</DialogDescription>
          </DialogHeader>
          {editingClient && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateMutation.mutate({ 
                id: editingClient.id, 
                data: { name: formData.get("name") as string } 
              });
            }}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Client Name</Label>
                  <Input 
                    id="edit-name" 
                    name="name" 
                    defaultValue={editingClient.name}
                    required 
                    data-testid="input-edit-client-name"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingClient(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-client">
                  {updateMutation.isPending && <Spinner className="mr-2" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmClient} onOpenChange={() => setDeleteConfirmClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirmClient?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmClient(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirmClient && deleteMutation.mutate(deleteConfirmClient.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Spinner className="mr-2" />}
              Delete Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOutletDialogOpen} onOpenChange={setCreateOutletDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Outlet</DialogTitle>
            <DialogDescription>
              Add a new outlet to {selectedClientForOutlet?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!selectedClientForOutlet) return;
            const formData = new FormData(e.currentTarget);
            createOutletMutation.mutate({ 
              clientId: selectedClientForOutlet.id, 
              name: formData.get("outletName") as string 
            });
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="outletName">Outlet Name</Label>
                <Input 
                  id="outletName" 
                  name="outletName" 
                  placeholder="e.g., Main Branch, Downtown Location" 
                  required 
                  data-testid="input-outlet-name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOutletDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createOutletMutation.isPending} data-testid="button-submit-outlet">
                {createOutletMutation.isPending && <Spinner className="mr-2" />}
                Create Outlet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={createDeptDialogOpen} onOpenChange={setCreateDeptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Department</DialogTitle>
            <DialogDescription>
              Add a new department to {selectedOutletForDept?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!selectedOutletForDept) return;
            const formData = new FormData(e.currentTarget);
            createDeptMutation.mutate({ 
              outletId: selectedOutletForDept.id, 
              name: formData.get("deptName") as string 
            });
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="deptName">Department Name</Label>
                <Input 
                  id="deptName" 
                  name="deptName" 
                  placeholder="e.g., Main Bar, Kitchen, VIP Lounge" 
                  required 
                  data-testid="input-dept-name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDeptDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createDeptMutation.isPending} data-testid="button-submit-dept">
                {createDeptMutation.isPending && <Spinner className="mr-2" />}
                Create Department
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingDepartment} onOpenChange={() => setEditingDepartment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>Update department information.</DialogDescription>
          </DialogHeader>
          {editingDepartment && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateDeptMutation.mutate({ 
                id: editingDepartment.id, 
                data: { 
                  name: formData.get("deptEditName") as string,
                  status: formData.get("deptStatus") as string
                } 
              });
            }}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="deptEditName">Department Name</Label>
                  <Input 
                    id="deptEditName" 
                    name="deptEditName" 
                    defaultValue={editingDepartment.name}
                    required 
                    data-testid="input-edit-dept-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deptStatus">Status</Label>
                  <Select name="deptStatus" defaultValue={editingDepartment.status || "active"}>
                    <SelectTrigger data-testid="select-dept-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingDepartment(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateDeptMutation.isPending} data-testid="button-save-dept">
                  {updateDeptMutation.isPending && <Spinner className="mr-2" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteDeptConfirm} onOpenChange={() => setDeleteDeptConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDeptConfirm?.name}"? This will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDeptConfirm(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteDeptConfirm && deleteDeptMutation.mutate(deleteDeptConfirm.id)}
              disabled={deleteDeptMutation.isPending}
              data-testid="button-confirm-delete-dept"
            >
              {deleteDeptMutation.isPending && <Spinner className="mr-2" />}
              Delete Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

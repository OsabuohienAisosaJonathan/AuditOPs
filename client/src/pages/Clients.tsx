import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Filter, MoreHorizontal, Building2, Trash2, Edit, ChevronDown, ChevronRight, Layers, PauseCircle, PlayCircle, FolderTree, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsApi, outletsApi, departmentsApi, Client, Outlet, Department, OutletDepartmentLink } from "@/lib/api";
import { format } from "date-fns";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

const DEPARTMENT_MODES = [
  { value: "inherit_only", label: "Inherit Only", description: "Uses client departments only" },
  { value: "outlet_only", label: "Outlet Only", description: "Uses outlet-specific departments only" },
  { value: "inherit_add", label: "Inherit + Add", description: "Uses client departments plus outlet-specific ones" },
];

export default function Clients() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirmClient, setDeleteConfirmClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  
  const [createOutletDialogOpen, setCreateOutletDialogOpen] = useState(false);
  const [selectedClientForOutlet, setSelectedClientForOutlet] = useState<Client | null>(null);
  
  const [createClientDeptDialogOpen, setCreateClientDeptDialogOpen] = useState(false);
  const [bulkDeptInput, setBulkDeptInput] = useState("");
  const [selectedClientForClientDept, setSelectedClientForClientDept] = useState<Client | null>(null);
  
  const [createOutletDeptDialogOpen, setCreateOutletDeptDialogOpen] = useState(false);
  const [selectedOutletForDept, setSelectedOutletForDept] = useState<Outlet | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deleteDeptConfirm, setDeleteDeptConfirm] = useState<Department | null>(null);
  
  const [activeTab, setActiveTab] = useState<string>("outlets");

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

  const { data: clientDepartments = [] } = useQuery({
    queryKey: ["client-departments", expandedClientId],
    queryFn: () => expandedClientId ? departmentsApi.getClientDepartments(expandedClientId) : Promise.resolve([]),
    enabled: !!expandedClientId,
  });

  const { data: allDepartments = [] } = useQuery({
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

  const updateOutletMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Outlet> }) => outletsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outlets", expandedClientId] });
      toast.success("Outlet updated successfully");
    },
    onError: () => {
      toast.error("Failed to update outlet");
    },
  });

  const createClientDeptMutation = useMutation({
    mutationFn: (data: { clientId: string; name: string }) => departmentsApi.createForClient(data.clientId, { name: data.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-departments", expandedClientId] });
      queryClient.invalidateQueries({ queryKey: ["departments-by-client", expandedClientId] });
      setCreateClientDeptDialogOpen(false);
      setSelectedClientForClientDept(null);
      toast.success("Client department created successfully");
    },
    onError: () => {
      toast.error("Failed to create department");
    },
  });

  const bulkCreateDeptMutation = useMutation({
    mutationFn: (data: { departments: string[]; clientId: string; scope: string }) => 
      departmentsApi.createBulk(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["client-departments", expandedClientId] });
      queryClient.invalidateQueries({ queryKey: ["departments-by-client", expandedClientId] });
      setBulkDeptInput("");
      toast.success(`${created.length} departments created successfully`);
    },
    onError: () => {
      toast.error("Failed to create departments");
    },
  });

  const createOutletDeptMutation = useMutation({
    mutationFn: (data: { outletId: string; name: string }) => departmentsApi.createForOutlet(data.outletId, { name: data.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments-by-client", expandedClientId] });
      setCreateOutletDeptDialogOpen(false);
      setSelectedOutletForDept(null);
      toast.success("Outlet department created successfully");
    },
    onError: () => {
      toast.error("Failed to create department");
    },
  });

  const updateDeptMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Department> }) => departmentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-departments", expandedClientId] });
      queryClient.invalidateQueries({ queryKey: ["departments-by-client", expandedClientId] });
      setEditingDepartment(null);
      toast.success("Department updated successfully");
    },
    onError: () => {
      toast.error("Failed to update department");
    },
  });

  const deleteDeptMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await departmentsApi.delete(id);
      if ('error' in result) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-departments", expandedClientId] });
      queryClient.invalidateQueries({ queryKey: ["departments-by-client", expandedClientId] });
      setDeleteDeptConfirm(null);
      toast.success("Department deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete department");
    },
  });

  const toggleDeptLinkMutation = useMutation({
    mutationFn: ({ outletId, departmentId, isActive }: { outletId: string; departmentId: string; isActive: boolean }) => 
      departmentsApi.toggleOutletLink(outletId, departmentId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outlet-dept-links"] });
      toast.success("Department visibility updated");
    },
    onError: () => {
      toast.error("Failed to update department visibility");
    },
  });

  const filteredClients = clients?.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (clientId: string) => {
    setExpandedClientId(expandedClientId === clientId ? null : clientId);
    setActiveTab("outlets");
  };

  const getOutletDepartments = (outletId: string) => {
    return allDepartments.filter(d => d.outletId === outletId && d.scope === "outlet");
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
                            <DropdownMenuItem onClick={() => {
                              setSelectedClientForClientDept(client);
                              setExpandedClientId(client.id);
                              setCreateClientDeptDialogOpen(true);
                            }} data-testid={`button-add-client-dept-${client.id}`}>
                              <FolderTree className="mr-2 h-4 w-4" />
                              Add Client Department
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
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                          <TabsList className="mb-4">
                            <TabsTrigger value="outlets" className="gap-2">
                              <Layers className="h-4 w-4" />
                              Outlets & Departments
                            </TabsTrigger>
                            <TabsTrigger value="client-depts" className="gap-2">
                              <FolderTree className="h-4 w-4" />
                              Client Departments ({clientDepartments.length})
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="outlets">
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
                                  <OutletCard 
                                    key={outlet.id}
                                    outlet={outlet}
                                    clientDepartments={clientDepartments}
                                    outletDepartments={getOutletDepartments(outlet.id)}
                                    onAddDept={() => {
                                      setSelectedOutletForDept(outlet);
                                      setCreateOutletDeptDialogOpen(true);
                                    }}
                                    onEditDept={setEditingDepartment}
                                    onDeleteDept={setDeleteDeptConfirm}
                                    onUpdateDept={(id, data) => updateDeptMutation.mutate({ id, data })}
                                    onUpdateOutlet={(id, data) => updateOutletMutation.mutate({ id, data })}
                                    onToggleDeptLink={(departmentId, isActive) => 
                                      toggleDeptLinkMutation.mutate({ outletId: outlet.id, departmentId, isActive })
                                    }
                                  />
                                ))}
                              </div>
                            )}
                          </TabsContent>

                          <TabsContent value="client-depts">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                  Client-wide departments are shared across all outlets (based on their department mode).
                                </p>
                                <Button 
                                  size="sm" 
                                  className="gap-2"
                                  onClick={() => {
                                    setSelectedClientForClientDept(client);
                                    setCreateClientDeptDialogOpen(true);
                                  }}
                                  data-testid="button-add-client-dept"
                                >
                                  <Plus className="h-3 w-3" />
                                  Add Department
                                </Button>
                              </div>

                              <div className="bg-card border rounded-lg p-3">
                                <Label className="text-xs text-muted-foreground mb-2 block">Bulk Add (paste department names, one per line or comma-separated)</Label>
                                <div className="flex gap-2">
                                  <Textarea 
                                    value={bulkDeptInput}
                                    onChange={(e) => setBulkDeptInput(e.target.value)}
                                    placeholder="Kitchen, Main Bar, VIP Lounge..."
                                    className="min-h-[60px] text-sm"
                                    data-testid="textarea-bulk-depts"
                                  />
                                  <Button 
                                    size="sm"
                                    disabled={!bulkDeptInput.trim() || bulkCreateDeptMutation.isPending}
                                    onClick={() => {
                                      const depts = bulkDeptInput.split(/[,\n]/).map(d => d.trim()).filter(Boolean);
                                      if (depts.length > 0 && expandedClientId) {
                                        bulkCreateDeptMutation.mutate({
                                          departments: depts,
                                          clientId: expandedClientId,
                                          scope: "client"
                                        });
                                      }
                                    }}
                                    data-testid="button-bulk-add"
                                  >
                                    {bulkCreateDeptMutation.isPending ? <Spinner className="h-4 w-4" /> : "Add All"}
                                  </Button>
                                </div>
                              </div>

                              {clientDepartments.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground text-sm">
                                  No client-wide departments yet. Add departments that will be available across all outlets.
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {clientDepartments.map((dept) => (
                                    <div 
                                      key={dept.id} 
                                      className="flex items-center justify-between py-2 px-3 rounded bg-card border group hover:bg-muted/50"
                                      data-testid={`row-client-dept-${dept.id}`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <FolderTree className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">{dept.name}</span>
                                        <Badge variant="outline" className={cn(
                                          "text-xs font-normal",
                                          dept.status === "active" 
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                            : "bg-gray-50 text-gray-500 border-gray-200"
                                        )}>
                                          {dept.status || "active"}
                                        </Badge>
                                        <Badge variant="secondary" className="text-xs">Client-wide</Badge>
                                      </div>
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6"
                                          onClick={() => setEditingDepartment(dept)}
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6"
                                          onClick={() => {
                                            const newStatus = dept.status === "active" ? "inactive" : "active";
                                            updateDeptMutation.mutate({ id: dept.id, data: { status: newStatus } });
                                          }}
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
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Client Dialog */}
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
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingClient(null)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Spinner className="mr-2" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Client Confirm */}
      <Dialog open={!!deleteConfirmClient} onOpenChange={() => setDeleteConfirmClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirmClient?.name}"? This will also delete all outlets and departments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmClient(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirmClient && deleteMutation.mutate(deleteConfirmClient.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Spinner className="mr-2" />}
              Delete Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Outlet Dialog */}
      <Dialog open={createOutletDialogOpen} onOpenChange={setCreateOutletDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Outlet</DialogTitle>
            <DialogDescription>Add a new outlet to {selectedClientForOutlet?.name}.</DialogDescription>
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
                <Input id="outletName" name="outletName" placeholder="e.g., Main Branch, Downtown Location" required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOutletDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createOutletMutation.isPending}>
                {createOutletMutation.isPending && <Spinner className="mr-2" />}
                Create Outlet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Client Department Dialog */}
      <Dialog open={createClientDeptDialogOpen} onOpenChange={setCreateClientDeptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Client Department</DialogTitle>
            <DialogDescription>Add a client-wide department that can be inherited by outlets.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!selectedClientForClientDept && !expandedClientId) return;
            const formData = new FormData(e.currentTarget);
            createClientDeptMutation.mutate({ 
              clientId: selectedClientForClientDept?.id || expandedClientId!, 
              name: formData.get("deptName") as string 
            });
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="deptName">Department Name</Label>
                <Input id="deptName" name="deptName" placeholder="e.g., Main Bar, Kitchen, VIP Lounge" required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateClientDeptDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createClientDeptMutation.isPending}>
                {createClientDeptMutation.isPending && <Spinner className="mr-2" />}
                Create Department
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Outlet Department Dialog */}
      <Dialog open={createOutletDeptDialogOpen} onOpenChange={setCreateOutletDeptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Outlet Department</DialogTitle>
            <DialogDescription>Add a department specific to {selectedOutletForDept?.name}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!selectedOutletForDept) return;
            const formData = new FormData(e.currentTarget);
            createOutletDeptMutation.mutate({ 
              outletId: selectedOutletForDept.id, 
              name: formData.get("deptName") as string 
            });
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="outletDeptName">Department Name</Label>
                <Input id="outletDeptName" name="deptName" placeholder="e.g., Private Dining, Rooftop Bar" required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOutletDeptDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createOutletDeptMutation.isPending}>
                {createOutletDeptMutation.isPending && <Spinner className="mr-2" />}
                Create Department
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Department Dialog */}
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
                  <Input id="deptEditName" name="deptEditName" defaultValue={editingDepartment.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deptStatus">Status</Label>
                  <Select name="deptStatus" defaultValue={editingDepartment.status || "active"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingDepartment(null)}>Cancel</Button>
                <Button type="submit" disabled={updateDeptMutation.isPending}>
                  {updateDeptMutation.isPending && <Spinner className="mr-2" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Department Confirm */}
      <Dialog open={!!deleteDeptConfirm} onOpenChange={() => setDeleteDeptConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDeptConfirm?.name}"? 
              If this department has been used in any records, it will be deactivated instead of deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDeptConfirm(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteDeptConfirm && deleteDeptMutation.mutate(deleteDeptConfirm.id)}
              disabled={deleteDeptMutation.isPending}
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

interface OutletCardProps {
  outlet: Outlet;
  clientDepartments: Department[];
  outletDepartments: Department[];
  onAddDept: () => void;
  onEditDept: (dept: Department) => void;
  onDeleteDept: (dept: Department) => void;
  onUpdateDept: (id: string, data: Partial<Department>) => void;
  onUpdateOutlet: (id: string, data: Partial<Outlet>) => void;
  onToggleDeptLink: (departmentId: string, isActive: boolean) => void;
}

function OutletCard({ 
  outlet, 
  clientDepartments, 
  outletDepartments, 
  onAddDept, 
  onEditDept, 
  onDeleteDept, 
  onUpdateDept,
  onUpdateOutlet,
  onToggleDeptLink 
}: OutletCardProps) {
  const departmentMode = outlet.departmentMode || "inherit_only";
  const showInherited = departmentMode === "inherit_only" || departmentMode === "inherit_add";
  const showOutletDepts = departmentMode === "outlet_only" || departmentMode === "inherit_add";

  const { data: deptLinks = [] } = useQuery({
    queryKey: ["outlet-dept-links", outlet.id],
    queryFn: () => departmentsApi.getOutletLinks(outlet.id),
  });

  const linkMap = new Map(deptLinks.map(l => [l.departmentId, l.isActive]));

  return (
    <div className="bg-card rounded-lg border p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{outlet.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Select 
            value={departmentMode} 
            onValueChange={(value) => onUpdateOutlet(outlet.id, { departmentMode: value })}
          >
            <SelectTrigger className="h-7 text-xs w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENT_MODES.map(mode => (
                <SelectItem key={mode.value} value={mode.value}>
                  <div>
                    <div className="font-medium">{mode.label}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showOutletDepts && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1 h-7 text-xs"
              onClick={onAddDept}
            >
              <Plus className="h-3 w-3" />
              Add Dept
            </Button>
          )}
        </div>
      </div>

      <div className="ml-6 space-y-2">
        {showInherited && clientDepartments.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium mb-1">Inherited from Client:</p>
            {clientDepartments.filter(d => d.status === "active").map((dept) => {
              const isActive = linkMap.has(dept.id) ? linkMap.get(dept.id) : true;
              return (
                <div 
                  key={dept.id} 
                  className={cn(
                    "flex items-center justify-between py-1.5 px-2 rounded group",
                    isActive ? "bg-blue-50/50 dark:bg-blue-900/10" : "bg-gray-50 dark:bg-gray-800/50 opacity-60"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <FolderTree className="h-3 w-3 text-blue-500" />
                    <span className="text-sm">{dept.name}</span>
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      Client
                    </Badge>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={(checked) => onToggleDeptLink(dept.id, checked)}
                    className="h-4 w-8"
                  />
                </div>
              );
            })}
          </div>
        )}

        {showOutletDepts && (
          <div className="space-y-1">
            {(showInherited && clientDepartments.length > 0) && (
              <p className="text-xs text-muted-foreground font-medium mb-1 mt-2">Outlet-Specific:</p>
            )}
            {outletDepartments.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">
                {departmentMode === "outlet_only" 
                  ? "No outlet departments yet. Click 'Add Dept' to create one."
                  : "No additional outlet-specific departments."}
              </p>
            ) : (
              outletDepartments.map((dept) => (
                <div 
                  key={dept.id} 
                  className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50 group hover:bg-muted"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{dept.name}</span>
                    <Badge variant="outline" className={cn(
                      "text-xs font-normal",
                      dept.status === "active" 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                        : "bg-gray-50 text-gray-500 border-gray-200"
                    )}>
                      {dept.status || "active"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditDept(dept)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => {
                        const newStatus = dept.status === "active" ? "inactive" : "active";
                        onUpdateDept(dept.id, { status: newStatus });
                      }}
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
                      onClick={() => onDeleteDept(dept)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!showInherited && !showOutletDepts && (
          <p className="text-xs text-muted-foreground italic">No departments configured.</p>
        )}
      </div>
    </div>
  );
}

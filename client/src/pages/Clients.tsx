import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, MoreHorizontal, Building2, Trash2, Edit, ChevronDown, ChevronRight, Layers, PauseCircle, PlayCircle, FolderTree, AlertTriangle, RefreshCw, Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsApi, categoriesApi, departmentsApi, Client, Category, Department } from "@/lib/api";
import { useCachedQuery } from "@/lib/useCachedQuery";
import { useNetworkStatus } from "@/lib/network-status";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorCard } from "@/components/ui/error-card";
import { format } from "date-fns";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Clients() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirmClient, setDeleteConfirmClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  
  const [createCategoryDialogOpen, setCreateCategoryDialogOpen] = useState(false);
  const [selectedClientForCategory, setSelectedClientForCategory] = useState<Client | null>(null);
  
  const [createDeptDialogOpen, setCreateDeptDialogOpen] = useState(false);
  const [bulkDeptInput, setBulkDeptInput] = useState("");
  const [selectedClientForDept, setSelectedClientForDept] = useState<Client | null>(null);
  const [selectedCategoryForDept, setSelectedCategoryForDept] = useState<string | null>(null);
  
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deleteDeptConfirm, setDeleteDeptConfirm] = useState<Department | null>(null);
  const [suspendDeptDialog, setSuspendDeptDialog] = useState<Department | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState<Category | null>(null);
  const [deleteCategoryAck, setDeleteCategoryAck] = useState(false);
  const [showCategoryRequiredDialog, setShowCategoryRequiredDialog] = useState(false);

  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();

  const { 
    data: clients, 
    cachedData: cachedClients,
    isLoading, 
    error,
    refetch,
    isUsingCache: clientsUsingCache,
    lastUpdated: clientsLastUpdated
  } = useCachedQuery(
    ["clients"],
    clientsApi.getAll,
    { cacheEndpoint: "clients" }
  );

  const { data: expandedCategories = [] } = useQuery({
    queryKey: ["categories", expandedClientId],
    queryFn: () => expandedClientId ? categoriesApi.getByClient(expandedClientId) : Promise.resolve([]),
    enabled: !!expandedClientId,
  });

  const { data: expandedDepartments = [] } = useQuery({
    queryKey: ["departments", expandedClientId],
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

  const createCategoryMutation = useMutation({
    mutationFn: (data: { clientId: string; name: string }) => categoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", expandedClientId] });
      setCreateCategoryDialogOpen(false);
      setSelectedClientForCategory(null);
      toast.success("Category created successfully");
    },
    onError: () => {
      toast.error("Failed to create category");
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => categoriesApi.update(id, { name }),
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: ["categories", expandedClientId] });
      const previousCategories = queryClient.getQueryData<Category[]>(["categories", expandedClientId]);
      queryClient.setQueryData<Category[]>(["categories", expandedClientId], (old) =>
        old?.map((cat) => (cat.id === id ? { ...cat, name } : cat)) || []
      );
      return { previousCategories };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setEditingCategoryId(null);
      setEditingCategoryName("");
      toast.success("Category updated");
    },
    onError: (error: any, variables, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(["categories", expandedClientId], context.previousCategories);
      }
      toast.error(error.message || "Failed to update category");
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setDeleteCategoryConfirm(null);
      setDeleteCategoryAck(false);
      toast.success("Category deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete category");
    },
  });

  const createDeptMutation = useMutation({
    mutationFn: (data: { clientId: string; name: string; categoryId?: string }) => 
      departmentsApi.create(data.clientId, { name: data.name, categoryId: data.categoryId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", expandedClientId] });
      setCreateDeptDialogOpen(false);
      setSelectedClientForDept(null);
      toast.success("Department created successfully");
    },
    onError: () => {
      toast.error("Failed to create department");
    },
  });

  const bulkCreateDeptMutation = useMutation({
    mutationFn: (data: { departments: string[]; clientId: string; categoryId?: string }) => 
      departmentsApi.createBulk(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["departments", expandedClientId] });
      setBulkDeptInput("");
      toast.success(`${created.length} departments created successfully`);
    },
    onError: () => {
      toast.error("Failed to create departments");
    },
  });

  const updateDeptMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; categoryId?: string | null; status?: string } }) => departmentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", expandedClientId] });
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
      queryClient.invalidateQueries({ queryKey: ["departments", expandedClientId] });
      setDeleteDeptConfirm(null);
      toast.success("Department deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete department");
    },
  });

  const suspendDeptMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) => 
      departmentsApi.update(id, { status, suspendReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", expandedClientId] });
      setSuspendDeptDialog(null);
      setSuspendReason("");
      toast.success("Department status updated");
    },
    onError: () => {
      toast.error("Failed to update department status");
    },
  });

  const filteredClients = clients?.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (clientId: string) => {
    setExpandedClientId(expandedClientId === clientId ? null : clientId);
  };

  const getDepartmentsByCategory = (categoryId: string | null) => {
    return expandedDepartments.filter(d => d.categoryId === categoryId);
  };

  const uncategorizedDepartments = expandedDepartments.filter(d => !d.categoryId);

  if (isLoading && !clients) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
            <p className="text-muted-foreground">Manage clients, categories, and departments/Sales Outlets</p>
          </div>
        </div>
        <TableSkeleton rows={5} />
      </div>
    );
  }

  if (error && !clients && !cachedClients) {
    return (
      <ErrorCard
        title="Failed to load clients"
        message="We couldn't load your clients. Please try again."
        onRetry={() => refetch()}
        isOffline={!isOnline}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
            {clientsUsingCache && (
              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                <Clock className="h-3 w-3 mr-1" />
                Cached
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">Manage clients, categories, and departments/Sales Outlets</p>
            {clientsUsingCache && clientsLastUpdated && (
              <span className="text-xs text-amber-600">Last updated {clientsLastUpdated}</span>
            )}
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-client">
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-clients"
          />
        </div>
      </div>
      {!filteredClients || filteredClients.length === 0 ? (
        <Empty>
          <EmptyMedia>
            <Building2 className="h-16 w-16 text-muted-foreground" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No clients found</EmptyTitle>
            <EmptyDescription>
              {searchTerm ? "Try adjusting your search" : "Get started by creating your first client"}
            </EmptyDescription>
          </EmptyHeader>
          {!searchTerm && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          )}
        </Empty>
      ) : (
        <div className="space-y-3">
          {filteredClients.map((client) => (
            <Collapsible
              key={client.id}
              open={expandedClientId === client.id}
              onOpenChange={() => toggleExpand(client.id)}
            >
              <Card className="overflow-hidden">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expandedClientId === client.id ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{client.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            Created {format(new Date(client.createdAt), "MMM d, yyyy")}
                          </p>
                        </div>
                        <Badge variant={client.status === "active" ? "default" : "secondary"}>
                          {client.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-menu-client-${client.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingClient(client)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Client
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setDeleteConfirmClient(client)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Client
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="border-t pt-4">
                    <Tabs defaultValue="departments">
                      <TabsList>
                        <TabsTrigger value="departments">
                          <Layers className="mr-2 h-4 w-4" />
                          Departments ({expandedDepartments.length})
                        </TabsTrigger>
                        <TabsTrigger value="categories">
                          <FolderTree className="mr-2 h-4 w-4" />
                          Categories ({expandedCategories.length})
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="departments" className="mt-4">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm text-muted-foreground">A Department outlet refers to a specific point of sale or service area within e.g (a hotel or restaurant group) that generates sales/revenue by providing food, beverages, or other specialized services.</p>
                          <Button 
                            size="sm" 
                            onClick={() => {
                              // Check if client has at least one category before allowing department creation
                              if (!expandedCategories || expandedCategories.length === 0) {
                                setSelectedClientForCategory(client);
                                setShowCategoryRequiredDialog(true);
                                return;
                              }
                              setSelectedClientForDept(client);
                              setCreateDeptDialogOpen(true);
                            }}
                          >
                            <Plus className="mr-2 h-3 w-3" />
                            Add Department
                          </Button>
                        </div>
                        
                        {expandedDepartments.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No departments yet. Add departments to start auditing.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {expandedCategories.map((category) => {
                              const catDepts = getDepartmentsByCategory(category.id);
                              if (catDepts.length === 0) return null;
                              
                              return (
                                <div key={category.id} className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <FolderTree className="h-4 w-4" />
                                    {category.name}
                                  </div>
                                  <div className="grid gap-2 pl-6">
                                    {catDepts.map((dept) => (
                                      <DepartmentRow 
                                        key={dept.id} 
                                        dept={dept} 
                                        onEdit={() => setEditingDepartment(dept)}
                                        onDelete={() => setDeleteDeptConfirm(dept)}
                                        onSuspend={() => setSuspendDeptDialog(dept)}
                                      />
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                            
                            {uncategorizedDepartments.length > 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                  <Layers className="h-4 w-4" />
                                  Uncategorized
                                </div>
                                <div className="grid gap-2 pl-6">
                                  {uncategorizedDepartments.map((dept) => (
                                    <DepartmentRow 
                                      key={dept.id} 
                                      dept={dept} 
                                      onEdit={() => setEditingDepartment(dept)}
                                      onDelete={() => setDeleteDeptConfirm(dept)}
                                      onSuspend={() => setSuspendDeptDialog(dept)}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="categories" className="mt-4">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm text-muted-foreground">Categories serve as optional grouping labels for departments and outlets to facilitate the efficient separation and organization of items within the Inventory Management page. Create before proceeding to Inventory & Purchases</p>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedClientForCategory(client);
                              setCreateCategoryDialogOpen(true);
                            }}
                          >
                            <Plus className="mr-2 h-3 w-3" />
                            Add Category
                          </Button>
                        </div>
                        
                        {expandedCategories.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No categories yet. Categories help organize departments.
                          </div>
                        ) : (
                          <div className="grid gap-2">
                            {expandedCategories.map((category) => (
                              <div 
                                key={category.id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                                data-testid={`category-row-${category.id}`}
                              >
                                <div className="flex items-center gap-3">
                                  <FolderTree className="h-4 w-4 text-muted-foreground" />
                                  {editingCategoryId === category.id ? (
                                    <Input
                                      value={editingCategoryName}
                                      onChange={(e) => setEditingCategoryName(e.target.value.toUpperCase())}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          const trimmed = editingCategoryName.trim();
                                          if (trimmed && trimmed !== category.name) {
                                            updateCategoryMutation.mutate({ id: category.id, name: trimmed });
                                          } else {
                                            setEditingCategoryId(null);
                                            setEditingCategoryName("");
                                          }
                                        } else if (e.key === "Escape") {
                                          setEditingCategoryId(null);
                                          setEditingCategoryName("");
                                        }
                                      }}
                                      onBlur={() => {
                                        const trimmed = editingCategoryName.trim();
                                        if (trimmed && trimmed !== category.name) {
                                          updateCategoryMutation.mutate({ id: category.id, name: trimmed });
                                        } else {
                                          setEditingCategoryId(null);
                                          setEditingCategoryName("");
                                        }
                                      }}
                                      autoFocus
                                      className="h-7 w-48"
                                      data-testid={`input-edit-category-${category.id}`}
                                    />
                                  ) : (
                                    <span 
                                      className="font-medium cursor-pointer hover:text-primary"
                                      onClick={() => {
                                        setEditingCategoryId(category.id);
                                        setEditingCategoryName(category.name);
                                      }}
                                      data-testid={`text-category-name-${category.id}`}
                                    >
                                      {category.name}
                                    </span>
                                  )}
                                  <Badge variant="secondary" className="text-xs">
                                    {getDepartmentsByCategory(category.id).length} departments
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      setEditingCategoryId(category.id);
                                      setEditingCategoryName(category.name);
                                    }}
                                    data-testid={`button-edit-category-${category.id}`}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => setDeleteCategoryConfirm(category)}
                                    data-testid={`button-delete-category-${category.id}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Client</DialogTitle>
            <DialogDescription>Add a new client to the platform</DialogDescription>
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
                  maxLength={20}
                  onChange={(e) => e.target.value = e.target.value.toUpperCase()}
                  required 
                  data-testid="input-client-name" 
                />
                <p className="text-xs text-muted-foreground">
                  Client names will be saved as UPPERCASE. Maximum 20 characters.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-client">
                {createMutation.isPending ? "Creating..." : "Create Client"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            updateMutation.mutate({ 
              id: editingClient!.id, 
              data: { name: formData.get("name") as string } 
            });
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Client Name</Label>
                <Input 
                  id="edit-name" 
                  name="name" 
                  defaultValue={editingClient?.name} 
                  maxLength={20}
                  onChange={(e) => e.target.value = e.target.value.toUpperCase()}
                  required 
                />
                <p className="text-xs text-muted-foreground">
                  Client names will be saved as UPPERCASE. Maximum 20 characters.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingClient(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleteConfirmClient} onOpenChange={() => setDeleteConfirmClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirmClient?.name}"? This will also delete all associated categories, departments, and records. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmClient(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirmClient && deleteMutation.mutate(deleteConfirmClient.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Category Required Dialog - shown when trying to add department without categories */}
      <Dialog open={showCategoryRequiredDialog} onOpenChange={setShowCategoryRequiredDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Category Required
            </DialogTitle>
            <DialogDescription>
              Create at least 1 CATEGORY before adding Departments. Categories help group Departments for inventory and reporting.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowCategoryRequiredDialog(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={() => {
                setShowCategoryRequiredDialog(false);
                setCreateCategoryDialogOpen(true);
              }}
            >
              Create Category Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={createCategoryDialogOpen} onOpenChange={setCreateCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>Add a new category to organize departments</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            createCategoryMutation.mutate({ 
              clientId: selectedClientForCategory!.id,
              name: formData.get("name") as string 
            });
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Category Name</Label>
                <Input 
                  id="category-name" 
                  name="name" 
                  placeholder="e.g., F&B, FRONT DESK, ADMIN" 
                  onChange={(e) => e.target.value = e.target.value.toUpperCase()}
                  required 
                />
                <p className="text-xs text-muted-foreground">
                  Category names will be saved as UPPERCASE.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateCategoryDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCategoryMutation.isPending}>
                {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={createDeptDialogOpen} onOpenChange={setCreateDeptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Departments</DialogTitle>
            <DialogDescription>Add departments to {selectedClientForDept?.name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const names = bulkDeptInput.split("\n").map(n => n.trim()).filter(n => n.length > 0);
            if (names.length === 0) return;
            
            bulkCreateDeptMutation.mutate({
              departments: names,
              clientId: selectedClientForDept!.id,
              categoryId: selectedCategoryForDept || undefined,
            });
          }}>
            <div className="space-y-4 py-4">
              {expandedCategories.length > 0 && (
                <div className="space-y-2">
                  <Label>Category (Optional)</Label>
                  <Select value={selectedCategoryForDept || "none"} onValueChange={(v) => setSelectedCategoryForDept(v === "none" ? null : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Category</SelectItem>
                      {expandedCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="bulk-depts">Department Names</Label>
                <Textarea 
                  id="bulk-depts"
                  value={bulkDeptInput}
                  onChange={(e) => setBulkDeptInput(e.target.value.toUpperCase())}
                  placeholder="Enter department names, one per line:&#10;KITCHEN&#10;BAR&#10;RESTAURANT FLOOR"
                  rows={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter one department name per line. Names will be saved as UPPERCASE and end with "OUTLET" automatically.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setCreateDeptDialogOpen(false);
                setBulkDeptInput("");
                setSelectedCategoryForDept(null);
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={bulkCreateDeptMutation.isPending}>
                {bulkCreateDeptMutation.isPending ? "Creating..." : "Create Departments"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editingDepartment} onOpenChange={() => setEditingDepartment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            updateDeptMutation.mutate({ 
              id: editingDepartment!.id, 
              data: { name: formData.get("name") as string } 
            });
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-dept-name">Department Name</Label>
                <Input 
                  id="edit-dept-name" 
                  name="name" 
                  defaultValue={editingDepartment?.name} 
                  onChange={(e) => e.target.value = e.target.value.toUpperCase()}
                  required 
                />
                <p className="text-xs text-muted-foreground">
                  Names will be saved as UPPERCASE and end with "OUTLET" automatically.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingDepartment(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateDeptMutation.isPending}>
                {updateDeptMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleteDeptConfirm} onOpenChange={() => setDeleteDeptConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDeptConfirm?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDeptConfirm(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteDeptConfirm && deleteDeptMutation.mutate(deleteDeptConfirm.id)}
              disabled={deleteDeptMutation.isPending}
            >
              {deleteDeptMutation.isPending ? "Deleting..." : "Delete Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!suspendDeptDialog} onOpenChange={() => {
        setSuspendDeptDialog(null);
        setSuspendReason("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {suspendDeptDialog?.status === "active" ? "Suspend Department" : "Reactivate Department"}
            </DialogTitle>
            <DialogDescription>
              {suspendDeptDialog?.status === "active" 
                ? `Suspend "${suspendDeptDialog?.name}"? It will no longer appear in active selections.`
                : `Reactivate "${suspendDeptDialog?.name}"? It will be available for use again.`
              }
            </DialogDescription>
          </DialogHeader>
          {suspendDeptDialog?.status === "active" && (
            <div className="space-y-2 py-4">
              <Label htmlFor="suspend-reason">Reason for suspension</Label>
              <Textarea 
                id="suspend-reason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Optional: Enter reason for suspending this department"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSuspendDeptDialog(null);
              setSuspendReason("");
            }}>
              Cancel
            </Button>
            <Button 
              variant={suspendDeptDialog?.status === "active" ? "destructive" : "default"}
              onClick={() => {
                if (!suspendDeptDialog) return;
                suspendDeptMutation.mutate({
                  id: suspendDeptDialog.id,
                  status: suspendDeptDialog.status === "active" ? "suspended" : "active",
                  reason: suspendReason || undefined,
                });
              }}
              disabled={suspendDeptMutation.isPending}
            >
              {suspendDeptMutation.isPending 
                ? "Updating..." 
                : suspendDeptDialog?.status === "active" ? "Suspend" : "Reactivate"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleteCategoryConfirm} onOpenChange={(open) => {
        if (!open) {
          setDeleteCategoryConfirm(null);
          setDeleteCategoryAck(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Category
            </DialogTitle>
            <DialogDescription>
              You are about to delete the category "{deleteCategoryConfirm?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              <p className="font-medium mb-2">Warning:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Departments in this category will become uncategorized</li>
                <li>Historical records will retain the category reference</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="delete-ack" 
                checked={deleteCategoryAck}
                onCheckedChange={(checked) => setDeleteCategoryAck(checked === true)}
                data-testid="checkbox-delete-category-ack"
              />
              <label htmlFor="delete-ack" className="text-sm cursor-pointer">
                I understand and want to proceed with deletion
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteCategoryConfirm(null);
              setDeleteCategoryAck(false);
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteCategoryConfirm && deleteCategoryMutation.mutate(deleteCategoryConfirm.id)}
              disabled={!deleteCategoryAck || deleteCategoryMutation.isPending}
              data-testid="button-confirm-delete-category"
            >
              {deleteCategoryMutation.isPending ? "Deleting..." : "Delete Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DepartmentRow({ 
  dept, 
  onEdit, 
  onDelete, 
  onSuspend 
}: { 
  dept: Department; 
  onEdit: () => void; 
  onDelete: () => void; 
  onSuspend: () => void;
}) {
  return (
    <div className={cn(
      "flex items-center justify-between p-3 border rounded-lg",
      dept.status !== "active" && "opacity-60 bg-muted/30"
    )}>
      <div className="flex items-center gap-3">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{dept.name}</span>
        <Badge variant={dept.status === "active" ? "default" : "secondary"}>
          {dept.status}
        </Badge>
        {dept.suspendReason && (
          <span className="text-xs text-muted-foreground">({dept.suspendReason})</span>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSuspend}>
            {dept.status === "active" ? (
              <>
                <PauseCircle className="mr-2 h-4 w-4" />
                Suspend
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                Reactivate
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

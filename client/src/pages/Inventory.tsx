import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Filter, Search, Package, Users, Truck, Pencil, Trash2, MoreHorizontal, Warehouse, Building, ChevronDown, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsApi, itemsApi, suppliersApi, storeNamesApi, inventoryDepartmentsApi, grnApi, Item, Supplier, StoreName, InventoryDepartment, GoodsReceivedNote } from "@/lib/api";
import { format } from "date-fns";
import { Calendar as CalendarIcon, FileText, Upload, ExternalLink } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/lib/client-context";

export default function Inventory() {
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [createSupplierOpen, setCreateSupplierOpen] = useState(false);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [editSupplierOpen, setEditSupplierOpen] = useState(false);
  const [deleteItemOpen, setDeleteItemOpen] = useState(false);
  const [deleteSupplierOpen, setDeleteSupplierOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  
  const [createStoreNameOpen, setCreateStoreNameOpen] = useState(false);
  const [editStoreNameOpen, setEditStoreNameOpen] = useState(false);
  const [deleteStoreNameOpen, setDeleteStoreNameOpen] = useState(false);
  const [selectedStoreName, setSelectedStoreName] = useState<StoreName | null>(null);
  const [storeNameMode, setStoreNameMode] = useState<"link" | "create">("link");
  const [selectedDeptToLink, setSelectedDeptToLink] = useState<string | null>(null);
  
  const [createInvDeptOpen, setCreateInvDeptOpen] = useState(false);
  const [editInvDeptOpen, setEditInvDeptOpen] = useState(false);
  const [deleteInvDeptOpen, setDeleteInvDeptOpen] = useState(false);
  const [selectedInvDept, setSelectedInvDept] = useState<InventoryDepartment | null>(null);
  
  const [createGrnOpen, setCreateGrnOpen] = useState(false);
  const [editGrnOpen, setEditGrnOpen] = useState(false);
  const [deleteGrnOpen, setDeleteGrnOpen] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState<GoodsReceivedNote | null>(null);
  const [grnFilterDate, setGrnFilterDate] = useState<Date | undefined>(undefined);
  
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const toggleCategory = (category: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setExpandedCategories(newSet);
  };

  const queryClient = useQueryClient();
  const { clients, selectedClientId: contextClientId, selectedClient, departments } = useClientContext();

  const selectedClientId = contextClientId || clients?.[0]?.id;

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["items", selectedClientId],
    queryFn: () => selectedClientId ? itemsApi.getByClient(selectedClientId) : Promise.resolve([]),
    enabled: !!selectedClientId,
  });

  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ["suppliers", selectedClientId],
    queryFn: () => selectedClientId ? suppliersApi.getByClient(selectedClientId) : Promise.resolve([]),
    enabled: !!selectedClientId,
  });

  const createItemMutation = useMutation({
    mutationFn: (data: Partial<Item>) => itemsApi.create({ ...data, clientId: selectedClientId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      setCreateItemOpen(false);
      toast.success("Item created successfully");
    },
    onError: () => {
      toast.error("Failed to create item");
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Item> }) => itemsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      setEditItemOpen(false);
      setSelectedItem(null);
      toast.success("Item updated successfully");
    },
    onError: () => {
      toast.error("Failed to update item");
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => itemsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      setDeleteItemOpen(false);
      setSelectedItem(null);
      toast.success("Item deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete item");
    },
  });

  const createSupplierMutation = useMutation({
    mutationFn: (data: Partial<Supplier>) => suppliersApi.create({ ...data, clientId: selectedClientId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setCreateSupplierOpen(false);
      toast.success("Supplier created successfully");
    },
    onError: () => {
      toast.error("Failed to create supplier");
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Supplier> }) => suppliersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setEditSupplierOpen(false);
      setSelectedSupplier(null);
      toast.success("Supplier updated successfully");
    },
    onError: () => {
      toast.error("Failed to update supplier");
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: (id: string) => suppliersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setDeleteSupplierOpen(false);
      setSelectedSupplier(null);
      toast.success("Supplier deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete supplier");
    },
  });

  const { data: storeNames, isLoading: storeNamesLoading } = useQuery({
    queryKey: ["store-names"],
    queryFn: () => storeNamesApi.getAll(),
  });

  const { data: inventoryDepts, isLoading: invDeptsLoading } = useQuery({
    queryKey: ["inventory-departments", selectedClientId],
    queryFn: () => selectedClientId ? inventoryDepartmentsApi.getByClient(selectedClientId) : Promise.resolve([]),
    enabled: !!selectedClientId,
  });

  const createStoreNameMutation = useMutation({
    mutationFn: (data: { name: string }) => storeNamesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-names"] });
      setCreateStoreNameOpen(false);
      setSelectedDeptToLink(null);
      setStoreNameMode("link");
      toast.success("SRD created successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to create store name");
    },
  });

  const updateStoreNameMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; status?: string } }) => storeNamesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-names"] });
      setEditStoreNameOpen(false);
      setSelectedStoreName(null);
      toast.success("SRD updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update store name");
    },
  });

  const deleteStoreNameMutation = useMutation({
    mutationFn: (id: string) => storeNamesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-names"] });
      setDeleteStoreNameOpen(false);
      setSelectedStoreName(null);
      toast.success("SRD deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete store name");
    },
  });

  const createInvDeptMutation = useMutation({
    mutationFn: (data: { storeNameId: string; inventoryType: string }) => 
      inventoryDepartmentsApi.create(selectedClientId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-departments"] });
      setCreateInvDeptOpen(false);
      toast.success("Inventory department created successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to create inventory department");
    },
  });

  const updateInvDeptMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { storeNameId?: string; inventoryType?: string; status?: string } }) => 
      inventoryDepartmentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-departments"] });
      setEditInvDeptOpen(false);
      setSelectedInvDept(null);
      toast.success("Inventory department updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update inventory department");
    },
  });

  const deleteInvDeptMutation = useMutation({
    mutationFn: (id: string) => inventoryDepartmentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-departments"] });
      setDeleteInvDeptOpen(false);
      setSelectedInvDept(null);
      toast.success("Inventory department deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete inventory department");
    },
  });

  const { data: grns, isLoading: grnsLoading } = useQuery({
    queryKey: ["grn", selectedClientId, grnFilterDate?.toISOString()],
    queryFn: () => selectedClientId ? grnApi.getByClient(selectedClientId, grnFilterDate?.toISOString()) : Promise.resolve([]),
    enabled: !!selectedClientId,
  });

  const createGrnMutation = useMutation({
    mutationFn: (data: FormData) => grnApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grn"] });
      setCreateGrnOpen(false);
      toast.success("GRN created successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to create GRN");
    },
  });

  const updateGrnMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => grnApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grn"] });
      setEditGrnOpen(false);
      setSelectedGrn(null);
      toast.success("GRN updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update GRN");
    },
  });

  const deleteGrnMutation = useMutation({
    mutationFn: (id: string) => grnApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grn"] });
      setDeleteGrnOpen(false);
      setSelectedGrn(null);
      toast.success("GRN deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete GRN");
    },
  });

  const handleEditGrn = (grn: GoodsReceivedNote) => {
    setSelectedGrn(grn);
    setEditGrnOpen(true);
  };

  const handleDeleteGrn = (grn: GoodsReceivedNote) => {
    setSelectedGrn(grn);
    setDeleteGrnOpen(true);
  };

  const getStoreNameById = (id: string) => storeNames?.find(sn => sn.id === id);

  const handleEditItem = (item: Item) => {
    setSelectedItem(item);
    setEditItemOpen(true);
  };

  const handleDeleteItem = (item: Item) => {
    setSelectedItem(item);
    setDeleteItemOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setEditSupplierOpen(true);
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDeleteSupplierOpen(true);
  };

  // Group items by category for display
  const itemsByCategory = useMemo(() => {
    if (!items || items.length === 0) return [];
    const sortedItems = [...items].sort((a, b) => a.category.localeCompare(b.category));
    const groups: Record<string, Item[]> = {};
    sortedItems.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  if (!clients || clients.length === 0) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto">
        <div>
          <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">Inventory Management</h1>
          <p className="text-muted-foreground">Manage items and suppliers</p>
        </div>
        <Empty className="min-h-[300px] border" data-testid="empty-no-clients">
          <EmptyMedia variant="icon">
            <Package className="h-6 w-6" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No clients available</EmptyTitle>
            <EmptyDescription>
              Create a client first to manage inventory items and suppliers.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">Inventory Management</h1>
          <p className="text-muted-foreground">Manage Registered items, suppliers and goods received note for {selectedClient?.name || clients[0]?.name || "All Clients"}</p>
        </div>
      </div>

      <Tabs defaultValue="items" className="w-full">
        <TabsList className="grid w-full max-w-[750px] grid-cols-5">
          <TabsTrigger value="items" data-testid="tab-items">
            <Package className="h-4 w-4 mr-2" />
            Reg. Items
          </TabsTrigger>
          <TabsTrigger value="suppliers" data-testid="tab-suppliers">
            <Truck className="h-4 w-4 mr-2" />
            Suppliers
          </TabsTrigger>
          <TabsTrigger value="grn" data-testid="tab-grn">
            <FileText className="h-4 w-4 mr-2" />
            GRN
          </TabsTrigger>
          <TabsTrigger value="store-names" data-testid="tab-store-names" className="h-auto py-2 leading-tight text-center">
            <Building className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="whitespace-normal">SRD</span>
          </TabsTrigger>
          <TabsTrigger value="inv-departments" data-testid="tab-inv-departments">
            <Warehouse className="h-4 w-4 mr-2" />
            Inv. Depts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex gap-4 items-center flex-1">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 bg-muted/30" placeholder="Search items..." data-testid="input-search-items" />
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" data-testid="button-filter-items">
                    <Filter className="h-3 w-3" /> Filter
                  </Button>
                </div>
                <Dialog open={createItemOpen} onOpenChange={setCreateItemOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" data-testid="button-add-item">
                      <Plus className="h-4 w-4" /> Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Item</DialogTitle>
                      <DialogDescription>Add a new inventory item.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      createItemMutation.mutate({
                        name: formData.get("name") as string,
                        sku: formData.get("sku") as string || null,
                        category: formData.get("category") as string,
                        unit: formData.get("unit") as string,
                        purchaseUnit: formData.get("purchaseUnit") as string,
                        costPrice: formData.get("costPrice") as string,
                        sellingPrice: formData.get("sellingPrice") as string,
                        reorderLevel: parseInt(formData.get("reorderLevel") as string) || 0,
                        status: "active",
                      });
                    }}>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Item Name</Label>
                            <Input id="name" name="name" required data-testid="input-item-name" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="sku">SKU</Label>
                            <Input id="sku" name="sku" data-testid="input-item-sku" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Input id="category" name="category" required data-testid="input-item-category" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="unit">Unit</Label>
                            <Input id="unit" name="unit" required placeholder="e.g., pcs, kg, bottle" data-testid="input-item-unit" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="purchaseUnit">Purchase Unit</Label>
                          <Input id="purchaseUnit" name="purchaseUnit" required placeholder="e.g., box, carton" data-testid="input-item-purchase-unit" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="costPrice">Cost Price</Label>
                            <Input id="costPrice" name="costPrice" type="number" step="0.01" required data-testid="input-item-cost" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="sellingPrice">Selling Price</Label>
                            <Input id="sellingPrice" name="sellingPrice" type="number" step="0.01" required data-testid="input-item-price" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reorderLevel">Reorder Level</Label>
                          <Input id="reorderLevel" name="reorderLevel" type="number" defaultValue="0" data-testid="input-item-reorder" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setCreateItemOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createItemMutation.isPending} data-testid="button-submit-item">
                          {createItemMutation.isPending && <Spinner className="mr-2" />}
                          Create Item
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {itemsLoading ? (
                <div className="flex items-center justify-center py-12" data-testid="loading-items">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : !items || items.length === 0 ? (
                <Empty className="py-12" data-testid="empty-items">
                  <EmptyMedia variant="icon">
                    <Package className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>No items yet</EmptyTitle>
                    <EmptyDescription>Add your first inventory item to get started.</EmptyDescription>
                  </EmptyHeader>
                  <Button className="gap-2" onClick={() => setCreateItemOpen(true)} data-testid="button-add-first-item">
                    <Plus className="h-4 w-4" /> Add First Item
                  </Button>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Purchase Unit</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Cost Price</TableHead>
                      <TableHead className="text-right">Selling Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsByCategory.map(([category, categoryItems]) => {
                      const isExpanded = expandedCategories.has(category);
                      return (
                        <React.Fragment key={`cat-group-${category}`}>
                          <TableRow 
                            className="bg-black hover:bg-black/90 cursor-pointer transition-colors"
                            onClick={() => toggleCategory(category)}
                            data-testid={`category-header-${category}`}
                          >
                            <TableCell colSpan={7} className="font-semibold text-sm py-2 text-white">
                              <div className="flex items-center gap-2">
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                {category} ({categoryItems.length})
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && categoryItems.map((item) => (
                            <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                              <TableCell className="font-medium" data-testid={`text-item-name-${item.id}`}>{item.name}</TableCell>
                              <TableCell className="font-mono text-sm text-muted-foreground">{item.sku || "-"}</TableCell>
                              <TableCell>{item.purchaseUnit || "-"}</TableCell>
                              <TableCell>{item.unit}</TableCell>
                              <TableCell className="text-right font-mono">₦{Number(item.costPrice).toLocaleString()}</TableCell>
                              <TableCell className="text-right font-mono">₦{Number(item.sellingPrice).toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn(
                                  item.status === "active" 
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                    : "bg-muted text-muted-foreground"
                                )} data-testid={`badge-item-status-${item.id}`}>
                                  {item.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-item-actions-${item.id}`}>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditItem(item)} data-testid={`button-edit-item-${item.id}`}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Update
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteItem(item)} 
                                      className="text-red-600"
                                      data-testid={`button-delete-item-${item.id}`}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="mt-6">
          <Card>
            <CardHeader className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex gap-4 items-center flex-1">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 bg-muted/30" placeholder="Search suppliers..." data-testid="input-search-suppliers" />
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" data-testid="button-filter-suppliers">
                    <Filter className="h-3 w-3" /> Filter
                  </Button>
                </div>
                <Dialog open={createSupplierOpen} onOpenChange={setCreateSupplierOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" data-testid="button-add-supplier">
                      <Plus className="h-4 w-4" /> Add Supplier
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Supplier</DialogTitle>
                      <DialogDescription>Add a new supplier to your network.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      createSupplierMutation.mutate({
                        name: formData.get("name") as string,
                        contactPerson: formData.get("contactPerson") as string || null,
                        phone: formData.get("phone") as string || null,
                        email: formData.get("email") as string || null,
                        address: formData.get("address") as string || null,
                        status: "active",
                      });
                    }}>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="supplierName">Supplier Name</Label>
                          <Input id="supplierName" name="name" required data-testid="input-supplier-name" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contactPerson">Contact Person</Label>
                          <Input id="contactPerson" name="contactPerson" data-testid="input-supplier-contact" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" name="phone" data-testid="input-supplier-phone" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" data-testid="input-supplier-email" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address">Address</Label>
                          <Input id="address" name="address" data-testid="input-supplier-address" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setCreateSupplierOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createSupplierMutation.isPending} data-testid="button-submit-supplier">
                          {createSupplierMutation.isPending && <Spinner className="mr-2" />}
                          Create Supplier
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {suppliersLoading ? (
                <div className="flex items-center justify-center py-12" data-testid="loading-suppliers">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : !suppliers || suppliers.length === 0 ? (
                <Empty className="py-12" data-testid="empty-suppliers">
                  <EmptyMedia variant="icon">
                    <Truck className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>No suppliers yet</EmptyTitle>
                    <EmptyDescription>Add your first supplier to manage procurement.</EmptyDescription>
                  </EmptyHeader>
                  <Button className="gap-2" onClick={() => setCreateSupplierOpen(true)} data-testid="button-add-first-supplier">
                    <Plus className="h-4 w-4" /> Add First Supplier
                  </Button>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact Person</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier) => (
                      <TableRow key={supplier.id} data-testid={`row-supplier-${supplier.id}`}>
                        <TableCell className="font-medium" data-testid={`text-supplier-name-${supplier.id}`}>{supplier.name}</TableCell>
                        <TableCell>{supplier.contactPerson || "-"}</TableCell>
                        <TableCell>{supplier.phone || "-"}</TableCell>
                        <TableCell>{supplier.email || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            supplier.status === "active" 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : "bg-muted text-muted-foreground"
                          )} data-testid={`badge-supplier-status-${supplier.id}`}>
                            {supplier.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-supplier-actions-${supplier.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditSupplier(supplier)} data-testid={`button-edit-supplier-${supplier.id}`}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Update
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteSupplier(supplier)} 
                                className="text-red-600"
                                data-testid={`button-delete-supplier-${supplier.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
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
        </TabsContent>

        {/* GRN Tab */}
        <TabsContent value="grn" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex gap-4 items-center flex-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[200px] justify-start text-left font-normal" data-testid="button-grn-date-filter">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {grnFilterDate ? format(grnFilterDate, "PPP") : "Filter by date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={grnFilterDate}
                        onSelect={setGrnFilterDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {grnFilterDate && (
                    <Button variant="ghost" size="sm" onClick={() => setGrnFilterDate(undefined)} data-testid="button-clear-grn-date">
                      Clear
                    </Button>
                  )}
                </div>
                <Dialog open={createGrnOpen} onOpenChange={setCreateGrnOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" data-testid="button-add-grn">
                      <Plus className="h-4 w-4" /> Add GRN
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create Goods Received Note</DialogTitle>
                      <DialogDescription>Record a new delivery from a supplier.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const formData = new FormData(form);
                      formData.append("clientId", selectedClientId!);
                      createGrnMutation.mutate(formData);
                    }}>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="grnSupplierName">Supplier Name</Label>
                          <Select name="supplierId" onValueChange={(v) => {
                            const supplier = suppliers?.find(s => s.id === v);
                            const form = document.getElementById("create-grn-form") as HTMLFormElement;
                            if (form && supplier) {
                              const input = form.querySelector('[name="supplierName"]') as HTMLInputElement;
                              if (input) input.value = supplier.name;
                            }
                          }}>
                            <SelectTrigger data-testid="select-grn-supplier">
                              <SelectValue placeholder="Select supplier (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              {suppliers?.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input name="supplierName" placeholder="Or enter supplier name manually" required data-testid="input-grn-supplier-name" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="grnDate">Date</Label>
                          <Input type="date" name="date" required data-testid="input-grn-date" defaultValue={format(new Date(), "yyyy-MM-dd")} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="grnInvoiceRef">Invoice Reference</Label>
                          <Input name="invoiceRef" required placeholder="e.g., INV-2024-001" data-testid="input-grn-invoice-ref" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="grnAmount">Amount</Label>
                          <Input type="number" step="0.01" name="amount" required placeholder="0.00" data-testid="input-grn-amount" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="grnStatus">Status</Label>
                          <Select name="status" defaultValue="pending">
                            <SelectTrigger data-testid="select-grn-status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="received">Received</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="grnEvidence">Evidence (Invoice/Receipt)</Label>
                          <div className="flex items-center gap-2">
                            <Input type="file" name="evidence" accept="image/*,application/pdf" className="flex-1" data-testid="input-grn-evidence" />
                          </div>
                          <p className="text-xs text-muted-foreground">Optional: Upload invoice or receipt image (JPEG, PNG, GIF, PDF)</p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setCreateGrnOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createGrnMutation.isPending} data-testid="button-submit-grn">
                          {createGrnMutation.isPending && <Spinner className="mr-2" />}
                          Create GRN
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {grnsLoading ? (
                <div className="flex items-center justify-center py-12" data-testid="loading-grn">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : !grns || grns.length === 0 ? (
                <Empty className="py-12" data-testid="empty-grn">
                  <EmptyMedia variant="icon">
                    <FileText className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>No goods received notes</EmptyTitle>
                    <EmptyDescription>Record your first GRN to track supplier deliveries.</EmptyDescription>
                  </EmptyHeader>
                  <Button className="gap-2" onClick={() => setCreateGrnOpen(true)} data-testid="button-add-first-grn">
                    <Plus className="h-4 w-4" /> Add First GRN
                  </Button>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Invoice Ref</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Evidence</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grns.map((grn) => (
                      <TableRow key={grn.id} data-testid={`row-grn-${grn.id}`}>
                        <TableCell data-testid={`text-grn-date-${grn.id}`}>{format(new Date(grn.date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="font-medium" data-testid={`text-grn-supplier-${grn.id}`}>{grn.supplierName}</TableCell>
                        <TableCell data-testid={`text-grn-invoice-${grn.id}`}>{grn.invoiceRef}</TableCell>
                        <TableCell className="text-right font-medium" data-testid={`text-grn-amount-${grn.id}`}>
                          {parseFloat(grn.amount).toLocaleString("en-NG", { style: "currency", currency: "NGN" })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            grn.status === "received" 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          )} data-testid={`badge-grn-status-${grn.id}`}>
                            {grn.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {grn.evidenceUrl ? (
                            <Button variant="ghost" size="sm" asChild data-testid={`button-view-evidence-${grn.id}`}>
                              <a href={grn.evidenceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                <ExternalLink className="h-4 w-4" />
                                {grn.evidenceFileName || "View"}
                              </a>
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-grn-actions-${grn.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditGrn(grn)} data-testid={`button-edit-grn-${grn.id}`}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Update
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteGrn(grn)} 
                                className="text-red-600"
                                data-testid={`button-delete-grn-${grn.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
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
        </TabsContent>

        {/* Store Names Tab */}
        <TabsContent value="store-names" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex gap-4 items-center flex-1">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 bg-muted/30" placeholder="Search store names..." data-testid="input-search-store-names" />
                  </div>
                </div>
                <Dialog open={createStoreNameOpen} onOpenChange={(open) => {
                    setCreateStoreNameOpen(open);
                    if (!open) {
                      setStoreNameMode("link");
                      setSelectedDeptToLink(null);
                    }
                  }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" data-testid="button-add-store-name">
                      <Plus className="h-4 w-4" /> Link/Create
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Link or Create Stock Reconciliation Department (SRD)</DialogTitle>
                      <DialogDescription>Select from registered departments or create a new SRD name.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={storeNameMode === "link" ? "default" : "outline"}
                          className="flex-1"
                          onClick={() => setStoreNameMode("link")}
                          data-testid="button-mode-link"
                        >
                          Link from Registered
                        </Button>
                        <Button
                          type="button"
                          variant={storeNameMode === "create" ? "default" : "outline"}
                          className="flex-1"
                          onClick={() => setStoreNameMode("create")}
                          data-testid="button-mode-create"
                        >
                          Create New
                        </Button>
                      </div>
                      
                      {storeNameMode === "link" ? (
                        <div className="space-y-2">
                          <Label>Select Registered Department</Label>
                          <Select value={selectedDeptToLink || ""} onValueChange={setSelectedDeptToLink}>
                            <SelectTrigger data-testid="select-dept-to-link">
                              <SelectValue placeholder="Choose a department" />
                            </SelectTrigger>
                            <SelectContent>
                              {departments?.filter(d => d.status === "active").map(dept => (
                                <SelectItem key={dept.id} value={dept.id}>
                                  {dept.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {(!departments || departments.length === 0) && (
                            <p className="text-xs text-muted-foreground">No departments registered for this client. Create departments in the Clients page first.</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="storeName">Stock Reconciliation Department (SRD) Name</Label>
                          <Input id="storeName" name="name" placeholder="e.g., Main Kitchen, Bar Area" data-testid="input-store-name" />
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setCreateStoreNameOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={createStoreNameMutation.isPending} data-testid="button-submit-store-name">
                        {createStoreNameMutation.isPending && <Spinner className="mr-2" />}
                        {storeNameMode === "link" ? "Link Department" : "Create SRD"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {storeNamesLoading ? (
                <div className="flex items-center justify-center py-12" data-testid="loading-store-names">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : !storeNames || storeNames.length === 0 ? (
                <Empty className="py-12" data-testid="empty-store-names">
                  <EmptyMedia variant="icon">
                    <Building className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>No Stock Reconciliation Departments (SRD) yet</EmptyTitle>
                    <EmptyDescription>Add SRDs to link with inventory departments.</EmptyDescription>
                  </EmptyHeader>
                  <Button className="gap-2" onClick={() => setCreateStoreNameOpen(true)} data-testid="button-add-first-store-name">
                    <Plus className="h-4 w-4" /> Add First SRD
                  </Button>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {storeNames.map((sn) => (
                      <TableRow key={sn.id} data-testid={`row-store-name-${sn.id}`}>
                        <TableCell className="font-medium" data-testid={`text-store-name-${sn.id}`}>{sn.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            sn.status === "active" 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : "bg-muted text-muted-foreground"
                          )} data-testid={`badge-store-name-status-${sn.id}`}>
                            {sn.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-store-name-actions-${sn.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedStoreName(sn); setEditStoreNameOpen(true); }} data-testid={`button-edit-store-name-${sn.id}`}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Update
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => { setSelectedStoreName(sn); setDeleteStoreNameOpen(true); }} 
                                className="text-red-600"
                                data-testid={`button-delete-store-name-${sn.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
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
        </TabsContent>

        {/* Inventory Departments Tab */}
        <TabsContent value="inv-departments" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex gap-4 items-center flex-1">
                  <CardDescription>
                    Inventory departments for: <strong>{selectedClient?.name || clients[0]?.name}</strong>
                  </CardDescription>
                </div>
                <Dialog open={createInvDeptOpen} onOpenChange={setCreateInvDeptOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" data-testid="button-add-inv-dept">
                      <Plus className="h-4 w-4" /> Add Inventory Dept
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Inventory Department</DialogTitle>
                      <DialogDescription>Link a Stock Reconciliation Department (SRD) to this client with an inventory type.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      createInvDeptMutation.mutate({
                        storeNameId: formData.get("storeNameId") as string,
                        inventoryType: formData.get("inventoryType") as string,
                      });
                    }}>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="storeNameId">Stock Reconciliation Department (SRD)</Label>
                          <Select name="storeNameId" required>
                            <SelectTrigger data-testid="select-store-name">
                              <SelectValue placeholder="Select an SRD" />
                            </SelectTrigger>
                            <SelectContent>
                              {storeNames?.filter(sn => sn.status === "active").map(sn => (
                                <SelectItem key={sn.id} value={sn.id}>{sn.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Create SRDs in the SRD tab first.</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="inventoryType">Inventory Type</Label>
                          <Select name="inventoryType" required>
                            <SelectTrigger data-testid="select-inventory-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MAIN_STORE">Main Store</SelectItem>
                              <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                              <SelectItem value="DEPARTMENT_STORE">Department Store</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Only one Main Store and one Warehouse allowed per client.</p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setCreateInvDeptOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createInvDeptMutation.isPending} data-testid="button-submit-inv-dept">
                          {createInvDeptMutation.isPending && <Spinner className="mr-2" />}
                          Create Department
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {invDeptsLoading ? (
                <div className="flex items-center justify-center py-12" data-testid="loading-inv-depts">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : !inventoryDepts || inventoryDepts.length === 0 ? (
                <Empty className="py-12" data-testid="empty-inv-depts">
                  <EmptyMedia variant="icon">
                    <Warehouse className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>No inventory departments yet</EmptyTitle>
                    <EmptyDescription>Link SRDs to create inventory departments.</EmptyDescription>
                  </EmptyHeader>
                  <Button className="gap-2" onClick={() => setCreateInvDeptOpen(true)} data-testid="button-add-first-inv-dept">
                    <Plus className="h-4 w-4" /> Add First Department
                  </Button>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stock Reconciliation Department (SRD)</TableHead>
                      <TableHead>Inventory Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryDepts.map((dept) => (
                      <TableRow key={dept.id} data-testid={`row-inv-dept-${dept.id}`}>
                        <TableCell className="font-medium" data-testid={`text-inv-dept-name-${dept.id}`}>
                          {getStoreNameById(dept.storeNameId)?.name || "Unknown"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            dept.inventoryType === "MAIN_STORE" 
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : dept.inventoryType === "WAREHOUSE"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          )} data-testid={`badge-inv-dept-type-${dept.id}`}>
                            {dept.inventoryType.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            dept.status === "active" 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : "bg-muted text-muted-foreground"
                          )} data-testid={`badge-inv-dept-status-${dept.id}`}>
                            {dept.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-inv-dept-actions-${dept.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedInvDept(dept); setEditInvDeptOpen(true); }} data-testid={`button-edit-inv-dept-${dept.id}`}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Update
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => { setSelectedInvDept(dept); setDeleteInvDeptOpen(true); }} 
                                className="text-red-600"
                                data-testid={`button-delete-inv-dept-${dept.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
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
        </TabsContent>
      </Tabs>

      {/* Edit Item Dialog */}
      <Dialog open={editItemOpen} onOpenChange={setEditItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>Update the inventory item details.</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
                  updateItemMutation.mutate({
                    id: selectedItem.id,
                    data: {
                      name: formData.get("name") as string,
                      sku: formData.get("sku") as string || null,
                      category: formData.get("category") as string,
                      unit: formData.get("unit") as string,
                      purchaseUnit: formData.get("purchaseUnit") as string,
                      costPrice: formData.get("costPrice") as string,
                      sellingPrice: formData.get("sellingPrice") as string,
                      reorderLevel: parseInt(formData.get("reorderLevel") as string) || 0,
                    },
                  });
            }}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Item Name</Label>
                    <Input id="edit-name" name="name" defaultValue={selectedItem.name} required data-testid="input-edit-item-name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-sku">SKU</Label>
                    <Input id="edit-sku" name="sku" defaultValue={selectedItem.sku || ""} data-testid="input-edit-item-sku" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category</Label>
                    <Input id="edit-category" name="category" defaultValue={selectedItem.category} required data-testid="input-edit-item-category" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-unit">Unit</Label>
                    <Input id="edit-unit" name="unit" defaultValue={selectedItem.unit} required data-testid="input-edit-item-unit" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-purchaseUnit">Purchase Unit</Label>
                    <Input id="edit-purchaseUnit" name="purchaseUnit" defaultValue={selectedItem.purchaseUnit || ""} required data-testid="input-edit-item-purchase-unit" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-costPrice">Cost Price</Label>
                    <Input id="edit-costPrice" name="costPrice" type="number" step="0.01" defaultValue={selectedItem.costPrice} required data-testid="input-edit-item-cost" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-sellingPrice">Selling Price</Label>
                    <Input id="edit-sellingPrice" name="sellingPrice" type="number" step="0.01" defaultValue={selectedItem.sellingPrice} required data-testid="input-edit-item-price" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-reorderLevel">Reorder Level</Label>
                  <Input id="edit-reorderLevel" name="reorderLevel" type="number" defaultValue={selectedItem.reorderLevel || 0} data-testid="input-edit-item-reorder" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditItemOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={updateItemMutation.isPending} data-testid="button-save-item">
                  {updateItemMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Item Dialog */}
      <AlertDialog open={deleteItemOpen} onOpenChange={setDeleteItemOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedItem && deleteItemMutation.mutate(selectedItem.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-item"
            >
              {deleteItemMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Supplier Dialog */}
      <Dialog open={editSupplierOpen} onOpenChange={setEditSupplierOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
            <DialogDescription>Update the supplier details.</DialogDescription>
          </DialogHeader>
          {selectedSupplier && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateSupplierMutation.mutate({
                id: selectedSupplier.id,
                data: {
                  name: formData.get("name") as string,
                  contactPerson: formData.get("contactPerson") as string || null,
                  phone: formData.get("phone") as string || null,
                  email: formData.get("email") as string || null,
                  address: formData.get("address") as string || null,
                },
              });
            }}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-supplierName">Supplier Name</Label>
                  <Input id="edit-supplierName" name="name" defaultValue={selectedSupplier.name} required data-testid="input-edit-supplier-name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-contactPerson">Contact Person</Label>
                  <Input id="edit-contactPerson" name="contactPerson" defaultValue={selectedSupplier.contactPerson || ""} data-testid="input-edit-supplier-contact" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input id="edit-phone" name="phone" defaultValue={selectedSupplier.phone || ""} data-testid="input-edit-supplier-phone" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input id="edit-email" name="email" type="email" defaultValue={selectedSupplier.email || ""} data-testid="input-edit-supplier-email" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-address">Address</Label>
                  <Input id="edit-address" name="address" defaultValue={selectedSupplier.address || ""} data-testid="input-edit-supplier-address" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditSupplierOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={updateSupplierMutation.isPending} data-testid="button-save-supplier">
                  {updateSupplierMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Supplier Dialog */}
      <AlertDialog open={deleteSupplierOpen} onOpenChange={setDeleteSupplierOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedSupplier?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedSupplier && deleteSupplierMutation.mutate(selectedSupplier.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-supplier"
            >
              {deleteSupplierMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Store Name Dialog */}
      <Dialog open={editStoreNameOpen} onOpenChange={setEditStoreNameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stock Reconciliation Department (SRD)</DialogTitle>
            <DialogDescription>Update the SRD name.</DialogDescription>
          </DialogHeader>
          {selectedStoreName && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateStoreNameMutation.mutate({
                id: selectedStoreName.id,
                data: {
                  name: formData.get("name") as string,
                },
              });
            }}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-storeName">Stock Reconciliation Department (SRD) Name</Label>
                  <Input id="edit-storeName" name="name" defaultValue={selectedStoreName.name} required data-testid="input-edit-store-name" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditStoreNameOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={updateStoreNameMutation.isPending} data-testid="button-save-store-name">
                  {updateStoreNameMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Store Name Dialog */}
      <AlertDialog open={deleteStoreNameOpen} onOpenChange={setDeleteStoreNameOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stock Reconciliation Department (SRD)</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedStoreName?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedStoreName && deleteStoreNameMutation.mutate(selectedStoreName.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-store-name"
            >
              {deleteStoreNameMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Inventory Department Dialog */}
      <Dialog open={editInvDeptOpen} onOpenChange={setEditInvDeptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Inventory Department</DialogTitle>
            <DialogDescription>Update the inventory department.</DialogDescription>
          </DialogHeader>
          {selectedInvDept && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateInvDeptMutation.mutate({
                id: selectedInvDept.id,
                data: {
                  storeNameId: formData.get("storeNameId") as string,
                  inventoryType: formData.get("inventoryType") as string,
                },
              });
            }}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-storeNameId">Stock Reconciliation Department (SRD)</Label>
                  <Select name="storeNameId" defaultValue={selectedInvDept.storeNameId}>
                    <SelectTrigger data-testid="select-edit-store-name">
                      <SelectValue placeholder="Select an SRD" />
                    </SelectTrigger>
                    <SelectContent>
                      {storeNames?.filter(sn => sn.status === "active").map(sn => (
                        <SelectItem key={sn.id} value={sn.id}>{sn.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-inventoryType">Inventory Type</Label>
                  <Select name="inventoryType" defaultValue={selectedInvDept.inventoryType}>
                    <SelectTrigger data-testid="select-edit-inventory-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MAIN_STORE">Main Store</SelectItem>
                      <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                      <SelectItem value="DEPARTMENT_STORE">Department Store</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditInvDeptOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={updateInvDeptMutation.isPending} data-testid="button-save-inv-dept">
                  {updateInvDeptMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Inventory Department Dialog */}
      <AlertDialog open={deleteInvDeptOpen} onOpenChange={setDeleteInvDeptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this inventory department? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedInvDept && deleteInvDeptMutation.mutate(selectedInvDept.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-inv-dept"
            >
              {deleteInvDeptMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit GRN Dialog */}
      <Dialog open={editGrnOpen} onOpenChange={setEditGrnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Goods Received Note</DialogTitle>
            <DialogDescription>Update the GRN details.</DialogDescription>
          </DialogHeader>
          {selectedGrn && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const formData = new FormData(form);
              updateGrnMutation.mutate({ id: selectedGrn.id, data: formData });
            }}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="editGrnSupplierName">Supplier Name</Label>
                  <Input name="supplierName" defaultValue={selectedGrn.supplierName} required data-testid="input-edit-grn-supplier-name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editGrnDate">Date</Label>
                  <Input type="date" name="date" required data-testid="input-edit-grn-date" defaultValue={format(new Date(selectedGrn.date), "yyyy-MM-dd")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editGrnInvoiceRef">Invoice Reference</Label>
                  <Input name="invoiceRef" defaultValue={selectedGrn.invoiceRef} required data-testid="input-edit-grn-invoice-ref" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editGrnAmount">Amount</Label>
                  <Input type="number" step="0.01" name="amount" defaultValue={selectedGrn.amount} required data-testid="input-edit-grn-amount" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editGrnStatus">Status</Label>
                  <Select name="status" defaultValue={selectedGrn.status}>
                    <SelectTrigger data-testid="select-edit-grn-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editGrnEvidence">Evidence (Invoice/Receipt)</Label>
                  {selectedGrn.evidenceUrl && (
                    <p className="text-sm text-muted-foreground">Current: {selectedGrn.evidenceFileName}</p>
                  )}
                  <Input type="file" name="evidence" accept="image/*,application/pdf" data-testid="input-edit-grn-evidence" />
                  <p className="text-xs text-muted-foreground">Leave empty to keep current file</p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditGrnOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={updateGrnMutation.isPending} data-testid="button-save-grn">
                  {updateGrnMutation.isPending && <Spinner className="mr-2" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete GRN Dialog */}
      <AlertDialog open={deleteGrnOpen} onOpenChange={setDeleteGrnOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goods Received Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete GRN "{selectedGrn?.invoiceRef}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedGrn && deleteGrnMutation.mutate(selectedGrn.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-grn"
            >
              {deleteGrnMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

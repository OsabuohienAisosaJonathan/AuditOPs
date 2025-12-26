import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Filter, Search, Package, Users, Truck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsApi, itemsApi, suppliersApi, Item, Supplier } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Inventory() {
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [createSupplierOpen, setCreateSupplierOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: clientsApi.getAll,
  });

  const selectedClientId = clients?.[0]?.id;

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
          <p className="text-muted-foreground">Manage items and suppliers for {clients[0]?.name}</p>
        </div>
      </div>

      <Tabs defaultValue="items" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="items" data-testid="tab-items">
            <Package className="h-4 w-4 mr-2" />
            Items
          </TabsTrigger>
          <TabsTrigger value="suppliers" data-testid="tab-suppliers">
            <Truck className="h-4 w-4 mr-2" />
            Suppliers
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
                      <TableHead>Category</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Cost Price</TableHead>
                      <TableHead className="text-right">Selling Price</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                        <TableCell className="font-medium" data-testid={`text-item-name-${item.id}`}>{item.name}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{item.sku || "-"}</TableCell>
                        <TableCell>{item.category}</TableCell>
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
                      </TableRow>
                    ))}
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

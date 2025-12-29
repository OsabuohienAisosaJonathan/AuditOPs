import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Link2, Trash2, RefreshCw, Store, ArrowRight, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  clientsApi, 
  departmentsApi, 
  inventoryDepartmentsApi, 
  departmentInventoryLinksApi,
  storeNamesApi,
  Client, 
  Department, 
  InventoryDepartment,
  DepartmentInventoryLink,
  StoreName
} from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function DepartmentLinks() {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteConfirmLink, setDeleteConfirmLink] = useState<DepartmentInventoryLink | null>(null);
  const [newLink, setNewLink] = useState({ clientDepartmentId: "", inventoryDepartmentId: "" });

  const queryClient = useQueryClient();

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: clientsApi.getAll,
  });

  const { data: departments = [], isLoading: depsLoading } = useQuery({
    queryKey: ["departments", selectedClientId],
    queryFn: () => selectedClientId ? departmentsApi.getByClient(selectedClientId) : Promise.resolve([]),
    enabled: !!selectedClientId,
  });

  const { data: inventoryDepartments = [], isLoading: invDepsLoading } = useQuery({
    queryKey: ["inventory-departments", selectedClientId],
    queryFn: () => selectedClientId ? inventoryDepartmentsApi.getByClient(selectedClientId) : Promise.resolve([]),
    enabled: !!selectedClientId,
  });

  const { data: storeNames = [] } = useQuery({
    queryKey: ["store-names"],
    queryFn: storeNamesApi.getAll,
  });

  const { data: links = [], isLoading: linksLoading } = useQuery({
    queryKey: ["department-inventory-links", selectedClientId],
    queryFn: () => selectedClientId ? departmentInventoryLinksApi.getByClient(selectedClientId) : Promise.resolve([]),
    enabled: !!selectedClientId,
  });

  const createLinkMutation = useMutation({
    mutationFn: (data: { clientDepartmentId: string; inventoryDepartmentId: string }) =>
      departmentInventoryLinksApi.create(selectedClientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-inventory-links", selectedClientId] });
      setCreateDialogOpen(false);
      setNewLink({ clientDepartmentId: "", inventoryDepartmentId: "" });
      toast.success("Department link created successfully");
    },
    onError: (error: any) => {
      toast.error(error?.error || "Failed to create link");
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: (id: string) => departmentInventoryLinksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-inventory-links", selectedClientId] });
      setDeleteConfirmLink(null);
      toast.success("Link deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete link");
    },
  });

  const linkedClientDeptIds = new Set(links.filter(l => l.status === "active").map(l => l.clientDepartmentId));
  const linkedInvDeptIds = new Set(links.filter(l => l.status === "active").map(l => l.inventoryDepartmentId));

  const availableClientDepts = departments.filter(
    d => d.status === "active" && !linkedClientDeptIds.has(d.id)
  );
  const availableInvDepts = inventoryDepartments.filter(
    d => d.status === "active" && !linkedInvDeptIds.has(d.id)
  );

  const getDepartmentName = (id: string) => {
    const dept = departments.find(d => d.id === id);
    return dept?.name || "Unknown";
  };

  const getInventoryDepartmentName = (id: string) => {
    const invDept = inventoryDepartments.find(d => d.id === id);
    if (!invDept) return "Unknown";
    const storeName = storeNames.find(s => s.id === invDept.storeNameId);
    return `${storeName?.name || "Unknown Store"} (${invDept.inventoryType.replace("_", " ")})`;
  };

  const getInventoryTypeLabel = (type: string) => {
    switch (type) {
      case "MAIN_STORE": return "Main Store";
      case "DEPARTMENT_STORE": return "Department Store";
      default: return type;
    }
  };

  const isLoading = clientsLoading || (selectedClientId && (depsLoading || invDepsLoading || linksLoading));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">Department Links</h1>
          <p className="text-muted-foreground">Map client departments to inventory SRDs for reconciliation</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="w-[200px]" data-testid="select-client">
              <SelectValue placeholder="Select Client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id} data-testid={`option-client-${client.id}`}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedClientId && (
            <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-link">
              <Plus className="w-4 h-4 mr-2" />
              Create Link
            </Button>
          )}
        </div>
      </div>

      {!selectedClientId ? (
        <Card>
          <CardContent className="py-12">
            <Empty>
              <EmptyMedia>
                <Store className="w-12 h-12 text-muted-foreground/50" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>Select a Client</EmptyTitle>
                <EmptyDescription>Choose a client to view and manage department-to-SRD mappings</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="w-8 h-8" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Unlinked Client Departments</CardTitle>
                <CardDescription>Departments not yet mapped to an SRD</CardDescription>
              </CardHeader>
              <CardContent>
                {availableClientDepts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">All departments are linked</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableClientDepts.map(dept => (
                      <Badge key={dept.id} variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {dept.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Unlinked SRDs</CardTitle>
                <CardDescription>Inventory departments not yet mapped</CardDescription>
              </CardHeader>
              <CardContent>
                {availableInvDepts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">All SRDs are linked</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableInvDepts.map(dept => {
                      const storeName = storeNames.find(s => s.id === dept.storeNameId);
                      return (
                        <Badge key={dept.id} variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {storeName?.name || "Store"} ({getInventoryTypeLabel(dept.inventoryType)})
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                Active Mappings
              </CardTitle>
              <CardDescription>Links between client departments and stock reconciliation departments</CardDescription>
            </CardHeader>
            <CardContent>
              {links.length === 0 ? (
                <Empty>
                  <EmptyMedia>
                    <Link2 className="w-10 h-10 text-muted-foreground/50" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>No Links Created</EmptyTitle>
                    <EmptyDescription>Create links to map client departments to SRDs for accurate reconciliation</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client Department</TableHead>
                      <TableHead className="text-center w-[60px]"></TableHead>
                      <TableHead>Inventory SRD</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {links.map(link => (
                      <TableRow key={link.id} data-testid={`row-link-${link.id}`}>
                        <TableCell className="font-medium" data-testid={`text-client-dept-${link.id}`}>
                          {getDepartmentName(link.clientDepartmentId)}
                        </TableCell>
                        <TableCell className="text-center">
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell data-testid={`text-inv-dept-${link.id}`}>
                          {getInventoryDepartmentName(link.inventoryDepartmentId)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{getInventoryTypeLabel(link.inventoryType)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={link.status === "active" ? "default" : "secondary"}>
                            {link.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setDeleteConfirmLink(link)}
                            data-testid={`button-delete-link-${link.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Department Link</DialogTitle>
            <DialogDescription>
              Map a client department to an inventory SRD. Each department can only be linked to one SRD.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Client Department</Label>
              <Select 
                value={newLink.clientDepartmentId} 
                onValueChange={(v) => setNewLink(p => ({ ...p, clientDepartmentId: v }))}
              >
                <SelectTrigger data-testid="select-client-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {availableClientDepts.map(dept => (
                    <SelectItem key={dept.id} value={dept.id} data-testid={`option-dept-${dept.id}`}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Inventory SRD</Label>
              <Select 
                value={newLink.inventoryDepartmentId} 
                onValueChange={(v) => setNewLink(p => ({ ...p, inventoryDepartmentId: v }))}
              >
                <SelectTrigger data-testid="select-inventory-department">
                  <SelectValue placeholder="Select SRD" />
                </SelectTrigger>
                <SelectContent>
                  {availableInvDepts.map(dept => {
                    const storeName = storeNames.find(s => s.id === dept.storeNameId);
                    return (
                      <SelectItem key={dept.id} value={dept.id} data-testid={`option-inv-dept-${dept.id}`}>
                        {storeName?.name || "Store"} ({getInventoryTypeLabel(dept.inventoryType)})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createLinkMutation.mutate(newLink)}
              disabled={!newLink.clientDepartmentId || !newLink.inventoryDepartmentId || createLinkMutation.isPending}
              data-testid="button-submit-create-link"
            >
              {createLinkMutation.isPending ? <Spinner className="w-4 h-4 mr-2" /> : null}
              Create Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmLink} onOpenChange={(open) => !open && setDeleteConfirmLink(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Link?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the mapping between "{deleteConfirmLink && getDepartmentName(deleteConfirmLink.clientDepartmentId)}" 
              and its inventory SRD. The reconciliation will no longer use this mapping.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirmLink && deleteLinkMutation.mutate(deleteConfirmLink.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-link"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

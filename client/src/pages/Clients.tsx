import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Filter, MoreHorizontal, Building2, Trash2, Edit, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsApi, outletsApi, Client } from "@/lib/api";
import { format } from "date-fns";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function Clients() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirmClient, setDeleteConfirmClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const queryClient = useQueryClient();

  const { data: clients, isLoading, error } = useQuery({
    queryKey: ["clients"],
    queryFn: clientsApi.getAll,
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

  const filteredClients = clients?.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (error) {
    return (
      <Empty className="min-h-[400px] border" data-testid="error-clients">
        <EmptyMedia variant="icon">
          <Building2 className="h-6 w-6 text-destructive" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>Failed to load clients</EmptyTitle>
          <EmptyDescription>Please try refreshing the page.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">Client Management</h1>
          <p className="text-muted-foreground">Manage audit configurations and client profiles</p>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Variance Threshold</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients?.map((client) => (
                  <TableRow key={client.id} className="cursor-pointer" data-testid={`row-client-${client.id}`}>
                    <TableCell className="font-medium" data-testid={`text-client-name-${client.id}`}>
                      {client.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "font-normal",
                        client.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400" : 
                        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400"
                      )} data-testid={`badge-status-${client.id}`}>
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-2 w-full max-w-[60px] rounded-full bg-muted overflow-hidden"
                        )}>
                          <div className={cn("h-full", 
                             (client.riskScore || 0) > 80 ? "bg-emerald-500" : 
                             (client.riskScore || 0) > 50 ? "bg-amber-500" : "bg-destructive"
                          )} style={{ width: `${client.riskScore || 0}%` }} />
                        </div>
                        <span className="text-xs font-mono" data-testid={`text-risk-score-${client.id}`}>
                          {client.riskScore || 0}/100
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{client.varianceThreshold}%</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(client.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-actions-${client.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem data-testid={`button-view-outlets-${client.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Outlets
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
    </div>
  );
}

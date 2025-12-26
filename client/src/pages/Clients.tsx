import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { clientsApi, outletsApi } from "@/lib/api";
import { format } from "date-fns";

export default function Clients() {
  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: clientsApi.getAll,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">Client Management</h1>
          <p className="text-muted-foreground">Manage audit configurations and client profiles</p>
        </div>
        <Button className="gap-2" data-testid="button-add-client">
          <Plus className="h-4 w-4" />
          Add New Client
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search clients..." className="pl-9" data-testid="input-search" />
            </div>
            <Button variant="outline" className="gap-2" data-testid="button-filter">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading clients...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Variance Threshold</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients?.map((client) => (
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
                      <Button variant="ghost" size="sm" data-testid={`button-manage-${client.id}`}>
                        Manage
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
  );
}

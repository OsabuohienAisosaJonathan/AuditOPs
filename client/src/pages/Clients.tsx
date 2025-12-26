import { CLIENTS } from "@/lib/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Clients() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Client Management</h1>
          <p className="text-muted-foreground">Manage audit configurations and client profiles</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add New Client
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search clients..." className="pl-9" />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Outlets</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Last Audit</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CLIENTS.map((client) => (
                <TableRow key={client.id} className="cursor-pointer">
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.outlets}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      "font-normal",
                      client.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                      "bg-amber-50 text-amber-700 border-amber-200"
                    )}>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-2 w-full max-w-[60px] rounded-full bg-muted overflow-hidden"
                      )}>
                        <div className={cn("h-full", 
                           client.riskScore > 80 ? "bg-emerald-500" : 
                           client.riskScore > 50 ? "bg-amber-500" : "bg-destructive"
                        )} style={{ width: `${client.riskScore}%` }} />
                      </div>
                      <span className="text-xs font-mono">{client.riskScore}/100</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">Today, 09:30 AM</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Manage</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

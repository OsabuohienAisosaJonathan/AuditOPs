import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, History, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuditTrail() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">System-wide activity trail for compliance</p>
        </div>
      </div>

      <Card>
         <CardHeader className="border-b px-6 py-4">
            <div className="flex items-center justify-between gap-4">
               <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold text-sm">Activity Log</span>
               </div>
               <div className="flex gap-2">
                  <div className="relative w-64">
                     <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                     <Input className="pl-9 h-9" placeholder="Search logs..." />
                  </div>
                  <Button variant="outline" size="sm" className="h-9 gap-2"><Filter className="h-3 w-3" /> Filter</Button>
               </div>
            </div>
         </CardHeader>
         <CardContent className="p-0">
            <Table>
               <TableHeader>
                  <TableRow>
                     <TableHead className="w-[180px]">Timestamp</TableHead>
                     <TableHead>User</TableHead>
                     <TableHead>Action</TableHead>
                     <TableHead>Entity</TableHead>
                     <TableHead>Details</TableHead>
                     <TableHead className="text-right">IP Address</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {[
                     { time: "Dec 26, 10:45 AM", user: "John Doe", action: "Updated Sales", entity: "Main Bar", details: "Changed cash entry from 45k to 48k", ip: "192.168.1.1" },
                     { time: "Dec 26, 10:30 AM", user: "John Doe", action: "Created GRN", entity: "Purchase #882", details: "Received goods from Global Spirits", ip: "192.168.1.1" },
                     { time: "Dec 26, 09:15 AM", user: "System", action: "Auto-Alert", entity: "Inventory", details: "Flagged negative stock for Hennessy", ip: "System" },
                     { time: "Dec 26, 09:00 AM", user: "John Doe", action: "Login", entity: "Session", details: "Successful login via web", ip: "192.168.1.1" },
                  ].map((log, i) => (
                     <TableRow key={i} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-xs text-muted-foreground">{log.time}</TableCell>
                        <TableCell className="font-medium text-sm">{log.user}</TableCell>
                        <TableCell><Badge variant="outline" className="font-normal">{log.action}</Badge></TableCell>
                        <TableCell className="text-sm">{log.entity}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{log.details}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">{log.ip}</TableCell>
                     </TableRow>
                  ))}
               </TableBody>
            </Table>
         </CardContent>
      </Card>
    </div>
  );
}

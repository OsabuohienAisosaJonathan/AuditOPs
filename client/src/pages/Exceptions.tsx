import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Filter, Search, AlertOctagon, MoreHorizontal, Paperclip, MessageSquare } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function Exceptions() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Exceptions Register</h1>
          <p className="text-muted-foreground">Track, investigate, and resolve audit discrepancies</p>
        </div>
        <Button className="gap-2">
          <AlertOctagon className="h-4 w-4" />
          Log New Exception
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 bg-card" placeholder="Search cases..." />
        </div>
        <Select defaultValue="open">
          <SelectTrigger className="w-[180px] bg-card">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="review">In Review</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="shrink-0 bg-card"><Filter className="h-4 w-4" /></Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Case ID</TableHead>
                    <TableHead>Issue Summary</TableHead>
                    <TableHead>Outlet</TableHead>
                    <TableHead className="text-right">Impact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { id: "EX-205", summary: "Missing Stock (Hennessy VSOP)", outlet: "Main Bar", impact: "- ₦ 45,000", status: "Open", severity: "High" },
                    { id: "EX-204", summary: "Unexplained Void (Table 5)", outlet: "Restaurant", impact: "- ₦ 12,500", status: "Review", severity: "Medium" },
                    { id: "EX-203", summary: "Cash Shortage (Morning Shift)", outlet: "Main Bar", impact: "- ₦ 2,000", status: "Resolved", severity: "Low" },
                    { id: "EX-202", summary: "Price Discrepancy (Ribeye)", outlet: "Kitchen", impact: "N/A", status: "Resolved", severity: "Low" },
                    { id: "EX-201", summary: "Missing Invoice #9921", outlet: "Store", impact: "Compliance", status: "Open", severity: "Medium" },
                  ].map((ex) => (
                    <TableRow key={ex.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <TableCell className="font-mono font-medium text-xs">{ex.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{ex.summary}</div>
                        <div className="text-xs text-muted-foreground md:hidden">{ex.outlet}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{ex.outlet}</TableCell>
                      <TableCell className="text-right font-mono font-medium text-destructive">{ex.impact}</TableCell>
                      <TableCell>
                         <StatusBadge status={ex.status} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-l-4 border-l-destructive shadow-md">
            <CardHeader className="pb-3 bg-muted/20">
              <div className="flex justify-between items-start">
                 <div>
                   <div className="text-xs font-mono text-muted-foreground mb-1">CASE #EX-205</div>
                   <CardTitle className="text-lg">Missing Stock (Hennessy VSOP)</CardTitle>
                 </div>
                 <StatusBadge status="Open" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Variance Qty</div>
                  <div className="font-mono font-medium text-lg">- 3 Bottles</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Financial Impact</div>
                  <div className="font-mono font-medium text-lg text-destructive">₦ 45,000</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                 <h4 className="text-sm font-medium">Investigation Notes</h4>
                 <div className="bg-muted/30 p-3 rounded-md text-sm text-muted-foreground">
                    Physical count conducted by John Doe at 09:30 AM confirmed 12 bottles. System expected 15 bottles. No transfer records found for the missing 3 units. Bar manager notified.
                 </div>
              </div>

              <div className="space-y-2">
                 <h4 className="text-sm font-medium">Evidence</h4>
                 <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1"><Paperclip className="h-3 w-3" /> Count_Sheet.pdf</Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1"><Paperclip className="h-3 w-3" /> Photo_01.jpg</Button>
                 </div>
              </div>

              <div className="space-y-2">
                 <h4 className="text-sm font-medium">Activity</h4>
                 <div className="space-y-3">
                    <div className="flex gap-3 text-sm">
                       <Avatar className="h-6 w-6"><AvatarFallback>JD</AvatarFallback></Avatar>
                       <div>
                          <p className="font-medium text-xs">John Doe <span className="text-muted-foreground font-normal">created this case</span></p>
                          <p className="text-[10px] text-muted-foreground">Today, 09:45 AM</p>
                       </div>
                    </div>
                 </div>
                 <div className="flex gap-2 mt-2">
                    <Input placeholder="Add a comment..." className="h-8 text-xs" />
                    <Button size="icon" className="h-8 w-8"><MessageSquare className="h-4 w-4" /></Button>
                 </div>
              </div>
              
              <div className="pt-2">
                 <Button className="w-full">Escalate to Supervisor</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "Open") {
    return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Open</Badge>;
  }
  if (status === "Review") {
    return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Review</Badge>;
  }
  return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Resolved</Badge>;
}

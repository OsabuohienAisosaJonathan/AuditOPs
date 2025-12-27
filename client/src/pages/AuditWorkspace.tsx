import { AUDIT_TASKS } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, ChevronRight, Upload, AlertCircle, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

export default function AuditWorkspace() {
  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Left Panel: Audit Checklist Timeline */}
      <aside className="w-80 shrink-0 flex flex-col gap-4">
        <Card className="h-full border-none shadow-none bg-transparent">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Daily Audit Checklist</CardTitle>
            <CardDescription>Step-by-step workflow</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="relative border-l border-border space-y-8 py-2 ml-[3px] mr-[3px] pt-[8px] pb-[8px] mt-[0px] mb-[0px]">
              {AUDIT_TASKS.map((task, index) => (
                <div key={task.id} className="relative pl-8 group">
                  <div className={cn(
                    "absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border ring-4 ring-background transition-colors",
                    task.status === "completed" ? "bg-primary border-primary" : "bg-muted border-muted-foreground"
                  )} />
                  <div className="flex flex-col gap-1">
                    <span className={cn(
                      "text-sm font-medium leading-none",
                      task.status === "completed" ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {task.label}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {task.status === "completed" ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Completed {task.time}
                        </>
                      ) : (
                        <>
                          <Circle className="h-3 w-3" /> Pending
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 p-4 bg-muted/30 rounded-lg border border-border">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Evidence Locker</h4>
              <div className="text-sm text-muted-foreground italic text-center py-4 border-2 border-dashed border-border rounded">
                Drag & drop supporting docs here
              </div>
            </div>
          </CardContent>
        </Card>
      </aside>
      {/* Main Panel: Tabbed Workflow */}
      <div className="flex-1 min-w-0">
        <Tabs defaultValue="sales" className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid w-full max-w-[600px] grid-cols-5">
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="purchases">Purchases</TabsTrigger>
              <TabsTrigger value="stock">Stock</TabsTrigger>
              <TabsTrigger value="counts">Counts</TabsTrigger>
              <TabsTrigger value="recon">Recon</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
               <span className="text-xs text-muted-foreground">Auto-saved 2m ago</span>
               <Button size="sm" variant="ghost"><Save className="h-4 w-4 mr-1"/> Save Draft</Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto pr-2">
            <TabsContent value="sales" className="mt-0 h-full">
              <SalesCapture />
            </TabsContent>
            <TabsContent value="purchases" className="mt-0">
              <div className="flex items-center justify-center h-64 text-muted-foreground">Purchases Content</div>
            </TabsContent>
            <TabsContent value="stock" className="mt-0">
              <div className="flex items-center justify-center h-64 text-muted-foreground">Stock Content</div>
            </TabsContent>
             <TabsContent value="counts" className="mt-0">
              <div className="flex items-center justify-center h-64 text-muted-foreground">Counts Content</div>
            </TabsContent>
             <TabsContent value="recon" className="mt-0">
              <div className="flex items-center justify-center h-64 text-muted-foreground">Recon Content</div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

function SalesCapture() {
  return (
    <Card className="h-full flex flex-col border-none shadow-none">
      <CardHeader className="px-0 pt-0 pb-4">
        <div className="flex items-center justify-between">
            <div>
                 <CardTitle>Sales Capture</CardTitle>
                 <CardDescription>Record daily sales via Import or Summary entry</CardDescription>
            </div>
            <div className="flex bg-muted p-1 rounded-lg">
                <Button variant="ghost" size="sm" className="bg-background shadow-sm text-foreground text-xs h-7">Summary Mode</Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground text-xs h-7">POS Import</Button>
            </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 flex-1">
        <div className="space-y-6">
          {/* Department Entry Grid */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[180px]">Department</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead className="text-right">Cash (₦)</TableHead>
                  <TableHead className="text-right">POS (₦)</TableHead>
                  <TableHead className="text-right">Transfer (₦)</TableHead>
                  <TableHead className="text-right">Voids/Comp (₦)</TableHead>
                  <TableHead className="text-right">Total Sales (₦)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {["Main Bar", "VIP Lounge", "Kitchen"].map((dept) => (
                  <TableRow key={dept} className="group hover:bg-muted/30">
                    <TableCell className="font-medium">{dept}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">Full Day</Badge>
                    </TableCell>
                    <TableCell><Input className="text-right h-8 w-28 ml-auto font-mono" placeholder="0.00" /></TableCell>
                    <TableCell><Input className="text-right h-8 w-28 ml-auto font-mono" placeholder="0.00" /></TableCell>
                    <TableCell><Input className="text-right h-8 w-28 ml-auto font-mono" placeholder="0.00" /></TableCell>
                    <TableCell><Input className="text-right h-8 w-28 ml-auto font-mono text-destructive" placeholder="0.00" /></TableCell>
                    <TableCell className="text-right font-bold font-mono">0.00</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="bg-muted/30 p-4 flex justify-end gap-8 border-t">
                 <div className="text-sm">
                    <span className="text-muted-foreground mr-2">Total Cash:</span>
                    <span className="font-mono font-medium">₦ 0.00</span>
                 </div>
                 <div className="text-sm">
                    <span className="text-muted-foreground mr-2">Total POS:</span>
                    <span className="font-mono font-medium">₦ 0.00</span>
                 </div>
                 <div className="text-sm">
                    <span className="text-muted-foreground mr-2">Total Sales:</span>
                    <span className="font-mono font-bold text-lg">₦ 0.00</span>
                 </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
             <Card className="border-dashed shadow-none bg-muted/10">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Sales Evidence</CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg bg-background text-center p-4 cursor-pointer hover:border-primary transition-colors">
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Click to upload Z-Report / Shift Summary</p>
                        <p className="text-xs text-muted-foreground mt-1">JPG, PNG, PDF allowed</p>
                     </div>
                </CardContent>
             </Card>

             <Card className="border shadow-sm">
                 <CardHeader className="pb-2">
                     <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        Reconciliation Hint
                     </CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                     <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Captured Sales:</span>
                        <span className="font-mono font-medium">₦ 0.00</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Reported Payments:</span>
                        <span className="font-mono font-medium">₦ 0.00</span>
                     </div>
                     <Separator />
                     <div className="flex justify-between text-sm font-bold">
                        <span className="text-muted-foreground">Difference:</span>
                        <span className="font-mono text-emerald-600">Balanced</span>
                     </div>
                 </CardContent>
             </Card>
          </div>
          
          <div className="flex justify-end pt-4">
               <Button className="w-48 gap-2">
                   Complete Sales Step
                   <ChevronRight className="h-4 w-4" />
               </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

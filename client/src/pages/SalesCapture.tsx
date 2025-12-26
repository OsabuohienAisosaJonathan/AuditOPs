import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, ShoppingCart, Search, Filter, AlertCircle, Check, ChevronRight, Plus } from "lucide-react";

export default function SalesCapture() {
  const [mode, setMode] = useState("summary");

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Sales Capture</h1>
          <p className="text-muted-foreground">Record and validate daily sales data</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted p-1 rounded-lg border border-border">
            <Button 
              variant={mode === "summary" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setMode("summary")}
              className="h-8"
            >
              Summary Mode
            </Button>
            <Button 
              variant={mode === "pos" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setMode("pos")}
              className="h-8"
            >
              POS Import
            </Button>
            <Button 
              variant={mode === "item" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setMode("item")}
              className="h-8"
            >
              Item Level
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {mode === "summary" && <SummarySalesMode />}
          {mode === "pos" && <PosImportMode />}
          {mode === "item" && <ItemLevelMode />}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Reconciliation Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Captured Total</span>
                  <span className="font-mono font-medium">₦ 1,250,000</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Declared Payments</span>
                  <span className="font-mono font-medium">₦ 1,245,000</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-destructive">Variance</span>
                  <span className="font-mono text-destructive">- ₦ 5,000</span>
                </div>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md border border-amber-100 dark:border-amber-900/50">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-amber-900 dark:text-amber-300">Unbalanced Entry</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">Total sales vs payments difference must be explained before submission.</p>
                  </div>
                </div>
              </div>
              
              <Button className="w-full" disabled>Submit Daily Sales</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">History (Recent)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium">Dec {26 - i}, 2025</div>
                      <div className="text-xs text-muted-foreground">3 Departments</div>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-normal">
                      Verified
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummarySalesMode() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Department Sales Summary</CardTitle>
        <CardDescription>Enter aggregated sales totals by department and payment method.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[180px]">Department</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead className="text-right">Cash (₦)</TableHead>
                <TableHead className="text-right">POS (₦)</TableHead>
                <TableHead className="text-right">Transfer (₦)</TableHead>
                <TableHead className="text-right">Total (₦)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {["Main Bar", "VIP Lounge", "Kitchen", "Outdoor Bar"].map((dept) => (
                <TableRow key={dept}>
                  <TableCell className="font-medium">{dept}</TableCell>
                  <TableCell>
                    <Select defaultValue="full">
                      <SelectTrigger className="h-7 w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Full Day</SelectItem>
                        <SelectItem value="am">Morning</SelectItem>
                        <SelectItem value="pm">Evening</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input className="text-right h-8 font-mono" placeholder="0.00" /></TableCell>
                  <TableCell><Input className="text-right h-8 font-mono" placeholder="0.00" /></TableCell>
                  <TableCell><Input className="text-right h-8 font-mono" placeholder="0.00" /></TableCell>
                  <TableCell className="text-right font-mono font-medium text-muted-foreground">0.00</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-6 flex justify-between items-center bg-muted/20 p-4 rounded-lg border border-border">
          <div className="flex gap-4">
             <div className="space-y-1">
               <Label className="text-xs text-muted-foreground">Total Voids</Label>
               <Input className="h-8 w-32 font-mono" placeholder="0.00" />
             </div>
             <div className="space-y-1">
               <Label className="text-xs text-muted-foreground">Total Discounts</Label>
               <Input className="h-8 w-32 font-mono" placeholder="0.00" />
             </div>
          </div>
          <div className="text-right">
             <div className="text-sm text-muted-foreground">Grand Total</div>
             <div className="text-2xl font-bold font-mono tracking-tight">₦ 0.00</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PosImportMode() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>POS Data Import</CardTitle>
        <CardDescription>Upload CSV/Excel exports from POS terminals.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border-2 border-dashed border-border rounded-lg p-10 flex flex-col items-center justify-center text-center hover:bg-muted/30 transition-colors cursor-pointer group">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-medium">Drag & Drop POS Export</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">Supports Micros, Odoo, Loyverse, and standard CSV formats.</p>
          <Button variant="outline" className="mt-4">Browse Files</Button>
        </div>

        <div className="space-y-4">
           <h4 className="text-sm font-medium">Mapping Preview</h4>
           <div className="border rounded-md">
             <div className="p-4 bg-muted/30 border-b flex gap-4 text-sm text-muted-foreground">
               <span className="flex-1">Detected Columns</span>
               <span className="flex-1">System Field</span>
             </div>
             <div className="divide-y">
                {["Transaction Date", "Item Name", "Qty", "Amount", "Payment Mode"].map((field) => (
                  <div key={field} className="p-3 flex gap-4 items-center">
                    <span className="flex-1 text-sm font-medium">{field}</span>
                    <div className="flex-1">
                      <Select>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Map to..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="dept">Department</SelectItem>
                          <SelectItem value="amt">Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Check className="h-4 w-4 text-emerald-500" />
                  </div>
                ))}
             </div>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ItemLevelMode() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Item-Level Entry</CardTitle>
        <CardDescription>Detailed line-item entry for manual tickets.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
           <div className="relative flex-1">
             <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
             <Input className="pl-9" placeholder="Search item..." />
           </div>
           <Button variant="outline"><Filter className="h-4 w-4 mr-2" /> Filter Dept</Button>
        </div>
        
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="w-[100px]">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted/20">
                <TableCell>
                  <span className="font-medium text-primary">Heineken Bottle</span>
                  <div className="text-xs text-muted-foreground">Main Bar</div>
                </TableCell>
                <TableCell><Input className="h-8" type="number" defaultValue={24} /></TableCell>
                <TableCell className="text-right font-mono">1,500</TableCell>
                <TableCell className="text-right font-mono font-bold">36,000</TableCell>
                <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Plus className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div className="p-8 text-center text-muted-foreground text-sm">
             Search and add items to build the sales ticket.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

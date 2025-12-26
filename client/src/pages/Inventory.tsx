import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Filter, Search, FileText, ArrowRightLeft, Package, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Inventory() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Inventory & Purchases</h1>
          <p className="text-muted-foreground">Manage procurement, GRNs, and stock movements</p>
        </div>
        <div className="flex gap-2">
           <Button className="gap-2">
             <Plus className="h-4 w-4" /> New Purchase Order
           </Button>
        </div>
      </div>

      <Tabs defaultValue="purchases" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="purchases">Purchases & GRN</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="px-6 py-4 border-b">
               <div className="flex items-center justify-between">
                  <div className="flex gap-4 items-center flex-1">
                    <div className="relative w-64">
                       <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                       <Input className="pl-9 bg-muted/30" placeholder="Search supplier or invoice #" />
                    </div>
                    <Button variant="outline" size="sm" className="gap-2"><Filter className="h-3 w-3" /> Filter</Button>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-0">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Date</TableHead>
                     <TableHead>Supplier</TableHead>
                     <TableHead>Reference / Invoice</TableHead>
                     <TableHead className="text-right">Amount (₦)</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead>Evidence</TableHead>
                     <TableHead className="text-right">Actions</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {[
                     { date: "Dec 26, 2025", supplier: "Global Spirits Ltd", ref: "INV-2025-882", amount: "450,000", status: "Draft", evidence: false },
                     { date: "Dec 25, 2025", supplier: "Fresh Farms", ref: "PO-0023", amount: "125,500", status: "GRN Pending", evidence: true },
                     { date: "Dec 24, 2025", supplier: "Beverage HQ", ref: "INV-9921", amount: "890,000", status: "Completed", evidence: true },
                   ].map((po, i) => (
                     <TableRow key={i}>
                       <TableCell className="font-mono text-sm">{po.date}</TableCell>
                       <TableCell className="font-medium">{po.supplier}</TableCell>
                       <TableCell>{po.ref}</TableCell>
                       <TableCell className="text-right font-mono">{po.amount}</TableCell>
                       <TableCell>
                         <Badge variant="outline" className={
                           po.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                           po.status === "GRN Pending" ? "bg-amber-50 text-amber-700 border-amber-200" :
                           "bg-muted text-muted-foreground"
                         }>
                           {po.status}
                         </Badge>
                       </TableCell>
                       <TableCell>
                         {po.evidence ? 
                           <Badge variant="secondary" className="gap-1 font-normal"><FileText className="h-3 w-3" /> Attached</Badge> : 
                           <span className="text-xs text-muted-foreground italic">Missing</span>
                         }
                       </TableCell>
                       <TableCell className="text-right">
                         <Button variant="ghost" size="sm">View</Button>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="mt-6">
          <div className="grid gap-6 md:grid-cols-4">
             <Card className="md:col-span-3">
               <CardHeader>
                 <CardTitle>Internal Stock Movements</CardTitle>
                 <CardDescription>Transfers, Wastage, and Complimentary Issues</CardDescription>
               </CardHeader>
               <CardContent>
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Type</TableHead>
                       <TableHead>From</TableHead>
                       <TableHead>To / Reason</TableHead>
                       <TableHead>Items</TableHead>
                       <TableHead className="text-right">Value (₦)</TableHead>
                       <TableHead>Authorized By</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     <TableRow>
                       <TableCell><Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Transfer</Badge></TableCell>
                       <TableCell>Main Store</TableCell>
                       <TableCell>VIP Bar</TableCell>
                       <TableCell className="text-muted-foreground text-sm">Hennessy VSOP (6), Coke (24)...</TableCell>
                       <TableCell className="text-right font-mono">180,000</TableCell>
                       <TableCell>Jane Mgr</TableCell>
                     </TableRow>
                     <TableRow>
                       <TableCell><Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Wastage</Badge></TableCell>
                       <TableCell>Kitchen</TableCell>
                       <TableCell>Spoilage</TableCell>
                       <TableCell className="text-muted-foreground text-sm">Tomatoes (5kg)</TableCell>
                       <TableCell className="text-right font-mono">15,000</TableCell>
                       <TableCell>Chef Mike</TableCell>
                     </TableRow>
                   </TableBody>
                 </Table>
               </CardContent>
             </Card>

             <Card>
               <CardHeader>
                 <CardTitle className="text-sm">Quick Record</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Movement Type</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transfer">Transfer (Internal)</SelectItem>
                        <SelectItem value="waste">Wastage / Spoilage</SelectItem>
                        <SelectItem value="promo">Complimentary / Promo</SelectItem>
                        <SelectItem value="staff">Staff Meal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="From..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main">Main Store</SelectItem>
                        <SelectItem value="bar">Main Bar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                     <Label>Items</Label>
                     <Button variant="outline" className="w-full justify-start text-muted-foreground font-normal">
                       <Plus className="h-4 w-4 mr-2" /> Add items...
                     </Button>
                  </div>
                  <Button className="w-full">Record Movement</Button>
               </CardContent>
             </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

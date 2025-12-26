import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle2, ChevronRight, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Reconciliation() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Daily Reconciliation</h1>
          <p className="text-muted-foreground">Compare theoretical vs physical stock to identify variances</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Print Worksheet</Button>
          <Button className="gap-2">
            <FileCheck className="h-4 w-4" /> Finalize & Sign Off
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Department Cards */}
        <div className="lg:col-span-2 space-y-6">
          <ReconDeptCard 
             name="Main Bar" 
             sales="450,000" 
             variance="-12,500" 
             status="Attention"
             data={[
               { item: "Hennessy VSOP", open: 12, add: 6, sales: 4, close: 13, actual: 13, var: 0 },
               { item: "Coke 33cl", open: 48, add: 24, sales: 30, close: 42, actual: 40, var: -2 },
               { item: "Water 75cl", open: 20, add: 0, sales: 5, close: 15, actual: 15, var: 0 },
             ]}
          />
          
          <ReconDeptCard 
             name="Kitchen" 
             sales="280,000" 
             variance="-2,000" 
             status="Balanced"
             data={[
               { item: "Ribeye Steak", open: 10, add: 0, sales: 5, close: 5, actual: 5, var: 0 },
               { item: "Burger Buns", open: 50, add: 20, sales: 40, close: 30, actual: 29, var: -1 },
             ]}
          />
        </div>

        {/* Consolidated View & Actions */}
        <div className="space-y-6">
           <Card className="bg-slate-900 text-white border-slate-800">
             <CardHeader>
               <CardTitle className="text-white">Consolidated Variance</CardTitle>
               <CardDescription className="text-slate-400">Net loss/gain across all departments</CardDescription>
             </CardHeader>
             <CardContent>
               <div className="text-4xl font-bold font-mono tracking-tight text-red-400">
                 - ₦ 14,500
               </div>
               <div className="mt-4 space-y-2">
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Sales Value</span>
                    <span className="font-mono">₦ 730,000</span>
                 </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Variance %</span>
                    <span className="font-mono text-red-400">1.9%</span>
                 </div>
               </div>
             </CardContent>
             <CardFooter>
               <Button variant="secondary" className="w-full">Create Exception Case</Button>
             </CardFooter>
           </Card>

           <Card>
             <CardHeader>
               <CardTitle className="text-sm">Pending Explanations</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                <div className="p-3 bg-muted/50 rounded border text-sm space-y-2">
                   <div className="font-medium text-destructive flex items-center gap-2">
                     <AlertTriangle className="h-4 w-4" /> Coke 33cl (-2)
                   </div>
                   <p className="text-muted-foreground text-xs">Main Bar • ₦ 1,000 value</p>
                   <Button variant="outline" size="sm" className="w-full h-7 text-xs">Add Explanation</Button>
                </div>
                
                <div className="p-3 bg-muted/50 rounded border text-sm space-y-2">
                   <div className="font-medium text-destructive flex items-center gap-2">
                     <AlertTriangle className="h-4 w-4" /> Burger Buns (-1)
                   </div>
                   <p className="text-muted-foreground text-xs">Kitchen • ₦ 500 value</p>
                   <Button variant="outline" size="sm" className="w-full h-7 text-xs">Add Explanation</Button>
                </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}

function ReconDeptCard({ name, sales, variance, status, data }: any) {
  const isNegative = variance.startsWith("-");
  
  return (
    <Card>
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex items-center justify-between">
           <div className="space-y-1">
             <CardTitle className="text-lg">{name}</CardTitle>
             <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Sales: ₦ {sales}</span>
                <span className={isNegative ? "text-destructive font-bold" : "text-emerald-600 font-bold"}>
                   Var: ₦ {variance}
                </span>
             </div>
           </div>
           <Badge variant="outline" className={
              status === "Balanced" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
           }>
             {status}
           </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right text-xs">Open</TableHead>
              <TableHead className="text-right text-xs">Add</TableHead>
              <TableHead className="text-right text-xs">Sold</TableHead>
              <TableHead className="text-right text-xs font-bold">Exp</TableHead>
              <TableHead className="text-right text-xs bg-muted/30">Act</TableHead>
              <TableHead className="text-right text-xs">Var</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-medium text-sm">{row.item}</TableCell>
                <TableCell className="text-right text-muted-foreground">{row.open}</TableCell>
                <TableCell className="text-right text-muted-foreground">{row.add}</TableCell>
                <TableCell className="text-right text-muted-foreground">{row.sales}</TableCell>
                <TableCell className="text-right font-bold">{row.close}</TableCell>
                <TableCell className="text-right bg-muted/30 font-medium">{row.actual}</TableCell>
                <TableCell className={cn(
                  "text-right font-bold",
                  row.var < 0 ? "text-destructive" : row.var > 0 ? "text-blue-600" : "text-muted-foreground"
                )}>
                  {row.var === 0 ? "-" : row.var}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="py-2 bg-muted/10 justify-center">
         <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">View Full Department Report <ChevronRight className="h-3 w-3 ml-1"/></Button>
      </CardFooter>
    </Card>
  );
}

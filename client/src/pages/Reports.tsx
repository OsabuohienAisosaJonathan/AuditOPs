import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Download, Calendar, BarChart3, PieChart, Table as TableIcon } from "lucide-react";

export default function Reports() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate comprehensive audit reports and schedules</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
               <CardTitle>Report Builder</CardTitle>
               <CardDescription>Configure your report parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <Label>Report Type</Label>
                     <Select defaultValue="daily">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                           <SelectItem value="daily">Daily Audit Report</SelectItem>
                           <SelectItem value="weekly">Weekly Variance Summary</SelectItem>
                           <SelectItem value="monthly">Monthly P&L Draft</SelectItem>
                           <SelectItem value="inventory">Inventory Valuation</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="space-y-2">
                     <Label>Date Range</Label>
                     <Select defaultValue="today">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                           <SelectItem value="today">Today (Dec 26)</SelectItem>
                           <SelectItem value="yesterday">Yesterday</SelectItem>
                           <SelectItem value="week">This Week</SelectItem>
                           <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
               </div>

               <div className="space-y-2">
                  <Label>Included Sections</Label>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="flex items-center space-x-2 border p-3 rounded hover:bg-muted/50 transition-colors">
                        <Checkbox id="sec-sales" defaultChecked />
                        <label htmlFor="sec-sales" className="text-sm font-medium leading-none cursor-pointer">Sales & Revenue</label>
                     </div>
                     <div className="flex items-center space-x-2 border p-3 rounded hover:bg-muted/50 transition-colors">
                        <Checkbox id="sec-stock" defaultChecked />
                        <label htmlFor="sec-stock" className="text-sm font-medium leading-none cursor-pointer">Stock & Variance</label>
                     </div>
                     <div className="flex items-center space-x-2 border p-3 rounded hover:bg-muted/50 transition-colors">
                        <Checkbox id="sec-purchases" defaultChecked />
                        <label htmlFor="sec-purchases" className="text-sm font-medium leading-none cursor-pointer">Purchases & GRN</label>
                     </div>
                     <div className="flex items-center space-x-2 border p-3 rounded hover:bg-muted/50 transition-colors">
                        <Checkbox id="sec-exceptions" defaultChecked />
                        <label htmlFor="sec-exceptions" className="text-sm font-medium leading-none cursor-pointer">Exception Log</label>
                     </div>
                  </div>
               </div>

               <div className="pt-4 flex gap-4">
                  <Button className="w-full sm:w-auto gap-2">
                     <FileText className="h-4 w-4" /> Generate PDF Report
                  </Button>
                  <Button variant="outline" className="w-full sm:w-auto gap-2">
                     <Download className="h-4 w-4" /> Download Excel Schedules
                  </Button>
               </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
             <h3 className="text-lg font-medium">Recent Reports</h3>
             <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                   <Card key={i} className="hover:shadow-md transition-shadow cursor-pointer group">
                      <CardContent className="p-4 flex flex-col gap-3">
                         <div className="h-24 bg-muted/30 rounded border border-dashed flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                            <FileText className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                         </div>
                         <div>
                            <div className="font-medium text-sm">Daily Audit Report</div>
                            <div className="text-xs text-muted-foreground">Dec {26 - i}, 2025 • Generated by John</div>
                         </div>
                      </CardContent>
                   </Card>
                ))}
             </div>
          </div>
        </div>

        <div className="space-y-6">
           <Card className="bg-sidebar text-sidebar-foreground border-sidebar-border">
              <CardHeader>
                 <CardTitle className="text-sidebar-foreground">Templates</CardTitle>
                 <CardDescription className="text-sidebar-foreground/60">Standardized reporting formats</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                 {[
                    { title: "Daily Flash", icon: BarChart3 },
                    { title: "Weekly Variance", icon: PieChart },
                    { title: "Month End Pack", icon: TableIcon },
                 ].map((t) => (
                    <Button key={t.title} variant="ghost" className="w-full justify-start hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/80">
                       <t.icon className="mr-2 h-4 w-4" />
                       {t.title}
                    </Button>
                 ))}
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}

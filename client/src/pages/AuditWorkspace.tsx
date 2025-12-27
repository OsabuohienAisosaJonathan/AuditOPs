import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AUDIT_TASKS } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ChevronRight, Upload, AlertCircle, Save, FileText, Trash2, ArrowUpRight, ArrowDownRight, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useClientContext } from "@/lib/client-context";
import { paymentDeclarationsApi, reconciliationHintApi, type ReconciliationHint, type SupportingDocument } from "@/lib/api";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { format } from "date-fns";

export default function AuditWorkspace() {
  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
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
  const { selectedClientId, selectedOutletId, selectedDate } = useClientContext();
  const queryClient = useQueryClient();
  
  const [reportedCash, setReportedCash] = useState("");
  const [reportedPos, setReportedPos] = useState("");
  const [reportedTransfers, setReportedTransfers] = useState("");
  const [notes, setNotes] = useState("");
  const [documents, setDocuments] = useState<SupportingDocument[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const dateStr = selectedDate || format(new Date(), "yyyy-MM-dd");

  const { data: reconciliationHint, isLoading: isLoadingHint, refetch: refetchHint } = useQuery({
    queryKey: ["reconciliation-hint", selectedOutletId, dateStr],
    queryFn: () => selectedOutletId ? reconciliationHintApi.get(selectedOutletId, dateStr) : Promise.resolve(null),
    enabled: !!selectedOutletId,
  });

  const saveDeclarationMutation = useMutation({
    mutationFn: async (data: {
      clientId: string;
      outletId: string;
      date: string;
      reportedCash: string;
      reportedPosSettlement: string;
      reportedTransfers: string;
      notes: string;
      supportingDocuments: SupportingDocument[];
    }) => {
      return paymentDeclarationsApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reconciliation-hint"] });
      toast.success("Payment declaration saved successfully");
      refetchHint();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save payment declaration");
    },
  });

  const handleSaveDeclaration = async () => {
    if (!selectedClientId || !selectedOutletId) {
      toast.error("Please select a client and outlet first");
      return;
    }
    
    setIsSaving(true);
    try {
      await saveDeclarationMutation.mutateAsync({
        clientId: selectedClientId,
        outletId: selectedOutletId,
        date: dateStr,
        reportedCash: reportedCash || "0",
        reportedPosSettlement: reportedPos || "0",
        reportedTransfers: reportedTransfers || "0",
        notes,
        supportingDocuments: documents,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newDoc: SupportingDocument = {
          name: file.name,
          url: reader.result as string,
          type: file.type,
        };
        setDocuments(prev => [...prev, newDoc]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotalReported = () => {
    const cash = parseFloat(reportedCash) || 0;
    const pos = parseFloat(reportedPos) || 0;
    const transfers = parseFloat(reportedTransfers) || 0;
    return cash + pos + transfers;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const getDifferenceStatus = () => {
    if (!reconciliationHint) return { color: "text-muted-foreground", icon: Scale, label: "No data" };
    
    const diff = reconciliationHint.difference.total;
    if (Math.abs(diff) < 0.01) {
      return { color: "text-emerald-600", icon: CheckCircle2, label: "Balanced" };
    } else if (diff > 0) {
      return { color: "text-amber-600", icon: ArrowUpRight, label: `Over by ${formatCurrency(diff)}` };
    } else {
      return { color: "text-red-600", icon: ArrowDownRight, label: `Short by ${formatCurrency(Math.abs(diff))}` };
    }
  };

  const diffStatus = getDifferenceStatus();
  const DiffIcon = diffStatus.icon;

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
      <CardContent className="px-0 flex-1 overflow-auto">
        <div className="space-y-6">
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
                    <TableCell><Input className="text-right h-8 w-28 ml-auto font-mono" placeholder="0.00" data-testid={`input-cash-${dept}`} /></TableCell>
                    <TableCell><Input className="text-right h-8 w-28 ml-auto font-mono" placeholder="0.00" data-testid={`input-pos-${dept}`} /></TableCell>
                    <TableCell><Input className="text-right h-8 w-28 ml-auto font-mono" placeholder="0.00" data-testid={`input-transfer-${dept}`} /></TableCell>
                    <TableCell><Input className="text-right h-8 w-28 ml-auto font-mono text-destructive" placeholder="0.00" data-testid={`input-voids-${dept}`} /></TableCell>
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

          <Card className="border shadow-sm bg-blue-50/30 dark:bg-blue-900/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Reported Payments / Payment Declaration
              </CardTitle>
              <CardDescription>
                Enter the payments reported by management for {dateStr}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reported-cash">Reported Cash (₦)</Label>
                  <Input 
                    id="reported-cash"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={reportedCash}
                    onChange={(e) => setReportedCash(e.target.value)}
                    className="font-mono"
                    data-testid="input-reported-cash"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reported-pos">Reported POS Settlement (₦)</Label>
                  <Input 
                    id="reported-pos"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={reportedPos}
                    onChange={(e) => setReportedPos(e.target.value)}
                    className="font-mono"
                    data-testid="input-reported-pos"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reported-transfers">Reported Transfers Confirmed (₦)</Label>
                  <Input 
                    id="reported-transfers"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={reportedTransfers}
                    onChange={(e) => setReportedTransfers(e.target.value)}
                    className="font-mono"
                    data-testid="input-reported-transfers"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                <span className="text-sm text-muted-foreground">Total Reported Payments:</span>
                <span className="font-mono font-bold text-lg">{formatCurrency(calculateTotalReported())}</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="declaration-notes">Notes</Label>
                <Textarea 
                  id="declaration-notes"
                  placeholder="Any notes about payment discrepancies or special circumstances..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[60px]"
                  data-testid="textarea-declaration-notes"
                />
              </div>

              <div className="space-y-2">
                <Label>Supporting Documents</Label>
                <p className="text-xs text-muted-foreground">Attach POS settlement receipts, bank transfer alerts, etc.</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {documents.map((doc, index) => (
                    <div key={index} className="flex items-center gap-2 bg-background border rounded-lg px-3 py-1.5 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="max-w-[150px] truncate">{doc.name}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 text-destructive hover:text-destructive"
                        onClick={() => removeDocument(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="h-20 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg bg-background text-center p-4 cursor-pointer hover:border-primary transition-colors relative">
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    data-testid="input-upload-documents"
                  />
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">Click to upload or drag files here</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveDeclaration}
                  disabled={isSaving || !selectedClientId || !selectedOutletId}
                  className="gap-2"
                  data-testid="button-save-declaration"
                >
                  {isSaving && <Spinner className="h-4 w-4" />}
                  Save Payment Declaration
                </Button>
              </div>
            </CardContent>
          </Card>

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
                 <CardContent className="space-y-3">
                     {isLoadingHint ? (
                       <div className="flex items-center justify-center py-4">
                         <Spinner className="h-6 w-6" />
                       </div>
                     ) : !selectedOutletId ? (
                       <p className="text-sm text-muted-foreground text-center py-4">
                         Select an outlet to see reconciliation
                       </p>
                     ) : (
                       <>
                         <div className="space-y-2 text-sm">
                           <div className="flex justify-between">
                              <span className="text-muted-foreground">Captured Sales (Cash):</span>
                              <span className="font-mono">{formatCurrency(reconciliationHint?.captured.totalCash || 0)}</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="text-muted-foreground">Captured Sales (POS):</span>
                              <span className="font-mono">{formatCurrency(reconciliationHint?.captured.totalPos || 0)}</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="text-muted-foreground">Captured Sales (Transfer):</span>
                              <span className="font-mono">{formatCurrency(reconciliationHint?.captured.totalTransfer || 0)}</span>
                           </div>
                           <div className="flex justify-between font-medium border-t pt-2">
                              <span>Total Captured:</span>
                              <span className="font-mono">{formatCurrency(reconciliationHint?.captured.totalSales || 0)}</span>
                           </div>
                         </div>
                         
                         <Separator />
                         
                         <div className="space-y-2 text-sm">
                           <div className="flex justify-between">
                              <span className="text-muted-foreground">Reported Payments:</span>
                              <span className="font-mono">{formatCurrency(reconciliationHint?.reported?.total || 0)}</span>
                           </div>
                         </div>
                         
                         <Separator />
                         
                         <div className={cn("flex justify-between items-center font-bold", diffStatus.color)}>
                            <span className="flex items-center gap-1">
                              <DiffIcon className="h-4 w-4" />
                              Difference:
                            </span>
                            <span className="font-mono">{diffStatus.label}</span>
                         </div>

                         {reconciliationHint?.reported?.notes && (
                           <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                             <strong>Note:</strong> {reconciliationHint.reported.notes}
                           </div>
                         )}
                       </>
                     )}
                 </CardContent>
             </Card>
          </div>
          
          <div className="flex justify-end pt-4">
               <Button className="w-48 gap-2" data-testid="button-complete-sales">
                   Complete Sales Step
                   <ChevronRight className="h-4 w-4" />
               </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

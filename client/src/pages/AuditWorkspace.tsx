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
  const { selectedClientId, selectedOutletId, selectedDate } = useClientContext();
  const dateStr = selectedDate || format(new Date(), "yyyy-MM-dd");

  // Shared state for real-time reconciliation
  const [salesData, setSalesData] = useState<Record<string, { cash: string, pos: string, transfer: string, voids: string }>>({
    "Main Bar": { cash: "", pos: "", transfer: "", voids: "" },
    "VIP Lounge": { cash: "", pos: "", transfer: "", voids: "" },
    "Kitchen": { cash: "", pos: "", transfer: "", voids: "" },
  });

  const [reportedCash, setReportedCash] = useState("");
  const [reportedPos, setReportedPos] = useState("");
  const [reportedTransfers, setReportedTransfers] = useState("");

  const calculateSalesTotals = () => {
    let cash = 0, pos = 0, transfer = 0, total = 0;
    Object.values(salesData).forEach(d => {
      const c = parseFloat(d.cash) || 0;
      const p = parseFloat(d.pos) || 0;
      const t = parseFloat(d.transfer) || 0;
      cash += c;
      pos += p;
      transfer += t;
      total += (c + p + t);
    });
    return { cash, pos, transfer, total };
  };

  const calculateTotalReported = () => {
    const cash = parseFloat(reportedCash) || 0;
    const pos = parseFloat(reportedPos) || 0;
    const transfers = parseFloat(reportedTransfers) || 0;
    return cash + pos + transfers;
  };

  const salesTotals = calculateSalesTotals();
  const totalReported = calculateTotalReported();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const getDifferenceStatus = () => {
    const totalCaptured = salesTotals.total;
    const totalReportedVal = totalReported;
    const diff = totalCaptured - totalReportedVal;

    if (Math.abs(diff) < 0.01) {
      return { color: "text-emerald-600", icon: CheckCircle2, label: "Balanced", diff };
    } else if (diff > 0) {
      return { color: "text-amber-600", icon: ArrowUpRight, label: `Short by ${formatCurrency(diff)}`, diff };
    } else {
      return { color: "text-red-600", icon: ArrowDownRight, label: `Over by ${formatCurrency(Math.abs(diff))}`, diff };
    }
  };

  const diffStatus = getDifferenceStatus();
  const DiffIcon = diffStatus.icon;

  const getBreakdown = () => {
    const reportedC = parseFloat(reportedCash) || 0;
    const reportedP = parseFloat(reportedPos) || 0;
    const reportedT = parseFloat(reportedTransfers) || 0;

    return [
      { label: "Cash", captured: salesTotals.cash, reported: reportedC, diff: salesTotals.cash - reportedC },
      { label: "POS", captured: salesTotals.pos, reported: reportedP, diff: salesTotals.pos - reportedP },
      { label: "Transfer", captured: salesTotals.transfer, reported: reportedT, diff: salesTotals.transfer - reportedT },
    ];
  };

  const breakdown = getBreakdown();

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
          </div>

          <div className="flex-1 overflow-auto pr-2">
            <TabsContent value="sales" className="mt-0 h-full">
              <SalesCapture 
                salesData={salesData} 
                setSalesData={setSalesData}
                reportedCash={reportedCash}
                setReportedCash={setReportedCash}
                reportedPos={reportedPos}
                setReportedPos={setReportedPos}
                reportedTransfers={reportedTransfers}
                setReportedTransfers={setReportedTransfers}
                salesTotals={salesTotals}
                calculateTotalReported={calculateTotalReported}
                breakdown={breakdown}
                diffStatus={diffStatus}
                formatCurrency={formatCurrency}
                DiffIcon={DiffIcon}
              />
            </TabsContent>
            <TabsContent value="recon" className="mt-0">
              <Card className="border-none shadow-none">
                <CardHeader className="px-0 pt-0">
                  <CardTitle>Daily Reconciliation</CardTitle>
                  <CardDescription>Final comparison of all captured data vs physical counts and payments</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                  <div className="grid grid-cols-3 gap-6 mb-6">
                    <Card className="bg-emerald-50/50 dark:bg-emerald-900/10">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase text-emerald-600">Sales vs Payments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold font-mono">{diffStatus.label}</div>
                        <p className="text-xs text-muted-foreground mt-1">Based on current capture session</p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Theoretical</TableHead>
                          <TableHead className="text-right">Actual/Reported</TableHead>
                          <TableHead className="text-right">Variance</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {breakdown.map(item => (
                          <TableRow key={item.label}>
                            <TableCell className="font-medium">{item.label} Payments</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(item.captured)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(item.reported)}</TableCell>
                            <TableCell className={cn("text-right font-mono", item.diff !== 0 ? "text-amber-600" : "text-emerald-600")}>
                              {formatCurrency(item.diff)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={item.diff === 0 ? "outline" : "secondary"}>
                                {item.diff === 0 ? "Matched" : "Review Needed"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

function SalesCapture({ 
  salesData, setSalesData, reportedCash, setReportedCash, reportedPos, setReportedPos, reportedTransfers, setReportedTransfers,
  salesTotals, calculateTotalReported, breakdown, diffStatus, formatCurrency, DiffIcon 
}: any) {
  const { selectedClientId, selectedOutletId, selectedDate } = useClientContext();
  const queryClient = useQueryClient();
  const dateStr = selectedDate || format(new Date(), "yyyy-MM-dd");

  const [notes, setNotes] = useState("");
  const [documents, setDocuments] = useState<SupportingDocument[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleSalesChange = (dept: string, field: string, value: string) => {
    setSalesData((prev: any) => ({
      ...prev,
      [dept]: { ...prev[dept], [field]: value }
    }));
  };

  const handleSaveDeclaration = async () => {
    if (!selectedClientId || !selectedOutletId) {
      toast.error("Please select a client and outlet first");
      return;
    }
    
    setIsSaving(true);
    try {
      await paymentDeclarationsApi.create({
        clientId: selectedClientId,
        outletId: selectedOutletId,
        date: dateStr,
        reportedCash: reportedCash || "0",
        reportedPosSettlement: reportedPos || "0",
        reportedTransfers: reportedTransfers || "0",
        notes,
        supportingDocuments: documents,
      });
      queryClient.invalidateQueries({ queryKey: ["reconciliation-hint"] });
      toast.success("Payment declaration saved successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to save payment declaration");
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
        setDocuments(prev => [...prev, { name: file.name, url: reader.result as string, type: file.type }]);
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <Card className="h-full flex flex-col border-none shadow-none">
      <CardHeader className="px-0 pt-0 pb-4">
        <CardTitle>Sales Capture</CardTitle>
      </CardHeader>
      <CardContent className="px-0 flex-1 overflow-auto">
        <div className="space-y-6">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[180px]">Department</TableHead>
                  <TableHead className="text-right">Cash (₦)</TableHead>
                  <TableHead className="text-right">POS (₦)</TableHead>
                  <TableHead className="text-right">Transfer (₦)</TableHead>
                  <TableHead className="text-right">Total (₦)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.keys(salesData).map((dept) => {
                  const d = salesData[dept];
                  const deptTotal = (parseFloat(d.cash) || 0) + (parseFloat(d.pos) || 0) + (parseFloat(d.transfer) || 0);
                  return (
                    <TableRow key={dept}>
                      <TableCell className="font-medium">{dept}</TableCell>
                      <TableCell><Input className="text-right h-8 w-28 ml-auto" value={d.cash} onChange={(e) => handleSalesChange(dept, "cash", e.target.value)} /></TableCell>
                      <TableCell><Input className="text-right h-8 w-28 ml-auto" value={d.pos} onChange={(e) => handleSalesChange(dept, "pos", e.target.value)} /></TableCell>
                      <TableCell><Input className="text-right h-8 w-28 ml-auto" value={d.transfer} onChange={(e) => handleSalesChange(dept, "transfer", e.target.value)} /></TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(deptTotal).replace("NGN", "").trim()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <Card className="border shadow-sm">
            <CardHeader><CardTitle className="text-base">Payment Declaration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Cash</Label><Input type="number" value={reportedCash} onChange={(e) => setReportedCash(e.target.value)} /></div>
                <div className="space-y-2"><Label>POS</Label><Input type="number" value={reportedPos} onChange={(e) => setReportedPos(e.target.value)} /></div>
                <div className="space-y-2"><Label>Transfers</Label><Input type="number" value={reportedTransfers} onChange={(e) => setReportedTransfers(e.target.value)} /></div>
              </div>
              <Button onClick={handleSaveDeclaration} disabled={isSaving}>Save Declaration</Button>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader><CardTitle className="text-sm">Reconciliation Hint</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {breakdown.map((item: any) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span>{item.label} Variance:</span>
                  <span className={cn("font-mono font-bold", item.diff > 0 ? "text-amber-600" : item.diff < 0 ? "text-red-600" : "text-emerald-600")}>
                    {formatCurrency(item.diff)}
                  </span>
                </div>
              ))}
              <Separator />
              <div className={cn("flex justify-between items-center font-bold", diffStatus.color)}>
                <span><DiffIcon className="h-4 w-4 inline mr-1" />Net:</span>
                <span>{diffStatus.label}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

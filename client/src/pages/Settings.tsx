import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationSettingsApi, userSettingsApi, billingApi } from "@/lib/api";
import { useCurrency } from "@/lib/currency-context";
import { useAuth } from "@/lib/auth-context";
import { useEntitlements } from "@/lib/entitlements-context";
import { toast } from "sonner";
import { Building2, Check, Loader2, User, Settings2, CreditCard, Moon, Sun, Bell, Download, FileText, Clock, Calendar } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { format, subDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

function DataExportCard() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"xlsx" | "csv">("xlsx");
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showCustomRange, setShowCustomRange] = useState(false);

  const handleExport = async (useRange: boolean = false) => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("format", exportFormat);
      if (useRange) {
        params.set("startDate", startDate.toISOString());
        params.set("endDate", endDate.toISOString());
      }
      
      toast.info("Preparing export...");
      
      const response = await fetch(`/api/export?${params.toString()}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportFormat === "csv" 
        ? `audit-export-${format(new Date(), "yyyy-MM-dd")}.zip`
        : `audit-export-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Download started!");
    } catch (error: any) {
      toast.error(error.message || "Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Data Export</CardTitle>
        </div>
        <CardDescription>Export your audit data for backup or analysis</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Label>Format:</Label>
            <Select value={exportFormat} onValueChange={(v: "xlsx" | "csv") => setExportFormat(v)}>
              <SelectTrigger className="w-[180px]" data-testid="select-export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                <SelectItem value="csv">CSV (ZIP)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Full Data Export</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Export all clients, items, inventory, reconciliations, and exceptions (last 30 days).
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleExport(false)}
              disabled={isExporting}
              data-testid="button-export-full"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export All
                </>
              )}
            </Button>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Date Range Export</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Export data from a specific time period.
            </p>
            {!showCustomRange ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowCustomRange(true)}
                data-testid="button-show-range"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Select Date Range
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2 items-center flex-wrap">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="justify-start text-left font-normal w-[130px]">
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(startDate, "MMM d, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => date && setStartDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-sm text-muted-foreground">to</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="justify-start text-left font-normal w-[130px]">
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(endDate, "MMM d, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => date && setEndDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleExport(true)}
                  disabled={isExporting}
                  data-testid="button-export-range"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export Range
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
        <Separator />
        <div>
          <p className="text-sm text-muted-foreground">
            Exports include: Clients, Categories, Departments, Items, Suppliers, GRNs, SRDs, Exceptions, Receivables, and Surplus data.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const { currency, setCurrency, options } = useCurrency();
  const { theme: currentTheme, setTheme } = useTheme();
  const { refresh: refreshEntitlements } = useEntitlements();
  const queryClient = useQueryClient();
  
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hasCompanyChanges, setHasCompanyChanges] = useState(false);
  
  const { data: orgSettings, isLoading } = useQuery({
    queryKey: ["organization-settings"],
    queryFn: organizationSettingsApi.get,
  });
  
  const { data: userSettings, isLoading: isLoadingUserSettings } = useQuery({
    queryKey: ["user-settings"],
    queryFn: userSettingsApi.get,
  });
  
  const { data: billingData, isLoading: isLoadingBilling } = useQuery({
    queryKey: ["billing-details"],
    queryFn: billingApi.getDetails,
    enabled: user?.role === "super_admin",
  });
  
  useEffect(() => {
    if (orgSettings) {
      setAddress(orgSettings.address || "");
      setEmail(orgSettings.email || "");
      setPhone(orgSettings.phone || "");
    }
  }, [orgSettings]);
  
  const updateOrgMutation = useMutation({
    mutationFn: (data: { companyName?: string; address?: string; email?: string; phone?: string }) => 
      organizationSettingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-settings"] });
      setHasCompanyChanges(false);
      toast.success("Company profile updated");
    },
    onError: () => {
      toast.error("Failed to update company profile");
    },
  });
  
  const updateUserSettingsMutation = useMutation({
    mutationFn: userSettingsApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
      toast.success("Preferences saved");
    },
    onError: () => {
      toast.error("Failed to save preferences");
    },
  });
  
  const handleSaveCompany = () => {
    updateOrgMutation.mutate({ address, email, phone });
  };
  
  const handleFieldChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setter(e.target.value);
    setHasCompanyChanges(true);
  };

  const handleAutoSaveToggle = (checked: boolean) => {
    updateUserSettingsMutation.mutate({ autoSaveEnabled: checked });
  };

  const handleVarianceThresholdToggle = (checked: boolean) => {
    const threshold = checked ? "5.00" : "0.00";
    updateUserSettingsMutation.mutate({ varianceThresholdPercent: threshold });
  };

  const handleThemeToggle = (checked: boolean) => {
    const newTheme = checked ? "dark" : "light";
    updateUserSettingsMutation.mutate({ theme: newTheme });
    setTheme(newTheme);
  };

  useEffect(() => {
    if (userSettings?.theme && userSettings.theme !== currentTheme) {
      setTheme(userSettings.theme as "dark" | "light");
    }
  }, [userSettings?.theme, currentTheme, setTheme]);

  const isSuperAdmin = user?.role === "super_admin";
  const autoSaveEnabled = userSettings?.autoSaveEnabled ?? true;
  const varianceAlertsEnabled = parseFloat(userSettings?.varianceThresholdPercent || "5") > 0;
  const isDarkMode = currentTheme === "dark";

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your profile and application preferences</p>
        </div>
        {isSuperAdmin && hasCompanyChanges && (
          <Button onClick={handleSaveCompany} disabled={updateOrgMutation.isPending} data-testid="button-save-settings">
            {updateOrgMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        )}
      </div>

      <div className="grid gap-8">
        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Company Profile</CardTitle>
              </div>
              <CardDescription>Organization details used in reports and documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-email">Email</Label>
                      <Input 
                        id="company-email"
                        type="email"
                        value={email}
                        onChange={handleFieldChange(setEmail)}
                        placeholder="contact@company.com"
                        data-testid="input-company-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-phone">Phone</Label>
                      <Input 
                        id="company-phone"
                        value={phone}
                        onChange={handleFieldChange(setPhone)}
                        placeholder="+234 800 000 0000"
                        data-testid="input-company-phone"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="company-address">Address</Label>
                      <Textarea 
                        id="company-address"
                        value={address}
                        onChange={handleFieldChange(setAddress)}
                        placeholder="Enter company address"
                        rows={2}
                        data-testid="input-company-address"
                      />
                      {!address && (
                        <p className="text-xs text-amber-500">Add address to complete reports</p>
                      )}
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="currency">Default Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="w-48" data-testid="select-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((opt) => (
                          <SelectItem key={opt.code} value={opt.code}>
                            {opt.symbol} {opt.code} - {opt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Currency used throughout the application for monetary values
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Profile</CardTitle>
            </div>
            <CardDescription>Manage your public profile and role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 border">
                <AvatarFallback className="text-lg">
                  {user?.fullName?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user?.fullName || "User"}</p>
                <p className="text-sm text-muted-foreground capitalize">{user?.role?.replace("_", " ")}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input defaultValue={user?.fullName || ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input defaultValue={user?.username || ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input defaultValue={user?.role?.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()) || ""} disabled className="bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Audit Preferences</CardTitle>
            </div>
            <CardDescription>Configure default behaviors for the audit workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingUserSettings ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Auto-Save Workspace</Label>
                    <p className="text-sm text-muted-foreground">Automatically save progress every minute</p>
                  </div>
                  <Switch 
                    checked={autoSaveEnabled}
                    onCheckedChange={handleAutoSaveToggle}
                    disabled={updateUserSettingsMutation.isPending}
                    data-testid="switch-auto-save"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Variance Threshold Alerts</Label>
                    <p className="text-sm text-muted-foreground">Notify me when variance exceeds 5%</p>
                  </div>
                  <Switch 
                    checked={varianceAlertsEnabled}
                    onCheckedChange={handleVarianceThresholdToggle}
                    disabled={updateUserSettingsMutation.isPending}
                    data-testid="switch-variance-alerts"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      <Label className="text-base">Dark Mode</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">Enable dark appearance for low-light environments</p>
                  </div>
                  <Switch 
                    checked={isDarkMode}
                    onCheckedChange={handleThemeToggle}
                    disabled={updateUserSettingsMutation.isPending}
                    data-testid="switch-dark-mode"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Billing & Plan</CardTitle>
                </div>
                {billingData?.paystackConfigured && (
                  <Button
                    variant={billingData?.isExpired ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      window.location.href = "/#/pricing";
                    }}
                    data-testid="button-renew-subscription"
                  >
                    {billingData?.isExpired ? "Renew Now" : "Extend Subscription"}
                  </Button>
                )}
              </div>
              <CardDescription>View your subscription and billing details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingBilling ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {billingData?.isExpired && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                        Your subscription has expired. Please renew to continue using MiAuditOps.
                      </p>
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Current Plan</Label>
                      <p className="font-medium text-lg capitalize">{billingData?.plan || "Starter"}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Billing Cycle</Label>
                      <p className="font-medium capitalize">{billingData?.billingPeriod || "Monthly"}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Status</Label>
                      {billingData?.isActive ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          {billingData?.status === "trial" ? "Trial" : "Active"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                          {billingData?.status === "past_due" ? "Past Due" : billingData?.isExpired ? "Expired" : billingData?.status || "Inactive"}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Start Date</Label>
                      <p className="font-medium">
                        {billingData?.startDate ? new Date(billingData.startDate).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Expiry Date</Label>
                      <p className="font-medium">
                        {billingData?.endDate ? new Date(billingData.endDate).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Next Billing Date</Label>
                      <p className="font-medium">
                        {billingData?.nextBillingDate ? new Date(billingData.nextBillingDate).toLocaleDateString() : "—"}
                      </p>
                    </div>
                  </div>
                  {(billingData?.lastPaymentDate || billingData?.lastPaymentAmount) && (
                    <>
                      <Separator />
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-muted-foreground text-sm">Last Payment Date</Label>
                          <p className="font-medium">
                            {billingData?.lastPaymentDate ? new Date(billingData.lastPaymentDate).toLocaleDateString() : "—"}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground text-sm">Last Payment Amount</Label>
                          <p className="font-medium">
                            {billingData?.lastPaymentAmount ? `₦${parseFloat(billingData.lastPaymentAmount).toLocaleString()}` : "—"}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground text-sm mb-3 block">Usage</Label>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">
                          {billingData?.usage?.clientsUsed ?? 0} / {billingData?.usage?.clientsAllowed ?? "∞"}
                        </p>
                        <p className="text-sm text-muted-foreground">Clients Used</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">
                          {(billingData?.usage?.totalMainStores ?? 0) + (billingData?.usage?.totalDeptStores ?? 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">SRD Stores</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">
                          {billingData?.usage?.seatsUsed ?? 0} / {billingData?.usage?.seatsAllowed ?? "∞"}
                        </p>
                        <p className="text-sm text-muted-foreground">Team Members</p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">Plan Features</h4>
                    <div className="grid md:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        {billingData?.entitlements?.canDownloadReports ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <span className="h-4 w-4 text-muted-foreground">—</span>
                        )}
                        <span>Report Downloads</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {billingData?.entitlements?.canExportData ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <span className="h-4 w-4 text-muted-foreground">—</span>
                        )}
                        <span>Data Exports</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {billingData?.entitlements?.canAccessApi ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <span className="h-4 w-4 text-muted-foreground">—</span>
                        )}
                        <span>API Access</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {billingData?.entitlements?.canCustomBranding ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <span className="h-4 w-4 text-muted-foreground">—</span>
                        )}
                        <span>Custom Branding</span>
                      </div>
                    </div>
                  </div>
                  {!billingData?.paystackConfigured && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        To upgrade, extend, or modify your subscription, please contact your MiAuditOps administrator.
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Notification Preferences</CardTitle>
            </div>
            <CardDescription>Control how and when you receive alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingUserSettings ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive important alerts via email</p>
                  </div>
                  <Switch 
                    checked={userSettings?.emailNotificationsEnabled ?? true}
                    onCheckedChange={(checked) => updateUserSettingsMutation.mutate({ emailNotificationsEnabled: checked })}
                    disabled={updateUserSettingsMutation.isPending}
                    data-testid="switch-email-notifications"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Exception Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get notified when new exceptions are created</p>
                  </div>
                  <Switch 
                    checked={userSettings?.exceptionAlertsEnabled ?? true}
                    onCheckedChange={(checked) => updateUserSettingsMutation.mutate({ exceptionAlertsEnabled: checked })}
                    disabled={updateUserSettingsMutation.isPending}
                    data-testid="switch-exception-alerts"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Daily Digest</Label>
                    <p className="text-sm text-muted-foreground">Receive a summary of daily audit activity</p>
                  </div>
                  <Switch 
                    checked={userSettings?.dailyDigestEnabled ?? false}
                    onCheckedChange={(checked) => updateUserSettingsMutation.mutate({ dailyDigestEnabled: checked })}
                    disabled={updateUserSettingsMutation.isPending}
                    data-testid="switch-daily-digest"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {isSuperAdmin && (
          <DataExportCard />
        )}
      </div>
    </div>
  );
}

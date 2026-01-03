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
import { organizationSettingsApi, userSettingsApi } from "@/lib/api";
import { useCurrency } from "@/lib/currency-context";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Building2, Check, Loader2, User, Settings2, CreditCard, Moon, Sun, Bell, Download, FileText, Clock } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export default function Settings() {
  const { user } = useAuth();
  const { currency, setCurrency, options } = useCurrency();
  const { theme: currentTheme, setTheme } = useTheme();
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
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Billing & Plan</CardTitle>
              </div>
              <CardDescription>View your subscription and billing details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">Current Plan</Label>
                  <p className="font-medium text-lg capitalize">{orgSettings?.currency === "NGN" ? "Starter" : "Growth"}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">Billing Cycle</Label>
                  <p className="font-medium">Monthly</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">Status</Label>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    Active
                  </span>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">Next Billing Date</Label>
                  <p className="font-medium">—</p>
                </div>
              </div>
              <Separator />
              <div>
                <Label className="text-muted-foreground text-sm mb-3 block">Usage</Label>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">—</p>
                    <p className="text-sm text-muted-foreground">Clients Used</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">—</p>
                    <p className="text-sm text-muted-foreground">SRD Stores</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">—</p>
                    <p className="text-sm text-muted-foreground">Team Members</p>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button variant="outline" disabled>
                  Upgrade Plan
                </Button>
              </div>
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
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Data Export</CardTitle>
              </div>
              <CardDescription>Export your audit data for backup or analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Full Data Export</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Export all clients, items, inventory, reconciliations, and exceptions.
                  </p>
                  <Button variant="outline" size="sm" disabled data-testid="button-export-full">
                    <Download className="mr-2 h-4 w-4" />
                    Export All (Coming Soon)
                  </Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Date Range Export</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Export data from a specific time period.
                  </p>
                  <Button variant="outline" size="sm" disabled data-testid="button-export-range">
                    <Download className="mr-2 h-4 w-4" />
                    Custom Export (Coming Soon)
                  </Button>
                </div>
              </div>
              <Separator />
              <div>
                <Label className="text-muted-foreground text-sm mb-3 block">Recent Exports</Label>
                <p className="text-sm text-muted-foreground italic">No exports yet. Start an export above.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

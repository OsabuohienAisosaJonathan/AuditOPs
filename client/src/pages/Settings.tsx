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
import { organizationSettingsApi } from "@/lib/api";
import { useCurrency } from "@/lib/currency-context";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Building2, Check, Loader2 } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const { currency, setCurrency, options } = useCurrency();
  const queryClient = useQueryClient();
  
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  
  const { data: orgSettings, isLoading } = useQuery({
    queryKey: ["organization-settings"],
    queryFn: organizationSettingsApi.get,
  });
  
  useEffect(() => {
    if (orgSettings) {
      setCompanyName(orgSettings.companyName || "");
      setAddress(orgSettings.address || "");
      setEmail(orgSettings.email || "");
      setPhone(orgSettings.phone || "");
    }
  }, [orgSettings]);
  
  const updateMutation = useMutation({
    mutationFn: (data: { companyName?: string; address?: string; email?: string; phone?: string }) => 
      organizationSettingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-settings"] });
      setHasChanges(false);
      toast.success("Company profile updated");
    },
    onError: () => {
      toast.error("Failed to update company profile");
    },
  });
  
  const handleSave = () => {
    updateMutation.mutate({ companyName, address, email, phone });
  };
  
  const handleFieldChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setter(e.target.value);
    setHasChanges(true);
  };

  const isSuperAdmin = user?.role === "super_admin";

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your profile and application preferences</p>
        </div>
        {isSuperAdmin && hasChanges && (
          <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-settings">
            {updateMutation.isPending ? (
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
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="company-name">Company Name</Label>
                      <Input 
                        id="company-name"
                        value={companyName}
                        onChange={handleFieldChange(setCompanyName)}
                        placeholder="Enter company name"
                        data-testid="input-company-name"
                      />
                    </div>
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
            <CardTitle>Profile</CardTitle>
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
            <CardTitle>Audit Preferences</CardTitle>
            <CardDescription>Configure default behaviors for the audit workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Auto-Save Workspace</Label>
                <p className="text-sm text-muted-foreground">Automatically save progress every minute</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Variance Threshold Alerts</Label>
                <p className="text-sm text-muted-foreground">Notify me when variance exceeds 5%</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Enable dark appearance for low-light environments</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

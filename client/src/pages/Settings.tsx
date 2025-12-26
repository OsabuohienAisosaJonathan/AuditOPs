import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Settings() {
  return (
    <div className="space-y-6 max-w-[1000px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your profile and application preferences</p>
        </div>
        <Button>Save Changes</Button>
      </div>

      <div className="grid gap-8">
        <Card>
           <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Manage your public profile and role</CardDescription>
           </CardHeader>
           <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                 <Avatar className="h-20 w-20 border">
                    <AvatarFallback className="text-lg">JD</AvatarFallback>
                 </Avatar>
                 <Button variant="outline" size="sm">Change Avatar</Button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input defaultValue="John Doe" />
                 </div>
                 <div className="space-y-2">
                    <Label>Email</Label>
                    <Input defaultValue="john.doe@miemploya.com" disabled />
                 </div>
                 <div className="space-y-2">
                    <Label>Role</Label>
                    <Input defaultValue="Senior Auditor" disabled className="bg-muted" />
                 </div>
                 <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input defaultValue="+234 800 000 0000" />
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

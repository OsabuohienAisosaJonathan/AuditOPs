import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { setupApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Setup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["setup-status"],
    queryFn: setupApi.getStatus,
  });

  useEffect(() => {
    if (status && !status.setupRequired) {
      setLocation("/");
    }
    if (status?.requiresSecret) {
      setShowSecret(true);
    }
  }, [status, setLocation]);

  const handleSetup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      fullName: formData.get("fullName") as string,
      email: formData.get("email") as string,
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      bootstrapSecret: formData.get("bootstrapSecret") as string,
    };

    const confirmPassword = formData.get("confirmPassword") as string;

    if (data.password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same",
      });
      setIsLoading(false);
      return;
    }

    try {
      const result = await setupApi.bootstrap(data);
      toast({
        title: "Setup Complete",
        description: result.message,
      });
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Setup failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/20">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!status?.setupRequired) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Setup Already Complete</h2>
            <p className="text-muted-foreground mb-4">
              A Super Admin already exists. Redirecting to login...
            </p>
            <Button onClick={() => setLocation("/")} data-testid="button-go-to-login">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/20 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto h-14 w-14 rounded-lg bg-primary flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-display">Initial Setup</CardTitle>
          <CardDescription>
            Create the first Super Admin account to get started with Miemploya AuditOps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">Important Security Notice</p>
                <p>This Super Admin account will have full access to all system features. Store your credentials securely and never share them.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSetup} className="space-y-4">
            {showSecret && (
              <div className="space-y-2">
                <Label htmlFor="bootstrapSecret">Bootstrap Secret</Label>
                <Input
                  id="bootstrapSecret"
                  name="bootstrapSecret"
                  type="password"
                  placeholder="Enter bootstrap secret"
                  required
                  data-testid="input-bootstrap-secret"
                />
                <p className="text-xs text-muted-foreground">
                  Contact your system administrator for the bootstrap secret
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="John Doe"
                required
                data-testid="input-full-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@miemploya.com"
                required
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="admin"
                required
                data-testid="input-username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Min 8 chars, uppercase, lowercase, number"
                required
                minLength={8}
                data-testid="input-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                required
                data-testid="input-confirm-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-create-admin"
            >
              {isLoading ? "Creating Super Admin..." : "Create Super Admin Account"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Password must be at least 8 characters with uppercase, lowercase, and numbers
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

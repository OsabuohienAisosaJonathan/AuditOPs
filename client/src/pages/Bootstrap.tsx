import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, CheckCircle } from "lucide-react";

export default function Bootstrap() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    bootstrapKey: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    
    if (!formData.fullName.trim()) {
      setError("Full name is required");
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log("[Bootstrap] Submitting form...");
      const payload = {
        email: formData.email,
        username: formData.username || formData.email,
        password: formData.password,
        fullName: formData.fullName,
        bootstrapKey: formData.bootstrapKey,
      };
      console.log("[Bootstrap] Payload:", { ...payload, password: "***" });
      
      const response = await fetch("/api/owner/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      console.log("[Bootstrap] Response status:", response.status);
      const data = await response.json();
      console.log("[Bootstrap] Response data:", data);
      
      if (!response.ok) {
        throw new Error(data.message || data.error || "Bootstrap failed");
      }
      
      setSuccess(true);
      setTimeout(() => {
        setLocation("/owner/login");
      }, 2000);
    } catch (err: any) {
      console.error("[Bootstrap] Error:", err);
      setError(err.message || "Failed to create admin account");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold text-green-600">Account Created!</h2>
              <p className="text-muted-foreground">Redirecting to login...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Admin Bootstrap</CardTitle>
          <CardDescription>
            Create your super admin account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="bootstrapKey">Bootstrap Key (required in production)</Label>
              <Input
                id="bootstrapKey"
                type="password"
                data-testid="input-bootstrap-key"
                placeholder="Enter the ADMIN_BOOTSTRAP_KEY secret"
                value={formData.bootstrapKey}
                onChange={(e) => setFormData({ ...formData, bootstrapKey: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank in development. Required for production setup.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                data-testid="input-fullname"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                data-testid="input-email"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username">Username (optional)</Label>
              <Input
                id="username"
                data-testid="input-username"
                placeholder="Leave blank to use email"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                data-testid="input-password"
                placeholder="Min 8 chars, with upper/lower/number"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                data-testid="input-confirm-password"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            </div>
            
            <Button
              type="submit"
              className="w-full"
              data-testid="button-bootstrap"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Super Admin Account"
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center mt-4">
              This page is for initial setup only. In production, an ADMIN_BOOTSTRAP_KEY is required.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

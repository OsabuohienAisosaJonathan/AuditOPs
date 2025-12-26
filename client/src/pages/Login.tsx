import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation } from "wouter";
import { useState } from "react";
import { authApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    try {
      const user = await authApi.login(username, password);
      toast({
        title: "Welcome back!",
        description: `Signed in as ${user.fullName}`,
      });
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Invalid credentials",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-xl border border-border shadow-lg">
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded bg-primary flex items-center justify-center mb-4">
            <span className="text-white text-2xl font-display font-bold">M</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Sign in to 
          Miemploya AuditOps</h1>
          <p className="text-sm text-muted-foreground">Enter your credentials to access the workspace</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input 
              id="username" 
              name="username"
              type="text" 
              placeholder="john.doe" 
              className="h-10" 
              required
              data-testid="input-username"
              defaultValue="john.doe"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <a href="#" className="text-xs font-medium text-primary hover:underline">Forgot password?</a>
            </div>
            <Input 
              id="password" 
              name="password"
              type="password" 
              className="h-10" 
              required
              data-testid="input-password"
              defaultValue="demo123"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox id="remember" data-testid="checkbox-remember" />
            <label
              htmlFor="remember"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
            >
              Remember me
            </label>
          </div>

          <Button 
            type="submit" 
            className="w-full h-10 font-medium" 
            disabled={isLoading}
            data-testid="button-login"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="text-center text-xs text-muted-foreground">
          <p className="mb-2">Demo credentials: <strong>john.doe</strong> / <strong>demo123</strong></p>
          &copy; 2025 Miemploya Audit Services. All rights reserved.
        </div>
      </div>
    </div>
  );
}

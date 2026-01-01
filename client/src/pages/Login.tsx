import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation, Link } from "wouter";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@/assets/miauditops-logo.jpeg";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    try {
      const user = await login(username, password);
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
          <div className="mx-auto mb-4">
            <img src={logoImage} alt="MiAuditOps" className="h-32 mx-auto object-contain" />
          </div>
          <p className="text-sm text-muted-foreground">Enter your credentials to access the workspace</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Email or Username</Label>
            <Input 
              id="username" 
              name="username"
              type="text" 
              placeholder="you@example.com" 
              className="h-10" 
              required
              data-testid="input-username"
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

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline" data-testid="link-signup">
              Sign up
            </Link>
          </p>
          <p className="text-xs text-muted-foreground">
            &copy; 2025 Miemploya Audit Services. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

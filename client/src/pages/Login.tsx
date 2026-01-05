import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation, Link } from "wouter";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Mail, Play, Eye, EyeOff, Activity } from "lucide-react";
import logoImage from "@/assets/logo2.png";
import { logAuthEvent } from "@/lib/auth-debug";

const isDevelopment = import.meta.env.DEV;

interface HealthCheckResult {
  ok: boolean;
  serverTime?: string;
  dbLatency?: number;
  dbOk?: boolean;
  error?: string;
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);

  const checkServerHealth = async () => {
    setIsCheckingHealth(true);
    setHealthResult(null);
    logAuthEvent("HEALTH_CHECK", { message: "Manual health check triggered" });
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch("/api/health", { 
        signal: controller.signal,
        credentials: "include"
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setHealthResult({
          ok: data.ok,
          serverTime: data.serverTime,
          dbLatency: data.db?.latencyMs,
          dbOk: data.db?.ok,
        });
      } else {
        setHealthResult({ ok: false, error: `Server returned ${response.status}` });
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setHealthResult({ ok: false, error: "Health check timed out" });
      } else {
        setHealthResult({ ok: false, error: err.message || "Network error" });
      }
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    try {
      const response = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const data = await response.json();
      
      if (response.ok) {
        await refreshUser();
        toast({
          title: "Demo Mode",
          description: "Logged in as demo user for preview testing",
        });
        setLocation("/dashboard");
      } else {
        toast({
          variant: "destructive",
          title: "Demo Login Failed",
          description: data.error || "Unable to access demo mode",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    
    setIsResending(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Email sent!",
          description: "Please check your inbox for the verification link.",
        });
        setUnverifiedEmail(null);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Failed to send verification email",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setUnverifiedEmail(null);
    setLoginError(null);
    setHealthResult(null);
    
    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    try {
      const user = await login(username, password);
      
      if (user.mustChangePassword) {
        toast({
          title: "Password Change Required",
          description: "Please set a new password to continue.",
        });
        setLocation("/change-password");
        return;
      }
      
      toast({
        title: "Welcome back!",
        description: `Signed in as ${user.fullName}`,
      });
      setLocation("/dashboard");
    } catch (error: any) {
      if (error.code === "EMAIL_NOT_VERIFIED" && error.email) {
        setUnverifiedEmail(error.email);
      }
      
      // Track if this is a timeout/network error for health check button
      if (error.isTimeout) {
        setLoginError("timeout");
      } else if (error.status === 0 || error.message?.includes("Network")) {
        setLoginError("network");
      }
      
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
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-8 p-8 rounded-xl border border-border shadow-lg bg-card">
        <div className="text-center space-y-2">
          <Link href="/" className="block mx-auto mb-4">
            <img 
              src={logoImage} 
              alt="MiAuditOps" 
              className="h-24 mx-auto object-contain cursor-pointer" 
            />
          </Link>
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
              <Link 
                href="/forgot-password" 
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input 
                id="password" 
                name="password"
                type={showPassword ? "text" : "password"}
                className="h-10 pr-10"
                required
                data-testid="input-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-toggle-password"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
            className="w-full h-10 font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg" 
            disabled={isLoading}
            data-testid="button-login"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>

          {/* Show health check button when login fails due to timeout/network */}
          {loginError && (
            <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  {loginError === "timeout" ? "Server Timed Out" : "Connection Problem"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {loginError === "timeout" 
                  ? "The server took too long to respond." 
                  : "Unable to connect to the server."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={checkServerHealth}
                disabled={isCheckingHealth}
                className="w-full gap-2"
                data-testid="button-health-check"
              >
                {isCheckingHealth ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Activity className="h-4 w-4" />
                    Check Server Health
                  </>
                )}
              </Button>
              
              {healthResult && (
                <div className={`mt-3 p-3 rounded text-sm ${
                  healthResult.ok 
                    ? "bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-300" 
                    : "bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-300"
                }`}>
                  {healthResult.ok ? (
                    <>
                      <div className="font-medium">Server is reachable</div>
                      <div className="text-xs mt-1">
                        Time: {healthResult.serverTime}<br />
                        DB: {healthResult.dbOk ? "Connected" : "Error"} ({healthResult.dbLatency}ms)
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-medium">Server unreachable</div>
                      <div className="text-xs mt-1">{healthResult.error}</div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {isDevelopment && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Development Preview</span>
              </div>
            </div>
          )}
          
          {isDevelopment && (
            <Button 
              type="button"
              variant="outline"
              className="w-full h-10 font-medium gap-2 border-dashed border-primary text-primary hover:bg-primary/10" 
              disabled={isDemoLoading}
              onClick={handleDemoLogin}
              data-testid="button-demo-login"
            >
              <Play className="h-4 w-4" />
              {isDemoLoading ? "Loading Demo..." : "Try Demo Account"}
            </Button>
          )}

          {unverifiedEmail && (
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  Email not verified
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Please verify your email address to continue.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full gap-2"
                data-testid="button-resend-verification"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Resend Verification Email
                  </>
                )}
              </Button>
            </div>
          )}
        </form>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link 
              href="/signup" 
              className="font-medium text-primary hover:underline" 
              data-testid="link-signup"
            >
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

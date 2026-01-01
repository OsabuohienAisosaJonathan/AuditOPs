import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation, Link } from "wouter";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Mail } from "lucide-react";
import logoDarkImage from "@/assets/miauditops-logo-dark.jpeg";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

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
      if (error.code === "EMAIL_NOT_VERIFIED" && error.email) {
        setUnverifiedEmail(error.email);
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
    <div className="flex min-h-screen items-center justify-center p-4" style={{ backgroundColor: '#0B0B0D' }}>
      <div 
        className="w-full max-w-md space-y-8 p-8 rounded-xl border shadow-lg"
        style={{ backgroundColor: '#111115', borderColor: 'rgba(255,255,255,0.1)' }}
      >
        <div className="text-center space-y-2">
          <Link href="/" className="block mx-auto mb-4">
            <img 
              src={logoDarkImage} 
              alt="MiAuditOps" 
              className="h-24 mx-auto object-contain cursor-pointer" 
              style={{ maxHeight: '100px' }}
            />
          </Link>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>Enter your credentials to access the workspace</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" style={{ color: 'rgba(255,255,255,0.75)' }}>Email or Username</Label>
            <Input 
              id="username" 
              name="username"
              type="text" 
              placeholder="you@example.com" 
              className="h-10 focus:ring-2"
              style={{ 
                backgroundColor: '#0F0F14', 
                borderColor: 'rgba(255,255,255,0.12)', 
                color: '#FFFFFF',
              }}
              required
              data-testid="input-username"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" style={{ color: 'rgba(255,255,255,0.75)' }}>Password</Label>
              <Link 
                href="/forgot-password" 
                className="text-xs font-medium hover:underline"
                style={{ color: '#F5C542' }}
              >
                Forgot password?
              </Link>
            </div>
            <Input 
              id="password" 
              name="password"
              type="password" 
              className="h-10 focus:ring-2"
              style={{ 
                backgroundColor: '#0F0F14', 
                borderColor: 'rgba(255,255,255,0.12)', 
                color: '#FFFFFF',
              }}
              required
              data-testid="input-password"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="remember" 
              data-testid="checkbox-remember"
              className="border-white/25 data-[state=checked]:bg-[#F5C542] data-[state=checked]:border-[#F5C542]"
            />
            <label
              htmlFor="remember"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              Remember me
            </label>
          </div>

          <Button 
            type="submit" 
            className="w-full h-10 font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg" 
            disabled={isLoading}
            style={{ backgroundColor: '#F5C542', color: '#000000' }}
            data-testid="button-login"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>

          {unverifiedEmail && (
            <div 
              className="p-4 rounded-lg border"
              style={{ backgroundColor: 'rgba(245,197,66,0.1)', borderColor: 'rgba(245,197,66,0.3)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4" style={{ color: '#F5C542' }} />
                <span className="text-sm font-medium" style={{ color: '#F5C542' }}>
                  Email not verified
                </span>
              </div>
              <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.75)' }}>
                Please verify your email address to continue.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full gap-2 hover:bg-white/10"
                style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#FFFFFF' }}
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
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Don't have an account?{" "}
            <Link 
              href="/signup" 
              className="font-medium hover:underline" 
              style={{ color: '#F5C542' }}
              data-testid="link-signup"
            >
              Sign up
            </Link>
          </p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            &copy; 2025 Miemploya Audit Services. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation, Link } from "wouter";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle } from "lucide-react";
import logoDarkImage from "@/assets/miauditops-logo-dark.jpeg";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError("Invalid or missing reset token");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setResetSuccess(true);
        toast({
          title: "Password reset successful",
          description: "You can now sign in with your new password.",
        });
      } else {
        setError(data.error || "Failed to reset password");
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Failed to reset password",
        });
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (resetSuccess) {
    return (
      <div className="public-dark flex min-h-screen items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md space-y-8 p-8 rounded-xl border border-border shadow-lg bg-card">
          <div className="text-center space-y-4">
            <Link href="/" className="block mx-auto mb-4">
              <img 
                src={logoDarkImage} 
                alt="MiAuditOps" 
                className="h-24 mx-auto object-contain cursor-pointer" 
              />
            </Link>
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Password Reset Complete</h2>
            <p className="text-muted-foreground">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
          </div>
          <div className="pt-4">
            <Link href="/login">
              <Button className="w-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg" data-testid="button-go-to-login">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!token || error === "Invalid or missing reset token") {
    return (
      <div className="public-dark flex min-h-screen items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md space-y-8 p-8 rounded-xl border border-border shadow-lg bg-card">
          <div className="text-center space-y-4">
            <Link href="/" className="block mx-auto mb-4">
              <img 
                src={logoDarkImage} 
                alt="MiAuditOps" 
                className="h-24 mx-auto object-contain cursor-pointer" 
              />
            </Link>
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Invalid Reset Link</h2>
            <p className="text-muted-foreground">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
          </div>
          <div className="pt-4">
            <Link href="/forgot-password">
              <Button className="w-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg" data-testid="button-request-new-link">
                Request New Reset Link
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-dark flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-8 p-8 rounded-xl border border-border shadow-lg bg-card">
        <div className="text-center space-y-2">
          <Link href="/" className="block mx-auto mb-4">
            <img 
              src={logoDarkImage} 
              alt="MiAuditOps" 
              className="h-24 mx-auto object-contain cursor-pointer" 
            />
          </Link>
          <h2 className="text-2xl font-bold text-foreground">Reset your password</h2>
          <p className="text-sm text-muted-foreground">
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input 
              id="password" 
              name="password"
              type="password" 
              className="h-10"
              required
              minLength={8}
              data-testid="input-password"
            />
            <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input 
              id="confirmPassword" 
              name="confirmPassword"
              type="password" 
              className="h-10"
              required
              minLength={8}
              data-testid="input-confirm-password"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-10 font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg" 
            disabled={isLoading}
            data-testid="button-reset-password"
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>

        <div className="text-center">
          <Link href="/login">
            <Button variant="link" className="text-sm text-muted-foreground" data-testid="link-back-to-login">
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

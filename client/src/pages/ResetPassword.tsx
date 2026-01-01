import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation, Link } from "wouter";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle } from "lucide-react";
import logoImage from "@/assets/miauditops-logo.jpeg";

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
      <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
        <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-xl border border-border shadow-lg">
          <div className="text-center space-y-4">
            <div className="mx-auto mb-4">
              <img src={logoImage} alt="MiAuditOps" className="h-24 mx-auto object-contain" />
            </div>
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold">Password Reset Complete</h2>
            <p className="text-muted-foreground">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
          </div>
          <div className="pt-4">
            <Link href="/login">
              <Button className="w-full" data-testid="button-go-to-login">
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
      <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
        <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-xl border border-border shadow-lg">
          <div className="text-center space-y-4">
            <div className="mx-auto mb-4">
              <img src={logoImage} alt="MiAuditOps" className="h-24 mx-auto object-contain" />
            </div>
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold">Invalid Reset Link</h2>
            <p className="text-muted-foreground">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
          </div>
          <div className="pt-4">
            <Link href="/forgot-password">
              <Button className="w-full" data-testid="button-request-new-link">
                Request New Reset Link
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-xl border border-border shadow-lg">
        <div className="text-center space-y-2">
          <div className="mx-auto mb-4">
            <img src={logoImage} alt="MiAuditOps" className="h-24 mx-auto object-contain" />
          </div>
          <h2 className="text-2xl font-bold">Reset your password</h2>
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
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-10 font-medium" 
            disabled={isLoading}
            data-testid="button-reset-password"
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>

        <div className="text-center">
          <Link href="/login">
            <Button variant="link" className="text-sm text-muted-foreground hover:text-primary" data-testid="link-back-to-login">
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

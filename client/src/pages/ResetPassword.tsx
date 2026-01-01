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
      <div className="flex min-h-screen items-center justify-center p-4" style={{ backgroundColor: '#0B0B0D' }}>
        <div 
          className="w-full max-w-md space-y-8 p-8 rounded-xl border shadow-lg"
          style={{ backgroundColor: '#111115', borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <div className="text-center space-y-4">
            <Link href="/" className="block mx-auto mb-4">
              <img 
                src={logoDarkImage} 
                alt="MiAuditOps" 
                className="h-24 mx-auto object-contain cursor-pointer" 
                style={{ maxHeight: '100px' }}
              />
            </Link>
            <div 
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(74,222,128,0.15)' }}
            >
              <CheckCircle2 className="h-8 w-8" style={{ color: '#4ADE80' }} />
            </div>
            <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Password Reset Complete</h2>
            <p style={{ color: 'rgba(255,255,255,0.75)' }}>
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
          </div>
          <div className="pt-4">
            <Link href="/login">
              <Button 
                className="w-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                style={{ backgroundColor: '#F5C542', color: '#000000' }}
                data-testid="button-go-to-login"
              >
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
      <div className="flex min-h-screen items-center justify-center p-4" style={{ backgroundColor: '#0B0B0D' }}>
        <div 
          className="w-full max-w-md space-y-8 p-8 rounded-xl border shadow-lg"
          style={{ backgroundColor: '#111115', borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <div className="text-center space-y-4">
            <Link href="/" className="block mx-auto mb-4">
              <img 
                src={logoDarkImage} 
                alt="MiAuditOps" 
                className="h-24 mx-auto object-contain cursor-pointer" 
                style={{ maxHeight: '100px' }}
              />
            </Link>
            <div 
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}
            >
              <XCircle className="h-8 w-8" style={{ color: '#EF4444' }} />
            </div>
            <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Invalid Reset Link</h2>
            <p style={{ color: 'rgba(255,255,255,0.75)' }}>
              This password reset link is invalid or has expired. Please request a new one.
            </p>
          </div>
          <div className="pt-4">
            <Link href="/forgot-password">
              <Button 
                className="w-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                style={{ backgroundColor: '#F5C542', color: '#000000' }}
                data-testid="button-request-new-link"
              >
                Request New Reset Link
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Reset your password</h2>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password" style={{ color: 'rgba(255,255,255,0.75)' }}>New Password</Label>
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
              minLength={8}
              data-testid="input-password"
            />
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Must be at least 8 characters</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" style={{ color: 'rgba(255,255,255,0.75)' }}>Confirm New Password</Label>
            <Input 
              id="confirmPassword" 
              name="confirmPassword"
              type="password" 
              className="h-10 focus:ring-2"
              style={{ 
                backgroundColor: '#0F0F14', 
                borderColor: 'rgba(255,255,255,0.12)', 
                color: '#FFFFFF',
              }}
              required
              minLength={8}
              data-testid="input-confirm-password"
            />
          </div>

          {error && (
            <div 
              className="p-3 rounded-lg border text-sm"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: '#EF4444' }}
            >
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-10 font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg" 
            disabled={isLoading}
            style={{ backgroundColor: '#F5C542', color: '#000000' }}
            data-testid="button-reset-password"
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>

        <div className="text-center">
          <Link href="/login">
            <Button 
              variant="link" 
              className="text-sm"
              style={{ color: 'rgba(255,255,255,0.55)' }}
              data-testid="link-back-to-login"
            >
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

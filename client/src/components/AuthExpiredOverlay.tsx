import { useSessionExpired } from "@/lib/session-expired-context";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, LogIn } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export function AuthExpiredOverlay() {
  const { isSessionExpired, returnUrl, clearSessionExpired } = useSessionExpired();
  const { refreshUser, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isRetrying, setIsRetrying] = useState(false);

  if (!isSessionExpired) {
    return null;
  }

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await refreshUser();
      clearSessionExpired();
    } catch (err) {
      console.debug("[AuthExpiredOverlay] Retry failed:", err);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleSignIn = () => {
    const loginUrl = returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : "/login";
    clearSessionExpired();
    setLocation(loginUrl);
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center"
      data-testid="auth-expired-overlay"
    >
      <div className="bg-card border border-border rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            Session Expired
          </h2>
          <p className="text-muted-foreground">
            We could not verify your session. Your data is safe.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={handleRetry}
            disabled={isRetrying || isLoading}
            variant="outline"
            className="gap-2"
            data-testid="button-retry-session"
          >
            <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? "Retrying..." : "Retry"}
          </Button>
          
          <Button
            onClick={handleSignIn}
            className="gap-2"
            data-testid="button-sign-in-again"
          >
            <LogIn className="h-4 w-4" />
            Sign in again
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {returnUrl && `You'll be returned to your previous page after signing in.`}
        </p>
      </div>
    </div>
  );
}

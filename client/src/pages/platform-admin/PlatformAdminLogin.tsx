import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { usePlatformAdminAuth } from "@/lib/platform-admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Loader2, Lock, AlertTriangle } from "lucide-react";

export default function PlatformAdminLogin() {
  const { admin, isLoading, login } = usePlatformAdminAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && admin) {
      setLocation("/owner/dashboard");
    }
  }, [admin, isLoading, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      setLocation("/owner/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Security Warning Banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2">
        <div className="max-w-md mx-auto flex items-center justify-center gap-2 text-amber-400 text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Restricted Access - MiAuditOps Internal Staff Only</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-600/20 rounded-2xl border border-purple-500/30 mb-6">
              <Shield className="w-10 h-10 text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Owner Console</h1>
            <p className="text-purple-300/70">MiAuditOps Platform Administration</p>
          </div>

          {/* Login Form */}
          <div className="bg-slate-900/80 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-8 shadow-2xl shadow-purple-900/20">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="bg-red-950/50 border-red-500/50">
                  <AlertDescription className="text-red-300">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-purple-200">Staff Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.name@miauditops.com"
                  required
                  data-testid="input-email"
                  className="bg-slate-800/50 border-purple-500/30 text-white placeholder:text-slate-500 focus:border-purple-400 focus:ring-purple-400/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-purple-200">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  data-testid="input-password"
                  className="bg-slate-800/50 border-purple-500/30 text-white placeholder:text-slate-500 focus:border-purple-400 focus:ring-purple-400/20"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-5 text-base"
                disabled={isSubmitting}
                data-testid="button-login"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Sign In to Owner Console
                  </>
                )}
              </Button>
            </form>

            {/* Security Notice */}
            <div className="mt-6 pt-6 border-t border-purple-500/20">
              <div className="flex items-start gap-3 text-sm text-slate-400">
                <Lock className="w-4 h-4 mt-0.5 text-purple-400/60" />
                <div>
                  <p className="text-purple-300/80 font-medium mb-1">Secure Access Portal</p>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    This console is for authorized MiAuditOps personnel only. 
                    All access attempts are logged and monitored.
                    For tenant access, please use the main login page.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-slate-500 text-xs">
              Need help? Contact <span className="text-purple-400">support@miauditops.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { useLocation, Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, RefreshCw } from "lucide-react";
import logoDarkImage from "@/assets/miauditops-logo-dark.jpeg";

export default function CheckEmail() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState("");
  const [showResendForm, setShowResendForm] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const emailFromUrl = searchParams.get("email") || "";

  const handleResend = async () => {
    const emailToUse = email || emailFromUrl;
    
    if (!emailToUse) {
      setShowResendForm(true);
      return;
    }

    setIsResending(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToUse }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Email sent!",
          description: "Please check your inbox for the verification link.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Failed to resend verification email",
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

  return (
    <div className="public-dark min-h-screen flex flex-col bg-background">
      <div className="p-4">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/")}
          className="gap-2 text-muted-foreground hover:text-foreground hover:bg-white/10"
          data-testid="button-back-home"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="p-8 rounded-xl border border-border shadow-lg bg-card text-center">
            <Link href="/">
              <img 
                src={logoDarkImage} 
                alt="MiAuditOps" 
                className="h-14 mx-auto object-contain cursor-pointer mb-6" 
              />
            </Link>

            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
              <Mail className="h-8 w-8 text-primary" />
            </div>

            <h1 className="text-2xl font-display font-bold mb-2 text-foreground">
              Check your email
            </h1>
            
            <p className="text-muted-foreground mb-6">
              We've sent a verification link to your email address. 
              Please click the link to verify your account.
            </p>

            <div className="space-y-4">
              {showResendForm ? (
                <div className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-4 py-2 rounded-md border border-border bg-card text-foreground"
                    data-testid="input-resend-email"
                  />
                  <Button
                    onClick={handleResend}
                    disabled={isResending || !email}
                    className="w-full gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                    data-testid="button-resend-submit"
                  >
                    {isResending ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Verification Email"
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleResend}
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
              )}

              <Button
                variant="ghost"
                onClick={() => setLocation("/login")}
                className="w-full text-muted-foreground hover:text-foreground"
                data-testid="button-back-to-login"
              >
                Back to Sign In
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-6">
              Didn't receive the email? Check your spam folder or try resending.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

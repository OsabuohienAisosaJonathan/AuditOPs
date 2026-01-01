import { Button } from "@/components/ui/button";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import logoDarkImage from "@/assets/miauditops-logo-dark.jpeg";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const token = searchParams.get("token");

      if (!token) {
        setStatus("error");
        setMessage("No verification token provided.");
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully!");
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed.");
        }
      } catch (error) {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    };

    verifyEmail();
  }, []);

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

            {status === "loading" && (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <h1 className="text-2xl font-display font-bold mb-2 text-foreground">
                  Verifying your email...
                </h1>
                <p className="text-muted-foreground">
                  Please wait while we verify your email address.
                </p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <h1 className="text-2xl font-display font-bold mb-2 text-foreground">
                  Email Verified!
                </h1>
                <p className="text-muted-foreground mb-6">{message}</p>
                <Button
                  onClick={() => setLocation("/login")}
                  className="w-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                  data-testid="button-go-to-login"
                >
                  Continue to Sign In
                </Button>
              </>
            )}

            {status === "error" && (
              <>
                <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <h1 className="text-2xl font-display font-bold mb-2 text-foreground">
                  Verification Failed
                </h1>
                <p className="text-muted-foreground mb-6">{message}</p>
                <div className="space-y-3">
                  <Button
                    onClick={() => setLocation("/check-email")}
                    className="w-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                    data-testid="button-request-new-link"
                  >
                    Request New Verification Link
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setLocation("/login")}
                    className="w-full text-muted-foreground hover:text-foreground"
                    data-testid="button-back-to-login"
                  >
                    Back to Sign In
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import logoImage from "@/assets/miauditops-logo.jpeg";

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
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <div className="p-4">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/")}
          className="gap-2 transition-all duration-200 hover:scale-[1.02]"
          data-testid="button-back-home"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card p-8 rounded-xl border border-border shadow-lg text-center">
            <Link href="/">
              <img src={logoImage} alt="MiAuditOps" className="h-14 mx-auto object-contain cursor-pointer mb-6" />
            </Link>

            {status === "loading" && (
              <>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <h1 className="text-2xl font-display font-bold text-foreground mb-2">
                  Verifying your email...
                </h1>
                <p className="text-muted-foreground">
                  Please wait while we verify your email address.
                </p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-display font-bold text-foreground mb-2">
                  Email Verified!
                </h1>
                <p className="text-muted-foreground mb-6">{message}</p>
                <Button
                  onClick={() => setLocation("/login")}
                  className="w-full"
                  data-testid="button-go-to-login"
                >
                  Continue to Sign In
                </Button>
              </>
            )}

            {status === "error" && (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-display font-bold text-foreground mb-2">
                  Verification Failed
                </h1>
                <p className="text-muted-foreground mb-6">{message}</p>
                <div className="space-y-3">
                  <Button
                    onClick={() => setLocation("/check-email")}
                    className="w-full"
                    data-testid="button-request-new-link"
                  >
                    Request New Verification Link
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setLocation("/login")}
                    className="w-full"
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

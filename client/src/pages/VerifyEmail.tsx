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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0B0B0D' }}>
      <div className="p-4">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/")}
          className="gap-2 transition-all duration-200 hover:scale-[1.02] hover:bg-white/10"
          style={{ color: 'rgba(255,255,255,0.75)' }}
          data-testid="button-back-home"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div 
            className="p-8 rounded-xl border shadow-lg text-center"
            style={{ backgroundColor: '#111115', borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <Link href="/">
              <img 
                src={logoDarkImage} 
                alt="MiAuditOps" 
                className="h-14 mx-auto object-contain cursor-pointer mb-6" 
                style={{ maxHeight: '56px' }}
              />
            </Link>

            {status === "loading" && (
              <>
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ backgroundColor: 'rgba(245,197,66,0.15)' }}
                >
                  <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#F5C542' }} />
                </div>
                <h1 className="text-2xl font-display font-bold mb-2" style={{ color: '#FFFFFF' }}>
                  Verifying your email...
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.75)' }}>
                  Please wait while we verify your email address.
                </p>
              </>
            )}

            {status === "success" && (
              <>
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ backgroundColor: 'rgba(74,222,128,0.15)' }}
                >
                  <CheckCircle className="h-8 w-8" style={{ color: '#4ADE80' }} />
                </div>
                <h1 className="text-2xl font-display font-bold mb-2" style={{ color: '#FFFFFF' }}>
                  Email Verified!
                </h1>
                <p className="mb-6" style={{ color: 'rgba(255,255,255,0.75)' }}>{message}</p>
                <Button
                  onClick={() => setLocation("/login")}
                  className="w-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ backgroundColor: '#F5C542', color: '#000000' }}
                  data-testid="button-go-to-login"
                >
                  Continue to Sign In
                </Button>
              </>
            )}

            {status === "error" && (
              <>
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}
                >
                  <XCircle className="h-8 w-8" style={{ color: '#EF4444' }} />
                </div>
                <h1 className="text-2xl font-display font-bold mb-2" style={{ color: '#FFFFFF' }}>
                  Verification Failed
                </h1>
                <p className="mb-6" style={{ color: 'rgba(255,255,255,0.75)' }}>{message}</p>
                <div className="space-y-3">
                  <Button
                    onClick={() => setLocation("/check-email")}
                    className="w-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                    style={{ backgroundColor: '#F5C542', color: '#000000' }}
                    data-testid="button-request-new-link"
                  >
                    Request New Verification Link
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setLocation("/login")}
                    className="w-full hover:bg-white/10"
                    style={{ color: 'rgba(255,255,255,0.75)' }}
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

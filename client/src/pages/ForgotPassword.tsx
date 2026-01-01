import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail } from "lucide-react";
import logoDarkImage from "@/assets/miauditops-logo-dark.jpeg";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setEmailSent(true);
        toast({
          title: "Check your email",
          description: "If an account exists, you'll receive a password reset link.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Failed to send reset email",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
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
              style={{ backgroundColor: 'rgba(245,197,66,0.15)' }}
            >
              <Mail className="h-8 w-8" style={{ color: '#F5C542' }} />
            </div>
            <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Check your email</h2>
            <p style={{ color: 'rgba(255,255,255,0.75)' }}>
              If an account exists with that email, we've sent you a password reset link. 
              Please check your inbox and spam folder.
            </p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
              The link will expire in 1 hour.
            </p>
          </div>
          <div className="pt-4">
            <Link href="/login">
              <Button 
                variant="outline" 
                className="w-full hover:bg-white/10"
                style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#FFFFFF' }}
                data-testid="button-back-to-login"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
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
          <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Forgot your password?</h2>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" style={{ color: 'rgba(255,255,255,0.75)' }}>Email Address</Label>
            <Input 
              id="email" 
              name="email"
              type="email" 
              placeholder="you@example.com" 
              className="h-10 focus:ring-2"
              style={{ 
                backgroundColor: '#0F0F14', 
                borderColor: 'rgba(255,255,255,0.12)', 
                color: '#FFFFFF',
              }}
              required
              data-testid="input-email"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-10 font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg" 
            disabled={isLoading}
            style={{ backgroundColor: '#F5C542', color: '#000000' }}
            data-testid="button-send-reset"
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
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
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

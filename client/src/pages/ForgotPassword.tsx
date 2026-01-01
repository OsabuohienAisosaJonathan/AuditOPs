import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail } from "lucide-react";
import logoImage from "@/assets/miauditops-logo.jpeg";

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
      <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
        <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-xl border border-border shadow-lg">
          <div className="text-center space-y-4">
            <div className="mx-auto mb-4">
              <img src={logoImage} alt="MiAuditOps" className="h-24 mx-auto object-contain" />
            </div>
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Check your email</h2>
            <p className="text-muted-foreground">
              If an account exists with that email, we've sent you a password reset link. 
              Please check your inbox and spam folder.
            </p>
            <p className="text-sm text-muted-foreground">
              The link will expire in 1 hour.
            </p>
          </div>
          <div className="pt-4">
            <Link href="/login">
              <Button variant="outline" className="w-full" data-testid="button-back-to-login">
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
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-xl border border-border shadow-lg">
        <div className="text-center space-y-2">
          <div className="mx-auto mb-4">
            <img src={logoImage} alt="MiAuditOps" className="h-24 mx-auto object-contain" />
          </div>
          <h2 className="text-2xl font-bold">Forgot your password?</h2>
          <p className="text-sm text-muted-foreground">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input 
              id="email" 
              name="email"
              type="email" 
              placeholder="you@example.com" 
              className="h-10" 
              required
              data-testid="input-email"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-10 font-medium" 
            disabled={isLoading}
            data-testid="button-send-reset"
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        <div className="text-center">
          <Link href="/login">
            <Button variant="link" className="text-sm text-muted-foreground hover:text-primary" data-testid="link-back-to-login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

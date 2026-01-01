import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLocation, Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Building2, Users, ArrowLeft, Check } from "lucide-react";
import logoDarkImage from "@/assets/miauditops-logo-dark.jpeg";

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountType, setAccountType] = useState<"company" | "auditor">("company");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const [formData, setFormData] = useState({
    organizationName: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.organizationName.trim()) {
      newErrors.organizationName = accountType === "company" ? "Company name is required" : "Audit firm name is required";
    }
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = "Password must include uppercase, lowercase, and a number";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!agreedToTerms) {
      newErrors.terms = "You must agree to the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fix the errors below",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.email,
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          role: "super_admin",
          accountType,
          organizationName: formData.organizationName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Registration failed");
      }

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
      
      setLocation(`/check-email?email=${encodeURIComponent(formData.email)}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClasses = (fieldName: string) => 
    `h-11 transition-all duration-200 focus:ring-2 ${
      errors[fieldName] ? "border-red-500" : ""
    }`;

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
            className="p-8 rounded-xl border shadow-lg transition-all duration-300 hover:shadow-xl"
            style={{ backgroundColor: '#111115', borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <div className="text-center space-y-2 mb-8">
              <Link href="/">
                <img 
                  src={logoDarkImage} 
                  alt="MiAuditOps" 
                  className="h-14 mx-auto object-contain cursor-pointer" 
                  style={{ maxHeight: '56px' }}
                />
              </Link>
              <h1 className="text-2xl font-display font-bold" style={{ color: '#FFFFFF' }}>Create your account</h1>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>Start your 14-day free trial</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-3">
                <Label className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>Sign up as</Label>
                <RadioGroup 
                  value={accountType} 
                  onValueChange={(val) => setAccountType(val as "company" | "auditor")}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <RadioGroupItem value="company" id="company" className="peer sr-only" data-testid="radio-company" />
                    <Label
                      htmlFor="company"
                      className="flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer transition-all duration-200"
                      style={{ 
                        borderColor: accountType === 'company' ? '#F5C542' : 'rgba(255,255,255,0.15)',
                        backgroundColor: accountType === 'company' ? 'rgba(245,197,66,0.1)' : 'transparent',
                        color: '#FFFFFF'
                      }}
                    >
                      <Building2 className="mb-2 h-6 w-6" />
                      <span className="text-sm font-medium">Company</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="auditor" id="auditor" className="peer sr-only" data-testid="radio-auditor" />
                    <Label
                      htmlFor="auditor"
                      className="flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer transition-all duration-200"
                      style={{ 
                        borderColor: accountType === 'auditor' ? '#F5C542' : 'rgba(255,255,255,0.15)',
                        backgroundColor: accountType === 'auditor' ? 'rgba(245,197,66,0.1)' : 'transparent',
                        color: '#FFFFFF'
                      }}
                    >
                      <Users className="mb-2 h-6 w-6" />
                      <span className="text-sm font-medium">Auditor</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizationName" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {accountType === "company" ? "Company Name" : "Audit Firm Name"}
                </Label>
                <Input
                  id="organizationName"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  placeholder={accountType === "company" ? "Acme Restaurant Ltd" : "ABC Audit Partners"}
                  className={inputClasses("organizationName")}
                  style={{ 
                    backgroundColor: '#0F0F14', 
                    borderColor: errors.organizationName ? '#EF4444' : 'rgba(255,255,255,0.12)', 
                    color: '#FFFFFF',
                  }}
                  data-testid="input-organization"
                />
                {errors.organizationName && (
                  <p className="text-xs" style={{ color: '#EF4444' }}>{errors.organizationName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName" style={{ color: 'rgba(255,255,255,0.75)' }}>Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="John Doe"
                  className={inputClasses("fullName")}
                  style={{ 
                    backgroundColor: '#0F0F14', 
                    borderColor: errors.fullName ? '#EF4444' : 'rgba(255,255,255,0.12)', 
                    color: '#FFFFFF',
                  }}
                  data-testid="input-fullname"
                />
                {errors.fullName && (
                  <p className="text-xs" style={{ color: '#EF4444' }}>{errors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" style={{ color: 'rgba(255,255,255,0.75)' }}>Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  className={inputClasses("email")}
                  style={{ 
                    backgroundColor: '#0F0F14', 
                    borderColor: errors.email ? '#EF4444' : 'rgba(255,255,255,0.12)', 
                    color: '#FFFFFF',
                  }}
                  data-testid="input-email"
                />
                {errors.email && (
                  <p className="text-xs" style={{ color: '#EF4444' }}>{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" style={{ color: 'rgba(255,255,255,0.75)' }}>Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className={`${inputClasses("password")} pr-10`}
                    style={{ 
                      backgroundColor: '#0F0F14', 
                      borderColor: errors.password ? '#EF4444' : 'rgba(255,255,255,0.12)', 
                      color: '#FFFFFF',
                    }}
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs" style={{ color: '#EF4444' }}>{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" style={{ color: 'rgba(255,255,255,0.75)' }}>Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className={`${inputClasses("confirmPassword")} pr-10`}
                    style={{ 
                      backgroundColor: '#0F0F14', 
                      borderColor: errors.confirmPassword ? '#EF4444' : 'rgba(255,255,255,0.12)', 
                      color: '#FFFFFF',
                    }}
                    data-testid="input-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                    data-testid="button-toggle-confirm-password"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs" style={{ color: '#EF4444' }}>{errors.confirmPassword}</p>
                )}
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  className="mt-1 border-white/25 data-[state=checked]:bg-[#F5C542] data-[state=checked]:border-[#F5C542]"
                  data-testid="checkbox-terms"
                />
                <label
                  htmlFor="terms"
                  className="text-sm leading-relaxed cursor-pointer"
                  style={{ color: 'rgba(255,255,255,0.55)' }}
                >
                  I agree to the{" "}
                  <a href="#" style={{ color: '#F5C542' }} className="hover:underline" data-testid="link-terms">Terms of Service</a>
                  {" "}and{" "}
                  <a href="#" style={{ color: '#F5C542' }} className="hover:underline" data-testid="link-privacy">Privacy Policy</a>
                </label>
              </div>
              {errors.terms && (
                <p className="text-xs -mt-2" style={{ color: '#EF4444' }}>{errors.terms}</p>
              )}

              <Button
                type="submit"
                className="w-full h-11 font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
                disabled={isLoading}
                style={{ backgroundColor: '#F5C542', color: '#000000' }}
                data-testid="button-signup"
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Already have an account?{" "}
              <Link href="/login" className="font-medium hover:underline" style={{ color: '#F5C542' }} data-testid="link-signin">
                Sign In
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            &copy; {new Date().getFullYear()} Miemploya Audit Services. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}

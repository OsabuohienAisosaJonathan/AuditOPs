import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useLocation, Link } from "wouter";
import { useState } from "react";
import { 
  ClipboardCheck, 
  Package, 
  Warehouse, 
  Calculator, 
  AlertTriangle, 
  FileText,
  Play,
  Check,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  Shield,
  BarChart3,
  FileBarChart,
  Lock
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import logoDarkImage from "@/assets/miauditops-logo-dark.jpeg";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "quarterly" | "yearly">("yearly");
  const [selectedSlots, setSelectedSlots] = useState<1 | 3 | 5 | 10>(1);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(amount);
  };

  const calculatePrice = (baseMonthly: number) => {
    let multiplier = 1;
    let periods = 1;
    
    if (billingPeriod === "monthly") {
      periods = 1;
      multiplier = 1;
    } else if (billingPeriod === "quarterly") {
      periods = 3;
      multiplier = 0.95;
    } else {
      periods = 12;
      multiplier = 0.85;
    }

    let slotMultiplier = selectedSlots;
    if (selectedSlots === 3) slotMultiplier = 3 * 0.90;
    else if (selectedSlots === 5) slotMultiplier = 5 * 0.85;
    else if (selectedSlots === 10) slotMultiplier = 10 * 0.75;

    return Math.round(baseMonthly * periods * multiplier * slotMultiplier);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message sent!",
      description: "We'll get back to you within 24 hours.",
    });
    setContactForm({ name: "", email: "", message: "" });
  };

  const features = [
    { icon: ClipboardCheck, title: "Audit Workspace", description: "Capture sales by department with payment declarations and compliance tracking." },
    { icon: Package, title: "Inventory & Purchases", description: "GRN records, supplier management, and purchase event tracking." },
    { icon: Warehouse, title: "SRD Ledgers", description: "Main Store and Department Store ledgers with carry-over calculations." },
    { icon: Calculator, title: "Reconciliation", description: "1st Hit (Declared vs Captured) and 2nd Hit (Audit adjustments) variance tracking." },
    { icon: AlertTriangle, title: "Exceptions & Registers", description: "Exception tracking with investigation timelines, receivables, and surplus registers." },
    { icon: FileText, title: "Reports", description: "Daily, weekly, and monthly audit reports with executive summaries." },
  ];

  const pricingPlans = [
    {
      name: "Starter",
      headline: "Daily audit essentials for small operations",
      subtext: "Capture sales, reconcile stock, and run daily workflow—without heavy exports.",
      bestFor: "Single outlet lounges/restaurants and early-stage audit routines.",
      limits: "Up to 4 SRD Department Stores + 1 Main Store per workspace · 2 users · 30 days history",
      baseMonthly: 49999,
      features: [
        "Audit Workspace (Sales → Purchases → Stock → Reconciliation)",
        "SRD Ledgers (Main Store + Department Stores)",
        "Exceptions logging + audit notes",
        "Report preview (Daily/Weekly/Monthly) with watermark",
        "Standard dashboards + performance metrics"
      ],
      locked: [
        "Purchases Register page",
        "Report downloads (PDF/Excel/Print)",
        "Department Comparison (2nd Hit) full table page + download",
        "SRD Main Store Ledger Summary download"
      ],
      cta: "Start with Starter",
      secondaryLink: "Preview reports (Upgrade to download)",
      popular: false,
    },
    {
      name: "Growth",
      headline: "Strong controls for growing audit teams",
      subtext: "Expand departments, add more users, and unlock most report downloads.",
      bestFor: "Busy lounges/restaurants and audit teams handling multiple departments daily.",
      limits: "Up to 7 SRD Department Stores + 1 Main Store per workspace · 5 users · 90 days history",
      baseMonthly: 79999,
      features: [
        "Everything in Starter",
        "More SRD Department Stores for broader coverage",
        "Report downloads enabled (PDF/Excel/Print) for standard reports",
        "Better audit visibility across departments and dates",
        "Stronger record retention for investigations"
      ],
      locked: [
        "Department Comparison (2nd Hit) full table page + download",
        "SRD Main Store Ledger Summary download"
      ],
      cta: "Upgrade to Growth",
      secondaryLink: "Compare plans",
      popular: true,
    },
    {
      name: "Business",
      headline: "Full reporting power for audit firms and multi-outlet operations",
      subtext: "Unlock full reconciliation intelligence, full exports, and advanced stock variance reporting.",
      bestFor: "Professional audit firms, serious internal audit teams, and multi-branch hospitality groups.",
      limits: "Up to 12 SRD Department Stores + 1 Main Store per workspace · 12 users · 1 year history",
      baseMonthly: 129999,
      features: [
        "Everything in Growth",
        "Full Department Comparison (2nd Hit) table (page + export)",
        "Full report downloads across all sections (PDF/Excel/Print)",
        "SRD Main Store Ledger Summary report download",
        "Purchases Register access + reporting",
        "Better monthly/weekly breakdown reporting for executives"
      ],
      locked: [],
      cta: "Go Business",
      secondaryLink: "Book a quick demo",
      popular: false,
    },
    {
      name: "Enterprise",
      headline: "Unlimited scale + priority support + early access",
      subtext: "Designed for large audit teams, groups, franchises, and heavy reporting needs.",
      bestFor: "Large audit firms, hotel groups, franchises, and multi-location hospitality chains.",
      limits: "Unlimited SRD Department Stores + 1 Main Store per workspace · Unlimited users · Unlimited history",
      baseMonthly: 199999,
      features: [
        "Everything in Business",
        "Unlimited SRD Department Stores per workspace",
        "Unlimited user seats for large teams",
        "Unlimited retention for long-term investigations",
        "Early access to new features (beta toggles)",
        "Dedicated support line + SLA response time"
      ],
      locked: [],
      cta: "Contact Sales",
      secondaryLink: "Request Enterprise onboarding",
      popular: false,
      isEnterprise: true,
    },
  ];

  const faqs = [
    { question: "What is a Client/Company slot?", answer: "A slot represents one business entity (restaurant, lounge, bar) that you can audit. Each slot has its own outlets, departments, and inventory." },
    { question: "Company vs Auditor: what changes?", answer: "Company accounts are for businesses auditing themselves. Auditor accounts are for external audit firms managing multiple clients with advanced reporting." },
    { question: "Can I upgrade anytime?", answer: "Yes! You can upgrade your plan at any time. We'll prorate the difference and apply it to your next billing cycle." },
    { question: "What does 'Preview Mode' mean?", answer: "Preview Mode lets you explore the full platform with sample data before committing. No credit card required." },
    { question: "What is SRD Main Store vs Department Store?", answer: "Main Store is your central inventory (warehouse). Department Stores are point-of-sale locations that receive stock from Main Store for daily operations." },
    { question: "Do you support PDF/Excel exports?", answer: "Yes! All reports can be exported to PDF for executives and Excel/CSV for detailed analysis." },
  ];

  const inputStyles = {
    backgroundColor: '#0F0F14',
    borderColor: 'rgba(255,255,255,0.12)',
    color: '#FFFFFF',
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0B0B0D' }}>
      <nav className="sticky top-0 z-50 border-b" style={{ backgroundColor: '#000000', borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <img src={logoDarkImage} alt="MiAuditOps" className="h-14 object-contain" style={{ maxHeight: '56px' }} />
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.75)' }} data-testid="nav-features">Features</a>
              <a href="#pricing" className="text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.75)' }} data-testid="nav-pricing">Pricing</a>
              <a href="#about" className="text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.75)' }} data-testid="nav-about">About</a>
              <a href="#contact" className="text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.75)' }} data-testid="nav-contact">Contact</a>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/login")} 
                className="hover:bg-white/10"
                style={{ color: 'rgba(255,255,255,0.75)' }}
                data-testid="nav-signin"
              >
                Sign In
              </Button>
              <Button 
                onClick={() => setLocation("/signup")} 
                className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                style={{ backgroundColor: '#F5C542', color: '#000000' }}
                data-testid="nav-signup"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(245,197,66,0.08) 0%, transparent 70%)' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge 
              variant="secondary" 
              className="mb-4"
              style={{ backgroundColor: 'rgba(245,197,66,0.15)', color: '#F5C542', border: 'none' }}
            >
              Built for Hospitality Auditors
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight mb-6" style={{ color: '#FFFFFF' }}>
              Daily Audit. Stock Control.{" "}
              <span style={{ color: '#F5C542' }}>Evidence-Ready Reports.</span>
            </h1>
            <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
              MiAuditOps helps auditors and hospitality businesses capture sales, reconcile stock, 
              raise exceptions, and produce clean reports—daily, weekly, and monthly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                size="lg" 
                onClick={() => setLocation("/signup")} 
                className="text-base px-8 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                style={{ backgroundColor: '#F5C542', color: '#000000' }}
                data-testid="hero-cta-primary"
              >
                Get Started <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-base px-8 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10"
                style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#FFFFFF' }}
                data-testid="hero-cta-secondary"
              >
                <Play className="mr-2 h-4 w-4" /> Watch How It Works
              </Button>
            </div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Built for lounges, restaurants, bars, and audit teams.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge 
                variant="outline" 
                className="mb-4"
                style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.75)' }}
              >
                Quick Tour
              </Badge>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4" style={{ color: '#FFFFFF' }}>
                How MiAuditOps Works
              </h2>
              <p className="mb-8" style={{ color: 'rgba(255,255,255,0.75)' }}>
                See the complete audit workflow from Sales → Stock → Reconciliation → Reports in just 2 minutes.
              </p>
              <div className="space-y-4">
                {[
                  "Capture sales by department",
                  "Declare payments (cash/POS/transfer)",
                  "Track SRD ledgers + stock movements",
                  "Run reconciliation + export reports",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div 
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(245,197,66,0.15)' }}
                    >
                      <Check className="h-4 w-4" style={{ color: '#F5C542' }} />
                    </div>
                    <span className="text-sm" style={{ color: '#FFFFFF' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div 
              className="relative aspect-video rounded-xl border overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-xl"
              style={{ backgroundColor: '#111115', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: '#F5C542' }}
                >
                  <Play className="h-8 w-8 ml-1" style={{ color: '#000000' }} />
                </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>Video walkthrough coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge 
              variant="outline" 
              className="mb-4"
              style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.75)' }}
            >
              Features
            </Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4" style={{ color: '#FFFFFF' }}>
              Everything You Need for Audit Operations
            </h2>
            <p className="max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.75)' }}>
              A complete platform designed specifically for hospitality audit workflows.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <Card 
                key={i} 
                className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                style={{ backgroundColor: '#111115', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <CardHeader>
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: 'rgba(245,197,66,0.15)' }}
                  >
                    <feature.icon className="h-6 w-6" style={{ color: '#F5C542' }} />
                  </div>
                  <CardTitle className="text-lg" style={{ color: '#FFFFFF' }}>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-16 lg:py-24" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge 
              variant="outline" 
              className="mb-4"
              style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.75)' }}
            >
              Pricing
            </Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4" style={{ color: '#FFFFFF' }}>
              Choose a plan that matches your audit workload
            </h2>
            <p className="max-w-2xl mx-auto mb-8" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Monthly, Quarterly, and Yearly billing. Upgrade anytime as your clients, departments, and reporting needs grow.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-6">
              <div 
                className="flex items-center gap-2 border rounded-lg p-1"
                style={{ backgroundColor: '#111115', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                {(["monthly", "quarterly", "yearly"] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setBillingPeriod(period)}
                    className="px-4 py-2 rounded-md text-sm font-medium transition-all"
                    style={{
                      backgroundColor: billingPeriod === period ? '#F5C542' : 'transparent',
                      color: billingPeriod === period ? '#000000' : 'rgba(255,255,255,0.55)',
                    }}
                    data-testid={`billing-${period}`}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                    {period === "quarterly" && <Badge className="ml-2 text-xs" style={{ backgroundColor: 'rgba(245,197,66,0.15)', color: '#F5C542' }}>Save 5%</Badge>}
                    {period === "yearly" && <Badge className="ml-2 text-xs" style={{ backgroundColor: 'rgba(245,197,66,0.15)', color: '#F5C542' }}>Save 15%</Badge>}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 mb-8">
              <Label className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>Client/Company Slots</Label>
              <div 
                className="flex items-center gap-2 border rounded-lg p-1"
                style={{ backgroundColor: '#111115', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                {([1, 3, 5, 10] as const).map((slots) => (
                  <button
                    key={slots}
                    onClick={() => setSelectedSlots(slots)}
                    className="px-4 py-2 rounded-md text-sm font-medium transition-all"
                    style={{
                      backgroundColor: selectedSlots === slots ? '#F5C542' : 'transparent',
                      color: selectedSlots === slots ? '#000000' : 'rgba(255,255,255,0.55)',
                    }}
                    data-testid={`slots-${slots}`}
                  >
                    {slots}
                    {slots >= 3 && (
                      <span className="ml-1 text-xs opacity-75">
                        ({slots === 3 ? "-10%" : slots === 5 ? "-15%" : "-25%"})
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>A slot is one Client workspace (for Auditors) or one Company workspace (for Companies).</p>
            </div>
          </div>

          <TooltipProvider>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {pricingPlans.map((plan, i) => (
                <Card 
                  key={i} 
                  className={`relative flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
                  style={{ 
                    backgroundColor: '#111115', 
                    borderColor: plan.popular ? '#F5C542' : 'rgba(255,255,255,0.1)',
                    boxShadow: plan.popular ? '0 0 20px rgba(245,197,66,0.2)' : 'none'
                  }}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge style={{ backgroundColor: '#F5C542', color: '#000000' }}>Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl" style={{ color: '#FFFFFF' }}>{plan.name}</CardTitle>
                    <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{plan.headline}</p>
                    <CardDescription className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>{plan.subtext}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="mb-4">
                      {'isEnterprise' in plan && plan.isEnterprise ? (
                        <div className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Contact Sales</div>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>₦{formatPrice(calculatePrice(plan.baseMonthly))}</span>
                            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>/{billingPeriod}</span>
                          </div>
                          {selectedSlots > 1 && (
                            <Badge className="mt-1 text-xs" style={{ backgroundColor: 'rgba(245,197,66,0.15)', color: '#F5C542' }}>
                              Save up to {selectedSlots === 3 ? "10%" : selectedSlots === 5 ? "15%" : "25%"} with {selectedSlots} slots
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                    
                    <p className="text-xs mb-3 italic" style={{ color: 'rgba(255,255,255,0.55)' }}>Best for: {plan.bestFor}</p>
                    <p className="text-xs mb-4 border-t pt-2" style={{ color: 'rgba(255,255,255,0.55)', borderColor: 'rgba(255,255,255,0.1)' }}>{plan.limits}</p>
                    
                    <div className="space-y-2 mb-4 flex-1">
                      <p className="text-xs font-semibold" style={{ color: '#FFFFFF' }}>What you get:</p>
                      {plan.features.map((feature, j) => (
                        <div key={j} className="flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: '#F5C542' }} />
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>{feature}</span>
                        </div>
                      ))}
                      
                      {plan.locked.length > 0 && (
                        <>
                          <p className="text-xs font-semibold mt-3" style={{ color: 'rgba(255,255,255,0.45)' }}>Locked in {plan.name}:</p>
                          {plan.locked.map((item, j) => (
                            <Tooltip key={j}>
                              <TooltipTrigger asChild>
                                <div className="flex items-start gap-2 opacity-50 cursor-help">
                                  <Lock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }} />
                                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{item}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Preview Mode – Upgrade to Download</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </>
                      )}
                    </div>
                    
                    <div className="mt-auto space-y-2">
                      <Button 
                        className="w-full transition-all duration-200 hover:-translate-y-0.5"
                        onClick={() => setLocation("/signup")}
                        style={plan.popular ? { backgroundColor: '#F5C542', color: '#000000' } : { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.25)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.25)' }}
                        data-testid={`button-pricing-${plan.name.toLowerCase()}`}
                      >
                        {plan.cta}
                      </Button>
                      <button 
                        className="w-full text-xs hover:underline"
                        style={{ color: '#F5C542' }}
                        data-testid={`link-pricing-${plan.name.toLowerCase()}-secondary`}
                      >
                        {plan.secondaryLink}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TooltipProvider>
        </div>
      </section>

      <section id="about" className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge 
              variant="outline" 
              className="mb-4"
              style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.75)' }}
            >
              About
            </Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4" style={{ color: '#FFFFFF' }}>
              About MiAuditOps
            </h2>
            <p className="max-w-3xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
              MiAuditOps is a purpose-built audit operations platform for hospitality businesses and auditors. 
              It structures daily audit work—from sales capture and payment declaration to SRD stock reconciliation 
              and exceptions—then produces clear executive reports that build trust with owners and stakeholders.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {[
              { icon: Shield, title: "Audit Evidence & Accountability", description: "Every action is logged. Build trust with complete audit trails." },
              { icon: BarChart3, title: "Stock + Sales Reconciliation", description: "1st hit and 2nd hit variance tracking with exception management." },
              { icon: FileBarChart, title: "Executive-Ready Reporting", description: "Professional reports for owners, stakeholders, and compliance." },
            ].map((item, i) => (
              <Card 
                key={i} 
                className="text-center group transition-all duration-300 hover:shadow-lg"
                style={{ backgroundColor: '#111115', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <CardContent className="pt-6">
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: 'rgba(245,197,66,0.15)' }}
                  >
                    <item.icon className="h-7 w-7" style={{ color: '#F5C542' }} />
                  </div>
                  <h3 className="font-semibold mb-2" style={{ color: '#FFFFFF' }}>{item.title}</h3>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/about")} 
              className="transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10"
              style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#FFFFFF' }}
              data-testid="button-about-learn-more"
            >
              Learn More <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section id="contact" className="py-16 lg:py-24" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <Badge 
                variant="outline" 
                className="mb-4"
                style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.75)' }}
              >
                Contact
              </Badge>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4" style={{ color: '#FFFFFF' }}>
                Get in Touch
              </h2>
              <p className="mb-8" style={{ color: 'rgba(255,255,255,0.75)' }}>
                Have questions about MiAuditOps? We're here to help.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(245,197,66,0.15)' }}
                  >
                    <Mail className="h-5 w-5" style={{ color: '#F5C542' }} />
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>Email</p>
                    <p className="font-medium" style={{ color: '#FFFFFF' }}>support@miauditops.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(245,197,66,0.15)' }}
                  >
                    <Phone className="h-5 w-5" style={{ color: '#F5C542' }} />
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>Phone</p>
                    <p className="font-medium" style={{ color: '#FFFFFF' }}>+234 800 123 4567</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(245,197,66,0.15)' }}
                  >
                    <MapPin className="h-5 w-5" style={{ color: '#F5C542' }} />
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>Office</p>
                    <p className="font-medium" style={{ color: '#FFFFFF' }}>Lagos, Nigeria</p>
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <Button 
                  variant="outline" 
                  onClick={() => setLocation("/contact")} 
                  className="transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10"
                  style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#FFFFFF' }}
                  data-testid="button-contact-support"
                >
                  Contact Support <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
            <Card 
              className="transition-all duration-300 hover:shadow-lg"
              style={{ backgroundColor: '#111115', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <CardHeader>
                <CardTitle style={{ color: '#FFFFFF' }}>Send us a message</CardTitle>
                <CardDescription style={{ color: 'rgba(255,255,255,0.55)' }}>We'll respond within 24 hours.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="contact-name" style={{ color: 'rgba(255,255,255,0.75)' }}>Name</Label>
                    <Input 
                      id="contact-name" 
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="Your name"
                      className="mt-1 transition-all duration-200 focus:ring-2"
                      style={inputStyles}
                      required
                      data-testid="input-contact-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-email" style={{ color: 'rgba(255,255,255,0.75)' }}>Email</Label>
                    <Input 
                      id="contact-email" 
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="you@example.com"
                      className="mt-1 transition-all duration-200 focus:ring-2"
                      style={inputStyles}
                      required
                      data-testid="input-contact-email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-message" style={{ color: 'rgba(255,255,255,0.75)' }}>Message</Label>
                    <Textarea 
                      id="contact-message" 
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      placeholder="How can we help?"
                      rows={4}
                      className="mt-1 transition-all duration-200 focus:ring-2"
                      style={inputStyles}
                      required
                      data-testid="input-contact-message"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                    style={{ backgroundColor: '#F5C542', color: '#000000' }}
                    data-testid="button-contact-submit"
                  >
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge 
              variant="outline" 
              className="mb-4"
              style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.75)' }}
            >
              FAQ
            </Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4" style={{ color: '#FFFFFF' }}>
              Frequently Asked Questions
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, i) => (
              <AccordionItem 
                key={i} 
                value={`faq-${i}`} 
                className="border rounded-lg px-6"
                style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#111115' }}
              >
                <AccordionTrigger className="text-left font-medium" style={{ color: '#FFFFFF' }}>
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <footer className="border-t py-12" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <img src={logoDarkImage} alt="MiAuditOps" className="h-10 object-contain" />
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/" className="transition-colors" style={{ color: 'rgba(255,255,255,0.55)' }}>Home</Link>
              <Link href="/about" className="transition-colors" style={{ color: 'rgba(255,255,255,0.55)' }}>About</Link>
              <Link href="/contact" className="transition-colors" style={{ color: 'rgba(255,255,255,0.55)' }}>Contact</Link>
            </div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              &copy; {new Date().getFullYear()} Miemploya Audit Services
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

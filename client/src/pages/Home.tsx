import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { useLocation, Link } from "wouter";
import { useState, useEffect, useMemo } from "react";
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
import { useToast } from "@/hooks/use-toast";
import logoImage from "@/assets/logo2.png";

interface DBPricingPlan {
  slug: string;
  displayName: string;
  description: string | null;
  monthlyPrice: string;
  quarterlyPrice: string;
  yearlyPrice: string;
  maxClients: number;
  maxSrdDepartmentsPerClient: number;
  maxMainStorePerClient: number;
  maxSeats: number;
  retentionDays: number;
  canViewReports: boolean;
  canDownloadReports: boolean;
  canPrintReports: boolean;
  canAccessPurchasesRegisterPage: boolean;
  canAccessSecondHitPage: boolean;
  canDownloadSecondHitFullTable: boolean;
  canDownloadMainStoreLedgerSummary: boolean;
  canUseBetaFeatures: boolean;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "quarterly" | "yearly">("yearly");
  const [selectedSlots, setSelectedSlots] = useState<1 | 3 | 5 | 10>(1);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [dbPricing, setDbPricing] = useState<DBPricingPlan[]>([]);

  useEffect(() => {
    fetch("/api/public/pricing")
      .then((res) => res.json())
      .then((data) => setDbPricing(data))
      .catch(() => {});
  }, []);

  const getDbPrice = (slug: string) => {
    const plan = dbPricing.find((p) => p.slug === slug);
    if (!plan) return null;
    return {
      monthly: parseFloat(plan.monthlyPrice) || 0,
      quarterly: parseFloat(plan.quarterlyPrice) || 0,
      yearly: parseFloat(plan.yearlyPrice) || 0,
    };
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(amount);
  };

  const calculatePrice = (baseMonthly: number, planSlug?: string) => {
    const dbPrice = planSlug ? getDbPrice(planSlug) : null;
    
    let basePrice = baseMonthly;
    let multiplier = 1;
    let periods = 1;
    
    if (dbPrice) {
      if (billingPeriod === "monthly") {
        basePrice = dbPrice.monthly;
        periods = 1;
      } else if (billingPeriod === "quarterly") {
        basePrice = dbPrice.quarterly;
        periods = 1;
      } else {
        basePrice = dbPrice.yearly;
        periods = 1;
      }
    } else {
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
      basePrice = baseMonthly * periods * multiplier;
    }

    let slotMultiplier = selectedSlots;
    if (selectedSlots === 3) slotMultiplier = 3 * 0.90;
    else if (selectedSlots === 5) slotMultiplier = 5 * 0.85;
    else if (selectedSlots === 10) slotMultiplier = 10 * 0.75;

    return Math.round(basePrice * slotMultiplier);
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
      slug: "starter",
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
      slug: "growth",
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
      slug: "business",
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
      slug: "enterprise",
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

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center">
              <img src={logoImage} alt="MiAuditOps" className="h-20 object-contain" />
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors" data-testid="nav-features">Features</a>
              <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors" data-testid="nav-pricing">Pricing</a>
              <a href="#about" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors" data-testid="nav-about">About</a>
              <a href="#contact" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors" data-testid="nav-contact">Contact</a>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setLocation("/login")} className="text-gray-700 border-gray-300 hover:bg-gray-50" data-testid="nav-signin">
                Sign In
              </Button>
              <Button onClick={() => setLocation("/signup")} className="bg-primary text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg" data-testid="nav-signup">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-4">Built for Hospitality Auditors</Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight mb-6 text-foreground">
              Daily Audit. Stock Control.{" "}
              <span className="text-primary">Evidence-Ready Reports.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              MiAuditOps helps auditors and hospitality businesses capture sales, reconcile stock, 
              raise exceptions, and produce clean reports—daily, weekly, and monthly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                size="lg" 
                onClick={() => setLocation("/signup")} 
                className="text-base px-8 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                data-testid="hero-cta-primary"
              >
                Get Started <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-base px-8 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10"
                data-testid="hero-cta-secondary"
              >
                <Play className="mr-2 h-4 w-4" /> Watch How It Works
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Built for lounges, restaurants, bars, and audit teams.
            </p>
          </div>
        </div>
      </section>
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4">Quick Tour</Badge>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-foreground">
                How MiAuditOps Works
              </h2>
              <p className="text-muted-foreground mb-8">
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
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative aspect-video bg-card rounded-xl border border-border overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-primary/50">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                  <Play className="h-8 w-8 text-primary-foreground ml-1" />
                </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <p className="text-sm text-muted-foreground">Video walkthrough coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="features" className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-foreground">
              Everything You Need for Audit Operations
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete platform designed specifically for hospitality audit workflows.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <Card key={i} className="group transition-all duration-300 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/30 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      <section id="pricing" className="py-16 lg:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-foreground">
              Choose a plan that matches your audit workload
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Monthly, Quarterly, and Yearly billing. Upgrade anytime as your clients, departments, and reporting needs grow.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-6">
              <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1">
                {(["monthly", "quarterly", "yearly"] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setBillingPeriod(period)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      billingPeriod === period 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`billing-${period}`}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                    {period === "quarterly" && <Badge variant="secondary" className="ml-2 text-xs">Save 5%</Badge>}
                    {period === "yearly" && <Badge variant="secondary" className="ml-2 text-xs">Save 15%</Badge>}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 mb-8">
              <Label className="text-sm font-medium text-foreground">Client/Company Slots</Label>
              <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1">
                {([1, 3, 5, 10] as const).map((slots) => (
                  <button
                    key={slots}
                    onClick={() => setSelectedSlots(slots)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      selectedSlots === slots 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
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
              <p className="text-xs text-muted-foreground">A slot is one Client workspace (for Auditors) or one Company workspace (for Companies).</p>
            </div>
          </div>

          <TooltipProvider>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {pricingPlans.map((plan, i) => (
                <Card key={i} className={`relative flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${plan.popular ? "border-primary shadow-lg ring-2 ring-primary/20" : ""}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <p className="text-sm font-medium text-foreground">{plan.headline}</p>
                    <CardDescription className="text-xs">{plan.subtext}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="mb-4">
                      {'isEnterprise' in plan && plan.isEnterprise ? (
                        <div className="text-2xl font-bold text-foreground">Contact Sales</div>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-foreground">₦{formatPrice(calculatePrice(plan.baseMonthly, plan.slug))}</span>
                            <span className="text-sm text-muted-foreground">/{billingPeriod}</span>
                          </div>
                          {selectedSlots > 1 && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              Save up to {selectedSlots === 3 ? "10%" : selectedSlots === 5 ? "15%" : "25%"} with {selectedSlots} slots
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-3 italic">Best for: {plan.bestFor}</p>
                    <p className="text-xs text-muted-foreground mb-4 border-t border-border pt-2">{plan.limits}</p>
                    
                    <div className="space-y-2 mb-4 flex-1">
                      <p className="text-xs font-semibold text-foreground">What you get:</p>
                      {plan.features.map((feature, j) => (
                        <div key={j} className="flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-foreground/80">{feature}</span>
                        </div>
                      ))}
                      
                      {plan.locked.length > 0 && (
                        <>
                          <p className="text-xs font-semibold text-muted-foreground mt-3">Locked in {plan.name}:</p>
                          {plan.locked.map((item, j) => (
                            <Tooltip key={j}>
                              <TooltipTrigger asChild>
                                <div className="flex items-start gap-2 opacity-50 cursor-help">
                                  <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                  <span className="text-xs text-muted-foreground">{item}</span>
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
                        variant={plan.popular ? "default" : "outline"}
                        onClick={() => setLocation("/signup")}
                        data-testid={`button-pricing-${plan.name.toLowerCase()}`}
                      >
                        {plan.cta}
                      </Button>
                      <button 
                        className="w-full text-xs text-primary hover:underline"
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
            <Badge variant="outline" className="mb-4">About</Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-foreground">
              About MiAuditOps
            </h2>
            <p className="text-muted-foreground max-w-3xl mx-auto leading-relaxed">
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
              <Card key={i} className="text-center group transition-all duration-300 hover:shadow-lg hover:border-primary/50">
                <CardContent className="pt-6">
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/30 transition-colors">
                    <item.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2 text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center">
            <Button variant="outline" onClick={() => setLocation("/about")} className="transition-all duration-200 hover:-translate-y-0.5" data-testid="button-about-learn-more">
              Learn More <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
      <section id="contact" className="py-16 lg:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <Badge variant="outline" className="mb-4">Contact</Badge>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-foreground">
                Get in Touch
              </h2>
              <p className="text-muted-foreground mb-8">
                Have questions about MiAuditOps? We're here to help.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium text-foreground">support@miauditops.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium text-foreground">+234 800 123 4567</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Office</p>
                    <p className="font-medium text-foreground">Lagos, Nigeria</p>
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <Button variant="outline" onClick={() => setLocation("/contact")} className="transition-all duration-200 hover:-translate-y-0.5" data-testid="button-contact-support">
                  Contact Support <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
            <Card className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle>Send us a message</CardTitle>
                <CardDescription>We'll respond within 24 hours.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="contact-name">Name</Label>
                    <Input 
                      id="contact-name" 
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="Your name"
                      className="mt-1"
                      required
                      data-testid="input-contact-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-email">Email</Label>
                    <Input 
                      id="contact-email" 
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="you@example.com"
                      className="mt-1"
                      required
                      data-testid="input-contact-email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-message">Message</Label>
                    <Textarea 
                      id="contact-message" 
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      placeholder="How can we help?"
                      rows={4}
                      className="mt-1"
                      required
                      data-testid="input-contact-message"
                    />
                  </div>
                  <Button type="submit" className="w-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg" data-testid="button-contact-submit">
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
            <Badge variant="outline" className="mb-4">FAQ</Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-foreground">
              Frequently Asked Questions
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-lg px-6 bg-card">
                <AccordionTrigger className="text-left font-medium text-foreground">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <img src={logoImage} alt="MiAuditOps" className="h-[72px] object-contain" />
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">Home</Link>
              <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link>
              <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Miemploya Audit Services
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

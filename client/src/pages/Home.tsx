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
  FileBarChart
} from "lucide-react";
import logoImage from "@/assets/miauditops-logo.jpeg";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAnnual, setIsAnnual] = useState(true);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });

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
      description: "For small businesses getting started with audits",
      monthlyPrice: 29,
      annualPrice: 24,
      features: ["1 Company Slot", "Up to 3 Users", "Basic Reports", "Email Support"],
      popular: false,
    },
    {
      name: "Professional",
      description: "For growing businesses with multiple outlets",
      monthlyPrice: 79,
      annualPrice: 65,
      features: ["3 Company Slots", "Up to 10 Users", "Advanced Reports", "Priority Support", "API Access"],
      popular: true,
    },
    {
      name: "Enterprise",
      description: "For audit firms and large operations",
      monthlyPrice: 199,
      annualPrice: 165,
      features: ["Unlimited Slots", "Unlimited Users", "Custom Reports", "Dedicated Support", "White-label Options"],
      popular: false,
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
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img src={logoImage} alt="MiAuditOps" className="h-10 object-contain" />
              <span className="font-display font-bold text-xl hidden sm:block">MiAuditOps</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-features">Features</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-pricing">Pricing</a>
              <a href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-about">About</a>
              <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-contact">Contact</a>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setLocation("/login")} data-testid="nav-signin">
                Sign In
              </Button>
              <Button onClick={() => setLocation("/signup")} className="transition-all duration-200 hover:scale-[1.02] hover:shadow-md" data-testid="nav-signup">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-4">Built for Hospitality Auditors</Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight mb-6">
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
                className="text-base px-8 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                data-testid="hero-cta-primary"
              >
                Get Started <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-base px-8 transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
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
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
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
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative aspect-video bg-muted rounded-xl border border-border overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-primary/50">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
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
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
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
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
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
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Choose the plan that fits your business. All plans include a 14-day free trial.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Label htmlFor="billing-toggle" className={!isAnnual ? "font-medium" : "text-muted-foreground"}>Monthly</Label>
              <Switch id="billing-toggle" checked={isAnnual} onCheckedChange={setIsAnnual} />
              <Label htmlFor="billing-toggle" className={isAnnual ? "font-medium" : "text-muted-foreground"}>
                Annual <Badge variant="secondary" className="ml-1">Save 20%</Badge>
              </Label>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, i) => (
              <Card key={i} className={`relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${plan.popular ? "border-primary shadow-lg" : ""}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">${isAnnual ? plan.annualPrice : plan.monthlyPrice}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <ul className="space-y-3 text-sm mb-6">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full transition-all duration-200 hover:scale-[1.02] ${plan.popular ? "" : "variant-outline"}`}
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => setLocation("/signup")}
                    data-testid={`button-pricing-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    Start Free Trial
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">About</Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
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
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                    <item.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center">
            <Button variant="outline" onClick={() => setLocation("/about")} className="transition-all duration-200 hover:scale-[1.02]" data-testid="button-about-learn-more">
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
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                Get in Touch
              </h2>
              <p className="text-muted-foreground mb-8">
                Have questions about MiAuditOps? We're here to help.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">support@miauditops.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">+234 800 123 4567</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Office</p>
                    <p className="font-medium">Lagos, Nigeria</p>
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <Button variant="outline" onClick={() => setLocation("/contact")} className="transition-all duration-200 hover:scale-[1.02]" data-testid="button-contact-support">
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
                      className="mt-1 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
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
                      className="mt-1 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
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
                      className="mt-1 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                      required
                      data-testid="input-contact-message"
                    />
                  </div>
                  <Button type="submit" className="w-full transition-all duration-200 hover:scale-[1.02] hover:shadow-md" data-testid="button-contact-submit">
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
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-4 transition-all duration-200 hover:border-primary/50" data-testid={`accordion-faq-${i}`}>
                <AccordionTrigger className="text-left hover:no-underline" data-testid={`accordion-trigger-faq-${i}`}>
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
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src={logoImage} alt="MiAuditOps" className="h-10 object-contain" />
                <span className="font-display font-bold text-lg">MiAuditOps</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm">
                The complete audit operations platform for hospitality businesses. Capture, reconcile, and report with confidence.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-home">Home</Link></li>
                <li><Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-about">About</Link></li>
                <li><Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-contact">Contact</Link></li>
                <li><a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-pricing">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-privacy">Privacy Policy</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-terms">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Miemploya Audit Services. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

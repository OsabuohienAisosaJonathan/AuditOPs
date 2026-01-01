import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation, Link } from "wouter";
import { 
  ChevronRight,
  ClipboardCheck,
  Warehouse,
  Calculator,
  AlertTriangle,
  FileBarChart,
  Shield,
  Users,
  Building2,
  Utensils,
  Wine,
  Hotel
} from "lucide-react";
import logoDarkImage from "@/assets/miauditops-logo-dark.jpeg";

export default function About() {
  const [, setLocation] = useLocation();

  const whoItsFor = [
    { icon: Users, title: "Audit Firms", description: "External auditors managing multiple hospitality clients with standardized workflows." },
    { icon: Wine, title: "Lounges & Bars", description: "Nightlife venues with high-volume sales and inventory tracking needs." },
    { icon: Utensils, title: "Restaurants", description: "Food service operations requiring daily stock reconciliation and exception tracking." },
    { icon: Hotel, title: "Hotel F&B", description: "Hotel food & beverage departments with multi-outlet operations." },
  ];

  const differentiators = [
    { 
      icon: Warehouse, 
      title: "SRD-Led Inventory Flow", 
      description: "Stock Reconciliation Departments (SRDs) structure your inventory into Main Store and Department Store ledgers, enabling precise tracking of goods from receiving to point-of-sale." 
    },
    { 
      icon: Calculator, 
      title: "1st Hit vs 2nd Hit Reconciliation", 
      description: "First Hit compares declared payments against captured sales. Second Hit incorporates auditor adjustments, receivables, and surplus to produce the final variance." 
    },
    { 
      icon: AlertTriangle, 
      title: "Exceptions + Registers", 
      description: "Raise exceptions with investigation timelines, outcomes, and accountability. Track receivables (outstanding payments) and surplus (unexplained overages) in dedicated registers." 
    },
    { 
      icon: FileBarChart, 
      title: "Evidence-Ready Reports", 
      description: "Generate professional audit reports that executives trust—with variance analysis, exception summaries, and compliance scoring built in." 
    },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0B0B0D' }}>
      <nav className="sticky top-0 z-50 border-b" style={{ backgroundColor: '#000000', borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-3">
              <img src={logoDarkImage} alt="MiAuditOps" className="h-14 object-contain" style={{ maxHeight: '56px' }} />
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/#features" className="text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.75)' }} data-testid="nav-features">Features</Link>
              <Link href="/#pricing" className="text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.75)' }} data-testid="nav-pricing">Pricing</Link>
              <Link href="/about" className="text-sm font-medium" style={{ color: '#FFFFFF' }} data-testid="nav-about">About</Link>
              <Link href="/contact" className="text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.75)' }} data-testid="nav-contact">Contact</Link>
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
                data-testid="nav-get-started"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <section className="py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge 
            variant="outline" 
            className="mb-4"
            style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.75)' }}
          >
            About Us
          </Badge>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-6" style={{ color: '#FFFFFF' }}>
            Purpose-Built for{" "}
            <span style={{ color: '#F5C542' }}>Hospitality Audits</span>
          </h1>
          <p className="text-lg leading-relaxed max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.75)' }}>
            MiAuditOps is not a generic accounting tool. It's a specialized audit operations platform 
            designed specifically for the unique challenges of hospitality businesses—where daily cash flows, 
            high-volume inventory, and multiple revenue points demand rigorous, evidence-based audit procedures.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-24" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge 
              variant="outline" 
              className="mb-4"
              style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.75)' }}
            >
              Who It's For
            </Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4" style={{ color: '#FFFFFF' }}>
              Built for Your Industry
            </h2>
            <p className="max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Whether you're an external auditor or running your own hospitality business, 
              MiAuditOps adapts to your workflow.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whoItsFor.map((item, i) => (
              <Card 
                key={i} 
                className="text-center group transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                style={{ backgroundColor: '#111115', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <CardContent className="pt-8 pb-6">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: 'rgba(245,197,66,0.15)' }}
                  >
                    <item.icon className="h-8 w-8" style={{ color: '#F5C542' }} />
                  </div>
                  <h3 className="font-semibold text-lg mb-2" style={{ color: '#FFFFFF' }}>{item.title}</h3>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge 
              variant="outline" 
              className="mb-4"
              style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.75)' }}
            >
              Why MiAuditOps
            </Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4" style={{ color: '#FFFFFF' }}>
              What Makes It Different
            </h2>
            <p className="max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.75)' }}>
              We didn't just build another spreadsheet replacement. We built a complete audit methodology into software.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {differentiators.map((item, i) => (
              <Card 
                key={i} 
                className="group transition-all duration-300 hover:shadow-lg"
                style={{ backgroundColor: '#111115', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <CardContent className="p-6 flex gap-4">
                  <div className="flex-shrink-0">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: 'rgba(245,197,66,0.15)' }}
                    >
                      <item.icon className="h-6 w-6" style={{ color: '#F5C542' }} />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2" style={{ color: '#FFFFFF' }}>{item.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24" style={{ backgroundColor: 'rgba(245,197,66,0.05)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Shield className="h-10 w-10" style={{ color: '#F5C542' }} />
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4" style={{ color: '#FFFFFF' }}>
            Ready to Transform Your Audit Operations?
          </h2>
          <p className="mb-8 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Join audit teams and hospitality businesses that trust MiAuditOps for daily operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => setLocation("/signup")} 
              className="text-base px-8 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              style={{ backgroundColor: '#F5C542', color: '#000000' }}
              data-testid="button-start-free"
            >
              Start Free <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => setLocation("/#pricing")}
              className="text-base px-8 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10"
              style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#FFFFFF' }}
              data-testid="button-view-pricing"
            >
              View Pricing
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t py-8" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <img src={logoDarkImage} alt="MiAuditOps" className="h-10 object-contain" />
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/" className="transition-colors" style={{ color: 'rgba(255,255,255,0.55)' }} data-testid="footer-link-home">Home</Link>
              <Link href="/about" className="font-medium" style={{ color: '#FFFFFF' }} data-testid="footer-link-about">About</Link>
              <Link href="/contact" className="transition-colors" style={{ color: 'rgba(255,255,255,0.55)' }} data-testid="footer-link-contact">Contact</Link>
            </div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              &copy; {new Date().getFullYear()} Miemploya
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

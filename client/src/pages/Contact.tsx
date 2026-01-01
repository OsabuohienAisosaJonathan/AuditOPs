import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation, Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, MapPin, Building2 } from "lucide-react";
import logoDarkImage from "@/assets/miauditops-logo-dark.jpeg";

export default function Contact() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: "Message sent!",
      description: "We'll get back to you within 24 hours.",
    });

    setFormData({ name: "", email: "", subject: "", message: "" });
    setIsSubmitting(false);
  };

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
            <Link href="/" className="flex items-center gap-3">
              <img src={logoDarkImage} alt="MiAuditOps" className="h-14 object-contain" style={{ maxHeight: '56px' }} />
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/#features" className="text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.75)' }} data-testid="nav-features">Features</Link>
              <Link href="/#pricing" className="text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.75)' }} data-testid="nav-pricing">Pricing</Link>
              <Link href="/about" className="text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.75)' }} data-testid="nav-about">About</Link>
              <Link href="/contact" className="text-sm font-medium" style={{ color: '#FFFFFF' }} data-testid="nav-contact">Contact</Link>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge 
              variant="outline" 
              className="mb-4"
              style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.75)' }}
            >
              Contact Us
            </Badge>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4" style={{ color: '#FFFFFF' }}>
              We're Here to Help
            </h1>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Have questions about MiAuditOps? Need help getting started? 
              Our team is ready to assist you.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <Card 
                className="transition-all duration-300 hover:shadow-lg"
                style={{ backgroundColor: '#111115', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(245,197,66,0.15)' }}
                    >
                      <Mail className="h-5 w-5" style={{ color: '#F5C542' }} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1" style={{ color: '#FFFFFF' }}>Email Support</h3>
                      <p className="text-sm mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>For general inquiries and support</p>
                      <a href="mailto:support@miauditops.com" className="hover:underline text-sm" style={{ color: '#F5C542' }}>
                        support@miauditops.com
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="transition-all duration-300 hover:shadow-lg"
                style={{ backgroundColor: '#111115', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(245,197,66,0.15)' }}
                    >
                      <Phone className="h-5 w-5" style={{ color: '#F5C542' }} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1" style={{ color: '#FFFFFF' }}>Phone</h3>
                      <p className="text-sm mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>Mon-Fri, 9am-6pm WAT</p>
                      <a href="tel:+2348001234567" className="hover:underline text-sm" style={{ color: '#F5C542' }}>
                        +234 800 123 4567
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="transition-all duration-300 hover:shadow-lg"
                style={{ backgroundColor: '#111115', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(245,197,66,0.15)' }}
                    >
                      <MapPin className="h-5 w-5" style={{ color: '#F5C542' }} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1" style={{ color: '#FFFFFF' }}>Office</h3>
                      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        Victoria Island<br />
                        Lagos, Nigeria
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="transition-all duration-300 hover:shadow-lg"
                style={{ backgroundColor: 'rgba(245,197,66,0.05)', borderColor: 'rgba(245,197,66,0.2)' }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(245,197,66,0.15)' }}
                    >
                      <Building2 className="h-5 w-5" style={{ color: '#F5C542' }} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1" style={{ color: '#FFFFFF' }}>Enterprise Inquiries</h3>
                      <p className="text-sm mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        For large-scale deployments, white-labeling, or custom integrations
                      </p>
                      <a href="mailto:enterprise@miauditops.com" className="hover:underline text-sm" style={{ color: '#F5C542' }}>
                        enterprise@miauditops.com
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card 
                className="transition-all duration-300 hover:shadow-lg"
                style={{ backgroundColor: '#111115', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <CardHeader>
                  <CardTitle style={{ color: '#FFFFFF' }}>Send us a message</CardTitle>
                  <CardDescription style={{ color: 'rgba(255,255,255,0.55)' }}>
                    Fill out the form below and we'll get back to you within 24 hours.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" style={{ color: 'rgba(255,255,255,0.75)' }}>Full Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Your name"
                          className="h-11 transition-all duration-200 focus:ring-2"
                          style={inputStyles}
                          required
                          data-testid="input-contact-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" style={{ color: 'rgba(255,255,255,0.75)' }}>Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="you@example.com"
                          className="h-11 transition-all duration-200 focus:ring-2"
                          style={inputStyles}
                          required
                          data-testid="input-contact-email"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject" style={{ color: 'rgba(255,255,255,0.75)' }}>Subject</Label>
                      <Select 
                        value={formData.subject} 
                        onValueChange={(val) => setFormData({ ...formData, subject: val })}
                      >
                        <SelectTrigger 
                          className="h-11" 
                          style={inputStyles}
                          data-testid="select-contact-subject"
                        >
                          <SelectValue placeholder="Select a topic" />
                        </SelectTrigger>
                        <SelectContent style={{ backgroundColor: '#111115', borderColor: 'rgba(255,255,255,0.1)' }}>
                          <SelectItem value="general">General Inquiry</SelectItem>
                          <SelectItem value="support">Technical Support</SelectItem>
                          <SelectItem value="sales">Sales & Pricing</SelectItem>
                          <SelectItem value="demo">Request a Demo</SelectItem>
                          <SelectItem value="enterprise">Enterprise Solutions</SelectItem>
                          <SelectItem value="feedback">Feedback & Suggestions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" style={{ color: 'rgba(255,255,255,0.75)' }}>Message</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="How can we help you?"
                        rows={6}
                        className="transition-all duration-200 focus:ring-2"
                        style={inputStyles}
                        required
                        data-testid="input-contact-message"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full sm:w-auto px-8 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
                      disabled={isSubmitting}
                      style={{ backgroundColor: '#F5C542', color: '#000000' }}
                      data-testid="button-contact-submit"
                    >
                      {isSubmitting ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
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
              <Link href="/about" className="transition-colors" style={{ color: 'rgba(255,255,255,0.55)' }} data-testid="footer-link-about">About</Link>
              <Link href="/contact" className="font-medium" style={{ color: '#FFFFFF' }} data-testid="footer-link-contact">Contact</Link>
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

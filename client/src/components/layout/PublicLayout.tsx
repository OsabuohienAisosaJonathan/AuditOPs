import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import logoDarkImage from "@/assets/miauditops-logo-dark.jpeg";

interface PublicLayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

export default function PublicLayout({ children, showNav = true }: PublicLayoutProps) {
  const [, setLocation] = useLocation();
  const [location] = useLocation();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0B0B0D' }}>
      {showNav && (
        <nav className="sticky top-0 z-50 border-b" style={{ backgroundColor: '#000000', borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center gap-3">
                <img 
                  src={logoDarkImage} 
                  alt="MiAuditOps" 
                  className="h-14 object-contain" 
                  style={{ maxHeight: '56px' }}
                />
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <Link 
                  href="/#features" 
                  className="text-sm transition-colors" 
                  style={{ color: location === '/#features' ? '#FFFFFF' : 'rgba(255,255,255,0.75)' }}
                  data-testid="nav-features"
                >
                  Features
                </Link>
                <Link 
                  href="/#pricing" 
                  className="text-sm transition-colors"
                  style={{ color: location === '/#pricing' ? '#FFFFFF' : 'rgba(255,255,255,0.75)' }}
                  data-testid="nav-pricing"
                >
                  Pricing
                </Link>
                <Link 
                  href="/about" 
                  className="text-sm transition-colors"
                  style={{ color: location === '/about' ? '#FFFFFF' : 'rgba(255,255,255,0.75)' }}
                  data-testid="nav-about"
                >
                  About
                </Link>
                <Link 
                  href="/contact" 
                  className="text-sm transition-colors"
                  style={{ color: location === '/contact' ? '#FFFFFF' : 'rgba(255,255,255,0.75)' }}
                  data-testid="nav-contact"
                >
                  Contact
                </Link>
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
                  className="font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ 
                    backgroundColor: '#F5C542', 
                    color: '#000000',
                  }}
                  data-testid="nav-get-started"
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        </nav>
      )}
      {children}
    </div>
  );
}

export const publicInputStyles = {
  backgroundColor: '#0F0F14',
  borderColor: 'rgba(255,255,255,0.12)',
  color: '#FFFFFF',
};

export const publicCardStyles = {
  backgroundColor: '#111115',
  borderColor: 'rgba(255,255,255,0.1)',
};

export const publicTextStyles = {
  primary: '#FFFFFF',
  secondary: 'rgba(255,255,255,0.75)',
  muted: 'rgba(255,255,255,0.55)',
};

export const publicButtonStyles = {
  primary: {
    backgroundColor: '#F5C542',
    color: '#000000',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.25)',
    color: '#FFFFFF',
  },
};

import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { usePlatformAdminAuth } from "@/lib/platform-admin-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  CreditCard, 
  Shield, 
  ScrollText,
  LogOut,
  ChevronDown,
  Settings,
  Package
} from "lucide-react";

interface PlatformAdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/owner", label: "Dashboard", icon: LayoutDashboard },
  { href: "/owner/tenants", label: "Tenants", icon: Building2 },
  { href: "/owner/users", label: "Users", icon: Users },
  { href: "/owner/billing", label: "Billing", icon: CreditCard },
  { href: "/owner/plans", label: "Plans", icon: Package },
  { href: "/owner/entitlements", label: "Entitlements", icon: Shield },
  { href: "/owner/logs", label: "Audit Logs", icon: ScrollText },
];

export function PlatformAdminLayout({ children }: PlatformAdminLayoutProps) {
  const { admin, logout } = usePlatformAdminAuth();
  const [location] = useLocation();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/owner/login";
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      platform_super_admin: "Super Admin",
      billing_admin: "Billing Admin",
      support_admin: "Support Admin",
      compliance_admin: "Compliance Admin",
      readonly_admin: "Read Only",
    };
    return labels[role] || role;
  };

  return (
    <div className="min-h-screen bg-slate-100 flex" data-testid="platform-admin-layout">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg">MiAuditOps</h1>
              <p className="text-xs text-slate-400">Platform Admin</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || 
              (item.href !== "/owner" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <a
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive 
                      ? "bg-purple-600 text-white" 
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </a>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="text-xs text-slate-400 mb-2">Environment</div>
          <div className="text-sm text-slate-300">
            {process.env.NODE_ENV === "production" ? "Production" : "Development"}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Platform Admin Console</h2>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-purple-100 text-purple-700">
                    {admin?.name?.charAt(0) || "A"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <div className="text-sm font-medium">{admin?.name}</div>
                  <div className="text-xs text-slate-500">{getRoleLabel(admin?.role || "")}</div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="flex items-center gap-2 text-red-600"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

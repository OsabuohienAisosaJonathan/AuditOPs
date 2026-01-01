import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { MAIN_NAV_ITEMS, ADMIN_NAV_ITEMS } from "@/lib/menu-config";
import { useAuth } from "@/lib/auth-context";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export function HorizontalNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "super_admin";

  const allItems = isAdmin ? [...MAIN_NAV_ITEMS, ...ADMIN_NAV_ITEMS] : MAIN_NAV_ITEMS;

  return (
    <div className="border-b bg-muted/30 px-4 py-2">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-center gap-1">
          {allItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground"
                  )}
                  data-testid={`nav-horizontal-${item.href.replace(/\//g, "")}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{item.shortLabel || item.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>
    </div>
  );
}

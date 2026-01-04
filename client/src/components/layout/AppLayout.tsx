import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger, SidebarRail, SidebarGroup, SidebarGroupLabel, useSidebar } from "@/components/ui/sidebar";
import { useLocation, Link } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Building2, LogOut, Check, ChevronsUpDown, Sun, Moon, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { NotificationsDropdown } from "@/components/NotificationsDropdown";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useClientContext } from "@/lib/client-context";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MAIN_NAV_ITEMS, ADMIN_NAV_ITEMS, isFeatureEnabled } from "@/lib/menu-config";
import { useEntitlements } from "@/lib/entitlements-context";
import { Lock } from "lucide-react";
import { HorizontalNav } from "./HorizontalNav";
import { useLayout } from "@/lib/layout-context";
import logoImage from "@/assets/logo.png";

const getRoleBadge = (role: string) => {
  switch (role) {
    case "super_admin":
      return { label: "Super Admin", color: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300" };
    case "supervisor":
      return { label: "Supervisor", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300" };
    case "auditor":
      return { label: "Auditor", color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300" };
    default:
      return { label: role, color: "bg-slate-100 text-slate-700" };
  }
};

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { state: sidebarState } = useSidebar();
  const { canGoBack, canGoForward, goBack, goForward, sidebarCollapsed, setSidebarCollapsed } = useLayout();
  const isSidebarCollapsed = sidebarState === "collapsed";
  const { 
    clients, 
    selectedClient, 
    selectedClientId, 
    setSelectedClientId, 
    departments,
    selectedDepartment,
    selectedDepartmentId,
    setSelectedDepartmentId,
    selectedDate,
    setSelectedDate,
    isLoading: clientsLoading 
  } = useClientContext();
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [departmentSearchOpen, setDepartmentSearchOpen] = useState(false);

  const date = selectedDate ? new Date(selectedDate + "T00:00:00") : new Date();
  
  useEffect(() => {
    setSidebarCollapsed(isSidebarCollapsed);
  }, [isSidebarCollapsed, setSidebarCollapsed]);

  return (
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar location={location} user={user} onLogout={logout} />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-background px-6 shadow-sm">
            <SidebarTrigger />
            <div className="h-6 w-px bg-border mx-1" />
            
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goBack}
                    disabled={!canGoBack}
                    className="h-8 w-8"
                    data-testid="button-nav-back"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Back</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goForward}
                    disabled={!canGoForward}
                    className="h-8 w-8"
                    data-testid="button-nav-forward"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Forward</TooltipContent>
              </Tooltip>
            </div>
            <div className="h-6 w-px bg-border mx-1" />
            
            <div className="flex items-center gap-2 flex-1 overflow-x-auto no-scrollbar">
              <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientSearchOpen}
                    className="w-[220px] h-9 justify-between bg-muted/30 border-dashed border-border"
                    data-testid="select-client-context"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate">
                        {selectedClient ? selectedClient.name : "Select Client..."}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search clients..." />
                    <CommandList>
                      <CommandEmpty>No clients found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all-clients"
                          onSelect={() => {
                            setSelectedClientId(null);
                            setClientSearchOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", !selectedClientId ? "opacity-100" : "opacity-0")} />
                          All Clients
                        </CommandItem>
                        {clients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.name}
                            onSelect={() => {
                              setSelectedClientId(client.id);
                              setClientSearchOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedClientId === client.id ? "opacity-100" : "opacity-0")} />
                            {client.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {selectedClientId && departments.length > 0 && (
                <Popover open={departmentSearchOpen} onOpenChange={setDepartmentSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={departmentSearchOpen}
                      className="w-[200px] h-9 justify-between bg-muted/30 border-dashed border-border"
                      data-testid="select-department-context"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {selectedDepartment ? selectedDepartment.name : "Select Department..."}
                        </span>
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[260px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search departments..." />
                      <CommandList>
                        <CommandEmpty>No departments found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all-departments"
                            onSelect={() => {
                              setSelectedDepartmentId(null);
                              setDepartmentSearchOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", !selectedDepartmentId ? "opacity-100" : "opacity-0")} />
                            All Departments
                          </CommandItem>
                          {departments.filter(d => d.status === "active").map((dept) => (
                            <CommandItem
                              key={dept.id}
                              value={dept.name}
                              onSelect={() => {
                                setSelectedDepartmentId(dept.id);
                                setDepartmentSearchOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedDepartmentId === dept.id ? "opacity-100" : "opacity-0")} />
                              {dept.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 justify-start text-left font-normal bg-muted/30 border-dashed border-border min-w-[130px]"
                    data-testid="select-date"
                  >
                    {format(date, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setSelectedDate(format(d, "yyyy-MM-dd"))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex items-center gap-3 ml-auto">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                data-testid="button-theme-toggle"
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
              <NotificationsDropdown />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {user?.fullName?.split(" ").map(n => n[0]).join("").toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:flex flex-col items-start">
                      <span className="text-sm font-medium">{user?.fullName}</span>
                      {user?.role && (
                        <Badge variant="outline" className={cn("text-[10px] h-4 px-1", getRoleBadge(user.role).color)}>
                          {getRoleBadge(user.role).label}
                        </Badge>
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.fullName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          
          {isSidebarCollapsed && <HorizontalNav />}
          
          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>
        </main>
      </div>
  );
}

const SIDEBAR_STATE_KEY = "miemploya-sidebar-collapsed";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isLoading } = useAuth();
  const [defaultOpen] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
    return stored !== "true";
  });
  
  const publicRoutes = ["/", "/login", "/signup", "/about", "/contact", "/setup", "/forgot-password", "/reset-password", "/check-email", "/verify-email"];
  
  // For public routes, never show sidebar layout
  if (publicRoutes.includes(location)) return <>{children}</>;
  
  // CRITICAL: For protected routes, only show sidebar layout when authenticated
  // If not authenticated (user is null and not loading), render without layout
  // This prevents the sidebar from appearing alongside the login form
  if (!isLoading && !user) {
    return <>{children}</>;
  }
  
  // While loading auth, also skip layout to prevent flash
  if (isLoading) {
    return <>{children}</>;
  }
  
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppLayoutContent>{children}</AppLayoutContent>
    </SidebarProvider>
  );
}

function AppSidebar({ location, user, onLogout }: { location: string; user: any; onLogout: () => void }) {
  const isAdmin = user?.role === "super_admin";
  const { entitlements } = useEntitlements();
  
  return (
    <Sidebar className="border-r border-border/40">
      <SidebarHeader className="border-b border-border/40 px-4 py-3">
        <Link href="/dashboard" className="flex items-center">
          <img 
            src={logoImage}
            alt="MiAuditOps" 
            className="h-10 w-auto object-contain"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
            Main Menu
          </SidebarGroupLabel>
          <SidebarMenu>
            {MAIN_NAV_ITEMS.map((item) => {
              // Only gate features after entitlements are loaded
              const enabled = !entitlements || isFeatureEnabled(item, entitlements);
              
              if (!enabled) {
                return (
                  <SidebarMenuItem key={item.href}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton 
                          className="opacity-50 cursor-not-allowed transition-colors"
                          disabled
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="flex-1">{item.label}</span>
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Upgrade to unlock this feature</p>
                      </TooltipContent>
                    </Tooltip>
                  </SidebarMenuItem>
                );
              }
              
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.href}
                    className="transition-colors"
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
        
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
              Administration
            </SidebarGroupLabel>
            <SidebarMenu>
              {ADMIN_NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.href}
                    className="transition-colors"
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-border/40 p-4">
        <div className="text-xs text-muted-foreground text-center">
          v1.0.0 - Miemploya AuditOps
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger, SidebarRail, SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar";
import { useLocation, Link } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell, Building2, LayoutDashboard, ClipboardCheck, ShoppingBag, PackageSearch, FileCheck, AlertOctagon, FileText, Settings, History, Users, ShieldCheck, LogOut, Check, ChevronsUpDown, Layers, UserCog } from "lucide-react";
import logoImage from "@assets/Mi_EMPLOYA_LOGO4_(1)_1766735385076.jpg";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useClientContext } from "@/lib/client-context";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const MAIN_NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Building2, label: "Clients", href: "/clients" },
  { icon: ClipboardCheck, label: "Audit Workspace", href: "/audit-workspace" },
  { icon: ShoppingBag, label: "Sales Capture", href: "/sales-capture" },
  { icon: PackageSearch, label: "Inventory & Purchases", href: "/inventory" },
  { icon: FileCheck, label: "Reconciliation", href: "/reconciliation" },
  { icon: AlertOctagon, label: "Exceptions", href: "/exceptions" },
  { icon: FileText, label: "Reports", href: "/reports" },
  { icon: History, label: "Audit Trail", href: "/audit-trail" },
];

const ADMIN_NAV_ITEMS = [
  { icon: Users, label: "User Management", href: "/users" },
  { icon: UserCog, label: "Client Access", href: "/client-access" },
  { icon: ShieldCheck, label: "Admin Activity", href: "/admin-activity" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
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

  if (location === "/" || location === "/setup") return <>{children}</>;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar location={location} user={user} onLogout={logout} />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-background px-6 shadow-sm">
            <SidebarTrigger />
            <div className="h-6 w-px bg-border mx-2" />
            
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
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-medium">3</span>
              </Button>
              
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
          
          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

function AppSidebar({ location, user, onLogout }: { location: string; user: any; onLogout: () => void }) {
  const isAdmin = user?.role === "super_admin";
  
  return (
    <Sidebar className="border-r border-border/40">
      <SidebarHeader className="border-b border-border/40 px-4 py-4">
        <div className="flex items-center gap-3">
          <img 
            src={logoImage}
            alt="Miemploya Logo" 
            className="h-10 w-10 rounded-lg object-cover"
          />
          <div>
            <h1 className="font-bold text-lg tracking-tight text-primary">Miemploya</h1>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">AuditOps</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
            Main Menu
          </SidebarGroupLabel>
          <SidebarMenu>
            {MAIN_NAV_ITEMS.map((item) => (
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

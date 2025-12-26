import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger, SidebarRail, SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar";
import { useLocation, Link } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell, Building2, LayoutDashboard, ClipboardCheck, ShoppingBag, PackageSearch, FileCheck, AlertOctagon, FileText, Settings, History, Users, ShieldCheck, LogOut, Check, ChevronsUpDown, Layers } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";
import { departmentsApi, Department } from "@/lib/api";

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
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { user, logout } = useAuth();
  const { clients, selectedClient, selectedClientId, setSelectedClientId, isLoading: clientsLoading } = useClientContext();
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");

  const { data: departments = [] } = useQuery({
    queryKey: ["departments-by-client", selectedClientId],
    queryFn: () => selectedClientId ? departmentsApi.getByClient(selectedClientId) : Promise.resolve([]),
    enabled: !!selectedClientId,
    staleTime: 0,
  });

  const selectedDepartment = departments.find((d: Department) => d.id === selectedDepartmentId);

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
                            setSelectedDepartmentId("");
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
                              setSelectedDepartmentId("");
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

              {selectedClientId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-[180px] h-9 justify-between bg-muted/30 border-dashed border-border"
                      data-testid="select-department-context"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {selectedDepartment ? selectedDepartment.name : "All Departments"}
                        </span>
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[200px]">
                    <DropdownMenuItem onClick={() => setSelectedDepartmentId("")}>
                      <Check className={cn("mr-2 h-4 w-4", !selectedDepartmentId ? "opacity-100" : "opacity-0")} />
                      All Departments
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {departments.filter((d: Department) => d.status === "active").map((dept: Department) => (
                      <DropdownMenuItem key={dept.id} onClick={() => setSelectedDepartmentId(dept.id)}>
                        <Check className={cn("mr-2 h-4 w-4", selectedDepartmentId === dept.id ? "opacity-100" : "opacity-0")} />
                        {dept.name}
                      </DropdownMenuItem>
                    ))}
                    {departments.filter((d: Department) => d.status === "active").length === 0 && (
                      <DropdownMenuItem disabled className="text-muted-foreground text-sm">
                        No active departments
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[180px] h-9 justify-start text-left font-normal bg-muted/30 border-dashed border-border shadow-none",
                      !date && "text-muted-foreground"
                    )}
                    data-testid="button-date-picker"
                  >
                    <span className="truncate">
                      {date ? format(date, "MMM d, yyyy") : <span>Pick a date</span>}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {selectedClient && (
                <div className="hidden md:flex items-center gap-2 ml-2 px-3 py-1 rounded-md bg-primary/10 text-primary text-sm">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="font-medium">{selectedClient.name}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 ml-4">
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" data-testid="button-notifications">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive border-2 border-background" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer" data-testid="button-user-menu">
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarFallback>{user?.fullName?.split(" ").map(n => n[0]).join("") || "U"}</AvatarFallback>
                    </Avatar>
                    {user && (
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5", getRoleBadge(user.role).color)}>
                        {getRoleBadge(user.role).label}
                      </Badge>
                    )}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.fullName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <Link href="/settings">
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="h-4 w-4 mr-2" /> Settings
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer" data-testid="button-logout">
                    <LogOut className="h-4 w-4 mr-2" /> Sign Out
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
  const isSuperAdmin = user?.role === "super_admin";

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground" collapsible="icon">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-sidebar-border/50 px-4">
        <div className="flex items-center gap-2 font-display font-bold text-lg text-sidebar-primary-foreground">
          <img src={logoImage} alt="Miemploya" className="h-10 object-contain group-data-[collapsible=icon]:h-8" />
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase tracking-wider text-[10px] font-semibold mb-2 px-2">Main Menu</SidebarGroupLabel>
          <SidebarMenu>
            {MAIN_NAV_ITEMS.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton 
                    isActive={location === item.href}
                    tooltip={item.label}
                    className="h-10 data-[active=true]:bg-primary data-[active=true]:text-white hover:bg-sidebar-accent hover:text-white transition-all duration-200"
                    data-testid={`nav-${item.href.replace("/", "")}`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase tracking-wider text-[10px] font-semibold mb-2 px-2">Administration</SidebarGroupLabel>
            <SidebarMenu>
              {ADMIN_NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href}>
                    <SidebarMenuButton 
                      isActive={location === item.href}
                      tooltip={item.label}
                      className="h-10 data-[active=true]:bg-primary data-[active=true]:text-white hover:bg-sidebar-accent hover:text-white transition-all duration-200"
                      data-testid={`nav-${item.href.replace("/", "")}`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {!isSuperAdmin && (
          <SidebarGroup className="mt-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/settings">
                  <SidebarMenuButton 
                    isActive={location === "/settings"}
                    tooltip="Settings"
                    className="h-10 data-[active=true]:bg-primary data-[active=true]:text-white hover:bg-sidebar-accent hover:text-white transition-all duration-200"
                    data-testid="nav-settings"
                  >
                    <Settings className="h-5 w-5" />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-4">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-9 w-9 border border-sidebar-border/50 bg-sidebar-accent">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground">
              {user?.fullName?.split(" ").map((n: string) => n[0]).join("") || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium text-sidebar-foreground">{user?.fullName || "User"}</span>
            <span className="text-xs text-sidebar-foreground/50">{getRoleBadge(user?.role || "").label}</span>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger, SidebarRail, SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar";
import { useLocation, Link } from "wouter";
import { NAV_ITEMS } from "@/lib/mockData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell, Search, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [date, setDate] = useState<Date | undefined>(new Date());

  if (location === "/") return <>{children}</>;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar location={location} />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-background px-6 shadow-sm">
            <SidebarTrigger />
            <div className="h-6 w-px bg-border mx-2" />
            
            {/* Context Selectors */}
            <div className="flex items-center gap-2 flex-1 overflow-x-auto no-scrollbar">
              <Select defaultValue="c1">
                <SelectTrigger className="w-[200px] h-9 bg-muted/30 border-dashed border-border focus:ring-0 shadow-none">
                  <SelectValue placeholder="Select Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="c1">The Grand Lounge</SelectItem>
                  <SelectItem value="c2">Ocean View Restaurant</SelectItem>
                  <SelectItem value="c3">Skybar Rooftop</SelectItem>
                </SelectContent>
              </Select>

              <Select defaultValue="o1">
                <SelectTrigger className="w-[180px] h-9 bg-muted/30 border-dashed border-border focus:ring-0 shadow-none">
                  <SelectValue placeholder="Select Outlet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="o1">Main Bar</SelectItem>
                  <SelectItem value="o2">VIP Lounge</SelectItem>
                  <SelectItem value="o3">Kitchen</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[240px] h-9 justify-start text-left font-normal bg-muted/30 border-dashed border-border shadow-none",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <span className="truncate">
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
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

              <Button variant="default" size="sm" className="ml-auto bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
                Generate Report
              </Button>
            </div>

            <div className="flex items-center gap-4 ml-4">
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive border-2 border-background" />
              </Button>
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
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

function AppSidebar({ location }: { location: string }) {
  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground" collapsible="icon">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-sidebar-border/50 px-4">
        <div className="flex items-center gap-2 font-display font-bold text-lg text-sidebar-primary-foreground">
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
            <span className="text-white text-xl">M</span>
          </div>
          <span className="group-data-[collapsible=icon]:hidden">AuditOps</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase tracking-wider text-[10px] font-semibold mb-2 px-2">Main Menu</SidebarGroupLabel>
          <SidebarMenu>
            {NAV_ITEMS.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton 
                    isActive={location === item.href}
                    tooltip={item.label}
                    className="h-10 data-[active=true]:bg-primary data-[active=true]:text-white hover:bg-sidebar-accent hover:text-white transition-all duration-200"
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-4">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-9 w-9 border border-sidebar-border/50 bg-sidebar-accent">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground">JD</AvatarFallback>
          </Avatar>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium text-sidebar-foreground">John Doe</span>
            <span className="text-xs text-sidebar-foreground/50">Senior Auditor</span>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

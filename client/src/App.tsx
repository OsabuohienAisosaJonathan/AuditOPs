import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ClientProvider } from "@/lib/client-context";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Setup from "@/pages/Setup";
import Dashboard from "@/pages/Dashboard";
import AuditWorkspace from "@/pages/AuditWorkspace";
import Clients from "@/pages/Clients";
import SalesCapture from "@/pages/SalesCapture";
import Inventory from "@/pages/Inventory";
import Reconciliation from "@/pages/Reconciliation";
import Exceptions from "@/pages/Exceptions";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import AuditTrail from "@/pages/AuditTrail";
import UserManagement from "@/pages/UserManagement";
import AdminActivityLog from "@/pages/AdminActivityLog";
import ClientAccess from "@/pages/ClientAccess";
import AppLayout from "@/components/layout/AppLayout";
import { useEffect } from "react";

function ProtectedRoute({ component: Component, requiredRole }: { component: React.ComponentType; requiredRole?: string }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <Component />;
}

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/setup" component={Setup} />
        <Route path="/dashboard">
          <ProtectedRoute component={Dashboard} />
        </Route>
        <Route path="/audit-workspace">
          <ProtectedRoute component={AuditWorkspace} />
        </Route>
        <Route path="/clients">
          <ProtectedRoute component={Clients} />
        </Route>
        <Route path="/sales-capture">
          <ProtectedRoute component={SalesCapture} />
        </Route>
        <Route path="/inventory">
          <ProtectedRoute component={Inventory} />
        </Route>
        <Route path="/reconciliation">
          <ProtectedRoute component={Reconciliation} />
        </Route>
        <Route path="/exceptions">
          <ProtectedRoute component={Exceptions} />
        </Route>
        <Route path="/reports">
          <ProtectedRoute component={Reports} />
        </Route>
        <Route path="/settings">
          <ProtectedRoute component={Settings} />
        </Route>
        <Route path="/audit-trail">
          <ProtectedRoute component={AuditTrail} />
        </Route>
        <Route path="/users">
          <ProtectedRoute component={UserManagement} requiredRole="super_admin" />
        </Route>
        <Route path="/admin-activity">
          <ProtectedRoute component={AdminActivityLog} requiredRole="super_admin" />
        </Route>
        <Route path="/client-access">
          <ProtectedRoute component={ClientAccess} requiredRole="super_admin" />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ClientProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ClientProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

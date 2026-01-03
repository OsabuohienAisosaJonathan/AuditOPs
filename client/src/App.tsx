import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ClientProvider } from "@/lib/client-context";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CurrencyProvider } from "@/lib/currency-context";
import { LayoutProvider } from "@/lib/layout-context";
import { EntitlementsProvider } from "@/lib/entitlements-context";
import { NetworkStatusProvider } from "@/lib/network-status";
import { OfflineBanner } from "@/components/OfflineBanner";
import { SessionExpiredProvider, useSessionExpired } from "@/lib/session-expired-context";
import { AuthExpiredOverlay } from "@/components/AuthExpiredOverlay";
import { setSessionExpiredCallback, clearSessionExpiredCallback } from "@/lib/api";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import CheckEmail from "@/pages/CheckEmail";
import VerifyEmail from "@/pages/VerifyEmail";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Setup from "@/pages/Setup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import AuditWorkspace from "@/pages/AuditWorkspace";
import Clients from "@/pages/Clients";
import SalesCapture from "@/pages/SalesCapture";
import Inventory from "@/pages/Inventory";
import InventoryLedger from "@/pages/InventoryLedger";
import Reconciliation from "@/pages/Reconciliation";
import Exceptions from "@/pages/Exceptions";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import AuditTrail from "@/pages/AuditTrail";
import UserManagement from "@/pages/UserManagement";
import AdminActivityLog from "@/pages/AdminActivityLog";
import ClientAccess from "@/pages/ClientAccess";
import ItemPurchases from "@/pages/ItemPurchases";
import AppLayout from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useEffect } from "react";

function SessionExpiredBridge() {
  const { setSessionExpired } = useSessionExpired();
  
  useEffect(() => {
    setSessionExpiredCallback(setSessionExpired);
    return () => clearSessionExpiredCallback();
  }, [setSessionExpired]);
  
  return null;
}

function ProtectedRoute({ component: Component, requiredRole }: { component: React.ComponentType; requiredRole?: string }) {
  const { user, isLoading, authError, clearAuthError } = useAuth();
  const { isSessionExpired, setSessionExpired } = useSessionExpired();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user && !authError && !isSessionExpired) {
      setSessionExpired();
    }
  }, [user, isLoading, authError, isSessionExpired, setSessionExpired]);

  // Show skeleton while checking session
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Checking session...</p>
        </div>
      </div>
    );
  }

  // Show error state if auth failed due to timeout/network
  if (authError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 p-6 max-w-md">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            {authError === "timeout" ? "Connection Timeout" : "Connection Problem"}
          </h2>
          <p className="text-muted-foreground">
            {authError === "timeout" 
              ? "The server took too long to respond. Please try again."
              : "Unable to verify your session. Please check your connection."}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { clearAuthError(); window.location.reload(); }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => { clearAuthError(); setLocation("/login"); }}
              className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
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
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/check-email" component={CheckEmail} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
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
        <Route path="/inventory-ledger">
          <ProtectedRoute component={InventoryLedger} />
        </Route>
        <Route path="/item-purchases">
          <ProtectedRoute component={ItemPurchases} />
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
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="miemploya-theme">
        <QueryClientProvider client={queryClient}>
          <NetworkStatusProvider>
            <SessionExpiredProvider>
              <AuthProvider>
                <SessionExpiredBridge />
                <EntitlementsProvider>
                  <ClientProvider>
                    <CurrencyProvider>
                      <LayoutProvider>
                        <TooltipProvider>
                          <OfflineBanner />
                          <AuthExpiredOverlay />
                          <Toaster />
                          <Router />
                        </TooltipProvider>
                      </LayoutProvider>
                    </CurrencyProvider>
                  </ClientProvider>
                </EntitlementsProvider>
              </AuthProvider>
            </SessionExpiredProvider>
          </NetworkStatusProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

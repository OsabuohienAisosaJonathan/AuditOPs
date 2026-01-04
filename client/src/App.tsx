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
import { PlatformAdminAuthProvider, usePlatformAdminAuth } from "@/lib/platform-admin-auth";
import { OfflineBanner } from "@/components/OfflineBanner";
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
import PlatformAdminLogin from "@/pages/platform-admin/PlatformAdminLogin";
import PlatformAdminDashboard from "@/pages/platform-admin/PlatformAdminDashboard";
import PlatformAdminOrganizations from "@/pages/platform-admin/PlatformAdminOrganizations";
import PlatformAdminUsers from "@/pages/platform-admin/PlatformAdminUsers";
import PlatformAdminBilling from "@/pages/platform-admin/PlatformAdminBilling";
import PlatformAdminLogs from "@/pages/platform-admin/PlatformAdminLogs";
import PlatformAdminEntitlements from "@/pages/platform-admin/PlatformAdminEntitlements";

function AuthLoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground">Checking session...</p>
      </div>
    </div>
  );
}

function AuthErrorScreen({ error, onRetry, onGoToLogin }: { error: string; onRetry: () => void; onGoToLogin: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4 p-6 max-w-md">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
          <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          {error === "timeout" ? "Connection Timeout" : "Connection Problem"}
        </h2>
        <p className="text-muted-foreground">
          {error === "timeout" 
            ? "The server took too long to respond. Please try again."
            : "Unable to verify your session. Please check your connection."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
          <button
            onClick={onGoToLogin}
            className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}

function AccessDeniedScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-destructive mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    </div>
  );
}


function PublicRoutes() {
  return (
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
    </Switch>
  );
}

function ProtectedRoutes() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/audit-workspace" component={AuditWorkspace} />
        <Route path="/clients" component={Clients} />
        <Route path="/sales-capture" component={SalesCapture} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/inventory-ledger" component={InventoryLedger} />
        <Route path="/item-purchases" component={ItemPurchases} />
        <Route path="/reconciliation" component={Reconciliation} />
        <Route path="/exceptions" component={Exceptions} />
        <Route path="/reports" component={Reports} />
        <Route path="/settings" component={Settings} />
        <Route path="/audit-trail" component={AuditTrail} />
        <Route path="/users">
          <AdminRoute component={UserManagement} />
        </Route>
        <Route path="/admin-activity">
          <AdminRoute component={AdminActivityLog} />
        </Route>
        <Route path="/client-access">
          <AdminRoute component={ClientAccess} />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user } = useAuth();
  
  if (user?.role !== "super_admin") {
    return <AccessDeniedScreen />;
  }
  
  return <Component />;
}

function PlatformAdminRoutes() {
  const { admin, isLoading } = usePlatformAdminAuth();
  const [location] = useLocation();

  if (location === "/platform-admin/login") {
    return <PlatformAdminLogin />;
  }

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!admin) {
    return <PlatformAdminLogin />;
  }

  return (
    <Switch>
      <Route path="/platform-admin" component={PlatformAdminDashboard} />
      <Route path="/platform-admin/organizations" component={PlatformAdminOrganizations} />
      <Route path="/platform-admin/users" component={PlatformAdminUsers} />
      <Route path="/platform-admin/billing" component={PlatformAdminBilling} />
      <Route path="/platform-admin/logs" component={PlatformAdminLogs} />
      <Route path="/platform-admin/entitlements" component={PlatformAdminEntitlements} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  const [location] = useLocation();
  const { user, isLoading, authError, clearAuthError } = useAuth();
  
  // Platform admin routes are completely separate
  if (location.startsWith("/platform-admin")) {
    return (
      <PlatformAdminAuthProvider>
        <PlatformAdminRoutes />
      </PlatformAdminAuthProvider>
    );
  }
  
  // Define public routes that don't need auth
  const publicRoutes = ["/", "/login", "/signup", "/about", "/contact", "/setup", "/forgot-password", "/reset-password", "/check-email", "/verify-email"];
  const isPublicRoute = publicRoutes.includes(location);
  
  // For public routes, render without auth check
  if (isPublicRoute) {
    return <PublicRoutes />;
  }
  
  // For protected routes, check auth first
  // Show loading while checking
  if (isLoading) {
    return <AuthLoadingScreen />;
  }
  
  // Show error screen for network issues
  if (authError) {
    return (
      <AuthErrorScreen 
        error={authError}
        onRetry={() => { clearAuthError(); window.location.reload(); }}
        onGoToLogin={() => { clearAuthError(); window.location.href = "/login"; }}
      />
    );
  }
  
  // Not authenticated - show Login page ONLY (no layout, no dashboard)
  if (!user) {
    return <Login />;
  }
  
  // Authenticated - render protected routes with layout
  return <ProtectedRoutes />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="miemploya-theme">
        <QueryClientProvider client={queryClient}>
          <NetworkStatusProvider>
            <AuthProvider>
              <EntitlementsProvider>
                <ClientProvider>
                  <CurrencyProvider>
                    <LayoutProvider>
                      <TooltipProvider>
                        <OfflineBanner />
                        <Toaster />
                        <Router />
                      </TooltipProvider>
                    </LayoutProvider>
                  </CurrencyProvider>
                </ClientProvider>
              </EntitlementsProvider>
            </AuthProvider>
          </NetworkStatusProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

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
import PlatformAdminPlans from "@/pages/platform-admin/PlatformAdminPlans";
import PlatformAdminLogs from "@/pages/platform-admin/PlatformAdminLogs";
import PlatformAdminEntitlements from "@/pages/platform-admin/PlatformAdminEntitlements";
import Bootstrap from "@/pages/Bootstrap";
import ChangePassword from "@/pages/ChangePassword";

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
  const isServiceUnavailable = error === "service_unavailable";
  const isTimeout = error === "timeout";
  
  const getTitle = () => {
    if (isServiceUnavailable) return "Service Temporarily Unavailable";
    if (isTimeout) return "Connection Timeout";
    return "Connection Problem";
  };
  
  const getMessage = () => {
    if (isServiceUnavailable) return "The service is temporarily unavailable. This usually resolves within 30 seconds. Please try again.";
    if (isTimeout) return "The server took too long to respond. Please try again.";
    return "Unable to verify your session. Please check your connection.";
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4 p-6 max-w-md">
        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${isServiceUnavailable ? 'bg-orange-100' : 'bg-amber-100'}`}>
          <svg className={`h-6 w-6 ${isServiceUnavailable ? 'text-orange-600' : 'text-amber-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          {getTitle()}
        </h2>
        <p className="text-muted-foreground">
          {getMessage()}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            data-testid="button-retry"
          >
            Retry
          </button>
          {!isServiceUnavailable && (
            <button
              onClick={onGoToLogin}
              className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
              data-testid="button-go-to-login"
            >
              Go to Login
            </button>
          )}
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
      <Route path="/bootstrap" component={Bootstrap} />
      <Route path="/change-password" component={ChangePassword} />
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

function OwnerAdminRoutes() {
  const { admin, isLoading } = usePlatformAdminAuth();
  const [location] = useLocation();

  // Owner login page is always accessible (no secret parameter needed)
  if (location === "/owner/login") {
    // Show loading while checking auth status
    if (isLoading) {
      return <AuthLoadingScreen />;
    }
    // If already logged in, redirect to dashboard
    if (admin) {
      window.location.href = "/owner/dashboard";
      return <AuthLoadingScreen />;
    }
    // Not logged in - show login page
    return <PlatformAdminLogin />;
  }

  // Show loading while checking auth - prevents flash of protected content
  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  // Not authenticated - redirect to owner login
  if (!admin) {
    window.location.href = "/owner/login";
    return <AuthLoadingScreen />;
  }

  // Authenticated - show protected routes
  return (
    <Switch>
      <Route path="/owner" component={PlatformAdminDashboard} />
      <Route path="/owner/dashboard" component={PlatformAdminDashboard} />
      <Route path="/owner/tenants/:id" component={PlatformAdminOrganizations} />
      <Route path="/owner/tenants" component={PlatformAdminOrganizations} />
      <Route path="/owner/users" component={PlatformAdminUsers} />
      <Route path="/owner/billing" component={PlatformAdminBilling} />
      <Route path="/owner/plans" component={PlatformAdminPlans} />
      <Route path="/owner/logs" component={PlatformAdminLogs} />
      <Route path="/owner/entitlements" component={PlatformAdminEntitlements} />
      <Route component={NotFound} />
    </Switch>
  );
}

function TenantRouter() {
  const [location] = useLocation();
  const { user, isLoading, authError, clearAuthError } = useAuth();
  
  // Define public routes that don't need auth
  const publicRoutes = ["/", "/login", "/signup", "/about", "/contact", "/setup", "/forgot-password", "/reset-password", "/check-email", "/verify-email", "/bootstrap", "/change-password"];
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
  
  // Authenticated but must change password - force redirect to change password page
  if (user.mustChangePassword) {
    return <ChangePassword />;
  }
  
  // Authenticated - render protected routes with layout
  return <ProtectedRoutes />;
}

function Router() {
  const [location] = useLocation();
  
  // Owner (platform) admin routes are completely separate - check FIRST before any tenant logic
  if (location.startsWith("/owner")) {
    return (
      <PlatformAdminAuthProvider>
        <OwnerAdminRoutes />
      </PlatformAdminAuthProvider>
    );
  }
  
  // All other routes go through tenant auth flow
  return <TenantRouter />;
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

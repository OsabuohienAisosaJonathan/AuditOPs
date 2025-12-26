import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import AuditWorkspace from "@/pages/AuditWorkspace";
import Clients from "@/pages/Clients";
import AppLayout from "@/components/layout/AppLayout";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/audit-workspace" component={AuditWorkspace} />
        <Route path="/clients" component={Clients} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

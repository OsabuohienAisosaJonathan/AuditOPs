import { useQuery } from "@tanstack/react-query";
import { auditContextApi, type AuditContext } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Calendar, Building2, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

interface AuditContextGateProps {
  children: React.ReactNode;
  pageName: string;
}

export function useAuditContext() {
  const { data: context, isLoading, error, refetch } = useQuery({
    queryKey: ["audit-context"],
    queryFn: auditContextApi.getCurrent,
  });
  
  return { 
    context: context as AuditContext | null | undefined, 
    isLoading, 
    error,
    refetch,
    hasContext: !!context 
  };
}

export function AuditContextGate({ children, pageName }: AuditContextGateProps) {
  const { context, isLoading, hasContext } = useAuditContext();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading audit context...</p>
        </div>
      </div>
    );
  }
  
  if (!hasContext) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto p-4 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
              <ClipboardCheck className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-xl">Audit Context Required</CardTitle>
            <CardDescription className="mt-2">
              To access {pageName}, you need to select an active audit period first.
              This ensures all your work is properly tracked and associated with the correct audit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">What is an audit context?</p>
              <p>
                An audit context defines the client, department, and date range you're working on.
                It helps keep your work organized and ensures proper audit trail tracking.
              </p>
            </div>
            <Link href="/audit-workspace">
              <Button className="w-full gap-2" data-testid="button-goto-audit-workspace">
                Go to Audit Workspace
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return <>{children}</>;
}

export function AuditContextBanner() {
  const { context, hasContext } = useAuditContext();
  
  if (!hasContext || !context) return null;
  
  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <span className="font-medium">Active Audit:</span>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(context.startDate), "MMM d")} - {format(new Date(context.endDate), "MMM d, yyyy")}
          </span>
          <span className="capitalize">{context.period}</span>
        </div>
        <Link href="/audit-workspace" className="ml-auto">
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            Change Period
          </Button>
        </Link>
      </div>
    </div>
  );
}

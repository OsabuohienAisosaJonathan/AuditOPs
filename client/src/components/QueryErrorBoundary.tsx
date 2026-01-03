import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, LogIn, Home } from "lucide-react";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";

interface QueryErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function QueryErrorFallback({ error, resetErrorBoundary }: QueryErrorFallbackProps) {
  const errorMessage = error.message || "Unknown error";
  const isAuthError = errorMessage.includes("401") || errorMessage.includes("Unauthorized");
  const isTimeout = errorMessage.toLowerCase().includes("timed out") || errorMessage.toLowerCase().includes("timeout");
  const isCancelled = (error as any).isAborted || errorMessage === "Request cancelled";

  if (isCancelled) {
    return null;
  }

  return (
    <Empty className="min-h-[400px]" data-testid="query-error-boundary">
      <EmptyMedia variant="icon">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>
          {isAuthError ? "Session expired" : isTimeout ? "Request timed out" : "Something went wrong"}
        </EmptyTitle>
        <EmptyDescription>
          {isAuthError 
            ? "Your session has expired. Please log in again."
            : isTimeout
            ? "The server took too long to respond. Please check your connection and try again."
            : "We encountered an error loading this page. Please try again."}
        </EmptyDescription>
      </EmptyHeader>
      <div className="flex gap-3 mt-4">
        {isAuthError ? (
          <>
            <Button onClick={() => window.location.href = "/login"} data-testid="button-go-to-login">
              <LogIn className="mr-2 h-4 w-4" />
              Go to Login
            </Button>
            <Button variant="outline" onClick={() => window.location.href = "/"} data-testid="button-go-home">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </>
        ) : (
          <>
            <Button onClick={resetErrorBoundary} data-testid="button-try-again">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()} data-testid="button-reload">
              Reload Page
            </Button>
          </>
        )}
      </div>
    </Empty>
  );
}

export function useQueryErrorReset() {
  return useQueryErrorResetBoundary();
}

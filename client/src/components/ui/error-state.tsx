import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this content. Please try again.",
  onRetry,
  isRetrying = false,
}: ErrorStateProps) {
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold text-destructive mb-2" data-testid="error-title">
          {title}
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md" data-testid="error-message">
          {message}
        </p>
        {onRetry && (
          <Button
            variant="outline"
            onClick={onRetry}
            disabled={isRetrying}
            data-testid="button-retry"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? "animate-spin" : ""}`} />
            {isRetrying ? "Retrying..." : "Try Again"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function InlineErrorState({
  message = "Failed to load",
  onRetry,
  isRetrying = false,
}: Omit<ErrorStateProps, "title">) {
  return (
    <div className="flex items-center justify-center gap-3 py-8 text-muted-foreground">
      <AlertCircle className="h-5 w-5 text-destructive" />
      <span>{message}</span>
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
          data-testid="button-retry-inline"
        >
          <RefreshCw className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
        </Button>
      )}
    </div>
  );
}

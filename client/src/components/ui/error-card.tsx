import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorCardProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  isOffline?: boolean;
  showCached?: boolean;
  className?: string;
}

export function ErrorCard({ 
  title = "Unable to load data",
  message = "Something went wrong. Please try again.",
  onRetry,
  isOffline = false,
  showCached = false,
  className
}: ErrorCardProps) {
  const Icon = isOffline ? WifiOff : AlertTriangle;
  
  return (
    <Card className={`border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 ${className || ''}`} data-testid="error-card">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-3 mb-4">
          <Icon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
          {isOffline ? "You're offline" : title}
        </h3>
        <p className="text-sm text-amber-700 dark:text-amber-400 mb-4 max-w-sm">
          {isOffline 
            ? showCached 
              ? "Showing cached data. Reconnect to see the latest updates."
              : "Connect to the internet to load data."
            : message
          }
        </p>
        {onRetry && !isOffline && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/30"
            data-testid="retry-button"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function InlineError({ 
  message = "Failed to load", 
  onRetry 
}: { 
  message?: string; 
  onRetry?: () => void 
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400" data-testid="inline-error">
      <AlertTriangle className="h-4 w-4" />
      <span>{message}</span>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry} className="h-auto py-0 px-1">
          Retry
        </Button>
      )}
    </div>
  );
}

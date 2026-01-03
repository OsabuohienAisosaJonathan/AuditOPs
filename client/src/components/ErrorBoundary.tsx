import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, LogIn, Home } from "lucide-react";
import { ApiError } from "@/lib/api";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

type ErrorType = "auth" | "timeout" | "network" | "unknown";

function classifyError(error: Error | null): ErrorType {
  if (!error) return "unknown";
  
  // Check if it's an ApiError with structured flags
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return "auth";
    if (error.isTimeout) return "timeout";
    if (error.status === 0 && !error.isAborted) return "network";
    return "unknown";
  }
  
  // Check for errors with custom flags
  if ((error as any).isTimeout) return "timeout";
  if ((error as any).isAuth || (error as any).status === 401) return "auth";
  
  return "unknown";
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoToLogin = () => {
    window.location.href = "/login";
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = import.meta.env.DEV;
      const errorType = classifyError(this.state.error);

      const errorConfig = {
        auth: {
          title: "Session Expired",
          message: "Your session has expired. Please log in again to continue.",
        },
        timeout: {
          title: "Connection Timeout",
          message: "The server took too long to respond. Please try again.",
        },
        network: {
          title: "Connection Problem",
          message: "Unable to connect to the server. Please check your internet connection.",
        },
        unknown: {
          title: "Something went wrong",
          message: "An unexpected error occurred. Please try refreshing the page.",
        },
      };

      const config = errorConfig[errorType];

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {config.title}
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            {config.message}
          </p>
          
          {isDev && this.state.error && (
            <div className="mb-6 p-4 bg-muted rounded-lg text-left max-w-2xl w-full overflow-auto">
              <p className="text-sm font-mono text-destructive mb-2">
                {this.state.error.name}: {this.state.error.message}
              </p>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap max-h-48 overflow-auto">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
          )}
          
          <div className="flex flex-wrap gap-3 justify-center">
            {errorType === "auth" ? (
              <>
                <Button onClick={this.handleGoToLogin}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Go to Login
                </Button>
                <Button variant="outline" onClick={this.handleGoHome}>
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={this.handleReset}>
                  Try Again
                </Button>
                <Button onClick={this.handleReload}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>
              </>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

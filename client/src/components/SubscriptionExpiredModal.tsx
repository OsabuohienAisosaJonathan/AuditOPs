import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard } from "lucide-react";
import { useLocation } from "wouter";

interface SubscriptionExpiredModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expiryDate?: string;
  status?: string;
}

export function SubscriptionExpiredModal({
  open,
  onOpenChange,
  expiryDate,
  status,
}: SubscriptionExpiredModalProps) {
  const [, setLocation] = useLocation();
  
  const handleRenew = () => {
    onOpenChange(false);
    setLocation("/settings");
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString();
  };

  const getStatusMessage = () => {
    switch (status) {
      case "past_due":
        return "Your payment is past due. Please update your payment method to continue.";
      case "cancelled":
        return "Your subscription has been cancelled. Please renew to continue using MiAuditOps.";
      default:
        return `Your subscription expired on ${formatDate(expiryDate)}. Please renew to continue using MiAuditOps.`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <DialogTitle className="text-center">Subscription Expired</DialogTitle>
          <DialogDescription className="text-center">
            {getStatusMessage()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="font-medium">Renew Your Subscription</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Go to Settings to view your billing details and renew your subscription to continue using all features.
            </p>
          </div>
          
          <div className="text-sm text-muted-foreground text-center">
            You can still access Settings and Billing to manage your subscription.
          </div>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button onClick={handleRenew} className="w-full" data-testid="button-go-to-settings">
            Go to Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

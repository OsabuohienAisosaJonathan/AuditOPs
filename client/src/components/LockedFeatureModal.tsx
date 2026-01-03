import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Crown } from "lucide-react";
import { toast } from "sonner";

interface LockedFeatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  requiredPlan?: string;
  description?: string;
}

export function LockedFeatureModal({
  open,
  onOpenChange,
  feature,
  requiredPlan = "Growth",
  description,
}: LockedFeatureModalProps) {
  const handleUpgrade = () => {
    toast.info("Please contact sales to upgrade your plan");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-center">Feature Locked</DialogTitle>
          <DialogDescription className="text-center">
            {description || `${feature} is not available on your current plan.`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-3 mb-2">
              <Crown className="h-5 w-5 text-amber-500" />
              <span className="font-medium">Upgrade to {requiredPlan}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Unlock {feature.toLowerCase()} and other premium features by upgrading your subscription.
            </p>
          </div>
          
          <div className="text-sm text-muted-foreground text-center">
            Contact our sales team to learn more about plan options and pricing.
          </div>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Maybe Later
          </Button>
          <Button onClick={handleUpgrade} className="w-full sm:w-auto">
            Contact Sales
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

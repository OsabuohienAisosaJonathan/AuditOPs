import { Lock, Crown, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface LockedPageScreenProps {
  feature: string;
  requiredPlan?: string;
  description?: string;
}

export function LockedPageScreen({
  feature,
  requiredPlan = "Growth",
  description,
}: LockedPageScreenProps) {
  const [, setLocation] = useLocation();

  const handleUpgrade = () => {
    toast.info("Please contact sales to upgrade your plan");
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Lock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-2xl">Feature Locked</CardTitle>
          <CardDescription>
            {description || `${feature} is not available on your current plan.`}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Crown className="h-5 w-5 text-amber-500" />
              <span className="font-medium">Upgrade to {requiredPlan}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Unlock {feature.toLowerCase()} and other premium features by upgrading your subscription.
            </p>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Contact our sales team to learn more about plan options and pricing.
          </div>
        </CardContent>
        
        <CardFooter className="flex-col gap-2 pt-2">
          <Button onClick={handleUpgrade} className="w-full">
            Contact Sales
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/dashboard")}
            className="w-full gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

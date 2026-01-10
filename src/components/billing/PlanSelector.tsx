import { useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { useBilling } from "@/hooks/useBilling";
import { useToast } from "@/hooks/useToast";
import { formatBytes, formatSats, PRICING, type PlanType } from "@/lib/billing";
import { cn } from "@/lib/utils";

interface PlanSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLANS: Array<{
  id: PlanType;
  name: string;
  description: string;
  price: string;
  features: string[];
  popular?: boolean;
}> = [
  {
    id: 'free',
    name: 'Free',
    description: 'For personal use and testing',
    price: 'Free',
    features: [
      `${formatBytes(PRICING.free.storageLimit)} storage`,
      `${formatBytes(PRICING.free.bandwidthLimit)}/month bandwidth`,
      'Basic support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For creators and power users',
    price: `${formatSats(PRICING.pro.monthlyPriceSats)}/mo`,
    features: [
      `${formatBytes(PRICING.pro.storageLimit)} storage`,
      `${formatBytes(PRICING.pro.bandwidthLimit)}/month bandwidth`,
      'Priority support',
      'Advanced analytics',
    ],
    popular: true,
  },
  {
    id: 'paygo',
    name: 'Pay-as-you-go',
    description: 'Pay only for what you use',
    price: `${PRICING.paygo.storagePricePerGb} sats/GB`,
    features: [
      'Unlimited storage',
      'Unlimited bandwidth',
      `${PRICING.paygo.storagePricePerGb} sats/GB storage`,
      `${PRICING.paygo.bandwidthPricePerGb} sats/GB bandwidth`,
    ],
  },
];

export function PlanSelector({ open, onOpenChange }: PlanSelectorProps) {
  const { toast } = useToast();
  const { settings, updatePlan, isUpdatingPlan } = useBilling();

  const currentPlan = settings?.plan ?? 'free';

  const handleSelectPlan = useCallback(async (planId: PlanType) => {
    if (planId === currentPlan) {
      onOpenChange(false);
      return;
    }

    updatePlan(planId, {
      onSuccess: () => {
        toast({
          title: "Plan updated",
          description: `You are now on the ${planId} plan.`,
        });
        onOpenChange(false);
      },
      onError: (error) => {
        toast({
          title: "Failed to update plan",
          description: (error as Error).message,
          variant: "destructive",
        });
      },
    });
  }, [currentPlan, updatePlan, toast, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose a plan</DialogTitle>
          <DialogDescription>
            Select the plan that works best for you. You can change plans anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-3 py-4">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "relative cursor-pointer transition-all hover:border-primary",
                currentPlan === plan.id && "border-primary ring-2 ring-primary ring-offset-2"
              )}
              onClick={() => !isUpdatingPlan && handleSelectPlan(plan.id)}
            >
              {plan.popular && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                  Popular
                </Badge>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {currentPlan === plan.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-2xl font-bold">{plan.price}</div>
                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={currentPlan === plan.id ? "secondary" : "default"}
                  className="w-full"
                  disabled={isUpdatingPlan}
                >
                  {isUpdatingPlan ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : currentPlan === plan.id ? (
                    "Current Plan"
                  ) : (
                    "Select"
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Pro plan charges monthly. Pay-as-you-go deducts from your balance.
          Free tier limits uploads, not access to existing content.
        </p>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  HardDrive,
  Activity,
  Wallet,
  Calendar,
  Plus,
  Check,
  AlertTriangle,
  Zap,
  Lock,
  BarChart3,
} from "lucide-react";
import { useBilling } from "@/hooks/useBilling";
import {
  formatBytes,
  formatSats,
  formatSatsWithUSD,
  getUsagePercentage,
  PRICING,
} from "@/lib/billing";
import { TopUpDialog } from "./TopUpDialog";
import { PlanSelector } from "./PlanSelector";
import { UsageChart } from "./UsageChart";
import { cn } from "@/lib/utils";

export function BillingDashboard() {
  const {
    settings,
    usage,
    storageUsed,
    blossomUsage,
    runway,
    costs,
    limits,
    pricing,
    hasCdn,
    hasPaywalls,
    isLoading,
  } = useBilling();

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [planSelectorOpen, setPlanSelectorOpen] = useState(false);

  if (isLoading || !settings) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading billing info...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const plan = settings.plan;

  // Free tier view
  if (plan === 'free') {
    return <FreeTierDashboard
      blossomUsage={blossomUsage ?? 0}
      onUpgrade={() => setPlanSelectorOpen(true)}
      planSelectorOpen={planSelectorOpen}
      setPlanSelectorOpen={setPlanSelectorOpen}
    />;
  }

  // Paid tier view
  return (
    <PaidTierDashboard
      settings={settings}
      usage={usage}
      storageUsed={storageUsed ?? 0}
      runway={runway}
      costs={costs}
      limits={limits}
      pricing={pricing}
      plan={plan}
      topUpOpen={topUpOpen}
      setTopUpOpen={setTopUpOpen}
      planSelectorOpen={planSelectorOpen}
      setPlanSelectorOpen={setPlanSelectorOpen}
    />
  );
}

/**
 * Free tier dashboard - shows Blossom usage and upgrade pitch
 */
function FreeTierDashboard({
  blossomUsage,
  onUpgrade,
  planSelectorOpen,
  setPlanSelectorOpen,
}: {
  blossomUsage: number;
  onUpgrade: () => void;
  planSelectorOpen: boolean;
  setPlanSelectorOpen: (open: boolean) => void;
}) {
  const blossomLimit = PRICING.free.blossomLimit;
  const blossomPercent = getUsagePercentage(blossomUsage, blossomLimit);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Free Plan</CardTitle>
              <CardDescription>
                Your second brain, free forever.
              </CardDescription>
            </div>
            <Badge variant="secondary">Free</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Blossom usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <HardDrive className="h-4 w-4" />
                Blossom Storage
              </span>
              <span className="font-medium">
                {formatBytes(blossomUsage)} / {formatBytes(blossomLimit)}
              </span>
            </div>
            <Progress
              value={blossomPercent}
              className={cn(
                blossomPercent >= 90 && "bg-yellow-200 [&>div]:bg-yellow-500",
                blossomPercent >= 100 && "bg-red-200 [&>div]:bg-red-500"
              )}
            />
            <p className="text-xs text-muted-foreground">
              Blossom is a decentralized file storage network. URLs are public.
            </p>
          </div>

          <Separator />

          {/* What's included */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">What's included</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Unlimited local storage
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                {formatBytes(blossomLimit)} Blossom network storage
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Bookmarks, boards, notes
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Nostr identity & relay sync
              </li>
            </ul>
          </div>

          <Separator />

          {/* Upgrade pitch */}
          <div className="space-y-4">
            <h4 className="font-medium">Upgrade to unlock:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Fast global CDN delivery
              </li>
              <li className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-blue-500" />
                Paywalls with signed URLs
              </li>
              <li className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-purple-500" />
                10 GB+ storage
              </li>
              <li className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-green-500" />
                Analytics dashboard
              </li>
            </ul>
            <Button onClick={onUpgrade} className="w-full">
              Upgrade · $5/mo
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Or pay-as-you-go with sats
            </p>
          </div>
        </CardContent>
      </Card>

      <PlanSelector open={planSelectorOpen} onOpenChange={setPlanSelectorOpen} />
    </div>
  );
}

/**
 * Paid tier dashboard - shows CDN usage, balance, and billing
 */
function PaidTierDashboard({
  settings,
  usage,
  storageUsed,
  runway,
  costs,
  limits,
  pricing,
  plan,
  topUpOpen,
  setTopUpOpen,
  planSelectorOpen,
  setPlanSelectorOpen,
}: {
  settings: any;
  usage: any;
  storageUsed: number;
  runway: any;
  costs: any;
  limits: any;
  pricing: any;
  plan: string;
  topUpOpen: boolean;
  setTopUpOpen: (open: boolean) => void;
  planSelectorOpen: boolean;
  setPlanSelectorOpen: (open: boolean) => void;
}) {
  const storagePercent = usage
    ? getUsagePercentage(usage.storageBytes, pricing.storageLimit)
    : 0;
  const bandwidthPercent = usage
    ? getUsagePercentage(usage.bandwidthBytes, pricing.bandwidthLimit)
    : 0;

  return (
    <div className="space-y-6">
      {/* Plan & Balance Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Storage & Usage
              </CardTitle>
              <CardDescription>
                Current billing period usage and balance
              </CardDescription>
            </div>
            <Badge className="capitalize">
              {plan} Plan
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Storage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <HardDrive className="h-4 w-4" />
                  CDN Storage
                </span>
                <span className="font-medium">
                  {formatBytes(usage?.storageBytes ?? 0)}
                  {pricing.storageLimit !== Infinity && (
                    <span className="text-muted-foreground">
                      {' '}/ {formatBytes(pricing.storageLimit)}
                    </span>
                  )}
                </span>
              </div>
              <Progress
                value={storagePercent}
                className={cn(
                  !limits.storageOk && "bg-red-200 [&>div]:bg-red-500"
                )}
              />
              {costs.storageCost > 0 && (
                <p className="text-xs text-muted-foreground text-right">
                  {formatSats(costs.storageCost)}
                </p>
              )}
            </div>

            {/* Bandwidth */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  Bandwidth
                </span>
                <span className="font-medium">
                  {formatBytes(usage?.bandwidthBytes ?? 0)}
                  {pricing.bandwidthLimit !== Infinity && (
                    <span className="text-muted-foreground">
                      {' '}/ {formatBytes(pricing.bandwidthLimit)}
                    </span>
                  )}
                </span>
              </div>
              <Progress
                value={bandwidthPercent}
                className={cn(
                  !limits.bandwidthOk && "bg-red-200 [&>div]:bg-red-500"
                )}
              />
              {costs.bandwidthCost > 0 && (
                <p className="text-xs text-muted-foreground text-right">
                  {formatSats(costs.bandwidthCost)}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Cost Summary */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">This Month</h4>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Storage</span>
                <span>
                  {formatBytes(usage?.storageBytes ?? 0)}
                  <span className="text-muted-foreground ml-2">
                    {formatSats(costs.storageCost)}
                  </span>
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bandwidth</span>
                <span>
                  {formatBytes(usage?.bandwidthBytes ?? 0)}
                  <span className="text-muted-foreground ml-2">
                    {formatSats(costs.bandwidthCost)}
                  </span>
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>{formatSatsWithUSD(costs.total)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Balance */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Balance</span>
              <span className="text-lg font-bold">
                {formatSatsWithUSD(settings.satBalance)}
              </span>
            </div>

            {runway && runway.date && (
              <div className="flex items-center gap-2 text-sm">
                {runway.days > 30 ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-green-600 dark:text-green-400">
                      Covered through {runway.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="text-yellow-600 dark:text-yellow-400">
                      {runway.days} days remaining
                    </span>
                  </>
                )}
              </div>
            )}

            <Button onClick={() => setTopUpOpen(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add sats
            </Button>
          </div>

          {/* Plan limits warning */}
          {!limits.withinLimits && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {!limits.storageOk && 'Storage limit reached. '}
                  {!limits.bandwidthOk && 'Bandwidth limit reached. '}
                  <button
                    onClick={() => setPlanSelectorOpen(true)}
                    className="underline hover:no-underline"
                  >
                    Upgrade your plan
                  </button>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage History Chart */}
      <UsageChart />

      {/* Plan Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plan
          </CardTitle>
          <CardDescription>
            Manage your subscription plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium capitalize">{plan} Plan</p>
              <p className="text-sm text-muted-foreground">
                {plan === 'pro' && `${formatSats(PRICING.pro.monthlyPriceSats)}/month`}
                {plan === 'paygo' && 'Pay only for what you use'}
              </p>
            </div>
            <Button variant="outline" onClick={() => setPlanSelectorOpen(true)}>
              Change Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <TopUpDialog open={topUpOpen} onOpenChange={setTopUpOpen} />
      <PlanSelector open={planSelectorOpen} onOpenChange={setPlanSelectorOpen} />
    </div>
  );
}

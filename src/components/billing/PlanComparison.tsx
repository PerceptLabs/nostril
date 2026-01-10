import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check } from "lucide-react";
import { formatBytes, formatSats, PRICING } from "@/lib/billing";

/**
 * Plan comparison component showing free vs paid features
 */
export function PlanComparison() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Free */}
      <Card>
        <CardHeader>
          <CardTitle>Free</CardTitle>
          <CardDescription>Your second brain, forever</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-3xl font-bold">$0</div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              Unlimited local storage
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              {formatBytes(PRICING.free.blossomLimit)} Blossom network
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              Bookmarks, boards, notes
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              Nostr identity & relays
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Pro */}
      <Card className="border-primary relative">
        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
          Popular
        </Badge>
        <CardHeader>
          <CardTitle>Pro</CardTitle>
          <CardDescription>For creators who publish</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-3xl font-bold">
            $5<span className="text-base font-normal text-muted-foreground">/mo</span>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              Everything in Free
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              {formatBytes(PRICING.pro.bunnyStorageLimit)} fast CDN storage
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              Paywalls with Cashu/Lightning
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              Analytics dashboard
            </li>
          </ul>
          <Separator />
          <p className="text-xs text-muted-foreground">
            Or pay as you go with sats · ~$0.10/GB
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

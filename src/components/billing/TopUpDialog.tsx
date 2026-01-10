import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Zap, Coins, Copy, ExternalLink } from "lucide-react";
import { useBilling } from "@/hooks/useBilling";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/hooks/useToast";
import { formatSatsWithUSD, addToBalance } from "@/lib/billing";
import { getDecodedToken } from "@cashu/cashu-ts";

interface TopUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_AMOUNTS = [1000, 5000, 10000, 50000];

export function TopUpDialog({ open, onOpenChange }: TopUpDialogProps) {
  const { toast } = useToast();
  const { topUp, isToppingUp, settings } = useBilling();
  const wallet = useWallet();

  const [amount, setAmount] = useState<number>(5000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [cashuToken, setCashuToken] = useState<string>('');
  const [isProcessingCashu, setIsProcessingCashu] = useState(false);

  const handlePresetClick = useCallback((preset: number) => {
    setAmount(preset);
    setCustomAmount('');
  }, []);

  const handleCustomAmountChange = useCallback((value: string) => {
    setCustomAmount(value);
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setAmount(parsed);
    }
  }, []);

  const handleCashuTopUp = useCallback(async () => {
    if (!cashuToken.trim()) {
      toast({
        title: "No token",
        description: "Please paste a Cashu token",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingCashu(true);
    try {
      // Decode and verify token
      const decoded = getDecodedToken(cashuToken.trim());
      const tokenAmount = decoded.token.reduce(
        (sum, t) => sum + t.proofs.reduce((s, p) => s + p.amount, 0),
        0
      );

      if (tokenAmount === 0) {
        throw new Error("Token has no value");
      }

      // Add to balance
      const newBalance = await addToBalance(tokenAmount);

      toast({
        title: "Balance topped up!",
        description: `Added ${tokenAmount.toLocaleString()} sats. New balance: ${newBalance.toLocaleString()} sats`,
      });

      setCashuToken("");
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Invalid token",
        description: error instanceof Error ? error.message : "Could not process token",
        variant: "destructive",
      });
    } finally {
      setIsProcessingCashu(false);
    }
  }, [cashuToken, toast, onOpenChange]);

  const handleLightningTopUp = useCallback(async () => {
    // TODO: Generate Lightning invoice for the amount
    // This would typically:
    // 1. Call backend to generate invoice
    // 2. Display QR code
    // 3. Wait for payment confirmation
    // 4. Update balance

    toast({
      title: "Lightning top-up",
      description: "Lightning invoice generation coming soon. Use Cashu for now.",
    });
  }, [toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add sats to balance</DialogTitle>
          <DialogDescription>
            Top up your balance to pay for storage and bandwidth.
            {settings && (
              <span className="block mt-1">
                Current balance: {formatSatsWithUSD(settings.satBalance)}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="cashu" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cashu" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Cashu
            </TabsTrigger>
            <TabsTrigger value="lightning" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Lightning
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cashu" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Paste Cashu token</Label>
              <Input
                placeholder="cashuA..."
                value={cashuToken}
                onChange={(e) => setCashuToken(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Get Cashu tokens from{' '}
                <a
                  href="https://wallet.cashu.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  wallet.cashu.me
                </a>
                {' '}or any Cashu wallet.
              </p>
            </div>

            <Button
              onClick={handleCashuTopUp}
              disabled={isProcessingCashu || !cashuToken.trim()}
              className="w-full"
            >
              {isProcessingCashu ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Coins className="h-4 w-4 mr-2" />
                  Redeem Token
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="lightning" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Amount (sats)</Label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_AMOUNTS.map((preset) => (
                  <Button
                    key={preset}
                    variant={amount === preset && !customAmount ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePresetClick(preset)}
                  >
                    {preset >= 1000 ? `${preset / 1000}k` : preset}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Custom amount"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  min={1}
                />
                <span className="flex items-center text-sm text-muted-foreground whitespace-nowrap">
                  sats
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                ≈ ${(amount * 0.001).toFixed(2)} USD
              </p>
            </div>

            <Button
              onClick={handleLightningTopUp}
              disabled={isToppingUp || amount <= 0}
              className="w-full"
            >
              {isToppingUp ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating invoice...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Invoice
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter className="sm:justify-start">
          <p className="text-xs text-muted-foreground">
            Funds are used for CDN storage and bandwidth. Unused balance never expires.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

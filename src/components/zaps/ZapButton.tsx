import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Zap, Loader2, Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

interface ZapButtonProps {
  pubkey: string;
  eventId?: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
  showCount?: boolean;
  zapCount?: number;
}

const ZAP_AMOUNTS = [21, 100, 500, 1000, 5000, 10000];

export function ZapButton({
  pubkey,
  eventId,
  size = "default",
  variant = "outline",
  className,
  showCount,
  zapCount = 0,
}: ZapButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(100);
  const [comment, setComment] = useState("");
  const [isZapping, setIsZapping] = useState(false);
  const [invoice, setInvoice] = useState<string | null>(null);

  const handleZap = useCallback(async () => {
    setIsZapping(true);

    try {
      // In a real implementation, this would:
      // 1. Get the recipient's LNURL from their profile
      // 2. Create a zap request event (kind 9734)
      // 3. Get an invoice from the LNURL callback
      // 4. Present the invoice for payment

      // For now, show a mock invoice
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock invoice (in real app, this would come from LNURL)
      const mockInvoice = `lnbc${amount}n1pj...mock`;
      setInvoice(mockInvoice);

      toast({
        title: "Invoice generated",
        description: `Pay ${amount} sats to complete the zap`,
      });
    } catch (error) {
      toast({
        title: "Failed to create zap",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsZapping(false);
    }
  }, [amount, toast]);

  const handleCopyInvoice = useCallback(() => {
    if (invoice) {
      navigator.clipboard.writeText(invoice);
      toast({
        title: "Invoice copied",
        description: "Open your Lightning wallet to pay",
      });
    }
  }, [invoice, toast]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setInvoice(null);
      setComment("");
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn("gap-1.5", className)}
        >
          <Zap className={cn("h-4 w-4", size === "icon" && "h-4 w-4")} />
          {showCount && zapCount > 0 && (
            <span className="text-sm">{formatNumber(zapCount)}</span>
          )}
          {size !== "icon" && !showCount && <span className="hidden sm:inline">Zap</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Send a Zap
          </DialogTitle>
          <DialogDescription>
            Send sats as a tip for this content
          </DialogDescription>
        </DialogHeader>

        {!invoice ? (
          <div className="space-y-4 pt-2">
            {/* Quick amounts */}
            <div className="space-y-2">
              <Label>Amount (sats)</Label>
              <div className="grid grid-cols-3 gap-2">
                {ZAP_AMOUNTS.map((amt) => (
                  <Button
                    key={amt}
                    variant={amount === amt ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAmount(amt)}
                  >
                    {formatNumber(amt)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom amount */}
            <div className="space-y-2">
              <Label htmlFor="custom-amount">Custom amount</Label>
              <Input
                id="custom-amount"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                placeholder="Enter amount"
              />
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <Label htmlFor="comment">Comment (optional)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a message..."
                className="resize-none"
                rows={2}
              />
            </div>

            {/* Zap button */}
            <Button
              onClick={handleZap}
              disabled={isZapping || amount <= 0}
              className="w-full"
            >
              {isZapping ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Zap {formatNumber(amount)} sats
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Invoice display */}
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Lightning Invoice</p>
              <p className="text-xs text-muted-foreground font-mono break-all">
                {invoice}
              </p>
            </div>

            {/* Payment instructions */}
            <div className="text-center space-y-2">
              <p className="text-2xl font-bold">{formatNumber(amount)} sats</p>
              <p className="text-sm text-muted-foreground">
                Copy this invoice and pay with your Lightning wallet
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setInvoice(null)}
              >
                Back
              </Button>
              <Button className="flex-1" onClick={handleCopyInvoice}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Invoice
              </Button>
            </div>

            {/* Open in wallet link */}
            <Button
              variant="secondary"
              className="w-full"
              asChild
            >
              <a href={`lightning:${invoice}`}>
                <Zap className="h-4 w-4 mr-2" />
                Open in Wallet
              </a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Format number with K/M suffixes
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
}

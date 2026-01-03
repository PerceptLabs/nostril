import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Lock, Zap, Coins, Loader2, Copy, Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  generatePaywallInvoice,
  processTokenPayment,
  processLightningPayment,
  formatSatsToUSD,
  type PaymentRequest,
} from '@/lib/paywall';
import { useWallet } from '@/hooks/useWallet';
import { useNWC } from '@/hooks/useNWCContext';
import { useToast } from '@/hooks/useToast';
import type { Article } from '@/lib/article';
import QRCode from 'qrcode';

interface PaywallGateProps {
  article: Article;
  onUnlock: () => void;
  className?: string;
  userPubkey?: string;
}

export function PaywallGate({
  article,
  onUnlock,
  className,
  userPubkey,
}: PaywallGateProps) {
  const [showPayment, setShowPayment] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [cashuToken, setCashuToken] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'lightning' | 'cashu'>('cashu');
  const [error, setError] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const { toast } = useToast();
  const wallet = useWallet();
  const { sendPayment, getActiveConnection } = useNWC();

  const paywall = article.paywall;
  if (!paywall) return null;

  const priceUsd = formatSatsToUSD(paywall.price);

  // Generate QR code when invoice is available
  useEffect(() => {
    if (paymentRequest?.invoice) {
      QRCode.toDataURL(paymentRequest.invoice, {
        width: 256,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      }).then(setQrCodeUrl);
    }
  }, [paymentRequest?.invoice]);

  const handleStartPayment = useCallback(async () => {
    try {
      setError(null);
      const request = await generatePaywallInvoice({
        id: article.dTag,
        title: article.title,
        paywallPrice: paywall.price,
        paywallMintUrl: paywall.mintUrl,
        pubkey: article.pubkey,
      });
      setPaymentRequest(request);
      setShowPayment(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [article, paywall]);

  const handleCashuPayment = useCallback(async () => {
    if (!paymentRequest || !userPubkey || !cashuToken.trim()) return;

    setIsProcessing(true);
    setError(null);
    try {
      await processTokenPayment(cashuToken, paymentRequest, userPubkey);
      setShowPayment(false);
      onUnlock();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  }, [paymentRequest, userPubkey, cashuToken, onUnlock]);

  const handleLightningPayment = useCallback(async () => {
    if (!paymentRequest?.invoice || !userPubkey) return;

    setIsProcessing(true);
    setError(null);

    try {
      const nwcConnection = getActiveConnection();

      // Try NWC first
      if (nwcConnection?.isConnected && nwcConnection.connectionString) {
        const result = await sendPayment(nwcConnection, paymentRequest.invoice);
        await processLightningPayment(result.preimage, paymentRequest, userPubkey);
        toast({ title: 'Payment successful!', description: 'Article unlocked' });
        setShowPayment(false);
        onUnlock();
        return;
      }

      // Try WebLN
      if (wallet.webln) {
        await wallet.webln.enable();
        const result = await wallet.webln.sendPayment(paymentRequest.invoice);
        await processLightningPayment(result.preimage, paymentRequest, userPubkey);
        toast({ title: 'Payment successful!', description: 'Article unlocked' });
        setShowPayment(false);
        onUnlock();
        return;
      }

      // No wallet available
      setError('No Lightning wallet connected. Scan the QR code or copy the invoice.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  }, [paymentRequest, userPubkey, wallet, sendPayment, getActiveConnection, onUnlock, toast]);

  const handleCopyInvoice = useCallback(() => {
    if (!paymentRequest?.invoice) return;
    navigator.clipboard.writeText(paymentRequest.invoice);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [paymentRequest]);

  const openInWallet = useCallback(() => {
    if (!paymentRequest?.invoice) return;
    window.open(`lightning:${paymentRequest.invoice}`, '_blank');
  }, [paymentRequest]);

  return (
    <>
      {/* Paywall barrier */}
      <div
        className={cn(
          'relative py-12 my-8',
          'before:absolute before:inset-x-0 before:top-0 before:h-24',
          'before:bg-gradient-to-b before:from-transparent before:to-background',
          className
        )}
      >
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Premium Content</CardTitle>
            <CardDescription>
              Pay to unlock the full article
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-3xl font-bold flex items-center justify-center gap-2">
              <Zap className="h-6 w-6 text-yellow-500" />
              {paywall.price.toLocaleString()} sats
              <span className="text-sm font-normal text-muted-foreground">
                ({priceUsd})
              </span>
            </div>

            {userPubkey ? (
              <Button size="lg" className="w-full" onClick={handleStartPayment}>
                <Zap className="h-4 w-4 mr-2" />
                Unlock Article
              </Button>
            ) : (
              <div className="space-y-2">
                <Button size="lg" variant="outline" className="w-full" disabled>
                  Login to unlock
                </Button>
                <p className="text-xs text-muted-foreground">
                  Sign in with Nostr to purchase access
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <p className="text-xs text-muted-foreground">
              Pay with Lightning or Cashu tokens. Your purchase supports the author directly.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              Pay {paywall.price.toLocaleString()} sats to unlock this article
            </DialogDescription>
          </DialogHeader>

          <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="lightning" className="gap-2">
                <Zap className="h-4 w-4" />
                Lightning
              </TabsTrigger>
              <TabsTrigger value="cashu" className="gap-2">
                <Coins className="h-4 w-4" />
                Cashu
              </TabsTrigger>
            </TabsList>

            <TabsContent value="lightning" className="space-y-4">
              {paymentRequest?.invoice ? (
                <div className="space-y-4 py-4">
                  {/* QR Code */}
                  {qrCodeUrl && (
                    <div className="flex justify-center">
                      <img
                        src={qrCodeUrl}
                        alt="Lightning Invoice QR"
                        className="rounded-lg border"
                      />
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {(wallet.hasNWC || wallet.webln) && (
                      <Button
                        className="flex-1"
                        onClick={handleLightningPayment}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4 mr-2" />
                        )}
                        Pay with Wallet
                      </Button>
                    )}
                    <Button variant="outline" onClick={openInWallet}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open
                    </Button>
                    <Button variant="outline" onClick={handleCopyInvoice}>
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive text-center">{error}</p>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Generating invoice...</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="cashu" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cashu-token">Paste Cashu Token</Label>
                <Input
                  id="cashu-token"
                  placeholder="cashuA..."
                  value={cashuToken}
                  onChange={(e) => setCashuToken(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Paste a Cashu token worth at least {paywall.price} sats from{' '}
                  <a
                    href={paywall.mintUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {new URL(paywall.mintUrl).hostname}
                  </a>
                </p>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                className="w-full"
                onClick={handleCashuPayment}
                disabled={isProcessing || !cashuToken.trim()}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Coins className="h-4 w-4 mr-2" />
                    Submit Payment
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

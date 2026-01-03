import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Zap, Loader2, Send } from 'lucide-react';
import { formatSatsToUSD } from '@/lib/paywall';
import type { LocalArticle } from '@/lib/storage';

interface PublishDialogProps {
  article: LocalArticle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublish: (settings: PublishSettings) => void | Promise<void>;
  isPublishing?: boolean;
}

export interface PublishSettings {
  paywallEnabled: boolean;
  paywallPrice?: number;
  paywallPreviewLength?: number;
  paywallMintUrl?: string;
  scheduledFor?: number;
}

export function PublishDialog({
  article,
  open,
  onOpenChange,
  onPublish,
  isPublishing = false,
}: PublishDialogProps) {
  const [paywallEnabled, setPaywallEnabled] = useState(article.paywallEnabled);
  const [paywallPrice, setPaywallPrice] = useState(article.paywallPrice || 1000);
  const [paywallPreviewLength, setPaywallPreviewLength] = useState(
    article.paywallPreviewLength || 500
  );
  const [paywallMintUrl, setPaywallMintUrl] = useState(
    article.paywallMintUrl || 'https://mint.minibits.cash/Bitcoin'
  );
  const [schedulePublish, setSchedulePublish] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const priceUsd = formatSatsToUSD(paywallPrice);

  const handlePublish = () => {
    const settings: PublishSettings = {
      paywallEnabled,
      paywallPrice: paywallEnabled ? paywallPrice : undefined,
      paywallPreviewLength: paywallEnabled ? paywallPreviewLength : undefined,
      paywallMintUrl: paywallEnabled ? paywallMintUrl : undefined,
    };

    // Handle scheduled publish
    if (schedulePublish && scheduledDate && scheduledTime) {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      settings.scheduledFor = scheduledDateTime.getTime();
    }

    onPublish(settings);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish Article</DialogTitle>
          <DialogDescription>
            Configure your article settings before publishing to Nostr
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Paywall Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Paywall</Label>
                <p className="text-xs text-muted-foreground">
                  Charge readers to access full content
                </p>
              </div>
              <Switch
                checked={paywallEnabled}
                onCheckedChange={setPaywallEnabled}
              />
            </div>

            {paywallEnabled && (
              <div className="space-y-4 pl-4 border-l-2">
                {/* Price */}
                <div className="space-y-2">
                  <Label htmlFor="price">Price (sats)</Label>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <Input
                      id="price"
                      type="number"
                      min={1}
                      value={paywallPrice}
                      onChange={(e) => setPaywallPrice(parseInt(e.target.value) || 1)}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">
                      ≈ {priceUsd}
                    </span>
                  </div>
                </div>

                {/* Preview Length */}
                <div className="space-y-2">
                  <Label htmlFor="preview-length">Free Preview Length</Label>
                  <Select
                    value={String(paywallPreviewLength)}
                    onValueChange={(v) => setPaywallPreviewLength(parseInt(v))}
                  >
                    <SelectTrigger id="preview-length" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="250">~1 paragraph</SelectItem>
                      <SelectItem value="500">~2 paragraphs</SelectItem>
                      <SelectItem value="1000">~4 paragraphs</SelectItem>
                      <SelectItem value="2000">~8 paragraphs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Mint URL */}
                <div className="space-y-2">
                  <Label htmlFor="mint-url">Cashu Mint URL</Label>
                  <Input
                    id="mint-url"
                    type="url"
                    value={paywallMintUrl}
                    onChange={(e) => setPaywallMintUrl(e.target.value)}
                    placeholder="https://mint.minibits.cash/Bitcoin"
                    className="text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    The Cashu mint where payments will be received
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Schedule Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Schedule Publish</Label>
                <p className="text-xs text-muted-foreground">
                  Publish at a specific date and time
                </p>
              </div>
              <Switch
                checked={schedulePublish}
                onCheckedChange={setSchedulePublish}
              />
            </div>

            {schedulePublish && (
              <div className="space-y-4 pl-4 border-l-2">
                <div className="space-y-2">
                  <Label htmlFor="scheduled-date">Date</Label>
                  <Input
                    id="scheduled-date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduled-time">Time</Label>
                  <Input
                    id="scheduled-time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPublishing}>
            Cancel
          </Button>
          <Button onClick={handlePublish} disabled={isPublishing || (schedulePublish && (!scheduledDate || !scheduledTime))}>
            {isPublishing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {schedulePublish ? 'Schedule' : 'Publish Now'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

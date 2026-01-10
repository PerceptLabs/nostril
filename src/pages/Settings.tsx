import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getSyncSettings,
  setSyncSettings,
  exportLocalData,
  importLocalData,
  clearLocalData,
  db,
  type SyncSettings,
} from "@/lib/storage";
import { useSyncStatus, useSync, useConflictSaves } from "@/hooks/useLocalSaves";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/useToast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  Globe,
  Download,
  Upload,
  Trash2,
  Loader2,
  Database,
  Settings as SettingsIcon,
  ArrowLeft,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SyncStatusIndicator } from "@/components/sync";
import { BillingDashboard } from "@/components/billing";

export function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { data: syncStatus, isLoading: statusLoading } = useSyncStatus();
  const { sync, isSyncing } = useSync();
  const { data: conflicts } = useConflictSaves();

  const [settings, setSettings] = useState<SyncSettings | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    getSyncSettings().then(setSettings);
  }, []);

  const updateSetting = useCallback(async <K extends keyof SyncSettings>(
    key: K,
    value: SyncSettings[K]
  ) => {
    await setSyncSettings({ [key]: value });
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
    toast({
      title: "Settings updated",
      description: `${key} has been updated.`,
    });
  }, [toast]);

  const handleSync = useCallback(async () => {
    try {
      const result = await sync();
      toast({
        title: "Sync complete",
        description: `Pushed ${result.pushed.saves} saves, pulled ${result.pulled.saves} saves.`,
      });
    } catch (error) {
      toast({
        title: "Sync failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }, [sync, toast]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const data = await exportLocalData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nostril-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Export complete",
        description: `Exported ${data.saves.length} saves and ${data.collections.length} collections.`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [toast]);

  const handleImport = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsImporting(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await importLocalData(data);
        toast({
          title: "Import complete",
          description: `Imported ${data.saves?.length || 0} saves and ${data.collections?.length || 0} collections.`,
        });
      } catch (error) {
        toast({
          title: "Import failed",
          description: (error as Error).message,
          variant: "destructive",
        });
      } finally {
        setIsImporting(false);
      }
    };
    input.click();
  }, [toast]);

  const handleClearData = useCallback(async () => {
    try {
      await clearLocalData();
      toast({
        title: "Data cleared",
        description: "All local data has been deleted.",
      });
      navigate('/library');
    } catch (error) {
      toast({
        title: "Clear failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }, [toast, navigate]);

  if (!settings) {
    return (
      <div className="container max-w-2xl py-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const syncProgress = syncStatus
    ? Math.round(((syncStatus.synced + syncStatus.published) / Math.max(syncStatus.total, 1)) * 100)
    : 0;

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage storage, sync, billing, and privacy settings
          </p>
        </div>
      </div>

      <Tabs defaultValue="sync" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            <span className="hidden sm:inline">Sync</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Data</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sync" className="space-y-6">
          {/* Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Sync Status
          </CardTitle>
          <CardDescription>
            View and manage synchronization with Nostr relays
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status overview */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <StatusCard
              label="Local"
              count={syncStatus?.local || 0}
              icon={CloudOff}
              className="text-muted-foreground"
            />
            <StatusCard
              label="Syncing"
              count={syncStatus?.syncing || 0}
              icon={RefreshCw}
              className="text-blue-500"
            />
            <StatusCard
              label="Synced"
              count={syncStatus?.synced || 0}
              icon={Cloud}
              className="text-green-500"
            />
            <StatusCard
              label="Conflicts"
              count={syncStatus?.conflict || 0}
              icon={AlertTriangle}
              className="text-yellow-500"
            />
            <StatusCard
              label="Published"
              count={syncStatus?.published || 0}
              icon={Globe}
              className="text-primary"
            />
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sync progress</span>
              <span className="font-medium">{syncProgress}%</span>
            </div>
            <Progress value={syncProgress} />
          </div>

          {/* Sync button */}
          <Button
            onClick={handleSync}
            disabled={isSyncing || !user}
            className="w-full"
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>

          {!user && (
            <p className="text-sm text-muted-foreground text-center">
              Login to sync with Nostr relays
            </p>
          )}

          {/* Conflicts warning */}
          {conflicts && conflicts.length > 0 && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">{conflicts.length} conflict(s) need resolution</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage & Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Storage & Sync
          </CardTitle>
          <CardDescription>
            Control how your saves are stored and synchronized
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Local Storage</Label>
              <p className="text-sm text-muted-foreground">
                Keep copies on this device for offline access
              </p>
            </div>
            <Switch
              checked={settings.localStorageEnabled}
              onCheckedChange={v => updateSetting('localStorageEnabled', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Relay Sync</Label>
              <p className="text-sm text-muted-foreground">
                Sync encrypted saves to Nostr relays
              </p>
            </div>
            <Switch
              checked={settings.relaySyncEnabled}
              onCheckedChange={v => updateSetting('relaySyncEnabled', v)}
            />
          </div>

          <div className="space-y-3">
            <Label>Sync Frequency</Label>
            <RadioGroup
              value={settings.syncFrequency}
              onValueChange={v => updateSetting('syncFrequency', v as SyncSettings['syncFrequency'])}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="instant" id="instant" />
                <Label htmlFor="instant" className="font-normal">
                  Instant - sync immediately when changes occur
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="interval" id="interval" />
                <Label htmlFor="interval" className="font-normal">
                  Periodic - sync every 5 minutes
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual" className="font-normal">
                  Manual - only sync when requested
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>Conflict Resolution</Label>
            <RadioGroup
              value={settings.conflictResolution}
              onValueChange={v => updateSetting('conflictResolution', v as SyncSettings['conflictResolution'])}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="local" id="local" />
                <Label htmlFor="local" className="font-normal">
                  Local wins - keep local version on conflicts
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="remote" id="remote" />
                <Label htmlFor="remote" className="font-normal">
                  Remote wins - keep relay version on conflicts
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="ask" id="ask" />
                <Label htmlFor="ask" className="font-normal">
                  Ask me - review each conflict manually
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <BillingDashboard />
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Export, import, or clear your local data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex-1"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Export Data
                </Button>
                <Button
                  variant="outline"
                  onClick={handleImport}
                  disabled={isImporting}
                  className="flex-1"
                >
                  {isImporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Import Data
                </Button>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Local Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all local data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all saves, collections, and settings
                      from this device. Data synced to relays will not be affected.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearData}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Clear Data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusCard({
  label,
  count,
  icon: Icon,
  className,
}: {
  label: string;
  count: number;
  icon: typeof Cloud;
  className?: string;
}) {
  return (
    <div className="text-center p-3 rounded-lg bg-muted/50">
      <Icon className={cn("h-5 w-5 mx-auto mb-1", className)} />
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default Settings;

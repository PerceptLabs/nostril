import { type SyncStatus } from "@/lib/storage";
import { Cloud, CloudOff, RefreshCw, AlertTriangle, Globe } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const statusConfig: Record<SyncStatus, {
  icon: typeof Cloud;
  label: string;
  description: string;
  className: string;
}> = {
  local: {
    icon: CloudOff,
    label: 'Local only',
    description: 'Saved on this device only',
    className: 'text-muted-foreground'
  },
  syncing: {
    icon: RefreshCw,
    label: 'Syncing',
    description: 'Uploading to relays...',
    className: 'text-blue-500 animate-spin'
  },
  synced: {
    icon: Cloud,
    label: 'Synced',
    description: 'Encrypted and synced to relays',
    className: 'text-green-500'
  },
  conflict: {
    icon: AlertTriangle,
    label: 'Conflict',
    description: 'Local and remote versions differ',
    className: 'text-yellow-500'
  },
  published: {
    icon: Globe,
    label: 'Published',
    description: 'Publicly visible on relays',
    className: 'text-primary'
  },
};

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function SyncStatusIndicator({
  status,
  size = 'md',
  showLabel = false,
  className,
}: SyncStatusIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("flex items-center gap-1.5", className)}>
          <Icon className={cn(sizeClasses[size], config.className)} />
          {showLabel && (
            <span className={cn("text-xs", config.className)}>
              {config.label}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-center">
          <p className="font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Compact sync status for lists/cards
 */
export function SyncStatusDot({ status }: { status: SyncStatus }) {
  const colorClasses: Record<SyncStatus, string> = {
    local: 'bg-muted-foreground',
    syncing: 'bg-blue-500 animate-pulse',
    synced: 'bg-green-500',
    conflict: 'bg-yellow-500',
    published: 'bg-primary',
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("h-2 w-2 rounded-full", colorClasses[status])} />
      </TooltipTrigger>
      <TooltipContent>
        {statusConfig[status].label}
      </TooltipContent>
    </Tooltip>
  );
}

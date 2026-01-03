import { type Visibility } from "@/lib/storage";
import { Lock, Users, Link, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const config: Record<Visibility, {
  icon: typeof Lock;
  label: string;
  description: string;
  className: string;
  badgeClass: string;
}> = {
  private: {
    icon: Lock,
    label: 'Private',
    description: 'Only visible to you',
    className: 'text-zinc-500',
    badgeClass: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
  },
  shared: {
    icon: Users,
    label: 'Shared',
    description: 'Visible to selected people',
    className: 'text-blue-500',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
  },
  unlisted: {
    icon: Link,
    label: 'Unlisted',
    description: 'Anyone with the link can view',
    className: 'text-yellow-500',
    badgeClass: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
  },
  public: {
    icon: Globe,
    label: 'Public',
    description: 'Visible to everyone',
    className: 'text-green-500',
    badgeClass: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
  },
};

interface VisibilityBadgeProps {
  visibility: Visibility;
  isOverridden?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'default';
  className?: string;
}

export function VisibilityBadge({
  visibility,
  isOverridden,
  showLabel = true,
  size = 'default',
  className,
}: VisibilityBadgeProps) {
  const { icon: Icon, label, description, badgeClass } = config[visibility];

  const sizeClasses = {
    sm: 'h-3 w-3',
    default: 'h-3.5 w-3.5',
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "gap-1 font-normal",
            badgeClass,
            size === 'sm' && 'text-xs px-1.5 py-0',
            className
          )}
        >
          <Icon className={sizeClasses[size]} />
          {showLabel && <span>{label}</span>}
          {isOverridden && (
            <span className="text-[10px] opacity-60" title="Overrides collection default">
              *
            </span>
          )}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{description}</p>
        {isOverridden && (
          <p className="text-xs text-muted-foreground mt-1">
            Overrides collection default
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Icon-only visibility indicator
 */
export function VisibilityIcon({
  visibility,
  size = 'md',
  className,
}: {
  visibility: Visibility;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const { icon: Icon, label, className: colorClass } = config[visibility];

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Icon className={cn(sizeClasses[size], colorClass, className)} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Get visibility color for styling
 */
export function getVisibilityColor(visibility: Visibility): string {
  return config[visibility].className;
}

import { type Visibility } from "@/lib/storage";
import { Lock, Users, Link, Globe, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const visibilityOptions: {
  value: Visibility;
  label: string;
  icon: typeof Lock;
  description: string;
  color: string;
}[] = [
  {
    value: 'private',
    label: 'Private',
    icon: Lock,
    description: 'Only you can see this',
    color: 'text-zinc-500'
  },
  {
    value: 'shared',
    label: 'Shared',
    icon: Users,
    description: 'Visible to specific people',
    color: 'text-blue-500'
  },
  {
    value: 'unlisted',
    label: 'Unlisted',
    icon: Link,
    description: 'Anyone with the link can view',
    color: 'text-yellow-500'
  },
  {
    value: 'public',
    label: 'Public',
    icon: Globe,
    description: 'Visible to everyone',
    color: 'text-green-500'
  },
];

interface VisibilitySelectorProps {
  value: Visibility;
  onChange: (value: Visibility) => void;
  inheritedFrom?: string;  // Collection name if inheriting
  disabled?: boolean;
  className?: string;
}

export function VisibilitySelector({
  value,
  onChange,
  inheritedFrom,
  disabled,
  className,
}: VisibilitySelectorProps) {
  const currentOption = visibilityOptions.find(opt => opt.value === value) || visibilityOptions[0];
  const Icon = currentOption.icon;

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn("w-[180px]", className)}>
        <SelectValue>
          <div className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4", currentOption.color)} />
            <span>{currentOption.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {inheritedFrom && (
          <>
            <SelectItem value="inherit">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Inherit from</span>
                <span className="font-medium">"{inheritedFrom}"</span>
              </div>
            </SelectItem>
            <div className="h-px bg-border my-1" />
          </>
        )}
        {visibilityOptions.map(opt => {
          const OptionIcon = opt.icon;
          return (
            <SelectItem key={opt.value} value={opt.value}>
              <div className="flex items-center gap-2">
                <OptionIcon className={cn("h-4 w-4", opt.color)} />
                <div>
                  <span>{opt.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {opt.description}
                  </span>
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

/**
 * Compact visibility selector as dropdown
 */
export function VisibilityDropdown({
  value,
  onChange,
  disabled,
  size = 'default',
}: {
  value: Visibility;
  onChange: (value: Visibility) => void;
  disabled?: boolean;
  size?: 'sm' | 'default';
}) {
  const currentOption = visibilityOptions.find(opt => opt.value === value) || visibilityOptions[0];
  const Icon = currentOption.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          size={size === 'sm' ? 'sm' : 'default'}
          className="gap-1.5"
        >
          <Icon className={cn("h-4 w-4", currentOption.color)} />
          <span className="hidden sm:inline">{currentOption.label}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Visibility</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {visibilityOptions.map(opt => {
          const OptionIcon = opt.icon;
          return (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className="flex items-start gap-3 py-2"
            >
              <OptionIcon className={cn("h-4 w-4 mt-0.5", opt.color)} />
              <div className="flex-1">
                <p className="font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
              {value === opt.value && (
                <div className="h-2 w-2 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

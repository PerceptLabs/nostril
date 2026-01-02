import { useState } from "react";
import { useBacklinks } from "@/hooks/useSaves";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, ExternalLink, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface BacklinksPanelProps {
  dTag: string | undefined;
  className?: string;
}

export function BacklinksPanel({ dTag, className }: BacklinksPanelProps) {
  const { data: backlinks, isLoading, error } = useBacklinks(dTag);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!dTag) return null;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-300",
        isCollapsed && "h-auto",
        className
      )}
    >
      <Button
        variant="ghost"
        className="w-full justify-between h-auto py-2 px-4 hover:bg-muted/50"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4" />
          <span className="font-medium text-sm">Backlinks</span>
          {backlinks && backlinks.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
              {backlinks.length}
            </span>
          )}
        </div>
        {isCollapsed ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronUp className="h-4 w-4" />
        )}
      </Button>

      {!isCollapsed && (
        <div className="border-t">
          {isLoading && (
            <div className="p-3 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Failed to load backlinks
            </div>
          )}

          {!isLoading && !error && (!backlinks || backlinks.length === 0) && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No backlinks yet
            </div>
          )}

          {backlinks && backlinks.length > 0 && (
            <div className="max-h-[300px] overflow-y-auto">
              {backlinks.map((save) => (
                <a
                  key={save.id}
                  href={`/${save.dTag}`}
                  className="block p-3 hover:bg-muted/50 border-b last:border-b-0 transition-colors"
                >
                  <p className="text-sm font-medium line-clamp-1">
                    {save.title || save.url || "Untitled"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {save.url && (
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {new URL(save.url).hostname}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(save.publishedAt, { addSuffix: true })}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
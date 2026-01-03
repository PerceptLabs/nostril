import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MoreHorizontal,
  ExternalLink,
  Bookmark,
  Link as LinkIcon,
  Image as ImageIcon,
  FileText,
  Trash,
  Edit,
  Share2,
  Zap,
  ArrowUpRight,
  Copy,
  Link2,
  Lock,
  Globe,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ZapButton } from "@/components/ZapButton";
import { SyncStatusDot } from "@/components/sync/SyncStatusIndicator";
import { VisibilityIcon } from "@/components/sync/VisibilityBadge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { ParsedSave, ContentType } from "@/lib/nostril";
import type { SyncStatus, Visibility, LocalSave } from "@/lib/storage";
import type { NostrEvent } from "@nostrify/nostrify";
import type { SaveWithVisibility } from "@/hooks/useLocalSaves";

// Base save type that works with both ParsedSave and LocalSave
type BaseSave = {
  id: string;
  url?: string;
  title?: string;
  description?: string;
  image?: string;
  contentType: ContentType;
  content: string;
  tags: string[];
  refs: string[];
};

interface SaveCardProps {
  save: BaseSave & { dTag?: string; publishedAt?: Date; author?: { pubkey: string; name?: string; picture?: string }; createdAt?: number; updatedAt?: number };
  viewMode?: "grid" | "list" | "headlines";
  onEdit?: (save: any) => void;
  onDelete?: (save: any) => void;
  onShare?: (save: any) => void;
  backlinkCount?: number;
  syncStatus?: SyncStatus;
  visibility?: Visibility;
  className?: string;
}

const contentTypeIcons: Record<ContentType, React.ReactNode> = {
  link: <ExternalLink className="h-3 w-3" />,
  image: <ImageIcon className="h-3 w-3" />,
  pdf: <FileText className="h-3 w-3" />,
  note: <LinkIcon className="h-3 w-3" />,
};

const contentTypeColors: Record<ContentType, string> = {
  link: "bg-blue-500/10 text-blue-500",
  image: "bg-purple-500/10 text-purple-500",
  pdf: "bg-red-500/10 text-red-500",
  note: "bg-green-500/10 text-green-500",
};

export function SaveCard({
  save,
  viewMode = "grid",
  onEdit,
  onDelete,
  onShare,
  backlinkCount = 0,
  syncStatus,
  visibility,
  className,
}: SaveCardProps) {
  const [imageError, setImageError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Computed values for compatibility with both ParsedSave and LocalSave
  const saveId = save.dTag || save.id;
  const publishedDate = save.publishedAt || (save.createdAt ? new Date(save.createdAt) : new Date());
  const authorPubkey = save.author?.pubkey || "";

  const displayTitle = save.title || save.url || "Untitled";
  const hostname = save.url ? (() => {
    try {
      return new URL(save.url).hostname;
    } catch {
      return null;
    }
  })() : null;
  const excerpt = save.description || save.content?.slice(0, 150);

  // Convert to NostrEvent format for ZapButton
  const saveAsEvent = useMemo((): NostrEvent => ({
    id: save.id,
    pubkey: authorPubkey,
    created_at: Math.floor(publishedDate.getTime() / 1000),
    kind: 30078,
    tags: [["d", saveId]],
    content: save.content,
    sig: "",
  }), [save.id, authorPubkey, publishedDate, saveId, save.content]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/${saveId}`;
    navigator.clipboard.writeText(url);
    onShare?.(save);
  };

  const handleOpenOriginal = () => {
    if (save.url) {
      window.open(save.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete?.(save);
  };

  // Stats row component
  const StatsRow = ({ compact = false }: { compact?: boolean }) => (
    <div className={cn("flex items-center gap-3", compact ? "text-xs" : "text-xs")}>
      {/* Sync and visibility status */}
      {(syncStatus || visibility) && (
        <div className="flex items-center gap-1.5">
          {syncStatus && <SyncStatusDot status={syncStatus} />}
          {visibility && <VisibilityIcon visibility={visibility} size="sm" />}
        </div>
      )}
      <span className="text-muted-foreground">
        {formatDistanceToNow(publishedDate, { addSuffix: true })}
      </span>
      {backlinkCount > 0 && (
        <span className="text-muted-foreground flex items-center gap-1" title={`${backlinkCount} backlink${backlinkCount !== 1 ? 's' : ''}`}>
          <Link2 className="h-3 w-3" />
          {backlinkCount}
        </span>
      )}
      <ZapButton target={saveAsEvent} className="text-xs" showCount />
    </div>
  );

  // Delete confirmation dialog
  const DeleteConfirmDialog = () => (
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this save?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete "{displayTitle}". This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // Action menu component
  const ActionMenu = ({ triggerClassName }: { triggerClassName?: string }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", triggerClassName)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit?.(save)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Link
        </DropdownMenuItem>
        {save.url && (
          <DropdownMenuItem onClick={handleOpenOriginal}>
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Open Original
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive">
          <Trash className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (viewMode === "headlines") {
    return (
      <>
        <Card className={cn("group hover:shadow-md transition-all", className)}>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-start justify-between gap-2">
              <Link
                to={`/${saveId}`}
                className="text-lg font-semibold hover:text-primary transition-colors line-clamp-2"
              >
                {displayTitle}
              </Link>
              <div className="flex items-center gap-1 shrink-0">
                <Badge
                  variant="secondary"
                  className={cn("gap-1", contentTypeColors[save.contentType])}
                >
                  {contentTypeIcons[save.contentType]}
                  {save.contentType}
                </Badge>
                <ActionMenu triggerClassName="opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {save.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {save.tags.slice(0, 5).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
                {save.tags.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{save.tags.length - 5}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="p-4 pt-0">
            <StatsRow compact />
          </CardFooter>
        </Card>
        <DeleteConfirmDialog />
      </>
    );
  }

  if (viewMode === "list") {
    return (
      <>
        <Card className={cn("group hover:shadow-md transition-all", className)}>
          <div className="flex items-start gap-4 p-4">
            {/* Thumbnail */}
            {save.image && !imageError && (
              <Link to={`/${saveId}`} className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-muted">
                <img
                  src={save.image}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              </Link>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <Link
                  to={`/${saveId}`}
                  className="font-medium hover:text-primary transition-colors line-clamp-1"
                >
                  {displayTitle}
                </Link>
                <ActionMenu triggerClassName="opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {hostname && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <ExternalLink className="h-3 w-3" />
                  {hostname}
                </p>
              )}

              {excerpt && (
                <p className="text-sm text-muted-foreground line-clamp-1 mt-2">{excerpt}</p>
              )}

              <div className="flex items-center gap-3 mt-2">
                <Badge variant="secondary" className={cn("gap-1 text-xs", contentTypeColors[save.contentType])}>
                  {contentTypeIcons[save.contentType]}
                  {save.contentType}
                </Badge>
                <StatsRow compact />
              </div>
            </div>
          </div>
        </Card>
        <DeleteConfirmDialog />
      </>
    );
  }

  // Grid view (default)
  return (
    <>
      <Card className={cn("group overflow-hidden hover:shadow-lg transition-all", className)}>
        {/* Thumbnail */}
        <Link
          to={`/${saveId}`}
          className="block aspect-video bg-muted relative overflow-hidden"
        >
          {save.image && !imageError ? (
            <img
              src={save.image}
              alt=""
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              {save.contentType === "image" ? (
                <ImageIcon className="h-12 w-12" />
              ) : (
                <Bookmark className="h-12 w-12" />
              )}
            </div>
          )}

          {/* Content type badge */}
          <div className="absolute top-2 right-2">
            <Badge
              variant="secondary"
              className={cn("gap-1 shadow-sm", contentTypeColors[save.contentType])}
            >
              {contentTypeIcons[save.contentType]}
            </Badge>
          </div>

          {/* Backlink indicator */}
          {backlinkCount > 0 && (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="gap-1 shadow-sm bg-background/80">
                <Link2 className="h-3 w-3" />
                {backlinkCount}
              </Badge>
            </div>
          )}
        </Link>

        {/* Content */}
        <CardContent className="p-4">
          <Link
            to={`/${saveId}`}
            className="font-medium hover:text-primary transition-colors line-clamp-2"
          >
            {displayTitle}
          </Link>

          {hostname && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <ExternalLink className="h-3 w-3" />
              {hostname}
            </p>
          )}

          {excerpt && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{excerpt}</p>
          )}

          {save.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {save.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
              {save.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{save.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>

        {/* Footer */}
        <CardFooter className="p-4 pt-0 justify-between">
          <StatsRow />
          <ActionMenu triggerClassName="opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardFooter>
      </Card>
      <DeleteConfirmDialog />
    </>
  );
}

/**
 * Loading skeleton for SaveCard
 */
export function SaveCardSkeleton({ viewMode = "grid" }: { viewMode?: "grid" | "list" | "headlines" }) {
  if (viewMode === "headlines") {
    return (
      <Card className="p-4">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <div className="flex gap-1 mt-2">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-12" />
        </div>
      </Card>
    );
  }

  if (viewMode === "list") {
    return (
      <Card className="p-4">
        <div className="flex gap-4">
          <Skeleton className="w-16 h-16 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video" />
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-1 mt-2">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-12" />
        </div>
      </CardContent>
    </Card>
  );
}

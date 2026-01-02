import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MoreHorizontal,
  ExternalLink,
  Bookmark,
  Tag,
  Link as LinkIcon,
  Image as ImageIcon,
  FileText,
  Trash,
  Edit,
  Share2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatDistanceToNow } from "@/lib/utils";
import type { ParsedSave, ContentType } from "@/lib/nostril";

interface SaveCardProps {
  save: ParsedSave;
  viewMode?: "grid" | "list" | "headlines";
  onEdit?: (save: ParsedSave) => void;
  onDelete?: (save: ParsedSave) => void;
  onShare?: (save: ParsedSave) => void;
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
  className,
}: SaveCardProps) {
  const [imageError, setImageError] = useState(false);

  const displayTitle = save.title || save.url || "Untitled";
  const hostname = save.url ? new URL(save.url).hostname : null;
  const excerpt = save.description || save.content?.slice(0, 150);

  if (viewMode === "headlines") {
    return (
      <Card className={cn("group hover:shadow-md transition-all", className)}>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <Link
              to={`/${save.dTag}`}
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
        <CardFooter className="p-4 pt-0 text-xs text-muted-foreground">
          <span>{save.author.name || formatDistanceToNow(save.publishedAt, { addSuffix: true })}</span>
        </CardFooter>
      </Card>
    );
  }

  if (viewMode === "list") {
    return (
      <Card className={cn("group hover:shadow-md transition-all", className)}>
        <div className="flex items-start gap-4 p-4">
          {/* Thumbnail */}
          {save.image && !imageError && (
            <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-muted">
              <img
                src={save.image}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <Link
                to={`/${save.dTag}`}
                className="font-medium hover:text-primary transition-colors line-clamp-1"
              >
                {displayTitle}
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit?.(save)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onShare?.(save)}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete?.(save)} className="text-destructive">
                    <Trash className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className={cn("gap-1 text-xs", contentTypeColors[save.contentType])}>
                {contentTypeIcons[save.contentType]}
                {save.contentType}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(save.publishedAt, { addSuffix: true })}
              </span>
              {save.tags.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {save.tags.length} tag{save.tags.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Grid view (default)
  return (
    <Card className={cn("group overflow-hidden hover:shadow-lg transition-all", className)}>
      {/* Thumbnail */}
      <Link
        to={`/${save.dTag}`}
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
      </Link>

      {/* Content */}
      <CardContent className="p-4">
        <Link
          to={`/${save.dTag}`}
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
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(save.publishedAt, { addSuffix: true })}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(save)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onShare?.(save)}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete?.(save)} className="text-destructive">
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
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
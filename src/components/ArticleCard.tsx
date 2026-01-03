import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Lock,
  Clock,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  FileText,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { LocalArticle } from "@/lib/storage";
import type { Article } from "@/lib/article";

interface ArticleCardProps {
  article: LocalArticle | Article;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function ArticleCard({ article, onEdit, onDelete, className }: ArticleCardProps) {
  const isLocalArticle = 'status' in article;
  const publishedDate = isLocalArticle
    ? article.publishedAt
      ? new Date(article.publishedAt * 1000)
      : new Date(article.updatedAt)
    : new Date(article.publishedAt * 1000);

  const viewUrl = isLocalArticle
    ? article.status === 'published'
      ? `/article/${article.id}`
      : `/write/${article.id}`
    : `/article/${article.dTag}`;

  return (
    <Card className={cn("group overflow-hidden hover:shadow-lg transition-all", className)}>
      <Link to={viewUrl}>
        {/* Cover image */}
        {article.image ? (
          <div className="aspect-video overflow-hidden">
            <img
              src={article.image}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <span className="text-4xl font-serif font-bold text-primary/20">
              {article.title[0] || 'A'}
            </span>
          </div>
        )}
      </Link>

      <CardHeader className="pb-2">
        {/* Tags + Status indicators */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {article.tags.slice(0, 2).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              #{tag}
            </Badge>
          ))}
          {isLocalArticle && article.status === 'draft' && (
            <Badge variant="outline" className="text-xs">
              Draft
            </Badge>
          )}
          {isLocalArticle && article.paywallEnabled && article.paywallPrice && (
            <Badge variant="outline" className="text-xs text-yellow-600 gap-1">
              <Lock className="h-3 w-3" />
              {article.paywallPrice} sats
            </Badge>
          )}
          {!isLocalArticle && article.paywall && (
            <Badge variant="outline" className="text-xs text-yellow-600 gap-1">
              <Lock className="h-3 w-3" />
              {article.paywall.price} sats
            </Badge>
          )}
        </div>

        {/* Title */}
        <Link to={viewUrl}>
          <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {article.title || "Untitled Article"}
          </h3>
        </Link>
      </CardHeader>

      <CardContent className="pb-2">
        {/* Summary */}
        {article.summary && (
          <p className="text-muted-foreground text-sm line-clamp-2">
            {article.summary}
          </p>
        )}
      </CardContent>

      <CardFooter className="pt-2">
        <div className="flex items-center justify-between w-full">
          {/* Metadata */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(publishedDate, { addSuffix: true })}
            </span>
            {!isLocalArticle && article.readingTime && (
              <span>{article.readingTime}m read</span>
            )}
          </div>

          {/* Actions (for local articles) */}
          {isLocalArticle && (onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {article.status === 'draft' && onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {article.status === 'published' && (
                  <DropdownMenuItem onClick={() => window.open(viewUrl, '_blank')}>
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

export function ArticleCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-muted animate-pulse" />
      <CardHeader className="pb-2">
        <div className="flex gap-2 mb-2">
          <div className="h-5 w-16 bg-muted rounded animate-pulse" />
          <div className="h-5 w-16 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-6 w-3/4 bg-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2">
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        </div>
      </CardFooter>
    </Card>
  );
}

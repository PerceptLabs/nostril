import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Lock, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { calculateReadingTime } from '@/lib/article';
import type { Article } from '@/lib/article';

interface ArticleCardProps {
  article: Article;
  onClick?: () => void;
  className?: string;
  authorName?: string;
  authorPicture?: string;
}

export function ArticleCard({
  article,
  onClick,
  className,
  authorName,
  authorPicture
}: ArticleCardProps) {
  const publishedDate = new Date(article.publishedAt * 1000);
  const displayAuthorName = authorName || `${article.pubkey.slice(0, 8)}...`;

  return (
    <Card className={cn('group overflow-hidden hover:shadow-lg transition-all cursor-pointer', className)} onClick={onClick}>
      <Link to={`/article/${article.dTag}`}>
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
              {article.title[0]}
            </span>
          </div>
        )}
      </Link>

      <CardHeader className="pb-2">
        {/* Tags + Paywall indicator */}
        <div className="flex items-center gap-2 mb-2">
          {article.tags.slice(0, 2).map(tag => (
            <Link key={tag} to={`/topic/${tag}`} onClick={(e) => e.stopPropagation()}>
              <Badge variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            </Link>
          ))}
          {article.paywall && (
            <Badge variant="outline" className="text-xs text-yellow-600 gap-1">
              <Lock className="h-3 w-3" />
              {article.paywall.price} sats
            </Badge>
          )}
        </div>

        {/* Title */}
        <Link to={`/article/${article.dTag}`} onClick={(e) => e.stopPropagation()}>
          <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {article.title}
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

      <CardFooter className="pt-2 justify-between">
        {/* Author */}
        <Link
          to={`/@${article.pubkey.slice(0, 8)}`}
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Avatar className="h-6 w-6">
            <AvatarImage src={authorPicture} />
            <AvatarFallback className="text-xs">
              {displayAuthorName[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground hover:text-foreground">
            {displayAuthorName}
          </span>
        </Link>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {article.readingTime}m
          </span>
          <span>
            {formatDistanceToNow(publishedDate, { addSuffix: true })}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}

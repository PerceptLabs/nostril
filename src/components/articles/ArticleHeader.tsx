import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Calendar, Clock, Share2, Bookmark, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Article } from '@/lib/article';

interface ArticleHeaderProps {
  article: Article;
  author?: {
    name?: string;
    picture?: string;
    npub?: string;
  };
  onBack?: () => void;
  className?: string;
}

export function ArticleHeader({
  article,
  author,
  onBack,
  className
}: ArticleHeaderProps) {
  const publishedDate = new Date(article.publishedAt * 1000);
  const authorName = author?.name || `${article.pubkey.slice(0, 8)}...`;
  const authorIdentifier = author?.npub || article.pubkey.slice(0, 8);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.summary,
        url: window.location.href,
      }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href);
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleBookmark = () => {
    // TODO: Implement bookmark functionality
    console.log('Bookmark article:', article.dTag);
  };

  return (
    <article className={cn('min-h-screen', className)}>
      {/* Cover image */}
      {article.image && (
        <div className="w-full h-[40vh] md:h-[50vh] relative">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />

          {/* Back button overlay on image */}
          {onBack && (
            <div className="absolute top-4 left-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={onBack}
                className="bg-background/80 backdrop-blur-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="container max-w-2xl mx-auto px-4 py-8">
        {/* Back button (if no cover image) */}
        {!article.image && onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {article.tags.map(tag => (
              <Link key={tag} to={`/topic/${tag}`}>
                <Badge variant="secondary" className="hover:bg-secondary/80">
                  #{tag}
                </Badge>
              </Link>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 leading-tight">
          {article.title}
        </h1>

        {/* Summary */}
        {article.summary && (
          <p className="text-xl text-muted-foreground mb-6">
            {article.summary}
          </p>
        )}

        {/* Author + Meta */}
        <div className="flex items-center gap-4 mb-8">
          <Link to={`/@${authorIdentifier}`}>
            <Avatar className="h-12 w-12">
              <AvatarImage src={author?.picture} />
              <AvatarFallback>
                {authorName[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1">
            <Link
              to={`/@${authorIdentifier}`}
              className="font-medium hover:underline"
            >
              {authorName}
            </Link>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(publishedDate, 'MMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {article.readingTime} min read
              </span>
              {article.paywall && (
                <span className="flex items-center gap-1 text-yellow-600">
                  <Lock className="h-3 w-3" />
                  {article.paywall.price} sats
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleBookmark}>
              <Bookmark className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <Separator className="mb-8" />
      </div>
    </article>
  );
}

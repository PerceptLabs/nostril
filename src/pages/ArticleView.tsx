import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { usePublicArticle } from "@/hooks/useArticles";
import { useAuthor } from "@/hooks/useAuthor";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bookmark,
  Share2,
  MessageCircle,
  Calendar,
  Clock,
  Zap,
  Lock,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { formatSatsToUSD } from "@/lib/paywall";

export function ArticleView() {
  const { dTag } = useParams<{ dTag: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { data: article, isLoading } = usePublicArticle(dTag);
  const { data: author } = useAuthor(article?.pubkey);

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // Check if article has paywall
  useEffect(() => {
    if (article?.paywall) {
      setShowPaywall(true);
      // TODO: Check if user has already unlocked this article
      // const unlocked = await hasUnlocked(article.dTag, user?.pubkey);
      // setIsUnlocked(unlocked);
    } else {
      setShowPaywall(false);
      setIsUnlocked(true);
    }
  }, [article, user]);

  // Get content with paywall applied
  const { preview, isPremium } = useMemo(() => {
    if (!article) return { preview: '', isPremium: false };

    if (!article.paywall || isUnlocked) {
      return { preview: article.content, isPremium: false };
    }

    // Split at preview length
    const previewLength = article.paywall.previewLength;
    let breakPoint = article.content.indexOf('\n\n', previewLength - 100);

    if (breakPoint === -1 || breakPoint > previewLength + 200) {
      breakPoint = previewLength;
    }

    return {
      preview: article.content.slice(0, breakPoint),
      isPremium: true,
    };
  }, [article, isUnlocked]);

  if (isLoading) {
    return <ArticleViewSkeleton />;
  }

  if (!article) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Article not found</h1>
        <p className="text-muted-foreground mb-8">
          This article may have been deleted or doesn't exist.
        </p>
        <Button onClick={() => navigate("/discover")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Browse articles
        </Button>
      </div>
    );
  }

  const publishedDate = new Date(article.publishedAt * 1000);

  return (
    <article className="min-h-screen">
      {/* Cover image */}
      {article.image && (
        <div className="w-full h-[40vh] md:h-[50vh] relative">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>
      )}

      <div className="container max-w-2xl mx-auto px-4 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {article.tags.map(tag => (
              <Link key={tag} to={`/discover?topic=${tag}`}>
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
          <Link to={`/@${author?.npub || article.pubkey.slice(0, 8)}`}>
            <Avatar className="h-12 w-12">
              <AvatarImage src={author?.picture} />
              <AvatarFallback>
                {(author?.name || 'A')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1">
            <Link
              to={`/@${author?.npub || article.pubkey.slice(0, 8)}`}
              className="font-medium hover:underline"
            >
              {author?.name || `${article.pubkey.slice(0, 8)}...`}
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

          {user && user.pubkey !== article.pubkey && (
            <Button variant="outline" size="sm">
              Follow
            </Button>
          )}
        </div>

        <Separator className="mb-8" />

        {/* Content */}
        <div className="prose prose-lg dark:prose-invert max-w-none">
          {/* Free preview */}
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(preview) }} />

          {/* Paywall gate */}
          {isPremium && !isUnlocked && article.paywall && (
            <div className="relative py-12 my-8 before:absolute before:inset-x-0 before:top-0 before:h-24 before:bg-gradient-to-b before:from-transparent before:to-background">
              <div className="max-w-md mx-auto p-6 border rounded-lg bg-card text-center space-y-4">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Premium Content</h3>
                <p className="text-muted-foreground">
                  {author?.name ? `Support ${author.name} to` : 'Pay to'} unlock the full article
                </p>
                <div className="text-3xl font-bold flex items-center justify-center gap-2">
                  <Zap className="h-6 w-6 text-yellow-500" />
                  {article.paywall.price.toLocaleString()} sats
                  <span className="text-sm font-normal text-muted-foreground">
                    ({formatSatsToUSD(article.paywall.price)})
                  </span>
                </div>

                {user ? (
                  <Button size="lg" className="w-full">
                    <Zap className="h-4 w-4 mr-2" />
                    Unlock Article
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button size="lg" variant="outline" className="w-full" disabled>
                      Login to unlock
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Sign in with Nostr to purchase access
                    </p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Pay with Lightning or Cashu tokens. Your purchase supports the author directly.
                </p>
              </div>
            </div>
          )}
        </div>

        {isUnlocked && (
          <>
            <Separator className="my-8" />

            {/* Engagement */}
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="lg">
                  <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                  Zap
                </Button>

                <Button variant="ghost" size="lg">
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Comment
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Bookmark className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Author bio */}
            <div className="bg-muted/50 rounded-lg p-6 my-8">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={author?.picture} />
                  <AvatarFallback>
                    {(author?.name || 'A')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Written by</p>
                  <h3 className="text-lg font-semibold mb-2">
                    {author?.name || 'Anonymous'}
                  </h3>
                  {author?.about && (
                    <p className="text-muted-foreground text-sm mb-4">
                      {author.about}
                    </p>
                  )}
                  {user && user.pubkey !== article.pubkey && (
                    <Button variant="outline" size="sm">
                      Follow
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

function ArticleViewSkeleton() {
  return (
    <div className="container max-w-2xl mx-auto px-4 py-12">
      <Skeleton className="h-8 w-3/4 mb-4" />
      <Skeleton className="h-6 w-1/2 mb-8" />
      <div className="flex items-center gap-4 mb-8">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

// Simple markdown renderer
function renderMarkdown(content: string): string {
  return content
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '');
}

export default ArticleView;

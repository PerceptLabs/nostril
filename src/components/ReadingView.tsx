import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  ExternalLink,
  Share2,
  Bookmark,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Quote,
  Loader2,
  MessageSquare,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/useToast";
import { AnnotationsPanel, useTextSelection } from "./annotations/AnnotationsPanel";
import { ZapButton } from "./zaps/ZapButton";
import { BacklinksPanel } from "./editor/BacklinksPanel";
import type { ParsedSave, ParsedAnnotation } from "@/lib/nostril";

interface ReadingViewProps {
  save: ParsedSave;
  className?: string;
}

export function ReadingView({
  save,
  className,
}: ReadingViewProps) {
  const { toast } = useToast();
  const [zoom, setZoom] = useState(1);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [copied, setCopied] = useState(false);
  const { selectedText, handleMouseUp, clearSelection } = useTextSelection();

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/${save.dTag}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({
      title: "Link copied",
      description: "The link has been copied to your clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  }, [save.dTag, toast]);

  const handleCopyContent = useCallback(() => {
    navigator.clipboard.writeText(save.content);
    toast({
      title: "Content copied",
      description: "The content has been copied to your clipboard.",
    });
  }, [save.content, toast]);

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/library">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div className="min-w-0">
                <h1 className="font-semibold truncate max-w-[300px]">
                  {save.title || "Untitled"}
                </h1>
                {save.url && (
                  <a
                    href={save.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary"
                  >
                    {new URL(save.url).hostname}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ZapButton pubkey={save.author.pubkey} eventId={save.id} size="sm" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAnnotations(!showAnnotations)}
                className={cn(showAnnotations && "bg-primary/10")}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Main content area */}
        <div
          className="flex-1 overflow-auto"
          onMouseUp={handleMouseUp}
        >
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            {/* Article header */}
            <div className="mb-8">
              {save.image && (
                <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-6">
                  <img
                    src={save.image}
                    alt={save.title || ""}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <h1 className="text-3xl font-bold mb-4">{save.title}</h1>

              {save.description && (
                <p className="text-lg text-muted-foreground mb-4">
                  {save.description}
                </p>
              )}

              <div className="flex items-center flex-wrap gap-4 text-sm text-muted-foreground">
                <span>Saved {formatDistanceToNow(save.publishedAt, { addSuffix: true })}</span>
                {save.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {save.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Content based on type */}
            <div style={{ fontSize: `${zoom}rem` }}>
              {save.contentType === "link" && save.url && (
                <LinkContent save={save} />
              )}

              {save.contentType === "image" && save.url && (
                <ImageContent save={save} zoom={zoom} />
              )}

              {save.contentType === "pdf" && save.url && (
                <PDFContent save={save} />
              )}

              {save.contentType === "note" && (
                <NoteContent save={save} onCopy={handleCopyContent} />
              )}

              {/* User's notes (for non-note types) */}
              {save.content && save.contentType !== "note" && (
                <Card className="mt-8">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Quote className="h-4 w-4" />
                      My Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <MarkdownContent content={save.content} />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Backlinks */}
            <div className="mt-8 border-t pt-6">
              <BacklinksPanel dTag={save.dTag} />
            </div>
          </div>
        </div>

        {/* Annotations sidebar */}
        {showAnnotations && (
          <aside className="w-80 border-l bg-muted/30 overflow-hidden hidden lg:flex flex-col">
            <AnnotationsPanel
              save={save}
              selectedText={selectedText}
              onClearSelection={clearSelection}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

/**
 * Link content - show iframe or link to original
 */
function LinkContent({ save }: { save: ParsedSave }) {
  const [showIframe, setShowIframe] = useState(false);

  if (!save.url) return null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {showIframe ? (
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2 z-10"
              onClick={() => setShowIframe(false)}
            >
              Close Preview
            </Button>
            <iframe
              src={save.url}
              className="w-full h-[70vh] border-0"
              sandbox="allow-scripts allow-same-origin"
              title={save.title || "Content preview"}
            />
          </div>
        ) : (
          <div className="p-6">
            <div className="prose prose-sm dark:prose-invert max-w-none mb-6">
              {save.content ? (
                <MarkdownContent content={save.content} />
              ) : (
                <p className="text-muted-foreground">
                  No notes saved for this link.
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button asChild>
                <a href={save.url} target="_blank" rel="noopener noreferrer">
                  Open Original
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
              <Button variant="outline" onClick={() => setShowIframe(true)}>
                Preview Here
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Image content
 */
function ImageContent({ save, zoom }: { save: ParsedSave; zoom: number }) {
  if (!save.url) return null;

  return (
    <div className="flex justify-center">
      <img
        src={save.url}
        alt={save.title || ""}
        className="max-w-full rounded-lg shadow-lg cursor-zoom-in"
        style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
        onClick={() => window.open(save.url, "_blank")}
      />
    </div>
  );
}

/**
 * PDF content
 */
function PDFContent({ save }: { save: ParsedSave }) {
  if (!save.url) return null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <iframe
          src={save.url}
          className="w-full h-[80vh] border-0"
          title={save.title || "PDF viewer"}
        />
      </CardContent>
    </Card>
  );
}

/**
 * Note content with markdown rendering
 */
function NoteContent({ save, onCopy }: { save: ParsedSave; onCopy: () => void }) {
  return (
    <Card>
      <CardContent className="p-6 relative">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4"
          onClick={onCopy}
        >
          <Copy className="h-4 w-4" />
        </Button>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <MarkdownContent content={save.content} />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Simple markdown renderer with wikilink support
 */
function MarkdownContent({ content }: { content: string }) {
  // Parse wikilinks: [[title|dTag]]
  const parseContent = (text: string): React.ReactNode[] => {
    const wikilinkRegex = /\[\[([^\]|]+)\|([^\]]+)\]\]/g;
    const parts: (string | { type: "wikilink"; title: string; dTag: string })[] = [];
    let lastIndex = 0;
    let match;

    while ((match = wikilinkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      parts.push({ type: "wikilink", title: match[1], dTag: match[2] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.map((part, i) => {
      if (typeof part === "string") {
        // Simple markdown parsing
        let html = part
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/^### (.*$)/gim, "<h3>$1</h3>")
          .replace(/^## (.*$)/gim, "<h2>$1</h2>")
          .replace(/^# (.*$)/gim, "<h1>$1</h1>")
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em>$1</em>")
          .replace(/`(.*?)`/g, "<code>$1</code>")
          .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-primary underline">$1</a>')
          .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded-lg" />')
          .replace(/^> (.*$)/gim, "<blockquote class='border-l-4 border-primary/30 pl-4 italic'>$1</blockquote>")
          .replace(/^- \[ \] (.*$)/gim, '<div class="flex items-center gap-2"><input type="checkbox" disabled /><span>$1</span></div>')
          .replace(/^- \[x\] (.*$)/gim, '<div class="flex items-center gap-2"><input type="checkbox" checked disabled /><span class="line-through">$1</span></div>')
          .replace(/^- (.*$)/gim, "<li>$1</li>")
          .replace(/^(\d+)\. (.*$)/gim, "<li>$2</li>")
          .replace(/#([a-zA-Z0-9_]+)/g, '<span class="text-primary">#$1</span>')
          .replace(/^---$/gim, "<hr class='border-border my-4' />")
          .replace(/\n/g, "<br />");

        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      } else {
        return (
          <Link
            key={i}
            to={`/${part.dTag}`}
            className="text-primary hover:underline font-medium"
          >
            {part.title}
          </Link>
        );
      }
    });
  };

  return <div>{parseContent(content)}</div>;
}

/**
 * Loading skeleton for reading view
 */
export function ReadingViewSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10" />
            <div>
              <Skeleton className="h-5 w-48 mb-1" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Skeleton className="aspect-video w-full mb-6" />
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-5 w-2/3 mb-8" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  );
}

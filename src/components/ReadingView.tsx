import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { ParsedSave, ParsedAnnotation } from "@/lib/nostril";

interface ReadingViewProps {
  save: ParsedSave;
  annotations?: ParsedAnnotation[];
  onAddAnnotation?: () => void;
  className?: string;
}

export function ReadingView({
  save,
  annotations = [],
  onAddAnnotation,
  className,
}: ReadingViewProps) {
  const [zoom, setZoom] = useState(1);
  const [showAnnotations, setShowAnnotations] = useState(true);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
  };

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
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
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
        <div className="flex-1 overflow-auto">
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

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Saved {formatDistanceToNow(save.publishedAt, { addSuffix: true })}</span>
                {save.tags.length > 0 && (
                  <div className="flex gap-1">
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
            {save.contentType === "link" && save.url && (
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none p-6"
                    style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
                  >
                    {/* In a real implementation, this would load the actual page content */}
                    <div className="text-center py-12">
                      <ExternalLink className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Original content from {new URL(save.url).hostname}
                      </p>
                      <Button asChild>
                        <a href={save.url} target="_blank" rel="noopener noreferrer">
                          Open original
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {save.contentType === "image" && save.url && (
              <div className="flex justify-center">
                <img
                  src={save.url}
                  alt={save.title || ""}
                  className="max-w-full rounded-lg shadow-lg"
                  style={{ transform: `scale(${zoom})` }}
                />
              </div>
            )}

            {save.contentType === "note" && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap">{save.content}</div>
              </div>
            )}

            {/* User's notes */}
            {save.content && save.contentType !== "note" && (
              <Card className="mt-8">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Quote className="h-4 w-4" />
                    My Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert">
                    <div className="whitespace-pre-wrap">{save.content}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Annotations sidebar */}
        {annotations.length > 0 && (
          <aside className="w-80 border-l bg-muted/30 overflow-auto hidden xl:block">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Annotations</h3>
                <Button size="sm" onClick={onAddAnnotation}>
                  Add
                </Button>
              </div>

              <div className="space-y-4">
                {annotations.map((annotation) => (
                  <Card key={annotation.id} className="p-3">
                    {annotation.context && (
                      <blockquote className="text-sm text-muted-foreground border-l-2 border-primary pl-2 mb-2">
                        "{annotation.context}"
                      </blockquote>
                    )}
                    <p className="text-sm">{annotation.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(annotation.publishedAt, { addSuffix: true })}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

/**
 * Annotation form component
 */
interface AnnotationFormProps {
  context?: string;
  onSubmit: (annotation: { context: string; content: string }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function AnnotationForm({
  context,
  onSubmit,
  onCancel,
  isSubmitting,
}: AnnotationFormProps) {
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ context: context || "", content });
  };

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {context && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Selected text:</p>
            <p className="text-sm italic">"{context}"</p>
          </div>
        )}

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add your annotation..."
          className="w-full min-h-[100px] p-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !content.trim()}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Annotation
          </Button>
        </div>
      </form>
    </Card>
  );
}
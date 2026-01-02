import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSave, useBacklinks, useUpdateSave, useAuthor } from "@/hooks/useSaves";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { NoteEditor } from "@/components/editor/NoteEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  ExternalLink,
  Share2,
  Trash2,
  Loader2,
  Save,
  Clock,
  Globe,
  Tag,
} from "lucide-react";
import { cn, formatDistanceToNow } from "@/lib/utils";
import type { ContentType, ParsedSave } from "@/lib/nostril";

// Known route paths that should NOT be treated as save IDs
const KNOWN_PATHS = ["home", "inbox", "library", "collections", "search", "settings", "about", "login", "signup", "index"];

export function Editor() {
  const { dTag } = useParams<{ dTag: string }>();
  const navigate = useNavigate();

  // Redirect if this is a known route path, not a save ID
  useEffect(() => {
    if (dTag && KNOWN_PATHS.includes(dTag)) {
      navigate(`/${dTag}`, { replace: true });
    }
  }, [dTag, navigate]);

  const { data: save, isLoading, error } = useSave(dTag);
  const { data: backlinks } = useBacklinks(dTag);
  const { data: author } = useAuthor(save?.author.pubkey);
  const { updateSave, isPending: isSaving } = useUpdateSave();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState<ContentType>("note");

  // Initialize form with save data
  useEffect(() => {
    if (save) {
      setTitle(save.title || "");
      setContent(save.content || "");
      setContentType(save.contentType);
    }
  }, [save]);

  const handleSave = useCallback(async () => {
    if (!save) return;
    await updateSave(save.dTag, {
      title,
      content,
      contentType,
    });
  }, [save, title, content, contentType, updateSave]);

  const handleShare = useCallback(() => {
    if (save) {
      const url = `${window.location.origin}/${save.dTag}`;
      navigator.clipboard.writeText(url);
      // Show toast
    }
  }, [save]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-8 w-32 mb-4" />
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !save) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Save not found</h2>
            <p className="text-muted-foreground mb-4">
              This save may have been deleted or the link is invalid.
            </p>
            <Button onClick={() => navigate("/library")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Library
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/library")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-semibold truncate max-w-[300px]">
                  {title || save.title || "Untitled"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Last edited {formatDistanceToNow(new Date(), { addSuffix: true })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span className="ml-1 hidden sm:inline">Save</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Share</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main editor */}
            <div className="lg:col-span-3">
              <NoteEditor
                value={content}
                onChange={setContent}
                title={title}
                onTitleChange={setTitle}
                backlinkDTag={save.dTag}
                contentType={contentType}
                onContentTypeChange={setContentType}
                className="h-[calc(100vh-200px)] min-h-[500px]"
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Save info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {save.url && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        Original URL
                      </p>
                      <a
                        href={save.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline break-all"
                      >
                        {new URL(save.url).hostname}
                        <ExternalLink className="h-3 w-3 inline ml-1" />
                      </a>
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Saved
                    </p>
                    <p className="text-sm">
                      {formatDistanceToNow(save.publishedAt, { addSuffix: true })}
                    </p>
                  </div>

                  {save.tags.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        Tags
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {save.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Backlinks */}
              {backlinks && backlinks.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      Linked from ({backlinks.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {backlinks.slice(0, 5).map((link) => (
                      <a
                        key={link.id}
                        href={`/${link.dTag}`}
                        className="block p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <p className="text-sm font-medium line-clamp-1">
                          {link.title || link.url || "Untitled"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(link.publishedAt, { addSuffix: true })}
                        </p>
                      </a>
                    ))}
                    {backlinks.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{backlinks.length - 5} more
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Author */}
              {author?.metadata && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Author</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      {author.metadata.picture && (
                        <img
                          src={author.metadata.picture}
                          alt=""
                          className="w-10 h-10 rounded-full"
                        />
                      )}
                      <div>
                        <p className="font-medium">
                          {author.metadata.display_name || author.metadata.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(save.publishedAt, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Editor;
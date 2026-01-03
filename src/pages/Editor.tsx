import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLocalSave, useLocalBacklinks, useUpdateLocalSave, useDeleteLocalSave } from "@/hooks/useLocalSaves";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/useToast";
import { NoteEditor } from "@/components/editor/NoteEditor";
import { ReadingView, ReadingViewSkeleton } from "@/components/ReadingView";
import { ZapButton } from "@/components/zaps/ZapButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  Edit2,
  Eye,
  MoreHorizontal,
  Download,
  Copy,
  Check,
  FileJson,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { ContentType, ParsedSave } from "@/lib/nostril";

// Known route paths that should NOT be treated as save IDs
const KNOWN_PATHS = ["home", "inbox", "library", "collections", "search", "settings", "about", "login", "signup", "index", "graph"];

export function Editor() {
  const { dTag } = useParams<{ dTag: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useCurrentUser();

  // Redirect if this is a known route path, not a save ID
  useEffect(() => {
    if (dTag && KNOWN_PATHS.includes(dTag)) {
      navigate(`/${dTag}`, { replace: true });
    }
  }, [dTag, navigate]);

  // Local-first hooks - instant reads from IndexedDB
  const { data: localSave, isLoading } = useLocalSave(dTag);
  const { data: backlinksData } = useLocalBacklinks(dTag);
  const error = null; // Local queries don't fail
  const { updateSave, isPending: isSaving } = useUpdateLocalSave();
  const { deleteSave, isPending: isDeleting } = useDeleteLocalSave();

  // Convert LocalSave to ParsedSave-compatible format for existing UI
  const save = useMemo((): ParsedSave | null => {
    if (!localSave) return null;
    return {
      id: localSave.id,
      dTag: localSave.id,
      url: localSave.url,
      title: localSave.title,
      description: localSave.description,
      image: localSave.image,
      contentType: localSave.contentType,
      content: localSave.content,
      tags: localSave.tags,
      refs: localSave.refs,
      publishedAt: new Date(localSave.createdAt),
      author: {
        pubkey: user?.pubkey || "",
        name: undefined,
        picture: undefined,
      },
    };
  }, [localSave, user]);

  // Convert backlinks to ParsedSave format
  const backlinks = useMemo((): ParsedSave[] => {
    if (!backlinksData) return [];
    return backlinksData.map(b => ({
      id: b.id,
      dTag: b.id,
      url: b.url,
      title: b.title,
      description: b.description,
      image: b.image,
      contentType: b.contentType,
      content: b.content,
      tags: b.tags,
      refs: b.refs,
      publishedAt: new Date(b.createdAt),
      author: { pubkey: user?.pubkey || "", name: undefined, picture: undefined },
    }));
  }, [backlinksData, user?.pubkey]);

  const author = save?.author;

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState<ContentType>("note");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check if user owns this save (all local saves are owned by the current user)
  const isOwner = user && localSave;

  // Initialize form with save data
  useEffect(() => {
    if (save) {
      setTitle(save.title || "");
      setContent(save.content || "");
      setContentType(save.contentType);
    }
  }, [save]);

  const handleSave = useCallback(async () => {
    if (!localSave) return;
    try {
      await updateSave({
        id: localSave.id,
        updates: {
          title,
          content,
          contentType,
          tags: localSave.tags,
          refs: localSave.refs,
          url: localSave.url,
          description: localSave.description,
          image: localSave.image,
        },
      });
      toast({
        title: "Saved",
        description: "Your changes have been saved.",
      });
      // No need to invalidate - useLiveQuery auto-updates
    } catch (error) {
      toast({
        title: "Failed to save",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }, [localSave, title, content, contentType, updateSave, toast]);

  const handleDelete = useCallback(async () => {
    if (!localSave) return;
    try {
      await deleteSave(localSave.id);
      toast({
        title: "Deleted",
        description: "The save has been deleted.",
      });
      navigate("/library");
    } catch (error) {
      toast({
        title: "Failed to delete",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }, [localSave, deleteSave, toast, navigate]);

  const handleShare = useCallback(() => {
    if (save) {
      const url = `${window.location.origin}/${save.id}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "Link copied",
        description: "The link has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  }, [save, toast]);

  const handleExportMarkdown = useCallback(() => {
    if (!save) return;
    const markdown = generateMarkdown(save);
    downloadFile(`${save.title || "save"}.md`, markdown, "text/markdown");
    toast({
      title: "Exported",
      description: "Save exported as Markdown.",
    });
  }, [save, toast]);

  const handleExportJSON = useCallback(() => {
    if (!save) return;
    const json = JSON.stringify(save, null, 2);
    downloadFile(`${save.title || "save"}.json`, json, "application/json");
    toast({
      title: "Exported",
      description: "Save exported as JSON.",
    });
  }, [save, toast]);

  const handleCopyContent = useCallback(() => {
    if (save) {
      navigator.clipboard.writeText(save.content);
      toast({
        title: "Content copied",
        description: "The content has been copied to your clipboard.",
      });
    }
  }, [save, toast]);

  if (isLoading) {
    return mode === "view" ? (
      <ReadingViewSkeleton />
    ) : (
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

  // Reading mode
  if (mode === "view") {
    return (
      <div className="relative">
        {/* Mode toggle - floating */}
        <div className="fixed bottom-6 right-6 z-50 flex gap-2">
          {isOwner && (
            <Button onClick={() => setMode("edit")} size="lg" className="shadow-lg">
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="lg" className="shadow-lg">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleShare}>
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Share2 className="h-4 w-4 mr-2" />}
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyContent}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Content
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportMarkdown}>
                <FileText className="h-4 w-4 mr-2" />
                Export Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON}>
                <FileJson className="h-4 w-4 mr-2" />
                Export JSON
              </DropdownMenuItem>
              {isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ReadingView save={save} />

        {/* Delete confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this save?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The save "{save.title || "Untitled"}" will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setMode("view")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-semibold truncate max-w-[300px]">
                  {title || save.title || "Untitled"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Editing • Last saved {formatDistanceToNow(save.publishedAt, { addSuffix: true })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ZapButton pubkey={save.author.pubkey} eventId={save.id} size="sm" />
              <Button variant="outline" size="sm" onClick={() => setMode("view")}>
                <Eye className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">View</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span className="ml-1 hidden sm:inline">Save</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleShare}>
                    {copied ? <Check className="h-4 w-4 mr-2" /> : <Share2 className="h-4 w-4 mr-2" />}
                    Copy Link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportMarkdown}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export Markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportJSON}>
                    <FileJson className="h-4 w-4 mr-2" />
                    Export JSON
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
              {author && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Author</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      {author.picture && (
                        <img
                          src={author.picture}
                          alt=""
                          className="w-10 h-10 rounded-full"
                        />
                      )}
                      <div>
                        <p className="font-medium">
                          {author.name || author.pubkey.slice(0, 12) + "..."}
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

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this save?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The save "{save.title || "Untitled"}" will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Generate markdown export of a save
 */
function generateMarkdown(save: ParsedSave): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${save.title || "Untitled"}`);
  lines.push("");

  // Metadata
  if (save.url) {
    lines.push(`> Source: [${save.url}](${save.url})`);
    lines.push("");
  }

  if (save.description) {
    lines.push(`> ${save.description}`);
    lines.push("");
  }

  if (save.tags.length > 0) {
    lines.push(`Tags: ${save.tags.map((t) => `#${t}`).join(" ")}`);
    lines.push("");
  }

  lines.push(`Saved: ${save.publishedAt.toISOString()}`);
  lines.push("");

  lines.push("---");
  lines.push("");

  // Content
  lines.push(save.content);

  return lines.join("\n");
}

/**
 * Download content as a file
 */
function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default Editor;

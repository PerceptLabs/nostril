import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useArticle, useCreateArticle, useUpdateArticle, usePublishArticle } from "@/hooks/useArticles";
import { useToast } from "@/hooks/useToast";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Eye,
  Save,
  Send,
  Settings,
  Image as ImageIcon,
  Plus,
  X,
  Loader2,
  Clock,
  Lock,
  Zap,
  ArrowLeft,
} from "lucide-react";
import { generateSlug, calculateReadingTime } from "@/lib/article";
import { cn } from "@/lib/utils";

export function ArticleEditor() {
  const { dTag } = useParams<{ dTag: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: existingArticle, isLoading } = useArticle(dTag);
  const { createArticle, isPending: isCreating } = useCreateArticle();
  const { updateArticle, isPending: isUpdating } = useUpdateArticle();
  const { publishArticle, isPending: isPublishing } = usePublishArticle();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  // Paywall settings
  const [paywallEnabled, setPaywallEnabled] = useState(false);
  const [paywallPrice, setPaywallPrice] = useState(1000);
  const [paywallPreviewLength, setPaywallPreviewLength] = useState(500);

  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();

  // Calculate stats
  const wordCount = useMemo(() => {
    return content.split(/\s+/).filter(Boolean).length;
  }, [content]);

  const readingTime = useMemo(() => {
    return calculateReadingTime(content);
  }, [content]);

  // Initialize form with existing article data
  useEffect(() => {
    if (existingArticle) {
      setTitle(existingArticle.title || "");
      setSummary(existingArticle.summary || "");
      setContent(existingArticle.content || "");
      setImage(existingArticle.image || "");
      setTags(existingArticle.tags || []);
      setPaywallEnabled(existingArticle.paywallEnabled || false);
      setPaywallPrice(existingArticle.paywallPrice || 1000);
      setPaywallPreviewLength(existingArticle.paywallPreviewLength || 500);
    }
  }, [existingArticle]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      if (title || content) {
        handleSaveDraft();
      }
    }, 30000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [title, content]);

  const handleSaveDraft = useCallback(async () => {
    try {
      if (existingArticle) {
        await updateArticle({
          id: existingArticle.id,
          updates: {
            title,
            summary,
            content,
            image,
            tags,
            paywallEnabled,
            paywallPrice,
            paywallPreviewLength,
            status: 'draft',
          },
        });
      } else {
        const slug = generateSlug(title || "untitled");
        await createArticle({
          id: slug,
          title,
          summary,
          content,
          image,
          tags,
          status: 'draft',
          paywallEnabled,
          paywallPrice,
          paywallPreviewLength,
        });
        // Navigate to the new article
        navigate(`/write/${slug}`, { replace: true });
      }

      setLastSaved(new Date());
      toast({
        title: "Saved",
        description: "Draft has been saved.",
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [existingArticle, title, summary, content, image, tags, paywallEnabled, paywallPrice, paywallPreviewLength, createArticle, updateArticle, navigate, toast]);

  const handlePublish = useCallback(async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Missing information",
        description: "Please add a title and content before publishing.",
        variant: "destructive",
      });
      return;
    }

    try {
      let articleId = existingArticle?.id;

      // Save or update first
      if (existingArticle) {
        await updateArticle({
          id: existingArticle.id,
          updates: {
            title,
            summary,
            content,
            image,
            tags,
            paywallEnabled,
            paywallPrice,
            paywallPreviewLength,
          },
        });
      } else {
        const slug = generateSlug(title);
        await createArticle({
          id: slug,
          title,
          summary,
          content,
          image,
          tags,
          status: 'draft',
          paywallEnabled,
          paywallPrice,
          paywallPreviewLength,
        });
        articleId = slug;
      }

      // Publish to Nostr
      if (articleId) {
        await publishArticle(articleId);
        toast({
          title: "Published!",
          description: "Your article is now live on Nostr.",
        });
        navigate(`/article/${articleId}`);
      }
    } catch (error) {
      toast({
        title: "Publish failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }

    setShowPublishDialog(false);
  }, [existingArticle, title, summary, content, image, tags, paywallEnabled, paywallPrice, paywallPreviewLength, createArticle, updateArticle, publishArticle, navigate, toast]);

  const handleAddTag = useCallback(() => {
    const tag = newTag.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag("");
    }
  }, [newTag, tags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTags(tags.filter(t => t !== tag));
  }, [tags]);

  const isPending = isCreating || isUpdating || isPublishing;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-12 w-full bg-muted rounded" />
            <div className="h-[400px] w-full bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top toolbar */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/articles')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            {lastSaved && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="h-4 w-4 mr-1" />
              {showPreview ? 'Edit' : 'Preview'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isPending}
            >
              <Save className="h-4 w-4 mr-1" />
              Save Draft
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-1" />
                  Settings
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Article Settings</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 py-6">
                  {/* Cover Image */}
                  <div className="space-y-2">
                    <Label>Cover Image URL</Label>
                    <Input
                      placeholder="https://..."
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                    />
                  </div>

                  {/* Summary */}
                  <div className="space-y-2">
                    <Label>Summary</Label>
                    <Textarea
                      placeholder="A brief description for previews..."
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      {summary.length}/500
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {tags.map(tag => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="gap-1 cursor-pointer"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          #{tag}
                          <X className="h-3 w-3" />
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a tag..."
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                      />
                      <Button variant="outline" size="icon" onClick={handleAddTag}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Paywall Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Paywall</Label>
                        <p className="text-xs text-muted-foreground">
                          Charge readers to access full content
                        </p>
                      </div>
                      <Switch
                        checked={paywallEnabled}
                        onCheckedChange={setPaywallEnabled}
                      />
                    </div>

                    {paywallEnabled && (
                      <div className="space-y-4 pl-4 border-l-2">
                        <div className="space-y-2">
                          <Label>Price (sats)</Label>
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            <Input
                              type="number"
                              min={1}
                              value={paywallPrice}
                              onChange={(e) => setPaywallPrice(parseInt(e.target.value) || 1000)}
                              className="w-32"
                            />
                            <span className="text-sm text-muted-foreground">
                              ≈ ${((paywallPrice || 0) * 0.0004).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Free Preview Length</Label>
                          <Select
                            value={String(paywallPreviewLength)}
                            onValueChange={(v) => setPaywallPreviewLength(parseInt(v))}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="250">~1 paragraph</SelectItem>
                              <SelectItem value="500">~2 paragraphs</SelectItem>
                              <SelectItem value="1000">~4 paragraphs</SelectItem>
                              <SelectItem value="2000">~8 paragraphs</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Button
              onClick={() => setShowPublishDialog(true)}
              disabled={isPending || !title.trim() || !content.trim()}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Publish
            </Button>
          </div>
        </div>
      </header>

      {/* Editor area */}
      <main className="container max-w-4xl mx-auto px-4 py-8">
        {/* Title */}
        <Input
          placeholder="Article title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-4xl font-serif font-bold border-0 px-0 focus-visible:ring-0 mb-6"
        />

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
          <span>{wordCount} words</span>
          <span>·</span>
          <span>{readingTime} min read</span>
          {paywallEnabled && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1 text-yellow-600">
                <Lock className="h-3 w-3" />
                {paywallPrice} sats
              </span>
            </>
          )}
        </div>

        {/* Content */}
        {showPreview ? (
          <article className="prose prose-lg dark:prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
          </article>
        ) : (
          <MarkdownEditor
            value={content}
            onChange={setContent}
            placeholder="Start writing your article..."
            height="calc(100vh - 400px)"
            className="min-h-[60vh]"
          />
        )}
      </main>

      {/* Publish confirmation dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Article?</DialogTitle>
            <DialogDescription>
              This will publish your article to Nostr. You can still edit it after publishing.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Title:</span>
              <span className="font-medium">{title}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Words:</span>
              <span>{wordCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tags:</span>
              <span>{tags.length > 0 ? tags.join(', ') : 'None'}</span>
            </div>
            {paywallEnabled && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paywall:</span>
                <span className="text-yellow-600">{paywallPrice} sats</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePublish} disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Publish Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

export default ArticleEditor;

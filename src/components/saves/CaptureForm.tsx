import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  X,
  Globe,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  Loader2,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Lock,
  Users,
} from "lucide-react";
import { VisibilitySelector } from "@/components/sync/VisibilitySelector";
import { cn } from "@/lib/utils";
import type { ContentType, CaptureData } from "@/lib/nostril";
import type { Visibility } from "@/lib/storage";
import { extractMetadata as fetchMetadata, detectContentType, type ExtractedMetadata } from "@/lib/metadata";

const captureSchema = z.object({
  url: z.string().url().optional().or(z.literal("")),
  title: z.string().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  contentType: z.enum(["link", "image", "pdf", "note"]),
  tags: z.array(z.string()),
  visibility: z.enum(["private", "shared", "unlisted", "public"]),
});

type CaptureFormData = z.infer<typeof captureSchema>;

interface CaptureFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit?: (data: CaptureData) => void;
  initialUrl?: string;
  isSubmitting?: boolean;
}

const contentTypes: { value: ContentType; label: string; icon: React.ReactNode }[] = [
  { value: "link", label: "Link", icon: <LinkIcon className="h-4 w-4" /> },
  { value: "image", label: "Image", icon: <ImageIcon className="h-4 w-4" /> },
  { value: "pdf", label: "PDF", icon: <FileText className="h-4 w-4" /> },
  { value: "note", label: "Note", icon: <Globe className="h-4 w-4" /> },
];

export function CaptureForm({
  open = true,
  onOpenChange,
  onSubmit,
  initialUrl,
  isSubmitting = false,
}: CaptureFormProps) {
  const [newTag, setNewTag] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedMetadata, setExtractedMetadata] = useState<ExtractedMetadata | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const form = useForm<CaptureFormData>({
    resolver: zodResolver(captureSchema),
    defaultValues: {
      url: initialUrl || "",
      title: "",
      description: "",
      content: "",
      contentType: initialUrl ? detectContentType(initialUrl) : "note",
      tags: [],
      visibility: "private",
    },
  });

  const { setValue, watch, handleSubmit, formState: { errors } } = form;
  const watchedUrl = watch("url");
  const watchedContentType = watch("contentType");
  const watchedTags = watch("tags");
  const watchedVisibility = watch("visibility");

  // Debounced metadata extraction when URL changes
  useEffect(() => {
    if (!watchedUrl || watchedContentType === "note") {
      setExtractedMetadata(null);
      setExtractError(null);
      return;
    }

    // Validate URL
    try {
      new URL(watchedUrl);
    } catch {
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const timeoutId = setTimeout(() => {
      extractMetadataFromUrl(watchedUrl);
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [watchedUrl, watchedContentType]);

  // Auto-detect content type from URL
  useEffect(() => {
    if (watchedUrl && watchedContentType !== "note") {
      try {
        const detected = detectContentType(watchedUrl);
        if (detected !== watchedContentType) {
          setValue("contentType", detected);
        }
      } catch {
        // Invalid URL, ignore
      }
    }
  }, [watchedUrl]);

  const extractMetadataFromUrl = useCallback(async (url: string) => {
    setIsExtracting(true);
    setExtractError(null);

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const metadata = await fetchMetadata(url, {
        timeout: 15000,
        signal: abortControllerRef.current.signal,
      });

      setExtractedMetadata(metadata);

      // Auto-fill title if empty
      if (metadata.title && !form.getValues("title")) {
        setValue("title", metadata.title);
      }

      // Auto-fill description if empty
      if (metadata.description && !form.getValues("description")) {
        setValue("description", metadata.description);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error("Failed to extract metadata:", error);
        setExtractError("Could not extract metadata from this URL");
      }
    } finally {
      setIsExtracting(false);
    }
  }, [form, setValue]);

  const handleRefreshMetadata = useCallback(() => {
    if (watchedUrl) {
      setExtractedMetadata(null);
      extractMetadataFromUrl(watchedUrl);
    }
  }, [watchedUrl, extractMetadataFromUrl]);

  const handleAddTag = useCallback(() => {
    if (newTag.trim() && !watchedTags.includes(newTag.trim().toLowerCase())) {
      setValue("tags", [...watchedTags, newTag.trim().toLowerCase()]);
      setNewTag("");
    }
  }, [newTag, watchedTags, setValue]);

  const handleRemoveTag = useCallback((tag: string) => {
    setValue("tags", watchedTags.filter((t) => t !== tag));
  }, [watchedTags, setValue]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.target === document.activeElement) {
      e.preventDefault();
      handleAddTag();
    }
  };

  const onFormSubmit = handleSubmit((data) => {
    onSubmit?.({
      url: data.url || undefined,
      title: data.title || extractedMetadata?.title,
      description: data.description || extractedMetadata?.description,
      image: extractedMetadata?.image,
      contentType: data.contentType,
      content: data.content || "",
      tags: data.tags,
      refs: [],
      visibility: data.visibility,
    });
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Capture Content
          </DialogTitle>
          <DialogDescription>
            Save links, images, PDFs, or quick notes to your library
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onFormSubmit} className="space-y-6">
          {/* Content type selector */}
          <div className="flex gap-2">
            {contentTypes.map((type) => (
              <Button
                key={type.value}
                type="button"
                variant={watchedContentType === type.value ? "default" : "outline"}
                size="sm"
                onClick={() => setValue("contentType", type.value)}
                className="flex-1 gap-1.5"
              >
                {type.icon}
                {type.label}
              </Button>
            ))}
          </div>

          {/* URL input */}
          {watchedContentType !== "note" && (
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  placeholder="https://example.com/article"
                  value={watchedUrl}
                  onChange={(e) => {
                    setValue("url", e.target.value);
                    setExtractedMetadata(null);
                  }}
                  className="flex-1"
                />
                {watchedUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleRefreshMetadata}
                    disabled={isExtracting}
                    title="Refresh metadata"
                  >
                    <RefreshCw className={cn("h-4 w-4", isExtracting && "animate-spin")} />
                  </Button>
                )}
              </div>
              {errors.url && (
                <p className="text-sm text-destructive">{errors.url.message}</p>
              )}
              {isExtracting && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting metadata from page...
                </div>
              )}
              {extractError && (
                <p className="text-sm text-amber-500">{extractError}</p>
              )}
            </div>
          )}

          {/* Metadata preview */}
          {extractedMetadata && (
            <Card className="bg-muted/50 overflow-hidden">
              <CardContent className="p-0">
                {extractedMetadata.image && (
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img
                      src={extractedMetadata.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {extractedMetadata.title && (
                        <p className="font-medium truncate">{extractedMetadata.title}</p>
                      )}
                      {extractedMetadata.siteName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          {extractedMetadata.siteName}
                        </p>
                      )}
                    </div>
                    {extractedMetadata.favicon && (
                      <img
                        src={extractedMetadata.favicon}
                        alt=""
                        className="h-6 w-6 rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                  {extractedMetadata.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {extractedMetadata.description}
                    </p>
                  )}
                  {extractedMetadata.author && (
                    <p className="text-xs text-muted-foreground">
                      By {extractedMetadata.author}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder={
                extractedMetadata?.title || (watchedContentType === "link" ? "Article title" : "Note title")
              }
              value={watch("title")}
              onChange={(e) => setValue("title", e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder={extractedMetadata?.description || "Add a description..."}
              className="resize-none"
              rows={2}
              value={watch("description")}
              onChange={(e) => setValue("description", e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="content">Notes</Label>
            <Textarea
              id="content"
              placeholder="Add your notes, thoughts, or annotations..."
              className="resize-none min-h-[100px]"
              value={watch("content")}
              onChange={(e) => setValue("content", e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {watchedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="gap-1 cursor-pointer hover:bg-destructive/20"
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
                onKeyDown={handleKeyDown}
                onBlur={handleAddTag}
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>Visibility</Label>
            <VisibilitySelector
              value={watchedVisibility as Visibility}
              onChange={(v) => setValue("visibility", v)}
            />
            <p className="text-xs text-muted-foreground">
              {watchedVisibility === "private" && "Only you can see this save"}
              {watchedVisibility === "shared" && "Share with specific people"}
              {watchedVisibility === "unlisted" && "Anyone with the link can view"}
              {watchedVisibility === "public" && "Visible to everyone on Nostr"}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

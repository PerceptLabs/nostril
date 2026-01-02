import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentType, CaptureData } from "@/lib/nostril";

const captureSchema = z.object({
  url: z.string().url().optional().or(z.literal("")),
  title: z.string().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  contentType: z.enum(["link", "image", "pdf", "note"]),
  tags: z.array(z.string()),
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
  const [extractedMetadata, setExtractedMetadata] = useState<{
    title?: string;
    description?: string;
    image?: string;
  } | null>(null);

  const form = useForm<CaptureFormData>({
    resolver: zodResolver(captureSchema),
    defaultValues: {
      url: initialUrl || "",
      title: "",
      description: "",
      content: "",
      contentType: initialUrl ? "link" : "note",
      tags: [],
    },
  });

  const { setValue, watch, handleSubmit, formState: { errors } } = form;
  const watchedUrl = watch("url");
  const watchedContentType = watch("contentType");
  const watchedTags = watch("tags");

  // Auto-extract metadata when URL changes
  useEffect(() => {
    if (watchedUrl && watchedContentType === "link") {
      extractMetadata(watchedUrl);
    }
  }, [watchedUrl]);

  const extractMetadata = useCallback(async (url: string) => {
    setIsExtracting(true);
    try {
      // In a real implementation, this would fetch the page and extract metadata
      // For now, we'll simulate with a timeout and basic parsing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Basic URL-based extraction
      const hostname = new URL(url).hostname;
      setExtractedMetadata({
        title: hostname,
        description: `Saved from ${hostname}`,
        image: undefined,
      });
    } catch (error) {
      console.error("Failed to extract metadata:", error);
    } finally {
      setIsExtracting(false);
    }
  }, []);

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
    });
  });

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
              <Input
                id="url"
                placeholder="https://example.com/article"
                {...register("url")}
                onChange={(e) => {
                  setValue("url", e.target.value);
                  setExtractedMetadata(null);
                }}
              />
              {errors.url && (
                <p className="text-sm text-destructive">{errors.url.message}</p>
              )}
              {isExtracting && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting metadata...
                </div>
              )}
            </div>
          )}

          {/* Metadata preview */}
          {extractedMetadata && (
            <Card className="bg-muted/50">
              <CardContent className="p-4 space-y-2">
                {extractedMetadata.image && (
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                    <img
                      src={extractedMetadata.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {extractedMetadata.title && (
                  <p className="font-medium">{extractedMetadata.title}</p>
                )}
                {extractedMetadata.description && (
                  <p className="text-sm text-muted-foreground">
                    {extractedMetadata.description}
                  </p>
                )}
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
              {...register("title")}
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
              {...register("description")}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="content">Notes</Label>
            <Textarea
              id="content"
              placeholder="Add your notes, thoughts, or annotations..."
              className="resize-none min-h-[100px]"
              {...register("content")}
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
                onKeyDown={handleKeyDown}
                onBlur={handleAddTag}
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
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

// Helper to register form fields
function register(name: keyof CaptureFormData) {
  return { name, id: name };
}
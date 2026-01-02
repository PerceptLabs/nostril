import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentType } from "@/lib/nostril";

interface QuickNoteProps {
  onSubmit?: (content: string, tags: string[]) => void;
  isSubmitting?: boolean;
  className?: string;
}

export function QuickNote({ onSubmit, isSubmitting, className }: QuickNoteProps) {
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAddTag = () => {
    const tag = newTag.trim().replace(/^#/, "").toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = () => {
    if (content.trim() || tags.length > 0) {
      onSubmit?.(content, tags);
      setContent("");
      setTags([]);
      setIsExpanded(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        className={cn("w-full justify-start text-muted-foreground", className)}
        onClick={() => setIsExpanded(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Quick capture... (⌘+Enter to save)
      </Button>
    );
  }

  return (
    <div className={cn("border rounded-lg p-4 space-y-3 bg-card", className)}>
      <Textarea
        placeholder="Capture a thought, idea, or note..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        className="min-h-[80px] resize-none border-0 p-0 focus:ring-0"
        autoFocus
      />

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
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
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Add tags..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTag();
              }
              if (e.key === "Backspace" && !newTag && tags.length > 0) {
                handleRemoveTag(tags[tags.length - 1]);
              }
            }}
            className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(false)}
        >
          <X className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || (!content.trim() && tags.length === 0)}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
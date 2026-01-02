import { useCallback, useState, useRef } from "react";
import { MarkdownEditor } from "./MarkdownEditor";
import { EditorToolbar } from "./EditorToolbar";
import { SlashCommandPalette, useSlashCommand } from "./SlashCommandPalette";
import { WikilinkAutocomplete } from "./WikilinkAutocomplete";
import { BacklinksPanel } from "./BacklinksPanel";
import { Card } from "@/components/ui/card";
import { useUploadFile } from "@/hooks/useUploadFile";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import type { ContentType } from "@/lib/nostril";
import { Link } from "react-router-dom";

interface NoteEditorProps {
  value: string;
  onChange: (value: string) => void;
  title?: string;
  onTitleChange?: (title: string) => void;
  backlinkDTag?: string;
  contentType?: ContentType;
  onContentTypeChange?: (type: ContentType) => void;
  className?: string;
  placeholder?: string;
  onInsert?: (template: string) => void;
  onRefsChange?: (refs: string[]) => void;
}

export function NoteEditor({
  value,
  onChange,
  title,
  onTitleChange,
  backlinkDTag,
  contentType = "note",
  onContentTypeChange,
  className,
  placeholder,
  onInsert,
  onRefsChange,
}: NoteEditorProps) {
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("split");
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashPosition, setSlashPosition] = useState<{ top: number; left: number } | null>(null);
  const [wikilinkOpen, setWikilinkOpen] = useState(false);
  const [wikilinkPosition, setWikilinkPosition] = useState<{ top: number; left: number } | null>(null);
  const [wikilinkQuery, setWikilinkQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { toast } = useToast();

  // Handle slash command trigger
  useSlashCommand((position) => {
    setSlashPosition(position);
    setSlashOpen(true);
  });

  // Handle insert from toolbar or slash commands
  const handleInsert = useCallback(
    (template: string) => {
      onInsert?.(template);
      setSlashOpen(false);
    },
    [onInsert]
  );

  // Insert template at end of content
  const handleTemplateInsert = useCallback(
    (template: string) => {
      const newValue = value.endsWith("\n") ? value + template : value + "\n" + template;
      onChange(newValue);
    },
    [value, onChange]
  );

  // Handle wikilink selection
  const handleWikilinkSelect = useCallback(
    (dTag: string, linkTitle: string) => {
      // Insert wikilink at current position
      const wikilink = `[[${linkTitle}|${dTag}]]`;
      handleTemplateInsert(wikilink);

      // Update refs
      const currentRefs = extractWikilinks(value);
      if (!currentRefs.includes(dTag)) {
        onRefsChange?.([...currentRefs, dTag]);
      }

      setWikilinkOpen(false);
      setWikilinkQuery("");
    },
    [value, handleTemplateInsert, onRefsChange]
  );

  // Handle image upload
  const handleImageUpload = useCallback(
    async (file: File) => {
      try {
        toast({
          title: "Uploading...",
          description: `Uploading ${file.name}`,
        });

        const tags = await uploadFile(file);

        // Find the URL from the tags
        const urlTag = tags.find((t) => t[0] === "url");
        if (urlTag) {
          const imageMarkdown = `![${file.name}](${urlTag[1]})`;
          handleTemplateInsert(imageMarkdown);
          toast({
            title: "Uploaded",
            description: "Image added to your note.",
          });
        }
      } catch (error) {
        toast({
          title: "Upload failed",
          description: (error as Error).message,
          variant: "destructive",
        });
      }
    },
    [uploadFile, handleTemplateInsert, toast]
  );

  // Handle file input change
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleImageUpload(file);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleImageUpload]
  );

  // Trigger file picker
  const triggerImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle slash command selection
  const handleSlashCommand = useCallback(
    (commandId: string, commandValue?: string) => {
      switch (commandId) {
        case "text":
          break;
        case "heading1":
          handleTemplateInsert("# ");
          break;
        case "heading2":
          handleTemplateInsert("## ");
          break;
        case "heading3":
          handleTemplateInsert("### ");
          break;
        case "link":
          handleTemplateInsert("[link text](url)");
          break;
        case "image":
          triggerImageUpload();
          break;
        case "wikilink":
          setWikilinkPosition(slashPosition);
          setWikilinkOpen(true);
          break;
        case "bullet":
          handleTemplateInsert("- ");
          break;
        case "numbered":
          handleTemplateInsert("1. ");
          break;
        case "todo":
          handleTemplateInsert("- [ ] ");
          break;
        case "quote":
          handleTemplateInsert("> ");
          break;
        case "code":
          handleTemplateInsert("```\n\n```");
          break;
        case "tag":
          handleTemplateInsert("#");
          break;
        case "divider":
          handleTemplateInsert("\n---\n");
          break;
      }
      setSlashOpen(false);
    },
    [handleTemplateInsert, triggerImageUpload, slashPosition]
  );

  // Detect [[ for wikilinks
  const handleEditorKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "[") {
        // Check if previous char was also [
        const lastChars = value.slice(-1);
        if (lastChars === "[") {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setWikilinkPosition({ top: rect.top, left: rect.left });
            setWikilinkOpen(true);
            setWikilinkQuery("");
          }
        }
      }
    },
    [value]
  );

  // Update wikilink query as user types
  const handleContentChange = useCallback(
    (newValue: string) => {
      onChange(newValue);

      // If wikilink autocomplete is open, extract query
      if (wikilinkOpen) {
        const match = newValue.match(/\[\[([^\]|]*)$/);
        if (match) {
          setWikilinkQuery(match[1]);
        } else {
          setWikilinkOpen(false);
        }
      }
    },
    [onChange, wikilinkOpen]
  );

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Title input */}
      {onTitleChange && (
        <input
          type="text"
          value={title || ""}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled"
          className="w-full px-4 py-3 text-lg font-semibold border-b bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      )}

      {/* Toolbar */}
      <EditorToolbar
        onInsert={handleInsert}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        contentType={contentType}
        onContentTypeChange={onContentTypeChange}
        onImageUpload={triggerImageUpload}
        isUploading={isUploading}
      />

      {/* Editor area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main editor */}
        <div className={cn("flex-1 overflow-auto", viewMode === "preview" && "hidden")}>
          <MarkdownEditor
            value={value}
            onChange={handleContentChange}
            placeholder={placeholder}
            height="100%"
            theme="dark"
            onKeyDown={handleEditorKeyDown}
          />
        </div>

        {/* Preview */}
        {viewMode !== "edit" && (
          <div className="flex-1 overflow-auto border-l p-4 bg-muted/10">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {title && <h1 className="text-2xl font-bold mb-4">{title}</h1>}
              <PreviewContent content={value} />
            </div>
          </div>
        )}
      </div>

      {/* Slash command palette */}
      <SlashCommandPalette
        open={slashOpen}
        onOpenChange={setSlashOpen}
        onSelect={handleSlashCommand}
        position={slashPosition}
      />

      {/* Wikilink autocomplete */}
      <WikilinkAutocomplete
        open={wikilinkOpen}
        onOpenChange={setWikilinkOpen}
        onSelect={handleWikilinkSelect}
        position={wikilinkPosition}
        query={wikilinkQuery}
      />

      {/* Backlinks panel */}
      {backlinkDTag && (
        <div className="border-t">
          <BacklinksPanel dTag={backlinkDTag} />
        </div>
      )}
    </Card>
  );
}

/**
 * Extract wikilink d-tags from content
 */
function extractWikilinks(content: string): string[] {
  const regex = /\[\[[^\]|]+\|([^\]]+)\]\]/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

/**
 * Simple markdown preview component with wikilink support
 */
function PreviewContent({ content }: { content: string }) {
  // Simple markdown parsing for preview
  const parseMarkdown = (text: string): React.ReactNode[] => {
    // First, extract wikilinks and replace with placeholders
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
        // Parse the string part as markdown
        let html = part
          // Escape HTML
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          // Headers
          .replace(/^### (.*$)/gim, "<h3>$1</h3>")
          .replace(/^## (.*$)/gim, "<h2>$1</h2>")
          .replace(/^# (.*$)/gim, "<h1>$1</h1>")
          // Bold
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          // Italic
          .replace(/\*(.*?)\*/g, "<em>$1</em>")
          // Code
          .replace(/`(.*?)`/g, "<code>$1</code>")
          // Code blocks
          .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
          // Links
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-primary underline">$1</a>')
          // Images
          .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded-lg" />')
          // Blockquotes
          .replace(/^> (.*$)/gim, "<blockquote class='border-l-4 border-primary/30 pl-4 italic'>$1</blockquote>")
          // Unordered lists
          .replace(/^- (.*$)/gim, "<li>$1</li>")
          // Checkboxes
          .replace(/- \[ \] (.*$)/gim, '<li class="list-none"><input type="checkbox" disabled class="mr-2" /> $1</li>')
          .replace(/- \[x\] (.*$)/gim, '<li class="list-none"><input type="checkbox" checked disabled class="mr-2" /> $1</li>')
          // Hashtags
          .replace(/#([a-zA-Z0-9_]+)/g, '<span class="text-primary">#$1</span>')
          // Horizontal rule
          .replace(/^---$/gim, "<hr class='border-border my-4' />")
          // Line breaks
          .replace(/\n/g, "<br />");

        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      } else {
        // Render wikilink
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

  return <div>{parseMarkdown(content)}</div>;
}

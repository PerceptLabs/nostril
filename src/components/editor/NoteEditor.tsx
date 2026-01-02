import { useCallback, useState } from "react";
import { MarkdownEditor } from "./MarkdownEditor";
import { EditorToolbar } from "./EditorToolbar";
import { SlashCommandPalette, useSlashCommand } from "./SlashCommandPalette";
import { BacklinksPanel } from "./BacklinksPanel";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ContentType } from "@/lib/nostril";

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
}: NoteEditorProps) {
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("split");
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashPosition, setSlashPosition] = useState<{ top: number; left: number } | null>(null);

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

  // Insert template at cursor
  const handleTemplateInsert = useCallback(
    (template: string) => {
      onChange(value + "\n" + template);
    },
    [value, onChange]
  );

  // Handle slash command selection
  const handleSlashCommand = useCallback(
    (commandId: string, value?: string) => {
      switch (commandId) {
        case "text":
          handleTemplateInsert("");
          break;
        case "heading1":
          handleTemplateInsert("# ");
          break;
        case "heading2":
          handleTemplateInsert("## ");
          break;
        case "link":
          handleTemplateInsert("[](url)");
          break;
        case "image":
          handleTemplateInsert("![alt](url)");
          break;
        case "bullet":
          handleTemplateInsert("- ");
          break;
        case "todo":
          handleTemplateInsert("- [ ] ");
          break;
        case "quote":
          handleTemplateInsert("> ");
          break;
        case "tag":
          handleTemplateInsert("#tag ");
          break;
      }
    },
    [handleTemplateInsert]
  );

  return (
    <Card className={cn("flex flex-col h-full", className)}>
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
      />

      {/* Editor area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main editor */}
        <div className={cn("flex-1 overflow-auto", viewMode === "preview" && "hidden")}>
          <MarkdownEditor
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            height="100%"
            theme="dark"
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
 * Simple markdown preview component
 */
function PreviewContent({ content }: { content: string }) {
  // Simple markdown parsing for preview
  const parseMarkdown = (text: string): { __html: string } => {
    let html = text
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
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded-lg" />')
      // Blockquotes
      .replace(/^> (.*$)/gim, "<blockquote>$1</blockquote>")
      // Unordered lists
      .replace(/^- (.*$)/gim, "<li>$1</li>")
      // Checkboxes
      .replace(/- \[ \] (.*$)/gim, '<input type="checkbox" disabled /> $1')
      .replace(/- \[x\] (.*$)/gim, '<input type="checkbox" checked disabled /> $1')
      // Paragraphs
      .replace(/\n\n/g, "</p><p>")
      // Line breaks
      .replace(/\n/g, "<br />");

    return { __html: `<p>${html}</p>` };
  };

  return <div dangerouslySetInnerHTML={parseMarkdown(content)} />;
}
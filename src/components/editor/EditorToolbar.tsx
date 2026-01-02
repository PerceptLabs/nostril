import { useCallback } from "react";
import {
  Bold,
  Italic,
  Link,
  Image,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  Eye,
  Split,
  Edit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ContentType } from "@/lib/nostril";

interface EditorToolbarProps {
  onInsert: (template: string) => void;
  viewMode: "edit" | "preview" | "split";
  onViewModeChange: (mode: "edit" | "preview" | "split") => void;
  contentType: ContentType;
  onContentTypeChange: (type: ContentType) => void;
  className?: string;
}

export function EditorToolbar({
  onInsert,
  viewMode,
  onViewModeChange,
  contentType,
  onContentTypeChange,
  className,
}: EditorToolbarProps) {
  const insert = useCallback(
    (before: string, after: string = "") => {
      onInsert(`${before}selected text${after}`);
    },
    [onInsert]
  );

  const insertBlock = useCallback(
    (template: string) => {
      onInsert(template);
    },
    [onInsert]
  );

  const tools: {
    icon: React.ReactNode;
    label: string;
    action: () => void;
    shortcut?: string;
  }[] = [
    { icon: <Bold className="h-4 w-4" />, label: "Bold", action: () => insert("**", "**"), shortcut: "⌘B" },
    { icon: <Italic className="h-4 w-4" />, label: "Italic", action: () => insert("*", "*"), shortcut: "⌘I" },
    { icon: <Link className="h-4 w-4" />, label: "Link", action: () => insert("[", "](url)") },
    { icon: <Image className="h-4 w-4" />, label: "Image", action: () => insert("![alt](", ")") },
    { icon: <Code className="h-4 w-4" />, label: "Code", action: () => insert("`", "`") },
    { icon: <Quote className="h-4 w-4" />, label: "Quote", action: () => insertBlock("> ") },
    { icon: <List className="h-4 w-4" />, label: "Bullet List", action: () => insertBlock("- ") },
    { icon: <ListOrdered className="h-4 w-4" />, label: "Numbered List", action: () => insertBlock("1. ") },
    { icon: <CheckSquare className="h-4 w-4" />, label: "Task", action: () => insertBlock("- [ ] ") },
    { icon: <Heading1 className="h-4 w-4" />, label: "Heading 1", action: () => insertBlock("# ") },
    { icon: <Heading2 className="h-4 w-4" />, label: "Heading 2", action: () => insertBlock("## ") },
    { icon: <Heading3 className="h-4 w-4" />, label: "Heading 3", action: () => insertBlock("### ") },
  ];

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 p-2 border-b bg-muted/30",
        className
      )}
    >
      {/* Formatting tools */}
      <div className="flex items-center gap-1 flex-wrap">
        {tools.map((tool, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={tool.action}
                className="h-8 w-8 p-0"
              >
                {tool.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {tool.label}
                {tool.shortcut && (
                  <span className="text-muted-foreground ml-1">{tool.shortcut}</span>
                )}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* View mode toggle */}
      <div className="flex items-center gap-1 border rounded-lg p-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={viewMode === "edit" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("edit")}
              className="h-7 px-2"
            >
              <Edit2 className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit only</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={viewMode === "split" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("split")}
              className="h-7 px-2"
            >
              <Split className="h-3.5 w-3.5 mr-1" />
              Split
            </Button>
          </TooltipTrigger>
          <TooltipContent>Split view</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={viewMode === "preview" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("preview")}
              className="h-7 px-2"
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              Preview
            </Button>
          </TooltipTrigger>
          <TooltipContent>Preview only</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
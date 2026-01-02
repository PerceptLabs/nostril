import { useCallback, useEffect, useRef, useState } from "react";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Link,
  Link2,
  Image,
  Tag,
  Quote,
  CheckSquare,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SlashCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (command: string, value?: string) => void;
  position: { top: number; left: number } | null;
}

const commands = [
  {
    group: "Basic Blocks",
    items: [
      { id: "text", label: "Text", icon: FileText, description: "Plain text paragraph" },
      { id: "heading1", label: "Heading 1", icon: Heading1, description: "Large section heading" },
      { id: "heading2", label: "Heading 2", icon: Heading2, description: "Medium section heading" },
      { id: "heading3", label: "Heading 3", icon: Heading3, description: "Small section heading" },
    ],
  },
  {
    group: "Media & Links",
    items: [
      { id: "link", label: "Link", icon: Link, description: "External link to URL" },
      { id: "wikilink", label: "Wikilink", icon: Link2, description: "Link to another save" },
      { id: "image", label: "Image", icon: Image, description: "Upload an image" },
    ],
  },
  {
    group: "Lists",
    items: [
      { id: "bullet", label: "Bullet List", icon: List, description: "Unordered list" },
      { id: "numbered", label: "Numbered List", icon: ListOrdered, description: "Ordered list" },
      { id: "todo", label: "Task List", icon: CheckSquare, description: "Checkable tasks" },
    ],
  },
  {
    group: "Content Blocks",
    items: [
      { id: "quote", label: "Quote", icon: Quote, description: "Blockquote for citations" },
      { id: "code", label: "Code Block", icon: Code, description: "Syntax highlighted code" },
      { id: "divider", label: "Divider", icon: Minus, description: "Horizontal line separator" },
      { id: "tag", label: "Tag", icon: Tag, description: "Add hashtag to note" },
    ],
  },
];

export function SlashCommandPalette({
  open,
  onOpenChange,
  onSelect,
  position,
}: SlashCommandPaletteProps) {
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredCommands = commands.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        item.label.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((group) => group.items.length > 0);

  const handleSelect = useCallback(
    (commandId: string) => {
      onSelect(commandId);
      setSearch("");
      onOpenChange(false);
    },
    [onSelect, onOpenChange]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, onOpenChange]);

  // Focus first item when opened
  useEffect(() => {
    if (open) {
      setSearch("");
    }
  }, [open]);

  if (!open || !position) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-50"
      style={{
        top: position.top + 24,
        left: Math.min(position.left, window.innerWidth - 300),
      }}
    >
      <Command className="w-[300px] rounded-lg border shadow-lg bg-popover">
        <div className="p-2 border-b">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commands..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
        </div>
        <CommandList className="max-h-[300px] overflow-auto p-1">
          {filteredCommands.map((group) => (
            <CommandGroup key={group.group} heading={group.group}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.label}
                  onSelect={() => handleSelect(item.id)}
                  className="flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-md"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          {filteredCommands.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No commands found
            </div>
          )}
        </CommandList>
      </Command>
    </div>
  );
}

/**
 * Hook to detect "/" for slash commands
 */
export function useSlashCommand(
  onCommand: (position: { top: number; left: number } | null) => void
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Get cursor position from selection
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          onCommand({
            top: rect.top,
            left: rect.left,
          });
        }
      }
    },
    [onCommand]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
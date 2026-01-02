import { useCallback, useEffect, useRef, useState } from "react";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Link,
  Image,
  Tag,
  Quote,
  CheckSquare,
  FileText,
  Heading1,
  Heading2,
  List,
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
    group: "Basic",
    items: [
      { id: "text", label: "Text paragraph", icon: FileText, description: "Add plain text" },
      { id: "heading1", label: "Heading 1", icon: Heading1, description: "Big section heading" },
      { id: "heading2", label: "Heading 2", icon: Heading2, description: "Medium section heading" },
    ],
  },
  {
    group: "Media",
    items: [
      { id: "link", label: "Link", icon: Link, description: "Add a link to a URL" },
      { id: "image", label: "Image", icon: Image, description: "Upload or link an image" },
    ],
  },
  {
    group: "Lists",
    items: [
      { id: "bullet", label: "Bullet list", icon: List, description: "Create a bulleted list" },
      { id: "todo", label: "Task list", icon: CheckSquare, description: "Track tasks with checkboxes" },
    ],
  },
  {
    group: "Content",
    items: [
      { id: "quote", label: "Quote", icon: Quote, description: "Highlight quoted text" },
      { id: "tag", label: "Add tag", icon: Tag, description: "Add a tag to this note" },
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
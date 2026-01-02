import { useCallback, useEffect, useRef, useState } from "react";
import { useWikilinkSearch } from "@/hooks/useSaves";
import { Command, CommandInput, CommandList, CommandItem } from "@/components/ui/command";
import { Loader2, Link } from "lucide-react";
import { cn } from "@/lib/utils";

interface WikilinkAutocompleteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (dTag: string, title: string) => void;
  position: { top: number; left: number } | null;
  query: string;
}

export function WikilinkAutocomplete({
  open,
  onOpenChange,
  onSelect,
  position,
  query,
}: WikilinkAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: results, isLoading } = useWikilinkSearch(query);

  const handleSelect = useCallback(
    (dTag: string, title: string) => {
      onSelect(dTag, title);
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
            value={query}
            readOnly
            placeholder="Link to a save..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <CommandList className="max-h-[200px] overflow-auto p-1">
          {isLoading && (
            <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}

          {!isLoading && results && results.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No results found
            </div>
          )}

          {!isLoading &&
            results &&
            results.length > 0 &&
            results.map((result) => (
              <CommandItem
                key={result.dTag}
                value={result.title}
                onSelect={() => handleSelect(result.dTag, result.title)}
                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-md"
              >
                <Link className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{result.title}</p>
                  {result.url && (
                    <p className="text-xs text-muted-foreground truncate">
                      {new URL(result.url).hostname}
                    </p>
                  )}
                </div>
              </CommandItem>
            ))}
        </CommandList>
      </Command>
    </div>
  );
}

/**
 * Hook to detect [[ for wikilink autocomplete
 */
export function useWikilinkDetection(
  onWikilink: (query: string, position: { top: number; left: number } | null) => void
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "[") {
        // Check if there's another [ before (]]
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const textBefore = range.startContainer.textContent?.slice(
            0,
            range.startOffset
          );
          
          // Check if we're starting a wikilink
          if (textBefore && textBefore.endsWith("[[")) {
            const rect = range.getBoundingClientRect();
            const queryStart = textBefore.lastIndexOf("[[", textBefore.length - 2);
            const query = textBefore.slice(queryStart + 2);
            
            onWikilink(query, {
              top: rect.top,
              left: rect.left,
            });
          }
        }
      }
    },
    [onWikilink]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
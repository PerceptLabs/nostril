import { useCallback, useEffect, useRef, useState } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, placeholder, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { oneDark } from "@codemirror/theme-one-dark";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  height?: string;
  theme?: "light" | "dark";
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

/**
 * Minimal theme for CodeMirror
 */
function minimalTheme(colors: { bg: string; fg: string; border: string }) {
  return EditorView.theme({
    "&": {
      backgroundColor: colors.bg,
      color: colors.fg,
      border: `1px solid ${colors.border}`,
      borderRadius: "8px",
      fontSize: "14px",
      lineHeight: "1.6",
    },
    ".cm-content": {
      padding: "12px",
      fontFamily: "inherit",
    },
    ".cm-scroller": {
      overflow: "auto",
      fontFamily: "var(--font-mono, monospace)",
    },
    ".cm-line": {
      padding: "0",
    },
    ".cm-gutters": {
      backgroundColor: colors.bg,
      borderRight: `1px solid ${colors.border}`,
      color: colors.fg,
      opacity: 0.5,
    },
    "&.cm-focused": {
      outline: "none",
      borderColor: "var(--primary)",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(0,0,0,0.05)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(0,0,0,0.05)",
    },
    ".cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "rgba(0,0,0,0.1)",
    },
    ".cm-placeholder": {
      color: "var(--muted-foreground)",
    },
  }, { dark: false });
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder: placeholderText,
  className,
  height = "300px",
  theme = "dark",
  onKeyDown,
}: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) return;

    const colors = {
      bg: "var(--background)",
      fg: "var(--foreground)",
      border: "var(--border)",
    };

    const extensions = [
      lineNumbers(),
      highlightActiveLine(),
      history(),
      bracketMatching(),
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      syntaxHighlighting(defaultHighlightStyle),
      placeholder(placeholderText || "Write your notes in markdown..."),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      }),
      EditorView.theme({
        "&": { height },
        ".cm-scroller": { overflow: "auto" },
      }),
    ];

    // Add theme
    if (theme === "dark") {
      extensions.push(oneDark);
    } else {
      extensions.push(minimalTheme(colors));
    }

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    // Handle focus state
    view.dom.addEventListener("focus", () => setIsFocused(true));
    view.dom.addEventListener("blur", () => setIsFocused(false));

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Update content when value changes externally
  useEffect(() => {
    if (!viewRef.current) return;
    const currentContent = viewRef.current.state.doc.toString();
    if (currentContent !== value) {
      viewRef.current.dispatch({
        changes: { from: 0, to: currentContent.length, insert: value },
      });
    }
  }, [value]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      onKeyDown?.(e);
    },
    [onKeyDown]
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "overflow-hidden transition-all duration-200",
        isFocused && "ring-2 ring-offset-2 ring-primary/20",
        className
      )}
      onKeyDown={handleKeyDown}
    />
  );
}

/**
 * Lightweight editor for quick captures
 */
export function QuickEditor({
  value,
  onChange,
  placeholder: placeholderText,
  className,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onSubmit?: () => void;
}) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        onSubmit?.();
      }
    },
    [onSubmit]
  );

  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholderText || "Add your notes..."}
      className={cn(
        "w-full min-h-[100px] p-3 rounded-lg border bg-background",
        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
        "resize-y text-sm leading-relaxed",
        "placeholder:text-muted-foreground",
        className
      )}
      onKeyDown={handleKeyDown}
    />
  );
}
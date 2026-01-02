import { useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Quote,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAnnotations,
  useCreateAnnotation,
  useDeleteAnnotation,
} from "@/hooks/useAnnotations";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { ParsedAnnotation, ParsedSave } from "@/lib/nostril";

interface AnnotationsPanelProps {
  save: ParsedSave;
  selectedText?: string;
  onClearSelection?: () => void;
  className?: string;
}

export function AnnotationsPanel({
  save,
  selectedText,
  onClearSelection,
  className,
}: AnnotationsPanelProps) {
  const { user } = useCurrentUser();
  const { data: annotations, isLoading } = useAnnotations(save.id);
  const { createAnnotation, isPending: isCreating } = useCreateAnnotation();
  const { deleteAnnotation, isPending: isDeleting } = useDeleteAnnotation();

  const [showForm, setShowForm] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    if (!newContent.trim()) return;

    try {
      await createAnnotation({
        saveId: save.id,
        saveDTag: save.dTag,
        content: newContent.trim(),
        context: selectedText,
      });
      setNewContent("");
      setShowForm(false);
      onClearSelection?.();
    } catch (error) {
      console.error("Failed to create annotation:", error);
    }
  }, [createAnnotation, save, newContent, selectedText, onClearSelection]);

  const handleDelete = useCallback(
    async (annotation: ParsedAnnotation) => {
      try {
        await deleteAnnotation(annotation);
      } catch (error) {
        console.error("Failed to delete annotation:", error);
      }
    },
    [deleteAnnotation]
  );

  const handleStartAnnotation = () => {
    setShowForm(true);
    setNewContent("");
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Annotations</h3>
          {annotations && annotations.length > 0 && (
            <span className="text-sm text-muted-foreground">
              ({annotations.length})
            </span>
          )}
        </div>
        {user && (
          <Button size="sm" onClick={handleStartAnnotation}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        )}
      </div>

      {/* Selected text indicator */}
      {selectedText && (
        <div className="p-3 m-3 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Selected text:</p>
              <p className="text-sm italic line-clamp-3">"{selectedText}"</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={onClearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {!showForm && user && (
            <Button
              size="sm"
              className="mt-2 w-full"
              onClick={handleStartAnnotation}
            >
              <Quote className="h-4 w-4 mr-1" />
              Annotate Selection
            </Button>
          )}
        </div>
      )}

      {/* Create annotation form */}
      {showForm && user && (
        <div className="p-3 m-3 border rounded-lg bg-card">
          {selectedText && (
            <div className="p-2 mb-3 bg-muted rounded text-sm italic">
              "{selectedText}"
            </div>
          )}
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Write your annotation..."
            className="min-h-[100px] mb-3"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setNewContent("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={isCreating || !newContent.trim()}
            >
              {isCreating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Annotations list */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && annotations && annotations.length === 0 && !showForm && (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No annotations yet</p>
            {user && (
              <p className="text-xs mt-1">
                Select text or click Add to create one
              </p>
            )}
          </div>
        )}

        {annotations?.map((annotation) => (
          <AnnotationCard
            key={annotation.id}
            annotation={annotation}
            isOwner={user?.pubkey === annotation.author.pubkey}
            onDelete={() => handleDelete(annotation)}
            isDeleting={isDeleting}
          />
        ))}
      </div>
    </div>
  );
}

interface AnnotationCardProps {
  annotation: ParsedAnnotation;
  isOwner: boolean;
  onDelete: () => void;
  isDeleting: boolean;
}

function AnnotationCard({
  annotation,
  isOwner,
  onDelete,
  isDeleting,
}: AnnotationCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        {annotation.context && (
          <blockquote className="text-sm text-muted-foreground border-l-2 border-primary pl-2 mb-2 italic">
            "{annotation.context}"
          </blockquote>
        )}
        <p className="text-sm whitespace-pre-wrap">{annotation.content}</p>
        <div className="flex items-center justify-between mt-3 pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(annotation.publishedAt, { addSuffix: true })}
          </span>
          {isOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete annotation?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. The annotation will be permanently
                    deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Hook to handle text selection for annotations
 */
export function useTextSelection() {
  const [selectedText, setSelectedText] = useState<string>("");

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() || "";
    if (text.length > 0 && text.length < 1000) {
      setSelectedText(text);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedText("");
    window.getSelection()?.removeAllRanges();
  }, []);

  return {
    selectedText,
    handleMouseUp,
    clearSelection,
  };
}

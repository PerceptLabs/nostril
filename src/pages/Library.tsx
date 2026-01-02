import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSaves, useAllTags, useCreateSave, useDeleteSave, useBacklinkCounts } from "@/hooks/useSaves";
import { useToast } from "@/hooks/useToast";
import { useQueryClient } from "@tanstack/react-query";
import { SaveCard, SaveCardSkeleton } from "@/components/saves/SaveCard";
import { QuickNote } from "@/components/saves/QuickNote";
import { CaptureForm } from "@/components/saves/CaptureForm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Heading,
  X,
  Globe,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewMode, ContentType, CaptureData, ParsedSave } from "@/lib/nostril";

export function Library() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<ContentType | "all">("all");
  const [showCaptureForm, setShowCaptureForm] = useState(false);
  const [isQuickCapture, setIsQuickCapture] = useState(false);

  const { data: saves, isLoading, error } = useSaves({
    search,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    contentType: selectedType !== "all" ? selectedType : undefined,
  });

  const { data: allTags } = useAllTags();
  const { createSave, isPending: isSubmitting } = useCreateSave();
  const { deleteSave, isPending: isDeleting } = useDeleteSave();

  // Get backlink counts for all visible saves
  const dTags = useMemo(() => saves?.map((s) => s.dTag) || [], [saves]);
  const { data: backlinkCounts } = useBacklinkCounts(dTags);

  const handleToggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleQuickCapture = useCallback(
    async (content: string, tags: string[]) => {
      try {
        await createSave({
          url: undefined,
          contentType: "note",
          content,
          tags,
          refs: [],
          title: content.split("\n")[0]?.slice(0, 50) || "Quick note",
        });
        toast({
          title: "Note saved",
          description: "Your quick note has been saved to the library.",
        });
        queryClient.invalidateQueries({ queryKey: ["saves"] });
      } catch (error) {
        toast({
          title: "Failed to save",
          description: (error as Error).message,
          variant: "destructive",
        });
      }
    },
    [createSave, toast, queryClient]
  );

  const handleCaptureSubmit = useCallback(
    async (data: CaptureData) => {
      try {
        await createSave(data);
        setShowCaptureForm(false);
        toast({
          title: "Saved!",
          description: data.title || "Content has been saved to your library.",
        });
        queryClient.invalidateQueries({ queryKey: ["saves"] });
      } catch (error) {
        toast({
          title: "Failed to save",
          description: (error as Error).message,
          variant: "destructive",
        });
      }
    },
    [createSave, toast, queryClient]
  );

  const handleEdit = useCallback(
    (save: ParsedSave) => {
      navigate(`/${save.dTag}`);
    },
    [navigate]
  );

  const handleDelete = useCallback(
    async (save: ParsedSave) => {
      try {
        await deleteSave(save);
        toast({
          title: "Deleted",
          description: `"${save.title || "Save"}" has been deleted.`,
        });
        queryClient.invalidateQueries({ queryKey: ["saves"] });
      } catch (error) {
        toast({
          title: "Failed to delete",
          description: (error as Error).message,
          variant: "destructive",
        });
      }
    },
    [deleteSave, toast, queryClient]
  );

  const handleShare = useCallback(
    (save: ParsedSave) => {
      toast({
        title: "Link copied",
        description: "The link has been copied to your clipboard.",
      });
    },
    [toast]
  );

  const clearFilters = () => {
    setSearch("");
    setSelectedTags([]);
    setSelectedType("all");
  };

  const hasFilters = search || selectedTags.length > 0 || selectedType !== "all";

  const contentTypes: { value: ContentType | "all"; label: string; icon: React.ReactNode }[] = [
    { value: "all", label: "All", icon: <Globe className="h-4 w-4" /> },
    { value: "link", label: "Links", icon: <LinkIcon className="h-4 w-4" /> },
    { value: "image", label: "Images", icon: <ImageIcon className="h-4 w-4" /> },
    { value: "pdf", label: "PDFs", icon: <FileText className="h-4 w-4" /> },
    { value: "note", label: "Notes", icon: <FileText className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Library</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsQuickCapture(!isQuickCapture)}
                className={cn(isQuickCapture && "bg-primary text-primary-foreground")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Quick
              </Button>
              <Button size="sm" onClick={() => setShowCaptureForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add New
              </Button>
            </div>
          </div>

          {/* Quick capture */}
          {isQuickCapture && (
            <QuickNote
              onSubmit={handleQuickCapture}
              isSubmitting={isSubmitting}
            />
          )}

          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search saves..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={selectedType}
              onValueChange={(v) => setSelectedType(v as ContentType | "all")}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {contentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      {type.icon}
                      {type.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tag filters */}
          {allTags && allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allTags.slice(0, 15).map((tag) => (
                <Badge
                  key={tag.name}
                  variant={selectedTags.includes(tag.name) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => handleToggleTag(tag.name)}
                >
                  #{tag.name}
                  {tag.count && <span className="ml-1 opacity-60">{tag.count}</span>}
                </Badge>
              ))}
            </div>
          )}

          {/* Active filters */}
          {hasFilters && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filters:</span>
              {search && (
                <Badge variant="secondary" className="gap-1">
                  "{search}"
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSearch("")} />
                </Badge>
              )}
              {selectedTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  #{tag}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => handleToggleTag(tag)} />
                </Badge>
              ))}
              {selectedType !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {selectedType}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedType("all")} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
                Clear all
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* View toggle */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {saves?.length || 0} item{saves?.length !== 1 ? "s" : ""}
          </p>

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="h-8">
              <TabsTrigger value="grid" className="h-7 px-2">
                <LayoutGrid className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="list" className="h-7 px-2">
                <List className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="headlines" className="h-7 px-2">
                <Heading className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div
            className={cn(
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                : "space-y-3"
            )}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <SaveCardSkeleton key={i} viewMode={viewMode} />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <Card className="p-8 text-center">
            <CardContent className="py-8">
              <p className="text-muted-foreground">
                Failed to load saves. Please check your connection and try again.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && !error && (!saves || saves.length === 0) && (
          <Card className="p-8 text-center">
            <CardContent className="py-8">
              <div className="max-w-sm mx-auto space-y-4">
                <Search className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-semibold">No saves found</h3>
                <p className="text-muted-foreground">
                  {hasFilters
                    ? "Try adjusting your filters or search query"
                    : "Start capturing content to build your library"}
                </p>
                {!hasFilters && (
                  <Button onClick={() => setShowCaptureForm(true)} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add your first save
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Saves grid/list */}
        {!isLoading && !error && saves && saves.length > 0 && (
          <div
            className={cn(
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                : viewMode === "list"
                ? "space-y-3"
                : "space-y-2"
            )}
          >
            {saves.map((save) => (
              <SaveCard
                key={save.id}
                save={save}
                viewMode={viewMode}
                backlinkCount={backlinkCounts?.get(save.dTag) || 0}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onShare={handleShare}
              />
            ))}
          </div>
        )}
      </main>

      {/* Capture form modal */}
      <CaptureForm
        open={showCaptureForm}
        onOpenChange={setShowCaptureForm}
        onSubmit={handleCaptureSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

export default Library;

import { useState, useCallback } from "react";
import { useSaves, useCreateSave } from "@/hooks/useSaves";
import { SaveCard, SaveCardSkeleton } from "@/components/saves/SaveCard";
import { CaptureForm } from "@/components/saves/CaptureForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Inbox,
  Plus,
  Check,
  Archive,
  Tag,
  Clock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentType, CaptureData } from "@/lib/nostril";

export function Inbox() {
  const [showCaptureForm, setShowCaptureForm] = useState(false);
  const [filterType, setFilterType] = useState<ContentType | "all">("all");

  // Get unsorted saves (no tags, recent first)
  const { data: saves, isLoading } = useSaves({
    search: "",
    limit: 20,
  });

  // Filter to untagged items for inbox
  const inboxItems = saves?.filter((s) => s.tags.length === 0) || [];
  const recentItems = saves?.slice(0, 5) || [];

  const { createSave, isPending: isSubmitting } = useCreateSave();

  const handleCaptureSubmit = useCallback(
    async (data: CaptureData) => {
      await createSave(data);
      setShowCaptureForm(false);
    },
    [createSave]
  );

  const handleQuickTag = useCallback(
    async (saveId: string, tag: string) => {
      // This would update the save with a tag
      console.log("Quick tag", saveId, tag);
    },
    []
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Inbox className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Inbox</h1>
                <p className="text-sm text-muted-foreground">
                  {inboxItems.length} uncategorized item{inboxItems.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCaptureForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add to Inbox
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main inbox */}
          <div className="lg:col-span-2 space-y-4">
            <Tabs value={filterType} onValueChange={(v) => setFilterType(v as ContentType | "all")}>
              <TabsList>
                <TabsTrigger value="all" className="gap-1">
                  <Inbox className="h-4 w-4" />
                  All
                </TabsTrigger>
                <TabsTrigger value="link" className="gap-1">
                  Links
                </TabsTrigger>
                <TabsTrigger value="image" className="gap-1">
                  Images
                </TabsTrigger>
                <TabsTrigger value="note" className="gap-1">
                  Notes
                </TabsTrigger>
              </TabsList>

              <TabsContent value={filterType} className="mt-4">
                {isLoading && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <SaveCardSkeleton key={i} viewMode="grid" />
                    ))}
                  </div>
                )}

                {!isLoading && inboxItems.length === 0 && (
                  <Card className="p-8 text-center">
                    <CardContent className="py-8">
                      <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Inbox is empty</h3>
                      <p className="text-muted-foreground mb-4">
                        Add some content to start building your knowledge base
                      </p>
                      <Button onClick={() => setShowCaptureForm(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Inbox
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {!isLoading && inboxItems.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {inboxItems.map((save) => (
                      <InboxCard
                        key={save.id}
                        save={save}
                        onTag={handleQuickTag}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowCaptureForm(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Link
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowCaptureForm(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </CardContent>
            </Card>

            {/* Recent */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentItems.map((save) => (
                  <a
                    key={save.id}
                    href={`/${save.dTag}`}
                    className="block p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <p className="text-sm font-medium line-clamp-1">
                      {save.title || save.url || "Untitled"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {save.tags.length} tags
                    </p>
                  </a>
                ))}
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tips</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>• Use the Quick capture button to add notes fast</p>
                <p>• Add tags to organize content into collections</p>
                <p>• Link notes together with [[wikilinks]]</p>
              </CardContent>
            </Card>
          </div>
        </div>
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

export default Inbox;

/**
 * Inbox item with quick actions
 */
function InboxCard({
  save,
  onTag,
}: {
  save: { id: string; dTag: string; title?: string; url?: string; contentType: ContentType };
  onTag: (saveId: string, tag: string) => void;
}) {
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState("");

  const handleAddTag = () => {
    if (newTag.trim()) {
      onTag(save.id, newTag.trim().toLowerCase());
      setNewTag("");
      setShowTagInput(false);
    }
  };

  return (
    <Card className="group overflow-hidden hover:shadow-md transition-all">
      <a href={`/${save.dTag}`} className="block">
        <div className="aspect-video bg-muted flex items-center justify-center">
          <Inbox className="h-8 w-8 text-muted-foreground" />
        </div>
      </a>
      <CardContent className="p-4">
        <a href={`/${save.dTag}`}>
          <p className="font-medium line-clamp-2 hover:text-primary transition-colors">
            {save.title || save.url || "Untitled"}
          </p>
        </a>

        <div className="flex items-center gap-2 mt-3">
          <Badge variant="outline" className="text-xs">
            {save.contentType}
          </Badge>

          <div className="flex-1" />

          {showTagInput ? (
            <div className="flex items-center gap-1">
              <Input
                placeholder="Tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="h-7 w-20 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddTag();
                  if (e.key === "Escape") setShowTagInput(false);
                }}
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleAddTag}
              >
                <Check className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setShowTagInput(true)}
            >
              <Tag className="h-3 w-3 mr-1" />
              Tag
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
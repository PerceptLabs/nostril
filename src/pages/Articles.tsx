import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useArticles } from "@/hooks/useArticles";
import { useDeleteArticle } from "@/hooks/useArticles";
import { useToast } from "@/hooks/useToast";
import { ArticleCard } from "@/components/ArticleCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Plus,
  FileText,
  Edit,
  Globe,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArticleStatus } from "@/lib/storage";

export function Articles() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ArticleStatus | "all">("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Get articles with filters
  const { data: articles, isLoading } = useArticles({
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    search: search || undefined,
  });

  const { deleteArticle, isPending: isDeleting } = useDeleteArticle();

  // Extract unique tags from articles
  const allTags = useMemo(() => {
    if (!articles) return [];
    const tagSet = new Set<string>();
    articles.forEach(article => {
      article.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [articles]);

  // Filter by status
  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    return articles;
  }, [articles]);

  // Stats
  const stats = useMemo(() => {
    if (!articles) return { all: 0, draft: 0, published: 0 };
    return {
      all: articles.length,
      draft: articles.filter(a => a.status === 'draft').length,
      published: articles.filter(a => a.status === 'published').length,
    };
  }, [articles]);

  const handleToggleTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteArticle(id);
      toast({
        title: "Deleted",
        description: "Article has been deleted.",
      });
    } catch (error) {
      toast({
        title: "Failed to delete",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }, [deleteArticle, toast]);

  const clearFilters = () => {
    setSearch("");
    setSelectedTags([]);
    setSelectedStatus("all");
  };

  const hasFilters = search || selectedTags.length > 0 || selectedStatus !== "all";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">My Articles</h1>
            <Button onClick={() => navigate("/write")}>
              <Plus className="h-4 w-4 mr-1" />
              New Article
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status tabs */}
          <Tabs value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as ArticleStatus | "all")}>
            <TabsList>
              <TabsTrigger value="all" className="gap-2">
                <Globe className="h-4 w-4" />
                All ({stats.all})
              </TabsTrigger>
              <TabsTrigger value="draft" className="gap-2">
                <Edit className="h-4 w-4" />
                Drafts ({stats.draft})
              </TabsTrigger>
              <TabsTrigger value="published" className="gap-2">
                <FileText className="h-4 w-4" />
                Published ({stats.published})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Tag filters */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allTags.slice(0, 10).map(tag => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => handleToggleTag(tag)}
                >
                  #{tag}
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
              {selectedTags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  #{tag}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => handleToggleTag(tag)} />
                </Badge>
              ))}
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
                Clear all
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Loading state */}
        {isLoading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredArticles.length === 0 && (
          <Card className="p-8 text-center">
            <CardContent className="py-8">
              <div className="max-w-sm mx-auto space-y-4">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-semibold">No articles found</h3>
                <p className="text-muted-foreground">
                  {hasFilters
                    ? "Try adjusting your filters or search query"
                    : "Start writing to build your collection"}
                </p>
                {!hasFilters && (
                  <Button onClick={() => navigate("/write")} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Write your first article
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Articles grid */}
        {!isLoading && filteredArticles.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                onEdit={() => navigate(`/write/${article.id}`)}
                onDelete={() => handleDelete(article.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ArticleCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </Card>
  );
}

export default Articles;

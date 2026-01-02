import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSaves, useAllTags } from "@/hooks/useSaves";
import { SaveCard, SaveCardSkeleton } from "@/components/saves/SaveCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  X,
  Filter,
  ArrowUpDown,
  Clock,
  Tag,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewMode, ContentType } from "@/lib/nostril";

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialType = (searchParams.get("type") as ContentType | "all") || "all";
  const initialTags = searchParams.getAll("tag");

  const [query, setQuery] = useState(initialQuery);
  const [selectedType, setSelectedType] = useState<ContentType | "all">(initialType);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [sortBy, setSortBy] = useState<"date" | "relevance">("date");

  const { data: saves, isLoading, error } = useSaves({
    search: query,
    contentType: selectedType !== "all" ? selectedType : undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
  });

  const { data: allTags } = useAllTags();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }
    params.set("type", selectedType);
    selectedTags.forEach((tag) => params.append("tag", tag));
    setSearchParams(params);
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setQuery("");
    setSelectedType("all");
    setSelectedTags([]);
    setSearchParams({});
  };

  const hasFilters = query || selectedType !== "all" || selectedTags.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-muted-foreground" />
            <form onSubmit={handleSearch} className="flex-1">
              <Input
                placeholder="Search your library..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="text-lg h-12"
                autoFocus
              />
            </form>
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={selectedType}
              onValueChange={(v) => setSelectedType(v as ContentType | "all")}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="link">Links</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="pdf">PDFs</SelectItem>
                <SelectItem value="note">Notes</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as "date" | "relevance")}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Newest
                  </span>
                </SelectItem>
                <SelectItem value="relevance">
                  <span className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Relevance
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Tag filters */}
          {allTags && allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allTags.slice(0, 10).map((tag) => (
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
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Searching..."
              : saves
              ? `${saves.length} result${saves.length !== 1 ? "s" : ""}`
              : "No results"}
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SaveCardSkeleton key={i} viewMode="grid" />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <Card className="p-8 text-center">
            <CardContent className="py-8">
              <p className="text-muted-foreground">
                Search failed. Please try again.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && !error && saves && saves.length === 0 && (
          <Card className="p-8 text-center">
            <CardContent className="py-8">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {hasFilters ? "No results found" : "Start searching"}
              </h3>
              <p className="text-muted-foreground">
                {hasFilters
                  ? "Try adjusting your filters or search query"
                  : "Search your library for links, notes, images, and more"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {!isLoading && !error && saves && saves.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {saves.map((save) => (
              <SaveCard
                key={save.id}
                save={save}
                viewMode="grid"
                onEdit={(s) => console.log("Edit", s)}
                onDelete={(s) => console.log("Delete", s)}
                onShare={(s) => console.log("Share", s)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSaves, useAllTags } from "@/hooks/useSaves";
import { QuickNote } from "@/components/saves/QuickNote";
import { CaptureForm } from "@/components/saves/CaptureForm";
import {
  Plus,
  ArrowRight,
  BookOpen,
  Inbox,
  Library,
  Tag,
  Clock,
  TrendingUp,
  Sparkles,
  Search,
  FolderOpen,
} from "lucide-react";
import { cn, formatDistanceToNow } from "@/lib/utils";

export function Index() {
  const [showCaptureForm, setShowCaptureForm] = useState(false);
  const { data: saves, isLoading: savesLoading } = useSaves({ limit: 5 });
  const { data: allTags } = useAllTags();

  const recentSaves = saves || [];
  const topTags = allTags?.slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      {/* Hero section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent" />
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              Decentralized Read-Later for Nostr
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Capture. Organize.{" "}
              <span className="text-primary">Remember.</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Save links, images, PDFs, and notes as signed Nostr events. 
              Everything is portable, verifiable, and shareable with cryptographic attribution.
            </p>

            {/* Quick capture */}
            <div className="max-w-md mx-auto pt-4">
              <QuickNote
                onSubmit={(content, tags) => {
                  console.log("Quick capture:", content, tags);
                }}
              />
            </div>

            <div className="flex items-center justify-center gap-4 pt-4">
              <Button size="lg" asChild>
                <Link to="/library">
                  Open Library
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" onClick={() => setShowCaptureForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold">{recentSaves.length}</p>
              <p className="text-sm text-muted-foreground">Total Saves</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold">{topTags.length}</p>
              <p className="text-sm text-muted-foreground">Tags</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold">
                {recentSaves.filter((s) => s.contentType === "link").length}
              </p>
              <p className="text-sm text-muted-foreground">Links</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold">
                {recentSaves.filter((s) => s.contentType === "note").length}
              </p>
              <p className="text-sm text-muted-foreground">Notes</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Quick access */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Inbox card */}
          <Link to="/inbox" className="group">
            <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
              <CardHeader>
                <div className="p-2 rounded-lg bg-blue-500/10 w-fit mb-2">
                  <Inbox className="h-5 w-5 text-blue-500" />
                </div>
                <CardTitle>Inbox</CardTitle>
                <CardDescription>
                  Quick capture and triage your saves
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{recentSaves.filter((s) => s.tags.length === 0).length} uncategorized</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Library card */}
          <Link to="/library" className="group">
            <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
              <CardHeader>
                <div className="p-2 rounded-lg bg-green-500/10 w-fit mb-2">
                  <Library className="h-5 w-5 text-green-500" />
                </div>
                <CardTitle>Library</CardTitle>
                <CardDescription>
                  Browse and search your entire collection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{recentSaves.length} items</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Collections card */}
          <Link to="/collections" className="group">
            <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
              <CardHeader>
                <div className="p-2 rounded-lg bg-purple-500/10 w-fit mb-2">
                  <FolderOpen className="h-5 w-5 text-purple-500" />
                </div>
                <CardTitle>Collections</CardTitle>
                <CardDescription>
                  Organize saves into lists and folders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>NIP-51 lists</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* Recent saves */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Recent Saves</h2>
          <Button variant="ghost" asChild>
            <Link to="/library">
              View all
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {savesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="space-y-3">
                  <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                  <div className="flex gap-1">
                    <div className="h-5 w-12 bg-muted rounded animate-pulse" />
                    <div className="h-5 w-12 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : recentSaves.length === 0 ? (
          <Card className="p-8 text-center">
            <CardContent className="py-8">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No saves yet</h3>
              <p className="text-muted-foreground mb-4">
                Start building your knowledge base by capturing your first item
              </p>
              <Button onClick={() => setShowCaptureForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add your first save
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentSaves.map((save) => (
              <Link key={save.id} to={`/${save.dTag}`}>
                <Card className="h-full hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <h3 className="font-medium line-clamp-2 mb-1">
                      {save.title || save.url || "Untitled"}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {save.description || save.content?.slice(0, 100)}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {save.contentType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(save.publishedAt, { addSuffix: true })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Top tags */}
      {topTags.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Top Tags</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {topTags.map((tag) => (
              <Link key={tag.name} to={`/library?tag=${tag.name}`}>
                <Badge
                  variant="secondary"
                  className="text-sm py-2 px-4 hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  #{tag.name}
                  <span className="ml-2 opacity-60">{tag.count}</span>
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Capture form modal */}
      <CaptureForm
        open={showCaptureForm}
        onOpenChange={setShowCaptureForm}
        onSubmit={(data) => {
          console.log("Capture:", data);
          setShowCaptureForm(false);
        }}
      />
    </div>
  );
}
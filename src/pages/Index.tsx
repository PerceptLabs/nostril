import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSaves, useAllTags } from "@/hooks/useSaves";
import { QuickNote } from "@/components/saves/QuickNote";
import { CaptureForm } from "@/components/saves/CaptureForm";
import {
  Plus,
  ArrowRight,
  BookOpen,
  Inbox,
  Library,
  Sparkles,
  FolderOpen,
} from "lucide-react";
import { cn, formatDistanceToNow } from "@/lib/utils";
import { useState } from "react";

export default function Index() {
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

      {/* Quick access */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
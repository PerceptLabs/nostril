import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useSaves } from "@/hooks/useSaves";
import { QuickNote } from "@/components/saves/QuickNote";
import { CaptureForm } from "@/components/saves/CaptureForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Inbox,
  Library,
  FolderOpen,
  Search,
  Plus,
  ArrowRight,
  BookOpen,
  Lock,
  ExternalLink,
} from "lucide-react";

interface IndexProps {
  // Add props if needed
}

export default function Index(_?: IndexProps) {
  const [showCaptureForm, setShowCaptureForm] = useState(false);
  const { data: saves, isLoading } = useSaves({ limit: 3 });

  const recentSaves = saves || [];
  const linkCount = recentSaves.filter(s => s.contentType === 'link').length;
  const noteCount = recentSaves.filter(s => s.contentType === 'note').length;
  const otherCount = recentSaves.length - linkCount - noteCount;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent" />
        <div className="container mx-auto px-4 py-20 relative">
          <div className="flex flex-col items-center gap-6">
            {/* Logo */}
            <div className="p-3 rounded-full bg-primary/10 lg:bg-primary/20 mb-8">
              <Sparkles className="h-8 w-8 lg:h-10 text-primary" />
            </div>

            {/* Text content */}
            <div className="text-center space-y-6 max-w-3xl">
              <Badge className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="h-4 w-4" />
                Decentralized Read-Later for Nostr
              </Badge>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Capture. Organize.{" "}
                <span className="text-primary">Remember.</span>
              </h1>

              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                Save links, images, PDFs, and notes as cryptographically-signed Nostr events. 
                Everything is portable, verifiable, and shareable with cryptographic attribution.
              </p>

              {/* Quick capture */}
              <div className="max-w-md mx-auto pt-6 w-full">
                <QuickNote
                  onSubmit={() => {
                    // TODO: Implement quick capture functionality
                  }}
                />
              </div>

              <div className="flex items-center justify-center gap-4 pt-2">
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
        </div>
      </section>

      {/* Quick stats */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold">
                {saves?.length || 0}
              </p>
              <p className="text-sm text-muted-foreground">
                Total Saves
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold">
                {recentSaves.filter((s) => s.contentType === "link").length}
              </p>
              <p className="text-sm text-muted-foreground">
                Links
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold">
                {recentSaves.filter((s) => s.contentType === "note").length}
              </p>
              <p className="text-sm text-muted-foreground">
                Notes
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold">
                {otherCount}
              </p>
              <p className="text-sm text-muted-foreground">
                Other
              </p>
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
                  <span>
                    {recentSaves.filter((s) => s.tags.length === 0).length} uncategorized
                  </span>
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
                  <span>
                    {saves?.length || 0} items
                  </span>
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
                  <span>
                    NIP-51 lists
                  </span>
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
        onSubmit={() => {
          // TODO: Implement capture functionality
          setShowCaptureForm(false);
        }}
      />
    </div>
  );
}
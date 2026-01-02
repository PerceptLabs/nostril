import { useState } from "react";
import { Link } from "react-router-dom";
import { useSaves } from "@/hooks/useSaves";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderOpen,
  Plus,
  MoreHorizontal,
  Globe,
  Lock,
  Share2,
  Settings,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Collection {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  saves: number;
  updatedAt: Date;
  coverImage?: string;
}

const mockCollections: Collection[] = [
  {
    id: "reading",
    name: "Reading List",
    description: "Articles and posts I want to read",
    isPublic: false,
    saves: 12,
    updatedAt: new Date(Date.now() - 86400000),
  },
  {
    id: "research",
    name: "Research",
    description: "Research materials and references",
    isPublic: true,
    saves: 8,
    updatedAt: new Date(Date.now() - 172800000),
  },
  {
    id: "ideas",
    name: "Ideas",
    description: "Ideas and notes for future projects",
    isPublic: false,
    saves: 24,
    updatedAt: new Date(Date.now() - 259200000),
  },
];

function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all">
      <Link to={`/collections/${collection.id}`} className="block">
        <div className="aspect-video bg-muted relative overflow-hidden">
          {collection.coverImage ? (
            <img
              src={collection.coverImage}
              alt=""
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            {collection.isPublic ? (
              <div className="p-1.5 rounded-full bg-green-500/90 text-white">
                <Globe className="h-3 w-3" />
              </div>
            ) : (
              <div className="p-1.5 rounded-full bg-muted/90 text-muted-foreground">
                <Lock className="h-3 w-3" />
              </div>
            )}
          </div>
        </div>
      </Link>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link to={`/collections/${collection.id}`}>
              <h3 className="font-semibold truncate hover:text-primary transition-colors">
                {collection.name}
              </h3>
            </Link>
            {collection.description && (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                {collection.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
          <span>{collection.saves} items</span>
          <span>•</span>
          <span>{formatDistanceToNow(collection.updatedAt, { addSuffix: true })}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function Collections() {
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const filteredCollections = mockCollections.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Collections</h1>
                <p className="text-sm text-muted-foreground">
                  Organize your saves into NIP-51 lists
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Collection
            </Button>
          </div>
          <div className="mt-4">
            <Input
              placeholder="Search collections..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {filteredCollections.length === 0 ? (
          <Card className="p-8 text-center">
            <CardContent className="py-8">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No collections yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first collection to organize your saves
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Collection
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCollections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export function CollectionDetail({ id }: { id: string }) {
  const collection = mockCollections.find((c) => c.id === id);

  if (!collection) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <Card className="p-8 text-center">
            <CardContent className="py-8">
              <h2 className="text-2xl font-bold mb-2">Collection not found</h2>
              <p className="text-muted-foreground">
                This collection may have been deleted.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{collection.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {collection.isPublic ? "Public" : "Private"} collection • {collection.saves} items
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add to Collection
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <p className="text-muted-foreground mb-6">{collection.description}</p>
        <Card className="p-8 text-center">
          <CardContent className="py-8">
            <p className="text-muted-foreground">
              Saves in this collection will appear here
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default Collections;
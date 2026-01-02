import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useCollections, useCollection, useCollectionSaves, useCreateCollection, useDeleteCollection } from "@/hooks/useCollections";
import { useToast } from "@/hooks/useToast";
import { SaveCard, SaveCardSkeleton } from "@/components/saves/SaveCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FolderOpen,
  Plus,
  MoreHorizontal,
  Globe,
  Lock,
  Share2,
  Settings,
  Trash2,
  ArrowLeft,
  Loader2,
  Copy,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import type { Collection } from "@/hooks/useCollections";

function CollectionCard({ collection, onDelete }: { collection: Collection; onDelete?: () => void }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { deleteCollection, isPending: isDeleting } = useDeleteCollection();
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await deleteCollection(collection);
      toast({
        title: "Collection deleted",
        description: `"${collection.name}" has been deleted.`,
      });
      onDelete?.();
    } catch (error) {
      toast({
        title: "Failed to delete",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
    setShowDeleteConfirm(false);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/collections/${collection.dTag}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "Collection link copied to clipboard.",
    });
  };

  return (
    <>
      <Card className="group overflow-hidden hover:shadow-lg transition-all">
        <Link to={`/collections/${collection.dTag}`} className="block">
          <div className="aspect-video bg-muted relative overflow-hidden">
            {collection.image ? (
              <img
                src={collection.image}
                alt=""
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                <FolderOpen className="h-12 w-12 text-primary/30" />
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
              <Link to={`/collections/${collection.dTag}`}>
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
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/collections/${collection.dTag}`}>
                    <Settings className="h-4 w-4 mr-2" />
                    View
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
            <span>{collection.saveIds.length} items</span>
            <span>•</span>
            <span>{formatDistanceToNow(collection.updatedAt, { addSuffix: true })}</span>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{collection.name}". The saves in this collection will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CreateCollectionDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated?: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { createCollection, isPending } = useCreateCollection();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your collection.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createCollection({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast({
        title: "Collection created",
        description: `"${name}" has been created.`,
      });
      setName("");
      setDescription("");
      onOpenChange(false);
      onCreated?.();
    } catch (error) {
      toast({
        title: "Failed to create",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Collection</DialogTitle>
            <DialogDescription>
              Organize your saves into a NIP-51 list that can be shared.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Collection"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this collection about?"
                rows={3}
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Collections() {
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { data: collections, isLoading, refetch } = useCollections();
  const { toast } = useToast();

  const filteredCollections = (collections || []).filter(
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
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-video" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filteredCollections.length === 0 && (
          <Card className="p-8 text-center">
            <CardContent className="py-8">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {search ? "No collections found" : "No collections yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {search
                  ? "Try a different search term"
                  : "Create your first collection to organize your saves"}
              </p>
              {!search && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Collection
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {!isLoading && filteredCollections.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCollections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                onDelete={() => refetch()}
              />
            ))}
          </div>
        )}
      </main>

      <CreateCollectionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={() => refetch()}
      />
    </div>
  );
}

export function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: collection, isLoading: collectionLoading } = useCollection(id);
  const { data: saves, isLoading: savesLoading } = useCollectionSaves(collection);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/collections/${id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "Collection link copied to clipboard.",
    });
  };

  if (collectionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SaveCardSkeleton key={i} viewMode="grid" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <Card className="p-8 text-center">
            <CardContent className="py-8">
              <h2 className="text-2xl font-bold mb-2">Collection not found</h2>
              <p className="text-muted-foreground mb-4">
                This collection may have been deleted or you may not have access to it.
              </p>
              <Button onClick={() => navigate("/collections")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Collections
              </Button>
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
              <Button variant="ghost" size="icon" onClick={() => navigate("/collections")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{collection.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {collection.isPublic ? "Public" : "Private"} • {collection.saveIds.length} items
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
          {collection.description && (
            <p className="text-muted-foreground mt-4 max-w-2xl">
              {collection.description}
            </p>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {savesLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SaveCardSkeleton key={i} viewMode="grid" />
            ))}
          </div>
        )}

        {!savesLoading && (!saves || saves.length === 0) && (
          <Card className="p-8 text-center">
            <CardContent className="py-8">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No saves in this collection</h3>
              <p className="text-muted-foreground">
                Add saves to this collection from the Library.
              </p>
            </CardContent>
          </Card>
        )}

        {!savesLoading && saves && saves.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {saves.map((save) => (
              <SaveCard
                key={save.id}
                save={save}
                viewMode="grid"
                onEdit={() => navigate(`/${save.dTag}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Collections;

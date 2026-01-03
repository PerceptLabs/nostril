import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Grid3X3,
  LayoutGrid,
  List,
  MoreHorizontal,
  Share2,
  UserPlus,
  Edit,
  Trash,
  Link as LinkIcon,
  Bookmark,
  Users,
  Lock,
  Globe,
} from 'lucide-react';
import { MasonryGallery } from '@/components/gallery/MasonryGallery';
import { Lightbox } from '@/components/gallery/Lightbox';
import { useBoard, useFollowBoard } from '@/hooks/useBoards';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { CollectionLayout } from '@/lib/storage';

export function BoardView() {
  const { boardId } = useParams<{ boardId: string }>();
  const { user } = useCurrentUser();
  const { data: board, isLoading } = useBoard(boardId);
  const { data: author } = useAuthor(board?.pubkey);
  const { followBoard, unfollowBoard, isFollowing } = useFollowBoard(boardId);

  const [layout, setLayout] = useState<CollectionLayout>(board?.layout || 'masonry');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const isOwner = user?.pubkey === board?.pubkey;
  const isCollaborator = board?.collaborators.includes(user?.pubkey || '');
  const canEdit = isOwner || isCollaborator;

  if (isLoading) return <BoardSkeleton />;

  if (!board) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Board not found</h1>
        <p className="text-muted-foreground mb-8">This board may be private or doesn't exist.</p>
        <Button asChild><Link to="/boards">Browse boards</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative">
        {board.coverImage ? (
          <div className="h-64 md:h-80 overflow-hidden">
            <img src={board.coverImage} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>
        ) : (
          <div
            className="h-48 md:h-64"
            style={{
              background: `linear-gradient(135deg,
                hsl(${hashCode(board.id) % 360}, 70%, 60%),
                hsl(${(hashCode(board.id) + 60) % 360}, 70%, 50%))`
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          </div>
        )}

        <div className="container max-w-6xl mx-auto px-4 -mt-16 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="gap-1">
                  {board.visibility === 'private' ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                  {board.visibility === 'private' ? 'Private' : 'Public'}
                </Badge>
                {board.collaborators.length > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <Users className="h-3 w-3" />{board.collaborators.length + 1} collaborators
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold mb-2">{board.name}</h1>
              {board.description && <p className="text-muted-foreground max-w-2xl">{board.description}</p>}
            </div>

            <div className="flex items-center gap-2">
              {!isOwner && (
                <Button
                  variant={isFollowing ? 'outline' : 'default'}
                  onClick={() => isFollowing ? unfollowBoard() : followBoard()}
                >
                  <Bookmark className={cn('h-4 w-4 mr-2', isFollowing && 'fill-current')} />
                  {isFollowing ? 'Saved' : 'Save Board'}
                </Button>
              )}

              <Button variant="outline"><Share2 className="h-4 w-4 mr-2" />Share</Button>

              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/board/${board.id}/edit`}><Edit className="h-4 w-4 mr-2" />Edit board</Link>
                    </DropdownMenuItem>
                    {isOwner && <DropdownMenuItem><UserPlus className="h-4 w-4 mr-2" />Add collaborator</DropdownMenuItem>}
                    <DropdownMenuItem><LinkIcon className="h-4 w-4 mr-2" />Copy link</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {isOwner && <DropdownMenuItem className="text-destructive"><Trash className="h-4 w-4 mr-2" />Delete board</DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Author + Layout toggle */}
          <div className="flex items-center justify-between pb-6 border-b">
            <Link to={`/@${author?.metadata?.name || board.pubkey.slice(0, 8)}`} className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={author?.metadata?.picture} />
                <AvatarFallback>{(author?.metadata?.name || 'A')[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium hover:underline">{author?.metadata?.name || 'Anonymous'}</p>
                <p className="text-sm text-muted-foreground">
                  {board.items.length} pins · Created {formatDistanceToNow(board.createdAt * 1000, { addSuffix: true })}
                </p>
              </div>
            </Link>

            <Tabs value={layout} onValueChange={(v) => setLayout(v as CollectionLayout)}>
              <TabsList>
                <TabsTrigger value="masonry"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="grid"><Grid3X3 className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="list"><List className="h-4 w-4" /></TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      {/* Gallery */}
      <main className="container max-w-6xl mx-auto px-4 py-8">
        {board.items.length === 0 ? (
          <EmptyBoard canEdit={canEdit} boardId={board.id} />
        ) : (
          <MasonryGallery
            items={board.items}
            columns={board.columns as 2 | 3 | 4 | 5}
            onItemClick={(item) => {
              const index = board.items.findIndex(i => i.id === item.id);
              setLightboxIndex(index);
            }}
          />
        )}
      </main>

      <Lightbox
        items={board.items}
        initialIndex={lightboxIndex || 0}
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}

function EmptyBoard({ canEdit, boardId }: { canEdit: boolean; boardId: string }) {
  return (
    <div className="text-center py-16">
      <div className="h-24 w-24 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
        <LayoutGrid className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">No pins yet</h3>
      <p className="text-muted-foreground mb-4">
        {canEdit ? "Start adding images to your board" : "This board doesn't have any pins yet"}
      </p>
      {canEdit && <Button asChild><Link to={`/board/${boardId}/add`}>Add pins</Link></Button>}
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-64 bg-muted animate-pulse" />
      <div className="container max-w-6xl mx-auto px-4 -mt-16 relative z-10">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-4" />
        <div className="h-12 w-96 bg-muted rounded animate-pulse mb-6" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash);
}

export default BoardView;

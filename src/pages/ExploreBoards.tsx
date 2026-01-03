import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, TrendingUp, Users, Sparkles, Grid3X3, Plus } from 'lucide-react';
import { BoardCard } from '@/components/BoardCard';
import { useTrendingBoards, useFollowedBoards, usePublicBoards } from '@/hooks/useBoards';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const CATEGORIES = [
  'design', 'photography', 'art', 'fashion', 'travel',
  'food', 'architecture', 'nature', 'technology', 'illustration'
];

export function ExploreBoards() {
  const { user } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: trendingBoards, isLoading } = useTrendingBoards();
  const { data: followedBoards } = useFollowedBoards(user?.pubkey);
  const { data: categoryBoards } = usePublicBoards({
    tags: selectedCategory ? [selectedCategory] : undefined,
  });

  // Filter boards based on search query
  const filterBoards = (boards: typeof trendingBoards) => {
    if (!boards) return [];
    if (!searchQuery) return boards;
    return boards.filter(board =>
      board.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      board.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Grid3X3 className="h-6 w-6 text-primary" />Explore Boards
            </h1>
            <Button asChild>
              <Link to="/board/new"><Plus className="h-4 w-4 mr-2" />Create Board</Link>
            </Button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search boards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2 pb-4">
            {CATEGORIES.map(category => (
              <Badge
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                className="cursor-pointer capitalize"
                onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="trending">
          <TabsList className="mb-6">
            <TabsTrigger value="trending" className="gap-2"><TrendingUp className="h-4 w-4" />Trending</TabsTrigger>
            {user && <TabsTrigger value="following" className="gap-2"><Users className="h-4 w-4" />Following</TabsTrigger>}
            <TabsTrigger value="new" className="gap-2"><Sparkles className="h-4 w-4" />New</TabsTrigger>
          </TabsList>

          <TabsContent value="trending">
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-[4/3]" />
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filterBoards(trendingBoards)?.map(board => <BoardCard key={board.id} board={board} />)}
              </div>
            )}
            {!isLoading && filterBoards(trendingBoards)?.length === 0 && (
              <Card className="p-8 text-center">
                <CardContent className="py-8">
                  <Grid3X3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No boards found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? "Try a different search term" : "Be the first to create a board!"}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="following">
            {followedBoards?.length === 0 ? (
              <Card className="p-8 text-center">
                <CardContent className="py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No followed boards</h3>
                  <p className="text-muted-foreground mb-4">You're not following any boards yet</p>
                  <Button asChild variant="outline">
                    <Link to="#trending">Explore trending boards</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filterBoards(followedBoards)?.map(board => <BoardCard key={board.id} board={board} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="new">
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-[4/3]" />
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filterBoards(categoryBoards)?.map(board => <BoardCard key={board.id} board={board} />)}
              </div>
            )}
            {!isLoading && filterBoards(categoryBoards)?.length === 0 && (
              <Card className="p-8 text-center">
                <CardContent className="py-8">
                  <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No new boards</h3>
                  <p className="text-muted-foreground">
                    {searchQuery || selectedCategory
                      ? "Try adjusting your filters"
                      : "Check back later for new boards"}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default ExploreBoards;

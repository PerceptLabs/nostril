import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  useTrendingArticles,
  useNetworkArticles,
  useDiscoverArticles,
} from "@/hooks/useArticles";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ArticleCard, ArticleCardSkeleton } from "@/components/ArticleCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  TrendingUp,
  Users,
  Clock,
  Sparkles,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const POPULAR_TOPICS = [
  'bitcoin',
  'nostr',
  'privacy',
  'technology',
  'programming',
  'philosophy',
  'economics',
  'science',
  'writing',
  'art',
];

export function Discover() {
  const { user } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const topicParam = searchParams.get('topic');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(topicParam);
  const [activeTab, setActiveTab] = useState(topicParam ? 'topic' : 'trending');

  // Different article feeds
  const { data: trendingArticles, isLoading: trendingLoading } = useTrendingArticles();
  const { data: networkArticles, isLoading: networkLoading } = useNetworkArticles();
  const { data: topicArticles, isLoading: topicLoading } = useDiscoverArticles({
    tags: selectedTopic ? [selectedTopic] : undefined,
    limit: 50,
  });

  const displayedArticles = useMemo(() => {
    let articles;
    switch (activeTab) {
      case 'network':
        articles = networkArticles;
        break;
      case 'topic':
        articles = topicArticles;
        break;
      case 'latest':
        articles = trendingArticles;
        break;
      default:
        articles = trendingArticles;
    }

    // Apply search filter
    if (searchQuery && articles) {
      const search = searchQuery.toLowerCase();
      return articles.filter(article =>
        article.title.toLowerCase().includes(search) ||
        article.summary?.toLowerCase().includes(search) ||
        article.tags.some(t => t.includes(search))
      );
    }

    return articles;
  }, [activeTab, trendingArticles, networkArticles, topicArticles, searchQuery]);

  const isLoading = activeTab === 'trending'
    ? trendingLoading
    : activeTab === 'network'
    ? networkLoading
    : topicLoading;

  const handleTopicClick = (topic: string) => {
    if (selectedTopic === topic) {
      setSelectedTopic(null);
      setSearchParams({});
      setActiveTab('trending');
    } else {
      setSelectedTopic(topic);
      setSearchParams({ topic });
      setActiveTab('topic');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Discover
            </h1>
            <Button asChild>
              <Link to="/write">
                <Plus className="h-4 w-4 mr-1" />
                Write Article
              </Link>
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Topic pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {POPULAR_TOPICS.map(topic => (
              <Badge
                key={topic}
                variant={selectedTopic === topic ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleTopicClick(topic)}
              >
                #{topic}
              </Badge>
            ))}
          </div>

          {/* Feed tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="trending" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Trending
              </TabsTrigger>
              {user && (
                <TabsTrigger value="network" className="gap-2">
                  <Users className="h-4 w-4" />
                  Following
                </TabsTrigger>
              )}
              <TabsTrigger value="latest" className="gap-2">
                <Clock className="h-4 w-4" />
                Latest
              </TabsTrigger>
              {selectedTopic && (
                <TabsTrigger value="topic" className="gap-2">
                  #{selectedTopic}
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Article grid */}
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        ) : displayedArticles?.length === 0 ? (
          <Card className="p-8 text-center">
            <CardContent className="py-8">
              <div className="max-w-sm mx-auto space-y-4">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-semibold">No articles found</h3>
                <p className="text-muted-foreground">
                  {activeTab === 'network'
                    ? "Follow some writers to see their articles here"
                    : searchQuery
                    ? "Try adjusting your search query"
                    : "Check back later for new content"}
                </p>
                {activeTab !== 'network' && (
                  <Button asChild className="mt-4">
                    <Link to="/write">
                      <Plus className="h-4 w-4 mr-2" />
                      Write an article
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayedArticles?.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Discover;

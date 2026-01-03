/**
 * Hooks for managing articles (NIP-23 long-form content)
 *
 * These hooks provide both local-first article management and relay publishing.
 */

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { useNostr } from "@nostrify/react";
import { useCurrentUser } from "./useCurrentUser";
import { db, type LocalArticle } from "@/lib/storage";
import {
  ARTICLE_KIND,
  createArticleEvent,
  parseArticleEvent,
  type Article,
} from "@/lib/article";

export interface ArticleFilter {
  status?: 'draft' | 'scheduled' | 'published';
  tags?: string[];
  search?: string;
}

/**
 * Get a single article by ID (d-tag) from local DB
 */
export function useArticle(id: string | undefined) {
  const article = useLiveQuery(
    async () => {
      if (!id) return undefined;
      return db.articles.get(id);
    },
    [id]
  );

  return {
    data: article,
    isLoading: article === undefined && id !== undefined,
  };
}

/**
 * Get filtered list of articles from local DB
 */
export function useArticles(filter?: ArticleFilter) {
  const articles = useLiveQuery(async () => {
    let results: LocalArticle[];

    // Start with base query
    if (filter?.status) {
      results = await db.articles.where('status').equals(filter.status).toArray();
    } else {
      results = await db.articles.toArray();
    }

    // Sort by updated time descending
    results.sort((a, b) => b.updatedAt - a.updatedAt);

    // Apply additional client-side filters
    if (filter?.tags?.length) {
      results = results.filter(article =>
        filter.tags!.some(t => article.tags.includes(t))
      );
    }

    if (filter?.search) {
      const search = filter.search.toLowerCase();
      results = results.filter(article =>
        article.title?.toLowerCase().includes(search) ||
        article.summary?.toLowerCase().includes(search) ||
        article.content.toLowerCase().includes(search) ||
        article.tags.some(t => t.includes(search))
      );
    }

    return results;
  }, [
    filter?.status,
    filter?.tags?.join(','),
    filter?.search,
  ]);

  return {
    data: articles,
    isLoading: articles === undefined,
  };
}

/**
 * Get all articles by current user
 */
export function useMyArticles() {
  const { user } = useCurrentUser();

  const articles = useLiveQuery(async () => {
    if (!user) return [];
    return db.articles
      .orderBy('updatedAt')
      .reverse()
      .toArray();
  }, [user?.pubkey]);

  return {
    data: articles,
    isLoading: articles === undefined,
  };
}

/**
 * Get articles from Nostr relays (public feed)
 */
export function useDiscoverArticles(options?: {
  authors?: string[];
  tags?: string[];
  limit?: number;
}) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['discover-articles', options?.authors?.join(','), options?.tags?.join(','), options?.limit],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

      const filters: any = {
        kinds: [ARTICLE_KIND],
        limit: options?.limit || 50,
      };

      if (options?.authors?.length) {
        filters.authors = options.authors;
      }

      if (options?.tags?.length) {
        filters['#t'] = options.tags;
      }

      try {
        const events = await nostr.query([filters], { signal });
        return events.map(parseArticleEvent);
      } catch (error) {
        console.error('Failed to fetch articles:', error);
        return [];
      }
    },
    staleTime: 30000,
  });
}

/**
 * Get a single article from Nostr by d-tag
 */
export function usePublicArticle(dTag: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['public-article', dTag],
    queryFn: async (c) => {
      if (!dTag) return null;

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      const events = await nostr.query(
        [{ kinds: [ARTICLE_KIND], '#d': [dTag], limit: 1 }],
        { signal }
      );

      if (events.length === 0) return null;
      return parseArticleEvent(events[0]);
    },
    enabled: !!dTag,
  });
}

/**
 * Create a new article draft
 */
export function useCreateArticle() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: Omit<LocalArticle, 'createdAt' | 'updatedAt' | 'syncStatus' | 'localUpdatedAt'>) => {
      const now = Date.now();

      const article: LocalArticle = {
        ...data,
        syncStatus: 'local',
        localUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      await db.articles.put(article);
      return article;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['discover-articles'] });
    },
  });

  return {
    createArticle: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Update an existing article
 */
export function useUpdateArticle() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<LocalArticle, 'id' | 'createdAt'>>;
    }) => {
      const existing = await db.articles.get(id);
      if (!existing) throw new Error('Article not found');

      const now = Date.now();
      const updated: LocalArticle = {
        ...existing,
        ...updates,
        syncStatus: 'local',
        localUpdatedAt: now,
        updatedAt: now,
      };

      await db.articles.put(updated);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['discover-articles'] });
    },
  });

  return {
    updateArticle: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Delete an article
 */
export function useDeleteArticle() {
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const article = await db.articles.get(id);
      if (!article) throw new Error('Article not found');

      // Delete from local DB
      await db.articles.delete(id);

      // If published, send delete event to relays (NIP-09)
      if (user && article.status === 'published' && article.nostrEventId) {
        try {
          const deleteEvent = await nostr.signer?.signEvent({
            kind: 5,
            pubkey: user.pubkey,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
              ['e', article.nostrEventId],
              ['a', `${ARTICLE_KIND}:${user.pubkey}:${article.id}`],
            ],
            content: 'Deleted',
          });

          if (deleteEvent) {
            await nostr.event(deleteEvent);
          }
        } catch (error) {
          console.error('Failed to publish delete event:', error);
        }
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['discover-articles'] });
    },
  });

  return {
    deleteArticle: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Publish article to Nostr (NIP-23)
 */
export function usePublishArticle() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not logged in');

      const article = await db.articles.get(id);
      if (!article) throw new Error('Article not found');

      // Create Nostr event
      const eventTemplate = createArticleEvent(article, user.pubkey);

      // Sign and publish
      const signedEvent = await nostr.signer?.signEvent(eventTemplate);
      if (!signedEvent) throw new Error('Failed to sign event');

      await nostr.event(signedEvent);

      // Update local status
      const now = Date.now();
      await db.articles.update(id, {
        status: 'published',
        publishedAt: Math.floor(now / 1000),
        syncStatus: 'published',
        nostrEventId: signedEvent.id,
        updatedAt: now,
      });

      return signedEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['discover-articles'] });
    },
  });

  return {
    publishArticle: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Get articles from followed users
 */
export function useNetworkArticles(limit: number = 50) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['network-articles', user?.pubkey, limit],
    queryFn: async (c) => {
      if (!user) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

      // First, get the user's follow list (kind 3)
      const contactEvents = await nostr.query(
        [{ kinds: [3], authors: [user.pubkey], limit: 1 }],
        { signal }
      );

      if (contactEvents.length === 0) return [];

      // Extract followed pubkeys from 'p' tags
      const followedPubkeys = contactEvents[0].tags
        .filter(t => t[0] === 'p')
        .map(t => t[1]);

      if (followedPubkeys.length === 0) return [];

      // Fetch articles from followed users
      const articleEvents = await nostr.query(
        [{ kinds: [ARTICLE_KIND], authors: followedPubkeys, limit }],
        { signal }
      );

      return articleEvents.map(parseArticleEvent);
    },
    enabled: !!user,
    staleTime: 60000,
  });
}

/**
 * Get trending articles (simple implementation based on recent publications)
 */
export function useTrendingArticles(limit: number = 50) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['trending-articles', limit],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

      // Fetch recent articles (last 7 days)
      const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);

      const events = await nostr.query(
        [{ kinds: [ARTICLE_KIND], since: sevenDaysAgo, limit }],
        { signal }
      );

      return events.map(parseArticleEvent);
    },
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Get articles by topic/tag
 */
export function useArticlesByTopic(topic: string | undefined, limit: number = 50) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['articles-by-topic', topic, limit],
    queryFn: async (c) => {
      if (!topic) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

      const events = await nostr.query(
        [{ kinds: [ARTICLE_KIND], '#t': [topic], limit }],
        { signal }
      );

      return events.map(parseArticleEvent);
    },
    enabled: !!topic,
    staleTime: 60000,
  });
}

/**
 * Get articles by author
 */
export function useArticlesByAuthor(pubkey: string | undefined, limit: number = 50) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['articles-by-author', pubkey, limit],
    queryFn: async (c) => {
      if (!pubkey) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

      const events = await nostr.query(
        [{ kinds: [ARTICLE_KIND], authors: [pubkey], limit }],
        { signal }
      );

      return events.map(parseArticleEvent);
    },
    enabled: !!pubkey,
    staleTime: 60000,
  });
}

/**
 * Get all unique tags from local articles
 */
export function useArticleTags() {
  const tags = useLiveQuery(async () => {
    const articles = await db.articles.toArray();
    const tagCounts = new Map<string, number>();

    for (const article of articles) {
      for (const tag of article.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    return Array.from(tagCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, []);

  return {
    data: tags,
    isLoading: tags === undefined,
  };
}

/**
 * Get article stats summary
 */
export function useArticleStats() {
  const { user } = useCurrentUser();

  const stats = useLiveQuery(async () => {
    if (!user) return null;

    const articles = await db.articles.toArray();

    const summary = {
      total: articles.length,
      drafts: articles.filter(a => a.status === 'draft').length,
      scheduled: articles.filter(a => a.status === 'scheduled').length,
      published: articles.filter(a => a.status === 'published').length,
      paywalled: articles.filter(a => a.paywallEnabled && a.status === 'published').length,
    };

    return summary;
  }, [user?.pubkey]);

  return {
    data: stats,
    isLoading: stats === undefined,
  };
}

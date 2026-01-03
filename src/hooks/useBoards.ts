/**
 * Hooks for board management (Pinterest-style visual collections)
 *
 * Implements local-first approach with relay sync for boards.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from './useCurrentUser';
import { db, type LocalCollection, type BoardItem } from '@/lib/storage';
import { parseBoardEvent, BOARD_KIND, type Board } from '@/lib/boards';

/**
 * Hook to get a single board by ID
 * Checks local DB first (instant), then queries relays if not found
 */
export function useBoard(boardId: string | undefined) {
  const { nostr } = useNostr();

  // Check local DB first for instant response
  const localBoard = useLiveQuery(
    async () => boardId ? db.collections.get(boardId) : undefined,
    [boardId]
  );

  // Query remote relays if not found locally
  const remoteQuery = useQuery({
    queryKey: ['board', boardId],
    queryFn: async () => {
      if (!boardId) return null;
      const events = await nostr.query([{
        kinds: [BOARD_KIND],
        '#d': [boardId],
        limit: 1,
      }], { signal: AbortSignal.timeout(10000) });

      return events.length > 0 ? parseBoardEvent(events[0]) : null;
    },
    enabled: !localBoard && !!boardId,
  });

  return {
    data: localBoard ? convertToBoard(localBoard) : remoteQuery.data,
    isLoading: localBoard === undefined && remoteQuery.isLoading,
  };
}

/**
 * Hook to query trending boards from relays
 */
export function useTrendingBoards() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['boards', 'trending'],
    queryFn: async () => {
      const events = await nostr.query([{
        kinds: [BOARD_KIND],
        limit: 50,
      }], { signal: AbortSignal.timeout(15000) });

      return events.map(parseBoardEvent);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get boards that a user follows
 */
export function useFollowedBoards(pubkey: string | undefined) {
  return useQuery({
    queryKey: ['boards', 'following', pubkey],
    queryFn: async () => {
      // TODO: Implement following logic with NIP-51 follow lists
      return [] as Board[];
    },
    enabled: !!pubkey,
  });
}

/**
 * Hook to query public boards by tags and other filters
 */
export function usePublicBoards(options?: { tags?: string[]; limit?: number }) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['boards', 'public', options],
    queryFn: async () => {
      const filters: any = { kinds: [BOARD_KIND], limit: options?.limit || 50 };
      if (options?.tags?.length) filters['#t'] = options.tags;

      const events = await nostr.query([filters], { signal: AbortSignal.timeout(15000) });
      return events.map(parseBoardEvent);
    },
  });
}

/**
 * Hook to follow/unfollow a board
 */
export function useFollowBoard(boardId: string | undefined) {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  // Check if board is followed (stored in local settings)
  const isFollowing = useLiveQuery(async () => {
    if (!user || !boardId) return false;
    const setting = await db.settings.get(`following:${boardId}`);
    return !!setting?.value;
  }, [user?.pubkey, boardId]);

  // Mutation to follow a board
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user || !boardId) throw new Error('Not logged in');
      await db.settings.put({ key: `following:${boardId}`, value: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boards', 'following'] }),
  });

  // Mutation to unfollow a board
  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!user || !boardId) throw new Error('Not logged in');
      await db.settings.delete(`following:${boardId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boards', 'following'] }),
  });

  return {
    isFollowing: !!isFollowing,
    followBoard: followMutation.mutateAsync,
    unfollowBoard: unfollowMutation.mutateAsync,
  };
}

/**
 * Hook to add an item to a board
 */
export function useAddToBoard() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ boardId, item }: { boardId: string; item: Omit<BoardItem, 'id' | 'addedAt' | 'addedBy' | 'position'> }) => {
      if (!user) throw new Error('Not logged in');

      const board = await db.collections.get(boardId);
      if (!board) throw new Error('Board not found');

      const newItem: BoardItem = {
        id: `item-${Date.now()}`,
        kind: 0,
        ...item,
        addedAt: Date.now(),
        addedBy: user.pubkey,
        position: (board.items?.length || 0),
      };

      await db.collections.update(boardId, {
        items: [...(board.items || []), newItem],
        updatedAt: Date.now(),
        syncStatus: 'local',
      });

      return newItem;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boards'] }),
  });
}

/**
 * Helper function to convert LocalCollection to Board format
 */
export function convertToBoard(collection: LocalCollection): Board {
  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    coverImage: collection.coverImage,
    layout: collection.layout || 'masonry',
    columns: collection.columns || 3,
    items: collection.items || [],
    pubkey: collection.pubkey || '',
    collaborators: collection.collaborators || [],
    visibility: collection.visibility,
    createdAt: Math.floor(collection.createdAt / 1000),
    updatedAt: Math.floor(collection.updatedAt / 1000),
  };
}

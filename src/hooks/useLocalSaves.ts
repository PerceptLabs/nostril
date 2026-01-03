/**
 * Local-first hooks for saves
 *
 * These hooks read from IndexedDB first (instant) and sync with relays in the background.
 */

import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  type LocalSave,
  type LocalCollection,
  type Visibility,
  type SyncStatus,
  getEffectiveVisibility,
  getSyncSettings,
} from "@/lib/storage";
import { pushSavesToRelays, pullSavesFromRelays, fullSync, type SyncEngine } from "@/lib/sync";
import { useNostr } from "@nostrify/react";
import { useCurrentUser } from "./useCurrentUser";
import { nanoid } from "nanoid";

export interface SaveWithVisibility extends LocalSave {
  effectiveVisibility: Visibility;
}

export interface SaveFilter {
  tags?: string[];
  contentType?: 'link' | 'image' | 'pdf' | 'note';
  search?: string;
  collectionId?: string;
  visibility?: Visibility;
  syncStatus?: SyncStatus;
}

/**
 * Hook to get all saves from local DB with live updates
 */
export function useLocalSaves(filter?: SaveFilter) {
  // Live query from IndexedDB - updates automatically when data changes
  const saves = useLiveQuery(async () => {
    let results: LocalSave[];

    // Start with base query
    if (filter?.collectionId) {
      results = await db.saves.where('collectionIds').equals(filter.collectionId).toArray();
    } else if (filter?.visibility) {
      results = await db.saves.where('visibility').equals(filter.visibility).toArray();
    } else if (filter?.syncStatus) {
      results = await db.saves.where('syncStatus').equals(filter.syncStatus).toArray();
    } else if (filter?.contentType) {
      results = await db.saves.where('contentType').equals(filter.contentType).toArray();
    } else {
      results = await db.saves.toArray();
    }

    // Sort by updated time descending
    results.sort((a, b) => b.updatedAt - a.updatedAt);

    // Apply additional client-side filters
    if (filter?.tags?.length) {
      results = results.filter(s =>
        filter.tags!.some(t => s.tags.includes(t))
      );
    }

    if (filter?.contentType && !filter.visibility && !filter.syncStatus && !filter.collectionId) {
      results = results.filter(s => s.contentType === filter.contentType);
    }

    if (filter?.search) {
      const search = filter.search.toLowerCase();
      results = results.filter(s =>
        s.title?.toLowerCase().includes(search) ||
        s.content.toLowerCase().includes(search) ||
        s.url?.toLowerCase().includes(search) ||
        s.tags.some(t => t.includes(search))
      );
    }

    // Add effective visibility to each save
    const withVisibility: SaveWithVisibility[] = await Promise.all(
      results.map(async s => ({
        ...s,
        effectiveVisibility: await getEffectiveVisibility(s)
      }))
    );

    return withVisibility;
  }, [
    filter?.tags?.join(','),
    filter?.contentType,
    filter?.search,
    filter?.collectionId,
    filter?.visibility,
    filter?.syncStatus,
  ]);

  return {
    data: saves,
    isLoading: saves === undefined,
  };
}

/**
 * Hook to get a single save by ID
 */
export function useLocalSave(id: string | undefined) {
  const save = useLiveQuery(
    async () => {
      if (!id) return undefined;
      const localSave = await db.saves.get(id);
      if (!localSave) return undefined;

      return {
        ...localSave,
        effectiveVisibility: await getEffectiveVisibility(localSave),
      } as SaveWithVisibility;
    },
    [id]
  );

  return {
    data: save,
    isLoading: save === undefined && id !== undefined,
  };
}

/**
 * Hook to create a new save (local-first)
 */
export function useCreateLocalSave() {
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: {
      url?: string;
      title?: string;
      description?: string;
      image?: string;
      contentType: 'link' | 'image' | 'pdf' | 'note';
      content: string;
      tags?: string[];
      refs?: string[];
      visibility?: Visibility;
      sharedWith?: string[];
      collectionIds?: string[];
    }) => {
      const id = `nostril-${nanoid(10)}`;
      const now = Date.now();

      const save: LocalSave = {
        id,
        url: data.url,
        title: data.title,
        description: data.description,
        image: data.image,
        contentType: data.contentType,
        content: data.content,
        tags: data.tags || [],
        refs: data.refs || [],
        visibility: data.visibility || 'private',
        sharedWith: data.sharedWith,
        inheritVisibility: !data.visibility,
        collectionIds: data.collectionIds || [],
        syncStatus: 'local',
        localUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      // Save locally first (instant)
      await db.saves.put(save);

      // Trigger background sync if enabled
      const settings = await getSyncSettings();
      if (user && settings.relaySyncEnabled && settings.syncFrequency === 'instant') {
        const engine: SyncEngine = {
          nostr: nostr as SyncEngine['nostr'],
          userPubkey: user.pubkey,
        };
        pushSavesToRelays(engine, [save]).catch(console.error);
      }

      return save;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-saves'] });
    },
  });

  return {
    createSave: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook to update a save
 */
export function useUpdateLocalSave() {
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<LocalSave, 'id' | 'createdAt'>>;
    }) => {
      const existing = await db.saves.get(id);
      if (!existing) throw new Error('Save not found');

      const now = Date.now();
      const updatedSave: LocalSave = {
        ...existing,
        ...updates,
        syncStatus: 'local',
        localUpdatedAt: now,
        updatedAt: now,
      };

      await db.saves.put(updatedSave);

      // Trigger background sync
      const settings = await getSyncSettings();
      if (user && settings.relaySyncEnabled && settings.syncFrequency === 'instant') {
        const engine: SyncEngine = {
          nostr: nostr as SyncEngine['nostr'],
          userPubkey: user.pubkey,
        };
        pushSavesToRelays(engine, [updatedSave]).catch(console.error);
      }

      return updatedSave;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-saves'] });
    },
  });

  return {
    updateSave: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook to update save visibility
 */
export function useUpdateVisibility() {
  const { updateSave, isPending, error } = useUpdateLocalSave();

  const updateVisibility = useCallback(
    async ({
      saveId,
      visibility,
      sharedWith,
    }: {
      saveId: string;
      visibility: Visibility;
      sharedWith?: string[];
    }) => {
      return updateSave({
        id: saveId,
        updates: {
          visibility,
          sharedWith,
          inheritVisibility: false,
        },
      });
    },
    [updateSave]
  );

  return { updateVisibility, isPending, error };
}

/**
 * Hook to delete a save
 */
export function useDeleteLocalSave() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      await db.saves.delete(id);
      // In a full implementation, we'd also publish a delete event to relays
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-saves'] });
    },
  });

  return {
    deleteSave: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook to sync with relays
 */
export function useSync() {
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not logged in');

      const engine: SyncEngine = {
        nostr: nostr as SyncEngine['nostr'],
        userPubkey: user.pubkey,
      };

      return fullSync(engine);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-saves'] });
      queryClient.invalidateQueries({ queryKey: ['local-collections'] });
    },
  });

  return {
    sync: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending,
    lastSyncResult: syncMutation.data,
    error: syncMutation.error,
  };
}

/**
 * Hook to get all unique tags from local saves
 */
export function useLocalTags() {
  const tags = useLiveQuery(async () => {
    const saves = await db.saves.toArray();
    const tagCounts = new Map<string, number>();

    for (const save of saves) {
      for (const tag of save.tags) {
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
 * Hook to get sync status summary
 */
export function useSyncStatus() {
  const status = useLiveQuery(async () => {
    const saves = await db.saves.toArray();

    const summary = {
      local: 0,
      syncing: 0,
      synced: 0,
      conflict: 0,
      published: 0,
      total: saves.length,
    };

    for (const save of saves) {
      summary[save.syncStatus]++;
    }

    return summary;
  }, []);

  return {
    data: status,
    isLoading: status === undefined,
  };
}

/**
 * Hook to get saves with conflicts
 */
export function useConflictSaves() {
  const { data: saves } = useLocalSaves({ syncStatus: 'conflict' });
  return { data: saves, isLoading: saves === undefined };
}

/**
 * Hook to resolve a conflict
 */
export function useResolveConflict() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      saveId,
      resolution,
    }: {
      saveId: string;
      resolution: 'keep-local' | 'keep-remote';
    }) => {
      const save = await db.saves.get(saveId);
      if (!save) throw new Error('Save not found');

      if (resolution === 'keep-local') {
        // Mark as local to trigger re-sync
        await db.saves.update(saveId, {
          syncStatus: 'local',
          localUpdatedAt: Date.now(),
        });
      } else {
        // For keep-remote, we'd need to fetch the remote version
        // For now, just clear the conflict status
        await db.saves.update(saveId, {
          syncStatus: 'synced',
        });
      }

      return saveId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-saves'] });
    },
  });

  return {
    resolveConflict: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}

/**
 * Hook to search saves
 */
export function useSearchLocalSaves(query: string) {
  const { data: saves } = useLocalSaves({ search: query });
  return { data: saves, isLoading: saves === undefined };
}

/**
 * Hook to get backlinks for a save
 */
export function useLocalBacklinks(dTag: string | undefined) {
  const backlinks = useLiveQuery(
    async () => {
      if (!dTag) return [];
      const allSaves = await db.saves.toArray();
      return allSaves.filter(s => s.refs.includes(dTag));
    },
    [dTag]
  );

  return {
    data: backlinks,
    isLoading: backlinks === undefined,
  };
}

/**
 * Hook to get backlink counts for multiple saves
 */
export function useLocalBacklinkCounts(dTags: string[]) {
  const counts = useLiveQuery(
    async () => {
      if (dTags.length === 0) return new Map<string, number>();

      const allSaves = await db.saves.toArray();
      const countMap = new Map<string, number>();

      for (const dTag of dTags) {
        const count = allSaves.filter(s => s.refs.includes(dTag)).length;
        if (count > 0) {
          countMap.set(dTag, count);
        }
      }

      return countMap;
    },
    [dTags.join(',')]
  );

  return {
    data: counts,
    isLoading: counts === undefined,
  };
}

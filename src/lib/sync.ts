/**
 * Sync Engine for Local-First Architecture
 *
 * Handles bidirectional sync between IndexedDB and Nostr relays:
 * - Push: Local changes → Relays (respecting visibility settings)
 * - Pull: Relay events → Local (merging with conflict detection)
 */

import {
  db,
  type LocalSave,
  type LocalCollection,
  type Visibility,
  type SyncStatus,
  getSyncSettings,
  getEffectiveVisibility,
} from './storage';
import { SAVE_KIND } from './nostril';
import type { NostrEvent } from '@nostrify/nostrify';

// NIP-51 list kind for collections
const COLLECTION_KIND = 30001;

/**
 * Sync engine configuration
 */
export interface SyncEngine {
  nostr: {
    query(filters: object[], options?: { signal?: AbortSignal }): Promise<NostrEvent[]>;
    event(event: NostrEvent): Promise<void>;
    signer?: {
      getPublicKey(): Promise<string>;
      signEvent(event: Omit<NostrEvent, 'id' | 'sig'>): Promise<NostrEvent>;
    };
  };
  userPubkey: string;
}

/**
 * Convert local save to Nostr event tags
 */
export function saveToEventTags(save: LocalSave): string[][] {
  const tags: string[][] = [
    ['d', save.id],
    ['content-type', save.contentType],
  ];

  if (save.url) tags.push(['r', save.url]);
  if (save.title) tags.push(['title', save.title]);
  if (save.description) tags.push(['description', save.description]);
  if (save.image) tags.push(['image', save.image]);

  save.tags.forEach(t => tags.push(['t', t]));
  save.refs.forEach(r => tags.push(['ref', r]));
  save.collectionIds.forEach(c => tags.push(['a', `${COLLECTION_KIND}:${c}`]));

  // Store visibility in event for later reference
  tags.push(['visibility', save.visibility]);
  if (save.sharedWith?.length) {
    save.sharedWith.forEach(pk => tags.push(['shared-with', pk]));
  }

  return tags;
}

/**
 * Convert local collection to Nostr event tags
 */
export function collectionToEventTags(collection: LocalCollection): string[][] {
  const tags: string[][] = [
    ['d', collection.id],
    ['name', collection.name],
    ['visibility', collection.visibility],
  ];

  if (collection.description) tags.push(['description', collection.description]);
  if (collection.icon) tags.push(['icon', collection.icon]);
  tags.push(['allow-override', collection.allowOverride ? 'true' : 'false']);

  if (collection.sharedWith?.length) {
    collection.sharedWith.forEach(pk => tags.push(['shared-with', pk]));
  }

  return tags;
}

/**
 * Create Nostr event from local save
 */
export function createSaveEvent(save: LocalSave): Omit<NostrEvent, 'id' | 'sig' | 'pubkey'> {
  return {
    kind: SAVE_KIND,
    content: save.content,
    tags: saveToEventTags(save),
    created_at: Math.floor(save.updatedAt / 1000),
  };
}

/**
 * Push local saves to relays based on visibility
 */
export async function pushSavesToRelays(
  engine: SyncEngine,
  saves: LocalSave[]
): Promise<{ success: string[]; failed: string[] }> {
  const settings = await getSyncSettings();
  if (!settings.relaySyncEnabled) {
    return { success: [], failed: [] };
  }

  const success: string[] = [];
  const failed: string[] = [];

  for (const save of saves) {
    const visibility = await getEffectiveVisibility(save);

    // Skip private saves from relay sync (they stay local only)
    if (visibility === 'private') {
      await db.saves.update(save.id, { syncStatus: 'local' });
      continue;
    }

    // Mark as syncing
    await db.saves.update(save.id, { syncStatus: 'syncing' });

    try {
      const eventData = createSaveEvent(save);

      // For shared/unlisted/public, publish plaintext
      // In a full implementation, 'shared' would use NIP-59 gift wrap
      if (engine.nostr.signer) {
        const signedEvent = await engine.nostr.signer.signEvent({
          ...eventData,
          pubkey: engine.userPubkey,
        });

        await engine.nostr.event(signedEvent);

        // Update sync status
        const newStatus: SyncStatus = visibility === 'public' ? 'published' : 'synced';
        await db.saves.update(save.id, {
          syncStatus: newStatus,
          remoteUpdatedAt: Date.now(),
          nostrEventId: signedEvent.id,
        });

        success.push(save.id);
      }
    } catch (error) {
      console.error('Sync failed for save:', save.id, error);
      await db.saves.update(save.id, { syncStatus: 'local' });
      failed.push(save.id);
    }
  }

  return { success, failed };
}

/**
 * Push local collections to relays
 */
export async function pushCollectionsToRelays(
  engine: SyncEngine,
  collections: LocalCollection[]
): Promise<{ success: string[]; failed: string[] }> {
  const settings = await getSyncSettings();
  if (!settings.relaySyncEnabled) {
    return { success: [], failed: [] };
  }

  const success: string[] = [];
  const failed: string[] = [];

  for (const collection of collections) {
    // Skip private collections
    if (collection.visibility === 'private') {
      await db.collections.update(collection.id, { syncStatus: 'local' });
      continue;
    }

    await db.collections.update(collection.id, { syncStatus: 'syncing' });

    try {
      const eventData: Omit<NostrEvent, 'id' | 'sig' | 'pubkey'> = {
        kind: COLLECTION_KIND,
        content: collection.description || '',
        tags: collectionToEventTags(collection),
        created_at: Math.floor(collection.updatedAt / 1000),
      };

      if (engine.nostr.signer) {
        const signedEvent = await engine.nostr.signer.signEvent({
          ...eventData,
          pubkey: engine.userPubkey,
        });

        await engine.nostr.event(signedEvent);

        await db.collections.update(collection.id, {
          syncStatus: collection.visibility === 'public' ? 'published' : 'synced',
          remoteUpdatedAt: Date.now(),
          nostrEventId: signedEvent.id,
        });

        success.push(collection.id);
      }
    } catch (error) {
      console.error('Sync failed for collection:', collection.id, error);
      await db.collections.update(collection.id, { syncStatus: 'local' });
      failed.push(collection.id);
    }
  }

  return { success, failed };
}

/**
 * Pull saves from relays and merge with local
 */
export async function pullSavesFromRelays(engine: SyncEngine): Promise<number> {
  const settings = await getSyncSettings();
  if (!settings.relaySyncEnabled) return 0;

  let mergedCount = 0;

  try {
    // Fetch our plaintext saves (unlisted/public/shared)
    const events = await engine.nostr.query([
      { kinds: [SAVE_KIND], authors: [engine.userPubkey], limit: 500 }
    ]);

    for (const event of events) {
      const merged = await mergeRemoteSave(event, settings.conflictResolution);
      if (merged) mergedCount++;
    }
  } catch (error) {
    console.error('Failed to pull saves:', error);
  }

  return mergedCount;
}

/**
 * Pull collections from relays
 */
export async function pullCollectionsFromRelays(engine: SyncEngine): Promise<number> {
  const settings = await getSyncSettings();
  if (!settings.relaySyncEnabled) return 0;

  let mergedCount = 0;

  try {
    const events = await engine.nostr.query([
      { kinds: [COLLECTION_KIND], authors: [engine.userPubkey], limit: 100 }
    ]);

    for (const event of events) {
      const merged = await mergeRemoteCollection(event, settings.conflictResolution);
      if (merged) mergedCount++;
    }
  } catch (error) {
    console.error('Failed to pull collections:', error);
  }

  return mergedCount;
}

/**
 * Merge a remote save event with local data
 */
async function mergeRemoteSave(
  event: NostrEvent,
  conflictResolution: 'local' | 'remote' | 'ask'
): Promise<boolean> {
  const dTag = event.tags.find(t => t[0] === 'd')?.[1];
  if (!dTag) return false;

  const existing = await db.saves.get(dTag);
  const remoteUpdatedAt = event.created_at * 1000;

  if (!existing) {
    // New save from relay
    await db.saves.put(eventToLocalSave(event));
    return true;
  }

  // Check for conflict
  const hasLocalChanges = existing.localUpdatedAt > (existing.remoteUpdatedAt || 0);
  const hasRemoteChanges = remoteUpdatedAt > (existing.remoteUpdatedAt || 0);

  if (hasLocalChanges && hasRemoteChanges) {
    // Both local and remote changed since last sync - conflict!
    if (conflictResolution === 'local') {
      // Keep local, mark for re-sync
      await db.saves.update(dTag, { syncStatus: 'local' });
    } else if (conflictResolution === 'remote') {
      // Overwrite with remote
      await db.saves.put(eventToLocalSave(event));
    } else {
      // Mark as conflict for user to resolve
      await db.saves.update(dTag, { syncStatus: 'conflict' });
    }
    return true;
  }

  // Remote is newer, update local
  if (remoteUpdatedAt > existing.localUpdatedAt) {
    await db.saves.put(eventToLocalSave(event));
    return true;
  }

  return false;
}

/**
 * Merge a remote collection event with local data
 */
async function mergeRemoteCollection(
  event: NostrEvent,
  conflictResolution: 'local' | 'remote' | 'ask'
): Promise<boolean> {
  const dTag = event.tags.find(t => t[0] === 'd')?.[1];
  if (!dTag) return false;

  const existing = await db.collections.get(dTag);
  const remoteUpdatedAt = event.created_at * 1000;

  if (!existing) {
    await db.collections.put(eventToLocalCollection(event));
    return true;
  }

  const hasLocalChanges = existing.localUpdatedAt > (existing.remoteUpdatedAt || 0);
  const hasRemoteChanges = remoteUpdatedAt > (existing.remoteUpdatedAt || 0);

  if (hasLocalChanges && hasRemoteChanges) {
    if (conflictResolution === 'local') {
      await db.collections.update(dTag, { syncStatus: 'local' });
    } else if (conflictResolution === 'remote') {
      await db.collections.put(eventToLocalCollection(event));
    } else {
      await db.collections.update(dTag, { syncStatus: 'conflict' });
    }
    return true;
  }

  if (remoteUpdatedAt > existing.localUpdatedAt) {
    await db.collections.put(eventToLocalCollection(event));
    return true;
  }

  return false;
}

/**
 * Convert Nostr event to LocalSave
 */
function eventToLocalSave(event: NostrEvent): LocalSave {
  const getTag = (name: string) => event.tags.find(t => t[0] === name)?.[1];
  const getTags = (name: string) => event.tags.filter(t => t[0] === name).map(t => t[1]);

  const collectionRefs = getTags('a');
  const collectionIds = collectionRefs
    .map(a => {
      const parts = a.split(':');
      return parts.length >= 2 ? parts[1] : null;
    })
    .filter((id): id is string => id !== null);

  return {
    id: getTag('d') || event.id,
    url: getTag('r'),
    title: getTag('title'),
    description: getTag('description'),
    image: getTag('image'),
    contentType: (getTag('content-type') as LocalSave['contentType']) || 'note',
    content: event.content,
    tags: getTags('t'),
    refs: getTags('ref'),
    visibility: (getTag('visibility') as Visibility) || 'private',
    sharedWith: getTags('shared-with'),
    inheritVisibility: false,
    collectionIds,
    syncStatus: 'synced',
    localUpdatedAt: event.created_at * 1000,
    remoteUpdatedAt: event.created_at * 1000,
    nostrEventId: event.id,
    createdAt: event.created_at * 1000,
    updatedAt: event.created_at * 1000,
  };
}

/**
 * Convert Nostr event to LocalCollection
 */
function eventToLocalCollection(event: NostrEvent): LocalCollection {
  const getTag = (name: string) => event.tags.find(t => t[0] === name)?.[1];
  const getTags = (name: string) => event.tags.filter(t => t[0] === name).map(t => t[1]);

  return {
    id: getTag('d') || event.id,
    name: getTag('name') || 'Untitled',
    description: event.content || getTag('description'),
    icon: getTag('icon'),
    visibility: (getTag('visibility') as Visibility) || 'private',
    sharedWith: getTags('shared-with'),
    allowOverride: getTag('allow-override') !== 'false',
    syncStatus: 'synced',
    localUpdatedAt: event.created_at * 1000,
    remoteUpdatedAt: event.created_at * 1000,
    nostrEventId: event.id,
    createdAt: event.created_at * 1000,
    updatedAt: event.created_at * 1000,
  };
}

/**
 * Full sync - push and pull
 */
export async function fullSync(engine: SyncEngine): Promise<{
  pushed: { saves: number; collections: number };
  pulled: { saves: number; collections: number };
}> {
  // Push unsynced local changes
  const unsyncedSaves = await db.saves.where('syncStatus').equals('local').toArray();
  const unsyncedCollections = await db.collections.where('syncStatus').equals('local').toArray();

  const pushResults = {
    saves: (await pushSavesToRelays(engine, unsyncedSaves)).success.length,
    collections: (await pushCollectionsToRelays(engine, unsyncedCollections)).success.length,
  };

  // Pull remote changes
  const pullResults = {
    saves: await pullSavesFromRelays(engine),
    collections: await pullCollectionsFromRelays(engine),
  };

  return { pushed: pushResults, pulled: pullResults };
}

/**
 * Get sync status summary
 */
export async function getSyncStatusSummary(): Promise<{
  local: number;
  syncing: number;
  synced: number;
  conflict: number;
  published: number;
  total: number;
}> {
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
}

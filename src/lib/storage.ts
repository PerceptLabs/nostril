import Dexie, { type Table } from 'dexie';

export type Visibility = 'private' | 'shared' | 'unlisted' | 'public';
export type SyncStatus = 'local' | 'syncing' | 'synced' | 'conflict' | 'published';
export type ArticleStatus = 'draft' | 'scheduled' | 'published';
export type CollectionLayout = 'list' | 'grid' | 'masonry' | 'gallery';

export interface LocalSave {
  id: string;           // d-tag
  url?: string;
  title?: string;
  description?: string;
  image?: string;
  contentType: 'link' | 'image' | 'pdf' | 'note';
  content: string;
  tags: string[];
  refs: string[];

  // Visibility
  visibility: Visibility;
  sharedWith?: string[];        // pubkeys for 'shared'
  inheritVisibility: boolean;   // true = use collection's setting

  // Collection membership
  collectionIds: string[];

  // Sync metadata
  syncStatus: SyncStatus;
  localUpdatedAt: number;
  remoteUpdatedAt?: number;
  nostrEventId?: string;

  // Timestamps
  createdAt: number;
  updatedAt: number;
}

// Board item for visual collections
export interface BoardItem {
  id: string;
  kind: number;
  url?: string;
  title?: string;
  image?: string;
  addedAt: number;
  addedBy: string;
  position?: number;
  note?: string;
}

export interface LocalCollection {
  id: string;           // d-tag
  name: string;
  description?: string;
  icon?: string;

  // Visibility defaults
  visibility: Visibility;
  sharedWith?: string[];
  allowOverride: boolean;       // can saves override? default: true

  // Visual/Board settings
  layout: CollectionLayout;
  coverImage?: string;
  coverColor?: string;
  showCaptions: boolean;
  columns: 2 | 3 | 4 | 5;

  // Board items (for gallery mode)
  items?: BoardItem[];

  // Collaboration
  collaborators?: string[];
  isCollaborative: boolean;

  // Sync metadata
  syncStatus: SyncStatus;
  localUpdatedAt: number;
  remoteUpdatedAt?: number;
  nostrEventId?: string;
  pubkey?: string;

  createdAt: number;
  updatedAt: number;
}

export interface LocalAnnotation {
  id: string;
  saveId: string;
  saveDTag: string;
  content: string;
  context?: string;
  range?: string;
  rect?: string;

  // Sync metadata
  syncStatus: SyncStatus;
  localUpdatedAt: number;
  remoteUpdatedAt?: number;
  nostrEventId?: string;

  createdAt: number;
  updatedAt: number;
}

export interface LocalArticle {
  id: string;                   // d-tag (slug)
  title: string;
  summary: string;
  content: string;              // markdown content
  image?: string;               // cover image
  tags: string[];

  // Publishing state
  status: ArticleStatus;
  publishedAt?: number;
  scheduledFor?: number;

  // Paywall (Cashu)
  paywallEnabled: boolean;
  paywallPrice?: number;        // sats
  paywallPreviewLength?: number; // chars to show free (default: 500)
  paywallMintUrl?: string;

  // Sync metadata
  syncStatus: SyncStatus;
  localUpdatedAt: number;
  remoteUpdatedAt?: number;
  nostrEventId?: string;        // NIP-23 event ID

  // Timestamps
  createdAt: number;
  updatedAt: number;
}

// Track article unlocks (who has paid)
export interface ArticleUnlock {
  id: string;                   // `${readerPubkey}:${articleDTag}`
  articleDTag: string;
  articleAuthor: string;
  readerPubkey: string;
  unlockedAt: number;
  paymentProof: string;         // Cashu token or Lightning preimage
  amountPaid: number;
}

export interface SyncSettings {
  localStorageEnabled: boolean;   // default: true
  relaySyncEnabled: boolean;      // default: true
  syncFrequency: 'instant' | 'manual' | 'interval';
  conflictResolution: 'local' | 'remote' | 'ask';
}

class NostrilDB extends Dexie {
  saves!: Table<LocalSave, string>;
  collections!: Table<LocalCollection, string>;
  articles!: Table<LocalArticle, string>;
  unlocks!: Table<ArticleUnlock, string>;
  annotations!: Table<LocalAnnotation, string>;
  settings!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super('nostril');

    // Version 1: Original schema
    this.version(1).stores({
      saves: 'id, syncStatus, *collectionIds, *tags, visibility, updatedAt, contentType',
      collections: 'id, syncStatus, visibility, updatedAt',
      annotations: 'id, saveId, saveDTag, syncStatus, updatedAt',
      settings: 'key'
    });

    // Version 2: Add articles, unlocks tables and board fields to collections
    this.version(2).stores({
      saves: 'id, syncStatus, *collectionIds, *tags, visibility, updatedAt, contentType',
      collections: 'id, syncStatus, visibility, updatedAt, layout, pubkey',
      articles: 'id, status, syncStatus, *tags, publishedAt, updatedAt',
      unlocks: 'id, articleDTag, articleAuthor, readerPubkey, unlockedAt',
      annotations: 'id, saveId, saveDTag, syncStatus, updatedAt',
      settings: 'key'
    });
  }
}

export const db = new NostrilDB();

// Helper functions
export async function getSyncSettings(): Promise<SyncSettings> {
  const settings = await db.settings.get('sync');
  return (settings?.value as SyncSettings) ?? {
    localStorageEnabled: true,
    relaySyncEnabled: true,
    syncFrequency: 'instant',
    conflictResolution: 'local'
  };
}

export async function setSyncSettings(settings: Partial<SyncSettings>): Promise<void> {
  const current = await getSyncSettings();
  await db.settings.put({ key: 'sync', value: { ...current, ...settings } });
}

export async function getUnsyncedSaves(): Promise<LocalSave[]> {
  return db.saves.where('syncStatus').equals('local').toArray();
}

export async function getUnsyncedCollections(): Promise<LocalCollection[]> {
  return db.collections.where('syncStatus').equals('local').toArray();
}

export async function getEffectiveVisibility(
  save: LocalSave
): Promise<Visibility> {
  if (!save.inheritVisibility && save.visibility) {
    return save.visibility;
  }

  if (save.collectionIds.length === 0) {
    return 'private'; // Library default
  }

  const collections = await db.collections
    .where('id')
    .anyOf(save.collectionIds)
    .toArray();

  if (collections.length === 0) {
    return 'private';
  }

  // Most permissive wins (user explicitly added to that collection)
  const order: Visibility[] = ['public', 'unlisted', 'shared', 'private'];
  const visibilities = collections.map(c => c.visibility);

  for (const v of order) {
    if (visibilities.includes(v)) return v;
  }

  return 'private';
}

/**
 * Get a save by ID from local DB
 */
export async function getLocalSave(id: string): Promise<LocalSave | undefined> {
  return db.saves.get(id);
}

/**
 * Get all saves from local DB
 */
export async function getAllLocalSaves(): Promise<LocalSave[]> {
  return db.saves.orderBy('updatedAt').reverse().toArray();
}

/**
 * Save or update a save in local DB
 */
export async function putLocalSave(save: LocalSave): Promise<string> {
  await db.saves.put(save);
  return save.id;
}

/**
 * Delete a save from local DB
 */
export async function deleteLocalSave(id: string): Promise<void> {
  await db.saves.delete(id);
}

/**
 * Get saves by collection
 */
export async function getSavesByCollection(collectionId: string): Promise<LocalSave[]> {
  return db.saves.where('collectionIds').equals(collectionId).toArray();
}

/**
 * Search saves by text
 */
export async function searchLocalSaves(query: string): Promise<LocalSave[]> {
  const lowerQuery = query.toLowerCase();
  const allSaves = await db.saves.toArray();

  return allSaves.filter(save =>
    save.title?.toLowerCase().includes(lowerQuery) ||
    save.content.toLowerCase().includes(lowerQuery) ||
    save.url?.toLowerCase().includes(lowerQuery) ||
    save.description?.toLowerCase().includes(lowerQuery) ||
    save.tags.some(t => t.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get conflict saves that need resolution
 */
export async function getConflictSaves(): Promise<LocalSave[]> {
  return db.saves.where('syncStatus').equals('conflict').toArray();
}

/**
 * Clear all local data (for logout)
 */
export async function clearLocalData(): Promise<void> {
  await db.saves.clear();
  await db.collections.clear();
  await db.articles.clear();
  await db.unlocks.clear();
  await db.annotations.clear();
}

/**
 * Export all local data
 */
export async function exportLocalData(): Promise<{
  saves: LocalSave[];
  collections: LocalCollection[];
  articles: LocalArticle[];
  unlocks: ArticleUnlock[];
  annotations: LocalAnnotation[];
  settings: SyncSettings;
}> {
  return {
    saves: await db.saves.toArray(),
    collections: await db.collections.toArray(),
    articles: await db.articles.toArray(),
    unlocks: await db.unlocks.toArray(),
    annotations: await db.annotations.toArray(),
    settings: await getSyncSettings(),
  };
}

/**
 * Import data into local DB
 */
export async function importLocalData(data: {
  saves?: LocalSave[];
  collections?: LocalCollection[];
  articles?: LocalArticle[];
  unlocks?: ArticleUnlock[];
  annotations?: LocalAnnotation[];
}): Promise<void> {
  if (data.saves) {
    await db.saves.bulkPut(data.saves);
  }
  if (data.collections) {
    await db.collections.bulkPut(data.collections);
  }
  if (data.articles) {
    await db.articles.bulkPut(data.articles);
  }
  if (data.unlocks) {
    await db.unlocks.bulkPut(data.unlocks);
  }
  if (data.annotations) {
    await db.annotations.bulkPut(data.annotations);
  }
}

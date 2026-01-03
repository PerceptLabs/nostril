import { type NostrEvent } from '@nostrify/nostrify';
import type { BoardItem, CollectionLayout, Visibility } from '@/lib/storage';

export const BOARD_KIND = 30001; // NIP-51 Lists

export interface Board {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  layout: CollectionLayout;
  columns: number;
  items: BoardItem[];
  pubkey: string;
  collaborators: string[];
  visibility: Visibility;
  createdAt: number;
  updatedAt: number;
}

/**
 * Create a NIP-51 Nostr event from board data
 */
export function createBoardEvent(
  board: Board,
  pubkey: string
): Omit<NostrEvent, 'id' | 'sig'> {
  const tags: string[][] = [
    ['d', board.id],
    ['name', board.name],
    ['layout', board.layout],
    ['columns', String(board.columns)],
  ];

  if (board.description) tags.push(['description', board.description]);
  if (board.coverImage) tags.push(['image', board.coverImage]);

  // Add collaborators
  board.collaborators.forEach(pk => {
    tags.push(['p', pk, '', 'collaborator']);
  });

  // Add items
  board.items.forEach(item => {
    if (item.url) {
      tags.push(['r', item.url, item.title || '']);
    } else {
      tags.push(['a', `30078:${pubkey}:${item.id}`, '', item.note || '']);
    }
  });

  return {
    kind: BOARD_KIND,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: board.description || '',
  };
}

/**
 * Parse a NIP-51 Nostr event into Board data
 */
export function parseBoardEvent(event: NostrEvent): Board {
  const tags = event.tags;

  // Extract basic fields from tags
  const id = tags.find(t => t[0] === 'd')?.[1] || event.id;
  const name = tags.find(t => t[0] === 'name')?.[1] || 'Untitled Board';
  const description = tags.find(t => t[0] === 'description')?.[1];
  const coverImage = tags.find(t => t[0] === 'image')?.[1];
  const layout = (tags.find(t => t[0] === 'layout')?.[1] || 'masonry') as CollectionLayout;
  const columns = parseInt(tags.find(t => t[0] === 'columns')?.[1] || '3', 10);

  // Extract collaborators (p tags with 'collaborator' marker)
  const collaborators = tags
    .filter(t => t[0] === 'p' && t[3] === 'collaborator')
    .map(t => t[1]);

  // Extract items from 'r' (URL) and 'a' (reference) tags
  const items: BoardItem[] = [];

  tags.forEach((tag, index) => {
    if (tag[0] === 'r') {
      // URL item
      items.push({
        id: `item-${event.id}-${index}`,
        kind: 0,
        url: tag[1],
        title: tag[2] || undefined,
        addedAt: event.created_at * 1000,
        addedBy: event.pubkey,
        position: items.length,
      });
    } else if (tag[0] === 'a') {
      // Reference item (e.g., to a note)
      const parts = tag[1].split(':');
      const itemId = parts[2] || tag[1];
      items.push({
        id: itemId,
        kind: parseInt(parts[0], 10) || 0,
        note: tag[3] || undefined,
        addedAt: event.created_at * 1000,
        addedBy: event.pubkey,
        position: items.length,
      });
    }
  });

  // Determine visibility (default to 'public' for boards on relays)
  const visibility: Visibility = 'public';

  return {
    id,
    name,
    description,
    coverImage,
    layout,
    columns,
    items,
    pubkey: event.pubkey,
    collaborators,
    visibility,
    createdAt: event.created_at,
    updatedAt: event.created_at,
  };
}

import { type NostrEvent } from "@nostrify/nostrify";

/**
 * Content types for saves
 */
export type ContentType = "link" | "image" | "pdf" | "note";

/**
 * Save event (kind: 30078) - captures URLs, images, PDFs, and notes
 *
 * Tags:
 * - ["d", string] - unique identifier
 * - ["r", string] - original URL
 * - ["x", string] - SHA256 hash
 * - ["blossom", string] - blossom server URL
 * - ["t", string] - tags (repeatable)
 * - ["title", string] - extracted title
 * - ["description", string] - excerpt
 * - ["image", string] - preview image URL
 * - ["content-type", ContentType] - type of content
 * - ["ref", string] - wikilink references (repeatable)
 * - ["published-at", string] - human-readable date
 */
export const SAVE_KIND = 30078;

/**
 * Annotation event (kind: 30079) - annotations on saves
 *
 * Tags:
 * - ["d", string] - unique identifier
 * - ["e", string] - parent save event ID
 * - ["context", string] - quoted text
 * - ["range", string] - character or page range
 * - ["rect", string] - for image/PDF regions
 */
export const ANNOTATION_KIND = 30079;

/**
 * Tag metadata from NIP-51 list
 */
export interface TagMetadata {
  id: string;
  name: string;
  color?: string;
  count?: number;
}

/**
 * Parsed save from raw Nostr event
 */
export interface ParsedSave {
  id: string;
  dTag: string;
  url?: string;
  title?: string;
  description?: string;
  image?: string;
  contentType: ContentType;
  content: string;
  tags: string[];
  refs: string[];
  publishedAt: Date;
  author: {
    pubkey: string;
    name?: string;
    picture?: string;
  };
  hash?: string;
  blossomServer?: string;
}

/**
 * Parsed annotation from raw Nostr event
 */
export interface ParsedAnnotation {
  id: string;
  dTag: string;
  saveId: string;
  context?: string;
  range?: string;
  rect?: string;
  content: string;
  publishedAt: Date;
  author: {
    pubkey: string;
    name?: string;
    picture?: string;
  };
}

/**
 * Filter options for saves query
 */
export interface SaveFilter {
  tags?: string[];
  contentType?: ContentType;
  search?: string;
  author?: string;
  since?: number;
  until?: number;
  limit?: number;
}

/**
 * View modes for library
 */
export type ViewMode = "grid" | "list" | "headlines";

/**
 * Capture form data
 */
export interface CaptureData {
  url?: string;
  title?: string;
  description?: string;
  image?: string;
  contentType: ContentType;
  content: string;
  tags: string[];
  refs: string[];
  visibility?: "private" | "shared" | "unlisted" | "public";
}

/**
 * Generate a unique d-tag for saves
 */
export function generateSaveId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `nostril-${timestamp}-${random}`;
}

/**
 * Parse a save event into ParsedSave
 */
export function parseSaveEvent(event: NostrEvent): ParsedSave | null {
  if (event.kind !== 30078) return null;

  const tags = event.tags;
  const getTag = (name: string, index: number = 1): string | undefined => {
    const tag = tags.find((t) => t[0] === name);
    return tag?.[index];
  };
  const getTags = (name: string): string[] => {
    return tags.filter((t) => t[0] === name).map((t) => t[1]);
  };

  // Extract author name from profile if needed
  const authorName = undefined; // Will be filled by useAuthor hook
  const authorPicture = undefined;

  return {
    id: event.id,
    dTag: getTag("d") || event.id,
    url: getTag("r"),
    title: getTag("title"),
    description: getTag("description"),
    image: getTag("image"),
    contentType: (getTag("content-type") as ContentType) || "note",
    content: event.content,
    tags: getTags("t"),
    refs: getTags("ref"),
    publishedAt: new Date(event.created_at * 1000),
    author: {
      pubkey: event.pubkey,
      name: authorName,
      picture: authorPicture,
    },
    hash: getTag("x"),
    blossomServer: getTag("blossom"),
  };
}

/**
 * Parse annotation event
 */
export function parseAnnotationEvent(event: NostrEvent): ParsedAnnotation | null {
  if (event.kind !== 30079) return null;

  return {
    id: event.id,
    dTag: event.tags.find((t) => t[0] === "d")?.[1] || event.id,
    saveId: event.tags.find((t) => t[0] === "e")?.[1] || "",
    context: event.tags.find((t) => t[0] === "context")?.[1],
    range: event.tags.find((t) => t[0] === "range")?.[1],
    rect: event.tags.find((t) => t[0] === "rect")?.[1],
    content: event.content,
    publishedAt: new Date(event.created_at * 1000),
    author: {
      pubkey: event.pubkey,
    },
  };
}

/**
 * Extract tags from markdown content
 */
export function extractTagsFromContent(content: string): string[] {
  const tagRegex = /#(\w+)/g;
  const tags: string[] = [];
  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    const tag = match[1].toLowerCase();
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }
  return tags;
}

/**
 * Extract wikilinks from markdown content
 */
export function extractWikilinks(content: string): string[] {
  const wikilinkRegex = /\[\[(.*?)\]\]/g;
  const links: string[] = [];
  let match;
  while ((match = wikilinkRegex.exec(content)) !== null) {
    const link = match[1];
    if (!links.includes(link)) {
      links.push(link);
    }
  }
  return links;
}

/**
 * Convert parsed save to Nostr event tags
 */
export function saveToTags(data: CaptureData): string[][] {
  const tags: string[][] = [["d", data.url || generateSaveId()]];

  if (data.url) {
    tags.push(["r", data.url]);
  }
  if (data.title) {
    tags.push(["title", data.title]);
  }
  if (data.description) {
    tags.push(["description", data.description]);
  }
  if (data.image) {
    tags.push(["image", data.image]);
  }
  tags.push(["content-type", data.contentType]);

  data.tags.forEach((tag) => {
    tags.push(["t", tag.toLowerCase()]);
  });

  data.refs.forEach((ref) => {
    tags.push(["ref", ref]);
  });

  return tags;
}
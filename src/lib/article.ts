// Article publishing library for NIP-23 long-form content
// Based on nostril-articles-spec.md

import type { NostrEvent } from '@nostrify/nostrify';
import { nanoid } from 'nanoid';
import type { LocalArticle } from '@/lib/storage';

export const ARTICLE_KIND = 30023;  // NIP-23 long-form content

export interface Article {
  // Identity
  id: string;              // Nostr event ID
  dTag: string;            // Unique slug (e.g., "my-first-article")
  pubkey: string;          // Author's pubkey

  // Content
  title: string;
  summary: string;         // 1-2 sentence description
  content: string;         // Full markdown content
  image?: string;          // Cover image URL (Blossom)

  // Metadata
  publishedAt: number;     // Unix timestamp
  updatedAt?: number;      // If edited
  tags: string[];          // Topics: ["bitcoin", "privacy", "nostr"]

  // Paywall (optional)
  paywall?: {
    price: number;         // Sats to unlock
    previewLength: number; // Characters shown free
    mintUrl: string;       // Cashu mint for payments
  };

  // Stats (computed client-side)
  wordCount: number;
  readingTime: number;     // Minutes
}

export interface ArticleDraft extends Omit<Article, 'id' | 'pubkey' | 'publishedAt'> {
  localId: string;         // IndexedDB ID
  status: 'draft' | 'scheduled' | 'published';
  scheduledFor?: number;   // Future publish time
  lastSavedAt: number;
}

/**
 * Generate a URL-safe slug from title
 */
export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);

  return `${base}-${nanoid(6)}`;
}

/**
 * Calculate reading time in minutes
 */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Create a NIP-23 article event
 */
export function createArticleEvent(
  article: LocalArticle,
  pubkey: string
): Omit<NostrEvent, 'id' | 'sig'> {
  const tags: string[][] = [
    ['d', article.id],
    ['title', article.title],
    ['summary', article.summary],
    ['published_at', String(article.publishedAt || Math.floor(Date.now() / 1000))],
  ];

  // Cover image
  if (article.image) {
    tags.push(['image', article.image]);
  }

  // Topic tags
  article.tags.forEach(t => tags.push(['t', t]));

  // Paywall metadata
  if (article.paywallEnabled && article.paywallPrice) {
    tags.push([
      'paywall',
      String(article.paywallPrice),
      String(article.paywallPreviewLength || 500),
      article.paywallMintUrl || 'https://mint.minibits.cash/Bitcoin'
    ]);
  }

  return {
    kind: ARTICLE_KIND,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: article.content,
  };
}

/**
 * Parse a NIP-23 event into Article structure
 */
export function parseArticleEvent(event: NostrEvent): Article {
  const getTag = (name: string) => event.tags.find(t => t[0] === name)?.[1];
  const getTags = (name: string) => event.tags.filter(t => t[0] === name).map(t => t[1]);

  const paywallTag = event.tags.find(t => t[0] === 'paywall');

  return {
    id: event.id,
    dTag: getTag('d') || event.id,
    pubkey: event.pubkey,
    title: getTag('title') || 'Untitled',
    summary: getTag('summary') || '',
    content: event.content,
    image: getTag('image'),
    publishedAt: parseInt(getTag('published_at') || String(event.created_at)),
    tags: getTags('t'),
    paywall: paywallTag ? {
      price: parseInt(paywallTag[1]),
      previewLength: parseInt(paywallTag[2] || '500'),
      mintUrl: paywallTag[3] || 'https://mint.minibits.cash/Bitcoin',
    } : undefined,
    wordCount: event.content.split(/\s+/).length,
    readingTime: calculateReadingTime(event.content),
  };
}

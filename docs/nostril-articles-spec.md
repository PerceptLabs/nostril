# Nostril: Article Publishing & Paywall Specification

## Overview

Transform Nostril from a read-later app into a full publishing platform with direct monetization. Writers publish long-form content (NIP-23), readers discover and pay directly via Cashu/Lightning.

---

## Part 1: Data Models

### 1.1 Article Schema (NIP-23)

```typescript
// src/lib/article.ts

import type { NostrEvent } from '@nostrify/nostrify';

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
```

### 1.2 Local Storage Schema Update

```typescript
// src/lib/storage.ts - Add to existing schema

export interface LocalArticle {
  id: string;              // d-tag (slug)
  title: string;
  summary: string;
  content: string;
  image?: string;
  tags: string[];
  
  // Publishing state
  status: 'draft' | 'scheduled' | 'published';
  publishedAt?: number;
  scheduledFor?: number;
  
  // Paywall
  paywallEnabled: boolean;
  paywallPrice?: number;
  paywallPreviewLength?: number;
  paywallMintUrl?: string;
  
  // Sync
  syncStatus: SyncStatus;
  localUpdatedAt: number;
  remoteUpdatedAt?: number;
  nostrEventId?: string;
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
}

export interface ArticleUnlock {
  id: string;              // `${readerPubkey}:${articleDTag}`
  articleDTag: string;
  articleAuthor: string;
  readerPubkey: string;
  unlockedAt: number;
  paymentProof: string;    // Cashu token or Lightning preimage
  amountPaid: number;
}

// Update Dexie schema
class NostrilDB extends Dexie {
  saves!: Table<LocalSave, string>;
  collections!: Table<LocalCollection, string>;
  annotations!: Table<LocalAnnotation, string>;
  articles!: Table<LocalArticle, string>;        // NEW
  unlocks!: Table<ArticleUnlock, string>;        // NEW
  settings!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super('nostril');
    this.version(2).stores({
      saves: 'id, syncStatus, *collectionIds, *tags, visibility, updatedAt, contentType',
      collections: 'id, syncStatus, visibility, updatedAt',
      annotations: 'id, saveId, saveDTag, syncStatus, updatedAt',
      articles: 'id, status, syncStatus, *tags, publishedAt, updatedAt',
      unlocks: 'id, articleDTag, articleAuthor, readerPubkey, unlockedAt',
      settings: 'key'
    });
  }
}
```

---

## Part 2: Article Publishing

### 2.1 Nostr Event Creation

```typescript
// src/lib/article.ts

import { nanoid } from 'nanoid';

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
```

### 2.2 Article Editor Component

```tsx
// src/components/editor/ArticleEditor.tsx

import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Eye,
  Save,
  Send,
  Settings,
  Image as ImageIcon,
  Plus,
  X,
  Loader2,
  Clock,
  DollarSign,
  Lock,
  Globe,
  Zap,
} from 'lucide-react';
import { MarkdownEditor } from './MarkdownEditor';
import { useToast } from '@/hooks/useToast';
import { useUploadFile } from '@/hooks/useUploadFile';
import { useCreateArticle, useUpdateArticle, usePublishArticle } from '@/hooks/useArticles';
import { generateSlug, calculateReadingTime } from '@/lib/article';
import { cn } from '@/lib/utils';
import type { LocalArticle } from '@/lib/storage';

const articleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  summary: z.string().max(500).optional(),
  content: z.string().min(1, 'Content is required'),
  image: z.string().url().optional().or(z.literal('')),
  tags: z.array(z.string()),
  paywallEnabled: z.boolean(),
  paywallPrice: z.number().min(1).optional(),
  paywallPreviewLength: z.number().min(100).optional(),
});

type ArticleFormData = z.infer<typeof articleSchema>;

interface ArticleEditorProps {
  article?: LocalArticle;
  onSave?: (article: LocalArticle) => void;
}

export function ArticleEditor({ article, onSave }: ArticleEditorProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUploadFile();
  const { createArticle, isPending: isCreating } = useCreateArticle();
  const { updateArticle, isPending: isUpdating } = useUpdateArticle();
  const { publishArticle, isPending: isPublishing } = usePublishArticle();
  
  const [newTag, setNewTag] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();
  
  const form = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: article?.title || '',
      summary: article?.summary || '',
      content: article?.content || '',
      image: article?.image || '',
      tags: article?.tags || [],
      paywallEnabled: article?.paywallEnabled || false,
      paywallPrice: article?.paywallPrice || 1000,
      paywallPreviewLength: article?.paywallPreviewLength || 500,
    },
  });
  
  const { watch, setValue, handleSubmit } = form;
  const watchedContent = watch('content');
  const watchedTitle = watch('title');
  const watchedTags = watch('tags');
  const watchedPaywallEnabled = watch('paywallEnabled');
  
  const wordCount = watchedContent.split(/\s+/).filter(Boolean).length;
  const readingTime = calculateReadingTime(watchedContent);
  
  // Auto-save every 30 seconds
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = setTimeout(() => {
      handleSaveDraft();
    }, 30000);
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [watchedContent, watchedTitle]);
  
  const handleSaveDraft = useCallback(async () => {
    const data = form.getValues();
    
    try {
      if (article?.id) {
        await updateArticle({
          id: article.id,
          updates: {
            ...data,
            status: 'draft',
          },
        });
      } else {
        const slug = generateSlug(data.title || 'untitled');
        await createArticle({
          ...data,
          id: slug,
          status: 'draft',
        });
      }
      
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [article, form, createArticle, updateArticle]);
  
  const handlePublish = handleSubmit(async (data) => {
    try {
      const slug = article?.id || generateSlug(data.title);
      
      // Create or update the article
      if (article?.id) {
        await updateArticle({
          id: article.id,
          updates: data,
        });
      } else {
        await createArticle({
          ...data,
          id: slug,
          status: 'draft',
        });
      }
      
      // Publish to Nostr
      await publishArticle(slug);
      
      toast({
        title: 'Published!',
        description: 'Your article is now live on Nostr.',
      });
      
      navigate(`/article/${slug}`);
    } catch (error) {
      toast({
        title: 'Publish failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  });
  
  const handleImageUpload = useCallback(async (file: File) => {
    try {
      const url = await uploadFile(file);
      setValue('image', url);
      toast({
        title: 'Image uploaded',
        description: 'Cover image has been set.',
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  }, [uploadFile, setValue, toast]);
  
  const handleAddTag = useCallback(() => {
    const tag = newTag.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (tag && !watchedTags.includes(tag)) {
      setValue('tags', [...watchedTags, tag]);
      setNewTag('');
    }
  }, [newTag, watchedTags, setValue]);
  
  const handleRemoveTag = useCallback((tag: string) => {
    setValue('tags', watchedTags.filter(t => t !== tag));
  }, [watchedTags, setValue]);
  
  const isPending = isCreating || isUpdating || isPublishing;
  
  return (
    <div className="min-h-screen bg-background">
      {/* Top toolbar */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              ← Back
            </Button>
            {lastSaved && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="h-4 w-4 mr-1" />
              {showPreview ? 'Edit' : 'Preview'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isPending}
            >
              <Save className="h-4 w-4 mr-1" />
              Save Draft
            </Button>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-1" />
                  Settings
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Article Settings</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 py-6">
                  {/* Cover Image */}
                  <div className="space-y-2">
                    <Label>Cover Image</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://..."
                        value={watch('image')}
                        onChange={(e) => setValue('image', e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) handleImageUpload(file);
                          };
                          input.click();
                        }}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ImageIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Summary */}
                  <div className="space-y-2">
                    <Label>Summary</Label>
                    <Textarea
                      placeholder="A brief description for previews..."
                      value={watch('summary')}
                      onChange={(e) => setValue('summary', e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      {watch('summary')?.length || 0}/500
                    </p>
                  </div>
                  
                  {/* Tags */}
                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {watchedTags.map(tag => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="gap-1 cursor-pointer"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          #{tag}
                          <X className="h-3 w-3" />
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a tag..."
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                      />
                      <Button variant="outline" size="icon" onClick={handleAddTag}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Paywall Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Paywall</Label>
                        <p className="text-xs text-muted-foreground">
                          Charge readers to access full content
                        </p>
                      </div>
                      <Switch
                        checked={watchedPaywallEnabled}
                        onCheckedChange={(checked) => setValue('paywallEnabled', checked)}
                      />
                    </div>
                    
                    {watchedPaywallEnabled && (
                      <div className="space-y-4 pl-4 border-l-2">
                        <div className="space-y-2">
                          <Label>Price (sats)</Label>
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            <Input
                              type="number"
                              min={1}
                              value={watch('paywallPrice')}
                              onChange={(e) => setValue('paywallPrice', parseInt(e.target.value))}
                              className="w-32"
                            />
                            <span className="text-sm text-muted-foreground">
                              ≈ ${((watch('paywallPrice') || 0) * 0.0004).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Free Preview Length</Label>
                          <Select
                            value={String(watch('paywallPreviewLength'))}
                            onValueChange={(v) => setValue('paywallPreviewLength', parseInt(v))}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="250">~1 paragraph</SelectItem>
                              <SelectItem value="500">~2 paragraphs</SelectItem>
                              <SelectItem value="1000">~4 paragraphs</SelectItem>
                              <SelectItem value="2000">~8 paragraphs</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            
            <Button onClick={handlePublish} disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Publish
            </Button>
          </div>
        </div>
      </header>
      
      {/* Editor area */}
      <main className="container max-w-4xl mx-auto px-4 py-8">
        {/* Title */}
        <Input
          placeholder="Article title..."
          value={watchedTitle}
          onChange={(e) => setValue('title', e.target.value)}
          className="text-4xl font-serif font-bold border-0 px-0 focus-visible:ring-0 mb-6"
        />
        
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
          <span>{wordCount} words</span>
          <span>·</span>
          <span>{readingTime} min read</span>
          {watchedPaywallEnabled && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1 text-yellow-600">
                <Lock className="h-3 w-3" />
                {watch('paywallPrice')} sats
              </span>
            </>
          )}
        </div>
        
        {/* Content */}
        {showPreview ? (
          <article className="prose prose-lg dark:prose-invert max-w-none">
            {/* Render markdown preview */}
            <div dangerouslySetInnerHTML={{ 
              __html: renderMarkdown(watchedContent) 
            }} />
          </article>
        ) : (
          <MarkdownEditor
            value={watchedContent}
            onChange={(v) => setValue('content', v)}
            placeholder="Start writing your article..."
            className="min-h-[60vh]"
          />
        )}
      </main>
    </div>
  );
}

// Simple markdown renderer (use a library like marked in production)
function renderMarkdown(content: string): string {
  return content
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/\n/gim, '<br>');
}
```

### 2.3 Article Hooks

```typescript
// src/hooks/useArticles.ts

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from './useCurrentUser';
import { db, type LocalArticle } from '@/lib/storage';
import { createArticleEvent, parseArticleEvent, ARTICLE_KIND } from '@/lib/article';
import { nanoid } from 'nanoid';

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
 * Get a single article by ID (d-tag)
 */
export function useArticle(id: string | undefined) {
  const article = useLiveQuery(
    async () => id ? db.articles.get(id) : undefined,
    [id]
  );
  
  return {
    data: article,
    isLoading: article === undefined && id !== undefined,
  };
}

/**
 * Get articles from Nostr (public feed)
 */
export function usePublicArticles(options?: {
  authors?: string[];
  tags?: string[];
  limit?: number;
}) {
  const { nostr } = useNostr();
  const queryClient = useQueryClient();
  
  return useLiveQuery(async () => {
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
      const events = await nostr.query([filters], {
        signal: AbortSignal.timeout(10000),
      });
      
      return events.map(parseArticleEvent);
    } catch (error) {
      console.error('Failed to fetch articles:', error);
      return [];
    }
  }, [options?.authors?.join(','), options?.tags?.join(','), options?.limit]);
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
    },
  });
  
  return {
    updateArticle: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Publish article to Nostr
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
      await db.articles.update(id, {
        status: 'published',
        publishedAt: Math.floor(Date.now() / 1000),
        syncStatus: 'published',
        nostrEventId: signedEvent.id,
      });
      
      return signedEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });
  
  return {
    publishArticle: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Delete an article
 */
export function useDeleteArticle() {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: async (id: string) => {
      await db.articles.delete(id);
      // TODO: Publish delete event to Nostr (NIP-09)
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });
  
  return {
    deleteArticle: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
```

---

## Part 3: Paywall Implementation

### 3.1 Cashu Payment Flow

```typescript
// src/lib/paywall.ts

import { CashuMint, CashuWallet, getEncodedToken, getDecodedToken, type Token } from '@cashu/cashu-ts';
import { db, type ArticleUnlock } from './storage';

const DEFAULT_MINT = 'https://mint.minibits.cash/Bitcoin';

export interface PaywallConfig {
  price: number;           // Sats
  previewLength: number;   // Characters
  mintUrl: string;
}

export interface PaymentRequest {
  articleId: string;
  authorPubkey: string;
  price: number;
  mintUrl: string;
  invoice?: string;        // Lightning invoice (optional)
}

/**
 * Check if user has unlocked an article
 */
export async function hasUnlocked(
  articleDTag: string,
  readerPubkey: string
): Promise<boolean> {
  const unlockId = `${readerPubkey}:${articleDTag}`;
  const unlock = await db.unlocks.get(unlockId);
  return !!unlock;
}

/**
 * Get article content with paywall applied
 */
export function getPaywalledContent(
  content: string,
  paywall: PaywallConfig,
  isUnlocked: boolean
): { preview: string; premium: string | null; isComplete: boolean } {
  if (isUnlocked || !paywall) {
    return {
      preview: content,
      premium: null,
      isComplete: true,
    };
  }
  
  // Split at preview length, trying to break at paragraph
  const previewLength = paywall.previewLength;
  let breakPoint = content.indexOf('\n\n', previewLength - 100);
  
  if (breakPoint === -1 || breakPoint > previewLength + 200) {
    // No good paragraph break, just cut at length
    breakPoint = previewLength;
  }
  
  return {
    preview: content.slice(0, breakPoint),
    premium: content.slice(breakPoint),
    isComplete: false,
  };
}

/**
 * Create a payment request for an article
 */
export async function createPaymentRequest(
  articleDTag: string,
  authorPubkey: string,
  paywall: PaywallConfig
): Promise<PaymentRequest> {
  // For now, just return the payment details
  // In production, you might generate a Lightning invoice
  return {
    articleId: articleDTag,
    authorPubkey,
    price: paywall.price,
    mintUrl: paywall.mintUrl || DEFAULT_MINT,
  };
}

/**
 * Process a Cashu token payment
 */
export async function processTokenPayment(
  token: string,
  request: PaymentRequest,
  readerPubkey: string
): Promise<ArticleUnlock> {
  // Decode and validate token
  const decoded = getDecodedToken(token);
  
  // Calculate total amount in token
  const totalAmount = decoded.token.reduce((sum, t) => {
    return sum + t.proofs.reduce((s, p) => s + p.amount, 0);
  }, 0);
  
  if (totalAmount < request.price) {
    throw new Error(`Insufficient payment: got ${totalAmount}, need ${request.price}`);
  }
  
  // Verify token is from expected mint
  const tokenMint = decoded.token[0]?.mint;
  if (tokenMint !== request.mintUrl) {
    throw new Error(`Token from wrong mint: got ${tokenMint}, expected ${request.mintUrl}`);
  }
  
  // In production: Redeem token to verify it's valid and not double-spent
  // const mint = new CashuMint(request.mintUrl);
  // const wallet = new CashuWallet(mint);
  // await wallet.receive(token);
  
  // Record unlock
  const unlockId = `${readerPubkey}:${request.articleId}`;
  const unlock: ArticleUnlock = {
    id: unlockId,
    articleDTag: request.articleId,
    articleAuthor: request.authorPubkey,
    readerPubkey,
    unlockedAt: Date.now(),
    paymentProof: token,
    amountPaid: totalAmount,
  };
  
  await db.unlocks.put(unlock);
  
  // TODO: Forward payment to author (minus platform fee)
  // This would involve:
  // 1. Redeem token to platform wallet
  // 2. Create new token for author (minus fee)
  // 3. Send to author via NIP-04 DM or Nostr wallet
  
  return unlock;
}

/**
 * Process a Lightning payment
 */
export async function processLightningPayment(
  preimage: string,
  request: PaymentRequest,
  readerPubkey: string
): Promise<ArticleUnlock> {
  // Verify preimage matches invoice (in production)
  // This requires backend infrastructure
  
  const unlockId = `${readerPubkey}:${request.articleId}`;
  const unlock: ArticleUnlock = {
    id: unlockId,
    articleDTag: request.articleId,
    articleAuthor: request.authorPubkey,
    readerPubkey,
    unlockedAt: Date.now(),
    paymentProof: preimage,
    amountPaid: request.price,
  };
  
  await db.unlocks.put(unlock);
  
  return unlock;
}

/**
 * Get all articles user has unlocked
 */
export async function getUnlockedArticles(readerPubkey: string): Promise<ArticleUnlock[]> {
  return db.unlocks
    .where('readerPubkey')
    .equals(readerPubkey)
    .toArray();
}

/**
 * Get earnings for an author
 */
export async function getAuthorEarnings(authorPubkey: string): Promise<{
  total: number;
  byArticle: { articleId: string; amount: number; count: number }[];
}> {
  const unlocks = await db.unlocks
    .where('articleAuthor')
    .equals(authorPubkey)
    .toArray();
  
  const total = unlocks.reduce((sum, u) => sum + u.amountPaid, 0);
  
  const byArticle = new Map<string, { amount: number; count: number }>();
  for (const unlock of unlocks) {
    const existing = byArticle.get(unlock.articleDTag) || { amount: 0, count: 0 };
    byArticle.set(unlock.articleDTag, {
      amount: existing.amount + unlock.amountPaid,
      count: existing.count + 1,
    });
  }
  
  return {
    total,
    byArticle: Array.from(byArticle.entries()).map(([articleId, data]) => ({
      articleId,
      ...data,
    })),
  };
}
```

### 3.2 Paywall Gate Component

```tsx
// src/components/PaywallGate.tsx

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Lock,
  Zap,
  Coins,
  Loader2,
  CheckCircle,
  Copy,
  QrCode,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNWC } from '@/hooks/useNWC';
import {
  createPaymentRequest,
  processTokenPayment,
  processLightningPayment,
  type PaymentRequest,
  type PaywallConfig,
} from '@/lib/paywall';
import { cn } from '@/lib/utils';

interface PaywallGateProps {
  articleId: string;
  authorPubkey: string;
  authorName?: string;
  paywall: PaywallConfig;
  onUnlock: () => void;
  className?: string;
}

export function PaywallGate({
  articleId,
  authorPubkey,
  authorName,
  paywall,
  onUnlock,
  className,
}: PaywallGateProps) {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { payInvoice, isConnected: nwcConnected } = useNWC();
  
  const [showPayment, setShowPayment] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [cashuToken, setCashuToken] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'lightning' | 'cashu'>('lightning');
  
  const priceUsd = (paywall.price * 0.0004).toFixed(2);
  
  const handleStartPayment = useCallback(async () => {
    try {
      const request = await createPaymentRequest(articleId, authorPubkey, paywall);
      setPaymentRequest(request);
      setShowPayment(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  }, [articleId, authorPubkey, paywall, toast]);
  
  const handleCashuPayment = useCallback(async () => {
    if (!paymentRequest || !user || !cashuToken.trim()) return;
    
    setIsProcessing(true);
    try {
      await processTokenPayment(cashuToken, paymentRequest, user.pubkey);
      
      toast({
        title: 'Payment successful!',
        description: 'Article unlocked. Enjoy your read!',
      });
      
      setShowPayment(false);
      onUnlock();
    } catch (error) {
      toast({
        title: 'Payment failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [paymentRequest, user, cashuToken, toast, onUnlock]);
  
  const handleLightningPayment = useCallback(async () => {
    if (!paymentRequest || !user) return;
    
    setIsProcessing(true);
    try {
      // If NWC is connected, pay directly
      if (nwcConnected && paymentRequest.invoice) {
        const result = await payInvoice(paymentRequest.invoice);
        if (result.preimage) {
          await processLightningPayment(result.preimage, paymentRequest, user.pubkey);
          toast({
            title: 'Payment successful!',
            description: 'Article unlocked. Enjoy your read!',
          });
          setShowPayment(false);
          onUnlock();
          return;
        }
      }
      
      // Otherwise, show invoice for manual payment
      // In production, generate invoice via your backend
      toast({
        title: 'Lightning payment',
        description: 'Copy the invoice and pay with your Lightning wallet.',
      });
    } catch (error) {
      toast({
        title: 'Payment failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [paymentRequest, user, nwcConnected, payInvoice, toast, onUnlock]);
  
  return (
    <>
      {/* Paywall barrier */}
      <div className={cn(
        "relative py-12 my-8",
        "before:absolute before:inset-x-0 before:top-0 before:h-24",
        "before:bg-gradient-to-b before:from-transparent before:to-background",
        className
      )}>
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Premium Content</CardTitle>
            <CardDescription>
              {authorName ? `Support ${authorName} to` : 'Pay to'} unlock the full article
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-3xl font-bold flex items-center justify-center gap-2">
              <Zap className="h-6 w-6 text-yellow-500" />
              {paywall.price.toLocaleString()} sats
              <span className="text-sm font-normal text-muted-foreground">
                (~${priceUsd})
              </span>
            </div>
            
            {user ? (
              <Button size="lg" className="w-full" onClick={handleStartPayment}>
                <Zap className="h-4 w-4 mr-2" />
                Unlock Article
              </Button>
            ) : (
              <div className="space-y-2">
                <Button size="lg" variant="outline" className="w-full" disabled>
                  Login to unlock
                </Button>
                <p className="text-xs text-muted-foreground">
                  Sign in with Nostr to purchase access
                </p>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              Pay with Lightning or Cashu tokens. Your purchase supports the author directly.
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Payment dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              Pay {paywall.price.toLocaleString()} sats to unlock this article
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="lightning" className="gap-2">
                <Zap className="h-4 w-4" />
                Lightning
              </TabsTrigger>
              <TabsTrigger value="cashu" className="gap-2">
                <Coins className="h-4 w-4" />
                Cashu
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="lightning" className="space-y-4">
              {nwcConnected ? (
                <div className="text-center space-y-4 py-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                  <p>Wallet connected via NWC</p>
                  <Button
                    className="w-full"
                    onClick={handleLightningPayment}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    Pay {paywall.price} sats
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Connect a Lightning wallet to pay instantly, or scan the QR code below.
                  </p>
                  
                  {paymentRequest?.invoice ? (
                    <>
                      <div className="flex justify-center p-4 bg-white rounded-lg">
                        {/* QR Code would go here */}
                        <div className="h-48 w-48 bg-gray-100 flex items-center justify-center">
                          <QrCode className="h-8 w-8 text-gray-400" />
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Input
                          value={paymentRequest.invoice}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(paymentRequest.invoice!);
                            toast({ title: 'Copied!' });
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-center text-muted-foreground">
                      Lightning invoices coming soon. Use Cashu tokens for now.
                    </p>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="cashu" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cashu-token">Paste Cashu Token</Label>
                <Input
                  id="cashu-token"
                  placeholder="cashuA..."
                  value={cashuToken}
                  onChange={(e) => setCashuToken(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Paste a Cashu token worth at least {paywall.price} sats from{' '}
                  <a
                    href={paywall.mintUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {new URL(paywall.mintUrl).hostname}
                  </a>
                </p>
              </div>
              
              <Button
                className="w-full"
                onClick={handleCashuPayment}
                disabled={isProcessing || !cashuToken.trim()}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Coins className="h-4 w-4 mr-2" />
                )}
                Submit Payment
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### 3.3 Article Reader with Paywall

```tsx
// src/components/ArticleReader.tsx

import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bookmark,
  Share2,
  MessageCircle,
  Calendar,
  Clock,
  Zap,
  Lock,
} from 'lucide-react';
import { ZapButton } from '@/components/ZapButton';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { PaywallGate } from '@/components/PaywallGate';
import { FollowButton } from '@/components/FollowButton';
import { usePublicArticle } from '@/hooks/useArticles';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { hasUnlocked, getPaywalledContent } from '@/lib/paywall';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Article } from '@/lib/article';

export function ArticleReader() {
  const { dTag } = useParams<{ dTag: string }>();
  const { user } = useCurrentUser();
  const { data: article, isLoading } = usePublicArticle(dTag);
  const { data: author } = useAuthor(article?.pubkey);
  
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [checkingUnlock, setCheckingUnlock] = useState(true);
  
  // Check if user has already unlocked
  useEffect(() => {
    async function checkUnlock() {
      if (!user || !article?.dTag || !article.paywall) {
        setIsUnlocked(!article?.paywall);
        setCheckingUnlock(false);
        return;
      }
      
      const unlocked = await hasUnlocked(article.dTag, user.pubkey);
      setIsUnlocked(unlocked);
      setCheckingUnlock(false);
    }
    
    checkUnlock();
  }, [user, article]);
  
  // Get content with paywall applied
  const { preview, premium, isComplete } = useMemo(() => {
    if (!article) return { preview: '', premium: null, isComplete: true };
    
    return getPaywalledContent(
      article.content,
      article.paywall!,
      isUnlocked || !article.paywall
    );
  }, [article, isUnlocked]);
  
  if (isLoading) {
    return <ArticleReaderSkeleton />;
  }
  
  if (!article) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Article not found</h1>
        <p className="text-muted-foreground mb-8">
          This article may have been deleted or doesn't exist.
        </p>
        <Button asChild>
          <Link to="/discover">Browse articles</Link>
        </Button>
      </div>
    );
  }
  
  const publishedDate = new Date(article.publishedAt * 1000);
  
  return (
    <article className="min-h-screen">
      {/* Cover image */}
      {article.image && (
        <div className="w-full h-[40vh] md:h-[50vh] relative">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>
      )}
      
      <div className="container max-w-2xl mx-auto px-4 py-8">
        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {article.tags.map(tag => (
              <Link key={tag} to={`/topic/${tag}`}>
                <Badge variant="secondary" className="hover:bg-secondary/80">
                  #{tag}
                </Badge>
              </Link>
            ))}
          </div>
        )}
        
        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 leading-tight">
          {article.title}
        </h1>
        
        {/* Summary */}
        {article.summary && (
          <p className="text-xl text-muted-foreground mb-6">
            {article.summary}
          </p>
        )}
        
        {/* Author + Meta */}
        <div className="flex items-center gap-4 mb-8">
          <Link to={`/@${author?.npub || article.pubkey.slice(0, 8)}`}>
            <Avatar className="h-12 w-12">
              <AvatarImage src={author?.picture} />
              <AvatarFallback>
                {(author?.name || 'A')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          
          <div className="flex-1">
            <Link
              to={`/@${author?.npub || article.pubkey.slice(0, 8)}`}
              className="font-medium hover:underline"
            >
              {author?.name || `${article.pubkey.slice(0, 8)}...`}
            </Link>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(publishedDate, 'MMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {article.readingTime} min read
              </span>
              {article.paywall && (
                <span className="flex items-center gap-1 text-yellow-600">
                  <Lock className="h-3 w-3" />
                  {article.paywall.price} sats
                </span>
              )}
            </div>
          </div>
          
          <FollowButton pubkey={article.pubkey} />
        </div>
        
        <Separator className="mb-8" />
        
        {/* Content */}
        <div className="prose prose-lg dark:prose-invert max-w-none">
          {/* Free preview */}
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(preview) }} />
          
          {/* Paywall gate */}
          {!isComplete && !checkingUnlock && (
            <PaywallGate
              articleId={article.dTag}
              authorPubkey={article.pubkey}
              authorName={author?.name}
              paywall={article.paywall!}
              onUnlock={() => setIsUnlocked(true)}
            />
          )}
          
          {/* Premium content (if unlocked) */}
          {isUnlocked && premium && (
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(premium) }} />
          )}
        </div>
        
        <Separator className="my-8" />
        
        {/* Engagement */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <ZapButton
              target={{
                id: article.id,
                pubkey: article.pubkey,
                created_at: article.publishedAt,
                kind: 30023,
                tags: [['d', article.dTag]],
                content: article.content,
                sig: '',
              }}
              showCount
              size="lg"
            />
            
            <Button variant="ghost" size="lg">
              <MessageCircle className="h-5 w-5 mr-2" />
              Comment
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bookmark className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Author bio */}
        <div className="bg-muted/50 rounded-lg p-6 my-8">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={author?.picture} />
              <AvatarFallback>
                {(author?.name || 'A')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Written by</p>
              <h3 className="text-lg font-semibold mb-2">
                {author?.name || 'Anonymous'}
              </h3>
              {author?.about && (
                <p className="text-muted-foreground text-sm mb-4">
                  {author.about}
                </p>
              )}
              <FollowButton pubkey={article.pubkey} />
            </div>
          </div>
        </div>
        
        {/* Comments */}
        <CommentsSection
          target={{
            id: article.id,
            pubkey: article.pubkey,
            created_at: article.publishedAt,
            kind: 30023,
            tags: [['d', article.dTag]],
            content: '',
            sig: '',
          }}
        />
      </div>
    </article>
  );
}

function ArticleReaderSkeleton() {
  return (
    <div className="container max-w-2xl mx-auto px-4 py-12">
      <Skeleton className="h-8 w-3/4 mb-4" />
      <Skeleton className="h-6 w-1/2 mb-8" />
      <div className="flex items-center gap-4 mb-8">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

// Simple markdown renderer
function renderMarkdown(content: string): string {
  return content
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '');
}
```

---

## Part 4: Discovery & Feed

### 4.1 Discover Page

```tsx
// src/pages/Discover.tsx

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Search,
  TrendingUp,
  Users,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ArticleCard } from '@/components/ArticleCard';
import { usePublicArticles, useNetworkArticles, useTrendingArticles } from '@/hooks/useArticles';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const POPULAR_TOPICS = [
  'bitcoin', 'nostr', 'privacy', 'technology', 'programming',
  'philosophy', 'economics', 'science', 'writing', 'art'
];

export function Discover() {
  const { user } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('trending');
  
  // Different article feeds
  const { data: trendingArticles, isLoading: trendingLoading } = useTrendingArticles();
  const { data: networkArticles, isLoading: networkLoading } = useNetworkArticles();
  const { data: topicArticles, isLoading: topicLoading } = usePublicArticles({
    tags: selectedTopic ? [selectedTopic] : undefined,
    limit: 50,
  });
  
  const displayedArticles = useMemo(() => {
    switch (activeTab) {
      case 'network':
        return networkArticles;
      case 'topic':
        return topicArticles;
      default:
        return trendingArticles;
    }
  }, [activeTab, trendingArticles, networkArticles, topicArticles]);
  
  const isLoading = activeTab === 'trending' ? trendingLoading :
                    activeTab === 'network' ? networkLoading : topicLoading;
  
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
              <Link to="/write">Write Article</Link>
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
                onClick={() => {
                  setSelectedTopic(selectedTopic === topic ? null : topic);
                  setActiveTab('topic');
                }}
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
                  Your Network
                </TabsTrigger>
              )}
              <TabsTrigger value="latest" className="gap-2">
                <Clock className="h-4 w-4" />
                Latest
              </TabsTrigger>
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
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              No articles found
            </p>
            {activeTab === 'network' && (
              <p className="text-sm text-muted-foreground">
                Follow some writers to see their articles here
              </p>
            )}
          </div>
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
```

### 4.2 Article Card Component

```tsx
// src/components/ArticleCard.tsx

import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Lock, Zap, Clock, MessageCircle } from 'lucide-react';
import { useAuthor } from '@/hooks/useAuthor';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Article } from '@/lib/article';

interface ArticleCardProps {
  article: Article;
  className?: string;
}

export function ArticleCard({ article, className }: ArticleCardProps) {
  const { data: author } = useAuthor(article.pubkey);
  
  const publishedDate = new Date(article.publishedAt * 1000);
  
  return (
    <Card className={cn("group overflow-hidden hover:shadow-lg transition-all", className)}>
      <Link to={`/article/${article.dTag}`}>
        {/* Cover image */}
        {article.image ? (
          <div className="aspect-video overflow-hidden">
            <img
              src={article.image}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <span className="text-4xl font-serif font-bold text-primary/20">
              {article.title[0]}
            </span>
          </div>
        )}
      </Link>
      
      <CardHeader className="pb-2">
        {/* Tags + Paywall indicator */}
        <div className="flex items-center gap-2 mb-2">
          {article.tags.slice(0, 2).map(tag => (
            <Link key={tag} to={`/topic/${tag}`}>
              <Badge variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            </Link>
          ))}
          {article.paywall && (
            <Badge variant="outline" className="text-xs text-yellow-600 gap-1">
              <Lock className="h-3 w-3" />
              {article.paywall.price} sats
            </Badge>
          )}
        </div>
        
        {/* Title */}
        <Link to={`/article/${article.dTag}`}>
          <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {article.title}
          </h3>
        </Link>
      </CardHeader>
      
      <CardContent className="pb-2">
        {/* Summary */}
        {article.summary && (
          <p className="text-muted-foreground text-sm line-clamp-2">
            {article.summary}
          </p>
        )}
      </CardContent>
      
      <CardFooter className="pt-2">
        <div className="flex items-center justify-between w-full">
          {/* Author */}
          <Link
            to={`/@${author?.npub || article.pubkey.slice(0, 8)}`}
            className="flex items-center gap-2"
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={author?.picture} />
              <AvatarFallback className="text-xs">
                {(author?.name || 'A')[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground hover:text-foreground">
              {author?.name || `${article.pubkey.slice(0, 8)}...`}
            </span>
          </Link>
          
          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {article.readingTime}m
            </span>
            <span>
              {formatDistanceToNow(publishedDate, { addSuffix: true })}
            </span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

export function ArticleCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-muted animate-pulse" />
      <CardHeader className="pb-2">
        <div className="flex gap-2 mb-2">
          <div className="h-5 w-16 bg-muted rounded animate-pulse" />
          <div className="h-5 w-16 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-6 w-3/4 bg-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2">
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 bg-muted rounded-full animate-pulse" />
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        </div>
      </CardFooter>
    </Card>
  );
}
```

---

## Part 5: Writer Dashboard

### 5.1 Dashboard Page

```tsx
// src/pages/Dashboard.tsx

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Zap,
  Users,
  Eye,
  TrendingUp,
  Plus,
  ArrowUpRight,
  Lock,
  Globe,
  Edit,
  BarChart3,
} from 'lucide-react';
import { useMyArticles } from '@/hooks/useArticles';
import { useFollowerCount, useZapsReceived } from '@/hooks/useStats';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getAuthorEarnings } from '@/lib/paywall';
import { formatDistanceToNow } from 'date-fns';

export function Dashboard() {
  const { user } = useCurrentUser();
  const { data: articles } = useMyArticles();
  const { data: followerCount } = useFollowerCount(user?.pubkey);
  const { data: zaps } = useZapsReceived(user?.pubkey);
  
  // Calculate stats
  const stats = useMemo(() => {
    if (!articles || !zaps) return null;
    
    const published = articles.filter(a => a.status === 'published');
    const drafts = articles.filter(a => a.status === 'draft');
    const paywalled = published.filter(a => a.paywallEnabled);
    
    const totalZapAmount = zaps.reduce((sum, z) => sum + z.amount, 0);
    const thisMonthZaps = zaps
      .filter(z => z.createdAt > Date.now() - 30 * 24 * 60 * 60 * 1000)
      .reduce((sum, z) => sum + z.amount, 0);
    
    return {
      published: published.length,
      drafts: drafts.length,
      paywalled: paywalled.length,
      totalZaps: totalZapAmount,
      monthlyZaps: thisMonthZaps,
      followers: followerCount || 0,
    };
  }, [articles, zaps, followerCount]);
  
  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Writer Dashboard</h1>
        <p className="text-muted-foreground mb-8">
          Sign in to access your dashboard
        </p>
        <Button>Login with Nostr</Button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">
                Track your writing performance
              </p>
            </div>
            <Button asChild>
              <Link to="/write">
                <Plus className="h-4 w-4 mr-2" />
                New Article
              </Link>
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container max-w-6xl mx-auto px-4 py-8">
        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            title="Published"
            value={stats?.published || 0}
            icon={FileText}
            description={`${stats?.drafts || 0} drafts`}
          />
          <StatCard
            title="Followers"
            value={stats?.followers || 0}
            icon={Users}
            trend="+12% this month"
          />
          <StatCard
            title="Total Earnings"
            value={`${(stats?.totalZaps || 0).toLocaleString()} sats`}
            icon={Zap}
            description={`${stats?.monthlyZaps?.toLocaleString()} this month`}
            className="text-yellow-600"
          />
          <StatCard
            title="Paywalled"
            value={stats?.paywalled || 0}
            icon={Lock}
            description="Premium articles"
          />
        </div>
        
        {/* Articles list */}
        <Tabs defaultValue="published">
          <TabsList className="mb-4">
            <TabsTrigger value="published">
              Published ({stats?.published || 0})
            </TabsTrigger>
            <TabsTrigger value="drafts">
              Drafts ({stats?.drafts || 0})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="published">
            <Card>
              <CardHeader>
                <CardTitle>Published Articles</CardTitle>
                <CardDescription>
                  Your articles live on Nostr
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {articles
                    ?.filter(a => a.status === 'published')
                    .map(article => (
                      <ArticleRow key={article.id} article={article} />
                    ))}
                  
                  {articles?.filter(a => a.status === 'published').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No published articles yet</p>
                      <Button variant="link" asChild>
                        <Link to="/write">Write your first article</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="drafts">
            <Card>
              <CardHeader>
                <CardTitle>Drafts</CardTitle>
                <CardDescription>
                  Unpublished work in progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {articles
                    ?.filter(a => a.status === 'draft')
                    .map(article => (
                      <ArticleRow key={article.id} article={article} showEdit />
                    ))}
                  
                  {articles?.filter(a => a.status === 'draft').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Edit className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No drafts</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
}: {
  title: string;
  value: string | number;
  icon: any;
  description?: string;
  trend?: string;
  className?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          <Icon className={cn("h-4 w-4 text-muted-foreground", className)} />
        </div>
        <p className={cn("text-2xl font-bold mt-2", className)}>{value}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ArticleRow({
  article,
  showEdit,
}: {
  article: any;
  showEdit?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      {article.image ? (
        <img
          src={article.image}
          alt=""
          className="h-16 w-24 object-cover rounded"
        />
      ) : (
        <div className="h-16 w-24 bg-muted rounded flex items-center justify-center">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Link
            to={showEdit ? `/write/${article.id}` : `/article/${article.id}`}
            className="font-medium hover:text-primary truncate"
          >
            {article.title || 'Untitled'}
          </Link>
          {article.paywallEnabled && (
            <Badge variant="outline" className="text-xs gap-1">
              <Lock className="h-3 w-3" />
              {article.paywallPrice} sats
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {article.publishedAt
            ? `Published ${formatDistanceToNow(article.publishedAt * 1000, { addSuffix: true })}`
            : `Last edited ${formatDistanceToNow(article.updatedAt, { addSuffix: true })}`}
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        {showEdit ? (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/write/${article.id}`}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Link>
          </Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/article/${article.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/article/${article.id}/stats`}>
                <BarChart3 className="h-4 w-4" />
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## Part 6: Routes & Navigation

### 6.1 Updated Router

```tsx
// src/AppRouter.tsx - Add new routes

import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { Layout } from "./components/Layout";

// Existing pages
import Index from "./pages/Index";
import { Library } from "./pages/Library";
import { Editor } from "./pages/Editor";
import { Inbox } from "./pages/Inbox";
import { Collections, CollectionDetail } from "./pages/Collections";
import { SearchPage } from "./pages/Search";
import { Graph } from "./pages/Graph";
import { Settings } from "./pages/Settings";
import NotFound from "./pages/NotFound";

// NEW: Article pages
import { Discover } from "./pages/Discover";
import { ArticleReader } from "./components/ArticleReader";
import { ArticleEditor } from "./components/editor/ArticleEditor";
import { Dashboard } from "./pages/Dashboard";
import { WriterProfile } from "./pages/WriterProfile";
import { TopicPage } from "./pages/TopicPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Layout-wrapped routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Index />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="library" element={<Library />} />
          <Route path="library/:filter" element={<Library />} />
          <Route path="collections" element={<Collections />} />
          <Route path="collections/:id" element={<CollectionDetail />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="search/:query" element={<SearchPage />} />
          <Route path="graph" element={<Graph />} />
          <Route path="settings" element={<Settings />} />
          
          {/* NEW: Article routes */}
          <Route path="discover" element={<Discover />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="topic/:topic" element={<TopicPage />} />
        </Route>
        
        {/* Full-width routes (no sidebar) */}
        <Route path="write" element={<ArticleEditor />} />
        <Route path="write/:dTag" element={<ArticleEditor />} />
        <Route path="article/:dTag" element={<ArticleReader />} />
        
        {/* Writer profiles */}
        <Route path="@:identifier" element={<WriterProfile />} />
        
        {/* Redirects */}
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/index" element={<Navigate to="/" replace />} />
        
        {/* Editor for save IDs (existing) */}
        <Route path="/:dTag" element={<Editor />} />
        
        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 6.2 Updated Navigation

```tsx
// src/components/Layout.tsx - Add to navItems

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/discover", icon: Sparkles, label: "Discover" },  // NEW
  { path: "/inbox", icon: Inbox, label: "Inbox" },
  { path: "/library", icon: Library, label: "Library" },
  { path: "/collections", icon: FolderOpen, label: "Collections" },
  { path: "/dashboard", icon: BarChart3, label: "Dashboard" },  // NEW
  { path: "/graph", icon: Network, label: "Graph" },
  { path: "/settings", icon: Settings, label: "Settings" },
];
```

---

## Part 7: Summary & Next Steps

### What This Spec Covers

| Feature | Status | Files |
|---------|--------|-------|
| **Article Schema** | Complete | `src/lib/article.ts` |
| **Article Storage** | Complete | `src/lib/storage.ts` |
| **Article Hooks** | Complete | `src/hooks/useArticles.ts` |
| **Article Editor** | Complete | `src/components/editor/ArticleEditor.tsx` |
| **Article Reader** | Complete | `src/components/ArticleReader.tsx` |
| **Paywall Logic** | Complete | `src/lib/paywall.ts` |
| **Payment Gate UI** | Complete | `src/components/PaywallGate.tsx` |
| **Discovery Feed** | Complete | `src/pages/Discover.tsx` |
| **Writer Dashboard** | Complete | `src/pages/Dashboard.tsx` |
| **Routes** | Complete | `src/AppRouter.tsx` |

### Implementation Order

```
Week 1: Core Publishing
├── Day 1-2: Article schema + storage
├── Day 3-4: Article editor
└── Day 5: Article reader (no paywall)

Week 2: Paywalls
├── Day 1-2: Paywall logic + Cashu integration
├── Day 3-4: Payment gate UI
└── Day 5: Testing payment flow

Week 3: Discovery
├── Day 1-2: Discover page + feeds
├── Day 3-4: Writer profiles
└── Day 5: Topic pages

Week 4: Dashboard + Polish
├── Day 1-2: Writer dashboard
├── Day 3-4: Stats + earnings tracking
└── Day 5: Testing + bug fixes
```

### Backend Requirements

For production, you'll need:

1. **Lightning Invoice Generation** - Backend to create invoices and verify payments
2. **Cashu Mint** - Either run your own or use existing mints
3. **Payment Forwarding** - Route payments to authors (minus platform fee)
4. **Analytics** - Track views, zaps, unlocks per article

### Revenue Model

```
Reader pays 1000 sats to unlock article
  ├── 900 sats → Author (90%)
  └── 100 sats → Platform (10%)
```

Platform cut covers:
- Infrastructure (relays, blob storage)
- Payment processing
- Development + maintenance

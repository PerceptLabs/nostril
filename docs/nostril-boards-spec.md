# Nostril: Visual Boards & Galleries

## Overview

Transform collections into shareable visual boards—Pinterest-style curation on Nostr. Users can create public mood boards, share galleries, and discover curated visual content.

---

## Part 1: Data Models

### 1.1 Enhanced Collection Schema

```typescript
// src/lib/storage.ts - Update LocalCollection

export type CollectionLayout = 'list' | 'grid' | 'masonry' | 'gallery';

export interface LocalCollection {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  
  // Visual settings
  layout: CollectionLayout;
  coverImage?: string;
  coverColor?: string;
  showCaptions: boolean;
  columns: 2 | 3 | 4 | 5;
  
  // Items
  items?: BoardItem[];
  
  // Collaboration
  collaborators?: string[];
  isCollaborative: boolean;
  
  // Visibility
  visibility: Visibility;
  sharedWith?: string[];
  
  // Sync
  syncStatus: SyncStatus;
  localUpdatedAt: number;
  nostrEventId?: string;
  pubkey?: string;
  
  createdAt: number;
  updatedAt: number;
}
```

### 1.2 Board Item Schema

```typescript
// src/lib/boards.ts

export const BOARD_KIND = 30001;  // NIP-51 Lists

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
```

### 1.3 Nostr Event Creation

```typescript
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
```

---

## Part 2: Masonry Gallery Component

### 2.1 MasonryGallery.tsx

```tsx
// src/components/gallery/MasonryGallery.tsx

import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Bookmark, ExternalLink, MoreHorizontal,
  Maximize2, Download, Share2,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { BoardItem } from '@/lib/boards';

interface MasonryGalleryProps {
  items: BoardItem[];
  columns?: 2 | 3 | 4 | 5;
  showCaptions?: boolean;
  onItemClick?: (item: BoardItem) => void;
  onSave?: (item: BoardItem) => void;
  className?: string;
}

export function MasonryGallery({
  items,
  columns = 3,
  showCaptions = true,
  onItemClick,
  onSave,
  className,
}: MasonryGalleryProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  
  // Distribute items across columns
  const columnItems = useMemo(() => {
    const cols: BoardItem[][] = Array.from({ length: columns }, () => []);
    items.forEach((item, index) => {
      cols[index % columns].push(item);
    });
    return cols;
  }, [items, columns]);
  
  const columnClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  }[columns];
  
  return (
    <div className={cn('grid gap-4', columnClass, className)}>
      {columnItems.map((column, colIndex) => (
        <div key={colIndex} className="flex flex-col gap-4">
          {column.map((item) => (
            <GalleryItem
              key={item.id}
              item={item}
              showCaption={showCaptions}
              isLoaded={loadedImages.has(item.id)}
              onLoad={() => setLoadedImages(prev => new Set(prev).add(item.id))}
              onClick={() => onItemClick?.(item)}
              onSave={() => onSave?.(item)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function GalleryItem({
  item,
  showCaption,
  isLoaded,
  onLoad,
  onClick,
  onSave,
}: {
  item: BoardItem;
  showCaption: boolean;
  isLoaded: boolean;
  onLoad: () => void;
  onClick?: () => void;
  onSave?: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const imageUrl = item.image || item.url;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative rounded-xl overflow-hidden bg-muted cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <img
        src={imageUrl}
        alt={item.title || ''}
        className={cn(
          'w-full h-auto object-cover transition-all duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          isHovered && 'scale-105'
        )}
        onLoad={onLoad}
        loading="lazy"
      />
      
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
          >
            {/* Top actions */}
            <div className="absolute top-2 right-2 flex gap-1">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full bg-white/90 hover:bg-white"
                onClick={(e) => { e.stopPropagation(); onSave?.(); }}
              >
                <Bookmark className="h-4 w-4" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-white/90 hover:bg-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem><Maximize2 className="h-4 w-4 mr-2" />View full size</DropdownMenuItem>
                  <DropdownMenuItem><Download className="h-4 w-4 mr-2" />Download</DropdownMenuItem>
                  <DropdownMenuItem><Share2 className="h-4 w-4 mr-2" />Share</DropdownMenuItem>
                  {item.url && (
                    <DropdownMenuItem asChild>
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />Open original
                      </a>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Bottom caption */}
            {showCaption && item.title && (
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white font-medium line-clamp-2">{item.title}</h3>
                {item.note && (
                  <p className="text-white/70 text-sm mt-1 line-clamp-2">{item.note}</p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

### 2.2 Lightbox.tsx

```tsx
// src/components/gallery/Lightbox.tsx

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  X, ChevronLeft, ChevronRight, Download,
  Share2, Bookmark, ExternalLink, ZoomIn, ZoomOut,
} from 'lucide-react';
import type { BoardItem } from '@/lib/boards';

interface LightboxProps {
  items: BoardItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (item: BoardItem) => void;
}

export function Lightbox({
  items,
  initialIndex,
  isOpen,
  onClose,
  onSave,
}: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  
  const currentItem = items[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;
  
  useEffect(() => {
    setZoom(1);
  }, [currentIndex]);
  
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape': onClose(); break;
        case 'ArrowLeft': if (hasPrev) setCurrentIndex(i => i - 1); break;
        case 'ArrowRight': if (hasNext) setCurrentIndex(i => i + 1); break;
        case '+': case '=': setZoom(z => Math.min(z + 0.5, 3)); break;
        case '-': setZoom(z => Math.max(z - 0.5, 0.5)); break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrev, hasNext, onClose]);
  
  const handleDownload = useCallback(async () => {
    if (!currentItem?.image) return;
    const response = await fetch(currentItem.image);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentItem.title || 'image';
    a.click();
    URL.revokeObjectURL(url);
  }, [currentItem]);
  
  if (!isOpen || !currentItem) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Close */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-white hover:bg-white/10 z-10"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>
        
        {/* Navigation */}
        {hasPrev && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 z-10 h-12 w-12"
            onClick={(e) => { e.stopPropagation(); setCurrentIndex(i => i - 1); }}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
        )}
        
        {hasNext && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 z-10 h-12 w-12"
            onClick={(e) => { e.stopPropagation(); setCurrentIndex(i => i + 1); }}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        )}
        
        {/* Image */}
        <motion.img
          key={currentIndex}
          src={currentItem.image || currentItem.url}
          alt={currentItem.title || ''}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: zoom }}
          className="max-h-[85vh] max-w-[85vw] object-contain"
          onClick={(e) => e.stopPropagation()}
        />
        
        {/* Bottom toolbar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="max-w-2xl mx-auto">
            {currentItem.title && (
              <h3 className="text-white text-lg font-medium mb-2">{currentItem.title}</h3>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-white" onClick={() => setZoom(z => Math.min(z + 0.5, 3))}>
                  <ZoomIn className="h-4 w-4 mr-1" />Zoom In
                </Button>
                <Button variant="ghost" size="sm" className="text-white" onClick={() => setZoom(z => Math.max(z - 0.5, 0.5))}>
                  <ZoomOut className="h-4 w-4 mr-1" />Zoom Out
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-white" onClick={() => onSave?.(currentItem)}>
                  <Bookmark className="h-4 w-4 mr-1" />Save
                </Button>
                <Button variant="ghost" size="sm" className="text-white" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1" />Download
                </Button>
              </div>
            </div>
            
            <div className="text-center mt-4 text-white/50 text-sm">
              {currentIndex + 1} / {items.length}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
```

---

## Part 3: Board View Page

```tsx
// src/pages/BoardView.tsx

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Grid3X3, LayoutGrid, List, MoreHorizontal, Share2,
  UserPlus, Edit, Trash, Link as LinkIcon, Bookmark,
  Users, Lock, Globe,
} from 'lucide-react';
import { MasonryGallery } from '@/components/gallery/MasonryGallery';
import { Lightbox } from '@/components/gallery/Lightbox';
import { useBoard, useFollowBoard } from '@/hooks/useBoards';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { CollectionLayout } from '@/lib/boards';

export function BoardView() {
  const { boardId } = useParams<{ boardId: string }>();
  const { user } = useCurrentUser();
  const { data: board, isLoading } = useBoard(boardId);
  const { data: author } = useAuthor(board?.pubkey);
  const { followBoard, unfollowBoard, isFollowing } = useFollowBoard(boardId);
  
  const [layout, setLayout] = useState<CollectionLayout>(board?.layout || 'masonry');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  const isOwner = user?.pubkey === board?.pubkey;
  const isCollaborator = board?.collaborators.includes(user?.pubkey || '');
  const canEdit = isOwner || isCollaborator;
  
  if (isLoading) return <BoardSkeleton />;
  
  if (!board) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Board not found</h1>
        <p className="text-muted-foreground mb-8">This board may be private or doesn't exist.</p>
        <Button asChild><Link to="/boards">Browse boards</Link></Button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative">
        {board.coverImage ? (
          <div className="h-64 md:h-80 overflow-hidden">
            <img src={board.coverImage} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>
        ) : (
          <div 
            className="h-48 md:h-64"
            style={{
              background: `linear-gradient(135deg, 
                hsl(${hashCode(board.id) % 360}, 70%, 60%), 
                hsl(${(hashCode(board.id) + 60) % 360}, 70%, 50%))`
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          </div>
        )}
        
        <div className="container max-w-6xl mx-auto px-4 -mt-16 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="gap-1">
                  {board.visibility === 'private' ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                  {board.visibility === 'private' ? 'Private' : 'Public'}
                </Badge>
                {board.collaborators.length > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <Users className="h-3 w-3" />{board.collaborators.length + 1} collaborators
                  </Badge>
                )}
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{board.name}</h1>
              {board.description && <p className="text-muted-foreground max-w-2xl">{board.description}</p>}
            </div>
            
            <div className="flex items-center gap-2">
              {!isOwner && (
                <Button
                  variant={isFollowing ? 'outline' : 'default'}
                  onClick={() => isFollowing ? unfollowBoard() : followBoard()}
                >
                  <Bookmark className={cn('h-4 w-4 mr-2', isFollowing && 'fill-current')} />
                  {isFollowing ? 'Saved' : 'Save Board'}
                </Button>
              )}
              
              <Button variant="outline"><Share2 className="h-4 w-4 mr-2" />Share</Button>
              
              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/board/${board.id}/edit`}><Edit className="h-4 w-4 mr-2" />Edit board</Link>
                    </DropdownMenuItem>
                    {isOwner && <DropdownMenuItem><UserPlus className="h-4 w-4 mr-2" />Add collaborator</DropdownMenuItem>}
                    <DropdownMenuItem><LinkIcon className="h-4 w-4 mr-2" />Copy link</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {isOwner && <DropdownMenuItem className="text-destructive"><Trash className="h-4 w-4 mr-2" />Delete board</DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          
          {/* Author + Layout toggle */}
          <div className="flex items-center justify-between pb-6 border-b">
            <Link to={`/@${author?.npub || board.pubkey.slice(0, 8)}`} className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={author?.picture} />
                <AvatarFallback>{(author?.name || 'A')[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium hover:underline">{author?.name || 'Anonymous'}</p>
                <p className="text-sm text-muted-foreground">
                  {board.items.length} pins · Created {formatDistanceToNow(board.createdAt * 1000, { addSuffix: true })}
                </p>
              </div>
            </Link>
            
            <Tabs value={layout} onValueChange={(v) => setLayout(v as CollectionLayout)}>
              <TabsList>
                <TabsTrigger value="masonry"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="grid"><Grid3X3 className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="list"><List className="h-4 w-4" /></TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>
      
      {/* Gallery */}
      <main className="container max-w-6xl mx-auto px-4 py-8">
        {board.items.length === 0 ? (
          <EmptyBoard canEdit={canEdit} boardId={board.id} />
        ) : (
          <MasonryGallery
            items={board.items}
            columns={board.columns as 2 | 3 | 4 | 5}
            onItemClick={(item) => {
              const index = board.items.findIndex(i => i.id === item.id);
              setLightboxIndex(index);
            }}
          />
        )}
      </main>
      
      <Lightbox
        items={board.items}
        initialIndex={lightboxIndex || 0}
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}

function EmptyBoard({ canEdit, boardId }: { canEdit: boolean; boardId: string }) {
  return (
    <div className="text-center py-16">
      <div className="h-24 w-24 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
        <LayoutGrid className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">No pins yet</h3>
      <p className="text-muted-foreground mb-4">
        {canEdit ? "Start adding images to your board" : "This board doesn't have any pins yet"}
      </p>
      {canEdit && <Button asChild><Link to={`/board/${boardId}/add`}>Add pins</Link></Button>}
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-64 bg-muted animate-pulse" />
      <div className="container max-w-6xl mx-auto px-4 -mt-16 relative z-10">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-4" />
        <div className="h-12 w-96 bg-muted rounded animate-pulse mb-6" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash);
}
```

---

## Part 4: Board Card & Discovery

### 4.1 BoardCard.tsx

```tsx
// src/components/BoardCard.tsx

import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Lock, Users } from 'lucide-react';
import { useAuthor } from '@/hooks/useAuthor';
import { cn } from '@/lib/utils';
import type { Board } from '@/lib/boards';

export function BoardCard({ board, className }: { board: Board; className?: string }) {
  const { data: author } = useAuthor(board.pubkey);
  
  const previewImages = board.items
    .filter(item => item.image || item.url)
    .slice(0, 4)
    .map(item => item.image || item.url);
  
  return (
    <Link to={`/board/${board.id}`}>
      <Card className={cn('group overflow-hidden hover:shadow-lg transition-all cursor-pointer', className)}>
        {/* Preview grid */}
        <div className="aspect-[4/3] grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden">
          {previewImages.length > 0 ? (
            <>
              {previewImages.map((url, i) => (
                <div key={i} className="overflow-hidden">
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
              {[...Array(Math.max(0, 4 - previewImages.length))].map((_, i) => (
                <div key={`empty-${i}`} className="bg-muted" />
              ))}
            </>
          ) : (
            <div 
              className="col-span-2 row-span-2"
              style={{
                background: `linear-gradient(135deg, 
                  hsl(${Math.abs(board.id.charCodeAt(0) * 7) % 360}, 60%, 60%), 
                  hsl(${Math.abs(board.id.charCodeAt(0) * 7 + 60) % 360}, 60%, 50%))`
              }}
            />
          )}
        </div>
        
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
              {board.name}
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              {board.visibility === 'private' && <Lock className="h-3 w-3 text-muted-foreground" />}
              {board.collaborators.length > 0 && (
                <Badge variant="secondary" className="text-xs px-1"><Users className="h-3 w-3" /></Badge>
              )}
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">{board.items.length} pins</p>
          
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={author?.picture} />
              <AvatarFallback className="text-xs">{(author?.name || 'A')[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{author?.name || 'Anonymous'}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
```

### 4.2 ExploreBoards.tsx

```tsx
// src/pages/ExploreBoards.tsx

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, TrendingUp, Users, Sparkles, Grid3X3, Plus } from 'lucide-react';
import { BoardCard } from '@/components/BoardCard';
import { useTrendingBoards, useFollowedBoards, usePublicBoards } from '@/hooks/useBoards';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const CATEGORIES = [
  'design', 'photography', 'art', 'fashion', 'travel',
  'food', 'architecture', 'nature', 'technology', 'illustration'
];

export function ExploreBoards() {
  const { user } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const { data: trendingBoards, isLoading } = useTrendingBoards();
  const { data: followedBoards } = useFollowedBoards(user?.pubkey);
  const { data: categoryBoards } = usePublicBoards({
    tags: selectedCategory ? [selectedCategory] : undefined,
  });
  
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Grid3X3 className="h-6 w-6 text-primary" />Explore Boards
            </h1>
            <Button asChild>
              <Link to="/board/new"><Plus className="h-4 w-4 mr-2" />Create Board</Link>
            </Button>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search boards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 pb-4">
            {CATEGORIES.map(category => (
              <Badge
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                className="cursor-pointer capitalize"
                onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="trending">
          <TabsList className="mb-6">
            <TabsTrigger value="trending" className="gap-2"><TrendingUp className="h-4 w-4" />Trending</TabsTrigger>
            {user && <TabsTrigger value="following" className="gap-2"><Users className="h-4 w-4" />Following</TabsTrigger>}
            <TabsTrigger value="new" className="gap-2"><Sparkles className="h-4 w-4" />New</TabsTrigger>
          </TabsList>
          
          <TabsContent value="trending">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {trendingBoards?.map(board => <BoardCard key={board.id} board={board} />)}
            </div>
          </TabsContent>
          
          <TabsContent value="following">
            {followedBoards?.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">You're not following any boards yet</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {followedBoards?.map(board => <BoardCard key={board.id} board={board} />)}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="new">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {categoryBoards?.map(board => <BoardCard key={board.id} board={board} />)}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
```

---

## Part 5: Hooks

```typescript
// src/hooks/useBoards.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from './useCurrentUser';
import { db } from '@/lib/storage';
import { parseBoardEvent, BOARD_KIND, type Board } from '@/lib/boards';

export function useBoard(boardId: string | undefined) {
  const { nostr } = useNostr();
  
  const localBoard = useLiveQuery(
    async () => boardId ? db.collections.get(boardId) : undefined,
    [boardId]
  );
  
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
    staleTime: 5 * 60 * 1000,
  });
}

export function useFollowedBoards(pubkey: string | undefined) {
  return useQuery({
    queryKey: ['boards', 'following', pubkey],
    queryFn: async () => [] as Board[],
    enabled: !!pubkey,
  });
}

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

export function useFollowBoard(boardId: string | undefined) {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  
  const isFollowing = useLiveQuery(async () => {
    if (!user || !boardId) return false;
    const setting = await db.settings.get(`following:${boardId}`);
    return !!setting?.value;
  }, [user?.pubkey, boardId]);
  
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user || !boardId) throw new Error('Not logged in');
      await db.settings.put({ key: `following:${boardId}`, value: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boards', 'following'] }),
  });
  
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

export function useAddToBoard() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ boardId, item }: { boardId: string; item: any }) => {
      if (!user) throw new Error('Not logged in');
      
      const board = await db.collections.get(boardId);
      if (!board) throw new Error('Board not found');
      
      const newItem = {
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

function convertToBoard(collection: any): Board {
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
```

---

## Part 6: Routes

```tsx
// Add to AppRouter.tsx

import { BoardView } from './pages/BoardView';
import { BoardEditor } from './pages/BoardEditor';
import { ExploreBoards } from './pages/ExploreBoards';

// Routes:
<Route path="boards" element={<ExploreBoards />} />
<Route path="board/new" element={<BoardEditor />} />
<Route path="board/:boardId" element={<BoardView />} />
<Route path="board/:boardId/edit" element={<BoardEditor />} />

// Navigation:
{ path: "/boards", icon: Grid3X3, label: "Boards" }
```

---

## Summary

| Feature | Description |
|---------|-------------|
| **Masonry Gallery** | Pinterest-style responsive grid |
| **Lightbox** | Full-screen viewing + keyboard nav |
| **Board Pages** | Public shareable galleries |
| **Discovery** | Trending/followed/category browsing |
| **Collaboration** | Multiple users can add pins |
| **Sharing** | Embed code + social sharing |

### Use Cases

- Mood boards (design inspiration)
- Travel galleries
- Research collections  
- Product wishlists
- Team asset libraries
- Portfolio showcases

### Nostr Integration

- Boards = NIP-51 Lists (kind 30001)
- Images = Blossom blobs or URLs
- Discovery = Relay queries by tag

### Monetization

| Model | Description |
|-------|-------------|
| Premium Boards | Charge to view full collection |
| Curator Tips | Zap curators |
| Sell Collections | One-time purchase |
| Sponsored Pins | Brand placements |

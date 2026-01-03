import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Bookmark,
  ExternalLink,
  MoreHorizontal,
  Maximize2,
  Download,
  Share2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { BoardItem } from '@/lib/storage';

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
                onClick={(e) => {
                  e.stopPropagation();
                  onSave?.();
                }}
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
                  <DropdownMenuItem>
                    <Maximize2 className="h-4 w-4 mr-2" />
                    View full size
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  {item.url && (
                    <DropdownMenuItem asChild>
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open original
                      </a>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Bottom caption */}
            {showCaption && item.title && (
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white font-medium line-clamp-2">
                  {item.title}
                </h3>
                {item.note && (
                  <p className="text-white/70 text-sm mt-1 line-clamp-2">
                    {item.note}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

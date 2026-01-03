import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  Bookmark,
  ExternalLink,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { BoardItem } from '@/lib/storage';

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
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (hasPrev) setCurrentIndex(i => i - 1);
          break;
        case 'ArrowRight':
          if (hasNext) setCurrentIndex(i => i + 1);
          break;
        case '+':
        case '=':
          setZoom(z => Math.min(z + 0.5, 3));
          break;
        case '-':
          setZoom(z => Math.max(z - 0.5, 0.5));
          break;
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
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(i => i - 1);
            }}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
        )}

        {hasNext && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 z-10 h-12 w-12"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(i => i + 1);
            }}
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
              <h3 className="text-white text-lg font-medium mb-2">
                {currentItem.title}
              </h3>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoom(z => Math.min(z + 0.5, 3));
                  }}
                >
                  <ZoomIn className="h-4 w-4 mr-1" />
                  Zoom In
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoom(z => Math.max(z - 0.5, 0.5));
                  }}
                >
                  <ZoomOut className="h-4 w-4 mr-1" />
                  Zoom Out
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {onSave && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSave(currentItem);
                    }}
                  >
                    <Bookmark className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload();
                  }}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                {currentItem.url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/10"
                    asChild
                  >
                    <a
                      href={currentItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open
                    </a>
                  </Button>
                )}
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

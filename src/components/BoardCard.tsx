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
              <AvatarImage src={author?.metadata?.picture} />
              <AvatarFallback className="text-xs">{(author?.metadata?.name || 'A')[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{author?.metadata?.name || 'Anonymous'}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

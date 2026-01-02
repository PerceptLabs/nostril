import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSaves } from "@/hooks/useSaves";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  Link2,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParsedSave, ContentType } from "@/lib/nostril";

interface GraphNode {
  id: string;
  dTag: string;
  title: string;
  contentType: ContentType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  connections: number;
}

interface GraphEdge {
  source: string;
  target: string;
}

const contentTypeColors: Record<ContentType, string> = {
  link: "#3b82f6",
  image: "#a855f7",
  pdf: "#ef4444",
  note: "#22c55e",
};

export function Graph() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<ContentType | "all">("all");

  const { data: saves, isLoading } = useSaves({ limit: 200 });

  // Build graph data from saves
  const { nodes, edges } = useMemo(() => {
    if (!saves) return { nodes: [], edges: [] };

    const nodeMap = new Map<string, GraphNode>();
    const edgeList: GraphEdge[] = [];

    // Create nodes
    saves.forEach((save, index) => {
      const angle = (index / saves.length) * Math.PI * 2;
      const radius = 200 + Math.random() * 100;

      nodeMap.set(save.dTag, {
        id: save.id,
        dTag: save.dTag,
        title: save.title || save.url || "Untitled",
        contentType: save.contentType,
        x: Math.cos(angle) * radius + 400,
        y: Math.sin(angle) * radius + 300,
        vx: 0,
        vy: 0,
        connections: 0,
      });
    });

    // Create edges from refs (wikilinks)
    saves.forEach((save) => {
      save.refs.forEach((refDTag) => {
        if (nodeMap.has(refDTag)) {
          edgeList.push({
            source: save.dTag,
            target: refDTag,
          });
          // Increase connection count
          const sourceNode = nodeMap.get(save.dTag);
          const targetNode = nodeMap.get(refDTag);
          if (sourceNode) sourceNode.connections++;
          if (targetNode) targetNode.connections++;
        }
      });
    });

    return {
      nodes: Array.from(nodeMap.values()),
      edges: edgeList,
    };
  }, [saves]);

  // Filter nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      if (filterType !== "all" && node.contentType !== filterType) return false;
      if (searchQuery && !node.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [nodes, filterType, searchQuery]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.dTag)), [filteredNodes]);

  // Filter edges to only show connections between visible nodes
  const filteredEdges = useMemo(() => {
    return edges.filter(
      (edge) => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
    );
  }, [edges, filteredNodeIds]);

  // Force simulation
  useEffect(() => {
    if (filteredNodes.length === 0) return;

    let running = true;
    const nodesCopy = filteredNodes.map((n) => ({ ...n }));
    const nodeMap = new Map(nodesCopy.map((n) => [n.dTag, n]));

    const simulate = () => {
      if (!running) return;

      // Apply forces
      nodesCopy.forEach((node) => {
        // Center gravity
        const dx = 400 - node.x;
        const dy = 300 - node.y;
        node.vx += dx * 0.001;
        node.vy += dy * 0.001;

        // Repulsion from other nodes
        nodesCopy.forEach((other) => {
          if (other.dTag === node.dTag) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 500 / (dist * dist);
          node.vx += (dx / dist) * force;
          node.vy += (dy / dist) * force;
        });
      });

      // Apply edge forces (attraction)
      filteredEdges.forEach((edge) => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) return;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 100) * 0.01;

        source.vx += (dx / dist) * force;
        source.vy += (dy / dist) * force;
        target.vx -= (dx / dist) * force;
        target.vy -= (dy / dist) * force;
      });

      // Apply velocity and damping
      nodesCopy.forEach((node) => {
        node.vx *= 0.9;
        node.vy *= 0.9;
        node.x += node.vx;
        node.y += node.vy;

        // Keep within bounds
        node.x = Math.max(50, Math.min(750, node.x));
        node.y = Math.max(50, Math.min(550, node.y));
      });

      // Update original nodes
      nodesCopy.forEach((copy) => {
        const original = filteredNodes.find((n) => n.dTag === copy.dTag);
        if (original) {
          original.x = copy.x;
          original.y = copy.y;
        }
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    simulate();

    return () => {
      running = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [filteredNodes, filteredEdges]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply transform
      ctx.save();
      ctx.translate(panX, panY);
      ctx.scale(zoom, zoom);

      // Draw edges
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1 / zoom;
      filteredEdges.forEach((edge) => {
        const source = filteredNodes.find((n) => n.dTag === edge.source);
        const target = filteredNodes.find((n) => n.dTag === edge.target);
        if (!source || !target) return;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      });

      // Draw nodes
      filteredNodes.forEach((node) => {
        const isSelected = selectedNode?.dTag === node.dTag;
        const isHovered = hoveredNode?.dTag === node.dTag;
        const radius = 6 + node.connections * 2;

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = contentTypeColors[node.contentType];
        ctx.fill();

        if (isSelected || isHovered) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2 / zoom;
          ctx.stroke();
        }

        // Node label (only for selected/hovered or if zoomed in)
        if (isSelected || isHovered || zoom > 1.5) {
          ctx.font = `${12 / zoom}px system-ui`;
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.fillText(
            node.title.slice(0, 30) + (node.title.length > 30 ? "..." : ""),
            node.x,
            node.y + radius + 12 / zoom
          );
        }
      });

      ctx.restore();
      requestAnimationFrame(render);
    };

    render();
  }, [filteredNodes, filteredEdges, zoom, panX, panY, selectedNode, hoveredNode]);

  // Handle canvas interactions
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panX) / zoom;
    const y = (e.clientY - rect.top - panY) / zoom;

    // Check for node hover
    const node = filteredNodes.find((n) => {
      const dx = n.x - x;
      const dy = n.y - y;
      const radius = 6 + n.connections * 2;
      return dx * dx + dy * dy < radius * radius;
    });

    setHoveredNode(node || null);

    if (isDragging) {
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panX) / zoom;
    const y = (e.clientY - rect.top - panY) / zoom;

    const node = filteredNodes.find((n) => {
      const dx = n.x - x;
      const dy = n.y - y;
      const radius = 6 + n.connections * 2;
      return dx * dx + dy * dy < radius * radius;
    });

    setSelectedNode(node || null);
  };

  const handleCanvasDoubleClick = () => {
    if (selectedNode) {
      navigate(`/${selectedNode.dTag}`);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.5, Math.min(3, prev * delta)));
  };

  const resetView = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setSelectedNode(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold">Knowledge Graph</h1>

            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search nodes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={filterType} onValueChange={(v) => setFilterType(v as ContentType | "all")}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="link">Links</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="pdf">PDFs</SelectItem>
                  <SelectItem value="note">Notes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      {/* Graph container */}
      <div className="flex-1 flex">
        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 relative bg-muted/30"
          onWheel={handleWheel}
        >
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onClick={handleCanvasClick}
            onDoubleClick={handleCanvasDoubleClick}
          />

          {/* Zoom controls */}
          <div className="absolute bottom-4 left-4 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setZoom((z) => Math.min(3, z * 1.2))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setZoom((z) => Math.max(0.5, z * 0.8))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="secondary" onClick={resetView}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Stats */}
          <div className="absolute top-4 left-4 text-sm text-muted-foreground">
            {filteredNodes.length} nodes · {filteredEdges.length} connections
          </div>

          {/* Legend */}
          <div className="absolute top-4 right-4 flex gap-3">
            {Object.entries(contentTypeColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="capitalize">{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected node panel */}
        {selectedNode && (
          <div className="w-80 border-l bg-background p-4 space-y-4">
            <div className="flex items-start justify-between">
              <h2 className="font-semibold line-clamp-2">{selectedNode.title}</h2>
              <Badge variant="secondary" className="shrink-0" style={{ backgroundColor: contentTypeColors[selectedNode.contentType] + "20" }}>
                {selectedNode.contentType}
              </Badge>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                <span>{selectedNode.connections} connection{selectedNode.connections !== 1 ? "s" : ""}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => navigate(`/${selectedNode.dTag}`)}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </Button>
            </div>

            {/* Connected nodes */}
            {filteredEdges.filter((e) => e.source === selectedNode.dTag || e.target === selectedNode.dTag).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Connected to</h3>
                <div className="space-y-1">
                  {filteredEdges
                    .filter((e) => e.source === selectedNode.dTag || e.target === selectedNode.dTag)
                    .slice(0, 10)
                    .map((edge) => {
                      const otherDTag = edge.source === selectedNode.dTag ? edge.target : edge.source;
                      const otherNode = filteredNodes.find((n) => n.dTag === otherDTag);
                      if (!otherNode) return null;
                      return (
                        <button
                          key={otherDTag}
                          onClick={() => setSelectedNode(otherNode)}
                          className="w-full text-left text-sm p-2 rounded hover:bg-muted transition-colors truncate"
                        >
                          {otherNode.title}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Graph;

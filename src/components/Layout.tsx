import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Home,
  Inbox,
  Library,
  FolderOpen,
  Search,
  Plus,
  Menu,
  BookOpen,
  Sparkles,
  Network,
  Settings,
  RefreshCw,
  Cloud,
  CloudOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LoginArea } from "@/components/auth/LoginArea";
import { useSync, useSyncStatus } from "@/hooks/useLocalSaves";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/inbox", icon: Inbox, label: "Inbox" },
  { path: "/library", icon: Library, label: "Library" },
  { path: "/collections", icon: FolderOpen, label: "Collections" },
  { path: "/graph", icon: Network, label: "Graph" },
  { path: "/search", icon: Search, label: "Search" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export function Layout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync status
  const { sync, isSyncing } = useSync();
  const { data: syncStatus } = useSyncStatus();

  const pendingCount = (syncStatus?.local || 0) + (syncStatus?.syncing || 0);
  const hasUnsynced = pendingCount > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col border-r bg-muted/30">
        {/* Logo + Sync */}
        <div className="flex h-16 shrink-0 items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Nostril</span>
          </Link>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => sync()}
                  disabled={isSyncing}
                  className="relative"
                >
                  <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                  {hasUnsynced && !isSyncing && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-orange-500 border-2 border-background" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isSyncing
                  ? "Syncing..."
                  : hasUnsynced
                  ? `Sync ${pendingCount} pending`
                  : "All synced"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <ScrollArea className="flex-1 px-6 py-4">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Separator className="my-4" />
          <div className="text-xs font-semibold text-muted-foreground mb-2">Collections</div>
          <Link
            to="/collections/reading"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <BookOpen className="h-5 w-5" />
            Reading List
          </Link>
          <div className="border-t p-4">
            <LoginArea className="w-full" />
          </div>
        </ScrollArea>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden fixed top-4 left-4 z-50">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-16 shrink-0 items-center px-6">
            <Link to="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Nostril</span>
            </Link>
          </div>
          <ScrollArea className="flex-1 px-4">
            <nav className="flex flex-col gap-2 py-4">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>
          <div className="border-t p-4">
            <LoginArea className="w-full" />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-lg px-4 lg:hidden">
          <div className="flex-1" />
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-bold">Nostril</span>
          </Link>
          <div className="flex-1 flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => sync()}
              disabled={isSyncing}
              className="relative"
            >
              <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
              {hasUnsynced && !isSyncing && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-orange-500 border-2 border-background" />
              )}
            </Button>
          </div>
        </header>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
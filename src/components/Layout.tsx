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
  Home,
  Inbox,
  Library,
  FolderOpen,
  Search,
  Plus,
  Menu,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LoginArea } from "@/components/auth/LoginArea";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/inbox", icon: Inbox, label: "Inbox" },
  { path: "/library", icon: Library, label: "Library" },
  { path: "/collections", icon: FolderOpen, label: "Collections" },
  { path: "/search", icon: Search, label: "Search" },
];

export function Layout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-muted/30 px-6 pb-4">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center">
            <Link to="/" className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Nostril</span>
            </Link>
          </div>

          {/* Quick capture */}
          <Button asChild className="w-full" size="sm">
            <Link to="/library">
              <Plus className="h-4 w-4 mr-2" />
              Quick Capture
            </Link>
          </Button>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          className={cn(
                            "group flex gap-x-3 rounded-lg p-2 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>

              {/* Collections placeholder */}
              <li>
                <div className="text-xs font-semibold leading-6 text-muted-foreground">
                  Collections
                </div>
                <ul role="list" className="-mx-2 mt-2 space-y-1">
                  <li>
                    <Link
                      to="/collections/reading"
                      className="group flex gap-x-3 rounded-lg p-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <BookOpen className="h-5 w-5 shrink-0" />
                      Reading List
                    </Link>
                  </li>
                </ul>
              </li>

              {/* User section */}
              <li className="mt-auto">
                <Separator className="my-3" />
                <div className="flex items-center gap-3 px-2">
                  <LoginArea className="w-full" />
                </div>
              </li>
            </ul>
          </nav>
        </div>
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
          <div className="flex-1" />
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
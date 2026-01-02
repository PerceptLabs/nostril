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

  console.log("Layout rendering, pathname:", location.pathname);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#000",
      color: "#fff",
      display: "flex"
    }}>
      {/* Sidebar */}
      <aside style={{ width: "250px", borderRight: "1px solid #333", padding: "20px" }}>
        <div style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px", color: "#10b981" }}>
          NOSTRIL
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <Link to="/" style={{ color: location.pathname === "/" ? "#10b981" : "#fff", padding: "10px", background: location.pathname === "/" ? "#333" : "transparent" }}>Home</Link>
          <Link to="/inbox" style={{ color: location.pathname === "/inbox" ? "#10b981" : "#fff", padding: "10px", background: location.pathname === "/inbox" ? "#333" : "transparent" }}>Inbox</Link>
          <Link to="/library" style={{ color: location.pathname === "/library" ? "#10b981" : "#fff", padding: "10px", background: location.pathname === "/library" ? "#333" : "transparent" }}>Library</Link>
          <Link to="/collections" style={{ color: location.pathname === "/collections" ? "#10b981" : "#fff", padding: "10px", background: location.pathname === "/collections" ? "#333" : "transparent" }}>Collections</Link>
          <Link to="/search" style={{ color: location.pathname === "/search" ? "#10b981" : "#fff", padding: "10px", background: location.pathname === "/search" ? "#333" : "transparent" }}>Search</Link>
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: "20px" }}>
        <Outlet />
      </main>
    </div>
  );
}
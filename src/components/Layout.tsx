import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

const navItems = [
  { path: "/", label: "Home", icon: "🏠" },
  { path: "/inbox", label: "Inbox", icon: "📥" },
  { path: "/library", label: "Library", icon: "📚" },
  { path: "/collections", label: "Collections", icon: "📁" },
  { path: "/search", label: "Search", icon: "🔍" },
];

export function Layout() {
  const location = useLocation();
  
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a" }}>
      {/* Sidebar */}
      <aside style={{ 
        width: "250px", 
        borderRight: "1px solid #333", 
        padding: "20px",
        background: "#111"
      }}>
        <h2 style={{ 
          color: "#10b981", 
          fontSize: "28px", 
          fontWeight: "bold",
          marginBottom: "30px"
        }}>
          🚀 NOSTRIL
        </h2>
        
        <nav style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 15px",
                borderRadius: "8px",
                background: location.pathname === item.path ? "#10b98122" : "transparent",
                color: location.pathname === item.path ? "#10b981" : "#999",
                textDecoration: "none",
                fontSize: "16px",
                fontWeight: location.pathname === item.path ? "bold" : "normal",
                transition: "all 0.2s"
              }}
            >
              <span style={{ fontSize: "20px" }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: "30px" }}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
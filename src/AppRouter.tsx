import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { Layout } from "./components/Layout";

import Index from "./pages/Index";
import { Library } from "./pages/Library";
import { Editor } from "./pages/Editor";
import { Inbox } from "./pages/Inbox";
import { Collections, CollectionDetail } from "./pages/Collections";
import { SearchPage } from "./pages/Search";
import { NIP19Page } from "./pages/NIP19Page";
import NotFound from "./pages/NotFound";

// Known paths that should render specific pages
const KNOWN_PATHS = new Set(['', 'home', 'index', 'inbox', 'library', 'collections', 'search']);

// Check if a path looks like a NIP-19 identifier
function isNip19Identifier(path: string): boolean {
  return /^npub1|^nsec1|^note1|^nevent1|^nprofile1|^naddr1/.test(path);
}

// Check if a path looks like a valid save ID (d-tag)
function isSaveId(path: string): boolean {
  // Save IDs typically have a specific format
  return !KNOWN_PATHS.has(path) &&
         !isNip19Identifier(path) &&
         !path.startsWith('_') &&
         path.length > 5;
}

function RouteHandler() {
  const location = useLocation();
  const path = location.pathname.slice(1); // Remove leading slash

  // Handle known paths
  if (KNOWN_PATHS.has(path)) {
    return null; // Let other routes handle it
  }

  // Handle NIP-19 identifiers
  if (isNip19Identifier(path)) {
    return <NIP19Page />;
  }

  // Handle save IDs (Editor)
  if (isSaveId(path)) {
    return <Editor />;
  }

  // Everything else is 404
  return <NotFound />;
}

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
        </Route>

        {/* Dynamic route handler for save IDs and NIP-19 identifiers */}
        <Route path="/*" element={<RouteHandler />} />

        {/* Catch-all for truly unknown paths */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;
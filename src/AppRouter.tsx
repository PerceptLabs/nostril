import { BrowserRouter, Route, Routes } from "react-router-dom";
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

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
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
        {/* Editor page with full-width layout */}
        <Route path="/:dTag" element={<Editor />} />
        {/* NIP-19 route for npub1, note1, naddr1, nevent1, nprofile1 */}
        <Route path="/:nip19" element={<NIP19Page />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { Layout } from "./components/Layout";

import Index from "./pages/Index";
import { Library } from "./pages/Library";
import { Editor } from "./pages/Editor";
import { Inbox } from "./pages/Inbox";
import { Collections, CollectionDetail } from "./pages/Collections";
import { SearchPage } from "./pages/Search";
import { Graph } from "./pages/Graph";
import { Settings } from "./pages/Settings";
import { Articles } from "./pages/Articles";
import { ArticleEditor } from "./pages/ArticleEditor";
import { ArticleView } from "./pages/ArticleView";
import { Discover } from "./pages/Discover";
import { BoardView } from "./pages/BoardView";
import { ExploreBoards } from "./pages/ExploreBoards";
import NotFound from "./pages/NotFound";

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
          <Route path="graph" element={<Graph />} />
          <Route path="settings" element={<Settings />} />

          {/* Articles */}
          <Route path="articles" element={<Articles />} />
          <Route path="write" element={<ArticleEditor />} />
          <Route path="write/:dTag" element={<ArticleEditor />} />
          <Route path="article/:dTag" element={<ArticleView />} />
          <Route path="discover" element={<Discover />} />

          {/* Boards */}
          <Route path="boards" element={<ExploreBoards />} />
          <Route path="board/:boardId" element={<BoardView />} />
        </Route>

        {/* Redirect common paths */}
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/index" element={<Navigate to="/" replace />} />

        {/* Editor for save IDs */}
        <Route path="/:dTag" element={<Editor />} />

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;
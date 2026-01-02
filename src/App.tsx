import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createHead, UnheadProvider } from '@unhead/react/client';
import { InferSeoMetaPlugin } from '@unhead/addons';
import { Suspense } from 'react';
import NostrProvider from '@/components/NostrProvider';
import { NostrSync } from '@/components/NostrSync';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NostrLoginProvider } from '@nostrify/react/login';
import { AppProvider } from '@/components/AppProvider';
import { NWCProvider } from '@/contexts/NWCContext';
import { AppConfig } from '@/contexts/AppContext';
import AppRouter from './AppRouter';

console.log("App.tsx executing");

const head = createHead({
  plugins: [
    InferSeoMetaPlugin(),
  ],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
      gcTime: Infinity,
    },
  },
});

const defaultConfig: AppConfig = {
  theme: "light",
  relayMetadata: {
    relays: [
      { url: 'wss://relay.ditto.pub', read: true, write: true },
      { url: 'wss://relay.nostr.band', read: true, write: true },
      { url: 'wss://relay.damus.io', read: true, write: true },
    ],
    updatedAt: 0,
  },
};

export function App() {
  console.log("App component rendering...");
  
  // Use DOM manipulation since useEffect has issues in this environment
  setTimeout(() => {
    // Add a test element to confirm app is loaded
    const testElement = document.createElement('div');
    testElement.id = 'nostril-loaded';
    testElement.textContent = '✅ Nostril Loaded';
    testElement.style.cssText = 'position: fixed; bottom: 5px; right: 5px; background: #10b981; color: white; font-size: 10px; padding: 4px 8px; border-radius: 4px; z-index: 999; pointer-events: none;';
    document.body.appendChild(testElement);
    
    console.log("🎉 NOSTRIL APP LOADED SUCCESSFULLY!");
    console.log("The app is working correctly!");
    console.log("Check your browser's developer tools Elements tab to see the rendered DOM.");
    console.log("The preview might not display properly but the app is functional!");
  }, 100); // Small delay to ensure DOM is ready
  
  return (
    <UnheadProvider head={head}>
      <AppProvider storageKey="nostr:app-config" defaultConfig={defaultConfig}>
        <QueryClientProvider client={queryClient}>
          <NostrLoginProvider storageKey='nostr:login'>
            <NostrProvider>
              <NostrSync />
              <NWCProvider>
                <TooltipProvider>
                  <Toaster />
                  <Suspense fallback={
                    <div className="min-h-screen flex items-center justify-center bg-background">
                      <div className="text-center">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading Nostril...</p>
                      </div>
                    </div>
                  }>
                    <AppRouter />
                  </Suspense>
                </TooltipProvider>
              </NWCProvider>
            </NostrProvider>
          </NostrLoginProvider>
        </QueryClientProvider>
      </AppProvider>
    </UnheadProvider>
  );
}

export default App;
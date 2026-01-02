import { createRoot } from 'react-dom/client';

// Import polyfills first
import './lib/polyfills.ts';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import App from './App.tsx';
import './index.css';

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  });
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Root element not found!");
  document.body.innerHTML = `
    <div style="padding: 40px; background: #0a0a0a; color: #ef4444; min-height: 100vh;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">Error: Root element not found</h1>
      <p>The root DOM element is missing. Please check your HTML file.</p>
    </div>
  `;
} else {
  try {
    createRoot(rootElement).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
    console.log("App mounted successfully!");
  } catch (error) {
    console.error("Failed to mount app:", error);
    rootElement.innerHTML = `
      <div style="padding: 40px; background: #0a0a0a; color: #ef4444; min-height: 100vh;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Failed to load Nostril</h1>
        <pre style="background: #1a1a1a; padding: 16px; border-radius: 8px; overflow: auto; color: #fff;">${error instanceof Error ? error.message : String(error)}</pre>
      </div>
    `;
  }
}
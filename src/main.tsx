import { createRoot } from 'react-dom/client';

// Import polyfills first
import './lib/polyfills.ts';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import App from './App.tsx';
import './index.css';

console.log("=== MAIN.TSX FORCED RELOAD ===", new Date().toISOString());
console.log("This message proves main.tsx was updated");

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
    <div style="position: fixed; inset: 0; background: #ef4444; color: white; display: flex; align-items: center; justify-content: center; z-index: 999999 !important;">
      ERROR: Root element not found!
    </div>
  `;
} else {
  try {
    createRoot(rootElement).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
    console.log("🚀 APP MOUNTED SUCCESSFULLY!", new Date().toISOString());
    console.log("🎯 If you still see old content, the preview iframe is severely cached");
  } catch (error) {
    console.error("Failed to mount app:", error);
    document.body.innerHTML = `
      <div style="position: fixed; inset: 0; background: #000; color: #ef4444; display: flex; align-items: center; justify-content: center; z-index: 999999 !important;">
        🚨 CRITICAL ERROR: ${error instanceof Error ? error.message : String(error)}
        <div style={{ background: '#1a1a1a', color: '#ef4444', padding: 20px, margin: '20px', font-family: monospace' }}>
          ${error instanceof Error ? error.stack : String(error)}
        </div>
      </div>
    `;
  }
}
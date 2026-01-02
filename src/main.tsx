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

console.log("main.tsx executing");
console.log("Document ready state:", document.readyState);
console.log("Root element found:", !!rootElement);
console.log("Root element HTML:", rootElement?.innerHTML);

if (!rootElement) {
  console.error("Root element not found!");
  document.body.innerHTML = `
    <div style="position: fixed; inset: 0; background: #ef4444; color: white; display: flex; align-items: center; justify-content: center; font-size: 24px;">
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
    console.log("App mounted successfully!");
  } catch (error) {
    console.error("Failed to mount app:", error);
    document.body.innerHTML = `
      <div style="position: fixed; inset: 0; background: #ef4444; color: white; display: flex; align-items: center; justify-content: center; font-size: 24px;">
        ERROR: ${error instanceof Error ? error.message : String(error)}
      </div>
    `;
  }
}
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
    <div style="position: fixed; inset: 0; background: #ef4444; color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; z-index: 999999 !important;">
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
  } catch (error) {
    console.error("Failed to mount app:", error);
  }
}
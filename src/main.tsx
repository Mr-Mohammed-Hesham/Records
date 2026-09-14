import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Filter benign transient Firestore offline warnings when backend is momentarily reconnecting
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const msg = args[0];
    if (
      typeof msg === 'string' &&
      (msg.includes('Could not reach Cloud Firestore backend') ||
       msg.includes('code=unavailable') ||
       msg.includes('The client will operate in offline mode'))
    ) {
      console.debug('[Firestore Offline Resilient Mode]', ...args);
      return;
    }
    originalError.apply(console, args);
  };
}

// Register PWA service worker and capture early install prompt
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as any).__pwaInstallPrompt = e;
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.debug('Service Worker registration bypassed:', err);
      });
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

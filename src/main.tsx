/**
 * Entry point. Provider order matters:
 *
 *   AppwriteProvider   owns the SDK client and the TanStack Query cache
 *     ThemeProvider    writes the `dark` class before anything renders
 *       StudyProvider  needs an authenticated client, so it sits inside both
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppwriteProvider } from '@appwrite.io/react';
import { Toaster } from 'sonner';

import App from './App';
import { APPWRITE } from './lib/appwrite';
import { StudyProvider } from './providers/StudyProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import './index.css';

if (!APPWRITE.endpoint || !APPWRITE.projectId) {
  throw new Error(
    'Missing Appwrite configuration. Copy .env.example to .env and fill in ' +
      'VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID.',
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppwriteProvider endpoint={APPWRITE.endpoint} projectId={APPWRITE.projectId}>
      <ThemeProvider>
        <StudyProvider>
          <App />
          <Toaster position="top-center" richColors closeButton />
        </StudyProvider>
      </ThemeProvider>
    </AppwriteProvider>
  </React.StrictMode>,
);

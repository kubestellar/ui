import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import ClientThemeWrapper from './context/ClientThemeWrapper.tsx';
import { QueryProvider } from './lib/react-query/QueryProvider';
import ToastProvider from './components/providers/ToastProvider.tsx';
import { WebSocketProvider } from './context/WebSocketProvider.tsx';
import { PluginProvider } from './plugins/PluginLoader.tsx';
import './i18n.ts';
import NetworkErrorToastManager from './components/NetworkErrorToastManager';
import useBackendHealthCheck from './hooks/useBackendHealthCheck';
import * as React from 'react';
window.React = React;

(async () => {
  if (import.meta.env.VITE_USE_MSW === 'true') {
    try {
      const { worker } = await import('./mocks/browser');
      await worker.start({ onUnhandledRequest: 'warn' });
      console.log('[MSW] worker started');
    } catch (err) {
      console.warn('[MSW] failed to start', err);
    }
  }

  // Mount the app after worker is started (or skipped)
  const AppWrapper = () => {
    useBackendHealthCheck();
    return (
      <StrictMode>
        <QueryProvider>
          <WebSocketProvider>
            <PluginProvider>
              <ClientThemeWrapper>
                <ToastProvider>
                  <NetworkErrorToastManager />
                  <App />
                </ToastProvider>
              </ClientThemeWrapper>
            </PluginProvider>
          </WebSocketProvider>
        </QueryProvider>
      </StrictMode>
    );
  };

  createRoot(document.getElementById('root')!).render(<AppWrapper />);
})();

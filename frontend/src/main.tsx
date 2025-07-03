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
import { Buffer } from 'buffer';
window.Buffer = Buffer;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <WebSocketProvider>
        <PluginProvider>
          <ClientThemeWrapper>
            <ToastProvider>
              <App />
            </ToastProvider>
          </ClientThemeWrapper>
        </PluginProvider>
      </WebSocketProvider>
    </QueryProvider>
  </StrictMode>
);

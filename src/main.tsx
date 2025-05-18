import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import ClientThemeWrapper from './context/ClientThemeWrapper.tsx';
import { QueryProvider } from './lib/react-query/QueryProvider';
import ToastProvider from './components/providers/ToastProvider.tsx';
import { WebSocketProvider } from './context/WebSocketProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <WebSocketProvider>
        <ClientThemeWrapper>
          <ToastProvider>
            <App />
          </ToastProvider>
        </ClientThemeWrapper>
      </WebSocketProvider>
    </QueryProvider>
  </StrictMode>
);

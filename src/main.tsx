import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import ClientThemeWrapper from './context/ClientThemeWrapper.tsx';
import { QueryProvider } from './lib/react-query/QueryProvider';
import ToastProvider from './components/providers/ToastProvider.tsx';
import { WebSocketProvider } from './context/WebSocketProvider.tsx';
import { PluginProvider } from './plugins/PluginLoader';
import './i18n.ts';
import AppLoader from './components/AppLoader';

import {
  measureInitialPageLoad,
  recordChunkLoadTiming,
  reportMetricsToAnalytics,
} from './utils/performanceMonitoring';

const reportWebVitals = () => {
  measureInitialPageLoad();
  recordChunkLoadTiming();
  setTimeout(() => {
    reportMetricsToAnalytics();
  }, 3000);
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);

  root.render(
    <StrictMode>
      <QueryProvider>
        <WebSocketProvider>
          <PluginProvider>
            <ClientThemeWrapper>
              <ToastProvider>
                <AppLoader />
              </ToastProvider>
            </ClientThemeWrapper>
          </PluginProvider>
        </WebSocketProvider>
      </QueryProvider>
    </StrictMode>
  );
  reportWebVitals();
}

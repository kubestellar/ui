import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import ClientThemeWrapper from './context/ClientThemeWrapper.tsx';
import { QueryProvider } from './lib/react-query/QueryProvider';
import ToastProvider from './components/providers/ToastProvider.tsx';
import { WebSocketProvider } from './context/WebSocketProvider.tsx';
import './i18n.ts';
import AppLoader from './components/AppLoader';

// Add enhanced performance monitoring
import {
  measureInitialPageLoad,
  recordChunkLoadTiming,
  reportMetricsToAnalytics,
} from './utils/performanceMonitoring';

const reportWebVitals = () => {
  // Initialize comprehensive performance monitoring
  measureInitialPageLoad();
  recordChunkLoadTiming();

  // Report metrics after a delay to ensure all metrics are collected
  setTimeout(() => {
    reportMetricsToAnalytics();
  }, 3000);
};

// Create root and render app with optimization wrapper
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);

  root.render(
    <StrictMode>
      <QueryProvider>
        <WebSocketProvider>
          <ClientThemeWrapper>
            <ToastProvider>
              <AppLoader />
            </ToastProvider>
          </ClientThemeWrapper>
        </WebSocketProvider>
      </QueryProvider>
    </StrictMode>
  );

  // Report web vitals after app has loaded
  reportWebVitals();
}

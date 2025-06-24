import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import ClientThemeWrapper from './context/ClientThemeWrapper.tsx';
import { QueryProvider } from './lib/react-query/QueryProvider';
import ToastProvider from './components/providers/ToastProvider.tsx';
import { WebSocketProvider } from './context/WebSocketProvider.tsx';
import './i18n.ts';
import { NetworkErrorProvider } from './context/NetworkErrorContext';
import NetworkErrorBanner from './components/NetworkErrorBanner';
import { useNetworkError } from './context/NetworkErrorContext';

const NetworkErrorBannerWrapper = () => {
  const { networkErrorActive, networkErrorMessage, hideNetworkError } = useNetworkError();
  return (
    <NetworkErrorBanner
      open={networkErrorActive}
      message={networkErrorMessage}
      onClose={hideNetworkError}
    />
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <WebSocketProvider>
        <ClientThemeWrapper>
          <NetworkErrorProvider>
            <ToastProvider>
              <NetworkErrorBannerWrapper />
              <App />
            </ToastProvider>
          </NetworkErrorProvider>
        </ClientThemeWrapper>
      </WebSocketProvider>
    </QueryProvider>
  </StrictMode>
);

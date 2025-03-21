import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import ClientThemeWrapper from "./context/ClientThemeWrapper.tsx";
import { QueryProvider } from './lib/react-query/QueryProvider';
import ToastProvider from './components/providers/ToastProvider.tsx';
import { WebSocketProvider } from './context/WebSocketProvider.tsx'; // Import the new provider

// Enhanced toast options for better UX
const customToastOptions = {
  maxToasts: 3,
  duration: 4000,
  success: {
    duration: 3000,
    icon: '🚀',
  },
  error: {
    duration: 5000,
    icon: '⚠️',
  },
  loading: {
    duration: Infinity,
  },
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <WebSocketProvider> {/* Add the WebSocketProvider */}
        <ClientThemeWrapper>
          <ToastProvider toastOptions={customToastOptions}>
            <App />
          </ToastProvider>
        </ClientThemeWrapper>
      </WebSocketProvider>
    </QueryProvider>
  </StrictMode>,
);
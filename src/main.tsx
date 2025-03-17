import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import ClientThemeWrapper from "./context/ClientThemeWrapper.tsx";
import { QueryProvider } from './lib/react-query/QueryProvider'
import ToastProvider from './components/providers/ToastProvider.tsx'

// Enhanced toast options for better UX
const customToastOptions = {
  // Control how many toasts are shown at once (limit to 3 for better UX)
  maxToasts: 3,
  
  // Duration for which the toast will be visible
  duration: 4000,
  
  // Customize each toast type
  success: {
    duration: 3000,
    icon: '🚀',
  },
  error: {
    duration: 5000,
    icon: '⚠️',
  },
  loading: {
    duration: Infinity, // Loading toast stays until dismissed or updated
  },
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <ClientThemeWrapper>
        <ToastProvider toastOptions={customToastOptions}>
          <App />
        </ToastProvider>
      </ClientThemeWrapper>
    </QueryProvider>
  </StrictMode>,
)
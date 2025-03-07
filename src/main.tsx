import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import ClientThemeWrapper from "./context/ClientThemeWrapper.tsx";
import { QueryProvider } from './lib/react-query/QueryProvider'
import ToastProvider from './components/providers/ToastProvider.tsx'

const customToastOptions = {
  duration: 5000, // Duration for which the toast will be visible
  style: {
    background: '#333', // Custom background color
    color: '#fff', // Custom text color
  },
  // Add more options as needed
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
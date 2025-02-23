import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import {ThemeProvider} from './context/ThemeProvider.tsx'
import ClientThemeWrapper from "./context/ClientThemeWrapper.tsx";
import { QueryProvider } from './lib/react-query/QueryProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <ThemeProvider>
        <ClientThemeWrapper>
          <App />
        </ClientThemeWrapper>
      </ThemeProvider>
    </QueryProvider>
  </StrictMode>,
)

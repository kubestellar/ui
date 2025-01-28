import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from "./context/ThemeContext.tsx";
import ClientThemeWrapper from "./context/ClientThemeWrapper.tsx";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ClientThemeWrapper>
        <App />
      </ClientThemeWrapper>
    </ThemeProvider>
  </StrictMode>,
)

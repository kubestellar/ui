import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import ClientThemeWrapper from "./context/ClientThemeWrapper.tsx";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClientThemeWrapper>
      <App />
    </ClientThemeWrapper>
  </StrictMode>,
)
// import { StrictMode } from 'react';
// import { createRoot } from 'react-dom/client';
// import App from './App.tsx';
// import './index.css';
// import ClientThemeWrapper from './context/ClientThemeWrapper.tsx';
// import { QueryProvider } from './lib/react-query/QueryProvider';
// import ToastProvider from './components/providers/ToastProvider.tsx';
// import { WebSocketProvider } from './context/WebSocketProvider.tsx';

// createRoot(document.getElementById('root')!).render(
//   <StrictMode>
//     <QueryProvider>
//       <WebSocketProvider>
//         <ClientThemeWrapper>
//           <ToastProvider>
//             <App />
//           </ToastProvider>
//         </ClientThemeWrapper>
//       </WebSocketProvider>
//     </QueryProvider>
//   </StrictMode>
// );


import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ToastProvider from './components/providers/ToastProvider.tsx';
import ClientThemeWrapper from './context/ClientThemeWrapper.tsx';
import { WebSocketProvider } from './context/WebSocketProvider.tsx';
import './index.css';
import { QueryProvider } from './lib/react-query/QueryProvider';

// Function to dynamically load a script
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = (error) => reject(error);
    document.head.appendChild(script);
  });
};

// Load the plugin bundle before rendering the app
loadScript('/js/bundle.js')
  .then(() => {
    console.log('Plugin bundle loaded successfully');
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
  })
  .catch((error) => {
    console.error('Failed to load plugin bundle:', error);
    // Render the app anyway, even if plugin fails to load
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
  });

import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routesConfig } from './routes/routes-config';
import { useNetworkError } from './context/NetworkErrorContext';
import { useApiNetworkErrorInterceptor } from './lib/api';

const router = createBrowserRouter(routesConfig);

const App: React.FC = () => {
  // This hook ensures the context is initialized for the banner, even if not used directly here
  useNetworkError();
  useApiNetworkErrorInterceptor();
  return <RouterProvider router={router} />;
};

export default App;

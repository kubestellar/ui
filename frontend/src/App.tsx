import React, { useMemo, useState, useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { useRoutesConfig } from './routes/routes-config';
import { usePlugins } from './plugins/PluginLoader';
import LoadingFallback from './components/LoadingFallback';
import { useAuth } from './hooks/useAuth';

const App: React.FC = () => {
  const { loadAvailablePlugins } = usePlugins();
  const [isLoadingPlugins, setIsLoadingPlugins] = useState(false);
  const { data } = useAuth();

  // Load plugins when App mounts only for authenticated users
  useEffect(() => {
    const loadPlugins = async () => {
      try {
        setIsLoadingPlugins(true);
        await loadAvailablePlugins();
      } catch (error) {
        console.error('Failed to load available plugins:', error);
      } finally {
        setIsLoadingPlugins(false);
      }
    };

    if (data?.isAuthenticated) {
      loadPlugins();
    } else {
      setIsLoadingPlugins(false);
    }
  }, [loadAvailablePlugins, data?.isAuthenticated]);

  const routesConfig = useRoutesConfig();
  const router = useMemo(() => {
    console.log('routesConfig', routesConfig);
    return createBrowserRouter(routesConfig);
  }, [routesConfig]);

  if (isLoadingPlugins && data?.isAuthenticated) {
    return <LoadingFallback message="Loading plugins..." size="medium" />;
  }

  return <RouterProvider router={router} />;
};

export default App;

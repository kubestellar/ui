import React, { createContext, useContext, useState, useCallback, Suspense } from 'react';
import { PluginManifest, PluginInstance } from './types';
import { PluginAPI } from './PluginAPI';
import { MenuListItem } from '../components/menu/Menu';
import ProtectedRoute from '../components/ProtectedRoute';
import LoadingFallback from '../components/LoadingFallback';
import { RouteObject } from 'react-router-dom';
import useTheme from '../stores/themeStore';
import { api } from '../lib/api';

interface PluginContextType {
  plugins: Map<number, PluginInstance>;
  loadedPlugins: PluginManifest[];
  loadPlugin: (manifest: PluginManifest) => Promise<void>;
  unloadPlugin: (pluginID: number) => Promise<void>;
  pluginMenuItems: MenuListItem[];
  pluginRoutes: RouteObject[];
  isPluginLoaded: (pluginID: number) => boolean;
  loadAvailablePlugins: () => Promise<void>;
}

const PluginContext = createContext<PluginContextType | null>(null);

export const usePlugins = () => {
  const context = useContext(PluginContext);
  if (!context) {
    throw new Error('usePlugins must be used within a PluginProvider');
  }
  return context;
};

interface PluginProviderProps {
  children: React.ReactNode;
}

// This component provides plugin functionality and exports both context and utilities

export const PluginProvider: React.FC<PluginProviderProps> = ({ children }) => {
  const [plugins, setPlugins] = useState<Map<number, PluginInstance>>(new Map());
  const [loadedPlugins, setLoadedPlugins] = useState<PluginManifest[]>([]);
  const [pluginAPI] = useState(() => new PluginAPI());
  const [pluginMenuItems, setPluginMenuItems] = useState<MenuListItem[]>([]);
  const [pluginRoutes, setPluginRoutes] = useState<RouteObject[]>([]);
  const { theme } = useTheme();

  const loadPlugin = useCallback(
    async (manifest: PluginManifest) => {
      try {
        // // Check if plugin is already loaded
        if (plugins.has(manifest.id)) {
          console.warn(`Plugin ${manifest.metadata.name} is already loaded`);
          return;
        }

        // Update plugins map
        setPlugins(prev => {
          console.log('Map: ', prev);

          return new Map(prev).set(manifest.id, {
            manifest,
            isLoaded: true,
            loadedAt: new Date(),
          });
        });

        if (manifest.spec.frontend.navigation) {
          const items = await Promise.all(
            manifest.spec.frontend.navigation.map(async navItem => {
              const LoadedPluginComponent = PluginComponent(
                `/api/plugins/${manifest.metadata.name}-${manifest.id}/frontend/dist/${manifest.spec.frontend.routes[0].component}`
              );

              const res = await api.get(
                `/api/plugins/${manifest.metadata.name}-${manifest.id}/frontend/dist/${navItem.icon}`
              );
              const iconBlob = new Blob([res.data], { type: res.headers['content-type'] });
              const iconUrl = URL.createObjectURL(iconBlob);

              const Element = await LoadedPluginComponent;

              const pluginRoute: RouteObject = {
                path: `${navItem.path}-${manifest.id}`,
                element: (
                  <ProtectedRoute>
                    <Suspense
                      fallback={
                        <LoadingFallback message="Loading Plugin Manager..." size="medium" />
                      }
                    >
                      {/* pluginId is passed to interact with plugin backend api which routes are
                      registered from its id. */}
                      <Element pluginId={manifest.id} theme={theme} />
                    </Suspense>
                  </ProtectedRoute>
                ),
              };

              setPluginRoutes(prev => {
                const exists = prev.some(route => route.path === pluginRoute.path);
                if (exists) {
                  console.warn(`Plugin route already exists: ${pluginRoute.path}`);
                  return prev;
                }
                const routes = [...prev, pluginRoute];
                return routes;
              });

              return {
                isLink: true,
                url: `${navItem.path}-${manifest.id}`,
                icon: iconUrl,
                label: navItem.label,
                isPlugin: true,
              };
            })
          );

          // Dont add duplicate menu items
          setPluginMenuItems(prev => {
            const newItems = items.filter(item => {
              // Check if this menu item already exists
              const exists = prev.some(
                existingItem => existingItem.isPlugin && existingItem.url === item.url
              );
              if (exists) {
                console.warn(`Plugin menu item already exists: ${item.url}`);
                return false;
              }
              return true;
            });

            return [...prev, ...newItems];
          });
        }

        console.log(`Plugin ${manifest} loaded successfully`);
      } catch (error) {
        console.error(`Failed to load plugin ${manifest.metadata.name}:`, error);
        throw error;
      }
    },
    [plugins]
  );

  const loadAvailablePlugins = useCallback(async () => {
    try {
      const manifests = await pluginAPI.getPluginManifests();

      const manifestsWithID = manifests.map(manifest => {
        return {
          ...manifest.manifest,
          id: manifest.id,
        };
      });
      setLoadedPlugins(manifestsWithID);

      console.log(manifestsWithID);

      // Auto-load enabled plugins
      for (const manifest of manifestsWithID) {
        const plugin = await pluginAPI.getPluginDetails(manifest.id);

        console.log(manifest);
        if (manifest.spec.frontend.enabled && plugin.enabled) {
          await loadPlugin(manifest);
        }
      }
    } catch (error) {
      console.error('Failed to load available plugins:', error);
    }
  }, [pluginAPI, loadPlugin]);

  const unloadPlugin = useCallback(
    async (pluginID: number) => {
      try {
        const plugin = plugins.get(pluginID);
        if (!plugin) {
          console.warn(`Plugin ${pluginID} is not loaded`);
          return;
        }

        // remove plugin routes
        setPluginRoutes(prev => {
          const pluginRoutePaths = plugin.manifest.spec.frontend.navigation.map(
            item => `${item.path}-${pluginID}`
          );

          const newRoutes = prev.filter(item => !pluginRoutePaths.includes(item.path as string));
          return newRoutes;
        });

        // remove plugin menu items
        setPluginMenuItems(prev => {
          const pluginRoutePaths = plugin.manifest.spec.frontend.navigation.map(
            item => `${item.path}-${pluginID}`
          );
          const newMenuItems = prev.filter(item => !pluginRoutePaths.includes(item.url));
          return newMenuItems;
        });

        // Update plugins map
        setPlugins(prev => {
          const newMap = new Map(prev);
          newMap.delete(pluginID);
          return newMap;
        });

        console.log(`Plugin ${pluginID} unloaded successfully`);
      } catch (error) {
        console.error(`Failed to unload plugin ${pluginID}:`, error);
        throw error;
      }
    },
    [plugins]
  );

  const PluginComponent = async (pluginUrl: string) => {
    try {
      const res = await api.get(pluginUrl);

      const blob = new Blob([res.data], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);

      const module = await import(/* @vite-ignore */ url);

      return module.default;
    } catch (error) {
      console.error(`Failed to load plugin component ${pluginUrl}:`, error);
      throw error;
    }
  };

  const isPluginLoaded = useCallback(
    (pluginID: number) => {
      return plugins.has(pluginID);
    },
    [plugins]
  );

  const contextValue: PluginContextType = {
    plugins,
    loadedPlugins,
    loadPlugin,
    unloadPlugin,
    isPluginLoaded,
    loadAvailablePlugins,
    pluginMenuItems,
    pluginRoutes,
  };

  return <PluginContext.Provider value={contextValue}>{children}</PluginContext.Provider>;
};

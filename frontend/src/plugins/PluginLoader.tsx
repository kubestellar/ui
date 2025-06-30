import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  PluginManifest,
  PluginInstance,
  PluginWidgetConfig,
  PluginNavigationItem,
  PluginAssetConfig,
} from './types';
import { PluginAPI } from './PluginAPI';

interface PluginContextType {
  plugins: Map<string, PluginInstance>;
  loadedPlugins: PluginManifest[];
  loadPlugin: (manifest: PluginManifest) => Promise<void>;
  unloadPlugin: (pluginName: string) => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPluginWidget: (pluginName: string, widgetName: string) => React.ComponentType<any> | null;
  getPluginNavigation: () => PluginNavigationItem[];
  isPluginLoaded: (pluginName: string) => boolean;
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
  const [plugins, setPlugins] = useState<Map<string, PluginInstance>>(new Map());
  const [loadedPlugins, setLoadedPlugins] = useState<PluginManifest[]>([]);
  const [pluginAPI] = useState(() => new PluginAPI());

  const loadPluginAssets = useCallback(async (assets: PluginAssetConfig[], pluginName: string) => {
    for (const asset of assets) {
      try {
        if (asset.type === 'css') {
          await loadCSS(asset.path, pluginName);
        } else if (asset.type === 'js') {
          await loadJS(asset.path, pluginName);
        }
      } catch (error) {
        console.error(`Failed to load asset ${asset.path}:`, error);
      }
    }
  }, []);

  const loadPlugin = useCallback(
    async (manifest: PluginManifest) => {
      try {
        console.log(`Loading plugin: ${manifest.name}`);

        // Check if plugin is already loaded
        if (plugins.has(manifest.name)) {
          console.warn(`Plugin ${manifest.name} is already loaded`);
          return;
        }

        // Create plugin instance
        const pluginInstance: PluginInstance = {
          manifest,
          widgets: new Map(),
          isLoaded: true,
          loadedAt: new Date(),
        };

        // Load plugin widgets
        if (manifest.frontend.widgets) {
          for (const widgetConfig of manifest.frontend.widgets) {
            const widget = await loadPluginWidget(manifest, widgetConfig);
            if (widget) {
              pluginInstance.widgets.set(widgetConfig.name, widget);
            }
          }
        }

        // Load plugin assets (CSS, JS)
        if (manifest.frontend.assets) {
          await loadPluginAssets(manifest.frontend.assets, manifest.name);
        }

        // Update plugins map
        setPlugins(prev => new Map(prev).set(manifest.name, pluginInstance));

        console.log(`Plugin ${manifest.name} loaded successfully`);
      } catch (error) {
        console.error(`Failed to load plugin ${manifest.name}:`, error);
        throw error;
      }
    },
    [plugins, loadPluginAssets]
  );

  const loadAvailablePlugins = useCallback(async () => {
    try {
      const manifests = await pluginAPI.getPluginManifests();
      setLoadedPlugins(manifests);

      // Auto-load enabled plugins
      for (const manifest of manifests) {
        if (manifest.frontend.enabled) {
          await loadPlugin(manifest);
        }
      }
    } catch (error) {
      console.error('Failed to load available plugins:', error);
    }
  }, [pluginAPI, loadPlugin]);

  // Load plugins from backend on mount
  useEffect(() => {
    loadAvailablePlugins();
  }, [loadAvailablePlugins]);

  const unloadPlugin = useCallback(
    async (pluginName: string) => {
      try {
        const plugin = plugins.get(pluginName);
        if (!plugin) {
          console.warn(`Plugin ${pluginName} is not loaded`);
          return;
        }

        // Remove plugin assets
        removePluginAssets(pluginName);

        // Update plugins map
        setPlugins(prev => {
          const newMap = new Map(prev);
          newMap.delete(pluginName);
          return newMap;
        });

        console.log(`Plugin ${pluginName} unloaded successfully`);
      } catch (error) {
        console.error(`Failed to unload plugin ${pluginName}:`, error);
        throw error;
      }
    },
    [plugins]
  );

  const loadPluginWidget = async (
    manifest: PluginManifest,
    widgetConfig: PluginWidgetConfig
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<React.ComponentType<any> | null> => {
    try {
      switch (widgetConfig.type) {
        case 'chart':
          return createChartWidget(manifest, widgetConfig);
        case 'table':
          return createTableWidget(manifest, widgetConfig);
        case 'metrics':
          return createMetricsWidget(manifest, widgetConfig);
        case 'custom':
          return createCustomWidget(manifest, widgetConfig);
        default:
          console.warn(`Unknown widget type: ${widgetConfig.type}`);
          return null;
      }
    } catch (error) {
      console.error(`Failed to load widget ${widgetConfig.name}:`, error);
      return null;
    }
  };

  const loadCSS = (path: string, pluginName: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `/api/plugins/${pluginName}/assets${path}`;
      link.id = `plugin-css-${pluginName}`;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to load CSS: ${path}`));
      document.head.appendChild(link);
    });
  };

  const loadJS = (path: string, pluginName: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `/api/plugins/${pluginName}/assets${path}`;
      script.id = `plugin-js-${pluginName}`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load JS: ${path}`));
      document.head.appendChild(script);
    });
  };

  const removePluginAssets = (pluginName: string) => {
    // Remove CSS
    const cssElement = document.getElementById(`plugin-css-${pluginName}`);
    if (cssElement) {
      cssElement.remove();
    }

    // Remove JS
    const jsElement = document.getElementById(`plugin-js-${pluginName}`);
    if (jsElement) {
      jsElement.remove();
    }
  };

  const getPluginWidget = useCallback(
    (pluginName: string, widgetName: string) => {
      const plugin = plugins.get(pluginName);
      if (!plugin) {
        console.warn(`Plugin ${pluginName} not found`);
        return null;
      }

      const widget = plugin.widgets.get(widgetName);
      if (!widget) {
        console.warn(`Widget ${widgetName} not found in plugin ${pluginName}`);
        return null;
      }

      return widget;
    },
    [plugins]
  );

  const getPluginNavigation = useCallback(() => {
    const navigation: PluginNavigationItem[] = [];

    plugins.forEach(plugin => {
      if (plugin.manifest.frontend.navigation) {
        navigation.push(...plugin.manifest.frontend.navigation);
      }
    });

    return navigation;
  }, [plugins]);

  const isPluginLoaded = useCallback(
    (pluginName: string) => {
      return plugins.has(pluginName);
    },
    [plugins]
  );

  const contextValue: PluginContextType = {
    plugins,
    loadedPlugins,
    loadPlugin,
    unloadPlugin,
    getPluginWidget,
    getPluginNavigation,
    isPluginLoaded,
  };

  return <PluginContext.Provider value={contextValue}>{children}</PluginContext.Provider>;
};

// Widget creation functions
const createChartWidget = (manifest: PluginManifest, config: PluginWidgetConfig) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  return React.memo(function ChartWidget(_props: any) {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      // Simulate loading for now
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1000);

      return () => clearTimeout(timer);
    }, []);

    if (loading) {
      return <div className="plugin-widget-loading">Loading chart...</div>;
    }

    // This would integrate with your actual chart library
    return (
      <div className="plugin-chart-widget">
        <h3>{config.config.title}</h3>
        <div className="chart-container">
          {/* Chart implementation goes here */}
          <div>Chart widget for {manifest.name}</div>
        </div>
      </div>
    );
  });
};

const createTableWidget = (manifest: PluginManifest, config: PluginWidgetConfig) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  return React.memo(function TableWidget(_props: any) {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      // Simulate loading for now
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1000);

      return () => clearTimeout(timer);
    }, []);

    if (loading) {
      return <div className="plugin-widget-loading">Loading table...</div>;
    }

    return (
      <div className="plugin-table-widget">
        <h3>{config.config.title}</h3>
        <div className="table-container">
          {/* Table implementation goes here */}
          <div>Table widget for {manifest.name}</div>
        </div>
      </div>
    );
  });
};

const createMetricsWidget = (_manifest: PluginManifest, config: PluginWidgetConfig) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  return React.memo(function MetricsWidget(_props: any) {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      // Simulate loading for now
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1000);

      return () => clearTimeout(timer);
    }, []);

    if (loading) {
      return <div className="plugin-widget-loading">Loading metrics...</div>;
    }

    return (
      <div className="plugin-metrics-widget">
        <h3>{config.config.title}</h3>
        <div className="metrics-container">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {config.config.metrics?.map((metric: any) => (
            <div key={metric.name} className="metric-item">
              <span className="metric-label">{metric.label}:</span>
              <span className="metric-value">N/A</span>
            </div>
          ))}
        </div>
      </div>
    );
  });
};

const createCustomWidget = (manifest: PluginManifest, config: PluginWidgetConfig) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  return React.memo(function CustomWidget(_props: any) {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      // Simulate loading for now
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1000);

      return () => clearTimeout(timer);
    }, []);

    if (loading) {
      return <div className="plugin-widget-loading">Loading widget...</div>;
    }

    return (
      <div className="plugin-custom-widget">
        <h3>{config.config.title}</h3>
        <div className="custom-widget-content">Custom widget for {manifest.name}</div>
      </div>
    );
  });
};

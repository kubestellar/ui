import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { PluginManifest, PluginInstance, PluginWidgetConfig, PluginNavigationItem } from './types';
import { PluginAPI } from './PluginAPI';
import { WASMPluginLoader } from './WASMPluginLoader';

interface PluginContextType {
  plugins: Map<string, PluginInstance>;
  loadedPlugins: PluginManifest[];
  loadPlugin: (manifest: PluginManifest) => Promise<void>;
  unloadPlugin: (pluginName: string) => Promise<void>;
  getPluginWidget: (pluginName: string, widgetName: string) => React.ComponentType<any> | null;
  getPluginNavigation: () => PluginNavigationItem[];
  isPluginLoaded: (pluginName: string) => boolean;
  executePluginFunction: (pluginName: string, functionName: string, args?: any) => Promise<any>;
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

export const PluginProvider: React.FC<PluginProviderProps> = ({ children }) => {
  const [plugins, setPlugins] = useState<Map<string, PluginInstance>>(new Map());
  const [loadedPlugins, setLoadedPlugins] = useState<PluginManifest[]>([]);
  const [wasmLoader] = useState(() => new WASMPluginLoader());
  const [pluginAPI] = useState(() => new PluginAPI());

  // Load plugins from backend on mount
  useEffect(() => {
    loadAvailablePlugins();
  }, []);

  const loadAvailablePlugins = async () => {
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
  };

  const loadPlugin = useCallback(async (manifest: PluginManifest) => {
    try {
      console.log(`Loading plugin: ${manifest.name}`);
      
      // Check if plugin is already loaded
      if (plugins.has(manifest.name)) {
        console.warn(`Plugin ${manifest.name} is already loaded`);
        return;
      }

      // Load WASM module if available
      let wasmModule = null;
      if (manifest.wasm.file) {
        wasmModule = await wasmLoader.loadWASM(manifest.name, manifest.wasm.file);
      }

      // Create plugin instance
      const pluginInstance: PluginInstance = {
        manifest,
        wasmModule,
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
  }, [plugins, wasmLoader]);

  const unloadPlugin = useCallback(async (pluginName: string) => {
    try {
      const plugin = plugins.get(pluginName);
      if (!plugin) {
        console.warn(`Plugin ${pluginName} is not loaded`);
        return;
      }

      // Cleanup WASM module
      if (plugin.wasmModule) {
        await wasmLoader.unloadWASM(pluginName);
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
  }, [plugins, wasmLoader]);

  const loadPluginWidget = async (
    manifest: PluginManifest,
    widgetConfig: PluginWidgetConfig
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

  const loadPluginAssets = async (assets: any[], pluginName: string) => {
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

  const getPluginWidget = useCallback((pluginName: string, widgetName: string) => {
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
  }, [plugins]);

  const getPluginNavigation = useCallback(() => {
    const navigation: PluginNavigationItem[] = [];
    
    plugins.forEach((plugin) => {
      if (plugin.manifest.frontend.navigation) {
        navigation.push(...plugin.manifest.frontend.navigation);
      }
    });

    return navigation;
  }, [plugins]);

  const isPluginLoaded = useCallback((pluginName: string) => {
    return plugins.has(pluginName);
  }, [plugins]);

  const executePluginFunction = useCallback(async (
    pluginName: string,
    functionName: string,
    args?: any
  ) => {
    const plugin = plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    if (!plugin.wasmModule) {
      throw new Error(`Plugin ${pluginName} does not have a WASM module`);
    }

    return wasmLoader.callFunction(pluginName, functionName, args);
  }, [plugins, wasmLoader]);

  const contextValue: PluginContextType = {
    plugins,
    loadedPlugins,
    loadPlugin,
    unloadPlugin,
    getPluginWidget,
    getPluginNavigation,
    isPluginLoaded,
    executePluginFunction,
  };

  return (
    <PluginContext.Provider value={contextValue}>
      {children}
    </PluginContext.Provider>
  );
};

// Widget creation functions
const createChartWidget = (manifest: PluginManifest, config: PluginWidgetConfig) => {
  return React.memo(function ChartWidget(props: any) {
    const { executePluginFunction } = usePlugins();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchData = async () => {
        try {
          setLoading(true);
          const result = await executePluginFunction(
            manifest.name,
            config.config.dataFunction || 'get_chart_data',
            props
          );
          setData(result);
        } catch (error) {
          console.error('Failed to fetch chart data:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
      
      // Set up refresh interval if specified
      const interval = config.config.refreshInterval;
      if (interval && interval > 0) {
        const timer = setInterval(fetchData, interval * 1000);
        return () => clearInterval(timer);
      }
    }, [props]);

    if (loading) {
      return <div className="plugin-widget-loading">Loading chart...</div>;
    }

    // This would integrate with your actual chart library
    return (
      <div className="plugin-chart-widget">
        <h3>{config.config.title}</h3>
        <div className="chart-container">
          {/* Chart implementation goes here */}
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      </div>
    );
  });
};

const createTableWidget = (manifest: PluginManifest, config: PluginWidgetConfig) => {
  return React.memo(function TableWidget(props: any) {
    const { executePluginFunction } = usePlugins();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchData = async () => {
        try {
          setLoading(true);
          const result = await executePluginFunction(
            manifest.name,
            config.config.dataFunction || 'get_table_data',
            props
          );
          setData(Array.isArray(result) ? result : []);
        } catch (error) {
          console.error('Failed to fetch table data:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
      
      const interval = config.config.refreshInterval;
      if (interval && interval > 0) {
        const timer = setInterval(fetchData, interval * 1000);
        return () => clearInterval(timer);
      }
    }, [props]);

    if (loading) {
      return <div className="plugin-widget-loading">Loading table...</div>;
    }

    return (
      <div className="plugin-table-widget">
        <h3>{config.config.title}</h3>
        <div className="table-container">
          {/* Table implementation goes here */}
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      </div>
    );
  });
};

const createMetricsWidget = (manifest: PluginManifest, config: PluginWidgetConfig) => {
  return React.memo(function MetricsWidget(props: any) {
    const { executePluginFunction } = usePlugins();
    const [metrics, setMetrics] = useState<any>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchMetrics = async () => {
        try {
          setLoading(true);
          const result = await executePluginFunction(
            manifest.name,
            config.config.dataFunction || 'get_metrics',
            props
          );
          setMetrics(result || {});
        } catch (error) {
          console.error('Failed to fetch metrics:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchMetrics();
      
      const interval = config.config.refreshInterval;
      if (interval && interval > 0) {
        const timer = setInterval(fetchMetrics, interval * 1000);
        return () => clearInterval(timer);
      }
    }, [props]);

    if (loading) {
      return <div className="plugin-widget-loading">Loading metrics...</div>;
    }

    return (
      <div className="plugin-metrics-widget">
        <h3>{config.config.title}</h3>
        <div className="metrics-container">
          {config.config.metrics?.map((metric: any) => (
            <div key={metric.name} className="metric-item">
              <span className="metric-label">{metric.label}:</span>
              <span className="metric-value">{metrics[metric.name] || 'N/A'}</span>
            </div>
          ))}
        </div>
      </div>
    );
  });
};

const createCustomWidget = (manifest: PluginManifest, config: PluginWidgetConfig) => {
  return React.memo(function CustomWidget(props: any) {
    const { executePluginFunction } = usePlugins();
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchContent = async () => {
        try {
          setLoading(true);
          const result = await executePluginFunction(
            manifest.name,
            config.config.renderFunction || 'render_widget',
            { ...props, widgetConfig: config }
          );
          setContent(result || '');
        } catch (error) {
          console.error('Failed to fetch custom widget content:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchContent();
      
      const interval = config.config.refreshInterval;
      if (interval && interval > 0) {
        const timer = setInterval(fetchContent, interval * 1000);
        return () => clearInterval(timer);
      }
    }, [props]);

    if (loading) {
      return <div className="plugin-widget-loading">Loading widget...</div>;
    }

    return (
      <div className="plugin-custom-widget">
        <h3>{config.config.title}</h3>
        <div 
          className="custom-widget-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    );
  });
}; 
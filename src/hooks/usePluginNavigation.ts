import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePlugins } from '../plugins/PluginLoader';
import { PluginAPI } from '../plugins/PluginAPI';

interface PluginNavigationItem {
  id: string;
  name: string;
  path: string;
  icon?: string;
  enabled: boolean;
  order?: number;
  description?: string;
  version?: string;
}

interface PluginDataItem {
  id?: string;
  name: string;
  enabled?: boolean;
  description?: string;
  version?: string;
}

interface UsePluginNavigationReturn {
  pluginNavItems: PluginNavigationItem[];
  enabledPluginNavItems: PluginNavigationItem[];
  loading: boolean;
  refreshPluginNavigation: () => void;
}

export const usePluginNavigation = (): UsePluginNavigationReturn => {
  const { plugins } = usePlugins();
  const [pluginAPI] = useState(() => new PluginAPI());
  const [pluginData, setPluginData] = useState<PluginDataItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load plugin data
  const loadPluginNavigation = useCallback(async () => {
    try {
      setLoading(true);

      // Get list of all plugins
      const pluginList = await pluginAPI.getPluginList();
      setPluginData(pluginList);
    } catch (error) {
      console.error('Failed to load plugin navigation:', error);
      setPluginData([]);
    } finally {
      setLoading(false);
    }
  }, [pluginAPI]);

  // Initial load and periodic refresh
  useEffect(() => {
    loadPluginNavigation();

    // Refresh every 30 seconds to catch plugin changes
    const interval = setInterval(loadPluginNavigation, 30000);
    return () => clearInterval(interval);
  }, [loadPluginNavigation]);

  // Refresh when plugins change
  useEffect(() => {
    if (plugins.size > 0) {
      loadPluginNavigation();
    }
  }, [plugins, loadPluginNavigation]);

  // Convert plugin data to navigation items
  const pluginNavItems = useMemo(() => {
    return pluginData.map(plugin => ({
      id: plugin.id || plugin.name,
      name: plugin.name,
      path: `/plugin/${plugin.name}`,
      icon: getPluginIcon(plugin.name),
      enabled: plugin.enabled || false,
      description: plugin.description || `${plugin.name} plugin`,
      version: plugin.version || '1.0.0',
      order: getPluginOrder(plugin.name),
    }));
  }, [pluginData]);

  // Filter enabled plugins only
  const enabledPluginNavItems = useMemo(() => {
    return pluginNavItems.filter(item => item.enabled);
  }, [pluginNavItems]);

  // Manual refresh function
  const refreshPluginNavigation = () => {
    loadPluginNavigation();
  };

  return {
    pluginNavItems,
    enabledPluginNavItems,
    loading,
    refreshPluginNavigation,
  };
};

// Helper function to get plugin icon based on plugin name
const getPluginIcon = (pluginName: string): string => {
  const iconMap: Record<string, string> = {
    'sample-analytics': '📊',
    'backup-plugin': '💾',
    monitoring: '📈',
    security: '🔒',
    dashboard: '📋',
    logs: '📝',
    alerts: '🚨',
    reports: '📄',
    users: '👥',
    settings: '⚙️',
  };

  // Check for partial matches
  const lowerName = pluginName.toLowerCase();
  for (const [key, icon] of Object.entries(iconMap)) {
    if (lowerName.includes(key)) {
      return icon;
    }
  }

  // Default icon for unknown plugins
  return '🧩';
};

// Helper function to determine plugin order in navigation
const getPluginOrder = (pluginName: string): number => {
  const orderMap: Record<string, number> = {
    'sample-analytics': 100,
    'backup-plugin': 200,
    monitoring: 300,
    security: 400,
    dashboard: 500,
  };

  const lowerName = pluginName.toLowerCase();
  for (const [key, order] of Object.entries(orderMap)) {
    if (lowerName.includes(key)) {
      return order;
    }
  }

  // Default order for unknown plugins
  return 999;
};

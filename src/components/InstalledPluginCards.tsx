import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useNavigate } from 'react-router-dom';
import {
  HiOutlinePuzzlePiece,
  HiOutlinePlay,
  HiOutlinePause,
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineUsers,
  HiOutlineCalendarDays,
  HiOutlineGlobeAlt,
  HiOutlineRocketLaunch,
} from 'react-icons/hi2';

import useTheme from '../stores/themeStore';
import getThemeStyles from '../lib/theme-utils';

interface Plugin {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  status: 'active' | 'inactive' | 'loading' | 'error';
  description?: string;
  author?: string;
  routes?: string[];
}

interface PluginMetrics {
  analytics_data?: {
    page_views?: number;
    unique_users?: number;
    sessions?: number;
    bounce_rate?: number;
  };
  plugin_metrics?: {
    enabled?: boolean;
    routes?: number;
  };
}

interface PluginCardData extends Plugin {
  metrics?: PluginMetrics;
  lastUpdate?: Date;
  icon?: string;
}

export const InstalledPluginCards: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);

  const [plugins, setPlugins] = useState<PluginCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  // Load plugin data with metrics
  const loadPluginData = async () => {
    try {
      setLoading(true);

      // Fetch plugins from demo endpoint
      const response = await fetch('http://localhost:8080/demo/plugins');
      const data = await response.json();

      if (data.success && data.plugins) {
        const pluginCards: PluginCardData[] = await Promise.all(
          data.plugins.map(async (plugin: Plugin) => {
            const cardData: PluginCardData = {
              ...plugin,
              id: plugin.name,
              status: plugin.enabled ? 'active' : 'inactive',
              lastUpdate: new Date(),
              icon: getPluginIcon(plugin.name),
              description: getPluginDescription(plugin.name),
              author: getPluginAuthor(plugin.name),
            };

            // Load metrics for enabled plugins
            if (plugin.enabled && plugin.name === 'sample-analytics') {
              try {
                const metricsResponse = await fetch(
                  `http://localhost:8080/api/plugins/${plugin.name}/metrics`
                );
                if (metricsResponse.ok) {
                  const metricsData = await metricsResponse.json();
                  cardData.metrics = metricsData.metrics;
                }
              } catch {
                console.log(`No metrics available for ${plugin.name}`);
              }
            }

            return cardData;
          })
        );

        setPlugins(pluginCards);
      }
    } catch {
      console.error('Failed to load plugin data');
    } finally {
      setLoading(false);
    }
  };

  // Initial load and auto-refresh
  useEffect(() => {
    loadPluginData();

    const interval = setInterval(loadPluginData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle plugin actions
  const handleTogglePlugin = async (pluginName: string, currentlyEnabled: boolean) => {
    setRefreshing(pluginName);
    try {
      // Simulate toggle (in real implementation, call enable/disable API)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update local state
      setPlugins(prev =>
        prev.map(plugin =>
          plugin.name === pluginName
            ? {
                ...plugin,
                enabled: !currentlyEnabled,
                status: !currentlyEnabled ? 'active' : 'inactive',
                lastUpdate: new Date(),
              }
            : plugin
        )
      );
    } catch {
      console.error('Failed to toggle plugin');
    } finally {
      setRefreshing(null);
    }
  };

  const handleViewPlugin = (pluginName: string) => {
    navigate(`/plugin/${pluginName}`);
  };

  const handleRefresh = () => {
    loadPluginData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <HiOutlineArrowPath
            className="h-8 w-8 animate-spin"
            style={{ color: themeStyles.colors.brand.primary }}
          />
          <p style={{ color: themeStyles.colors.text.secondary }}>Loading installed plugins...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: themeStyles.colors.text.primary }}>
            🧩 Installed Plugins
          </h2>
          <p style={{ color: themeStyles.colors.text.secondary }}>
            {plugins.length} plugin{plugins.length !== 1 ? 's' : ''} installed •{' '}
            {plugins.filter(p => p.enabled).length} active
          </p>
        </div>
        <motion.button
          onClick={handleRefresh}
          className="flex items-center gap-2 rounded-lg px-4 py-2"
          style={{
            background: themeStyles.button.secondary.background,
            color: themeStyles.button.secondary.color,
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <HiOutlineArrowPath className="h-4 w-4" />
          Refresh
        </motion.button>
      </div>

      {/* Plugin Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {plugins.map((plugin, index) => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              index={index}
              onToggle={handleTogglePlugin}
              onView={handleViewPlugin}
              refreshing={refreshing === plugin.name}
              themeStyles={themeStyles}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {plugins.length === 0 && (
        <motion.div
          className="flex flex-col items-center justify-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <HiOutlinePuzzlePiece
            className="mb-4 h-16 w-16"
            style={{ color: themeStyles.colors.text.secondary }}
          />
          <h3
            className="mb-2 text-lg font-medium"
            style={{ color: themeStyles.colors.text.primary }}
          >
            No plugins installed
          </h3>
          <p style={{ color: themeStyles.colors.text.secondary }}>
            Install plugins to see them here
          </p>
        </motion.div>
      )}
    </div>
  );
};

// Individual Plugin Card Component
interface PluginCardProps {
  plugin: PluginCardData;
  index: number;
  onToggle: (name: string, enabled: boolean) => void;
  onView: (name: string) => void;
  refreshing: boolean;
  themeStyles: ReturnType<typeof getThemeStyles>;
}

const PluginCard: React.FC<PluginCardProps> = ({
  plugin,
  index,
  onToggle,
  onView,
  refreshing,
  themeStyles,
}) => {
  const getStatusColor = () => {
    if (refreshing) return themeStyles.colors.brand.primary;
    switch (plugin.status) {
      case 'active':
        return themeStyles.colors.status.success;
      case 'error':
        return themeStyles.colors.status.error;
      default:
        return themeStyles.colors.text.secondary;
    }
  };

  const getStatusIcon = () => {
    if (refreshing) {
      return <HiOutlineArrowPath className="h-4 w-4 animate-spin" />;
    }
    switch (plugin.status) {
      case 'active':
        return <HiOutlineCheckCircle className="h-4 w-4" />;
      case 'error':
        return <HiOutlineXCircle className="h-4 w-4" />;
      default:
        return <HiOutlinePause className="h-4 w-4" />;
    }
  };

  return (
    <motion.div
      className="group relative cursor-pointer rounded-xl border p-6 transition-all duration-300 hover:shadow-lg"
      style={{
        background: themeStyles.effects.glassMorphism.background,
        borderColor: plugin.enabled
          ? themeStyles.colors.status.success + '40'
          : themeStyles.card.borderColor,
        backdropFilter: 'blur(10px)',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ y: -4, scale: 1.02 }}
      onClick={() => onView(plugin.name)}
    >
      {/* Status Indicator */}
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <div style={{ color: getStatusColor() }}>{getStatusIcon()}</div>
        <div
          className={`h-2 w-2 rounded-full ${plugin.enabled ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: getStatusColor() }}
        />
      </div>

      {/* Plugin Header */}
      <div className="mb-4 flex items-start gap-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
          style={{
            background: `${themeStyles.colors.brand.primary}20`,
            border: `1px solid ${themeStyles.colors.brand.primary}40`,
          }}
        >
          {plugin.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3
              className="truncate text-lg font-semibold"
              style={{ color: themeStyles.colors.text.primary }}
            >
              {plugin.name}
            </h3>
            <span
              className="rounded-full px-2 py-1 text-xs"
              style={{
                background: `${themeStyles.colors.brand.primary}10`,
                color: themeStyles.colors.brand.primary,
              }}
            >
              v{plugin.version}
            </span>
          </div>
          <p
            className="mt-1 line-clamp-2 text-sm"
            style={{ color: themeStyles.colors.text.secondary }}
          >
            {plugin.description}
          </p>
        </div>
      </div>

      {/* Plugin Metrics */}
      {plugin.enabled && plugin.metrics && (
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-3">
            {plugin.metrics.analytics_data && (
              <>
                <div className="text-center">
                  <div
                    className="text-lg font-bold"
                    style={{ color: themeStyles.colors.brand.primary }}
                  >
                    {plugin.metrics.analytics_data.page_views?.toLocaleString() || '0'}
                  </div>
                  <div className="text-xs" style={{ color: themeStyles.colors.text.secondary }}>
                    Page Views
                  </div>
                </div>
                <div className="text-center">
                  <div
                    className="text-lg font-bold"
                    style={{ color: themeStyles.colors.status.success }}
                  >
                    {plugin.metrics.analytics_data.unique_users?.toLocaleString() || '0'}
                  </div>
                  <div className="text-xs" style={{ color: themeStyles.colors.text.secondary }}>
                    Users
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Plugin Info */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <HiOutlineUsers className="h-3 w-3" />
          <span style={{ color: themeStyles.colors.text.secondary }}>
            {plugin.author || 'Unknown Author'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <HiOutlineGlobeAlt className="h-3 w-3" />
          <span style={{ color: themeStyles.colors.text.secondary }}>
            {plugin.routes?.length || 0} API routes
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <HiOutlineCalendarDays className="h-3 w-3" />
          <span style={{ color: themeStyles.colors.text.secondary }}>
            Updated {plugin.lastUpdate?.toLocaleTimeString() || 'Unknown'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <motion.button
          onClick={e => {
            e.stopPropagation();
            onToggle(plugin.name, plugin.enabled);
          }}
          disabled={refreshing}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all"
          style={{
            background: plugin.enabled
              ? `${themeStyles.colors.status.warning}20`
              : `${themeStyles.colors.status.success}20`,
            color: plugin.enabled
              ? themeStyles.colors.status.warning
              : themeStyles.colors.status.success,
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {refreshing ? (
            <HiOutlineArrowPath className="h-4 w-4 animate-spin" />
          ) : plugin.enabled ? (
            <HiOutlinePause className="h-4 w-4" />
          ) : (
            <HiOutlinePlay className="h-4 w-4" />
          )}
          {refreshing ? 'Processing...' : plugin.enabled ? 'Disable' : 'Enable'}
        </motion.button>

        <motion.button
          onClick={e => {
            e.stopPropagation();
            onView(plugin.name);
          }}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
          style={{
            background: `${themeStyles.colors.brand.primary}20`,
            color: themeStyles.colors.brand.primary,
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <HiOutlineRocketLaunch className="h-4 w-4" />
          Open
        </motion.button>
      </div>

      {/* Hover Effect */}
      <div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background: `linear-gradient(135deg, ${themeStyles.colors.brand.primary}05, ${themeStyles.colors.brand.secondary}05)`,
        }}
      />
    </motion.div>
  );
};

// Helper functions
const getPluginIcon = (name: string): string => {
  const iconMap: Record<string, string> = {
    'sample-analytics': '📊',
    'backup-plugin': '💾',
    monitoring: '📈',
    security: '🔒',
    dashboard: '📋',
  };

  return iconMap[name] || '🧩';
};

const getPluginDescription = (name: string): string => {
  const descriptions: Record<string, string> = {
    'sample-analytics':
      'Advanced analytics and metrics tracking for your application with real-time insights.',
    'backup-plugin': 'Automated backup solution for data protection and disaster recovery.',
    monitoring: 'System monitoring and alerting for application health.',
    security: 'Security scanning and vulnerability detection.',
    dashboard: 'Customizable dashboard for data visualization.',
  };

  return descriptions[name] || 'Plugin for extending application functionality.';
};

const getPluginAuthor = (name: string): string => {
  const authors: Record<string, string> = {
    'sample-analytics': 'KubeStellar Team',
    'backup-plugin': 'Infrastructure Team',
    monitoring: 'DevOps Team',
    security: 'Security Team',
    dashboard: 'UI Team',
  };

  return authors[name] || 'Unknown';
};

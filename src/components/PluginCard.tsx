import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import {
  HiOutlinePuzzlePiece,
  HiOutlinePlay,
  HiOutlinePause,
  HiOutlineArrowPath,
  HiOutlineInformationCircle,
  HiOutlineChartBar,
  HiOutlineTableCells,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineUsers,
  HiOutlineCalendarDays,
} from 'react-icons/hi2';
import { PluginAPI } from '../plugins/PluginAPI';
import useTheme from '../stores/themeStore';
import getThemeStyles from '../lib/theme-utils';

interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  license?: string;
  keywords?: string[];
  icon?: string;
  screenshots?: string[];
  backend: {
    enabled: boolean;
    routes: Record<string, unknown>[];
  };
  frontend: {
    enabled: boolean;
    navigation: Record<string, unknown>[];
    widgets: PluginWidget[];
    routes: Record<string, unknown>[];
  };
  config?: Record<string, unknown>;
  dependencies?: Record<string, unknown>[];
  created_at: string;
  updated_at: string;
}

interface PluginWidget {
  name: string;
  type: 'card' | 'chart' | 'table' | 'metrics' | 'custom';
  title: string;
  description?: string;
  component: string;
  size?: {
    width?: string;
    height?: string;
  };
  position?: {
    row?: number;
    column?: number;
    area?: string;
  };
}

interface PluginCardProps {
  plugin: {
    id: string;
    name: string;
    version: string;
    description?: string;
    author?: string;
    enabled: boolean;
    status: 'active' | 'inactive' | 'loading' | 'error';
  };
  manifest?: PluginManifest;
  onStatusChange?: (pluginId: string, newStatus: string) => void;
  onViewDetails?: (pluginId: string) => void;
}

export const PluginCard: React.FC<PluginCardProps> = ({
  plugin,
  manifest,
  onStatusChange,
  onViewDetails,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);

  const [pluginAPI] = useState(() => new PluginAPI());
  const [isLoading, setIsLoading] = useState(false);
  const [showWidgets, setShowWidgets] = useState(false);
  const [widgets, setWidgets] = useState<PluginWidget[]>([]);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadPluginData = useCallback(async () => {
    try {
      // Load widgets from manifest
      if (manifest?.frontend?.widgets) {
        setWidgets(manifest.frontend.widgets);
      }

      // Load plugin metrics if available
      if (plugin.enabled) {
        try {
          const response = await fetch(`/api/plugins/${plugin.id}/metrics`);
          if (response.ok) {
            const data = await response.json();
            setMetrics(data.metrics);
          }
        } catch {
          console.log('Metrics not available for plugin:', plugin.name);
        }
      }
    } catch {
      console.error('Failed to load plugin data');
    }
  }, [plugin.enabled, manifest]);

  // Load plugin widgets and data
  useEffect(() => {
    if (plugin.enabled && manifest) {
      loadPluginData();
    }
  }, [plugin.enabled, manifest, loadPluginData]);

  const handleToggleStatus = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      if (plugin.enabled) {
        await pluginAPI.disablePlugin(plugin.id);
        onStatusChange?.(plugin.id, 'disabled');
      } else {
        await pluginAPI.enablePlugin(plugin.id);
        onStatusChange?.(plugin.id, 'enabled');
      }
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to toggle plugin status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReload = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await pluginAPI.reloadPlugin(plugin.id);
      await loadPluginData();
      setLastUpdate(new Date());
      onStatusChange?.(plugin.id, 'reloaded');
    } catch (error) {
      console.error('Failed to reload plugin:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (isLoading) {
      return <HiOutlineArrowPath className="h-4 w-4 animate-spin text-blue-500" />;
    }

    switch (plugin.status) {
      case 'active':
        return <HiOutlineCheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <HiOutlineXCircle className="h-4 w-4 text-red-500" />;
      case 'loading':
        return <HiOutlineArrowPath className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <HiOutlinePause className="h-4 w-4 text-gray-500" />;
    }
  };

  const getWidgetIcon = (type: string) => {
    switch (type) {
      case 'chart':
        return <HiOutlineChartBar className="h-4 w-4" />;
      case 'table':
        return <HiOutlineTableCells className="h-4 w-4" />;
      case 'metrics':
        return <HiOutlineChartBar className="h-4 w-4" />;
      default:
        return <HiOutlinePuzzlePiece className="h-4 w-4" />;
    }
  };

  return (
    <motion.div
      className="group relative rounded-xl border p-6 transition-all duration-300 hover:shadow-lg"
      style={{
        background: themeStyles.effects.glassMorphism.background,
        borderColor: themeStyles.card.borderColor,
        backdropFilter: 'blur(10px)',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      {/* Plugin Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Plugin Icon */}
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
            style={{
              background: `${themeStyles.colors.brand.primary}20`,
              border: `1px solid ${themeStyles.colors.brand.primary}40`,
            }}
          >
            {manifest?.icon || '🧩'}
          </div>

          {/* Plugin Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3
                className="truncate text-lg font-semibold"
                style={{ color: themeStyles.colors.text.primary }}
              >
                {plugin.name}
              </h3>
              <span
                className="rounded-full px-2 py-1 text-sm"
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
              {plugin.description || manifest?.description || 'No description available'}
            </p>

            {/* Plugin Metadata */}
            <div className="mt-3 flex items-center gap-4 text-xs">
              {plugin.author && (
                <div className="flex items-center gap-1">
                  <HiOutlineUsers className="h-3 w-3" />
                  <span style={{ color: themeStyles.colors.text.secondary }}>{plugin.author}</span>
                </div>
              )}

              {manifest?.updated_at && (
                <div className="flex items-center gap-1">
                  <HiOutlineCalendarDays className="h-3 w-3" />
                  <span style={{ color: themeStyles.colors.text.secondary }}>
                    {new Date(manifest.updated_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status and Actions */}
        <div className="flex items-center gap-2">
          {getStatusIcon()}

          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <motion.button
              onClick={handleToggleStatus}
              disabled={isLoading}
              className="rounded-lg p-2 transition-colors"
              style={{
                background: plugin.enabled
                  ? `${themeStyles.colors.status.warning}20`
                  : `${themeStyles.colors.status.success}20`,
                color: plugin.enabled
                  ? themeStyles.colors.status.warning
                  : themeStyles.colors.status.success,
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title={plugin.enabled ? 'Disable Plugin' : 'Enable Plugin'}
            >
              {plugin.enabled ? (
                <HiOutlinePause className="h-4 w-4" />
              ) : (
                <HiOutlinePlay className="h-4 w-4" />
              )}
            </motion.button>

            <motion.button
              onClick={handleReload}
              disabled={isLoading}
              className="rounded-lg p-2 transition-colors"
              style={{
                background: `${themeStyles.colors.brand.primary}20`,
                color: themeStyles.colors.brand.primary,
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title="Reload Plugin"
            >
              <HiOutlineArrowPath className="h-4 w-4" />
            </motion.button>

            <motion.button
              onClick={() => onViewDetails?.(plugin.id)}
              className="rounded-lg p-2 transition-colors"
              style={{
                background: `${themeStyles.colors.text.secondary}20`,
                color: themeStyles.colors.text.secondary,
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title="View Details"
            >
              <HiOutlineInformationCircle className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Plugin Widgets Preview */}
      {plugin.enabled && widgets.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-medium" style={{ color: themeStyles.colors.text.primary }}>
              Widgets ({widgets.length})
            </h4>
            <motion.button
              onClick={() => setShowWidgets(!showWidgets)}
              className="rounded-lg px-2 py-1 text-xs transition-colors"
              style={{
                background: `${themeStyles.colors.brand.primary}10`,
                color: themeStyles.colors.brand.primary,
              }}
              whileHover={{ scale: 1.05 }}
            >
              {showWidgets ? 'Hide' : 'Show'}
            </motion.button>
          </div>

          <AnimatePresence>
            {showWidgets && (
              <motion.div
                className="grid grid-cols-2 gap-2"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {widgets.slice(0, 4).map((widget, index) => (
                  <motion.div
                    key={widget.name}
                    className="rounded-lg border p-3"
                    style={{
                      background: `${themeStyles.colors.bg.secondary}80`,
                      borderColor: themeStyles.card.borderColor,
                    }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      {getWidgetIcon(widget.type)}
                      <span
                        className="truncate text-xs font-medium"
                        style={{ color: themeStyles.colors.text.primary }}
                      >
                        {widget.title}
                      </span>
                    </div>
                    <p
                      className="line-clamp-1 text-xs"
                      style={{ color: themeStyles.colors.text.secondary }}
                    >
                      {widget.description || `${widget.type} widget`}
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Plugin Statistics */}
      {plugin.enabled && metrics && (
        <div className="mt-4 border-t pt-4" style={{ borderColor: themeStyles.card.borderColor }}>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div
                className="text-lg font-bold"
                style={{ color: themeStyles.colors.brand.primary }}
              >
                {manifest?.backend?.routes?.length || 0}
              </div>
              <div className="text-xs" style={{ color: themeStyles.colors.text.secondary }}>
                API Routes
              </div>
            </div>
            <div>
              <div
                className="text-lg font-bold"
                style={{ color: themeStyles.colors.status.success }}
              >
                {widgets.length}
              </div>
              <div className="text-xs" style={{ color: themeStyles.colors.text.secondary }}>
                Widgets
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keywords */}
      {manifest?.keywords && manifest.keywords.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1">
          {manifest.keywords.slice(0, 3).map(keyword => (
            <span
              key={keyword}
              className="rounded-full px-2 py-1 text-xs"
              style={{
                background: `${themeStyles.colors.text.secondary}10`,
                color: themeStyles.colors.text.secondary,
              }}
            >
              {keyword}
            </span>
          ))}
          {manifest.keywords.length > 3 && (
            <span
              className="rounded-full px-2 py-1 text-xs"
              style={{
                background: `${themeStyles.colors.text.secondary}10`,
                color: themeStyles.colors.text.secondary,
              }}
            >
              +{manifest.keywords.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Last Update */}
      <div className="mt-4 text-center text-xs">
        <span style={{ color: themeStyles.colors.text.secondary }}>
          Last updated: {lastUpdate.toLocaleTimeString()}
        </span>
      </div>
    </motion.div>
  );
};

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import {
  HiOutlinePuzzlePiece,
  HiOutlineArrowPath,
  HiOutlineExclamationTriangle,
  HiOutlineArrowLeft,
  HiOutlineChartBar,
  HiOutlineTableCells,
  HiOutlineCog6Tooth,
  HiOutlineInformationCircle,
} from 'react-icons/hi2';
import { PluginAPI } from '../plugins/PluginAPI';
import { usePlugins } from '../plugins/PluginLoader';
import useTheme from '../stores/themeStore';
import getThemeStyles from '../lib/theme-utils';

interface PluginData {
  success: boolean;
  data?: Record<string, unknown>;
  plugin?: {
    name: string;
    version: string;
    enabled: boolean;
    status: string;
  };
  manifest?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

interface PluginWidget {
  name: string;
  type: 'card' | 'chart' | 'table' | 'metrics' | 'custom';
  title: string;
  description?: string;
  component: string;
  props?: Record<string, unknown>;
}

export const DynamicPluginRoute: React.FC = () => {
  const { pluginName } = useParams<{ pluginName: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);

  const { isPluginLoaded } = usePlugins();
  const [pluginAPI] = useState(() => new PluginAPI());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pluginData, setPluginData] = useState<PluginData | null>(null);
  const [widgets, setWidgets] = useState<PluginWidget[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load plugin data
  useEffect(() => {
    if (!pluginName) return;

    const loadPluginData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if plugin exists (first try demo backend, then check loaded plugins)
        try {
          const response = await fetch('http://localhost:8080/demo/plugins');
          const data = await response.json();
          const plugin = data.plugins?.find((p: Record<string, unknown>) => p.name === pluginName);

          if (!plugin) {
            setError(`Plugin "${pluginName}" is not installed`);
            setLoading(false);
            return;
          }

          if (!plugin.enabled) {
            setError(`Plugin "${pluginName}" is disabled. Please enable it first.`);
            setLoading(false);
            return;
          }
        } catch {
          // Fallback to checking loaded plugins
          if (!isPluginLoaded(pluginName)) {
            setError(`Plugin "${pluginName}" is not installed or enabled`);
            setLoading(false);
            return;
          }
        }

        // Load plugin details (try demo backend first)
        let details: PluginData;
        try {
          const response = await fetch('http://localhost:8080/demo/plugins');
          const data = await response.json();
          const plugin = data.plugins?.find((p: Record<string, unknown>) => p.name === pluginName);

          if (plugin) {
            details = {
              success: true,
              plugin: {
                name: plugin.name as string,
                version: plugin.version as string,
                enabled: plugin.enabled as boolean,
                status: plugin.enabled ? 'active' : 'inactive',
              },
              data: plugin,
            };

            // Try to get metrics if it's the analytics plugin
            if (plugin.name === 'sample-analytics') {
              try {
                const metricsResponse = await fetch(
                  `http://localhost:8080/api/plugins/${plugin.name}/metrics`
                );
                if (metricsResponse.ok) {
                  const metricsData = await metricsResponse.json();
                  details.metrics = metricsData.metrics;
                }
              } catch {
                console.log('No metrics available');
              }
            }
          } else {
            throw new Error('Plugin not found in demo backend');
          }
        } catch {
          // Fallback to plugin API
          details = await pluginAPI.getPluginDetails(pluginName);
        }

        setPluginData(details);

        // Load plugin widgets
        try {
          const widgetResponse = await pluginAPI.callPluginFunction(pluginName, '/widgets', {});
          if (widgetResponse.widgets) {
            setWidgets(widgetResponse.widgets);
          }
        } catch {
          console.log('No widgets available for plugin:', pluginName);

          // Set default widgets for known plugins
          if (pluginName === 'sample-analytics') {
            setWidgets([
              {
                name: 'analytics-overview',
                type: 'metrics',
                title: 'Analytics Overview',
                description: 'Key metrics and performance indicators',
                component: 'AnalyticsMetrics',
              },
              {
                name: 'analytics-chart',
                type: 'chart',
                title: 'Page Views Chart',
                description: 'Visual representation of page view trends',
                component: 'AnalyticsChart',
              },
              {
                name: 'top-pages',
                type: 'table',
                title: 'Top Pages',
                description: 'Most visited pages and their statistics',
                component: 'TopPagesTable',
              },
              {
                name: 'user-activity',
                type: 'card',
                title: 'User Activity',
                description: 'Real-time user engagement metrics',
                component: 'UserActivityCard',
              },
            ]);
          } else if (pluginName === 'backup-plugin') {
            setWidgets([
              {
                name: 'backup-status',
                type: 'card',
                title: 'Backup Status',
                description: 'Current backup system status and health',
                component: 'BackupStatusCard',
              },
              {
                name: 'backup-history',
                type: 'table',
                title: 'Backup History',
                description: 'Recent backup operations and results',
                component: 'BackupHistoryTable',
              },
            ]);
          } else {
            setWidgets([]);
          }
        }
      } catch (err) {
        console.error('Failed to load plugin data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load plugin');
      } finally {
        setLoading(false);
      }
    };

    loadPluginData();
  }, [pluginName, isPluginLoaded, pluginAPI, refreshKey]);

  // Refresh plugin data
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Render widget based on type
  const renderWidget = (widget: PluginWidget, index: number) => {
    const getWidgetIcon = () => {
      switch (widget.type) {
        case 'chart':
          return <HiOutlineChartBar className="h-5 w-5" />;
        case 'table':
          return <HiOutlineTableCells className="h-5 w-5" />;
        case 'metrics':
          return <HiOutlineChartBar className="h-5 w-5" />;
        default:
          return <HiOutlinePuzzlePiece className="h-5 w-5" />;
      }
    };

    return (
      <motion.div
        key={widget.name}
        className="rounded-xl border p-6"
        style={{
          background: themeStyles.effects.glassMorphism.background,
          borderColor: themeStyles.card.borderColor,
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
      >
        <div className="mb-4 flex items-center gap-3">
          <div
            className="rounded-lg p-2"
            style={{
              background: `${themeStyles.colors.brand.primary}20`,
              color: themeStyles.colors.brand.primary,
            }}
          >
            {getWidgetIcon()}
          </div>
          <div>
            <h3
              className="text-lg font-semibold"
              style={{ color: themeStyles.colors.text.primary }}
            >
              {widget.title}
            </h3>
            {widget.description && (
              <p className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
                {widget.description}
              </p>
            )}
          </div>
        </div>

        {/* Widget content based on type */}
        <div className="widget-content">
          {widget.type === 'metrics' && (
            <PluginMetricsWidget pluginName={pluginName!} widget={widget} />
          )}
          {widget.type === 'chart' && (
            <PluginChartWidget pluginName={pluginName!} widget={widget} />
          )}
          {widget.type === 'table' && (
            <PluginTableWidget pluginName={pluginName!} widget={widget} />
          )}
          {widget.type === 'card' && <PluginCardWidget pluginName={pluginName!} widget={widget} />}
          {widget.type === 'custom' && (
            <PluginCustomWidget pluginName={pluginName!} widget={widget} />
          )}
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <HiOutlineArrowPath
            className="h-8 w-8 animate-spin"
            style={{ color: themeStyles.colors.brand.primary }}
          />
          <p style={{ color: themeStyles.colors.text.secondary }}>Loading plugin: {pluginName}</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <motion.div
          className="flex max-w-md flex-col items-center gap-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <HiOutlineExclamationTriangle
            className="h-12 w-12"
            style={{ color: themeStyles.colors.status.error }}
          />
          <h3 className="text-xl font-semibold" style={{ color: themeStyles.colors.text.primary }}>
            Plugin Not Available
          </h3>
          <p style={{ color: themeStyles.colors.text.secondary }}>{error}</p>
          <div className="mt-4 flex gap-3">
            <motion.button
              onClick={() => navigate('/plugins/manage')}
              className="flex items-center gap-2 rounded-lg px-4 py-2"
              style={{
                background: themeStyles.button.secondary.background,
                color: themeStyles.button.secondary.color,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <HiOutlineArrowLeft className="h-4 w-4" />
              Back to Plugins
            </motion.button>
            <motion.button
              onClick={handleRefresh}
              className="flex items-center gap-2 rounded-lg px-4 py-2"
              style={{
                background: themeStyles.button.primary.background,
                color: themeStyles.button.primary.color,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <HiOutlineArrowPath className="h-4 w-4" />
              Retry
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-6 p-6">
      {/* Plugin Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-4">
          <motion.button
            onClick={() => navigate('/plugins/manage')}
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{
              background: themeStyles.button.secondary.background,
              color: themeStyles.button.secondary.color,
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <HiOutlineArrowLeft className="h-4 w-4" />
            Back
          </motion.button>

          <div className="flex items-center gap-3">
            <div
              className="rounded-xl p-3"
              style={{
                background: themeStyles.effects.glassMorphism.background,
                border: `1px solid ${themeStyles.card.borderColor}`,
              }}
            >
              <HiOutlinePuzzlePiece
                className="h-6 w-6"
                style={{ color: themeStyles.colors.brand.primary }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: themeStyles.colors.text.primary }}>
                {pluginName}
              </h1>
              <p style={{ color: themeStyles.colors.text.secondary }}>
                Plugin Dashboard
                {pluginData?.plugin?.version && ` • v${pluginData.plugin.version}`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
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

          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
            style={{
              background: pluginData?.plugin?.enabled
                ? `${themeStyles.colors.status.success}20`
                : `${themeStyles.colors.status.warning}20`,
              color: pluginData?.plugin?.enabled
                ? themeStyles.colors.status.success
                : themeStyles.colors.status.warning,
            }}
          >
            <div
              className={`h-2 w-2 rounded-full ${
                pluginData?.plugin?.enabled ? 'animate-pulse' : ''
              }`}
              style={{
                backgroundColor: pluginData?.plugin?.enabled
                  ? themeStyles.colors.status.success
                  : themeStyles.colors.status.warning,
              }}
            />
            {pluginData?.plugin?.enabled ? 'Active' : 'Inactive'}
          </div>
        </div>
      </motion.div>

      {/* Plugin Widgets */}
      {widgets.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {widgets.map((widget, index) => renderWidget(widget, index))}
        </div>
      ) : (
        <motion.div
          className="flex flex-col items-center justify-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <HiOutlineInformationCircle
            className="mb-4 h-16 w-16"
            style={{ color: themeStyles.colors.text.secondary }}
          />
          <h3
            className="mb-2 text-lg font-medium"
            style={{ color: themeStyles.colors.text.primary }}
          >
            No widgets available
          </h3>
          <p style={{ color: themeStyles.colors.text.secondary }}>
            This plugin doesn't have any widgets to display
          </p>
        </motion.div>
      )}

      {/* Plugin Info Panel */}
      {pluginData && (
        <motion.div
          className="mt-6 rounded-xl border p-6"
          style={{
            background: themeStyles.effects.glassMorphism.background,
            borderColor: themeStyles.card.borderColor,
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <h3
            className="mb-4 text-lg font-semibold"
            style={{ color: themeStyles.colors.text.primary }}
          >
            Plugin Information
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <div className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
                Status
              </div>
              <div className="font-medium" style={{ color: themeStyles.colors.text.primary }}>
                {pluginData.plugin?.status || 'Unknown'}
              </div>
            </div>
            <div>
              <div className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
                Version
              </div>
              <div className="font-medium" style={{ color: themeStyles.colors.text.primary }}>
                {pluginData.plugin?.version || 'Unknown'}
              </div>
            </div>
            <div>
              <div className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
                Widgets
              </div>
              <div className="font-medium" style={{ color: themeStyles.colors.text.primary }}>
                {widgets.length}
              </div>
            </div>
            <div>
              <div className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
                Enabled
              </div>
              <div className="font-medium" style={{ color: themeStyles.colors.text.primary }}>
                {pluginData.plugin?.enabled ? 'Yes' : 'No'}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Widget Components
const PluginMetricsWidget: React.FC<{ pluginName: string; widget: PluginWidget }> = ({
  pluginName,
}) => {
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/plugins/${pluginName}/metrics`);
        if (response.ok) {
          const data = await response.json();
          setMetrics(data.metrics);
        }
      } catch (error) {
        console.error('Failed to load metrics:', error);
      }
    };

    loadMetrics();
  }, [pluginName]);

  if (!metrics) {
    return <div className="py-4 text-center">Loading metrics...</div>;
  }

  return (
    <div className="space-y-3">
      {Object.entries(metrics.analytics_data || {}).map(([key, value]) => (
        <div key={key} className="flex items-center justify-between">
          <span className="text-sm capitalize">{key.replace('_', ' ')}</span>
          <span className="font-bold">{String(value)}</span>
        </div>
      ))}
    </div>
  );
};

const PluginChartWidget: React.FC<{ pluginName: string; widget: PluginWidget }> = ({
  pluginName,
  widget,
}) => {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
      <div className="text-center">
        <HiOutlineChartBar className="mx-auto mb-2 h-8 w-8" />
        <p>Chart visualization for {widget.title}</p>
        <p className="text-sm opacity-60">Data source: {pluginName}</p>
      </div>
    </div>
  );
};

const PluginTableWidget: React.FC<{ pluginName: string; widget: PluginWidget }> = ({
  pluginName,
  widget,
}) => {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
      <div className="text-center">
        <HiOutlineTableCells className="mx-auto mb-2 h-8 w-8" />
        <p>Table widget for {widget.title}</p>
        <p className="text-sm opacity-60">Data source: {pluginName}</p>
      </div>
    </div>
  );
};

interface AnalyticsData {
  page_views?: number;
  unique_users?: number;
  sessions?: number;
  events?: unknown[];
}

const PluginCardWidget: React.FC<{ pluginName: string; widget: PluginWidget }> = ({
  pluginName,
}) => {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/plugins/${pluginName}/data`);
        if (response.ok) {
          const responseData = await response.json();
          setData(responseData.data);
        }
      } catch (error) {
        console.error('Failed to load plugin data:', error);
      }
    };

    loadData();
  }, [pluginName]);

  if (!data) {
    return <div className="py-4 text-center">Loading data...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-500">
            {data.page_views?.toLocaleString()}
          </div>
          <div className="text-sm opacity-60">Page Views</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500">
            {data.unique_users?.toLocaleString()}
          </div>
          <div className="text-sm opacity-60">Unique Users</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-500">
            {data.sessions?.toLocaleString()}
          </div>
          <div className="text-sm opacity-60">Sessions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-500">{data.events?.length || 0}</div>
          <div className="text-sm opacity-60">Events</div>
        </div>
      </div>
    </div>
  );
};

const PluginCustomWidget: React.FC<{ pluginName: string; widget: PluginWidget }> = ({
  pluginName,
  widget,
}) => {
  return (
    <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed">
      <div className="text-center">
        <HiOutlineCog6Tooth className="mx-auto mb-2 h-8 w-8" />
        <p>Custom widget: {widget.title}</p>
        <p className="text-sm opacity-60">Plugin: {pluginName}</p>
      </div>
    </div>
  );
};

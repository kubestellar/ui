/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlinePuzzlePiece,
  HiOutlinePlay,
  HiOutlinePause,
  HiOutlineArrowPath,
  HiOutlineInformationCircle,
  HiMagnifyingGlass,
  HiXMark,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineCloudArrowDown,
  HiOutlineFolder,
  HiOutlineCodeBracket,
} from 'react-icons/hi2';
import { usePlugins } from '../plugins/PluginLoader';
import { PluginAPI } from '../plugins/PluginAPI';
import useTheme from '../stores/themeStore';
import getThemeStyles from '../lib/theme-utils';

interface Plugin {
  name: string;
  version: string;
  description: string;
  author: string;
  status: 'active' | 'inactive' | 'loading' | 'error';
  enabled: boolean;
  loadTime?: Date;
  routes?: string[];
  metrics?: any;
}

// Helper functions for plugin metadata
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

export const PluginManager: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);

  const { plugins, loadedPlugins, loadPlugin, unloadPlugin } = usePlugins();
  const [pluginAPI] = useState(() => new PluginAPI());

  const [availablePlugins, setAvailablePlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installMethod, setInstallMethod] = useState<'local' | 'github'>('local');
  const [githubUrl, setGithubUrl] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'uninstall' | 'disable';
    plugin: string;
  } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  // Ref for the hidden directory input
  const directoryInputRef = useRef<HTMLInputElement>(null);
  const loadPluginData = useCallback(async () => {
    try {
      setLoading(true);

      // Try to fetch from demo backend first for enhanced plugin cards
      try {
        const response = await fetch('http://localhost:8080/demo/plugins');
        const data = await response.json();

        if (data.success && data.plugins) {
          const enhancedPlugins = await Promise.all(
            data.plugins.map(async (plugin: any) => {
              const enhancedPlugin: Plugin = {
                name: plugin.name,
                version: plugin.version,
                description: getPluginDescription(plugin.name),
                author: getPluginAuthor(plugin.name),
                status: plugin.enabled ? 'active' : 'inactive',
                enabled: plugin.enabled,
                routes: plugin.routes || [],
                loadTime: new Date(),
              };

              // Load metrics for enabled plugins (sample-analytics)
              if (plugin.enabled && plugin.name === 'sample-analytics') {
                try {
                  const metricsResponse = await fetch(
                    `http://localhost:8080/api/plugins/${plugin.name}/metrics`
                  );
                  if (metricsResponse.ok) {
                    const metricsData = await metricsResponse.json();
                    enhancedPlugin.metrics = metricsData.metrics;
                  }
                } catch {
                  console.log(`No metrics available for ${plugin.name}`);
                }
              }

              return enhancedPlugin;
            })
          );

          setAvailablePlugins(enhancedPlugins);
          return;
        }
      } catch {
        console.log('Demo backend not available, falling back to plugin API');
      }

      // Fallback to original plugin API
      const pluginList = await pluginAPI.getPluginList();
      setAvailablePlugins(pluginList);
    } catch {
      console.error('Failed to load plugin data');
    } finally {
      setLoading(false);
    }
  }, [pluginAPI]);

  useEffect(() => {
    loadPluginData();

    // Auto-refresh every 30 seconds for real-time data
    const interval = setInterval(loadPluginData, 30000);
    return () => clearInterval(interval);
  }, [loadPluginData]);

  const handleViewPlugin = (pluginName: string) => {
    navigate(`/plugin/${pluginName}`);
  };

  const handleEnablePlugin = async (pluginName: string) => {
    try {
      await pluginAPI.enablePlugin(pluginName);
      const manifest = loadedPlugins.find(p => p.name === pluginName);
      if (manifest) {
        await loadPlugin(manifest);
      }
      await loadPluginData();
    } catch {
      console.error('Failed to enable plugin');
    }
  };

  const handleTogglePlugin = async (pluginName: string, currentlyEnabled: boolean) => {
    setRefreshing(pluginName);
    try {
      if (currentlyEnabled) {
        await handleDisablePlugin(pluginName);
      } else {
        await handleEnablePlugin(pluginName);
      }
    } catch (error) {
      console.error('Failed to toggle plugin:', error);
    } finally {
      setRefreshing(null);
    }
  };

  const handleDisablePlugin = async (pluginName: string) => {
    try {
      await pluginAPI.disablePlugin(pluginName);
      await unloadPlugin(pluginName);
      await loadPluginData();
      setConfirmAction(null);
    } catch (error) {
      console.error('Failed to disable plugin:', error);
    }
  };

  const handleInstallPlugin = async () => {
    const source = installMethod === 'local' ? localPath : githubUrl;
    if (!source.trim()) {
      alert('Please enter a plugin path or URL');
      return;
    }

    try {
      setInstalling(true);
      console.log('Installing plugin from:', source);

      const result = await pluginAPI.installPlugin(source);
      console.log('Installation result:', result);

      // Clear the input fields
      setLocalPath('');
      setGithubUrl('');
      setSelectedFile(null);

      // Reset directory input
      if (directoryInputRef.current) {
        directoryInputRef.current.value = '';
      }

      // Reload plugin data
      await loadPluginData();

      // Show success message
      if (result.success) {
        alert(`Plugin installed successfully: ${result.message || 'Installation complete'}`);
      } else {
        alert(
          `Installation completed but with warnings: ${result.message || 'Check console for details'}`
        );
      }
    } catch (error) {
      console.error('Failed to install plugin:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to install plugin: ${errorMessage}`);
    } finally {
      setInstalling(false);
    }
  };

  const handleFileSelect = () => {
    // Try to use directory picker first (for modern browsers)
    if (directoryInputRef.current) {
      directoryInputRef.current.click();
    }
  };

  const handleDirectorySelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Get the first file and extract the directory path
      const firstFile = files[0];
      setSelectedFile(firstFile);

      // Extract directory path from the file's webkitRelativePath
      const relativePath = firstFile.webkitRelativePath;
      if (relativePath) {
        const directoryPath = relativePath.split('/')[0];
        setLocalPath(directoryPath);
      } else {
        // Fallback to file path
        setLocalPath(firstFile.name);
      }
    }
  };

  const handleUninstallPlugin = async (pluginName: string) => {
    try {
      await pluginAPI.uninstallPlugin(pluginName);
      await unloadPlugin(pluginName);
      await loadPluginData();
      setConfirmAction(null);
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
    }
  };

  const filteredPlugins = availablePlugins.filter(
    plugin =>
      plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (plugin: Plugin, refreshing: string | null) => {
    if (refreshing === plugin.name) return themeStyles.colors.brand.primary;
    switch (plugin.status) {
      case 'active':
        return themeStyles.colors.status.success;
      case 'error':
        return themeStyles.colors.status.error;
      default:
        return themeStyles.colors.text.secondary;
    }
  };

  const getEnhancedStatusIcon = (plugin: Plugin, refreshing: string | null) => {
    if (refreshing === plugin.name) {
      return <HiOutlineArrowPath className="h-4 w-4 animate-spin" />;
    }
    switch (plugin.status) {
      case 'active':
        return <HiOutlineCheckCircle className="h-4 w-4" />;
      case 'error':
        return <HiOutlineExclamationTriangle className="h-4 w-4" />;
      default:
        return <HiOutlinePause className="h-4 w-4" />;
    }
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
          <p style={{ color: themeStyles.colors.text.secondary }}>{t('common.loading')}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-6 p-6">
      {/* Header */}
      <motion.div
        className="flex flex-col gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
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
              {t('plugins.title')}
            </h1>
            <p style={{ color: themeStyles.colors.text.secondary }}>{t('plugins.description')}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          {[
            {
              label: t('plugins.list.total'),
              value: availablePlugins.length,
              color: themeStyles.colors.text.primary,
            },
            {
              label: t('plugins.list.active'),
              value: plugins.size,
              color: themeStyles.colors.status.success,
            },
            {
              label: t('plugins.list.inactive'),
              value: availablePlugins.length - plugins.size,
              color: themeStyles.colors.text.secondary,
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              className="flex flex-col gap-1 rounded-xl p-4"
              style={{
                background: themeStyles.effects.glassMorphism.background,
                border: `1px solid ${themeStyles.card.borderColor}`,
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <span className="text-2xl font-bold" style={{ color: stat.color }}>
                {stat.value}
              </span>
              <span className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Install Section */}
      <motion.div
        className="rounded-xl p-6"
        style={{
          background: themeStyles.effects.glassMorphism.background,
          border: `1px solid ${themeStyles.card.borderColor}`,
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <h3
          className="mb-4 text-lg font-semibold"
          style={{ color: themeStyles.colors.text.primary }}
        >
          {t('plugins.install.title')}
        </h3>

        {/* Installation Method Tabs */}
        <div
          className="mb-4 flex rounded-lg p-1"
          style={{ background: themeStyles.colors.bg.secondary }}
        >
          <button
            onClick={() => setInstallMethod('local')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              installMethod === 'local' ? 'shadow-sm' : ''
            }`}
            style={{
              background: installMethod === 'local' ? themeStyles.colors.bg.primary : 'transparent',
              color:
                installMethod === 'local'
                  ? themeStyles.colors.text.primary
                  : themeStyles.colors.text.secondary,
            }}
          >
            <HiOutlineFolder className="h-4 w-4" />
            {t('plugins.install.methods.local')}
          </button>
          <button
            onClick={() => setInstallMethod('github')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              installMethod === 'github' ? 'shadow-sm' : ''
            }`}
            style={{
              background:
                installMethod === 'github' ? themeStyles.colors.bg.primary : 'transparent',
              color:
                installMethod === 'github'
                  ? themeStyles.colors.text.primary
                  : themeStyles.colors.text.secondary,
            }}
          >
            <HiOutlineCodeBracket className="h-4 w-4" />
            {t('plugins.install.methods.github')}
          </button>
        </div>

        {/* Local Path Installation */}
        {installMethod === 'local' && (
          <div className="space-y-3">
            <div
              className="mb-3 rounded-lg p-3"
              style={{ background: themeStyles.colors.bg.secondary }}
            >
              <p className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
                💡 {t('plugins.install.localHelp')}
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder={t('plugins.install.localPlaceholder')}
                  value={localPath}
                  onChange={e => {
                    setLocalPath(e.target.value);
                    // Clear selected file when manually typing
                    if (selectedFile) {
                      setSelectedFile(null);
                    }
                  }}
                  className="w-full rounded-lg border px-4 py-3 outline-none transition-colors"
                  style={{
                    background: themeStyles.colors.bg.secondary,
                    borderColor: themeStyles.card.borderColor,
                    color: themeStyles.colors.text.primary,
                  }}
                />
              </div>
              <div className="flex gap-2">
                <motion.button
                  onClick={handleFileSelect}
                  className="flex items-center gap-2 rounded-lg px-4 py-3 font-medium transition-all"
                  style={{
                    background: themeStyles.colors.bg.secondary,
                    borderColor: themeStyles.card.borderColor,
                    color: themeStyles.colors.text.secondary,
                    border: `1px solid ${themeStyles.card.borderColor}`,
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  title="Browse for plugin directory"
                >
                  <HiOutlineFolder className="h-4 w-4" />
                  {t('plugins.install.browse')}
                </motion.button>
              </div>
            </div>

            {/* File selection feedback */}
            {selectedFile && (
              <motion.div
                className="rounded-lg p-3"
                style={{ background: themeStyles.colors.status.success + '10' }}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-2">
                  <HiOutlineCheckCircle
                    className="h-4 w-4"
                    style={{ color: themeStyles.colors.status.success }}
                  />
                  <span className="text-sm" style={{ color: themeStyles.colors.status.success }}>
                    Selected: {selectedFile.name}
                    {selectedFile.webkitRelativePath && (
                      <span className="ml-2 text-xs">
                        (Directory: {selectedFile.webkitRelativePath.split('/')[0]})
                      </span>
                    )}
                  </span>
                </div>
              </motion.div>
            )}

            <motion.button
              onClick={handleInstallPlugin}
              disabled={!localPath.trim() || installing}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: themeStyles.button.primary.background,
                color: themeStyles.button.primary.color,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {installing ? (
                <HiOutlineArrowPath className="h-4 w-4 animate-spin" />
              ) : (
                <HiOutlineFolder className="h-4 w-4" />
              )}
              {installing ? t('plugins.install.installing') : t('plugins.install.installLocal')}
            </motion.button>

            {/* Hidden directory input for browsing */}
            <input
              ref={directoryInputRef}
              type="file"
              // @ts-expect-error webkitdirectory is not in the TypeScript types but is a valid HTML attribute
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleDirectorySelect}
              style={{ display: 'none' }}
              accept=".js,.ts,.json"
            />
          </div>
        )}

        {/* GitHub Installation */}
        {installMethod === 'github' && (
          <div className="space-y-3">
            <div
              className="mb-3 rounded-lg p-3"
              style={{ background: themeStyles.colors.bg.secondary }}
            >
              <p className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
                🚧 {t('plugins.install.githubHelp')}
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder={t('plugins.install.githubPlaceholder')}
                  value={githubUrl}
                  onChange={e => setGithubUrl(e.target.value)}
                  className="w-full rounded-lg border px-4 py-3 outline-none transition-colors"
                  style={{
                    background: themeStyles.colors.bg.secondary,
                    borderColor: themeStyles.card.borderColor,
                    color: themeStyles.colors.text.primary,
                  }}
                />
              </div>
            </div>
            <motion.button
              onClick={handleInstallPlugin}
              disabled={!githubUrl.trim() || installing}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: themeStyles.button.primary.background,
                color: themeStyles.button.primary.color,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {installing ? (
                <HiOutlineArrowPath className="h-4 w-4 animate-spin" />
              ) : (
                <HiOutlineCloudArrowDown className="h-4 w-4" />
              )}
              {installing ? t('plugins.install.installing') : t('plugins.install.installGithub')}
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* Search and Filter */}
      <motion.div
        className="flex gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <div className="relative flex-1">
          <HiMagnifyingGlass
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2"
            style={{ color: themeStyles.colors.text.secondary }}
          />
          <input
            type="text"
            placeholder={t('plugins.list.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border py-3 pl-10 pr-4 outline-none transition-colors"
            style={{
              background: themeStyles.colors.bg.secondary,
              borderColor: themeStyles.card.borderColor,
              color: themeStyles.colors.text.primary,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors hover:bg-opacity-10"
            >
              <HiXMark className="h-4 w-4" style={{ color: themeStyles.colors.text.secondary }} />
            </button>
          )}
        </div>
      </motion.div>

      {/* Plugin Grid */}
      <motion.div
        className="flex-1"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <h3
          className="mb-4 text-lg font-semibold"
          style={{ color: themeStyles.colors.text.primary }}
        >
          {t('plugins.list.title')}
        </h3>

        {filteredPlugins.length === 0 ? (
          <div
            className="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed"
            style={{ borderColor: themeStyles.card.borderColor }}
          >
            <HiOutlinePuzzlePiece
              className="mb-4 h-12 w-12"
              style={{ color: themeStyles.colors.text.secondary }}
            />
            <h4
              className="mb-2 text-lg font-medium"
              style={{ color: themeStyles.colors.text.primary }}
            >
              {t('plugins.list.noPlugins')}
            </h4>
            <p style={{ color: themeStyles.colors.text.secondary }}>
              {t('plugins.list.noPluginsDescription')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredPlugins.map((plugin, index) => (
                <motion.div
                  key={plugin.name}
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
                  onClick={() => handleViewPlugin(plugin.name)}
                >
                  {/* Status Indicator */}
                  <div className="absolute right-4 top-4 flex items-center gap-2">
                    <div style={{ color: getStatusColor(plugin, refreshing) }}>
                      {getEnhancedStatusIcon(plugin, refreshing)}
                    </div>
                    <div
                      className={`h-2 w-2 rounded-full ${plugin.enabled ? 'animate-pulse' : ''}`}
                      style={{ backgroundColor: getStatusColor(plugin, refreshing) }}
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
                      {getPluginIcon(plugin.name)}
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
                              <div
                                className="text-xs"
                                style={{ color: themeStyles.colors.text.secondary }}
                              >
                                Page Views
                              </div>
                            </div>
                            <div className="text-center">
                              <div
                                className="text-lg font-bold"
                                style={{ color: themeStyles.colors.status.success }}
                              >
                                {plugin.metrics.analytics_data.unique_users?.toLocaleString() ||
                                  '0'}
                              </div>
                              <div
                                className="text-xs"
                                style={{ color: themeStyles.colors.text.secondary }}
                              >
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
                      <HiOutlineInformationCircle className="h-3 w-3" />
                      <span style={{ color: themeStyles.colors.text.secondary }}>
                        {plugin.author}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <HiOutlineCodeBracket className="h-3 w-3" />
                      <span style={{ color: themeStyles.colors.text.secondary }}>
                        {plugin.routes?.length || 0} API routes
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <HiOutlineArrowPath className="h-3 w-3" />
                      <span style={{ color: themeStyles.colors.text.secondary }}>
                        Updated {plugin.loadTime?.toLocaleTimeString() || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <motion.button
                      onClick={e => {
                        e.stopPropagation();
                        handleTogglePlugin(plugin.name, plugin.enabled);
                      }}
                      disabled={refreshing === plugin.name}
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
                      {refreshing === plugin.name ? (
                        <HiOutlineArrowPath className="h-4 w-4 animate-spin" />
                      ) : plugin.enabled ? (
                        <HiOutlinePause className="h-4 w-4" />
                      ) : (
                        <HiOutlinePlay className="h-4 w-4" />
                      )}
                      {refreshing === plugin.name
                        ? 'Processing...'
                        : plugin.enabled
                          ? 'Disable'
                          : 'Enable'}
                    </motion.button>

                    <motion.button
                      onClick={e => {
                        e.stopPropagation();
                        handleViewPlugin(plugin.name);
                      }}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                      style={{
                        background: `${themeStyles.colors.brand.primary}20`,
                        color: themeStyles.colors.brand.primary,
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <HiOutlineInformationCircle className="h-4 w-4" />
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
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Plugin Details Modal */}
      <AnimatePresence>
        {selectedPlugin && (
          <PluginDetailsModal
            pluginName={selectedPlugin}
            onClose={() => setSelectedPlugin(null)}
            themeStyles={themeStyles}
            t={t}
            pluginAPI={pluginAPI}
          />
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmAction && (
          <ConfirmationModal
            action={confirmAction}
            onConfirm={() => {
              if (confirmAction.type === 'uninstall') {
                handleUninstallPlugin(confirmAction.plugin);
              } else {
                handleDisablePlugin(confirmAction.plugin);
              }
            }}
            onCancel={() => setConfirmAction(null)}
            themeStyles={themeStyles}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Plugin Details Modal Component
interface PluginDetailsModalProps {
  pluginName: string;
  onClose: () => void;
  themeStyles: any;
  t: (key: string, options?: any) => string;
  pluginAPI: PluginAPI;
}

const PluginDetailsModal: React.FC<PluginDetailsModalProps> = ({
  pluginName,
  onClose,
  themeStyles,
  t,
  pluginAPI,
}) => {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPluginDetails = async () => {
      try {
        setLoading(true);
        const pluginDetails = await pluginAPI.getPluginDetails(pluginName);
        setDetails(pluginDetails);
      } catch (error) {
        console.error('Failed to load plugin details:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPluginDetails();
  }, [pluginName, pluginAPI]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="max-h-[80vh] w-full max-w-4xl overflow-y-auto rounded-xl p-6"
        style={{
          background: themeStyles.colors.bg.primary,
          border: `1px solid ${themeStyles.card.borderColor}`,
        }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold" style={{ color: themeStyles.colors.text.primary }}>
            {t('plugins.details.title')}: {pluginName}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-opacity-10"
            style={{ background: themeStyles.colors.text.secondary + '20' }}
          >
            <HiXMark className="h-5 w-5" style={{ color: themeStyles.colors.text.secondary }} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <HiOutlineArrowPath
              className="h-8 w-8 animate-spin"
              style={{ color: themeStyles.colors.brand.primary }}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h4
                className="mb-3 text-lg font-semibold"
                style={{ color: themeStyles.colors.text.primary }}
              >
                {t('plugins.details.information')}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium" style={{ color: themeStyles.colors.text.primary }}>
                    Name:
                  </span>
                  <span className="ml-2" style={{ color: themeStyles.colors.text.secondary }}>
                    {details?.name}
                  </span>
                </div>
                <div>
                  <span className="font-medium" style={{ color: themeStyles.colors.text.primary }}>
                    Version:
                  </span>
                  <span className="ml-2" style={{ color: themeStyles.colors.text.secondary }}>
                    {details?.version}
                  </span>
                </div>
                <div>
                  <span className="font-medium" style={{ color: themeStyles.colors.text.primary }}>
                    Status:
                  </span>
                  <span className="ml-2" style={{ color: themeStyles.colors.text.secondary }}>
                    {details?.status}
                  </span>
                </div>
                <div>
                  <span className="font-medium" style={{ color: themeStyles.colors.text.primary }}>
                    Routes:
                  </span>
                  <span className="ml-2" style={{ color: themeStyles.colors.text.secondary }}>
                    {details?.routes?.length || 0}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4
                className="mb-3 text-lg font-semibold"
                style={{ color: themeStyles.colors.text.primary }}
              >
                {t('plugins.details.configuration')}
              </h4>
              <pre
                className="overflow-x-auto rounded-lg p-4 text-sm"
                style={{
                  background: themeStyles.colors.bg.secondary,
                  color: themeStyles.colors.text.secondary,
                }}
              >
                {JSON.stringify(details, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// Confirmation Modal Component
interface ConfirmationModalProps {
  action: { type: 'uninstall' | 'disable'; plugin: string };
  onConfirm: () => void;
  onCancel: () => void;
  themeStyles: any;
  t: (key: string, options?: any) => string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  action,
  onConfirm,
  onCancel,
  themeStyles,
  t,
}) => {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="w-full max-w-md rounded-xl p-6"
        style={{
          background: themeStyles.colors.bg.primary,
          border: `1px solid ${themeStyles.card.borderColor}`,
        }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4">
          <h3 className="text-lg font-bold" style={{ color: themeStyles.colors.text.primary }}>
            {t(`plugins.confirmations.${action.type}.title`)}
          </h3>
          <p className="mt-2" style={{ color: themeStyles.colors.text.secondary }}>
            {t(`plugins.confirmations.${action.type}.message`, { name: action.plugin })}
          </p>
        </div>

        <div className="flex gap-3">
          <motion.button
            onClick={onCancel}
            className="flex-1 rounded-lg px-4 py-2 font-medium transition-colors"
            style={{
              background: themeStyles.colors.text.secondary + '20',
              color: themeStyles.colors.text.secondary,
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {t('common.cancel')}
          </motion.button>
          <motion.button
            onClick={onConfirm}
            className="flex-1 rounded-lg px-4 py-2 font-medium transition-colors"
            style={{
              background: themeStyles.colors.status.error,
              color: 'white',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {t(`plugins.confirmations.${action.type}.confirm`)}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

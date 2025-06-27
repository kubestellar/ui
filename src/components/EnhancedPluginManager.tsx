import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import {
  HiOutlinePuzzlePiece,
  HiOutlineArrowPath,
  HiMagnifyingGlass,
  HiOutlineViewColumns,
  HiOutlineListBullet,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineWrenchScrewdriver,
} from 'react-icons/hi2';
import { PluginCard } from './PluginCard';
import { PluginAPI } from '../plugins/PluginAPI';
import { usePlugins } from '../plugins/PluginLoader';

import useTheme from '../stores/themeStore';
import getThemeStyles from '../lib/theme-utils';

interface Plugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  enabled: boolean;
  status: 'active' | 'inactive' | 'loading' | 'error';
}

interface LocalPluginManifest {
  name: string;
  description?: string;
  keywords?: string[];
}

export const EnhancedPluginManager: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);

  const { loadPlugin, unloadPlugin } = usePlugins();
  const [pluginAPI] = useState(() => new PluginAPI());

  const [availablePlugins, setAvailablePlugins] = useState<Plugin[]>([]);
  const [manifests, setManifests] = useState<Map<string, LocalPluginManifest>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Load plugin data
  const loadPluginData = useCallback(async () => {
    try {
      setLoading(true);

      // Load plugin list
      const pluginList = await pluginAPI.getPluginList();
      setAvailablePlugins(pluginList);

      // Load manifests

      const manifestsResponse = await pluginAPI.getPluginManifests();
      const manifestsMap = new Map();
      manifestsResponse.forEach((manifest: PluginManifest) => {
        manifestsMap.set(manifest.name, manifest);
      });
      setManifests(manifestsMap);

      setLastRefresh(new Date());
    } catch {
      console.error('Failed to load plugin data');
    } finally {
      setLoading(false);
    }
  }, [pluginAPI]);

  // Initial load
  useEffect(() => {
    loadPluginData();
  }, [loadPluginData]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadPluginData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, loadPluginData]);

  // Handle plugin status changes
  const handlePluginStatusChange = useCallback(
    async (pluginId: string, newStatus: string) => {
      // Update local state immediately for better UX
      setAvailablePlugins(prev =>
        prev.map(plugin =>
          plugin.id === pluginId
            ? {
                ...plugin,
                enabled: newStatus === 'enabled',
                status: newStatus === 'enabled' ? 'active' : 'inactive',
              }
            : plugin
        )
      );

      // Load plugin dynamically if enabled
      if (newStatus === 'enabled') {
        const manifest = manifests.get(pluginId);
        if (manifest) {
          try {
            await loadPlugin(manifest);
          } catch (error) {
            console.error('Failed to load plugin dynamically:', error);
          }
        }
      } else if (newStatus === 'disabled') {
        try {
          await unloadPlugin(pluginId);
        } catch (error) {
          console.error('Failed to unload plugin:', error);
        }
      }

      // Refresh data after a short delay
      setTimeout(() => {
        loadPluginData();
      }, 1000);
    },
    [manifests, loadPlugin, unloadPlugin, loadPluginData]
  );

  // Handle plugin details view
  const handleViewDetails = useCallback((pluginId: string) => {
    // You could implement a modal or side panel here
    console.log('View details for plugin:', pluginId);
  }, []);

  // Filter plugins based on search query
  const filteredPlugins = availablePlugins.filter(plugin => {
    const searchLower = searchQuery.toLowerCase();
    const manifest = manifests.get(plugin.name);

    return (
      plugin.name.toLowerCase().includes(searchLower) ||
      plugin.description?.toLowerCase().includes(searchLower) ||
      plugin.author?.toLowerCase().includes(searchLower) ||
      manifest?.description?.toLowerCase().includes(searchLower) ||
      (manifest as unknown as { keywords?: string[] })?.keywords?.some((keyword: string) =>
        keyword.toLowerCase().includes(searchLower)
      )
    );
  });

  // Calculate statistics
  const stats = {
    total: availablePlugins.length,
    active: availablePlugins.filter(p => p.enabled).length,
    inactive: availablePlugins.filter(p => !p.enabled).length,
    withManifests: Array.from(manifests.keys()).length,
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
          <p style={{ color: themeStyles.colors.text.secondary }}>Loading plugins...</p>
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
        <div className="flex items-center justify-between">
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
                Enhanced Plugin Manager
              </h1>
              <p style={{ color: themeStyles.colors.text.secondary }}>
                Manage and monitor your plugins with real-time updates
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                autoRefresh ? 'shadow-sm' : ''
              }`}
              style={{
                background: autoRefresh
                  ? themeStyles.colors.status.success + '20'
                  : themeStyles.colors.bg.secondary,
                color: autoRefresh
                  ? themeStyles.colors.status.success
                  : themeStyles.colors.text.secondary,
                border: `1px solid ${themeStyles.card.borderColor}`,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <HiOutlineArrowPath className={`h-4 w-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
              Auto Refresh
            </motion.button>

            <motion.button
              onClick={loadPluginData}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all"
              style={{
                background: themeStyles.button.primary.background,
                color: themeStyles.button.primary.color,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <HiOutlineArrowPath className="h-4 w-4" />
              Refresh
            </motion.button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              label: 'Total Plugins',
              value: stats.total,
              color: themeStyles.colors.text.primary,
              icon: HiOutlinePuzzlePiece,
            },
            {
              label: 'Active',
              value: stats.active,
              color: themeStyles.colors.status.success,
              icon: HiOutlineArrowTopRightOnSquare,
            },
            {
              label: 'Inactive',
              value: stats.inactive,
              color: themeStyles.colors.text.secondary,
              icon: HiOutlineWrenchScrewdriver,
            },
            {
              label: 'Enhanced',
              value: stats.withManifests,
              color: themeStyles.colors.brand.primary,
              icon: HiOutlineArrowTopRightOnSquare,
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              className="flex items-center gap-3 rounded-xl p-4"
              style={{
                background: themeStyles.effects.glassMorphism.background,
                border: `1px solid ${themeStyles.card.borderColor}`,
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <div className="rounded-lg p-2" style={{ background: `${stat.color}20` }}>
                <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <div className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
                  {stat.label}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Search and View Controls */}
      <motion.div
        className="flex items-center justify-between gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        {/* Search */}
        <div className="relative max-w-md flex-1">
          <HiMagnifyingGlass
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: themeStyles.colors.text.secondary }}
          />
          <input
            type="text"
            placeholder="Search plugins..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border py-3 pl-10 pr-4 outline-none transition-colors"
            style={{
              background: themeStyles.colors.bg.secondary,
              borderColor: themeStyles.card.borderColor,
              color: themeStyles.colors.text.primary,
            }}
          />
        </div>

        {/* View Mode Toggle */}
        <div
          className="flex rounded-lg border"
          style={{ borderColor: themeStyles.card.borderColor }}
        >
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-4 py-2 text-sm transition-all ${
              viewMode === 'grid' ? 'font-medium' : ''
            }`}
            style={{
              background:
                viewMode === 'grid' ? themeStyles.colors.brand.primary + '20' : 'transparent',
              color:
                viewMode === 'grid'
                  ? themeStyles.colors.brand.primary
                  : themeStyles.colors.text.secondary,
            }}
          >
            <HiOutlineViewColumns className="h-4 w-4" />
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 text-sm transition-all ${
              viewMode === 'list' ? 'font-medium' : ''
            }`}
            style={{
              background:
                viewMode === 'list' ? themeStyles.colors.brand.primary + '20' : 'transparent',
              color:
                viewMode === 'list'
                  ? themeStyles.colors.brand.primary
                  : themeStyles.colors.text.secondary,
            }}
          >
            <HiOutlineListBullet className="h-4 w-4" />
            List
          </button>
        </div>

        {/* Last Update */}
        <div className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
      </motion.div>

      {/* Plugin Grid/List */}
      <motion.div
        className={`${
          viewMode === 'grid'
            ? 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'
            : 'flex flex-col gap-4'
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <AnimatePresence mode="popLayout">
          {filteredPlugins.map((plugin, index) => (
            <motion.div
              key={plugin.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <PluginCard
                plugin={plugin}
                manifest={manifests.get(plugin.name)}
                onStatusChange={handlePluginStatusChange}
                onViewDetails={handleViewDetails}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Empty State */}
      {filteredPlugins.length === 0 && !loading && (
        <motion.div
          className="flex flex-col items-center justify-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <HiOutlinePuzzlePiece
            className="mb-4 h-16 w-16"
            style={{ color: themeStyles.colors.text.secondary }}
          />
          <h3
            className="mb-2 text-lg font-medium"
            style={{ color: themeStyles.colors.text.primary }}
          >
            No plugins found
          </h3>
          <p style={{ color: themeStyles.colors.text.secondary }}>
            {searchQuery ? 'Try adjusting your search query' : 'No plugins are installed'}
          </p>
        </motion.div>
      )}
    </div>
  );
};

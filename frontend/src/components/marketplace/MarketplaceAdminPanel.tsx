import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPlus,
  HiTrash,
  HiEye,
  HiCog6Tooth,
  HiShieldCheck,
  HiCloudArrowUp,
  HiUsers,
  HiChartBar,
  HiDocumentText,
} from 'react-icons/hi2';
import useTheme from '../../stores/themeStore';
import getThemeStyles from '../../lib/theme-utils';
import { useMarketplaceQueries } from '../../hooks/queries/useMarketplaceQueries';
import { PluginUploadModal } from './PluginUploadModal';
import { PluginDeleteModal } from './PluginDeleteModal';

type PluginData = {
  id: number;
  name: string;
  description: string;
  version: string;
  author?: string;
  downloads?: number;
  rating?: number;
};

interface MarketplaceAdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MarketplaceAdminPanel: React.FC<MarketplaceAdminPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);

  const [activeTab, setActiveTab] = useState<'overview' | 'plugins' | 'users' | 'settings'>(
    'overview'
  );
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<PluginData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { useMarketplacePlugins } = useMarketplaceQueries();
  const { data: plugins = [], isLoading, refetch } = useMarketplacePlugins();

  // Convert MarketplacePlugin to PluginData format
  const convertedPlugins: PluginData[] = plugins.map(plugin => ({
    id: plugin.id || plugin.plugin_id || 0,
    name: plugin.name || plugin.plugin_name || 'Unknown Plugin',
    description: plugin.description || 'No description available',
    version: plugin.version || '1.0.0',
    author: plugin.author || 'Unknown',
    downloads: plugin.downloads || 0,
    rating: plugin.ratingAverage || plugin.rating_average || 0,
  }));

  // Mock admin data - replace with real API calls
  const adminStats = {
    totalPlugins: convertedPlugins.length,
    pendingReviews: convertedPlugins.filter(p => p.rating && p.rating < 3).length, // Mock pending as low ratings
    totalDownloads: convertedPlugins.reduce((acc, p) => acc + (p.downloads || 0), 0),
    activeUsers: 1250,
  };

  const handleDeletePlugin = (plugin: PluginData) => {
    setSelectedPlugin(plugin);
    setDeleteModalOpen(true);
  };

  const handleDeleteSuccess = () => {
    refetch();
    setSelectedPlugin(null);
  };

  const filteredPlugins = convertedPlugins.filter((plugin: PluginData) => {
    if (!plugin || !plugin.name) return false;
    const matchesSearch =
      plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (plugin.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    // For now, treat all plugins as active since we don't have status field
    const matchesStatus = statusFilter === 'all' || statusFilter === 'active';
    return matchesSearch && matchesStatus;
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: HiChartBar },
    { id: 'plugins', label: 'Plugins', icon: HiCog6Tooth },
    { id: 'users', label: 'Users', icon: HiUsers },
    { id: 'settings', label: 'Settings', icon: HiShieldCheck },
  ];

  const renderOverview = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: 'Total Plugins',
            value: adminStats.totalPlugins,
            icon: HiCog6Tooth,
            color: 'blue',
          },
          {
            label: 'Pending Reviews',
            value: adminStats.pendingReviews,
            icon: HiDocumentText,
            color: 'orange',
          },
          {
            label: 'Total Downloads',
            value: adminStats.totalDownloads.toLocaleString(),
            icon: HiCloudArrowUp,
            color: 'green',
          },
          {
            label: 'Active Users',
            value: adminStats.activeUsers.toLocaleString(),
            icon: HiUsers,
            color: 'purple',
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="rounded-xl p-4"
            style={{
              background: isDark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.8)',
              border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: themeStyles.colors.text.secondary }}
                >
                  {stat.label}
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: themeStyles.colors.text.primary }}
                >
                  {stat.value}
                </p>
              </div>
              <div
                className="rounded-lg p-2"
                style={{
                  background: `${
                    stat.color === 'blue'
                      ? '#3b82f6'
                      : stat.color === 'orange'
                        ? '#f59e0b'
                        : stat.color === 'green'
                          ? '#10b981'
                          : '#8b5cf6'
                  }20`,
                }}
              >
                <stat.icon
                  className="h-6 w-6"
                  style={{
                    color:
                      stat.color === 'blue'
                        ? '#3b82f6'
                        : stat.color === 'orange'
                          ? '#f59e0b'
                          : stat.color === 'green'
                            ? '#10b981'
                            : '#8b5cf6',
                  }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div
        className="rounded-xl p-6"
        style={{
          background: isDark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.8)',
          border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
        }}
      >
        <h3
          className="mb-4 text-lg font-semibold"
          style={{ color: themeStyles.colors.text.primary }}
        >
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <motion.button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-3 rounded-lg p-4 transition-transform hover:scale-105"
            whileTap={{ scale: 0.95 }}
            style={{
              background: themeStyles.colors.brand.primary + '20',
              border: `1px solid ${themeStyles.colors.brand.primary}30`,
            }}
          >
            <HiPlus className="h-5 w-5" style={{ color: themeStyles.colors.brand.primary }} />
            <span className="font-medium" style={{ color: themeStyles.colors.brand.primary }}>
              Upload New Plugin
            </span>
          </motion.button>

          <motion.button
            onClick={() => setActiveTab('plugins')}
            className="flex items-center gap-3 rounded-lg p-4 transition-transform hover:scale-105"
            whileTap={{ scale: 0.95 }}
            style={{
              background: isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(249, 250, 251, 0.8)',
              border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
            }}
          >
            <HiEye className="h-5 w-5" style={{ color: themeStyles.colors.text.primary }} />
            <span className="font-medium" style={{ color: themeStyles.colors.text.primary }}>
              Review Plugins
            </span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );

  const renderPlugins = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Controls */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search plugins..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="rounded-lg px-4 py-2 transition-colors focus:outline-none focus:ring-2"
            style={{
              background: isDark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.8)',
              border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
              color: themeStyles.colors.text.primary,
            }}
          />

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="rounded-lg px-4 py-2 transition-colors focus:outline-none focus:ring-2"
            style={{
              background: isDark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.8)',
              border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
              color: themeStyles.colors.text.primary,
            }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <motion.button
          onClick={() => setUploadModalOpen(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 transition-transform hover:scale-105"
          whileTap={{ scale: 0.95 }}
          style={{
            background: themeStyles.colors.brand.primary,
            color: '#ffffff',
          }}
        >
          <HiPlus className="h-4 w-4" />
          Upload Plugin
        </motion.button>
      </div>

      {/* Plugins List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-8 text-center">
            <div
              className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-current"
              style={{ color: themeStyles.colors.brand.primary }}
            ></div>
            <p style={{ color: themeStyles.colors.text.secondary }}>Loading plugins...</p>
          </div>
        ) : filteredPlugins.length === 0 ? (
          <div className="py-8 text-center">
            <p style={{ color: themeStyles.colors.text.secondary }}>No plugins found.</p>
          </div>
        ) : (
          filteredPlugins.map((plugin: PluginData) => (
            <motion.div
              key={plugin.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-xl p-4"
              style={{
                background: isDark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold"
                      style={{
                        background: themeStyles.colors.brand.primary,
                        color: '#ffffff',
                      }}
                    >
                      {(plugin.name && plugin.name.charAt(0).toUpperCase()) || 'P'}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3
                        className="truncate font-semibold"
                        style={{ color: themeStyles.colors.text.primary }}
                      >
                        {plugin.name || 'Unnamed Plugin'}
                      </h3>
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        active
                      </span>
                    </div>
                    <p
                      className="truncate text-sm"
                      style={{ color: themeStyles.colors.text.secondary }}
                    >
                      {plugin.description}
                    </p>
                    <div className="mt-1 flex items-center gap-4">
                      <span
                        className="text-xs"
                        style={{ color: themeStyles.colors.text.secondary }}
                      >
                        v{plugin.version} • {plugin.author || 'Unknown'}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: themeStyles.colors.text.secondary }}
                      >
                        {plugin.downloads?.toLocaleString() || 0} downloads
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={() => handleDeletePlugin(plugin)}
                    className="rounded-lg p-2 transition-colors"
                    style={{
                      background: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                      color: isDark ? '#fca5a5' : '#dc2626',
                    }}
                    whileHover={{
                      background: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <HiTrash className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'plugins':
        return renderPlugins();
      case 'users':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-12 text-center"
          >
            <HiUsers
              className="mx-auto mb-4 h-16 w-16"
              style={{ color: themeStyles.colors.text.secondary }}
            />
            <h3
              className="mb-2 text-lg font-medium"
              style={{ color: themeStyles.colors.text.primary }}
            >
              User Management
            </h3>
            <p style={{ color: themeStyles.colors.text.secondary }}>
              User management features coming soon.
            </p>
          </motion.div>
        );
      case 'settings':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-12 text-center"
          >
            <HiShieldCheck
              className="mx-auto mb-4 h-16 w-16"
              style={{ color: themeStyles.colors.text.secondary }}
            />
            <h3
              className="mb-2 text-lg font-medium"
              style={{ color: themeStyles.colors.text.primary }}
            >
              Admin Settings
            </h3>
            <p style={{ color: themeStyles.colors.text.secondary }}>Settings panel coming soon.</p>
          </motion.div>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
          onClick={e => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="h-full w-full max-w-6xl overflow-hidden shadow-2xl"
            style={{
              background: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="flex h-full">
              {/* Sidebar */}
              <div
                className="w-64 border-r p-6"
                style={{
                  borderColor: isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)',
                  background: isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(249, 250, 251, 0.5)',
                }}
              >
                <div className="mb-8">
                  <h2
                    className="text-xl font-bold"
                    style={{ color: themeStyles.colors.text.primary }}
                  >
                    Admin Panel
                  </h2>
                  <p className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
                    Marketplace Management
                  </p>
                </div>

                <nav className="space-y-2">
                  {tabs.map(tab => (
                    <motion.button
                      key={tab.id}
                      onClick={() =>
                        setActiveTab(tab.id as 'overview' | 'plugins' | 'users' | 'settings')
                      }
                      className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-all"
                      whileTap={{ scale: 0.95 }}
                      style={{
                        background:
                          activeTab === tab.id
                            ? themeStyles.colors.brand.primary + '20'
                            : 'transparent',
                        color:
                          activeTab === tab.id
                            ? themeStyles.colors.brand.primary
                            : themeStyles.colors.text.secondary,
                      }}
                    >
                      <tab.icon className="h-5 w-5" />
                      <span className="font-medium">{tab.label}</span>
                    </motion.button>
                  ))}
                </nav>
              </div>

              {/* Main Content */}
              <div className="flex-1 overflow-auto">
                <div className="p-8">
                  <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Upload Modal */}
      <PluginUploadModal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} />

      {/* Delete Modal */}
      <PluginDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        plugin={selectedPlugin}
        onDeleteSuccess={handleDeleteSuccess}
      />
    </>
  );
};

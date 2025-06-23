/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  HiOutlinePuzzlePiece,
  HiOutlinePlay,
  HiOutlinePause,
  HiOutlineTrash,
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
}

export const PluginManager: React.FC = () => {
  const { t } = useTranslation();
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

  useEffect(() => {
    loadPluginData();
  }, []);

  const loadPluginData = async () => {
    try {
      setLoading(true);
      const pluginList = await pluginAPI.getPluginList();
      setAvailablePlugins(pluginList);
    } catch (error) {
      console.error('Failed to load plugin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnablePlugin = async (pluginName: string) => {
    try {
      await pluginAPI.enablePlugin(pluginName);
      const manifest = loadedPlugins.find(p => p.name === pluginName);
      if (manifest) {
        await loadPlugin(manifest);
      }
      await loadPluginData();
    } catch (error) {
      console.error('Failed to enable plugin:', error);
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
      // setInstallUrl('');
      setLocalPath('');
      setGithubUrl('');

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
    // For development purposes, let's show a dialog to manually enter the path
    // In a real electron app, you'd use the native file dialog
    const pathInput = prompt(
      'Enter the full path to your plugin directory:\n\nExample: /Users/aaayush/Desktop/OSS/ui2/backend/plugins/cluster-monitor/',
      localPath || '/Users/aaayush/Desktop/OSS/ui2/backend/plugins/cluster-monitor/'
    );

    if (pathInput && pathInput.trim()) {
      setLocalPath(pathInput.trim());
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

  const handleReloadPlugin = async (pluginName: string) => {
    try {
      await pluginAPI.reloadPlugin(pluginName);
      await loadPluginData();
    } catch (error) {
      console.error('Failed to reload plugin:', error);
    }
  };

  const filteredPlugins = availablePlugins.filter(
    plugin =>
      plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <HiOutlineCheckCircle className="text-green-500" />;
      case 'loading':
        return <HiOutlineArrowPath className="animate-spin text-blue-500" />;
      case 'error':
        return <HiOutlineExclamationTriangle className="text-red-500" />;
      default:
        return <HiOutlinePause className="text-gray-500" />;
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
                  onChange={e => setLocalPath(e.target.value)}
                  className="w-full rounded-lg border px-4 py-3 outline-none transition-colors"
                  style={{
                    background: themeStyles.colors.bg.secondary,
                    borderColor: themeStyles.card.borderColor,
                    color: themeStyles.colors.text.primary,
                  }}
                />
              </div>
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
              >
                <HiOutlineFolder className="h-4 w-4" />
                {t('plugins.install.browse')}
              </motion.button>
            </div>
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
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredPlugins.map((plugin, index) => (
                <motion.div
                  key={plugin.name}
                  className="rounded-xl p-6"
                  style={{
                    background: themeStyles.effects.glassMorphism.background,
                    border: `1px solid ${themeStyles.card.borderColor}`,
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  whileHover={{ y: -2 }}
                >
                  {/* Plugin Header */}
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="rounded-lg p-2"
                        style={{ background: themeStyles.colors.bg.secondary }}
                      >
                        <HiOutlinePuzzlePiece
                          className="h-5 w-5"
                          style={{ color: themeStyles.colors.brand.primary }}
                        />
                      </div>
                      <div>
                        <h4
                          className="font-semibold"
                          style={{ color: themeStyles.colors.text.primary }}
                        >
                          {plugin.name}
                        </h4>
                        <div className="flex items-center gap-2 text-sm">
                          <span style={{ color: themeStyles.colors.text.secondary }}>
                            {t('plugins.card.version', { version: plugin.version })}
                          </span>
                          <span style={{ color: themeStyles.colors.text.secondary }}>•</span>
                          <span style={{ color: themeStyles.colors.text.secondary }}>
                            {t('plugins.card.author', { author: plugin.author })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(plugin.status)}
                      <span
                        className="rounded-full px-2 py-1 text-xs font-medium"
                        style={{
                          background: plugin.enabled
                            ? themeStyles.colors.status.success + '20'
                            : themeStyles.colors.text.secondary + '20',
                          color: plugin.enabled
                            ? themeStyles.colors.status.success
                            : themeStyles.colors.text.secondary,
                        }}
                      >
                        {plugin.enabled
                          ? t('plugins.card.status.active')
                          : t('plugins.card.status.inactive')}
                      </span>
                    </div>
                  </div>

                  {/* Plugin Description */}
                  <p className="mb-4 text-sm" style={{ color: themeStyles.colors.text.secondary }}>
                    {plugin.description}
                  </p>

                  {/* Plugin Actions */}
                  <div className="flex flex-wrap gap-2">
                    {plugin.enabled ? (
                      <motion.button
                        onClick={() => setConfirmAction({ type: 'disable', plugin: plugin.name })}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                        style={{
                          background: themeStyles.colors.status.warning + '20',
                          color: themeStyles.colors.status.warning,
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <HiOutlinePause className="h-3 w-3" />
                        {t('plugins.card.actions.disable')}
                      </motion.button>
                    ) : (
                      <motion.button
                        onClick={() => handleEnablePlugin(plugin.name)}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                        style={{
                          background: themeStyles.colors.status.success + '20',
                          color: themeStyles.colors.status.success,
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <HiOutlinePlay className="h-3 w-3" />
                        {t('plugins.card.actions.enable')}
                      </motion.button>
                    )}

                    <motion.button
                      onClick={() => setSelectedPlugin(plugin.name)}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{
                        background: themeStyles.colors.brand.primary + '20',
                        color: themeStyles.colors.brand.primary,
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <HiOutlineInformationCircle className="h-3 w-3" />
                      {t('plugins.card.actions.details')}
                    </motion.button>

                    <motion.button
                      onClick={() => handleReloadPlugin(plugin.name)}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{
                        background: themeStyles.colors.text.secondary + '20',
                        color: themeStyles.colors.text.secondary,
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <HiOutlineArrowPath className="h-3 w-3" />
                      {t('plugins.card.actions.reload')}
                    </motion.button>

                    <motion.button
                      onClick={() => setConfirmAction({ type: 'uninstall', plugin: plugin.name })}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{
                        background: themeStyles.colors.status.error + '20',
                        color: themeStyles.colors.status.error,
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <HiOutlineTrash className="h-3 w-3" />
                      {t('plugins.card.actions.uninstall')}
                    </motion.button>
                  </div>
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

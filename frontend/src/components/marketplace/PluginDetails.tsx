import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  HiArrowLeft,
  HiStar,
  HiOutlineStar,
  HiOutlineArrowDownTray,
  HiOutlineCloudArrowDown,
  HiOutlineTrash,
  HiOutlinePlay,
  HiOutlinePause,
  HiOutlineArrowPath,
  HiOutlineInformationCircle,
  HiChatBubbleLeftEllipsis,
} from 'react-icons/hi2';
import useTheme from '../../stores/themeStore';
import getThemeStyles from '../../lib/theme-utils';
import { formatDistanceToNow } from 'date-fns';
import { PluginAPI } from '../../plugins/PluginAPI';
import toast from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';

interface PluginData {
  id: number;
  name: string;
  version: string;
  description: string;
  author: string;
  status?: 'active' | 'inactive' | 'loading' | 'error' | 'installed';
  enabled: boolean;
  loadTime?: Date;
  routes?: string[];
  category?: string;
  rating?: string;
  downloads?: number;
  lastUpdated: Date;
}

interface PluginDetailsProps {
  plugin: PluginData;
  onBack: () => void;
  pluginAPI: PluginAPI;
}

export const PluginDetails: React.FC<PluginDetailsProps> = ({ plugin, onBack, pluginAPI }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);

  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'feedback'>('overview');
  const [isInstalling, setIsInstalling] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [feedback, setFeedback] = useState({ rating: 0, comments: '' });
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  // Generate random pastel color for plugin icon background
  const getIconColor = (seed: string = '') => {
    // Generate a pastel color based on the plugin name
    const hash = (plugin.name + seed).split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    const h = Math.abs(hash) % 360;
    const s = isDark ? '60%' : '70%';
    const l = isDark ? '65%' : '80%';

    return `hsl(${h}, ${s}, ${l})`;
  };

  // Generate stars based on rating
  const rating = parseFloat(plugin.rating || '0');
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      stars.push(<HiStar key={i} className="text-yellow-400" />);
    } else if (i - 0.5 <= rating) {
      stars.push(<HiStar key={i} className="text-yellow-400" />);
    } else {
      stars.push(<HiOutlineStar key={i} className="text-gray-400" />);
    }
  }

  // Format download count
  const formatDownloads = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  // Format the last updated date
  const formatLastUpdated = (date: Date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  const handleInstall = async () => {
    try {
      setIsInstalling(true);
      // In a real app, this would be an actual installation process
      // For demo, we'll just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(`${plugin.name} installed successfully!`);
    } catch (error) {
      console.error('Failed to install plugin:', error);
      toast.error(`Failed to install ${plugin.name}`);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleUninstall = async () => {
    try {
      setIsUninstalling(true);
      await pluginAPI.uninstallPlugin(plugin.id);
      toast.success(`${plugin.name} uninstalled successfully!`);
      onBack(); // Return to marketplace after uninstall
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
      toast.error(`Failed to uninstall ${plugin.name}`);
    } finally {
      setIsUninstalling(false);
    }
  };

  const handleToggleEnable = async () => {
    if (plugin.enabled) {
      try {
        setIsDisabling(true);
        await pluginAPI.disablePlugin(plugin.id);
        plugin.enabled = false;
        toast.success(`${plugin.name} disabled successfully!`);
      } catch (error) {
        console.error('Failed to disable plugin:', error);
        toast.error(`Failed to disable ${plugin.name}`);
      } finally {
        setIsDisabling(false);
      }
    } else {
      try {
        setIsEnabling(true);
        await pluginAPI.enablePlugin(plugin.id);
        plugin.enabled = true;
        toast.success(`${plugin.name} enabled successfully!`);
      } catch (error) {
        console.error('Failed to enable plugin:', error);
        toast.error(`Failed to enable ${plugin.name}`);
      } finally {
        setIsEnabling(false);
      }
    }
  };

  const handleSubmitFeedback = async () => {
    try {
      await pluginAPI.submitPluginFeedback({
        pluginId: plugin.id,
        rating: feedback.rating,
        comments: feedback.comments,
      });
      toast.success('Thank you for your feedback!');
      setShowFeedbackForm(false);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error('Failed to submit feedback');
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      {/* Header */}
      <motion.div
        className="flex flex-col gap-2 p-6 pb-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.button
          onClick={onBack}
          className="mb-4 flex w-fit items-center gap-2 rounded-lg px-3 py-1.5 text-sm"
          whileHover={{
            scale: 1.03,
            x: -3,
            transition: { duration: 0.2 },
          }}
          whileTap={{ scale: 0.97 }}
          style={{
            color: themeStyles.colors.text.secondary,
            background: isDark ? 'rgba(31, 41, 55, 0.4)' : 'rgba(249, 250, 251, 0.7)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
          }}
        >
          <motion.div whileHover={{ x: -2 }} transition={{ type: 'spring', stiffness: 400 }}>
            <HiArrowLeft className="h-4 w-4" />
          </motion.div>
          {t('marketplace.backToMarketplace', 'Back to Marketplace')}
        </motion.button>

        <div className="flex flex-col gap-6 md:flex-row">
          <motion.div
            className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-xl md:w-48"
            whileHover={{ scale: 1.03 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            style={{
              background: `linear-gradient(135deg, ${getIconColor()}, ${getIconColor('alt')})`,
              boxShadow: `0 8px 20px ${isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`,
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
            }}
          >
            {/* Background decorative elements */}
            <motion.div
              className="absolute h-64 w-64 rounded-full opacity-20"
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 180],
                opacity: [0.1, 0.2, 0.1],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
              style={{
                background: `radial-gradient(circle, ${getIconColor('glow')} 0%, transparent 70%)`,
              }}
            />

            <motion.div
              whileHover={{ rotate: [0, -5, 5, -3, 3, 0] }}
              transition={{ duration: 0.5 }}
              className="z-10"
            >
              <span
                className="text-6xl font-bold"
                style={{ color: '#ffffff', textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)' }}
              >
                {plugin.name?.charAt(0).toUpperCase() || 'P'}
              </span>
            </motion.div>
          </motion.div>

          <div className="flex-grow">
            <div className="flex items-start justify-between">
              <div>
                <motion.h1
                  className="mb-1 text-2xl font-bold"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  style={{ color: themeStyles.colors.text.primary }}
                >
                  {plugin.name}
                </motion.h1>
                <motion.p
                  className="mb-2 text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  style={{ color: themeStyles.colors.text.secondary }}
                >
                  {t('marketplace.by', 'By')}{' '}
                  <span className="font-medium">{plugin.author || 'Unknown author'}</span>
                </motion.p>

                <motion.div
                  className="mb-4 flex flex-wrap items-center gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  <motion.div className="flex items-center" whileHover={{ scale: 1.05 }}>
                    <div className="mr-2 flex">{stars}</div>
                    <span className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
                      {plugin.rating || '0.0'}
                    </span>
                  </motion.div>

                  <motion.div
                    className="flex items-center text-sm"
                    whileHover={{ scale: 1.05 }}
                    style={{ color: themeStyles.colors.text.secondary }}
                  >
                    <HiOutlineArrowDownTray className="mr-1" />
                    {formatDownloads(plugin.downloads || 0)}{' '}
                    {t('marketplace.downloads', 'downloads')}
                  </motion.div>

                  <motion.div
                    className="text-sm"
                    whileHover={{ scale: 1.05 }}
                    style={{ color: themeStyles.colors.text.secondary }}
                  >
                    {t('marketplace.version', 'Version')}{' '}
                    <span className="font-medium">{plugin.version || '1.0.0'}</span>
                  </motion.div>

                  <motion.div
                    className="rounded-full px-3 py-1.5 text-xs"
                    whileHover={{ scale: 1.05 }}
                    style={{
                      background: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                      color: themeStyles.colors.brand.primary,
                      border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'}`,
                    }}
                  >
                    {plugin.category || 'Misc'}
                  </motion.div>
                </motion.div>
              </div>

              <div className="flex gap-2">
                {plugin.status === 'installed' ? (
                  <>
                    <motion.button
                      onClick={handleToggleEnable}
                      disabled={isEnabling || isDisabling}
                      className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        background: isDark ? 'rgba(31, 41, 55, 0.6)' : 'rgba(249, 250, 251, 0.8)',
                        backdropFilter: 'blur(8px)',
                        color: themeStyles.colors.text.primary,
                        border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
                        opacity: isEnabling || isDisabling ? 0.7 : 1,
                      }}
                    >
                      {isEnabling || isDisabling ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <HiOutlineArrowPath className="h-4 w-4" />
                        </motion.div>
                      ) : plugin.enabled ? (
                        <HiOutlinePause className="h-4 w-4" />
                      ) : (
                        <HiOutlinePlay className="h-4 w-4" />
                      )}
                      {plugin.enabled
                        ? t('marketplace.disable', 'Disable')
                        : t('marketplace.enable', 'Enable')}
                    </motion.button>

                    <motion.button
                      onClick={handleUninstall}
                      disabled={isUninstalling}
                      className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        background: `linear-gradient(135deg, ${themeStyles.colors.status.error}, ${isDark ? '#b91c1c' : '#ef4444'})`,
                        color: '#ffffff',
                        boxShadow: '0 4px 6px rgba(239, 68, 68, 0.25)',
                        opacity: isUninstalling ? 0.7 : 1,
                      }}
                    >
                      {isUninstalling ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <HiOutlineArrowPath className="h-4 w-4" />
                        </motion.div>
                      ) : (
                        <HiOutlineTrash className="h-4 w-4" />
                      )}
                      {t('marketplace.uninstall', 'Uninstall')}
                    </motion.button>
                  </>
                ) : (
                  <motion.button
                    onClick={handleInstall}
                    disabled={isInstalling}
                    className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      background: `linear-gradient(135deg, ${themeStyles.colors.brand.primary}, ${themeStyles.colors.brand.primaryDark})`,
                      color: '#ffffff',
                      boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)',
                      opacity: isInstalling ? 0.7 : 1,
                    }}
                  >
                    {isInstalling ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <HiOutlineArrowPath className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <HiOutlineCloudArrowDown className="h-4 w-4" />
                    )}
                    {t('marketplace.install', 'Install')}
                  </motion.button>
                )}
              </div>
            </div>

            <div
              className="mb-4 border-b"
              style={{ borderColor: themeStyles.card.borderColor }}
            ></div>

            <div className="mb-4 flex gap-4">
              <motion.button
                onClick={() => setActiveTab('overview')}
                className={`relative px-4 py-2 text-sm font-medium`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  color:
                    activeTab === 'overview'
                      ? themeStyles.colors.brand.primary
                      : themeStyles.colors.text.secondary,
                }}
              >
                {t('marketplace.overview', 'Overview')}
                {activeTab === 'overview' && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    layoutId="activeTab"
                    style={{ background: themeStyles.colors.brand.primary }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </motion.button>
              <motion.button
                onClick={() => setActiveTab('details')}
                className={`relative px-4 py-2 text-sm font-medium`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  color:
                    activeTab === 'details'
                      ? themeStyles.colors.brand.primary
                      : themeStyles.colors.text.secondary,
                }}
              >
                {t('marketplace.details', 'Details')}
                {activeTab === 'details' && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    layoutId="activeTab"
                    style={{ background: themeStyles.colors.brand.primary }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </motion.button>
              <motion.button
                onClick={() => setActiveTab('feedback')}
                className={`relative px-4 py-2 text-sm font-medium`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  color:
                    activeTab === 'feedback'
                      ? themeStyles.colors.brand.primary
                      : themeStyles.colors.text.secondary,
                }}
              >
                {t('marketplace.feedback', 'Feedback')}
                {activeTab === 'feedback' && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    layoutId="activeTab"
                    style={{ background: themeStyles.colors.brand.primary }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-grow overflow-y-auto p-6 pt-0">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <h2
                  className="mb-3 text-xl font-semibold"
                  style={{ color: themeStyles.colors.text.primary }}
                >
                  {t('marketplace.description', 'Description')}
                </h2>
                <p style={{ color: themeStyles.colors.text.secondary }}>
                  {plugin.description || 'No description available for this plugin.'}
                </p>
              </div>

              <div>
                <h2
                  className="mb-3 text-xl font-semibold"
                  style={{ color: themeStyles.colors.text.primary }}
                >
                  {t('marketplace.keyFeatures', 'Key Features')}
                </h2>
                <ul
                  className="list-disc space-y-2 pl-5"
                  style={{ color: themeStyles.colors.text.secondary }}
                >
                  <motion.li
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    Enhanced KubeStellar functionality
                  </motion.li>
                  <motion.li
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    Seamless integration with existing workflows
                  </motion.li>
                  <motion.li
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    Performance optimizations
                  </motion.li>
                  <motion.li
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Advanced configuration options
                  </motion.li>
                  <motion.li
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    Comprehensive documentation
                  </motion.li>
                </ul>
              </div>

              <div>
                <h2
                  className="mb-3 text-xl font-semibold"
                  style={{ color: themeStyles.colors.text.primary }}
                >
                  {t('marketplace.screenshots', 'Screenshots')}
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <motion.div
                    className="flex aspect-video items-center justify-center rounded-lg"
                    whileHover={{ scale: 1.02 }}
                    style={{
                      background: isDark ? 'rgba(31, 41, 55, 0.4)' : 'rgba(249, 250, 251, 0.7)',
                      backdropFilter: 'blur(8px)',
                      border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
                    }}
                  >
                    <HiOutlineInformationCircle
                      className="h-8 w-8"
                      style={{ color: themeStyles.colors.text.secondary }}
                    />
                    <span className="ml-2" style={{ color: themeStyles.colors.text.secondary }}>
                      {t('marketplace.noScreenshots', 'No screenshots available')}
                    </span>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <h2
                  className="mb-4 text-xl font-semibold"
                  style={{ color: themeStyles.colors.text.primary }}
                >
                  {t('marketplace.technicalDetails', 'Technical Details')}
                </h2>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-xl p-5"
                    style={{
                      background: isDark ? 'rgba(31, 41, 55, 0.4)' : 'rgba(249, 250, 251, 0.7)',
                      backdropFilter: 'blur(8px)',
                      border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
                    }}
                  >
                    <h3
                      className="text-md mb-3 font-medium"
                      style={{ color: themeStyles.colors.text.primary }}
                    >
                      {t('marketplace.generalInfo', 'General Information')}
                    </h3>
                    <table className="w-full" style={{ color: themeStyles.colors.text.secondary }}>
                      <tbody>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <td className="py-1.5 pr-4 font-medium">
                            {t('marketplace.version', 'Version')}:
                          </td>
                          <td className="py-1.5">{plugin.version || '1.0.0'}</td>
                        </motion.tr>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          <td className="py-1.5 pr-4 font-medium">
                            {t('marketplace.lastUpdated', 'Last Updated')}:
                          </td>
                          <td className="py-1.5">{formatLastUpdated(plugin.lastUpdated)}</td>
                        </motion.tr>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                        >
                          <td className="py-1.5 pr-4 font-medium">
                            {t('marketplace.author', 'Author')}:
                          </td>
                          <td className="py-1.5">{plugin.author || 'Unknown'}</td>
                        </motion.tr>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 }}
                        >
                          <td className="py-1.5 pr-4 font-medium">
                            {t('marketplace.license', 'License')}:
                          </td>
                          <td className="py-1.5">MIT</td>
                        </motion.tr>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.6 }}
                        >
                          <td className="py-1.5 pr-4 font-medium">
                            {t('marketplace.category', 'Category')}:
                          </td>
                          <td className="py-1.5">{plugin.category || 'Misc'}</td>
                        </motion.tr>
                      </tbody>
                    </table>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-xl p-5"
                    style={{
                      background: isDark ? 'rgba(31, 41, 55, 0.4)' : 'rgba(249, 250, 251, 0.7)',
                      backdropFilter: 'blur(8px)',
                      border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
                    }}
                  >
                    <h3
                      className="text-md mb-3 font-medium"
                      style={{ color: themeStyles.colors.text.primary }}
                    >
                      {t('marketplace.requirements', 'Requirements')}
                    </h3>
                    <table className="w-full" style={{ color: themeStyles.colors.text.secondary }}>
                      <tbody>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          <td className="py-1.5 pr-4 font-medium">
                            {t('marketplace.kubestellarVersion', 'KubeStellar Version')}:
                          </td>
                          <td className="py-1.5">1.0.0 or higher</td>
                        </motion.tr>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                        >
                          <td className="py-1.5 pr-4 font-medium">
                            {t('marketplace.dependencies', 'Dependencies')}:
                          </td>
                          <td className="py-1.5">None</td>
                        </motion.tr>
                      </tbody>
                    </table>
                  </motion.div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2
                  className="mb-4 text-xl font-semibold"
                  style={{ color: themeStyles.colors.text.primary }}
                >
                  {t('marketplace.changeLog', 'Change Log')}
                </h2>
                <motion.div
                  className="rounded-xl p-5"
                  whileHover={{ scale: 1.01 }}
                  style={{
                    background: isDark ? 'rgba(31, 41, 55, 0.4)' : 'rgba(249, 250, 251, 0.7)',
                    backdropFilter: 'blur(8px)',
                    border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h3
                        className="text-md font-medium"
                        style={{ color: themeStyles.colors.text.primary }}
                      >
                        v{plugin.version || '1.0.0'}
                      </h3>
                      <motion.span
                        className="rounded-full px-3 py-1 text-xs"
                        style={{
                          background: isDark
                            ? 'rgba(59, 130, 246, 0.15)'
                            : 'rgba(59, 130, 246, 0.1)',
                          color: themeStyles.colors.brand.primary,
                        }}
                      >
                        {formatLastUpdated(plugin.lastUpdated)}
                      </motion.span>
                    </div>
                    <ul
                      className="mt-3 list-disc space-y-1 pl-5"
                      style={{ color: themeStyles.colors.text.secondary }}
                    >
                      <motion.li
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        Initial release
                      </motion.li>
                      <motion.li
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        Core functionality implemented
                      </motion.li>
                      <motion.li
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                      >
                        Bug fixes and performance improvements
                      </motion.li>
                    </ul>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'feedback' && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2
                    className="text-xl font-semibold"
                    style={{ color: themeStyles.colors.text.primary }}
                  >
                    {t('marketplace.userFeedback', 'User Feedback')}
                  </h2>

                  {!showFeedbackForm && (
                    <motion.button
                      onClick={() => setShowFeedbackForm(true)}
                      className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        background: `linear-gradient(135deg, ${themeStyles.colors.brand.primary}, ${themeStyles.colors.brand.primaryDark})`,
                        color: '#ffffff',
                        boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)',
                      }}
                    >
                      <HiChatBubbleLeftEllipsis className="h-4 w-4" />
                      {t('marketplace.leaveFeedback', 'Leave Feedback')}
                    </motion.button>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {showFeedbackForm ? (
                    <motion.div
                      className="mb-4 rounded-xl p-6"
                      initial={{ opacity: 0, y: 20, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -20, height: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      style={{
                        background: isDark ? 'rgba(31, 41, 55, 0.4)' : 'rgba(249, 250, 251, 0.7)',
                        backdropFilter: 'blur(8px)',
                        border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      <h3
                        className="mb-4 text-lg font-medium"
                        style={{ color: themeStyles.colors.text.primary }}
                      >
                        {t('marketplace.yourFeedback', 'Your Feedback')}
                      </h3>

                      <div className="mb-5">
                        <label
                          className="mb-2 block text-sm font-medium"
                          style={{ color: themeStyles.colors.text.secondary }}
                        >
                          {t('marketplace.rating', 'Rating')}
                        </label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map(star => (
                            <motion.button
                              key={star}
                              onClick={() => setFeedback({ ...feedback, rating: star })}
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.9 }}
                              className="text-2xl"
                            >
                              {star <= feedback.rating ? (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: 'spring', stiffness: 500 }}
                                >
                                  <HiStar className="text-yellow-400" />
                                </motion.div>
                              ) : (
                                <HiOutlineStar className="text-gray-400" />
                              )}
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      <div className="mb-5">
                        <label
                          className="mb-2 block text-sm font-medium"
                          style={{ color: themeStyles.colors.text.secondary }}
                        >
                          {t('marketplace.comments', 'Comments')}
                        </label>
                        <motion.textarea
                          value={feedback.comments}
                          onChange={e => setFeedback({ ...feedback, comments: e.target.value })}
                          rows={4}
                          className="w-full rounded-lg px-4 py-3"
                          whileFocus={{ scale: 1.01 }}
                          style={{
                            background: isDark
                              ? 'rgba(17, 24, 39, 0.6)'
                              : 'rgba(255, 255, 255, 0.7)',
                            backdropFilter: 'blur(8px)',
                            border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(226, 232, 240, 0.8)'}`,
                            color: themeStyles.colors.text.primary,
                          }}
                          placeholder={t(
                            'marketplace.commentsPlaceholder',
                            'Share your experience with this plugin...'
                          )}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <motion.button
                          onClick={() => setShowFeedbackForm(false)}
                          className="rounded-lg px-4 py-2 text-sm"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            background: isDark
                              ? 'rgba(31, 41, 55, 0.6)'
                              : 'rgba(249, 250, 251, 0.8)',
                            backdropFilter: 'blur(8px)',
                            color: themeStyles.colors.text.primary,
                            border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
                          }}
                        >
                          {t('common.cancel', 'Cancel')}
                        </motion.button>

                        <motion.button
                          onClick={handleSubmitFeedback}
                          className="rounded-lg px-4 py-2 text-sm"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            background: `linear-gradient(135deg, ${themeStyles.colors.brand.primary}, ${themeStyles.colors.brand.primaryDark})`,
                            color: '#ffffff',
                            boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)',
                          }}
                        >
                          {t('common.submit', 'Submit')}
                        </motion.button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      className="rounded-xl py-12 text-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        background: isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(249, 250, 251, 0.5)',
                        backdropFilter: 'blur(8px)',
                        border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.2)' : 'rgba(226, 232, 240, 0.5)'}`,
                        color: themeStyles.colors.text.secondary,
                      }}
                    >
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mb-4 flex justify-center"
                      >
                        <HiChatBubbleLeftEllipsis className="h-12 w-12 opacity-60" />
                      </motion.div>
                      <p className="text-lg">
                        {t(
                          'marketplace.noFeedbackYet',
                          'No feedback yet. Be the first to leave a review!'
                        )}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

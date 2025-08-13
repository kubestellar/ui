import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  HiArrowLeft,
  HiOutlineArrowDownTray,
  HiOutlineCloudArrowDown,
  HiOutlineTrash,
  HiOutlinePlay,
  HiOutlinePause,
  HiOutlineArrowPath,
  HiChatBubbleLeftEllipsis,
  HiOutlineCheckCircle,
  HiOutlineShieldCheck,
  HiOutlineDocumentText,
  HiCodeBracket,
  HiCheckCircle,
  HiOutlineGlobeAlt,
  HiOutlineCog,
  HiOutlineCalendar,
  HiOutlineExclamationCircle,
} from 'react-icons/hi2';
import { Circle } from 'lucide-react';
import useTheme from '../../stores/themeStore';
import getThemeStyles from '../../lib/theme-utils';
import { formatDistanceToNow, format } from 'date-fns';
import { PluginAPI } from '../../plugins/PluginAPI';
import toast from 'react-hot-toast';
import { useMarketplaceQueries } from '../../hooks/queries/useMarketplaceQueries';
import PluginDocumentation from './PluginDocumentation';
import logo from '../../assets/logo.svg';

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
  createdAt?: Date;
  license?: string;
  tags?: string[];
}

interface EnhancedPluginDetailsProps {
  plugin: PluginData;
  onBack: () => void;
  pluginAPI: PluginAPI;
}

export const EnhancedPluginDetails: React.FC<EnhancedPluginDetailsProps> = ({
  plugin,
  onBack,
  pluginAPI,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);

  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'feedback' | 'docs'>(
    'overview'
  );
  const [isEnabling, setIsEnabling] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [feedback, setFeedback] = useState({ rating: 0, comments: '' });
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);

  // Initialize marketplace hooks
  const {
    useInstallPlugin,
    useDeletePlugin,
    useSubmitFeedback,
    usePluginReviews,
    usePluginDependencies,
  } = useMarketplaceQueries();

  const installMutation = useInstallPlugin();
  const deleteMutation = useDeletePlugin();
  const submitFeedbackMutation = useSubmitFeedback();

  // Fetch plugin reviews
  const { data: reviews = [], isLoading: reviewsLoading } = usePluginReviews(plugin.id);

  // Fetch plugin dependencies
  const { data: dependencies = [], isLoading: dependenciesLoading } = usePluginDependencies(
    plugin.id
  );

  // Add scroll listener to detect scroll for header effects
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = document.getElementById('plugin-detail-scroll')?.scrollTop || 0;
      setScrolled(scrollPosition > 50);
    };

    const scrollContainer = document.getElementById('plugin-detail-scroll');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

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

  // Generate rating display with KubeStellar logo
  const rating = parseFloat(plugin.rating || '0');
  const ratingDisplay = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      ratingDisplay.push(
        <div key={i} className="h-5 w-5">
          <div
            className="h-5 w-5 bg-contain bg-center bg-no-repeat"
            style={{
              WebkitMaskRepeat: 'no-repeat',
              WebkitMaskSize: 'cover',
              backgroundImage: `url(${logo})`,
            }}
          />
        </div>
      );
    } else if (i - 0.5 <= rating) {
      ratingDisplay.push(
        <div key={i} className="h-5 w-5">
          <div
            className="h-5 w-5 bg-contain bg-center bg-no-repeat opacity-60"
            style={{
              WebkitMaskRepeat: 'no-repeat',
              WebkitMaskSize: 'cover',
              backgroundImage: `url(${logo})`,
            }}
          />
        </div>
      );
    } else {
      ratingDisplay.push(
        <div key={i} className="h-5 w-5">
          <Circle
            className="h-5 w-5 transition-colors duration-200"
            style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
          />
        </div>
      );
    }
  }

  // Format download count
  const formatDownloads = (count: number = 0) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
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

  const handleInstall = () => {
    toast.promise(
      new Promise((resolve, reject) => {
        installMutation.mutate(plugin.id, {
          onSuccess: () => resolve('success'),
          onError: error => reject(error),
        });
      }),
      {
        loading: `Installing ${plugin.name}...`,
        success: `${plugin.name} installed successfully!`,
        error: `Failed to install ${plugin.name}`,
      }
    );
  };

  const handleUninstall = () => {
    toast.promise(
      new Promise((resolve, reject) => {
        deleteMutation.mutate(plugin.id, {
          onSuccess: () => {
            resolve('success');
            onBack(); // Return to marketplace after uninstall
          },
          onError: error => reject(error),
        });
      }),
      {
        loading: `Uninstalling ${plugin.name}...`,
        success: `${plugin.name} uninstalled successfully!`,
        error: `Failed to uninstall ${plugin.name}`,
      }
    );
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

  const handleSubmitFeedback = () => {
    if (feedback.rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (!feedback.comments.trim()) {
      toast.error('Please provide some comments');
      return;
    }

    toast.promise(
      new Promise((resolve, reject) => {
        submitFeedbackMutation.mutate(
          {
            pluginId: plugin.id,
            feedback: {
              plugin_id: plugin.id,
              user_id: 1, // This should come from auth context
              rating: feedback.rating,
              comment: feedback.comments,
              suggestions: '', // Optional field
            },
          },
          {
            onSuccess: () => {
              setShowFeedbackForm(false);
              setFeedback({ rating: 0, comments: '' });
              resolve('success');
            },
            onError: error => reject(error),
          }
        );
      }),
      {
        loading: 'Submitting feedback...',
        success: 'Thank you for your feedback!',
        error: 'Failed to submit feedback',
      }
    );
  };

  return (
    <div className="flex h-full w-full flex-col">
      {/* Header with parallax effect */}
      <motion.div
        className={`sticky top-0 z-20 flex flex-col gap-2 bg-opacity-80 px-6 pb-2 pt-6 backdrop-blur-lg transition-all duration-300 ${
          scrolled ? 'shadow-md' : ''
        }`}
        style={{
          background: isDark ? 'rgba(17, 24, 39, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          height: scrolled ? '80px' : 'auto',
        }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex w-full items-center justify-between">
          <motion.button
            onClick={onBack}
            className="flex w-fit items-center gap-2 rounded-lg px-3 py-1.5 text-sm"
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
            {!scrolled && t('marketplace.backToMarketplace', 'Back to Marketplace')}
          </motion.button>

          <AnimatePresence>
            {scrolled && (
              <motion.div
                className="flex items-center"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div
                  className="mr-3 flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{
                    background: `linear-gradient(135deg, ${getIconColor()}, ${getIconColor('alt')})`,
                    boxShadow: `0 4px 10px rgba(0, 0, 0, 0.1), 0 0 15px ${getIconColor('glow')}30`,
                  }}
                >
                  <span
                    className="text-lg font-bold"
                    style={{ color: '#ffffff', textShadow: '0 1px 3px rgba(0, 0, 0, 0.2)' }}
                  >
                    {plugin.name?.charAt(0).toUpperCase() || 'P'}
                  </span>
                </div>
                <div>
                  <h1
                    className="text-lg font-semibold"
                    style={{ color: themeStyles.colors.text.primary }}
                  >
                    {plugin.name}
                  </h1>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    background: `linear-gradient(135deg, ${themeStyles.colors.status.error}, ${isDark ? '#b91c1c' : '#ef4444'})`,
                    color: '#ffffff',
                    boxShadow: '0 4px 6px rgba(239, 68, 68, 0.25)',
                    opacity: deleteMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {deleteMutation.isPending ? (
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
                disabled={installMutation.isPending}
                className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  background: `linear-gradient(135deg, ${themeStyles.colors.brand.primary}, ${themeStyles.colors.brand.primaryDark})`,
                  color: '#ffffff',
                  boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)',
                  opacity: installMutation.isPending ? 0.7 : 1,
                }}
              >
                {installMutation.isPending ? (
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

        {!scrolled && (
          <>
            <div className="mt-6 flex flex-col gap-8 md:flex-row">
              {/* Enhanced Plugin Icon */}
              <motion.div
                className="relative flex h-56 w-full items-center justify-center overflow-hidden rounded-2xl md:w-56"
                whileHover={{ scale: 1.05, rotate: [0, -2, 2, 0] }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                style={{
                  background: `linear-gradient(135deg, ${getIconColor()}, ${getIconColor('alt')}, ${getIconColor('glow')})`,
                  boxShadow: `0 12px 32px ${isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.15)'}, 0 0 20px ${getIconColor('glow')}40`,
                  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
                }}
              >
                {/* Enhanced background decorative elements */}
                <motion.div
                  className="absolute h-80 w-80 rounded-full opacity-30"
                  animate={{
                    scale: [1, 1.3, 1],
                    rotate: [0, 180, 360],
                    opacity: [0.2, 0.4, 0.2],
                  }}
                  transition={{
                    duration: 12,
                    repeat: Infinity,
                    repeatType: 'reverse',
                  }}
                  style={{
                    background: `radial-gradient(circle, ${getIconColor('glow')} 0%, transparent 70%)`,
                    filter: 'blur(20px)',
                  }}
                />

                <motion.div
                  className="absolute h-64 w-64 rounded-full opacity-20"
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [360, 0],
                    opacity: [0.1, 0.3, 0.1],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    delay: 2,
                  }}
                  style={{
                    background: `radial-gradient(circle, ${getIconColor('alt')} 0%, transparent 70%)`,
                    filter: 'blur(15px)',
                  }}
                />

                <motion.div
                  whileHover={{
                    scale: 1.1,
                    rotate: [0, -8, 8, -4, 4, 0],
                    transition: { duration: 0.8 },
                  }}
                  className="relative z-10"
                >
                  <span
                    className="text-7xl font-bold drop-shadow-2xl"
                    style={{
                      color: '#ffffff',
                      textShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                      filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.2))',
                    }}
                  >
                    {plugin.name?.charAt(0).toUpperCase() || 'P'}
                  </span>

                  {/* Floating particles effect */}
                  <motion.div
                    className="absolute -right-2 -top-2 h-3 w-3 rounded-full bg-white/60"
                    animate={{
                      y: [0, -10, 0],
                      opacity: [0.6, 1, 0.6],
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      repeatType: 'reverse',
                    }}
                  />
                  <motion.div
                    className="absolute -bottom-2 -left-2 h-2 w-2 rounded-full bg-white/40"
                    animate={{
                      y: [0, 8, 0],
                      opacity: [0.4, 0.8, 0.4],
                      scale: [1, 0.8, 1],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      repeatType: 'reverse',
                      delay: 1,
                    }}
                  />
                </motion.div>

                {/* Enhanced shine effect */}
                <motion.div
                  className="absolute inset-0 opacity-40"
                  animate={{
                    background: [
                      'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)',
                      'linear-gradient(45deg, transparent 70%, rgba(255,255,255,0.6) 90%, transparent 110%)',
                    ],
                    left: ['-100%', '100%'],
                  }}
                  transition={{ duration: 4, repeat: Infinity, repeatDelay: 6 }}
                />

                {/* Status indicator overlay */}
                {plugin.status === 'installed' && (
                  <motion.div
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-green-400 to-green-500 shadow-lg"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 500 }}
                    whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
                  >
                    <HiOutlineCheckCircle className="h-5 w-5 text-white" />
                  </motion.div>
                )}
              </motion.div>

              <div className="flex-grow space-y-6">
                {/* Enhanced Plugin Header */}
                <div className="space-y-4">
                  <motion.h1
                    className="text-3xl font-bold tracking-tight"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    style={{ color: themeStyles.colors.text.primary }}
                  >
                    {plugin.name}
                  </motion.h1>

                  <motion.div
                    className="flex items-center space-x-4"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                  >
                    <div className="flex items-center space-x-2">
                      <span
                        className="text-sm"
                        style={{ color: themeStyles.colors.text.secondary }}
                      >
                        {t('marketplace.by', 'By')}
                      </span>
                      <span
                        className="rounded-lg px-3 py-1.5 font-semibold"
                        style={{
                          background: isDark
                            ? 'rgba(59, 130, 246, 0.15)'
                            : 'rgba(59, 130, 246, 0.1)',
                          color: themeStyles.colors.brand.primary,
                          border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'}`,
                        }}
                      >
                        {plugin.author || 'Unknown author'}
                      </span>
                    </div>

                    {plugin.category && (
                      <motion.div
                        className="rounded-full px-3 py-1.5 text-xs font-bold tracking-wide"
                        style={{
                          background: `linear-gradient(135deg, ${isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.15)'}, ${isDark ? 'rgba(124, 58, 237, 0.15)' : 'rgba(124, 58, 237, 0.1)'})`,
                          color: '#8b5cf6',
                          border: `1px solid ${isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)'}`,
                        }}
                        whileHover={{ scale: 1.05, y: -1 }}
                      >
                        {plugin.category}
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Enhanced Description */}
                  <motion.p
                    className="max-w-3xl text-lg leading-relaxed"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    style={{ color: themeStyles.colors.text.secondary }}
                  >
                    {plugin.description || 'No description available'}
                  </motion.p>
                </div>

                {/* Enhanced Metrics Grid */}
                <motion.div
                  className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                >
                  {/* Rating Card */}
                  <motion.div
                    className="flex items-center rounded-xl px-4 py-3"
                    style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'}`,
                      backdropFilter: 'blur(8px)',
                    }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mr-3 flex gap-1">{ratingDisplay}</div>
                    <div className="flex flex-col">
                      <span
                        className="text-lg font-bold"
                        style={{ color: themeStyles.colors.brand.primary }}
                      >
                        {plugin.rating || '0.0'}
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{ color: themeStyles.colors.text.tertiary }}
                      >
                        {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </motion.div>

                  {/* Downloads Card */}
                  <motion.div
                    className="flex items-center rounded-xl px-4 py-3"
                    style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'}`,
                      backdropFilter: 'blur(8px)',
                    }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <HiOutlineArrowDownTray
                      className="mr-3 h-6 w-6"
                      style={{ color: themeStyles.colors.brand.primary }}
                    />
                    <div className="flex flex-col">
                      <span
                        className="text-lg font-bold"
                        style={{ color: themeStyles.colors.text.primary }}
                      >
                        {formatDownloads(plugin.downloads || 0)}
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{ color: themeStyles.colors.text.tertiary }}
                      >
                        downloads
                      </span>
                    </div>
                  </motion.div>

                  {/* Version Card */}
                  <motion.div
                    className="flex items-center rounded-xl px-4 py-3"
                    style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'}`,
                      backdropFilter: 'blur(8px)',
                    }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <HiOutlineCog
                      className="mr-3 h-6 w-6"
                      style={{ color: themeStyles.colors.brand.primary }}
                    />
                    <div className="flex flex-col">
                      <span
                        className="text-lg font-bold"
                        style={{ color: themeStyles.colors.text.primary }}
                      >
                        v{plugin.version || '1.0.0'}
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{ color: themeStyles.colors.text.tertiary }}
                      >
                        version
                      </span>
                    </div>
                  </motion.div>

                  {/* Last Updated Card */}
                  <motion.div
                    className="flex items-center rounded-xl px-4 py-3"
                    style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'}`,
                      backdropFilter: 'blur(8px)',
                    }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <HiOutlineCalendar
                      className="mr-3 h-6 w-6"
                      style={{ color: themeStyles.colors.brand.primary }}
                    />
                    <div className="flex flex-col">
                      <span
                        className="text-lg font-bold"
                        style={{ color: themeStyles.colors.text.primary }}
                      >
                        {formatLastUpdated(plugin.lastUpdated)}
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{ color: themeStyles.colors.text.tertiary }}
                      >
                        updated
                      </span>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Additional Technical Details */}
                {(plugin.license || plugin.createdAt || plugin.routes || plugin.tags) && (
                  <motion.div
                    className="space-y-4"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                  >
                    <h3
                      className="text-lg font-semibold"
                      style={{ color: themeStyles.colors.text.primary }}
                    >
                      Technical Details
                    </h3>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {plugin.license && (
                        <motion.div
                          className="flex items-center space-x-3 rounded-xl px-4 py-3"
                          style={{
                            background: isDark
                              ? 'rgba(255, 255, 255, 0.05)'
                              : 'rgba(0, 0, 0, 0.03)',
                            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'}`,
                          }}
                          whileHover={{ scale: 1.02, y: -1 }}
                        >
                          <div className="h-3 w-3 rounded-full bg-blue-400"></div>
                          <div>
                            <span
                              className="text-sm font-medium"
                              style={{ color: themeStyles.colors.text.primary }}
                            >
                              License:
                            </span>
                            <span
                              className="ml-2 text-sm"
                              style={{ color: themeStyles.colors.text.secondary }}
                            >
                              {plugin.license}
                            </span>
                          </div>
                        </motion.div>
                      )}

                      {plugin.createdAt && (
                        <motion.div
                          className="flex items-center space-x-3 rounded-xl px-4 py-3"
                          style={{
                            background: isDark
                              ? 'rgba(255, 255, 255, 0.05)'
                              : 'rgba(0, 0, 0, 0.03)',
                            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'}`,
                          }}
                          whileHover={{ scale: 1.02, y: -1 }}
                        >
                          <div className="h-3 w-3 rounded-full bg-purple-400"></div>
                          <div>
                            <span
                              className="text-sm font-medium"
                              style={{ color: themeStyles.colors.text.primary }}
                            >
                              Created:
                            </span>
                            <span
                              className="ml-2 text-sm"
                              style={{ color: themeStyles.colors.text.secondary }}
                            >
                              {formatDistanceToNow(new Date(plugin.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </motion.div>
                      )}

                      {plugin.routes && plugin.routes.length > 0 && (
                        <motion.div
                          className="flex items-center space-x-3 rounded-xl px-4 py-3"
                          style={{
                            background: isDark
                              ? 'rgba(255, 255, 255, 0.05)'
                              : 'rgba(0, 0, 0, 0.03)',
                            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'}`,
                          }}
                          whileHover={{ scale: 1.02, y: -1 }}
                        >
                          <div className="h-3 w-3 rounded-full bg-green-400"></div>
                          <div>
                            <span
                              className="text-sm font-medium"
                              style={{ color: themeStyles.colors.text.primary }}
                            >
                              Routes:
                            </span>
                            <span
                              className="ml-2 text-sm"
                              style={{ color: themeStyles.colors.text.secondary }}
                            >
                              {plugin.routes.length} endpoint{plugin.routes.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </motion.div>
                      )}

                      {plugin.loadTime && (
                        <motion.div
                          className="flex items-center space-x-3 rounded-xl px-4 py-3"
                          style={{
                            background: isDark
                              ? 'rgba(255, 255, 255, 0.05)'
                              : 'rgba(0, 0, 0, 0.03)',
                            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'}`,
                          }}
                          whileHover={{ scale: 1.02, y: -1 }}
                        >
                          <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                          <div>
                            <span
                              className="text-sm font-medium"
                              style={{ color: themeStyles.colors.text.primary }}
                            >
                              Load Time:
                            </span>
                            <span
                              className="ml-2 text-sm"
                              style={{ color: themeStyles.colors.text.secondary }}
                            >
                              {Math.round(plugin.loadTime.getTime() / 1000)}s
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Tags Section */}
                    {plugin.tags && plugin.tags.length > 0 && (
                      <div className="space-y-3">
                        <h4
                          className="text-sm font-semibold"
                          style={{ color: themeStyles.colors.text.primary }}
                        >
                          Tags
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {plugin.tags.map((tag, index) => (
                            <motion.span
                              key={index}
                              className="rounded-full px-3 py-1.5 text-sm font-medium"
                              style={{
                                background: isDark
                                  ? 'rgba(255, 255, 255, 0.08)'
                                  : 'rgba(0, 0, 0, 0.05)',
                                color: themeStyles.colors.text.secondary,
                                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
                              }}
                              whileHover={{ scale: 1.05, y: -1 }}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.6 + index * 0.1, duration: 0.3 }}
                            >
                              {tag}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>

            <div
              className="mb-4 border-b"
              style={{ borderColor: themeStyles.card.borderColor }}
            ></div>

            <div
              className="mb-4 flex gap-2 rounded-xl p-1"
              style={{
                background: isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(248, 250, 252, 0.8)',
                border: `1px solid ${
                  isDark ? 'rgba(55, 65, 81, 0.2)' : 'rgba(226, 232, 240, 0.6)'
                }`,
                backdropFilter: 'blur(8px)',
              }}
            >
              <motion.button
                onClick={() => setActiveTab('overview')}
                className={`relative flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-all duration-300 ease-out`}
                whileHover={{
                  scale: 1.02,
                  y: -1,
                }}
                whileTap={{ scale: 0.98 }}
                style={{
                  color:
                    activeTab === 'overview'
                      ? '#ffffff'
                      : isDark
                        ? themeStyles.colors.text.secondary
                        : themeStyles.colors.text.primary,
                  background:
                    activeTab === 'overview'
                      ? `linear-gradient(135deg, ${themeStyles.colors.brand.primary}, ${themeStyles.colors.brand.primaryDark})`
                      : 'transparent',
                  boxShadow:
                    activeTab === 'overview'
                      ? isDark
                        ? '0 4px 12px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)'
                        : '0 4px 12px rgba(37, 99, 235, 0.25), 0 2px 4px rgba(0, 0, 0, 0.05)'
                      : 'none',
                  transform: activeTab === 'overview' ? 'translateY(-1px)' : 'none',
                }}
                onHoverStart={() => {
                  if (activeTab !== 'overview') {
                    // Add subtle hover effect for inactive tabs
                  }
                }}
              >
                <span className="relative z-10">{t('marketplace.overview', 'Overview')}</span>
                {activeTab === 'overview' && (
                  <motion.div
                    className="absolute inset-0 rounded-lg"
                    layoutId="activeTab"
                    style={{
                      background: `linear-gradient(135deg, ${themeStyles.colors.brand.primary}, ${themeStyles.colors.brand.primaryDark})`,
                      boxShadow: isDark
                        ? '0 4px 12px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)'
                        : '0 4px 12px rgba(37, 99, 235, 0.25), 0 2px 4px rgba(0, 0, 0, 0.05)',
                    }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                )}
              </motion.button>

              <motion.button
                onClick={() => setActiveTab('details')}
                className={`relative flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-all duration-300 ease-out`}
                whileHover={{
                  scale: 1.02,
                  y: -1,
                }}
                whileTap={{ scale: 0.98 }}
                style={{
                  color:
                    activeTab === 'details'
                      ? '#ffffff'
                      : isDark
                        ? themeStyles.colors.text.secondary
                        : themeStyles.colors.text.primary,
                  background:
                    activeTab === 'details'
                      ? `linear-gradient(135deg, ${themeStyles.colors.brand.primary}, ${themeStyles.colors.brand.primaryDark})`
                      : 'transparent',
                  boxShadow:
                    activeTab === 'details'
                      ? isDark
                        ? '0 4px 12px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)'
                        : '0 4px 12px rgba(37, 99, 235, 0.25), 0 2px 4px rgba(0, 0, 0, 0.05)'
                      : 'none',
                  transform: activeTab === 'details' ? 'translateY(-1px)' : 'none',
                }}
              >
                <span className="relative z-10">{t('marketplace.details', 'Details')}</span>
                {activeTab === 'details' && (
                  <motion.div
                    className="absolute inset-0 rounded-lg"
                    layoutId="activeTab"
                    style={{
                      background: `linear-gradient(135deg, ${themeStyles.colors.brand.primary}, ${themeStyles.colors.brand.primaryDark})`,
                      boxShadow: isDark
                        ? '0 4px 12px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)'
                        : '0 4px 12px rgba(37, 99, 235, 0.25), 0 2px 4px rgba(0, 0, 0, 0.05)',
                    }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                )}
              </motion.button>

              <motion.button
                onClick={() => setActiveTab('feedback')}
                className={`relative flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-all duration-300 ease-out`}
                whileHover={{
                  scale: 1.02,
                  y: -1,
                }}
                whileTap={{ scale: 0.98 }}
                style={{
                  color:
                    activeTab === 'feedback'
                      ? '#ffffff'
                      : isDark
                        ? themeStyles.colors.text.secondary
                        : themeStyles.colors.text.primary,
                  background:
                    activeTab === 'feedback'
                      ? `linear-gradient(135deg, ${themeStyles.colors.brand.primary}, ${themeStyles.colors.brand.primaryDark})`
                      : 'transparent',
                  boxShadow:
                    activeTab === 'feedback'
                      ? isDark
                        ? '0 4px 12px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)'
                        : '0 4px 12px rgba(37, 99, 235, 0.25), 0 2px 4px rgba(0, 0, 0, 0.05)'
                      : 'none',
                  transform: activeTab === 'feedback' ? 'translateY(-1px)' : 'none',
                }}
              >
                <span className="relative z-10">
                  {t('marketplace.feedback', 'Feedback')}
                  <span
                    className="ml-1 rounded-full px-2 py-0.5 text-xs"
                    style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
                      color:
                        activeTab === 'feedback' ? '#ffffff' : themeStyles.colors.text.secondary,
                    }}
                  >
                    {reviews.length}
                  </span>
                </span>
                {activeTab === 'feedback' && (
                  <motion.div
                    className="absolute inset-0 rounded-lg"
                    layoutId="activeTab"
                    style={{
                      background: `linear-gradient(135deg, ${themeStyles.colors.brand.primary}, ${themeStyles.colors.brand.primaryDark})`,
                      boxShadow: isDark
                        ? '0 4px 12px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)'
                        : '0 4px 12px rgba(37, 99, 235, 0.25), 0 2px 4px rgba(0, 0, 0, 0.05)',
                    }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                )}
              </motion.button>

              <motion.button
                onClick={() => setActiveTab('docs')}
                className={`relative flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-all duration-300 ease-out`}
                whileHover={{
                  scale: 1.02,
                  y: -1,
                }}
                whileTap={{ scale: 0.98 }}
                style={{
                  color:
                    activeTab === 'docs'
                      ? '#ffffff'
                      : isDark
                        ? themeStyles.colors.text.secondary
                        : themeStyles.colors.text.primary,
                  background:
                    activeTab === 'docs'
                      ? `linear-gradient(135deg, ${themeStyles.colors.brand.primary}, ${themeStyles.colors.brand.primaryDark})`
                      : 'transparent',
                  boxShadow:
                    activeTab === 'docs'
                      ? isDark
                        ? '0 4px 12px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)'
                        : '0 4px 12px rgba(37, 99, 235, 0.25), 0 2px 4px rgba(0, 0, 0, 0.05)'
                      : 'none',
                  transform: activeTab === 'docs' ? 'translateY(-1px)' : 'none',
                }}
              >
                <span className="relative z-10">
                  {t('marketplace.documentation', 'Documentation')}
                </span>
                {activeTab === 'docs' && (
                  <motion.div
                    className="absolute inset-0 rounded-lg"
                    layoutId="activeTab"
                    style={{
                      background: `linear-gradient(135deg, ${themeStyles.colors.brand.primary}, ${themeStyles.colors.brand.primaryDark})`,
                      boxShadow: isDark
                        ? '0 4px 12px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)'
                        : '0 4px 12px rgba(37, 99, 235, 0.25), 0 2px 4px rgba(0, 0, 0, 0.05)',
                    }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                )}
              </motion.button>
            </div>
          </>
        )}
      </motion.div>

      {/* Content */}
      <div id="plugin-detail-scroll" className="flex-grow overflow-y-auto px-6 pb-10 pt-2">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div>
                <h2
                  className="mb-4 text-xl font-semibold"
                  style={{ color: themeStyles.colors.text.primary }}
                >
                  {t('marketplace.description', 'Description')}
                </h2>
                <div
                  className="rounded-xl p-6"
                  style={{
                    background: isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(249, 250, 251, 0.7)',
                    border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.2)' : 'rgba(226, 232, 240, 0.7)'}`,
                  }}
                >
                  <p style={{ color: themeStyles.colors.text.secondary, lineHeight: '1.7' }}>
                    {plugin.description || 'No description available for this plugin.'}
                  </p>
                </div>
              </div>

              {dependencies.length > 0 && (
                <div>
                  <h2
                    className="mb-4 text-xl font-semibold"
                    style={{ color: themeStyles.colors.text.primary }}
                  >
                    {t('marketplace.dependencies', 'Dependencies')}
                  </h2>
                  {dependenciesLoading ? (
                    <motion.div
                      className="flex items-center justify-center py-6"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <HiOutlineArrowPath className="mr-2 h-5 w-5 animate-spin" />
                      <p style={{ color: themeStyles.colors.text.secondary }}>
                        Loading dependencies...
                      </p>
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {dependencies.map((dep, index) => (
                        <motion.div
                          key={index}
                          className="rounded-xl p-4"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{
                            y: -5,
                            boxShadow: isDark
                              ? '0 10px 20px rgba(0, 0, 0, 0.2)'
                              : '0 10px 20px rgba(0, 0, 0, 0.1)',
                          }}
                          style={{
                            background: isDark
                              ? 'rgba(31, 41, 55, 0.4)'
                              : 'rgba(249, 250, 251, 0.7)',
                            border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="font-medium"
                              style={{ color: themeStyles.colors.text.primary }}
                            >
                              {dep.name}
                            </span>
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              v{dep.version}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            {dep.required ? (
                              <span className="flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-200">
                                <HiOutlineExclamationCircle className="mr-1 h-3 w-3" />
                                Required
                              </span>
                            ) : (
                              <span className="flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                                <HiOutlineCheckCircle className="mr-1 h-3 w-3" />
                                Optional
                              </span>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <h2
                  className="mb-4 text-xl font-semibold"
                  style={{ color: themeStyles.colors.text.primary }}
                >
                  {t('marketplace.keyFeatures', 'Key Features')}
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <motion.div
                    className="rounded-xl p-5"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    style={{
                      background: isDark ? 'rgba(31, 41, 55, 0.4)' : 'rgba(249, 250, 251, 0.7)',
                      border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
                    }}
                  >
                    <div
                      className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                      style={{
                        background: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                        color: themeStyles.colors.brand.primary,
                      }}
                    >
                      <HiOutlineShieldCheck className="h-6 w-6" />
                    </div>
                    <h3
                      className="mb-2 text-lg font-semibold"
                      style={{ color: themeStyles.colors.text.primary }}
                    >
                      Enhanced Security
                    </h3>
                    <p style={{ color: themeStyles.colors.text.secondary }}>
                      Advanced security features to protect your KubeStellar environment
                    </p>
                  </motion.div>

                  <motion.div
                    className="rounded-xl p-5"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{
                      background: isDark ? 'rgba(31, 41, 55, 0.4)' : 'rgba(249, 250, 251, 0.7)',
                      border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
                    }}
                  >
                    <div
                      className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                      style={{
                        background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                        color: '#10b981',
                      }}
                    >
                      <HiOutlineGlobeAlt className="h-6 w-6" />
                    </div>
                    <h3
                      className="mb-2 text-lg font-semibold"
                      style={{ color: themeStyles.colors.text.primary }}
                    >
                      Seamless Integration
                    </h3>
                    <p style={{ color: themeStyles.colors.text.secondary }}>
                      Works perfectly with your existing KubeStellar workflows
                    </p>
                  </motion.div>

                  <motion.div
                    className="rounded-xl p-5"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    style={{
                      background: isDark ? 'rgba(31, 41, 55, 0.4)' : 'rgba(249, 250, 251, 0.7)',
                      border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
                    }}
                  >
                    <div
                      className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                      style={{
                        background: isDark ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.1)',
                        color: '#f97316',
                      }}
                    >
                      <HiCodeBracket className="h-6 w-6" />
                    </div>
                    <h3
                      className="mb-2 text-lg font-semibold"
                      style={{ color: themeStyles.colors.text.primary }}
                    >
                      Advanced APIs
                    </h3>
                    <p style={{ color: themeStyles.colors.text.secondary }}>
                      Extend KubeStellar with powerful new API capabilities
                    </p>
                  </motion.div>

                  <motion.div
                    className="rounded-xl p-5"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    style={{
                      background: isDark ? 'rgba(31, 41, 55, 0.4)' : 'rgba(249, 250, 251, 0.7)',
                      border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
                    }}
                  >
                    <div
                      className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                      style={{
                        background: isDark ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.1)',
                        color: '#a855f7',
                      }}
                    >
                      <HiOutlineDocumentText className="h-6 w-6" />
                    </div>
                    <h3
                      className="mb-2 text-lg font-semibold"
                      style={{ color: themeStyles.colors.text.primary }}
                    >
                      Comprehensive Documentation
                    </h3>
                    <p style={{ color: themeStyles.colors.text.secondary }}>
                      Detailed guides and examples to help you get the most out of this plugin
                    </p>
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
              className="space-y-8"
            >
              <div>
                <h2
                  className="mb-5 text-xl font-semibold"
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
                      className="text-md mb-4 flex items-center gap-2 font-medium"
                      style={{ color: themeStyles.colors.text.primary }}
                    >
                      <HiOutlineDocumentText
                        className="h-5 w-5"
                        style={{ color: themeStyles.colors.brand.primary }}
                      />
                      {t('marketplace.generalInfo', 'General Information')}
                    </h3>
                    <table className="w-full" style={{ color: themeStyles.colors.text.secondary }}>
                      <tbody>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="border-b"
                          style={{
                            borderColor: isDark
                              ? 'rgba(55, 65, 81, 0.2)'
                              : 'rgba(226, 232, 240, 0.8)',
                          }}
                        >
                          <td className="py-3 pr-4 font-medium">
                            {t('marketplace.version', 'Version')}:
                          </td>
                          <td className="py-3">{plugin.version || '1.0.0'}</td>
                        </motion.tr>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="border-b"
                          style={{
                            borderColor: isDark
                              ? 'rgba(55, 65, 81, 0.2)'
                              : 'rgba(226, 232, 240, 0.8)',
                          }}
                        >
                          <td className="py-3 pr-4 font-medium">
                            {t('marketplace.lastUpdated', 'Last Updated')}:
                          </td>
                          <td className="flex items-center py-3">
                            <HiOutlineCalendar
                              className="mr-2 h-4 w-4"
                              style={{ color: themeStyles.colors.text.tertiary }}
                            />
                            {formatLastUpdated(plugin.lastUpdated)}
                          </td>
                        </motion.tr>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                          className="border-b"
                          style={{
                            borderColor: isDark
                              ? 'rgba(55, 65, 81, 0.2)'
                              : 'rgba(226, 232, 240, 0.8)',
                          }}
                        >
                          <td className="py-3 pr-4 font-medium">
                            {t('marketplace.author', 'Author')}:
                          </td>
                          <td className="py-3">{plugin.author || 'Unknown'}</td>
                        </motion.tr>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 }}
                          className="border-b"
                          style={{
                            borderColor: isDark
                              ? 'rgba(55, 65, 81, 0.2)'
                              : 'rgba(226, 232, 240, 0.8)',
                          }}
                        >
                          <td className="py-3 pr-4 font-medium">
                            {t('marketplace.license', 'License')}:
                          </td>
                          <td className="py-3">{plugin.license || 'MIT'}</td>
                        </motion.tr>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.6 }}
                        >
                          <td className="py-3 pr-4 font-medium">
                            {t('marketplace.category', 'Category')}:
                          </td>
                          <td className="py-3">
                            <span
                              className="rounded-full px-2 py-1 text-xs font-medium"
                              style={{
                                background: isDark
                                  ? 'rgba(59, 130, 246, 0.15)'
                                  : 'rgba(59, 130, 246, 0.1)',
                                color: themeStyles.colors.brand.primary,
                              }}
                            >
                              {plugin.category || 'Misc'}
                            </span>
                          </td>
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
                      className="text-md mb-4 flex items-center gap-2 font-medium"
                      style={{ color: themeStyles.colors.text.primary }}
                    >
                      <HiOutlineCog
                        className="h-5 w-5"
                        style={{ color: themeStyles.colors.brand.primary }}
                      />
                      {t('marketplace.requirements', 'Requirements')}
                    </h3>
                    <table className="w-full" style={{ color: themeStyles.colors.text.secondary }}>
                      <tbody>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="border-b"
                          style={{
                            borderColor: isDark
                              ? 'rgba(55, 65, 81, 0.2)'
                              : 'rgba(226, 232, 240, 0.8)',
                          }}
                        >
                          <td className="py-3 pr-4 font-medium">
                            {t('marketplace.kubestellarVersion', 'KubeStellar Version')}:
                          </td>
                          <td className="flex items-center py-3">
                            <span className="mr-2 flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                              <HiCheckCircle className="mr-1 h-3 w-3" />
                              Compatible
                            </span>
                            1.0.0 or higher
                          </td>
                        </motion.tr>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                          className="border-b"
                          style={{
                            borderColor: isDark
                              ? 'rgba(55, 65, 81, 0.2)'
                              : 'rgba(226, 232, 240, 0.8)',
                          }}
                        >
                          <td className="py-3 pr-4 font-medium">
                            {t('marketplace.dependencies', 'Dependencies')}:
                          </td>
                          <td className="py-3">
                            {dependencies.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {dependencies.map((dep, index) => (
                                  <span
                                    key={index}
                                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                                    style={{
                                      background: dep.required
                                        ? isDark
                                          ? 'rgba(239, 68, 68, 0.15)'
                                          : 'rgba(239, 68, 68, 0.1)'
                                        : isDark
                                          ? 'rgba(16, 185, 129, 0.15)'
                                          : 'rgba(16, 185, 129, 0.1)',
                                      color: dep.required ? '#ef4444' : '#10b981',
                                    }}
                                  >
                                    {dep.name} v{dep.version}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              'None'
                            )}
                          </td>
                        </motion.tr>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 }}
                          className="border-b"
                          style={{
                            borderColor: isDark
                              ? 'rgba(55, 65, 81, 0.2)'
                              : 'rgba(226, 232, 240, 0.8)',
                          }}
                        >
                          <td className="py-3 pr-4 font-medium">
                            {t('marketplace.platforms', 'Platforms')}:
                          </td>
                          <td className="py-3">Linux, macOS, Windows</td>
                        </motion.tr>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.6 }}
                        >
                          <td className="py-3 pr-4 font-medium">
                            {t('marketplace.fileSize', 'File Size')}:
                          </td>
                          <td className="py-3">2.4 MB</td>
                        </motion.tr>
                      </tbody>
                    </table>
                  </motion.div>
                </div>
              </div>

              <div>
                <h2
                  className="mb-4 text-xl font-semibold"
                  style={{ color: themeStyles.colors.text.primary }}
                >
                  {t('marketplace.pluginIdentifiers', 'Plugin Identifiers')}
                </h2>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-xl p-5"
                  style={{
                    background: isDark ? 'rgba(31, 41, 55, 0.4)' : 'rgba(249, 250, 251, 0.7)',
                    backdropFilter: 'blur(8px)',
                    border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
                  }}
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <p
                        className="mb-1 text-sm font-medium"
                        style={{ color: themeStyles.colors.text.secondary }}
                      >
                        Plugin ID
                      </p>
                      <div
                        className="flex items-center rounded px-3 py-2 font-mono text-sm"
                        style={{
                          background: isDark ? '#1e293b' : '#1f2937',
                          color: isDark ? '#d1d5db' : '#f3f4f6',
                        }}
                      >
                        <code className="text-green-400 dark:text-green-300">{plugin.id}</code>
                      </div>
                    </div>

                    <div>
                      <p
                        className="mb-1 text-sm font-medium"
                        style={{ color: themeStyles.colors.text.secondary }}
                      >
                        Published
                      </p>
                      <div
                        className="rounded px-3 py-2 font-mono text-sm"
                        style={{
                          background: isDark ? '#1e293b' : '#1f2937',
                          color: isDark ? '#d1d5db' : '#f3f4f6',
                        }}
                      >
                        <code className="text-blue-400 dark:text-blue-300">
                          {plugin.createdAt
                            ? format(new Date(plugin.createdAt), 'yyyy-MM-dd')
                            : 'N/A'}
                        </code>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {plugin.tags && plugin.tags.length > 0 && (
                <div>
                  <h2
                    className="mb-4 text-xl font-semibold"
                    style={{ color: themeStyles.colors.text.primary }}
                  >
                    {t('marketplace.tags', 'Tags')}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {plugin.tags.map((tag, index) => (
                      <motion.span
                        key={index}
                        className="rounded-full px-3 py-1.5 text-sm font-medium"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.05 }}
                        style={{
                          background: isDark
                            ? 'rgba(59, 130, 246, 0.15)'
                            : 'rgba(59, 130, 246, 0.1)',
                          color: themeStyles.colors.brand.primary,
                          border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'}`,
                        }}
                      >
                        {tag}
                      </motion.span>
                    ))}
                  </div>
                </div>
              )}
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
                        <div className="flex gap-3">
                          {[1, 2, 3, 4, 5].map(rating => {
                            const showLogo = rating <= (hoveredRating || feedback.rating);

                            return (
                              <motion.button
                                key={rating}
                                onClick={() => setFeedback({ ...feedback, rating })}
                                onMouseEnter={() => setHoveredRating(rating)}
                                onMouseLeave={() => setHoveredRating(0)}
                                whileHover={{
                                  scale: 1.15,
                                  y: -2,
                                }}
                                whileTap={{ scale: 0.95 }}
                                className="group relative rounded-lg p-2 transition-all duration-300"
                                style={{
                                  background: showLogo
                                    ? isDark
                                      ? 'rgba(59, 130, 246, 0.1)'
                                      : 'rgba(37, 99, 235, 0.08)'
                                    : 'transparent',
                                  border: showLogo
                                    ? `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(37, 99, 235, 0.2)'}`
                                    : 'transparent',
                                }}
                              >
                                <div
                                  className={`h-10 w-10 ${showLogo ? 'bg-contain bg-center bg-no-repeat' : ''}`}
                                  style={
                                    showLogo
                                      ? {
                                          WebkitMaskRepeat: 'no-repeat',
                                          WebkitMaskSize: 'cover',
                                          backgroundImage: `url(${logo})`,
                                          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
                                        }
                                      : {}
                                  }
                                >
                                  {!showLogo && (
                                    <Circle
                                      className="h-10 w-10 transition-all duration-300 group-hover:scale-110"
                                      style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
                                    />
                                  )}
                                </div>

                                {/* Rating tooltip */}
                                <motion.div
                                  className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 transform rounded-md px-2 py-1 text-xs font-medium opacity-0"
                                  style={{
                                    background: isDark
                                      ? 'rgba(17, 24, 39, 0.9)'
                                      : 'rgba(0, 0, 0, 0.8)',
                                    color: '#ffffff',
                                    backdropFilter: 'blur(8px)',
                                  }}
                                  animate={{
                                    opacity: hoveredRating === rating ? 1 : 0,
                                    y: hoveredRating === rating ? -5 : 0,
                                  }}
                                  transition={{ duration: 0.2 }}
                                >
                                  {rating === 1 && 'Poor'}
                                  {rating === 2 && 'Fair'}
                                  {rating === 3 && 'Good'}
                                  {rating === 4 && 'Very Good'}
                                  {rating === 5 && 'Excellent'}
                                </motion.div>
                              </motion.button>
                            );
                          })}
                        </div>
                        {feedback.rating > 0 && (
                          <motion.p
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2 text-sm font-medium"
                            style={{ color: themeStyles.colors.brand.primary }}
                          >
                            {feedback.rating === 1 && 'Poor'}
                            {feedback.rating === 2 && 'Fair'}
                            {feedback.rating === 3 && 'Good'}
                            {feedback.rating === 4 && 'Very Good'}
                            {feedback.rating === 5 && 'Excellent'}
                          </motion.p>
                        )}
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
                          disabled={submitFeedbackMutation.isPending}
                          className="rounded-lg px-4 py-2 text-sm"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            background: `linear-gradient(135deg, ${themeStyles.colors.brand.primary}, ${themeStyles.colors.brand.primaryDark})`,
                            color: '#ffffff',
                            boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)',
                            opacity: submitFeedbackMutation.isPending ? 0.7 : 1,
                          }}
                        >
                          {submitFeedbackMutation.isPending ? (
                            <HiOutlineArrowPath className="h-4 w-4 animate-spin" />
                          ) : (
                            t('common.submit', 'Submit')
                          )}
                        </motion.button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {reviewsLoading ? (
                        <div className="py-8 text-center">
                          <HiOutlineArrowPath
                            className="mx-auto mb-2 h-8 w-8 animate-spin"
                            style={{ color: themeStyles.colors.text.secondary }}
                          />
                          <p style={{ color: themeStyles.colors.text.secondary }}>
                            Loading reviews...
                          </p>
                        </div>
                      ) : reviews.length > 0 ? (
                        <div className="space-y-4">
                          {reviews.map((review, index) => (
                            <motion.div
                              key={index}
                              className="rounded-xl p-4"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              style={{
                                background: isDark
                                  ? 'rgba(31, 41, 55, 0.4)'
                                  : 'rgba(249, 250, 251, 0.7)',
                                border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
                              }}
                            >
                              <div className="mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="flex gap-1">
                                    {Array.from({ length: 5 }, (_, i) => (
                                      <div key={i} className="h-5 w-5">
                                        {i < review.rating ? (
                                          <div
                                            className="h-5 w-5 bg-contain bg-center bg-no-repeat"
                                            style={{
                                              WebkitMaskRepeat: 'no-repeat',
                                              WebkitMaskSize: 'cover',
                                              backgroundImage: `url(${logo})`,
                                            }}
                                          />
                                        ) : (
                                          <Circle
                                            className="h-5 w-5 transition-colors duration-200"
                                            style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
                                          />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  <span
                                    className="text-sm font-medium"
                                    style={{ color: themeStyles.colors.text.primary }}
                                  >
                                    User #{review.userId}
                                  </span>
                                </div>
                                <span
                                  className="text-xs"
                                  style={{ color: themeStyles.colors.text.secondary }}
                                >
                                  {review.createdAt
                                    ? formatDistanceToNow(new Date(review.createdAt), {
                                        addSuffix: true,
                                      })
                                    : 'Recently'}
                                </span>
                              </div>
                              <p style={{ color: themeStyles.colors.text.secondary }}>
                                {review.comment}
                              </p>
                              {review.suggestions && (
                                <p
                                  className="mt-2 text-sm"
                                  style={{ color: themeStyles.colors.text.tertiary }}
                                >
                                  <span className="font-medium">Suggestions:</span>{' '}
                                  {review.suggestions}
                                </p>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <motion.div
                          className="rounded-xl py-12 text-center"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          style={{
                            background: isDark
                              ? 'rgba(31, 41, 55, 0.3)'
                              : 'rgba(249, 250, 251, 0.5)',
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {activeTab === 'docs' && (
            <motion.div
              key="docs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <PluginDocumentation plugin={plugin} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

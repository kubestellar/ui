import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  HiOutlineArrowDownTray,
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineBolt,
  HiSparkles,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineInformationCircle,
  HiOutlineShieldCheck,
  HiOutlineAdjustmentsHorizontal,
} from 'react-icons/hi2';
import { FaRocket, FaCrown, FaGem, FaPuzzlePiece, FaCode } from 'react-icons/fa';
import { Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useTheme from '../../stores/themeStore';
import getThemeStyles from '../../lib/theme-utils';
import { formatDistanceToNow } from 'date-fns';
import { useMarketplaceQueries } from '../../hooks/queries/useMarketplaceQueries';
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
  imageUrl?: string;
}

interface EnhancedFeaturedPluginsProps {
  plugins: PluginData[];
  onSelectPlugin: (plugin: PluginData) => void;
}

// KubeStellar Rating Component
const KubeRating = React.memo(
  ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const sizeClass = size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5';
    const ratingArray = [];

    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) {
        // Full logo
        ratingArray.push(
          <div key={i} className={sizeClass}>
            <div
              className={`${sizeClass} bg-contain bg-center bg-no-repeat`}
              style={{
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskSize: 'cover',
                backgroundImage: `url(${logo})`,
                filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
              }}
            />
          </div>
        );
      } else if (i - 0.5 <= rating) {
        // Half logo (slightly faded)
        ratingArray.push(
          <div key={i} className={sizeClass}>
            <div
              className={`${sizeClass} bg-contain bg-center bg-no-repeat opacity-60`}
              style={{
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskSize: 'cover',
                backgroundImage: `url(${logo})`,
              }}
            />
          </div>
        );
      } else {
        // Empty circle
        ratingArray.push(
          <div key={i} className={sizeClass}>
            <Circle
              className={`${sizeClass} transition-colors duration-200`}
              style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
            />
          </div>
        );
      }
    }

    return <div className="flex items-center gap-0.5">{ratingArray}</div>;
  }
);

KubeRating.displayName = 'KubeRating';

// Memoized Plugin Icon Component
const PluginIcon = React.memo(
  ({ iconColor, icon: CustomIcon }: { iconColor: string; icon?: React.ReactNode }) => {
    return (
      <div
        className="relative flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${iconColor}, ${iconColor}90)`,
          boxShadow: `0 8px 32px ${iconColor}40`,
        }}
      >
        <motion.div
          className="relative z-10"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.3 }}
        >
          {CustomIcon || <FaRocket className="h-8 w-8 text-white drop-shadow-lg" />}
        </motion.div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-transparent" />
      </div>
    );
  }
);

PluginIcon.displayName = 'PluginIcon';

// Plugin Tag Badge Component
const PluginTag = React.memo(({ tag, color }: { tag: string; color: string }) => {
  return (
    <motion.div
      className="rounded-full px-3 py-1 text-xs font-medium"
      style={{
        background: `linear-gradient(135deg, ${color}20, ${color}10)`,
        color: color,
        border: `1px solid ${color}30`,
      }}
      whileHover={{ scale: 1.05 }}
    >
      {tag}
    </motion.div>
  );
});

PluginTag.displayName = 'PluginTag';

// Featured Plugins Hero Card Component
const FeaturedHeroCard = React.memo(
  ({
    plugin,
    onInstall,
    onSelect,
    installMutation,
    formatDownloads,
    formatLastUpdated,
    themeStyles,
    isDark,
  }: {
    plugin: PluginData;
    onInstall: (id: number, e: React.MouseEvent) => void;
    onSelect: (plugin: PluginData) => void;
    installMutation: {
      mutate: (id: number) => void;
      isPending: boolean;
    };
    formatDownloads: (count: number) => string;
    formatLastUpdated: (date: Date) => string;
    themeStyles: {
      colors: {
        text: {
          primary: string;
          secondary: string;
          tertiary: string;
        };
        brand: {
          primary: string;
          primaryDark: string;
        };
      };
      card: {
        borderColor: string;
      };
    };
    isDark: boolean;
  }) => {
    const { t } = useTranslation();
    const rating = parseFloat(plugin.rating || '0');
    const iconColor = plugin.name ? getIconColorFromName(plugin.name, isDark) : '#3b82f6';

    const getTagColor = (tag: string) => {
      const colors = [
        '#3b82f6', // blue
        '#8b5cf6', // purple
        '#ec4899', // pink
        '#f97316', // orange
        '#10b981', // green
      ];

      const hash = tag.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
      }, 0);

      return colors[Math.abs(hash) % colors.length];
    };

    // Function to get the appropriate icon for a category
    const getCategoryIcon = (category?: string) => {
      switch (category?.toLowerCase()) {
        case 'monitoring':
          return <HiOutlineAdjustmentsHorizontal className="h-8 w-8 text-white drop-shadow-lg" />;
        case 'security':
          return <HiOutlineShieldCheck className="h-8 w-8 text-white drop-shadow-lg" />;
        case 'development':
          return <FaCode className="h-8 w-8 text-white drop-shadow-lg" />;
        case 'utility':
          return <FaPuzzlePiece className="h-8 w-8 text-white drop-shadow-lg" />;
        default:
          return <FaRocket className="h-8 w-8 text-white drop-shadow-lg" />;
      }
    };

    return (
      <motion.div
        className="group relative overflow-hidden rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${
            isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)'
          }, ${isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(249, 250, 251, 0.95)'})`,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.4)' : 'rgba(226, 232, 240, 0.8)'}`,
          boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.4)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}
        whileHover={{
          y: -6,
          scale: 1.01,
          boxShadow: isDark ? '0 20px 50px rgba(0, 0, 0, 0.5)' : '0 20px 50px rgba(0, 0, 0, 0.15)',
        }}
        whileTap={{ scale: 0.99 }}
        layout
      >
        {/* Background gradient and patterns */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background: `radial-gradient(circle at 30% 20%, ${iconColor}, transparent 70%)`,
            }}
          />

          {/* Dynamic pattern based on plugin category */}
          <svg
            className="absolute right-0 top-0 h-full w-1/2 opacity-5"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {Array.from({ length: 10 }).map((_, i) => (
              <circle
                key={i}
                cx={50 + Math.sin(i * 0.5) * 30}
                cy={i * 10}
                r={2 + Math.random() * 4}
                fill={iconColor}
              />
            ))}
            {Array.from({ length: 5 }).map((_, i) => (
              <path
                key={`path-${i}`}
                d={`M ${20 + i * 15} 0 Q ${40 + i * 10} ${50} ${20 + i * 15} 100`}
                stroke={iconColor}
                strokeWidth="0.5"
                fill="none"
              />
            ))}
          </svg>
        </div>

        {/* Premium badge */}
        <div className="absolute left-6 top-6 z-20">
          <div className="rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1 shadow-lg">
            <div className="flex items-center gap-1">
              <HiSparkles className="h-3 w-3 text-white" />
                              <span className="text-xs font-bold text-white">{t('marketplace.common.featured')}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 p-8 md:grid-cols-3">
          {/* Enhanced Icon and Quick Info Section */}
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="mb-2">
              <PluginIcon iconColor={iconColor} icon={getCategoryIcon(plugin.category)} />
            </div>

            <div className="flex w-full flex-wrap justify-center gap-2">
              {plugin.tags
                ?.slice(0, 3)
                .map(tag => <PluginTag key={tag} tag={tag} color={getTagColor(tag)} />)}
            </div>

            <div className="mt-2 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <KubeRating rating={rating} size="lg" />
                <span
                  className="text-lg font-semibold"
                  style={{ color: themeStyles.colors.text.primary }}
                >
                  {plugin.rating || '0.0'}
                </span>
              </div>

              <div
                className="flex items-center gap-3 text-sm"
                style={{ color: themeStyles.colors.text.secondary }}
              >
                <div className="flex items-center gap-1">
                  <HiOutlineArrowDownTray className="h-4 w-4" />
                  <span>{formatDownloads(plugin.downloads || 0)}</span>
                </div>

                <div className="h-3 w-px bg-gray-300/50" />

                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-green-400" />
                  <span>{t('marketplace.common.updated')} {formatLastUpdated(plugin.lastUpdated)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Content Section */}
          <div className="col-span-2 flex flex-col justify-between">
            <div>
              <h3
                className="mb-3 text-2xl font-bold transition-all duration-300 group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-purple-600 group-hover:bg-clip-text group-hover:text-transparent"
                style={{ color: themeStyles.colors.text.primary }}
              >
                {plugin.name}
              </h3>

              <div className="mb-4 flex items-center gap-3">
                <p className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
                  {t('marketplace.common.by')}{' '}
                  <span className="font-medium text-blue-500">
                    {plugin.author || t('marketplace.common.unknownAuthor')}
                  </span>
                </p>
                <div className="h-4 w-px bg-gray-300/50" />
                <span
                  className="rounded-full px-2 py-1 text-xs font-medium"
                  style={{
                    background: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                    color: themeStyles.colors.brand.primary,
                  }}
                >
                  {t('marketplace.common.versionPrefix')}{plugin.version}
                </span>
                {plugin.license && (
                  <>
                    <div className="h-4 w-px bg-gray-300/50" />
                    <div
                      className="flex items-center gap-1 text-xs"
                      style={{ color: themeStyles.colors.text.tertiary }}
                    >
                      <HiOutlineInformationCircle className="h-3 w-3" />
                      <span>{plugin.license}</span>
                    </div>
                  </>
                )}
              </div>

              <p
                className="mb-6 text-lg leading-relaxed"
                style={{ color: themeStyles.colors.text.secondary }}
              >
                {plugin.description || t('marketplace.common.noDescription')}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <motion.button
                onClick={() => onSelect(plugin)}
                className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${
                    isDark ? 'rgba(31, 41, 55, 0.7)' : 'rgba(249, 250, 251, 0.7)'
                  }, ${isDark ? 'rgba(17, 24, 39, 0.7)' : 'rgba(243, 244, 246, 0.7)'})`,
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.6)'}`,
                  color: themeStyles.colors.text.primary,
                }}
                whileHover={{
                  scale: 1.05,
                  y: -2,
                  boxShadow: isDark
                    ? '0 8px 20px rgba(0, 0, 0, 0.2)'
                    : '0 8px 20px rgba(0, 0, 0, 0.1)',
                }}
                whileTap={{ scale: 0.95 }}
              >
                <HiOutlineInformationCircle className="h-4 w-4" />
                <span>{t('marketplace.common.viewDetails')}</span>
              </motion.button>

              <motion.button
                className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background:
                    plugin.status === 'installed'
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: '#ffffff',
                  boxShadow:
                    plugin.status === 'installed'
                      ? '0 4px 20px rgba(16, 185, 129, 0.3)'
                      : '0 4px 20px rgba(59, 130, 246, 0.3)',
                }}
                onClick={e => onInstall(plugin.id, e)}
                disabled={installMutation.isPending || plugin.status === 'installed'}
                whileHover={{
                  scale: 1.05,
                  y: -2,
                  boxShadow:
                    plugin.status === 'installed'
                      ? '0 8px 30px rgba(16, 185, 129, 0.4)'
                      : '0 8px 30px rgba(59, 130, 246, 0.4)',
                }}
                whileTap={{ scale: 0.95 }}
              >
                {installMutation.isPending ? (
                  <>
                    <HiOutlineArrowPath className="h-4 w-4 animate-spin" />
                    <span>{t('marketplace.common.installing')}</span>
                  </>
                ) : plugin.status === 'installed' ? (
                  <>
                    <HiOutlineCheckCircle className="h-4 w-4" />
                    <span>{t('marketplace.common.installed')}</span>
                  </>
                ) : (
                  <>
                    <HiOutlineArrowDownTray className="h-4 w-4" />
                    <span>{t('marketplace.common.installNow')}</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
);

FeaturedHeroCard.displayName = 'FeaturedHeroCard';

// Helper functions
const getIconColorFromName = (name: string, isDark: boolean) => {
  const hash = name.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  const h = Math.abs(hash) % 360;
  const s = isDark ? '65%' : '75%';
  const l = isDark ? '60%' : '70%';

  return `hsl(${h}, ${s}, ${l})`;
};

export const EnhancedFeaturedPlugins: React.FC<EnhancedFeaturedPluginsProps> = React.memo(
  ({ plugins, onSelectPlugin }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const themeStyles = getThemeStyles(isDark);

    const { useInstallPlugin } = useMarketplaceQueries();
    const installMutation = useInstallPlugin();

    // State for carousel
    const [activeIndex, setActiveIndex] = useState(0);
    const [autoplay, setAutoplay] = useState(true);
    const [hovering, setHovering] = useState(false);

    // Autoplay effect for carousel
    useEffect(() => {
      if (!autoplay || hovering || plugins.length <= 1) return;

      const interval = setInterval(() => {
        setActiveIndex(current => (current + 1) % plugins.length);
      }, 6000);

      return () => clearInterval(interval);
    }, [autoplay, plugins.length, hovering]);

    // Memoized utility functions for better performance
    const formatDownloads = useCallback((count: number) => {
      if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`;
      }
      if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}k`;
      }
      return count.toString();
    }, []);

    const formatLastUpdated = useCallback((date: Date) => {
      try {
        return formatDistanceToNow(new Date(date), { addSuffix: true });
      } catch {
        return 'recently';
      }
    }, []);

    // Memoized install handler
    const handleInstall = useCallback(
      (pluginId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        installMutation.mutate(pluginId);
      },
      [installMutation]
    );

    // Memoized plugin selection handler
    const handlePluginSelect = useCallback(
      (plugin: PluginData) => {
        onSelectPlugin(plugin);
      },
      [onSelectPlugin]
    );

    // Carousel navigation handlers
    const goToPrevious = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveIndex(current => (current - 1 + plugins.length) % plugins.length);
      },
      [plugins.length]
    );

    const goToNext = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveIndex(current => (current + 1) % plugins.length);
      },
      [plugins.length]
    );

    const goToSlide = useCallback((index: number) => {
      setActiveIndex(index);
    }, []);

    // Enhanced empty state with useful plugin suggestions
    const emptyStateContent = useMemo(
      () => (
        <motion.div
          className="relative overflow-hidden rounded-2xl p-12 text-center"
          style={{
            background: `linear-gradient(135deg, ${
              isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)'
            }, ${isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(249, 250, 251, 0.95)'})`,
            backdropFilter: 'blur(20px)',
            border: `2px dashed ${isDark ? 'rgba(156, 163, 175, 0.3)' : 'rgba(156, 163, 175, 0.4)'}`,
            boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          {/* Floating background elements */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className={`absolute rounded-full ${
                  i === 0
                    ? '-left-4 -top-4 h-16 w-16 bg-blue-400/10'
                    : i === 1
                      ? '-bottom-4 -right-4 h-20 w-20 bg-purple-400/10'
                      : 'left-1/2 top-1/2 h-12 w-12 bg-yellow-400/10'
                }`}
                animate={{
                  scale: [1, 1.2, 1],
                  x: i === 0 ? [0, 10, 0] : i === 1 ? [0, -15, 0] : [0, 8, -8, 0],
                  y: i === 0 ? [0, -10, 0] : i === 1 ? [0, 15, 0] : [0, -5, 5, 0],
                }}
                transition={{
                  duration: 4 + i,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.5,
                }}
              />
            ))}
          </div>

          <div className="relative z-10">
            {/* Animated gem icon */}
            <motion.div
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <FaGem className="h-10 w-10 text-purple-500" />
            </motion.div>

            <motion.h3
              className="mb-3 text-xl font-bold"
              style={{ color: themeStyles.colors.text.primary }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {t('marketplace.common.premiumPlugins')}
            </motion.h3>

            <motion.p
              className="mx-auto mb-6 max-w-md text-base leading-relaxed"
              style={{ color: themeStyles.colors.text.secondary }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {t('marketplace.common.enhanceWorkflow')}
            </motion.p>

            {/* Suggested plugin categories */}
            <motion.div
              className="mb-8 flex flex-wrap items-center justify-center gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              {(t('marketplace.common.suggestedCategories', { returnObjects: true }) as string[]).map((category: string) => (
                <motion.div
                  key={category}
                  className="flex items-center gap-2 rounded-full px-4 py-2"
                  style={{
                    background: `linear-gradient(135deg, ${
                      isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'
                    }, ${isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)'})`,
                    border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
                  }}
                  whileHover={{ scale: 1.05, y: -2 }}
                >
                  <span
                    className="text-sm font-medium"
                    style={{ color: themeStyles.colors.text.primary }}
                  >
                    {category}
                  </span>
                </motion.div>
              ))}
            </motion.div>

            {/* Call to action button */}
            <motion.button
              className="mx-auto flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-sm font-medium text-white shadow-lg"
              whileHover={{
                scale: 1.05,
                boxShadow: '0 10px 25px rgba(59, 130, 246, 0.5)',
              }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <HiOutlineBolt className="h-4 w-4" />
              <span>{t('marketplace.common.exploreMarketplace')}</span>
            </motion.button>
          </div>
        </motion.div>
      ),
      [isDark, themeStyles]
    );

    if (!plugins || plugins.length === 0) {
      return (
        <div className="space-y-6">
          {/* Enhanced Header */}
          <motion.div
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-4">
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <div className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 p-3 shadow-lg">
                  <FaCrown className="h-6 w-6 text-white" />
                </div>
              </motion.div>

              <div>
                <h2
                  className="text-xl font-bold"
                  style={{ color: themeStyles.colors.text.primary }}
                >
                  <span className="bg-gradient-to-r from-emerald-500 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {t('marketplace.featured', 'Featured Plugins')}
                  </span>
                </h2>
                <p className="mt-1 text-xs" style={{ color: themeStyles.colors.text.secondary }}>
                  {t('marketplace.featured.subtitle')}
                </p>
              </div>
            </div>
          </motion.div>

          {emptyStateContent}
        </div>
      );
    }

    return (
      <div
        className="space-y-6"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {/* Enhanced Header with Animation */}
        <motion.div
          className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4">
            <motion.div
              className="relative"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.2 }}
            >
              <div className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 p-3 shadow-lg">
                <FaCrown className="h-6 w-6 text-white" />
              </div>
              <motion.div
                className="absolute -right-1 -top-1"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <HiSparkles className="h-4 w-4 text-yellow-400" />
              </motion.div>
            </motion.div>

            <div>
              <h2 className="text-xl font-bold" style={{ color: themeStyles.colors.text.primary }}>
                <span className="bg-gradient-to-r from-emerald-500 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {t('marketplace.featured', 'Featured Plugins')}
                </span>
              </h2>
                              <p className="mt-1 text-xs" style={{ color: themeStyles.colors.text.secondary }}>
                  {t('marketplace.featured.subtitle')}
                </p>
            </div>
          </div>

          {/* Carousel Controls */}
          {plugins.length > 1 && (
            <div className="flex items-center gap-3">
              {/* Dots navigation */}
              <div className="hidden items-center gap-2 sm:flex">
                {plugins.map((_, index) => (
                  <motion.button
                    key={index}
                    className="h-2.5 w-2.5 rounded-full transition-all duration-300"
                    style={{
                      background:
                        index === activeIndex
                          ? themeStyles.colors.brand.primary
                          : isDark
                            ? 'rgba(156, 163, 175, 0.3)'
                            : 'rgba(156, 163, 175, 0.5)',
                      transform: index === activeIndex ? 'scale(1.2)' : 'scale(1)',
                    }}
                    onClick={() => goToSlide(index)}
                    whileHover={{ scale: 1.3 }}
                    whileTap={{ scale: 0.9 }}
                  />
                ))}
              </div>

              {/* Arrow buttons */}
              <div className="flex items-center gap-2">
                <motion.button
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${
                      isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgba(249, 250, 251, 0.8)'
                    }, ${isDark ? 'rgba(17, 24, 39, 0.8)' : 'rgba(243, 244, 246, 0.8)'})`,
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.6)'}`,
                    color: themeStyles.colors.text.primary,
                    boxShadow: isDark
                      ? '0 4px 12px rgba(0, 0, 0, 0.2)'
                      : '0 4px 12px rgba(0, 0, 0, 0.1)',
                  }}
                  onClick={goToPrevious}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <HiOutlineChevronLeft className="h-5 w-5" />
                </motion.button>

                <motion.button
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${
                      isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgba(249, 250, 251, 0.8)'
                    }, ${isDark ? 'rgba(17, 24, 39, 0.8)' : 'rgba(243, 244, 246, 0.8)'})`,
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.6)'}`,
                    color: themeStyles.colors.text.primary,
                    boxShadow: isDark
                      ? '0 4px 12px rgba(0, 0, 0, 0.2)'
                      : '0 4px 12px rgba(0, 0, 0, 0.1)',
                  }}
                  onClick={goToNext}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <HiOutlineChevronRight className="h-5 w-5" />
                </motion.button>

                <motion.button
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${
                      isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgba(249, 250, 251, 0.8)'
                    }, ${isDark ? 'rgba(17, 24, 39, 0.8)' : 'rgba(243, 244, 246, 0.8)'})`,
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.6)'}`,
                    color: autoplay
                      ? themeStyles.colors.brand.primary
                      : themeStyles.colors.text.primary,
                    boxShadow: isDark
                      ? '0 4px 12px rgba(0, 0, 0, 0.2)'
                      : '0 4px 12px rgba(0, 0, 0, 0.1)',
                  }}
                  onClick={() => setAutoplay(!autoplay)}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {autoplay ? (
                    <HiOutlineArrowPath className="h-4 w-4" />
                  ) : (
                    <HiOutlineBolt className="h-4 w-4" />
                  )}
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Featured Plugin Carousel */}
        <div className="relative overflow-hidden rounded-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            >
              <FeaturedHeroCard
                plugin={plugins[activeIndex]}
                onInstall={handleInstall}
                onSelect={handlePluginSelect}
                installMutation={installMutation}
                formatDownloads={formatDownloads}
                formatLastUpdated={formatLastUpdated}
                themeStyles={themeStyles}
                isDark={isDark}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile navigation dots */}
        {plugins.length > 1 && (
          <div className="mt-4 flex justify-center gap-2 sm:hidden">
            {plugins.map((_, index) => (
              <motion.button
                key={index}
                className="h-2.5 w-2.5 rounded-full transition-all duration-300"
                style={{
                  background:
                    index === activeIndex
                      ? themeStyles.colors.brand.primary
                      : isDark
                        ? 'rgba(156, 163, 175, 0.3)'
                        : 'rgba(156, 163, 175, 0.5)',
                  transform: index === activeIndex ? 'scale(1.2)' : 'scale(1)',
                }}
                onClick={() => goToSlide(index)}
                whileHover={{ scale: 1.3 }}
                whileTap={{ scale: 0.9 }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

EnhancedFeaturedPlugins.displayName = 'EnhancedFeaturedPlugins';

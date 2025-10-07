import React, { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { HiOutlineArrowDownTray, HiOutlineArrowPath, HiOutlineCheckCircle } from 'react-icons/hi2';
import { Circle } from 'lucide-react';
import { motion } from 'framer-motion';
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
}

interface EnhancedPluginCardProps {
  plugin: PluginData;
  onClick: () => void;
}

export const EnhancedPluginCard: React.FC<EnhancedPluginCardProps> = React.memo(
  ({ plugin, onClick }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const themeStyles = getThemeStyles(isDark);

    const { useInstallPlugin } = useMarketplaceQueries();
    const installMutation = useInstallPlugin();

    // Memoized utility functions for better performance
    const iconColor = useMemo(() => {
      if (!plugin?.name) {
        return isDark ? 'hsl(220, 60%, 65%)' : 'hsl(220, 70%, 80%)';
      }
      const hash = plugin.name.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
      }, 0);

      const h = Math.abs(hash) % 360;
      const s = isDark ? '60%' : '70%';
      const l = isDark ? '65%' : '80%';

      return `hsl(${h}, ${s}, ${l})`;
    }, [plugin.name, isDark]);

    // Memoized rating display with KubeStellar logo
    const ratingDisplay = useMemo(() => {
      const rating = parseFloat(plugin.rating || '0');
      const ratingArray = [];

      for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating)) {
          ratingArray.push(
            <div key={i} className="h-4 w-4">
              <div
                className="h-4 w-4 bg-contain bg-center bg-no-repeat"
                style={{
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskSize: 'cover',
                  backgroundImage: `url(${logo})`,
                }}
              />
            </div>
          );
        } else if (i - 0.5 <= rating) {
          ratingArray.push(
            <div key={i} className="h-4 w-4">
              <div
                className="h-4 w-4 bg-contain bg-center bg-no-repeat opacity-60"
                style={{
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskSize: 'cover',
                  backgroundImage: `url(${logo})`,
                }}
              />
            </div>
          );
        } else {
          ratingArray.push(
            <div key={i} className="h-4 w-4">
              <Circle
                className="h-4 w-4 transition-colors duration-200"
                style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
              />
            </div>
          );
        }
      }
      return ratingArray;
    }, [plugin.rating, isDark]);

    // Memoized formatted values
    const formattedDownloads = useMemo(() => {
      const count = plugin.downloads || 0;
      if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}k`;
      }
      return count.toString();
    }, [plugin.downloads]);

    const lastUpdated = useMemo(() => {
      try {
        return formatDistanceToNow(new Date(plugin.lastUpdated), { addSuffix: true });
      } catch {
        return t('marketplace.common.recently');
      }
    }, [plugin.lastUpdated, t]);

    const createdAt = useMemo(() => {
      if (!plugin.createdAt) return null;
      try {
        return formatDistanceToNow(new Date(plugin.createdAt), { addSuffix: true });
      } catch {
        return t('marketplace.common.recently');
      }
    }, [plugin.createdAt, t]);

    // Memoized event handlers
    const handleInstall = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        installMutation.mutate(plugin.id);
      },
      [installMutation, plugin.id]
    );

    const handleClick = useCallback(() => {
      onClick();
    }, [onClick]);

    return (
      <motion.div
        className="group relative cursor-pointer overflow-hidden rounded-xl p-5 transition-all duration-300"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95))'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(249, 250, 251, 0.95))',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.6)'}`,
          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.2)' : '0 4px 20px rgba(0, 0, 0, 0.06)',
        }}
        onClick={handleClick}
        whileHover={{
          y: -4,
          scale: 1.02,
          boxShadow: isDark ? '0 12px 30px rgba(0, 0, 0, 0.3)' : '0 12px 30px rgba(0, 0, 0, 0.1)',
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25,
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        {/* Simplified decorative background elements */}
        <div
          className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-10"
          style={{
            background: `radial-gradient(circle, ${iconColor} 0%, transparent 70%)`,
            filter: 'blur(15px)',
          }}
        />

        {/* Status indicator */}
        {plugin.status === 'installed' && (
          <div
            className="absolute -right-4 -top-4 flex h-10 w-10 items-center justify-center rounded-full"
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
            }}
          >
            <HiOutlineCheckCircle className="h-5 w-5 text-white" />
          </div>
        )}

        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center">
            <div
              className="relative mr-4 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl"
              style={{
                background: `linear-gradient(135deg, ${iconColor}, ${iconColor}90)`,
                boxShadow: `0 4px 12px rgba(0, 0, 0, 0.2)`,
              }}
            >
              {/* Plugin icon - first letter of name */}
              <span
                className="relative z-10 text-xl font-bold"
                style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}
              >
                {(plugin.name && plugin.name.charAt(0).toUpperCase()) || 'P'}
              </span>

              {/* Simple decorative element inside icon */}
              <div
                className="absolute bottom-0 left-0 right-0 top-0 opacity-30"
                style={{
                  background: `radial-gradient(circle at 70% 30%, rgba(255, 255, 255, 0.4) 0%, transparent 60%)`,
                }}
              />
            </div>
            <div className="space-y-1">
              <h3
                className="text-lg font-bold tracking-tight"
                style={{ color: themeStyles.colors.text.primary }}
              >
                {plugin.name || t('marketplace.common.unnamedPlugin')}
              </h3>
              <p
                className="text-sm font-medium"
                style={{ color: themeStyles.colors.text.secondary }}
              >
                {t('marketplace.common.by')}{' '}
                <span className="text-blue-500 dark:text-blue-400">
                  {plugin.author || t('marketplace.common.unknownAuthor')}
                </span>
              </p>
            </div>
          </div>

          <div
            className="rounded-full px-3 py-1.5 text-xs font-bold tracking-wide"
            style={{
              background: `linear-gradient(135deg, ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'}, ${isDark ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.1)'})`,
              color: themeStyles.colors.brand.primary,
              border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
              boxShadow: `0 2px 8px ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'}`,
            }}
          >
            {plugin.category || t('marketplace.common.misc')}
          </div>
        </div>

        <div className="mb-5">
          <p
            className="line-clamp-2 text-sm leading-relaxed"
            style={{ color: themeStyles.colors.text.secondary }}
          >
            {plugin.description || t('marketplace.common.noDescription')}
          </p>
        </div>

        <div className="mb-5 flex items-center justify-between gap-3">
          <div
            className="group/rating flex items-center rounded-xl bg-opacity-20 px-4 py-2"
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'}`,
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="mr-3 flex gap-1">{ratingDisplay}</div>
            <div className="flex flex-col items-start">
              <span
                className="text-sm font-bold"
                style={{ color: themeStyles.colors.brand.primary }}
              >
                {plugin.rating || '0.0'}
              </span>
              <span
                className="-mt-1 text-xs font-medium"
                style={{ color: themeStyles.colors.text.tertiary }}
              >
                {t('marketplace.common.rating')}
              </span>
            </div>
          </div>

          <div
            className="group/downloads flex items-center rounded-xl bg-opacity-20 px-4 py-2"
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'}`,
              backdropFilter: 'blur(8px)',
            }}
          >
            <HiOutlineArrowDownTray
              className="mr-3 h-5 w-5"
              style={{ color: themeStyles.colors.text.secondary }}
            />
            <div className="flex flex-col items-start">
              <span
                className="text-sm font-bold"
                style={{ color: themeStyles.colors.text.primary }}
              >
                {formattedDownloads}
              </span>
              <span
                className="-mt-1 text-xs font-medium"
                style={{ color: themeStyles.colors.text.tertiary }}
              >
                {t('marketplace.common.downloads')}
              </span>
            </div>
          </div>
        </div>

        {/* Technical Details Section */}
        <div className="mb-5 space-y-4">
          {/* Version and Update Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span
                  className="rounded-lg px-3 py-1.5 text-sm font-bold"
                  style={{
                    background: `linear-gradient(135deg, ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'}, ${isDark ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.1)'})`,
                    color: themeStyles.colors.brand.primary,
                    border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
                    boxShadow: `0 2px 8px ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'}`,
                  }}
                >
                  <span className="mr-1 text-xs opacity-80">v</span>
                  {plugin.version || t('marketplace.common.defaultVersion')}
                </span>

                <div
                  className="flex items-center space-x-1 rounded-full px-2 py-1 text-xs"
                  style={{
                    background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
                    color: themeStyles.colors.text.secondary,
                    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'}`,
                  }}
                >
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-400"></span>
                  <span>
                    {t('marketplace.common.updated')} {lastUpdated}
                  </span>
                </div>
              </div>
            </div>

            {/* Plugin Status */}
            {plugin.status && (
              <div
                className="rounded-md px-2 py-1 text-xs font-medium"
                style={{
                  background:
                    plugin.status === 'installed'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : plugin.status === 'active'
                        ? 'rgba(59, 130, 246, 0.15)'
                        : 'rgba(156, 163, 175, 0.15)',
                  color:
                    plugin.status === 'installed'
                      ? '#10b981'
                      : plugin.status === 'active'
                        ? themeStyles.colors.brand.primary
                        : '#9ca3af',
                  border: `1px solid ${
                    plugin.status === 'installed'
                      ? 'rgba(16, 185, 129, 0.3)'
                      : plugin.status === 'active'
                        ? 'rgba(59, 130, 246, 0.3)'
                        : 'rgba(156, 163, 175, 0.3)'
                  }`,
                }}
              >
                {plugin.status.charAt(0).toUpperCase() + plugin.status.slice(1)}
              </div>
            )}
          </div>

          {/* Additional Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* License Information */}
            {plugin.license && (
              <div
                className="flex items-center space-x-2 rounded-lg px-3 py-2"
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'}`,
                }}
              >
                <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                <div className="flex flex-col">
                  <span
                    className="text-xs font-medium"
                    style={{ color: themeStyles.colors.text.primary }}
                  >
                    {t('marketplace.common.license')}
                  </span>
                  <span className="text-xs" style={{ color: themeStyles.colors.text.secondary }}>
                    {plugin.license}
                  </span>
                </div>
              </div>
            )}

            {/* Creation Date */}
            {createdAt && (
              <div
                className="flex items-center space-x-2 rounded-lg px-3 py-2"
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'}`,
                }}
              >
                <div className="h-2 w-2 rounded-full bg-purple-400"></div>
                <div className="flex flex-col">
                  <span
                    className="text-xs font-medium"
                    style={{ color: themeStyles.colors.text.primary }}
                  >
                    {t('marketplace.common.created')}
                  </span>
                  <span className="text-xs" style={{ color: themeStyles.colors.text.secondary }}>
                    {createdAt}
                  </span>
                </div>
              </div>
            )}

            {/* Routes Count */}
            {plugin.routes && plugin.routes.length > 0 && (
              <div
                className="flex items-center space-x-2 rounded-lg px-3 py-2"
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'}`,
                }}
              >
                <div className="h-2 w-2 rounded-full bg-green-400"></div>
                <div className="flex flex-col">
                  <span
                    className="text-xs font-medium"
                    style={{ color: themeStyles.colors.text.primary }}
                  >
                    {t('marketplace.common.routes')}
                  </span>
                  <span className="text-xs" style={{ color: themeStyles.colors.text.secondary }}>
                    {plugin.routes.length}{' '}
                    {plugin.routes.length !== 1
                      ? t('marketplace.common.endpoints_plural')
                      : t('marketplace.common.endpoints')}
                  </span>
                </div>
              </div>
            )}

            {/* Load Time */}
            {plugin.loadTime && (
              <div
                className="flex items-center space-x-2 rounded-lg px-3 py-2"
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'}`,
                }}
              >
                <div className="h-2 w-2 rounded-full bg-yellow-400"></div>
                <div className="flex flex-col">
                  <span
                    className="text-xs font-medium"
                    style={{ color: themeStyles.colors.text.primary }}
                  >
                    {t('marketplace.common.loadTime')}
                  </span>
                  <span className="text-xs" style={{ color: themeStyles.colors.text.secondary }}>
                    {Math.round(plugin.loadTime.getTime() / 1000)}
                    {t('marketplace.common.seconds')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tags Section */}
          {plugin.tags && plugin.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              <span
                className="text-xs font-medium"
                style={{ color: themeStyles.colors.text.secondary }}
              >
                {t('marketplace.common.tags')}
              </span>
              {plugin.tags.map((tag, index) => (
                <span
                  key={index}
                  className="rounded-full px-2 py-1 text-xs font-medium"
                  style={{
                    background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                    color: themeStyles.colors.text.secondary,
                    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Install Button - Moved to bottom */}
          <motion.button
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-70"
            style={{
              background:
                plugin.status === 'installed'
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : `linear-gradient(135deg, ${themeStyles.colors.brand.primary}, ${themeStyles.colors.brand.primaryDark})`,
              color: '#ffffff',
              boxShadow:
                plugin.status === 'installed'
                  ? '0 4px 15px rgba(16, 185, 129, 0.3)'
                  : `0 4px 15px ${isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(37, 99, 235, 0.25)'}`,
            }}
            onClick={handleInstall}
            disabled={installMutation.isPending || plugin.status === 'installed'}
            whileHover={{
              scale: 1.02,
              y: -2,
              boxShadow:
                plugin.status === 'installed'
                  ? '0 8px 25px rgba(16, 185, 129, 0.4)'
                  : `0 8px 25px ${isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(37, 99, 235, 0.35)'}`,
            }}
            whileTap={{ scale: 0.98 }}
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
                <span>{t('marketplace.common.installPlugin')}</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    );
  }
);

EnhancedPluginCard.displayName = 'EnhancedPluginCard';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { HiStar, HiOutlineStar, HiOutlineArrowDownTray, HiSparkles } from 'react-icons/hi2';
import { FaRocket } from 'react-icons/fa';
import useTheme from '../../stores/themeStore';
import getThemeStyles from '../../lib/theme-utils';
import { formatDistanceToNow } from 'date-fns';

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

interface FeaturedPluginsProps {
  plugins: PluginData[];
  onSelectPlugin: (plugin: PluginData) => void;
}

export const FeaturedPlugins: React.FC<FeaturedPluginsProps> = React.memo(
  ({ plugins, onSelectPlugin }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const themeStyles = getThemeStyles(isDark);

    if (!plugins || plugins.length === 0) {
      return null;
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

    // Generate stars based on rating
    const renderStars = (rating: number) => {
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
      return stars;
    };

    // Generate random pastel color for plugin icon background
    const getIconColor = (pluginName: string) => {
      // Generate a pastel color based on the plugin name
      const hash = pluginName.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
      }, 0);

      const h = Math.abs(hash) % 360;
      const s = isDark ? '60%' : '70%';
      const l = isDark ? '65%' : '80%';

      return `hsl(${h}, ${s}, ${l})`;
    };

    return (
      <div className="relative">
        <div className="mb-4 flex items-center gap-3">
          <div className="text-yellow-400">
            <HiSparkles className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold" style={{ color: themeStyles.colors.text.primary }}>
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              {t('marketplace.featured', 'Featured Plugins')}
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {plugins.map(plugin => {
            return (
              <div
                key={plugin.id}
                className="relative cursor-pointer overflow-hidden rounded-xl transition-transform duration-200 hover:scale-[1.01]"
                style={{
                  background: `linear-gradient(135deg, ${
                    isDark ? 'rgba(17, 24, 39, 0.8)' : 'rgba(255, 255, 255, 0.8)'
                  }, ${isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgba(249, 250, 251, 0.8)'})`,
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(226, 232, 240, 0.8)'}`,
                  boxShadow: themeStyles.card.shadow,
                }}
                onClick={() => onSelectPlugin(plugin)}
              >
                <div className="relative z-10 flex flex-col md:flex-row">
                  <div
                    className="relative flex h-48 w-full items-center justify-center overflow-hidden p-6 md:h-auto md:w-64"
                    style={{
                      background: `linear-gradient(135deg, ${getIconColor(plugin.name)}, ${getIconColor(plugin.name + 'alt')})`,
                      borderRight: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(226, 232, 240, 0.8)'}`,
                    }}
                  >
                    <div className="relative flex items-center justify-center">
                      <FaRocket
                        className="h-16 w-16 text-white opacity-90"
                        style={{ filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.5))' }}
                      />

                      <div className="absolute -right-2 -top-2">
                        <HiSparkles className="h-5 w-5 text-yellow-300" />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 p-6">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <h3
                          className="mb-1 text-xl font-bold"
                          style={{ color: themeStyles.colors.text.primary }}
                        >
                          {plugin.name}
                        </h3>
                        <p className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
                          {plugin.author || 'Unknown author'}
                        </p>
                      </div>

                      <div
                        className="rounded-full px-2 py-1 text-xs"
                        style={{
                          background: isDark
                            ? 'rgba(59, 130, 246, 0.15)'
                            : 'rgba(59, 130, 246, 0.1)',
                          color: themeStyles.colors.brand.primary,
                          border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'}`,
                        }}
                      >
                        {plugin.category || 'Misc'}
                      </div>
                    </div>

                    <p
                      className="mb-4 line-clamp-2 text-sm"
                      style={{ color: themeStyles.colors.text.secondary }}
                    >
                      {plugin.description || 'No description available'}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="mr-2 flex">
                          {renderStars(parseFloat(plugin.rating || '0'))}
                        </div>
                        <span
                          className="text-sm"
                          style={{ color: themeStyles.colors.text.secondary }}
                        >
                          {plugin.rating || '0.0'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div
                          className="flex items-center text-sm"
                          style={{ color: themeStyles.colors.text.secondary }}
                        >
                          <HiOutlineArrowDownTray className="mr-1" />
                          {formatDownloads(plugin.downloads || 0)}
                        </div>

                        <div
                          className="text-xs"
                          style={{ color: themeStyles.colors.text.tertiary }}
                        >
                          Updated {formatLastUpdated(plugin.lastUpdated)}
                        </div>
                      </div>
                    </div>

                    <div
                      className="mt-4 pt-4"
                      style={{
                        borderTop: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.2)' : 'rgba(226, 232, 240, 0.8)'}`,
                      }}
                    >
                      <button
                        className="rounded-lg px-4 py-2 text-sm font-medium transition-transform duration-150 hover:scale-[1.02]"
                        style={{
                          background: themeStyles.colors.brand.primary,
                          color: '#ffffff',
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          // Install logic would go here
                        }}
                      >
                        {plugin.status === 'installed' ? 'Installed' : 'Install Now'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

FeaturedPlugins.displayName = 'FeaturedPlugins';

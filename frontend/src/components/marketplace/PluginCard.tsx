import React, { useState, useMemo } from 'react';
import {
  HiOutlineStar,
  HiStar,
  HiOutlineArrowDownTray,
  HiOutlineHeart,
  HiHeart,
} from 'react-icons/hi2';
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

interface PluginCardProps {
  plugin: PluginData;
  onClick: () => void;
}

export const PluginCard: React.FC<PluginCardProps> = React.memo(({ plugin, onClick }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);
  const [isFavorite, setIsFavorite] = useState(false);

  // Generate random pastel color for plugin icon background
  const iconColor = useMemo(() => {
    // Generate a pastel color based on the plugin name
    const hash = plugin.name.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    const h = Math.abs(hash) % 360;
    const s = isDark ? '60%' : '70%';
    const l = isDark ? '65%' : '80%';

    return `hsl(${h}, ${s}, ${l})`;
  }, [plugin.name, isDark]);

  // Generate stars based on rating
  const stars = useMemo(() => {
    const rating = parseFloat(plugin.rating || '0');
    const starsArray = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) {
        starsArray.push(<HiStar key={i} className="text-yellow-400" />);
      } else if (i - 0.5 <= rating) {
        starsArray.push(<HiStar key={i} className="text-yellow-400" />);
      } else {
        starsArray.push(<HiOutlineStar key={i} className="text-gray-400" />);
      }
    }
    return starsArray;
  }, [plugin.rating]);

  // Format download count
  const formattedDownloads = useMemo(() => {
    const count = plugin.downloads || 0;
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  }, [plugin.downloads]);

  // Format the last updated date
  const lastUpdated = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(plugin.lastUpdated), { addSuffix: true });
    } catch {
      return 'recently';
    }
  }, [plugin.lastUpdated]);

  // Handle favorite toggle
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  return (
    <div
      className="relative cursor-pointer overflow-hidden rounded-xl p-4 transition-transform duration-200 ease-out hover:scale-[1.02]"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.8), rgba(31, 41, 55, 0.8))'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))',
        backdropFilter: 'blur(10px)',
        border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(226, 232, 240, 0.8)'}`,
        boxShadow: themeStyles.card.shadow,
      }}
      onClick={onClick}
    >
      {/* Favorite button */}
      <button
        className="absolute right-2 top-2 z-10 rounded-full p-1.5 transition-transform duration-150 hover:scale-110"
        onClick={handleFavoriteClick}
        style={{
          background: isDark ? 'rgba(31, 41, 55, 0.7)' : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(4px)',
        }}
      >
        {isFavorite ? (
          <HiHeart className="h-4 w-4 text-red-500" />
        ) : (
          <HiOutlineHeart
            className="h-4 w-4"
            style={{ color: themeStyles.colors.text.secondary }}
          />
        )}
      </button>

      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center">
          <div
            className="relative mr-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${iconColor}, ${iconColor}90)`,
              boxShadow: `0 4px 10px rgba(0, 0, 0, 0.2), 0 0 15px ${iconColor}50`,
            }}
          >
            {/* Plugin icon - first letter of name */}
            <span
              className="relative z-10 text-xl font-bold"
              style={{ color: '#ffffff', textShadow: '0 2px 5px rgba(0, 0, 0, 0.3)' }}
            >
              {plugin.name?.charAt(0).toUpperCase() || 'P'}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-medium" style={{ color: themeStyles.colors.text.primary }}>
              {plugin.name}
            </h3>
            <p className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
              {plugin.author || 'Unknown author'}
            </p>
          </div>
        </div>

        <div
          className="rounded-full px-2 py-1 text-xs"
          style={{
            background: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
            color: themeStyles.colors.brand.primary,
            border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'}`,
          }}
        >
          {plugin.category || 'Misc'}
        </div>
      </div>

      <p
        className="mb-4 line-clamp-2 h-10 text-sm"
        style={{ color: themeStyles.colors.text.secondary }}
      >
        {plugin.description || 'No description available'}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="mr-1 flex">{stars}</div>
          <span className="text-xs" style={{ color: themeStyles.colors.text.secondary }}>
            ({plugin.rating || '0.0'})
          </span>
        </div>

        <div className="flex items-center">
          <HiOutlineArrowDownTray
            className="mr-1 h-4 w-4"
            style={{ color: themeStyles.colors.text.secondary }}
          />
          <span className="text-xs" style={{ color: themeStyles.colors.text.secondary }}>
            {formattedDownloads}
          </span>
        </div>
      </div>

      <div
        className="mt-3 flex items-center justify-between pt-3"
        style={{
          borderTop: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.2)' : 'rgba(226, 232, 240, 0.8)'}`,
        }}
      >
        <div
          className="flex items-center text-xs"
          style={{ color: themeStyles.colors.text.secondary }}
        >
          <span className="mr-1">v{plugin.version || '1.0.0'}</span>•
          <span className="ml-1">Updated {lastUpdated}</span>
        </div>

        <button
          className="rounded-md px-3 py-1 text-xs transition-transform duration-150 hover:scale-105"
          style={{
            background: themeStyles.colors.brand.primary,
            color: '#ffffff',
          }}
          onClick={e => {
            e.stopPropagation();
            // Install logic would go here
          }}
        >
          {plugin.status === 'installed' ? 'Installed' : 'Install'}
        </button>
      </div>
    </div>
  );
});

PluginCard.displayName = 'PluginCard';

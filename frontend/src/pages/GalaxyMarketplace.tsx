import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiMagnifyingGlass,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineArrowPath,
  HiXMark,
  HiSparkles,
  HiOutlineGlobeAlt,
  HiOutlineStar,
} from 'react-icons/hi2';
import { FaRocket, FaGlobeAsia, FaSpaceShuttle } from 'react-icons/fa';
import useTheme from '../stores/themeStore';
import getThemeStyles from '../lib/theme-utils';
import { PluginAPI } from '../plugins/PluginAPI';
import { PluginCard } from '../components/marketplace/PluginCard';
import { PluginDetails } from '../components/marketplace/PluginDetails';
import { CategoryFilter } from '../components/marketplace/CategoryFilter';
import { FeaturedPlugins } from '../components/marketplace/FeaturedPlugins';

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

const GalaxyMarketplace: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const [plugins, setPlugins] = useState<PluginData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPlugin, setSelectedPlugin] = useState<PluginData | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('popular');
  const [searchFocused, setSearchFocused] = useState(false);
  const pluginAPI = useRef(new PluginAPI()).current;

  // Mock categories for now - in a real app these would come from the backend
  const categories = useMemo(
    () => [
      { id: 'all', name: 'All Plugins', icon: <HiOutlineGlobeAlt /> },
      { id: 'monitoring', name: 'Monitoring', icon: <HiOutlineGlobeAlt /> },
      { id: 'security', name: 'Security', icon: <HiOutlineGlobeAlt /> },
      { id: 'development', name: 'Development', icon: <HiOutlineGlobeAlt /> },
      { id: 'networking', name: 'Networking', icon: <HiOutlineGlobeAlt /> },
      { id: 'storage', name: 'Storage', icon: <HiOutlineGlobeAlt /> },
      { id: 'tools', name: 'Tools', icon: <HiOutlineGlobeAlt /> },
    ],
    []
  );

  // Fetch plugins from the API
  useEffect(() => {
    const fetchPlugins = async () => {
      try {
        setLoading(true);
        const pluginList = await pluginAPI.getPluginList();

        // Enhance plugin data with mock categories and ratings for demo
        const enhancedPlugins: PluginData[] = pluginList.map((plugin: any) => ({
          ...plugin,
          category: ['monitoring', 'security', 'development', 'networking', 'storage', 'tools'][
            Math.floor(Math.random() * 6)
          ],
          rating: (3 + Math.random() * 2).toFixed(1),
          downloads: Math.floor(Math.random() * 10000),
          lastUpdated: new Date(Date.now() - Math.floor(Math.random() * 10000000000)),
        }));

        setPlugins(enhancedPlugins);
      } catch (error) {
        console.error('Failed to load plugins:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlugins();
  }, []);

  // Simplified background animation
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Create stars - slightly increased count but still performance-optimized
    const stars: { x: number; y: number; radius: number; color: string; speed: number }[] = [];
    const numStars = Math.min(150, Math.floor((canvas.width * canvas.height) / 8000));

    for (let i = 0; i < numStars; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = Math.random() * 1.5;
      const color = `rgba(255, 255, 255, ${Math.random() * 0.7 + 0.3})`;
      const speed = Math.random() * 0.03;

      stars.push({ x, y, radius, color, speed });
    }

    // Create nebulae - reduced count and size
    const nebulae: { x: number; y: number; radius: number; color: string }[] = [];
    const numNebulae = isDark ? 2 : 1; // Fewer nebulae
    const colors = [
      'rgba(41, 121, 255, 0.08)', // Blue
      'rgba(138, 43, 226, 0.08)', // Purple
    ];

    for (let i = 0; i < numNebulae; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = Math.random() * 200 + 100; // Smaller nebulae
      const color = colors[Math.floor(Math.random() * colors.length)];

      nebulae.push({ x, y, radius, color });
    }

    // Animation loop with throttled framerate
    let lastFrameTime = 0;
    const targetFPS = 30; // Lower FPS for better performance
    const frameInterval = 1000 / targetFPS;

    const animate = (timestamp: number) => {
      if (!ctx || !canvas) return;

      const elapsed = timestamp - lastFrameTime;
      if (elapsed < frameInterval) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      lastFrameTime = timestamp - (elapsed % frameInterval);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw nebulae
      nebulae.forEach(nebula => {
        const gradient = ctx.createRadialGradient(
          nebula.x,
          nebula.y,
          0,
          nebula.x,
          nebula.y,
          nebula.radius
        );
        gradient.addColorStop(0, nebula.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(nebula.x, nebula.y, nebula.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw and update stars
      stars.forEach(star => {
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();

        // Move star
        star.y += star.speed;

        // Reset star position if it moves off screen
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, [isDark]);

  // Filter and sort plugins - memoized to prevent recalculation on every render
  const filteredPlugins = useMemo(() => {
    return plugins
      .filter(plugin => {
        const matchesSearch =
          searchQuery === '' ||
          plugin.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          plugin.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          plugin.author?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory = selectedCategory === 'all' || plugin.category === selectedCategory;

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'popular') {
          return (b.downloads || 0) - (a.downloads || 0);
        } else if (sortBy === 'rating') {
          return parseFloat(b.rating || '0') - parseFloat(a.rating || '0');
        } else if (sortBy === 'newest') {
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        }
        return 0;
      });
  }, [plugins, searchQuery, selectedCategory, sortBy]);

  // Featured plugins are the top 3 by downloads - memoized
  const featuredPlugins = useMemo(() => {
    return [...plugins].sort((a, b) => (b.downloads || 0) - (a.downloads || 0)).slice(0, 3);
  }, [plugins]);

  // Memoized event handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleToggleFilters = useCallback(() => {
    setShowFilters(prev => !prev);
  }, []);

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
  }, []);

  const handleSelectPlugin = useCallback((plugin: PluginData) => {
    setSelectedPlugin(plugin);
  }, []);

  const handleBackFromDetails = useCallback(() => {
    setSelectedPlugin(null);
  }, []);

  const handleSelectCategory = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('all');
  }, []);

  if (selectedPlugin) {
    return (
      <PluginDetails plugin={selectedPlugin} onBack={handleBackFromDetails} pluginAPI={pluginAPI} />
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      {/* Cosmic background */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute left-0 top-0 z-0 h-full w-full"
        style={{ opacity: isDark ? 0.8 : 0.2 }}
      />

      {/* Static spaceship in background */}
      <div className="pointer-events-none absolute bottom-[15%] right-[10%] z-10 opacity-40">
        <FaSpaceShuttle
          className="h-48 w-48 text-gray-400"
          style={{
            transform: 'rotate(45deg)',
            filter: isDark
              ? 'drop-shadow(0 0 15px rgba(100, 100, 255, 0.3))'
              : 'drop-shadow(0 0 10px rgba(100, 100, 255, 0.2))',
          }}
        />
      </div>

      {/* Static decorative elements */}
      <div className="pointer-events-none absolute right-10 top-20 z-10 opacity-50">
        <FaGlobeAsia className="h-12 w-12 text-purple-300" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex flex-col gap-2 p-6 pb-0">
        <div className="mb-4 flex items-center gap-3">
          <div
            className="relative rounded-xl p-3"
            style={{
              background: `linear-gradient(135deg, ${
                isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'
              }, ${isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)'})`,
              border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.3)'}`,
              boxShadow: '0 4px 20px rgba(37, 99, 235, 0.3)',
            }}
          >
            <FaRocket
              className="h-6 w-6"
              style={{
                color: isDark ? '#60a5fa' : '#3b82f6',
                filter: 'drop-shadow(0 0 5px rgba(59, 130, 246, 0.5))',
              }}
            />
            <div className="absolute -right-1 -top-1">
              <HiSparkles className="h-3 w-3 text-yellow-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: themeStyles.colors.text.primary }}>
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                {t('marketplace.title', 'Galaxy Marketplace')}
              </span>
            </h1>
            <p style={{ color: themeStyles.colors.text.secondary }}>
              {t(
                'marketplace.description',
                'Discover and install plugins to enhance your KubeStellar experience'
              )}
            </p>
          </div>
        </div>

        {/* Search and filters */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row">
          <div className="relative flex-grow">
            <div
              className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
              style={{
                color: searchFocused
                  ? themeStyles.colors.brand.primary
                  : themeStyles.colors.text.secondary,
              }}
            >
              <HiMagnifyingGlass className="h-5 w-5" />
            </div>
            <input
              type="text"
              placeholder={t('marketplace.searchPlaceholder', 'Search plugins...')}
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full rounded-xl py-2.5 pl-10 pr-4"
              style={{
                background: isDark ? 'rgba(17, 24, 39, 0.6)' : 'rgba(249, 250, 251, 0.8)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(226, 232, 240, 0.8)'}`,
                color: themeStyles.colors.text.primary,
              }}
            />
            {searchQuery && (
              <button
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                onClick={handleClearSearch}
              >
                <HiXMark className="h-5 w-5" style={{ color: themeStyles.colors.text.secondary }} />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleToggleFilters}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5"
              style={{
                background: isDark ? 'rgba(31, 41, 55, 0.6)' : 'rgba(249, 250, 251, 0.8)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(226, 232, 240, 0.8)'}`,
                color: themeStyles.colors.text.primary,
              }}
            >
              <HiOutlineAdjustmentsHorizontal className="h-5 w-5" />
              <span>{t('marketplace.filters', 'Filters')}</span>
            </button>

            <div className="relative">
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="cursor-pointer appearance-none rounded-xl px-4 py-2.5 pr-8"
                style={{
                  background: isDark ? 'rgba(31, 41, 55, 0.6)' : 'rgba(249, 250, 251, 0.8)',
                  backdropFilter: 'blur(8px)',
                  border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(226, 232, 240, 0.8)'}`,
                  color: themeStyles.colors.text.primary,
                }}
              >
                <option value="popular">{t('marketplace.sortPopular', 'Popular')}</option>
                <option value="rating">{t('marketplace.sortRating', 'Highest Rated')}</option>
                <option value="newest">{t('marketplace.sortNewest', 'Newest')}</option>
              </select>
              {/* Custom dropdown arrow */}
              <div
                className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"
                style={{ color: isDark ? '#9ca3af' : '#64748b' }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Category filters */}
        <AnimatePresence>
          {showFilters && (
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={handleSelectCategory}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Main content */}
      <div className="flex-grow overflow-y-auto p-6 pt-0">
        {loading ? (
          <div className="flex h-full min-h-[400px] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <motion.div
                animate={{
                  rotate: 360,
                  transition: {
                    repeat: Infinity,
                    duration: 1.5,
                    ease: 'linear',
                  },
                }}
              >
                <HiOutlineArrowPath
                  className="h-8 w-8"
                  style={{ color: themeStyles.colors.brand.primary }}
                />
              </motion.div>
              <p style={{ color: themeStyles.colors.text.secondary }}>{t('common.loading')}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Featured plugins section (only show when no search/filter) */}
            {!searchQuery && selectedCategory === 'all' && (
              <FeaturedPlugins plugins={featuredPlugins} onSelectPlugin={handleSelectPlugin} />
            )}

            {/* All plugins grid */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                {selectedCategory !== 'all' && (
                  <HiOutlineStar
                    className="h-5 w-5"
                    style={{ color: themeStyles.colors.brand.primary }}
                  />
                )}
                <h2
                  className="text-xl font-semibold"
                  style={{ color: themeStyles.colors.text.primary }}
                >
                  {searchQuery || selectedCategory !== 'all'
                    ? t('marketplace.searchResults', 'Search Results')
                    : t('marketplace.allPlugins', 'All Plugins')}
                  <span
                    className="ml-2 text-sm font-normal"
                    style={{ color: themeStyles.colors.text.secondary }}
                  >
                    ({filteredPlugins.length})
                  </span>
                </h2>
              </div>

              {filteredPlugins.length === 0 ? (
                <div
                  className="rounded-xl py-16 text-center"
                  style={{
                    background: isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(249, 250, 251, 0.5)',
                    backdropFilter: 'blur(8px)',
                    border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.2)' : 'rgba(226, 232, 240, 0.5)'}`,
                  }}
                >
                  <div className="mb-4 flex justify-center">
                    <HiMagnifyingGlass
                      className="h-12 w-12 opacity-50"
                      style={{ color: themeStyles.colors.text.secondary }}
                    />
                  </div>
                  <p className="text-lg" style={{ color: themeStyles.colors.text.secondary }}>
                    {t('marketplace.noResults', 'No plugins found matching your criteria')}
                  </p>
                  <button
                    className="mt-4 rounded-lg px-4 py-2 text-sm"
                    onClick={handleClearFilters}
                    style={{
                      background: themeStyles.colors.brand.primary,
                      color: '#ffffff',
                    }}
                  >
                    {t('marketplace.clearFilters', 'Clear Filters')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {/* Only render visible plugins for better performance */}
                  {filteredPlugins.slice(0, 12).map(plugin => (
                    <div key={plugin.id}>
                      <PluginCard plugin={plugin} onClick={() => handleSelectPlugin(plugin)} />
                    </div>
                  ))}
                </div>
              )}

              {/* Load more button if there are more than 12 plugins */}
              {filteredPlugins.length > 12 && (
                <div className="mt-8 flex justify-center">
                  <button
                    className="rounded-lg px-6 py-2"
                    style={{
                      background: isDark ? 'rgba(31, 41, 55, 0.6)' : 'rgba(249, 250, 251, 0.8)',
                      backdropFilter: 'blur(8px)',
                      border: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(226, 232, 240, 0.8)'}`,
                      color: themeStyles.colors.text.primary,
                    }}
                  >
                    {t('marketplace.loadMore', 'Load More')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GalaxyMarketplace;

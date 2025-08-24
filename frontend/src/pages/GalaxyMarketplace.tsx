import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiMagnifyingGlass,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineArrowPath,
  HiXMark,
  HiOutlineGlobeAlt,
  HiOutlineStar,
  HiCog6Tooth,
} from 'react-icons/hi2';
import { FaRocket, FaGlobeAsia, FaSpaceShuttle } from 'react-icons/fa';
import useTheme from '../stores/themeStore';
import getThemeStyles from '../lib/theme-utils';
import { PluginAPI } from '../plugins/PluginAPI';
import { EnhancedPluginCard } from '../components/marketplace/PluginCard';
import { EnhancedPluginDetails } from '../components/marketplace/PluginDetails';
import { CategoryFilter } from '../components/marketplace/CategoryFilter';
import { EnhancedFeaturedPlugins } from '../components/marketplace/FeaturedPlugins';
import { MarketplaceAdminPanel } from '../components/marketplace/MarketplaceAdminPanel';
import { useMarketplaceQueries, MarketplacePlugin } from '../hooks/queries/useMarketplaceQueries';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPlugin, setSelectedPlugin] = useState<PluginData | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('popular');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const pluginAPI = useRef(new PluginAPI()).current;

  // Initialize marketplace hooks
  const { useMarketplacePlugins, usePluginCategories, useFeaturedPlugins, useSearchPlugins } =
    useMarketplaceQueries();

  // Fetch marketplace plugins
  const { data: marketplacePlugins = [], isLoading: pluginsLoading } = useMarketplacePlugins();

  // Fetch categories
  const { data: backendCategories = [] } = usePluginCategories();

  // Fetch featured plugins
  const { data: featuredPluginsData = [], isLoading: featuredLoading } = useFeaturedPlugins();

  // Search plugins when filters are applied
  const searchFilters = useMemo(
    () => ({
      keyword: searchQuery || undefined,
      sort_by: sortBy as 'popular' | 'rating' | 'newest' | 'created_at' | 'downloads',
      tag: selectedCategory !== 'all' ? selectedCategory : undefined,
    }),
    [searchQuery, sortBy, selectedCategory]
  );

  const { data: searchResults, isLoading: searchLoading } = useSearchPlugins(searchFilters, {
    enabled: !!(searchQuery || selectedCategory !== 'all'),
  });

  // Enhanced categories with backend data
  const categories = useMemo(() => {
    const defaultCategories = [{ id: 'all', name: 'All Plugins', icon: <HiOutlineGlobeAlt /> }];

    const backendCategoriesFormatted = backendCategories.map(category => ({
      id: category,
      name: category.charAt(0).toUpperCase() + category.slice(1),
      icon: <HiOutlineGlobeAlt />,
    }));

    return [...defaultCategories, ...backendCategoriesFormatted];
  }, [backendCategories]);

  // Transform marketplace plugins to match existing PluginData interface
  const plugins = useMemo(() => {
    const pluginsToUse =
      searchQuery || selectedCategory !== 'all' ? searchResults?.plugins || [] : marketplacePlugins;

    return pluginsToUse.map(
      (plugin: MarketplacePlugin): PluginData => ({
        id: plugin.id || plugin.plugin_id || 0,
        name: plugin.name || plugin.plugin_name || 'Unknown Plugin',
        version: plugin.version || '1.0.0',
        description: plugin.description || 'No description available',
        author: plugin.author || 'Unknown',
        enabled: plugin.enabled ?? true,
        status: plugin.status,
        loadTime: plugin.loadTime,
        routes: plugin.routes,
        category: plugin.tags?.[0] || 'unknown',
        rating: (plugin.ratingAverage || plugin.rating_average || 0).toString(),
        downloads: plugin.downloads || 0,
        lastUpdated: plugin.lastUpdated || new Date(),
      })
    );
  }, [marketplacePlugins, searchResults, searchQuery, selectedCategory]);

  // Featured plugins with proper transformation
  const featuredPlugins = useMemo(() => {
    let pluginsToFeature = featuredPluginsData;

    // If no featured plugins from backend, use the first 3 marketplace plugins as featured
    if (featuredPluginsData.length === 0 && marketplacePlugins.length > 0) {
      pluginsToFeature = marketplacePlugins.slice(0, 3);
    }

    return pluginsToFeature.map(
      (plugin: MarketplacePlugin): PluginData => ({
        id: plugin.id || plugin.plugin_id || 0,
        name: plugin.name || plugin.plugin_name || 'Unknown Plugin',
        version: plugin.version || '1.0.0',
        description: plugin.description || 'No description available',
        author: plugin.author || 'Unknown',
        enabled: plugin.enabled ?? true,
        status: plugin.status,
        loadTime: plugin.loadTime,
        routes: plugin.routes,
        category: plugin.tags?.[0] || 'unknown',
        rating: (plugin.ratingAverage || plugin.rating_average || 0).toString(),
        downloads: plugin.downloads || 0,
        lastUpdated: plugin.lastUpdated || new Date(),
      })
    );
  }, [featuredPluginsData, marketplacePlugins]);

  // Loading state
  const loading = pluginsLoading || searchLoading || featuredLoading;

  // Simplified background animation with better performance
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let lastFrameTime = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);
    resizeCanvas();

    // Create optimized star field
    const stars: { x: number; y: number; radius: number; opacity: number; speed: number }[] = [];
    const numStars = Math.min(100, Math.floor((canvas.width * canvas.height) / 10000));

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.8 + 0.2,
        speed: Math.random() * 0.02 + 0.01,
      });
    }

    // Single nebula for better performance
    const nebula = {
      x: canvas.width * 0.7,
      y: canvas.height * 0.3,
      radius: Math.min(canvas.width, canvas.height) * 0.3,
    };

    // Optimized animation loop
    const animate = (timestamp: number) => {
      const elapsed = timestamp - lastFrameTime;
      if (elapsed < frameInterval) {
        animationId = requestAnimationFrame(animate);
        return;
      }

      lastFrameTime = timestamp - (elapsed % frameInterval);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw nebula with better performance
      if (isDark) {
        const gradient = ctx.createRadialGradient(
          nebula.x,
          nebula.y,
          0,
          nebula.x,
          nebula.y,
          nebula.radius
        );
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.1)');
        gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.05)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(nebula.x, nebula.y, nebula.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw and update stars efficiently
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(100, 100, 100, 0.6)';
      stars.forEach(star => {
        ctx.globalAlpha = star.opacity;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();

        // Update star position
        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = -star.radius;
          star.x = Math.random() * canvas.width;
        }
      });

      ctx.globalAlpha = 1;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
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
          const aRating = parseFloat(a.rating || '0');
          const bRating = parseFloat(b.rating || '0');
          return bRating - aRating;
        } else if (sortBy === 'newest') {
          // Ensure we're comparing Date objects
          const aDate = a.lastUpdated instanceof Date ? a.lastUpdated : new Date();
          const bDate = b.lastUpdated instanceof Date ? b.lastUpdated : new Date();
          return bDate.getTime() - aDate.getTime();
        }
        return 0;
      });
  }, [plugins, searchQuery, selectedCategory, sortBy]);

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
      <EnhancedPluginDetails
        plugin={selectedPlugin}
        onBack={handleBackFromDetails}
        pluginAPI={pluginAPI}
      />
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Cosmic background */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute left-0 top-0 z-0 h-full w-full"
        style={{ opacity: isDark ? 0.8 : 0.2 }}
      />

      {/* Static spaceship in background */}
      <div className="pointer-events-none absolute bottom-[15%] right-[10%] z-0 opacity-40">
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
      <div className="pointer-events-none absolute right-10 top-20 z-0 opacity-50">
        <FaGlobeAsia className="h-12 w-12 text-purple-300" />
      </div>

      {/* Enhanced Header */}
      <motion.div
        className="relative z-10 flex flex-col gap-6 p-6 pb-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              className="relative rounded-lg p-3"
              style={{
                background: themeStyles.card.background,
                border: `1px solid ${themeStyles.card.borderColor}`,
                boxShadow: themeStyles.colors.shadow.sm,
              }}
              whileHover={{ scale: 1.02, y: -1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <FaRocket
                className="h-6 w-6"
                style={{
                  color: themeStyles.colors.brand.primary,
                }}
              />
            </motion.div>
            <div>
              <motion.h1
                className="text-2xl font-semibold"
                style={{ color: themeStyles.colors.text.primary }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                {t('marketplace.title', 'Galaxy Marketplace')}
              </motion.h1>
              <motion.p
                className="mt-1 text-sm"
                style={{ color: themeStyles.colors.text.secondary }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                {t(
                  'marketplace.description',
                  'Discover and install plugins to enhance your KubeStellar experience'
                )}
              </motion.p>
            </div>
          </div>

          {/* Enhanced Admin Panel Button */}
          <motion.button
            onClick={() => setShowAdminPanel(true)}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            style={{
              background: themeStyles.card.background,
              border: `1px solid ${themeStyles.card.borderColor}`,
              color: themeStyles.colors.text.primary,
              boxShadow: themeStyles.colors.shadow.sm,
            }}
          >
            <HiCog6Tooth className="h-4 w-4" />
            <span>Admin Panel</span>
          </motion.button>
        </div>

        {/* Enhanced Search and filters */}
        <motion.div
          className="flex flex-col gap-4 lg:flex-row"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <div className="relative flex-grow">
            <div
              className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 transition-colors duration-300"
              style={{
                color: searchFocused
                  ? themeStyles.colors.brand.primary
                  : themeStyles.colors.text.secondary,
              }}
            >
              <HiMagnifyingGlass className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder={t(
                'marketplace.searchPlaceholder',
                'Search plugins, authors, categories...'
              )}
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full rounded-lg border py-2.5 pl-10 pr-10 text-sm outline-none transition-all duration-300 focus:ring-2"
              style={{
                background: themeStyles.card.background,
                border: searchFocused
                  ? `2px solid ${themeStyles.colors.brand.primary}`
                  : `1px solid ${themeStyles.card.borderColor}`,
                color: themeStyles.colors.text.primary,
                boxShadow: searchFocused
                  ? `0 0 0 3px ${themeStyles.colors.brand.primary}20`
                  : themeStyles.colors.shadow.sm,
              }}
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 transition-all hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={handleClearSearch}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <HiXMark
                    className="h-4 w-4"
                    style={{ color: themeStyles.colors.text.secondary }}
                  />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-3">
            <motion.button
              onClick={handleToggleFilters}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: showFilters
                  ? themeStyles.colors.brand.primary
                  : themeStyles.card.background,
                border: `1px solid ${showFilters ? 'transparent' : themeStyles.card.borderColor}`,
                color: showFilters ? '#ffffff' : themeStyles.colors.text.primary,
                boxShadow: showFilters
                  ? `0 4px 15px ${themeStyles.colors.brand.primary}40`
                  : themeStyles.colors.shadow.sm,
              }}
            >
              <HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
              <span>{t('marketplace.filters', 'Filters')}</span>
            </motion.button>

            <div className="relative min-w-[200px]">
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="z-10 w-full cursor-pointer appearance-none rounded-lg px-4 py-3 pr-12 text-sm font-medium transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  background: themeStyles.card.background,
                  border: `1px solid ${themeStyles.card.borderColor}`,
                  color: themeStyles.colors.text.primary,
                  boxShadow: themeStyles.colors.shadow.sm,
                }}
              >
                <option
                  value="popular"
                  style={{
                    background: themeStyles.card.background,
                    color: themeStyles.colors.text.primary,
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: '400',
                  }}
                >
                  {t('marketplace.sortPopular', 'Most Popular')}
                </option>
                <option
                  value="rating"
                  style={{
                    background: themeStyles.card.background,
                    color: themeStyles.colors.text.primary,
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: '400',
                  }}
                >
                  {t('marketplace.sortRating', 'Highest Rated')}
                </option>
                <option
                  value="newest"
                  style={{
                    background: themeStyles.card.background,
                    color: themeStyles.colors.text.primary,
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: '400',
                  }}
                >
                  {t('marketplace.sortNewest', 'Recently Added')}
                </option>
              </select>
              <div
                className="pointer-events-none absolute inset-y-0 right-0 z-20 flex items-center pr-4 transition-transform duration-300"
                style={{ color: themeStyles.colors.text.secondary }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 transform transition-all duration-300 ease-in-out"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  style={{
                    filter: `drop-shadow(0 2px 4px ${isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.15)'})`,
                  }}
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
        </motion.div>

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
      </motion.div>

      {/* Enhanced Main content */}
      <div className="relative z-10 flex-grow overflow-y-auto p-6 pt-4">
        {loading ? (
          <motion.div
            className="flex h-full min-h-[400px] items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col items-center gap-6">
              <motion.div
                className="relative"
                animate={{
                  rotate: 360,
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: 'linear',
                }}
              >
                <div
                  className="h-16 w-16 rounded-full border-4 border-transparent"
                  style={{
                    borderTopColor: themeStyles.colors.brand.primary,
                    borderRightColor: themeStyles.colors.brand.primary + '60',
                  }}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p
                  className="text-lg font-medium"
                  style={{ color: themeStyles.colors.text.primary }}
                >
                  {t('common.loading', 'Loading amazing plugins...')}
                </p>
                <p className="text-sm" style={{ color: themeStyles.colors.text.secondary }}>
                  Discovering the galaxy of possibilities
                </p>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="space-y-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Featured plugins section */}
            <EnhancedFeaturedPlugins
              plugins={featuredPlugins}
              onSelectPlugin={handleSelectPlugin}
            />

            {/* All plugins grid with enhanced header */}
            <div>
              <motion.div
                className="mb-6 flex items-center justify-between"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center gap-3">
                  {selectedCategory !== 'all' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500 }}
                    >
                      <HiOutlineStar
                        className="h-5 w-5"
                        style={{ color: themeStyles.colors.brand.primary }}
                      />
                    </motion.div>
                  )}
                  <h2
                    className="text-xl font-semibold"
                    style={{ color: themeStyles.colors.text.primary }}
                  >
                    {searchQuery || selectedCategory !== 'all'
                      ? t('marketplace.searchResults', 'Search Results')
                      : t('marketplace.allPlugins', 'All Plugins')}
                    <motion.span
                      className="ml-2 rounded-full px-2 py-0.5 text-sm font-normal"
                      style={{
                        color: themeStyles.colors.text.secondary,
                        background: themeStyles.card.background,
                        border: `1px solid ${themeStyles.card.borderColor}`,
                      }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      {filteredPlugins.length} {filteredPlugins.length === 1 ? 'plugin' : 'plugins'}
                    </motion.span>
                  </h2>
                </div>

                {/* Quick actions */}
                {(searchQuery || selectedCategory !== 'all') && (
                  <motion.button
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all"
                    onClick={handleClearFilters}
                    style={{
                      background: themeStyles.colors.brand.primary,
                      color: '#ffffff',
                      boxShadow: themeStyles.colors.shadow.md,
                    }}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <HiXMark className="h-4 w-4" />
                    {t('marketplace.clearFilters', 'Clear Filters')}
                  </motion.button>
                )}
              </motion.div>

              {filteredPlugins.length === 0 ? (
                <motion.div
                  className="relative overflow-hidden rounded-lg py-16 text-center"
                  style={{
                    background: themeStyles.card.background,
                    border: `1px solid ${themeStyles.card.borderColor}`,
                    boxShadow: themeStyles.colors.shadow.sm,
                  }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="relative z-10">
                    <motion.div
                      className="mb-6 flex justify-center"
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <HiMagnifyingGlass
                        className="h-16 w-16 opacity-30"
                        style={{ color: themeStyles.colors.text.secondary }}
                      />
                    </motion.div>
                    <motion.h3
                      className="mb-2 text-xl font-semibold"
                      style={{ color: themeStyles.colors.text.primary }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      No plugins found
                    </motion.h3>
                    <motion.p
                      className="mx-auto mb-6 max-w-md text-sm"
                      style={{ color: themeStyles.colors.text.secondary }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      {searchQuery
                        ? 'Try adjusting your search terms or browse all plugins'
                        : 'No plugins match your current filters'}
                    </motion.p>
                    <motion.button
                      className="rounded-lg px-6 py-2.5 text-sm font-medium transition-all"
                      onClick={handleClearFilters}
                      style={{
                        background: themeStyles.colors.brand.primary,
                        color: '#ffffff',
                        boxShadow: themeStyles.colors.shadow.md,
                      }}
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      {t('marketplace.clearFilters', 'Show All Plugins')}
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.1,
                        delayChildren: 0.2,
                      },
                    },
                  }}
                >
                  {/* Render plugins with virtualization for better performance */}
                  {filteredPlugins.slice(0, 12).map(plugin => (
                    <motion.div
                      key={plugin.id}
                      variants={{
                        hidden: { opacity: 0, y: 30, scale: 0.9 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          scale: 1,
                          transition: {
                            type: 'spring',
                            stiffness: 100,
                            damping: 15,
                          },
                        },
                      }}
                    >
                      <EnhancedPluginCard
                        plugin={plugin}
                        onClick={() => handleSelectPlugin(plugin)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Enhanced Load more button */}
              {filteredPlugins.length > 12 && (
                <motion.div
                  className="mt-8 flex justify-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <motion.button
                    className="flex items-center gap-3 rounded-lg px-6 py-3 text-sm font-medium transition-all"
                    style={{
                      background: themeStyles.card.background,
                      border: `1px solid ${themeStyles.card.borderColor}`,
                      color: themeStyles.colors.text.primary,
                      boxShadow: themeStyles.colors.shadow.md,
                    }}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <HiOutlineArrowPath className="h-4 w-4" />
                    {t('marketplace.loadMore', 'Load More Plugins')}
                    <span className="text-xs opacity-70">
                      ({filteredPlugins.length - 12} remaining)
                    </span>
                  </motion.button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Admin Panel */}
      <MarketplaceAdminPanel isOpen={showAdminPanel} onClose={() => setShowAdminPanel(false)} />
    </div>
  );
};

export default GalaxyMarketplace;

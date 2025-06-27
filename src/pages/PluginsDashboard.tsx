import React from 'react';
import { motion } from 'framer-motion';
import { InstalledPluginCards } from '../components/InstalledPluginCards';
import useTheme from '../stores/themeStore';
import getThemeStyles from '../lib/theme-utils';

export const PluginsDashboard: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);

  return (
    <motion.div
      className="min-h-screen p-6"
      style={{ background: themeStyles.colors.bg.primary }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="mb-4 flex items-center gap-3">
            <div
              className="rounded-xl p-3"
              style={{
                background: `${themeStyles.colors.brand.primary}20`,
                border: `1px solid ${themeStyles.colors.brand.primary}40`,
              }}
            >
              <span className="text-2xl">🧩</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: themeStyles.colors.text.primary }}>
                Plugin Dashboard
              </h1>
              <p className="text-lg" style={{ color: themeStyles.colors.text.secondary }}>
                Manage and monitor your installed plugins
              </p>
            </div>
          </div>

          <div
            className="h-1 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${themeStyles.colors.brand.primary}, ${themeStyles.colors.brand.secondary})`,
            }}
          />
        </motion.div>

        {/* Plugin Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <InstalledPluginCards />
        </motion.div>
      </div>
    </motion.div>
  );
};

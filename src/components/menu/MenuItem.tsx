import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { IconType } from 'react-icons';
import { motion } from 'framer-motion';
import useTheme from '../../stores/themeStore';
import getThemeStyles from '../../lib/theme-utils';

interface MenuItemProps {
  onClick?: () => void;
  catalog: string;
  listItems: Array<{
    isLink: boolean;
    url?: string;
    icon: IconType;
    label: string;
    onClick?: () => void;
  }>;
  centered?: boolean;
  collapsed?: boolean;
  isAnimating?: boolean;
  delay?: number;
}

const MenuItem: React.FC<MenuItemProps> = ({
  onClick,
  catalog,
  listItems,
  centered,
  collapsed = false,
  isAnimating = false,
  delay = 0,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);
  const location = useLocation();

  // Animation variants
  const itemVariants = {
    expanded: {
      opacity: 1,
      width: '100%',
      transition: { type: 'spring', stiffness: 300, damping: 20, delay },
    },
    collapsed: {
      width: collapsed ? 'fit-content' : '100%',
      transition: { type: 'spring', stiffness: 300, damping: 20, delay },
    },
  };

  const textVariants = {
    expanded: {
      opacity: 1,
      x: 0,
      display: 'block',
      transition: { duration: 0.2, delay: delay + 0.1 },
    },
    collapsed: {
      opacity: 0,
      x: -10,
      transitionEnd: {
        display: 'none',
      },
      transition: { duration: 0.2 },
    },
  };

  // Custom tooltip component for better visibility
  const CustomTooltip = ({ label }: { label: string }) => {
    if (!collapsed) return null;

    return (
      <div
        className="pointer-events-none absolute left-14 top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-lg px-3 py-2 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderColor: isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.8)',
          color: isDark ? '#f8fafc' : '#1e293b',
          border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.8)'}`,
          boxShadow: isDark
            ? '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.2)'
            : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div
          className="absolute left-0 top-1/2 h-3 w-3 -translate-x-[6px] -translate-y-1/2 rotate-45"
          style={{
            background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.8)'}`,
            borderRight: 'none',
            borderTop: 'none',
          }}
        ></div>
        {label}
      </div>
    );
  };

  return (
    <motion.div
      className={`flex w-full flex-col ${collapsed ? 'items-center' : 'items-stretch'} group mb-6 gap-3`}
      role="navigation"
      variants={itemVariants}
      initial={false}
      animate={collapsed ? 'collapsed' : 'expanded'}
    >
      {/* Category header - show only first letter when collapsed */}
      <motion.span
        className={`border-l-[3px] border-transparent px-2 text-sm font-semibold 
        uppercase tracking-[0.15em] transition-all 
        duration-300 ${centered || collapsed ? 'text-center' : ''}`}
        style={{ color: themeStyles.menu.catalog.color }}
        animate={{
          opacity: 1,
          scale: collapsed ? 0.9 : 1,
          fontSize: collapsed ? '0.7rem' : '0.875rem',
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30, delay }}
      >
        {collapsed ? catalog.charAt(0) : catalog}
      </motion.span>

      {/* Menu items */}
      <div className={`flex w-full flex-col gap-2 ${collapsed ? 'items-center' : ''}`}>
        {listItems.map((listItem, index) => {
          if (listItem.isLink) {
            return (
              <NavLink
                key={index}
                onClick={onClick}
                to={listItem.url || ''}
                className="relative"
                end={listItem.url === '/plugins'} // Only exact match for plugin management
              >
                {({ isActive }) => {
                  // For plugin routes, we need custom active logic
                  const isPluginManagementRoute = listItem.url === '/plugins';
                  const isClusterManagementRoute = listItem.url === '/plugins/clusters';
                  const currentPath = location.pathname;

                  // Custom active state logic
                  let customIsActive = isActive;

                  if (isPluginManagementRoute) {
                    // Plugin Management is active only when exactly on /plugins
                    customIsActive = currentPath === '/plugins';
                  } else if (isClusterManagementRoute) {
                    // Cluster Management is active when on /plugins/clusters
                    customIsActive = currentPath === '/plugins/clusters';
                  }

                  return (
                    <div
                      className={`relative flex items-center ${collapsed ? 'h-12 min-h-0 w-12 justify-center p-0' : 'w-full justify-start px-4 py-3'} 
                        rounded-xl transition-all duration-300 ease-out
                        ${collapsed ? '' : 'hover:translate-x-2'} 
                        group/item group relative hover:shadow-md focus:outline-none`}
                      style={
                        customIsActive
                          ? {
                              background: themeStyles.menu.itemActive,
                              boxShadow: collapsed ? 'none' : themeStyles.colors.shadow.sm,
                            }
                          : {}
                      }
                    >
                      <div className="relative flex items-center justify-center">
                        <motion.div
                          animate={{
                            scale: collapsed ? 1.2 : 1,
                            x: collapsed ? 0 : 0,
                          }}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className={`relative ${isAnimating ? 'transition-none' : 'transition-transform duration-300'}`}
                        >
                          <listItem.icon
                            className="shrink-0 text-2xl"
                            style={{
                              color: customIsActive
                                ? themeStyles.colors.brand.primary
                                : themeStyles.menu.icon.color,
                              filter: themeStyles.menu.icon.shadow,
                            }}
                            aria-hidden="true"
                          />

                          {/* Ripple effect for active item in collapsed state */}
                          {collapsed && customIsActive && (
                            <motion.div
                              className="absolute inset-0 rounded-full"
                              style={{ backgroundColor: themeStyles.menu.itemActive }}
                              animate={{
                                scale: [0.8, 1.2, 1],
                                opacity: [0.5, 0.3, 0],
                              }}
                              transition={{
                                repeat: Infinity,
                                duration: 2,
                                repeatType: 'loop',
                              }}
                            />
                          )}
                        </motion.div>

                        {/* Text label */}
                        {!collapsed && (
                          <motion.span
                            className="ml-3 text-sm font-medium tracking-wide"
                            style={{
                              color: customIsActive
                                ? themeStyles.colors.brand.primary
                                : themeStyles.colors.text.primary,
                            }}
                            variants={textVariants}
                            initial="expanded"
                            animate={collapsed ? 'collapsed' : 'expanded'}
                          >
                            {listItem.label}
                          </motion.span>
                        )}

                        {/* Enhanced custom tooltip */}
                        <CustomTooltip label={listItem.label} />
                      </div>
                    </div>
                  );
                }}
              </NavLink>
            );
          } else {
            return (
              <button
                key={index}
                onClick={listItem.onClick}
                className={`relative flex items-center ${collapsed ? 'h-12 w-12 justify-center' : 'w-full gap-4'} 
                rounded-xl px-4 py-3 transition-all duration-300 
                hover:${collapsed ? 'scale-110' : 'translate-x-2'} group/item
                group hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50`}
                style={{
                  backgroundImage: collapsed ? 'none' : themeStyles.effects.gradients.subtle,
                }}
              >
                <motion.div
                  animate={{
                    scale: collapsed ? 1.2 : 1,
                    x: collapsed ? 0 : 0,
                  }}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className={`relative ${isAnimating ? 'transition-none' : 'transition-transform duration-300'}`}
                >
                  <listItem.icon
                    className="shrink-0 text-2xl"
                    style={{
                      color: themeStyles.menu.icon.color,
                      filter: themeStyles.menu.icon.shadow,
                    }}
                  />
                </motion.div>

                {!collapsed && (
                  <motion.span
                    className="text-sm font-medium tracking-wide"
                    style={{ color: themeStyles.colors.text.primary }}
                    variants={textVariants}
                    initial="expanded"
                    animate={collapsed ? 'collapsed' : 'expanded'}
                  >
                    {listItem.label}
                  </motion.span>
                )}

                {/* Enhanced custom tooltip */}
                <CustomTooltip label={listItem.label} />
              </button>
            );
          }
        })}
      </div>
    </motion.div>
  );
};

export default MenuItem;

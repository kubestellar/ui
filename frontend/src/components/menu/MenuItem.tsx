import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { IconType } from 'react-icons';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import useTheme from '../../stores/themeStore';
import Tooltip from './Tooltip';

interface MenuItemProps {
  onClick?: () => void;
  catalog: string;
  listItems: Array<{
    isLink: boolean;
    url?: string;
    icon: IconType | string;
    label: string;
    isPlugin?: boolean;
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
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

  // Animation variants
  const itemVariants: Variants = {
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

  const textVariants: Variants = {
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

  // Helper for mouse enter to set tooltip position
  const handleMouseEnter = (index: number, e: React.MouseEvent) => {
    setHoveredItem(index);
    if (collapsed) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setTooltipPos({
        top: rect.top + rect.height / 2,
        left: rect.right + 12,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
    setTooltipPos(null);
  };

  return (
    <motion.div
      className={`flex w-full flex-col ${collapsed ? 'items-center' : 'items-stretch'} group mb-3 gap-3`}
      role="navigation"
      variants={itemVariants}
      initial={false}
      animate={collapsed ? 'collapsed' : 'expanded'}
    >
      {/* Category header */}
      <div
        className="relative rounded-lg px-3 py-1.5"
        onMouseEnter={e => {
          if (collapsed) {
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            setHoveredItem(-1); // Use -1 to indicate header
            setTooltipPos({
              top: rect.top + rect.height / 2,
              left: rect.right + 12,
            });
          }
        }}
        onMouseLeave={() => {
          if (collapsed) {
            setHoveredItem(null);
            setTooltipPos(null);
          }
        }}
      >
        <span
          className={`text-sm font-semibold uppercase tracking-[0.15em] transition-colors 
          duration-300 ${centered || collapsed ? 'text-center' : 'pl-2'}`}
          style={{
            color: isDark ? 'rgba(226, 232, 240, 0.9)' : 'rgba(30, 41, 59, 0.9)',
          }}
        >
          {collapsed ? catalog.charAt(0) : catalog}
        </span>
        {/* Tooltip for collapsed header */}
        {collapsed && hoveredItem === -1 && tooltipPos && (
          <Tooltip position={tooltipPos}>{catalog}</Tooltip>
        )}
      </div>

      {/* Menu items */}
      <div className={`flex w-full flex-col gap-2 ${collapsed ? 'items-center' : ''}`}>
        {listItems.map((listItem, index) => {
          if (listItem.isLink) {
            return (
              <div key={index} className="relative">
                <NavLink
                  onClick={onClick}
                  to={listItem.url || ''}
                  className="relative w-full"
                  onMouseEnter={e => handleMouseEnter(index, e)}
                  onMouseLeave={handleMouseLeave}
                >
                  {({ isActive }) => (
                    <div
                      className={`relative flex items-center ${collapsed ? 'h-10 min-h-0 w-10 justify-center p-0' : 'w-full justify-start px-4 py-3'} 
                        rounded-xl transition-all duration-200 ease-out
                        ${collapsed ? '' : 'hover:translate-x-1'} 
                        group/item relative hover:shadow-md focus:outline-none`}
                      style={
                        isActive || hoveredItem === index
                          ? {
                              background: isActive
                                ? isDark
                                  ? 'rgba(59, 130, 246, 0.15)'
                                  : 'rgba(59, 130, 246, 0.08)'
                                : isDark
                                  ? 'rgba(59, 130, 246, 0.1)'
                                  : 'rgba(59, 130, 246, 0.05)',
                              boxShadow: collapsed
                                ? 'none'
                                : isDark
                                  ? '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -2px rgba(0, 0, 0, 0.1)'
                                  : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
                            }
                          : {}
                      }
                    >
                      {/* Active item indicator */}
                      <AnimatePresence>
                        {isActive && !collapsed && (
                          <motion.div
                            className="absolute bottom-0 left-0 top-0 w-1 rounded-l-full"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                              background: isDark ? '#60a5fa' : '#3b82f6',
                            }}
                          />
                        )}
                      </AnimatePresence>

                      <div className="relative flex items-center justify-center">
                        <motion.div
                          animate={{
                            scale: collapsed ? 1.2 : 1,
                          }}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className={`relative ${isAnimating ? 'transition-none' : 'transition-transform duration-200'}`}
                        >
                          {listItem?.isPlugin ? (
                            <img
                              src={listItem.icon as string}
                              alt={listItem.label}
                              className="h-6 w-6 shrink-0"
                              style={{
                                color: isActive
                                  ? isDark
                                    ? '#60a5fa'
                                    : '#3b82f6'
                                  : hoveredItem === index
                                    ? isDark
                                      ? '#93c5fd'
                                      : '#2563eb'
                                    : isDark
                                      ? '#cbd5e1'
                                      : '#64748b',
                                filter: isActive
                                  ? isDark
                                    ? 'drop-shadow(0 0 6px rgba(96, 165, 250, 0.5))'
                                    : 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.3))'
                                  : 'none',
                              }}
                            />
                          ) : (
                            <listItem.icon
                              className="shrink-0 text-xl"
                              style={{
                                color: isActive
                                  ? isDark
                                    ? '#60a5fa'
                                    : '#3b82f6'
                                  : hoveredItem === index
                                    ? isDark
                                      ? '#93c5fd'
                                      : '#2563eb'
                                    : isDark
                                      ? '#cbd5e1'
                                      : '#64748b',
                                filter: isActive
                                  ? isDark
                                    ? 'drop-shadow(0 0 6px rgba(96, 165, 250, 0.5))'
                                    : 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.3))'
                                  : 'none',
                              }}
                              aria-hidden="true"
                            />
                          )}

                          {/* Enhanced ripple effect */}
                          {isActive && (
                            <motion.div
                              className="absolute inset-0 rounded-full"
                              style={{
                                backgroundColor: isDark
                                  ? 'rgba(96, 165, 250, 0.2)'
                                  : 'rgba(59, 130, 246, 0.15)',
                              }}
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
                            className="ml-3 whitespace-nowrap text-sm font-medium"
                            style={{
                              color: isActive
                                ? isDark
                                  ? '#60a5fa'
                                  : '#3b82f6'
                                : hoveredItem === index
                                  ? isDark
                                    ? '#93c5fd'
                                    : '#2563eb'
                                  : isDark
                                    ? '#e2e8f0'
                                    : '#334155',
                            }}
                            variants={textVariants}
                            initial="expanded"
                            animate={collapsed ? 'collapsed' : 'expanded'}
                          >
                            {listItem.label}
                          </motion.span>
                        )}

                        {/* Tooltip for collapsed menu */}
                        {collapsed && hoveredItem === index && tooltipPos && (
                          <Tooltip position={tooltipPos}>{listItem.label}</Tooltip>
                        )}
                      </div>
                    </div>
                  )}
                </NavLink>
              </div>
            );
          } else {
            return (
              <div key={index} className="relative">
                <button
                  onClick={listItem.onClick}
                  className={`relative flex items-center ${collapsed ? 'h-10 w-10 justify-center' : 'w-full gap-4'} 
                  rounded-xl px-4 py-3 transition-all duration-200 
                  hover:${collapsed ? 'scale-110' : 'translate-x-1'} group/item
                  group hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50`}
                  style={{
                    backgroundImage: collapsed
                      ? 'none'
                      : isDark
                        ? 'linear-gradient(to right, rgba(30, 41, 59, 0.5), rgba(30, 41, 59, 0.3))'
                        : 'linear-gradient(to right, rgba(241, 245, 249, 0.5), rgba(241, 245, 249, 0.3))',
                  }}
                  onMouseEnter={e => handleMouseEnter(index, e)}
                  onMouseLeave={handleMouseLeave}
                >
                  <motion.div
                    animate={{
                      scale: collapsed ? 1.2 : 1,
                    }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <listItem.icon
                      className="shrink-0 text-xl"
                      style={{
                        color:
                          hoveredItem === index
                            ? isDark
                              ? '#93c5fd'
                              : '#2563eb'
                            : isDark
                              ? '#cbd5e1'
                              : '#64748b',
                      }}
                      aria-hidden="true"
                    />
                  </motion.div>

                  {!collapsed && (
                    <motion.span
                      className="ml-3 whitespace-nowrap text-sm  font-medium "
                      style={{
                        color:
                          hoveredItem === index
                            ? isDark
                              ? '#93c5fd'
                              : '#2563eb'
                            : isDark
                              ? '#e2e8f0'
                              : '#334155',
                      }}
                      variants={textVariants}
                      initial="expanded"
                      animate={collapsed ? 'collapsed' : 'expanded'}
                    >
                      {listItem.label}
                    </motion.span>
                  )}

                  {/* Tooltip for collapsed menu */}
                  {collapsed && hoveredItem === index && tooltipPos && (
                    <Tooltip position={tooltipPos}>{listItem.label}</Tooltip>
                  )}
                </button>
              </div>
            );
          }
        })}
      </div>
    </motion.div>
  );
};

export default MenuItem;

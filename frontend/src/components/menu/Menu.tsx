import { useMenuData } from './useMenuData';
import MenuItem from './MenuItem';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useTheme from '../../stores/themeStore';
import getThemeStyles from '../../lib/theme-utils';
import { IconType } from 'react-icons';

interface MenuProps {
  collapsed?: boolean;
}

export interface MenuListItem {
  isLink: boolean;
  url?: string;
  icon: IconType;
  label: string;
  onClick?: () => void;
}

export interface MenuItemData {
  catalog: string;
  centered?: boolean;
  marginTop?: string;
  listItems: MenuListItem[];
}

const Menu: React.FC<MenuProps> = ({ collapsed = false }) => {
  const location = useLocation();
  const [isAnimating, setIsAnimating] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);
  const menu = useMenuData();

  useEffect(() => {
    setIsAnimating(false);
  }, [location.pathname]);

  const containerVariants = {
    expanded: {
      width: '100%',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.05,
        delayChildren: 0.05,
      },
    },
    collapsed: {
      width: '100%',
      alignItems: 'center',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.05,
        staggerDirection: -1,
      },
    },
  };

  const bgStyles = {
    background: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(12px)',
    borderColor: isDark ? 'rgba(71, 85, 105, 0.2)' : 'rgba(226, 232, 240, 0.7)',
    boxShadow: isDark
      ? '0 8px 32px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
      : '0 8px 32px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.02) inset',
    overflowY: 'auto' as const,
    scrollbarWidth: 'none',
   
   
    maxHeight: 'calc(100vh - 160px)',
  };

  return (
    <motion.div
      className="flex w-full flex-col rounded-xl border backdrop-blur-sm"
      style={bgStyles }
      variants={containerVariants}
      initial={false}
      animate={collapsed ? 'collapsed' : 'expanded'}
      onAnimationStart={() => setIsAnimating(true)}
      onAnimationComplete={() => setIsAnimating(false)}
      role="menu"
    >
      {/* Accent Line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />

      {/* Menu Items */}
      <div className="relative z-10 space-y-4 p-3">
        {menu.map((item: MenuItemData, index: number) => (
          <div
            key={index}
            className="relative"
            aria-label={collapsed ? item.catalog : undefined}
          >
            {/* Divider between sections */}
            {index > 0 && (
              <div className="relative my-2">
                <div
                  className="mx-2 h-px rounded-full"
                  style={{
                    background: isDark
                      ? 'linear-gradient(to right, transparent, rgba(148, 163, 184, 0.15), transparent)'
                      : 'linear-gradient(to right, transparent, rgba(148, 163, 184, 0.12), transparent)',
                  }}
                />
              </div>
            )}

            <MenuItem
              key={index}
              catalog={item.catalog}
              listItems={item.listItems}
              centered={collapsed || item.centered}
              collapsed={collapsed}
              isAnimating={isAnimating}
              delay={index * 0.05}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default Menu;

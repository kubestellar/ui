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
  url: string;
  icon: IconType;
  label: string;
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

  // Reset animation state when route changes
  useEffect(() => {
    setIsAnimating(false);
  }, [location.pathname]);

  // Animation variants
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
      width: collapsed ? '100%' : '100%',
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

  return (
    <motion.div
      className="flex w-full flex-col rounded-xl border p-2 py-4 backdrop-blur-sm"
      style={{
        background: themeStyles.effects.glassMorphism.background as string,
        backdropFilter: themeStyles.effects.glassMorphism.backdropFilter as string,
        borderColor: themeStyles.menu.borderColor as string,
        boxShadow: themeStyles.colors.shadow.md as string,
      }}
      variants={containerVariants}
      initial={false}
      animate={collapsed ? 'collapsed' : 'expanded'}
      onAnimationStart={() => setIsAnimating(true)}
      onAnimationComplete={() => setIsAnimating(false)}
    >
      {menu.map((item: MenuItemData, index: number) => (
        <MenuItem
          key={index}
          catalog={item.catalog}
          listItems={item.listItems}
          centered={collapsed || item.centered}
          collapsed={collapsed}
          isAnimating={isAnimating}
          delay={index * 0.05}
        />
      ))}
    </motion.div>
  );
};

export default Menu;

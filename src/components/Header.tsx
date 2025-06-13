import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { HiBars3CenterLeft, HiXMark } from 'react-icons/hi2';
import { FiSun, FiMoon } from 'react-icons/fi';
import useTheme from '../stores/themeStore';
import HeaderSkeleton from './ui/HeaderSkeleton';
import { useAuth } from '../hooks/useAuth';
import FullScreenToggle from './ui/FullScreenToggle';
import ProfileSection from './ProfileSection';
import { motion, AnimatePresence } from 'framer-motion';
import getThemeStyles from '../lib/theme-utils';
import CommandPalette from './CommandPalette';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

interface HeaderProps {
  isLoading: boolean;
  toggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

const Header = ({ isLoading, toggleMobileMenu, isMobileMenuOpen = false }: HeaderProps) => {
  const [scrolled, setScrolled] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [lastScrollTop, setLastScrollTop] = useState(0);

  const { data: authData } = useAuth();
  const { t } = useTranslation();

  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);

  const handleScroll = useCallback(() => {
    const currentScrollTop = window.scrollY;
    const isScrolled = currentScrollTop > 10;

    if (currentScrollTop > lastScrollTop && currentScrollTop > 100) {
      setScrollDirection('down');
    } else {
      setScrollDirection('up');
    }

    setLastScrollTop(currentScrollTop);
    setScrolled(isScrolled);
  }, [lastScrollTop]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (isLoading) return <HeaderSkeleton />;

  const getHeaderStyle = () => ({
    backgroundColor: scrolled
      ? isDark
        ? 'rgba(17, 24, 39, 0.8)'
        : 'rgba(255, 255, 255, 0.8)'
      : themeStyles.colors.bg.primary,
    backdropFilter: scrolled ? 'blur(12px)' : 'none',
    borderBottom: isDark
      ? '1px solid rgba(55, 65, 81, 0.3)'
      : scrolled
        ? '1px solid rgba(226, 232, 240, 0.7)'
        : 'none',
    boxShadow: scrolled ? themeStyles.colors.shadow.sm : 'none',
    transform: `translateY(${scrollDirection === 'down' && scrolled ? '-100%' : '0'})`,
    transition: 'all 0.3s ease-in-out',
  });

  const getButtonStyle = (type: 'primary' | 'secondary' = 'secondary') => ({
    background:
      type === 'primary'
        ? themeStyles.button.primary.background
        : themeStyles.button.secondary.background,
    color:
      type === 'primary' ? themeStyles.button.primary.color : themeStyles.colors.text.primary,
    boxShadow: themeStyles.colors.shadow.sm,
  });

  const menuButtonVariants = {
    open: {
      rotate: 90,
      scale: 1.1,
    },
    closed: {
      rotate: 0,
      scale: 1,
    },
  };

  return (
    <motion.header
      className="fixed left-0 right-0 top-0 z-[3] flex w-full justify-between gap-4 px-4 py-3 xl:gap-0 xl:px-6 xl:py-4"
      style={getHeaderStyle()}
      animate={{ y: scrollDirection === 'down' && scrolled ? -100 : 0 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className={`flex items-center gap-3 transition-all duration-300 ${scrolled ? 'scale-[0.97]' : ''}`}
      >
        <div className="mr-1 w-auto p-0 xl:hidden">
          <motion.button
            onClick={toggleMobileMenu}
            className="btn btn-circle transition-all duration-300 hover:scale-105 active:scale-95"
            style={getButtonStyle()}
            aria-label={t('header.menu')}
            animate={isMobileMenuOpen ? 'open' : 'closed'}
            variants={menuButtonVariants}
            transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
          >
            <AnimatePresence mode="wait">
              {isMobileMenuOpen ? (
                <motion.div
                  key="close"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  <HiXMark className="text-2xl" style={{ color: themeStyles.colors.status.error }} />
                </motion.div>
              ) : (
                <motion.div
                  key="open"
                  initial={{ opacity: 0, rotate: 90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: -90 }}
                  transition={{ duration: 0.2 }}
                >
                  <HiBars3CenterLeft className="text-2xl" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        <Link
          to="/"
          className="group flex items-center gap-2 xl:gap-3"
          aria-label={t('header.goToHome')}
        >
          <div className="overflow-hidden rounded-lg">
            <motion.img
              src="/KubeStellar.png"
              alt={t('header.logoAlt')}
              className="h-auto w-44 object-contain xl:w-48"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </Link>
      </div>

      <div className="3xl:gap-5 flex items-center gap-2 xl:gap-4">
        {authData?.isAuthenticated ? (
          <>
            <motion.button
              onClick={toggleTheme}
              className="btn btn-circle transition-all duration-300 hover:scale-105 active:scale-95"
              style={getButtonStyle()}
              aria-label={t('header.themeToggle')}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <AnimatePresence mode="wait">
                {!isDark ? (
                  <motion.div
                    key="moon"
                    initial={{ opacity: 0, rotate: -30 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 30 }}
                    transition={{ duration: 0.3 }}
                  >
                    <FiMoon style={{ color: themeStyles.colors.brand.secondary }} className="text-xl" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="sun"
                    initial={{ opacity: 0, rotate: 30 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -30 }}
                    transition={{ duration: 0.3 }}
                  >
                    <FiSun style={{ color: themeStyles.colors.status.warning }} className="text-xl" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            <CommandPalette />
            <LanguageSwitcher />

            <div className="relative flex items-center">
              <ProfileSection />
            </div>
          </>
        ) : (
          <>
            <motion.button
              onClick={toggleTheme}
              className="btn btn-circle transition-all duration-300 hover:scale-105 active:scale-95"
              style={getButtonStyle()}
              aria-label={t('header.switchTheme', { mode: isDark ? 'light' : 'dark' })}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <AnimatePresence mode="wait">
                {!isDark ? (
                  <motion.div
                    key="moon"
                    initial={{ opacity: 0, rotate: -30 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 30 }}
                    transition={{ duration: 0.3 }}
                  >
                    <FiMoon style={{ color: themeStyles.colors.brand.secondary }} className="text-xl" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="sun"
                    initial={{ opacity: 0, rotate: 30 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -30 }}
                    transition={{ duration: 0.3 }}
                  >
                    <FiSun style={{ color: themeStyles.colors.status.warning }} className="text-xl" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            <CommandPalette />
            <LanguageSwitcher />
          </>
        )}

        <div className="hidden xl:flex">
          <FullScreenToggle
            position="inline"
            className={`btn btn-circle ${isDark ? 'bg-gray-800/80 hover:bg-gray-700/90' : 'bg-white/90 hover:bg-gray-50/95'}`}
            iconSize={20}
          />
        </div>
      </div>
    </motion.header>
  );
};

export default Header;

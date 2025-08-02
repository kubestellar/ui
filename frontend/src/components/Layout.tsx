import { Suspense, lazy, useEffect, useState } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import Header from './Header';
import useTheme from '../stores/themeStore';
import { motion, AnimatePresence } from 'framer-motion';
import getThemeStyles from '../lib/theme-utils';

// Lazy load less critical components
const Menu = lazy(() => import('./menu/Menu'));
const Footer = lazy(() => import('./Footer'));

// Enhanced loading placeholder with animated pulse
const LoadingPlaceholder = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);

  return (
    <div className="flex h-full w-full items-center justify-center p-2">
      <div
        className="relative mx-auto h-[180px] w-full max-w-4xl animate-pulse-subtle overflow-hidden rounded-lg shadow-inner"
        style={{
          background: isDark
            ? 'linear-gradient(to right, #1f2937, #374151, #1f2937)'
            : 'linear-gradient(to right, #f1f5f9, #e2e8f0, #f1f5f9)',
          boxShadow: themeStyles.colors.shadow.sm,
        }}
      >
        <div
          className="shimmer-effect absolute inset-0"
          style={{
            background: `linear-gradient(to right, transparent, ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)'}, transparent)`,
          }}
        ></div>
      </div>
    </div>
  );
};

// Enhanced page transition component using framer-motion
const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="page-content"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export function Layout() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);

  // Log the commit hash to console for debugging
  console.log('Git Commit Hash:', import.meta.env.VITE_GIT_COMMIT_HASH);
  const commitHash = import.meta.env.VITE_GIT_COMMIT_HASH || 'unknown';

  // Simulate a short loading period for smoother transitions
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400); // Reduced from 500ms for faster initial load

    return () => clearTimeout(timer);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Toggle sidebar collapsed state
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Toggle mobile menu state
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Get background pattern style based on theme
  const getBgPatternStyle = () => {
    return {
      backgroundColor: themeStyles.colors.bg.primary,
      backgroundImage: isDark
        ? 'radial-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px)'
        : 'radial-gradient(rgba(0, 0, 0, 0.02) 1px, transparent 1px)',
      backgroundSize: '20px 20px',
      backgroundPosition: '0 0',
    };
  };

  return (
    <div
      className="relative flex min-h-screen w-full flex-col justify-between transition-colors duration-300"
      style={getBgPatternStyle()}
    >
      <ScrollRestoration getKey={location => location.pathname} />

      {/* Main content */}
      <div className="flex flex-grow flex-col">
        <Header
          isLoading={isLoading}
          toggleMobileMenu={toggleMobileMenu}
          isMobileMenuOpen={isMobileMenuOpen}
        />

        <div className="relative mb-auto flex w-full gap-0 pt-14 xl:pt-[76px] 2xl:pt-[88px]">
          {/* Sidebar/Menu - Desktop */}
          <motion.aside
            className="sticky mt-1 hidden overflow-visible px-3 py-3 transition-all duration-300 xl:block"
            style={{
              height: 'calc(100vh - 76px)',
              top: '76px',
              borderRight: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.2)' : 'rgba(226, 232, 240, 0.5)'}`,
            }}
            animate={{
              width: isSidebarCollapsed ? '80px' : '280px',
              transition: { duration: 0.25, ease: 'easeInOut' },
            }}
            initial={false}
          >
            <div className="mb-3 flex justify-end">
              <div
                className="tooltip tooltip-right"
                data-tip={isSidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
              >
                <motion.button
                  onClick={toggleSidebar}
                  className={`rounded-lg border-2 p-2 shadow-md transition-all duration-200 hover:shadow-lg active:scale-95 ${isSidebarCollapsed ? 'mr-2' : ''}`}
                  style={{
                    background: isDark
                      ? 'linear-gradient(to bottom right, #3b82f6, #2563eb)'
                      : 'linear-gradient(to bottom right, #3b82f6, #1d4ed8)',
                    borderColor: isDark ? '#60a5fa' : '#3b82f6',
                    boxShadow: isDark
                      ? '0 4px 10px rgba(37, 99, 235, 0.4)'
                      : '0 4px 10px rgba(37, 99, 235, 0.2)',
                    outline: 'none', // Remove default focus outline
                    WebkitTapHighlightColor: 'transparent', // Remove mobile tap highlight
                  }}
                  whileHover={{
                    scale: 1.05,
                    boxShadow: isDark
                      ? '0 6px 14px rgba(37, 99, 235, 0.5)'
                      : '0 6px 14px rgba(37, 99, 235, 0.3)',
                  }}
                  aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  whileTap={{ scale: 0.9 }}
                  onFocus={e => {
                    e.currentTarget.style.boxShadow = isDark
                      ? '0 0 0 3px rgba(96, 165, 250, 0.3)'
                      : '0 0 0 3px rgba(59, 130, 246, 0.3)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.boxShadow = isDark
                      ? '0 4px 10px rgba(37, 99, 235, 0.4)'
                      : '0 4px 10px rgba(37, 99, 235, 0.2)';
                  }}
                >
                  <div
                    className="flex h-5 w-5 items-center justify-center"
                    style={{
                      color: '#ffffff',
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: isSidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease',
                      }}
                    >
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </div>
                </motion.button>
              </div>
            </div>
            <motion.div key={isSidebarCollapsed ? 'collapsed' : 'expanded'}>
              <Suspense fallback={<LoadingPlaceholder />}>
                <Menu collapsed={isSidebarCollapsed} />
              </Suspense>
            </motion.div>
          </motion.aside>

          {/* Mobile Menu - Overlay */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-20 backdrop-blur-sm xl:hidden"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Close menu"
                />
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="fixed left-0 top-[72px] z-30 h-[calc(100vh-72px)] w-[280px] overflow-y-auto xl:hidden"
                  style={{
                    background: isDark ? 'rgba(15, 23, 42, 0.97)' : 'rgba(255, 255, 255, 0.97)',
                    backdropFilter: 'blur(12px)',
                    borderRight: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.2)' : 'rgba(226, 232, 240, 0.5)'}`,
                    boxShadow: isDark
                      ? '0 8px 32px rgba(0, 0, 0, 0.3)'
                      : '0 8px 32px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <div className="px-3 py-3">
                    <Suspense fallback={<LoadingPlaceholder />}>
                      <Menu collapsed={false} />
                    </Suspense>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Main content area */}
          <motion.main
            className="w-full overflow-hidden px-2 py-2 sm:px-3 xl:flex-1 xl:px-4 xl:py-3 2xl:px-5"
            variants={{
              expanded: { marginLeft: 0 },
              collapsed: { marginLeft: 0 },
            }}
            animate={isSidebarCollapsed ? 'collapsed' : 'expanded'}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ opacity: isLoading ? 0 : 1 }}
          >
            <Suspense fallback={<LoadingPlaceholder />}>
              <PageTransition>
                <div className="mx-auto max-w-full">
                  <Outlet />
                </div>
              </PageTransition>
            </Suspense>
          </motion.main>
        </div>
      </div>

      {/* Footer with conditional rendering */}
      <div className="transition-opacity duration-300" style={{ opacity: isLoading ? 0 : 1 }}>
        <Suspense fallback={<div className="h-12"></div>}>
          <Footer commitHash={commitHash} />
        </Suspense>
      </div>

      {/* Enhanced scroll to top button */}
      <ScrollToTop />
    </div>
  );
}

// Enhanced scroll to top button with smoother animations
const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);

  // Show button when page is scrolled down
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  // Scroll back to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 rounded-full p-3 text-white shadow-lg transition-all duration-300 hover:shadow-xl"
          style={{
            background: themeStyles.effects.gradients.primary,
            boxShadow: themeStyles.colors.shadow.lg,
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Scroll to top"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
};

import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import useTheme from '../stores/themeStore';
import { HiLanguage } from 'react-icons/hi2';
import getThemeStyles from '../lib/theme-utils';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'ja', name: '日本語' },
    { code: 'es', name: 'Español' },
    { code: 'de', name: 'Deutsch' },
    { code: 'fr', name: 'Français' },
    { code: 'it', name: 'Italiano' },
    { code: 'SC', name: '简体中文' }, // zh-Hans
    { code: 'TC', name: '繁體中文' }, // zh-Hant
    { code: 'pt', name: 'Português' },
  ];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  const currentLang = languages.find(lang => lang.code === i18n.language) || languages[0];
  const isLoginPage = window.location.pathname.includes('login');

  // Icon animation variants
  const iconVariants: Variants = {
    rest: {
      rotate: 0,
      scale: 1,
    },
    hover: {
      rotate: 15,
      scale: 1.1,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 8,
      },
    },
    tap: {
      rotate: 0,
      scale: 0.9,
    },
  };

  // 🧠 Attach keydown listener only when dropdown is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => (prev === null ? 0 : (prev + 1) % languages.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev =>
          prev === null ? languages.length - 1 : (prev - 1 + languages.length) % languages.length
        );
      } else if (e.key === 'Enter' && focusedIndex !== null) {
        e.preventDefault();
        changeLanguage(languages[focusedIndex].code);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex]);

  // 🧠 Attach mousedown listener only when dropdown is open
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // 🧠 Focus language button on Arrow key navigation
  useEffect(() => {
    if (focusedIndex !== null) {
      itemRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      {isLoginPage ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 rounded-full bg-blue-900/30 px-3 py-1.5 text-sm text-blue-300 transition-colors duration-200 hover:bg-blue-800/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span>{currentLang.name}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      ) : (
        <motion.div
          className="tooltip tooltip-bottom relative"
          initial="rest"
          whileHover="hover"
          whileTap="tap"
          data-tip={currentLang.name}
        >
          <motion.button
            onClick={() => setIsOpen(!isOpen)}
            className="btn btn-circle relative transition-all duration-300"
            style={{
              color: themeStyles.colors.text.primary,
              background: themeStyles.button.secondary.background,
              boxShadow: themeStyles.colors.shadow.sm,
              overflow: 'hidden',
            }}
            aria-label={t('header.switchLanguage')}
          >
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{
                background: isDark
                  ? 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 70%)'
                  : 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
              }}
            />

            <motion.div className="relative z-10 flex items-center justify-center">
              <motion.div variants={iconVariants}>
                <HiLanguage
                  className="text-xl"
                  style={{
                    color: isDark
                      ? themeStyles.colors.brand.primaryLight
                      : themeStyles.colors.brand.primary,
                  }}
                />
              </motion.div>
            </motion.div>
          </motion.button>

          <motion.div
            className="bg-brand-primary absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[8px] text-white"
            style={{
              background: isDark
                ? themeStyles.colors.brand.primary
                : themeStyles.colors.brand.primary,
              boxShadow: `0 0 0 2px ${isDark ? themeStyles.colors.bg.secondary : 'white'}`,
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            {currentLang.code.toUpperCase()}
          </motion.div>
        </motion.div>
      )}

      {/* Dropdown list */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop - strong blur so page content blurs */}
            {createPortal(
              <motion.div
                className="fixed inset-0 z-[100]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: 0.08 }}
                onClick={() => setIsOpen(false)}
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.45)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  pointerEvents: 'auto',
                }}
              />,
              document.body
            )}

            {/* Language dropdown rendered in portal so it sits above blur */}
            {createPortal(
              <motion.div
                className="fixed inset-0 z-[110] flex justify-end"
                style={{ pointerEvents: 'none' }}
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.8 }}
              >
                <div className="pointer-events-auto pr-4 pt-[96px] sm:pr-6 md:pr-8">
                  <div
                    className={
                      isLoginPage
                        ? 'w-40 overflow-hidden rounded-md border border-white/10 bg-gradient-to-b from-blue-900/90 to-purple-900/90 shadow-lg'
                        : `w-48 overflow-hidden rounded-lg border shadow-xl ${
                            isDark
                              ? 'border-gray-700 bg-gray-800 text-gray-200'
                              : 'border-gray-200 bg-white text-gray-800'
                          }`
                    }
                    role="listbox"
                  >
                    {!isLoginPage && (
                      <div
                        className={`flex items-center justify-between border-b px-3 py-2 ${
                          isDark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'
                        }`}
                      >
                        <p className="text-xs font-medium uppercase tracking-wider">
                          {t('header.selectLanguage')}
                        </p>
                        <kbd
                          className="hidden items-center rounded px-1.5 py-0.5 text-xs font-semibold sm:inline-flex"
                          style={{
                            background: isDark
                              ? 'rgba(55, 65, 81, 0.5)'
                              : 'rgba(229, 231, 235, 0.5)',
                            color: isDark ? 'rgba(156, 163, 175, 1)' : 'rgba(107, 114, 128, 1)',
                          }}
                        >
                          ESC
                        </kbd>
                      </div>
                    )}
                    <div className="max-h-60 overflow-auto py-1">
                      {languages.map((lang, idx) => (
                        <button
                          key={lang.code}
                          ref={el => (itemRefs.current[idx] = el)}
                          tabIndex={0}
                          onClick={() => changeLanguage(lang.code)}
                          className={
                            isLoginPage
                              ? `flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-blue-700/30 ${
                                  i18n.language === lang.code
                                    ? 'bg-blue-600/40 text-blue-100'
                                    : 'bg-transparent text-blue-200 hover:bg-blue-700/30'
                                }`
                              : `flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                                  isDark
                                    ? i18n.language === lang.code
                                      ? 'bg-blue-900/60 text-blue-200'
                                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700/80'
                                    : i18n.language === lang.code
                                      ? 'bg-indigo-50 font-medium text-indigo-700'
                                      : 'bg-white text-gray-800 hover:bg-gray-100'
                                }`
                          }
                          role="option"
                          aria-selected={i18n.language === lang.code}
                        >
                          <div className="flex items-center">
                            <span
                              className={`mr-2.5 text-sm font-medium uppercase ${
                                isLoginPage
                                  ? ''
                                  : isDark
                                    ? 'text-gray-500'
                                    : i18n.language === lang.code
                                      ? 'text-indigo-600'
                                      : 'text-gray-400'
                              }`}
                            >
                              {lang.code.substring(0, 2)}
                            </span>
                            <span>{lang.name}</span>
                          </div>
                          {i18n.language === lang.code && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className={`flex h-5 w-5 items-center justify-center rounded-full ${
                                isLoginPage
                                  ? 'bg-blue-600/30'
                                  : isDark
                                    ? 'bg-indigo-800/50'
                                    : 'bg-indigo-100'
                              }`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={
                                  isLoginPage
                                    ? 'text-blue-300'
                                    : isDark
                                      ? 'text-indigo-300'
                                      : 'text-indigo-600'
                                }
                              >
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            </motion.div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>,
              document.body
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSwitcher;

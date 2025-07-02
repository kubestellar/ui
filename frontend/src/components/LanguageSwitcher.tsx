import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useTheme from '../stores/themeStore';
import { HiLanguage } from 'react-icons/hi2';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ja', name: '日本語' },
    { code: 'es', name: 'Español' },
    { code: 'de', name: 'Deutsch' },
    { code: 'fr', name: 'Français' },
    { code: 'it', name: 'Italiano' },
    { code: 'zh-Hans', name: '简体中文' },
    { code: 'zh-Hant', name: '繁體中文' },
    { code: 'pt', name: 'Português' },
  ];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  const currentLang = languages.find(lang => lang.code === i18n.language) || languages[0];
  const isLoginPage = window.location.pathname.includes('login');

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
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className={`btn btn-circle flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 ${
            isDark
              ? 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/90'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          aria-label="Switch Language"
          title={currentLang.name}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key="language-icon"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              <HiLanguage className="text-xl" style={{ color: isDark ? '#a5b4fc' : '#4f46e5' }} />
            </motion.div>
          </AnimatePresence>
        </motion.button>
      )}

      {/* Dropdown list */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{ backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : '#ffffff' }}
            className={
              isLoginPage
                ? 'absolute right-0 z-50 mt-1 w-40 overflow-hidden rounded-md border border-white/10 bg-gradient-to-b from-blue-900/90 to-purple-900/90 shadow-lg'
                : `absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-lg border shadow-xl ${
                    isDark ? 'border-gray-700 text-gray-200' : 'border-gray-200 text-gray-700'
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
                <p className="text-xs font-medium uppercase tracking-wider">Select Language</p>
                <kbd
                  className="hidden items-center rounded px-1.5 py-0.5 text-xs font-semibold sm:inline-flex"
                  style={{
                    background: isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(229, 231, 235, 0.5)',
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
                            ? 'bg-blue-800/40 text-blue-200'
                            : 'text-blue-300/80'
                        }`
                      : `flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                          isDark
                            ? i18n.language === lang.code
                              ? 'bg-blue-900/60 text-blue-200'
                              : 'text-gray-300 hover:bg-gray-700/80'
                            : i18n.language === lang.code
                              ? 'font-medium text-indigo-600 hover:bg-blue-50'
                              : 'text-gray-700 hover:bg-gray-100'
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
                              ? 'text-indigo-500'
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSwitcher;

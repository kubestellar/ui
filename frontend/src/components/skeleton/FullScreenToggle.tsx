import React, { useState, useEffect, useCallback } from 'react';
import { RxEnterFullScreen, RxExitFullScreen } from 'react-icons/rx';
import useTheme from '../../stores/themeStore';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import getThemeStyles from '../../lib/theme-utils';

// Define interfaces for browser-specific fullscreen APIs
interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

interface FullscreenDocument extends Document {
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
}

interface FullScreenToggleProps {
  containerRef?: React.RefObject<HTMLElement>;
  className?: string;
  iconSize?: number;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left' | 'inline';
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  onFullScreenChange?: (isFullScreen: boolean) => void;
}

const FullScreenToggle: React.FC<FullScreenToggleProps> = ({
  containerRef,
  className = '',
  iconSize = 24,
  position = 'top-right',
  tooltipPosition = 'bottom',
  onFullScreenChange,
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);

  // Icon animation variants
  const iconVariants = {
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
      } as const,
    },
    tap: {
      rotate: 0,
      scale: 0.9,
    },
  } as const;

  const handleFullScreenChange = useCallback(() => {
    const doc = document as FullscreenDocument;
    const fullscreenElement =
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement;

    setIsFullScreen(!!fullscreenElement);
    onFullScreenChange?.(!!fullscreenElement);
    setError(null);
  }, [onFullScreenChange]);

  useEffect(() => {
    // Check initial fullscreen state
    handleFullScreenChange();

    // Add event listeners for fullscreen changes
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
    document.addEventListener('mozfullscreenchange', handleFullScreenChange);
    document.addEventListener('MSFullscreenChange', handleFullScreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullScreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullScreenChange);
    };
  }, [handleFullScreenChange]);

  const toggleFullScreen = async () => {
    try {
      setError(null);
      const doc = document as FullscreenDocument;

      if (
        !doc.fullscreenElement &&
        !doc.webkitFullscreenElement &&
        !doc.mozFullScreenElement &&
        !doc.msFullscreenElement
      ) {
        // Enter full screen for the specific container or document
        const element = (containerRef?.current || document.documentElement) as FullscreenElement;

        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
          await element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
          await element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
          await element.msRequestFullscreen();
        } else {
          throw new Error(t('errors.fullscreenNotSupported'));
        }
      } else {
        // Exit full screen
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('errors.fullscreenFailed');
      setError(errorMessage);
      console.error('Error toggling fullscreen:', err);
    }
  };

  // Position classes based on the position prop
  const positionClasses = {
    'top-right': 'absolute top-4 right-4',
    'bottom-right': 'absolute bottom-4 right-4',
    'top-left': 'absolute top-4 left-4',
    'bottom-left': 'absolute bottom-4 left-4',
    inline: '',
  };

  // Tooltip position classes
  const tooltipClasses = {
    top: 'tooltip-top',
    bottom: 'tooltip-bottom',
    left: 'tooltip-left',
    right: 'tooltip-right',
  };

  const tooltipText = isFullScreen ? t('header.exitFullscreen') : t('header.enterFullscreen');

  return (
    <motion.div
      className={`
        tooltip font-normal
        ${tooltipClasses[tooltipPosition]} 
        ${position !== 'inline' ? positionClasses[position] : ''} 
        ${className}
        relative
      `}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      data-tip={error || tooltipText}
    >
      <motion.button
        onClick={toggleFullScreen}
        className="btn btn-circle relative transition-all duration-300"
        style={{
          color: themeStyles.colors.text.primary,
          background: themeStyles.button.secondary.background,
          boxShadow: themeStyles.colors.shadow.sm,
          overflow: 'hidden',
        }}
        aria-label={error || tooltipText}
        aria-pressed={isFullScreen}
        role="switch"
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
            <AnimatePresence mode="wait">
              {isFullScreen ? (
                <motion.div
                  key="exit"
                  initial={{ opacity: 0, rotate: -30 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 30 }}
                  transition={{ duration: 0.2 } as const }
                >
                  <RxExitFullScreen
                    size={iconSize}
                    style={{
                      color: isDark
                        ? themeStyles.colors.brand.primaryLight
                        : themeStyles.colors.brand.primary,
                    }}
                    aria-hidden="true"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="enter"
                  initial={{ opacity: 0, rotate: 30 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: -30 }}
                  transition={{ duration: 0.2 } as const }
                >
                  <RxEnterFullScreen
                    size={iconSize}
                    style={{
                      color: isDark
                        ? themeStyles.colors.brand.primaryLight
                        : themeStyles.colors.brand.primary,
                    }}
                    aria-hidden="true"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </motion.button>
    </motion.div>
  );
};

export default FullScreenToggle;

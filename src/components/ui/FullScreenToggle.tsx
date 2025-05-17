import React, { useState, useEffect, useCallback } from 'react';
import { RxEnterFullScreen, RxExitFullScreen } from 'react-icons/rx';
import useTheme from '../../stores/themeStore';

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
  tooltipText?: string;
  onFullScreenChange?: (isFullScreen: boolean) => void;
}

const FullScreenToggle: React.FC<FullScreenToggleProps> = ({
  containerRef,
  className = '',
  iconSize = 24,
  position = 'top-right',
  tooltipPosition = 'bottom',
  tooltipText = 'Toggle fullscreen',
  onFullScreenChange,
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const theme = useTheme((state) => state.theme);

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
      
      if (!doc.fullscreenElement && 
          !doc.webkitFullscreenElement && 
          !doc.mozFullScreenElement && 
          !doc.msFullscreenElement) {
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
          throw new Error('Fullscreen API is not supported in this browser');
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle fullscreen';
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
    'inline': '',
  };

  // Tooltip position classes
  const tooltipClasses = {
    'top': 'tooltip-top',
    'bottom': 'tooltip-bottom',
    'left': 'tooltip-left',
    'right': 'tooltip-right',
  };

  // Button styles based on theme and state
  const buttonStyles = {
    base: `
      btn btn-circle 
      transition-all duration-300 ease-in-out
      transform hover:scale-110 active:scale-95
      shadow-lg hover:shadow-xl
      backdrop-blur-sm
      border border-opacity-20
      focus:outline-none focus:ring-2 focus:ring-offset-2
    `,
    dark: `
      bg-gray-800/80 hover:bg-gray-700/90
      border-gray-600
      focus:ring-blue-500
      ${error ? 'ring-2 ring-red-500' : ''}
    `,
    light: `
      bg-white/90 hover:bg-gray-50/95
      border-gray-200
      focus:ring-blue-400
      ${error ? 'ring-2 ring-red-500' : ''}
    `,
  };

  // Icon styles based on theme and state
  const iconStyles = {
    base: `
      transition-all duration-300 ease-in-out
      ${isHovered ? 'scale-110' : 'scale-100'}
    `,
    dark: `
      text-gray-200 group-hover:text-white
    `,
    light: `
      text-gray-700 group-hover:text-gray-900
    `,
  };

  return (
    <div 
      className={`
        tooltip 
        ${tooltipClasses[tooltipPosition]} 
        ${position !== 'inline' ? positionClasses[position] : ''} 
        ${className}
        group
      `}
      data-tip={error || tooltipText}
    >
      <button
        onClick={toggleFullScreen}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          ${buttonStyles.base}
          ${theme === 'dark' ? buttonStyles.dark : buttonStyles.light}
        `}
        aria-label={error || tooltipText}
        aria-pressed={isFullScreen}
        role="switch"
      >
        {isFullScreen ? (
          <RxExitFullScreen 
            size={iconSize} 
            className={`
              ${iconStyles.base}
              ${theme === 'dark' ? iconStyles.dark : iconStyles.light}
            `}
            aria-hidden="true"
          />
        ) : (
          <RxEnterFullScreen 
            size={iconSize} 
            className={`
              ${iconStyles.base}
              ${theme === 'dark' ? iconStyles.dark : iconStyles.light}
            `}
            aria-hidden="true"
          />
        )}
      </button>
    </div>
  );
};

export default FullScreenToggle; 
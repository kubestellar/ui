// src/components/ui/Skeleton.tsx (continued)
import React, { useEffect } from 'react';
import useTheme from '../../stores/themeStore';

// Add this right after the imports
const injectKeyframes = () => {
  // Check if keyframes already exist to avoid duplicates
  if (!document.getElementById('skeleton-keyframes')) {
    const style = document.createElement('style');
    style.id = 'skeleton-keyframes';
    style.innerHTML = `
      @keyframes pulse {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
      }
    `;
    document.head.appendChild(style);
  }
};

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '', width, height }) => {
  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';

  // Inject keyframes on component mount
  useEffect(() => {
    injectKeyframes();
    // Clean up on unmount
    return () => {
      const style = document.getElementById('skeleton-keyframes');
      if (style && document.querySelectorAll('[data-skeleton]').length === 0) {
        style.remove();
      }
    };
  }, []);

  const style: React.CSSProperties = {
    width: width,
    height: height,
    borderRadius: '4px',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    animation: 'pulse 1.5s ease-in-out infinite',
  };

  return <div className={className} style={style} data-skeleton aria-hidden="true" />;
};

export default Skeleton;

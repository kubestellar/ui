// src/components/ui/HeaderSkeleton.tsx
import React from 'react';
import useTheme from '../../stores/themeStore';
import Skeleton from './Skeleton';
import { FiSun, FiMoon } from 'react-icons/fi';
import FullScreenToggle from './FullScreenToggle';

const HeaderSkeleton: React.FC = () => {
  const theme = useTheme((state) => state.theme);
  const isDark = theme === 'dark';
  
  return (
    <div className="fixed z-[3] top-0 left-0 right-0 bg-base-100 w-full flex justify-between px-3 xl:px-4 py-3 xl:py-5 gap-4 xl:gap-0">
      <div className="flex gap-3 items-center">
        {/* Mobile menu button skeleton */}
        <div className="w-auto p-0 mr-1 xl:hidden">
          <div className="p-0 w-auto">
            <div className="flex items-center justify-center h-10 w-10">
              <Skeleton width={24} height={24} className="rounded" />
            </div>
          </div>
        </div>

        {/* Logo skeleton */}
        <div className="flex items-center gap-1 xl:gap-2">
          <Skeleton width={176} height={36} className="rounded" />
        </div>
      </div>

      <div className="flex items-center gap-0 xl:gap-1 2xl:gap-2 3xl:gap-5">
        {/* Cluster select skeleton */}
        <Skeleton width={200} height={40} className="rounded mr-4" />
        
        {/* Theme toggle with conditional styling based on theme */}
        <div 
          className="flex items-center justify-center w-10 h-10 rounded-full"
          style={{ 
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'
          }}
        >
          {theme === 'light' ? (
            <FiMoon className="text-xl text-indigo-500/30" />
          ) : (
            <FiSun className="text-xl text-yellow-500/30" />
          )}
        </div>
        
        {/* User profile skeleton with conditional border color */}
        <div 
          className="btn flex items-center h-auto border-2 bg-primary/5 cursor-default pointer-events-none"
          style={{ 
            borderColor: isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)'
          }}
        >
          <Skeleton width={80} height={16} className="mr-3 rounded" />
          <div className="flex-shrink-0">
            <Skeleton width={40} height={40} className="rounded-full" />
          </div>
        </div>
        
        {/* Fullscreen button skeleton with conditional text color */}
        <div className="hidden xl:inline-flex">
          <div className="btn btn-circle btn-ghost pointer-events-none opacity-50">
            <FullScreenToggle position="inline" className="pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeaderSkeleton;
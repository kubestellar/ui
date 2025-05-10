// src/components/ui/HeaderSkeleton.tsx
import React from 'react';
import useTheme from '../../stores/themeStore';
import Skeleton from './Skeleton';
import { FiSun, FiMoon } from 'react-icons/fi';
import { RxEnterFullScreen } from 'react-icons/rx';

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
        
        {/* Theme toggle (showing actual button since it's functional) */}
        {/* Theme toggle (showing actual button since it's functional but without border) */}
        <div className="flex items-center justify-center w-10 h-10 rounded-full">
          {theme === 'light' ? (
            <FiMoon className="text-xl text-indigo-500/30" />
          ) : (
            <FiSun className="text-xl text-yellow-500/30" />
          )}
        </div>
        
        {/* User profile skeleton */}
        <div className="btn flex items-center h-auto border-2 border-primary/20 bg-primary/5 cursor-default pointer-events-none">
          <Skeleton width={80} height={16} className="mr-3 rounded" />
          <div className="flex-shrink-0">
            <Skeleton width={40} height={40} className="rounded-full" />
          </div>
        </div>
        
        {/* Fullscreen button skeleton */}
        <div className="hidden xl:inline-flex btn btn-circle btn-ghost pointer-events-none">
          <RxEnterFullScreen className="xl:text-xl 2xl:text-2xl 3xl:text-3xl text-gray-400" />
        </div>
      </div>
    </div>
  );
};

export default HeaderSkeleton;
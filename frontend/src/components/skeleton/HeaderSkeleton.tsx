// src/components/ui/HeaderSkeleton.tsx
import React from 'react';
import useTheme from '../../stores/themeStore';
import Skeleton from './Skeleton';
import { FiSun, FiMoon } from 'react-icons/fi';
import FullScreenToggle from './FullScreenToggle';

const HeaderSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-[3] flex w-full justify-between gap-4 bg-base-100 px-3 py-3 xl:gap-0 xl:px-6 xl:py-4 ${isDark ? 'border-b border-slate-800/60' : ''}`}
    >
      <div className="flex items-center gap-3">
        {/* Mobile menu button skeleton */}
        <div className="mr-1 w-auto p-0 xl:hidden">
          <div className="w-auto p-0">
            <div className="btn btn-circle btn-ghost flex h-10 w-10 items-center justify-center">
              <Skeleton width={24} height={24} className="rounded" />
            </div>
          </div>
        </div>

        {/* Logo skeleton */}
        <div className="flex items-center gap-2 xl:gap-3">
          <Skeleton width={160} height={36} className="rounded" />
        </div>
      </div>

      <div className="3xl:gap-5 flex items-center gap-2 xl:gap-4">
        {/* Theme toggle with conditional styling based on theme */}
        <div className="btn btn-circle btn-ghost bg-base-200/50" aria-label="Theme toggle">
          {!isDark ? (
            <FiMoon className="text-xl text-indigo-500/30" />
          ) : (
            <FiSun className="text-xl text-yellow-500/30" />
          )}
        </div>

        {/* User profile skeleton with conditional border color */}
        <div
          className="btn btn-circle pointer-events-none cursor-default border-2 bg-primary/5"
          style={{
            borderColor: isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)',
          }}
        >
          <Skeleton width={24} height={24} className="rounded-full" />
        </div>

        {/* Fullscreen button skeleton */}
        <div className="hidden xl:inline-flex">
          <div className="btn btn-circle btn-ghost pointer-events-none bg-base-200/50 opacity-50">
            <FullScreenToggle position="inline" className="pointer-events-none" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderSkeleton;

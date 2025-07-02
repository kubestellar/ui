import React from 'react';
import useTheme from '../../stores/themeStore';
import Skeleton from './Skeleton';

const TreeViewSkeleton: React.FC = () => {
  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        backgroundColor: isDark ? 'rgb(15, 23, 42)' : '#ffffff',
      }}
    >
      {/* Header bar skeleton */}
      <div
        className="mb-4 flex w-full items-center justify-between rounded p-4"
        style={{
          backgroundColor: isDark ? 'rgb(15, 23, 42)' : '#ffffff',
          boxShadow: '0 6px 6px rgba(0,0,0,0.1)',
        }}
      >
        <Skeleton width={220} height={30} className="rounded" />
        <div className="flex items-center gap-2">
          <Skeleton width={180} height={36} className="rounded" />
          <Skeleton width={40} height={40} className="rounded-full" />
          <Skeleton width={40} height={40} className="rounded-full" />
          <Skeleton width={150} height={36} className="rounded" />
        </div>
      </div>

      {/* Info banners */}
      <div
        className="mb-3 w-full rounded p-2"
        style={{
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
        }}
      >
        <Skeleton width="60%" height={20} className="rounded" />
      </div>

      {/* React Flow canvas area */}
      <div className="relative w-full" style={{ height: 'calc(100% - 150px)' }}>
        {/* Controls */}
        <div
          className="absolute right-4 top-4 z-10 flex flex-col gap-2 rounded-md p-2"
          style={{
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(248, 250, 252, 0.8)',
          }}
        >
          <Skeleton width={36} height={36} className="rounded-full" />
          <Skeleton width={36} height={36} className="rounded-full" />
          <Skeleton width={36} height={36} className="rounded-full" />
          <Skeleton width={36} height={36} className="rounded-full" />
        </div>

        {/* Mini-map skeleton */}
        <div
          className="absolute bottom-4 right-4 z-10 rounded-md p-1"
          style={{
            width: 120,
            height: 80,
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(248, 250, 252, 0.5)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Minimap nodes */}
          <div className="absolute left-2 top-2 h-1 w-5 rounded-sm bg-blue-400 opacity-30"></div>
          <div className="absolute left-2 top-5 h-1 w-5 rounded-sm bg-blue-400 opacity-30"></div>
          <div className="absolute left-2 top-8 h-1 w-5 rounded-sm bg-blue-400 opacity-30"></div>

          <div className="absolute left-10 top-3 h-1 w-5 rounded-sm bg-blue-400 opacity-30"></div>
          <div className="absolute left-10 top-6 h-1 w-5 rounded-sm bg-blue-400 opacity-30"></div>

          <div className="left-18 absolute top-2 h-1 w-5 rounded-sm bg-blue-400 opacity-30"></div>
          <div className="left-18 absolute top-5 h-1 w-5 rounded-sm bg-blue-400 opacity-30"></div>
          <div className="left-18 absolute top-8 h-1 w-5 rounded-sm bg-blue-400 opacity-30"></div>
        </div>
      </div>
    </div>
  );
};

export default TreeViewSkeleton;

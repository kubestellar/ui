import React from 'react';
import useTheme from '../../stores/themeStore';
import Skeleton from './Skeleton';

const TreeViewSkeleton: React.FC = () => {
  const theme = useTheme((state) => state.theme);
  const isDark = theme === 'dark';

  return (
    <div className="w-full h-full relative overflow-hidden" style={{
      backgroundColor: isDark ? 'rgb(15, 23, 42)' : '#ffffff',
    }}>
      {/* Header bar skeleton */}
      <div className="w-full flex items-center justify-between p-4 mb-4 rounded" style={{
        backgroundColor: isDark ? 'rgb(15, 23, 42)' : '#ffffff',
        boxShadow: '0 6px 6px rgba(0,0,0,0.1)',
      }}>
        <Skeleton width={220} height={30} className="rounded" />
        <div className="flex items-center gap-2">
          <Skeleton width={180} height={36} className="rounded" />
          <Skeleton width={40} height={40} className="rounded-full" />
          <Skeleton width={40} height={40} className="rounded-full" />
          <Skeleton width={150} height={36} className="rounded" />
        </div>
      </div>

      {/* Info banners */}
      <div className="w-full p-2 mb-3 rounded" style={{
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      }}>
        <Skeleton width="60%" height={20} className="rounded" />
      </div>

      {/* React Flow canvas area */}
      <div className="w-full relative" style={{ height: 'calc(100% - 150px)' }}>
        {/* Controls */}
        <div className="absolute right-4 top-4 z-10 flex flex-col gap-2 p-2 rounded-md" style={{
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(248, 250, 252, 0.8)',
        }}>
          <Skeleton width={36} height={36} className="rounded-full" />
          <Skeleton width={36} height={36} className="rounded-full" />
          <Skeleton width={36} height={36} className="rounded-full" />
          <Skeleton width={36} height={36} className="rounded-full" />
        </div>

        {/* Mini-map skeleton */}
        <div className="absolute right-4 bottom-4 z-10 p-1 rounded-md" style={{
          width: 120,
          height: 80,
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(248, 250, 252, 0.5)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
        }}>
          {/* Minimap nodes */}
          <div className="absolute left-2 top-2 w-5 h-1 rounded-sm bg-blue-400 opacity-30"></div>
          <div className="absolute left-2 top-5 w-5 h-1 rounded-sm bg-blue-400 opacity-30"></div>
          <div className="absolute left-2 top-8 w-5 h-1 rounded-sm bg-blue-400 opacity-30"></div>
          
          <div className="absolute left-10 top-3 w-5 h-1 rounded-sm bg-blue-400 opacity-30"></div>
          <div className="absolute left-10 top-6 w-5 h-1 rounded-sm bg-blue-400 opacity-30"></div>
          
          <div className="absolute left-18 top-2 w-5 h-1 rounded-sm bg-blue-400 opacity-30"></div>
          <div className="absolute left-18 top-5 w-5 h-1 rounded-sm bg-blue-400 opacity-30"></div>
          <div className="absolute left-18 top-8 w-5 h-1 rounded-sm bg-blue-400 opacity-30"></div>
        </div>
      </div>
    </div>
  );
};

export default TreeViewSkeleton;

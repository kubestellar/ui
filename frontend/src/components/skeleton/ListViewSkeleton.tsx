import React from 'react';
import useTheme from '../../stores/themeStore';
import Skeleton from './Skeleton';

interface ListViewSkeletonProps {
  itemCount?: number;
}

const ListViewSkeleton: React.FC<ListViewSkeletonProps> = ({ itemCount = 6 }) => {
  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';

  // Generate an array of the specified length to render multiple skeleton items
  const skeletonItems = Array.from({ length: itemCount }, (_, index) => index);

  return (
    <div
      className="relative h-full w-full"
      style={{
        backgroundColor: isDark ? 'rgb(15, 23, 42)' : '#fff',
      }}
    >
      {/* Top blue bar */}
      <div
        className="h-3 w-full rounded-md border-b"
        style={{
          backgroundColor: '#4498FF',
          borderColor: isDark ? '#334155' : '#ccc',
        }}
      />

      {/* Loading message banner */}
      <div
        className="sticky top-0 z-10 mb-2 flex w-full items-center justify-center px-2 py-1"
        style={{
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(240, 247, 255, 0.8)',
          borderBottom: isDark ? '1px solid #334155' : '1px solid #e5e7eb',
        }}
      >
        <Skeleton width="40%" height={24} className="rounded" />
      </div>

      {/* Content area */}
      <div className="w-full flex-1 overflow-auto p-2 pb-20">
        {skeletonItems.map(index => (
          <div
            key={index}
            className="relative mb-6 flex flex-col overflow-hidden rounded p-6 md:flex-row md:items-center"
            style={{
              backgroundColor: isDark ? 'rgb(30, 41, 59)' : '#f8fafc',
              borderLeft: '4px solid #4498FF',
            }}
          >
            {/* Animation overlay */}
            <div
              className="absolute inset-0 animate-pulse"
              style={{
                opacity: 0.1,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              }}
            />

            {/* Star icon */}
            <div className="mr-2 flex w-9 items-center justify-center">
              <Skeleton width={18} height={18} className="rounded-full" />
            </div>

            {/* Content section */}
            <div className="grid w-full min-w-0 flex-grow grid-cols-1 items-center gap-1 md:grid-cols-4 md:gap-3">
              {/* Name and namespace section - 2/4 width on md+ */}
              <div className="overflow-hidden md:col-span-2">
                <Skeleton width="70%" height={24} className="mb-2 rounded" />
                <Skeleton width="40%" height={20} className="rounded" />
              </div>

              {/* Kind tag centered - 1/4 width on md+ */}
              <div className="flex items-center justify-start md:justify-center">
                <Skeleton width={80} height={28} className="rounded" />
              </div>

              {/* Created at date aligned right - 1/4 width on md+ */}
              <div className="flex items-center justify-start md:justify-end">
                <Skeleton width="80%" height={20} className="rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination footer */}
      <div
        className="sticky bottom-3.5 left-0 right-0 z-20 flex flex-col justify-between gap-2 rounded-b-lg p-2 pt-2 sm:flex-row sm:items-center sm:gap-0 sm:p-3"
        style={{
          borderTop: isDark ? '1px solid #334155' : '1px solid #e5e7eb',
          backgroundColor: isDark ? 'rgb(30, 41, 59)' : 'rgb(248, 250, 252)',
          boxShadow: isDark ? '0 -4px 6px rgba(0,0,0,0.3)' : '0 -4px 6px rgba(0,0,0,0.1)',
        }}
      >
        <div className="flex flex-col">
          <Skeleton width={180} height={20} className="mb-2 rounded" />
          <Skeleton width={120} height={16} className="rounded" />
        </div>

        <div className="flex w-full flex-wrap justify-center gap-1 sm:w-auto sm:justify-end sm:gap-2">
          <Skeleton width={60} height={32} className="rounded" />

          <div className="flex flex-wrap justify-center gap-1">
            {[1, 2, 3, 4, 5].map((_, index) => (
              <Skeleton key={index} width={32} height={32} className="rounded" />
            ))}
          </div>

          <Skeleton width={60} height={32} className="rounded" />
        </div>
      </div>
    </div>
  );
};

export default ListViewSkeleton;

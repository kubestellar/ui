import React from 'react';
import useTheme from '../../stores/themeStore';
import Skeleton from './Skeleton';

const WDSSkeleton: React.FC = () => {
  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';

  return (
    <div className="flex w-full flex-col">
      {/* Header skeleton */}
      <div
        className="mb-6 flex w-full items-center justify-between rounded p-4"
        style={{
          backgroundColor: isDark ? 'rgb(15, 23, 42)' : '#ffffff',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}
      >
        <Skeleton width={260} height={40} className="rounded" />
        <div className="flex items-center gap-3">
          <Skeleton width={180} height={36} className="rounded" />
          <div className="flex gap-2">
            <Skeleton width={40} height={40} className="rounded-full" />
            <Skeleton width={40} height={40} className="rounded-full" />
          </div>
          <Skeleton width={160} height={40} className="rounded" />
        </div>
      </div>

      {/* Info banner skeleton */}
      <div
        className="mb-4 w-full rounded p-3"
        style={{
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
        }}
      >
        <Skeleton width="60%" height={20} className="rounded" />
      </div>

      {/* Main content area */}
      <div className="grid w-full grid-cols-1 gap-6 p-2 md:grid-cols-4">
        {/* Left panel */}
        <div
          className="flex h-96 flex-col gap-3 rounded-lg p-4 md:col-span-1"
          style={{
            backgroundColor: isDark ? 'rgb(30, 41, 59)' : '#f8fafc',
          }}
        >
          <Skeleton width="80%" height={30} className="mb-4 rounded" />
          <Skeleton width="100%" height={40} className="rounded" />
          <Skeleton width="100%" height={40} className="rounded" />
          <Skeleton width="100%" height={40} className="rounded" />
          <Skeleton width="100%" height={40} className="rounded" />
          <Skeleton width="90%" height={40} className="rounded" />
          <Skeleton width="95%" height={40} className="rounded" />
        </div>

        {/* Main workload view */}
        <div className="flex h-full flex-col md:col-span-3">
          {/* Resource rows */}
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="relative mb-4 flex flex-col overflow-hidden rounded p-4 md:flex-row md:items-center"
              style={{
                backgroundColor: isDark ? 'rgb(30, 41, 59)' : '#f8fafc',
                borderLeft: '4px solid #4498FF',
              }}
            >
              {/* Star icon */}
              <div className="mr-2 flex w-9 items-center justify-center">
                <Skeleton width={18} height={18} className="rounded-full" />
              </div>

              {/* Content section */}
              <div className="grid w-full min-w-0 flex-grow grid-cols-1 items-center gap-2 md:grid-cols-4 md:gap-3">
                {/* Name and namespace section */}
                <div className="overflow-hidden md:col-span-2">
                  <Skeleton width="70%" height={24} className="mb-2 rounded" />
                  <Skeleton width="40%" height={20} className="rounded" />
                </div>

                {/* Kind tag centered */}
                <div className="flex items-center justify-start md:justify-center">
                  <Skeleton width={80} height={28} className="rounded" />
                </div>

                {/* Created at date aligned right */}
                <div className="flex items-center justify-start md:justify-end">
                  <Skeleton width="80%" height={20} className="rounded" />
                </div>
              </div>
            </div>
          ))}

          {/* Pagination skeleton */}
          <div
            className="mt-4 flex items-center justify-between rounded p-3"
            style={{
              backgroundColor: isDark ? 'rgb(30, 41, 59)' : '#f8fafc',
            }}
          >
            <Skeleton width={180} height={24} className="rounded" />
            <div className="flex gap-2">
              <Skeleton width={40} height={32} className="rounded" />
              <Skeleton width={40} height={32} className="rounded" />
              <Skeleton width={40} height={32} className="rounded" />
              <Skeleton width={40} height={32} className="rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WDSSkeleton;

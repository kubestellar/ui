import React from 'react';
import useTheme from '../../stores/themeStore';
import Skeleton from './Skeleton';

const WDSSkeleton: React.FC = () => {
  const theme = useTheme((state) => state.theme);
  const isDark = theme === 'dark';

  return (
    <div className="w-full flex flex-col">
      {/* Header skeleton */}
      <div className="w-full p-4 mb-6 flex items-center justify-between rounded" 
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
      <div className="w-full p-3 mb-4 rounded" style={{
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      }}>
        <Skeleton width="60%" height={20} className="rounded" />
      </div>

      {/* Main content area */}
      <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-6 p-2">
        {/* Left panel */}
        <div className="md:col-span-1 h-96 rounded-lg flex flex-col gap-3 p-4" style={{
          backgroundColor: isDark ? 'rgb(30, 41, 59)' : '#f8fafc',
        }}>
          <Skeleton width="80%" height={30} className="rounded mb-4" />
          <Skeleton width="100%" height={40} className="rounded" />
          <Skeleton width="100%" height={40} className="rounded" />
          <Skeleton width="100%" height={40} className="rounded" />
          <Skeleton width="100%" height={40} className="rounded" />
          <Skeleton width="90%" height={40} className="rounded" />
          <Skeleton width="95%" height={40} className="rounded" />
        </div>

        {/* Main workload view */}
        <div className="md:col-span-3 h-full flex flex-col">
          {/* Resource rows */}
          {Array.from({ length: 6 }).map((_, index) => (
            <div 
              key={index}
              className="flex flex-col md:flex-row md:items-center p-4 mb-4 rounded relative overflow-hidden"
              style={{
                backgroundColor: isDark ? 'rgb(30, 41, 59)' : '#f8fafc',
                borderLeft: '4px solid #4498FF',
              }}
            >
              {/* Star icon */}
              <div className="w-9 flex justify-center items-center mr-2">
                <Skeleton width={18} height={18} className="rounded-full" />
              </div>

              {/* Content section */}
              <div className="flex-grow min-w-0 grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-3 w-full items-center">
                {/* Name and namespace section */}
                <div className="overflow-hidden md:col-span-2">
                  <Skeleton width="70%" height={24} className="mb-2 rounded" />
                  <Skeleton width="40%" height={20} className="rounded" />
                </div>

                {/* Kind tag centered */}
                <div className="flex justify-start md:justify-center items-center">
                  <Skeleton width={80} height={28} className="rounded" />
                </div>

                {/* Created at date aligned right */}
                <div className="flex justify-start md:justify-end items-center">
                  <Skeleton width="80%" height={20} className="rounded" />
                </div>
              </div>
            </div>
          ))}

          {/* Pagination skeleton */}
          <div 
            className="flex justify-between items-center mt-4 p-3 rounded"
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
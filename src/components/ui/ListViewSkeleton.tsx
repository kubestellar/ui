import React from 'react';
import useTheme from '../../stores/themeStore';
import Skeleton from './Skeleton';

interface ListViewSkeletonProps {
  itemCount?: number;
}

const ListViewSkeleton: React.FC<ListViewSkeletonProps> = ({ itemCount = 6 }) => {
  const theme = useTheme((state) => state.theme);
  const isDark = theme === 'dark';
  
  // Generate an array of the specified length to render multiple skeleton items
  const skeletonItems = Array.from({ length: itemCount }, (_, index) => index);

  return (
    <div 
      className="w-full h-full relative"
      style={{ 
        backgroundColor: isDark ? 'rgb(15, 23, 42)' : '#fff'
      }}
    >
      {/* Top blue bar */}
      <div 
        className="w-full h-3 rounded-md border-b"
        style={{ 
          backgroundColor: '#4498FF',
          borderColor: isDark ? '#334155' : '#ccc' 
        }}
      />
      
      {/* Loading message banner */}
      <div 
        className="w-full px-2 py-1 sticky top-0 z-10 flex items-center justify-center mb-2"
        style={{ 
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(240, 247, 255, 0.8)',
          borderBottom: isDark ? '1px solid #334155' : '1px solid #e5e7eb'
        }}
      >
        <Skeleton width="40%" height={24} className="rounded" />
      </div>
      
      {/* Content area */}
      <div className="w-full flex-1 overflow-auto p-2 pb-20">
        {skeletonItems.map((index) => (
          <div
            key={index}
            className="flex flex-col md:flex-row md:items-center p-6 mb-6 rounded relative overflow-hidden"
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
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
              }}
            />

            {/* Star icon */}
            <div className="w-9 flex justify-center items-center mr-2">
              <Skeleton width={18} height={18} className="rounded-full" />
            </div>

            {/* Content section */}
            <div className="flex-grow min-w-0 grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-3 w-full items-center">
              {/* Name and namespace section - 2/4 width on md+ */}
              <div className="overflow-hidden md:col-span-2">
                <Skeleton width="70%" height={24} className="mb-2 rounded" />
                <Skeleton width="40%" height={20} className="rounded" />
              </div>

              {/* Kind tag centered - 1/4 width on md+ */}
              <div className="flex justify-start md:justify-center items-center">
                <Skeleton width={80} height={28} className="rounded" />
              </div>

              {/* Created at date aligned right - 1/4 width on md+ */}
              <div className="flex justify-start md:justify-end items-center">
                <Skeleton width="80%" height={20} className="rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Pagination footer */}
      <div
        className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-0 p-2 sm:p-3 pt-2 sticky bottom-3.5 left-0 right-0 z-20 rounded-b-lg"
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
      
        <div className="flex gap-1 sm:gap-2 justify-center sm:justify-end flex-wrap w-full sm:w-auto">
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
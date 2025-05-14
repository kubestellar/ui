// src/components/ui/K8sInfoSkeleton.tsx
import React from 'react';
import useTheme from '../../stores/themeStore';
import Skeleton from './Skeleton';

const K8sInfoSkeleton: React.FC = () => {
  const theme = useTheme((state) => state.theme);
  const isDark = theme === 'dark';
  
  // Base card style
  const cardStyle: React.CSSProperties = {
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    borderRadius: '0.75rem',
    boxShadow: isDark 
      ? '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.2)' 
      : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    padding: '1.5rem',
    height: '100%',
  };
  
  // Generate random heights for list items to create variety
  const getRandomHeight = () => {
    return Math.floor(Math.random() * 20) + 40; // Between 40px and 60px
  };
  
  return (
    <div className="w-full max-w-full p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Clusters Card Skeleton */}
        <div style={cardStyle}>
          <div className="mb-6 flex items-center">
            <Skeleton width="60%" height={32} className="rounded" />
            <Skeleton width={40} height={24} className="ml-2 rounded-full" />
          </div>
          <div className="space-y-2">
            {Array(3).fill(0).map((_, i) => (
              <Skeleton 
                key={`cluster-${i}`}
                width="100%" 
                height={getRandomHeight()} 
                className="rounded-lg"
              />
            ))}
          </div>
        </div>
        
        {/* Contexts Card Skeleton */}
        <div style={cardStyle}>
          <div className="mb-6 flex items-center">
            <Skeleton width="60%" height={32} className="rounded" />
            <Skeleton width={40} height={24} className="ml-2 rounded-full" />
          </div>
          <div className="space-y-2">
            {Array(4).fill(0).map((_, i) => (
              <div key={`context-${i}`} className="space-y-1">
                <div className="flex justify-between">
                  <Skeleton width="50%" height={24} className="rounded" />
                  {i === 0 && <Skeleton width={70} height={24} className="rounded-full" />}
                </div>
                <Skeleton width="70%" height={16} className="rounded" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Current Context Card Skeleton */}
        <div style={cardStyle}>
          <div className="mb-6">
            <Skeleton width="80%" height={32} className="rounded" />
          </div>
          <Skeleton width="100%" height={60} className="rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export default K8sInfoSkeleton;
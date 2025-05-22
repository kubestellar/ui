// src/components/ui/ClusterSkeleton.tsx
import React from 'react';
import useTheme from '../../stores/themeStore';
import Skeleton from './Skeleton';

const ClusterSkeleton: React.FC = () => {
  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';

  // Base card style
  const cardStyle: React.CSSProperties = {
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    borderRadius: '0.75rem',
    boxShadow: isDark
      ? '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.2)'
      : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    padding: '1.5rem',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    height: '100%',
  };

  return (
    <div className="w-full p-4">
      {/* Page Header */}
      <div className="mb-8">
        <Skeleton width="180px" height={40} className="mb-2 rounded" />
        <Skeleton width="350px" height={24} className="rounded" />
      </div>

      {/* Cluster Stats */}
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Cluster Overview Card */}
        <div style={{ ...cardStyle, gridColumn: '1 / span 2' }}>
          <div className="mb-4 flex items-center">
            <Skeleton width={40} height={40} className="mr-3 rounded-lg" />
            <Skeleton width="180px" height={28} className="rounded" />
          </div>
          <div className="mb-6 grid grid-cols-3 gap-4">
            {[1, 2, 3].map(idx => (
              <div key={idx}>
                <Skeleton width="80px" height={16} className="mb-2 rounded" />
                <Skeleton width="60px" height={32} className="rounded" />
              </div>
            ))}
          </div>
          <div className="mb-2">
            <div className="mb-2 flex items-center justify-between">
              <Skeleton width="100px" height={20} className="rounded" />
              <Skeleton width="80px" height={24} className="rounded" />
            </div>
            <Skeleton width="100%" height={12} className="rounded-full" />
          </div>
          <div className="mt-2 flex justify-between">
            <Skeleton width="60px" height={16} className="rounded" />
            <Skeleton width="50px" height={16} className="rounded" />
          </div>
        </div>

        {/* Current Context Card */}
        <div style={cardStyle}>
          <div className="mb-4 flex items-center">
            <Skeleton width={40} height={40} className="mr-3 rounded-lg" />
            <Skeleton width="140px" height={28} className="rounded" />
          </div>
          <Skeleton width="100%" height={60} className="mb-6 rounded-lg" />

          <div className="mb-4 flex justify-between">
            <Skeleton width="100px" height={16} className="rounded" />
            <Skeleton width="40px" height={16} className="rounded" />
          </div>

          <Skeleton width="100%" height={36} className="rounded" />
        </div>
      </div>

      {/* Managed Clusters & Quick Actions */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Managed Clusters Table */}
        <div style={{ ...cardStyle, gridColumn: '1 / span 2' }}>
          <div className="mb-4 flex items-center">
            <Skeleton width={40} height={40} className="mr-3 rounded-lg" />
            <Skeleton width="160px" height={28} className="rounded" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>
                    <Skeleton width="70px" height={20} className="rounded" />
                  </th>
                  <th>
                    <Skeleton width="70px" height={20} className="rounded" />
                  </th>
                  <th>
                    <Skeleton width="60px" height={20} className="rounded" />
                  </th>
                  <th>
                    <Skeleton width="80px" height={20} className="rounded" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <tr
                      key={i}
                      className="border-b"
                      style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}
                    >
                      <td className="py-3">
                        <Skeleton width="100px" height={20} className="rounded" />
                      </td>
                      <td className="py-3">
                        <Skeleton width="80px" height={24} className="rounded" />
                      </td>
                      <td className="py-3">
                        <Skeleton width="70px" height={24} className="rounded-full" />
                      </td>
                      <td className="py-3">
                        <Skeleton width="90px" height={20} className="rounded" />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div style={cardStyle}>
          <div className="mb-4 flex items-center">
            <Skeleton width={40} height={40} className="mr-3 rounded-lg" />
            <Skeleton width="130px" height={28} className="rounded" />
          </div>

          <div className="space-y-3">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg p-3"
                  style={{ backgroundColor: isDark ? '#202e45' : '#f8fafc' }}
                >
                  <div className="flex items-center gap-3">
                    <Skeleton width={36} height={36} className="rounded-lg" />
                    <Skeleton width="100px" height={20} className="rounded" />
                  </div>
                  <Skeleton width={20} height={20} className="rounded" />
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClusterSkeleton;

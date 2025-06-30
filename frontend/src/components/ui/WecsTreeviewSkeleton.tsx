import React from 'react';
import useTheme from '../../stores/themeStore';
// import Skeleton from './Skeleton';
import { Box } from '@mui/material';

const WecsTreeviewSkeleton: React.FC = () => {
  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';

  return (
    <Box sx={{ display: 'flex', height: '85vh', width: '100%', position: 'relative' }}>
      <Box
        sx={{
          flex: 1,
          position: 'relative',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            mb: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flex: 1,
            justifyContent: 'space-between',
            padding: 2,
            borderRadius: 1,
            boxShadow: '0 6px 6px rgba(0,0,0,0.1)',
            background: isDark ? 'rgb(15, 23, 42)' : '#fff',
          }}
        >
          <div
            className="h-8 w-64 animate-pulse rounded"
            style={{
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            }}
          ></div>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <div
              className="h-10 w-10 animate-pulse rounded-full"
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              }}
            ></div>
            <div
              className="h-10 w-10 animate-pulse rounded-full"
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              }}
            ></div>
            <div
              className="h-10 w-32 animate-pulse rounded"
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              }}
            ></div>
          </Box>
        </Box>

        {/* Info banner */}
        <Box
          sx={{
            width: '100%',
            padding: '8px 16px',
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
            borderRadius: '4px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            className="h-4 w-3/4 animate-pulse rounded"
            style={{
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            }}
          ></div>
        </Box>

        {/* Main content */}
        <Box sx={{ width: '100%', height: 'calc(100% - 80px)', position: 'relative' }}>
          <div
            className="relative h-full w-full overflow-hidden"
            style={{
              backgroundColor: isDark ? 'rgb(15, 23, 42)' : '#ffffff',
            }}
          >
            {/* Controls */}
            <div
              className="absolute right-4 top-4 z-10 flex flex-col gap-2 rounded-md p-2"
              style={{
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(248, 250, 252, 0.8)',
              }}
            >
              <div
                className="h-9 w-9 animate-pulse rounded-full"
                style={{
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                }}
              ></div>
              <div
                className="h-9 w-9 animate-pulse rounded-full"
                style={{
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                }}
              ></div>
              <div
                className="h-9 w-9 animate-pulse rounded-full"
                style={{
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                }}
              ></div>
            </div>

            {/* Mini-map skeleton */}
            <div
              className="absolute bottom-4 right-4 z-10 rounded-md p-1"
              style={{
                width: 120,
                height: 80,
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(248, 250, 252, 0.5)',
                border: isDark
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : '1px solid rgba(0, 0, 0, 0.1)',
              }}
            >
              {/* Minimap nodes */}
              <div className="absolute left-2 top-2 h-1 w-4 rounded-sm bg-blue-400 opacity-30"></div>
              <div className="absolute left-2 top-5 h-1 w-4 rounded-sm bg-blue-400 opacity-30"></div>
              <div className="absolute left-2 top-8 h-1 w-4 rounded-sm bg-blue-400 opacity-30"></div>

              <div className="absolute left-10 top-3 h-1 w-4 rounded-sm bg-blue-400 opacity-30"></div>
              <div className="absolute left-10 top-6 h-1 w-4 rounded-sm bg-blue-400 opacity-30"></div>

              <div className="left-18 absolute top-2 h-1 w-4 rounded-sm bg-blue-400 opacity-30"></div>
              <div className="left-18 absolute top-5 h-1 w-4 rounded-sm bg-blue-400 opacity-30"></div>
              <div className="left-18 absolute top-8 h-1 w-4 rounded-sm bg-blue-400 opacity-30"></div>
            </div>
          </div>
        </Box>
      </Box>
    </Box>
  );
};

export default WecsTreeviewSkeleton;

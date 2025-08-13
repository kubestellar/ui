import { memo, useMemo } from 'react';
import { Box, keyframes } from '@mui/material';
import useTheme from '../../stores/themeStore';

// Optimized animations with GPU acceleration
const shimmer = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-4px); }
`;

interface UnifiedSkeletonProps {
  variant?: 'wds' | 'treeview';
  className?: string;
}

const UnifiedSkeleton = memo<UnifiedSkeletonProps>(({ variant = 'wds', className = '' }) => {
  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';

  // Memoized theme-based styles for performance
  const styles = useMemo(
    () => ({
      // Color schemes
      primary: isDark ? '#1e293b' : '#f8fafc',
      secondary: isDark ? '#334155' : '#e2e8f0',
      accent: isDark ? '#475569' : '#cbd5e1',
      border: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.3)',
      shadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.1)',

      // Gradients
      gradient: isDark
        ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))'
        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95))',

      // Skeleton colors
      skeleton: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
      skeletonHover: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
    }),
    [isDark]
  );

  // Memoized skeleton item component for reusability
  const SkeletonItem = ({
    width,
    height,
    delay = 0,
    className = '',
    style = {},
  }: {
    width: string | number;
    height: string | number;
    delay?: number;
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <Box
      sx={{
        width,
        height,
        borderRadius: '8px',
        background: styles.skeleton,
        position: 'relative',
        overflow: 'hidden',
        animation: `${pulse} 2s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: `linear-gradient(90deg, transparent, ${styles.skeletonHover}, transparent)`,
          animation: `${shimmer} 2s ease-in-out infinite`,
          animationDelay: `${delay}s`,
        },
        ...style,
      }}
      className={className}
    />
  );

  if (variant === 'treeview') {
    return (
      <Box
        sx={{
          height: '100%',
          width: '100%',
          background: styles.gradient,
          position: 'relative',
          overflow: 'hidden',
        }}
        className={className}
      >
        {/* Header */}
        <Box
          sx={{
            p: 3,
            mb: 3,
            background: styles.gradient,
            borderRadius: '16px',
            boxShadow: styles.shadow,
            border: `1px solid ${styles.border}`,
            backdropFilter: 'blur(20px)',
          }}
        >
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <SkeletonItem width={200} height={32} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <SkeletonItem width={120} height={40} />
              <SkeletonItem width={40} height={40} />
              <SkeletonItem width={40} height={40} />
            </Box>
          </Box>
          <SkeletonItem width="60%" height={20} />
        </Box>

        {/* Info Banner */}
        <Box
          sx={{
            p: 2,
            mb: 3,
            background: styles.gradient,
            borderRadius: '12px',
            border: `1px solid ${styles.border}`,
          }}
        >
          <SkeletonItem width="70%" height={18} />
        </Box>

        {/* Main Canvas Area */}
        <Box
          sx={{
            height: 'calc(100% - 200px)',
            position: 'relative',
            background: styles.gradient,
            borderRadius: '16px',
            border: `1px solid ${styles.border}`,
            overflow: 'hidden',
          }}
        >
          {/* Floating Node Skeletons */}
          {[1, 2, 3, 4, 5].map(i => (
            <Box
              key={i}
              sx={{
                position: 'absolute',
                left: `${20 + i * 15}%`,
                top: `${15 + i * 12}%`,
                animation: `${float} 3s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            >
              <Box
                sx={{
                  p: 2,
                  background: styles.gradient,
                  borderRadius: '12px',
                  boxShadow: styles.shadow,
                  border: `1px solid ${styles.border}`,
                  minWidth: 200,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <SkeletonItem width={16} height={16} />
                  <SkeletonItem width={80} height={16} />
                  <Box sx={{ flex: 1 }} />
                  <SkeletonItem width={16} height={16} />
                </Box>
                <SkeletonItem width="60%" height={14} />
              </Box>
            </Box>
          ))}

          {/* Controls */}
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              p: 2,
              background: styles.gradient,
              borderRadius: '12px',
              boxShadow: styles.shadow,
              border: `1px solid ${styles.border}`,
              backdropFilter: 'blur(20px)',
            }}
          >
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              {[1, 2, 3, 4].map(i => (
                <SkeletonItem key={i} width={32} height={32} delay={i * 0.1} />
              ))}
            </Box>
            <SkeletonItem width={60} height={20} />
          </Box>

          {/* Minimap */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              width: 120,
              height: 80,
              p: 2,
              background: styles.gradient,
              borderRadius: '12px',
              boxShadow: styles.shadow,
              border: `1px solid ${styles.border}`,
            }}
          >
            {[1, 2, 3, 4, 5, 6].map(i => (
              <SkeletonItem
                key={i}
                width={16}
                height={4}
                delay={i * 0.1}
                className="absolute"
                style={{
                  left: `${10 + i * 15}%`,
                  top: `${10 + i * 12}%`,
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>
    );
  }

  // WDS variant
  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        background: styles.gradient,
        p: 3,
      }}
      className={className}
    >
      {/* Header */}
      <Box
        sx={{
          p: 3,
          mb: 4,
          background: styles.gradient,
          borderRadius: '16px',
          boxShadow: styles.shadow,
          border: `1px solid ${styles.border}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SkeletonItem width={240} height={40} />
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <SkeletonItem width={40} height={40} />
            <SkeletonItem width={40} height={40} />
            <SkeletonItem width={160} height={40} />
          </Box>
        </Box>
      </Box>

      {/* Info Banner */}
      <Box
        sx={{
          p: 3,
          mb: 4,
          background: styles.gradient,
          borderRadius: '12px',
          border: `1px solid ${styles.border}`,
        }}
      >
        <SkeletonItem width="50%" height={20} />
      </Box>

      {/* Main Content Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 3fr',
          gap: 4,
          height: 'calc(100% - 200px)',
        }}
      >
        {/* Left Panel */}
        <Box
          sx={{
            p: 3,
            background: styles.gradient,
            borderRadius: '16px',
            border: `1px solid ${styles.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <SkeletonItem width="80%" height={32} />
          {[1, 2, 3, 4, 5].map(i => (
            <SkeletonItem key={i} width="100%" height={40} delay={i * 0.1} />
          ))}
        </Box>

        {/* Right Panel - Resource List */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Box
              key={i}
              sx={{
                p: 3,
                background: styles.gradient,
                borderRadius: '12px',
                border: `1px solid ${styles.border}`,
                borderLeft: '4px solid #4498FF',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <SkeletonItem width={20} height={20} />
                <Box sx={{ flex: 1 }}>
                  <SkeletonItem width="70%" height={24} />
                  <SkeletonItem width="40%" height={16} delay={0.2} />
                </Box>
                <SkeletonItem width={80} height={28} />
                <SkeletonItem width={100} height={20} />
              </Box>
            </Box>
          ))}

          {/* Pagination */}
          <Box
            sx={{
              p: 3,
              background: styles.gradient,
              borderRadius: '12px',
              border: `1px solid ${styles.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <SkeletonItem width={120} height={24} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              {[1, 2, 3, 4].map(i => (
                <SkeletonItem key={i} width={40} height={32} delay={i * 0.1} />
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
});

UnifiedSkeleton.displayName = 'UnifiedSkeleton';

export default UnifiedSkeleton;

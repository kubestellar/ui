import React from 'react';
import { Box, Typography, Chip, Grid, Paper } from '@mui/material';
import useTheme from '../stores/themeStore';
import { darkTheme, lightTheme } from '../lib/theme-utils';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StorageIcon from '@mui/icons-material/Storage';
import SpeedIcon from '@mui/icons-material/Speed';

interface ResourceStatsProps {
  resources: Array<{
    kind: string;
    metadata?: {
      name: string;
      namespace?: string;
      creationTimestamp?: string;
    };
    status?: string;
    labels?: Record<string, string>;
  }>;
}

const ResourceStats: React.FC<ResourceStatsProps> = ({ resources }) => {
  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = resources.length;

    const kindCounts = resources.reduce(
      (acc, resource) => {
        acc[resource.kind] = (acc[resource.kind] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const namespaceCounts = resources.reduce(
      (acc, resource) => {
        const ns = resource.metadata?.namespace || 'default';
        acc[ns] = (acc[ns] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      total,
      kindCounts,
      namespaceCounts,
      topKinds: Object.entries(kindCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3),
      topNamespaces: Object.entries(namespaceCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3),
    };
  }, [resources]);

  if (resources.length === 0) {
    return null;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 3,
        backgroundColor: isDark ? darkTheme.bg.secondary : lightTheme.bg.secondary,
        borderRadius: '16px',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
        background: isDark
          ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.8) 0%, rgba(31, 41, 55, 0.8) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <TrendingUpIcon
          sx={{
            color: isDark ? darkTheme.brand.primaryLight : lightTheme.brand.primary,
          }}
        />
        <Typography
          variant="h6"
          sx={{
            color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
            fontWeight: 600,
          }}
        >
          Resource Overview
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Top Resource Kinds */}
        <Grid item xs={12} md={6}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <StorageIcon
                fontSize="small"
                sx={{
                  color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
                  fontWeight: 600,
                }}
              >
                Top Resource Kinds
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {stats.topKinds.map(([kind, count]) => (
                <Box
                  key={kind}
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                      fontWeight: 500,
                    }}
                  >
                    {kind}
                  </Typography>
                  <Chip
                    label={count}
                    size="small"
                    sx={{
                      backgroundColor: isDark
                        ? 'rgba(59, 130, 246, 0.2)'
                        : 'rgba(59, 130, 246, 0.1)',
                      color: isDark ? darkTheme.brand.primaryLight : lightTheme.brand.primary,
                      fontWeight: 600,
                      minWidth: '40px',
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        </Grid>

        {/* Top Namespaces */}
        <Grid item xs={12} md={6}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SpeedIcon
                fontSize="small"
                sx={{
                  color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
                  fontWeight: 600,
                }}
              >
                Top Namespaces
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {stats.topNamespaces.map(([namespace, count]) => (
                <Box
                  key={namespace}
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                      fontWeight: 500,
                      maxWidth: '120px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {namespace}
                  </Typography>
                  <Chip
                    label={count}
                    size="small"
                    sx={{
                      backgroundColor: isDark
                        ? 'rgba(139, 92, 246, 0.2)'
                        : 'rgba(139, 92, 246, 0.1)',
                      color: isDark ? darkTheme.brand.secondaryLight : lightTheme.brand.secondary,
                      fontWeight: 600,
                      minWidth: '40px',
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default ResourceStats;

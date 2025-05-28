// src/plugins/ExploreApps.tsx
import {
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  // Star as StarIcon,
  GetApp as GetAppIcon,
  // StorageOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Button,
  CircularProgress,
  Tooltip,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Rating,
  Chip,
  Fade,
  // Zoom,
  Slide,
  Skeleton,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
// import { api } from '../../src/lib/api';

interface Plugin {
  name: string;
  displayName: string;
  version: string;
  description?: string;
  rating?: number;
  downloads?: number;
  tags?: string[];
  enabled: boolean;
  route?: string;
}

interface ExploreAppsProps {
  onRefresh?: () => void;
}

const ExploreApps: React.FC<ExploreAppsProps> = ({ onRefresh }) => {
  const [availablePlugins, setAvailablePlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [installingPlugin, setInstallingPlugin] = useState<string | null>(null);
  const [installedPlugins, setInstalledPlugins] = useState<string[]>([]);

  useEffect(() => {
    // Load installed plugins from localStorage or API
    const installedPlugins = localStorage.getItem('installedPlugins');
    if (installedPlugins) {
      setInstalledPlugins(JSON.parse(installedPlugins));
    }
  }, []);

  const fetchAvailablePlugins = () => {
    setLoading(true);
    setError(null);

    // Hardcoded plugins data
    const hardcodedPlugins: Plugin[] = [
      {
        name: 'cronjob-scheduler',
        displayName: 'CronJob Scheduler',
        version: '0.9.4',
        description: 'Schedules and manages cron jobs',
        rating: 4.2,
        downloads: 11500,
        tags: ['finance', 'optimization'],
        enabled: false,
      },
      {
        name: 'secrets-manager',
        displayName: 'Secrets Manager',
        version: '1.0.0',
        description: 'Manage Kubernetes secrets and configurations',
        rating: 4.5,
        downloads: 24500,
        tags: ['security', 'configuration'],
        enabled: false,
        route: '/plugins/secrets-ui-manager'
      },
      {
        name: 'network-policy-visualizer',
        displayName: 'Network Policy Visualizer',
        version: '1.5.1',
        description: 'Visualizes network policies and their relationships',
        rating: 4.6,
        downloads: 16700,
        tags: ['security', 'compliance'],
        enabled: false,
      },
      {
        name: 'cost-estimator',
        displayName: 'Resource Cost Estimator',
        version: '2.3.0',
        description: 'Estimates cloud cost based on workload resource usage',
        rating: 4.7,
        downloads: 29800,
        tags: ['scaling', 'performance'],
        enabled: false,
      },
    ];

    setAvailablePlugins(hardcodedPlugins);
    setLoading(false);
  };

  const handleInstall = async (plugin: Plugin) => {
    setInstallingPlugin(plugin.name);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update installed plugins
      const newInstalledPlugins = [...installedPlugins, plugin.name];
      setInstalledPlugins(newInstalledPlugins);
      localStorage.setItem('installedPlugins', JSON.stringify(newInstalledPlugins));
      
      // Remove from available plugins
      setAvailablePlugins(prev => prev.filter(p => p.name !== plugin.name));
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to install plugin:', error);
    } finally {
      setInstallingPlugin(null);
    }
  };

  const renderPluginCard = (plugin: Plugin) => (
    <Grid item xs={12} sm={6} md={4} key={plugin.name}>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'rgba(30, 41, 59, 0.6)',
          borderRadius: 2,
          border: '1px solid rgba(59, 130, 246, 0.1)',
          backdropFilter: 'blur(10px)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            bgcolor: plugin.enabled ? '#22c55e' : '#3b82f6',
            transition: 'background-color 0.3s ease',
          },
          '&:hover': {
            bgcolor: 'rgba(30, 41, 59, 0.8)',
            borderColor: 'rgba(59, 130, 246, 0.3)',
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 24px rgba(0, 0, 0, 0.3)',
            '&::before': {
              bgcolor: '#06b6d4',
            },
          },
        }}
      >
        <CardContent sx={{ flexGrow: 1, p: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontSize: { xs: '1rem', sm: '1.1rem' },
                fontWeight: 600,
                color: '#e2e8f0',
                lineHeight: 1.2,
                flex: 1,
              }}
            >
              {plugin.displayName}
            </Typography>
            {plugin.enabled && (
              <Tooltip title="Already installed">
                <CheckCircleIcon
                  sx={{
                    color: '#22c55e',
                    fontSize: 20,
                    ml: 1,
                  }}
                />
              </Tooltip>
            )}
          </Box>

          <Typography
            variant="body2"
            sx={{
              color: '#94a3b8',
              fontSize: { xs: '0.875rem', sm: '0.95rem' },
              mb: 3,
              lineHeight: 1.5,
              height: '3rem',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {plugin.description || 'No description available'}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {plugin.rating !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Rating
                  value={plugin.rating}
                  precision={0.5}
                  readOnly
                  size="small"
                  sx={{
                    '& .MuiRating-iconFilled': {
                      color: '#fbbf24',
                    },
                    '& .MuiRating-iconEmpty': {
                      color: 'rgba(251, 191, 36, 0.3)',
                    },
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    color: '#94a3b8',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  {plugin.rating}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={`v${plugin.version}`}
                size="small"
                sx={{
                  bgcolor: 'rgba(59, 130, 246, 0.1)',
                  color: '#7dd3fc',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}
              />
              {plugin.downloads !== undefined && (
                <Chip
                  icon={<GetAppIcon sx={{ fontSize: '0.875rem !important' }} />}
                  label={`${plugin.downloads.toLocaleString()}`}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(34, 197, 94, 0.1)',
                    color: '#86efac',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    '& .MuiChip-icon': {
                      color: '#86efac',
                    },
                  }}
                />
              )}
            </Box>
          </Box>
        </CardContent>

        <CardActions sx={{ p: 3, pt: 0 }}>
          <Button
            variant="contained"
            fullWidth
            startIcon={
              installingPlugin === plugin.name ? (
                <CircularProgress size={16} sx={{ color: 'inherit' }} />
              ) : plugin.enabled ? (
                <CheckCircleIcon />
              ) : (
                <DownloadIcon />
              )
            }
            onClick={() => handleInstall(plugin)}
            disabled={plugin.enabled || installingPlugin === plugin.name}
            sx={{
              height: 44,
              fontSize: '0.875rem',
              fontWeight: 600,
              borderRadius: 2,
              textTransform: 'none',
              transition: 'all 0.3s ease',
              ...(plugin.enabled
                ? {
                    bgcolor: 'rgba(34, 197, 94, 0.1)',
                    color: '#86efac',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    '&:hover': {
                      bgcolor: 'rgba(34, 197, 94, 0.1)',
                    },
                  }
                : {
                    bgcolor: 'rgba(59, 130, 246, 0.2)',
                    color: '#7dd3fc',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    '&:hover': {
                      bgcolor: 'rgba(59, 130, 246, 0.3)',
                      borderColor: 'rgba(59, 130, 246, 0.5)',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                    },
                  }),
              '&:disabled': {
                bgcolor: 'rgba(100, 116, 139, 0.1)',
                color: '#64748b',
                border: '1px solid rgba(100, 116, 139, 0.2)',
              },
            }}
          >
            {installingPlugin === plugin.name
              ? 'Installing...'
              : plugin.enabled
                ? 'Installed'
                : 'Install'}
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );

  useEffect(() => {
    fetchAvailablePlugins();
  }, []);

  const LoadingSkeleton = () => (
    <Grid container spacing={3}>
      {Array.from({ length: 8 }).map((_, index) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
          <Card
            sx={{
              height: 280,
              bgcolor: 'rgba(30, 41, 59, 0.6)',
              borderRadius: 2,
              border: '1px solid rgba(59, 130, 246, 0.1)',
            }}
          >
            <CardContent>
              <Skeleton
                variant="text"
                width="80%"
                height={32}
                sx={{ bgcolor: 'rgba(100, 116, 139, 0.3)' }}
              />
              <Skeleton
                variant="text"
                width="100%"
                height={20}
                sx={{ bgcolor: 'rgba(100, 116, 139, 0.3)', mt: 1 }}
              />
              <Skeleton
                variant="text"
                width="90%"
                height={20}
                sx={{ bgcolor: 'rgba(100, 116, 139, 0.3)' }}
              />
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Skeleton
                  variant="rectangular"
                  width={100}
                  height={20}
                  sx={{ bgcolor: 'rgba(100, 116, 139, 0.3)', borderRadius: 1 }}
                />
                <Skeleton
                  variant="rectangular"
                  width={80}
                  height={20}
                  sx={{ bgcolor: 'rgba(100, 116, 139, 0.3)', borderRadius: 1 }}
                />
              </Box>
            </CardContent>
            <CardActions>
              <Skeleton
                variant="rectangular"
                width={100}
                height={36}
                sx={{ bgcolor: 'rgba(100, 116, 139, 0.3)', borderRadius: 1 }}
              />
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Fade in={true} timeout={800}>
      <Box
        sx={{
          width: '100%',
          maxWidth: 1200,
          mx: 'auto',
          mt: 2,
          px: { xs: 2, sm: 3, md: 4 },
          bgcolor: 'rgba(15, 23, 42, 0.95)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          backdropFilter: 'blur(10px)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, #3b82f6, #1e40af, #3b82f6)',
            animation: 'shimmer 3s ease-in-out infinite',
          },
          '@keyframes shimmer': {
            '0%, 100%': { opacity: 0.5 },
            '50%': { opacity: 1 },
          },
        }}
      >
        <Box sx={{ mb: 4, pt: 3 }}>
          <Typography
            variant="h4"
            component="h2"
            sx={{
              mb: 1,
              color: '#e2e8f0',
              fontWeight: 700,
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
              background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Plugin Marketplace
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#94a3b8',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              mb: 2,
            }}
          >
            Discover and install new plugins to extend your KubeStellar experience
          </Typography>

          {error && (
            <Slide direction="down" in={Boolean(error)} mountOnEnter unmountOnExit>
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  bgcolor: 'rgba(220, 38, 38, 0.1)',
                  color: '#fecaca',
                  border: '1px solid rgba(220, 38, 38, 0.3)',
                  borderRadius: 2,
                  '& .MuiAlert-icon': {
                    color: '#f87171',
                  },
                }}
              >
                {error}
              </Alert>
            </Slide>
          )}
        </Box>

        {loading ? (
          <LoadingSkeleton />
        ) : availablePlugins.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              color: '#64748b',
            }}
          >
            <Typography variant="h6" sx={{ mb: 1 }}>
              No plugins available
            </Typography>
            <Typography variant="body2">
              Check back later for new plugins in the marketplace
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3} sx={{ pb: 3 }}>
            {availablePlugins.map((plugin) => renderPluginCard(plugin))}
          </Grid>
        )}
      </Box>
    </Fade>
  );
};

export default ExploreApps;

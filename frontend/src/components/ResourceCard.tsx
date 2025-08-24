import React, { memo } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  IconButton,
  Button,
  Avatar,
  Stack,
  LinearProgress,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Folder as FolderIcon,
  Schedule as ScheduleIcon,
  Label as LabelIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { darkTheme, lightTheme } from '../lib/theme-utils';

interface Resource {
  kind: string;
  metadata?: {
    name: string;
    namespace?: string;
    uid?: string;
    creationTimestamp?: string;
    [key: string]: unknown;
  };
  status?: string;
  labels?: Record<string, string>;
  [key: string]: unknown;
}

interface ResourceCardProps {
  resource: Resource;
  isSelected: boolean;
  isDark: boolean;
  onSelect: (resource: Resource) => void;
  onViewDetails: (resource: Resource) => void;
  onActionClick: (event: React.MouseEvent<HTMLElement>, resource: Resource) => void;
}

// Utility function to get status color and icon
const getStatusInfo = (status: string | undefined, isDark: boolean, t: (key: string) => string) => {
  // Safely convert status to string and handle undefined/null cases
  const statusString = status?.toString?.() || status || '';
  const statusLower = statusString.toLowerCase();

  if (
    statusLower.includes('running') ||
    statusLower.includes('ready') ||
    statusLower.includes('active') ||
    statusLower.includes('healthy')
  ) {
    return {
      color: '#10b981',
      bgColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
      icon: <CheckCircleIcon sx={{ fontSize: 16, color: '#10b981' }} />,
      label: t('resources.status.healthy'),
    };
  }

  if (
    statusLower.includes('pending') ||
    statusLower.includes('progressing') ||
    statusLower.includes('updating') ||
    statusLower.includes('outofsync')
  ) {
    return {
      color: '#f59e0b',
      bgColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
      icon: <WarningIcon sx={{ fontSize: 16, color: '#f59e0b' }} />,
      label: t('resources.status.warning'),
    };
  }

  if (
    statusLower.includes('failed') ||
    statusLower.includes('error') ||
    statusLower.includes('crashloop') ||
    statusLower.includes('missing')
  ) {
    return {
      color: '#ef4444',
      bgColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
      icon: <ErrorIcon sx={{ fontSize: 16, color: '#ef4444' }} />,
      label: t('resources.status.error'),
    };
  }

  return {
    color: '#10b981',
    bgColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
    icon: <CheckCircleIcon sx={{ fontSize: 16, color: '#10b981' }} />,
    label: t('resources.status.active'),
  };
};

// Utility function to get kind icon and color
const getKindInfo = (kind: string, isDark: boolean) => {
  const kindLower = kind.toLowerCase();

  const kindMap: Record<string, { color: string; bgColor: string; icon: string }> = {
    pod: {
      color: '#3b82f6',
      bgColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
      icon: '🚀',
    },
    service: {
      color: '#8b5cf6',
      bgColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)',
      icon: '🔗',
    },
    deployment: {
      color: '#06b6d4',
      bgColor: isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.1)',
      icon: '📦',
    },
    configmap: {
      color: '#84cc16',
      bgColor: isDark ? 'rgba(132, 204, 22, 0.15)' : 'rgba(132, 204, 22, 0.1)',
      icon: '⚙️',
    },
    secret: {
      color: '#ef4444',
      bgColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
      icon: '🔐',
    },
    namespace: {
      color: '#f59e0b',
      bgColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
      icon: '📁',
    },
    node: {
      color: '#10b981',
      bgColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
      icon: '🖥️',
    },
    persistentvolume: {
      color: '#6366f1',
      bgColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)',
      icon: '💾',
    },
    ingress: {
      color: '#ec4899',
      bgColor: isDark ? 'rgba(236, 72, 153, 0.15)' : 'rgba(236, 72, 153, 0.1)',
      icon: '🌐',
    },
  };

  return (
    kindMap[kindLower] || {
      color: isDark ? '#6b7280' : '#9ca3af',
      bgColor: isDark ? 'rgba(107, 114, 128, 0.15)' : 'rgba(156, 163, 175, 0.1)',
      icon: '📋',
    }
  );
};

const ResourceCard = memo<ResourceCardProps>(
  ({ resource, isSelected, isDark, onSelect, onViewDetails, onActionClick }) => {
    const { t } = useTranslation();
    const statusInfo = getStatusInfo(resource.status, isDark, t);
    const kindInfo = getKindInfo(resource.kind, isDark);

    const formatDate = (timestamp: string | undefined) => {
      if (!timestamp) return t('resources.status.unknown');
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${diffInHours}h ago`;
      if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
      return date.toLocaleDateString();
    };

    const labelCount = resource.labels ? Object.keys(resource.labels).length : 0;

    return (
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          borderRadius: '16px',
          border: isSelected
            ? `2px solid ${isDark ? darkTheme.brand.primary : lightTheme.brand.primary}`
            : `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
          background: isDark
            ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)'
            : 'linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'pointer',
          overflow: 'hidden',
          boxShadow: isSelected
            ? `0 8px 32px ${isDark ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.15)'}`
            : isDark
              ? '0 4px 20px rgba(0, 0, 0, 0.25)'
              : '0 4px 20px rgba(0, 0, 0, 0.08)',
          '&:hover': {
            transform: 'translateY(-4px) scale(1.02)',
            boxShadow: isDark
              ? '0 12px 40px rgba(0, 0, 0, 0.35)'
              : '0 12px 40px rgba(0, 0, 0, 0.12)',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)'}`,
            '& .card-actions': {
              opacity: 1,
              transform: 'translateY(0)',
            },
          },
        }}
        onClick={() => onSelect(resource)}
      >
        {/* Selection indicator */}
        {isSelected && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: `linear-gradient(90deg, ${isDark ? darkTheme.brand.primary : lightTheme.brand.primary}, ${isDark ? darkTheme.brand.primaryLight : lightTheme.brand.primaryLight})`,
              zIndex: 1,
            }}
          />
        )}

        <CardContent sx={{ p: 3, pb: 2, flex: 1 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2.5 }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                backgroundColor: kindInfo.bgColor,
                color: kindInfo.color,
                border: `1px solid ${kindInfo.color}20`,
                fontSize: '1.2rem',
                mr: 2,
              }}
            >
              {kindInfo.icon}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  lineHeight: 1.3,
                  color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  mb: 0.5,
                }}
              >
                {resource.metadata?.name || t('resources.unknown')}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={resource.kind}
                  size="small"
                  sx={{
                    backgroundColor: kindInfo.bgColor,
                    color: kindInfo.color,
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    height: '20px',
                    '& .MuiChip-label': {
                      px: 1,
                    },
                  }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {statusInfo.icon}
                  <Chip
                    label={statusInfo.label}
                    size="small"
                    sx={{
                      backgroundColor: statusInfo.bgColor,
                      color: statusInfo.color,
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      height: '20px',
                      ml: 0.5,
                      '& .MuiChip-label': {
                        px: 1,
                      },
                    }}
                  />
                </Box>
              </Box>
            </Box>

            <IconButton
              size="small"
              onClick={e => {
                e.stopPropagation();
                onActionClick(e, resource);
              }}
              sx={{
                color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                '&:hover': {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                },
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Details */}
          <Stack spacing={1.5}>
            {resource.metadata?.namespace && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FolderIcon
                  sx={{
                    fontSize: 16,
                    color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                  }}
                >
                  {resource.metadata.namespace}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScheduleIcon
                sx={{
                  fontSize: 16,
                  color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                }}
              >
                {formatDate(resource.metadata?.creationTimestamp)}
              </Typography>
            </Box>

            {labelCount > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LabelIcon
                  sx={{
                    fontSize: 16,
                    color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                  }}
                >
                  {t('resources.labels_plural', { count: labelCount })}
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>

        {/* Actions */}
        <CardActions
          className="card-actions"
          sx={{
            px: 3,
            pb: 3,
            pt: 0,
            opacity: 0,
            transform: 'translateY(8px)',
            transition: 'all 0.2s ease-in-out',
          }}
        >
          <Button
            size="small"
            startIcon={<VisibilityIcon />}
            onClick={e => {
              e.stopPropagation();
              onViewDetails(resource);
            }}
            sx={{
              color: isDark ? darkTheme.brand.primaryLight : lightTheme.brand.primary,
              fontWeight: 600,
              fontSize: '0.8rem',
              textTransform: 'none',
              borderRadius: '8px',
              px: 2,
              '&:hover': {
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
              },
            }}
          >
            {t('resources.actions.viewDetails')}
          </Button>
        </CardActions>

        {/* Loading indicator for dynamic content */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            overflow: 'hidden',
          }}
        >
          <LinearProgress
            variant="indeterminate"
            sx={{
              height: '100%',
              opacity: 0,
              transition: 'opacity 0.3s ease',
              backgroundColor: 'transparent',
              '& .MuiLinearProgress-bar': {
                backgroundColor: isDark ? darkTheme.brand.primary : lightTheme.brand.primary,
              },
              '&.loading': {
                opacity: 1,
              },
            }}
          />
        </Box>
      </Card>
    );
  }
);

ResourceCard.displayName = 'ResourceCard';

export default ResourceCard;

import React from 'react';
import { Box, Typography, Chip, Divider, Paper, Tooltip } from '@mui/material';
import useTheme from '../stores/themeStore';
import { darkTheme, lightTheme } from '../lib/theme-utils';
import InfoIcon from '@mui/icons-material/Info';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FolderIcon from '@mui/icons-material/Folder';
import ScheduleIcon from '@mui/icons-material/Schedule';

interface ResourcePreviewProps {
  resource: {
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
  };
  children: React.ReactElement;
}

// Utility to safely render values as strings
function isRenderable(val: unknown): val is string | number {
  return typeof val === 'string' || typeof val === 'number';
}

const ResourcePreview: React.FC<ResourcePreviewProps> = ({ resource, children }) => {
  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';

  const getStatusColor = (status: string | undefined) => {
    if (!status) return { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' };

    switch (status) {
      case 'Running':
      case 'Active':
      case 'Healthy':
      case 'Synced':
        return {
          bg: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)',
          color: isDark ? '#34d399' : '#059669',
        };
      case 'Pending':
      case 'OutOfSync':
        return {
          bg: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.08)',
          color: isDark ? '#fbbf24' : '#d97706',
        };
      case 'Failed':
      case 'Missing':
        return {
          bg: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
          color: isDark ? '#f87171' : '#dc2626',
        };
      default:
        return {
          bg: isDark ? 'rgba(107, 114, 128, 0.15)' : 'rgba(107, 114, 128, 0.08)',
          color: isDark ? '#9ca3af' : '#6b7280',
        };
    }
  };

  const statusColors = getStatusColor(resource.status);

  const tooltipContent = (
    <Paper
      elevation={8}
      sx={{
        p: 2,
        maxWidth: 320,
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
        borderRadius: '12px',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
        boxShadow: isDark
          ? '0px 12px 32px rgba(0, 0, 0, 0.4)'
          : '0px 12px 32px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <InfoIcon
          fontSize="small"
          sx={{
            color: isDark ? darkTheme.brand.primaryLight : lightTheme.brand.primary,
          }}
        />
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
          }}
        >
          Resource Details
        </Typography>
      </Box>

      {/* Resource Name */}
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          mb: 1,
          color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
          fontSize: '1rem',
        }}
      >
        {resource.metadata?.name}
      </Typography>

      {/* Kind and Status */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Chip
          icon={<AccountTreeIcon />}
          label={resource.kind}
          size="small"
          sx={{
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
            color: isDark ? darkTheme.brand.primaryLight : darkTheme.brand.primary,
            fontWeight: 600,
          }}
        />
        {resource.status && (
          <Chip
            label={resource.status}
            size="small"
            sx={{
              backgroundColor: statusColors.bg,
              color: statusColors.color,
              fontWeight: 600,
            }}
          />
        )}
      </Box>

      <Divider
        sx={{
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          mb: 2,
        }}
      />

      {/* Details */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {resource.metadata?.namespace && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FolderIcon
              fontSize="small"
              sx={{
                color: isDark ? darkTheme.text.tertiary : lightTheme.text.tertiary,
              }}
            />
            <Typography
              variant="body2"
              sx={{
                color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
              }}
            >
              <strong>Namespace:</strong> {resource.metadata.namespace}
            </Typography>
          </Box>
        )}

        {resource.metadata?.creationTimestamp && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleIcon
              fontSize="small"
              sx={{
                color: isDark ? darkTheme.text.tertiary : lightTheme.text.tertiary,
              }}
            />
            <Typography
              variant="body2"
              sx={{
                color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
              }}
            >
              <strong>Created:</strong>{' '}
              {new Date(resource.metadata.creationTimestamp).toLocaleDateString()}
            </Typography>
          </Box>
        )}

        {resource.metadata?.uid && (
          <Typography
            variant="caption"
            sx={{
              color: isDark ? darkTheme.text.tertiary : lightTheme.text.tertiary,
              fontFamily: 'monospace',
              fontSize: '0.7rem',
              wordBreak: 'break-all',
            }}
          >
            <strong>UID:</strong> {resource.metadata.uid}
          </Typography>
        )}
      </Box>

      {/* Labels */}
      {resource.labels && Object.keys(resource.labels).length > 0 && (
        <>
          <Divider
            sx={{
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              my: 2,
            }}
          />
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'block',
                mb: 1,
              }}
            >
              Labels ({Object.keys(resource.labels).length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {Object.entries(resource.labels)
                .slice(0, 4)
                .map(([key, value]) =>
                  isRenderable(value) ? (
                    <Chip
                      key={`${key}-${value}`}
                      label={`${key}:${value}`}
                      size="small"
                      sx={{
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : 'rgba(0, 0, 0, 0.05)',
                        color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
                        fontSize: '0.65rem',
                        height: '20px',
                      }}
                    />
                  ) : null
                )}
              {Object.keys(resource.labels).length > 4 && (
                <Chip
                  label={`+${Object.keys(resource.labels).length - 4}`}
                  size="small"
                  sx={{
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                    color: isDark ? darkTheme.text.tertiary : lightTheme.text.tertiary,
                    fontSize: '0.65rem',
                    height: '20px',
                  }}
                />
              )}
            </Box>
          </Box>
        </>
      )}
    </Paper>
  );

  return (
    <Tooltip
      title={tooltipContent}
      arrow
      placement="top"
      enterDelay={300}
      leaveDelay={200}
      componentsProps={{
        tooltip: {
          sx: {
            bgcolor: 'transparent',
            maxWidth: 'none',
          },
        },
        arrow: {
          sx: {
            color: isDark ? '#1f2937' : '#ffffff',
          },
        },
      }}
    >
      {children}
    </Tooltip>
  );
};

export default ResourcePreview;

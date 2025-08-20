import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Fade,
  Skeleton,
  Divider,
  Stack,
  Collapse,
  IconButton,
  Tooltip,
  Autocomplete,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import useTheme from '../stores/themeStore';
import { useResourceFilters } from '../hooks/useResourceFilters';
import ResourceFilters, { ResourceFilter } from '../components/ResourceFilters';
import { darkTheme, lightTheme } from '../lib/theme-utils';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { ResourceItem } from '../components/ListViewComponent';
//
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

// Define the type for a single resource kind object for Autocomplete
interface ResourceKind {
  name: string;
  kind: string;
  group: string;
  version: string;
}

// Utility to safely render values as strings
function isRenderable(val: unknown): val is string | number {
  return typeof val === 'string' || typeof val === 'number';
}

const ResourceFilterPage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';

  const {
    resourceKinds = [],
    namespaces = [],
    filteredResources = [],
    isLoading,
    error,
    applyFilters,
  } = useResourceFilters();

  // State for Autocomplete (object or null)
  const [selectedKind, setSelectedKind] = useState<ResourceKind | null>(null);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [resourceFilters, setResourceFilters] = useState<ResourceFilter>({});
  const [showFilters, setShowFilters] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Convert filteredResources to ResourceItem[] type with correct status type
  const resources: ResourceItem[] = (filteredResources as unknown as Resource[]).map(resource => ({
    kind: resource.kind,
    name: resource.metadata?.name || '',
    namespace: resource.metadata?.namespace || '',
    status: (typeof resource.status === 'string'
      ? resource.status === 'Running' || resource.status === 'Active'
        ? 'Healthy'
        : resource.status === 'Pending'
          ? 'OutOfSync'
          : resource.status === 'Failed'
            ? 'Missing'
            : 'Synced'
      : undefined) as ResourceItem['status'],
    createdAt: resource.metadata?.creationTimestamp?.toString() || '',
    labels: resource.labels || {},
    metadata: resource.metadata || {},
  }));

  // Handler for Autocomplete component
  const handleKindChange = (_event: React.SyntheticEvent, value: ResourceKind | null) => {
    setSelectedKind(value);
  };

  const handleNamespaceChange = (event: SelectChangeEvent) => {
    setSelectedNamespace(event.target.value);
  };

  const handleFiltersChange = useCallback((filters: ResourceFilter) => {
    setResourceFilters(filters);
  }, []);

  const handleApplyFilters = useCallback(async () => {
    // Use selectedKind.name
    if (selectedKind && selectedNamespace) {
      await applyFilters(selectedKind.name, selectedNamespace, resourceFilters);
    }
  }, [selectedKind, selectedNamespace, resourceFilters, applyFilters]);

  const handleRefresh = useCallback(async () => {
    // Use selectedKind.name
    if (selectedKind && selectedNamespace) {
      setIsRefreshing(true);
      await applyFilters(selectedKind.name, selectedNamespace, resourceFilters);
      setIsRefreshing(false);
    }
  }, [selectedKind, selectedNamespace, resourceFilters, applyFilters]);

  useEffect(() => {
    // Auto-apply filters when both kind and namespace are selected
    if (selectedKind && selectedNamespace) {
      handleApplyFilters();
    }
  }, [selectedKind, selectedNamespace, handleApplyFilters]);

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Helper function to determine status color
  const getStatusColor = (status: string | undefined) => {
    if (!status) return { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' };

    switch (status) {
      case 'Healthy':
      case 'Synced':
        return {
          bg: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)',
          color: isDark ? '#34d399' : '#059669',
        };
      case 'OutOfSync':
        return {
          bg: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.08)',
          color: isDark ? '#fbbf24' : '#d97706',
        };
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

  const filteredNamespaces = namespaces.filter(
    (ns: { name: string }) => !ns.name.startsWith('kube-') && ns.name !== 'kubestellar-report'
  );

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        maxWidth: '1400px',
        margin: '0 auto',
        backgroundColor: isDark ? darkTheme.bg.primary : lightTheme.bg.primary,
        minHeight: '100vh',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{
            color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
            fontWeight: 600,
            fontSize: { xs: '1.5rem', sm: '2rem' },
          }}
        >
          {t('resources.title')}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={t('resources.toggleFilters')}>
            <IconButton
              onClick={toggleFilters}
              sx={{
                color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
                '&:hover': {
                  color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              <FilterAltIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('resources.refresh')}>
            <IconButton
              onClick={handleRefresh}
              disabled={isRefreshing || !selectedKind || !selectedNamespace}
              sx={{
                color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
                '&:hover': {
                  color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                },
                '&.Mui-disabled': {
                  color: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.26)',
                },
              }}
            >
              {isRefreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Collapse in={showFilters}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            mb: 3,
            backgroundColor: isDark ? darkTheme.bg.secondary : lightTheme.bg.secondary,
            boxShadow: isDark ? darkTheme.shadow.md : lightTheme.shadow.md,
            borderRadius: '12px',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <Autocomplete
                options={
                  resourceKinds
                    ? [...resourceKinds].sort((a, b) => a.kind.localeCompare(b.kind))
                    : []
                }
                getOptionLabel={option => option.kind}
                value={selectedKind}
                onChange={handleKindChange}
                isOptionEqualToValue={(option, value) => option.name === value.name}
                PaperComponent={props => (
                  <Paper
                    elevation={6}
                    {...props}
                    sx={{
                      backgroundColor: isDark ? '#1f2937' : '#fff',
                      color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                      boxShadow: isDark
                        ? '0px 5px 15px rgba(0, 0, 0, 0.4)'
                        : '0px 5px 15px rgba(0, 0, 0, 0.2)',
                      borderRadius: '8px',
                      border: isDark
                        ? '1px solid rgba(255, 255, 255, 0.1)'
                        : '1px solid rgba(0, 0, 0, 0.05)',
                    }}
                  />
                )}
                renderOption={(props, option, { selected }) => (
                  <li
                    {...props}
                    style={{
                      ...props.style,
                      backgroundColor: selected
                        ? isDark
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'rgba(59, 130, 246, 0.08)'
                        : undefined,
                    }}
                  >
                    {option.kind}
                  </li>
                )}
                renderInput={params => (
                  <TextField
                    {...params}
                    label={t('resources.selectKind')}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: isDark
                          ? darkTheme.element.input
                          : lightTheme.element.input,
                        color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                        borderRadius: '8px',
                      },
                      '& .MuiInputLabel-root': {
                        color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
                      },
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <FormControl
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: isDark ? darkTheme.element.input : lightTheme.element.input,
                    color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                    borderRadius: '8px',
                  },
                  '& .MuiInputLabel-root': {
                    color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
                  },
                }}
              >
                <InputLabel id="namespace-label">{t('resources.selectNamespace')}</InputLabel>
                <Select
                  labelId="namespace-label"
                  value={selectedNamespace}
                  label={t('resources.selectNamespace')}
                  onChange={handleNamespaceChange}
                  MenuProps={{
                    PaperProps: {
                      component: Paper,
                      elevation: 6,
                      sx: {
                        backgroundColor: isDark ? '#1f2937' : '#fff', // Fully opaque
                        color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                        boxShadow: isDark
                          ? '0px 5px 15px rgba(0, 0, 0, 0.4)'
                          : '0px 5px 15px rgba(0, 0, 0, 0.2)',
                        maxHeight: 300,
                        borderRadius: '8px',
                        border: isDark
                          ? '1px solid rgba(255, 255, 255, 0.1)'
                          : '1px solid rgba(0, 0, 0, 0.05)',
                        opacity: 1,
                      },
                    },
                  }}
                >
                  {filteredNamespaces.map((ns: { name: string }) => (
                    <MenuItem
                      key={ns.name}
                      value={ns.name}
                      sx={{
                        '&:hover': {
                          backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(0, 0, 0, 0.04)',
                        },
                        '&.Mui-selected': {
                          backgroundColor: isDark
                            ? 'rgba(59, 130, 246, 0.15)'
                            : 'rgba(59, 130, 246, 0.08)',
                          '&:hover': {
                            backgroundColor: isDark
                              ? 'rgba(59, 130, 246, 0.25)'
                              : 'rgba(59, 130, 246, 0.12)',
                          },
                        },
                      }}
                    >
                      {ns.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {selectedKind && selectedNamespace && (
            <Box sx={{ mt: 3 }}>
              <ResourceFilters
                availableResources={resources}
                activeFilters={resourceFilters}
                onFiltersChange={handleFiltersChange}
              />
            </Box>
          )}
        </Paper>
      </Collapse>

      {error && (
        <Alert
          severity="error"
          variant="filled"
          sx={{
            mb: 3,
            backgroundColor: isDark ? 'rgba(211, 47, 47, 0.8)' : undefined,
            borderRadius: '8px',
          }}
        >
          {error as string}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          p: 0,
          backgroundColor: 'transparent',
          borderRadius: '12px',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: { xs: 2, sm: 3 },
            backgroundColor: isDark ? darkTheme.bg.secondary : lightTheme.bg.secondary,
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
            borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
            boxShadow: isDark ? darkTheme.shadow.sm : lightTheme.shadow.sm,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
              fontWeight: 600,
            }}
          >
            {t('resources.results')}
            <Chip
              label={filteredResources.length.toString()}
              size="small"
              sx={{
                ml: 1,
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                color: isDark ? darkTheme.brand.primaryLight : darkTheme.brand.primary,
                fontWeight: 600,
              }}
            />
          </Typography>
        </Box>

        <Box
          sx={{
            backgroundColor: isDark ? darkTheme.bg.secondary : lightTheme.bg.secondary,
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px',
            boxShadow: isDark ? darkTheme.shadow.md : lightTheme.shadow.md,
            overflow: 'hidden',
          }}
        >
          {isLoading ? (
            <Box sx={{ p: 3 }}>
              {[1, 2, 3].map(item => (
                <Fade in={true} key={item}>
                  <Box sx={{ mb: 2 }}>
                    <Skeleton
                      variant="rectangular"
                      height={80}
                      sx={{
                        borderRadius: '8px',
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.1)'
                          : 'rgba(0, 0, 0, 0.06)',
                      }}
                    />
                  </Box>
                </Fade>
              ))}
            </Box>
          ) : filteredResources.length > 0 ? (
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
              <Grid container spacing={2}>
                {(filteredResources as unknown as Resource[]).map((resource, index) => {
                  const resourceStatus =
                    typeof resource.status === 'string'
                      ? resource.status === 'Running' || resource.status === 'Active'
                        ? 'Healthy'
                        : resource.status === 'Pending'
                          ? 'OutOfSync'
                          : resource.status === 'Failed'
                            ? 'Missing'
                            : 'Synced'
                      : undefined;

                  const statusColors = getStatusColor(resourceStatus);

                  return (
                    <Grid
                      item
                      xs={12}
                      md={6}
                      lg={4}
                      key={resource.metadata?.uid || `resource-${index}`}
                    >
                      <Card
                        elevation={0}
                        sx={{
                          p: 0,
                          borderRadius: '8px',
                          backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(0, 0, 0, 0.02)',
                          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: isDark ? darkTheme.shadow.md : lightTheme.shadow.md,
                          },
                        }}
                      >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                              fontWeight: 600,
                              mb: 1,
                            }}
                          >
                            {resource.metadata?.name}
                          </Typography>

                          <Stack spacing={1}>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Chip
                                label={resource.kind}
                                size="small"
                                sx={{
                                  backgroundColor: isDark
                                    ? 'rgba(59, 130, 246, 0.15)'
                                    : 'rgba(59, 130, 246, 0.08)',
                                  color: isDark
                                    ? darkTheme.brand.primaryLight
                                    : darkTheme.brand.primary,
                                  borderRadius: '4px',
                                }}
                              />
                              {isRenderable(resource.status) && (
                                <Chip
                                  label={resourceStatus || resource.status}
                                  size="small"
                                  sx={{
                                    backgroundColor: statusColors.bg,
                                    color: statusColors.color,
                                    borderRadius: '4px',
                                  }}
                                />
                              )}
                            </Box>

                            <Divider
                              sx={{
                                borderColor: isDark
                                  ? 'rgba(255, 255, 255, 0.1)'
                                  : 'rgba(0, 0, 0, 0.05)',
                              }}
                            />

                            <Stack spacing={0.5}>
                              {resource.metadata?.namespace && (
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: isDark
                                      ? darkTheme.text.secondary
                                      : lightTheme.text.secondary,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                  }}
                                >
                                  <span>{t('resources.namespace')}</span>
                                  <span style={{ fontWeight: 500 }}>
                                    {resource.metadata.namespace}
                                  </span>
                                </Typography>
                              )}
                              {resource.metadata?.creationTimestamp && (
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: isDark
                                      ? darkTheme.text.secondary
                                      : lightTheme.text.secondary,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                  }}
                                >
                                  <span>{t('resources.created')}</span>
                                  <span style={{ fontWeight: 500 }}>
                                    {new Date(resource.metadata.creationTimestamp).toLocaleString(
                                      'en-IN',
                                      {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true,
                                      }
                                    )}
                                  </span>
                                </Typography>
                              )}
                            </Stack>

                            {resource.labels && Object.keys(resource.labels).length > 0 && (
                              <>
                                <Divider
                                  sx={{
                                    borderColor: isDark
                                      ? 'rgba(255, 255, 255, 0.1)'
                                      : 'rgba(0, 0, 0, 0.05)',
                                  }}
                                />
                                <Box>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: isDark
                                        ? darkTheme.text.tertiary
                                        : lightTheme.text.tertiary,
                                      display: 'block',
                                      mb: 0.5,
                                    }}
                                  >
                                    {t('resources.labels')}
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                    {Object.entries(resource.labels).map(([key, value]) =>
                                      isRenderable(value) ? (
                                        <Chip
                                          key={`${key}-${value}`}
                                          label={`${key}: ${value}`}
                                          size="small"
                                          sx={{
                                            backgroundColor: isDark
                                              ? 'rgba(255, 255, 255, 0.05)'
                                              : 'rgba(0, 0, 0, 0.03)',
                                            color: isDark
                                              ? darkTheme.text.secondary
                                              : lightTheme.text.secondary,
                                            fontSize: '0.7rem',
                                            height: '20px',
                                            borderRadius: '4px',
                                          }}
                                        />
                                      ) : null
                                    )}
                                  </Box>
                                </Box>
                              </>
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          ) : (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography
                variant="body1"
                sx={{
                  color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
                }}
              >
                {selectedKind && selectedNamespace
                  ? t('resources.noResourcesFound')
                  : t('resources.selectResourceAndNamespace')}
              </Typography>
              {selectedKind && selectedNamespace && (
                <Button
                  variant="outlined"
                  onClick={handleRefresh}
                  startIcon={<RefreshIcon />}
                  sx={{
                    mt: 2,
                    borderColor: isDark ? darkTheme.brand.primary : lightTheme.brand.primary,
                    color: isDark ? darkTheme.brand.primary : lightTheme.brand.primary,
                    '&:hover': {
                      backgroundColor: isDark
                        ? 'rgba(59, 130, 246, 0.08)'
                        : 'rgba(59, 130, 246, 0.04)',
                      borderColor: isDark
                        ? darkTheme.brand.primaryLight
                        : lightTheme.brand.primaryLight,
                    },
                  }}
                >
                  {t('resources.refresh')}
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default ResourceFilterPage;

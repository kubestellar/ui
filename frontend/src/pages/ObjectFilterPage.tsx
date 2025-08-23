import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  Chip,
  Fade,
  Skeleton,
  Divider,
  Collapse,
  IconButton,
  Tooltip,
  Autocomplete,
  TextField,
  Badge,
  ToggleButtonGroup,
  ToggleButton,
  Switch,
  FormControlLabel,
  Menu,
  ListItemIcon,
  ListItemText,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import useTheme from '../stores/themeStore';
import { useObjectFilters } from '../hooks/useObjectFilters';
import ObjectFilters, { ObjectFilter } from '../components/ObjectFilters';
import { darkTheme, lightTheme } from '../lib/theme-utils';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import TableViewIcon from '@mui/icons-material/TableView';
import SearchIcon from '@mui/icons-material/Search';
import TuneIcon from '@mui/icons-material/Tune';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { ResourceItem } from '../components/ListViewComponent';
import { ResourceItem as ResourceItemType } from '../components/treeView/types';
import ResourceStats from '../components/ResourceStats';
import DynamicDetailsPanel from '../components/DynamicDetailsPanel';
import ResourceCard from '../components/ResourceCard';
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

// Enhanced view modes for better UX
type ViewMode = 'grid' | 'list' | 'table';

// Resource selection for bulk operations
interface SelectedResource {
  uid: string;
  name: string;
  kind: string;
  namespace: string;
}

// Details panel data
interface ResourceDetails {
  resource: Resource;
  isOpen: boolean;
}

// Utility to safely render values as strings

const ObjectFilterPage: React.FC = () => {
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
  } = useObjectFilters();

  // Enhanced state management
  const [selectedKind, setSelectedKind] = useState<ResourceKind | null>(null);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [resourceFilters, setResourceFilters] = useState<ObjectFilter>({});
  const [showFilters, setShowFilters] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedResources, setSelectedResources] = useState<SelectedResource[]>([]);
  const [resourceDetails, setResourceDetails] = useState<ResourceDetails | null>(null);
  const [detailsInitialTab, setDetailsInitialTab] = useState(0);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedResourceForAction, setSelectedResourceForAction] = useState<Resource | null>(null);

  // Optimized resources processing with memoization and performance improvements
  const resources: ResourceItem[] = useMemo(() => {
    if (!filteredResources || filteredResources.length === 0) return [];

    // Pre-compile search term for better performance
    const searchLower = quickSearchQuery?.toLowerCase() || '';
    const hasSearch = Boolean(searchLower);

    return (filteredResources as unknown as Resource[])
      .filter(resource => {
        // Early return if no search query
        if (!hasSearch) return true;

        // Optimized search with early exit
        const name = resource.metadata?.name?.toLowerCase();
        const kind = resource.kind?.toLowerCase();
        const namespace = resource.metadata?.namespace?.toLowerCase();

        return (
          (name && name.includes(searchLower)) ||
          (kind && kind.includes(searchLower)) ||
          (namespace && namespace.includes(searchLower)) ||
          (resource.labels &&
            Object.entries(resource.labels).some(([key, value]) =>
              `${key}:${value}`.toLowerCase().includes(searchLower)
            ))
        );
      })
      .map(resource => {
        // Helper function to extract status from Kubernetes resource
        const extractResourceStatus = (resource: Resource): string => {
          // If status is already a string, use it
          if (typeof resource.status === 'string') {
            return resource.status;
          }

          // Handle different resource types
          const kind = resource.kind.toLowerCase();
          const statusObj = resource.status as Record<string, unknown> | undefined;

                  if (!statusObj || typeof statusObj !== 'object') {
          return t('resources.status.unknown');
        }

          switch (kind) {
            case 'pod': {
              // For pods, check the phase
              if (statusObj.phase) {
                return String(statusObj.phase);
              }
              // Fallback to container statuses
              if (statusObj.containerStatuses && Array.isArray(statusObj.containerStatuses)) {
                const containerStatus = statusObj.containerStatuses[0];
                          if (containerStatus?.state?.running) return t('resources.status.running');
          if (containerStatus?.state?.waiting) return t('resources.status.pending');
          if (containerStatus?.state?.terminated) return t('resources.status.failed');
              }
              break;
            }

            case 'deployment': {
              // For deployments, check readiness
              const replicas = Number(statusObj.replicas || 0);
              const readyReplicas = Number(statusObj.readyReplicas || 0);
              const availableReplicas = Number(statusObj.availableReplicas || 0);

              if (replicas === readyReplicas && replicas === availableReplicas && replicas > 0) {
                return t('resources.status.running');
              } else if (readyReplicas > 0) {
                return t('resources.status.progressing');
              } else {
                return t('resources.status.pending');
              }
            }

            case 'service':
            case 'configmap':
            case 'secret':
              // Services, ConfigMaps and Secrets are typically active if they exist
              return t('resources.status.active');

            case 'daemonset': {
              const dsReplicas = Number(statusObj.desiredNumberScheduled || 0);
              const dsReady = Number(statusObj.numberReady || 0);
              if (dsReplicas === dsReady && dsReplicas > 0) {
                return t('resources.status.running');
              } else if (dsReady > 0) {
                return t('resources.status.progressing');
              } else {
                return t('resources.status.pending');
              }
            }

            case 'statefulset': {
              const ssReplicas = Number(statusObj.replicas || 0);
              const ssReady = Number(statusObj.readyReplicas || 0);
              if (ssReplicas === ssReady && ssReplicas > 0) {
                return t('resources.status.running');
              } else if (ssReady > 0) {
                return t('resources.status.progressing');
              } else {
                return t('resources.status.pending');
              }
            }

            case 'job': {
              if (statusObj.succeeded && Number(statusObj.succeeded) > 0) {
                return t('resources.status.succeeded');
              } else if (statusObj.failed && Number(statusObj.failed) > 0) {
                return t('resources.status.failed');
              } else if (statusObj.active && Number(statusObj.active) > 0) {
                return t('resources.status.running');
              } else {
                return t('resources.status.pending');
              }
            }

            case 'cronjob': {
              if (statusObj.lastScheduleTime) {
                return t('resources.status.scheduled');
              } else {
                return t('resources.status.waiting');
              }
            }

            default:
              // For other resources, try to infer from common status patterns
              if (statusObj.phase) {
                return String(statusObj.phase);
              }
              if (statusObj.conditions && Array.isArray(statusObj.conditions)) {
                const readyCondition = statusObj.conditions.find(
                  (c: Record<string, unknown>) => c.type === 'Ready' || c.type === 'Available'
                );
                              if (readyCondition) {
                return (readyCondition.status as string) === 'True' ? t('resources.status.ready') : t('resources.status.notReady');
              }
              }
              return t('resources.status.active');
          }

          return t('resources.status.unknown');
        };
        const resourceStatus = extractResourceStatus(resource);

        // Map extracted status to display status
        const getDisplayStatus = (status: string): ResourceItem['status'] => {
          const statusLower = status.toLowerCase();

          if (
            statusLower === 'running' ||
            statusLower === 'active' ||
            statusLower === 'ready' ||
            statusLower === 'succeeded'
          ) {
            return 'Healthy';
          } else if (
            statusLower === 'pending' ||
            statusLower === 'progressing' ||
            statusLower === 'waiting' ||
            statusLower === 'scheduled'
          ) {
            return 'OutOfSync';
          } else if (
            statusLower === 'failed' ||
            statusLower === 'error' ||
            statusLower === 'notready'
          ) {
            return 'Missing';
          } else {
            return 'Synced';
          }
        };

        return {
          kind: resource.kind,
          name: resource.metadata?.name || '',
          namespace: resource.metadata?.namespace || '',
          status: getDisplayStatus(resourceStatus),
          createdAt: resource.metadata?.creationTimestamp?.toString() || '',
          labels: resource.labels || {},
          metadata: resource.metadata || {},
        };
      })
      .sort((a, b) => {
        // Optimized sorting with cached values
        const getValue = (resource: ResourceItem, key: string): string => {
          switch (key) {
            case 'name':
              return resource.name;
            case 'kind':
              return resource.kind;
            case 'namespace':
              return resource.namespace;
            case 'createdAt':
              return resource.createdAt;
            default:
              return resource.name;
          }
        };

        const aValue = getValue(a, sortBy);
        const bValue = getValue(b, sortBy);

        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [filteredResources, quickSearchQuery, sortBy, sortOrder]); // Enhanced handlers
  const handleKindChange = (_event: React.SyntheticEvent, value: ResourceKind | null) => {
    setSelectedKind(value);
    setSelectedResources([]); // Clear selections when changing context
  };

  const handleNamespaceChange = (event: SelectChangeEvent) => {
    setSelectedNamespace(event.target.value);
    setSelectedResources([]); // Clear selections when changing context
  };

  const handleFiltersChange = useCallback((filters: ObjectFilter) => {
    setResourceFilters(filters);
  }, []);

  const handleApplyFilters = useCallback(async () => {
    if (selectedKind && selectedNamespace) {
      await applyFilters(selectedKind.name, selectedNamespace, resourceFilters);
    }
  }, [selectedKind, selectedNamespace, resourceFilters, applyFilters]);

  const handleRefresh = useCallback(async () => {
    if (selectedKind && selectedNamespace) {
      setIsRefreshing(true);
      await applyFilters(selectedKind.name, selectedNamespace, resourceFilters);
      setIsRefreshing(false);
    }
  }, [selectedKind, selectedNamespace, resourceFilters, applyFilters]);

  // New handlers for enhanced functionality
  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newViewMode: ViewMode) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  const handleResourceSelect = (resource: Resource) => {
    const uid = resource.metadata?.uid || `${resource.kind}-${resource.metadata?.name}`;
    const selectedResource: SelectedResource = {
      uid,
      kind: resource.kind,
      name: resource.metadata?.name || '',
      namespace: resource.metadata?.namespace || '',
    };

    setSelectedResources(prev => {
      const isSelected = prev.some(r => r.uid === uid);
      if (isSelected) {
        return prev.filter(r => r.uid !== uid);
      } else {
        return [...prev, selectedResource];
      }
    });
  };

  const handleResourceAction = (resource: Resource, action: string) => {
    // Handle different resource actions
    switch (action) {
      case 'view':
        setDetailsInitialTab(0); // Summary tab
        setResourceDetails({ resource, isOpen: true });
        break;
      case 'edit':
        setDetailsInitialTab(1); // Edit tab
        setResourceDetails({ resource, isOpen: true });
        break;
      case 'logs':
        setDetailsInitialTab(2); // Logs tab
        setResourceDetails({ resource, isOpen: true });
        break;
      case 'delete':
        // TODO: Implement delete confirmation dialog
        console.log('Delete resource:', resource);
        break;
      default:
        setDetailsInitialTab(0);
        break;
    }
    setActionMenuAnchor(null);
  };

  const handleBulkAction = (action: string) => {
    // Handle bulk operations
    console.log(`Bulk ${action} on:`, selectedResources);
    setSelectedResources([]);
  };

  const handleQuickSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuickSearchQuery(event.target.value);
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  useEffect(() => {
    // Auto-apply filters when both kind and namespace are selected
    if (selectedKind && selectedNamespace) {
      handleApplyFilters();
    }
  }, [selectedKind, selectedNamespace, handleApplyFilters]);

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
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
      {/* Enhanced Header with Actions */}
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                fontWeight: 700,
                fontSize: { xs: '1.75rem', sm: '2.25rem' },
                mb: 1,
                background: isDark
                  ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                  : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {t('resources.title')}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
                mb: 2,
              }}
            >
              {t('resources.description')}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* Auto-refresh toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={e => setAutoRefresh(e.target.checked)}
                  size="small"
                />
              }
              label={t('resources.autoRefresh')}
              sx={{
                color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
                '& .MuiFormControlLabel-label': {
                  fontSize: '0.875rem',
                },
              }}
            />

            {/* View mode selector */}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
                  '&.Mui-selected': {
                    backgroundColor: isDark ? darkTheme.brand.primary : lightTheme.brand.primary,
                    color: '#ffffff',
                  },
                },
              }}
            >
              <ToggleButton value="grid" aria-label={t('resources.viewMode.gridLabel')}>
                <ViewModuleIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="list" aria-label={t('resources.viewMode.listLabel')}>
                <ViewListIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="table" aria-label={t('resources.viewMode.tableLabel')}>
                <TableViewIcon fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Filter toggle */}
            <Tooltip title={t('resources.toggleFilters')}>
              <IconButton
                onClick={toggleFilters}
                sx={{
                  color: showFilters
                    ? isDark
                      ? darkTheme.brand.primary
                      : lightTheme.brand.primary
                    : isDark
                      ? darkTheme.text.secondary
                      : lightTheme.text.secondary,
                  backgroundColor: showFilters
                    ? isDark
                      ? 'rgba(59, 130, 246, 0.1)'
                      : 'rgba(37, 99, 235, 0.1)'
                    : 'transparent',
                  '&:hover': {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <TuneIcon />
              </IconButton>
            </Tooltip>

            {/* Refresh button */}
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
      </Box>

      {/* Enhanced Filters Section */}
      <Collapse in={showFilters}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            mb: 3,
            backgroundColor: isDark ? darkTheme.bg.secondary : lightTheme.bg.secondary,
            boxShadow: isDark ? darkTheme.shadow.md : lightTheme.shadow.md,
            borderRadius: '16px',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
            background: isDark
              ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.8) 0%, rgba(31, 41, 55, 0.8) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="h6"
              sx={{
                color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                fontWeight: 600,
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <FilterAltIcon />
              {t('resources.objectSelection')}
            </Typography>

            <Grid container spacing={3} alignItems="center">
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
                      elevation={8}
                      {...props}
                      sx={{
                        backgroundColor: isDark ? '#1f2937' : '#fff',
                        color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                        boxShadow: isDark
                          ? '0px 8px 25px rgba(0, 0, 0, 0.4)'
                          : '0px 8px 25px rgba(0, 0, 0, 0.15)',
                        borderRadius: '12px',
                        border: isDark
                          ? '1px solid rgba(255, 255, 255, 0.1)'
                          : '1px solid rgba(0, 0, 0, 0.05)',
                        backdropFilter: 'blur(10px)',
                      }}
                    />
                  )}
                  renderOption={(props, option, { selected }) => (
                    <li
                      {...props}
                      key={`${option.group || 'core'}-${option.kind}-${option.name}`}
                      style={{
                        ...props.style,
                        backgroundColor: selected
                          ? isDark
                            ? 'rgba(59, 130, 246, 0.2)'
                            : 'rgba(59, 130, 246, 0.1)'
                          : undefined,
                        padding: '12px 16px',
                        borderRadius: '8px',
                        margin: '4px 8px',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccountTreeIcon
                          fontSize="small"
                          sx={{
                            color: isDark ? darkTheme.brand.primaryLight : lightTheme.brand.primary,
                          }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {option.kind}
                        </Typography>
                        <Chip
                          label={option.group || 'core'}
                          size="small"
                          sx={{
                            ml: 'auto',
                            fontSize: '0.7rem',
                            height: '20px',
                            backgroundColor: isDark
                              ? 'rgba(255, 255, 255, 0.1)'
                              : 'rgba(0, 0, 0, 0.08)',
                          }}
                        />
                      </Box>
                    </li>
                  )}
                  renderInput={params => (
                    <TextField
                      {...params}
                      label={t('resources.selectKind')}
                      placeholder={t('resources.searchPlaceholder')}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: isDark
                            ? darkTheme.element.input
                            : lightTheme.element.input,
                          color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                          borderRadius: '12px',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            boxShadow: isDark ? darkTheme.shadow.md : lightTheme.shadow.md,
                          },
                          '&.Mui-focused': {
                            boxShadow: `0 0 0 3px ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'}`,
                          },
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
                      borderRadius: '12px',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        boxShadow: isDark ? darkTheme.shadow.md : lightTheme.shadow.md,
                      },
                      '&.Mui-focused': {
                        boxShadow: `0 0 0 3px ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'}`,
                      },
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
                        elevation: 8,
                        sx: {
                          backgroundColor: isDark ? '#1f2937' : '#fff',
                          color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                          boxShadow: isDark
                            ? '0px 8px 25px rgba(0, 0, 0, 0.4)'
                            : '0px 8px 25px rgba(0, 0, 0, 0.15)',
                          maxHeight: 300,
                          borderRadius: '12px',
                          border: isDark
                            ? '1px solid rgba(255, 255, 255, 0.1)'
                            : '1px solid rgba(0, 0, 0, 0.05)',
                          backdropFilter: 'blur(10px)',
                        },
                      },
                    }}
                  >
                    {filteredNamespaces.map((ns: { name: string }) => (
                      <MenuItem
                        key={ns.name}
                        value={ns.name}
                        sx={{
                          margin: '4px 8px',
                          borderRadius: '8px',
                          '&:hover': {
                            backgroundColor: isDark
                              ? 'rgba(255, 255, 255, 0.08)'
                              : 'rgba(0, 0, 0, 0.04)',
                          },
                          '&.Mui-selected': {
                            backgroundColor: isDark
                              ? 'rgba(59, 130, 246, 0.2)'
                              : 'rgba(59, 130, 246, 0.1)',
                            '&:hover': {
                              backgroundColor: isDark
                                ? 'rgba(59, 130, 246, 0.3)'
                                : 'rgba(59, 130, 246, 0.15)',
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

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder={t('resources.quickSearchPlaceholder')}
                  value={quickSearchQuery}
                  onChange={handleQuickSearch}
                  InputProps={{
                    startAdornment: (
                      <SearchIcon
                        sx={{
                          color: isDark ? darkTheme.text.tertiary : lightTheme.text.tertiary,
                          mr: 1,
                        }}
                      />
                    ),
                    endAdornment: quickSearchQuery && (
                      <IconButton
                        size="small"
                        onClick={() => setQuickSearchQuery('')}
                        sx={{ color: isDark ? darkTheme.text.tertiary : lightTheme.text.tertiary }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: isDark ? darkTheme.element.input : lightTheme.element.input,
                      color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                      borderRadius: '12px',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        boxShadow: isDark ? darkTheme.shadow.md : lightTheme.shadow.md,
                      },
                      '&.Mui-focused': {
                        boxShadow: `0 0 0 3px ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'}`,
                      },
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
                    },
                  }}
                />
              </Grid>
            </Grid>
          </Box>

          {selectedKind && selectedNamespace && (
            <Box
              sx={{
                mt: 3,
                pt: 3,
                borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
              }}
            >
              <ObjectFilters
                availableResources={resources}
                activeFilters={resourceFilters}
                onFiltersChange={handleFiltersChange}
              />
            </Box>
          )}
        </Paper>
      </Collapse>

      {/* Error Display */}
      {error && (
        <Alert
          severity="error"
          variant="filled"
          sx={{
            mb: 3,
            backgroundColor: isDark ? 'rgba(211, 47, 47, 0.9)' : undefined,
            borderRadius: '12px',
            boxShadow: isDark ? darkTheme.shadow.md : lightTheme.shadow.md,
          }}
        >
          {error as string}
        </Alert>
      )}

      {/* Bulk Actions Bar */}
      {selectedResources.length > 0 && (
        <Paper
          elevation={2}
          sx={{
            p: 2,
            mb: 3,
            backgroundColor: isDark ? darkTheme.brand.primary : lightTheme.brand.primary,
            color: '#ffffff',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: isDark ? darkTheme.shadow.lg : lightTheme.shadow.lg,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {t('resources.bulkActions.resourcesSelected', { count: selectedResources.length })}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSelectedResources([])}
              sx={{
                color: '#ffffff',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                '&:hover': {
                  borderColor: '#ffffff',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              {t('resources.bulkActions.clearSelection')}
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => handleBulkAction('view')}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                },
              }}
            >
              {t('resources.bulkActions.viewDetails')}
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => handleBulkAction('export')}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                },
              }}
            >
              {t('resources.bulkActions.export')}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Results Section */}
      <Paper
        elevation={0}
        sx={{
          backgroundColor: 'transparent',
          borderRadius: '16px',
        }}
      >
        {/* Results Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: { xs: 2, sm: 3 },
            backgroundColor: isDark ? darkTheme.bg.secondary : lightTheme.bg.secondary,
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
            borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
            boxShadow: isDark ? darkTheme.shadow.sm : lightTheme.shadow.sm,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography
              variant="h6"
              sx={{
                color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                fontWeight: 600,
              }}
            >
              {t('resources.results')}
            </Typography>
            <Badge
              badgeContent={resources.length}
              color="primary"
              sx={{
                '& .MuiBadge-badge': {
                  backgroundColor: isDark ? darkTheme.brand.primary : lightTheme.brand.primary,
                  color: '#ffffff',
                  fontWeight: 600,
                },
              }}
            >
              <Chip
                label={`${resources.length} object${resources.length !== 1 ? 's' : ''}`}
                size="small"
                sx={{
                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                  color: isDark ? darkTheme.brand.primaryLight : darkTheme.brand.primary,
                  fontWeight: 600,
                }}
              />
            </Badge>
          </Box>

          {resources.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  displayEmpty
                  sx={{
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
                    },
                    '& .MuiSelect-select': {
                      color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                      fontSize: '0.875rem',
                    },
                    '& .MuiSelect-icon': {
                      color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? darkTheme.brand.primary : lightTheme.brand.primary,
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        backgroundColor: isDark
                          ? 'rgba(30, 41, 59, 0.95)'
                          : 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
                        '& .MuiMenuItem-root': {
                          color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                          '&:hover': {
                            backgroundColor: isDark
                              ? 'rgba(59, 130, 246, 0.1)'
                              : 'rgba(59, 130, 246, 0.05)',
                          },
                          '&.Mui-selected': {
                            backgroundColor: isDark
                              ? 'rgba(59, 130, 246, 0.2)'
                              : 'rgba(59, 130, 246, 0.1)',
                          },
                        },
                      },
                    },
                  }}
                >
                  <MenuItem value="name">{t('resources.sorting.name')}</MenuItem>
                  <MenuItem value="kind">{t('resources.sorting.kind')}</MenuItem>
                  <MenuItem value="namespace">{t('resources.sorting.namespace')}</MenuItem>
                  <MenuItem value="createdAt">{t('resources.sorting.createdAt')}</MenuItem>
                </Select>
              </FormControl>
              <IconButton
                size="small"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                sx={{ color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary }}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </IconButton>
            </Box>
          )}
        </Box>

        {/* Results Content */}
        <Box
          sx={{
            backgroundColor: isDark ? darkTheme.bg.secondary : lightTheme.bg.secondary,
            borderBottomLeftRadius: '16px',
            borderBottomRightRadius: '16px',
            boxShadow: isDark ? darkTheme.shadow.md : lightTheme.shadow.md,
            overflow: 'hidden',
            minHeight: '400px',
          }}
        >
          {isLoading ? (
            <Box sx={{ p: 3 }}>
              <Grid container spacing={2}>
                {[1, 2, 3, 4, 5, 6].map(item => (
                  <Grid item xs={12} sm={6} md={4} key={item}>
                    <Fade in={true}>
                      <Box>
                        <Skeleton
                          variant="rectangular"
                          height={200}
                          sx={{
                            borderRadius: '12px',
                            backgroundColor: isDark
                              ? 'rgba(255, 255, 255, 0.1)'
                              : 'rgba(0, 0, 0, 0.06)',
                          }}
                        />
                      </Box>
                    </Fade>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : resources.length > 0 ? (
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
              {/* Resource Statistics Overview */}
              <ResourceStats resources={filteredResources as unknown as Resource[]} />

              {/* Grid View */}
              {viewMode === 'grid' && (
                <Grid container spacing={3}>
                  {(filteredResources as unknown as Resource[]).map(resource => {
                    const uid =
                      resource.metadata?.uid || `${resource.kind}-${resource.metadata?.name}`;
                    const isSelected = selectedResources.some(r => r.uid === uid);

                    return (
                      <Grid item xs={12} sm={6} lg={4} key={uid}>
                        <ResourceCard
                          resource={resource}
                          isSelected={isSelected}
                          isDark={isDark}
                          onSelect={handleResourceSelect}
                          onViewDetails={resource => handleResourceAction(resource, 'view')}
                          onActionClick={(e, resource) => {
                            setSelectedResourceForAction(resource);
                            setActionMenuAnchor(e.currentTarget);
                          }}
                        />
                      </Grid>
                    );
                  })}
                </Grid>
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <Box sx={{ mt: 2 }}>
                  {(filteredResources as unknown as Resource[]).map(resource => {
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
                    const uid =
                      resource.metadata?.uid || `${resource.kind}-${resource.metadata?.name}`;
                    const isSelected = selectedResources.some(r => r.uid === uid);

                    return (
                      <Paper
                        key={uid}
                        elevation={0}
                        sx={{
                          mb: 1,
                          p: 2,
                          backgroundColor: isDark
                            ? darkTheme.bg.secondary
                            : lightTheme.bg.secondary,
                          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                          '&:hover': {
                            backgroundColor: isDark
                              ? 'rgba(59, 130, 246, 0.05)'
                              : 'rgba(59, 130, 246, 0.02)',
                            border: `1px solid ${isDark ? darkTheme.brand.primaryLight : lightTheme.brand.primary}`,
                          },
                        }}
                        onClick={() => handleResourceSelect(resource)}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                            <Box>
                              <Typography
                                variant="h6"
                                sx={{
                                  color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                                  fontWeight: 600,
                                  fontSize: '1rem',
                                }}
                              >
                                {resource.metadata?.name}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <Chip
                                  label={resource.kind}
                                  size="small"
                                  sx={{
                                    backgroundColor: isDark
                                      ? 'rgba(59, 130, 246, 0.2)'
                                      : 'rgba(59, 130, 246, 0.1)',
                                    color: isDark
                                      ? darkTheme.brand.primaryLight
                                      : darkTheme.brand.primary,
                                    fontWeight: 600,
                                  }}
                                />
                                {resource.metadata?.namespace && (
                                  <Chip
                                    label={resource.metadata.namespace}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      borderColor: isDark
                                        ? 'rgba(255, 255, 255, 0.23)'
                                        : 'rgba(0, 0, 0, 0.23)',
                                      color: isDark
                                        ? darkTheme.text.secondary
                                        : lightTheme.text.secondary,
                                    }}
                                  />
                                )}
                                {resourceStatus && (
                                  <Chip
                                    label={resourceStatus}
                                    size="small"
                                    sx={{
                                      backgroundColor: statusColors.bg,
                                      color: statusColors.color,
                                      fontWeight: 600,
                                    }}
                                  />
                                )}
                              </Box>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Button
                              size="small"
                              startIcon={<VisibilityIcon />}
                              onClick={e => {
                                e.stopPropagation();
                                handleResourceAction(resource, 'view');
                              }}
                              sx={{
                                color: isDark
                                  ? darkTheme.brand.primaryLight
                                  : lightTheme.brand.primary,
                              }}
                            >
                              {t('resources.actions.view')}
                            </Button>
                            <IconButton
                              size="small"
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedResourceForAction(resource);
                                setActionMenuAnchor(e.currentTarget);
                              }}
                              sx={{
                                color: isDark
                                  ? darkTheme.text.secondary
                                  : lightTheme.text.secondary,
                              }}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                        {/* Selection indicator */}
                        {isSelected && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 8,
                              left: 8,
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              backgroundColor: isDark
                                ? darkTheme.brand.primary
                                : lightTheme.brand.primary,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{ color: '#ffffff', fontSize: '0.7rem', fontWeight: 'bold' }}
                            >
                              ✓
                            </Typography>
                          </Box>
                        )}
                      </Paper>
                    );
                  })}
                </Box>
              )}

              {/* Table View */}
              {viewMode === 'table' && (
                <TableContainer
                  component={Paper}
                  sx={{
                    mt: 2,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
                  }}
                >
                  <Table sx={{ backgroundColor: 'transparent' }}>
                    <TableHead>
                      <TableRow
                        sx={{
                          backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(0, 0, 0, 0.02)',
                        }}
                      >
                        <TableCell
                          sx={{
                            color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                            fontWeight: 600,
                          }}
                        >
                          Name
                        </TableCell>
                        <TableCell
                          sx={{
                            color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                            fontWeight: 600,
                          }}
                        >
                          Kind
                        </TableCell>
                        <TableCell
                          sx={{
                            color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                            fontWeight: 600,
                          }}
                        >
                          Namespace
                        </TableCell>
                        <TableCell
                          sx={{
                            color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                            fontWeight: 600,
                          }}
                        >
                          Status
                        </TableCell>
                        <TableCell
                          sx={{
                            color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                            fontWeight: 600,
                          }}
                        >
                          Created
                        </TableCell>
                        <TableCell
                          sx={{
                            color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                            fontWeight: 600,
                          }}
                        >
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(filteredResources as unknown as Resource[]).map(resource => {
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
                        const uid =
                          resource.metadata?.uid || `${resource.kind}-${resource.metadata?.name}`;
                        const isSelected = selectedResources.some(r => r.uid === uid);

                        return (
                          <TableRow
                            key={uid}
                            hover
                            selected={isSelected}
                            onClick={() => handleResourceSelect(resource)}
                            sx={{
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: isDark
                                  ? 'rgba(59, 130, 246, 0.05)'
                                  : 'rgba(59, 130, 246, 0.02)',
                              },
                              '&.Mui-selected': {
                                backgroundColor: isDark
                                  ? 'rgba(59, 130, 246, 0.1)'
                                  : 'rgba(59, 130, 246, 0.05)',
                              },
                            }}
                          >
                            <TableCell
                              sx={{
                                color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                              }}
                            >
                              <Typography variant="body2" fontWeight={600}>
                                {resource.metadata?.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={resource.kind}
                                size="small"
                                sx={{
                                  backgroundColor: isDark
                                    ? 'rgba(59, 130, 246, 0.2)'
                                    : 'rgba(59, 130, 246, 0.1)',
                                  color: isDark
                                    ? darkTheme.brand.primaryLight
                                    : darkTheme.brand.primary,
                                  fontWeight: 600,
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              {resource.metadata?.namespace ? (
                                <Chip
                                  label={resource.metadata.namespace}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    borderColor: isDark
                                      ? 'rgba(255, 255, 255, 0.23)'
                                      : 'rgba(0, 0, 0, 0.23)',
                                    color: isDark
                                      ? darkTheme.text.secondary
                                      : lightTheme.text.secondary,
                                  }}
                                />
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  -
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {resourceStatus ? (
                                <Chip
                                  label={resourceStatus}
                                  size="small"
                                  sx={{
                                    backgroundColor: statusColors.bg,
                                    color: statusColors.color,
                                    fontWeight: 600,
                                  }}
                                />
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  -
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell
                              sx={{
                                color: isDark
                                  ? darkTheme.text.secondary
                                  : lightTheme.text.secondary,
                              }}
                            >
                              {resource.metadata?.creationTimestamp
                                ? new Date(resource.metadata.creationTimestamp).toLocaleDateString()
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <IconButton
                                  size="small"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleResourceAction(resource, 'view');
                                  }}
                                  sx={{
                                    color: isDark
                                      ? darkTheme.brand.primaryLight
                                      : lightTheme.brand.primary,
                                  }}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedResourceForAction(resource);
                                    setActionMenuAnchor(e.currentTarget);
                                  }}
                                  sx={{
                                    color: isDark
                                      ? darkTheme.text.secondary
                                      : lightTheme.text.secondary,
                                  }}
                                >
                                  <MoreVertIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          ) : (
            /* Enhanced Empty State */
            <Box
              sx={{
                p: 8,
                textAlign: 'center',
                background: isDark
                  ? 'radial-gradient(circle at center, rgba(59, 130, 246, 0.05) 0%, transparent 70%)'
                  : 'radial-gradient(circle at center, rgba(59, 130, 246, 0.02) 0%, transparent 70%)',
              }}
            >
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  border: `2px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'}`,
                }}
              >
                <SearchIcon
                  sx={{
                    fontSize: 48,
                    color: isDark ? darkTheme.brand.primaryLight : lightTheme.brand.primary,
                    opacity: 0.6,
                  }}
                />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                  fontWeight: 600,
                  mb: 1,
                }}
              >
                {selectedKind && selectedNamespace ? t('resources.emptyState.noResourcesFound') : t('resources.emptyState.readyToExplore')}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
                  mb: 3,
                  maxWidth: 400,
                  margin: '0 auto 24px',
                }}
              >
                {selectedKind && selectedNamespace
                  ? t('resources.emptyState.noResourcesDescription')
                  : t('resources.emptyState.getStartedDescription')}
              </Typography>
              {selectedKind && selectedNamespace ? (
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button
                    variant="outlined"
                    onClick={handleRefresh}
                    startIcon={<RefreshIcon />}
                    sx={{
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
                  <Button
                    variant="text"
                    onClick={() => {
                      setResourceFilters({});
                      setQuickSearchQuery('');
                    }}
                    sx={{
                      color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
                      '&:hover': {
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'rgba(0, 0, 0, 0.04)',
                      },
                    }}
                  >
                    {t('resources.emptyState.clearFilters')}
                  </Button>
                </Box>
              ) : (
                <Button
                  variant="contained"
                  onClick={() => setShowFilters(true)}
                  startIcon={<FilterAltIcon />}
                  sx={{
                    backgroundColor: isDark ? darkTheme.brand.primary : lightTheme.brand.primary,
                    color: '#ffffff',
                    borderRadius: '12px',
                    px: 3,
                    py: 1.5,
                    fontWeight: 600,
                    boxShadow: isDark ? darkTheme.shadow.md : lightTheme.shadow.md,
                    '&:hover': {
                      backgroundColor: isDark
                        ? darkTheme.brand.primaryDark
                        : lightTheme.brand.primaryDark,
                      boxShadow: isDark ? darkTheme.shadow.lg : lightTheme.shadow.lg,
                    },
                  }}
                >
                  {t('resources.emptyState.getStarted')}
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={() => setActionMenuAnchor(null)}
        PaperProps={{
          sx: {
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
            boxShadow: isDark
              ? '0px 8px 25px rgba(0, 0, 0, 0.4)'
              : '0px 8px 25px rgba(0, 0, 0, 0.15)',
            borderRadius: '12px',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
            backdropFilter: 'blur(10px)',
            minWidth: 160,
          },
        }}
      >
        <MenuItem
          onClick={() =>
            selectedResourceForAction && handleResourceAction(selectedResourceForAction, 'view')
          }
        >
          <ListItemIcon>
            <VisibilityIcon
              fontSize="small"
              sx={{ color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary }}
            />
          </ListItemIcon>
                            <ListItemText>{t('resources.actions.viewDetails')}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() =>
            selectedResourceForAction && handleResourceAction(selectedResourceForAction, 'edit')
          }
        >
          <ListItemIcon>
            <EditIcon
              fontSize="small"
              sx={{ color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary }}
            />
          </ListItemIcon>
                            <ListItemText>{t('resources.actions.editYaml')}</ListItemText>
        </MenuItem>
        <Divider
          sx={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)' }}
        />
        <MenuItem
          onClick={() =>
            selectedResourceForAction && handleResourceAction(selectedResourceForAction, 'delete')
          }
          sx={{ color: isDark ? '#f87171' : '#dc2626' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" sx={{ color: isDark ? '#f87171' : '#dc2626' }} />
          </ListItemIcon>
                            <ListItemText>{t('resources.actions.delete')}</ListItemText>
        </MenuItem>
      </Menu>

      {/* Enhanced Resource Details Panel */}
      <DynamicDetailsPanel
        namespace={resourceDetails?.resource.metadata?.namespace || ''}
        name={resourceDetails?.resource.metadata?.name || ''}
        type={resourceDetails?.resource.kind || ''}
        resourceData={resourceDetails?.resource as ResourceItemType}
        onClose={() => setResourceDetails(null)}
        isOpen={resourceDetails?.isOpen || false}
        initialTab={detailsInitialTab}
      />
    </Container>
  );
};

export default ObjectFilterPage;

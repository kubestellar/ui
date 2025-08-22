import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Badge,
  Tooltip,
  Paper,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import useTheme from '../stores/themeStore';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import LabelIcon from '@mui/icons-material/Label';
import ClearIcon from '@mui/icons-material/Clear';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { ResourceItem } from './ListViewComponent';
import { darkTheme, lightTheme } from '../lib/theme-utils';
import { debounce } from 'lodash';

export interface ObjectFilter {
  kind?: string;
  namespace?: string;
  label?: { key: string; value: string };
  searchQuery?: string;
}

interface ObjectFiltersProps {
  onFiltersChange: (filters: ObjectFilter) => void;
  availableResources: ResourceItem[];
  activeFilters: ObjectFilter;
}

// Utility to check if a value is string or number
function isRenderable(val: unknown): val is string | number {
  return typeof val === 'string' || typeof val === 'number';
}

const ObjectFilters: React.FC<ObjectFiltersProps> = ({
  onFiltersChange,
  availableResources,
  activeFilters,
}) => {
  const { t } = useTranslation();
  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState(activeFilters.searchQuery || '');
  const [kindMenuAnchor, setKindMenuAnchor] = useState<null | HTMLElement>(null);
  const [namespaceMenuAnchor, setNamespaceMenuAnchor] = useState<null | HTMLElement>(null);
  const [labelMenuAnchor, setLabelMenuAnchor] = useState<null | HTMLElement>(null);

  // Extract unique values from available resources
  const uniqueKinds = [...new Set(availableResources.map(r => r.kind))].sort();
  const uniqueNamespaces = [...new Set(availableResources.map(r => r.namespace))]
    .filter(Boolean)
    .sort();

  // Extract unique labels from all resources
  const uniqueLabels = new Map<string, Set<string>>();
  availableResources.forEach(resource => {
    if (resource.labels) {
      Object.entries(resource.labels).forEach(([key, value]) => {
        if (!uniqueLabels.has(key)) {
          uniqueLabels.set(key, new Set());
        }
        uniqueLabels.get(key)?.add(value);
      });
    }
  });

  // Count active filters
  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;

  // Debounce search to improve performance
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      onFiltersChange({ ...activeFilters, searchQuery: query });
    }, 300),
    [activeFilters, onFiltersChange]
  );

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = event.target.value;
    setSearchQuery(newQuery);
    debouncedSearch(newQuery);
  };

  const handleKindSelect = (kind: string) => {
    onFiltersChange({ ...activeFilters, kind });
    setKindMenuAnchor(null);
  };

  const handleNamespaceSelect = (namespace: string) => {
    onFiltersChange({ ...activeFilters, namespace });
    setNamespaceMenuAnchor(null);
  };

  const handleLabelSelect = (key: string, value: string) => {
    onFiltersChange({ ...activeFilters, label: { key, value } });
    setLabelMenuAnchor(null);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    onFiltersChange({});
  };

  const handleRemoveFilter = (filterType: keyof ObjectFilter) => {
    const newFilters = { ...activeFilters };
    delete newFilters[filterType];
    onFiltersChange(newFilters);
  };

  // Common menu paper props with colors
  const menuPaperProps = {
    component: Paper,
    elevation: 6,
    sx: {
      maxHeight: 300,
      width: 200,
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
      boxShadow: isDark ? '0px 5px 15px rgba(0, 0, 0, 0.4)' : '0px 5px 15px rgba(0, 0, 0, 0.2)',
      borderRadius: '8px',
      border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
      zIndex: 1300,
      position: 'fixed',
      transformOrigin: 'top left',
    },
  };

  // Button styling based on active state
  const getButtonStyle = (isActive: boolean) => ({
    borderColor: isActive
      ? isDark
        ? darkTheme.brand.primary
        : lightTheme.brand.primary
      : isDark
        ? 'rgba(255, 255, 255, 0.23)'
        : 'rgba(0, 0, 0, 0.23)',
    color: isActive
      ? isDark
        ? darkTheme.brand.primary
        : lightTheme.brand.primary
      : isDark
        ? darkTheme.text.primary
        : lightTheme.text.primary,
    '&:hover': {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      borderColor: isActive
        ? isDark
          ? darkTheme.brand.primaryLight
          : lightTheme.brand.primaryLight
        : isDark
          ? 'rgba(255, 255, 255, 0.23)'
          : 'rgba(0, 0, 0, 0.23)',
    },
  });

  return (
    <Box sx={{ width: '100%', overflow: 'hidden' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          gap: 2,
          p: 3,
          backgroundColor: isDark
            ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(17, 24, 39, 0.8) 100%)'
            : 'linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.9) 100%)',
          borderRadius: '16px',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
          boxShadow: isDark ? darkTheme.shadow.lg : lightTheme.shadow.lg,
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
            background: isDark
              ? 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)'
              : 'linear-gradient(90deg, #2563eb 0%, #7c3aed 50%, #0891b2 100%)',
          },
        }}
      >
        {/* Enhanced Search field */}
        <Box
          sx={{
            flex: { xs: '1 1 100%', md: '1 1 350px' },
            minWidth: { xs: '100%', md: '350px' },
            maxWidth: { xs: '100%', md: '500px' },
          }}
        >
          <TextField
            placeholder={t('resources.search')}
            variant="outlined"
            fullWidth
            size="medium"
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <SearchIcon
                  sx={{
                    color: isDark ? darkTheme.brand.primaryLight : lightTheme.brand.primary,
                    mr: 1,
                    fontSize: '1.2rem',
                  }}
                />
              ),
              endAdornment: searchQuery ? (
                <IconButton
                  size="small"
                  onClick={() => {
                    setSearchQuery('');
                    onFiltersChange({ ...activeFilters, searchQuery: '' });
                  }}
                  sx={{
                    color: isDark ? darkTheme.text.tertiary : lightTheme.text.tertiary,
                    '&:hover': {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    },
                  }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              ) : null,
              sx: {
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                borderRadius: '12px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.2)'}`,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'transparent',
                },
                '&:hover': {
                  backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.95)',
                  borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(37, 99, 235, 0.3)',
                  boxShadow: isDark
                    ? '0 0 20px rgba(59, 130, 246, 0.2)'
                    : '0 0 20px rgba(37, 99, 235, 0.1)',
                },
                '&.Mui-focused': {
                  backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 1)',
                  borderColor: isDark ? darkTheme.brand.primary : lightTheme.brand.primary,
                  boxShadow: isDark
                    ? '0 0 25px rgba(59, 130, 246, 0.3)'
                    : '0 0 25px rgba(37, 99, 235, 0.15)',
                },
              },
            }}
          />
        </Box>

        {/* Enhanced Filter buttons */}
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            flex: { xs: '1 1 auto', md: '0 0 auto' },
            justifyContent: { xs: 'center', md: 'flex-end' },
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {/* Enhanced Kind filter */}
          <Tooltip title={t('resources.filterByKind')} arrow>
            <Badge
              color="primary"
              variant="dot"
              invisible={!activeFilters.kind}
              sx={{
                '& .MuiBadge-dot': {
                  backgroundColor: isDark ? darkTheme.brand.primaryLight : lightTheme.brand.primary,
                  boxShadow: isDark
                    ? '0 0 8px rgba(59, 130, 246, 0.6)'
                    : '0 0 8px rgba(37, 99, 235, 0.4)',
                },
              }}
            >
              <Button
                variant="outlined"
                size="medium"
                onClick={e => setKindMenuAnchor(e.currentTarget)}
                startIcon={<FilterListIcon />}
                sx={{
                  ...getButtonStyle(!!activeFilters.kind),
                  borderRadius: '12px',
                  px: 2.5,
                  py: 1,
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: activeFilters.kind
                    ? isDark
                      ? '0 4px 20px rgba(59, 130, 246, 0.3)'
                      : '0 4px 20px rgba(37, 99, 235, 0.2)'
                    : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: isDark
                      ? '0 8px 25px rgba(59, 130, 246, 0.4)'
                      : '0 8px 25px rgba(37, 99, 235, 0.25)',
                  },
                }}
              >
                {activeFilters.kind || t('resources.kind')}
              </Button>
            </Badge>
          </Tooltip>

          {/* Enhanced Namespace filter */}
          <Tooltip title={t('resources.filterByNamespace')} arrow>
            <Badge
              color="primary"
              variant="dot"
              invisible={!activeFilters.namespace}
              sx={{
                '& .MuiBadge-dot': {
                  backgroundColor: isDark ? darkTheme.brand.primaryLight : lightTheme.brand.primary,
                  boxShadow: isDark
                    ? '0 0 8px rgba(59, 130, 246, 0.6)'
                    : '0 0 8px rgba(37, 99, 235, 0.4)',
                },
              }}
            >
              <Button
                variant="outlined"
                size="medium"
                onClick={e => setNamespaceMenuAnchor(e.currentTarget)}
                startIcon={<FilterListIcon />}
                sx={{
                  ...getButtonStyle(!!activeFilters.namespace),
                  borderRadius: '12px',
                  px: 2.5,
                  py: 1,
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: activeFilters.namespace
                    ? isDark
                      ? '0 4px 20px rgba(59, 130, 246, 0.3)'
                      : '0 4px 20px rgba(37, 99, 235, 0.2)'
                    : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: isDark
                      ? '0 8px 25px rgba(59, 130, 246, 0.4)'
                      : '0 8px 25px rgba(37, 99, 235, 0.25)',
                  },
                }}
              >
                {activeFilters.namespace || t('resources.namespace')}
              </Button>
            </Badge>
          </Tooltip>

          {/* Enhanced Label filter */}
          <Tooltip title={t('resources.filterByLabel')} arrow>
            <Badge
              color="primary"
              variant="dot"
              invisible={!activeFilters.label}
              sx={{
                '& .MuiBadge-dot': {
                  backgroundColor: isDark ? darkTheme.brand.primaryLight : lightTheme.brand.primary,
                  boxShadow: isDark
                    ? '0 0 8px rgba(59, 130, 246, 0.6)'
                    : '0 0 8px rgba(37, 99, 235, 0.4)',
                },
              }}
            >
              <Button
                variant="outlined"
                size="medium"
                onClick={e => setLabelMenuAnchor(e.currentTarget)}
                startIcon={<LabelIcon />}
                sx={{
                  ...getButtonStyle(!!activeFilters.label),
                  borderRadius: '12px',
                  px: 2.5,
                  py: 1,
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: activeFilters.label
                    ? isDark
                      ? '0 4px 20px rgba(59, 130, 246, 0.3)'
                      : '0 4px 20px rgba(37, 99, 235, 0.2)'
                    : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: isDark
                      ? '0 8px 25px rgba(59, 130, 246, 0.4)'
                      : '0 8px 25px rgba(37, 99, 235, 0.25)',
                  },
                }}
              >
                {activeFilters.label
                  ? `${activeFilters.label.key}:${activeFilters.label.value}`
                  : t('resources.labels')}
              </Button>
            </Badge>
          </Tooltip>

          {/* Enhanced Clear filters button */}
          {activeFilterCount > 0 && (
            <Button
              variant="contained"
              size="medium"
              onClick={handleClearFilters}
              startIcon={<ClearIcon />}
              sx={{
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.8)' : '#ef4444',
                color: '#ffffff',
                borderRadius: '12px',
                px: 2.5,
                py: 1,
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: '0 4px 20px rgba(239, 68, 68, 0.3)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  backgroundColor: isDark ? 'rgba(220, 38, 38, 0.9)' : '#dc2626',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(239, 68, 68, 0.4)',
                },
              }}
            >
              Clear ({activeFilterCount})
            </Button>
          )}
        </Box>

        {/* Enhanced Active filters */}
        {activeFilterCount > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              width: '100%',
              mt: 2,
              pt: 2,
              borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                alignSelf: 'center',
                mr: 1,
              }}
            >
              Active Filters:
            </Typography>
            {activeFilters.kind && (
              <Chip
                label={`Kind: ${activeFilters.kind}`}
                onDelete={() => handleRemoveFilter('kind')}
                color="primary"
                variant="filled"
                size="small"
                sx={{
                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.8)' : 'rgba(37, 99, 235, 0.9)',
                  color: '#ffffff',
                  fontWeight: 600,
                  '& .MuiChip-deleteIcon': {
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': {
                      color: '#ffffff',
                    },
                  },
                }}
              />
            )}
            {activeFilters.namespace && (
              <Chip
                label={`Namespace: ${activeFilters.namespace}`}
                onDelete={() => handleRemoveFilter('namespace')}
                color="primary"
                variant="filled"
                size="small"
                sx={{
                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.8)' : 'rgba(37, 99, 235, 0.9)',
                  color: '#ffffff',
                  fontWeight: 600,
                  '& .MuiChip-deleteIcon': {
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': {
                      color: '#ffffff',
                    },
                  },
                }}
              />
            )}
            {activeFilters.label && isRenderable(activeFilters.label.value) && (
              <Chip
                label={`${activeFilters.label.key}: ${activeFilters.label.value}`}
                onDelete={() => handleRemoveFilter('label')}
                color="primary"
                variant="filled"
                size="small"
                sx={{
                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.8)' : 'rgba(37, 99, 235, 0.9)',
                  color: '#ffffff',
                  fontWeight: 600,
                  '& .MuiChip-deleteIcon': {
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': {
                      color: '#ffffff',
                    },
                  },
                }}
              />
            )}
          </Box>
        )}
      </Box>

      {/* Enhanced Menus */}
      <Menu
        anchorEl={kindMenuAnchor}
        open={Boolean(kindMenuAnchor)}
        onClose={() => setKindMenuAnchor(null)}
        PaperProps={{
          ...menuPaperProps,
          sx: {
            ...menuPaperProps.sx,
            width: 280,
            maxHeight: 400,
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <FilterListIcon fontSize="small" />
            Resource Kinds ({uniqueKinds.length})
          </Typography>
        </Box>
        {uniqueKinds.map(kind => (
          <MenuItem
            key={kind}
            onClick={() => handleKindSelect(kind)}
            selected={activeFilters.kind === kind}
            sx={{
              margin: '4px 8px',
              borderRadius: '8px',
              backgroundColor:
                activeFilters.kind === kind
                  ? isDark
                    ? 'rgba(59, 130, 246, 0.2)'
                    : 'rgba(59, 130, 246, 0.1)'
                  : 'transparent',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                transform: 'translateX(4px)',
              },
              '&.Mui-selected': {
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.15)',
                '&:hover': {
                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.35)' : 'rgba(59, 130, 246, 0.2)',
                },
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
              <AccountTreeIcon
                fontSize="small"
                sx={{
                  color:
                    activeFilters.kind === kind
                      ? isDark
                        ? darkTheme.brand.primaryLight
                        : lightTheme.brand.primary
                      : isDark
                        ? darkTheme.text.secondary
                        : lightTheme.text.secondary,
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
                {kind}
              </Typography>
              {activeFilters.kind === kind && (
                <Chip
                  label="Active"
                  size="small"
                  color="primary"
                  sx={{
                    height: '20px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>
          </MenuItem>
        ))}
      </Menu>

      <Menu
        anchorEl={namespaceMenuAnchor}
        open={Boolean(namespaceMenuAnchor)}
        onClose={() => setNamespaceMenuAnchor(null)}
        PaperProps={{
          ...menuPaperProps,
          sx: {
            ...menuPaperProps.sx,
            width: 280,
            maxHeight: 400,
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <FilterListIcon fontSize="small" />
            Namespaces ({uniqueNamespaces.length})
          </Typography>
        </Box>
        {uniqueNamespaces.map(namespace => (
          <MenuItem
            key={namespace}
            onClick={() => handleNamespaceSelect(namespace)}
            selected={activeFilters.namespace === namespace}
            sx={{
              margin: '4px 8px',
              borderRadius: '8px',
              backgroundColor:
                activeFilters.namespace === namespace
                  ? isDark
                    ? 'rgba(59, 130, 246, 0.2)'
                    : 'rgba(59, 130, 246, 0.1)'
                  : 'transparent',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                transform: 'translateX(4px)',
              },
              '&.Mui-selected': {
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.15)',
                '&:hover': {
                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.35)' : 'rgba(59, 130, 246, 0.2)',
                },
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: isDark ? darkTheme.brand.primaryLight : lightTheme.brand.primary,
                  opacity: activeFilters.namespace === namespace ? 1 : 0.5,
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
                {namespace}
              </Typography>
              {activeFilters.namespace === namespace && (
                <Chip
                  label="Active"
                  size="small"
                  color="primary"
                  sx={{
                    height: '20px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>
          </MenuItem>
        ))}
      </Menu>

      <Menu
        anchorEl={labelMenuAnchor}
        open={Boolean(labelMenuAnchor)}
        onClose={() => setLabelMenuAnchor(null)}
        PaperProps={{
          ...menuPaperProps,
          sx: {
            ...menuPaperProps.sx,
            width: 320,
            maxHeight: 450,
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <LabelIcon fontSize="small" />
            Labels ({uniqueLabels.size} keys)
          </Typography>
        </Box>
        {Array.from(uniqueLabels.entries()).map(([key, values]) => (
          <React.Fragment key={key}>
            <Box
              sx={{
                px: 2,
                py: 1,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <LabelIcon fontSize="small" sx={{ opacity: 0.7 }} />
                {key} ({values.size} values)
              </Typography>
            </Box>
            {Array.from(values).map(value =>
              isRenderable(value) ? (
                <MenuItem
                  key={`${key}-${value}`}
                  onClick={() => handleLabelSelect(key, value as string)}
                  selected={
                    activeFilters.label?.key === key && activeFilters.label?.value === value
                  }
                  sx={{
                    margin: '2px 8px',
                    borderRadius: '8px',
                    backgroundColor:
                      activeFilters.label?.key === key && activeFilters.label?.value === value
                        ? isDark
                          ? 'rgba(59, 130, 246, 0.2)'
                          : 'rgba(59, 130, 246, 0.1)'
                        : 'transparent',
                    '&:hover': {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                      transform: 'translateX(4px)',
                    },
                    '&.Mui-selected': {
                      backgroundColor: isDark
                        ? 'rgba(59, 130, 246, 0.25)'
                        : 'rgba(59, 130, 246, 0.15)',
                      '&:hover': {
                        backgroundColor: isDark
                          ? 'rgba(59, 130, 246, 0.35)'
                          : 'rgba(59, 130, 246, 0.2)',
                      },
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', pl: 2 }}
                  >
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: isDark
                          ? darkTheme.brand.primaryLight
                          : lightTheme.brand.primary,
                        opacity:
                          activeFilters.label?.key === key && activeFilters.label?.value === value
                            ? 1
                            : 0.5,
                      }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 400, flex: 1 }}>
                      {value}
                    </Typography>
                    {activeFilters.label?.key === key && activeFilters.label?.value === value && (
                      <Chip
                        label="Active"
                        size="small"
                        color="primary"
                        sx={{
                          height: '18px',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </Box>
                </MenuItem>
              ) : null
            )}
          </React.Fragment>
        ))}
        {uniqueLabels.size === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography
              variant="body2"
              sx={{
                color: isDark ? darkTheme.text.tertiary : lightTheme.text.tertiary,
                fontStyle: 'italic',
              }}
            >
              No labels found in the current resources
            </Typography>
          </Box>
        )}
      </Menu>
    </Box>
  );
};

export default ObjectFilters;

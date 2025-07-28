import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Divider,
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
import { ResourceItem } from './ListViewComponent';
import { darkTheme, lightTheme } from '../lib/theme-utils';
import { debounce } from 'lodash';

export interface ResourceFilter {
  kind?: string;
  namespace?: string;
  label?: { key: string; value: string };
  searchQuery?: string;
}

interface ResourceFiltersProps {
  onFiltersChange: (filters: ResourceFilter) => void;
  availableResources: ResourceItem[];
  activeFilters: ResourceFilter;
}

// Utility to check if a value is string or number
function isRenderable(val: unknown): val is string | number {
  return typeof val === 'string' || typeof val === 'number';
}

const ResourceFilters: React.FC<ResourceFiltersProps> = ({
  onFiltersChange,
  availableResources,
  activeFilters,
}) => {
  const { t } = useTranslation();
  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';

  // Keep a ref to maintain layout stability during typing
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const [searchBoxWidth, setSearchBoxWidth] = useState<number | undefined>(undefined);

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

  // Set initial search box width
  useEffect(() => {
    if (searchBoxRef.current) {
      setSearchBoxWidth(searchBoxRef.current.offsetWidth);
    }
  }, []);

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

  const handleRemoveFilter = (filterType: keyof ResourceFilter) => {
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
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'stretch', md: 'center' },
        gap: 2,
        p: 2,
        backgroundColor: isDark ? '#111827' : '#f8fafc',
        borderRadius: '8px',
        mb: 2,
        boxShadow: isDark ? darkTheme.shadow.sm : lightTheme.shadow.sm,
      }}
    >
      {/* Search field with fixed width to prevent collapse when typing */}
      <Box
        ref={searchBoxRef}
        sx={{
          flex: 2,
          width: searchBoxWidth,
          minWidth: { xs: '100%', md: '300px' },
        }}
      >
        <TextField
          placeholder={t('resources.search')}
          variant="outlined"
          fullWidth
          size="small"
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon
                  sx={{ color: isDark ? darkTheme.text.tertiary : lightTheme.text.tertiary }}
                />
              </InputAdornment>
            ),
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => {
                    setSearchQuery('');
                    onFiltersChange({ ...activeFilters, searchQuery: '' });
                  }}
                  sx={{ color: isDark ? darkTheme.text.tertiary : lightTheme.text.tertiary }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
            sx: {
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: isDark ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: isDark ? darkTheme.brand.primary : lightTheme.brand.primary,
              },
            },
          }}
        />
      </Box>

      {/* Filter buttons */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          flex: { xs: 1, md: 'none' },
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* Kind filter */}
          <Tooltip title={t('resources.filterByKind')}>
            <Badge color="primary" variant="dot" invisible={!activeFilters.kind}>
              <Button
                variant="outlined"
                size="small"
                onClick={e => setKindMenuAnchor(e.currentTarget)}
                startIcon={<FilterListIcon />}
                sx={getButtonStyle(!!activeFilters.kind)}
              >
                {t('resources.kind')}
              </Button>
            </Badge>
          </Tooltip>
          <Menu
            anchorEl={kindMenuAnchor}
            open={Boolean(kindMenuAnchor)}
            onClose={() => setKindMenuAnchor(null)}
            PaperProps={menuPaperProps}
          >
            {uniqueKinds.map(kind => (
              <MenuItem
                key={kind}
                onClick={() => handleKindSelect(kind)}
                selected={activeFilters.kind === kind}
                sx={{
                  backgroundColor:
                    activeFilters.kind === kind
                      ? isDark
                        ? 'rgba(59, 130, 246, 0.25)'
                        : 'rgba(59, 130, 246, 0.15)'
                      : 'transparent',
                  '&:hover': {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
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
                }}
              >
                {kind}
              </MenuItem>
            ))}
          </Menu>

          {/* Namespace filter - not bound to resource kind */}
          <Tooltip title={t('resources.filterByNamespace')}>
            <Badge color="primary" variant="dot" invisible={!activeFilters.namespace}>
              <Button
                variant="outlined"
                size="small"
                onClick={e => setNamespaceMenuAnchor(e.currentTarget)}
                startIcon={<FilterListIcon />}
                sx={getButtonStyle(!!activeFilters.namespace)}
              >
                {t('resources.namespace')}
              </Button>
            </Badge>
          </Tooltip>
          <Menu
            anchorEl={namespaceMenuAnchor}
            open={Boolean(namespaceMenuAnchor)}
            onClose={() => setNamespaceMenuAnchor(null)}
            PaperProps={menuPaperProps}
          >
            {uniqueNamespaces.map(namespace => (
              <MenuItem
                key={namespace}
                onClick={() => handleNamespaceSelect(namespace)}
                selected={activeFilters.namespace === namespace}
                sx={{
                  backgroundColor:
                    activeFilters.namespace === namespace
                      ? isDark
                        ? 'rgba(59, 130, 246, 0.25)'
                        : 'rgba(59, 130, 246, 0.15)'
                      : 'transparent',
                  '&:hover': {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
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
                }}
              >
                {namespace}
              </MenuItem>
            ))}
          </Menu>

          {/* Label filter */}
          <Tooltip title={t('resources.filterByLabel')}>
            <Badge color="primary" variant="dot" invisible={!activeFilters.label}>
              <Button
                variant="outlined"
                size="small"
                onClick={e => setLabelMenuAnchor(e.currentTarget)}
                startIcon={<LabelIcon />}
                sx={getButtonStyle(!!activeFilters.label)}
              >
                {t('resources.labels')}
              </Button>
            </Badge>
          </Tooltip>
          <Menu
            anchorEl={labelMenuAnchor}
            open={Boolean(labelMenuAnchor)}
            onClose={() => setLabelMenuAnchor(null)}
            PaperProps={{
              ...menuPaperProps,
              sx: {
                ...menuPaperProps.sx,
                width: 250,
                zIndex: 1300,
              },
            }}
          >
            {Array.from(uniqueLabels.entries()).map(([key, values]) => (
              <React.Fragment key={key}>
                <Typography
                  variant="caption"
                  sx={{
                    px: 2,
                    py: 1,
                    display: 'block',
                    fontWeight: 'bold',
                    color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
                  }}
                >
                  {key}
                </Typography>
                {Array.from(values).map(value =>
                  isRenderable(value) ? (
                    <MenuItem
                      key={`${key}-${value}`}
                      onClick={() => handleLabelSelect(key, value as string)}
                      selected={
                        activeFilters.label?.key === key && activeFilters.label?.value === value
                      }
                      sx={{
                        backgroundColor:
                          activeFilters.label?.key === key && activeFilters.label?.value === value
                            ? isDark
                              ? 'rgba(59, 130, 246, 0.25)'
                              : 'rgba(59, 130, 246, 0.15)'
                            : 'transparent',
                        '&:hover': {
                          backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.1)'
                            : 'rgba(0, 0, 0, 0.05)',
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
                      }}
                    >
                      <Typography variant="body2" sx={{ pl: 2 }}>
                        {value}
                      </Typography>
                    </MenuItem>
                  ) : null
                )}
                <Divider
                  sx={{
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
                  }}
                />
              </React.Fragment>
            ))}
            {uniqueLabels.size === 0 && (
              <MenuItem disabled>
                <Typography
                  sx={{ color: isDark ? darkTheme.text.tertiary : lightTheme.text.tertiary }}
                >
                  {t('resources.noLabelsFound')}
                </Typography>
              </MenuItem>
            )}
          </Menu>
        </Box>

        {/* Clear filters button */}
        {activeFilterCount > 0 && (
          <Button
            variant="outlined"
            size="small"
            onClick={handleClearFilters}
            startIcon={<ClearIcon />}
            sx={{
              borderColor: isDark ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
              color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
              },
            }}
          >
            {t('resources.clearFilters')}
          </Button>
        )}
      </Box>

      {/* Active filters */}
      {activeFilterCount > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, width: '100%' }}>
          {activeFilters.kind && (
            <Chip
              label={`${t('resources.kind')}: ${activeFilters.kind}`}
              onDelete={() => handleRemoveFilter('kind')}
              color="primary"
              variant="outlined"
              size="small"
              sx={{
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)',
                borderColor: isDark ? darkTheme.brand.primary : lightTheme.brand.primary,
                color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                '& .MuiChip-deleteIcon': {
                  color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
                  '&:hover': {
                    color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                  },
                },
              }}
            />
          )}
          {activeFilters.namespace && (
            <Chip
              label={`${t('resources.namespace')}: ${activeFilters.namespace}`}
              onDelete={() => handleRemoveFilter('namespace')}
              color="primary"
              variant="outlined"
              size="small"
              sx={{
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)',
                borderColor: isDark ? darkTheme.brand.primary : lightTheme.brand.primary,
                color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                '& .MuiChip-deleteIcon': {
                  color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
                  '&:hover': {
                    color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
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
              variant="outlined"
              size="small"
              sx={{
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)',
                borderColor: isDark ? darkTheme.brand.primary : lightTheme.brand.primary,
                color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                '& .MuiChip-deleteIcon': {
                  color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
                  '&:hover': {
                    color: isDark ? darkTheme.text.primary : lightTheme.text.primary,
                  },
                },
              }}
            />
          )}
        </Box>
      )}
    </Box>
  );
};

export default ResourceFilters;

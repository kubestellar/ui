import React from 'react';
import {
  Button,
  Typography,
  Chip,
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { Filter, Plus, Tag } from 'lucide-react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PostAddIcon from '@mui/icons-material/PostAdd';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

import SearchBox from '../common/SearchBox';
import { ManagedClusterInfo, ColorTheme, StatusFilterItem } from './types';

interface ClustersTableHeaderProps {
  query: string;
  setQuery: (query: string) => void;
  filter: string;
  setFilter: (filter: string) => void;
  filterByLabel: Array<{ key: string; value: string }>;
  setFilterByLabel: React.Dispatch<React.SetStateAction<Array<{ key: string; value: string }>>>;
  clusters: ManagedClusterInfo[];
  filteredClusters: ManagedClusterInfo[];
  selectedClusters: string[];
  selectAll: boolean;
  setSelectAll: (selectAll: boolean) => void;
  hasSelectedClusters: boolean;
  showCreateOptions: boolean;
  setShowCreateOptions: (show: boolean) => void;
  activeOption: string | null;
  setActiveOption: (option: string | null) => void;
  bulkLabelsAnchorEl: HTMLElement | null;
  setBulkLabelsAnchorEl: (el: HTMLElement | null) => void;
  statusFilterAnchorEl: HTMLElement | null;
  setStatusFilterAnchorEl: (el: HTMLElement | null) => void;
  searchFocused: boolean;
  setSearchFocused: (focused: boolean) => void;
  setSelectedCluster: (cluster: ManagedClusterInfo | null) => void;
  setEditDialogOpen: (open: boolean) => void;
  colors: ColorTheme;
  isDark: boolean;
}

const ClustersTableHeader: React.FC<ClustersTableHeaderProps> = ({
  query,
  setQuery,
  filter,
  setFilter,
  filterByLabel,
  setFilterByLabel,
  clusters,
  filteredClusters,
  selectedClusters,
  hasSelectedClusters,
  setShowCreateOptions,
  setActiveOption,
  bulkLabelsAnchorEl,
  setBulkLabelsAnchorEl,
  statusFilterAnchorEl,
  setStatusFilterAnchorEl,
  searchFocused,
  setSearchFocused,
  setSelectedCluster,
  setEditDialogOpen,
  colors,
  isDark,
}) => {
  const { t } = useTranslation();

  const statusFilterItems: StatusFilterItem[] = [
    { value: '', label: 'All Status', color: '', icon: null },
    { value: 'available', label: 'Active', color: colors.success },
    { value: 'unavailable', label: 'Inactive', color: colors.error },
    { value: 'pending', label: 'Pending', color: colors.warning },
  ];

  const bulkLabelsMenuOpen = Boolean(bulkLabelsAnchorEl);
  const statusFilterOpen = Boolean(statusFilterAnchorEl);

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setStatusFilterAnchorEl(null);
  };

  const handleStatusFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setStatusFilterAnchorEl(event.currentTarget);
  };

  const handleStatusFilterClose = () => {
    setStatusFilterAnchorEl(null);
  };

  const handleBulkLabelsClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setBulkLabelsAnchorEl(event.currentTarget);
  };

  const handleBulkLabelsClose = () => {
    setBulkLabelsAnchorEl(null);
  };

  const handleBulkAddLabels = () => {
    if (!hasSelectedClusters) return;

    const bulkOperationCluster = {
      name: `${selectedClusters.length} selected clusters`,
      context: 'bulk-operation',
      labels: {},
      uid: 'bulk-operation',
      creationTimestamp: new Date().toISOString(),
      status: 'Active',
    };

    setSelectedCluster(bulkOperationCluster);
    setEditDialogOpen(true);
    handleBulkLabelsClose();
  };

  const handleClearFilters = () => {
    setQuery('');
    setFilter('');
    setFilterByLabel([]);
    toast.success('All filters cleared', { duration: 2000 });
  };

  const getFilteredCount = () => filteredClusters.length;

  return (
    <>
      {/* Title Section */}
      <div className="mb-8">
        <h1
          className="mb-2 flex items-center gap-2 text-3xl font-bold"
          style={{ color: colors.primary }}
        >
          <div>{t('clusters.title')}</div>
          <span
            className="rounded-full px-3 py-1 text-sm"
            style={{
              backgroundColor: isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)',
              color: colors.primary,
            }}
          >
            {clusters.length}
          </span>
        </h1>
        <p className="text-lg" style={{ color: colors.textSecondary }}>
          {t('clusters.subtitle')}
        </p>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-6 flex flex-col gap-4">
        <div
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-opacity-50 p-4"
          style={{
            backgroundColor: isDark ? 'rgba(47, 134, 255, 0.05)' : 'rgba(47, 134, 255, 0.02)',
            border: `1px solid ${isDark ? 'rgba(47, 134, 255, 0.1)' : 'rgba(47, 134, 255, 0.05)'}`,
            backdropFilter: 'blur(8px)',
          }}
        >
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder={t('clusters.searchPlaceholder')}
            colors={colors}
            isDark={isDark}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            showHint={searchFocused}
            hintText={t('clusters.list.clearSearch')}
          />

          <div className="flex items-center gap-3">
            {/* Status Filter Button */}
            <Button
              variant="outlined"
              onClick={handleStatusFilterClick}
              startIcon={
                <Filter
                  size={16}
                  style={{ color: filter ? colors.primary : colors.textSecondary }}
                />
              }
              endIcon={
                <KeyboardArrowDownIcon
                  style={{ color: filter ? colors.primary : colors.textSecondary }}
                />
              }
              sx={{
                color: filter ? colors.primary : colors.textSecondary,
                borderColor: filter ? colors.primary : colors.border,
                backgroundColor: filter
                  ? isDark
                    ? 'rgba(47, 134, 255, 0.1)'
                    : 'rgba(47, 134, 255, 0.05)'
                  : 'transparent',
                textTransform: 'none',
                fontWeight: filter ? '600' : '500',
                borderRadius: '10px',
                padding: '8px 16px',
                height: '45px',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: isDark ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)',
                  borderColor: colors.primary,
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px -2px rgba(47, 134, 255, 0.2)',
                },
              }}
            >
              {filter
                ? statusFilterItems.find(item => item.value === filter)?.label ||
                  t('clusters.list.filter')
                : t('clusters.list.filter')}
              {filter && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '22px',
                    height: '22px',
                    borderRadius: '11px',
                    backgroundColor: colors.primary,
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    ml: 1,
                  }}
                >
                  1
                </Box>
              )}
            </Button>

            {/* Status Filter Menu */}
            <Menu
              anchorEl={statusFilterAnchorEl}
              open={statusFilterOpen}
              onClose={handleStatusFilterClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              PaperProps={{
                style: {
                  backgroundColor: colors.paper,
                  borderRadius: '12px',
                  minWidth: '220px',
                  border: `1px solid ${colors.border}`,
                  marginTop: '8px',
                  padding: '8px',
                },
              }}
            >
              {statusFilterItems.map(item => (
                <MenuItem
                  key={item.value}
                  onClick={() => handleFilterChange(item.value)}
                  selected={filter === item.value}
                  sx={{
                    color: colors.text,
                    backgroundColor:
                      filter === item.value
                        ? isDark
                          ? 'rgba(47, 134, 255, 0.15)'
                          : 'rgba(47, 134, 255, 0.1)'
                        : 'transparent',
                    borderRadius: '8px',
                    margin: '3px 0',
                    padding: '10px 16px',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1.5 }}>
                    {item.value && (
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: item.color,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: filter === item.value ? 600 : 400 }}
                    >
                      {item.label}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Menu>

            {/* Bulk Actions */}
            {hasSelectedClusters && (
              <Button
                variant="outlined"
                startIcon={<Tag size={16} />}
                endIcon={<KeyboardArrowDownIcon />}
                onClick={handleBulkLabelsClick}
                sx={{
                  color: colors.primary,
                  borderColor: colors.border,
                  backgroundColor: isDark ? 'rgba(47, 134, 255, 0.05)' : 'transparent',
                  textTransform: 'none',
                  fontWeight: '500',
                  borderRadius: '10px',
                  padding: '8px 16px',
                  height: '45px',
                }}
              >
                {t('clusters.labels.manage')}
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '22px',
                    height: '22px',
                    borderRadius: '11px',
                    backgroundColor: colors.primary,
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    ml: 1,
                    padding: '0 6px',
                  }}
                >
                  {selectedClusters.length}
                </Box>
              </Button>
            )}

            {/* Bulk Labels Menu */}
            <Menu
              anchorEl={bulkLabelsAnchorEl}
              open={bulkLabelsMenuOpen}
              onClose={handleBulkLabelsClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  backgroundColor: colors.paper,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                },
              }}
            >
              <MenuItem onClick={handleBulkAddLabels} sx={{ color: colors.text }}>
                <ListItemIcon>
                  <PostAddIcon fontSize="small" style={{ color: colors.primary }} />
                </ListItemIcon>
                <ListItemText>{t('clusters.labels.bulkLabels')}</ListItemText>
              </MenuItem>
            </Menu>

            {/* Import Cluster Button */}
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() => {
                setShowCreateOptions(true);
                setActiveOption('quickconnect');
              }}
              sx={{
                bgcolor: colors.primary,
                color: colors.white,
                '&:hover': { bgcolor: colors.primaryDark },
                textTransform: 'none',
                fontWeight: '600',
                padding: '8px 20px',
                borderRadius: '8px',
              }}
            >
              {t('clusters.importCluster')}
            </Button>
          </div>
        </div>

        {/* Active Filter Display */}
        {(query || filter || filterByLabel.length > 0) && (
          <div
            className="relative mb-2 flex flex-wrap items-center gap-2 overflow-hidden rounded-xl p-4"
            style={{
              backgroundColor: isDark ? 'rgba(47, 134, 255, 0.08)' : 'rgba(47, 134, 255, 0.04)',
              border: `1px solid ${isDark ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)'}`,
            }}
          >
            <Typography
              variant="subtitle2"
              style={{
                color: colors.primary,
                marginRight: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Filter size={16} style={{ color: colors.primary }} />
              {t('clusters.activeFilters')}
            </Typography>

            {query && (
              <Chip
                label={`${t('clusters.search')}: "${query}"`}
                size="medium"
                onDelete={() => setQuery('')}
                sx={{
                  backgroundColor: isDark ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)',
                  color: colors.primary,
                  fontWeight: 500,
                }}
              />
            )}

            {filter && (
              <Chip
                label={`${t('clusters.status.title')}: ${statusFilterItems.find(item => item.value === filter)?.label}`}
                size="medium"
                onDelete={() => setFilter('')}
                sx={{
                  backgroundColor: isDark ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)',
                  color: colors.primary,
                  fontWeight: 500,
                }}
              />
            )}

            {filterByLabel.map((labelFilter, index) => (
              <Chip
                key={`${labelFilter.key}-${labelFilter.value}-${index}`}
                label={`${t('clusters.labels.label')}: ${labelFilter.key}=${labelFilter.value}`}
                size="medium"
                onDelete={() => {
                  setFilterByLabel(prev => prev.filter((_, i) => i !== index));
                  toast.success(`Label filter removed: ${labelFilter.key}=${labelFilter.value}`, {
                    duration: 2000,
                  });
                }}
                sx={{
                  backgroundColor: isDark ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)',
                  color: colors.primary,
                  fontWeight: 500,
                }}
              />
            ))}

            <Box sx={{ flexGrow: 1 }} />

            <Typography
              variant="body2"
              sx={{
                color: colors.text,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                padding: '4px 10px',
                borderRadius: '6px',
                marginRight: '8px',
                fontWeight: 500,
              }}
            >
              {getFilteredCount()} result{getFilteredCount() !== 1 ? 's' : ''}
            </Typography>

            <Button
              variant="text"
              size="small"
              onClick={handleClearFilters}
              startIcon={<CloseIcon fontSize="small" />}
              sx={{
                color: colors.primary,
                textTransform: 'none',
                fontWeight: 500,
                borderRadius: '8px',
              }}
            >
              {t('common.clearAll')}
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default ClustersTableHeader;

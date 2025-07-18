import React, { useState, useEffect, useCallback } from 'react';
import { Paper, TableContainer, Table } from '@mui/material';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import CreateOptions from '../ImportClusters';
import useTheme from '../../stores/themeStore';
import { useClusterQueries } from '../../hooks/queries/useClusterQueries';
import TableSkeleton from '../skeleton/TableSkeleton';
import ClustersTableHeader from './ClustersTableHeader';
import ClustersTableRow from './ClustersTableRow';
import ClusterActions from './ClusterActions';
import { applyClusterFilters } from './ClusterFilters';
import LabelEditDialog from './dialogs/LabelEditDialog';
import DetachClusterDialog from './dialogs/DetachClusterDialog';
import ClusterDetailDialog from '..//ClusterDetailDialog';
import DetachmentLogsDialog from '..//DetachmentLogsDialog';
import { getClusterTableStyles } from './ClustersTableStyles';
import { ManagedClusterInfo, ClustersTableProps } from './types';
import { Button, Typography, Box } from '@mui/material';

declare global {
  interface Window {
    handleSaveLabels?: (
      clusterName: string,
      contextName: string,
      labels: { [key: string]: string },
      deletedLabels?: string[]
    ) => void;
    handleConfirmDetach?: (clusterName: string) => void;
  }
}

const ClustersTable: React.FC<ClustersTableProps> = ({
  clusters,
  isLoading = false,
  initialShowCreateOptions = false,
  initialActiveOption = 'quickconnect',
}) => {
  const { t } = useTranslation();
  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';
  const styles = getClusterTableStyles(isDark);

  // State management
  const [query, setQuery] = useState('');
  const [filteredClusters, setFilteredClusters] = useState<ManagedClusterInfo[]>(clusters);
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination logic
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredClusters.length / itemsPerPage));
  const onPageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Get paginated clusters
  const paginatedClusters = filteredClusters.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const [filter, setFilter] = useState<string>('');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [showCreateOptions, setShowCreateOptions] = useState(initialShowCreateOptions);
  const [activeOption, setActiveOption] = useState<string | null>(initialActiveOption);
  const [filterByLabel, setFilterByLabel] = useState<Array<{ key: string; value: string }>>([]);

  // Reset pagination when filters change or when current page exceeds total pages
  useEffect(() => {
    setCurrentPage(1);
  }, [query, filter, filterByLabel]);

  // Ensure current page doesn't exceed total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<ManagedClusterInfo | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [detachClusterOpen, setDetachClusterOpen] = useState(false);
  const [detachLogsOpen, setDetachLogsOpen] = useState(false);

  // Loading states
  const [loadingClusterEdit, setLoadingClusterEdit] = useState<string | null>(null);
  const [loadingClusterDetach, setLoadingClusterDetach] = useState<string | null>(null);

  // Menu states
  const [anchorElActions, setAnchorElActions] = useState<{ [key: string]: HTMLElement | null }>({});
  const [bulkLabelsAnchorEl, setBulkLabelsAnchorEl] = useState<null | HTMLElement>(null);
  const [statusFilterAnchorEl, setStatusFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const { useUpdateClusterLabels, useDetachCluster } = useClusterQueries();
  const updateLabelsMutation = useUpdateClusterLabels();
  const detachClusterMutation = useDetachCluster();

  const colors = {
    primary: '#2f86ff',
    primaryLight: '#9ad6f9',
    primaryDark: '#1a65cc',
    secondary: '#67c073',
    white: '#ffffff',
    background: isDark ? '#0f172a' : '#ffffff',
    paper: isDark ? '#1e293b' : '#f8fafc',
    text: isDark ? '#f1f5f9' : '#1e293b',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
    success: '#67c073',
    warning: '#ffb347',
    error: '#ff6b6b',
    disabled: isDark ? '#475569' : '#94a3b8',
  };

  // Initialize with initial props if provided
  useEffect(() => {
    if (initialShowCreateOptions) {
      setShowCreateOptions(true);
      setActiveOption(initialActiveOption);
    }
  }, [initialShowCreateOptions, initialActiveOption]);

  // Filter clusters based on search, status, and labels
  const filterClusters = useCallback(() => {
    const result = applyClusterFilters(clusters, {
      query,
      filter,
      filterByLabel,
    });
    setFilteredClusters(result);
  }, [clusters, query, filter, filterByLabel]);

  useEffect(() => {
    setFilteredClusters(clusters);
  }, [clusters]);

  useEffect(() => {
    filterClusters();
  }, [filterClusters]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editDialogOpen || showCreateOptions) return;

      if ((e.ctrlKey && e.key === 'f') || e.key === '/') {
        e.preventDefault();
        // Focus search will be handled by header component
      }

      if (e.key === 'Escape') {
        if (filter) setFilter('');
        if (filterByLabel.length > 0) setFilterByLabel([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editDialogOpen, showCreateOptions, filter, filterByLabel]);

  const hasSelectedClusters = selectedClusters.length > 0;

  return (
    <div className="p-4" style={{ backgroundColor: colors.background, color: colors.text }}>
      <ClusterActions
        clusters={clusters}
        selectedClusters={selectedClusters}
        setSelectedClusters={setSelectedClusters}
        filteredClusters={filteredClusters}
        selectedCluster={selectedCluster}
        setSelectedCluster={setSelectedCluster}
        loadingClusterEdit={loadingClusterEdit}
        setLoadingClusterEdit={setLoadingClusterEdit}
        loadingClusterDetach={loadingClusterDetach}
        setLoadingClusterDetach={setLoadingClusterDetach}
        editDialogOpen={editDialogOpen}
        setEditDialogOpen={setEditDialogOpen}
        viewDetailsOpen={viewDetailsOpen}
        setViewDetailsOpen={setViewDetailsOpen}
        detachClusterOpen={detachClusterOpen}
        setDetachClusterOpen={setDetachClusterOpen}
        detachLogsOpen={detachLogsOpen}
        setDetachLogsOpen={setDetachLogsOpen}
        anchorElActions={anchorElActions}
        setAnchorElActions={setAnchorElActions}
        updateLabelsMutation={updateLabelsMutation}
        detachClusterMutation={detachClusterMutation}
        colors={colors}
        isDark={isDark}
      />

      <ClustersTableHeader
        query={query}
        setQuery={setQuery}
        filter={filter}
        setFilter={setFilter}
        filterByLabel={filterByLabel}
        setFilterByLabel={setFilterByLabel}
        clusters={clusters}
        filteredClusters={filteredClusters}
        selectedClusters={selectedClusters}
        selectAll={selectAll}
        setSelectAll={setSelectAll}
        hasSelectedClusters={hasSelectedClusters}
        showCreateOptions={showCreateOptions}
        setShowCreateOptions={setShowCreateOptions}
        activeOption={activeOption}
        setActiveOption={setActiveOption}
        bulkLabelsAnchorEl={bulkLabelsAnchorEl}
        setBulkLabelsAnchorEl={setBulkLabelsAnchorEl}
        statusFilterAnchorEl={statusFilterAnchorEl}
        setStatusFilterAnchorEl={setStatusFilterAnchorEl}
        searchFocused={searchFocused}
        setSearchFocused={setSearchFocused}
        setSelectedCluster={setSelectedCluster}
        setEditDialogOpen={setEditDialogOpen}
        colors={colors}
        isDark={isDark}
      />

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : (
        <TableContainer component={Paper} className="overflow-auto" sx={styles.tableContainer}>
          <Table>
            <ClustersTableRow
              clusters={paginatedClusters}
              selectedClusters={selectedClusters}
              setSelectedClusters={setSelectedClusters}
              selectAll={selectAll}
              setSelectAll={setSelectAll}
              filterByLabel={filterByLabel}
              setFilterByLabel={setFilterByLabel}
              anchorElActions={anchorElActions}
              setAnchorElActions={setAnchorElActions}
              setSelectedCluster={setSelectedCluster}
              setEditDialogOpen={setEditDialogOpen}
              setViewDetailsOpen={setViewDetailsOpen}
              setDetachClusterOpen={setDetachClusterOpen}
              colors={colors}
              isDark={isDark}
              onCopyName={(clusterName: string) => {
                navigator.clipboard.writeText(clusterName);
                toast.success(`Cluster name copied to clipboard: ${clusterName}`, {
                  duration: 2000,
                });
              }}
            />
          </Table>
        </TableContainer>
      )}

      {/* Pagination */}
      {!isLoading && (
        <div className="mt-6 flex items-center justify-between gap-2 px-2">
          {/* Previous Button - Compact */}
          <Button
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            sx={{
              color: currentPage === 1 ? colors.disabled : colors.primary,
              borderColor: currentPage === 1 ? colors.disabled : colors.primary,
              backgroundColor:
                isDark && currentPage !== 1 ? 'rgba(47, 134, 255, 0.1)' : 'transparent',
              '&:hover': {
                borderColor: colors.primaryLight,
                backgroundColor: isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)',
                transform: currentPage !== 1 ? 'translateX(-2px)' : 'none',
              },
              '&.Mui-disabled': {
                color: colors.disabled,
                borderColor: colors.disabled,
              },
              textTransform: 'none',
              fontWeight: '600',
              padding: { xs: '8px 12px', sm: '8px 16px' }, // Compact padding
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              minWidth: { xs: '80px', sm: '100px' }, // Smaller minimum width
              fontSize: { xs: '0.8rem', sm: '0.9rem' }, // Slightly smaller text
            }}
            variant="outlined"
            startIcon={
              <svg
                width="16" // Smaller icon
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  transition: 'transform 0.3s ease',
                  transform: currentPage === 1 ? 'translateX(0)' : 'translateX(-2px)',
                }}
              >
                <path
                  d="M15 18L9 12L15 6"
                  stroke={currentPage === 1 ? colors.disabled : colors.primary}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          >
            <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>{t('common.previous')}</Box>
            <Box sx={{ display: { xs: 'inline', sm: 'none' } }}>{t('common.previous')}</Box>
          </Button>

          {/* Center Information - More Compact */}
          <div className="flex items-center gap-3">
            {/* Page Info */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: { xs: '6px 10px', sm: '6px 12px' }, // Reduced padding
                backgroundColor: isDark ? 'rgba(47, 134, 255, 0.1)' : 'rgba(47, 134, 255, 0.05)',
                borderRadius: '8px', // Smaller border radius
                border: `1px solid ${isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)'}`,
                boxShadow: isDark
                  ? '0 2px 4px rgba(0, 0, 0, 0.1)'
                  : '0 2px 4px rgba(0, 0, 0, 0.05)',
                minWidth: { xs: '100px', sm: '120px' }, // Smaller minimum width
              }}
            >
              <Typography
                style={{
                  color: colors.textSecondary,
                  fontSize: '0.75rem', // Smaller font
                  marginRight: '4px',
                }}
                sx={{
                  display: { xs: 'none', sm: 'inline' },
                }}
              >
                Page
              </Typography>
              <Typography
                style={{
                  color: colors.primary,
                  fontWeight: 600,
                  fontSize: '0.9rem', // Smaller font
                }}
                className="mx-1"
              >
                {currentPage}
              </Typography>
              <Typography
                style={{
                  color: colors.textSecondary,
                  fontSize: '0.75rem', // Smaller font
                }}
              >
                of {totalPages}
              </Typography>
            </Box>

            {/* Item Count - Compact */}
            <Typography
              sx={{
                color: colors.textSecondary,
                fontSize: { xs: '0.75rem', sm: '0.8rem' }, // Smaller font
                display: 'flex',
                alignItems: 'center',
                backgroundColor: {
                  xs: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  sm: 'transparent',
                },
                padding: { xs: '4px 8px', sm: '0' },
                borderRadius: { xs: '6px', sm: '0' },
                border: { xs: `1px solid ${colors.border}`, sm: 'none' },
                minWidth: { xs: '70px', sm: 'auto' }, // Smaller minimum width
                justifyContent: 'center',
              }}
            >
              <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {filteredClusters.length} items
              </Box>
              <Box sx={{ display: { xs: 'inline', sm: 'none' } }}>
                {filteredClusters.length} items
              </Box>
            </Typography>
          </div>

          {/* Next Button - Compact */}
          <Button
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            sx={{
              color: currentPage === totalPages ? colors.disabled : colors.primary,
              borderColor: currentPage === totalPages ? colors.disabled : colors.primary,
              backgroundColor:
                isDark && currentPage !== totalPages ? 'rgba(47, 134, 255, 0.1)' : 'transparent',
              '&:hover': {
                borderColor: colors.primaryLight,
                backgroundColor: isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)',
                transform: currentPage !== totalPages ? 'translateX(2px)' : 'none',
              },
              '&.Mui-disabled': {
                color: colors.disabled,
                borderColor: colors.disabled,
              },
              textTransform: 'none',
              fontWeight: '600',
              padding: { xs: '8px 12px', sm: '8px 16px' }, // Compact padding
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              minWidth: { xs: '80px', sm: '100px' }, // Smaller minimum width
              fontSize: { xs: '0.8rem', sm: '0.9rem' }, // Slightly smaller text
            }}
            variant="outlined"
            endIcon={
              <svg
                width="16" // Smaller icon
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  transition: 'transform 0.3s ease',
                  transform: currentPage === totalPages ? 'translateX(0)' : 'translateX(2px)',
                }}
              >
                <path
                  d="M9 6L15 12L9 18"
                  stroke={currentPage === totalPages ? colors.disabled : colors.primary}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          >
            <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>{t('common.next')}</Box>
            <Box sx={{ display: { xs: 'inline', sm: 'none' } }}>Next</Box>
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <LabelEditDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          if (loadingClusterEdit && selectedCluster) {
            setLoadingClusterEdit(null);
          }
        }}
        cluster={selectedCluster}
        onSave={(
          clusterName: string,
          contextName: string,
          labels: { [key: string]: string },
          deletedLabels?: string[]
        ) => {
          if (typeof window !== 'undefined' && window.handleSaveLabels) {
            window.handleSaveLabels(clusterName, contextName, labels, deletedLabels);
          }
        }}
        isDark={isDark}
        colors={colors}
      />

      <DetachClusterDialog
        open={detachClusterOpen}
        onClose={() => {
          setDetachClusterOpen(false);
          if (loadingClusterDetach) {
            setLoadingClusterDetach(null);
          }
        }}
        cluster={selectedCluster}
        onDetach={(clusterName: string) => {
          if (typeof window !== 'undefined' && window.handleConfirmDetach) {
            window.handleConfirmDetach(clusterName);
          }
        }}
        isLoading={!!loadingClusterDetach}
        isDark={isDark}
        colors={colors}
      />

      <ClusterDetailDialog
        open={viewDetailsOpen}
        onClose={() => setViewDetailsOpen(false)}
        clusterName={selectedCluster?.name || null}
        isDark={isDark}
        colors={colors}
      />

      <DetachmentLogsDialog
        open={detachLogsOpen}
        onClose={() => setDetachLogsOpen(false)}
        clusterName={selectedCluster?.name || ''}
        isDark={isDark}
        colors={colors}
      />

      {showCreateOptions && (
        <CreateOptions
          activeOption={activeOption}
          setActiveOption={setActiveOption}
          onCancel={() => setShowCreateOptions(false)}
        />
      )}
    </div>
  );
};

export default ClustersTable;

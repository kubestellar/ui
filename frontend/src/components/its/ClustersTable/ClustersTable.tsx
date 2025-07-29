import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import useTheme from '../../../stores/themeStore';
import { useClusterQueries } from '../../../hooks/queries/useClusterQueries';
import { toast } from 'react-hot-toast';
import CreateOptions from '../ImportCluster/ImportClusters';
import TableHeader from './components/TableHeader';
import TableContent from './components/TableContent';
import TablePagination from './components/TablePagination';
import FilterChips from './components/FilterChips';
import ActionMenu from './components/ActionMenu';
import { ClustersTableProps, ManagedClusterInfo, ColorTheme, StatusFilterItem } from './types';
import LabelEditDialog from './dialogs/LabelEditDialog';
import DetachClusterDialog from './dialogs/DetachClusterDialog';
import ClusterDetailDialog from './dialogs/ClusterDetailDialog';
import DetachmentLogsDialog from './dialogs/DetachmentLogsDialog';

const ClustersTable: React.FC<ClustersTableProps> = ({
  clusters,
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
  initialShowCreateOptions = false,
  initialActiveOption = 'quickconnect',
}) => {
  const { t } = useTranslation();
  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';
  const searchInputRef = useRef<HTMLInputElement>(null);

  // State
  const [query, setQuery] = useState('');
  const [filteredClusters, setFilteredClusters] = useState<ManagedClusterInfo[]>(clusters);
  const [filter, setFilter] = useState<string>('');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [showCreateOptions, setShowCreateOptions] = useState(initialShowCreateOptions);
  const [activeOption, setActiveOption] = useState<string | null>(initialActiveOption);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<ManagedClusterInfo | null>(null);
  const [loadingClusterEdit, setLoadingClusterEdit] = useState<string | null>(null);
  const [filterByLabel, setFilterByLabel] = useState<Array<{ key: string; value: string }>>([]);
  const [anchorElActions, setAnchorElActions] = useState<{ [key: string]: HTMLElement | null }>({});
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [detachClusterOpen, setDetachClusterOpen] = useState(false);
  const [detachLogsOpen, setDetachLogsOpen] = useState(false);
  const [loadingClusterDetach, setLoadingClusterDetach] = useState<string | null>(null);

  const { useUpdateClusterLabels, useDetachCluster } = useClusterQueries();
  const updateLabelsMutation = useUpdateClusterLabels();
  const detachClusterMutation = useDetachCluster();

  // Define colors
  const colors: ColorTheme = {
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

  // Status filter options
  const statusFilterItems: StatusFilterItem[] = [
    { value: '', label: 'All Status', color: '', icon: null },
    { value: 'available', label: 'Active', color: colors.success },
    { value: 'unavailable', label: 'Inactive', color: colors.error },
    { value: 'pending', label: 'Pending', color: colors.warning },
  ];

  // Effects
  useEffect(() => {
    let filtered = [...clusters];

    // Apply search filter
    if (query.trim()) {
      const searchTerm = query.toLowerCase();
      filtered = filtered.filter(cluster => cluster.name.toLowerCase().includes(searchTerm));
    }

    // Apply status filter
    if (filter) {
      filtered = filtered.filter(cluster => {
        switch (filter) {
          case 'available':
            return cluster.available === true;
          case 'unavailable':
            return cluster.available === false;
          case 'pending':
            return cluster.status?.toLowerCase() === 'pending';
          default:
            return true;
        }
      });
    }

    // Apply label filters
    if (filterByLabel.length > 0) {
      filtered = filtered.filter(cluster =>
        filterByLabel.every(({ key, value }) => cluster.labels?.[key] === value)
      );
    }

    setFilteredClusters(filtered);
  }, [clusters, query, filter, filterByLabel]);

  useEffect(() => {
    if (initialShowCreateOptions) {
      setShowCreateOptions(true);
      setActiveOption(initialActiveOption);
    }
  }, [initialShowCreateOptions, initialActiveOption]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editDialogOpen || showCreateOptions) return;

      if ((e.ctrlKey && e.key === 'f') || e.key === '/') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }

      if (e.key === 'Escape') {
        if (document.activeElement === searchInputRef.current && searchInputRef.current) {
          setQuery('');
          searchInputRef.current.blur();
        } else {
          if (filter) setFilter('');
          if (filterByLabel.length > 0) setFilterByLabel([]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editDialogOpen, showCreateOptions, query, filter, filterByLabel]);

  // Handlers
  const handleFilterByLabel = (key: string, value: string) => {
    if (filterByLabel.some(item => item.key === key && item.value === value)) {
      setFilterByLabel(prev => prev.filter(item => item.key !== key || item.value !== value));
      toast.success('Label filter removed', { duration: 2000 });
    } else {
      setFilterByLabel(prev => [...prev, { key, value }]);
      toast.success(`Filtering by label: ${key}=${value}`, { duration: 2000 });
    }
  };

  const handleCheckboxChange = (clusterName: string) => {
    setSelectedClusters(prev =>
      prev.includes(clusterName)
        ? prev.filter(name => name !== clusterName)
        : [...prev, clusterName]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedClusters([]);
    } else {
      setSelectedClusters(filteredClusters.map(cluster => cluster.name));
    }
    setSelectAll(!selectAll);
  };

  const handleActionsClick = (event: React.MouseEvent<HTMLButtonElement>, clusterName: string) => {
    setAnchorElActions(prev => ({ ...prev, [clusterName]: event.currentTarget }));
  };

  const handleActionsClose = (clusterName: string) => {
    setAnchorElActions(prev => ({ ...prev, [clusterName]: null }));
  };

  const handleViewDetails = (cluster: ManagedClusterInfo) => {
    setSelectedCluster(cluster);
    handleActionsClose(cluster.name);
    setViewDetailsOpen(true);
  };

  const handleEditLabels = (cluster: ManagedClusterInfo) => {
    setSelectedCluster(cluster);
    setEditDialogOpen(true);
  };

  const handleDetachCluster = (cluster: ManagedClusterInfo) => {
    setSelectedCluster(cluster);
    handleActionsClose(cluster.name);
    setDetachClusterOpen(true);
  };

  const handleConfirmDetach = (clusterName: string) => {
    setLoadingClusterDetach(clusterName);
    setDetachClusterOpen(false);
    setDetachLogsOpen(true);

    detachClusterMutation.mutate(clusterName, {
      onSuccess: () => {
        setLoadingClusterDetach(null);
        setSelectedClusters(prev => prev.filter(name => name !== clusterName));
      },
      onError: () => {
        setLoadingClusterDetach(null);
      },
    });
  };

  const handleSaveLabels = (
    clusterName: string,
    contextName: string,
    labels: { [key: string]: string },
    deletedLabels?: string[]
  ) => {
    const isBulkOperation =
      selectedClusters.length > 1 && clusterName.includes('selected clusters');
    setLoadingClusterEdit(isBulkOperation ? 'bulk' : clusterName);

    if (isBulkOperation) {
      let successCount = 0;
      let failureCount = 0;

      const processNextCluster = async (index = 0) => {
        if (index >= selectedClusters.length) {
          setLoadingClusterEdit(null);
          setEditDialogOpen(false);

          if (failureCount === 0) {
            toast.success(`Labels updated for all ${successCount} clusters`, { icon: '🏷️' });
          } else {
            toast.error(
              `Updated ${successCount} clusters, failed to update ${failureCount} clusters`,
              { icon: '⚠️', duration: 5000 }
            );
          }
          return;
        }

        const name = selectedClusters[index];
        const cluster = clusters.find(c => c.name === name);
        if (!cluster) {
          processNextCluster(index + 1);
          return;
        }

        try {
          await updateLabelsMutation.mutateAsync({
            contextName: cluster.context,
            clusterName: cluster.name,
            labels,
            deletedLabels,
          });

          successCount++;
          await new Promise(resolve => setTimeout(resolve, 300));
          processNextCluster(index + 1);
        } catch (error) {
          failureCount++;
          console.error(`Error updating labels for ${cluster.name}:`, error);
          processNextCluster(index + 1);
        }
      };

      processNextCluster();
    } else {
      updateLabelsMutation.mutate(
        {
          contextName,
          clusterName,
          labels,
          deletedLabels,
        },
        {
          onSuccess: () => {
            toast.success('Labels updated successfully', { icon: '🏷️' });
            setLoadingClusterEdit(null);
            setEditDialogOpen(false);
          },
          onError: error => {
            toast.error('Error updating labels. Please try again.', {
              icon: '❌',
              duration: 5000,
            });
            console.error('Error updating cluster labels:', error);
            setLoadingClusterEdit(null);
          },
        }
      );
    }
  };

  return (
    <div className="p-4" style={{ backgroundColor: colors.background, color: colors.text }}>
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

      <TableHeader
        query={query}
        onQueryChange={setQuery}
        filter={filter}
        onFilterChange={setFilter}
        hasSelectedClusters={selectedClusters.length > 0}
        selectedCount={selectedClusters.length}
        onBulkLabels={() => {
          handleEditLabels({
            name: `${selectedClusters.length} selected clusters`,
            context: 'bulk-operation',
            labels: {},
          });
        }}
        onShowCreateOptions={() => {
          setShowCreateOptions(true);
          setActiveOption('quickconnect');
        }}
        statusFilterItems={statusFilterItems}
        isDark={isDark}
        colors={colors}
      />

      <FilterChips
        query={query}
        filter={filter}
        filterByLabel={filterByLabel}
        statusFilterItems={statusFilterItems}
        onClearQuery={() => setQuery('')}
        onClearFilter={() => setFilter('')}
        onClearLabelFilter={index => {
          setFilterByLabel(prev => prev.filter((_, i) => i !== index));
          toast.success('Label filter removed', { duration: 2000 });
        }}
        onClearAll={() => {
          setQuery('');
          setFilter('');
          setFilterByLabel([]);
          toast.success('All filters cleared', { duration: 2000 });
        }}
        filteredCount={filteredClusters.length}
        isDark={isDark}
        colors={colors}
      />

      <TableContent
        clusters={filteredClusters}
        selectedClusters={selectedClusters}
        selectAll={selectAll}
        onSelectAll={handleSelectAll}
        onCheckboxChange={handleCheckboxChange}
        onActionsClick={handleActionsClick}
        onFilterByLabel={handleFilterByLabel}
        filterByLabel={filterByLabel}
        query={query}
        filter={filter}
        onClearQuery={() => setQuery('')}
        onClearFilter={() => setFilter('')}
        onShowCreateOptions={() => {
          setShowCreateOptions(true);
          setActiveOption('quickconnect');
        }}
        isDark={isDark}
        colors={colors}
      />

      {!isLoading && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemCount={filteredClusters.length}
          onPageChange={onPageChange}
          isDark={isDark}
          colors={colors}
        />
      )}

      {showCreateOptions && (
        <CreateOptions
          activeOption={activeOption}
          setActiveOption={setActiveOption}
          onCancel={() => setShowCreateOptions(false)}
        />
      )}

      {Object.entries(anchorElActions).map(([clusterName, anchorEl]) => {
        const cluster = clusters.find(c => c.name === clusterName);
        if (!cluster) return null;

        return (
          <ActionMenu
            key={clusterName}
            cluster={cluster}
            anchorEl={anchorEl}
            onClose={() => handleActionsClose(clusterName)}
            onViewDetails={handleViewDetails}
            onEditLabels={handleEditLabels}
            onDetachCluster={handleDetachCluster}
            isDark={isDark}
            colors={colors}
          />
        );
      })}

      <LabelEditDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          if (loadingClusterEdit) {
            setLoadingClusterEdit(null);
          }
        }}
        cluster={selectedCluster}
        onSave={handleSaveLabels}
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
        onDetach={handleConfirmDetach}
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
    </div>
  );
};

export default ClustersTable;

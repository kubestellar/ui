import React, { useState } from 'react';
import { Paper, useTheme as useMuiTheme } from '@mui/material';
import { ManagedCluster } from '../../types/bindingPolicy';
import { useNavigate } from 'react-router-dom';
import { useClusterQueries } from '../../hooks/queries/useClusterQueries';
import { toast } from 'react-hot-toast';
import useTheme from '../../stores/themeStore';
import ClusterPanelHeader from './ClusterPanelHeader';
import ClusterLabelsList from './ClusterLabelsList';
import { LabelEditDialog, SelectClusterDialog } from './ClusterDialogs';

interface ClusterPanelProps {
  clusters: ManagedCluster[];
  loading: boolean;
  error?: string;
  compact?: boolean;
  filteredLabelKeys?: string[];
  onItemClick?: (clusterId: string) => void;
}

// Group representing a unique label key+value with clusters that share it
interface LabelGroup {
  key: string;
  value: string;
  clusters: Array<{
    name: string;
  }>;
}

// Default labels to filter out of the UI display
const DEFAULT_FILTERED_LABEL_KEYS = [
  'open-cluster-management',
  'kubernetes.io',
  'k8s.io',
  'cluster.open-cluster-management.io',
  'feature.open-cluster-management.io',
];

const ClusterPanel: React.FC<ClusterPanelProps> = ({
  clusters,
  loading,
  error,
  compact = false,
  filteredLabelKeys = DEFAULT_FILTERED_LABEL_KEYS,
  onItemClick,
}) => {
  const muiTheme = useMuiTheme();
  const theme = useTheme(state => state.theme);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<ManagedCluster | null>(null);
  const [selectedClusters, setSelectedClusters] = useState<ManagedCluster[]>([]);
  const [isBulkEdit, setIsBulkEdit] = useState(false);
  const [loadingClusterEdit, setLoadingClusterEdit] = useState<string | null>(null);
  const [selectClusterDialogOpen, setSelectClusterDialogOpen] = useState(false);

  const DEFAULT_CONTEXT = 'its1';

  const isDarkTheme = theme === 'dark';
  const { useUpdateClusterLabels } = useClusterQueries();
  const updateLabelsMutation = useUpdateClusterLabels();

  const handleImportClusters = () => {
    navigate('/its?import=true');
  };

  const handleAddLabels = () => {
    if (clusters.length > 0) {
      // Open the select cluster dialog instead of auto-selecting the first cluster
      setSelectClusterDialogOpen(true);
      setIsBulkEdit(false);
      setSelectedClusters([]);
    } else {
      toast.error('No clusters available to edit');
    }
  };

  const handleEditSpecificCluster = (cluster: ManagedCluster) => {
    console.log('ClusterPanel - handleEditSpecificCluster - cluster:', cluster);
    console.log('ClusterPanel - handleEditSpecificCluster - cluster.context:', cluster.context);

    // Log all cluster contexts for debugging
    logClusterContexts();

    // Clone the cluster object and ensure it has a valid context
    // Use the cluster's original context if available, or fall back to the default context
    const clusterWithContext = {
      ...cluster,
      context: cluster.context || DEFAULT_CONTEXT,
    };

    setSelectedCluster(clusterWithContext);
    setEditDialogOpen(true);
    setSelectClusterDialogOpen(false);
    setIsBulkEdit(false);
  };

  const handleEditMultipleClusters = (clusters: ManagedCluster[]) => {
    console.log(
      'handleEditMultipleClusters called with:',
      JSON.stringify(
        clusters.map(c => c.name),
        null,
        2
      )
    );

    if (clusters.length === 0) {
      toast.error('No clusters selected');
      return;
    }

    // Ensure all clusters have valid contexts
    const clustersWithContext = clusters.map(cluster => ({
      ...cluster,
      context: cluster.context || DEFAULT_CONTEXT,
    }));

    setSelectedClusters(clustersWithContext);
    setEditDialogOpen(true);
    setSelectClusterDialogOpen(false);
    setIsBulkEdit(true);
  };

  // Debug function to log all cluster contexts
  const logClusterContexts = () => {
    console.log('ClusterPanel - Available clusters:');
    clusters.forEach(c => {
      console.log(`Cluster: ${c.name}, Context: ${c.context || 'undefined'}`);
    });
  };

  const handleSaveLabels = (
    clusterName: string,
    contextName: string,
    labels: { [key: string]: string }
  ) => {
    setLoadingClusterEdit(clusterName);

    console.log('ClusterPanel - handleSaveLabels - clusterName:', clusterName);
    console.log('ClusterPanel - handleSaveLabels - contextName:', contextName);

    // Make sure the context is properly set in the mutation request
    // Use the provided context or fall back to the default context if not provided
    updateLabelsMutation.mutate(
      {
        contextName: contextName || DEFAULT_CONTEXT,
        clusterName,
        labels,
      },
      {
        onSuccess: () => {
          toast.success('Labels updated successfully', {
            icon: '🏷️',
            style: {
              borderRadius: '10px',
              background: isDarkTheme ? '#1e293b' : '#ffffff',
              color: isDarkTheme ? '#f1f5f9' : '#1e293b',
              border: `1px solid ${isDarkTheme ? '#334155' : '#e2e8f0'}`,
            },
          });
          setLoadingClusterEdit(null);
        },
        onError: (error: Error) => {
          toast.error('Failed to update labels', {
            icon: '❌',
            style: {
              borderRadius: '10px',
              background: isDarkTheme ? '#1e293b' : '#ffffff',
              color: isDarkTheme ? '#f1f5f9' : '#1e293b',
              border: `1px solid ${isDarkTheme ? '#334155' : '#e2e8f0'}`,
            },
          });
          console.error('Error updating cluster labels:', error);
          setLoadingClusterEdit(null);
        },
      }
    );
  };

  const handleBulkSaveLabels = async (
    clusters: ManagedCluster[],
    labels: { [key: string]: string }
  ) => {
    if (clusters.length === 0) return;

    let successCount = 0;
    let failureCount = 0;

    setLoadingClusterEdit('bulk-edit');

    for (const cluster of clusters) {
      try {
        // Get context from cluster or use default
        const contextName = cluster.context || DEFAULT_CONTEXT;

        await new Promise<void>((resolve, reject) => {
          updateLabelsMutation.mutate(
            {
              contextName,
              clusterName: cluster.name,
              labels,
            },
            {
              onSuccess: () => {
                successCount++;
                resolve();
              },
              onError: (error: Error) => {
                console.error(`Error updating cluster ${cluster.name}:`, error);
                failureCount++;
                reject(error);
              },
            }
          );
        });
      } catch (error) {
        console.error(`Error processing cluster ${cluster.name}:`, error);
      }
    }

    if (successCount > 0 && failureCount === 0) {
      toast.success(`Labels updated for all ${successCount} clusters`, {
        icon: '🏷️',
        style: {
          borderRadius: '10px',
          background: isDarkTheme ? '#1e293b' : '#ffffff',
          color: isDarkTheme ? '#f1f5f9' : '#1e293b',
          border: `1px solid ${isDarkTheme ? '#334155' : '#e2e8f0'}`,
        },
      });
    } else if (successCount > 0 && failureCount > 0) {
      toast(`Labels updated for ${successCount} clusters, failed for ${failureCount} clusters`, {
        icon: '⚠️',
        style: {
          borderRadius: '10px',
          background: isDarkTheme ? '#1e293b' : '#ffffff',
          color: isDarkTheme ? '#f1f5f9' : '#1e293b',
          border: `1px solid ${isDarkTheme ? '#334155' : '#e2e8f0'}`,
        },
      });
    } else {
      toast.error(`Failed to update labels for all ${failureCount} clusters`, {
        icon: '❌',
        style: {
          borderRadius: '10px',
          background: isDarkTheme ? '#1e293b' : '#ffffff',
          color: isDarkTheme ? '#f1f5f9' : '#1e293b',
          border: `1px solid ${isDarkTheme ? '#334155' : '#e2e8f0'}`,
        },
      });
    }

    setLoadingClusterEdit(null);
  };

  // Colors for theming the LabelEditDialog
  const colors = {
    primary: muiTheme.palette.primary.main,
    primaryLight: muiTheme.palette.primary.light,
    primaryDark: muiTheme.palette.primary.dark,
    secondary: muiTheme.palette.secondary.main,
    white: '#ffffff',
    background: isDarkTheme ? '#0f172a' : '#ffffff',
    paper: isDarkTheme ? '#1e293b' : '#f8fafc',
    text: isDarkTheme ? '#f1f5f9' : '#1e293b',
    textSecondary: isDarkTheme ? '#94a3b8' : '#64748b',
    border: isDarkTheme ? '#334155' : '#e2e8f0',
    success: '#67c073',
    warning: '#ffb347',
    error: '#ff6b6b',
    disabled: isDarkTheme ? '#475569' : '#94a3b8',
  };

  // Extract unique labels from clusters
  const uniqueLabels = React.useMemo(() => {
    const labelMap: Record<string, LabelGroup> = {};

    clusters.forEach(cluster => {
      if (cluster.labels && Object.keys(cluster.labels).length > 0) {
        Object.entries(cluster.labels).forEach(([key, value]) => {
          if (filteredLabelKeys.some(pattern => key.includes(pattern))) return;

          const labelId = `${key}:${value}`;

          if (!labelMap[labelId]) {
            labelMap[labelId] = {
              key,
              value,
              clusters: [],
            };
          }

          if (!labelMap[labelId].clusters.some(c => c.name === cluster.name)) {
            labelMap[labelId].clusters.push({
              name: cluster.name,
            });
          }
        });
      }
    });

    return Object.values(labelMap);
  }, [clusters, filteredLabelKeys]);

  // Filter labels based on search term
  const filteredLabels = React.useMemo(() => {
    if (!searchTerm) return uniqueLabels;

    return uniqueLabels.filter(
      label =>
        label.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        label.value.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [uniqueLabels, searchTerm]);

  return (
    <Paper
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 2,
        backgroundColor: isDarkTheme ? 'rgba(17, 25, 40, 0.8)' : muiTheme.palette.background.paper,
        border: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
        backdropFilter: 'blur(10px)',
      }}
    >
      <ClusterPanelHeader
        compact={compact}
        onSearch={setSearchTerm}
        onAddLabels={handleAddLabels}
        onImportClusters={handleImportClusters}
      />

      <ClusterLabelsList
        clusters={clusters}
        filteredLabels={filteredLabels}
        loading={loading}
        error={error}
        compact={compact}
        searchTerm={searchTerm}
        onItemClick={onItemClick}
        onEditCluster={handleEditSpecificCluster}
      />

      {/* Label Edit Dialog */}
      <LabelEditDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          if (loadingClusterEdit && (selectedCluster || isBulkEdit)) {
            setLoadingClusterEdit(null);
          }
        }}
        cluster={selectedCluster}
        clusters={selectedClusters || []}
        isBulkEdit={isBulkEdit}
        onSave={handleSaveLabels}
        onBulkSave={handleBulkSaveLabels}
        isDark={isDarkTheme}
        colors={colors}
      />

      {/* Select Cluster Dialog */}
      <SelectClusterDialog
        open={selectClusterDialogOpen}
        onClose={() => setSelectClusterDialogOpen(false)}
        clusters={clusters.map(cluster => ({
          ...cluster,
          context: cluster.context || DEFAULT_CONTEXT,
        }))}
        onSelectCluster={handleEditSpecificCluster}
        onSelectClusters={handleEditMultipleClusters}
        isDark={isDarkTheme}
        colors={colors}
      />
    </Paper>
  );
};

export default React.memo(ClusterPanel);

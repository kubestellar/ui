import React, { useCallback } from 'react';
import { toast } from 'react-hot-toast';

import { ManagedClusterInfo, ColorTheme } from './types';
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

interface ClusterActionsProps {
  clusters: ManagedClusterInfo[];
  selectedClusters: string[];
  setSelectedClusters: React.Dispatch<React.SetStateAction<string[]>>;
  filteredClusters: ManagedClusterInfo[];
  selectedCluster: ManagedClusterInfo | null;
  setSelectedCluster: (cluster: ManagedClusterInfo | null) => void;
  loadingClusterEdit: string | null;
  setLoadingClusterEdit: (loading: string | null) => void;
  loadingClusterDetach: string | null;
  setLoadingClusterDetach: (loading: string | null) => void;
  editDialogOpen: boolean;
  setEditDialogOpen: (open: boolean) => void;
  viewDetailsOpen: boolean;
  setViewDetailsOpen: (open: boolean) => void;
  detachClusterOpen: boolean;
  setDetachClusterOpen: (open: boolean) => void;
  detachLogsOpen: boolean;
  setDetachLogsOpen: (open: boolean) => void;
  anchorElActions: { [key: string]: HTMLElement | null };
  setAnchorElActions: React.Dispatch<React.SetStateAction<{ [key: string]: HTMLElement | null }>>;
  updateLabelsMutation: {
    mutate: (
      variables: {
        contextName: string;
        clusterName: string;
        labels: { [key: string]: string };
        deletedLabels?: string[];
        selectedClusters?: string[];
      },
      options?: {
        onSuccess?: () => void;
        onError?: (error: unknown) => void;
      }
    ) => void;
    mutateAsync: (variables: {
      contextName: string;
      clusterName: string;
      labels: { [key: string]: string };
      deletedLabels?: string[];
      selectedClusters?: string[];
    }) => Promise<unknown>;
  };
  detachClusterMutation: {
    mutate: (
      variables: string,
      options?: {
        onSuccess?: () => void;
        onError?: () => void;
      }
    ) => void;
  };
  colors: ColorTheme;
  isDark: boolean;
}

const ClusterActions: React.FC<ClusterActionsProps> = ({
  clusters,
  selectedClusters,
  setSelectedClusters,
  setLoadingClusterEdit,
  setLoadingClusterDetach,
  setEditDialogOpen,
  setDetachClusterOpen,
  setDetachLogsOpen,
  updateLabelsMutation,
  detachClusterMutation,
  isDark,
}) => {
  // Function to get the actual context to use for a cluster
  const getClusterContext = (cluster: ManagedClusterInfo): string => {
    return cluster.context || 'its1';
  };

  const handleSaveLabels = useCallback(
    (
      clusterName: string,
      contextName: string,
      labels: { [key: string]: string },
      deletedLabels?: string[]
    ) => {
      console.log('[DEBUG] ========== SAVE LABELS START ==========');
      console.log('[DEBUG] Cluster Name:', clusterName);
      console.log('[DEBUG] Context Name:', contextName);
      console.log('[DEBUG] Labels:', labels);
      console.log('[DEBUG] Deleted Labels:', deletedLabels);

      // Check if this is a bulk operation
      const isBulkOperation =
        selectedClusters.length > 1 && clusterName.includes('selected clusters');

      console.log('[DEBUG] Is Bulk Operation:', isBulkOperation);

      if (isBulkOperation) {
        // Set loading for bulk operation
        setLoadingClusterEdit('bulk');

        let successCount = 0;
        let failureCount = 0;

        // Process each cluster individually
        const processNextCluster = async (index = 0) => {
          if (index >= selectedClusters.length) {
            // All clusters processed
            setLoadingClusterEdit(null);
            setEditDialogOpen(false);

            if (failureCount === 0) {
              toast.success(`Labels updated for all ${successCount} clusters`, {
                icon: '🏷️',
              });
            } else {
              toast.error(
                `Updated ${successCount} clusters, failed to update ${failureCount} clusters`,
                {
                  icon: '⚠️',
                  duration: 5000,
                }
              );
            }
            return;
          }

          const name = selectedClusters[index];
          const cluster = clusters.find(c => c.name === name);
          if (!cluster) {
            // Skip invalid cluster
            processNextCluster(index + 1);
            return;
          }

          try {
            const finalLabels = { ...labels };
            if (deletedLabels) {
              deletedLabels.forEach(key => {
                finalLabels[key] = ''; // Empty value indicates deletion
              });
            }
            await updateLabelsMutation.mutateAsync({
              contextName: getClusterContext(cluster),
              clusterName: cluster.name,
              labels: finalLabels, // Use finalLabels which includes deletions
              deletedLabels, // Pass deleted labels for the mutation
            });

            successCount++;
            // Add a small delay between requests
            await new Promise(resolve => setTimeout(resolve, 300));
            processNextCluster(index + 1);
          } catch (error) {
            failureCount++;
            console.error(`Error updating labels for ${cluster.name}:`, error);
            processNextCluster(index + 1);
          }
        };

        // Start processing clusters
        processNextCluster();
        return;
      }

      // Regular single-cluster operation
      setLoadingClusterEdit(clusterName);

      // Find the actual cluster to get the correct context
      const actualCluster = clusters.find(c => c.name === clusterName);
      const actualContext = actualCluster ? getClusterContext(actualCluster) : contextName;

      console.log('[DEBUG] Actual Context:', actualContext);
      console.log('[DEBUG] Calling mutation...');

      updateLabelsMutation.mutate(
        {
          contextName: actualContext,
          clusterName: clusterName,
          labels, // Pass original labels
          deletedLabels, // Pass deleted labels separately
        },
        {
          onSuccess: () => {
            console.log('[DEBUG] Mutation successful');
            toast.success('Labels updated successfully', {
              icon: '🏷️',
              style: {
                borderRadius: '10px',
                background: isDark ? '#1e293b' : '#ffffff',
                color: isDark ? '#f1f5f9' : '#1e293b',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              },
            });
            setLoadingClusterEdit(null);
            setEditDialogOpen(false);
          },
          onError: (error: unknown) => {
            console.error('[DEBUG] Mutation error:', error);
            toast.error(
              'Labels are used in Binding Policy ' +
                'and cannot be deleted. Please remove the policy first.',
              {
                icon: '❌',
                style: {
                  borderRadius: '10px',
                  background: isDark ? '#1e293b' : '#ffffff',
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                },
                duration: 5000,
              }
            );
            console.error('Error updating cluster labels:', error);
            setLoadingClusterEdit(null);
          },
        }
      );
    },
    [
      clusters,
      selectedClusters,
      setLoadingClusterEdit,
      setEditDialogOpen,
      updateLabelsMutation,
      isDark,
    ]
  );

  const handleConfirmDetach = useCallback(
    (clusterName: string) => {
      setLoadingClusterDetach(clusterName);

      // Close the confirmation dialog and open logs dialog immediately
      setDetachClusterOpen(false);
      setDetachLogsOpen(true);

      detachClusterMutation.mutate(clusterName, {
        onSuccess: () => {
          setLoadingClusterDetach(null);

          // Explicitly refetch clusters data
          window.location.reload();

          // Remove the detached cluster from selected clusters if it was selected
          setSelectedClusters(prev => prev.filter(name => name !== clusterName));
        },
        onError: () => {
          setLoadingClusterDetach(null);
        },
      });
    },
    [
      setLoadingClusterDetach,
      setDetachClusterOpen,
      setDetachLogsOpen,
      detachClusterMutation,
      setSelectedClusters,
    ]
  );

  // Expose functions to parent component
  React.useEffect(() => {
    (
      window as {
        handleSaveLabels?: typeof handleSaveLabels;
        handleConfirmDetach?: typeof handleConfirmDetach;
      }
    ).handleSaveLabels = handleSaveLabels;
    (
      window as {
        handleSaveLabels?: typeof handleSaveLabels;
        handleConfirmDetach?: typeof handleConfirmDetach;
      }
    ).handleConfirmDetach = handleConfirmDetach;
  }, [handleSaveLabels, handleConfirmDetach]);

  // Expose refetch function
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('refetch-clusters', () => {
        window.location.reload();
      });
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('refetch-clusters', () => {});
      }
    };
  }, []);

  // Return null as this is a logic-only component
  return null;
};

export default ClusterActions;

import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  Paper,
  alpha,
  useTheme,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Draggable } from '@hello-pangea/dnd';
import { BindingPolicyInfo, ManagedCluster, Workload } from '../../types/bindingPolicy';
import StrictModeDroppable from './StrictModeDroppable';
import KubernetesIcon from './KubernetesIcon';

interface AvailableItemsPanelProps {
  policies: BindingPolicyInfo[];
  clusters: ManagedCluster[];
  workloads: Workload[];
  loading?: {
    clusters: boolean;
    workloads: boolean;
    policies: boolean;
  };
  error?: {
    clusters?: string;
    workloads?: string;
    policies?: string;
  };
  onItemClick?: (itemType: string, itemId: string) => void;
}

const AvailableItemsPanel: React.FC<AvailableItemsPanelProps> = ({
  policies,
  clusters,
  workloads,
  loading = { clusters: false, workloads: false, policies: false },
  error = {},
  onItemClick,
}) => {
  const theme = useTheme();

  // Debug mount/unmount cycle
  useEffect(() => {
    console.log('🔵 AvailableItemsPanel mounted with items:', {
      policies: policies.length,
      clusters: clusters.length,
      workloads: workloads.length,
    });

    return () => {
      console.log('🔴 AvailableItemsPanel unmounting');
    };
  }, [policies.length, clusters.length, workloads.length]);

  // Log whenever the component re-renders due to data changes
  console.log('🔄 AvailableItemsPanel rendering with:', {
    policies: policies.length,
    clusters: clusters.length,
    workloads: workloads.length,
    loading,
  });

  // Get status color for policy
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return '#4caf50'; // Green
      case 'Pending':
        return '#ff9800'; // Yellow/Orange
      case 'Inactive':
      default:
        return '#f44336'; // Red
    }
  };

  // Get cluster status color
  const getClusterStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ready':
        return theme.palette.success.main;
      case 'notready':
        return theme.palette.error.main;
      default:
        return theme.palette.warning.main;
    }
  };

  // Get workload icon based on type
  // const getWorkloadIcon = (type: string) => {
  //   return <KubernetesIcon type="workload" size={20} />;
  // };

  // Render loading state or content for a section
  const renderSection = <T,>(
    title: string,
    items: T[],
    isLoading: boolean,
    renderItem: (item: T, index: number) => React.ReactNode,
    droppableId: string,
    errorMessage?: string
  ) => {
    console.log(
      `🔄 Rendering section: ${title} with ${items.length} items, droppableId: ${droppableId}`
    );

    return (
      <>
        <Typography
          variant="subtitle1"
          sx={{ mt: 2, mb: 1, fontWeight: 'medium', display: 'flex', alignItems: 'center' }}
        >
          {title === 'Policies' && <KubernetesIcon type="policy" size={20} sx={{ mr: 1 }} />}
          {title === 'Clusters' && <KubernetesIcon type="cluster" size={20} sx={{ mr: 1 }} />}
          {title === 'Workloads' && <KubernetesIcon type="workload" size={20} sx={{ mr: 1 }} />}
          {title}
          {isLoading && <CircularProgress size={16} sx={{ ml: 1 }} />}
        </Typography>

        {errorMessage ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        ) : null}

        <StrictModeDroppable droppableId={droppableId} isDropDisabled={true}>
          {(provided, snapshot) => (
            <Box
              {...provided.droppableProps}
              ref={provided.innerRef}
              sx={{
                maxHeight: 230,
                overflowY: 'auto',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                mb: 2,
                backgroundColor: snapshot.isDraggingOver
                  ? alpha(theme.palette.primary.main, 0.05)
                  : 'inherit',
              }}
              data-rbd-droppable-id={droppableId}
              data-rfd-droppable-context-id={
                provided.droppableProps['data-rfd-droppable-context-id']
              }
            >
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : items.length > 0 ? (
                <>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      textAlign: 'center',
                      my: 1,
                      color: 'text.secondary',
                      fontStyle: 'italic',
                    }}
                  >
                    Click on an item to add it to the canvas
                  </Typography>
                  <List dense disablePadding>
                    {items.map((item, index) => renderItem(item, index))}
                  </List>
                </>
              ) : (
                <Box sx={{ py: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No {title.toLowerCase()} available
                  </Typography>
                </Box>
              )}
              {provided.placeholder}
            </Box>
          )}
        </StrictModeDroppable>
      </>
    );
  };

  const logDraggableRender = (type: string, id: string, index: number) => {
    console.log(`🔄 Rendering Draggable: ${type}-${id} at index ${index}`);
    return `${type}-${id}`;
  };

  // Render item that looks draggable but is actually clickable
  const renderPolicyItem = (policy: BindingPolicyInfo, index: number) => (
    <Draggable
      key={logDraggableRender('policy', policy.name, index)}
      draggableId={`policy-${policy.name}`}
      index={index}
    >
      {(provided, snapshot) => {
        console.log(
          `🔄 Draggable policy-${policy.name} rendering, isDragging:`,
          snapshot.isDragging
        );
        return (
          <ListItem
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => onItemClick?.('policy', policy.name)}
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: snapshot.isDragging
                ? alpha(theme.palette.primary.main, 0.1)
                : 'background.paper',
              '&:last-child': { borderBottom: 'none' },
              borderLeft: `4px solid ${getStatusColor(policy.status)}`,
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                cursor: 'pointer',
              },
            }}
            data-rbd-draggable-id={`policy-${policy.name}`}
            data-rfd-draggable-context-id={provided.draggableProps['data-rfd-draggable-context-id']}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <KubernetesIcon type="policy" size={20} sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 'medium' }}>
                    {policy.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {policy.namespace}
                  </Typography>
                </Box>
              </Box>
              <Tooltip title={`Status: ${policy.status}`}>
                <Chip
                  label={policy.status}
                  size="small"
                  sx={{
                    bgcolor: alpha(getStatusColor(policy.status), 0.1),
                    color: getStatusColor(policy.status),
                    fontSize: '0.7rem',
                  }}
                />
              </Tooltip>
            </Box>
          </ListItem>
        );
      }}
    </Draggable>
  );

  // Update the cluster item to be clickable instead of draggable
  const renderClusterItem = (cluster: ManagedCluster, index: number) => (
    <Draggable
      key={logDraggableRender('cluster', cluster.name, index)}
      draggableId={`cluster-${cluster.name}`}
      index={index}
    >
      {(provided, snapshot) => {
        console.log(
          `🔄 Draggable cluster-${cluster.name} rendering, isDragging:`,
          snapshot.isDragging
        );
        return (
          <ListItem
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => onItemClick?.('cluster', cluster.name)}
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: snapshot.isDragging
                ? alpha(theme.palette.primary.main, 0.1)
                : 'background.paper',
              '&:last-child': { borderBottom: 'none' },
              borderLeft: `4px solid ${getClusterStatusColor(cluster.status)}`,
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                cursor: 'pointer',
              },
            }}
            data-rbd-draggable-id={`cluster-${cluster.name}`}
            data-rfd-draggable-context-id={provided.draggableProps['data-rfd-draggable-context-id']}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <KubernetesIcon type="cluster" size={20} sx={{ mr: 1 }} />
                <Typography variant="body2" fontWeight="medium" noWrap>
                  {cluster.name}
                </Typography>
              </Box>
              <Tooltip title={`Status: ${cluster.status}`}>
                <Chip
                  label={cluster.status}
                  size="small"
                  sx={{
                    backgroundColor: alpha(getClusterStatusColor(cluster.status), 0.1),
                    color: getClusterStatusColor(cluster.status),
                    fontSize: '0.7rem',
                  }}
                />
              </Tooltip>
            </Box>
          </ListItem>
        );
      }}
    </Draggable>
  );

  // Update the workload item to be clickable instead of draggable
  const renderWorkloadItem = (workload: Workload, index: number) => (
    <Draggable
      key={logDraggableRender('workload', workload.name, index)}
      draggableId={`workload-${workload.name}`}
      index={index}
    >
      {(provided, snapshot) => {
        console.log(
          `🔄 Draggable workload-${workload.name} rendering, isDragging:`,
          snapshot.isDragging
        );
        return (
          <ListItem
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => onItemClick?.('workload', workload.name)}
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: snapshot.isDragging
                ? alpha(theme.palette.secondary.main, 0.1)
                : 'background.paper',
              '&:last-child': { borderBottom: 'none' },
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: alpha(theme.palette.secondary.main, 0.05),
                cursor: 'pointer',
              },
            }}
            data-rbd-draggable-id={`workload-${workload.name}`}
            data-rfd-draggable-context-id={provided.draggableProps['data-rfd-draggable-context-id']}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <KubernetesIcon type="workload" size={20} sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="body2" fontWeight="medium" noWrap>
                    {workload.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                      {workload.kind}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      in {workload.namespace || 'default'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </ListItem>
        );
      }}
    </Draggable>
  );

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom align="center" fontWeight="medium">
        Available Items
      </Typography>

      <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
        Select items to add them to your binding policy canvas
      </Typography>

      {/* Policies Section */}
      {renderSection(
        'Binding Policies',
        policies,
        loading.policies,
        renderPolicyItem,
        'policy-list',
        error.policies
      )}

      {/* Clusters Section */}
      {renderSection(
        'Clusters (Sync Targets)',
        clusters,
        loading.clusters,
        renderClusterItem,
        'cluster-list',
        error.clusters
      )}

      {/* Workloads Section */}
      {renderSection(
        'Workloads (WDS)',
        workloads,
        loading.workloads,
        renderWorkloadItem,
        'workload-list',
        error.workloads
      )}
    </Paper>
  );
};

export default React.memo(AvailableItemsPanel);

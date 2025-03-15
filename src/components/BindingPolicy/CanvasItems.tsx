import React, { useMemo, useEffect,  useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  IconButton, 
  Chip, 
  Divider,
  alpha,
  Badge
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import StorageIcon from '@mui/icons-material/Storage';
import DnsIcon from '@mui/icons-material/Dns';
import AppsIcon from '@mui/icons-material/Apps';
import PolicyIcon from '@mui/icons-material/Policy';
import { BindingPolicyInfo, ManagedCluster, Workload } from '../../types/bindingPolicy';

interface ConnectionLine {
  source: string;
  target: string;
  color: string;
}

interface CanvasItemsProps {
  policies: BindingPolicyInfo[];
  clusters: ManagedCluster[];
  workloads: Workload[];
  canvasEntities: {
    clusters: string[];
    workloads: string[];
    policies: string[];
  };
  assignmentMap: Record<string, { clusters: string[], workloads: string[] }>;
  getItemLabels: (itemType: 'cluster' | 'workload', itemId: string) => Record<string, string>;
  removeFromCanvas: (itemType: 'policy' | 'cluster' | 'workload', itemId: string) => void;
  elementsRef: React.MutableRefObject<Record<string, HTMLElement>>;
  connectionLines?: ConnectionLine[];
  connectMode?: boolean;
  selectedItems?: {
    itemType: string;
    itemId: string;
  }[];
  onItemClick?: (itemType: 'cluster' | 'workload' | 'policy', itemId: string) => void;
  onItemHover?: (itemType: 'cluster' | 'workload' | 'policy' | null, itemId: string | null) => void;
  activeConnection?: string | null;
  snapToGrid?: boolean;
  gridSize?: number;
}

// Utility function to generate unique ID
// const generateUniqueId = (base: string): string => {
//   return `${base}-${Math.random().toString(36).substring(2, 10)}`;
// };

const CanvasItems: React.FC<CanvasItemsProps> = ({
  policies,
  clusters,
  workloads,
  canvasEntities,
  getItemLabels,
  removeFromCanvas,
  elementsRef,
  connectionLines = [],
  connectMode = false,
  selectedItems = [],
  onItemClick,
  onItemHover,
  activeConnection,
  snapToGrid = true,
  gridSize = 20
}) => {
  // Keep track of item positions for grid snapping
  const [itemPositions, setItemPositions] = useState<Record<string, { x: number, y: number }>>({});
  
  // Snap an item to the grid when it's moved
  const snapItemToGrid = (itemId: string, rawX: number, rawY: number) => {
    if (!snapToGrid) {
      setItemPositions({
        ...itemPositions,
        [itemId]: { x: rawX, y: rawY }
      });
      return;
    }
    
    // Round to nearest grid point
    const x = Math.round(rawX / gridSize) * gridSize;
    const y = Math.round(rawY / gridSize) * gridSize;
    
    setItemPositions({
      ...itemPositions,
      [itemId]: { x, y }
    });
  };
  
  // Initialize positions on first render or when items change
  useEffect(() => {
    // Create initial positions for new items
    const newPositions = { ...itemPositions };
    let hasNewItems = false;
    
    // Initialize positions for newly added clusters
    canvasEntities.clusters.forEach((clusterId, index) => {
      const key = `cluster-${clusterId}`;
      if (!newPositions[key]) {
        hasNewItems = true;
        newPositions[key] = {
          x: snapToGrid ? gridSize * 5 : 100,
          y: snapToGrid ? gridSize * (3 + index * 3) : 60 + index * 60
        };
      }
    });
    
    // Initialize positions for newly added workloads
    canvasEntities.workloads.forEach((workloadId, index) => {
      const key = `workload-${workloadId}`;
      if (!newPositions[key]) {
        hasNewItems = true;
        newPositions[key] = {
          x: snapToGrid ? gridSize * 20 : 400,
          y: snapToGrid ? gridSize * (3 + index * 3) : 60 + index * 60
        };
      }
    });
    
    // Initialize positions for newly added policies
    canvasEntities.policies.forEach((policyId, index) => {
      const key = `policy-${policyId}`;
      if (!newPositions[key]) {
        hasNewItems = true;
        newPositions[key] = {
          x: snapToGrid ? gridSize * 12 : 240,
          y: snapToGrid ? gridSize * (3 + index * 3) : 60 + index * 60
        };
      }
    });
    
    if (hasNewItems) {
      setItemPositions(newPositions);
    }
  }, [canvasEntities, snapToGrid, gridSize, itemPositions]);
  
  // Get status color for policy
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return '#4caf50'; 
      case 'Pending':
        return '#ff9800';  
      case 'Inactive':
      default:
        return '#f44336';
    }
  };

  // Get workload icon based on type
  const getWorkloadIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'deployment':
      case 'replicaset':
        return <DnsIcon fontSize="small" sx={{ color: 'primary.main' }} />;
      case 'statefulset':
        return <StorageIcon fontSize="small" sx={{ color: 'secondary.main' }} />;
      default:
        return <DnsIcon fontSize="small" sx={{ color: 'info.main' }} />;
    }
  };

  // Pre-calculate connections for each entity type
  const connectionCounts = useMemo(() => {
    const counts = {
      policies: {} as Record<string, number>,
      clusters: {} as Record<string, number>,
      workloads: {} as Record<string, number>
    };

    connectionLines.forEach(line => {
      // Count policy connections
      if (line.source.startsWith('policy-')) {
        const policyId = line.source.replace('policy-', '');
        counts.policies[policyId] = (counts.policies[policyId] || 0) + 1;
      } else if (line.target.startsWith('policy-')) {
        const policyId = line.target.replace('policy-', '');
        counts.policies[policyId] = (counts.policies[policyId] || 0) + 1;
      }
      
      // Count cluster connections
      if (line.source.startsWith('cluster-')) {
        const clusterId = line.source.replace('cluster-', '');
        counts.clusters[clusterId] = (counts.clusters[clusterId] || 0) + 1;
      } else if (line.target.startsWith('cluster-')) {
        const clusterId = line.target.replace('cluster-', '');
        counts.clusters[clusterId] = (counts.clusters[clusterId] || 0) + 1;
      }
      
      // Count workload connections
      if (line.source.startsWith('workload-')) {
        const workloadId = line.source.replace('workload-', '');
        counts.workloads[workloadId] = (counts.workloads[workloadId] || 0) + 1;
      } else if (line.target.startsWith('workload-')) {
        const workloadId = line.target.replace('workload-', '');
        counts.workloads[workloadId] = (counts.workloads[workloadId] || 0) + 1;
      }
    });
    
    return counts;
  }, [connectionLines]);

  // Check if an item is connected
  const isConnected = (itemType: 'policy' | 'cluster' | 'workload', itemId: string) => {
    if (itemType === 'policy') {
      return (connectionCounts.policies[itemId] || 0) > 0;
    } else if (itemType === 'cluster') {
      return (connectionCounts.clusters[itemId] || 0) > 0;
    } else if (itemType === 'workload') {
      return (connectionCounts.workloads[itemId] || 0) > 0;
    }
    return false;
  };

  // Get border style based on connection state
  const getConnectionBorderStyle = (itemType: 'policy' | 'cluster' | 'workload', itemId: string, defaultColor: string) => {
    const isItemConnected = isConnected(itemType, itemId);
    const isActiveItem = activeConnection === `${itemType}-${itemId}`;
    
    return {
      borderLeft: `4px solid ${defaultColor}`,
      boxShadow: isActiveItem 
        ? '0 0 0 3px rgba(156, 39, 176, 0.5)' 
        : isItemConnected 
          ? '0 0 0 2px rgba(33, 150, 243, 0.3)' 
          : 'none',
      cursor: connectMode && (itemType === 'cluster' || itemType === 'workload') ? 'pointer' : 'default'
    };
  };

  // Handle item click for connection mode
  const handleItemClick = (itemType: 'cluster' | 'workload' | 'policy', itemId: string) => {
    if (connectMode && onItemClick) {
      onItemClick(itemType, itemId);
    }
  };

  // Handle item hover for tooltips
  const handleItemHover = (itemType: 'cluster' | 'workload' | 'policy' | null, itemId: string | null) => {
    if (onItemHover) {
      onItemHover(itemType, itemId);
    }
  };

  // Use this to add a visual indicator to show that an item can be connected
  const isItemConnectable = (itemType: string, itemId: string) => {
    if (!connectMode) return false;
    
    // If there are selected items
    if (selectedItems.length > 0) {
      const selectedItem = selectedItems[0];
      
      // If a workload is selected, clusters should be highlighted
      if (selectedItem.itemType === 'workload' && itemType === 'cluster') {
        return true;
      }
      
      // If a cluster is selected, workloads should be highlighted
      if (selectedItem.itemType === 'cluster' && itemType === 'workload') {
        return true;
      }
      
      // Prevent connecting an item to itself
      if (selectedItem.itemId === itemId) {
        return false;
      }
    }
    
    return false;
  };

  // Get styles for connectable items
  const getConnectableStyles = (itemType: string, itemId: string) => {
    if (isItemConnectable(itemType, itemId)) {
      return {
        boxShadow: '0 0 0 2px #1976d2, 0 0 10px #1976d2',
        position: 'relative',
        '&::after': {
          content: '""',
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#1976d2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold',
          zIndex: 10
        }
      };
    }
    return {};
  };

  // Group workloads by namespace
  const workloadsByNamespace = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    
    canvasEntities.workloads.forEach(workloadId => {
      const workload = workloads.find(w => w.name === workloadId);
      if (!workload) return;
      
      const namespace = workload.namespace || 'default';
      if (!grouped[namespace]) {
        grouped[namespace] = [];
      }
      
      grouped[namespace].push(workloadId);
    });
    
    return grouped;
  }, [canvasEntities.workloads, workloads]);

  // Start dragging an item
  const handleDragStart = (e: React.DragEvent, itemType: 'policy' | 'cluster' | 'workload', itemId: string) => {
    e.dataTransfer.setData('text/plain', `${itemType}-${itemId}`);
    
    // Store initial positions
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    e.dataTransfer.setDragImage(e.target as Element, rect.width / 2, rect.height / 2);
  };

  // Handle dropping an item in a new position
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;
    
    const [itemType, itemId] = data.split('-');
    
    if (!['policy', 'cluster', 'workload'].includes(itemType)) return;
    
    // Calculate the new position relative to the container
    const containerRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;
    
    // Snap to grid if enabled
    snapItemToGrid(`${itemType}-${itemId}`, x, y);
  };

  // Add drag-over handler to enable drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <Box 
      sx={{ position: 'relative', zIndex: 2, flexGrow: 1 }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Policies on Canvas */}
      {canvasEntities.policies.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Policies on Canvas:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {canvasEntities.policies.map(policyId => {
              const policy = policies.find(p => p.name === policyId);
              if (!policy) return null;
              
              const hasConnections = connectionCounts.policies[policyId] > 0;
              const position = itemPositions[`policy-${policyId}`] || { x: 0, y: 0 };
              
              return (
                <Paper
                  key={policyId}
                  ref={(el: HTMLElement | null) => {
                    if (el) elementsRef.current[`policy-${policyId}`] = el;
                  }}
                  elevation={2}
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'policy', policyId)}
                  onClick={() => handleItemClick('policy', policyId)}
                  onMouseEnter={() => handleItemHover('policy', policyId)}
                  onMouseLeave={() => handleItemHover(null, null)}
                  sx={{
                    p: 1,
                    ...getConnectionBorderStyle('policy', policyId, getStatusColor(policy.status)),
                    display: 'flex',
                    flexDirection: 'column',
                    width: 'fit-content',
                    maxWidth: 250,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    ...(connectMode ? getConnectableStyles('policy', policyId) : {}),
                    position: 'absolute',
                    left: position.x,
                    top: position.y,
                    zIndex: 3,
                    cursor: 'move',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                    }
                  }}
                >
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    mb: 0.5,
                    width: '100%'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PolicyIcon sx={{ mr: 1, color: getStatusColor(policy.status) }} />
                      <Typography variant="subtitle2" noWrap>
                        {policy.name}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {hasConnections && (
                        <Badge 
                          badgeContent={connectionCounts.policies[policyId]} 
                          color="primary" 
                          sx={{ mr: 1 }}
                        >
                          <LinkIcon fontSize="small" />
                        </Badge>
                      )}
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromCanvas('policy', policyId);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Divider sx={{ mb: 0.5 }} />
                  
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                    Status: <Chip 
                      label={policy.status} 
                      size="small" 
                      sx={{ 
                        height: 18, 
                        fontSize: '0.6rem',
                        backgroundColor: alpha(getStatusColor(policy.status), 0.1),
                        color: getStatusColor(policy.status)
                      }} 
                    />
                  </Typography>
                  
                  <Typography variant="caption" color="text.secondary" noWrap>
                    Namespace: {policy.namespace}
                  </Typography>
                </Paper>
              );
            })}
          </Box>
        </Box>
      )}
      
      {/* Clusters on Canvas */}
      {canvasEntities.clusters.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {canvasEntities.clusters.map(clusterId => {
              const cluster = clusters.find(c => c.name === clusterId);
              if (!cluster) return null;
              
              const hasConnections = connectionCounts.clusters[clusterId] > 0;
              const position = itemPositions[`cluster-${clusterId}`] || { x: 0, y: 0 };
              
              return (
                <Paper
                  key={clusterId}
                  ref={(el: HTMLElement | null) => {
                    if (el) elementsRef.current[`cluster-${clusterId}`] = el;
                  }}
                  elevation={2}
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'cluster', clusterId)}
                  onClick={() => handleItemClick('cluster', clusterId)}
                  onMouseEnter={() => handleItemHover('cluster', clusterId)}
                  onMouseLeave={() => handleItemHover(null, null)}
                  sx={{
                    p: 1,
                    ...getConnectionBorderStyle('cluster', clusterId, '#2196f3'),
                    display: 'flex',
                    flexDirection: 'column',
                    width: 'fit-content',
                    maxWidth: 250,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    ...(connectMode ? getConnectableStyles('cluster', clusterId) : {}),
                    position: 'absolute',
                    left: position.x,
                    top: position.y,
                    zIndex: 3,
                    cursor: 'move',
                    backgroundColor: isItemConnectable('cluster', clusterId) 
                      ? alpha('#2196f3', 0.1) 
                      : undefined,
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                    }
                  }}
                >
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    mb: 0.5,
                    width: '100%'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <DnsIcon sx={{ mr: 1, color: '#2196f3' }} />
                      <Typography variant="subtitle2" noWrap>
                        {cluster.name}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {hasConnections && (
                        <Badge 
                          badgeContent={connectionCounts.clusters[clusterId]} 
                          color="primary" 
                          sx={{ mr: 1 }}
                        >
                          <LinkIcon fontSize="small" />
                        </Badge>
                      )}
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromCanvas('cluster', clusterId);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  {Object.keys(cluster.labels).length > 0 && (
                    <>
                      <Divider sx={{ my: 0.5 }} />
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {Object.entries(cluster.labels).map(([key, value]) => (
                          <Chip 
                            key={key}
                            label={`${key}: ${value}`}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              height: 18,
                              fontSize: '0.6rem'
                            }}
                          />
                        ))}
                      </Box>
                    </>
                  )}
                </Paper>
              );
            })}
          </Box>
        </Box>
      )}
      
      {/* Workloads on Canvas - Grouped by Namespace */}
      {canvasEntities.workloads.length > 0 && (
        <Box sx={{ mb: 3 }}>
          
          
          {/* Render workloads grouped by namespace */}
          {Object.entries(workloadsByNamespace).map(([namespace, workloadIds]) => (
            <Box key={namespace} sx={{ mb: 2 }}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  backgroundColor: alpha('#4caf50', 0.1),
                  borderRadius: '4px',
                  py: 0.5,
                  px: 1,
                  mb: 1
                }}
              >
                <AppsIcon fontSize="small" sx={{ mr: 0.5, color: '#4caf50' }} />
                <Typography variant="body2" color="text.secondary">
                  Namespace: <strong>{namespace}</strong>
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {workloadIds.map(workloadId => {
                  const workload = workloads.find(w => w.name === workloadId);
                  if (!workload) return null;
                  
                  const hasConnections = connectionCounts.workloads[workloadId] > 0;
                  const position = itemPositions[`workload-${workloadId}`] || { x: 0, y: 0 };
                  
                  return (
                    <Paper
                      key={workloadId}
                      ref={(el: HTMLElement | null) => {
                        if (el) elementsRef.current[`workload-${workloadId}`] = el;
                      }}
                      elevation={2}
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'workload', workloadId)}
                      onClick={() => handleItemClick('workload', workloadId)}
                      onMouseEnter={() => handleItemHover('workload', workloadId)}
                      onMouseLeave={() => handleItemHover(null, null)}
                      sx={{
                        p: 1,
                        ...getConnectionBorderStyle('workload', workloadId, '#4caf50'),
                        display: 'flex',
                        flexDirection: 'column',
                        width: 'fit-content',
                        maxWidth: 250,
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        ...(connectMode ? getConnectableStyles('workload', workloadId) : {}),
                        position: 'absolute',
                        left: position.x,
                        top: position.y,
                        zIndex: 3,
                        cursor: 'move',
                        backgroundColor: isItemConnectable('workload', workloadId) 
                          ? alpha('#4caf50', 0.1) 
                          : undefined,
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                        }
                      }}
                    >
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        mb: 0.5,
                        width: '100%'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getWorkloadIcon(workload.type)}
                          <Typography variant="subtitle2" sx={{ ml: 1 }} noWrap>
                            {workload.name}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {hasConnections && (
                            <Badge 
                              badgeContent={connectionCounts.workloads[workloadId]} 
                              color="primary" 
                              sx={{ mr: 1 }}
                            >
                              <LinkIcon fontSize="small" />
                            </Badge>
                          )}
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromCanvas('workload', workloadId);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary" noWrap>
                        Type: {workload.type}
                      </Typography>
                      
                      {Object.keys(getItemLabels('workload', workloadId)).length > 0 && (
                        <>
                          <Divider sx={{ my: 0.5 }} />
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {Object.entries(getItemLabels('workload', workloadId)).map(([key, value]) => (
                              <Chip 
                                key={key}
                                label={`${key}: ${value}`}
                                size="small"
                                variant="outlined"
                                sx={{ 
                                  height: 18,
                                  fontSize: '0.6rem'
                                }}
                              />
                            ))}
                          </Box>
                        </>
                      )}
                    </Paper>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default CanvasItems; 
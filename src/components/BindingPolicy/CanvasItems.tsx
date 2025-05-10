import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  IconButton, 
  Chip, 
  Divider,
  alpha,
  Badge,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { BindingPolicyInfo, ManagedCluster, Workload } from '../../types/bindingPolicy';
import KubernetesIcon from './KubernetesIcon';
import ConnectionIcon from './ConnectionIcon.tsx';
import useTheme from "../../stores/themeStore";

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

// Extract label information from label ID
const extractLabelInfo = (labelId: string): { key: string, value: string } | null => {
  if (!labelId.startsWith('label-')) return null;
  
  console.log(`CanvasItems: Parsing label ID: ${labelId}`);
    const labelPart = labelId.substring(6);
  
  // Special case for location-group:edge which is a common label
  if (labelId === 'label-location-group:edge') {
    console.log('CanvasItems: Found location-group:edge label');
    return { key: 'location-group', value: 'edge' };
  }
  
  if (labelPart.includes(':')) {
    const colonIndex = labelPart.indexOf(':');
    const key = labelPart.substring(0, colonIndex);
    const value = labelPart.substring(colonIndex + 1);
    console.log(`CanvasItems: Found colon format "${key}:${value}"`);
    return { key, value };
  }
  
  if (labelPart.includes('=')) {
    const equalsIndex = labelPart.indexOf('=');
    const key = labelPart.substring(0, equalsIndex);
    const value = labelPart.substring(equalsIndex + 1);
    console.log(`CanvasItems: Found equals format "${key}=${value}"`);
    return { key, value };
  }
  
  const lastDashIndex = labelPart.lastIndexOf('-');
  if (lastDashIndex !== -1 && lastDashIndex > 0) {
    const key = labelPart.substring(0, lastDashIndex);
    const value = labelPart.substring(lastDashIndex + 1);
    console.log(`CanvasItems: Parsed using last dash: key="${key}", value="${value}"`);
    return { key, value };
  }
  
  const parts = labelId.split('-');
  if (parts.length >= 3) {
    const key = parts[1];
    const value = parts.slice(2).join('-');
    console.log(`CanvasItems: Fallback parsing: key="${key}", value="${value}"`);
    return { key, value };
  }
  
  console.log(`CanvasItems: Unable to parse label format: ${labelId}`);
  return null;
};

// Find workloads matching a label
const getWorkloadsForLabel = (workloads: Workload[], key: string, value: string): Workload[] => {
  return workloads.filter(workload => 
    workload.labels && workload.labels[key] === value
  );
};

// Find clusters matching a label
const getClustersForLabel = (clusters: ManagedCluster[], key: string, value: string): ManagedCluster[] => {
  return clusters.filter(cluster => 
    cluster.labels && cluster.labels[key] === value
  );
};
const CanvasItems: React.FC<CanvasItemsProps> = ({
  policies,
  clusters,
  workloads,
  canvasEntities,
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
  const theme = useTheme((state) => state.theme);
  const isDarkTheme = theme === "dark";
  
  const [itemPositions, setItemPositions] = useState<Record<string, { x: number, y: number }>>({});
  
  const snapItemToGrid = (itemId: string, rawX: number, rawY: number) => {
    if (!snapToGrid) {
      setItemPositions({
        ...itemPositions,
        [itemId]: { x: rawX, y: rawY }
      });
      return;
    }
    
    const x = Math.round(rawX / gridSize) * gridSize;
    const y = Math.round(rawY / gridSize) * gridSize;
    
    setItemPositions({
      ...itemPositions,
      [itemId]: { x, y }
    });
  };
  
  // Initialize positions for canvas items
  useEffect(() => {
    const newPositions = { ...itemPositions };
    let hasNewItems = false;
    
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
  
  const getStatusColor = (status: string) => {
    if (isDarkTheme) {
      switch (status) {
        case 'Active':
          return '#66bb6a'; // Lighter green for dark mode
        case 'Pending':
          return '#ffb74d'; // Lighter orange for dark mode
        case 'Inactive':
        default:
          return '#ef5350'; // Lighter red for dark mode
      }
    } else {
      switch (status) {
        case 'Active':
          return '#4caf50';
        case 'Pending':
          return '#ff9800';
        case 'Inactive':
        default:
          return '#f44336';
      }
    }
  };

  const getWorkloadIcon = () => {
    return <KubernetesIcon type="workload" size={20} />;
  };

  // Count connections for each entity
  const connectionCounts = useMemo(() => {
    const counts = {
      policies: {} as Record<string, number>,
      clusters: {} as Record<string, number>,
      workloads: {} as Record<string, number>
    };

    connectionLines.forEach(line => {
      if (line.source.startsWith('policy-')) {
        const policyId = line.source.replace('policy-', '');
        counts.policies[policyId] = (counts.policies[policyId] || 0) + 1;
      } else if (line.target.startsWith('policy-')) {
        const policyId = line.target.replace('policy-', '');
        counts.policies[policyId] = (counts.policies[policyId] || 0) + 1;
      }
      
      if (line.source.startsWith('cluster-')) {
        const clusterId = line.source.replace('cluster-', '');
        counts.clusters[clusterId] = (counts.clusters[clusterId] || 0) + 1;
      } else if (line.target.startsWith('cluster-')) {
        const clusterId = line.target.replace('cluster-', '');
        counts.clusters[clusterId] = (counts.clusters[clusterId] || 0) + 1;
      }
      
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

  const getConnectionBorderStyle = (itemType: 'policy' | 'cluster' | 'workload', itemId: string, defaultColor: string) => {
    const isItemConnected = isConnected(itemType, itemId);
    const isActiveItem = activeConnection === `${itemType}-${itemId}`;
    
    return {
      borderLeft: `4px solid ${defaultColor}`,
      boxShadow: isActiveItem 
        ? `0 0 0 3px ${isDarkTheme ? alpha('#ce93d8', 0.6) : alpha('#9c27b0', 0.5)}` 
        : isItemConnected 
          ? `0 0 0 2px ${isDarkTheme ? alpha('#90caf9', 0.4) : alpha('#2196f3', 0.3)}` 
          : 'none',
      backgroundColor: isDarkTheme ? 'rgba(30, 41, 59, 0.8)' : undefined,
      color: isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : undefined,
      cursor: connectMode && (itemType === 'cluster' || itemType === 'workload') ? 'pointer' : 'default'
    };
  };

  const handleItemHover = useCallback((_e: React.MouseEvent | null, itemType: 'cluster' | 'workload' | 'policy' | null, itemId: string | null) => {
    if (onItemHover) {
      onItemHover(itemType, itemId);
    }
  }, [onItemHover]);

  const isItemConnectable = (itemType: string, itemId: string) => {
    if (!connectMode) return false;
    
    if (selectedItems.length > 0) {
      const selectedItem = selectedItems[0];
      
      if (selectedItem.itemType === 'workload' && itemType === 'cluster') {
        return true;
      }
      
      if (selectedItem.itemType === 'cluster' && itemType === 'workload') {
        return true;
      }
      
      if (selectedItem.itemId === itemId) {
        return false;
      }
    }
    
    return false;
  };

  const getConnectableStyles = (itemType: string, itemId: string) => {
    if (isItemConnectable(itemType, itemId)) {
      return {
        boxShadow: `0 0 0 2px ${isDarkTheme ? '#90caf9' : '#1976d2'}, 0 0 10px ${isDarkTheme ? '#90caf9' : '#1976d2'}`,
        position: 'relative',
        '&::after': {
          content: '""',
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: isDarkTheme ? '#90caf9' : '#1976d2',
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

  const handleDragStart = (e: React.DragEvent, itemType: 'policy' | 'cluster' | 'workload', itemId: string) => {
    e.dataTransfer.setData('text/plain', `${itemType}-${itemId}`);
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    e.dataTransfer.setDragImage(e.target as Element, rect.width / 2, rect.height / 2);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;
    
    const [itemType, itemId] = data.split('-');
    
    if (!['policy', 'cluster', 'workload'].includes(itemType)) return;
    
    const containerRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;
    
    snapItemToGrid(`${itemType}-${itemId}`, x, y);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const captureItemClick = useCallback((e: React.MouseEvent, itemType: 'policy' | 'cluster' | 'workload', itemId: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (onItemClick) {
      onItemClick(itemType, itemId);
    }
  }, [onItemClick]);

  return (
    <Box 
      sx={{ position: 'relative', zIndex: 2, flexGrow: 1 }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
     {/* Policies on Canvas */}
     {canvasEntities.policies.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ 
            mb: 1, 
            fontWeight: 'bold',
            color: isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : undefined
          }}>
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
                  onClick={(e) => captureItemClick(e, 'policy', policyId)}
                  onMouseEnter={(e) => handleItemHover(e, 'policy', policyId)}
                  onMouseLeave={(e) => handleItemHover(e, null, null)}
                  data-item-type="policy"
                  data-item-id={policyId}
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
                    backdropFilter: isDarkTheme ? 'blur(8px)' : 'none',
                    border: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: isDarkTheme 
                        ? '0 4px 12px rgba(0,0,0,0.5)' 
                        : '0 4px 8px rgba(0,0,0,0.2)'
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
                      <KubernetesIcon type="policy" size={20} sx={{ 
                        mr: 1,
                        color: isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : undefined
                      }} />
                      <Typography variant="subtitle2" noWrap sx={{
                        color: isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : undefined
                      }}>
                        {policy.name}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {hasConnections && (
                        <Badge 
                          badgeContent={connectionCounts.policies[policyId]} 
                          color="primary" 
                          sx={{ 
                            mr: 1,
                            '& .MuiBadge-badge': {
                              backgroundColor: isDarkTheme ? '#90caf9' : undefined,
                              color: isDarkTheme ? '#0f172a' : undefined
                            }
                          }}
                        >
                          <ConnectionIcon size={20} color={isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : undefined} />
                        </Badge>
                      )}
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          removeFromCanvas('policy', policyId);
                        }}
                        sx={{
                          color: isDarkTheme ? '#f48fb1' : undefined,
                          '&:hover': {
                            backgroundColor: isDarkTheme 
                              ? alpha('#f44336', 0.15) 
                              : alpha('#f44336', 0.1)
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Divider sx={{ 
                    mb: 0.5,
                    borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : undefined
                  }} />
                  
                  <Typography variant="caption" sx={{ 
                    mb: 0.5,
                    color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary'
                  }}>
                    Status: <Chip 
                      label={policy.status} 
                      size="small" 
                      sx={{ 
                        height: 18, 
                        fontSize: '0.6rem',
                        backgroundColor: alpha(getStatusColor(policy.status), isDarkTheme ? 0.2 : 0.1),
                        color: getStatusColor(policy.status)
                      }} 
                    />
                  </Typography>
                  
                  <Typography variant="caption" sx={{ 
                    color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary'
                  }} noWrap>
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
              const labelInfo = extractLabelInfo(clusterId);
              const hasConnections = connectionCounts.clusters[clusterId] > 0;
              const position = itemPositions[`cluster-${clusterId}`] || { x: 0, y: 0 };
              
              const matchingClusters = labelInfo 
                ? getClustersForLabel(clusters, labelInfo.key, labelInfo.value) 
                : clusters.filter(c => c.name === clusterId);
              
              if (matchingClusters.length === 0) return null;
              
              return (
                <Paper
                  key={clusterId}
                  ref={(el: HTMLElement | null) => {
                    if (el) elementsRef.current[`cluster-${clusterId}`] = el;
                  }}
                  elevation={2}
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'cluster', clusterId)}
                  onClick={(e) => captureItemClick(e, 'cluster', clusterId)}
                  onMouseEnter={(e) => handleItemHover(e, 'cluster', clusterId)}
                  onMouseLeave={(e) => handleItemHover(e, null, null)}
                  data-item-type="cluster"
                  data-item-id={clusterId}
                  sx={{
                    p: 1,
                    ...getConnectionBorderStyle('cluster', clusterId, isDarkTheme ? '#90caf9' : '#2196f3'),
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
                    backdropFilter: isDarkTheme ? 'blur(8px)' : 'none',
                    border: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                    backgroundColor: isItemConnectable('cluster', clusterId) 
                      ? isDarkTheme 
                        ? alpha('#90caf9', 0.15) 
                        : alpha('#2196f3', 0.1) 
                      : isDarkTheme 
                        ? 'rgba(30, 41, 59, 0.8)'
                        : undefined,
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: isDarkTheme 
                        ? '0 4px 12px rgba(0,0,0,0.5)' 
                        : '0 4px 8px rgba(0,0,0,0.2)'
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
                      <KubernetesIcon type="cluster" size={20} sx={{ 
                        mr: 1,
                        color: isDarkTheme ? '#90caf9' : undefined 
                      }} />
                      <Typography variant="subtitle2" noWrap sx={{
                        color: isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : undefined
                      }}>
                        {labelInfo ? `${labelInfo.key}` : clusterId}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {hasConnections && (
                        <Badge 
                          badgeContent={connectionCounts.clusters[clusterId]} 
                          color="primary" 
                          sx={{ 
                            mr: 1,
                            '& .MuiBadge-badge': {
                              backgroundColor: isDarkTheme ? '#90caf9' : undefined,
                              color: isDarkTheme ? '#0f172a' : undefined
                            }
                          }}
                        >
                        <ConnectionIcon size={20} color={isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : undefined} />
                        </Badge>
                      )}
                      
                      {labelInfo && matchingClusters.length > 1 && (
                       <Badge 
                       badgeContent={matchingClusters.length} 
                       color="info" 
                       sx={{ 
                         mr: 1,
                         '& .MuiBadge-badge': {
                           backgroundColor: isDarkTheme ? '#90caf9' : undefined,
                           color: isDarkTheme ? '#0f172a' : undefined
                         }
                       }}
                     >
        
              <KubernetesIcon type="cluster" size={16} sx={{ color: isDarkTheme ? '#90caf9' : undefined }} />
</Badge>
                      )}
                      
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          removeFromCanvas('cluster', clusterId);
                        }}
                        sx={{
                          color: isDarkTheme ? '#f48fb1' : undefined,
                          '&:hover': {
                            backgroundColor: isDarkTheme 
                              ? alpha('#f44336', 0.15) 
                              : alpha('#f44336', 0.1)
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  {labelInfo && (
                    <>
                      <Divider sx={{ my: 0.5 }} />
                      <Chip 
                        label={labelInfo.value}
                        size="small"
                        variant="outlined"
                        sx={{ 
                          height: 20,
                          fontSize: '0.75rem',
                          mb: 0.5
                        }}
                      />
                    </>
                  )}
                  
                  {labelInfo && matchingClusters.length > 0 && (
                    <>
                      <Divider sx={{ 
                        my: 0.5,
                        borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : undefined
                      }} />
                      <Chip 
                        label={labelInfo.value}
                        size="small"
                        variant="outlined"
                        sx={{ 
                          height: 20,
                          fontSize: '0.75rem',
                          mb: 0.5,
                          color: isDarkTheme ? '#90caf9' : undefined,
                          borderColor: isDarkTheme ? alpha('#90caf9', 0.5) : undefined
                        }}
                      />
                    </>
                  )}
                </Paper>
              );
            })}
          </Box>
        </Box>
      )}
      
      {/* Workloads on Canvas */}
      {canvasEntities.workloads.length > 0 && (
        <Box sx={{ mb: 3 }}>          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {canvasEntities.workloads.map(workloadId => {
              const labelInfo = extractLabelInfo(workloadId);
              const hasConnections = connectionCounts.workloads[workloadId] > 0;
              const position = itemPositions[`workload-${workloadId}`] || { x: 0, y: 0 };
              
              const matchingWorkloads = labelInfo 
                ? getWorkloadsForLabel(workloads, labelInfo.key, labelInfo.value) 
                : workloads.filter(w => w.name === workloadId);
              
              if (matchingWorkloads.length === 0) return null;
              
              const namespaces = [...new Set(matchingWorkloads.map(w => w.namespace || 'default'))];
              
              return (
                <Paper
                key={workloadId}
                ref={(el: HTMLElement | null) => {
                  if (el) elementsRef.current[`workload-${workloadId}`] = el;
                }}
                elevation={2}
                draggable
                onDragStart={(e) => handleDragStart(e, 'workload', workloadId)}
                onClick={(e) => captureItemClick(e, 'workload', workloadId)}
                onMouseEnter={(e) => handleItemHover(e, 'workload', workloadId)}
                onMouseLeave={(e) => handleItemHover(e, null, null)}
                data-item-type="workload"
                data-item-id={workloadId}
                sx={{
                  p: 1,
                  ...getConnectionBorderStyle('workload', workloadId, isDarkTheme ? '#81c784' : '#4caf50'),
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
                  backdropFilter: isDarkTheme ? 'blur(8px)' : 'none',
                  border: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                  backgroundColor: isItemConnectable('workload', workloadId) 
                    ? isDarkTheme 
                      ? alpha('#81c784', 0.15) 
                      : alpha('#4caf50', 0.1) 
                    : isDarkTheme 
                      ? 'rgba(30, 41, 59, 0.8)'
                      : undefined,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: isDarkTheme 
                      ? '0 4px 12px rgba(0,0,0,0.5)' 
                      : '0 4px 8px rgba(0,0,0,0.2)'
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
                      {getWorkloadIcon()}
                      <Typography variant="subtitle2" sx={{ 
                        ml: 1,
                        color: isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : undefined
                      }} noWrap>
                        {labelInfo ? `${labelInfo.key}` : workloadId}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {hasConnections && (
                        <Badge 
                          badgeContent={connectionCounts.workloads[workloadId]} 
                          color="primary" 
                          sx={{ 
                            mr: 1,
                            '& .MuiBadge-badge': {
                              backgroundColor: isDarkTheme ? '#90caf9' : undefined,
                              color: isDarkTheme ? '#0f172a' : undefined
                            }
                          }}
                        >
                         <ConnectionIcon size={20} color={isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : undefined} />
                        </Badge>
                      )}
                      
                      {labelInfo && matchingWorkloads.length > 1 && (
                        <Badge 
                          badgeContent={matchingWorkloads.length} 
                          color="success" 
                          sx={{ 
                            mr: 1,
                            '& .MuiBadge-badge': {
                              backgroundColor: isDarkTheme ? '#81c784' : undefined,
                              color: isDarkTheme ? '#0f172a' : undefined
                            }
                          }}
                        >
                   
<KubernetesIcon type="cluster" size={16} sx={{ color: isDarkTheme ? '#90caf9' : undefined }} />
</Badge>
                      )}
                      
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          removeFromCanvas('workload', workloadId);
                        }}
                        sx={{
                          color: isDarkTheme ? '#f48fb1' : undefined,
                          '&:hover': {
                            backgroundColor: isDarkTheme 
                              ? alpha('#f44336', 0.15) 
                              : alpha('#f44336', 0.1)
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {labelInfo && (
                    <>
                      <Divider sx={{ 
                        my: 0.5,
                        borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : undefined
                      }} />
                      <Chip 
                        label={labelInfo.value}
                        size="small"
                        variant="outlined"
                        sx={{ 
                          height: 20,
                          fontSize: '0.75rem',
                          mb: 0.5,
                          color: isDarkTheme ? '#81c784' : undefined,
                          borderColor: isDarkTheme ? alpha('#81c784', 0.5) : undefined
                        }}
                      />
                    </>
                  )}
                  
     {namespaces.length > 0 && (
                    <Typography 
                      variant="caption" 
                      noWrap
                      sx={{
                        color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary'
                      }}
                    >
                      {namespaces.length === 1 
                        ? `Namespace: ${namespaces[0]}`
                        : `Namespaces: ${namespaces.length}`
                      }
                    </Typography>
                  )}
                  
                  {labelInfo && matchingWorkloads.length > 0 && (
                    <>
                      <Divider sx={{ 
                        my: 0.5,
                        borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : undefined
                      }} />
                      <Typography 
                        variant="caption" 
                        sx={{
                          color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary'
                        }}
                      >
                        {matchingWorkloads.length <= 2 
                          ? matchingWorkloads.map(w => `${w.name} (${w.kind})`).join(', ')
                          : `${matchingWorkloads.slice(0, 2).map(w => w.name).join(', ')} +${matchingWorkloads.length - 2} more`
                        }
                      </Typography>
                    </>
                  )}
                </Paper>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default CanvasItems;
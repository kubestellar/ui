import React, { useMemo, useEffect,  useState, useCallback } from 'react';
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
import { BindingPolicyInfo, ManagedCluster, Workload } from '../../types/bindingPolicy';
import KubernetesIcon from './KubernetesIcon';
import ConnectionIcon from './ConnectionIcon.tsx';

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
  
  if (labelId === "label-location-group-edge") {
    console.log(`CanvasItems: Found known label "location-group-edge", returning key="location-group", value="edge"`);
    return { key: "location-group", value: "edge" };
  }

  const slashMatch = labelPart.match(/^(.+\/.+?)-(.+)$/);
  if (slashMatch) {
    const [, key, value] = slashMatch;
    console.log(`CanvasItems: Found label with slash in key: key="${key}", value="${value}"`);
    return { key, value };
  }
  
  if (labelPart.includes('=')) {
    const [key, value] = labelPart.split('=');
    console.log(`CanvasItems: Found equals format "${key}=${value}"`);
    return { key, value };
  }
  
  if (labelPart.includes(':')) {
    const [key, value] = labelPart.split(':');
    console.log(`CanvasItems: Found colon format "${key}:${value}"`);
    return { key, value };
  }
  
  const knownLabelPatterns = [
    { pattern: 'location-group-edge', key: 'location-group', value: 'edge' },
    { pattern: 'cluster.open-cluster-management.io/clusterset-default', key: 'cluster.open-cluster-management.io/clusterset', value: 'default' },
    { pattern: 'feature.open-cluster-management.io/addon-addon-status-available', key: 'feature.open-cluster-management.io/addon-addon-status', value: 'available' }
  ];
  
  for (const pattern of knownLabelPatterns) {
    if (labelPart === pattern.pattern) {
      console.log(`CanvasItems: Matched known pattern "${pattern.pattern}", returning key="${pattern.key}", value="${pattern.value}"`);
      return { key: pattern.key, value: pattern.value };
    }
  }
  
  const knownKeyPrefixes = ["app.kubernetes.io", "kubernetes.io", "location-group", "feature.open-cluster-management.io", "cluster.open-cluster-management.io"];
  
  for (const prefix of knownKeyPrefixes) {
    if (labelPart.startsWith(`${prefix}-`)) {
      const key = prefix;
      const value = labelPart.substring(prefix.length + 1);
      console.log(`CanvasItems: Found known prefix "${prefix}", parsed as key="${key}", value="${value}"`);
      return { key, value };
    }
  }
  
  if (labelPart.startsWith('name-')) {
    const value = labelPart.substring(5); 
    console.log(`CanvasItems: Found name label, returning key="name", value="${value}"`);
    return { key: 'name', value };
  }
  
  const firstDashIndex = labelPart.indexOf('-');
  if (firstDashIndex === -1) {
    console.log(`CanvasItems: No dash found in "${labelPart}", can't parse`);
    return null;
  }
  
  const key = labelPart.substring(0, firstDashIndex);
  const value = labelPart.substring(firstDashIndex + 1);
  
  console.log(`CanvasItems: Parsed using first dash: key="${key}", value="${value}"`);
  return { key, value };
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
        ? '0 0 0 3px rgba(156, 39, 176, 0.5)' 
        : isItemConnected 
          ? '0 0 0 2px rgba(33, 150, 243, 0.3)' 
          : 'none',
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
                      <KubernetesIcon type="policy" size={20} sx={{ mr: 1 }} />
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
                          <ConnectionIcon size={20} />
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
                      <KubernetesIcon type="cluster" size={20} sx={{ mr: 1 }} />
                      <Typography variant="subtitle2" noWrap>
                        {labelInfo ? `${labelInfo.key}` : clusterId}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {hasConnections && (
                        <Badge 
                          badgeContent={connectionCounts.clusters[clusterId]} 
                          color="primary" 
                          sx={{ mr: 1 }}
                        >
                          <ConnectionIcon size={20} />
                        </Badge>
                      )}
                      
                      {labelInfo && matchingClusters.length > 1 && (
                        <Badge 
                          badgeContent={matchingClusters.length} 
                          color="info" 
                          sx={{ mr: 1 }}
                        >
                          <KubernetesIcon type="cluster" size={16} />
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
                      <Divider sx={{ my: 0.5 }} />
                      <Typography variant="caption" color="text.secondary">
                        Clusters: {matchingClusters.length <= 2 
                          ? matchingClusters.map(c => c.name).join(', ')
                          : `${matchingClusters.slice(0, 2).map(c => c.name).join(', ')} +${matchingClusters.length - 2} more`
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
                      {getWorkloadIcon()}
                      <Typography variant="subtitle2" sx={{ ml: 1 }} noWrap>
                        {labelInfo ? `${labelInfo.key}` : workloadId}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {hasConnections && (
                        <Badge 
                          badgeContent={connectionCounts.workloads[workloadId]} 
                          color="primary" 
                          sx={{ mr: 1 }}
                        >
                          <ConnectionIcon size={20} />
                        </Badge>
                      )}
                      
                      {labelInfo && matchingWorkloads.length > 1 && (
                        <Badge 
                          badgeContent={matchingWorkloads.length} 
                          color="success" 
                          sx={{ mr: 1 }}
                        >
                          <KubernetesIcon type="workload" size={16} />
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
                  
                  {namespaces.length > 0 && (
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {namespaces.length === 1 
                        ? `Namespace: ${namespaces[0]}`
                        : `Namespaces: ${namespaces.length}`
                      }
                    </Typography>
                  )}
                  
                  {labelInfo && matchingWorkloads.length > 0 && (
                    <>
                      <Divider sx={{ my: 0.5 }} />
                      <Typography variant="caption" color="text.secondary">
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
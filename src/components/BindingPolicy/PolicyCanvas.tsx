import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Box,
  Typography,
  Paper,
  Tooltip,
  Button,
  alpha,
  useTheme,
  CircularProgress,
  Divider,
  Chip,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import InfoIcon from '@mui/icons-material/Info';
import AddLinkIcon from '@mui/icons-material/AddLink';
import KubernetesIcon from './KubernetesIcon';
import { usePolicyDragDropStore } from '../../stores/policyDragDropStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { BindingPolicyInfo, ManagedCluster, Workload } from '../../types/bindingPolicy';
import StrictModeDroppable from './StrictModeDroppable';
import CanvasItems from './CanvasItems';
import ItemTooltip from './ItemTooltip';

interface PolicyCanvasProps {
  policies: BindingPolicyInfo[];
  clusters: ManagedCluster[];
  workloads: Workload[];
  loading?: boolean;
  canvasEntities?: {
    clusters: string[];
    workloads: string[];
    policies: string[];
  };
  assignmentMap?: Record<string, { clusters: string[]; workloads: string[] }>;
  getItemLabels?: (itemType: 'cluster' | 'workload', itemId: string) => Record<string, string>;
  removeFromCanvas?: (itemType: 'policy' | 'cluster' | 'workload', itemId: string) => void;
  onClearCanvas?: () => void;
  onSaveBindingPolicies?: () => void;
  onCreateBindingPolicy?: (clusterId: string, workloadId: string) => void;
  onConnectionSelect?: (
    sourceType: string, 
    sourceIds: string[], 
    sourceName: string, 
    targetType: string, 
    targetIds: string[], 
    targetName: string
  ) => void;
  onConnectionComplete?: (workloadIds: string[], clusterIds: string[]) => void;
  dialogMode?: boolean;
}

const PolicyCanvas: React.FC<PolicyCanvasProps> = ({
  policies,
  clusters,
  workloads,
  loading = false,
  getItemLabels = () => ({}),
  onConnectionComplete,
  dialogMode
}) => {
  const theme = useTheme();
  const [canvasMode] = useState<'view' | 'connect'>('view');
  const [, setIsHovered] = useState<string | null>(null);
  
  // Connection drawing state
  const [activeConnection, setActiveConnection] = useState<{
    source: string | null;
    sourceType: 'cluster' | 'workload' | null;
    mouseX: number;
    mouseY: number;
  }>({
    source: null,
    sourceType: null,
    mouseX: 0,
    mouseY: 0
  });

  // Hover state for tooltips
  const [hoveredItem, setHoveredItem] = useState<{
    itemType: 'cluster' | 'workload' | 'policy' | null;
    itemId: string | null;
    position: { x: number; y: number } | null;
  }>({ itemType: null, itemId: null, position: null });

 
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<Record<string, HTMLElement>>({});

  const handleMouseMove = (e: React.MouseEvent) => {
    if (canvasRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      if (activeConnection.source && canvasMode === 'connect') {
        setActiveConnection({
          ...activeConnection,
          mouseX: x,
          mouseY: y
        });
      }
    }
  };

  const handleItemHover = (
    itemType: 'policy' | 'cluster' | 'workload' | null, 
    itemId: string | null
  ) => {
    if (itemType && itemId) {
      setIsHovered(`${itemType}-${itemId}`);
    } else {
      setIsHovered(null);
    }
    if (!itemId || !itemType) {
      setHoveredItem({ itemType: null, itemId: null, position: null });
      return;
    }
    
    setHoveredItem({
      itemType,
      itemId,
      position: null
    });
  };


  
  const isMounted = useRef<boolean>(true);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevConnectionLinesRef = useRef<typeof connectionLines>([]);
  

  const gridSize = 20; 
  
  const { 
    canvasEntities: policyCanvasEntities, 
    assignmentMap: policyAssignmentMap, 
    removeFromCanvas: removeFromPolicyCanvas, 
    clearCanvas,
  } = usePolicyDragDropStore();
  
  const {
    connectionLines,
    setConnectionLines,
    drawingActive,
  } = useCanvasStore();
  
  const throttledUpdateConnectionLines = useCallback((newLines: typeof connectionLines) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      if (isMounted.current) {
        setConnectionLines(newLines);
      }
    }, 100); 
  }, [setConnectionLines]);
  
  const [, setInvalidConnectionWarning] = useState<string | null>(null);
  const drawConnection = useCallback((
    ctx: CanvasRenderingContext2D, 
    startX: number, 
    startY: number, 
    endX: number, 
    endY: number, 
    color: string,
    isDashed: boolean = false
  ) => {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    const controlX = (startX + endX) / 2;
    
    // Create a bezier curve
    ctx.bezierCurveTo(
      controlX, startY,
      controlX, endY,
      endX, endY
    );
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    if (isDashed) {
      ctx.setLineDash([5, 3]);
    } else {
      ctx.setLineDash([]);
    }
    
    ctx.stroke();
    
    if (!isDashed) {
      const angle = Math.atan2(endY - ((startY + endY) / 2), endX - controlX);
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - 10 * Math.cos(angle - Math.PI / 6),
        endY - 10 * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        endX - 10 * Math.cos(angle + Math.PI / 6),
        endY - 10 * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !drawingActive || !isMounted.current) return;
    
    // Create the rendering function in a stable way
    const renderConnections = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const newConnectionLines: { source: string; target: string; color: string }[] = [];
      
      // Draw connections for each policy in the canvas
      policyCanvasEntities.policies.forEach(policyName => {
        const policy = policies.find(p => p.name === policyName);
        if (!policy) return;
        
        const policyElement = elementsRef.current[`policy-${policyName}`];
        if (!policyElement) return;
        
        const policyRect = policyElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Draw connections to clusters
        policyCanvasEntities.clusters.forEach(clusterName => {
          if (policyAssignmentMap[policyName]?.clusters.includes(clusterName)) {
            const clusterElement = elementsRef.current[`cluster-${clusterName}`];
            if (!clusterElement) return;
            
            const clusterRect = clusterElement.getBoundingClientRect();
            
            // Calculate positions relative to canvas
            const startX = policyRect.left - containerRect.left + policyRect.width;
            const startY = policyRect.top - containerRect.top + policyRect.height / 2;
            const endX = clusterRect.left - containerRect.left;
            const endY = clusterRect.top - containerRect.top + clusterRect.height / 2;
            
            // Add to connections store
            newConnectionLines.push({
              source: `policy-${policyName}`,
              target: `cluster-${clusterName}`,
              color: '#2196f3'
            });
            
            drawConnection(ctx, startX, startY, endX, endY, '#2196f3');
          }
        });
        
        // Draw connections to workloads
        policyCanvasEntities.workloads.forEach(workloadName => {
          if (policyAssignmentMap[policyName]?.workloads.some(w => w.includes(workloadName))) {
            const workloadElement = elementsRef.current[`workload-${workloadName}`];
            if (!workloadElement) return;
            
            const workloadRect = workloadElement.getBoundingClientRect();
            
            // Calculate positions relative to canvas
            const startX = policyRect.left - containerRect.left + policyRect.width;
            const startY = policyRect.top - containerRect.top + policyRect.height / 2;
            const endX = workloadRect.left - containerRect.left;
            const endY = workloadRect.top - containerRect.top + workloadRect.height / 2;
            
            // Add to connections store
            newConnectionLines.push({
              source: `policy-${policyName}`,
              target: `workload-${workloadName}`,
              color: '#4caf50'
            });
            
            drawConnection(ctx, startX, startY, endX, endY, '#4caf50');
          }
        });
      });
      
      // Draw workload to cluster connections (Binding Policies)
      policyCanvasEntities.workloads.forEach(workloadName => {
        policyCanvasEntities.clusters.forEach(clusterName => {
          // Check if a connection exists between this workload and cluster
          const connection = connectionLines.find(
            conn => 
              (conn.source === `workload-${workloadName}` && conn.target === `cluster-${clusterName}`) ||
              (conn.source === `cluster-${clusterName}` && conn.target === `workload-${workloadName}`)
          );
          
          if (connection) {
            const workloadElement = elementsRef.current[`workload-${workloadName}`];
            const clusterElement = elementsRef.current[`cluster-${clusterName}`];
            
            if (workloadElement && clusterElement) {
              const workloadRect = workloadElement.getBoundingClientRect();
              const clusterRect = clusterElement.getBoundingClientRect();
              const containerRect = container.getBoundingClientRect();
              
              // Calculate positions relative to canvas
              const startX = workloadRect.left - containerRect.left;
              const startY = workloadRect.top - containerRect.top + workloadRect.height / 2;
              const endX = clusterRect.left - containerRect.left + clusterRect.width;
              const endY = clusterRect.top - containerRect.top + clusterRect.height / 2;
              
              // Add to connections store if not already there
              newConnectionLines.push({
                source: `workload-${workloadName}`,
                target: `cluster-${clusterName}`,
                color: '#9c27b0' // Purple for binding policies
              });
              
              drawConnection(ctx, startX, startY, endX, endY, '#9c27b0');
            }
          }
        });
      });
      
      // Draw active connection if in connection mode
      if (activeConnection.source && activeConnection.sourceType) {
        const sourceElement = elementsRef.current[activeConnection.source];
        
        if (sourceElement) {
          const sourceRect = sourceElement.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          
          // Calculate start position
          const startX = activeConnection.sourceType === 'workload'
            ? sourceRect.left - containerRect.left
            : sourceRect.left - containerRect.left + sourceRect.width;
            
          const startY = sourceRect.top - containerRect.top + sourceRect.height / 2;
          
          // Draw to mouse position
          const endX = activeConnection.mouseX - containerRect.left;
          const endY = activeConnection.mouseY - containerRect.top;
          
          // Only draw if mouse coordinates are valid (not during drag)
          if (endX > 0 && endY > 0 && endX < canvas.width && endY < canvas.height) {
            drawConnection(ctx, startX, startY, endX, endY, '#9c27b0', true);
          }
        }
      }
      
      // We need a more thorough check to see if connections have changed
      // without creating an infinite loop
      let shouldUpdate = false;
      
      // Quick length check first
      if (newConnectionLines.length !== prevConnectionLinesRef.current.length) {
        shouldUpdate = true;
      } else {
        // Do a more thorough check using a stable sorting
        const sortConnections = (lines: typeof connectionLines) => {
          return [...lines].sort((a, b) => {
            if (a.source !== b.source) return a.source < b.source ? -1 : 1;
            if (a.target !== b.target) return a.target < b.target ? -1 : 1;
            return 0;
          });
        };
        
        const sortedNew = sortConnections(newConnectionLines);
        const sortedOld = sortConnections(prevConnectionLinesRef.current);
        
        // Compare sorted arrays
        for (let i = 0; i < sortedNew.length; i++) {
          const newConn = sortedNew[i];
          const oldConn = sortedOld[i];
          
          if (!oldConn || 
              newConn.source !== oldConn.source || 
              newConn.target !== oldConn.target || 
              newConn.color !== oldConn.color) {
            shouldUpdate = true;
            break;
          }
        }
      }
      
      // Only update if necessary
      if (shouldUpdate) {
        throttledUpdateConnectionLines(newConnectionLines);
        // Update our ref to the latest connection lines
        prevConnectionLinesRef.current = [...newConnectionLines];
      }
    };
    
    // Call rendering immediately
    renderConnections();
    
    // Cleanup
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [
    policyCanvasEntities,
    policyAssignmentMap, 
    policies, 
    clusters, 
    workloads, 
    drawingActive, 
    connectionLines,
    throttledUpdateConnectionLines,
    // Drawing function
    drawConnection,
    activeConnection.mouseX,
    activeConnection.mouseY,
    activeConnection.source,
    activeConnection.sourceType,
  ]);

  // Set isMounted to false when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Handle canvas item clicks for connection mode
  const handleCanvasItemClick = useCallback((
    itemType: 'policy' | 'cluster' | 'workload', 
    itemId: string  
  ) => {
    console.log(`⭐ Canvas item clicked: ${itemType}-${itemId}`);
    
    // Skip if clicked on policy - we only connect clusters and workloads
    if (itemType === 'policy') {
      console.log('⭐ Clicked on policy - ignoring in connection mode');
      return;
    }
    
    console.log(`🔄 Canvas item clicked: ${itemType}-${itemId}, activeConnection:`, activeConnection);
    
    if (!activeConnection.source) {
      // Start a new connection
      console.log(`⭐ Starting new connection from ${itemType}-${itemId}`);
      
      setActiveConnection({
        source: `${itemType}-${itemId}`,
        sourceType: itemType,
        mouseX: 0,
        mouseY: 0
      });
      
      console.log(`✅ Connection started from ${itemType}-${itemId}`);
      // Clear any previous warning
      setInvalidConnectionWarning(null);
    } else {
      // Complete an existing connection
      const sourceType = activeConnection.sourceType;
      // Fix: Don't split the ID as it may contain hyphens
      // Instead, extract everything after the first hyphen
      const sourceId = activeConnection.source?.replace(`${sourceType}-`, '') || '';
      
      console.log(`⭐ Completing connection: ${sourceType}-${sourceId} → ${itemType}-${itemId}`);
      
      // Only allow workload → cluster or cluster → workload connections
      if (
        (sourceType === 'workload' && itemType === 'cluster') ||
        (sourceType === 'cluster' && itemType === 'workload')
      ) {
        // Determine cluster and workload IDs based on the order of selection
        let clusterId: string, workloadId: string;
        
        if (sourceType === 'cluster') {
          clusterId = sourceId;
          workloadId = itemId;
        } else {
          // sourceType is 'workload'
          workloadId = sourceId;
          clusterId = itemId;
        }
        
        console.log(`✅ Connection completed between workload ${workloadId} and cluster ${clusterId}`);
        
        // Call onConnectionComplete if provided
        if (onConnectionComplete) {
          console.log(`🔄 Calling onConnectionComplete(${workloadId}, ${clusterId})`);
          onConnectionComplete([workloadId], [clusterId]);
        } else {
          console.error('❌ onConnectionComplete callback is not defined!');
        }
        
        // Reset active connection
        setActiveConnection({
          source: null,
          sourceType: null,
          mouseX: 0,
          mouseY: 0
        });
      } else {
        // Invalid connection type
        console.warn(`❌ Invalid connection: ${sourceType} → ${itemType}`);
        setInvalidConnectionWarning(`Cannot connect ${sourceType} to ${itemType}. Please connect a workload to a cluster.`);
        
        // Do not reset active connection - let the user try again
      }
    }
  }, [activeConnection, setActiveConnection, setInvalidConnectionWarning, onConnectionComplete]);

  // Update canvas when window is resized
  useEffect(() => {
    const handleResize = () => {
      // Force a redraw of connections by triggering the effect
      //const forceUpdate = Date.now();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper to determine if canvas has items
  const isCanvasEmpty = 
    policyCanvasEntities.policies.length === 0 && 
    policyCanvasEntities.clusters.length === 0 && 
    policyCanvasEntities.workloads.length === 0;

  
  // Helper function to extract label information from a label ID
  const extractLabelInfo = (labelId: string): { key: string, value: string } | null => {
    if (!labelId.startsWith('label-')) return null;
    
    const labelPart = labelId.substring(6);
    
    if (labelId === 'label-location-group:edge') {
      return { key: 'location-group', value: 'edge' };
    }
    
    if (labelPart.includes(':')) {
      const colonIndex = labelPart.indexOf(':');
      const key = labelPart.substring(0, colonIndex);
      const value = labelPart.substring(colonIndex + 1);
      return { key, value };
    }
    
    if (labelPart.includes('=')) {
      const equalsIndex = labelPart.indexOf('=');
      const key = labelPart.substring(0, equalsIndex);
      const value = labelPart.substring(equalsIndex + 1);
      return { key, value };
    }
    
    
    const lastDashIndex = labelPart.lastIndexOf('-');
    if (lastDashIndex !== -1 && lastDashIndex > 0) {
      const key = labelPart.substring(0, lastDashIndex);
      const value = labelPart.substring(lastDashIndex + 1);
      return { key, value };
    }
    
    const parts = labelId.split('-');
    if (parts.length >= 3) {
      const key = parts[1];
      const value = parts.slice(2).join('-');
      return { key, value };
    }
    
    return null;
  };

  // Find all workloads that match a given label
  const getWorkloadsForLabel = (workloads: Workload[], key: string, value: string): Workload[] => {
    return workloads.filter(workload => 
      workload.labels && workload.labels[key] === value
    );
  };

  // Find all clusters that match a given label
  const getClustersForLabel = (clusters: ManagedCluster[], key: string, value: string): ManagedCluster[] => {
    return clusters.filter(cluster => 
      cluster.labels && cluster.labels[key] === value
    );
  };

  // Function to get tooltip content based on hovered item
  const getTooltipContent = () => {
    if (!hoveredItem.itemType || !hoveredItem.itemId) {
      return null;
    }

    const { itemType, itemId } = hoveredItem;
    
    if (itemType === 'cluster') {
      // Check if this is a label-based item
      const labelInfo = extractLabelInfo(itemId);
      
      if (labelInfo) {
        // For label-based cluster items
        const matchingClusters = getClustersForLabel(clusters, labelInfo.key, labelInfo.value);
        
        const clusterInfo = matchingClusters.length > 0 ? 
          `Matching ${matchingClusters.length} cluster(s)` :
          'No matching clusters (will create synthetic cluster)';
        
        return (
          <ItemTooltip 
            title={`${labelInfo.key}: ${labelInfo.value}`}
            subtitle={clusterInfo}
            labels={{ [labelInfo.key]: labelInfo.value }}
            description={`Label selector for Kubernetes clusters`}
            type="cluster"
          />
        );
      } else {
        // For legacy cluster items
        const cluster = clusters.find(c => c.name === itemId);
        if (!cluster) return null;
        
        return (
          <ItemTooltip 
            title={cluster.name}
            subtitle={`Status: ${cluster.status || 'Ready'}`}
            labels={cluster.labels}
            description={cluster.description || 'Kubernetes cluster'}
            type="cluster"
          />
        );
      }
    } else if (itemType === 'workload') {
      // Check if this is a label-based item
      const labelInfo = extractLabelInfo(itemId);
      
      if (labelInfo) {
        // For label-based workload items
        const matchingWorkloads = getWorkloadsForLabel(workloads, labelInfo.key, labelInfo.value);
        
        // Determine resource type for API group labels
        let resourceDescription = 'Label selector for Kubernetes workloads';
        let resourceType = 'workload';
        
        if (labelInfo.value.includes('.')) {
          resourceDescription = `CustomResourceDefinition (${labelInfo.value})`;
          resourceType = 'CustomResourceDefinition';
        } else if (labelInfo.key === 'app.kubernetes.io/part-of') {
          resourceDescription = `${labelInfo.value} resource`;
          resourceType = labelInfo.value;
        }
        
        const workloadInfo = matchingWorkloads.length > 0 ? 
          `Matching ${matchingWorkloads.length} workload(s)` :
          `No matching workloads (will create synthetic ${resourceType})`;
        
        return (
          <ItemTooltip 
            title={`${labelInfo.key}: ${labelInfo.value}`}
            subtitle={workloadInfo}
            labels={{ [labelInfo.key]: labelInfo.value }}
            description={resourceDescription}
            type="workload"
          />
        );
      } else {
        // For legacy workload items
        const workload = workloads.find(w => w.name === itemId);
        if (!workload) return null;
        
        return (
          <ItemTooltip 
            title={workload.name}
            subtitle={`${workload.namespace}/${workload.kind}`}
            labels={getItemLabels('workload', itemId)}
            description={`${workload.kind} workload`}
            type="workload"
          />
        );
      }
    } else if (itemType === 'policy') {
      const policy = policies.find(p => p.name === itemId);
      if (!policy) return null;
      
      return (
        <ItemTooltip 
          title={policy.name}
          subtitle={`Status: ${policy.status}`}
          labels={{}}
          description={policy.description || `Binding policy (${policy.bindingMode})`}
          type="policy"
        />
      );
    }
    
    return null;
  };

  // Draw grid background for the canvas
  const renderGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    ctx.strokeStyle = theme.palette.mode === 'dark' 
      ? alpha(theme.palette.grey[700], 0.3)
      : alpha(theme.palette.grey[300], 0.5);
    ctx.lineWidth = 1;
    
    // Draw vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    ctx.restore();
  }, [theme, gridSize]);
  
  // Update canvas grid when relevant props change
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions to match container
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    renderGrid(ctx, canvas.width, canvas.height);
    
  }, [renderGrid, theme]);

  // Add a function to handle clicks globally on the canvas that can identify targets
  // Add this after the handleMouseMove function

  // Handle global canvas click to detect clicks on items and their children
  const handleCanvasGlobalClick = useCallback((e: React.MouseEvent) => {
    // Check if we have an active connection in progress
    if (activeConnection.source) {
      console.log('⭐ Global canvas click with active connection:', e.target);
    }

    // Traverse up from the target to find the closest element with data-item attributes
    let target = e.target as HTMLElement;
    let itemType: string | null = null;
    let itemId: string | null = null;
    
    // Traverse up the DOM tree to find a parent with item data attributes
    while (target && !itemType && !itemId) {
      itemType = target.getAttribute('data-item-type');
      itemId = target.getAttribute('data-item-id');
      
      if (itemType && itemId) {
        console.log(`🎯 Found item in click path: ${itemType}-${itemId}`);
        // Process the click as a canvas item click
        handleCanvasItemClick(itemType as 'policy' | 'cluster' | 'workload', itemId);
        return;
      }
      
      // Move up to parent element
      if (target.parentElement) {
        target = target.parentElement;
      } else {
        break;
      }
    }
  }, [activeConnection.source, handleCanvasItemClick]);

  // Handle drag start to clear active connection state
  const handleDragStart = () => {
    // Clear any active connection when starting to drag
    if (activeConnection.source) {
      setActiveConnection({
        source: null,
        sourceType: null,
        mouseX: 0,
        mouseY: 0
      });
    }
  };

  // Function to render empty canvas state
  const renderEmptyState = () => {
    const noWorkloadsOrClusters = clusters.length === 0 || workloads.length === 0;
    
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'text.secondary',
          p: 3,
          textAlign: 'center',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1
        }}
      >
        {noWorkloadsOrClusters ? (
          <>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              {clusters.length === 0 && workloads.length === 0 
                ? "No clusters and workloads available"
                : clusters.length === 0 
                  ? "No clusters available" 
                  : "No workloads available"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please ensure you have access to clusters and workloads.
            </Typography>
          </>
        ) : (
          <>
            <AddIcon sx={{ fontSize: 40, mb: 2, opacity: 0.5 }} />
            <Typography variant="body1" color="text.secondary" sx={{ opacity: 0.7 }}>
            Click on clusters and workloads to add them here
            </Typography>
          </>
        )}
      </Box>
    );
  };

  // Helper function to check if a label belongs to a namespace
  const isNamespaceLabel = (labelInfo: { key: string; value: string }): boolean => {
    if (!labelInfo) return false;
    
    // Standard Kubernetes namespace identifiers
    const namespacePatterns = [
      { key: 'kubernetes.io/metadata.name', valuePattern: null },
      { key: 'name', valuePattern: /namespace/ },
      { key: 'k8s-namespace', valuePattern: null },
      { key: 'type', valuePattern: /^namespace$/i },
      { keyPattern: /namespace/i, valuePattern: null }
    ];
    
    // Check against all patterns
    return namespacePatterns.some(pattern => {
      if (pattern.key && labelInfo.key !== pattern.key) {
        return false;
      }
      
      if (pattern.keyPattern && !pattern.keyPattern.test(labelInfo.key)) {
        return false;
      }
      
      if (pattern.valuePattern && !pattern.valuePattern.test(labelInfo.value)) {
        return false;
      }
      
      return true;
    });
  };

  const renderNamespaceItem = (itemId: string, labelInfo: { key: string; value: string }) => {
    return (
      <Paper
        key={`workload-section-${itemId}`}
        elevation={2}
        ref={(el) => {
          if (el) elementsRef.current[`workload-${itemId}`] = el;
        }}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 1.5,
          mb: 1,
          minHeight: '90px',
          height: '100%',
          borderLeft: '4px solid',
          borderColor: theme.palette.info.main,
          backgroundColor: alpha(theme.palette.info.main, 0.1),
          transition: 'all 0.2s',
          cursor: 'pointer',
          position: 'relative',
          '&:hover': { 
            transform: 'translateY(-2px)', 
            boxShadow: 3 
          },
          '&:hover .delete-button': { 
            opacity: 1,
          }
        }}
        data-item-type="workload"
        data-item-id={itemId}
        onClick={(e) => {
          e.stopPropagation();
          handleCanvasItemClick('workload', itemId);
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <KubernetesIcon type="namespace" size={16} sx={{ mr: 1 }} />
          <Typography variant="body2" component="div" sx={{ 
            fontWeight: 'medium',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            Namespace: {labelInfo.value}
          </Typography>
        </Box>
        
        <Box sx={{ mb: 1 }}>
          <Chip 
            label={`${labelInfo.key}: ${labelInfo.value}`}
            size="small"
            variant="outlined"
            color="info"
            sx={{ 
              fontSize: '0.75rem',
              maxWidth: '100%',
              '& .MuiChip-label': { 
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }
            }}
          />
        </Box>
        
        <Typography variant="caption" color="text.secondary">
          Namespace selector
        </Typography>
        
        <IconButton
          size="small"
          className="delete-button"
          onClick={(e) => {
            e.stopPropagation();
            removeFromPolicyCanvas('workload', itemId);
          }}
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            opacity: 0,
            transition: 'opacity 0.2s',
            bgcolor: alpha(theme.palette.error.main, 0.1),
            color: theme.palette.error.main,
            p: '2px',
            '&:hover': {
              bgcolor: alpha(theme.palette.error.main, 0.2),
            }
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Paper>
    );
  };

  return (
    <Paper
      ref={containerRef}
      sx={{
        p: { xs: 1, sm: 2 }, 
        height: '100%', 
        minHeight: { xs: 400, sm: 500 },
        maxHeight: dialogMode ? '65vh' : '90vh', 
        position: 'relative',
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: alpha(theme.palette.background.paper, 0.95),
        zIndex: 1,
        boxShadow: 1,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column', 
        overflow: 'hidden' 
      }}
      onMouseMove={handleMouseMove}
      onClick={handleCanvasGlobalClick}
      onDragStart={handleDragStart}
    >
      <Box sx={{ 
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 10
      }}>
        <Tooltip 
          title={
            <Box>
              <Typography variant="body2" fontWeight="bold">Binding Policy Canvas</Typography>
              <Typography variant="body2">Drag, cluster labels, and workload labels here to visualize binding relationships</Typography>
            </Box>
          }
          arrow
        >
          <InfoIcon color="info" sx={{ fontSize: 20, opacity: 0.7, cursor: 'pointer', '&:hover': { opacity: 1 } }} />
        </Tooltip>
      </Box>
      
      {/* Canvas Tools */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        mb: 2,
        position: 'relative',
        zIndex: 3,
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
        gap: 1
      }}>
        {/* Grid toggle buttons removed */}
        
        {/* Item count indicators */}
        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          flexWrap: 'wrap',
          justifyContent: 'flex-start',
          width: '100%'
        }}>
          {policyCanvasEntities?.clusters && policyCanvasEntities.clusters.length > 0 && (
            <Chip 
              icon={<KubernetesIcon type="cluster" size={16} />} 
              label={`${policyCanvasEntities.clusters.length} Clusters`} 
              size="small" 
              color="primary" 
              variant="outlined" 
            />
          )}
          {policyCanvasEntities?.workloads && policyCanvasEntities.workloads.length > 0 && (
            <Chip 
              icon={<KubernetesIcon type="workload" size={16} />} 
              label={`${policyCanvasEntities.workloads.length} Workloads`} 
              size="small" 
              color="secondary" 
              variant="outlined" 
            />
          )}
          {connectionLines.length > 0 && (
            <Chip 
              icon={<AddLinkIcon sx={{ fontSize: 16 }} />} 
              label={`${connectionLines.length} Connections`} 
              size="small" 
              color="default" 
              variant="outlined" 
            />
          )}
        </Box>
      </Box>
      
 
      
      <StrictModeDroppable droppableId="canvas" type="CLUSTER_OR_WORKLOAD">
        {(provided, snapshot) => (
          <Box
            {...provided.droppableProps}
            ref={provided.innerRef}
            data-rbd-droppable-id="canvas"
            data-rfd-droppable-context-id={provided.droppableProps['data-rfd-droppable-context-id']}
            onClick={handleCanvasGlobalClick}
            onDragOver={(e) => {
              // Reset active connection during drag operations
              if (activeConnection.source) {
                setActiveConnection({
                  source: null,
                  sourceType: null,
                  mouseX: 0,
                  mouseY: 0
                });
              }
              // Still need to prevent default for the drop to work
              e.preventDefault();
            }}
            sx={{
              flex: 1, 
              minHeight: { xs: 200, sm: 300 }, 
              backgroundColor: snapshot.isDraggingOver 
                ? alpha(theme.palette.primary.main, 0.05) 
                : alpha(theme.palette.background.default, 0.3),
              border: '2px dashed',
              borderColor: snapshot.isDraggingOver 
                ? (snapshot.draggingFromThisWith?.startsWith('cluster-') 
                  ? alpha(theme.palette.info.main, 0.7) 
                  : snapshot.draggingFromThisWith?.startsWith('workload-') 
                    ? alpha(theme.palette.success.main, 0.7)
                    : 'primary.main')
                : alpha(theme.palette.divider, 0.9),
              borderWidth: '3px',
              borderRadius: 2,
              transition: 'all 0.2s',
              p: { xs: 1, sm: 2, md: 3 }, 
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)',
              overflow: 'auto' 
            }}
          >
            {/* Canvas for drawing connections and grid */}
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 1
              }}
            />
            
            {/* Empty state */}
            {isCanvasEmpty && !snapshot.isDraggingOver && (
              renderEmptyState()
            )}
            
            {/* Canvas Content with Clear Sections */}
            {!isCanvasEmpty && (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100%', 
                zIndex: 2,
                minHeight: 0 // Important for flex child
              }}>
                {/* Canvas Sections Header */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  mb: 2,
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 1, sm: 0 }
                }}>
                  <Typography variant="subtitle2" sx={{ 
                    color: 'text.secondary',
                    fontWeight: 'medium',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    Clusters on Canvas:
                  </Typography>
                  <Typography variant="subtitle2" sx={{ 
                    color: 'text.secondary',
                    fontWeight: 'medium',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    Workloads on Canvas:
                  </Typography>
                </Box>
                
                {/* Main Canvas Layout */}
                <Box sx={{ 
                  display: 'flex', 
                  flexGrow: 1, 
                  height: 'calc(100% - 40px)',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 2,
                  minHeight: 0 // Important for flex child
                }}>
                  {/* Clusters Section */}
                  <Box sx={{ 
                    width: { xs: '100%', sm: '48%' }, 
                    mr: { xs: 0, sm: 1 },
                    p: 1, 
                    border: '1px dashed', 
                    borderColor: alpha(theme.palette.info.main, 0.4),
                    borderRadius: 1,
                    backgroundColor: alpha(theme.palette.info.main, 0.05),
                    boxShadow: 'inset 0 0 5px rgba(25, 118, 210, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    height: { xs: '250px', sm: '400px' }, 
                    flex: 'none',
                    overflow: 'hidden'
                  }}>
                    <Box sx={{ 
                      flexGrow: 1, 
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      pb: 1,
                      pr: 1
                    }}>
                      {policyCanvasEntities.clusters.length > 0 ? (
                        <Box sx={{ 
                          display: 'grid', 
                          gridTemplateColumns: {
                            xs: 'repeat(auto-fill, minmax(120px, 1fr))',
                            sm: 'repeat(auto-fill, minmax(150px, 1fr))'
                          },
                          gap: 1.5,
                          pt: 0.5
                        }}>
                          {/* Display clusters here with individual styling */}
                          {policyCanvasEntities.clusters
                            .map((clusterId) => {
                              console.log(`Rendering cluster item on canvas: ${clusterId}`);
                              
                              // Extract label information if this is a label-based item
                              const labelInfo = extractLabelInfo(clusterId);
                              
                              // Find matching clusters if this is a label
                              const matchingClusters = labelInfo 
                                ? getClustersForLabel(clusters, labelInfo.key, labelInfo.value) 
                                : clusters.filter(c => c.name === clusterId);
                                
                              if (matchingClusters.length === 0) {
                                console.log(`No matching clusters found for ${clusterId}, using label info directly`);
                                if (labelInfo) {
                                  return (
                                    <Paper
                                      key={`cluster-section-${clusterId}`}
                                      elevation={2}
                                      ref={(el) => {
                                        if (el) elementsRef.current[`cluster-${clusterId}`] = el;
                                      }}
                                      sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        p: 1.5,
                                        mb: 1,
                                        minHeight: '90px',
                                        height: '100%',
                                        borderLeft: '4px solid',
                                        borderColor: theme.palette.info.main,
                                        backgroundColor: alpha(theme.palette.info.main, 0.1),
                                        transition: 'all 0.2s',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        '&:hover': { 
                                          transform: 'translateY(-2px)', 
                                          boxShadow: 3 
                                        },
                                        '&:hover .delete-button': {
                                          opacity: 1,
                                        }
                                      }}
                                      data-item-type="cluster"
                                      data-item-id={clusterId}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCanvasItemClick('cluster', clusterId);
                                      }}
                                    >
                                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <KubernetesIcon type="cluster" size={16} sx={{ mr: 1 }} />
                                        <Typography variant="body2" component="div" sx={{ 
                                          fontWeight: 'medium',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap'
                                        }}>
                                          {labelInfo.key}
                                        </Typography>
                                      </Box>
                                      
                                      <Box sx={{ mb: 1 }}>
                                        <Chip 
                                          label={labelInfo.value}
                                          size="small"
                                          variant="outlined"
                                          sx={{ 
                                            fontSize: '0.75rem',
                                            maxWidth: '100%',
                                            '& .MuiChip-label': { 
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis'
                                            }
                                          }}
                                        />
                                      </Box>
                                      
                                      <Typography variant="caption" color="text.secondary">
                                        Label selector
                                      </Typography>
                                      
                                      <IconButton
                                        size="small"
                                        className="delete-button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeFromPolicyCanvas('cluster', clusterId);
                                        }}
                                        sx={{
                                          position: 'absolute',
                                          top: 4,
                                          right: 4,
                                          opacity: 0,
                                          transition: 'opacity 0.2s',
                                          bgcolor: alpha(theme.palette.error.main, 0.1),
                                          color: theme.palette.error.main,
                                          p: '2px',
                                          '&:hover': {
                                            bgcolor: alpha(theme.palette.error.main, 0.2),
                                          }
                                        }}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Paper>
                                  );
                                }
                                return null;
                              }
                              
                              return (
                                <Paper
                                  key={`cluster-section-${clusterId}`}
                                  elevation={2}
                                  ref={(el) => {
                                    if (el) elementsRef.current[`cluster-${clusterId}`] = el;
                                  }}
                                  sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    p: 1.5,
                                    mb: 1,
                                    minHeight: '90px',
                                    height: '100%',
                                    borderLeft: '4px solid',
                                    borderColor: theme.palette.info.main,
                                    backgroundColor: alpha(theme.palette.info.main, 0.1),
                                    transition: 'all 0.2s',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    '&:hover': { 
                                      transform: 'translateY(-2px)', 
                                      boxShadow: 3 
                                    },
                                    '&:hover .delete-button': {
                                      opacity: 1,
                                    }
                                  }}
                                  data-item-type="cluster"
                                  data-item-id={clusterId}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCanvasItemClick('cluster', clusterId);
                                  }}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <KubernetesIcon type="cluster" size={16} sx={{ mr: 1 }} />
                                    <Typography variant="body2" component="div" sx={{ 
                                      fontWeight: 'medium',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {labelInfo ? `${labelInfo.key}` : clusterId}
                                    </Typography>
                                  </Box>
                                  
                                  {/* For label-based items, show the value */}
                                  {labelInfo && (
                                    <Box sx={{ mb: 1 }}>
                                      <Chip 
                                        label={labelInfo.value}
                                        size="small"
                                        variant="outlined"
                                        sx={{ 
                                          fontSize: '0.75rem',
                                          maxWidth: '100%',
                                          '& .MuiChip-label': { 
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                          }
                                        }}
                                      />
                                    </Box>
                                  )}
                                  
                                  {/* Show count of matching clusters */}
                                  {labelInfo && (
                                    <Typography variant="caption" color="text.secondary">
                                      Matches: {matchingClusters.length} cluster(s)
                                    </Typography>
                                  )}
                                  
                                  {/* For individual clusters, show labels */}
                                  {!labelInfo && matchingClusters[0]?.labels && (
                                    <Box sx={{ mt: 'auto' }}>
                                      <Divider sx={{ my: 0.5 }} />
                                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                        {Object.entries(matchingClusters[0].labels).slice(0, 2).map(([key, value]) => (
                                          <Chip 
                                            key={key} 
                                            label={`${key.split('/').pop()}: ${value}`} 
                                            size="small" 
                                            sx={{ 
                                              fontSize: '0.6rem', 
                                              height: 16, 
                                              '& .MuiChip-label': { px: 0.5, py: 0 } 
                                            }} 
                                          />
                                        ))}
                                        {Object.keys(matchingClusters[0].labels).length > 2 && (
                                          <Chip 
                                            label={`+${Object.keys(matchingClusters[0].labels).length - 2}`} 
                                            size="small" 
                                            sx={{ 
                                              fontSize: '0.6rem', 
                                              height: 16, 
                                              '& .MuiChip-label': { px: 0.5, py: 0 } 
                                            }} 
                                          />
                                        )}
                                      </Box>
                                    </Box>
                                  )}
                                  <IconButton
                                    size="small"
                                    className="delete-button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeFromPolicyCanvas('cluster', clusterId);
                                    }}
                                    sx={{
                                      position: 'absolute',
                                      top: 4,
                                      right: 4,
                                      opacity: 0,
                                      transition: 'opacity 0.2s',
                                      bgcolor: alpha(theme.palette.error.main, 0.1),
                                      color: theme.palette.error.main,
                                      p: '2px',
                                      '&:hover': {
                                        bgcolor: alpha(theme.palette.error.main, 0.2),
                                      }
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Paper>
                              );
                            })}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                          Drag clusters here
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  
                  {/* Workloads Section */}
                  <Box sx={{ 
                    width: { xs: '100%', sm: '48%' }, 
                    ml: { xs: 0, sm: 1 },
                    p: 1, 
                    border: '1px dashed', 
                    borderColor: alpha(theme.palette.success.main, 0.4),
                    borderRadius: 1,
                    backgroundColor: alpha(theme.palette.success.main, 0.05),
                    boxShadow: 'inset 0 0 5px rgba(76, 175, 80, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    height: { xs: '250px', sm: '400px' }, 
                    flex: 'none',
                    overflow: 'hidden'
                  }}>
                    <Box sx={{ 
                      flexGrow: 1, 
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      pb: 1,
                      pr: 1
                    }}>
                      {policyCanvasEntities.workloads.length > 0 ? (
                        <Box sx={{ 
                          display: 'grid', 
                          gridTemplateColumns: {
                            xs: 'repeat(auto-fill, minmax(120px, 1fr))',
                            sm: 'repeat(auto-fill, minmax(150px, 1fr))'
                          },
                          gap: 1.5,
                          pt: 0.5
                        }}>
                          {/* Display workloads here with individual styling */}
                          {policyCanvasEntities.workloads
                            .map((workloadId) => {
                              console.log(`Rendering workload item on canvas: ${workloadId}`);
                              
                              // Extract label information if this is a label-based item
                              const labelInfo = extractLabelInfo(workloadId);
                              
                              // Find matching workloads if this is a label
                              const matchingWorkloads = labelInfo 
                                ? getWorkloadsForLabel(workloads, labelInfo.key, labelInfo.value) 
                                : workloads.filter(w => w.name === workloadId);
                                
                              if (matchingWorkloads.length === 0) {
                                console.log(`No matching workloads found for ${workloadId}, using label info directly`);
                                
                                if (labelInfo) {
                                  if (isNamespaceLabel(labelInfo)) {
                                    console.log(`Rendering namespace label: ${labelInfo.key}=${labelInfo.value}`);
                                    return renderNamespaceItem(workloadId, labelInfo);
                                  }
                                  
                                  return (
                                    <Paper
                                      key={`workload-section-${workloadId}`}
                                      elevation={2}
                                      ref={(el) => {
                                        if (el) elementsRef.current[`workload-${workloadId}`] = el;
                                      }}
                                      sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        p: 1.5,
                                        mb: 1,
                                        minHeight: '90px',
                                        height: '100%',
                                        borderLeft: '4px solid',
                                        borderColor: theme.palette.success.main,
                                        backgroundColor: alpha(theme.palette.success.main, 0.1),
                                        transition: 'all 0.2s',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        '&:hover': { 
                                          transform: 'translateY(-2px)', 
                                          boxShadow: 3 
                                        },
                                        '&:hover .delete-button': { 
                                          opacity: 1,
                                        }
                                      }}
                                      data-item-type="workload"
                                      data-item-id={workloadId}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCanvasItemClick('workload', workloadId);
                                      }}
                                    >
                                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <KubernetesIcon type="workload" size={16} sx={{ mr: 1 }} />
                                        <Typography variant="body2" component="div" sx={{ 
                                          fontWeight: 'medium',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap'
                                        }}>
                                          {labelInfo.key}
                                        </Typography>
                                      </Box>
                                      
                                      <Box sx={{ mb: 1 }}>
                                        <Chip 
                                          label={labelInfo.value}
                                          size="small"
                                          variant="outlined"
                                          sx={{ 
                                            fontSize: '0.75rem',
                                            maxWidth: '100%',
                                            '& .MuiChip-label': { 
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis'
                                            }
                                          }}
                                        />
                                      </Box>
                                      
                                      <Typography variant="caption" color="text.secondary">
                                        Label selector
                                      </Typography>
                                      
                                      <IconButton
                                        size="small"
                                        className="delete-button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeFromPolicyCanvas('workload', workloadId);
                                        }}
                                        sx={{
                                          position: 'absolute',
                                          top: 4,
                                          right: 4,
                                          opacity: 0,
                                          transition: 'opacity 0.2s',
                                          bgcolor: alpha(theme.palette.error.main, 0.1),
                                          color: theme.palette.error.main,
                                          p: '2px',
                                          '&:hover': {
                                            bgcolor: alpha(theme.palette.error.main, 0.2),
                                          }
                                        }}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Paper>
                                  );
                                }
                                return null;
                              }
                              
                              return (
                                <Paper
                                  key={`workload-section-${workloadId}`}
                                  elevation={2}
                                  ref={(el) => {
                                    if (el) elementsRef.current[`workload-${workloadId}`] = el;
                                  }}
                                  sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    p: 1.5,
                                    mb: 1,
                                    minHeight: '90px',
                                    height: '100%',
                                    borderLeft: '4px solid',
                                    borderColor: theme.palette.success.main,
                                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                                    transition: 'all 0.2s',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    '&:hover': { 
                                      transform: 'translateY(-2px)', 
                                      boxShadow: 3 
                                    },
                                    '&:hover .delete-button': { 
                                      opacity: 1,
                                    }
                                  }}
                                  data-item-type="workload"
                                  data-item-id={workloadId}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCanvasItemClick('workload', workloadId);
                                  }}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <KubernetesIcon type="workload" size={16} sx={{ mr: 1 }} />
                                    <Typography variant="body2" component="div" sx={{ 
                                      fontWeight: 'medium',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {labelInfo ? `${labelInfo.key}` : workloadId}
                                    </Typography>
                                  </Box>
                                  
                                  {/* For label-based items, show the value */}
                                  {labelInfo && (
                                    <Box sx={{ mb: 1 }}>
                                      <Chip 
                                        label={labelInfo.value}
                                        size="small"
                                        variant="outlined"
                                        sx={{ 
                                          fontSize: '0.75rem',
                                          maxWidth: '100%',
                                          '& .MuiChip-label': { 
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                          }
                                        }}
                                      />
                                    </Box>
                                  )}
                                  
                                  {/* Show count of matching workloads */}
                                  {labelInfo && (
                                    <Typography variant="caption" color="text.secondary">
                                      Matches: {matchingWorkloads.length} workload(s)
                                    </Typography>
                                  )}
                                  
                                  {/* For individual workloads, show details */}
                                  {!labelInfo && matchingWorkloads[0] && (
                                    <>
                                      <Typography variant="caption" color="text.secondary" sx={{ 
                                        display: 'block',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        Type: {matchingWorkloads[0]?.kind || 'Unknown'}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary" sx={{ 
                                        display: 'block',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        Namespace: {matchingWorkloads[0]?.namespace || 'default'}
                                      </Typography>
                                      {matchingWorkloads[0]?.labels && Object.keys(matchingWorkloads[0].labels).length > 0 && (
                                        <Box sx={{ mt: 'auto' }}>
                                          <Divider sx={{ my: 0.5 }} />
                                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                            {Object.entries(matchingWorkloads[0].labels).slice(0, 2).map(([key, value]) => (
                                              <Chip 
                                                key={key} 
                                                label={`${key}: ${value}`} 
                                                size="small" 
                                                sx={{ 
                                                  fontSize: '0.6rem', 
                                                  height: 16, 
                                                  '& .MuiChip-label': { px: 0.5, py: 0 } 
                                                }} 
                                              />
                                            ))}
                                            {Object.keys(matchingWorkloads[0].labels).length > 2 && (
                                              <Chip 
                                                label={`+${Object.keys(matchingWorkloads[0].labels).length - 2}`} 
                                                size="small"
                                                sx={{ 
                                                  fontSize: '0.6rem', 
                                                  height: 16, 
                                                  '& .MuiChip-label': { px: 0.5, py: 0 } 
                                                }} 
                                              />
                                            )}
                                          </Box>
                                        </Box>
                                      )}
                                    </>
                                  )}
                                  <IconButton
                                    size="small"
                                    className="delete-button"
                                    onClick={(e) => {
                                      e.stopPropagation(); 
                                      removeFromPolicyCanvas('workload', workloadId);
                                    }}
                                    sx={{
                                      position: 'absolute',
                                      top: 4,
                                      right: 4,
                                      opacity: 0, // Hidden by default
                                      transition: 'opacity 0.2s',
                                      bgcolor: alpha(theme.palette.error.main, 0.1),
                                      color: theme.palette.error.main,
                                      p: '2px',
                                      '&:hover': {
                                        bgcolor: alpha(theme.palette.error.main, 0.2),
                                      }
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Paper>
                              );
                            })}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                          Drag workloads here
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}
            
            {/* Canvas Items Component - Keep it for references but completely hide it visually */}
            <Box sx={{ 
              position: 'absolute', 
              top: 0, 
              left: -9999, 
              visibility: 'hidden', 
              height: 0, 
              width: 0, 
              overflow: 'hidden'
            }}>
              <CanvasItems
                policies={policies}
                clusters={clusters}
                workloads={workloads}
                canvasEntities={policyCanvasEntities}
                assignmentMap={policyAssignmentMap}
                removeFromCanvas={removeFromPolicyCanvas}
                elementsRef={elementsRef}
                connectionLines={connectionLines}
                connectMode={activeConnection.source !== null}
                selectedItems={activeConnection.source ? [{
                  itemType: activeConnection.sourceType || '',
                  itemId: activeConnection.source.split('-')[1] || ''
                }] : []}
                onItemClick={handleCanvasItemClick}
                onItemHover={handleItemHover}
                activeConnection={activeConnection.source}
                snapToGrid={true}
                gridSize={gridSize}
              />
            </Box>
            
            {provided.placeholder}
          </Box>
        )}
      </StrictModeDroppable>
      
      {/* Footer Area with Clear Canvas Button - Always Visible */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        mt: 2,
        backgroundColor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(8px)',
        borderRadius: 1,
        p: 1,
        position: 'relative',
        zIndex: 2,
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 1
      }}>
        <Button 
          variant="outlined" 
          color="warning" 
          onClick={clearCanvas}
          startIcon={<DeleteIcon />}
          disabled={isCanvasEmpty}
          sx={{ 
            alignSelf: { xs: 'flex-end', sm: 'auto' },
            minWidth: '120px'
          }}
        >
          Clear Canvas
        </Button>
      </Box>
      
      {/* Loading overlay */}
      {loading && (
        <Box 
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: alpha(theme.palette.background.paper, 0.7),
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10
          }}
        >
          <CircularProgress size={40} />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Loading canvas data...
          </Typography>
        </Box>
      )}

      {/* Tooltip */}
      {hoveredItem.itemType && hoveredItem.position && (
        <Box
          sx={{
            position: 'absolute',
            top: hoveredItem.position.y - 5,
            left: hoveredItem.position.x,
            transform: 'translate(-50%, -100%)',
            zIndex: 1000,
            pointerEvents: 'none'
          }}
        >
          {getTooltipContent()}
        </Box>
      )}
    </Paper>
  );
};

export default React.memo(PolicyCanvas);
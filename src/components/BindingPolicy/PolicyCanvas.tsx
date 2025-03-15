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
  ToggleButton,
  ToggleButtonGroup,
  Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import InfoIcon from '@mui/icons-material/Info';
import AddLinkIcon from '@mui/icons-material/AddLink';
import PanToolIcon from '@mui/icons-material/PanTool';
import GridOnIcon from '@mui/icons-material/GridOn';
import { BindingPolicyInfo, ManagedCluster, Workload } from '../../types/bindingPolicy';
import { usePolicyDragDropStore } from '../../stores/policyDragDropStore';
import { useCanvasStore } from '../../stores/canvasStore';
import CanvasItems from './CanvasItems';
import StrictModeDroppable from './StrictModeDroppable';
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
    sourceId: string, 
    sourceName: string, 
    targetType: string, 
    targetId: string, 
    targetName: string
  ) => void;
  connectionMode?: boolean;
  onConnectionComplete?: (workloadId: string, clusterId: string) => void;
}

const PolicyCanvas: React.FC<PolicyCanvasProps> = ({
  policies,
  clusters,
  workloads,
  loading = false,
  getItemLabels = () => ({}),
  onConnectionSelect,
  connectionMode = false,
  onConnectionComplete
}) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<Record<string, HTMLElement>>({});
  const isMounted = useRef<boolean>(true);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevConnectionLinesRef = useRef<typeof connectionLines>([]);
  
  // Log when connection mode changes
  useEffect(() => {
    console.log(`🌈 PolicyCanvas: Connection mode ${connectionMode ? 'ENABLED' : 'DISABLED'}`);
  }, [connectionMode]);
  
  // Grid settings for snap-to-grid
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const gridSize = 20; // Size of grid in pixels
  
  // Hover state for tooltips
  const [hoveredItem, setHoveredItem] = useState<{
    itemType: 'cluster' | 'workload' | 'policy' | null;
    itemId: string | null;
    position: { x: number; y: number } | null;
  }>({ itemType: null, itemId: null, position: null });
  
  const { 
    canvasEntities: policyCanvasEntities, 
    assignmentMap: policyAssignmentMap, 
    removeFromCanvas: removeFromPolicyCanvas, 
    clearCanvas,
    getItemLabels: getPolicyItemLabels,
  } = usePolicyDragDropStore();
  
  const {
    connectionLines,
    setConnectionLines,
    drawingActive,
  } = useCanvasStore();
  
  // Throttle the update to prevent multiple state updates in rapid succession
  const throttledUpdateConnectionLines = useCallback((newLines: typeof connectionLines) => {
    // Clear any pending updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // Schedule a new update
    updateTimeoutRef.current = setTimeout(() => {
      if (isMounted.current) {
        // Just update the connection lines directly
        // The checks to prevent unnecessary updates are already in the useEffect
        setConnectionLines(newLines);
      }
    }, 100); // 100ms throttle
  }, [setConnectionLines]);
  
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

  // Add state for invalid connection warning
  const [, setInvalidConnectionWarning] = useState<string | null>(null);

  // Helper function to draw a curved connection line
  const drawConnection = (
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
    
    // Calculate control points for the curve
    const controlX = (startX + endX) / 2;
    
    // Create a bezier curve
    ctx.bezierCurveTo(
      controlX, startY,
      controlX, endY,
      endX, endY
    );
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    // Use dashed line for active connections being drawn
    if (isDashed) {
      ctx.setLineDash([5, 3]);
    } else {
      ctx.setLineDash([]);
    }
    
    ctx.stroke();
    
    // Only draw arrow for completed connections
    if (!isDashed) {
      // Draw arrow at the end
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
  };

  // Draw connections between elements on canvas when data changes
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !drawingActive || !isMounted.current) return;
    
    // Create the rendering function in a stable way
    const renderConnections = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Set canvas dimensions to match container
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Store new connections for canvasStore
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
      if (connectionMode && activeConnection.source) {
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
          
          drawConnection(ctx, startX, startY, endX, endY, '#9c27b0', true);
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
    // Essential dependencies
    policyCanvasEntities,
    policyAssignmentMap, 
    policies, 
    clusters, 
    workloads, 
    drawingActive, 
    connectionMode, 
    activeConnection,
    connectionLines,
    throttledUpdateConnectionLines,
    // Drawing function
    drawConnection
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

  // Handle mouse movement for active connection
  const handleMouseMove = (e: React.MouseEvent) => {
    if (connectionMode && activeConnection.source) {
      setActiveConnection({
        ...activeConnection,
        mouseX: e.clientX,
        mouseY: e.clientY
      });
    }
  };
  
  // Handle canvas item clicks for connection mode
  const handleCanvasItemClick = (
    itemType: 'policy' | 'cluster' | 'workload', 
    itemId: string
  ) => {
    console.log(`⭐ Canvas item clicked: ${itemType}-${itemId}, connectionMode: ${connectionMode}`);
    
    if (!connectionMode) {
      console.log('⭐ Connection mode is OFF - ignoring click');
      return;
    }
    
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
          onConnectionComplete(workloadId, clusterId);
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
  };

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

  // Helper function for snap-to-grid calculation
  // const snapPositionToGrid = (position: number): number => {
  //   if (!snapToGrid) return position;
  //   return Math.round(position / gridSize) * gridSize;
  // };
  
  // Group workloads by namespace
  // const groupedWorkloads = useMemo(() => {
  //   const groups: Record<string, Workload[]> = {};
    
  //   workloads.forEach(workload => {
  //     const namespace = workload.namespace || 'default';
  //     if (!groups[namespace]) {
  //       groups[namespace] = [];
  //     }
  //     groups[namespace].push(workload);
  //   });
    
  //   return groups;
  // }, [workloads]);
  
  // Find workload or cluster by ID
  // const getItemById = useCallback((itemType: 'workload' | 'cluster', itemId: string) => {
  //   if (itemType === 'workload') {
  //     return workloads.find(w => w.name === itemId);
  //   } else {
  //     return clusters.find(c => c.name === itemId);
  //   }
  // }, [workloads, clusters]);
  
  // Handler for hover events
  const handleItemHover = (
    itemType: 'policy' | 'cluster' | 'workload' | null, 
    itemId: string | null
  ) => {
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

  // Function to get tooltip content based on hovered item
  const getTooltipContent = () => {
    if (!hoveredItem.itemType || !hoveredItem.itemId) {
      return null;
    }

    const { itemType, itemId } = hoveredItem;
    
    if (itemType === 'cluster') {
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
    } else if (itemType === 'workload') {
      const workload = workloads.find(w => w.name === itemId);
      if (!workload) return null;
      
      return (
        <ItemTooltip 
          title={workload.name}
          subtitle={`${workload.namespace}/${workload.type}`}
          labels={getItemLabels('workload', itemId)}
          description={workload.description || `${workload.type} workload`}
          type="workload"
        />
      );
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

  // Draw grid background for snap-to-grid
  const renderGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!snapToGrid) return;
    
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
  }, [snapToGrid, theme, gridSize]);
  
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
    
  }, [renderGrid, snapToGrid, theme]);

  return (
    <Paper
      ref={containerRef}
      sx={{
        p: 2,
        minHeight: 600,
        position: 'relative',
        border: connectionMode ? '3px solid #9c27b0' : '1px solid',
        borderColor: connectionMode ? '#9c27b0' : 'divider',
        backgroundColor: alpha(theme.palette.background.paper, 0.95),
        zIndex: 1,
        boxShadow: connectionMode ? 3 : 1,
        borderRadius: 2,
        overflow: 'hidden'
      }}
      onMouseMove={handleMouseMove}
      onClick={(e) => {
        // Log any clicks on the canvas for debugging
        console.log('🟢 Canvas clicked at', { x: e.clientX, y: e.clientY, target: e.target });
      }}
    >
      <Box sx={{ 
        position: 'relative',
        zIndex: 2,
        backgroundColor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(8px)',
        borderRadius: 1,
        p: 1,
        mb: 2
      }}>
        <Typography variant="h6" align="center" gutterBottom fontWeight="medium">
          Binding Policy Canvas
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 1 }}>
          Drag policies, clusters, and workloads here to visualize binding relationships
        </Typography>
      </Box>
      
      {/* Canvas Tools */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        mb: 2,
        position: 'relative',
        zIndex: 3
      }}>
        <ToggleButtonGroup
          value={connectionMode ? 'connect' : 'pan'}
          exclusive
          onChange={(_, newValue) => {
            // Since we can't set connectionMode directly (it's a prop),
            // we need to emit an event that the parent can use
            if (newValue && newValue === 'connect' && onConnectionSelect) {
              // We can use onConnectionSelect as a way to notify parent about connection mode change
              onConnectionSelect('mode', 'change', 'requested', 'connection', newValue, newValue);
            }
            // Reset active connection when switching modes
            setActiveConnection({
              source: null,
              sourceType: null,
              mouseX: 0,
              mouseY: 0
            });
          }}
          size="small"
          aria-label="canvas tool"
          disabled={connectionMode} // Disable when connectionMode is controlled by parent
        >
          <ToggleButton value="pan" aria-label="pan mode">
            <Tooltip title="Pan/Select Mode">
              <PanToolIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="connect" aria-label="connect mode">
            <Tooltip title="Create Binding Policy: Click a workload then a cluster to connect them">
              <AddLinkIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
        
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        
        <ToggleButtonGroup
          value={snapToGrid ? 'grid' : 'free'}
          exclusive
          onChange={(_, newValue) => {
            if (newValue) {
              setSnapToGrid(newValue === 'grid');
            }
          }}
          size="small"
          aria-label="grid mode"
        >
          <ToggleButton value="grid" aria-label="snap to grid">
            <Tooltip title="Snap to Grid">
              <GridOnIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="free" aria-label="free movement">
            <Tooltip title="Free Movement">
              <PanToolIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      {connectionMode && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
        >
          <Typography variant="body2">
            <strong>Connection Mode:</strong> Click a workload and then a cluster to create a binding policy connection
            {activeConnection.source && (
              <Chip 
                label={`Selected: ${activeConnection.source.replace(/^(cluster|workload)-/, '')}`}
                size="small"
                color="primary"
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
        </Alert>
      )}
      
      <StrictModeDroppable droppableId="canvas" type="CLUSTER_OR_WORKLOAD">
        {(provided, snapshot) => (
          <Box
            {...provided.droppableProps}
            ref={provided.innerRef}
            data-rbd-droppable-id="canvas"
            data-rfd-droppable-context-id={provided.droppableProps['data-rfd-droppable-context-id']}
            sx={{
              minHeight: 500,
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
                : alpha(theme.palette.divider, 0.7),
              borderRadius: 2,
              transition: 'all 0.2s',
              p: 3,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)'
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
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 1
                }}
              >
                <AddIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ opacity: 0.7 }}>
                  Drag items here
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7, mt: 1 }}>
                  Start by dragging policies, clusters, or workloads to this canvas
                </Typography>
              </Box>
            )}
            
            {/* Canvas Content with Clear Sections */}
            {!isCanvasEmpty && (
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', zIndex: 2 }}>
                {/* Canvas Sections Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
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
                <Box sx={{ display: 'flex', flexGrow: 1 }}>
                  {/* Clusters Section */}
                  <Box sx={{ 
                    width: '48%', 
                    mr: 1,
                    p: 1, 
                    border: '1px dashed', 
                    borderColor: alpha(theme.palette.info.main, 0.4),
                    borderRadius: 1,
                    backgroundColor: alpha(theme.palette.info.main, 0.05),
                    boxShadow: 'inset 0 0 5px rgba(25, 118, 210, 0.1)',
                    minHeight: 150
                  }}>
                    {policyCanvasEntities.clusters.length > 0 ? (
                      <Box>
                        {/* Display clusters here with individual styling */}
                        {policyCanvasEntities.clusters.map((clusterId) => (
                          <Paper
                            key={`cluster-section-${clusterId}`}
                            elevation={2}
                            sx={{
                              mb: 1,
                              p: 1,
                              borderLeft: '4px solid',
                              borderColor: theme.palette.info.main,
                              backgroundColor: alpha(theme.palette.info.main, 0.1),
                              transition: 'all 0.2s',
                              '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
                            }}
                          >
                            <Typography variant="body2" component="div" sx={{ fontWeight: 'medium' }}>
                              {clusterId}
                            </Typography>
                          </Paper>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                        Drag clusters here
                      </Typography>
                    )}
                  </Box>
                  
                  {/* Workloads Section */}
                  <Box sx={{ 
                    width: '48%', 
                    ml: 1,
                    p: 1, 
                    border: '1px dashed', 
                    borderColor: alpha(theme.palette.success.main, 0.4),
                    borderRadius: 1,
                    backgroundColor: alpha(theme.palette.success.main, 0.05),
                    boxShadow: 'inset 0 0 5px rgba(76, 175, 80, 0.1)',
                    minHeight: 150
                  }}>
                    {policyCanvasEntities.workloads.length > 0 ? (
                      <Box>
                        {/* Display workloads here with individual styling */}
                        {policyCanvasEntities.workloads.map((workloadId) => (
                          <Paper
                            key={`workload-section-${workloadId}`}
                            elevation={2}
                            sx={{
                              mb: 1,
                              p: 1,
                              borderLeft: '4px solid',
                              borderColor: theme.palette.success.main,
                              backgroundColor: alpha(theme.palette.success.main, 0.1),
                              transition: 'all 0.2s',
                              '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
                            }}
                          >
                            <Typography variant="body2" component="div" sx={{ fontWeight: 'medium' }}>
                              {workloadId}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Type: {workloads.find(w => w.name === workloadId)?.type || 'Unknown'}
                            </Typography>
                          </Paper>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                        Drag workloads here
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            )}
            
            {/* Canvas Items Component */}
            <CanvasItems
              policies={policies}
              clusters={clusters}
              workloads={workloads}
              canvasEntities={policyCanvasEntities}
              assignmentMap={policyAssignmentMap}
              getItemLabels={getPolicyItemLabels}
              removeFromCanvas={removeFromPolicyCanvas}
              elementsRef={elementsRef}
              connectionLines={connectionLines}
              connectMode={connectionMode}
              selectedItems={activeConnection.source ? [{
                itemType: activeConnection.sourceType || '',
                itemId: activeConnection.source.split('-')[1] || ''
              }] : []}
              onItemClick={handleCanvasItemClick}
              onItemHover={handleItemHover}
              activeConnection={activeConnection.source}
              snapToGrid={snapToGrid}
              gridSize={gridSize}
            />
            
            {provided.placeholder}
          </Box>
        )}
      </StrictModeDroppable>
      
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        mt: 2,
        backgroundColor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(8px)',
        borderRadius: 1,
        p: 1,
        position: 'relative',
        zIndex: 2
      }}>
        <Tooltip title="After binding policies, you'll need to wait for the propagation to complete">
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <InfoIcon fontSize="small" sx={{ color: 'text.secondary', mr: 0.5 }} />
            <Typography variant="caption" color="text.secondary">
              {connectionMode 
                ? "Click items to create binding policies: workload → cluster" 
                : "Drag a policy onto a cluster or workload to create a binding"}
            </Typography>
          </Box>
        </Tooltip>
        
        <Button 
          variant="outlined" 
          color="warning" 
          onClick={clearCanvas}
          startIcon={<DeleteIcon />}
          disabled={isCanvasEmpty}
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
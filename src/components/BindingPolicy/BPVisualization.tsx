import { useEffect, useState, useMemo, useCallback } from 'react';
import ReactFlow, { 
  Node, 
  Edge, 
  Background, 
  Controls,
  MarkerType,
  useNodesState,
  useEdgesState,
  Panel,
  useReactFlow,
  NodeTypes,
  MiniMap,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Chip, 
  FormControlLabel, 
  Switch, 
  Tooltip, 
  Button,
  IconButton,
  ButtonGroup
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as FitViewIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { BindingPolicyInfo, ManagedCluster, Workload } from '../../types/bindingPolicy';
import useTheme from '../../stores/themeStore';
import PolicyNode from './nodes/PolicyNode';
import WorkloadNode from './nodes/WorkloadNode';
import ClusterNode from './nodes/ClusterNode';

// Custom components for ReactFlow
const CustomMiniMap: React.FC<{ theme: string }> = ({ theme }) => {
  return (
    <MiniMap
      nodeColor={(node: Node) => {
        switch (node.type) {
          case 'policyNode':
            return '#2563EB';
          case 'workloadNode':
            return '#3B82F6';
          case 'clusterNode':
            return '#6B7280';
          default:
            return '#9CA3AF';
        }
      }}
      maskColor={theme === 'dark' ? 'rgba(17, 24, 39, 0.5)' : 'rgba(255, 255, 255, 0.5)'}
      style={{
        backgroundColor: theme === 'dark' ? '#1F2937' : '#F9FAFB',
        border: '1px solid',
        borderColor: theme === 'dark' ? '#374151' : '#E5E7EB',
      }}
    />
  );
};

interface FlowControlsProps {
  theme: string;
  onLayoutChange?: (layout: string) => void;
}

const FlowControls: React.FC<FlowControlsProps> = ({ theme, onLayoutChange }) => {
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const handleZoomIn = () => {
    zoomIn({ duration: 300 });
  };

  const handleZoomOut = () => {
    zoomOut({ duration: 300 });
  };

  const handleFitView = () => {
    fitView({ duration: 500, padding: 0.2 });
  };

  return (
    <Panel position="top-right" style={{ zIndex: 10, marginTop:"8rem"}}>
      <Box 
        sx={{
          p: 1,
          borderRadius: 1,
          bgcolor: theme === 'dark' ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(4px)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        <Typography variant="caption" sx={{ color: theme === 'dark' ? '#D1D5DB' : '#4B5563' }}>
          Zoom
        </Typography>
        
        <ButtonGroup size="small" variant="outlined">
          <Button onClick={handleZoomIn}>
            <ZoomInIcon fontSize="small" />
          </Button>
          <Button onClick={handleZoomOut}>
            <ZoomOutIcon fontSize="small" />
          </Button>
          <Button onClick={handleFitView}>
            <FitViewIcon fontSize="small" />
          </Button>
        </ButtonGroup>
        
        {onLayoutChange && (
          <>
            <Typography variant="caption" sx={{ color: theme === 'dark' ? '#D1D5DB' : '#4B5563', mt: 1 }}>
              Layout
            </Typography>
            
            <ButtonGroup size="small" variant="outlined">
              <Button onClick={() => onLayoutChange('horizontal')}>Horizontal</Button>
              <Button onClick={() => onLayoutChange('vertical')}>Vertical</Button>
              <Button onClick={() => onLayoutChange('radial')}>Radial</Button>
            </ButtonGroup>
          </>
        )}
      </Box>
    </Panel>
  );
};

interface SearchPanelProps {
  nodes: Node[];
  theme: string;
  onNodeSelect: (nodeId: string) => void;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ nodes, theme, onNodeSelect }) => {
  const {  setCenter } = useReactFlow();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Node[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = useCallback(() => {
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const results = nodes.filter(node => {
      if (node.data.label) {
        return node.data.label.toLowerCase().includes(term);
      }
      return false;
    });
    
    setSearchResults(results);
    setShowResults(true);
  }, [searchTerm, nodes]);

  const handleNodeSelect = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      const x = node.position.x;
      const y = node.position.y;
      setCenter(x, y, { duration: 800, zoom: 1.5 });
      onNodeSelect(nodeId);
      setShowResults(false);
    }
  };

  return (
    <Panel position="top-left">
      <Box 
        sx={{
          p: 1,
          borderRadius: 1,
          bgcolor: theme === 'dark' ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(4px)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          width: 240,
          position: 'relative'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search nodes..."
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: `1px solid ${theme === 'dark' ? '#4B5563' : '#D1D5DB'}`,
              backgroundColor: theme === 'dark' ? '#374151' : '#FFFFFF',
              color: theme === 'dark' ? '#F9FAFB' : '#111827',
              width: '100%',
              fontSize: '0.875rem',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
          <IconButton size="small" onClick={handleSearch}>
            <SearchIcon fontSize="small" />
          </IconButton>
        </Box>
        
        {showResults && searchResults.length > 0 && (
          <Box 
            sx={{
              mt: 1,
              maxHeight: 200,
              overflowY: 'auto',
              border: `1px solid ${theme === 'dark' ? '#4B5563' : '#E5E7EB'}`,
              borderRadius: '4px',
              backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
            }}
          >
            {searchResults.map((node) => (
              <Box 
                key={node.id}
                onClick={() => handleNodeSelect(node.id)}
                sx={{
                  p: 1,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: theme === 'dark' ? '#374151' : '#F3F4F6',
                  },
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Box 
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: node.type === 'policyNode' 
                      ? '#2563EB' 
                      : node.type === 'workloadNode'
                        ? '#3B82F6'
                        : '#6B7280'
                  }}
                />
                <Typography variant="body2" sx={{ color: theme === 'dark' ? '#F9FAFB' : '#111827' }}>
                  {node.data.label}
                </Typography>
                <Typography variant="caption" sx={{ color: theme === 'dark' ? '#9CA3AF' : '#6B7280', ml: 'auto' }}>
                  {node.type === 'policyNode' 
                    ? 'Policy' 
                    : node.type === 'workloadNode'
                      ? 'Workload'
                      : 'Cluster'}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
        
        {showResults && searchResults.length === 0 && (
          <Box sx={{ mt: 1, p: 1 }}>
            <Typography variant="body2" sx={{ color: theme === 'dark' ? '#D1D5DB' : '#6B7280' }}>
              No nodes found matching "{searchTerm}"
            </Typography>
          </Box>
        )}
      </Box>
    </Panel>
  );
};

// Export a function to highlight paths between nodes
// const highlightPath = (
//   edges: Edge[],
//   sourceId: string,
//   targetId: string,
//   setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
// ) => {
//   const path = findPath(edges, sourceId, targetId);
  
//   const updatedEdges = edges.map(edge => {
//     if (path.includes(edge.id)) {
//       return {
//         ...edge,
//         style: {
//           ...edge.style,
//           stroke: '#F59E0B',
//           strokeWidth: 3,
//           opacity: 1
//         },
//         animated: true
//       };
//     }
//     return {
//       ...edge,
//       style: {
//         ...edge.style,
//         opacity: 0.25
//       },
//       animated: false
//     };
//   });
  
//   setEdges(updatedEdges);
// };

// Helper function to find a path between nodes
// const findPath = (edges: Edge[], sourceId: string, targetId: string): string[] => {
//   // Basic BFS to find a path
//   const visited = new Set<string>();
//   const queue: { nodeId: string; path: string[] }[] = [{ nodeId: sourceId, path: [] }];
  
//   while (queue.length > 0) {
//     const { nodeId, path } = queue.shift()!;
    
//     if (nodeId === targetId) {
//       return path;
//     }
    
//     if (visited.has(nodeId)) continue;
//     visited.add(nodeId);
    
//     const outgoingEdges = edges.filter(edge => edge.source === nodeId);
    
//     for (const edge of outgoingEdges) {
//       queue.push({
//         nodeId: edge.target,
//         path: [...path, edge.id]
//       });
//     }
//   }
  
//   return [];
// };

interface BPVisualizationProps {
  policies: BindingPolicyInfo[];
  clusters?: ManagedCluster[];
  workloads?: Workload[];
}

// Define custom node types
const nodeTypes: NodeTypes = {
  policyNode: PolicyNode,
  workloadNode: WorkloadNode,
  clusterNode: ClusterNode,
};

const BPVisualization: React.FC<BPVisualizationProps> = ({ policies, clusters: propClusters, workloads: propWorkloads }) => {
  const theme = useTheme((state) => state.theme);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showWorkloads, setShowWorkloads] = useState<boolean>(true);
  //const [showLabels, setShowLabels] = useState<boolean>(true);
  const [highlightActive, setHighlightActive] = useState<boolean>(true);
  const [layout, setLayout] = useState<'radial' | 'horizontal' | 'vertical'>('radial');
  //const [, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  const [, setSelectedNodeId] = useState<string | null>(null);
  //const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  const [, setIsDetailsOpen] = useState<boolean>(false);
  const [, setSelectedEntity] = useState<{type: string; data: Record<string, unknown>} | null>(null);
 // const reactFlowInstance = useReactFlow();

  // Extract unique clusters and workloads from all policies
  const { uniqueClusters } = useMemo(() => {
    const clusters = new Set<string>();
    const workloads = new Set<string>();
    
    policies.forEach((policy: BindingPolicyInfo) => {
      // Get all clusters matched by this policy
      // Extract cluster names from the policy if available
     // const clustersForPolicy: string[] = [];
      
      // Try to extract cluster names from the policy's matchedClusters property if it exists
      if ('matchedClusters' in policy && Array.isArray(policy.matchedClusters)) {
        policy.matchedClusters.forEach((cluster: { name: string }) => {
          if (cluster && cluster.name && !clusters.has(cluster.name)) {
            clusters.add(cluster.name);
          }
        });
      }
      
      // Get all workloads matched by this policy
      // Extract workload names from the policy if available
      if ('matchedWorkloads' in policy && Array.isArray(policy.matchedWorkloads)) {
        policy.matchedWorkloads.forEach((workload: { name: string }) => {
          if (workload && workload.name && !workloads.has(workload.name)) {
            workloads.add(workload.name);
          }
        });
      }
    });
    
    return { 
      uniqueClusters: Array.from(clusters), 
      uniqueWorkloads: Array.from(workloads) 
    };
  }, [policies]);

  // Function to export the graph as an image
//   const exportAsImage = useCallback(() => {
//     if (!reactFlowInstance) return;
    
//     // Note: toImage is a custom method that needs to be added to the ReactFlowInstance type
//     const dataURL = (reactFlowInstance as any).toImage({
//       quality: 0.95,
//       width: 1920,
//       height: 1080,
//       backgroundColor: theme === 'dark' ? '#111827' : '#F9FAFB'
//     });
    
//     // Create a download link
//     const link = document.createElement('a');
//     link.href = dataURL;
//     link.download = 'binding-policy-visualization.png';
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   }, [reactFlowInstance, theme]);
  
  // Handle node click to show details
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    
    // Determine the entity type and set data for details panel
    if (node.type === 'policyNode') {
      setSelectedEntity({
        type: 'Policy',
        data: node.data.policy
      });
    } else if (node.type === 'workloadNode') {
      setSelectedEntity({
        type: 'Workload',
        data: {
          name: node.data.label,
          policy: node.data.policy
        }
      });
    } else if (node.type === 'clusterNode') {
      // Find policies that target this cluster
      const targetingPolicies = policies.filter((policy: BindingPolicyInfo) => 
        policy.clusterList && policy.clusterList.includes(node.data.label)
      );
      
      setSelectedEntity({
        type: 'Cluster',
        data: {
          name: node.data.label,
          targetedBy: targetingPolicies.map(p => p.name)
        }
      });
    }
    
    setIsDetailsOpen(true);
  }, [policies]);

  // Handle layout changes
  const handleLayoutChange = useCallback((newLayout: string) => {
    setLayout(newLayout as 'radial' | 'horizontal' | 'vertical');
  }, []);

  // Handle filter menu
  // const handleFilterMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
  //   setFilterMenuAnchor(event.currentTarget);
  // };

  // const handleFilterMenuClose = () => {
  //   setFilterMenuAnchor(null);
  // };
  
  // This effect regenerates the graph when policies or visualization settings change
  useEffect(() => {
    const generateGraph = () => {
      setLoading(true);
      
      // Group nodes and edges
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];
      
      // Define WorkloadObject type for use throughout the function
      type WorkloadObject = { name: string; policy: string };
      
      // Process policies and create graph nodes/edges
      if (policies.length > 0) {
        const uniqueClusters: string[] = [];
        const uniqueWorkloads: string[] = [];
        
        // Collect all unique clusters and workloads from policies
        policies.forEach(policy => {
          // Get all clusters matched by this policy
          // Extract cluster names from the policy if available
         // const clustersForPolicy: string[] = [];
          
          // Try to extract cluster names from the policy's matchedClusters property if it exists
          if ('matchedClusters' in policy && Array.isArray(policy.matchedClusters)) {
            policy.matchedClusters.forEach((cluster: { name: string }) => {
              if (cluster && cluster.name && !uniqueClusters.includes(cluster.name)) {
                uniqueClusters.push(cluster.name);
              }
            });
          }
          
          // Get all workloads matched by this policy
          // Extract workload names from the policy if available
          if ('matchedWorkloads' in policy && Array.isArray(policy.matchedWorkloads)) {
            policy.matchedWorkloads.forEach((workload: { name: string }) => {
              if (workload && workload.name && !uniqueWorkloads.includes(workload.name)) {
                uniqueWorkloads.push(workload.name);
              }
            });
          }
        });
        
        // If propClusters is provided, add any additional clusters
        if (propClusters && propClusters.length > 0) {
          propClusters.forEach(cluster => {
            if (!uniqueClusters.includes(cluster.name)) {
              uniqueClusters.push(cluster.name);
            }
          });
        }
        
        // If propWorkloads is provided, add any additional workloads
        if (propWorkloads && propWorkloads.length > 0) {
          propWorkloads.forEach(workload => {
            if (!uniqueWorkloads.includes(workload.name)) {
              uniqueWorkloads.push(workload.name);
            }
          });
        }
        
        // Different layout configurations
        let policyRadius = 400;
        let clusterRadius = 600;
        let workloadRadius = 200;
        
        if (layout === 'horizontal') {
          policyRadius = 0; // Will position differently
          clusterRadius = 0; // Will position differently
          workloadRadius = 200;
        } else if (layout === 'vertical') {
          policyRadius = 0; // Will position differently
          clusterRadius = 0; // Will position differently
          workloadRadius = 250;
        }
        
        // Position nodes differently based on layout
        if (layout === 'radial') {
          // Radial layout - policies in inner circle, clusters in outer circle
          const policyAngleStep = (2 * Math.PI) / policies.length;
          
          policies.forEach((policy: BindingPolicyInfo, policyIndex: number) => {
            const policyAngle = policyAngleStep * policyIndex;
            const policyX = 0 + policyRadius * Math.cos(policyAngle);
            const policyY = 0 + policyRadius * Math.sin(policyAngle);
            
            // Add policy node
            const policyId = `policy-${policy.name}`;
            newNodes.push({
              id: policyId,
              type: 'policyNode',
              position: { x: policyX, y: policyY },
              data: { 
                policy,
                label: policy.name,
                isActive: policy.status === 'Active',
                theme
              },
            });
          });
          
          // Create cluster nodes in outer circle for radial layout
          const clusterAngleStep = (2 * Math.PI) / uniqueClusters.length;
          
          uniqueClusters.forEach((clusterName: string, clusterIndex: number) => {
            const clusterAngle = clusterAngleStep * clusterIndex;
            const clusterX = 0 + clusterRadius * Math.cos(clusterAngle);
            const clusterY = 0 + clusterRadius * Math.sin(clusterAngle);
            
            // Add cluster node
            const clusterId = `cluster-${clusterName}`;
            newNodes.push({
              id: clusterId,
              type: 'clusterNode',
              position: { x: clusterX, y: clusterY },
              data: { 
                label: clusterName,
                theme
              },
            });
            
            // Connect policies to this cluster
            policies.forEach((policy: BindingPolicyInfo) => {
              if (policy.clusterList && policy.clusterList.includes(clusterName)) {
                newEdges.push({
                  id: `policy-${policy.name}-to-cluster-${clusterName}`,
                  source: `policy-${policy.name}`,
                  target: clusterId,
                  type: 'smoothstep',
                  animated: true,
                  style: { 
                    stroke: policy.status === 'Active' ? '#10B981' : '#9CA3AF',
                    strokeWidth: 2,
                    opacity: highlightActive && policy.status !== 'Active' ? 0.4 : 1
                  },
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: policy.status === 'Active' ? '#10B981' : '#9CA3AF',
                  },
                });
              }
            });
          });
        } else if (layout === 'horizontal') {
          // Horizontal layout - clusters on right, policies in middle, workloads on left
          const policySpacing = 200;
          const policyStartY = -((policies.length - 1) * policySpacing) / 2;
          
          // Create policy nodes in vertical line
          policies.forEach((policy: BindingPolicyInfo, policyIndex: number) => {
            const policyX = 0;
            const policyY = policyStartY + policyIndex * policySpacing;
            
            // Add policy node
            const policyId = `policy-${policy.name}`;
            newNodes.push({
              id: policyId,
              type: 'policyNode',
              position: { x: policyX, y: policyY },
              data: { 
                policy,
                label: policy.name,
                isActive: policy.status === 'Active',
                theme
              },
            });
          });
          
          // Create cluster nodes on the right
          const clusterSpacing = 180;
          const clusterStartY = -((uniqueClusters.length - 1) * clusterSpacing) / 2;
          
          uniqueClusters.forEach((clusterName: string, clusterIndex: number) => {
            const clusterX = 500;
            const clusterY = clusterStartY + clusterIndex * clusterSpacing;
            
            // Add cluster node
            const clusterId = `cluster-${clusterName}`;
            newNodes.push({
              id: clusterId,
              type: 'clusterNode',
              position: { x: clusterX, y: clusterY },
              data: { 
                label: clusterName,
                theme
              },
            });
            
            // Connect policies to this cluster
            policies.forEach((policy: BindingPolicyInfo) => {
              if (policy.clusterList && policy.clusterList.includes(clusterName)) {
                newEdges.push({
                  id: `policy-${policy.name}-to-cluster-${clusterName}`,
                  source: `policy-${policy.name}`,
                  target: clusterId,
                  type: 'smoothstep',
                  animated: true,
                  style: { 
                    stroke: policy.status === 'Active' ? '#10B981' : '#9CA3AF',
                    strokeWidth: 2,
                    opacity: highlightActive && policy.status !== 'Active' ? 0.4 : 1
                  },
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: policy.status === 'Active' ? '#10B981' : '#9CA3AF',
                  },
                });
              }
            });
          });
        } else if (layout === 'vertical') {
          // Vertical layout - clusters on bottom, policies in middle, workloads on top
          const policySpacing = 200;
          const policyStartX = -((policies.length - 1) * policySpacing) / 2;
          
          // Create policy nodes in horizontal line
          policies.forEach((policy: BindingPolicyInfo, policyIndex: number) => {
            const policyX = policyStartX + policyIndex * policySpacing;
            const policyY = 0;
            
            // Add policy node
            const policyId = `policy-${policy.name}`;
            newNodes.push({
              id: policyId,
              type: 'policyNode',
              position: { x: policyX, y: policyY },
              data: { 
                policy,
                label: policy.name,
                isActive: policy.status === 'Active',
                theme
              },
            });
          });
          
          // Create cluster nodes at the bottom
          const clusterSpacing = 180;
          const clusterStartX = -((uniqueClusters.length - 1) * clusterSpacing) / 2;
          
          uniqueClusters.forEach((clusterName: string, clusterIndex: number) => {
            const clusterX = clusterStartX + clusterIndex * clusterSpacing;
            const clusterY = 300;
            
            // Add cluster node
            const clusterId = `cluster-${clusterName}`;
            newNodes.push({
              id: clusterId,
              type: 'clusterNode',
              position: { x: clusterX, y: clusterY },
              data: { 
                label: clusterName,
                theme
              },
            });
            
            // Connect policies to this cluster
            policies.forEach((policy: BindingPolicyInfo) => {
              if (policy.clusterList && policy.clusterList.includes(clusterName)) {
                newEdges.push({
                  id: `policy-${policy.name}-to-cluster-${clusterName}`,
                  source: `policy-${policy.name}`,
                  target: clusterId,
                  type: 'smoothstep',
                  animated: true,
                  style: { 
                    stroke: policy.status === 'Active' ? '#10B981' : '#9CA3AF',
                    strokeWidth: 2,
                    opacity: highlightActive && policy.status !== 'Active' ? 0.4 : 1
                  },
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: policy.status === 'Active' ? '#10B981' : '#9CA3AF',
                  },
                });
              }
            });
          });
        }
        
        // Only add workloads if toggled on
        if (showWorkloads) {
          if (layout === 'radial') {
            // Create workload nodes in inner circles around each policy
            const policyAngleStep = (2 * Math.PI) / policies.length;
            policies.forEach((policy: BindingPolicyInfo, policyIndex: number) => {
              if (!policy.workloadList || policy.workloadList.length === 0) return;
              
              const policyAngle = policyAngleStep * policyIndex;
              const policyX = 0 + policyRadius * Math.cos(policyAngle);
              const policyY = 0 + policyRadius * Math.sin(policyAngle);
            
              const workloadAngleStep = (2 * Math.PI) / policy.workloadList.length;
              
              policy.workloadList.forEach((workloadName: string, workloadIndex: number) => {
                const workloadAngle = workloadAngleStep * workloadIndex;
                const workloadX = policyX + workloadRadius * Math.cos(workloadAngle);
                const workloadY = policyY + workloadRadius * Math.sin(workloadAngle);
                
                // Add workload node
                const workloadId = `workload-${policy.name}-${workloadName}`;
                
                // Check if this workload node already exists
                if (!newNodes.some(node => node.id === workloadId)) {
                  newNodes.push({
                    id: workloadId,
                    type: 'workloadNode',
                    position: { x: workloadX, y: workloadY },
                    data: { 
                      label: workloadName,
                      policy: policy.name,
                      theme
                    },
                  });
                }
                
                // Connect workload to policy
                newEdges.push({
                  id: `workload-${workloadName}-to-policy-${policy.name}`,
                  source: workloadId,
                  target: `policy-${policy.name}`,
                  type: 'smoothstep',
                  style: { 
                    stroke: theme === 'dark' ? '#4B5563' : '#9CA3AF',
                    strokeWidth: 1,
                    opacity: 0.8
                  },
                });
                
                // Direct connections from workloads to clusters (the feature you requested)
                if (policy.clusterList) {
                  policy.clusterList.forEach(clusterName => {
                    newEdges.push({
                      id: `workload-${workloadName}-to-cluster-${clusterName}-via-${policy.name}`,
                      source: workloadId,
                      target: `cluster-${clusterName}`,
                      type: 'straight',
                      style: { 
                        stroke: '#3B82F6',
                        strokeWidth: 1,
                        strokeDasharray: '5,5',
                        opacity: highlightActive && policy.status !== 'Active' ? 0.2 : 0.4
                      },
                      animated: policy.status === 'Active',
                      markerEnd: {
                        type: MarkerType.Arrow,
                        color: '#3B82F6',
                      },
                    });
                  });
                }
              });
            });
          } else if (layout === 'horizontal') {
            // Create workload nodes on the left
            const allWorkloads = policies.flatMap((policy: BindingPolicyInfo) => 
              policy.workloadList ? policy.workloadList.map((w: string) => ({ name: w, policy: policy.name })) : []
            );
            
            // Remove duplicates (if a workload is used by multiple policies)
            const uniqueWorkloadObjects = allWorkloads.filter((workload: WorkloadObject, index: number, self: WorkloadObject[]) =>
              index === self.findIndex((w: WorkloadObject) => w.name === workload.name)
            );
            
            const workloadSpacing = 150;
            const workloadStartY = -((uniqueWorkloadObjects.length - 1) * workloadSpacing) / 2;
            
            uniqueWorkloadObjects.forEach((workload: WorkloadObject, workloadIndex: number) => {
              const workloadX = -500;
              const workloadY = workloadStartY + workloadIndex * workloadSpacing;
              
              // Add workload node
              const workloadId = `workload-${workload.policy}-${workload.name}`;
              
              // Check if this workload node already exists
              if (!newNodes.some(node => node.id === workloadId)) {
                newNodes.push({
                  id: workloadId,
                  type: 'workloadNode',
                  position: { x: workloadX, y: workloadY },
                  data: { 
                    label: workload.name,
                    policy: workload.policy,
                    theme
                  },
                });
              }
              
              // Connect workload to policy
              newEdges.push({
                id: `workload-${workload.name}-to-policy-${workload.policy}`,
                source: workloadId,
                target: `policy-${workload.policy}`,
                type: 'smoothstep',
                style: { 
                  stroke: theme === 'dark' ? '#4B5563' : '#9CA3AF',
                  strokeWidth: 1,
                  opacity: 0.8
                },
              });
              
              // Direct connections from workloads to clusters
              const policy = policies.find((p: BindingPolicyInfo) => p.name === workload.policy);
              if (policy && policy.clusterList) {
                policy.clusterList.forEach((clusterName: string) => {
                  newEdges.push({
                    id: `workload-${workload.name}-to-cluster-${clusterName}-via-${workload.policy}`,
                    source: workloadId,
                    target: `cluster-${clusterName}`,
                    type: 'straight',
                    style: { 
                      stroke: '#3B82F6',
                      strokeWidth: 1,
                      strokeDasharray: '5,5',
                      opacity: highlightActive && policy.status !== 'Active' ? 0.2 : 0.4
                    },
                    animated: policy.status === 'Active',
                    markerEnd: {
                      type: MarkerType.Arrow,
                      color: '#3B82F6',
                    },
                  });
                });
              }
            });
          } else if (layout === 'vertical') {
            // Create workload nodes at the top
            const allWorkloads = policies.flatMap((policy: BindingPolicyInfo) => 
              policy.workloadList ? policy.workloadList.map((w: string) => ({ name: w, policy: policy.name })) : []
            );
            
            // Remove duplicates (if a workload is used by multiple policies)
            const uniqueWorkloadObjects = allWorkloads.filter((workload: { name: string, policy: string }, index: number, self: Array<{ name: string, policy: string }>) =>
              index === self.findIndex((w: { name: string, policy: string }) => w.name === workload.name)
            );
            
            const workloadSpacing = 150;
            
            // Calculate total width needed for workloads
            const totalWorkloadWidth = uniqueWorkloadObjects.length * workloadSpacing;
            const workloadStartX = -totalWorkloadWidth / 2;
            
            uniqueWorkloadObjects.forEach((workload: WorkloadObject, workloadIndex: number) => {
              const workloadX = workloadStartX + workloadIndex * workloadSpacing;
              const workloadY = -300;
              
              // Add workload node
              const workloadId = `workload-${workload.policy}-${workload.name}`;
              
              // Check if this workload node already exists
              if (!newNodes.some(node => node.id === workloadId)) {
                newNodes.push({
                  id: workloadId,
                  type: 'workloadNode',
                  position: { x: workloadX, y: workloadY },
                  data: { 
                    label: workload.name,
                    policy: workload.policy,
                    theme
                  },
                });
              }
              
              // Connect workload to policy
              newEdges.push({
                id: `workload-${workload.name}-to-policy-${workload.policy}`,
                source: workloadId,
                target: `policy-${workload.policy}`,
                type: 'smoothstep',
                style: { 
                  stroke: theme === 'dark' ? '#4B5563' : '#9CA3AF',
                  strokeWidth: 1,
                  opacity: 0.8
                },
              });
              
              // Direct connections from workloads to clusters
              const policy = policies.find((p: BindingPolicyInfo) => p.name === workload.policy);
              if (policy && policy.clusterList) {
                policy.clusterList.forEach((clusterName: string) => {
                  newEdges.push({
                    id: `workload-${workload.name}-to-cluster-${clusterName}-via-${workload.policy}`,
                    source: workloadId,
                    target: `cluster-${clusterName}`,
                    type: 'straight',
                    style: { 
                      stroke: '#3B82F6',
                      strokeWidth: 1,
                      strokeDasharray: '5,5',
                      opacity: highlightActive && policy.status !== 'Active' ? 0.2 : 0.4
                    },
                    animated: policy.status === 'Active',
                    markerEnd: {
                      type: MarkerType.Arrow,
                      color: '#3B82F6',
                    },
                  });
                });
              }
            });
          }
        }
        
        setNodes(newNodes);
        setEdges(newEdges);
        setLoading(false);
      }
    };

    generateGraph();
  }, [
    policies, 
    theme, 
    showWorkloads, 
    highlightActive, 
    setNodes, 
    setEdges, 
    uniqueClusters, 
    layout,
    propClusters,
    propWorkloads
  ] as const);

  return (
    <Box 
      sx={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        flex: 1,
        display: 'flex',
        '.react-flow': {
          flex: 1
        }
      }}
    >
      {loading ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          width: '100%',
          height: '100%'
        }}>
          <CircularProgress />
        </Box>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={2}
          onNodeClick={onNodeClick}
          style={{ width: '100%', height: '100%', background: 'transparent' }}
        >
          <Background color="#ffffff" gap={12} size={1} />
          <Controls />
          <CustomMiniMap theme={theme} />
          <FlowControls theme={theme} onLayoutChange={handleLayoutChange} />
          <SearchPanel nodes={nodes} theme={theme} onNodeSelect={(nodeId) => {
            setSelectedNodeId(nodeId);
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
              onNodeClick({} as React.MouseEvent, node);
            }
          }} />
          
          <Panel position="top-right">
            <Box 
              sx={{
                p: 1,
                borderRadius: 1,
                bgcolor: theme === 'dark' ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(4px)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: 1
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip 
                  size="small" 
                  label="Active Policy" 
                  sx={{ 
                    bgcolor: theme === 'dark' ? '#064E3B' : '#ECFDF5',
                    border: '1px solid #10B981'
                  }} 
                />
                <Chip 
                  size="small" 
                  label="Cluster" 
                  sx={{ 
                    bgcolor: theme === 'dark' ? '#1F2937' : '#fff',
                    border: '1px solid #6B7280'
                  }} 
                />
                <Chip 
                  size="small" 
                  label="Workload" 
                  sx={{ 
                    bgcolor: theme === 'dark' ? '#111827' : '#EFF6FF',
                    border: '1px solid #3B82F6'
                  }} 
                />
              </Box>
              
              <Box>
                <FormControlLabel 
                  control={
                    <Switch 
                      checked={showWorkloads} 
                      onChange={(e) => setShowWorkloads(e.target.checked)} 
                      size="small"
                    />
                  } 
                  label={<Typography variant="body2">Show Workloads</Typography>}
                />
              </Box>
              
              <Box>
                <FormControlLabel 
                  control={
                    <Switch 
                      checked={highlightActive} 
                      onChange={(e) => setHighlightActive(e.target.checked)} 
                      size="small"
                    />
                  } 
                  label={<Typography variant="body2">Highlight Active Policies</Typography>}
                />
              </Box>
            </Box>
          </Panel>
          
          <Panel position="top-left">
            <Tooltip title="This visualization shows how workloads are distributed to clusters through binding policies">
              <Typography 
                variant="h6" 
                sx={{ 
                  p: 2, 
                  background: theme === 'dark' ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)', 
                  borderRadius: 2,
                  backdropFilter: 'blur(4px)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
              >
                Binding Policy Workload Distribution
              </Typography>
            </Tooltip>
          </Panel>
        </ReactFlow>
      )}
    </Box>
  );
};

// Wrap the component with ReactFlowProvider
const BPVisualizationWrapper = ({ policies, clusters, workloads }: BPVisualizationProps) => {
  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlowProvider>
        <BPVisualization policies={policies} clusters={clusters} workloads={workloads} />
      </ReactFlowProvider>
    </Box>
  );
};

export default BPVisualizationWrapper;
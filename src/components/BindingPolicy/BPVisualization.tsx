import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
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
  BackgroundVariant,
  ReactFlowInstance,
  OnNodesChange,
  OnEdgesChange
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
  ButtonGroup,
  Paper
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as FitViewIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
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
            return theme === 'dark' ? '#3B82F6' : '#2563EB';
          case 'workloadNode':
            return theme === 'dark' ? '#60A5FA' : '#3B82F6';
          case 'clusterNode':
            return theme === 'dark' ? '#9CA3AF' : '#6B7280';
          default:
            return '#9CA3AF';
        }
      }}
      nodeStrokeWidth={3}
      nodeStrokeColor={() => {
        return theme === 'dark' ? '#1F2937' : '#FFFFFF';
      }}
      maskColor={theme === 'dark' ? 'rgba(17, 24, 39, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
      style={{
        backgroundColor: theme === 'dark' ? '#1F2937' : '#F9FAFB',
        border: '1px solid',
        borderColor: theme === 'dark' ? '#374151' : '#E5E7EB',
        borderRadius: '4px',
      }}
    />
  );
};

interface FlowControlsProps {
  theme: string;
  layout: 'radial' | 'horizontal' | 'vertical';
  onLayoutChange?: (layout: string) => void;
}

const FlowControls: React.FC<FlowControlsProps> = ({ theme, layout, onLayoutChange }) => {
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
          p: 1.5,
          borderRadius: 1,
          bgcolor: theme === 'dark' ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          border: '1px solid',
          borderColor: theme === 'dark' ? 'rgba(75, 85, 99, 0.4)' : 'rgba(229, 231, 235, 0.8)'
        }}
      >
        <Typography variant="subtitle2" sx={{ color: theme === 'dark' ? '#E5E7EB' : '#374151', fontWeight: 600, mb: 0.5 }}>
          View Controls
        </Typography>
        
        <Box>
          <Typography variant="caption" sx={{ color: theme === 'dark' ? '#D1D5DB' : '#4B5563', display: 'block', mb: 0.5, fontWeight: 500 }}>
          Zoom
        </Typography>
        
          <ButtonGroup size="small" variant="outlined" sx={{ 
            '& .MuiButton-root': {
              borderColor: theme === 'dark' ? 'rgba(75, 85, 99, 0.6)' : 'rgba(209, 213, 219, 0.8)',
              color: theme === 'dark' ? '#D1D5DB' : '#4B5563',
              '&:hover': {
                bgcolor: theme === 'dark' ? 'rgba(55, 65, 81, 0.5)' : 'rgba(243, 244, 246, 0.8)',
              }
            }
          }}>
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
        </Box>
        
        {onLayoutChange && (
          <Box>
            <Typography variant="caption" sx={{ color: theme === 'dark' ? '#D1D5DB' : '#4B5563', display: 'block', mb: 0.5, fontWeight: 500 }}>
              Layout
            </Typography>
            
            <ButtonGroup size="small" variant="outlined" sx={{ 
              '& .MuiButton-root': {
                borderColor: theme === 'dark' ? 'rgba(75, 85, 99, 0.6)' : 'rgba(209, 213, 219, 0.8)',
                color: theme === 'dark' ? '#D1D5DB' : '#4B5563',
                fontSize: '0.75rem',
                '&:hover': {
                  bgcolor: theme === 'dark' ? 'rgba(55, 65, 81, 0.5)' : 'rgba(243, 244, 246, 0.8)',
                }
              }
            }}>
              <Button 
                onClick={() => onLayoutChange('horizontal')}
                sx={{ 
                  bgcolor: layout === 'horizontal' ? (theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)') : 'transparent',
                  borderColor: layout === 'horizontal' ? '#3B82F6' : 'inherit',
                  '&:hover': {
                    bgcolor: layout === 'horizontal' ? (theme === 'dark' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)') : 'inherit'
                  }
                }}
              >
                Horizontal
              </Button>
              <Button 
                onClick={() => onLayoutChange('vertical')}
                sx={{ 
                  bgcolor: layout === 'vertical' ? (theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)') : 'transparent',
                  borderColor: layout === 'vertical' ? '#3B82F6' : 'inherit',
                  '&:hover': {
                    bgcolor: layout === 'vertical' ? (theme === 'dark' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)') : 'inherit'
                  }
                }}
              >
                Vertical
              </Button>
              <Button 
                onClick={() => onLayoutChange('radial')}
                sx={{ 
                  bgcolor: layout === 'radial' ? (theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)') : 'transparent',
                  borderColor: layout === 'radial' ? '#3B82F6' : 'inherit',
                  '&:hover': {
                    bgcolor: layout === 'radial' ? (theme === 'dark' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)') : 'inherit'
                  }
                }}
              >
                Radial
              </Button>
            </ButtonGroup>
          </Box>
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
  const { setCenter } = useReactFlow();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Node[]>([]);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Add keyboard shortcut (CMD+K or CTRL+K) to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Debounce search for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm, handleSearch]);

  const handleNodeSelect = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      const x = node.position.x;
      const y = node.position.y;
      setCenter(x, y, { duration: 800, zoom: 1.5 });
      onNodeSelect(nodeId);
      setShowResults(false);
      setSearchTerm('');
    }
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as unknown as HTMLElement)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <Panel position="top-left" style={{ marginTop: "70px" }}>
      <Box 
        sx={{
          p: 1.5,
          borderRadius: 1,
          bgcolor: theme === 'dark' ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          width: 300,
          position: 'relative',
          border: '1px solid',
          borderColor: theme === 'dark' ? 'rgba(75, 85, 99, 0.4)' : 'rgba(229, 231, 235, 0.8)'
        }}
      >
        <Typography variant="subtitle2" sx={{ color: theme === 'dark' ? '#E5E7EB' : '#374151', fontWeight: 600, mb: 1 }}>
          Search Resources
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              flex: 1, 
              border: '1px solid',
              borderColor: theme === 'dark' ? '#4B5563' : '#D1D5DB',
              borderRadius: '4px',
              overflow: 'hidden',
              bgcolor: theme === 'dark' ? '#374151' : '#FFFFFF',
              '&:focus-within': {
                borderColor: '#3B82F6',
                boxShadow: `0 0 0 2px ${theme === 'dark' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`
              }
            }}
          >
            <SearchIcon 
              fontSize="small" 
              sx={{ 
                ml: 1, 
                color: theme === 'dark' ? '#9CA3AF' : '#6B7280'
              }} 
            />
          <input
              ref={inputRef}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search nodes... (⌘+K)"
            style={{
              padding: '8px 12px',
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
              color: theme === 'dark' ? '#F9FAFB' : '#111827',
              width: '100%',
              fontSize: '0.875rem',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
                } else if (e.key === 'Escape') {
                  setShowResults(false);
              }
            }}
          />
            {searchTerm && (
              <IconButton 
                size="small" 
                onClick={() => setSearchTerm('')}
                sx={{ mr: 0.5, color: theme === 'dark' ? '#9CA3AF' : '#6B7280' }}
              >
                &times;
          </IconButton>
            )}
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <Chip 
            label="All" 
            size="small" 
            variant={!searchTerm ? "filled" : "outlined"}
            color={!searchTerm ? "primary" : "default"}
            onClick={() => setSearchTerm('')}
            sx={{ fontSize: '0.75rem' }}
          />
          <Chip 
            label="Policies" 
            size="small" 
            variant={searchTerm === 'policy' ? "filled" : "outlined"}
            color={searchTerm === 'policy' ? "primary" : "default"}
            onClick={() => setSearchTerm('policy')}
            sx={{ fontSize: '0.75rem' }}
          />
          <Chip 
            label="Clusters" 
            size="small" 
            variant={searchTerm === 'cluster' ? "filled" : "outlined"}
            color={searchTerm === 'cluster' ? "primary" : "default"}
            onClick={() => setSearchTerm('cluster')}
            sx={{ fontSize: '0.75rem' }}
          />
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
        
        {showResults && searchResults.length === 0 && searchTerm && (
          <Box sx={{ mt: 1, p: 1, borderRadius: '4px', bgcolor: theme === 'dark' ? 'rgba(31, 41, 55, 0.5)' : 'rgba(243, 244, 246, 0.8)' }}>
            <Typography variant="body2" sx={{ color: theme === 'dark' ? '#D1D5DB' : '#6B7280', fontSize: '0.875rem' }}>
              No nodes found matching "{searchTerm}"
            </Typography>
          </Box>
        )}
      </Box>
    </Panel>
  );
};

// Entity Details Panel component
interface EntityDetailsPanelProps {
  theme: string;
  isOpen: boolean;
  onClose: () => void;
  entity: {type: string; data: Record<string, unknown>} | null;
}

const EntityDetailsPanel: React.FC<EntityDetailsPanelProps> = ({
  theme,
  isOpen,
  onClose,
  entity
}) => {
  if (!isOpen || !entity) return null;
  
  return (
    <Paper
      sx={{
        position: 'absolute',
        right: 16,
        top: 80,
        width: 350,
        p: 2,
        zIndex: 10,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        bgcolor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
        border: '1px solid',
        borderColor: theme === 'dark' ? '#374151' : '#E5E7EB',
        borderRadius: 1
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontSize: '1rem' }}>
          {entity.type} Details
        </Typography>
        <IconButton size="small" onClick={onClose}>
          &times;
        </IconButton>
      </Box>
      
      <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
        {Object.entries(entity.data).map(([key, value]) => (
          <Box key={key} sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ color: theme === 'dark' ? '#D1D5DB' : '#6B7280', display: 'block' }}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Typography>
            <Typography variant="body2">
              {Array.isArray(value) ? value.join(', ') : String(value)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

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
  const [error, setError] = useState<string | null>(null);
  const [showWorkloads, setShowWorkloads] = useState<boolean>(true);
  const [highlightActive, setHighlightActive] = useState<boolean>(true);
  const [layout, setLayout] = useState<'radial' | 'horizontal' | 'vertical'>('horizontal');
  const [, setSelectedNodeId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [selectedEntity, setSelectedEntity] = useState<{type: string; data: Record<string, unknown>} | null>(null);
  const reactFlowInstance = useReactFlow();

  // Extract unique clusters and workloads from all policies
  const { uniqueClusters, uniqueWorkloads } = useMemo(() => {
    // Input validation
    if (!Array.isArray(policies)) {
      setError("Invalid policies data");
      return { uniqueClusters: [], uniqueWorkloads: [] };
    }
    
    const clusters = new Set<string>();
    const workloads = new Set<string>();
    
    policies.forEach((policy: BindingPolicyInfo) => {
      if (!policy) return;
      
      // Try to extract cluster names from the policy's matchedClusters property if it exists
      if ('matchedClusters' in policy && Array.isArray(policy.matchedClusters)) {
        policy.matchedClusters.forEach((cluster: { name: string }) => {
          if (cluster && cluster.name && !clusters.has(cluster.name)) {
            clusters.add(cluster.name);
          }
        });
      }
      
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

  // Function to handle node selection from search panel
  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      onNodeClick({} as React.MouseEvent, node);
    }
  }, [nodes, onNodeClick]);
  
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
        flexDirection: 'column',
        '.react-flow': {
          flex: 1,
          borderRadius: 1,
          overflow: 'hidden'
        }
      }}
    >
      {loading ? (
        <LoadingState theme={theme} />
      ) : error ? (
        <ErrorState message={error} theme={theme} />
      ) : (!Array.isArray(policies) || policies.length === 0) && 
           (!Array.isArray(propClusters) || propClusters.length === 0) && 
           (!Array.isArray(propWorkloads) || propWorkloads.length === 0) ? (
        <EmptyState theme={theme} />
      ) : (
        <>
          <VisualizationControls 
            theme={theme}
            policies={policies}
            uniqueClusters={uniqueClusters}
            uniqueWorkloads={uniqueWorkloads}
            showWorkloads={showWorkloads}
            setShowWorkloads={setShowWorkloads}
            highlightActive={highlightActive}
            setHighlightActive={setHighlightActive}
            setLoading={setLoading}
            reactFlowInstance={reactFlowInstance}
          />
          
          <VisualizationCanvas
            theme={theme}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            layout={layout}
            handleLayoutChange={handleLayoutChange}
            onNodeSelect={handleNodeSelect}
          />
          
          <EntityDetailsPanel
            theme={theme}
            isOpen={isDetailsOpen}
            onClose={() => setIsDetailsOpen(false)}
            entity={selectedEntity}
          />
        </>
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

// Error and Empty State components
const ErrorState: React.FC<{ message: string; theme: string }> = ({ message, theme }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        p: 3,
        textAlign: 'center',
        bgcolor: theme === 'dark' ? '#1F2937' : '#F9FAFB',
      }}
    >
      <Box
        sx={{
          bgcolor: theme === 'dark' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(220, 38, 38, 0.05)',
          borderRadius: '50%',
          p: 2,
          mb: 2,
          color: '#DC2626',
        }}
      >
        <Typography variant="h4" component="span">
          !
        </Typography>
      </Box>
      <Typography variant="h6" sx={{ mb: 1, color: theme === 'dark' ? '#F9FAFB' : '#111827' }}>
        Visualization Error
      </Typography>
      <Typography variant="body2" sx={{ color: theme === 'dark' ? '#D1D5DB' : '#6B7280', maxWidth: '400px' }}>
        {message || 'An error occurred while rendering the visualization.'}
      </Typography>
      <Button
        variant="outlined"
        color="primary"
        onClick={() => window.location.reload()}
        sx={{ mt: 2 }}
      >
        Reload
      </Button>
    </Box>
  );
};

const EmptyState: React.FC<{ theme: string }> = ({ theme }) => {
  return (
            <Box 
              sx={{
                display: 'flex',
                flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        p: 3,
        textAlign: 'center',
        bgcolor: theme === 'dark' ? '#1F2937' : '#F9FAFB',
      }}
    >
      <Box
                  sx={{ 
          bgcolor: theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
          borderRadius: '50%',
          p: 2,
          mb: 2,
          color: '#3B82F6',
        }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 6V4M12 6C10.8954 6 10 6.89543 10 8C10 9.10457 10.8954 10 12 10M12 6C13.1046 6 14 6.89543 14 8C14 9.10457 13.1046 10 12 10M12 10V20M7 20H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </Box>
      <Typography variant="h6" sx={{ mb: 1, color: theme === 'dark' ? '#F9FAFB' : '#111827' }}>
        No Visualization Data
      </Typography>
      <Typography variant="body2" sx={{ color: theme === 'dark' ? '#D1D5DB' : '#6B7280', maxWidth: '400px' }}>
        There are no binding policies, clusters, or workloads to visualize. Create some resources to see them in this view.
      </Typography>
    </Box>
  );
};

const LoadingState: React.FC<{ theme: string }> = ({ theme }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        p: 3,
        bgcolor: theme === 'dark' ? '#1F2937' : '#F9FAFB',
      }}
    >
      <CircularProgress size={40} sx={{ mb: 2 }} />
      <Typography variant="subtitle1" sx={{ color: theme === 'dark' ? '#F9FAFB' : '#111827' }}>
        Loading visualization...
      </Typography>
    </Box>
  );
};

// VisualizationControls component for the top header section
interface VisualizationControlsProps {
  theme: string;
  policies: BindingPolicyInfo[];
  uniqueClusters: string[];
  uniqueWorkloads: string[];
  showWorkloads: boolean;
  setShowWorkloads: (show: boolean) => void;
  highlightActive: boolean;
  setHighlightActive: (highlight: boolean) => void;
  setLoading: (loading: boolean) => void;
  reactFlowInstance: ReactFlowInstance;
}

const VisualizationControls: React.FC<VisualizationControlsProps> = ({
  theme,
  policies,
  uniqueClusters,
  uniqueWorkloads,
  showWorkloads,
  setShowWorkloads,
  highlightActive,
  setHighlightActive,
  setLoading,
  reactFlowInstance
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        mb: 2,
        p: 1.5,
        borderRadius: 1,
        boxShadow: theme === 'dark' 
          ? '0 1px 3px rgba(0,0,0,0.24)' 
          : '0 1px 3px rgba(0,0,0,0.12)',
        bgcolor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        border: '1px solid',
        borderColor: theme === 'dark' ? 'rgba(75, 85, 99, 0.4)' : 'rgba(229, 231, 235, 0.8)'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600, mr: 2 }}>
          Binding Policy Network
        </Typography>
        
        <Chip 
          size="small" 
          label={`${policies.length} Policies`}
          sx={{ mr: 1, bgcolor: theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }} 
                />
                <Chip 
                  size="small" 
          label={`${uniqueClusters.length} Clusters`}
          sx={{ mr: 1, bgcolor: theme === 'dark' ? 'rgba(107, 114, 128, 0.15)' : 'rgba(107, 114, 128, 0.1)', color: '#6B7280' }} 
        />
        {uniqueWorkloads && uniqueWorkloads.length > 0 && (
                <Chip 
                  size="small" 
            label={`${uniqueWorkloads.length} Workloads`}
            sx={{ bgcolor: theme === 'dark' ? 'rgba(96, 165, 250, 0.15)' : 'rgba(96, 165, 250, 0.1)', color: '#60A5FA' }} 
          />
        )}
              </Box>
              
      <Box sx={{ display: 'flex', alignItems: 'center', mt: { xs: 1, sm: 0 } }}>
                <FormControlLabel 
                  control={
                    <Switch 
                      checked={showWorkloads} 
                      onChange={(e) => setShowWorkloads(e.target.checked)} 
                      size="small"
              color="primary"
                    />
                  } 
                  label={<Typography variant="body2">Show Workloads</Typography>}
          sx={{ mr: 2 }}
                />
              
                <FormControlLabel 
                  control={
                    <Switch 
                      checked={highlightActive} 
                      onChange={(e) => setHighlightActive(e.target.checked)} 
                      size="small"
              color="primary"
            />
          } 
          label={<Typography variant="body2">Highlight Active</Typography>}
        />
        
        <Tooltip title="Refresh visualization">
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 500);
            }}
            sx={{ ml: 2, mr: 1 }}
          >
            Refresh
          </Button>
            </Tooltip>
        
        <Button
          size="small"
          variant="outlined"
          startIcon={<FitViewIcon />}
          onClick={() => reactFlowInstance?.fitView({ padding: 0.2, duration: 800 })}
        >
          Fit View
        </Button>
    </Box>
    </Paper>
  );
};

// VisualizationCanvas component for the main ReactFlow canvas
interface VisualizationCanvasProps {
  theme: string;
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  nodeTypes: NodeTypes;
  layout: 'radial' | 'horizontal' | 'vertical';
  handleLayoutChange: (layout: string) => void;
  onNodeSelect: (nodeId: string) => void;
}

const VisualizationCanvas: React.FC<VisualizationCanvasProps> = ({
  theme,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  nodeTypes,
  layout,
  handleLayoutChange,
  onNodeSelect
}) => {
  return (
    <Box sx={{ flex: 1, position: 'relative', borderRadius: 1, overflow: 'hidden' }}>
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
        style={{ 
          width: '100%', 
          height: '100%', 
          background: theme === 'dark' ? '#111827' : '#F9FAFB' 
        }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true
        }}
      >
        <Background 
          color={theme === 'dark' ? '#374151' : '#E5E7EB'} 
          gap={16} 
          size={1} 
          variant={BackgroundVariant.Dots}
        />
        <Controls 
          style={{
            display: 'none' // Using custom controls instead
          }}
        />
        <CustomMiniMap theme={theme} />
        <FlowControls theme={theme} layout={layout} onLayoutChange={handleLayoutChange} />
        <SearchPanel nodes={nodes} theme={theme} onNodeSelect={onNodeSelect} />
        
        <Panel position="bottom-right">
          <Box 
            sx={{
              p: 1.5,
              borderRadius: 1,
              bgcolor: theme === 'dark' ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              mb: 2,
              mr: 2,
              border: '1px solid',
              borderColor: theme === 'dark' ? 'rgba(75, 85, 99, 0.4)' : 'rgba(229, 231, 235, 0.8)'
            }}
          >
            <Typography variant="subtitle2" sx={{ color: theme === 'dark' ? '#E5E7EB' : '#374151', fontWeight: 600, mb: 0.5 }}>
              Legend
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 16, 
                height: 16, 
                borderRadius: '50%', 
                bgcolor: theme === 'dark' ? '#3B82F6' : '#2563EB',
                border: '1px solid',
                borderColor: theme === 'dark' ? '#2563EB' : '#1D4ED8'
              }} />
              <Typography variant="body2">Active Policy</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 16, 
                height: 16, 
                borderRadius: '50%', 
                bgcolor: theme === 'dark' ? '#9CA3AF' : '#6B7280',
                border: '1px solid',
                borderColor: theme === 'dark' ? '#6B7280' : '#4B5563'
              }} />
              <Typography variant="body2">Cluster</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 16, 
                height: 16, 
                borderRadius: '50%', 
                bgcolor: theme === 'dark' ? '#60A5FA' : '#3B82F6',
                border: '1px solid',
                borderColor: theme === 'dark' ? '#3B82F6' : '#2563EB'
              }} />
              <Typography variant="body2">Workload</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 40, 
                height: 4, 
                bgcolor: '#10B981',
                borderRadius: 1
              }} />
              <Typography variant="body2">Active Connection</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 40, 
                height: 4, 
                bgcolor: '#9CA3AF',
                borderRadius: 1
              }} />
              <Typography variant="body2">Inactive Connection</Typography>
            </Box>
          </Box>
        </Panel>
      </ReactFlow>
    </Box>
  );
};

export default BPVisualizationWrapper;
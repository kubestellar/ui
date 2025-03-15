import React, { useEffect, useState, useCallback, useRef } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Box, Alert, Typography, Grid, Snackbar, Chip,  Paper,  Button,  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, FormControlLabel, Switch } from '@mui/material';
import { BindingPolicyInfo, Workload, ManagedCluster } from '../../types/bindingPolicy';
import { usePolicyDragDropStore, DragTypes } from '../../stores/policyDragDropStore';
import { useCanvasStore } from '../../stores/canvasStore';
import PolicyCanvas from './PolicyCanvas';
import SuccessNotification from './SuccessNotification';
import ConfigurationSidebar, { PolicyConfiguration } from './ConfigurationSidebar';
import { useKubestellarData } from '../../hooks/useKubestellarData';
import InfoIcon from '@mui/icons-material/Info';
import AddLinkIcon from '@mui/icons-material/AddLink';
import LinkIcon from '@mui/icons-material/Link';
import ClusterPanel from './ClusterPanel';
import WorkloadPanel from './WorkloadPanel';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DeploymentConfirmationDialog, { DeploymentPolicy } from './DeploymentConfirmationDialog';
import { v4 as uuidv4 } from 'uuid';
import { generateBindingPolicyYAML } from '../../utils/yamlGenerator';
import { alpha } from '@mui/material/styles';

// StrictMode-compatible DragDropContext wrapper
const StrictModeDragDropContext: React.FC<any> = ({ children, ...props }) => {
  const [enabled, setEnabled] = useState(false);
  
  useEffect(() => {
    // Use requestAnimationFrame to delay rendering until after the first animation frame
    const animation = requestAnimationFrame(() => {
      setEnabled(true);
      console.log("🔄 DragDropContext enabled after animation frame");
    });
    
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
      console.log("🔄 DragDropContext disabled");
    };
  }, []);
  
  if (!enabled) {
    return null;
  }
  
  return <DragDropContext {...props}>{children}</DragDropContext>;
};

interface PolicyDragDropProps {
  policies?: BindingPolicyInfo[];
  clusters?: ManagedCluster[];
  workloads?: Workload[];
  onPolicyAssign?: (policyName: string, targetType: 'cluster' | 'workload', targetName: string) => void;
  onCreateBindingPolicy?: (clusterId: string, workloadId: string, configuration?: PolicyConfiguration) => void;
}

// Quick policy creator dialog
interface QuickPolicyDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (policy: PolicyConfiguration) => void;
  connection: {
    workloadName: string;
    workloadNamespace: string;
    clusterName: string;
  } | null;
}

const QuickPolicyDialog: React.FC<QuickPolicyDialogProps> = ({ open, onClose, onSave, connection }) => {
  const [name, setName] = useState('');
  const [namespace, setNamespace] = useState('default');
  const [propagationMode, setPropagationMode] = useState<'DownsyncOnly' | 'UpsyncOnly' | 'BidirectionalSync'>('DownsyncOnly');
  const [updateStrategy, setUpdateStrategy] = useState<'ServerSideApply' | 'ForceApply' | 'RollingUpdate' | 'BlueGreenDeployment'>('ServerSideApply');
  const [addLabels, setAddLabels] = useState(true);
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});
  const [labelKey, setLabelKey] = useState('');
  const [labelValue, setLabelValue] = useState('');

  // Initialize form when connection changes
  useEffect(() => {
    if (connection) {
      setName(`${connection.workloadName}-to-${connection.clusterName}`);
      setNamespace(connection.workloadNamespace || 'default');
    }
  }, [connection]);

  const handleAddLabel = () => {
    if (labelKey && labelValue) {
      setCustomLabels({
        ...customLabels,
        [labelKey]: labelValue
      });
      setLabelKey('');
      setLabelValue('');
    }
  };

  const handleRemoveLabel = (key: string) => {
    const newLabels = { ...customLabels };
    delete newLabels[key];
    setCustomLabels(newLabels);
  };

  const handleSave = () => {
    if (!name || !namespace) return;
    
    onSave({
      name,
      namespace,
      propagationMode: propagationMode as 'DownsyncOnly' | 'UpsyncOnly' | 'BidirectionalSync',
      updateStrategy: updateStrategy as 'ServerSideApply' | 'ForceApply' | 'RollingUpdate' | 'BlueGreenDeployment',
      customLabels,
      deploymentType: 'SelectedClusters',
      schedulingRules: [],
      tolerations: []
    });
    
    // Reset form
    setName('');
    setNamespace('default');
    setPropagationMode('DownsyncOnly');
    setUpdateStrategy('ServerSideApply');
    setCustomLabels({});
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Binding Policy</DialogTitle>
      <DialogContent>
        {connection && (
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Creating connection:
            </Typography>
            <Chip 
              size="small" 
              label={connection.workloadName} 
              color="success" 
            />
            <ArrowForwardIcon fontSize="small" color="action" />
            <Chip 
              size="small" 
              label={connection.clusterName}
              color="info" 
            />
          </Box>
        )}
        
        <TextField
          autoFocus
          margin="dense"
          label="Policy Name"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
        />
        
        <TextField
          margin="dense"
          label="Namespace"
          fullWidth
          value={namespace}
          onChange={(e) => setNamespace(e.target.value)}
          sx={{ mb: 2 }}
        />
        
        <TextField
          select
          margin="dense"
          label="Propagation Mode"
          fullWidth
          value={propagationMode}
          onChange={(e) => setPropagationMode(e.target.value as 'DownsyncOnly' | 'UpsyncOnly' | 'BidirectionalSync')}
          sx={{ mb: 2 }}
        >
          <MenuItem value="DownsyncOnly">Downsync Only</MenuItem>
          <MenuItem value="UpsyncOnly">Upsync Only</MenuItem>
          <MenuItem value="BidirectionalSync">Bidirectional Sync</MenuItem>
        </TextField>
        
        <TextField
          select
          margin="dense"
          label="Update Strategy"
          fullWidth
          value={updateStrategy}
          onChange={(e) => setUpdateStrategy(e.target.value as 'ServerSideApply' | 'ForceApply' | 'RollingUpdate' | 'BlueGreenDeployment')}
          sx={{ mb: 2 }}
        >
          <MenuItem value="ServerSideApply">Server Side Apply</MenuItem>
          <MenuItem value="ForceApply">Force Apply</MenuItem>
          <MenuItem value="RollingUpdate">Rolling Update</MenuItem>
          <MenuItem value="BlueGreenDeployment">Blue-Green Deployment</MenuItem>
        </TextField>
        
        <FormControlLabel
          control={
            <Switch 
              checked={addLabels} 
              onChange={(e) => setAddLabels(e.target.checked)} 
            />
          }
          label="Add custom labels"
          sx={{ mb: 1 }}
        />
        
        {addLabels && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', mb: 1 }}>
              <TextField
                size="small"
                label="Key"
                value={labelKey}
                onChange={(e) => setLabelKey(e.target.value)}
                sx={{ mr: 1, flexGrow: 1 }}
              />
              <TextField
                size="small"
                label="Value"
                value={labelValue}
                onChange={(e) => setLabelValue(e.target.value)}
                sx={{ mr: 1, flexGrow: 1 }}
              />
              <Button onClick={handleAddLabel} disabled={!labelKey || !labelValue}>
                Add
              </Button>
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(customLabels).map(([key, value]) => (
                <Chip
                  key={key}
                  label={`${key}: ${value}`}
                  onDelete={() => handleRemoveLabel(key)}
                  size="small"
                  icon={<LocalOfferIcon fontSize="small" />}
                />
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary" disabled={!name || !namespace}>
          Create Policy
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const PolicyDragDrop: React.FC<PolicyDragDropProps> = ({
  policies: propPolicies,
  clusters: propClusters,
  workloads: propWorkloads,
  onPolicyAssign,
  onCreateBindingPolicy
}) => {
  console.log('🔄 PolicyDragDrop component rendering', {
    hasPropPolicies: !!propPolicies,
    hasPropClusters: !!propClusters,
    hasPropWorkloads: !!propWorkloads,
    hasOnPolicyAssign: !!onPolicyAssign,
    hasOnCreateBindingPolicy: !!onCreateBindingPolicy
  });

  // State for drag info notification
  //const [dragInfoOpen, setDragInfoOpen] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string>("");
  
  // State for the configuration sidebar
  const [configSidebarOpen, setConfigSidebarOpen] = useState(false);
  const [selectedConnection,] = useState<{
    source: { type: string; id: string; name: string };
    target: { type: string; id: string; name: string };
  } | undefined>(undefined);
  
  // State for the connection mode
  const [connectionMode, setConnectionMode] = useState(false);
  
  // Add a useEffect to log connection mode changes
  useEffect(() => {
    console.log(`🔥 CONNECTION MODE CHANGED TO: ${connectionMode ? 'ENABLED' : 'DISABLED'}`);
  }, [connectionMode]);
  
  // Create a safer function to toggle connection mode
  const toggleConnectionMode = useCallback(() => {
    console.log('🔄 Toggling connection mode...');
    setConnectionMode(prevMode => {
      const newMode = !prevMode;
      console.log(`🔄 Connection mode changing from ${prevMode} to ${newMode}`);
      return newMode;
    });
    
    // Clear any active connection
    setActiveConnection({
      source: null,
      sourceType: null,
      mouseX: 0,
      mouseY: 0
    });
    
    // Clear any warning
    setInvalidConnectionWarning(null);
  }, []);
  
  const [activeConnection, setActiveConnection] = useState<{
    source: string | null;
    sourceType: string | null;
    mouseX: number;
    mouseY: number;
  }>({
    source: null,
    sourceType: null,
    mouseX: 0,
    mouseY: 0
  });
  
  // State for quick policy creation
  const [quickPolicyDialogOpen, setQuickPolicyDialogOpen] = useState(false);
  const [currentConnection, setCurrentConnection] = useState<{
    workloadName: string;
    workloadNamespace: string;
    clusterName: string;
  } | null>(null);
  
  // State for invalid connection warning
  const [invalidConnectionWarning, setInvalidConnectionWarning] = useState<string | null>(null);
  
  // Use refs to track if mounted and data fetched to prevent unnecessary renders
  const isMounted = useRef(true);
  const dataFetchedRef = useRef<boolean>(false);
  
  // Determine if we need to fetch data
  const needsFetchData = !propPolicies || !propClusters || !propWorkloads;
  
  // Memoize the onDataLoaded callback
  const handleDataLoaded = useCallback(() => {
    if (isMounted.current) {
      dataFetchedRef.current = true;
      console.log('🔄 Data loaded from hook');
    }
  }, []);
  
  // Use our data hook only if props are not provided and we haven't fetched data yet
  const { 
    data: hookData,
    loading: hookLoading,
    error: hookError
  } = (needsFetchData && !dataFetchedRef.current)
    ? useKubestellarData({ onDataLoaded: handleDataLoaded })
    : { 
        data: { policies: [], clusters: [], workloads: [] }, 
        loading: { policies: false, workloads: false, clusters: false },
        error: { policies: undefined, clusters: undefined, workloads: undefined }
      };

  // Use props if provided, otherwise use hook data
  const policies = propPolicies || hookData.policies || [];
  const clusters = propClusters || hookData.clusters || [];
  const workloads = propWorkloads || hookData.workloads || [];
  
  // If props are provided, we're not loading
  const loading = propPolicies && propClusters && propWorkloads 
    ? { policies: false, workloads: false, clusters: false }
    : hookLoading;
  
  const error = hookError;
  
  // Use individual store values to prevent recreating objects on each render
  const initializeAssignmentMap = usePolicyDragDropStore(state => state.initializeAssignmentMap);
  const setActiveDragItem = usePolicyDragDropStore(state => state.setActiveDragItem);
  const addToCanvas = usePolicyDragDropStore(state => state.addToCanvas);
 // const assignPolicy = usePolicyDragDropStore(state => state.assignPolicy);
  const canvasEntities = usePolicyDragDropStore(state => state.canvasEntities);
  const assignLabelsToItem = usePolicyDragDropStore(state => state.assignLabelsToItem);
  const setStoreSuccessMessage = usePolicyDragDropStore(state => state.setSuccessMessage);
  
  // Canvas store for connections
 // const setConnectionLines = useCanvasStore(state => state.setConnectionLines);
  const connectionLines = useCanvasStore(state => state.connectionLines);
  const addConnectionLine = useCanvasStore(state => state.addConnectionLine);
  
  // Add a ref to track previous policies
  const prevPoliciesRef = useRef<BindingPolicyInfo[]>([]);
  
  // Add state for deployment confirmation dialog
  const [deploymentDialogOpen, setDeploymentDialogOpen] = useState(false);
  const [deploymentLoading, setDeploymentLoading] = useState(false);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [policiesToDeploy, setPoliciesToDeploy] = useState<DeploymentPolicy[]>([]);
  
  // Log component mount/unmount for debugging
  useEffect(() => {
    console.log('🔵 PolicyDragDrop component mounted');
    
    return () => {
      console.log('🔴 PolicyDragDrop component unmounting');
      isMounted.current = false;
    };
  }, []);
  
  // Initialize assignment map based on existing policy configurations
  useEffect(() => {
    console.log('🔄 Assignment map effect running with policies:', policies?.length);
    
    if (!initializeAssignmentMap || !policies || policies.length === 0) {
      console.log('⏭️ Skipping assignment map initialization - missing data');
      return;
    }
    
    // Check if policies have changed to avoid unnecessary updates
    const hasChanged = () => {
      if (!prevPoliciesRef.current || prevPoliciesRef.current.length !== policies.length) {
        console.log('✅ Policies changed - different count');
        return true;
      }
      
      const changed = policies.some((policy, i) => {
        const prevPolicy = prevPoliciesRef.current[i];
        const changed = !prevPolicy || 
               prevPolicy.name !== policy.name ||
               (prevPolicy.clusterList?.length !== policy.clusterList?.length) ||
               (prevPolicy.workloadList?.length !== policy.workloadList?.length);
        if (changed) {
          console.log(`✅ Policy changed: ${policy.name}`);
        }
        return changed;
      });
      
      return changed;
    };
    
    if (hasChanged()) {
      console.log('🔄 Initializing assignment map with policies:', policies.map(p => p.name).join(', '));
      initializeAssignmentMap(policies);
      prevPoliciesRef.current = [...policies];
    } else {
      console.log('⏭️ Assignment map unchanged - skipping update');
    }
  }, [policies, initializeAssignmentMap]);

  // Handle canvas item selection for configuration
//   const handleCanvasItemSelect = useCallback((
//     sourceType: string, 
//     sourceId: string, 
//     sourceName: string, 
//     targetType: string, 
//     targetId: string, 
//     targetName: string
//   ) => {
//     setSelectedConnection({
//       source: { type: sourceType, id: sourceId, name: sourceName },
//       target: { type: targetType, id: targetId, name: targetName }
//     });
    
//     setConfigSidebarOpen(true);
//   }, []);

  // Handle tracking the active drag item
  const handleDragStart = useCallback((start: any) => {
    console.log('🔄 DRAG START EVENT', start);
    
    if (!setActiveDragItem) {
      console.error('❌ setActiveDragItem is not defined');
      return;
    }
    
    const draggedItemId = start.draggableId;
    console.log('🔄 Drag started with item:', draggedItemId);
    
    // Extract the item type and ID properly, handling names with dashes
    const itemTypeMatch = draggedItemId.match(/^(policy|cluster|workload)-(.+)$/);
    if (!itemTypeMatch) {
      console.error('❌ Invalid draggable ID format:', draggedItemId);
      return;
    }
    
    const itemType = itemTypeMatch[1];
    const itemId = itemTypeMatch[2];
    
    let dragType = '';
    
    if (itemType === 'policy') {
      dragType = DragTypes.POLICY;
    } else if (itemType === 'cluster') {
      dragType = DragTypes.CLUSTER;
    } else if (itemType === 'workload') {
      dragType = DragTypes.WORKLOAD;
    }
    
    console.log(`🔄 Drag item type identified: ${dragType}`);
    
    setActiveDragItem({ 
      type: dragType, 
      id: itemId 
    });
    
    console.log('✅ Active drag item set successfully');
  }, [setActiveDragItem]);
  
  // Handle when a drag operation is completed
  const handleDragEnd = useCallback((result: DropResult) => {
    console.log('🔄 DRAG END EVENT', result);
    
    // Clear the active drag item
    if (setActiveDragItem) {
    setActiveDragItem(null);
    }
    
    // If no destination, the drag was cancelled
    if (!result.destination) {
      console.log('⏭️ Drag cancelled - no destination');
      return;
    }

    // Determine the source and destination
    const {  destination, draggableId } = result;
    
    // Identify the item being dragged
    const itemTypeMatch = draggableId.match(/^(policy|cluster|workload)-(.+)$/);
    if (!itemTypeMatch) {
      console.error('❌ Invalid draggable ID format:', draggableId);
      return;
    }
    
    const itemType = itemTypeMatch[1];
    const itemId = itemTypeMatch[2];
    
    console.log(`🔄 Item type: ${itemType}, Item ID: ${itemId}`);
    
    // From panel to canvas
    if (destination.droppableId === 'canvas') {
      console.log(`🔄 Adding ${itemType} ${itemId} to canvas`);
      
      if (addToCanvas) {
        // Determine item type for adding to canvas
        if (itemType === 'cluster' || itemType === 'workload') {
          addToCanvas(itemType, itemId);
        }
      }
    }
    
    console.log('✅ Drag end processing completed');
  }, [setActiveDragItem, addToCanvas]);

  // Handle completing a connection in connection mode
  const handleCompleteConnection = useCallback((workloadId: string, clusterId: string) => {
    console.log(`🚨 handleCompleteConnection called with workloadId=${workloadId}, clusterId=${clusterId}`);
    console.log(`🚨 Available workloads:`, workloads.map(w => w.name));
    console.log(`🚨 Available clusters:`, clusters.map(c => c.name));
    
    if (!workloadId || !clusterId) {
      console.error("❌ Missing workload or cluster ID");
      return;
    }
    
    // Find workload and cluster details - with enhanced handling for hyphenated names
    // Try exact matching first
    let workload = workloads.find(w => w.name === workloadId);
    const cluster = clusters.find(c => c.name === clusterId);
    
    // If workload wasn't found with exact match, try checking if it's a partial match
    // This handles cases where only part of a hyphenated name was passed
    if (!workload) {
      console.log(`⚠️ Workload "${workloadId}" not found with exact match, trying partial match...`);
      workload = workloads.find(w => 
        w.name.includes(workloadId) || 
        workloadId.includes(w.name)
      );
      
      if (workload) {
        console.log(`✅ Found workload with partial match: ${workload.name}`);
      }
    }
    
    console.log(`🔄 Found workload:`, workload, `and cluster:`, cluster);
    
    if (!workload || !cluster) {
      console.error("❌ Could not find workload or cluster");
      console.error(`❌ Looked for workload "${workloadId}" and cluster "${clusterId}"`);
      
      // Show an error message
      setInvalidConnectionWarning(`Could not find ${!workload ? 'workload' : 'cluster'} with the specified ID. Please try again.`);
      return;
    }
    
    // Use the actual workload name from the found object to ensure consistency
    const actualWorkloadName = workload.name;
    const actualClusterName = cluster.name;
    
    // Open quick policy dialog with connection information
    console.log(`✅ Setting up connection dialog for ${actualWorkloadName} to ${actualClusterName}`);
    
    setCurrentConnection({
      workloadName: actualWorkloadName,
      workloadNamespace: workload.namespace || 'default',
      clusterName: actualClusterName
    });
    
    // Add connection to the canvas if not already present
    if (addConnectionLine) {
      console.log(`🔄 Adding connection line for workload-${actualWorkloadName} to cluster-${actualClusterName}`);
      addConnectionLine(`workload-${actualWorkloadName}`, `cluster-${actualClusterName}`, '#9c27b0');
    } else {
      console.error('❌ addConnectionLine is not available!');
    }
    
    // Open the quick policy dialog
    console.log('🚨 Opening quick policy dialog');
    setQuickPolicyDialogOpen(true);
    
    // Clear active connection
    setActiveConnection({
      source: null,
      sourceType: null,
      mouseX: 0,
      mouseY: 0
    });
  }, [workloads, clusters, addConnectionLine, setInvalidConnectionWarning]);

  // Handle saving configuration from the sidebar
  const handleSaveConfiguration = useCallback((config: PolicyConfiguration) => {
    console.log('Saving policy configuration:', config);
    
    if (!selectedConnection) {
      console.error('No connection selected for configuration');
      return;
    }
    
    if (!onCreateBindingPolicy) {
      console.error('onCreateBindingPolicy function not provided');
      return;
    }
    
    let workloadId = '';
    let clusterId = '';
    
    // Find the workload and cluster IDs from the connection
    if (selectedConnection.source.type === 'workload') {
      workloadId = selectedConnection.source.id;
      clusterId = selectedConnection.target.id;
        } else {
      workloadId = selectedConnection.target.id;
      clusterId = selectedConnection.source.id;
    }
      
    // Create binding policy with the configuration
    onCreateBindingPolicy(clusterId, workloadId, config);
    
    // Show success message with details about scheduling rules
    let detailedMessage = `Successfully created binding policy: ${config.name}`;
    if (config.schedulingRules && config.schedulingRules.length > 0) {
      detailedMessage += ` with ${config.schedulingRules.length} scheduling rules`;
    }
    
    setSuccessMessage(detailedMessage);
    if (setStoreSuccessMessage) {
      setStoreSuccessMessage(detailedMessage);
    }
    
    // Assign any custom labels to the workload and cluster
    if (assignLabelsToItem && Object.keys(config.customLabels).length > 0) {
      assignLabelsToItem('workload', workloadId, config.customLabels);
      assignLabelsToItem('cluster', clusterId, config.customLabels);
    }
    
    // Create a connection line to represent this new policy
    if (addConnectionLine) {
     // const newPolicyName = config.name;
      // The color can be based on the update strategy
      const connectionColor = 
        config.updateStrategy === 'RollingUpdate' ? '#2196f3' : // Blue for rolling updates
        config.updateStrategy === 'BlueGreenDeployment' ? '#009688' : // Teal for blue-green
        config.updateStrategy === 'ForceApply' ? '#ff9800' : // Orange for force apply
        '#9c27b0'; // Default purple for standard updates
        
      addConnectionLine(
        `workload-${workloadId}`, 
        `cluster-${clusterId}`, 
        connectionColor
      );
    }
    
    // Close the sidebar
    setConfigSidebarOpen(false);
    
    console.log('✅ Binding policy created with advanced configuration:', {
      workloadId,
      clusterId,
      name: config.name,
      namespace: config.namespace,
      propagationMode: config.propagationMode,
      updateStrategy: config.updateStrategy,
      deploymentType: config.deploymentType,
      schedulingRules: config.schedulingRules,
      tolerations: config.tolerations,
      labels: config.customLabels
    });
  }, [selectedConnection, onCreateBindingPolicy, assignLabelsToItem, setStoreSuccessMessage, addConnectionLine]);

  // Handle quick policy creation
  const handleQuickPolicySave = useCallback((config: PolicyConfiguration) => {
    console.log(`🔄 handleQuickPolicySave called with config:`, config);
    
    if (!currentConnection) {
      console.error("❌ No current connection");
      return;
    }
    
    // Find the workload and cluster
    const workload = workloads.find(w => w.name === currentConnection.workloadName);
    const cluster = clusters.find(c => c.name === currentConnection.clusterName);
    
    console.log(`🔄 Found workload:`, workload, `and cluster:`, cluster);
    
    if (!workload || !cluster) {
      console.error("❌ Could not find workload or cluster");
      return;
    }
    
    // Call the API to create the binding policy
    if (onCreateBindingPolicy) {
      console.log(`🔄 Calling onCreateBindingPolicy with cluster=${cluster.name}, workload=${workload.name}, config:`, config);
      
      // In this demo, we'll simulate the API call
      setTimeout(() => {
        // Add the workload and cluster to the canvas if they're not already there
        if (addToCanvas) {
          addToCanvas('workload', workload.name);
          addToCanvas('cluster', cluster.name);
        }
        
        // Add a connection line to represent this binding policy
        if (addConnectionLine) {
          console.log(`🔄 Adding connection line for workload-${workload.name} to cluster-${cluster.name}`);
          addConnectionLine(`workload-${workload.name}`, `cluster-${cluster.name}`, '#9c27b0');
        }
        
        // Show success message
        setSuccessMessage(`Successfully created binding policy "${config.name}" connecting ${workload.name} to ${cluster.name}`);
      }, 500);
    }
    
    // Close the dialog
    setQuickPolicyDialogOpen(false);
    
    // Reset connection mode
    setConnectionMode(false);
    
    console.log('✅ Quick policy created with configuration:', {
      workloadName: currentConnection.workloadName,
      clusterName: currentConnection.clusterName,
      name: config.name,
      namespace: config.namespace,
      propagationMode: config.propagationMode,
      updateStrategy: config.updateStrategy,
      deploymentType: config.deploymentType,
      schedulingRules: config.schedulingRules,
      tolerations: config.tolerations,
      labels: config.customLabels
    });
  }, [currentConnection, workloads, clusters, onCreateBindingPolicy, addToCanvas, addConnectionLine, setSuccessMessage]);

  // Function to prepare policies for deployment
  const prepareForDeployment = useCallback(() => {
    // Generate policies from connection lines
    const policies: DeploymentPolicy[] = connectionLines.map(line => {
      // Extract workload and cluster IDs from the connection line
      const workloadId = line.source.startsWith('workload-') 
        ? line.source.replace('workload-', '') 
        : line.target.replace('workload-', '');
      
      const clusterId = line.source.startsWith('cluster-') 
        ? line.source.replace('cluster-', '') 
        : line.target.replace('cluster-', '');
      
      // Find the workload and cluster
      const workload = workloads.find(w => w.name === workloadId);
      const cluster = clusters.find(c => c.name === clusterId);
      
      if (!workload || !cluster) {
        console.error('Could not find workload or cluster for connection:', line);
        return null;
      }
      
      // Create a unique policy name if it doesn't exist
      const policyName = `${workload.name}-to-${cluster.name}`;
      
      // Create a default configuration
      const config: PolicyConfiguration = {
        name: policyName,
        namespace: workload.namespace || 'default',
        propagationMode: 'DownsyncOnly',
        updateStrategy: line.color === '#2196f3' ? 'RollingUpdate' :
                      line.color === '#009688' ? 'BlueGreenDeployment' :
                      line.color === '#ff9800' ? 'ForceApply' : 'ServerSideApply',
        deploymentType: 'SelectedClusters',
        schedulingRules: [],
        customLabels: {},
        tolerations: []
      };
      
      // Generate YAML for the policy
      const yaml = generateBindingPolicyYAML(config);
      
      return {
        id: uuidv4(), // Generate a unique ID
        name: policyName,
        workloadId,
        clusterId,
        workloadName: workload.name,
        clusterName: cluster.name,
        config,
        yaml
      };
    }).filter(Boolean) as DeploymentPolicy[];
    
    setPoliciesToDeploy(policies);
    setDeploymentDialogOpen(true);
  }, [connectionLines, workloads, clusters]);

  // Handle deployment confirmation
  const handleDeploymentConfirm = useCallback(async () => {
    if (policiesToDeploy.length === 0) {
      setDeploymentError('No policies to deploy');
      return;
    }
    
    setDeploymentLoading(true);
    setDeploymentError(null);
    
    try {
      // Call the API for each policy in the list
      if (onCreateBindingPolicy) {
        // Process all policies in parallel
        const results = await Promise.allSettled(
          policiesToDeploy.map(async policy => {
            try {
              // Call the provided callback to create the binding policy
              await onCreateBindingPolicy(
                policy.clusterId, 
                policy.workloadId, 
                policy.config
              );
              return { success: true, policyName: policy.name };
            } catch (error) {
              // Capture individual policy errors
              return { 
                success: false, 
                policyName: policy.name, 
                error: error instanceof Error ? error.message : String(error) 
              };
            }
          })
        );
        
        // Check if any policies failed
        const failedPolicies = results.filter(
          result => result.status === 'rejected' || 
          (result.status === 'fulfilled' && !result.value.success)
        );
        
        if (failedPolicies.length > 0) {
          // Report errors for failed policies
          const errorMessages = failedPolicies
            .map(result => {
              if (result.status === 'rejected') {
                return `Failed to deploy policy: ${result.reason}`;
              } else if (result.status === 'fulfilled') {
                return `Failed to deploy policy "${result.value.policyName}": ${result.value.error}`;
              }
              return null;
            })
            .filter(Boolean)
            .join('\n');
            
          setDeploymentError(errorMessages || 'Failed to deploy some policies');
        } else {
          // All policies deployed successfully
          setSuccessMessage(`Successfully deployed ${policiesToDeploy.length} binding policies`);
          
          // Close the dialog after successful deployment
          setDeploymentDialogOpen(false);
        }
      } else {
        // If there's no callback provided, show a mock success (for demo purposes)
        await new Promise(resolve => setTimeout(resolve, 2000));
        setSuccessMessage(`Successfully deployed ${policiesToDeploy.length} binding policies (demo mode)`);
        setDeploymentDialogOpen(false);
      }
    } catch (error) {
      console.error('Error deploying binding policies:', error);
      setDeploymentError(
        error instanceof Error 
          ? error.message 
          : 'Failed to deploy binding policies. Please try again.'
      );
    } finally {
      setDeploymentLoading(false);
    }
  }, [policiesToDeploy, onCreateBindingPolicy, setSuccessMessage]);

  // Main layout for the drag and drop interface
  return (
    <Box sx={{ height: 'calc(100vh - 64px)', overflow: 'hidden', position: 'relative' }}>
      {/* Debug section - moved to a small floating panel in bottom-left */}
      <Box sx={{ 
        position: 'absolute',
        bottom: 10,
        left: 10,
        zIndex: 10,
        p: 1, 
        bgcolor: alpha('#f0f0f0', 0.8), 
        borderRadius: 1,
        boxShadow: 1,
        fontSize: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        maxWidth: 180
      }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
          Connection Mode: <span style={{ color: connectionMode ? '#9c27b0' : 'gray' }}>{connectionMode ? 'ENABLED' : 'DISABLED'}</span>
        </Typography>
      </Box>

      <StrictModeDragDropContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Grid container spacing={2} sx={{ height: '100%', p: 2 }}>
          {/* Left Panel - Clusters */}
          <Grid item xs={3} sx={{ height: '100%' }}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" align="center" sx={{ mb: 1, bgcolor: '#1976d2', color: 'white', p: 1, borderRadius: '4px 4px 0 0' }}>
                Clusters
              </Typography>
              <ClusterPanel 
                clusters={clusters} 
                loading={loading.clusters}
                error={error.clusters}
              />
            </Box>
          </Grid>
          
          {/* Middle Panel - Canvas */}
          <Grid item xs={6} sx={{ height: '100%' }}>
            <Box sx={{ 
              position: 'relative', 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column'
            }}>
              {/* Connection Mode Controls Bar */}
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1,
                p: 1,
                bgcolor: connectionMode ? alpha('#9c27b0', 0.1) : 'transparent',
                borderRadius: 1,
                border: connectionMode ? `1px solid ${alpha('#9c27b0', 0.3)}` : 'none'
              }}>
                <Typography variant="subtitle1">
                  Connection Mode: <strong>{connectionMode ? 'ENABLED' : 'DISABLED'}</strong>
                </Typography>
                
                <Button
                  variant={connectionMode ? "contained" : "outlined"}
                  color="secondary"
                  startIcon={<LinkIcon />}
                  onClick={() => {
                    console.log('🚨 DIRECT BUTTON CLICK');
                    toggleConnectionMode();
                  }}
                  sx={{ 
                    borderRadius: 28,
                    boxShadow: connectionMode ? 4 : 1,
                    fontWeight: 'bold',
                    border: connectionMode ? '2px solid #9c27b0' : undefined,
                    position: 'relative',
                    zIndex: 1001,
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                    px: 2.5,
                    py: 0.8,
                    '&:hover': {
                      backgroundColor: connectionMode ? '#9c27b0' : alpha('#9c27b0', 0.1),
                      transform: 'translateY(-2px)',
                      boxShadow: 4
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <span style={{ 
                    padding: '0 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {connectionMode ? "Exit Connection Mode" : "Create Connection"}
                  </span>
                </Button>
              </Box>
              
              {/* Canvas Area */}
              <Box sx={{ flexGrow: 1, position: 'relative' }}>
                <PolicyCanvas
                  policies={policies}
                  clusters={clusters}
                  workloads={workloads}
                  canvasEntities={canvasEntities}
                  assignmentMap={usePolicyDragDropStore(state => state.assignmentMap)}
                  getItemLabels={usePolicyDragDropStore(state => state.getItemLabels)}
                  removeFromCanvas={usePolicyDragDropStore(state => state.removeFromCanvas)}
                  onClearCanvas={usePolicyDragDropStore(state => state.clearCanvas)}
                  onSaveBindingPolicies={() => {
                    // This would trigger saving all binding policies
                    setSuccessMessage("All binding policies saved successfully");
                  }}
                  connectionMode={connectionMode}
                  onConnectionComplete={handleCompleteConnection}
                />
              </Box>
              
              {/* Connection Mode Instructions */}
              {connectionMode && (
                <Paper
                  elevation={3}
                  sx={{
                    position: 'absolute',
                    bottom: '24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    display: 'flex',
                    alignItems: 'center',
                    zIndex: 50
                  }}
                >
                  <InfoIcon color="info" sx={{ mr: 1 }} />
                  <Typography variant="body2">
                    {activeConnection.source 
                      ? `Select a ${activeConnection.sourceType === 'workload' ? 'cluster' : 'workload'} to complete the connection` 
                      : "Click on a workload or cluster to start a connection"}
                  </Typography>
                </Paper>
              )}
                
              {/* Deploy Button */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: '24px', 
                  right: '24px', 
                  zIndex: 100 
                }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 4,
                    boxShadow: 6
                  }}
                  disabled={canvasEntities?.clusters.length === 0 || canvasEntities?.workloads.length === 0 || connectionLines.length === 0}
                  onClick={prepareForDeployment}
                >
                  Deploy Binding Policies
                </Button>
              </Box>
            </Box>
          </Grid>
          
          {/* Right Panel - Workloads */}
          <Grid item xs={3} sx={{ height: '100%' }}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" align="center" sx={{ mb: 1, bgcolor: '#4caf50', color: 'white', p: 1, borderRadius: '4px 4px 0 0' }}>
                Workloads
              </Typography>
              <WorkloadPanel 
                workloads={workloads} 
                loading={loading.workloads}
                error={error.workloads}
              />
            </Box>
          </Grid>
        </Grid>
      </StrictModeDragDropContext>
      
      {/* Success notification */}
      <SuccessNotification
        open={!!successMessage}
        message={successMessage}
        onClose={() => setSuccessMessage("")}
      />
      
      {/* Configuration Sidebar */}
      <ConfigurationSidebar
        open={configSidebarOpen}
        onClose={() => setConfigSidebarOpen(false)}
        selectedConnection={selectedConnection}
        onSaveConfiguration={handleSaveConfiguration}
      />
      
      {/* Quick Policy Creation Dialog */}
      <QuickPolicyDialog
        open={quickPolicyDialogOpen}
        onClose={() => setQuickPolicyDialogOpen(false)}
        onSave={handleQuickPolicySave}
        connection={currentConnection}
      />
      
      {/* Invalid Connection Warning */}
      <Snackbar
        open={!!invalidConnectionWarning}
        autoHideDuration={6000}
        onClose={() => setInvalidConnectionWarning(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="warning" 
          onClose={() => setInvalidConnectionWarning(null)}
            sx={{
            display: 'flex',
            alignItems: 'center',
            '& .MuiAlert-icon': {
              mr: 1
            }
          }}
        >
          {invalidConnectionWarning}
        </Alert>
      </Snackbar>
      
      {/* Deployment Confirmation Dialog */}
      <DeploymentConfirmationDialog
        open={deploymentDialogOpen}
        onClose={() => {
          if (!deploymentLoading) {
            setDeploymentDialogOpen(false);
            setDeploymentError(null);
          }
        }}
        policies={policiesToDeploy}
        onConfirm={handleDeploymentConfirm}
        loading={deploymentLoading}
        error={deploymentError}
        clusters={clusters}
        workloads={workloads}
      />

      {/* Create Connection floating button - visible only when NOT in connection mode */}
      {!connectionMode && (
        <Box
          sx={{
            position: 'absolute',
            top: '80px',
            right: '30px',
            zIndex: 100
          }}
        >
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddLinkIcon />}
            onClick={toggleConnectionMode}
            sx={{
              borderRadius: 28,
              boxShadow: 3,
              fontWeight: 'bold',
              px: 2,
              py: 1,
              backgroundColor: '#9c27b0',
              '&:hover': {
                backgroundColor: '#7b1fa2',
                transform: 'scale(1.05)',
                boxShadow: 5
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            CREATE CONNECTION
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default React.memo(PolicyDragDrop);
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Grid, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography,  Paper, Chip } from '@mui/material';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { BindingPolicyInfo, ManagedCluster, Workload } from '../../types/bindingPolicy';
import { usePolicyDragDropStore, DragTypes } from '../../stores/policyDragDropStore';
import PolicyCanvas from './PolicyCanvas';
import SuccessNotification from './SuccessNotification';
import ConfigurationSidebar, { PolicyConfiguration } from './ConfigurationSidebar';
import { useKubestellarData } from '../../hooks/useKubestellarData';
import DeploymentConfirmationDialog, { DeploymentPolicy } from './DeploymentConfirmationDialog';
import { v4 as uuidv4 } from 'uuid';
import { ClusterPanelContainer, WorkloadPanelContainer } from './PolicyPanels';
import { useBPQueries } from '../../hooks/queries/useBPQueries';
import Editor from "@monaco-editor/react";
import useTheme from "../../stores/themeStore";
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

// StrictMode-compatible DragDropContext wrapper
const StrictModeDragDropContext: React.FC<React.ComponentProps<typeof DragDropContext>> = ({ children, ...props }) => {
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

interface PolicyDragDropContainerProps {
  policies?: BindingPolicyInfo[];
  clusters?: ManagedCluster[];
  workloads?: Workload[];
  onPolicyAssign?: (policyName: string, targetType: 'cluster' | 'workload', targetName: string) => void;
  onCreateBindingPolicy?: (clusterIds: string[], workloadIds: string[], configuration?: PolicyConfiguration) => void;
  dialogMode?: boolean;
}

const PolicyDragDropContainer: React.FC<PolicyDragDropContainerProps> = ({
  policies: propPolicies,
  clusters: propClusters,
  workloads: propWorkloads,
  onPolicyAssign,
  onCreateBindingPolicy,
  dialogMode = false
}) => {
  console.log('🔄 PolicyDragDropContainer component rendering', {
    hasPropPolicies: !!propPolicies,
    hasPropClusters: !!propClusters,
    hasPropWorkloads: !!propWorkloads,
    hasOnPolicyAssign: !!onPolicyAssign,
    hasOnCreateBindingPolicy: !!onCreateBindingPolicy
  });

  const theme = useTheme(state => state.theme);

  // State for success notification
  const [successMessage, setSuccessMessage] = useState<string>("");
  
  // State for the configuration sidebar
  const [configSidebarOpen, setConfigSidebarOpen] = useState(false);
  const [selectedConnection, ] = useState<{
    source: { type: string; id: string; name: string };
    target: { type: string; id: string; name: string };
  } | undefined>(undefined);
  
  // Add state for YAML preview
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewYaml, setPreviewYaml] = useState<string>("");
  const [currentConfig, setCurrentConfig] = useState<PolicyConfiguration | null>(null);
  const [currentWorkloadId, setCurrentWorkloadId] = useState<string>("");
  const [currentClusterId, setCurrentClusterId] = useState<string>("");
  
  // Add state to store the edited YAML for deployment
  const [, setEditedPolicyYaml] = useState<Record<string, string>>({});
  
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
  
  // Always call the hook unconditionally
  const { 
    data: hookData,
    loading: hookLoading,
    error: hookError
  } = useKubestellarData({ 
    onDataLoaded: handleDataLoaded, 
    skipFetch: !needsFetchData || dataFetchedRef.current // Use skipFetch parameter instead
  });

  const policies = React.useMemo(() => propPolicies || hookData.policies || [], [propPolicies, hookData.policies]);
  const clusters = React.useMemo(() => propClusters || hookData.clusters || [], [propClusters, hookData.clusters]);
  const workloads = React.useMemo(() => propWorkloads || hookData.workloads || [], [propWorkloads, hookData.workloads]);
  
  // If props are provided, we're not loading
  const loading = propPolicies && propClusters && propWorkloads 
    ? { policies: false, workloads: false, clusters: false }
    : hookLoading;
  
  const error = hookError;
  
  // Use individual store values to prevent recreating objects on each render
  const setActiveDragItem = usePolicyDragDropStore(state => state.setActiveDragItem);
  const addToCanvas = usePolicyDragDropStore(state => state.addToCanvas);
  const canvasEntities = usePolicyDragDropStore(state => state.canvasEntities);
  const onClearCanvas = usePolicyDragDropStore(state => state.clearCanvas);
  

  
  // Add state for deployment confirmation dialog
  const [deploymentDialogOpen, setDeploymentDialogOpen] = useState(false);
  const [deploymentLoading, setDeploymentLoading] = useState(false);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [policiesToDeploy, setPoliciesToDeploy] = useState<DeploymentPolicy[]>([]);
  
  // Import the generate YAML mutation
  const { useGenerateBindingPolicyYaml,  useQuickConnect } = useBPQueries();
  const generateYamlMutation = useGenerateBindingPolicyYaml();
  const quickConnectMutation = useQuickConnect();

  
  // Log component mount/unmount for debugging
  useEffect(() => {
    console.log('🔵 PolicyDragDropContainer component mounted');
    
    return () => {
      console.log('🔴 PolicyDragDropContainer component unmounting');
      isMounted.current = false;
    };
  }, []);
  
  // Function to generate YAML preview wrapped in useCallback
  const generateBindingPolicyPreview = useCallback(async (
    requestData: {
      workloadLabels: Record<string, string>,
      clusterLabels: Record<string, string>,
      resources: Array<{type: string, createOnly: boolean}>,
      namespacesToSync?: string[],
      namespace?: string,
      policyName?: string
    },
    config?: PolicyConfiguration
  ) => {
    if (!config) return;
    
    try {
      // Generate the YAML preview using the updated API format
      const generateYamlResponse = await generateYamlMutation.mutateAsync(requestData);
      
      // Update the preview YAML
      setPreviewYaml(generateYamlResponse.yaml);
      setShowPreviewDialog(true);
      
      return generateYamlResponse.yaml;
    } catch (error) {
      console.error("Error generating binding policy YAML:", error);
      setDeploymentError("Failed to generate binding policy YAML");
      return null;
    }
  }, [generateYamlMutation, setPreviewYaml, setShowPreviewDialog, setDeploymentError]);
  
  // Update the prepareForDeployment function to work without connections
  const prepareForDeployment = useCallback(() => {
    console.log('🔍 DEBUG - prepareForDeployment called');

    // Check if we have clusters and workloads
    if (canvasEntities.clusters.length === 0 || canvasEntities.workloads.length === 0) {
      console.log('🔍 DEBUG - No clusters or workloads available');
      setDeploymentError('Both clusters and workloads are required to create binding policies');
      return;
    }

    // Create a single policy for all workloads and clusters
    const clusterIdsString = canvasEntities.clusters.join(', ');
    const workloadIdsString = canvasEntities.workloads.join(', ');

    console.log('🔍 DEBUG - Creating single policy for:', {
      workloadIds: canvasEntities.workloads,
      clusterIds: canvasEntities.clusters,
    });
    
    // Create a unique policy name that includes all workloads
    const timestamp = Date.now();
    const workloadNames = canvasEntities.workloads.join("-");
    const policyName = `${workloadNames}-binding-${timestamp}`;
    
    // Create a default configuration
    const config: PolicyConfiguration = {
      name: policyName,
      namespace: 'default',
      propagationMode: 'DownsyncOnly',
      updateStrategy: 'ServerSideApply',
      deploymentType: 'SelectedClusters',
      schedulingRules: [],
      customLabels: {},
      tolerations: []
    };
    
    // Create a single policy that includes all workloads and clusters
    const policy: DeploymentPolicy = {
      id: uuidv4(), // Generate a unique ID
      name: policyName,
      workloadIds: canvasEntities.workloads,
      clusterIds: canvasEntities.clusters,
      workloadName: workloadIdsString, // For display purposes
      clusterName: clusterIdsString, // For display purposes
      config,
      yaml: "" // Will be generated during deployment
    };
    
    console.log('🔍 DEBUG - Final policy to deploy:', policy);
    
    setPoliciesToDeploy([policy]);
    setDeploymentDialogOpen(true);
  }, [canvasEntities]);

  // Update the handleCreatePolicy function
  const handleCreatePolicy = useCallback(() => {
    if (canvasEntities.clusters.length === 0 || canvasEntities.workloads.length === 0) return;
    
    const workloadIds = canvasEntities.workloads;
    const clusterIds = canvasEntities.clusters;
    
    console.log('🔍 DEBUG - handleCreatePolicy called:', {
      workloadIds,
      clusterIds
    });
    
    // Find the workload object to get its namespace
    const firstWorkloadId = workloadIds[0];
    const workloadObj = workloads.find(w => w.name === firstWorkloadId);
    
    if (!workloadObj) {
      console.error('Workload not found:', firstWorkloadId);
      return;
    }
    
    const workloadNamespace = workloadObj.namespace || 'default';
    
    // Generate a name for the policy that includes all workloads
    const workloadNames = workloadIds.join("-");
    const policyName = `${workloadNames}-to-clusters-${Date.now()}`;
    
    // Create default configuration
    const defaultConfig: PolicyConfiguration = {
      name: policyName,
      namespace: workloadNamespace, // Use the namespace from the workload
      propagationMode: 'DownsyncOnly',
      updateStrategy: 'ServerSideApply',
      deploymentType: 'SelectedClusters',
      schedulingRules: [],
      customLabels: {},
      tolerations: []
    };
    
    // For display purposes only - we'll use the actual arrays in the API call
    const clusterIdsStr = clusterIds.join(", ");
    
    // Store IDs for UI display (maintain backward compatibility)
    setCurrentWorkloadId(firstWorkloadId); 
    setCurrentClusterId(clusterIdsStr);   
    setCurrentConfig(defaultConfig);
    
    // Convert workload IDs to workload labels - use proper app label format
    const workloadLabels = {
      'kubernetes.io/metadata.name': firstWorkloadId
    };
    
    // Convert cluster IDs to cluster labels - use 'name' as the key based on actual data
    const clusterLabels = {
      'name': clusterIds[0]
    };
    
    // Dynamically generate resources based on workload kind
    const resources = generateResourcesFromWorkload(workloadObj);
    
    // Generate YAML preview using the new format
    generateBindingPolicyPreview({
      workloadLabels,
      clusterLabels,
      resources,
      namespacesToSync: [workloadNamespace], // Use the namespace from the workload
      namespace: workloadNamespace, // Use the namespace from the workload
      policyName
    }, defaultConfig);
  }, [canvasEntities, generateBindingPolicyPreview, workloads]);

  // Helper function to generate resources array from workload
  const generateResourcesFromWorkload = useCallback((workload: Workload) => {
    console.log('🔍 DEBUG - Generating resources from workload:', workload);
    
    const resources = [
      // Always include namespaces
      { type: 'namespaces', createOnly: false }
    ];
    
    // Convert the workload kind to lowercase and pluralize
    if (workload.kind) {
      const kindLower = workload.kind.toLowerCase();
      let resourceType = kindLower;
      
      // Simple pluralization - add 's' if not already ending with 's'
      if (!resourceType.endsWith('s')) {
        resourceType += 's';
      }
      
      console.log(`🔍 DEBUG - Adding resource from kind: ${resourceType}`);
      
      // Add the workload's resource type
      resources.push({ type: resourceType, createOnly: false });
      
      // For deployments, add dependent resources
      if (kindLower === 'deployment') {
        resources.push({ type: 'replicasets', createOnly: false });
        // Don't include pods as they should be managed by controllers
        resources.push({ type: 'services', createOnly: false });
      } else if (kindLower === 'statefulset') {
        resources.push({ type: 'services', createOnly: false });
        // Don't include pods as they should be managed by controllers
      }
    } else {
      console.warn("🔍 DEBUG - Workload kind missing, adding deployment as default resource type");
      // If workload kind is missing, default to deployment
      resources.push({ type: 'deployments', createOnly: false });
      resources.push({ type: 'replicasets', createOnly: false });
      resources.push({ type: 'services', createOnly: false });
    }
    
    console.log('🔍 DEBUG - Final resources array:', resources);
    return resources;
  }, []);
  
  // Handle saving configuration from the sidebar
  const handleSaveConfiguration = useCallback(async (config: PolicyConfiguration) => {
    console.log('🔍 DEBUG - handleSaveConfiguration called with config:', config);
    
    if (!selectedConnection) {
      console.error('No connection selected for configuration');
      return;
    }
    
    let workloadId = '';
    // Instead of a single cluster, we'll use all clusters from the canvas
    const clusterIdsString = canvasEntities.clusters.join(', ');
    
    // Find the workload from the connection
    if (selectedConnection.source.type === 'workload') {
      workloadId = selectedConnection.source.id;
    } else {
      workloadId = selectedConnection.target.id;
    }
    
    // Find the workload object to get its namespace
    const workloadObj = workloads.find(w => w.name === workloadId);
    
    if (!workloadObj) {
      console.error('Workload not found:', workloadId);
      return;
    }
    
    const workloadNamespace = workloadObj.namespace || 'default';
    
    console.log('🔍 DEBUG - Processing connection in handleSaveConfiguration:', {
      workloadId,
      clusterIdsString,
      selectedConnection,
      workloadNamespace
    });
    
    setCurrentWorkloadId(workloadId);
    setCurrentClusterId(clusterIdsString);
    setCurrentConfig(config);
      
    // Generate YAML preview with all clusters as a comma-separated string
    const yaml = await generateBindingPolicyPreview({
      workloadLabels: {
        'kubernetes.io/metadata.name': workloadId
      },
      clusterLabels: {
        'name': canvasEntities.clusters[0] // Use 'name' as key
      },
      resources: [
        { type: 'deployments', createOnly: false },
        { type: 'pods', createOnly: false },
        { type: 'services', createOnly: false },
        { type: 'replicasets', createOnly: false },
        { type: 'namespaces', createOnly: false }
      ],
      namespacesToSync: [workloadNamespace], // Use the namespace from the workload
      namespace: workloadNamespace, // Use the namespace from the workload
      policyName: config.name
    }, config);
    
    if (yaml) {
      // Store the edited YAML with a key based on the workload (since we're using all clusters)
      const connectionKey = `${workloadId}-all-clusters`;
      setEditedPolicyYaml(prev => ({
        ...prev,
        [connectionKey]: yaml
      }));
      
      // Close the sidebar
      setConfigSidebarOpen(false);
      
      console.log('✅ Binding policy YAML generated with configuration:', {
        workloadId,
        clusterIdsString,
        name: config.name,
        namespace: config.namespace,
        propagationMode: config.propagationMode,
        updateStrategy: config.updateStrategy,
        deploymentType: config.deploymentType,
        schedulingRules: config.schedulingRules,
        tolerations: config.tolerations,
        labels: config.customLabels
      });
    }
  }, [selectedConnection, generateBindingPolicyPreview, canvasEntities.clusters, canvasEntities.workloads, workloads]);

 

  // Handle tracking the active drag item
  const handleDragStart = useCallback((start: {draggableId: string}) => {
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
    const { destination, draggableId } = result;
    
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

  // Update the handleDeploymentConfirm function
  const handleDeploymentConfirm = useCallback(async () => {
    if (policiesToDeploy.length === 0) {
      setDeploymentError('No policies to deploy');
      return;
    }
    
    console.log('🔍 DEBUG - handleDeploymentConfirm called with policies:', policiesToDeploy);
    
    setDeploymentLoading(true);
    setDeploymentError(null);
    
    try {
      // Get the first workload and cluster
      const workloadId = policiesToDeploy[0].workloadIds[0];
      const clusterId = policiesToDeploy[0].clusterIds[0];
      
      // Find the workload object to get its namespace
      const workloadObj = workloads.find(w => w.name === workloadId);
      
      if (!workloadObj) {
        setDeploymentError(`Workload not found: ${workloadId}`);
        setDeploymentLoading(false);
        return;
      }
      
      const workloadNamespace = workloadObj.namespace || 'default';
      
      // Create a unique policy name
      const timestamp = Date.now();
      const policyName = `${workloadId}-to-${clusterId}-${timestamp}`;
      
      console.log('🔍 DEBUG - Creating binding policy:', {
        workloadId,
        clusterId,
        policyName,
        namespace: workloadNamespace
      });
      
      // Generate resources based on workload kind
      const resources = generateResourcesFromWorkload(workloadObj);
      
      // Convert to the format with correct labels that match actual data
      const requestData = {
        workloadLabels: {
          'kubernetes.io/metadata.name': workloadId
        },
        clusterLabels: {
          'name': clusterId // Use 'name' as key based on actual data
        },
        resources,
        namespacesToSync: [workloadNamespace],
        policyName: policyName,
        namespace: workloadNamespace
      };
      
      // Call the quick-connect API with the new format
      const result = await quickConnectMutation.mutateAsync(requestData);
      console.log('API response:', result);
      
      // Show success message
      setSuccessMessage(`Successfully created binding policy "${policyName}" connecting ${workloadId} to ${clusterId}`);
      
      // Close the dialog after successful deployment
      setDeploymentDialogOpen(false);
      
      // Clear the canvas to avoid duplication
      if (onClearCanvas) {
        onClearCanvas();
      }
      
      // Reset loading state after successful completion
      setDeploymentLoading(false);
    } catch (error) {
      console.error('❌ Failed to deploy policy:', error);
      setDeploymentError(
        error instanceof Error 
          ? error.message 
          : 'Failed to deploy binding policy. Please try again.'
      );
      // Ensure loading state is reset on error
      setDeploymentLoading(false);
    }
  }, [policiesToDeploy, quickConnectMutation, setSuccessMessage, onClearCanvas, workloads, generateResourcesFromWorkload]);

  // Update the handleCreateFromPreview function
  const handleCreateFromPreview = useCallback(async () => {
    if (!previewYaml) return;
    
    // Set loading state
    setDeploymentLoading(true);
    setDeploymentError(null);
    
    try {
      // Get current workload and cluster IDs
      const workloadId = currentWorkloadId;
      const clusterId = currentClusterId.split(', ')[0]; // Get first cluster if multiple
      
      // Find the workload object to get its namespace
      const workloadObj = workloads.find(w => w.name === workloadId);
      
      if (!workloadObj) {
        console.error('Workload not found:', workloadId);
        setDeploymentError(`Workload not found: ${workloadId}`);
        setDeploymentLoading(false); // Reset loading on error
        return;
      }
      
      const workloadNamespace = workloadObj.namespace || 'default';
      
      // Generate resources based on workload kind
      const resources = generateResourcesFromWorkload(workloadObj);
      
      // Prepare request with correct label keys from actual data
      const requestData = {
        workloadLabels: {
          'kubernetes.io/metadata.name': workloadId
        },
        clusterLabels: {
          'name': clusterId // Use 'name' as key
        },
        resources,
        namespacesToSync: [workloadNamespace],
        policyName: currentConfig?.name || `${workloadId}-to-${clusterId}`,
        namespace: workloadNamespace
      };
      
      console.log('Creating binding policy with:', requestData);
      
      // Use the quick connect API with the new format
      const response = await quickConnectMutation.mutateAsync(requestData);
      
      console.log('API Response:', response);
      
      // Show success message
      setSuccessMessage(`Binding policy "${requestData.policyName}" created successfully`);
      
      // Close the dialog
      setShowPreviewDialog(false);
      
      // Clear the canvas
      if (onClearCanvas) {
        onClearCanvas();
      }
      
      // Reset loading state after successful completion
      setDeploymentLoading(false);
    } catch (error) {
      console.error('Failed to create binding policy:', error);
      setDeploymentError(error instanceof Error ? error.message : 'Failed to create binding policy');
      
      // Reset loading state on error
      setDeploymentLoading(false);
    }
  }, [previewYaml, currentWorkloadId, currentClusterId, currentConfig, quickConnectMutation, setSuccessMessage, onClearCanvas, setDeploymentError, workloads, generateResourcesFromWorkload]);

  // Main layout for the drag and drop interface
  return (
    <Box sx={{ 
      height: dialogMode ? '100%' : 'calc(100vh - 64px)', 
      overflow: 'hidden', 
      position: 'relative' 
    }}>
      <StrictModeDragDropContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Grid container spacing={dialogMode ? 1 : 2} sx={{ height: '100%', p: dialogMode ? 0 : 2 }}>
          {/* Left Panel - Clusters */}
          <Grid item xs={3} sx={{ height: '100%' }}>
            <ClusterPanelContainer 
              clusters={clusters.filter(cluster => 
                !canvasEntities.clusters.includes(cluster.name)
              )}
              loading={loading.clusters}
              error={error.clusters}
              compact={dialogMode}
            />
          </Grid>
          
          {/* Middle Panel - Canvas */}
          <Grid item xs={6} sx={{ height: '100%' }}>
            <Box sx={{ 
              position: 'relative', 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column'
            }}>
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
                  onClearCanvas={onClearCanvas}
                  onSaveBindingPolicies={() => {
                    // This would trigger saving all binding policies
                    setSuccessMessage("All binding policies saved successfully");
                  }}
                  dialogMode={dialogMode}
                />
                
                {/* Add Edit Policy button when both cluster and workload are present */}
                {canvasEntities?.clusters.length > 0 && canvasEntities?.workloads.length > 0 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '10px',
                      right: '40px',
                      zIndex: 10
                    }}
                  >
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleCreatePolicy}
                      sx={{
                        bgcolor: theme === "dark" ? "#2563eb" : undefined,
                        color: theme === "dark" ? "#FFFFFF" : undefined,
                        '&:hover': {
                          bgcolor: theme === "dark" ? "#1d4ed8" : undefined,
                        }
                      }}
                    >
                      Edit Policy
                    </Button>
                  </Box>
                )}
              </Box>
              
              {/* Deploy Button - Hide in dialog mode */}
              {!dialogMode && (
                <Box
                  sx={{
                    position: 'fixed',
                    bottom: '40px', 
                    right: '40px', 
                    zIndex: 100,
                    display: 'flex',
                    gap: 2
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
                      boxShadow: 6,
                      bgcolor: theme === "dark" ? "#2563eb !important" : undefined,
                      color: theme === "dark" ? "#FFFFFF !important" : undefined,
                      '&:hover': {
                        bgcolor: theme === "dark" ? "#1d4ed8 !important" : undefined,
                        transform: 'translateY(-2px)',
                        boxShadow: theme === "dark" ? '0 4px 20px rgba(37, 99, 235, 0.5)' : 6
                      },
                      '&:disabled': {
                        bgcolor: theme === "dark" ? "rgba(37, 99, 235, 0.5) !important" : undefined,
                        color: theme === "dark" ? "rgba(255, 255, 255, 0.5) !important" : undefined
                      }
                    }}
                    disabled={canvasEntities?.clusters.length === 0 || canvasEntities?.workloads.length === 0 || deploymentLoading}
                    onClick={prepareForDeployment}
                  >
                    {deploymentLoading ? (
                      <>
                        <Box component="span" sx={{ display: 'inline-flex', mr: 1, alignItems: 'center' }}>
                          <Box
                            component="span"
                            sx={{
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              border: '2px solid currentColor',
                              borderRightColor: 'transparent',
                              animation: 'spin 1s linear infinite',
                              display: 'inline-block',
                              '@keyframes spin': {
                                '0%': { transform: 'rotate(0deg)' },
                                '100%': { transform: 'rotate(360deg)' }
                              }
                            }}
                          />
                        </Box>
                        Deploying...
                      </>
                    ) : (
                      'Deploy Binding Policies'
                    )}
                  </Button>
                </Box>
              )}
            </Box>
          </Grid>

          {/* Right Panel - Workloads */}
          <Grid item xs={3} sx={{ height: '100%' }}>
            <WorkloadPanelContainer 
              workloads={workloads.filter(workload => 
                !canvasEntities.workloads.includes(workload.name)
              )}
              loading={loading.workloads}
              error={error.workloads}
              compact={dialogMode}
            />
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
        dialogMode={dialogMode}
      />
      
      {/* Preview YAML Dialog - Now with save functionality */}
      <Dialog
        open={showPreviewDialog}
        onClose={() => setShowPreviewDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: "80vh",
            maxHeight: "80vh",
            bgcolor: theme === "dark" ? "rgba(17, 25, 40, 0.95)" : undefined,
            color: theme === "dark" ? "#FFFFFF" : undefined,
            border: theme === "dark" ? '1px solid rgba(255, 255, 255, 0.15)' : undefined,
            backdropFilter: 'blur(10px)'
          }
        }}
      >
        <DialogTitle sx={{
          bgcolor: theme === "dark" ? "rgba(17, 25, 40, 0.95)" : undefined,
          color: theme === "dark" ? "rgba(255, 255, 255, 0.9)" : undefined,
        }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', mb: 1 }}>
            <Typography variant="h6" sx={{
              color: theme === "dark" ? "rgba(255, 255, 255, 0.9)" : undefined
            }}>Preview Binding Policy YAML</Typography>
            {currentWorkloadId && currentClusterId && (
              <Box
                sx={{
                  mt: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Typography variant="body2" color={theme === "dark" ? "rgba(255, 255, 255, 0.7)" : "text.secondary"}>
                  Creating connection:
                </Typography>
                <Chip 
                  size="small" 
                  label={currentWorkloadId} 
                  color="success"
                  sx={{
                    bgcolor: theme === "dark" ? "rgba(74, 222, 128, 0.2)" : undefined,
                    color: theme === "dark" ? "#4ade80" : undefined,
                    borderColor: theme === "dark" ? "rgba(74, 222, 128, 0.3)" : undefined
                  }}
                />
                <ArrowForwardIcon fontSize="small" sx={{ color: theme === "dark" ? "rgba(255, 255, 255, 0.5)" : undefined }} />
                <Chip 
                  size="small" 
                  label={currentClusterId}
                  color="info"
                  sx={{
                    bgcolor: theme === "dark" ? "rgba(37, 99, 235, 0.2)" : undefined,
                    color: theme === "dark" ? "#60a5fa" : undefined,
                    borderColor: theme === "dark" ? "rgba(37, 99, 235, 0.3)" : undefined
                  }}
                />
              </Box>
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ 
          p: 2,
          bgcolor: theme === "dark" ? "rgba(17, 25, 40, 0.95)" : undefined
        }}>
          <Paper elevation={0} sx={{ 
            height: 'calc(100% - 32px)', 
            overflow: 'hidden',
            bgcolor: theme === "dark" ? "rgba(17, 25, 40, 0.95)" : undefined,
            border: theme === "dark" ? '1px solid rgba(255, 255, 255, 0.15)' : undefined,
            borderRadius: 2,
            backdropFilter: 'blur(10px)'
          }}>
            <Editor
              height="100%"
              language="yaml"
              value={previewYaml}
              theme={theme === "dark" ? "vs-dark" : "light"}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                fontFamily: "'JetBrains Mono', monospace",
                padding: { top: 10 },
                readOnly: false // Allow editing the YAML
              }}
              onChange={(value) => {
                // Update preview YAML
                setPreviewYaml(value || "");
                
                // Store the edited YAML for deployment
                if (currentWorkloadId && value) {
                  // Use a consistent key format for all clusters
                  const connectionKey = `${currentWorkloadId}-${currentClusterId}`;
                  setEditedPolicyYaml(prev => ({
                    ...prev,
                    [connectionKey]: value
                  }));
                }
              }}
            />
          </Paper>
        </DialogContent>
        <DialogActions sx={{
          bgcolor: theme === "dark" ? "rgba(17, 25, 40, 0.95)" : undefined, 
          borderTop: theme === "dark" ? '1px solid rgba(255, 255, 255, 0.15)' : undefined
        }}>
          <Button 
            onClick={() => {
              setShowPreviewDialog(false);
            }}
            sx={{
              color: theme === "dark" ? "rgba(255, 255, 255, 0.9)" : undefined
            }}
          >
            Close
          </Button>
          <Button 
            variant="contained"
            color="primary"
            onClick={handleCreateFromPreview}
            sx={{
              bgcolor: theme === "dark" ? "#2563eb" : undefined,
              color: theme === "dark" ? "#FFFFFF" : undefined,
              '&:hover': {
                bgcolor: theme === "dark" ? "#1d4ed8" : undefined,
              }
            }}
          >
            Save & Create Policy
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Deployment Confirmation Dialog - Hide in dialog mode */}
      {!dialogMode && (
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
          darkMode={theme === "dark"}
        />
      )}
    </Box>
  );
};

export default React.memo(PolicyDragDropContainer); 
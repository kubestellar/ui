import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Grid, Button } from '@mui/material';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { BindingPolicyInfo, ManagedCluster, Workload } from '../../types/bindingPolicy';
import { usePolicyDragDropStore, DragTypes } from '../../stores/policyDragDropStore';
import { useCanvasStore } from '../../stores/canvasStore';
import PolicyCanvas from './PolicyCanvas';
import SuccessNotification from './SuccessNotification';
import ConfigurationSidebar, { PolicyConfiguration } from './ConfigurationSidebar';
import { useKubestellarData } from '../../hooks/useKubestellarData';
import DeploymentConfirmationDialog, { DeploymentPolicy } from './DeploymentConfirmationDialog';
import { generateBindingPolicyYAML } from '../../utils/yamlGenerator';
import { v4 as uuidv4 } from 'uuid';
import { ClusterPanelContainer, WorkloadPanelContainer } from './PolicyPanels';
import ConnectionManager from './ConnectionManager';
//import { useConnectionManagerStore } from '../../stores/connectionManagerStore';

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
  onCreateBindingPolicy?: (clusterId: string, workloadId: string, configuration?: PolicyConfiguration) => void;
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

  // State for success notification
  const [successMessage, setSuccessMessage] = useState<string>("");
  
  // State for the configuration sidebar
  const [configSidebarOpen, setConfigSidebarOpen] = useState(false);
  const [selectedConnection,] = useState<{
    source: { type: string; id: string; name: string };
    target: { type: string; id: string; name: string };
  } | undefined>(undefined);
  
  // Connection mode comes from the store now
  //const connectionMode = useConnectionManagerStore(state => state.connectionMode);
  
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
  const initializeAssignmentMap = usePolicyDragDropStore(state => state.initializeAssignmentMap);
  const setActiveDragItem = usePolicyDragDropStore(state => state.setActiveDragItem);
  const addToCanvas = usePolicyDragDropStore(state => state.addToCanvas);
  const canvasEntities = usePolicyDragDropStore(state => state.canvasEntities);
  const assignLabelsToItem = usePolicyDragDropStore(state => state.assignLabelsToItem);
  const setStoreSuccessMessage = usePolicyDragDropStore(state => state.setSuccessMessage);
  
  // Canvas store for connections
  const connectionLines = useCanvasStore(state => state.connectionLines);
  const addConnectionLine = useCanvasStore(state => state.addConnectionLine);
  
  // Add a ref to track previous policies
  const prevPoliciesRef = useRef<BindingPolicyInfo[]>([]);
  
  // Add state for deployment confirmation dialog
  const [deploymentDialogOpen, setDeploymentDialogOpen] = useState(false);
  const [deploymentLoading, setDeploymentLoading] = useState(false);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [policiesToDeploy, setPoliciesToDeploy] = useState<DeploymentPolicy[]>([]);
  
  // Find the connectionManager section and use a ref
  const connectionManagerRef = useRef<{ completeConnection: (workloadId: string, clusterId: string) => void }>(null);
  
  // Log component mount/unmount for debugging
  useEffect(() => {
    console.log('🔵 PolicyDragDropContainer component mounted');
    
    return () => {
      console.log('🔴 PolicyDragDropContainer component unmounting');
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
    
    // Call the API to create the binding policy
    if (onCreateBindingPolicy) {
      console.log(`🔄 Calling onCreateBindingPolicy with config:`, config);
      
      // In this demo, we'll simulate the API call
      setTimeout(() => {
        // Show success message
        setSuccessMessage(`Successfully created binding policy "${config.name}"`);
      }, 500);
    }
  }, [onCreateBindingPolicy]);

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

  // Replace the current handleCompleteConnection implementation with this
  const handleCompleteConnection = useCallback((workloadId: string, clusterId: string) => {
    console.log(`🚨 handleCompleteConnection called with workloadId=${workloadId}, clusterId=${clusterId}`);
    
    if (connectionManagerRef.current && connectionManagerRef.current.completeConnection) {
      connectionManagerRef.current.completeConnection(workloadId, clusterId);
    } else {
      console.error('❌ connectionManagerRef.current.completeConnection is not available!');
    }
  }, []);

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
              {/* Connection Manager Component */}
              <ConnectionManager
                ref={connectionManagerRef}
                workloads={workloads}
                clusters={clusters}
                onQuickPolicySave={handleQuickPolicySave}
                setSuccessMessage={setSuccessMessage}
                dialogMode={dialogMode}
              />
              
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
                  onConnectionComplete={handleCompleteConnection}
                  dialogMode={dialogMode}
                />
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
                      boxShadow: 6
                    }}
                    disabled={canvasEntities?.clusters.length === 0 || canvasEntities?.workloads.length === 0 || connectionLines.length === 0}
                    onClick={prepareForDeployment}
                  >
                    Deploy Binding Policies
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
        />
      )}
    </Box>
  );
};

export default React.memo(PolicyDragDropContainer); 
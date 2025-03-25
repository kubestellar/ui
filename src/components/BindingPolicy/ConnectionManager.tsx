import React, { useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import {  Typography, Paper, Snackbar, Alert } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { useConnectionManagerStore } from '../../stores/connectionManagerStore';
import QuickPolicyDialog from './QuickPolicyDialog';
import { PolicyConfiguration } from './ConfigurationSidebar';
import { Workload, ManagedCluster } from '../../types/bindingPolicy';
import { useCanvasStore } from '../../stores/canvasStore';
import { usePolicyDragDropStore } from '../../stores/policyDragDropStore';


interface ConnectionManagerProps {
  workloads: Workload[];
  clusters: ManagedCluster[];
  onQuickPolicySave: (config: PolicyConfiguration) => void;
  setSuccessMessage: (message: string) => void;
  dialogMode?: boolean;
}

// Define the QuickPolicyDialogProps type here since it's not exported from the component
export interface QuickPolicyDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (config: PolicyConfiguration) => void;
  connection: {
    workloadName: string;
    workloadNamespace: string;
    clusterName: string;
  } | null;
}

// Component definition with forwardRef to expose methods
const ConnectionManager = forwardRef<
  { completeConnection: (workloadId: string, clusterId: string) => void },
  ConnectionManagerProps
>(({
  workloads,
  clusters,
  onQuickPolicySave,
  setSuccessMessage,
}, ref) => {
  // Get state and actions from the connection manager store
  const connectionMode = useConnectionManagerStore(state => state.connectionMode);
  const toggleConnectionMode = useConnectionManagerStore(state => state.toggleConnectionMode);
  const activeConnection = useConnectionManagerStore(state => state.activeConnection);
  const invalidConnectionWarning = useConnectionManagerStore(state => state.invalidConnectionWarning);
  const setInvalidConnectionWarning = useConnectionManagerStore(state => state.setInvalidConnectionWarning);
  const quickPolicyDialogOpen = useConnectionManagerStore(state => state.quickPolicyDialogOpen);
  const setQuickPolicyDialogOpen = useConnectionManagerStore(state => state.setQuickPolicyDialogOpen);
  const currentConnection = useConnectionManagerStore(state => state.currentConnection);
  const setCurrentConnection = useConnectionManagerStore(state => state.setCurrentConnection);
  const resetConnection = useConnectionManagerStore(state => state.resetConnection);
  
  // Get functions from other stores
  const addToCanvas = usePolicyDragDropStore(state => state.addToCanvas);
  const addConnectionLine = useCanvasStore(state => state.addConnectionLine);
  
  // Enable connection mode by default
  useEffect(() => {
    if (!connectionMode) {
      toggleConnectionMode();
    }
  }, [connectionMode, toggleConnectionMode]);

  // Expose the completeConnection method to parent components
  useImperativeHandle(ref, () => ({
    completeConnection: (workloadId: string, clusterId: string) => {
      console.log(`🚨 completeConnection called with workloadId=${workloadId}, clusterId=${clusterId}`);
      console.log(`🔍 DEBUG: Current store state:`, {
        connectionMode,
        activeConnectionSource: activeConnection.source,
        activeConnectionType: activeConnection.sourceType,
        quickPolicyDialogOpen
      });
      
      if (!workloadId || !clusterId) {
        console.error("❌ Missing workload or cluster ID");
        return;
      }
      
      // Find workload and cluster details
      let workload = workloads.find(w => w.name === workloadId);
      const cluster = clusters.find(c => c.name === clusterId);
      
      console.log(`🔍 DEBUG: Available workloads:`, workloads.map(w => w.name));
      console.log(`🔍 DEBUG: Available clusters:`, clusters.map(c => c.name));
      
      // Try partial matching for workload names if needed
      if (!workload) {
        console.log(`⚠️ Workload "${workloadId}" not found with exact match, trying partial match...`);
        workload = workloads.find(w => 
          w.name.includes(workloadId) || 
          workloadId.includes(w.name)
        );
      }
      
      console.log(`🔄 Found workload:`, workload, `and cluster:`, cluster);
      
      if (!workload || !cluster) {
        console.error("❌ Could not find workload or cluster");
        setInvalidConnectionWarning(`Could not find ${!workload ? 'workload' : 'cluster'} with the specified ID. Please try again.`);
        return;
      }
      
      // Use the actual workload name from the found object
      const actualWorkloadName = workload.name;
      const actualClusterName = cluster.name;
      
      // Setup connection information
      console.log(`✅ Setting up connection dialog for ${actualWorkloadName} to ${actualClusterName}`);
      
      try {
        // Set current connection in store
        setCurrentConnection({
          workloadName: actualWorkloadName,
          workloadNamespace: workload.namespace || 'default',
          clusterName: actualClusterName
        });
        
        // Add workload and cluster to canvas if they aren't already there
        if (addToCanvas) {
          addToCanvas('workload', actualWorkloadName);
          addToCanvas('cluster', actualClusterName);
        }
        
        // Add connection line
        if (addConnectionLine) {
          console.log(`🔄 Adding connection line for workload-${actualWorkloadName} to cluster-${actualClusterName}`);
          addConnectionLine(`workload-${actualWorkloadName}`, `cluster-${actualClusterName}`, '#9c27b0');
        }
        
        // Open the quick policy dialog
        console.log('🚨 Opening quick policy dialog');
        setQuickPolicyDialogOpen(true);
        
        // Reset active connection state
        resetConnection();
        
        console.log('✅ Connection process completed successfully');
      } catch (error) {
        console.error('❌ Error during connection process:', error);
        setInvalidConnectionWarning(`An error occurred while setting up the connection: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }), [workloads, clusters, setInvalidConnectionWarning, setCurrentConnection, addToCanvas, addConnectionLine, setQuickPolicyDialogOpen, resetConnection, activeConnection.source, activeConnection.sourceType, quickPolicyDialogOpen, connectionMode]);

  // Handle quick policy save
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
    
    // Call the parent component's handler
    onQuickPolicySave(config);
    
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
    
    // Close the dialog
    setQuickPolicyDialogOpen(false);
    
    // Don't reset connection mode since we want it to be the default
    
    console.log('✅ Quick policy created with configuration');
  }, [currentConnection, workloads, clusters, onQuickPolicySave, addToCanvas, addConnectionLine, setSuccessMessage, setQuickPolicyDialogOpen]);

  return (
    <>
      {connectionMode && activeConnection.source && (
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
            {`Select a ${activeConnection.sourceType === 'workload' ? 'cluster' : 'workload'} to complete the connection`}
          </Typography>
        </Paper>
      )}
      
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
    </>
  );
});

export default React.memo(ConnectionManager); 
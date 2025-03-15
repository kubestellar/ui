import React, { useCallback } from 'react';
import { Box, Button, Typography, Paper, Snackbar, Alert, alpha } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import InfoIcon from '@mui/icons-material/Info';
import AddLinkIcon from '@mui/icons-material/AddLink';
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

const ConnectionManager: React.FC<ConnectionManagerProps> = ({
  workloads,
  clusters,
  onQuickPolicySave,
  setSuccessMessage
}) => {
  // Get state and actions from the connection manager store
  const connectionMode = useConnectionManagerStore(state => state.connectionMode);
  const toggleConnectionMode = useConnectionManagerStore(state => state.toggleConnectionMode);
  const activeConnection = useConnectionManagerStore(state => state.activeConnection);
  const invalidConnectionWarning = useConnectionManagerStore(state => state.invalidConnectionWarning);
  const setInvalidConnectionWarning = useConnectionManagerStore(state => state.setInvalidConnectionWarning);
  const quickPolicyDialogOpen = useConnectionManagerStore(state => state.quickPolicyDialogOpen);
  const setQuickPolicyDialogOpen = useConnectionManagerStore(state => state.setQuickPolicyDialogOpen);
  const currentConnection = useConnectionManagerStore(state => state.currentConnection);
//  const setCurrentConnection = useConnectionManagerStore(state => state.setCurrentConnection);
  //const resetConnection = useConnectionManagerStore(state => state.resetConnection);
  
  // Get functions from other stores
  const addToCanvas = usePolicyDragDropStore(state => state.addToCanvas);
  const addConnectionLine = useCanvasStore(state => state.addConnectionLine);
  
  // Handle completing a connection
//   const handleCompleteConnection = useCallback((workloadId: string, clusterId: string) => {
//     console.log(`🚨 handleCompleteConnection called with workloadId=${workloadId}, clusterId=${clusterId}`);
//     console.log(`🚨 Available workloads:`, workloads.map(w => w.name));
//     console.log(`🚨 Available clusters:`, clusters.map(c => c.name));
    
//     if (!workloadId || !clusterId) {
//       console.error("❌ Missing workload or cluster ID");
//       return;
//     }
    
//     // Find workload and cluster details - with enhanced handling for hyphenated names
//     // Try exact matching first
//     let workload = workloads.find(w => w.name === workloadId);
//     const cluster = clusters.find(c => c.name === clusterId);
    
//     // If workload wasn't found with exact match, try checking if it's a partial match
//     // This handles cases where only part of a hyphenated name was passed
//     if (!workload) {
//       console.log(`⚠️ Workload "${workloadId}" not found with exact match, trying partial match...`);
//       workload = workloads.find(w => 
//         w.name.includes(workloadId) || 
//         workloadId.includes(w.name)
//       );
      
//       if (workload) {
//         console.log(`✅ Found workload with partial match: ${workload.name}`);
//       }
//     }
    
//     console.log(`🔄 Found workload:`, workload, `and cluster:`, cluster);
    
//     if (!workload || !cluster) {
//       console.error("❌ Could not find workload or cluster");
//       console.error(`❌ Looked for workload "${workloadId}" and cluster "${clusterId}"`);
      
//       // Show an error message
//       setInvalidConnectionWarning(`Could not find ${!workload ? 'workload' : 'cluster'} with the specified ID. Please try again.`);
//       return;
//     }
    
//     // Use the actual workload name from the found object to ensure consistency
//     const actualWorkloadName = workload.name;
//     const actualClusterName = cluster.name;
    
//     // Open quick policy dialog with connection information
//     console.log(`✅ Setting up connection dialog for ${actualWorkloadName} to ${actualClusterName}`);
    
//     setCurrentConnection({
//       workloadName: actualWorkloadName,
//       workloadNamespace: workload.namespace || 'default',
//       clusterName: actualClusterName
//     });
    
//     // Add connection to the canvas if not already present
//     if (addConnectionLine) {
//       console.log(`🔄 Adding connection line for workload-${actualWorkloadName} to cluster-${actualClusterName}`);
//       addConnectionLine(`workload-${actualWorkloadName}`, `cluster-${actualClusterName}`, '#9c27b0');
//     } else {
//       console.error('❌ addConnectionLine is not available!');
//     }
    
//     // Open the quick policy dialog
//     console.log('🚨 Opening quick policy dialog');
//     setQuickPolicyDialogOpen(true);
    
//     // Clear active connection
//     resetConnection();
//   }, [workloads, clusters, setInvalidConnectionWarning, setCurrentConnection, setQuickPolicyDialogOpen, addConnectionLine, resetConnection]);

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
    
    // Reset connection mode
    toggleConnectionMode();
    
    console.log('✅ Quick policy created with configuration');
  }, [currentConnection, workloads, clusters, onQuickPolicySave, addToCanvas, addConnectionLine, setSuccessMessage, setQuickPolicyDialogOpen, toggleConnectionMode]);

  return (
    <>
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
};

export default React.memo(ConnectionManager); 
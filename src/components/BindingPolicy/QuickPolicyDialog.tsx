import React, { useEffect, useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  MenuItem, 
  FormControlLabel, 
  Switch, 
  Box, 
  Typography, 
  Chip 
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { PolicyConfiguration } from './ConfigurationSidebar';

export interface QuickPolicyDialogProps {
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
    if (!name || !namespace) {
      console.error("❌ Missing required fields (name or namespace)");
      return;
    }
    
    console.log("🔄 Quick Policy Dialog - saving policy with:", { 
      name, 
      namespace, 
      propagationMode, 
      updateStrategy,
      customLabels,
      connection 
    });
    
    try {
      // Create the policy configuration object
      const policyConfig = {
        name,
        namespace,
        propagationMode: propagationMode as 'DownsyncOnly' | 'UpsyncOnly' | 'BidirectionalSync',
        updateStrategy: updateStrategy as 'ServerSideApply' | 'ForceApply' | 'RollingUpdate' | 'BlueGreenDeployment',
        customLabels,
        deploymentType: 'SelectedClusters' as 'SelectedClusters' | 'AllClusters',
        schedulingRules: [],
        tolerations: []
      };
      
      // Call the onSave callback with the policy configuration
      onSave(policyConfig);
      
      console.log("✅ Quick Policy Dialog - policy saved successfully:", policyConfig);
      
      // Reset form
      setName('');
      setNamespace('default');
      setPropagationMode('DownsyncOnly');
      setUpdateStrategy('ServerSideApply');
      setCustomLabels({});
    } catch (error) {
      console.error("❌ Error saving policy:", error);
    }
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

export default QuickPolicyDialog; 
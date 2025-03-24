import React, { useState, useEffect, useMemo } from 'react';
import {
  Drawer,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Stack,
  Chip,
  Paper,
  Alert,
  Tooltip,
  Tab,
  Tabs
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import InfoIcon from '@mui/icons-material/Info';
import SaveIcon from '@mui/icons-material/Save';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CodeIcon from '@mui/icons-material/Code';
import TuneIcon from '@mui/icons-material/Tune';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import { SelectChangeEvent } from '@mui/material';

// Scheduling rule types
type OperatorType = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'In' | 'NotIn' | 'Exists' | 'DoesNotExist';
type ResourceType = 'cpu' | 'memory' | 'storage' | 'pods';

interface SchedulingRule {
  resource: ResourceType;
  operator: OperatorType;
  value: string;
}

export interface PolicyConfiguration {
  name: string;
  namespace: string;
  propagationMode: 'DownsyncOnly' | 'UpsyncOnly' | 'BidirectionalSync';
  updateStrategy: 'ServerSideApply' | 'ForceApply' | 'RollingUpdate' | 'BlueGreenDeployment';
  deploymentType: 'AllClusters' | 'SelectedClusters';
  schedulingRules: SchedulingRule[];
  customLabels: Record<string, string>;
  tolerations: string[];
}

interface ConfigurationSidebarProps {
  open: boolean;
  onClose: () => void;
  selectedConnection: {
    source: { type: string; id: string; name: string };
    target: { type: string; id: string; name: string };
  } | undefined;
  onSaveConfiguration: (config: PolicyConfiguration) => void;
  dialogMode?: boolean;
}

const ConfigurationSidebar: React.FC<ConfigurationSidebarProps> = ({
  open,
  onClose,
  selectedConnection,
  onSaveConfiguration,

}) => {
  // Form state
  const [name, setName] = useState('');
  const [namespace, setNamespace] = useState('default');
  const [propagationMode, setPropagationMode] = useState<'DownsyncOnly' | 'UpsyncOnly' | 'BidirectionalSync'>('DownsyncOnly');
  const [updateStrategy, setUpdateStrategy] = useState<'ServerSideApply' | 'ForceApply' | 'RollingUpdate' | 'BlueGreenDeployment'>('ServerSideApply');
  const [deploymentType, setDeploymentType] = useState<'AllClusters' | 'SelectedClusters'>('SelectedClusters');
  const [addLabels, setAddLabels] = useState(true);
  const [labelKey, setLabelKey] = useState('');
  const [labelValue, setLabelValue] = useState('');
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});
  const [schedulingRules, setSchedulingRules] = useState<SchedulingRule[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tolerations, setTolerations] = useState<string[]>([]);
  const [tolerationInput, setTolerationInput] = useState('');
  const [currentTab, setCurrentTab] = useState(0);

  // New scheduling rule form state
  const [newRule, setNewRule] = useState<SchedulingRule>({
    resource: 'cpu',
    operator: '>=',
    value: ''
  });

  // Initialize form when selected connection changes
  useEffect(() => {
    if (selectedConnection) {
      // Get source and target details
      const source = selectedConnection.source;
      const target = selectedConnection.target;
      
      // Determine workload and cluster
      let workloadName, clusterName;
      if (source.type === 'workload') {
        workloadName = source.name;
        clusterName = target.name;
      } else {
        workloadName = target.name;
        clusterName = source.name;
      }
      
      // Set default name based on workload and cluster
      setName(`${workloadName}-to-${clusterName}`);
      
      // Reset other fields
      setNamespace('default');
      setPropagationMode('DownsyncOnly');
      setUpdateStrategy('ServerSideApply');
      setDeploymentType('SelectedClusters');
      setCustomLabels({});
      setSchedulingRules([]);
      setTolerations([]);
      setErrors({});
    }
  }, [selectedConnection]);

  // Handle adding a custom label
  const handleAddLabel = () => {
    if (!labelKey || !labelValue) {
      setErrors({
        ...errors,
        label: 'Both key and value are required'
      });
      return;
    }
    
    // Check if key already exists
    if (customLabels[labelKey]) {
      setErrors({
        ...errors,
        label: 'Label key already exists'
      });
      return;
    }
    
    // Add label
    setCustomLabels({
      ...customLabels,
      [labelKey]: labelValue
    });
    
    // Clear fields and errors
    setLabelKey('');
    setLabelValue('');
    setErrors({
      ...errors,
      label: ''
    });
  };

  // Handle removing a custom label
  const handleRemoveLabel = (key: string) => {
    const newLabels = { ...customLabels };
    delete newLabels[key];
    setCustomLabels(newLabels);
  };

  // Handle adding a scheduling rule
  const handleAddRule = () => {
    if (!newRule.value && newRule.operator !== 'Exists' && newRule.operator !== 'DoesNotExist') {
      setErrors({
        ...errors,
        rule: 'Value is required for this operator'
      });
      return;
    }

    setSchedulingRules([...schedulingRules, { ...newRule }]);
    
    // Reset new rule form
    setNewRule({
      resource: 'cpu',
      operator: '>=',
      value: ''
    });
    
    setErrors({
      ...errors,
      rule: ''
    });
  };

  // Handle removing a scheduling rule
  const handleRemoveRule = (index: number) => {
    setSchedulingRules(schedulingRules.filter((_, i) => i !== index));
  };

  // Handle adding a toleration
  const handleAddToleration = () => {
    if (!tolerationInput) {
      setErrors({
        ...errors,
        toleration: 'Toleration is required'
      });
      return;
    }
    
    setTolerations([...tolerations, tolerationInput]);
    setTolerationInput('');
    
    setErrors({
      ...errors,
      toleration: ''
    });
  };

  // Handle removing a toleration
  const handleRemoveToleration = (index: number) => {
    setTolerations(tolerations.filter((_, i) => i !== index));
  };

  // Generate YAML preview
  const yamlPreview = useMemo(() => {
    try {
      const config = {
        apiVersion: 'policy.kubestellar.io/v1alpha1',
        kind: 'BindingPolicy',
        metadata: {
          name,
          namespace,
          labels: customLabels
        },
        spec: {
          deploymentType,
          propagationMode,
          updateStrategy,
          clusterSelector: {
            matchLabels: {
              ...customLabels
            }
          },
          scheduling: schedulingRules.length > 0 ? {
            rules: schedulingRules.map(rule => ({
              resource: rule.resource,
              operator: rule.operator,
              value: rule.value
            }))
          } : undefined,
          tolerations: tolerations.length > 0 ? tolerations : undefined
        }
      };
      
      return JSON.stringify(config, null, 2)
        .replace(/"([^"]+)":/g, '$1:')       // Remove quotes around property names
        .replace(/"/g, "'")                 // Replace double quotes with single quotes
        .replace(/'/g, '"')                 // Put back quotes for string values
        .replace(/"/g, "'")                 // Convert back to single quotes
        .replace(/true/g, 'true')           // Leave booleans unquoted
        .replace(/false/g, 'false')
        .replace(/null/g, 'null');
    } catch (error: unknown) {
      return '# Error generating YAML preview';
      console.error('Error generating YAML preview:', error);
    }
  }, [name, namespace, propagationMode, updateStrategy, deploymentType, customLabels, schedulingRules, tolerations]);

  // Copy YAML to clipboard
  const handleCopyYaml = () => {
    navigator.clipboard.writeText(yamlPreview);
    // You could add a toast notification here
  };

  // Handle form submission
  const handleSave = () => {
    // Validate form
    const newErrors: Record<string, string> = {};
    
    if (!name) {
      newErrors.name = 'Name is required';
    }
    
    if (!namespace) {
      newErrors.namespace = 'Namespace is required';
    }
    
    // If there are errors, don't submit
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Create configuration object
    const config: PolicyConfiguration = {
      name,
      namespace,
      propagationMode,
      updateStrategy,
      deploymentType,
      schedulingRules,
      customLabels: addLabels ? customLabels : {},
      tolerations
    };
    
    // Call the save function
    onSaveConfiguration(config);
    
    // Reset form
    setName('');
    setNamespace('default');
    setPropagationMode('DownsyncOnly');
    setUpdateStrategy('ServerSideApply');
    setDeploymentType('SelectedClusters');
    setCustomLabels({});
    setSchedulingRules([]);
    setTolerations([]);
    setErrors({});
  };

  // Get source and target details for display
  const getConnectionDetails = () => {
    if (!selectedConnection) return null;
    
    const source = selectedConnection.source;
    const target = selectedConnection.target;
    
    return (
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
        <Typography variant="subtitle2" gutterBottom>
          Creating Binding Policy for:
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Chip 
            size="small" 
            label={source.name} 
            color={source.type === 'workload' ? 'success' : 'info'} 
          />
          <ArrowForwardIcon fontSize="small" color="action" />
          <Chip 
            size="small" 
            label={target.name}
            color={target.type === 'workload' ? 'success' : 'info'} 
          />
        </Box>
        <Typography variant="caption" color="text.secondary">
          This will create a binding policy that links the {source.type} to the {target.type}.
        </Typography>
      </Paper>
    );
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: '500px',
          boxSizing: 'border-box',
          p: 3
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Configure Binding Policy</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      {/* Connection Details */}
      {getConnectionDetails()}
      
      {/* Tabs for organization */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs 
          value={currentTab} 
          onChange={(_, newValue) => setCurrentTab(newValue)}
          aria-label="policy configuration tabs"
        >
          <Tab icon={<InfoIcon />} label="Basic" />
          <Tab icon={<TuneIcon />} label="Advanced" />
          <Tab icon={<ScheduleIcon />} label="Scheduling" />
          <Tab icon={<CodeIcon />} label="YAML" />
        </Tabs>
      </Box>
      
      {/* Basic Settings Tab */}
      {currentTab === 0 && (
        <Box component="form" noValidate autoComplete="off">
          <TextField
            fullWidth
            label="Policy Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={!!errors.name}
            helperText={errors.name || 'Name of the binding policy'}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            label="Namespace"
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            error={!!errors.namespace}
            helperText={errors.namespace || 'Namespace for the binding policy'}
            margin="normal"
            required
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Propagation Mode</InputLabel>
            <Select
              value={propagationMode}
              onChange={(e: SelectChangeEvent) => setPropagationMode(e.target.value as 'DownsyncOnly' | 'UpsyncOnly' | 'BidirectionalSync')}
              label="Propagation Mode"
            >
              <MenuItem value="DownsyncOnly">Downsync Only</MenuItem>
              <MenuItem value="UpsyncOnly">Upsync Only</MenuItem>
              <MenuItem value="BidirectionalSync">Bidirectional Sync</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Deployment Type</InputLabel>
            <Select
              value={deploymentType}
              onChange={(e: SelectChangeEvent) => setDeploymentType(e.target.value as 'AllClusters' | 'SelectedClusters')}
              label="Deployment Type"
            >
              <MenuItem value="SelectedClusters">Selected Clusters</MenuItem>
              <MenuItem value="AllClusters">All Available Clusters</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}
      
      {/* Advanced Settings Tab */}
      {currentTab === 1 && (
        <Box component="form" noValidate autoComplete="off">
          <FormControl fullWidth margin="normal">
            <InputLabel>Update Strategy</InputLabel>
            <Select
              value={updateStrategy}
              onChange={(e: SelectChangeEvent) => setUpdateStrategy(e.target.value as 'ServerSideApply' | 'ForceApply' | 'RollingUpdate' | 'BlueGreenDeployment')}
              label="Update Strategy"
            >
              <MenuItem value="ServerSideApply">Server Side Apply</MenuItem>
              <MenuItem value="ForceApply">Force Apply</MenuItem>
              <MenuItem value="RollingUpdate">Rolling Update</MenuItem>
              <MenuItem value="BlueGreenDeployment">Blue-Green Deployment</MenuItem>
            </Select>
          </FormControl>
          
          <Box sx={{ mt: 3, mb: 2 }}>
            <FormControlLabel
              control={<Switch checked={addLabels} onChange={(e) => setAddLabels(e.target.checked)} />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ mr: 1 }}>Add custom labels</Typography>
                  <Tooltip title="Labels help identify and select resources">
                    <InfoIcon fontSize="small" color="action" />
                  </Tooltip>
                </Box>
              }
            />
          </Box>
          
          {addLabels && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', mb: 1 }}>
                <TextField
                  size="small"
                  label="Key"
                  value={labelKey}
                  onChange={(e) => setLabelKey(e.target.value)}
                  sx={{ mr: 1, flexGrow: 1 }}
                  error={!!errors.label}
                />
                <TextField
                  size="small"
                  label="Value"
                  value={labelValue}
                  onChange={(e) => setLabelValue(e.target.value)}
                  sx={{ mr: 1, flexGrow: 1 }}
                  error={!!errors.label}
                />
                <Button
                  variant="outlined"
                  onClick={handleAddLabel}
                  startIcon={<AddIcon />}
                >
                  Add
                </Button>
              </Box>
              
              {errors.label && (
                <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
                  {errors.label}
                </Typography>
              )}
              
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
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom>
            Tolerations (Advanced)
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', mb: 1 }}>
              <TextField
                size="small"
                label="Toleration Expression"
                placeholder="key=value:effect"
                value={tolerationInput}
                onChange={(e) => setTolerationInput(e.target.value)}
                sx={{ mr: 1, flexGrow: 1 }}
                error={!!errors.toleration}
                helperText={errors.toleration}
              />
              <Button
                variant="outlined"
                onClick={handleAddToleration}
                startIcon={<AddIcon />}
              >
                Add
              </Button>
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {tolerations.map((toleration, index) => (
                <Chip
                  key={index}
                  label={toleration}
                  onDelete={() => handleRemoveToleration(index)}
                  size="small"
                />
              ))}
            </Box>
          </Box>
        </Box>
      )}
      
      {/* Scheduling Rules Tab */}
      {currentTab === 2 && (
        <Box component="form" noValidate autoComplete="off">
          <Typography variant="subtitle2" gutterBottom>
            Scheduling Rules
            <Tooltip title="Define conditions that must be met for a cluster to receive this workload">
              <InfoIcon fontSize="small" sx={{ ml: 1, verticalAlign: 'middle' }} color="action" />
            </Tooltip>
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', mb: 1, gap: 1 }}>
              <FormControl size="small" sx={{ flexGrow: 1 }}>
                <InputLabel>Resource</InputLabel>
                <Select
                  value={newRule.resource}
                  label="Resource"
                  onChange={(e: SelectChangeEvent) => setNewRule({...newRule, resource: e.target.value as ResourceType})}
                >
                  <MenuItem value="cpu">CPU Cores</MenuItem>
                  <MenuItem value="memory">Memory</MenuItem>
                  <MenuItem value="storage">Storage</MenuItem>
                  <MenuItem value="pods">Available Pods</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ flexGrow: 1 }}>
                <InputLabel>Operator</InputLabel>
                <Select
                  value={newRule.operator}
                  label="Operator"
                  onChange={(e: SelectChangeEvent) => setNewRule({...newRule, operator: e.target.value as OperatorType})}
                >
                  <MenuItem value="=">=</MenuItem>
                  <MenuItem value="!=">!=</MenuItem>
                  <MenuItem value=">">{">"}</MenuItem>
                  <MenuItem value=">=">{"≥"}</MenuItem>
                  <MenuItem value="<">{"<"}</MenuItem>
                  <MenuItem value="<=">{"≤"}</MenuItem>
                  <MenuItem value="In">In</MenuItem>
                  <MenuItem value="NotIn">Not In</MenuItem>
                  <MenuItem value="Exists">Exists</MenuItem>
                  <MenuItem value="DoesNotExist">Does Not Exist</MenuItem>
                </Select>
              </FormControl>
              
              {newRule.operator !== 'Exists' && newRule.operator !== 'DoesNotExist' && (
                <TextField
                  size="small"
                  label="Value"
                  value={newRule.value}
                  onChange={(e) => setNewRule({...newRule, value: e.target.value})}
                  sx={{ flexGrow: 1 }}
                  error={!!errors.rule}
                  placeholder={newRule.resource === 'cpu' ? '2' : 
                              newRule.resource === 'memory' ? '4Gi' : 
                              newRule.resource === 'storage' ? '10Gi' : '20'}
                />
              )}
              
              <Button
                variant="outlined"
                onClick={handleAddRule}
                startIcon={<AddIcon />}
              >
                Add
              </Button>
            </Box>
            
            {errors.rule && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
                {errors.rule}
              </Typography>
            )}
            
            {schedulingRules.length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                No scheduling rules added. The policy will apply to all matching clusters regardless of their resources.
              </Alert>
            ) : (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Active Rules:
                </Typography>
                <Stack spacing={1}>
                  {schedulingRules.map((rule, index) => (
                    <Paper key={index} sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">
                        {rule.resource === 'cpu' ? 'CPU Cores' : 
                         rule.resource === 'memory' ? 'Memory' :
                         rule.resource === 'storage' ? 'Storage' : 'Available Pods'}
                        {' '}
                        {rule.operator === '=' ? '=' : 
                         rule.operator === '!=' ? '≠' :
                         rule.operator === '>' ? '>' :
                         rule.operator === '>=' ? '≥' :
                         rule.operator === '<' ? '<' :
                         rule.operator === '<=' ? '≤' :
                         rule.operator === 'In' ? 'in' :
                         rule.operator === 'NotIn' ? 'not in' :
                         rule.operator === 'Exists' ? 'exists' : 'does not exist'}
                        {' '}
                        {(rule.operator !== 'Exists' && rule.operator !== 'DoesNotExist') ? rule.value : ''}
                      </Typography>
                      <IconButton size="small" onClick={() => handleRemoveRule(index)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        </Box>
      )}
      
      {/* YAML Preview Tab */}
      {currentTab === 3 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle2">
              YAML Preview
            </Typography>
            <Button
              startIcon={<FileCopyIcon />}
              onClick={handleCopyYaml}
              size="small"
            >
              Copy
            </Button>
          </Box>
          
          <Paper
            sx={{
              p: 2,
              bgcolor: 'background.default',
              maxHeight: '400px',
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              mb: 2
            }}
          >
            {yamlPreview}
          </Paper>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            This is a preview of the YAML that will be applied. You can make changes in the other tabs to update this preview.
          </Alert>
        </Box>
      )}
      
      {/* Action Buttons (always shown) */}
      <Box sx={{ mt: 'auto', pt: 2, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid', borderColor: 'divider' }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{ mr: 1 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          startIcon={<SaveIcon />}
          disabled={!name || !namespace}
        >
          Create Binding Policy
        </Button>
      </Box>
    </Drawer>
  );
};

export default ConfigurationSidebar; 
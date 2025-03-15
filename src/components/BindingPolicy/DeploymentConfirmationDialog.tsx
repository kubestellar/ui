import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StorageIcon from '@mui/icons-material/Storage';
import DnsIcon from '@mui/icons-material/Dns';
import LinkIcon from '@mui/icons-material/Link';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CodeIcon from '@mui/icons-material/Code';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { PolicyConfiguration } from './ConfigurationSidebar';
import {  ManagedCluster, Workload } from '../../types/bindingPolicy';

export interface DeploymentPolicy {
  id: string;
  name: string;
  workloadId: string;
  clusterId: string;
  workloadName: string;
  clusterName: string;
  config: PolicyConfiguration;
  yaml?: string;
}

interface DeploymentConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  policies: DeploymentPolicy[];
  onConfirm: () => void;
  loading?: boolean;
  error?: string | null;
  clusters: ManagedCluster[];
  workloads: Workload[];
}

const DeploymentConfirmationDialog: React.FC<DeploymentConfirmationDialogProps> = ({
  open,
  onClose,
  policies,
  onConfirm,
  loading = false,
  error = null,
  clusters,
  workloads
}) => {
  // State for YAML preview
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);

  // Generate a summary of the policies being deployed
  const summary = useMemo(() => {
    const uniqueWorkloads = new Set(policies.map(p => p.workloadId));
    const uniqueClusters = new Set(policies.map(p => p.clusterId));
    const schedulingRulesCount = policies.reduce((count, policy) => 
      count + (policy.config.schedulingRules?.length || 0), 0);
    const labelCount = policies.reduce((count, policy) => 
      count + Object.keys(policy.config.customLabels || {}).length, 0);
    
    return {
      policyCount: policies.length,
      workloadCount: uniqueWorkloads.size,
      clusterCount: uniqueClusters.size,
      schedulingRulesCount,
      labelCount
    };
  }, [policies]);

  // Find workload and cluster details
  const getWorkloadDetails = (workloadId: string) => {
    return workloads.find(w => w.name === workloadId);
  };

  const getClusterDetails = (clusterId: string) => {
    return clusters.find(c => c.name === clusterId);
  };

  // Copy YAML to clipboard
  const handleCopyYaml = (yaml: string) => {
    navigator.clipboard.writeText(yaml);
    // You could add a success feedback here
  };

  return (
    <Dialog 
      open={open} 
      onClose={loading ? undefined : onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '80vh'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Confirm Binding Policy Deployment</Typography>
        {!loading && (
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>
      
      <DialogContent>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="h6">Deploying Binding Policies...</Typography>
            <Typography variant="body2" color="text.secondary">
              Applying {policies.length} binding policies to KubeStellar
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Deployment Failed
            </Typography>
            <Typography variant="body2">
              {error}
            </Typography>
          </Alert>
        ) : (
          <>
            {/* Summary Box */}
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                bgcolor: 'background.default', 
                mb: 3,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1
              }}
            >
              <Typography variant="subtitle1" gutterBottom>
                You are about to deploy:
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                <Chip 
                  icon={<LinkIcon />} 
                  label={`${summary.policyCount} Binding ${summary.policyCount === 1 ? 'Policy' : 'Policies'}`}
                  color="primary"
                />
                <Chip 
                  icon={<DnsIcon />} 
                  label={`${summary.workloadCount} ${summary.workloadCount === 1 ? 'Workload' : 'Workloads'}`}
                  color="success"
                />
                <Chip 
                  icon={<StorageIcon />} 
                  label={`${summary.clusterCount} ${summary.clusterCount === 1 ? 'Cluster' : 'Clusters'}`}
                  color="info"
                />
                {summary.schedulingRulesCount > 0 && (
                  <Chip 
                    label={`${summary.schedulingRulesCount} Scheduling ${summary.schedulingRulesCount === 1 ? 'Rule' : 'Rules'}`}
                    variant="outlined"
                  />
                )}
                {summary.labelCount > 0 && (
                  <Chip 
                    label={`${summary.labelCount} ${summary.labelCount === 1 ? 'Label' : 'Labels'}`}
                    variant="outlined"
                  />
                )}
              </Box>
            </Paper>
            
            {/* List of Policies */}
            <Typography variant="subtitle1" gutterBottom>
              Binding Policies to Deploy:
            </Typography>
            
            <List sx={{ mb: 2 }}>
              {policies.map((policy) => {
                const workload = getWorkloadDetails(policy.workloadId);
                const cluster = getClusterDetails(policy.clusterId);
                
                return (
                  <Paper 
                    key={policy.id} 
                    sx={{ 
                      mb: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1
                    }}
                  >
                    <ListItem
                      secondaryAction={
                        <Chip 
                          size="small" 
                          label={policy.config.propagationMode}
                          color="primary"
                          variant="outlined"
                        />
                      }
                    >
                      <ListItemIcon>
                        <LinkIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={policy.name}
                        secondary={`Namespace: ${policy.config.namespace} | Strategy: ${policy.config.updateStrategy}`}
                      />
                    </ListItem>
                    
                    <Divider />
                    
                    <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ minWidth: 200 }}>
                        <Typography variant="caption" color="text.secondary">
                          Workload:
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <DnsIcon color="success" fontSize="small" sx={{ mr: 1 }} />
                          <Typography variant="body2">
                            {workload ? (
                              <>
                                {workload.name}
                                <Typography variant="caption" display="block" color="text.secondary">
                                  {workload.namespace}/{workload.type}
                                </Typography>
                              </>
                            ) : policy.workloadName}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ minWidth: 200 }}>
                        <Typography variant="caption" color="text.secondary">
                          Target Cluster:
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <StorageIcon color="info" fontSize="small" sx={{ mr: 1 }} />
                          <Typography variant="body2">
                            {cluster ? cluster.name : policy.clusterName}
                          </Typography>
                        </Box>
                      </Box>
                      
                      {policy.config.schedulingRules && policy.config.schedulingRules.length > 0 && (
                        <Box sx={{ minWidth: 200 }}>
                          <Typography variant="caption" color="text.secondary">
                            Scheduling Rules:
                          </Typography>
                          <Box sx={{ mt: 0.5 }}>
                            {policy.config.schedulingRules.map((rule, idx) => (
                              <Typography key={idx} variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                                <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 0.5 }} />
                                {rule.resource} {rule.operator} {rule.value}
                              </Typography>
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                    
                    {policy.yaml && (
                      <Accordion 
                        expanded={selectedPolicyId === policy.id}
                        onChange={() => setSelectedPolicyId(selectedPolicyId === policy.id ? null : policy.id)}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CodeIcon fontSize="small" sx={{ mr: 1 }} />
                            <Typography variant="body2">View YAML</Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box sx={{ position: 'relative' }}>
                            <Paper
                              sx={{
                                p: 2,
                                bgcolor: 'background.default',
                                maxHeight: '250px',
                                overflow: 'auto',
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                                whiteSpace: 'pre',
                                position: 'relative'
                              }}
                            >
                              {policy.yaml}
                            </Paper>
                            <Tooltip title="Copy YAML">
                              <IconButton 
                                size="small" 
                                sx={{ 
                                  position: 'absolute', 
                                  top: 8, 
                                  right: 8,
                                  bgcolor: 'background.paper',
                                  '&:hover': {
                                    bgcolor: 'action.hover'
                                  }
                                }}
                                onClick={() => handleCopyYaml(policy.yaml || '')}
                              >
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    )}
                  </Paper>
                );
              })}
            </List>
            
            <Alert severity="info" sx={{ mt: 2 }}>
              These binding policies will be applied to your KubeStellar environment. 
              Once deployed, they will begin syncing workloads to the target clusters.
            </Alert>
          </>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        {loading ? (
          <Button disabled>
            Deploying...
          </Button>
        ) : error ? (
          <>
            <Button onClick={onClose} variant="outlined" color="secondary">
              Close
            </Button>
            <Button onClick={onConfirm} variant="contained" color="primary">
              Retry Deployment
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose} variant="outlined" disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={onConfirm} 
              variant="contained" 
              color="primary" 
              disabled={loading || policies.length === 0}
            >
              Deploy Policies
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DeploymentConfirmationDialog; 
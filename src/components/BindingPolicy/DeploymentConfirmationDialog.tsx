import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import { PolicyConfiguration } from './ConfigurationSidebar';
import { ManagedCluster, Workload } from '../../types/bindingPolicy';
import KubernetesIcon from './KubernetesIcon';
import { Editor } from '@monaco-editor/react';

export interface DeploymentPolicy {
  id: string;
  name: string;
  workloadIds: string[];
  clusterIds: string[];
  workloadName: string;
  clusterName: string;
  config: PolicyConfiguration;
  yaml: string;
}

interface DeploymentConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  policies: DeploymentPolicy[];
  onConfirm: () => void;
  loading?: boolean;
  error?: string | null;
  clusters?: ManagedCluster[];
  workloads?: Workload[];
  darkMode?: boolean;
}

const DeploymentConfirmationDialog: React.FC<DeploymentConfirmationDialogProps> = ({
  open,
  onClose,
  policies,
  onConfirm,
  loading = false,
  error = null,
  clusters = [],
  workloads = [],
  darkMode = false
}) => {
  // State for YAML preview
  const [selectedPolicy, setSelectedPolicy] = useState<DeploymentPolicy | null>(null);



  const viewPolicyYaml = (policy: DeploymentPolicy) => {
    setSelectedPolicy(policy);
  };

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose()}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          maxWidth: '800px',
          maxHeight: '90vh',
          bgcolor: darkMode ? 'rgba(17, 25, 40, 0.95)' : undefined,
          color: darkMode ? '#FFFFFF' : undefined,
          border: darkMode ? '1px solid rgba(255, 255, 255, 0.15)' : undefined,
          backdropFilter: 'blur(10px)'
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: darkMode ? 'rgba(17, 25, 40, 0.95)' : undefined,
        color: darkMode ? 'rgba(255, 255, 255, 0.9)' : undefined
      }}>
        <Typography variant="h6">Confirm Binding Policy Deployment</Typography>
      </DialogTitle>
      <DialogContent sx={{ 
        p: 2,
        bgcolor: darkMode ? 'rgba(17, 25, 40, 0.95)' : undefined 
      }}>
        <Typography 
          variant="body1" 
          sx={{ 
            mb: 2,
            color: darkMode ? 'rgba(255, 255, 255, 0.9)' : undefined 
          }}
        >
          You are about to deploy {policies.length} binding policies. 
          Please review them before proceeding.
        </Typography>
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 2,
              bgcolor: darkMode ? 'rgba(211, 47, 47, 0.2)' : undefined,
              color: darkMode ? '#f87171' : undefined,
              border: darkMode ? '1px solid rgba(211, 47, 47, 0.5)' : undefined,
              '& .MuiAlert-icon': {
                color: darkMode ? '#f87171' : undefined
              }
            }}
          >
            {error}
          </Alert>
        )}
        
        <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
          <TableContainer 
            component={Paper} 
            sx={{ 
              bgcolor: darkMode ? 'rgba(17, 25, 40, 0.95)' : undefined,
              border: darkMode ? '1px solid rgba(255, 255, 255, 0.15)' : undefined 
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ 
                  bgcolor: darkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(0, 0, 0, 0.05)',
                  '& th': {
                    color: darkMode ? 'rgba(255, 255, 255, 0.9)' : undefined
                  }
                }}>
                  <TableCell>Policy Name</TableCell>
                  <TableCell>Workload</TableCell>
                  <TableCell>Cluster</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {policies.map((policy) => {
                  const workload = workloads.find(w => w.name === policy.workloadIds[0]);
                  const cluster = clusters.find(c => c.name === policy.clusterIds[0]);
                  
                  return (
                    <TableRow 
                      key={policy.id}
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 },
                        bgcolor: darkMode ? 'rgba(17, 25, 40, 0.95)' : undefined,
                        '& td': {
                          color: darkMode ? 'rgba(255, 255, 255, 0.9)' : undefined,
                          borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : undefined
                        },
                        '&:hover': {
                          bgcolor: darkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(0, 0, 0, 0.04)'
                        }
                      }}
                    >
                      <TableCell>{policy.name}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <KubernetesIcon 
                            type="workload" 
                            size={20} 
                            sx={{ 
                              mr: 1,
                              color: darkMode ? '#4ade80' : undefined 
                            }} 
                          />
                          {workload?.name || policy.workloadIds.join(',')}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <KubernetesIcon 
                            type="cluster" 
                            size={20} 
                            sx={{ 
                              mr: 1,
                              color: darkMode ? '#60a5fa' : undefined 
                            }} 
                          />
                          {cluster?.name || policy.clusterIds.join(',')}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton 
                          size="small"
                          onClick={() => viewPolicyYaml(policy)}
                          sx={{ 
                            color: darkMode ? '#60a5fa' : 'primary.main',
                            '&:hover': {
                              bgcolor: darkMode ? 'rgba(37, 99, 235, 0.2)' : undefined
                            }
                          }}
                        >
                          <CodeIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </DialogContent>
      <DialogActions sx={{ 
        p: 2,
        bgcolor: darkMode ? 'rgba(17, 25, 40, 0.95)' : undefined,
        borderTop: darkMode ? '1px solid rgba(255, 255, 255, 0.15)' : undefined 
      }}>
        <Button 
          onClick={onClose} 
          disabled={loading}
          sx={{ 
            color: darkMode ? 'rgba(255, 255, 255, 0.9)' : undefined,
            '&:hover': {
              bgcolor: darkMode ? 'rgba(255, 255, 255, 0.1)' : undefined
            }
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={onConfirm}
          disabled={loading}
          sx={{
            bgcolor: darkMode ? '#2563eb' : undefined,
            color: darkMode ? '#FFFFFF' : undefined,
            '&:hover': {
              bgcolor: darkMode ? '#1d4ed8' : undefined
            },
            '&:disabled': {
              bgcolor: darkMode ? 'rgba(37, 99, 235, 0.5)' : undefined,
              color: darkMode ? 'rgba(255, 255, 255, 0.5)' : undefined
            }
          }}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {loading ? 'Deploying...' : 'Deploy Policies'}
        </Button>
      </DialogActions>
      
      {/* YAML Preview Dialog */}
      <Dialog
        open={!!selectedPolicy}
        onClose={() => setSelectedPolicy(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: '80vh',
            maxHeight: '80vh',
            bgcolor: darkMode ? 'rgba(17, 25, 40, 0.95)' : undefined,
            color: darkMode ? '#FFFFFF' : undefined,
            border: darkMode ? '1px solid rgba(255, 255, 255, 0.15)' : undefined,
            backdropFilter: 'blur(10px)'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: darkMode ? 'rgba(17, 25, 40, 0.95)' : undefined,
          color: darkMode ? 'rgba(255, 255, 255, 0.9)' : undefined
        }}>
          <Typography variant="h6">
            Policy YAML: {selectedPolicy?.name}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ 
          p: 2, 
          bgcolor: darkMode ? 'rgba(17, 25, 40, 0.95)' : undefined 
        }}>
          <Paper elevation={0} sx={{ 
            height: 'calc(100% - 32px)', 
            overflow: 'hidden',
            bgcolor: darkMode ? 'rgba(17, 25, 40, 0.95)' : undefined,
            border: darkMode ? '1px solid rgba(255, 255, 255, 0.15)' : undefined 
          }}>
            <Editor
              height="100%"
              language="yaml"
              value={selectedPolicy?.yaml || ""}
              theme={darkMode ? "vs-dark" : "light"}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                fontFamily: "'JetBrains Mono', monospace",
                padding: { top: 10 },
                readOnly: true
              }}
            />
          </Paper>
        </DialogContent>
        <DialogActions sx={{ 
          p: 2,
          bgcolor: darkMode ? 'rgba(17, 25, 40, 0.95)' : undefined,
          borderTop: darkMode ? '1px solid rgba(255, 255, 255, 0.15)' : undefined 
        }}>
          <Button 
            onClick={() => setSelectedPolicy(null)}
            sx={{
              color: darkMode ? 'rgba(255, 255, 255, 0.9)' : undefined,
              '&:hover': {
                bgcolor: darkMode ? 'rgba(255, 255, 255, 0.1)' : undefined
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default DeploymentConfirmationDialog; 
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Grid,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Divider,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  Computer as ComputerIcon,
  CheckCircle,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Storage as StorageIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import useTheme from '../../stores/themeStore';
import { PluginService, ClusterStatus, ClusterOnboardRequest } from '../../services/pluginService';

const ClusterManagement: React.FC = () => {
  const theme = useTheme(state => state.theme);
  const [clusters, setClusters] = useState<ClusterStatus[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    ready: 0,
    pending: 0,
    failed: 0,
    detaching: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnboardDialog, setShowOnboardDialog] = useState(false);
  const [onboardMethod, setOnboardMethod] = useState<'local' | 'upload' | 'manual'>('local');
  const [clusterName, setClusterName] = useState('');
  const [kubeconfig, setKubeconfig] = useState('');
  const [kubeconfigFile, setKubeconfigFile] = useState<File | null>(null);
  const [onboarding, setOnboarding] = useState(false);

  const isDark = theme === 'dark';

  const fetchClusterStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await PluginService.getClusterStatus();

      if (!response) {
        throw new Error('No response received from cluster plugin');
      }

      const clustersData = response.clusters || [];
      setClusters(Array.isArray(clustersData) ? clustersData : []);

      const summaryData = response.summary || {
        total: 0,
        ready: 0,
        pending: 0,
        failed: 0,
        detaching: 0,
      };
      setSummary(summaryData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to fetch cluster status: ${errorMessage}`);
      toast.error(`Failed to fetch cluster status: ${errorMessage}`);
      console.error('Error fetching cluster status:', error);

      setClusters([]);
      setSummary({
        total: 0,
        ready: 0,
        pending: 0,
        failed: 0,
        detaching: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClusterStatus();
    const interval = setInterval(fetchClusterStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleOnboardCluster = async () => {
    if (!clusterName.trim()) {
      toast.error('Cluster name is required');
      return;
    }

    setOnboarding(true);

    try {
      const request: ClusterOnboardRequest = {
        clusterName: clusterName.trim(),
      };

      if (onboardMethod === 'manual' && kubeconfig.trim()) {
        request.kubeconfig = kubeconfig.trim();
      } else if (onboardMethod === 'upload' && kubeconfigFile) {
        const fileContent = await kubeconfigFile.text();
        request.kubeconfig = fileContent;
      }

      const response = await PluginService.onboardCluster(request);
      toast.success(response.message || 'Cluster onboarding started successfully!');

      setShowOnboardDialog(false);
      setClusterName('');
      setKubeconfig('');
      setKubeconfigFile(null);

      setTimeout(fetchClusterStatus, 1000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to onboard cluster: ${errorMessage}`);
      console.error('Error onboarding cluster:', error);
    } finally {
      setOnboarding(false);
    }
  };

  const handleDetachCluster = async (clusterName: string) => {
    if (!window.confirm(`Are you sure you want to detach cluster "${clusterName}"?`)) {
      return;
    }

    try {
      const response = await PluginService.detachCluster({ clusterName });
      toast.success(response.message || 'Cluster detachment started successfully!');
      setTimeout(fetchClusterStatus, 1000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to detach cluster: ${errorMessage}`);
      console.error('Error detaching cluster:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ready':
        return <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />;
      case 'failed':
      case 'detachfailed':
        return <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />;
      case 'pending':
      case 'validating':
      case 'connecting':
      case 'preparing':
      case 'joining':
      case 'approving':
      case 'creating':
      case 'finalizing':
      case 'verifying':
      case 'detaching':
        return <ScheduleIcon sx={{ color: 'warning.main', fontSize: 20 }} />;
      default:
        return <ComputerIcon sx={{ color: 'text.secondary', fontSize: 20 }} />;
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' => {
    switch (status.toLowerCase()) {
      case 'ready':
        return 'success';
      case 'failed':
      case 'detachfailed':
        return 'error';
      case 'pending':
      case 'validating':
      case 'connecting':
      case 'preparing':
      case 'joining':
      case 'approving':
      case 'creating':
      case 'finalizing':
      case 'verifying':
      case 'detaching':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Memoize summary cards to prevent re-renders:
  const summaryCards = useMemo(
    () => [
      {
        title: 'Total Clusters',
        value: summary.total,
        icon: <ComputerIcon />,
        color: 'primary',
        bgColor: isDark ? '#1e293b' : '#f8fafc',
      },
      {
        title: 'Ready',
        value: summary.ready,
        icon: <CheckCircle />,
        color: 'success',
        bgColor: isDark ? '#0f3a1e' : '#f0fdf4',
      },
      {
        title: 'Pending',
        value: summary.pending,
        icon: <ScheduleIcon />,
        color: 'warning',
        bgColor: isDark ? '#3a2e0f' : '#fffbeb',
      },
      {
        title: 'Failed',
        value: summary.failed,
        icon: <ErrorIcon />,
        color: 'error',
        bgColor: isDark ? '#3a0f0f' : '#fef2f2',
      },
      {
        title: 'Detaching',
        value: summary.detaching,
        icon: <TimelineIcon />,
        color: 'info',
        bgColor: isDark ? '#0f1a3a' : '#f0f9ff',
      },
    ],
    [summary, isDark]
  );

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setKubeconfigFile(file);
    }
  }, []);

  // Show error state if there's an error and no data
  if (error && clusters.length === 0 && !loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Paper
          sx={{
            p: 4,
            backgroundColor: isDark ? '#0F172A' : '#fff',
            boxShadow: isDark ? '0px 4px 10px rgba(0, 0, 0, 0.6)' : undefined,
            color: isDark ? '#E5E7EB' : 'inherit',
          }}
        >
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                color: isDark ? '#E5E7EB' : 'text.primary',
                fontWeight: 600,
              }}
            >
              Cluster Management
            </Typography>
            <Typography variant="body1" sx={{ color: isDark ? '#AEBEDF' : 'text.secondary' }}>
              Onboard and manage Kubernetes clusters with KubeStellar
            </Typography>
          </Box>

          <Alert
            severity="error"
            sx={{
              mb: 3,
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : undefined,
              color: isDark ? '#E5E7EB' : undefined,
            }}
            action={
              <Button color="inherit" size="small" onClick={fetchClusterStatus} disabled={loading}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>

          <Card
            sx={{
              backgroundColor: isDark ? '#1e293b' : undefined,
              border: isDark ? '1px solid #374151' : undefined,
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
              <Typography variant="h6" color="error" gutterBottom>
                Unable to load cluster data
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Make sure the KubeStellar cluster plugin is loaded and running.
              </Typography>
              <Button
                variant="contained"
                onClick={fetchClusterStatus}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
              >
                {loading ? 'Retrying...' : 'Retry'}
              </Button>
            </CardContent>
          </Card>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Paper
        sx={{
          p: 4,
          backgroundColor: isDark ? '#0F172A' : '#fff',
          boxShadow: isDark ? '0px 4px 10px rgba(0, 0, 0, 0.6)' : undefined,
          color: isDark ? '#E5E7EB' : 'inherit',
          '& .MuiTypography-root': {
            color: isDark ? '#E5E7EB' : undefined,
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}
        >
          <Box>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                color: isDark ? '#E5E7EB' : 'text.primary',
                fontWeight: 600,
              }}
            >
              Cluster Management
            </Typography>
            <Typography variant="body1" sx={{ color: isDark ? '#AEBEDF' : 'text.secondary' }}>
              Onboard and manage Kubernetes clusters with KubeStellar
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchClusterStatus}
              disabled={loading}
              sx={{
                borderColor: isDark ? '#374151' : undefined,
                color: isDark ? '#E5E7EB' : undefined,
                '&:hover': {
                  borderColor: isDark ? '#4B5563' : undefined,
                  backgroundColor: isDark ? 'rgba(55, 65, 81, 0.1)' : undefined,
                },
              }}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowOnboardDialog(true)}
              sx={{
                backgroundColor: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              }}
            >
              Onboard Cluster
            </Button>
          </Stack>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert
            severity="warning"
            sx={{
              mb: 3,
              backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : undefined,
              color: isDark ? '#E5E7EB' : undefined,
            }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {summaryCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={2.4} key={index}>
              <Card
                sx={{
                  backgroundColor: card.bgColor,
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : undefined,
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: isDark
                      ? '0 8px 25px rgba(0, 0, 0, 0.4)'
                      : '0 8px 25px rgba(0, 0, 0, 0.1)',
                  },
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                    {React.cloneElement(card.icon, {
                      sx: {
                        fontSize: 28,
                        color: `${card.color}.main`,
                      },
                    })}
                  </Box>
                  <Typography
                    variant="h3"
                    component="div"
                    sx={{
                      color: `${card.color}.main`,
                      fontWeight: 'bold',
                      mb: 1,
                    }}
                  >
                    {card.value}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: isDark ? '#9CA3AF' : 'text.secondary',
                      fontWeight: 500,
                    }}
                  >
                    {card.title}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ mb: 4, borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : undefined }} />

        {/* Clusters Table */}
        <Card
          sx={{
            backgroundColor: isDark ? '#1E293B' : undefined,
            border: isDark ? '1px solid #374151' : undefined,
          }}
        >
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 3, pb: 0 }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: isDark ? '#E5E7EB' : 'text.primary',
                  fontWeight: 600,
                }}
              >
                <StorageIcon />
                Managed Clusters
                <Chip label={clusters.length} size="small" color="primary" sx={{ ml: 1 }} />
              </Typography>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={40} />
                <Typography variant="body1" sx={{ ml: 2, alignSelf: 'center' }}>
                  Loading cluster status...
                </Typography>
              </Box>
            ) : !clusters || clusters.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 12, px: 3 }}>
                <ComputerIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 3 }} />
                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{ color: isDark ? '#E5E7EB' : 'text.primary' }}
                >
                  No clusters onboarded
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: isDark ? '#AEBEDF' : 'text.secondary',
                    mb: 4,
                    maxWidth: 500,
                    mx: 'auto',
                  }}
                >
                  Get started by onboarding your first Kubernetes cluster to KubeStellar. You can
                  use local kubeconfig, upload a file, or manually enter cluster configuration.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AddIcon />}
                  onClick={() => setShowOnboardDialog(true)}
                  sx={{
                    px: 4,
                    py: 1.5,
                  }}
                >
                  Onboard Your First Cluster
                </Button>
              </Box>
            ) : (
              <TableContainer
                component={Paper}
                sx={{
                  backgroundColor: isDark ? '#111827' : undefined,
                  boxShadow: 'none',
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow
                      sx={{
                        backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                      }}
                    >
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          color: isDark ? '#E5E7EB' : 'text.primary',
                        }}
                      >
                        Cluster Name
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          color: isDark ? '#E5E7EB' : 'text.primary',
                        }}
                      >
                        Status
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          color: isDark ? '#E5E7EB' : 'text.primary',
                        }}
                      >
                        Message
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          color: isDark ? '#E5E7EB' : 'text.primary',
                        }}
                      >
                        Last Updated
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          color: isDark ? '#E5E7EB' : 'text.primary',
                        }}
                      >
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {clusters.map(cluster => (
                      <TableRow
                        key={cluster.clusterName}
                        hover
                        sx={{
                          '&:hover': {
                            backgroundColor: isDark ? 'rgba(55, 65, 81, 0.3)' : undefined,
                          },
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {getStatusIcon(cluster.status)}
                            <Typography
                              variant="body2"
                              fontWeight="medium"
                              sx={{ color: isDark ? '#E5E7EB' : 'text.primary' }}
                            >
                              {cluster.clusterName}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={cluster.status}
                            color={getStatusColor(cluster.status)}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: 500,
                              backgroundColor: isDark ? 'transparent' : undefined,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              color: isDark ? '#AEBEDF' : 'text.secondary',
                              maxWidth: 250,
                              wordBreak: 'break-word',
                            }}
                          >
                            {cluster.message || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ color: isDark ? '#AEBEDF' : 'text.secondary' }}
                          >
                            {new Date(cluster.lastUpdated).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Detach Cluster">
                            <IconButton
                              size="small"
                              onClick={() => handleDetachCluster(cluster.clusterName)}
                              sx={{
                                color: 'error.main',
                                '&:hover': {
                                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                },
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Onboard Cluster Dialog */}
        <Dialog
          open={showOnboardDialog}
          onClose={() => setShowOnboardDialog(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              backgroundColor: isDark ? '#1E293B' : undefined,
              color: isDark ? '#E5E7EB' : undefined,
            },
          }}
        >
          <DialogTitle
           sx={{
    borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : undefined,
    backgroundColor: isDark ? '#1F2937' : undefined,
    color: isDark ? '#E5E7EB' : undefined, 
    fontSize: '1.25rem',                    
    fontWeight: 500,                       
              }}
        >
  Onboard New Cluster
</DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Tabs
                value={onboardMethod}
                onChange={(_, value) => setOnboardMethod(value)}
                sx={{
                  '& .MuiTab-root': {
                    color: isDark ? '#AEBEDF' : undefined,
                  },
                  '& .Mui-selected': {
                    color: isDark ? '#E5E7EB' : undefined,
                  },
                }}
              >
                <Tab label="Local Kubeconfig" value="local" />
                <Tab label="Upload File" value="upload" />
                <Tab label="Manual Entry" value="manual" />
              </Tabs>
            </Box>

            <TextField
              fullWidth
              label="Cluster Name"
              value={clusterName}
              onChange={e => setClusterName(e.target.value)}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  color: isDark ? '#E5E7EB' : undefined,
                },
                '& .MuiInputLabel-root': {
                  color: isDark ? '#AEBEDF' : undefined,
                },
              }}
              placeholder="e.g., kind-test-edge, prod-cluster-1"
            />

            {onboardMethod === 'local' && (
              <Alert
                severity="info"
                sx={{
                  mb: 2,
                  backgroundColor: isDark ? 'rgba(41, 98, 255, 0.15)' : undefined,
                  color: isDark ? '#E5E7EB' : undefined,
                }}
              >
                This will use the cluster from your local kubeconfig file. Make sure the cluster
                name matches a context in your kubeconfig.
              </Alert>
            )}

            {onboardMethod === 'upload' && (
              <Box sx={{ mb: 2 }}>
                <input
                  type="file"
                  accept=".yaml,.yml,.config"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  id="kubeconfig-upload"
                />
                <label htmlFor="kubeconfig-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<UploadIcon />}
                    fullWidth
                    sx={{
                      mb: 1,
                      borderColor: isDark ? '#374151' : undefined,
                      color: isDark ? '#E5E7EB' : undefined,
                    }}
                  >
                    {kubeconfigFile ? kubeconfigFile.name : 'Select Kubeconfig File'}
                  </Button>
                </label>
                {kubeconfigFile && (
                  <Typography variant="body2" sx={{ color: isDark ? '#AEBEDF' : 'text.secondary' }}>
                    Selected: {kubeconfigFile.name}
                  </Typography>
                )}
              </Box>
            )}

            {onboardMethod === 'manual' && (
              <TextField
                fullWidth
                multiline
                rows={8}
                label="Kubeconfig Content"
                value={kubeconfig}
                onChange={e => setKubeconfig(e.target.value)}
                placeholder="Paste your kubeconfig YAML content here..."
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    color: isDark ? '#E5E7EB' : undefined,
                  },
                  '& .MuiInputLabel-root': {
                    color: isDark ? '#AEBEDF' : undefined,
                  },
                }}
              />
            )}
          </DialogContent>
          <DialogActions
            sx={{
              backgroundColor: isDark ? '#1F2937' : undefined,
              borderTop: isDark ? '1px solid rgba(255,255,255,0.1)' : undefined,
              py: 2,
            }}
          >
            <Button
              onClick={() => setShowOnboardDialog(false)}
              sx={{ color: isDark ? '#AEBEDF' : undefined }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleOnboardCluster}
              variant="contained"
              disabled={
                onboarding ||
                !clusterName.trim() ||
                (onboardMethod === 'manual' && !kubeconfig.trim()) ||
                (onboardMethod === 'upload' && !kubeconfigFile)
              }
              startIcon={onboarding ? <CircularProgress size={16} /> : <AddIcon />}
            >
              {onboarding ? 'Onboarding...' : 'Onboard Cluster'}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
};

export default ClusterManagement;

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  Box,
  Grid,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CheckCircle,
  Schedule as ClockIcon,
  Error as XCircleIcon,
  Sync as ActivityIcon,
  Computer as ServerIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import useTheme from '../../stores/themeStore';
import { PluginService } from '../../services/pluginService';
import { toast } from 'react-hot-toast';

interface ClusterStatus {
  clusterName: string;
  status: string;
  message?: string;
  lastUpdated: string;
}

interface ClusterStatusViewProps {
  statusData: {
    clusters: ClusterStatus[];
    summary: {
      total: number;
      ready: number;
      pending: number;
      failed: number;
      detaching: number;
    };
    plugin: string;
    timestamp: string;
  } | null;
  loading: boolean;
  onRefresh: () => void;
  onClusterDetached: () => void;
}

const ClusterStatusView: React.FC<ClusterStatusViewProps> = ({
  statusData,
  loading,
  onRefresh,
  onClusterDetached,
}) => {
  const theme = useTheme(state => state.theme);
  const [detachingClusters, setDetachingClusters] = useState<Set<string>>(new Set());
  const isDark = theme === 'dark';

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ready':
        return <CheckCircle sx={{ color: 'success.main' }} />;
      case 'pending':
      case 'validating':
      case 'connecting':
      case 'preparing':
      case 'joining':
      case 'approving':
      case 'creating':
      case 'finalizing':
      case 'verifying':
        return <ClockIcon sx={{ color: 'warning.main' }} />;
      case 'failed':
      case 'detachfailed':
        return <XCircleIcon sx={{ color: 'error.main' }} />;
      case 'detaching':
        return <ActivityIcon sx={{ color: 'info.main' }} />;
      default:
        return <ActivityIcon sx={{ color: 'text.secondary' }} />;
    }
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    switch (status.toLowerCase()) {
      case 'ready':
        return 'success';
      case 'pending':
      case 'validating':
      case 'connecting':
      case 'preparing':
      case 'joining':
      case 'approving':
      case 'creating':
      case 'finalizing':
      case 'verifying':
        return 'warning';
      case 'failed':
      case 'detachfailed':
        return 'error';
      case 'detaching':
        return 'info';
      default:
        return 'default';
    }
  };

  const handleDetachCluster = async (clusterName: string) => {
    if (!window.confirm(`Are you sure you want to detach cluster "${clusterName}"?`)) {
      return;
    }

    setDetachingClusters(prev => new Set(prev.add(clusterName)));

    try {
      const response = await PluginService.detachCluster({ clusterName });
      toast.success(response.message || 'Cluster detachment started successfully!');

      // Refresh status after detachment starts
      setTimeout(() => {
        onClusterDetached();
      }, 1000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to detach cluster: ${errorMessage}`);
      console.error('Failed to detach cluster:', error);
    } finally {
      setDetachingClusters(prev => {
        const newSet = new Set(prev);
        newSet.delete(clusterName);
        return newSet;
      });
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading && !statusData) {
    return (
      <Card sx={{ backgroundColor: isDark ? '#1e293b' : undefined }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={32} />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Loading cluster status...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!statusData) {
    return (
      <Alert
        severity="info"
        icon={<ServerIcon />}
        action={
          <Button color="inherit" size="small" onClick={onRefresh} startIcon={<RefreshIcon />}>
            Refresh
          </Button>
        }
      >
        No cluster data available. Click refresh to load cluster status.
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Summary Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ backgroundColor: isDark ? '#1e293b' : '#f8fafc' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight="bold">
                {statusData.summary.total}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Clusters
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ backgroundColor: isDark ? '#1e293b' : '#f0fdf4' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {statusData.summary.ready}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Ready
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ backgroundColor: isDark ? '#1e293b' : '#fffbeb' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                {statusData.summary.pending}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ backgroundColor: isDark ? '#1e293b' : '#fef2f2' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="error.main" fontWeight="bold">
                {statusData.summary.failed}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Failed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ backgroundColor: isDark ? '#1e293b' : '#f0f9ff' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="info.main" fontWeight="bold">
                {statusData.summary.detaching}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Detaching
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Clusters Table */}
      <Card sx={{ backgroundColor: isDark ? '#1e293b' : undefined }}>
        <CardContent>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <ServerIcon />
            Managed Clusters
          </Typography>

          {statusData.clusters.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <ServerIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No clusters onboarded
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Use the Onboard Cluster tab to add your first cluster.
              </Typography>
            </Box>
          ) : (
            <TableContainer
              component={Paper}
              sx={{ backgroundColor: isDark ? '#111827' : undefined }}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Cluster Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Message</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Last Updated</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statusData.clusters.map(cluster => (
                    <TableRow key={cluster.clusterName} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getStatusIcon(cluster.status)}
                          <Typography variant="body2" fontWeight="medium">
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
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary" sx={{ maxWidth: 200 }}>
                          {cluster.message || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {formatTimestamp(cluster.lastUpdated)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Detach Cluster">
                          <IconButton
                            size="small"
                            onClick={() => handleDetachCluster(cluster.clusterName)}
                            disabled={
                              detachingClusters.has(cluster.clusterName) ||
                              cluster.status.toLowerCase() === 'detaching'
                            }
                            sx={{ color: 'error.main' }}
                          >
                            {detachingClusters.has(cluster.clusterName) ? (
                              <CircularProgress size={16} />
                            ) : (
                              <DeleteIcon />
                            )}
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

      {/* Last Updated Info */}
      <Typography variant="caption" color="textSecondary" sx={{ textAlign: 'center' }}>
        Last updated: {formatTimestamp(statusData.timestamp)}
      </Typography>
    </Box>
  );
};

export default ClusterStatusView;

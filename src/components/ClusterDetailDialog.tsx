import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  Chip,
  Divider,
  CircularProgress,
  Grid,
  Paper,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DnsIcon from '@mui/icons-material/Dns';
import LabelIcon from '@mui/icons-material/Label';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import { Layers, Server, Tag } from 'lucide-react';
import { useClusterQueries } from '../hooks/queries/useClusterQueries';
import { Zoom } from '@mui/material';

interface ColorTheme {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  white: string;
  background: string;
  paper: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  disabled: string;
}

interface ClusterDetailDialogProps {
  open: boolean;
  onClose: () => void;
  clusterName: string | null;
  isDark: boolean;
  colors: ColorTheme;
}

const ClusterDetailDialog: React.FC<ClusterDetailDialogProps> = ({
  open,
  onClose,
  clusterName,
  isDark,
  colors,
}) => {
  const { useClusterDetails } = useClusterQueries();
  const {
    data: clusterDetails,
    isLoading,
    isError,
    refetch,
  } = useClusterDetails(clusterName || '');

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return dateString;
      console.error('Error formatting date:', error);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      TransitionComponent={Zoom}
      transitionDuration={300}
      PaperProps={{
        style: {
          backgroundColor: colors.paper,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: isDark
            ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)'
            : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        },
      }}
    >
      <DialogTitle
        style={{
          color: colors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div className="flex items-center gap-2">
          <Server size={24} style={{ color: colors.primary }} />
          <Typography variant="h6" component="span">
            Cluster Details
          </Typography>
        </div>
        <IconButton onClick={onClose} size="small" style={{ color: colors.textSecondary }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent
        style={{
          padding: '24px',
          backgroundColor: isDark ? colors.background : undefined,
        }}
      >
        {isLoading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '300px',
            }}
          >
            <CircularProgress style={{ color: colors.primary }} />
          </Box>
        ) : isError ? (
          <Alert
            severity="error"
            sx={{
              backgroundColor: isDark ? 'rgba(255, 107, 107, 0.1)' : 'rgba(255, 107, 107, 0.05)',
              color: colors.error,
              border: `1px solid ${colors.error}20`,
            }}
          >
            Failed to load cluster details. Please try again.
            <Button
              size="small"
              onClick={() => refetch()}
              sx={{ ml: 2, color: colors.primary }}
              variant="outlined"
            >
              Retry
            </Button>
          </Alert>
        ) : clusterDetails ? (
          <div>
            {/* Cluster Name and Basic Info */}
            <Box
              sx={{
                p: 3,
                mb: 3,
                borderRadius: 2,
                backgroundColor: isDark ? 'rgba(47, 134, 255, 0.08)' : 'rgba(47, 134, 255, 0.04)',
                border: `1px solid ${isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)'}`,
              }}
            >
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <Typography variant="h4" fontWeight="700" color={colors.text} gutterBottom>
                    {clusterDetails.name}
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    gutterBottom
                    style={{ color: colors.textSecondary }}
                  >
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DnsIcon fontSize="small" />
                      UID: {clusterDetails.uid}
                    </Box>
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: { xs: 'flex-start', md: 'flex-end' },
                    }}
                  >
                    <Chip
                      icon={
                        clusterDetails.available ? (
                          <CheckCircleOutlineIcon fontSize="small" />
                        ) : (
                          <ErrorOutlineIcon fontSize="small" />
                        )
                      }
                      label={clusterDetails.available ? 'Available' : 'Unavailable'}
                      sx={{
                        backgroundColor: clusterDetails.available
                          ? isDark
                            ? 'rgba(103, 192, 115, 0.15)'
                            : 'rgba(103, 192, 115, 0.1)'
                          : isDark
                            ? 'rgba(255, 107, 107, 0.15)'
                            : 'rgba(255, 107, 107, 0.1)',
                        color: clusterDetails.available ? colors.success : colors.error,
                        borderRadius: '16px',
                        px: 2,
                        '& .MuiChip-icon': {
                          color: clusterDetails.available ? colors.success : colors.error,
                        },
                      }}
                    />
                    {clusterDetails.status?.version?.kubernetes && (
                      <Chip
                        icon={<VerifiedUserIcon fontSize="small" />}
                        label={`Kubernetes ${clusterDetails.status.version.kubernetes}`}
                        sx={{
                          mt: 1,
                          backgroundColor: isDark
                            ? 'rgba(47, 134, 255, 0.15)'
                            : 'rgba(47, 134, 255, 0.08)',
                          color: colors.primary,
                          borderRadius: '16px',
                          px: 2,
                          '& .MuiChip-icon': {
                            color: isDark ? colors.primaryLight : colors.primary,
                          },
                        }}
                      />
                    )}
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTimeIcon fontSize="small" style={{ color: colors.textSecondary }} />
                <Typography variant="body2" style={{ color: colors.textSecondary }}>
                  Created on {formatDate(clusterDetails.creationTimestamp)}
                </Typography>
              </Box>
            </Box>

            {/* Labels Section */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                borderRadius: 2,
                backgroundColor: colors.paper,
                border: `1px solid ${colors.border}`,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 2,
                }}
              >
                <LabelIcon style={{ color: colors.primary }} />
                <Typography variant="h6">Labels</Typography>
              </Box>
              <Divider sx={{ mb: 2, backgroundColor: colors.border }} />
              <Box className="flex flex-wrap gap-2">
                {Object.entries(clusterDetails.labels || {}).length > 0 ? (
                  Object.entries(clusterDetails.labels).map(([key, value]) => (
                    <Chip
                      key={key}
                      icon={<Tag size={14} />}
                      label={`${key}=${value}`}
                      sx={{
                        backgroundColor: isDark
                          ? 'rgba(47, 134, 255, 0.08)'
                          : 'rgba(47, 134, 255, 0.04)',
                        color: colors.text,
                        borderRadius: '8px',
                        border: `1px solid ${isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)'}`,
                        '& .MuiChip-icon': {
                          color: colors.primary,
                        },
                      }}
                    />
                  ))
                ) : (
                  <Typography variant="body2" style={{ color: colors.textSecondary }}>
                    No labels found for this cluster
                  </Typography>
                )}
              </Box>
            </Paper>

            {/* Status Section  */}
            {clusterDetails.status?.capacity && (
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: colors.paper,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 2,
                  }}
                >
                  <Layers size={20} style={{ color: colors.primary }} />
                  <Typography variant="h6">Capacity</Typography>
                </Box>
                <Divider sx={{ mb: 2, backgroundColor: colors.border }} />
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        p: 2,
                        borderRadius: 1,
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.03)'
                          : 'rgba(0, 0, 0, 0.02)',
                      }}
                    >
                      <MemoryIcon sx={{ fontSize: 28, mb: 1, color: colors.primary }} />
                      <Typography variant="h6">{clusterDetails.status.capacity.cpu}</Typography>
                      <Typography variant="body2" style={{ color: colors.textSecondary }}>
                        CPU Cores
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        p: 2,
                        borderRadius: 1,
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.03)'
                          : 'rgba(0, 0, 0, 0.02)',
                      }}
                    >
                      <StorageIcon sx={{ fontSize: 28, mb: 1, color: colors.primary }} />
                      <Typography variant="h6">
                        {parseInt(clusterDetails.status.capacity.memory) / 1024 / 1024 > 1
                          ? `${Math.round(parseInt(clusterDetails.status.capacity.memory) / 1024 / 1024)} GB`
                          : clusterDetails.status.capacity.memory}
                      </Typography>
                      <Typography variant="body2" style={{ color: colors.textSecondary }}>
                        Memory
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        p: 2,
                        borderRadius: 1,
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.03)'
                          : 'rgba(0, 0, 0, 0.02)',
                      }}
                    >
                      <InfoOutlinedIcon sx={{ fontSize: 28, mb: 1, color: colors.primary }} />
                      <Typography variant="h6">{clusterDetails.status.capacity.pods}</Typography>
                      <Typography variant="body2" style={{ color: colors.textSecondary }}>
                        Pods Capacity
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            )}
          </div>
        ) : (
          <Typography>No cluster selected</Typography>
        )}
      </DialogContent>

      <DialogActions
        style={{
          padding: '16px 24px',
          borderTop: `1px solid ${colors.border}`,
          justifyContent: 'flex-end',
        }}
      >
        <Button
          onClick={onClose}
          style={{
            color: colors.textSecondary,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
          }}
          variant="contained"
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClusterDetailDialog;

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
import RefreshIcon from '@mui/icons-material/Refresh';
import { Layers, Server, Tag } from 'lucide-react';
import { useClusterQueries } from '../hooks/queries/useClusterQueries';
import { Zoom } from '@mui/material';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
          background: isDark
            ? `linear-gradient(90deg, rgba(47, 134, 255, 0.15) 0%, rgba(47, 134, 255, 0.05) 100%)`
            : `linear-gradient(90deg, rgba(47, 134, 255, 0.08) 0%, rgba(47, 134, 255, 0.02) 100%)`,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center rounded-full p-1.5"
            style={{
              backgroundColor: isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Server size={22} style={{ color: colors.primary }} />
          </div>
          <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
            {t('clusterDetailDialog.title')}
          </Typography>
        </div>
        <IconButton
          onClick={onClose}
          size="small"
          className="transition-transform duration-300 hover:rotate-90"
          style={{
            color: colors.textSecondary,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
          }}
        >
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
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '300px',
              gap: 2,
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
              borderRadius: 2,
              p: 4,
            }}
          >
            <CircularProgress style={{ color: colors.primary }} size={40} thickness={4} />
            <Typography variant="body2" color={colors.textSecondary}>
              {t('clusterDetailDialog.loading')}
            </Typography>
          </Box>
        ) : isError ? (
          <Alert
            severity="error"
            sx={{
              backgroundColor: isDark ? 'rgba(255, 107, 107, 0.15)' : 'rgba(255, 107, 107, 0.05)',
              color: colors.error,
              border: `1px solid ${isDark ? 'rgba(255, 107, 107, 0.3)' : colors.error + '20'}`,
              borderRadius: '10px',
              padding: '16px',
            }}
            icon={<ErrorOutlineIcon />}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body1" fontWeight={500}>
                {t('clusterDetailDialog.error.title')}
              </Typography>
              <Typography variant="body2">{t('clusterDetailDialog.error.description')}</Typography>
              <Button
                size="small"
                onClick={() => refetch()}
                sx={{
                  mt: 1,
                  alignSelf: 'flex-start',
                  color: isDark ? colors.white : colors.primary,
                  borderColor: colors.primary,
                  backgroundColor: isDark ? 'rgba(47, 134, 255, 0.2)' : 'transparent',
                  '&:hover': {
                    backgroundColor: isDark
                      ? 'rgba(47, 134, 255, 0.25)'
                      : 'rgba(47, 134, 255, 0.05)',
                  },
                }}
                variant="outlined"
                startIcon={<RefreshIcon />}
              >
                {t('common.retry')}
              </Button>
            </Box>
          </Alert>
        ) : clusterDetails ? (
          <div>
            {/* Cluster Name and Basic Info */}
            <Box
              sx={{
                p: 3,
                mb: 3,
                borderRadius: 2,
                backgroundImage: isDark
                  ? 'linear-gradient(135deg, rgba(47, 134, 255, 0.12) 0%, rgba(47, 134, 255, 0.04) 100%)'
                  : 'linear-gradient(135deg, rgba(47, 134, 255, 0.08) 0%, rgba(47, 134, 255, 0.02) 100%)',
                border: `1px solid ${isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)'}`,
                boxShadow: isDark
                  ? '0 4px 8px rgba(0, 0, 0, 0.1)'
                  : '0 4px 12px rgba(47, 134, 255, 0.1)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Decorative elements */}
              <Box
                sx={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: isDark
                    ? 'radial-gradient(circle, rgba(47, 134, 255, 0.2) 0%, rgba(47, 134, 255, 0) 70%)'
                    : 'radial-gradient(circle, rgba(47, 134, 255, 0.15) 0%, rgba(47, 134, 255, 0) 70%)',
                  opacity: 0.6,
                  zIndex: 0,
                }}
              />

              <Grid container spacing={2} position="relative" zIndex={1}>
                <Grid item xs={12} md={8}>
                  <Typography
                    variant="h4"
                    fontWeight="700"
                    color={colors.text}
                    gutterBottom
                    sx={{
                      textShadow: isDark ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none',
                      fontSize: { xs: '1.5rem', md: '2rem' },
                      mb: 1,
                    }}
                  >
                    {clusterDetails.name}
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    gutterBottom
                    style={{ color: colors.textSecondary }}
                  >
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DnsIcon fontSize="small" />
                      <Box
                        component="span"
                        sx={{
                          fontFamily: 'monospace',
                          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.85rem',
                        }}
                      >
                        {clusterDetails.uid}
                      </Box>
                    </Box>
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: { xs: 'flex-start', md: 'flex-end' },
                      gap: 1,
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
                      label={
                        clusterDetails.available
                          ? t('clusterDetailDialog.status.available')
                          : t('clusterDetailDialog.status.unavailable')
                      }
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
                        py: 1,
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        border: `1px solid ${
                          clusterDetails.available
                            ? isDark
                              ? 'rgba(103, 192, 115, 0.3)'
                              : 'rgba(103, 192, 115, 0.2)'
                            : isDark
                              ? 'rgba(255, 107, 107, 0.3)'
                              : 'rgba(255, 107, 107, 0.2)'
                        }`,
                        '& .MuiChip-icon': {
                          color: clusterDetails.available ? colors.success : colors.error,
                        },
                        transition: 'all 0.2s ease',
                        animation: clusterDetails.available ? 'pulse 2s infinite' : 'none',
                        '@keyframes pulse': {
                          '0%': {
                            boxShadow: `0 0 0 0 ${clusterDetails.available ? 'rgba(103, 192, 115, 0.4)' : 'rgba(255, 107, 107, 0.4)'}`,
                          },
                          '70%': {
                            boxShadow: `0 0 0 5px ${clusterDetails.available ? 'rgba(103, 192, 115, 0)' : 'rgba(255, 107, 107, 0)'}`,
                          },
                          '100%': {
                            boxShadow: `0 0 0 0 ${clusterDetails.available ? 'rgba(103, 192, 115, 0)' : 'rgba(255, 107, 107, 0)'}`,
                          },
                        },
                      }}
                    />
                    {clusterDetails.status?.version?.kubernetes && (
                      <Chip
                        icon={<VerifiedUserIcon fontSize="small" />}
                        label={t('clusterDetailDialog.kubernetes', {
                          version: clusterDetails.status.version.kubernetes,
                        })}
                        sx={{
                          backgroundColor: isDark
                            ? 'rgba(47, 134, 255, 0.15)'
                            : 'rgba(47, 134, 255, 0.08)',
                          color: colors.primary,
                          borderRadius: '16px',
                          px: 2,
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                          border: `1px solid ${isDark ? 'rgba(47, 134, 255, 0.3)' : 'rgba(47, 134, 255, 0.2)'}`,
                          '& .MuiChip-icon': {
                            color: isDark ? colors.primaryLight : colors.primary,
                          },
                        }}
                      />
                    )}
                  </Box>
                </Grid>
              </Grid>

              <Box
                sx={{
                  mt: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: colors.textSecondary,
                  backgroundColor: isDark ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.03)',
                  borderRadius: 1,
                  padding: '6px 12px',
                  width: 'fit-content',
                }}
              >
                <AccessTimeIcon fontSize="small" />
                <Typography variant="body2">
                  {t('clusterDetailDialog.createdOn', {
                    date: formatDate(clusterDetails.creationTimestamp),
                  })}
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
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : colors.paper,
                border: `1px solid ${isDark ? 'rgba(47, 134, 255, 0.25)' : colors.border}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: isDark
                    ? '0 4px 12px rgba(0, 0, 0, 0.25)'
                    : '0 4px 12px rgba(0, 0, 0, 0.08)',
                  borderColor: isDark ? 'rgba(47, 134, 255, 0.4)' : 'rgba(47, 134, 255, 0.2)',
                },
                background: isDark
                  ? `linear-gradient(135deg, rgba(47, 134, 255, 0.15) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(47, 134, 255, 0.1) 100%)`
                  : `linear-gradient(135deg, rgba(47, 134, 255, 0.03) 0%, rgba(255, 255, 255, 0) 50%, rgba(47, 134, 255, 0.01) 100%)`,
                backdropFilter: isDark ? 'blur(8px)' : 'none',
                boxShadow: isDark ? '0 8px 16px rgba(0, 0, 0, 0.25)' : 'none',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 2,
                }}
              >
                <div
                  className="rounded-md p-1.5"
                  style={{
                    backgroundColor: isDark
                      ? 'rgba(47, 134, 255, 0.3)' // Increased opacity for better visibility
                      : 'rgba(47, 134, 255, 0.08)',
                    boxShadow: isDark ? '0 2px 6px rgba(0, 0, 0, 0.3)' : 'none', // Enhanced shadow
                  }}
                >
                  <LabelIcon style={{ color: isDark ? '#9ad6f9' : colors.primary }} />
                </div>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: isDark ? '#ffffff' : colors.text, // Ensure white text in dark mode
                    textShadow: isDark ? '0 1px 2px rgba(0, 0, 0, 0.5)' : 'none',
                  }}
                >
                  {t('clusterDetailDialog.labels')}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    ml: 'auto',
                    color: isDark ? 'rgba(255, 255, 255, 0.9)' : colors.textSecondary,
                    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.04)',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    fontWeight: 500,
                    visibility:
                      Object.keys(clusterDetails.labels || {}).length > 0 ? 'visible' : 'hidden',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
                  }}
                >
                  {t('clusterDetailDialog.labelCount', {
                    count: Object.keys(clusterDetails.labels || {}).length,
                  })}
                </Typography>
              </Box>

              <Divider
                sx={{ mb: 3, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : colors.border }}
              />

              <Box className="flex flex-wrap gap-2">
                {Object.entries(clusterDetails.labels || {}).length > 0 ? (
                  Object.entries(clusterDetails.labels).map(([key, value], index) => (
                    <Chip
                      key={key}
                      icon={
                        <Tag size={14} style={{ color: isDark ? '#9ad6f9' : colors.primary }} />
                      }
                      label={
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box
                            component="span"
                            sx={{
                              fontWeight: 600,
                              mr: 0.5,
                              color: isDark ? '#ffffff' : 'inherit',
                            }}
                          >
                            {key}
                          </Box>
                          <Box component="span" sx={{ opacity: isDark ? 0.9 : 0.7 }}>
                            =
                          </Box>
                          <Box
                            component="span"
                            sx={{ ml: 0.5, color: isDark ? '#ffffff' : 'inherit' }}
                          >
                            {value}
                          </Box>
                        </Box>
                      }
                      sx={{
                        backgroundColor: isDark
                          ? 'rgba(30, 41, 59, 0.7)'
                          : 'rgba(47, 134, 255, 0.04)',
                        color: isDark ? 'rgba(255, 255, 255, 0.9)' : colors.text,
                        borderRadius: '8px',
                        border: `1px solid ${isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)'}`,
                        py: 1.2,
                        px: 1,
                        '& .MuiChip-icon': {
                          color: isDark ? colors.primaryLight : colors.primary,
                        },
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: isDark
                            ? 'rgba(30, 41, 59, 0.9)'
                            : 'rgba(47, 134, 255, 0.08)',
                          transform: 'translateY(-2px)',
                          boxShadow: isDark
                            ? '0 4px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(47, 134, 255, 0.3)'
                            : '0 4px 8px rgba(0, 0, 0, 0.1)',
                        },
                        animation: `fadeIn 0.3s ease forwards ${index * 0.05}s`,
                        opacity: 0,
                        '@keyframes fadeIn': {
                          from: { opacity: 0, transform: 'translateY(8px)' },
                          to: { opacity: 1, transform: 'translateY(0)' },
                        },
                      }}
                    />
                  ))
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      py: 4,
                      px: 2,
                      width: '100%',
                      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(0, 0, 0, 0.02)',
                      borderRadius: 2,
                      border: `1px dashed ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'}`,
                    }}
                  >
                    <Tag
                      size={24}
                      style={{
                        color: isDark ? 'rgba(255, 255, 255, 0.4)' : colors.textSecondary,
                        marginBottom: '12px',
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        color: isDark ? 'rgba(255, 255, 255, 0.7)' : colors.textSecondary,
                        textAlign: 'center',
                      }}
                    >
                      {t('clusterDetailDialog.noLabels')}
                    </Typography>
                  </Box>
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
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: isDark
                      ? '0 4px 12px rgba(0, 0, 0, 0.15)'
                      : '0 4px 12px rgba(0, 0, 0, 0.08)',
                    borderColor: isDark ? 'rgba(47, 134, 255, 0.3)' : 'rgba(47, 134, 255, 0.2)',
                  },
                  background: isDark
                    ? `linear-gradient(135deg, rgba(47, 134, 255, 0.06) 0%, rgba(0, 0, 0, 0) 50%, rgba(47, 134, 255, 0.02) 100%)`
                    : `linear-gradient(135deg, rgba(47, 134, 255, 0.03) 0%, rgba(255, 255, 255, 0) 50%, rgba(47, 134, 255, 0.01) 100%)`,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    mb: 2,
                  }}
                >
                  <div
                    className="rounded-md p-1.5"
                    style={{
                      backgroundColor: isDark
                        ? 'rgba(47, 134, 255, 0.3)' // Increased opacity for better visibility
                        : 'rgba(47, 134, 255, 0.08)',
                      boxShadow: isDark ? '0 2px 6px rgba(0, 0, 0, 0.3)' : 'none', // Enhanced shadow
                    }}
                  >
                    <Layers
                      size={20}
                      style={{ color: isDark ? '#9ad6f9' : colors.primary }} // Brighter color in dark mode
                    />
                  </div>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: isDark ? '#ffffff' : colors.text, // Ensure white text in dark mode
                      textShadow: isDark ? '0 1px 2px rgba(0, 0, 0, 0.5)' : 'none',
                    }}
                  >
                    {t('clusterDetailDialog.capacityResources')}
                  </Typography>
                </Box>
                <Divider
                  sx={{
                    mb: 3,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.border,
                  }}
                />
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        p: 3,
                        borderRadius: 2,
                        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(0, 0, 0, 0.02)',
                        border: `1px solid ${isDark ? 'rgba(47, 134, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)'}`,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-5px)',
                          boxShadow: isDark
                            ? '0 8px 16px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(47, 134, 255, 0.2)'
                            : '0 8px 16px -2px rgba(0, 0, 0, 0.1)',
                          backgroundColor: isDark
                            ? 'rgba(30, 41, 59, 0.9)'
                            : 'rgba(47, 134, 255, 0.04)',
                          borderColor: colors.primary,
                        },
                        animation: 'fadeIn 0.5s ease forwards',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: isDark
                          ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)'
                          : 'none',
                      }}
                    >
                      <div
                        className="absolute left-0 top-0 h-1 w-full"
                        style={{
                          background: `linear-gradient(to right, ${colors.primary}, transparent)`,
                          opacity: isDark ? 0.8 : 0.7,
                        }}
                      />
                      <div
                        className="mb-2 rounded-full p-2.5"
                        style={{
                          background: isDark
                            ? 'rgba(47, 134, 255, 0.2)'
                            : 'rgba(47, 134, 255, 0.05)',
                          border: `1px solid ${isDark ? 'rgba(47, 134, 255, 0.3)' : 'rgba(47, 134, 255, 0.1)'}`,
                          boxShadow: isDark
                            ? '0 4px 8px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                            : '0 4px 8px rgba(0, 0, 0, 0.1)',
                        }}
                      >
                        <MemoryIcon
                          sx={{
                            fontSize: 28,
                            color: isDark ? colors.primaryLight : colors.primary,
                          }}
                        />
                      </div>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 700,
                          mb: 1,
                          background: isDark
                            ? 'linear-gradient(45deg, #9ad6f9, #2f86ff)'
                            : 'linear-gradient(45deg, #1a65cc, #2f86ff)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          textShadow: isDark ? '0 1px 3px rgba(0, 0, 0, 0.5)' : 'none',
                          filter: isDark ? 'brightness(1.2) contrast(1.2)' : 'none',
                        }}
                      >
                        {clusterDetails.status.capacity.cpu}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: isDark ? 'rgba(255, 255, 255, 0.95)' : colors.textSecondary,
                          textAlign: 'center',
                          fontWeight: isDark ? 600 : 400,
                          textShadow: isDark ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none',
                        }}
                      >
                        {t('clusterDetailDialog.cpuCores')}
                      </Typography>
                      {isDark && (
                        <Box
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            zIndex: -1,
                            backgroundColor: 'rgba(0, 0, 0, 0.2)',
                            borderRadius: 1,
                          }}
                        />
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        p: 3,
                        borderRadius: 2,
                        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(0, 0, 0, 0.02)',
                        border: `1px solid ${isDark ? 'rgba(47, 134, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)'}`,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-5px)',
                          boxShadow: isDark
                            ? '0 8px 16px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(47, 134, 255, 0.2)'
                            : '0 8px 16px -2px rgba(0, 0, 0, 0.1)',
                          backgroundColor: isDark
                            ? 'rgba(30, 41, 59, 0.9)'
                            : 'rgba(47, 134, 255, 0.04)',
                          borderColor: colors.primary,
                        },
                        animation: 'fadeIn 0.5s ease forwards 0.1s',
                        opacity: 0,
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: isDark
                          ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)'
                          : 'none',
                      }}
                    >
                      <div
                        className="absolute left-0 top-0 h-1 w-full"
                        style={{
                          background: `linear-gradient(to right, ${colors.primary}, transparent)`,
                          opacity: isDark ? 0.8 : 0.7,
                        }}
                      />
                      <div
                        className="mb-2 rounded-full p-2.5"
                        style={{
                          background: isDark
                            ? 'rgba(47, 134, 255, 0.2)'
                            : 'rgba(47, 134, 255, 0.05)',
                          border: `1px solid ${isDark ? 'rgba(47, 134, 255, 0.3)' : 'rgba(47, 134, 255, 0.1)'}`,
                          boxShadow: isDark
                            ? '0 4px 8px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                            : '0 4px 8px rgba(0, 0, 0, 0.1)',
                        }}
                      >
                        <StorageIcon
                          sx={{
                            fontSize: 28,
                            color: isDark ? colors.primaryLight : colors.primary,
                          }}
                        />
                      </div>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 700,
                          mb: 1,
                          background: isDark
                            ? 'linear-gradient(45deg, #9ad6f9, #2f86ff)'
                            : 'linear-gradient(45deg, #1a65cc, #2f86ff)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          textShadow: isDark ? '0 1px 3px rgba(0, 0, 0, 0.5)' : 'none',
                          filter: isDark ? 'brightness(1.2) contrast(1.2)' : 'none',
                        }}
                      >
                        {parseInt(clusterDetails.status.capacity.memory) / 1024 / 1024 > 1
                          ? `${Math.round(parseInt(clusterDetails.status.capacity.memory) / 1024 / 1024)} GB`
                          : clusterDetails.status.capacity.memory}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: isDark ? 'rgba(255, 255, 255, 0.95)' : colors.textSecondary,
                          textAlign: 'center',
                          fontWeight: isDark ? 600 : 400,
                          textShadow: isDark ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none',
                        }}
                      >
                        {t('clusterDetailDialog.memory')}
                      </Typography>
                      {isDark && (
                        <Box
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            zIndex: -1,
                            backgroundColor: 'rgba(0, 0, 0, 0.2)',
                            borderRadius: 1,
                          }}
                        />
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        p: 3,
                        borderRadius: 2,
                        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(0, 0, 0, 0.02)',
                        border: `1px solid ${isDark ? 'rgba(47, 134, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)'}`,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-5px)',
                          boxShadow: isDark
                            ? '0 8px 16px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(47, 134, 255, 0.2)'
                            : '0 8px 16px -2px rgba(0, 0, 0, 0.1)',
                          backgroundColor: isDark
                            ? 'rgba(30, 41, 59, 0.9)'
                            : 'rgba(47, 134, 255, 0.04)',
                          borderColor: colors.primary,
                        },
                        animation: 'fadeIn 0.5s ease forwards 0.2s',
                        opacity: 0,
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: isDark
                          ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)'
                          : 'none',
                      }}
                    >
                      <div
                        className="absolute left-0 top-0 h-1 w-full"
                        style={{
                          background: `linear-gradient(to right, ${colors.primary}, transparent)`,
                          opacity: isDark ? 0.8 : 0.7,
                        }}
                      />
                      <div
                        className="mb-2 rounded-full p-2.5"
                        style={{
                          background: isDark
                            ? 'rgba(47, 134, 255, 0.2)'
                            : 'rgba(47, 134, 255, 0.05)',
                          border: `1px solid ${isDark ? 'rgba(47, 134, 255, 0.3)' : 'rgba(47, 134, 255, 0.1)'}`,
                          boxShadow: isDark
                            ? '0 4px 8px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                            : '0 4px 8px rgba(0, 0, 0, 0.1)',
                        }}
                      >
                        <InfoOutlinedIcon
                          sx={{
                            fontSize: 28,
                            color: isDark ? colors.primaryLight : colors.primary,
                          }}
                        />
                      </div>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 700,
                          mb: 1,
                          background: isDark
                            ? 'linear-gradient(45deg, #9ad6f9, #2f86ff)'
                            : 'linear-gradient(45deg, #1a65cc, #2f86ff)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          textShadow: isDark ? '0 1px 3px rgba(0, 0, 0, 0.5)' : 'none',
                          filter: isDark ? 'brightness(1.2) contrast(1.2)' : 'none',
                        }}
                      >
                        {clusterDetails.status.capacity.pods}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: isDark ? 'rgba(255, 255, 255, 0.95)' : colors.textSecondary,
                          textAlign: 'center',
                          fontWeight: isDark ? 500 : 400,
                        }}
                      >
                        {t('clusterDetailDialog.podCapacity')}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            )}
          </div>
        ) : (
          <Typography>{t('clusterDetailDialog.noClusterSelected')}</Typography>
        )}
      </DialogContent>

      <DialogActions
        style={{
          padding: '16px 24px',
          borderTop: `1px solid ${isDark ? 'rgba(47, 134, 255, 0.15)' : colors.border}`,
          justifyContent: 'space-between',
          background: isDark
            ? `linear-gradient(90deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.9) 100%)`
            : `linear-gradient(90deg, rgba(47, 134, 255, 0.03) 0%, rgba(47, 134, 255, 0.01) 100%)`,
        }}
      >
        {/* Additional options could go here in the future */}
        <Box
          sx={{
            opacity: 0.7,
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.03)',
            px: 1.5,
            py: 0.75,
            borderRadius: 1.5,
            border: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: isDark ? 'rgba(255, 255, 255, 0.7)' : colors.textSecondary,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              fontFamily: 'monospace',
              fontWeight: 500,
            }}
          >
            <AccessTimeIcon fontSize="inherit" />
            {t('clusterDetailDialog.lastRefreshed')}: {new Date().toLocaleTimeString()}
          </Typography>
        </Box>

        <Button
          onClick={onClose}
          style={{
            color: colors.white,
            backgroundColor: colors.primary,
          }}
          sx={{
            borderRadius: '8px',
            padding: '8px 20px',
            fontWeight: 600,
            textTransform: 'none',
            transition: 'all 0.2s ease',
            boxShadow: isDark
              ? '0 4px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(47, 134, 255, 0.4)'
              : '0 4px 8px rgba(47, 134, 255, 0.2)',
            '&:hover': {
              backgroundColor: colors.primaryDark,
              transform: 'translateY(-2px)',
              boxShadow: isDark
                ? '0 6px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(47, 134, 255, 0.5)'
                : '0 6px 12px rgba(47, 134, 255, 0.3)',
            },
          }}
          variant="contained"
          endIcon={<CloseIcon fontSize="small" />}
        >
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClusterDetailDialog;

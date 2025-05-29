/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  Paper,
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  Divider,
  useMediaQuery,
  useTheme as useMuiTheme,
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  Extension as ExtensionIcon,
  Download as DownloadIcon,
  FileUpload as FileUploadIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Store as StoreIcon,
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import useTheme from '../stores/themeStore';
import { PluginService } from '../services/pluginService';
import ClusterManagement from '../components/clusters/ClusterManagement';
import { useNavigate } from 'react-router-dom';

const ClusterManagementPage: React.FC = () => {
  const theme = useTheme(state => state.theme);
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [clusterPluginLoaded, setClusterPluginLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const navigate = useNavigate();

  const installationSteps = [
    {
      label: 'Navigate to Plugin Management',
      description: 'Go to the Plugin Management section from the sidebar',
      icon: <ExtensionIcon />,
    },
    {
      label: 'Choose Installation Method',
      description: 'Select "Install from Repository" for official plugins or "Load Local Plugin" for testing',
      icon: <DownloadIcon />,
    },
    {
      label: 'Install Cluster Plugin',
      description: 'Install the KubeStellar Cluster Management plugin',
      icon: <FileUploadIcon />,
    },
    {
      label: 'Return and Manage',
      description: 'Come back to this page to start managing your clusters',
      icon: <CheckCircleIcon />,
    },
  ];

  useEffect(() => {
    const checkClusterPlugin = async () => {
      setIsLoading(true);
      try {
        const isLoaded = await PluginService.isClusterPluginLoaded();
        setClusterPluginLoaded(isLoaded);
      } catch (error) {
        console.error('Error checking cluster plugin status:', error);
        setClusterPluginLoaded(false);
        toast.error('Failed to check cluster plugin status');
      } finally {
        setIsLoading(false);
      }
    };

    checkClusterPlugin();
    
    // Check every 30 seconds
    const interval = setInterval(checkClusterPlugin, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="h6" color="textSecondary">
          Checking cluster plugin status...
        </Typography>
      </Box>
    );
  }

  if (!clusterPluginLoaded) {
    return (
      <Paper
        sx={{
          maxWidth: '100%',
          margin: 'auto',
          p: 0,
          backgroundColor: theme === 'dark' ? '#0F172A' : '#fff',
          boxShadow: theme === 'dark' ? '0px 4px 10px rgba(0, 0, 0, 0.6)' : undefined,
          color: theme === 'dark' ? '#E5E7EB' : 'inherit',
          '& .MuiTypography-root': {
            color: theme === 'dark' ? '#E5E7EB' : undefined,
          },
          '& .MuiTypography-body2, & .MuiTypography-caption, & .MuiTypography-subtitle2': {
            color: theme === 'dark' ? '#AEBEDF' : undefined,
          },
        }}
      >
        {/* Header Section */}
        <Box sx={{ 
          p: 4, 
          textAlign: 'center',
          background: theme === 'dark' 
            ? 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)' 
            : 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)',
          borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#E5E7EB'}`,
        }}>
          <Box sx={{ 
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 100,
            height: 100,
            borderRadius: '50%',
            backgroundColor: theme === 'dark' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: `2px solid ${theme === 'dark' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            mb: 3,
          }}>
            <ExtensionIcon sx={{ fontSize: 48, color: '#F59E0B' }} />
          </Box>
          
          <Typography 
            variant="h3" 
            gutterBottom 
            sx={{ 
              color: theme === 'dark' ? '#E5E7EB' : 'text.primary',
              fontWeight: 700,
              mb: 2,
              fontSize: isMobile ? '2rem' : '3rem',
            }}
          >
            Cluster Plugin Required
          </Typography>
          
          <Typography 
            variant="h6" 
            sx={{ 
              color: theme === 'dark' ? '#AEBEDF' : 'text.secondary',
              mb: 3,
              maxWidth: 600,
              mx: 'auto',
              fontWeight: 400,
              lineHeight: 1.6,
            }}
          >
            Enable powerful cluster management capabilities by installing the KubeStellar Cluster Management plugin
          </Typography>

          <Chip
            icon={<InfoIcon />}
            label="Plugin Management Required"
            color="warning"
            variant="outlined"
            sx={{
              fontSize: '0.875rem',
              fontWeight: 500,
              '& .MuiChip-icon': {
                color: '#F59E0B',
              },
            }}
          />
        </Box>

        {/* Main Content */}
        <Box sx={{ p: 4 }}>
          {/* Installation Steps */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 4,
            alignItems: 'start',
          }}>
            {/* Steps */}
            <Box>
              <Typography 
                variant="h5" 
                sx={{ 
                  color: theme === 'dark' ? '#E5E7EB' : 'text.primary',
                  mb: 3,
                  fontWeight: 600,
                }}
              >
                Installation Steps
              </Typography>
              
              <Stepper 
                activeStep={activeStep} 
                orientation="vertical"
                sx={{
                  '& .MuiStepLabel-label': {
                    color: theme === 'dark' ? '#E5E7EB' : undefined,
                  },
                  '& .MuiStepContent-root': {
                    borderColor: theme === 'dark' ? '#374151' : undefined,
                  },
                }}
              >
                {installationSteps.map((step, index) => (
                  <Step key={step.label}>
                    <StepLabel
                      icon={
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            backgroundColor: index <= activeStep ? '#4F46E5' : theme === 'dark' ? '#374151' : '#E5E7EB',
                            color: index <= activeStep ? '#fff' : theme === 'dark' ? '#9CA3AF' : '#6B7280',
                          }}
                        >
                          {React.cloneElement(step.icon, { sx: { fontSize: 20 } })}
                        </Box>
                      }
                      sx={{
                        '& .MuiStepLabel-labelContainer': {
                          ml: 2,
                        },
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight={600}>
                        {step.label}
                      </Typography>
                    </StepLabel>
                    <StepContent>
                      <Typography
                        variant="body2"
                        sx={{
                          color: theme === 'dark' ? '#AEBEDF' : 'text.secondary',
                          ml: 6,
                          pb: 2,
                        }}
                      >
                        {step.description}
                      </Typography>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </Box>

            {/* Quick Actions */}
            <Box>
              <Typography 
                variant="h5" 
                sx={{ 
                  color: theme === 'dark' ? '#E5E7EB' : 'text.primary',
                  mb: 3,
                  fontWeight: 600,
                }}
              >
                Quick Actions
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<ExtensionIcon />}
                  onClick={() => navigate('/plugins')}
                  sx={{
                    backgroundColor: '#4F46E5',
                    color: '#fff',
                    '&:hover': {
                      backgroundColor: '#4338CA',
                    },
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 2,
                    py: 1.5,
                    boxShadow: theme === 'dark' 
                      ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' 
                      : '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
                  }}
                >
                  Go to Plugin Management
                </Button>
                
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<RefreshIcon />}
                  onClick={() => window.location.reload()}
                  sx={{
                    color: theme === 'dark' ? '#E5E7EB' : undefined,
                    borderColor: theme === 'dark' ? '#374151' : undefined,
                    '&:hover': {
                      borderColor: theme === 'dark' ? '#4F46E5' : undefined,
                      backgroundColor: theme === 'dark' ? 'rgba(79, 70, 229, 0.1)' : undefined,
                    },
                    textTransform: 'none',
                    fontWeight: 500,
                    borderRadius: 2,
                    py: 1.5,
                  }}
                >
                  Refresh Status
                </Button>
              </Box>

              {/* Info Card */}
              <Alert 
                severity="info" 
                sx={{ 
                  backgroundColor: theme === 'dark' ? 'rgba(41, 98, 255, 0.1)' : 'rgba(41, 98, 255, 0.05)',
                  color: theme === 'dark' ? '#E5E7EB' : undefined,
                  border: `1px solid ${theme === 'dark' ? 'rgba(41, 98, 255, 0.3)' : 'rgba(41, 98, 255, 0.2)'}`,
                  borderRadius: 2,
                  '& .MuiAlert-icon': {
                    color: theme === 'dark' ? '#60A5FA' : '#3B82F6',
                  },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                  Need Help?
                </Typography>
                <Typography variant="body2">
                  The cluster plugin enables cluster onboarding, detachment, and monitoring capabilities. 
                  Once installed, you'll be able to manage multiple Kubernetes clusters from this interface.
                </Typography>
              </Alert>
            </Box>
          </Box>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        maxWidth: '100%',
        margin: 'auto',
        p: 0,
        backgroundColor: theme === 'dark' ? '#0F172A' : '#fff',
        boxShadow: theme === 'dark' ? '0px 4px 10px rgba(0, 0, 0, 0.6)' : undefined,
        color: theme === 'dark' ? '#E5E7EB' : 'inherit',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <ClusterManagement />
    </Paper>
  );
};

export default ClusterManagementPage;
import React, { useState, ChangeEvent, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Tabs,
  Tab,
  Box,
  Alert,
  Snackbar,
  SxProps,
  Theme,
} from '@mui/material';
import useTheme from '../stores/themeStore';
import { api } from '../lib/api';
import { useClusterQueries } from '../hooks/queries/useClusterQueries';
import KubeconfigImportTab from './KubeconfigImportTab';
import ApiUrlImportTab from './ApiUrlImportTab';
import ManualImportTab from './ManualImportTab';

// Define the Colors interface for consistent typing across components
export interface Colors {
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
  [key: string]: string; // Allow additional color properties
}

// Common styling objects
const commonInputSx: SxProps<Theme> = {
  mb: 2,
  input: { color: 'inherit' },
  label: { color: 'inherit' },
  fieldset: { borderColor: 'inherit' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'inherit' },
};

interface Props {
  activeOption: string | null;
  setActiveOption: (option: string | null) => void;
  onCancel: () => void;
}

export interface CommandResponse {
  clusterName: string;
  token: string;
  command: string;
}

// Define a proper interface for Axios errors with specific types
interface AxiosErrorResponse {
  status: number;
  data: {
    error?: string;
    [key: string]: unknown;
  };
}

interface AxiosError extends Error {
  response?: AxiosErrorResponse;
  request?: unknown;
  config?: unknown;
}

// Add a debug helper function to log data structure
const debugLogData = (data: unknown, label = 'Data') => {
  console.log(`${label}:`, JSON.stringify(data, null, 2));
};

const ImportClusters: React.FC<Props> = ({ activeOption, setActiveOption, onCancel }) => {
  const theme = useTheme(state => state.theme);
  const textColor = theme === 'dark' ? 'white' : 'black';
  const bgColor = theme === 'dark' ? '#1F2937' : 'background.paper';

  // Define colors first, before any styling objects that use it
  const colors: Colors = {
    primary: '#2f86ff',
    primaryLight: '#9ad6f9',
    primaryDark: '#1a65cc',
    secondary: '#67c073',
    white: '#ffffff',
    background: theme === 'dark' ? '#0f172a' : '#ffffff',
    paper: theme === 'dark' ? '#1e293b' : '#f8fafc',
    text: theme === 'dark' ? '#f1f5f9' : '#1e293b',
    textSecondary: theme === 'dark' ? '#94a3b8' : '#64748b',
    border: theme === 'dark' ? '#334155' : '#e2e8f0',
    success: '#67c073',
    warning: '#ffb347',
    error: '#ff6b6b',
    disabled: theme === 'dark' ? '#475569' : '#94a3b8',
  };

  // State for non-manual tabs - removing fileType and editorContent since YAML tab is being removed
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Global form state
  const [formData, setFormData] = useState({
    clusterName: '',
    token: '',
    hubApiServer: '',
  });

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const [manualCommand, setManualCommand] = useState<CommandResponse | null>(null);
  const [manualLoading, setManualLoading] = useState<boolean>(false);
  const [manualError, setManualError] = useState<string>('');

  // Add ref for scrolling to success alert
  const successAlertRef = useRef<HTMLDivElement>(null);

  // Effect to scroll to success alert when command is generated
  useEffect(() => {
    if (manualCommand && successAlertRef.current) {
      // Scroll the success alert into view with smooth behavior
      successAlertRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [manualCommand]);

  // Update useEffect to handle initial tab selection with new order
  useEffect(() => {
    // If activeOption is null or invalid, set to first available tab (now "manual")
    if (
      !activeOption ||
      (activeOption !== 'manual' && activeOption !== 'kubeconfig' && activeOption !== 'apiurl')
    ) {
      setActiveOption('manual');
    }
  }, [activeOption, setActiveOption]);

  // Update the state type to match the expected data structure
  const [availableClusters, setAvailableClusters] = useState<
    Array<{ name: string; cluster: string }>
  >([]);
  const [availableClustersLoading, setAvailableClustersLoading] = useState<boolean>(false);
  const [availableClustersError, setAvailableClustersError] = useState<string>('');

  // Add useEffect to fetch available clusters
  useEffect(() => {
    if (activeOption === 'manual') {
      fetchAvailableClusters();
    }
  }, [activeOption]);

  // Function to fetch available clusters
  const fetchAvailableClusters = async () => {
    setAvailableClustersLoading(true);
    setAvailableClustersError('');
    try {
      const response = await api.get('/api/clusters/available');
      // Debug log to inspect the data structure
      debugLogData(response.data, 'Available Clusters Response');

      // Handle different possible data structures
      let clusters = response.data || [];

      // If clusters is not an array, try to handle the structure appropriately
      if (!Array.isArray(clusters)) {
        if (typeof clusters === 'object') {
          // Convert object to array of objects with name/cluster properties
          clusters = Object.entries(clusters).map(([name, cluster]) => ({
            name,
            cluster: typeof cluster === 'string' ? cluster : name,
          }));
        } else {
          clusters = [];
        }
      }

      // Filter out the specific cluster names
      clusters = clusters.filter((cluster: { name: string }) => {
        const name = cluster.name || '';
        return !name.includes('k3d-kubeflex') && !name.includes('kind-kubeflex');
      });

      setAvailableClusters(clusters);
    } catch (error) {
      console.error('Error fetching available clusters:', error);
      setAvailableClustersError('Failed to load available clusters. Please try again later.');
    } finally {
      setAvailableClustersLoading(false);
    }
  };

  // Get the onboard mutation from useClusterQueries
  const { useOnboardCluster } = useClusterQueries();
  const onboardClusterMutation = useOnboardCluster();

  const handleGenerateCommand = async () => {
    if (!formData.clusterName.trim()) return;
    setManualError('');
    setManualLoading(true);

    const clusterName = formData.clusterName.trim();

    // Log the request data for debugging
    console.log('[DEBUG] Starting cluster onboarding process for:', clusterName);
    console.log('[DEBUG] Using hybrid approach:');
    console.log(`[DEBUG] - URL: /clusters/onboard?name=${encodeURIComponent(clusterName)}`);
    console.log(`[DEBUG] - Body: { clusterName: "${clusterName}" }`);

    try {
      // Use the onboardCluster mutation with both query parameter and request body
      await onboardClusterMutation.mutateAsync({
        clusterName: clusterName,
      });

      console.log('[DEBUG] Onboarding initiated successfully');

      setTimeout(() => {
        if (!manualCommand) {
          setManualCommand({
            clusterName: clusterName,
            token: '',
            command:
              'Cluster onboarded successfully! The cluster is now being added to the platform.',
          });
        }
      }, 5000);
    } catch (error) {
      console.error('[DEBUG] Cluster onboarding error details:', error);
      let errorMessage = 'An unknown error occurred.';

      // Type guard to check if error is an Error object
      if (error instanceof Error) {
        // Log error object structure for debugging
        console.log(
          '[DEBUG] Error object structure:',
          JSON.stringify(error, Object.getOwnPropertyNames(error))
        );

        // Check if it's an Axios error with response data
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          // Server responded with an error
          const status = axiosError.response.status;
          const responseData = axiosError.response.data;

          console.log('[DEBUG] API error response:', { status, data: responseData });

          if (status === 500) {
            if (responseData && responseData.error) {
              // If there's a specific error message from the server
              const serverError = responseData.error;
              console.log('[DEBUG] Server error message:', serverError);

              if (serverError.includes('Failed to get token')) {
                errorMessage =
                  'Could not onboard cluster. Please verify that:\n\n' +
                  '• The ITS hub cluster is running\n' +
                  '• You have proper permissions\n' +
                  "• The 'clusteradm' CLI tool is installed";
              } else if (serverError.includes('context')) {
                errorMessage =
                  "Could not find the required context 'its1'. Please ensure your kubeconfig is properly set up with the ITS hub context.";
              } else {
                // Include the actual server error for specific issues
                errorMessage = `Server error: ${serverError}`;
              }
            } else {
              errorMessage =
                'The server encountered an error. Please verify that the ITS hub is running and accessible.';
            }
          } else if (status === 404) {
            errorMessage =
              'API endpoint not found. Please check if the service is properly deployed.';
            console.log('[DEBUG] 404 error - API endpoint not found');
          } else if (status === 401 || status === 403) {
            errorMessage = 'Authorization failed. Please check your credentials and permissions.';
            console.log('[DEBUG] Auth error:', status);
          } else {
            errorMessage = `Request failed with status code ${status}. Please try again later.`;
            console.log('[DEBUG] Other status error:', status);
          }
        } else if (axiosError.request) {
          // Request was made but no response received
          console.log('[DEBUG] No response received:', axiosError.request);
          errorMessage =
            'No response received from server. Please check your network connection and verify the server is running.';
        } else {
          // Error in setting up the request
          console.log('[DEBUG] Request setup error:', error.message);
          errorMessage = `Error: ${error.message}`;
        }
      }

      setManualError(errorMessage);
      setManualLoading(false);

      // Added notification for WebSocket connection failure
      setSnackbar({
        open: true,
        message: 'Unable to connect to real-time logs. Please try again.',
        severity: 'error',
      });
    }
  };

  // File upload handler for YAML/Kubeconfig (if needed)
  const handleFileUpload = async () => {
    console.log('File upload triggered');
    // This is a placeholder
    if (selectedFile) {
      setSnackbar({
        open: true,
        message: `File "${selectedFile.name}" selected. Upload functionality to be implemented.`,
        severity: 'info',
      });
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setManualCommand(null);
    setManualError('');
    setFormData({
      clusterName: '',
      token: '',
      hubApiServer: '',
    });
    onCancel();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement; // Type assertion
    setFormData(prev => ({ ...prev, [target.name]: target.value }));
    if (activeOption === 'manual' && target.name === 'clusterName') {
      setManualCommand(null);
      setManualError('');
    }
  };

  const tabContentStyles: SxProps<Theme> = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    border: 1,
    borderColor: 'divider',
    borderRadius: 1,
    p: 3,
    overflowY: 'auto',
    flexGrow: 1,
    minHeight: 0,
    bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
  };

  // Enhanced styling objects - now defined after colors
  const enhancedTabContentStyles: SxProps<Theme> = {
    ...tabContentStyles,
    borderRadius: 2,
    boxShadow:
      theme === 'dark'
        ? 'inset 0 1px 3px 0 rgba(0, 0, 0, 0.3)'
        : 'inset 0 1px 3px 0 rgba(0, 0, 0, 0.06)',
    transition: 'all 0.2s ease-in-out',
    bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
  };

  // Define a consistent button style object that will be used for all buttons
  const buttonStyles: SxProps<Theme> = {
    textTransform: 'none',
    fontWeight: 600,
    borderRadius: 1.5,
    py: 1.2,
    px: 3,
    boxShadow:
      theme === 'dark' ? '0 4px 6px -1px rgba(0, 0, 0, 0.2)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
    fontSize: '0.875rem',
    minWidth: '120px',
    height: '40px',
  };

  const primaryButtonStyles: SxProps<Theme> = {
    ...buttonStyles,
    bgcolor: colors.primary,
    color: colors.white,
    '&:hover': {
      bgcolor: colors.primaryDark,
      transform: 'translateY(-2px)',
      boxShadow:
        theme === 'dark'
          ? '0 6px 10px -1px rgba(0, 0, 0, 0.3)'
          : '0 6px 10px -1px rgba(0, 0, 0, 0.15)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
    '&.Mui-disabled': {
      bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
      color: theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.26)',
    },
  };

  const secondaryButtonStyles: SxProps<Theme> = {
    ...buttonStyles,
    bgcolor: 'transparent',
    color: textColor,
    border: 1,
    borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
    '&:hover': {
      bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
      borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
      transform: 'translateY(-2px)',
      boxShadow:
        theme === 'dark'
          ? '0 4px 8px -2px rgba(0, 0, 0, 0.3)'
          : '0 4px 8px -2px rgba(0, 0, 0, 0.1)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  };

  // First, add a clearManualCommand function to reset the command state
  const clearManualCommand = () => {
    setManualCommand(null);
    setManualError('');
  };

  return (
    <>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          sx={{
            borderRadius: 2,
            boxShadow:
              theme === 'dark' ? '0 8px 16px rgba(0, 0, 0, 0.4)' : '0 8px 16px rgba(0, 0, 0, 0.1)',
            '& .MuiAlert-icon': {
              fontSize: '1.5rem',
              mr: 1.5,
            },
            '& .MuiAlert-message': {
              fontSize: '0.95rem',
              fontWeight: 500,
            },
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Dialog
        open={!!activeOption}
        onClose={onCancel}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: { xs: '90vh', sm: '85vh', md: '80vh' },
            display: 'flex',
            flexDirection: 'column',
            m: { xs: 0.5, sm: 1, md: 2 },
            bgcolor: bgColor,
            color: textColor,
            borderRadius: { xs: 1, sm: 2, md: 3 },
            overflow: 'hidden',
            boxShadow:
              theme === 'dark'
                ? '0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 10px 10px -5px rgba(0, 0, 0, 0.5)'
                : '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            border: theme === 'dark' ? `1px solid ${colors.border}` : 'none',
            maxWidth: { sm: '98%', md: '95%', lg: '1000px' },
          },
        }}
        TransitionProps={{
          style: {
            transition: 'transform 0.3s ease-out, opacity 0.3s ease',
          },
        }}
      >
        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            p: { xs: 1, sm: 1.5, md: 2 },
            flex: '0 0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            bgcolor: theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.02)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: theme === 'dark' ? colors.primaryLight : colors.primary,
              }}
            >
              <Box
                sx={{
                  width: { xs: 32, sm: 36 },
                  height: { xs: 32, sm: 36 },
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor:
                    theme === 'dark' ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <span role="img" aria-label="import" style={{ fontSize: '1.25rem' }}>
                  ⚓
                </span>
              </Box>
              <Box>
                <Box
                  sx={{ fontSize: { xs: '1rem', sm: '1.1rem' }, fontWeight: 700, color: textColor }}
                >
                  Import Cluster
                </Box>
                <Box
                  sx={{
                    fontSize: '0.75rem',
                    color: colors.textSecondary,
                    mt: 0.25,
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  Connect your Kubernetes cluster to the platform
                </Box>
              </Box>
            </Box>
          </Box>
          <Tabs
            value={activeOption}
            onChange={(_event, newValue) => setActiveOption(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              mt: 1.5,
              ml: 1.5,
              '& .MuiTabs-flexContainer': {
                gap: { xs: 1.5, sm: 2 },
              },
              '& .MuiTabs-indicator': {
                display: 'none',
              },
              '& .MuiTabs-scroller': {
                pl: 0.5,
                overflow: 'visible',
              },
              '& .MuiTab-root': {
                minWidth: 'auto',
                minHeight: { xs: 36, sm: 40 },
                px: { xs: 1.5, sm: 2 },
                py: { xs: 0.75, sm: 1 },
                mt: 0.5,
                mb: 0.5,
                color: colors.textSecondary,
                fontSize: { xs: '0.8rem', sm: '0.85rem' },
                fontWeight: 500,
                textTransform: 'none',
                transition: 'all 0.25s ease',
                borderRadius: '12px',
                position: 'relative',
                overflow: 'visible',
                border: '1px solid transparent !important',
                WebkitAppearance: 'none',
                outline: 'none !important',
                '&:focus': {
                  outline: 'none !important',
                  boxShadow: 'none !important',
                  border: '1px solid transparent !important',
                },
                '&:focus-visible': {
                  outline: 'none !important',
                  boxShadow: 'none !important',
                },
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none',
                '&::-webkit-focus-ring-color': {
                  color: 'transparent',
                },
                '&::before, &::after': {
                  content: '""',
                  display: 'none',
                },
                '@media not all and (min-resolution:.001dpcm)': {
                  '@supports (-webkit-appearance:none)': {
                    outline: 'none !important',
                    boxShadow: 'none !important',
                    borderColor: 'transparent !important',
                  },
                },

                '&:hover': {
                  backgroundColor:
                    theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                  color: theme === 'dark' ? colors.white : colors.primary,
                  borderColor:
                    theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                  '& .iconContainer': {
                    backgroundColor:
                      theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    transform: 'scale(1.05)',
                  },
                },

                '&.Mui-selected': {
                  color: theme === 'dark' ? colors.white : colors.primary,
                  backgroundColor:
                    theme === 'dark' ? 'rgba(47, 134, 255, 0.08)' : 'rgba(47, 134, 255, 0.05)',
                  fontWeight: 600,
                  border: `1px solid ${colors.primary} !important`,
                  boxShadow:
                    theme === 'dark'
                      ? `0 0 8px ${colors.primary}40`
                      : `0 0 6px ${colors.primary}30`,
                  zIndex: 1,
                  position: 'relative',
                  '&:focus, &:focus-visible': {
                    outline: 'none !important',
                    border: `1px solid ${colors.primary} !important`,
                  },
                  '&::before, &::after': {
                    display: 'none !important',
                  },
                  '@media not all and (min-resolution:.001dpcm)': {
                    '@supports (-webkit-appearance:none)': {
                      border: `1px solid ${colors.primary} !important`,
                      outline: 'none !important',
                    },
                  },
                  '& .iconContainer': {
                    backgroundColor:
                      theme === 'dark' ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)',
                    transform: 'scale(1.1)',
                    color: colors.primary,
                  },
                },
              },
            }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    className="iconContainer"
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor:
                        theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <span role="img" aria-label="manual" style={{ fontSize: '0.9rem' }}>
                      ⚙️
                    </span>
                  </Box>
                  Manual
                </Box>
              }
              value="manual"
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    className="iconContainer"
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor:
                        theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <span role="img" aria-label="kubeconfig" style={{ fontSize: '0.9rem' }}>
                      📁
                    </span>
                  </Box>
                  Kubeconfig
                </Box>
              }
              value="kubeconfig"
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    className="iconContainer"
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor:
                        theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <span role="img" aria-label="api" style={{ fontSize: '0.9rem' }}>
                      🔗
                    </span>
                  </Box>
                  API/URL
                </Box>
              }
              value="apiurl"
            />
          </Tabs>
        </Box>

        <DialogContent sx={{ p: 0, flex: 1, overflow: 'hidden' }}>
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 1, sm: 1.5 } }}>
              {activeOption === 'kubeconfig' && (
                <KubeconfigImportTab
                  theme={theme}
                  colors={colors}
                  commonInputSx={commonInputSx}
                  enhancedTabContentStyles={enhancedTabContentStyles}
                  primaryButtonStyles={primaryButtonStyles}
                  secondaryButtonStyles={secondaryButtonStyles}
                  selectedFile={selectedFile}
                  setSelectedFile={setSelectedFile}
                  handleFileUpload={handleFileUpload}
                  handleCancel={handleCancel}
                />
              )}

              {activeOption === 'apiurl' && (
                <ApiUrlImportTab
                  theme={theme}
                  colors={colors}
                  commonInputSx={commonInputSx}
                  enhancedTabContentStyles={enhancedTabContentStyles}
                  primaryButtonStyles={primaryButtonStyles}
                  secondaryButtonStyles={secondaryButtonStyles}
                  formData={formData}
                  setFormData={data => setFormData(prev => ({ ...prev, ...data }))}
                  handleCancel={handleCancel}
                />
              )}

              {activeOption === 'manual' && (
                <ManualImportTab
                  theme={theme}
                  colors={colors}
                  commonInputSx={commonInputSx}
                  enhancedTabContentStyles={enhancedTabContentStyles}
                  primaryButtonStyles={primaryButtonStyles}
                  secondaryButtonStyles={secondaryButtonStyles}
                  formData={formData}
                  handleChange={handleChange}
                  handleGenerateCommand={handleGenerateCommand}
                  manualCommand={manualCommand}
                  manualLoading={manualLoading}
                  manualError={manualError}
                  availableClusters={availableClusters}
                  availableClustersLoading={availableClustersLoading}
                  availableClustersError={availableClustersError}
                  fetchAvailableClusters={fetchAvailableClusters}
                  clearManualCommand={clearManualCommand}
                  onCancel={handleCancel}
                  snackbar={snackbar}
                  setSnackbar={setSnackbar}
                  successAlertRef={successAlertRef}
                  setManualCommand={setManualCommand}
                  setManualLoading={setManualLoading}
                />
              )}
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImportClusters;

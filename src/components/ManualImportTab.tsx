import React, { ChangeEvent, RefObject, useState } from 'react';
import { Box, Button, CircularProgress, Alert, SxProps, Theme } from '@mui/material';
import { CommandResponse, Colors } from './ImportClusters';
import OnboardingLogsDisplay from './OnboardingLogsDisplay';

interface ManualImportTabProps {
  theme: string;
  colors: Colors;
  commonInputSx: SxProps<Theme>;
  enhancedTabContentStyles: SxProps<Theme>;
  primaryButtonStyles: SxProps<Theme>;
  secondaryButtonStyles: SxProps<Theme>;
  formData: { clusterName: string; token: string; hubApiServer: string };
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleGenerateCommand: () => void;
  manualCommand: CommandResponse | null;
  manualLoading: boolean;
  setManualLoading: (loading: boolean) => void;
  manualError: string;
  availableClusters: Array<{ name: string; cluster: string }>;
  availableClustersLoading: boolean;
  availableClustersError: string;
  fetchAvailableClusters: () => void;
  clearManualCommand: () => void;
  onCancel: () => void;
  snackbar: { open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' };
  setSnackbar: (snackbar: {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }) => void;
  successAlertRef: RefObject<HTMLDivElement>;
  setManualCommand: (command: CommandResponse | null) => void;
}

const ManualImportTab: React.FC<ManualImportTabProps> = ({
  theme,
  colors,
  enhancedTabContentStyles,
  primaryButtonStyles,
  secondaryButtonStyles,
  formData,
  handleChange,
  handleGenerateCommand,
  manualCommand,
  manualLoading,
  setManualLoading,
  manualError,
  availableClusters,
  availableClustersLoading,
  availableClustersError,
  fetchAvailableClusters,
  clearManualCommand,
  onCancel,
  setSnackbar,
  successAlertRef,
  setManualCommand,
}) => {
  const textColor = theme === 'dark' ? colors.white : colors.text;
  const [showLogs, setShowLogs] = useState(false);

  // This function will be called when the onboarding is completed via logs
  const handleOnboardingComplete = () => {
    // Wait a moment for last logs to be visible
    setTimeout(() => {
      setShowLogs(false);
      // Set the success message
      if (!manualCommand) {
        const successCommand = {
          clusterName: formData.clusterName,
          token: '',
          command:
            'Cluster onboarded successfully! The cluster is now being added to the platform.',
        };
        clearManualCommand(); // Clear any existing command
        setTimeout(() => {
          setManualCommand(successCommand);
          setSnackbar({
            open: true,
            message: 'Cluster onboarded successfully!',
            severity: 'success',
          });
        }, 100);
      }
    }, 2000);
  };

  const handleOnboard = () => {
    if (!formData.clusterName.trim()) return;
    setShowLogs(true);
    handleGenerateCommand();

    // Reset loading state after WebSocket takes over
    setTimeout(() => {
      if (showLogs) {
        setManualLoading(false);
      }
    }, 1000);
  };

  return (
    <Box
      sx={{
        ...enhancedTabContentStyles,
        border: 'none',
        boxShadow: 'none',
        bgcolor: 'transparent',
        p: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          p: { xs: 1.5, sm: 2, md: 2.5 },
          borderRadius: { xs: 1.5, sm: 2 },
          backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.8)',
          border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          boxShadow:
            theme === 'dark' ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.05)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header with improved description and visual appeal */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
            mb: 2,
            p: 2,
            borderRadius: 2,
            background:
              theme === 'dark'
                ? 'linear-gradient(145deg, rgba(47, 134, 255, 0.08) 0%, rgba(47, 134, 255, 0.02) 100%)'
                : 'linear-gradient(145deg, rgba(47, 134, 255, 0.04) 0%, rgba(47, 134, 255, 0.01) 100%)',
            border: `1px solid ${theme === 'dark' ? 'rgba(47, 134, 255, 0.1)' : 'rgba(47, 134, 255, 0.05)'}`,
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: theme === 'dark' ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)',
              color: theme === 'dark' ? colors.primaryLight : colors.primary,
              flexShrink: 0,
              mt: 0.5,
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            }}
          >
            <span role="img" aria-label="info" style={{ fontSize: '1.1rem' }}>
              ⚙️
            </span>
          </Box>
          <Box>
            <Box
              sx={{
                fontWeight: 600,
                fontSize: { xs: '0.95rem', sm: '1rem' },
                color: textColor,
                mb: 0.5,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              Manual Cluster Setup
              <Box
                component="span"
                sx={{
                  ml: 1.5,
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  px: 1,
                  py: 0.3,
                  borderRadius: '10px',
                  bgcolor:
                    theme === 'dark' ? 'rgba(103, 192, 115, 0.15)' : 'rgba(103, 192, 115, 0.1)',
                  color: theme === 'dark' ? '#97e6a5' : '#3d9950',
                  border: `1px solid ${theme === 'dark' ? 'rgba(103, 192, 115, 0.2)' : 'rgba(103, 192, 115, 0.15)'}`,
                }}
              >
                Recommended
              </Box>
            </Box>
            <Box
              sx={{
                color: colors.textSecondary,
                fontSize: '0.825rem',
                lineHeight: 1.5,
                maxWidth: '90%',
              }}
            >
              This is the simplest way to connect your Kubernetes cluster. Select a cluster and
              click the Onboard Cluster button to directly connect it to your platform without any
              manual commands.
            </Box>
          </Box>
        </Box>

        {showLogs && formData.clusterName && (
          <OnboardingLogsDisplay
            clusterName={formData.clusterName}
            onComplete={handleOnboardingComplete}
            theme={theme}
            colors={colors}
          />
        )}

        {!manualCommand && !showLogs ? (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Box
              sx={{
                backgroundColor:
                  theme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
                borderRadius: 2,
                p: 2.5,
                mb: 2,
                border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
              }}
            >
              <Box
                sx={{
                  mb: 1.5,
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  color: textColor,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <span role="img" aria-label="select" style={{ fontSize: '0.9rem' }}>
                  🔍
                </span>
                Select a cluster to connect
              </Box>

              {availableClustersLoading ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 3,
                    minHeight: '56px',
                    bgcolor: theme === 'dark' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.02)',
                    borderRadius: 1.5,
                    border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
                  }}
                >
                  <CircularProgress size={24} sx={{ color: colors.primary }} />
                  <Box sx={{ ml: 2, fontSize: '0.85rem', color: colors.textSecondary }}>
                    Loading available clusters...
                  </Box>
                </Box>
              ) : availableClustersError ? (
                <Alert
                  severity="error"
                  icon={
                    <span role="img" aria-label="error" style={{ fontSize: '0.9rem' }}>
                      ⚠️
                    </span>
                  }
                  sx={{
                    borderRadius: 1.5,
                    py: 1,
                    fontSize: '0.825rem',
                    mb: 1,
                  }}
                >
                  <Box sx={{ fontWeight: 600, mb: 0.5 }}>Error loading clusters</Box>
                  <Box sx={{ fontSize: '0.8rem' }}>{availableClustersError}</Box>
                  <Button
                    size="small"
                    sx={{
                      mt: 1,
                      minWidth: 'auto',
                      fontSize: '0.75rem',
                      color: colors.primary,
                      borderRadius: 1,
                      '&:hover': { backgroundColor: 'rgba(47, 134, 255, 0.08)' },
                    }}
                    onClick={fetchAvailableClusters}
                    startIcon={
                      <span role="img" aria-label="retry" style={{ fontSize: '0.8rem' }}>
                        🔄
                      </span>
                    }
                  >
                    Retry
                  </Button>
                </Alert>
              ) : (
                <>
                  <Box
                    sx={{
                      border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'}`,
                      borderRadius: 1.5,
                      backgroundColor:
                        theme === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.8)',
                      position: 'relative',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      mb: 1.5,
                      '&:hover': {
                        borderColor: colors.primary,
                        boxShadow: `0 0 0 1px ${colors.primary}30`,
                      },
                      '&:focus-within': {
                        borderColor: colors.primary,
                        boxShadow: `0 0 0 2px ${colors.primary}30`,
                      },
                    }}
                  >
                    <Box
                      component="select"
                      value={formData.clusterName}
                      onChange={handleChange} //
                      name="clusterName"
                      sx={{
                        width: '100%',
                        height: '52px',
                        padding: '0 16px',
                        paddingLeft: '46px',
                        appearance: 'none',
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        color: theme === 'dark' ? '#ffffff' : 'inherit',
                        fontSize: '0.95rem',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        position: 'relative',
                        zIndex: 1,
                        '& option': {
                          backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                          color: theme === 'dark' ? '#ffffff' : '#000000',
                          padding: '10px',
                          fontSize: '0.9rem',
                        },
                      }}
                    >
                      <option value="" disabled>
                        Choose a cluster...
                      </option>
                      {availableClusters.length === 0 ? (
                        <option value="" disabled>
                          No clusters available
                        </option>
                      ) : (
                        availableClusters.map((clusterObj, index) => {
                          const name = clusterObj.name || `Cluster ${index + 1}`;
                          const value = clusterObj.name || name;
                          return (
                            <option key={value} value={value}>
                              {name}
                            </option>
                          );
                        })
                      )}
                    </Box>
                    <Box
                      sx={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: colors.textSecondary,
                        zIndex: 0,
                      }}
                    >
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor:
                            theme === 'dark'
                              ? 'rgba(47, 134, 255, 0.15)'
                              : 'rgba(47, 134, 255, 0.1)',
                          color: theme === 'dark' ? colors.primaryLight : colors.primary,
                        }}
                      ></Box>
                    </Box>
                    <Box
                      sx={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: theme === 'dark' ? colors.primaryLight : colors.primary,
                        zIndex: 0,
                        pointerEvents: 'none',
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M6 9L12 15L18 9"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1.5,
                      borderRadius: 1.5,
                      backgroundColor:
                        theme === 'dark' ? 'rgba(255, 215, 0, 0.05)' : 'rgba(255, 215, 0, 0.08)',
                      border: `1px solid ${theme === 'dark' ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 215, 0, 0.15)'}`,
                    }}
                  >
                    <span role="img" aria-label="tip" style={{ fontSize: '0.9rem' }}>
                      💡
                    </span>
                    <Box
                      sx={{
                        fontSize: '0.8rem',
                        color: theme === 'dark' ? 'rgba(255, 215, 0, 0.8)' : '#7d6608',
                        flex: 1,
                      }}
                    >
                      These are clusters discovered in your environment. Select one to continue.
                    </Box>
                    <Button
                      size="small"
                      onClick={fetchAvailableClusters}
                      sx={{
                        minWidth: '36px',
                        height: '36px',
                        p: 0,
                        ml: 0.5,
                        borderRadius: '50%',
                        color: theme === 'dark' ? colors.primaryLight : colors.primary,
                        '&:hover': {
                          backgroundColor:
                            theme === 'dark'
                              ? 'rgba(47, 134, 255, 0.08)'
                              : 'rgba(47, 134, 255, 0.05)',
                        },
                      }}
                      aria-label="Refresh clusters list"
                      title="Refresh clusters list"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M8 12L12 16L16 12"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M12 2V16"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Button>
                  </Box>
                </>
              )}
            </Box>

            {manualError && (
              <Alert
                severity="error"
                icon={
                  <span role="img" aria-label="error" style={{ fontSize: '1rem' }}>
                    ❌
                  </span>
                }
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  py: 1.5,
                  px: 2,
                  animation: 'fadeIn 0.3s ease-in-out',
                  '@keyframes fadeIn': {
                    '0%': { opacity: 0, transform: 'translateY(-5px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' },
                  },
                  boxShadow: '0 3px 8px rgba(255,107,107,0.15)',
                  '& .MuiAlert-message': {
                    fontSize: '0.85rem',
                  },
                  border: `1px solid ${theme === 'dark' ? 'rgba(255, 107, 107, 0.2)' : 'rgba(255, 107, 107, 0.15)'}`,
                }}
              >
                <Box sx={{ fontWeight: 600, fontSize: '0.9rem', mb: 0.5 }}>Connection Error</Box>
                <Box sx={{ whiteSpace: 'pre-line' }}>{manualError}</Box>
                {manualError.includes('clusteradm') && (
                  <Box
                    sx={{
                      mt: 1.5,
                      pt: 1,
                      borderTop: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                      fontSize: '0.775rem',
                      fontStyle: 'italic',
                    }}
                  >
                    <Box sx={{ fontWeight: 600, mb: 0.5 }}>💻 Installation Guide:</Box>
                    To install clusteradm, run:
                    <Box
                      component="pre"
                      sx={{
                        fontFamily: "'Fira Code', monospace",
                        backgroundColor:
                          theme === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.04)',
                        p: 1.5,
                        mt: 0.5,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      curl -fsSL
                      https://raw.githubusercontent.com/open-cluster-management-io/clusteradm/main/install.sh
                      | bash
                      <Button
                        size="small"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            'curl -fsSL https://raw.githubusercontent.com/open-cluster-management-io/clusteradm/main/install.sh | bash'
                          );
                          setSnackbar({
                            open: true,
                            message: 'Installation command copied!',
                            severity: 'success',
                          });
                        }}
                        sx={{
                          position: 'absolute',
                          top: 3,
                          right: 3,
                          minWidth: '24px',
                          width: '24px',
                          height: '24px',
                          p: 0,
                          borderRadius: 0.5,
                          bgcolor:
                            theme === 'dark'
                              ? 'rgba(47, 134, 255, 0.2)'
                              : 'rgba(47, 134, 255, 0.1)',
                          color: theme === 'dark' ? colors.primaryLight : colors.primary,
                          boxShadow: 'none',
                          '&:hover': {
                            bgcolor:
                              theme === 'dark'
                                ? 'rgba(47, 134, 255, 0.3)'
                                : 'rgba(47, 134, 255, 0.2)',
                          },
                        }}
                      >
                        <span role="img" aria-label="copy" style={{ fontSize: '0.7rem' }}>
                          📋
                        </span>
                      </Button>
                    </Box>
                  </Box>
                )}
              </Alert>
            )}

            <Box
              sx={{
                p: 2.5,
                mt: 2,
                borderRadius: 2,
                backgroundColor:
                  theme === 'dark' ? 'rgba(47, 134, 255, 0.05)' : 'rgba(47, 134, 255, 0.03)',
                border: `1px solid ${theme === 'dark' ? 'rgba(47, 134, 255, 0.1)' : 'rgba(47, 134, 255, 0.08)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor:
                      theme === 'dark' ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)',
                    color: theme === 'dark' ? colors.primaryLight : colors.primary,
                  }}
                >
                  <span role="img" aria-label="info" style={{ fontSize: '0.9rem' }}>
                    ℹ️
                  </span>
                </Box>
                <Box sx={{ fontWeight: 600, fontSize: '0.9rem', color: textColor }}>
                  How to connect your cluster
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  pl: 5,
                }}
              >
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor:
                      theme === 'dark' ? 'rgba(47, 134, 255, 0.1)' : 'rgba(47, 134, 255, 0.05)',
                    color: theme === 'dark' ? colors.primaryLight : colors.primary,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  1
                </Box>
                <Box sx={{ fontSize: '0.825rem', color: colors.textSecondary }}>
                  Select a cluster from the dropdown above
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  pl: 5,
                }}
              >
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor:
                      theme === 'dark' ? 'rgba(47, 134, 255, 0.1)' : 'rgba(47, 134, 255, 0.05)',
                    color: theme === 'dark' ? colors.primaryLight : colors.primary,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  2
                </Box>
                <Box sx={{ fontSize: '0.825rem', color: colors.textSecondary }}>
                  Click "Onboard Cluster" button to directly connect your cluster
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  pl: 5,
                }}
              >
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor:
                      theme === 'dark' ? 'rgba(47, 134, 255, 0.1)' : 'rgba(47, 134, 255, 0.05)',
                    color: theme === 'dark' ? colors.primaryLight : colors.primary,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  3
                </Box>
                <Box sx={{ fontSize: '0.825rem', color: colors.textSecondary }}>
                  Your cluster will be automatically onboarded without manual commands
                </Box>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 2,
                mt: 'auto',
                pt: 2.5,
                borderTop: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
              }}
            >
              <Button
                variant="outlined"
                onClick={onCancel}
                sx={{
                  ...secondaryButtonStyles,
                  '&:focus-visible': {
                    outline: `2px solid ${colors.primary}`,
                    outlineOffset: 2,
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleOnboard}
                disabled={!formData.clusterName.trim() || manualLoading || availableClustersLoading}
                sx={{
                  ...primaryButtonStyles,
                  '&:focus-visible': {
                    outline: `2px solid ${colors.primary}`,
                    outlineOffset: 2,
                  },
                }}
                startIcon={
                  manualLoading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <span role="img" aria-label="onboard" style={{ fontSize: '0.9rem' }}>
                      ⚡
                    </span>
                  )
                }
                aria-label={manualLoading ? 'Onboarding cluster...' : 'Onboard Cluster'}
              >
                {manualLoading ? 'Onboarding...' : 'Onboard Cluster'}
              </Button>
            </Box>
          </Box>
        ) : manualCommand && !showLogs ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              animation: 'fadeIn 0.4s ease-in-out',
              '@keyframes fadeIn': {
                '0%': { opacity: 0 },
                '100%': { opacity: 1 },
              },
            }}
          >
            <Box ref={successAlertRef}>
              <Alert
                severity="success"
                icon={
                  <span role="img" aria-label="success" style={{ fontSize: '1rem' }}>
                    ✅
                  </span>
                }
                sx={{
                  mb: 2,
                  borderRadius: 1.5,
                  py: 2,
                  px: 2.5,
                  boxShadow: '0 4px 10px rgba(103,192,115,0.15)',
                  '& .MuiAlert-message': {
                    fontSize: '0.9rem',
                  },
                }}
              >
                <Box sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                  Cluster Onboarded Successfully
                </Box>
                <Box sx={{ mt: 1 }}>
                  Cluster <strong>{manualCommand.clusterName}</strong> has been successfully
                  onboarded to the platform.
                </Box>
              </Alert>
            </Box>

            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                backgroundColor:
                  theme === 'dark' ? 'rgba(103, 192, 115, 0.1)' : 'rgba(103, 192, 115, 0.05)',
                border: `1px solid ${theme === 'dark' ? 'rgba(103, 192, 115, 0.2)' : 'rgba(103, 192, 115, 0.1)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                mb: 2,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor:
                      theme === 'dark' ? 'rgba(103, 192, 115, 0.2)' : 'rgba(103, 192, 115, 0.15)',
                    color: theme === 'dark' ? colors.success : '#3d9950',
                    flexShrink: 0,
                    fontSize: '1.2rem',
                    fontWeight: 600,
                  }}
                >
                  <span role="img" aria-label="check" style={{ fontSize: '1.2rem' }}>
                    ✓
                  </span>
                </Box>
                <Box
                  sx={{
                    fontWeight: 600,
                    fontSize: '1rem',
                    color: theme === 'dark' ? colors.success : '#3d9950',
                  }}
                >
                  Cluster has been added to the platform
                </Box>
              </Box>

              <Box sx={{ pl: 7 }}>
                <Box sx={{ fontSize: '0.9rem', color: textColor, mb: 2 }}>
                  Your cluster <strong>{manualCommand.clusterName}</strong> has been successfully
                  onboarded. You can now:
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor:
                          theme === 'dark' ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)',
                        color: theme === 'dark' ? colors.primaryLight : colors.primary,
                        flexShrink: 0,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      1
                    </Box>
                    <Box sx={{ fontSize: '0.875rem', color: colors.textSecondary }}>
                      View and manage the cluster in the dashboard
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor:
                          theme === 'dark' ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)',
                        color: theme === 'dark' ? colors.primaryLight : colors.primary,
                        flexShrink: 0,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      2
                    </Box>
                    <Box sx={{ fontSize: '0.875rem', color: colors.textSecondary }}>
                      Deploy applications and services to the cluster
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor:
                          theme === 'dark' ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)',
                        color: theme === 'dark' ? colors.primaryLight : colors.primary,
                        flexShrink: 0,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      3
                    </Box>
                    <Box sx={{ fontSize: '0.875rem', color: colors.textSecondary }}>
                      Configure and manage the cluster settings
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Button
                    variant="contained"
                    component="a"
                    href="/its"
                    onClick={() => {
                      onCancel();
                    }}
                    sx={{
                      ...primaryButtonStyles,
                      bgcolor: theme === 'dark' ? 'rgba(47, 134, 255, 0.7)' : colors.primary,
                      color: '#ffffff',
                      fontWeight: 600,
                      border: `1px solid ${theme === 'dark' ? 'rgba(47, 134, 255, 0.8)' : colors.primaryDark}`,
                      width: '100%',
                      maxWidth: '320px',
                      borderRadius: '8px',
                      py: 1.5,
                      fontSize: '0.9rem',
                      letterSpacing: '0.3px',
                      '&:hover': {
                        bgcolor: theme === 'dark' ? 'rgba(47, 134, 255, 0.8)' : colors.primaryDark,
                        transform: 'translateY(-2px)',
                        boxShadow:
                          theme === 'dark'
                            ? '0 8px 16px -2px rgba(47, 134, 255, 0.3)'
                            : '0 8px 16px -2px rgba(47, 134, 255, 0.4)',
                      },
                      '&:active': {
                        transform: 'translateY(-1px)',
                        boxShadow:
                          theme === 'dark'
                            ? '0 4px 8px -2px rgba(47, 134, 255, 0.3)'
                            : '0 4px 8px -2px rgba(47, 134, 255, 0.4)',
                      },
                    }}
                  >
                    View Cluster in Dashboard
                  </Button>
                </Box>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 2,
                mt: 'auto',
                pt: 2,
                borderTop: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
              }}
            >
              <Box display="flex" gap={2}>
                <Button
                  variant="outlined"
                  onClick={clearManualCommand}
                  sx={{
                    ...secondaryButtonStyles,
                    bgcolor: theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.03)',
                    '&:hover': {
                      bgcolor: theme === 'dark' ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.05)',
                      borderColor:
                        theme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                      transform: 'translateY(-2px)',
                      boxShadow:
                        theme === 'dark'
                          ? '0 4px 8px -2px rgba(0, 0, 0, 0.3)'
                          : '0 4px 8px -2px rgba(0, 0, 0, 0.1)',
                    },
                  }}
                  startIcon={
                    <span role="img" aria-label="back" style={{ fontSize: '0.8rem' }}>
                      ⬅️
                    </span>
                  }
                >
                  Back
                </Button>
                <Button variant="outlined" onClick={onCancel} sx={secondaryButtonStyles}>
                  Close
                </Button>
              </Box>
              <Button
                variant="contained"
                onClick={() => {
                  window.location.href = '/its';
                  onCancel();
                }}
                sx={primaryButtonStyles}
                startIcon={
                  <span role="img" aria-label="dashboard" style={{ fontSize: '0.8rem' }}>
                    🚀
                  </span>
                }
              >
                Go to Dashboard
              </Button>
            </Box>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};

export default ManualImportTab;

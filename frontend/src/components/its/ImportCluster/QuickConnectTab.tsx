import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Fade,
  Paper,
  SxProps,
  Theme,
  Typography,
  useMediaQuery,
  Zoom,
} from '@mui/material';
import { TOptions } from 'i18next';
import React, { ChangeEvent, RefObject, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Colors, CommandResponse } from './ImportClusters';
import OnboardingLogsDisplay from './OnboardingLogsDisplay';
import CancelButton from '../../common/CancelButton';
interface QuickConnectProps {
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
  showLogs: boolean;
  setShowLogs: (show: boolean) => void;
  onboardingStatus: 'idle' | 'processing' | 'success' | 'failed';
  setOnboardingStatus: (status: 'idle' | 'processing' | 'success' | 'failed') => void;
  onboardingError: string | null;
  setOnboardingError: (error: string | null) => void;
}

const QuickConnectTab: React.FC<QuickConnectProps> = ({
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
  availableClusters,
  availableClustersLoading,
  availableClustersError,
  fetchAvailableClusters,
  clearManualCommand,
  onCancel,
  setSnackbar,
  successAlertRef,
  setManualCommand,
  showLogs,
  setShowLogs,
  onboardingStatus,
  setOnboardingStatus,
  setOnboardingError,
}) => {
  const { t } = useTranslation();
  const textColor = theme === 'dark' ? colors.white : colors.text;
  // const [showLogs, setShowLogs] = useState(false);
  const isMobile = useMediaQuery('(max-width:600px)');
  const initialFetchAttempted = useRef(false);

  // Auto-fetch clusters when component mounts
  useEffect(() => {
    // Only fetch once on mount if we have no clusters and no error
    if (
      !initialFetchAttempted.current &&
      availableClusters.length === 0 &&
      !availableClustersError &&
      !availableClustersLoading
    ) {
      initialFetchAttempted.current = true;
      fetchAvailableClusters();
    }
  }, [
    availableClusters.length,
    availableClustersError,
    availableClustersLoading,
    fetchAvailableClusters,
  ]); // Include all dependencies
  useEffect(() => {
    return () => {
      // This runs when component unmounts (tab switch)
      if (showLogs && onboardingStatus === 'processing') {
        // User switched tabs during onboarding
        setOnboardingStatus('failed');
        setOnboardingError('Onboarding interrupted by tab switch');
        setManualLoading(false); // Reset loading state
      }
    };
  }, [showLogs, onboardingStatus, setOnboardingStatus, setOnboardingError, setManualLoading]);

  // This function will be called when the onboarding is completed via logs
  const handleOnboardingComplete = () => {
    setTimeout(() => {
      setShowLogs(false);
      // Only set success command if onboarding was successful
      if (onboardingStatus === 'success' && !manualCommand) {
        const successCommand = {
          clusterName: formData.clusterName,
          token: '',
          command:
            'Cluster onboarded successfully! The cluster is now being added to the platform.',
        };
        clearManualCommand();
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
    setOnboardingStatus('processing');
    setOnboardingError(null);

    // Reset loading state after WebSocket takes over
    setTimeout(() => {
      if (showLogs) {
        setManualLoading(false);
      }
    }, 1000);
  };

  // Card styles with consistent elevation and hover effects
  const cardStyle: SxProps<Theme> = {
    borderRadius: { xs: 2, sm: 3 },
    p: { xs: 2, sm: 3 },
    mb: 3,
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    backgroundColor: theme === 'dark' ? 'rgba(24, 28, 33, 0.8)' : 'rgba(255, 255, 255, 0.9)',
    border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
    boxShadow:
      theme === 'dark' ? '0 4px 20px rgba(0, 0, 0, 0.2)' : '0 4px 20px rgba(0, 0, 0, 0.06)',
    position: 'relative',
    overflow: 'hidden',
    transform: 'translateZ(0)', // Force GPU acceleration
    backfaceVisibility: 'hidden', // Prevent flickering during animations
    '&:hover': {
      transform: 'translateY(-2px) translateZ(0)',
      boxShadow:
        theme === 'dark' ? '0 6px 24px rgba(0, 0, 0, 0.25)' : '0 6px 24px rgba(0, 0, 0, 0.08)',
    },
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
        overflow: 'hidden',
        minHeight: 0, // Helps with flexbox scrolling issues
      }}
    >
      <Box
        sx={{
          p: { xs: 1.5, sm: 2, md: 2.5 },
          borderRadius: { xs: 1.5, sm: 2 },
          backgroundColor: theme === 'dark' ? 'rgba(16, 20, 24, 0.7)' : 'rgba(250, 252, 254, 0.8)',
          backgroundImage:
            theme === 'dark'
              ? 'linear-gradient(to bottom right, rgba(30, 40, 50, 0.8), rgba(10, 15, 20, 0.6))'
              : 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.9), rgba(245, 247, 250, 0.8))',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}`,
          boxShadow:
            theme === 'dark' ? '0 10px 30px rgba(0, 0, 0, 0.2)' : '0 10px 30px rgba(0, 0, 0, 0.04)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 0, // Helps with flexbox scrolling issues
        }}
      >
        {/* Visual elements for modern design feel */}
        <Box
          sx={{
            position: 'absolute',
            top: theme === 'dark' ? -120 : -150,
            right: theme === 'dark' ? -120 : -150,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background:
              theme === 'dark'
                ? 'radial-gradient(circle, rgba(47, 134, 255, 0.08) 0%, rgba(47, 134, 255, 0) 70%)'
                : 'radial-gradient(circle, rgba(47, 134, 255, 0.04) 0%, rgba(47, 134, 255, 0) 70%)',
            zIndex: 0,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: theme === 'dark' ? -100 : -120,
            left: theme === 'dark' ? -100 : -120,
            width: 250,
            height: 250,
            borderRadius: '50%',
            background:
              theme === 'dark'
                ? 'radial-gradient(circle, rgba(103, 192, 115, 0.08) 0%, rgba(103, 192, 115, 0) 70%)'
                : 'radial-gradient(circle, rgba(103, 192, 115, 0.04) 0%, rgba(103, 192, 115, 0) 70%)',
            zIndex: 0,
          }}
        />

        {/* Main content wrapper */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            height: '100%',
            overflow: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor:
              theme === 'dark'
                ? 'rgba(255, 255, 255, 0.2) rgba(0, 0, 0, 0.2)'
                : 'rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.05)',
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)',
              borderRadius: '10px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
              borderRadius: '10px',
              '&:hover': {
                background: theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
              },
            },
            overflowAnchor: 'none',
            willChange: 'transform',
            WebkitOverflowScrolling: 'touch',
            paddingRight: '4px',
            // Add stable sizing to prevent content jumps
            '& > div': {
              minHeight: 0,
              contain: 'content',
            },
            // Prevent content shifting during scrolling
            '& > *': {
              transformStyle: 'preserve-3d',
              contain: 'layout paint style',
            },
            // Improve scroll performance
            '&:before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '1px',
              opacity: 0,
              pointerEvents: 'none',
            },
            // Prevent paint during scrolling
            '&:active': {
              '& *': {
                transition: 'none !important',
              },
            },
          }}
        >
          {/* Header section with title and description */}
          <Fade in={true} timeout={600} easing="cubic-bezier(0.4, 0, 0.2, 1)">
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="h5"
                component="h2"
                sx={{
                  fontWeight: 700,
                  mb: 1,
                  color: textColor,
                  fontSize: { xs: '1.4rem', sm: '1.5rem', md: '1.6rem' },
                  letterSpacing: '-0.01em',
                }}
              >
                {t('quickConnect.title')}
                <Box
                  component="span"
                  sx={{
                    color: theme === 'dark' ? colors.primaryLight : colors.primary,
                    display: 'inline-block',
                    ml: 1,
                  }}
                >
                  ✨
                </Box>
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: colors.textSecondary,
                  maxWidth: '90%',
                  lineHeight: 1.6,
                  fontSize: { xs: '0.9rem', sm: '0.95rem' },
                  mb: 2,
                }}
              >
                {t('quickConnect.description')}
              </Typography>
            </Box>
          </Fade>

          {/* Main content - rendered conditionally based on state */}
          {showLogs && formData.clusterName ? (
            <Fade in={true} timeout={400} easing="cubic-bezier(0.4, 0, 0.2, 1)">
              <Box>
                <OnboardingLogsDisplay
                  clusterName={formData.clusterName}
                  onComplete={handleOnboardingComplete}
                  theme={theme}
                  colors={colors}
                  setOnboardingStatus={setOnboardingStatus}
                  setOnboardingError={setOnboardingError}
                />
              </Box>
            </Fade>
          ) : manualCommand && !showLogs && onboardingStatus === 'success' ? (
            <SuccessView
              theme={theme}
              colors={colors}
              textColor={textColor}
              manualCommand={manualCommand}
              cardStyle={cardStyle}
              successAlertRef={successAlertRef}
              onCancel={onCancel}
              clearManualCommand={clearManualCommand}
              primaryButtonStyles={primaryButtonStyles}
              secondaryButtonStyles={secondaryButtonStyles}
              isMobile={isMobile}
              t={t}
            />
          ) : (
            <ClusterSelectionView
              theme={theme}
              colors={colors}
              textColor={textColor}
              formData={formData}
              handleChange={handleChange}
              availableClusters={availableClusters}
              availableClustersLoading={availableClustersLoading}
              availableClustersError={availableClustersError}
              fetchAvailableClusters={fetchAvailableClusters}
              cardStyle={cardStyle}
              handleOnboard={handleOnboard}
              manualLoading={manualLoading}
              onCancel={onCancel}
              primaryButtonStyles={primaryButtonStyles}
              secondaryButtonStyles={secondaryButtonStyles}
              isMobile={isMobile}
              t={t}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

// Success view component shown after successful onboarding
const SuccessView: React.FC<{
  theme: string;
  colors: Colors;
  textColor: string;
  manualCommand: CommandResponse;
  cardStyle: SxProps<Theme>;
  successAlertRef: RefObject<HTMLDivElement>;
  onCancel: () => void;
  clearManualCommand: () => void;
  primaryButtonStyles: SxProps<Theme>;
  secondaryButtonStyles: SxProps<Theme>;
  isMobile: boolean;
  t: (key: string, options?: TOptions) => string;
}> = ({
  theme,
  colors,
  textColor,
  manualCommand,
  cardStyle,
  successAlertRef,
  onCancel,
  clearManualCommand,
  primaryButtonStyles,
  secondaryButtonStyles,
  isMobile,
  t,
}) => {
  return (
    <Fade in={true} timeout={500} easing="cubic-bezier(0.4, 0, 0.2, 1)">
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box ref={successAlertRef}>
          <Zoom in={true} timeout={700} easing="cubic-bezier(0.4, 0, 0.2, 1)">
            <Alert
              severity="success"
              icon={
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor:
                      theme === 'dark' ? 'rgba(103, 192, 115, 0.2)' : 'rgba(103, 192, 115, 0.15)',
                    color: theme === 'dark' ? colors.success : '#3d9950',
                  }}
                >
                  <span role="img" aria-label="success" style={{ fontSize: '1.1rem' }}>
                    ✓
                  </span>
                </Box>
              }
              sx={{
                mb: 3,
                borderRadius: 2,
                py: 2,
                px: 2.5,
                boxShadow: '0 6px 20px rgba(103,192,115,0.15)',
                '& .MuiAlert-message': {
                  fontSize: '0.9rem',
                  width: '100%',
                },
                border: `1px solid ${theme === 'dark' ? 'rgba(103, 192, 115, 0.2)' : 'rgba(103, 192, 115, 0.15)'}`,
                backgroundColor:
                  theme === 'dark' ? 'rgba(39, 55, 41, 0.9)' : 'rgba(237, 247, 237, 0.9)',
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
                  {t('quickConnect.success.title')}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {t('quickConnect.success.message', { clusterName: manualCommand.clusterName })}
                </Typography>
              </Box>
            </Alert>
          </Zoom>
        </Box>

        <Paper
          elevation={0}
          sx={{
            ...cardStyle,
            backgroundColor:
              theme === 'dark' ? 'rgba(39, 55, 41, 0.7)' : 'rgba(237, 247, 237, 0.7)',
            borderColor:
              theme === 'dark' ? 'rgba(103, 192, 115, 0.2)' : 'rgba(103, 192, 115, 0.15)',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: -15,
              right: -15,
              width: 100,
              height: 100,
              background: `radial-gradient(circle, ${theme === 'dark' ? 'rgba(103, 192, 115, 0.1)' : 'rgba(103, 192, 115, 0.05)'} 0%, transparent 70%)`,
              borderRadius: '50%',
              zIndex: 0,
            }}
          />

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(135deg, ${theme === 'dark' ? 'rgba(103, 192, 115, 0.3)' : 'rgba(103, 192, 115, 0.2)'} 0%, ${theme === 'dark' ? 'rgba(103, 192, 115, 0.1)' : 'rgba(103, 192, 115, 0.1)'} 100%)`,
                color: theme === 'dark' ? colors.success : '#2e7d32',
                flexShrink: 0,
                fontSize: '1.5rem',
                boxShadow: `0 4px 12px ${theme === 'dark' ? 'rgba(103, 192, 115, 0.2)' : 'rgba(103, 192, 115, 0.15)'}`,
                border: `1px solid ${theme === 'dark' ? 'rgba(103, 192, 115, 0.3)' : 'rgba(103, 192, 115, 0.2)'}`,
              }}
            >
              <span role="img" aria-label="check" style={{ fontSize: '1.6rem' }}>
                ✓
              </span>
            </Box>
            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: theme === 'dark' ? colors.success : '#2e7d32',
                  fontSize: { xs: '1.1rem', sm: '1.25rem' },
                  mb: 0.5,
                }}
              >
                {t('quickConnect.success.clusterAdded')}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                  fontWeight: 500,
                }}
              >
                {t('quickConnect.success.clusterAvailable')}
              </Typography>
            </Box>
          </Box>

          <Divider
            sx={{
              my: 3,
              borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            }}
          />

          <Box sx={{ pl: { xs: 0, sm: 2 }, mt: 2 }}>
            <Typography
              variant="body1"
              sx={{
                fontSize: '0.95rem',
                color: textColor,
                mb: 2.5,
                fontWeight: 500,
              }}
            >
              {t('quickConnect.success.detailMessage', { clusterName: manualCommand.clusterName })}
            </Typography>

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2.5,
                my: 3,
                mx: { xs: 0, sm: 1 },
              }}
            >
              {[
                {
                  title: t('quickConnect.success.nextSteps.viewManage.title'),
                  description: t('quickConnect.success.nextSteps.viewManage.description'),
                  icon: '📊',
                  color: theme === 'dark' ? 'rgba(47, 134, 255, 0.9)' : 'rgba(47, 134, 255, 0.8)',
                },
                {
                  title: t('quickConnect.success.nextSteps.deployApps.title'),
                  description: t('quickConnect.success.nextSteps.deployApps.description'),
                  icon: '🚀',
                  color: theme === 'dark' ? 'rgba(255, 159, 67, 0.9)' : 'rgba(255, 159, 67, 0.8)',
                },
                {
                  title: t('quickConnect.success.nextSteps.configureSettings.title'),
                  description: t('quickConnect.success.nextSteps.configureSettings.description'),
                  icon: '⚙️',
                  color: theme === 'dark' ? 'rgba(156, 39, 176, 0.7)' : 'rgba(156, 39, 176, 0.6)',
                },
              ].map((item, index) => (
                <Paper
                  key={index}
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    backgroundColor:
                      theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.8)',
                    border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 4px 12px ${theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.07)'}`,
                      backgroundColor:
                        theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.9)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor:
                        theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.8)',
                      border: `1px solid ${item.color}40`,
                      color: item.color,
                      boxShadow: `0 2px 8px ${item.color}30`,
                      flexShrink: 0,
                    }}
                  >
                    <span role="img" aria-label={item.title}>
                      {item.icon}
                    </span>
                  </Box>
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        color: textColor,
                        mb: 0.5,
                      }}
                    >
                      {item.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: colors.textSecondary,
                        fontSize: '0.85rem',
                        lineHeight: 1.5,
                      }}
                    >
                      {item.description}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
              <Button
                variant="contained"
                component="a"
                href="/its"
                onClick={() => {
                  onCancel();
                }}
                sx={{
                  ...primaryButtonStyles,
                  bgcolor: theme === 'dark' ? 'rgba(103, 192, 115, 0.9)' : '#2e7d32',
                  color: '#ffffff',
                  fontWeight: 600,
                  border: `1px solid ${theme === 'dark' ? 'rgba(103, 192, 115, 0.9)' : '#2e7d32'}`,
                  width: '100%',
                  maxWidth: '320px',
                  borderRadius: '10px',
                  py: 1.5,
                  fontSize: '0.95rem',
                  letterSpacing: '0.3px',
                  '&:hover': {
                    bgcolor: theme === 'dark' ? 'rgba(103, 192, 115, 1)' : '#1b5e20',
                    transform: 'translateY(-2px)',
                    boxShadow:
                      theme === 'dark'
                        ? '0 8px 16px -2px rgba(103, 192, 115, 0.4)'
                        : '0 8px 16px -2px rgba(103, 192, 115, 0.5)',
                  },
                  '&:active': {
                    transform: 'translateY(-1px)',
                    boxShadow:
                      theme === 'dark'
                        ? '0 4px 8px -2px rgba(103, 192, 115, 0.4)'
                        : '0 4px 8px -2px rgba(103, 192, 115, 0.5)',
                  },
                }}
                startIcon={
                  <span role="img" aria-label="dashboard" style={{ fontSize: '1rem' }}>
                    🚀
                  </span>
                }
              >
                {t('quickConnect.buttons.openDashboard')}
              </Button>
            </Box>
          </Box>
        </Paper>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 2,
            mt: 'auto',
            pt: 3,
            flexWrap: isMobile ? 'wrap' : 'nowrap',
          }}
        >
          <Box
            display="flex"
            gap={2}
            sx={{ order: isMobile ? 2 : 1, width: isMobile ? '100%' : 'auto' }}
          >
            <Button
              variant="outlined"
              onClick={clearManualCommand}
              sx={{
                ...secondaryButtonStyles,
                bgcolor: theme === 'dark' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.03)',
                borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                color: theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
                flex: isMobile ? 1 : 'unset',
                '&:hover': {
                  bgcolor: theme === 'dark' ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.05)',
                  borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
                },
              }}
              startIcon={
                <span role="img" aria-label="back" style={{ fontSize: '0.9rem' }}>
                  ⬅️
                </span>
              }
            >
              {t('quickConnect.buttons.back')}
            </Button>
            <CancelButton
              onClick={onCancel}
              sx={{
                flex: isMobile ? 1 : 'unset',
              }}
            >
              {t('quickConnect.buttons.close')}
            </CancelButton>
          </Box>
          <Button
            variant="contained"
            onClick={() => {
              window.location.href = '/its';
              onCancel();
            }}
            sx={{
              ...primaryButtonStyles,
              order: isMobile ? 1 : 2,
              mb: isMobile ? 2 : 0,
              width: isMobile ? '100%' : 'auto',
            }}
            startIcon={
              <span role="img" aria-label="dashboard" style={{ fontSize: '0.9rem' }}>
                🏠
              </span>
            }
          >
            {t('quickConnect.buttons.goToDashboard')}
          </Button>
        </Box>
      </Box>
    </Fade>
  );
};

// Cluster selection view component for the initial selection stage
const ClusterSelectionView: React.FC<{
  theme: string;
  colors: Colors;
  textColor: string;
  formData: { clusterName: string; token: string; hubApiServer: string };
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  availableClusters: Array<{ name: string; cluster: string }>;
  availableClustersLoading: boolean;
  availableClustersError: string;
  fetchAvailableClusters: () => void;
  cardStyle: SxProps<Theme>;
  handleOnboard: () => void;
  manualLoading: boolean;
  onCancel: () => void;
  primaryButtonStyles: SxProps<Theme>;
  secondaryButtonStyles: SxProps<Theme>;
  isMobile: boolean;
  t: (key: string, options?: TOptions) => string;
}> = ({
  theme,
  colors,
  textColor,
  formData,
  handleChange,
  availableClusters,
  availableClustersLoading,
  availableClustersError,
  fetchAvailableClusters,
  cardStyle,
  handleOnboard,
  manualLoading,
  onCancel,
  primaryButtonStyles,
  // secondaryButtonStyles,
  isMobile,
  t,
}) => {
  return (
    <Fade in={true} timeout={500} easing="cubic-bezier(0.4, 0, 0.2, 1)">
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Feature card with explanation */}
        <Paper
          elevation={0}
          sx={{
            ...cardStyle,
            mb: 3,
            position: 'relative',
            overflow: 'hidden',
            background:
              theme === 'dark'
                ? 'linear-gradient(145deg, rgba(47, 134, 255, 0.08) 0%, rgba(47, 134, 255, 0.03) 100%)'
                : 'linear-gradient(145deg, rgba(47, 134, 255, 0.05) 0%, rgba(47, 134, 255, 0.02) 100%)',
            borderColor: theme === 'dark' ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)',
            willChange: 'transform, box-shadow',
            transformOrigin: 'center center',
          }}
        >
          {/* Background decorations */}
          <Box
            sx={{
              position: 'absolute',
              top: 40,
              right: -20,
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${theme === 'dark' ? 'rgba(47, 134, 255, 0.1)' : 'rgba(47, 134, 255, 0.05)'} 0%, transparent 70%)`,
              zIndex: 0,
            }}
          />

          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              alignItems: { xs: 'flex-start', sm: 'center' },
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 2, sm: 3 },
              pb: { xs: 1, sm: 0 },
            }}
          >
            <Box
              sx={{
                width: { xs: 48, sm: 56 },
                height: { xs: 48, sm: 56 },
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: theme === 'dark' ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)',
                color: theme === 'dark' ? colors.primaryLight : colors.primary,
                flexShrink: 0,
                boxShadow: `0 4px 12px ${theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(47, 134, 255, 0.15)'}`,
                border: `1px solid ${theme === 'dark' ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.15)'}`,
              }}
            >
              <span role="img" aria-label="automated" style={{ fontSize: '1.3rem' }}>
                ⚡
              </span>
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: textColor,
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  display: 'flex',
                  alignItems: 'center',
                  mb: 0.5,
                }}
              >
                {t('quickConnect.automatedOnboarding')}
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
                    display: { xs: 'none', sm: 'inline-block' },
                  }}
                >
                  {t('quickConnect.new')}
                </Box>
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: colors.textSecondary,
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  maxWidth: { xs: '100%', md: '90%' },
                }}
              >
                {t('quickConnect.automatedDescription')}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Cluster selection card */}
        <Paper
          elevation={0}
          sx={{
            ...cardStyle,
            mb: 3,
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              color: textColor,
              fontSize: '1rem',
              mb: 2,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Box
              component="span"
              sx={{
                color: theme === 'dark' ? colors.primaryLight : colors.primary,
                mr: 1.5,
                fontSize: '1.1rem',
              }}
            >
              🔍
            </Box>
            {t('quickConnect.selectCluster')}
          </Typography>

          {availableClustersLoading ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 3,
                minHeight: '100px',
                bgcolor: theme === 'dark' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.02)',
                borderRadius: 2,
                border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
              }}
            >
              <CircularProgress
                size={28}
                sx={{
                  color: colors.primary,
                  mr: 2,
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  color: colors.textSecondary,
                  fontSize: '0.9rem',
                }}
              >
                {t('quickConnect.searchingClusters')}
              </Typography>
            </Box>
          ) : availableClustersError ? (
            <Alert
              severity="error"
              icon={
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(211, 47, 47, 0.15)',
                  }}
                >
                  <span role="img" aria-label="error" style={{ fontSize: '0.9rem' }}>
                    ⚠️
                  </span>
                </Box>
              }
              sx={{
                borderRadius: 2,
                py: 1.5,
                px: 2,
                mb: 2,
                backgroundColor:
                  theme === 'dark' ? 'rgba(211, 47, 47, 0.08)' : 'rgba(211, 47, 47, 0.03)',
                border: `1px solid ${theme === 'dark' ? 'rgba(211, 47, 47, 0.15)' : 'rgba(211, 47, 47, 0.1)'}`,
                '& .MuiAlert-message': {
                  width: '100%',
                },
              }}
            >
              <Box sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {t('quickConnect.errorLoadingClusters')}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.85rem', opacity: 0.9 }}>
                  {availableClustersError}
                </Typography>
              </Box>
              <Button
                size="small"
                sx={{
                  mt: 1,
                  minWidth: 'auto',
                  fontSize: '0.8rem',
                  color: colors.primary,
                  borderRadius: 1,
                  py: 0.5,
                  px: 1.5,
                  bgcolor:
                    theme === 'dark' ? 'rgba(47, 134, 255, 0.1)' : 'rgba(47, 134, 255, 0.05)',
                  border: `1px solid ${theme === 'dark' ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)'}`,
                  '&:hover': {
                    backgroundColor:
                      theme === 'dark' ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)',
                  },
                }}
                onClick={fetchAvailableClusters}
                startIcon={
                  <span role="img" aria-label="retry" style={{ fontSize: '0.8rem' }}>
                    🔄
                  </span>
                }
              >
                {t('quickConnect.retry')}
              </Button>
            </Alert>
          ) : (
            <Box>
              <Box
                sx={{
                  border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'}`,
                  borderRadius: 2,
                  backgroundColor:
                    theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.8)',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  mb: 2,
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
                  onChange={handleChange}
                  name="clusterName"
                  sx={{
                    width: '100%',
                    height: '56px',
                    padding: '0 16px',
                    paddingLeft: '48px',
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
                    {t('quickConnect.chooseCluster')}
                  </option>
                  {availableClusters.length === 0 ? (
                    <option value="" disabled>
                      {t('quickConnect.noClusters')}
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
                      width: 24,
                      height: 24,
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor:
                        theme === 'dark' ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)',
                      color: theme === 'dark' ? colors.primaryLight : colors.primary,
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
                        d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
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
                  alignItems: 'flex-start',
                  gap: 1.5,
                  p: 2,
                  borderRadius: 2,
                  backgroundColor:
                    theme === 'dark' ? 'rgba(255, 215, 0, 0.05)' : 'rgba(255, 215, 0, 0.08)',
                  border: `1px solid ${theme === 'dark' ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 215, 0, 0.15)'}`,
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
                      theme === 'dark' ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 215, 0, 0.15)',
                    color: theme === 'dark' ? 'rgba(255, 215, 0, 0.8)' : '#7d6608',
                    flexShrink: 0,
                    fontSize: '0.9rem',
                  }}
                >
                  <span role="img" aria-label="tip">
                    💡
                  </span>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.85rem',
                      color: theme === 'dark' ? 'rgba(255, 215, 0, 0.8)' : '#7d6608',
                      flex: 1,
                      mb: 0.5,
                      fontWeight: 500,
                    }}
                  >
                    {t('quickConnect.discoveredClusters.title')}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.8rem',
                      color: theme === 'dark' ? 'rgba(255, 215, 0, 0.7)' : 'rgba(125, 102, 8, 0.9)',
                    }}
                  >
                    {t('quickConnect.discoveredClusters.description')}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  onClick={fetchAvailableClusters}
                  sx={{
                    minWidth: '36px',
                    height: '36px',
                    width: '36px',
                    p: 0,
                    ml: 'auto',
                    borderRadius: '50%',
                    color: theme === 'dark' ? colors.primaryLight : colors.primary,
                    '&:hover': {
                      backgroundColor:
                        theme === 'dark' ? 'rgba(47, 134, 255, 0.08)' : 'rgba(47, 134, 255, 0.05)',
                    },
                  }}
                  aria-label={t('quickConnect.refreshClustersList')}
                  title={t('quickConnect.refreshClustersList')}
                >
                  <svg
                    width="18"
                    height="18"
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
            </Box>
          )}
        </Paper>

        {/* Instructions card */}
        <Paper
          elevation={0}
          sx={{
            ...cardStyle,
            mb: 3,
            background:
              theme === 'dark'
                ? 'linear-gradient(145deg, rgba(47, 134, 255, 0.05) 0%, rgba(47, 134, 255, 0.02) 100%)'
                : 'linear-gradient(145deg, rgba(47, 134, 255, 0.03) 0%, rgba(47, 134, 255, 0.01) 100%)',
            borderColor: theme === 'dark' ? 'rgba(47, 134, 255, 0.1)' : 'rgba(47, 134, 255, 0.08)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              mb: 2.5,
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: theme === 'dark' ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)',
                color: theme === 'dark' ? colors.primaryLight : colors.primary,
                flexShrink: 0,
              }}
            >
              <span role="img" aria-label="info" style={{ fontSize: '0.95rem' }}>
                ℹ️
              </span>
            </Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                fontSize: '1rem',
                color: textColor,
                pt: 0.5,
              }}
            >
              {t('quickConnect.howToConnect')}
            </Typography>
          </Box>

          <Box sx={{ pl: { xs: 1, sm: 6 }, pr: 1 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2.5,
              }}
            >
              {[
                {
                  step: 1,
                  title: t('quickConnect.steps.step1.title'),
                  description: t('quickConnect.steps.step1.description'),
                  icon: '🔍',
                  color: theme === 'dark' ? 'rgba(47, 134, 255, 0.8)' : 'rgba(47, 134, 255, 0.7)',
                },
                {
                  step: 2,
                  title: t('quickConnect.steps.step2.title'),
                  description: t('quickConnect.steps.step2.description'),
                  icon: '⚡',
                  color: theme === 'dark' ? 'rgba(255, 159, 67, 0.8)' : 'rgba(255, 159, 67, 0.7)',
                },
                {
                  step: 3,
                  title: t('quickConnect.steps.step3.title'),
                  description: t('quickConnect.steps.step3.description'),
                  icon: '✅',
                  color: theme === 'dark' ? 'rgba(103, 192, 115, 0.8)' : 'rgba(103, 192, 115, 0.7)',
                },
              ].map((step, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 2,
                    p: 2,
                    borderRadius: 2,
                    backgroundColor:
                      theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.6)',
                    border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    willChange: 'transform, box-shadow, background-color',
                    transformOrigin: 'center center',
                    transform: 'translateZ(0)',
                    '&:hover': {
                      backgroundColor:
                        theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
                      transform: 'translateY(-2px) translateZ(0)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `linear-gradient(135deg, ${step.color}30 0%, ${step.color}15 100%)`,
                      color: step.color,
                      border: `1px solid ${step.color}30`,
                      boxShadow: `0 2px 8px ${step.color}20`,
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {step.icon}
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Box
                        sx={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor:
                            theme === 'dark'
                              ? 'rgba(47, 134, 255, 0.1)'
                              : 'rgba(47, 134, 255, 0.05)',
                          color: theme === 'dark' ? colors.primaryLight : colors.primary,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          mr: 1.5,
                        }}
                      >
                        {step.step}
                      </Box>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          color: textColor,
                        }}
                      >
                        {step.title}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: '0.825rem',
                        color: colors.textSecondary,
                        pl: { xs: 0, sm: 4.5 },
                      }}
                    >
                      {step.description}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Paper>

        {/* Interactive feature comparison (optional) */}
        <Paper
          elevation={0}
          sx={{
            ...cardStyle,
            mb: 3,
            display: { xs: 'none', md: 'block' }, // Hide on mobile
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              fontSize: '1rem',
              color: textColor,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <span role="img" aria-label="compare" style={{ fontSize: '0.9rem' }}>
              ⚡
            </span>
            {t('quickConnect.whyUseAutomated')}
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2.5,
              mt: 2,
            }}
          >
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor:
                  theme === 'dark' ? 'rgba(103, 192, 115, 0.08)' : 'rgba(103, 192, 115, 0.05)',
                border: `1px solid ${theme === 'dark' ? 'rgba(103, 192, 115, 0.15)' : 'rgba(103, 192, 115, 0.1)'}`,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  color: theme === 'dark' ? '#97e6a5' : '#3d9950',
                  mb: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <span role="img" aria-label="new">
                  ✨
                </span>{' '}
                {t('quickConnect.approaches.automated.title')}
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                {(
                  t('quickConnect.approaches.automated.features', {
                    returnObjects: true,
                  }) as unknown as string[]
                ).map((feature, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
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
                          theme === 'dark'
                            ? 'rgba(103, 192, 115, 0.2)'
                            : 'rgba(103, 192, 115, 0.15)',
                        color: theme === 'dark' ? colors.success : '#3d9950',
                        flexShrink: 0,
                        fontSize: '0.7rem',
                      }}
                    >
                      <span role="img" aria-label="check">
                        ✓
                      </span>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: '0.825rem',
                        color: colors.textSecondary,
                      }}
                    >
                      {feature}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor:
                  theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  color: colors.textSecondary,
                  mb: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <span role="img" aria-label="old">
                  🔧
                </span>{' '}
                {t('quickConnect.approaches.manual.title')}
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                {(
                  t('quickConnect.approaches.manual.features', {
                    returnObjects: true,
                  }) as unknown as string[]
                ).map((feature, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
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
                          theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                        color: colors.textSecondary,
                        flexShrink: 0,
                        fontSize: '0.7rem',
                      }}
                    >
                      <span role="img" aria-label="dash">
                        −
                      </span>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: '0.825rem',
                        color: colors.textSecondary,
                      }}
                    >
                      {feature}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Action buttons */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 2,
            mt: 'auto',
            pt: 2.5,
            borderTop: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
            flexWrap: isMobile ? 'wrap' : 'nowrap',
          }}
        >
          <CancelButton
            onClick={onCancel}
            sx={{
              order: isMobile ? 2 : 1,
              width: isMobile ? '100%' : 'auto',
              mt: isMobile ? 1.5 : 0,
              '&:focus-visible': {
                outline: `2px solid ${colors.primary}`,
                outlineOffset: 2,
              },
            }}
          />
          <Button
            variant="contained"
            onClick={handleOnboard}
            disabled={!formData.clusterName.trim() || manualLoading || availableClustersLoading}
            sx={{
              ...primaryButtonStyles,
              order: isMobile ? 1 : 2,
              width: isMobile ? '100%' : 'auto',
              background:
                theme === 'dark'
                  ? `linear-gradient(45deg, ${colors.primary} 0%, ${colors.primary}CC 100%)`
                  : colors.primary,
              boxShadow: `0 4px 14px ${colors.primary}40`,
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: 'translateZ(0)',
              '&:hover': {
                background:
                  theme === 'dark'
                    ? `linear-gradient(45deg, ${colors.primary} 30%, ${colors.primary}EE 100%)`
                    : colors.primaryDark,
                boxShadow: `0 6px 20px ${colors.primary}50`,
                transform: 'translateY(-1px) translateZ(0)',
              },
              '&:focus-visible': {
                outline: `2px solid ${colors.primary}`,
                outlineOffset: 2,
              },
              '&:disabled': {
                background: theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
                color: theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                boxShadow: 'none',
              },
              position: 'relative',
            }}
            startIcon={
              manualLoading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <span role="img" aria-label="onboard" style={{ fontSize: '0.9rem' }}>
                  ⚡
                </span>
              )
            }
            aria-label={
              manualLoading
                ? t('quickConnect.buttons.onboarding')
                : t('quickConnect.buttons.onboard')
            }
          >
            {manualLoading
              ? t('quickConnect.buttons.onboarding')
              : t('quickConnect.buttons.onboard')}
          </Button>
        </Box>
      </Box>
    </Fade>
  );
};

export default QuickConnectTab;

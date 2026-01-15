import { Box, CircularProgress, LinearProgress, Paper, Typography } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface LogMessage {
  clusterName: string;
  status: string;
  message: string;
  timestamp: string;
}

interface ColorScheme {
  textSecondary: string;
  primary: string;
  primaryLight: string;
  white: string;
  text: string;
  success: string;
}

interface OnboardingLogsDisplayProps {
  clusterName: string;
  onComplete: (status: 'success' | 'failed') => void;
  theme: string;
  colors: ColorScheme;
  setOnboardingStatus: (status: 'idle' | 'processing' | 'success' | 'failed') => void;
  setOnboardingError: (error: string | null) => void;
}

// Helper function to get the left border color based on log status
const getLogBorderColor = (status: string, theme: string): string => {
  switch (status) {
    case 'Processing':
      return theme === 'dark' ? '#ffb347' : '#f59e0b'; // Amber/orange
    case 'Verifying':
      return theme === 'dark' ? '#61dafb' : '#0ea5e9'; // Blue
    case 'Available':
    case 'Completed':
      return theme === 'dark' ? '#4ade80' : '#22c55e'; // Green
    case 'Error':
    case 'Failed':
      return theme === 'dark' ? '#f87171' : '#dc2626'; // Red
    default:
      return theme === 'dark' ? '#6b7280' : '#9ca3af'; // Gray
  }
};

// Helper function to get the background color for log entries based on status
const getLogBackgroundColor = (status: string, theme: string): string => {
  switch (status) {
    case 'Error':
    case 'Failed':
      return theme === 'dark' ? 'rgba(248, 113, 113, 0.1)' : 'rgba(220, 38, 38, 0.08)';
    case 'Completed':
      return theme === 'dark' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(34, 197, 94, 0.08)';
    default:
      return 'transparent';
  }
};

// Helper function to get current step text based on status
const getCurrentStepText = (status: string, t: (key: string) => string): string => {
  switch (status) {
    case 'Processing':
      return t('onboardingLogs.steps.processing');
    case 'Verifying':
      return t('onboardingLogs.steps.verifying');
    case 'Available':
      return t('onboardingLogs.steps.available');
    case 'Completed':
      return t('onboardingLogs.steps.completed');
    case 'Error':
    case 'Failed':
      return t('onboardingLogs.steps.error');
    default:
      return t('onboardingLogs.steps.initializing');
  }
};

const OnboardingLogsDisplay: React.FC<OnboardingLogsDisplayProps> = ({
  clusterName,
  onComplete,
  theme,
  colors,
  setOnboardingStatus,
  setOnboardingError,
}) => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const isUnmountedRef = useRef(false);

  // Auto-scroll to bottom of logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Connect to WebSocket
  useEffect(() => {
    isUnmountedRef.current = false;
    const connectWebSocket = () => {
      if (isUnmountedRef.current) return null;
      try {
        const encodedClusterName = encodeURIComponent(clusterName);
        const baseUrl = process.env.VITE_BASE_URL || 'http://localhost:4000';
        const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
        const host = baseUrl.replace(/^https?:\/\//, '');
        const ws = new WebSocket(
          `${wsProtocol}://${host}/ws/onboarding?cluster=${encodedClusterName}`
        );
        wsRef.current = ws;

        ws.onopen = () => {
          if (isUnmountedRef.current) return;
          console.log('WebSocket connection established');
          setConnected(true);
          setError(null);
        };

        ws.onmessage = event => {
          if (isUnmountedRef.current) return;
          try {
            const data = JSON.parse(event.data) as LogMessage;
            setLogs(prevLogs => [...prevLogs, data]);

            // Check for completion status
            if (data.status === 'Completed') {
              setOnboardingStatus('success');
              setOnboardingError(null);
              setTimeout(() => {
                onComplete('success');
              }, 1000);
            } else if (data.status === 'Error' || data.status === 'Failed') {
              setOnboardingStatus('failed');
              setOnboardingError(data.message || 'Onboarding failed');
              setTimeout(() => {
                onComplete('failed');
              }, 1000);
            }
          } catch (err) {
            if (isUnmountedRef.current) return;
            console.error('Error parsing WebSocket message:', err);
            setOnboardingStatus('failed');
            setOnboardingError('Failed to parse response');
            onComplete('failed');
          }
        };

        ws.onclose = () => {
          if (isUnmountedRef.current) return;
          console.log('WebSocket connection closed');
          setConnected(false);
        };

        ws.onerror = error => {
          if (isUnmountedRef.current) return;
          console.error('WebSocket error:', error);
          setError(t('onboardingLogs.errors.websocketFailed'));
          setConnected(false);
        };

        return ws;
      } catch (error) {
        if (isUnmountedRef.current) return null;
        console.error('Error creating WebSocket:', error);
        setError(t('onboardingLogs.errors.connectionFailed'));
        return null;
      }
    };

    const ws = connectWebSocket();

    return () => {
      isUnmountedRef.current = true;
      if (ws) {
        ws.close();
      }
    };
  }, [clusterName, onComplete, t]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Processing':
        return theme === 'dark' ? '#ffb347' : '#f59e0b';
      case 'Verifying':
        return theme === 'dark' ? '#61dafb' : '#0ea5e9';
      case 'Available':
        return theme === 'dark' ? '#4ade80' : '#22c55e';
      case 'Completed':
        return theme === 'dark' ? '#4ade80' : '#22c55e';
      case 'Error':
      case 'Failed':
        return theme === 'dark' ? '#f87171' : '#dc2626';
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Processing':
        return '⚙️';
      case 'Verifying':
        return '🔍';
      case 'Available':
        return '✅';
      case 'Completed':
        return '🎉';
      case 'Error':
      case 'Failed':
        return '❌';
      default:
        return '•';
    }
  };

  // Format timestamp to readable time
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  // Calculate progress percentage based on status
  const getProgress = () => {
    if (logs.length === 0) return 5;
    const lastStatus = logs[logs.length - 1].status;
    switch (lastStatus) {
      case 'Processing':
        return 25;
      case 'Verifying':
        return 50;
      case 'Available':
        return 75;
      case 'Completed':
        return 100;
      case 'Error':
      case 'Failed':
        return getProgress(); // Keep previous progress on error
      default:
        return 5;
    }
  };

  // Get current status for display
  const currentStatus = logs.length > 0 ? logs[logs.length - 1].status : null;
  const isCompleted = currentStatus === 'Completed';
  const isError = currentStatus === 'Error' || currentStatus === 'Failed';
  const isProcessing = connected && !isCompleted && !isError;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Sticky Status Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          pt: 2,
          pb: 2,
          backgroundColor:
            theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(248, 250, 252, 0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
          boxShadow:
            theme === 'dark' ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.08)',
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          mx: -2.5,
          px: 2.5,
        }}
      >
        {/* Header Row */}
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, alignItems: 'center' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: isCompleted
                  ? theme === 'dark'
                    ? 'rgba(74, 222, 128, 0.15)'
                    : 'rgba(34, 197, 94, 0.1)'
                  : isError
                    ? theme === 'dark'
                      ? 'rgba(248, 113, 113, 0.15)'
                      : 'rgba(220, 38, 38, 0.1)'
                    : theme === 'dark'
                      ? 'rgba(47, 134, 255, 0.15)'
                      : 'rgba(47, 134, 255, 0.1)',
                color: isCompleted
                  ? theme === 'dark'
                    ? '#4ade80'
                    : '#22c55e'
                  : isError
                    ? theme === 'dark'
                      ? '#f87171'
                      : '#dc2626'
                    : theme === 'dark'
                      ? colors.primaryLight
                      : colors.primary,
                fontSize: '1.1rem',
              }}
            >
              {isCompleted ? (
                <span role="img" aria-label="completed">
                  ✓
                </span>
              ) : isError ? (
                <span role="img" aria-label="error">
                  ✕
                </span>
              ) : (
                <span role="img" aria-label="loading">
                  ⚡
                </span>
              )}
            </Box>
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  color: theme === 'dark' ? colors.white : colors.text,
                  fontWeight: 600,
                  fontSize: '0.95rem',
                }}
              >
                {t('onboardingLogs.onboarding')}: {clusterName}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: colors.textSecondary,
                  fontSize: '0.75rem',
                }}
              >
                {logs.length} {logs.length === 1 ? 'log entry' : 'log entries'}
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor:
                theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
              borderRadius: '16px',
              px: 2,
              py: 0.75,
              border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: '0.8rem',
                color: isCompleted
                  ? theme === 'dark'
                    ? '#4ade80'
                    : '#22c55e'
                  : isError
                    ? theme === 'dark'
                      ? '#f87171'
                      : '#dc2626'
                    : colors.textSecondary,
              }}
            >
              {getProgress()}% {t('onboardingLogs.complete')}
            </Typography>
          </Box>
        </Box>

        {/* Progress Bar */}
        <LinearProgress
          variant="determinate"
          value={getProgress()}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: isCompleted
                ? theme === 'dark'
                  ? '#4ade80'
                  : '#22c55e'
                : isError
                  ? theme === 'dark'
                    ? '#f87171'
                    : '#dc2626'
                  : colors.primary,
              borderRadius: 4,
              transition: 'transform 0.4s ease',
            },
          }}
        />

        {/* Current Step Indicator - Always visible sticky line */}
        <Box
          sx={{
            mt: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            minHeight: 32,
          }}
        >
          {isProcessing && (
            <CircularProgress
              size={14}
              thickness={5}
              sx={{
                color: currentStatus ? getStatusColor(currentStatus) : colors.primary,
              }}
            />
          )}
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              color: currentStatus ? getStatusColor(currentStatus) : colors.textSecondary,
              backgroundColor:
                theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
              borderRadius: '16px',
              px: 1.5,
              py: 0.5,
              border: `1px solid ${
                currentStatus
                  ? `${getStatusColor(currentStatus)}33`
                  : theme === 'dark'
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.08)'
              }`,
            }}
          >
            {currentStatus && (
              <span
                role="img"
                aria-label={currentStatus.toLowerCase()}
                style={{ fontSize: '0.85rem' }}
              >
                {getStatusIcon(currentStatus)}
              </span>
            )}
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                fontSize: '0.78rem',
                color: currentStatus ? getStatusColor(currentStatus) : colors.textSecondary,
              }}
            >
              {currentStatus
                ? getCurrentStepText(currentStatus, t)
                : t('onboardingLogs.connecting')}
            </Typography>
          </Box>
          {logs.length > 0 && (
            <Typography
              variant="caption"
              sx={{
                color: colors.textSecondary,
                fontSize: '0.7rem',
                flex: 1,
                textAlign: 'center',
                fontStyle: 'italic',
                maxWidth: '50%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {logs[logs.length - 1].message}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Terminal Log Container */}
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          backgroundColor: theme === 'dark' ? '#0d1117' : '#1e1e1e',
          borderRadius: '0 0 12px 12px',
          p: 0,
          mt: 0,
          overflowY: 'auto',
          fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
          fontSize: '0.8rem',
          lineHeight: 1.7,
          color: theme === 'dark' ? '#e6edf3' : '#d4d4d4',
          border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)'}`,
          borderTop: 'none',
          boxShadow:
            theme === 'dark'
              ? 'inset 0 2px 8px rgba(0, 0, 0, 0.3)'
              : 'inset 0 2px 8px rgba(0, 0, 0, 0.2)',
          minHeight: '200px',
          maxHeight: '350px',
          // Custom scrollbar styling
          '&::-webkit-scrollbar': {
            width: '10px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: theme === 'dark' ? '#161b22' : '#2d2d2d',
            borderRadius: '0 0 12px 0',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme === 'dark' ? '#30363d' : '#4a4a4a',
            borderRadius: '5px',
            border: `2px solid ${theme === 'dark' ? '#161b22' : '#2d2d2d'}`,
            '&:hover': {
              backgroundColor: theme === 'dark' ? '#484f58' : '#5a5a5a',
            },
          },
        }}
      >
        {/* Terminal Header Bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)'}`,
            backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: '#ff5f56',
              }}
            />
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: '#ffbd2e',
              }}
            />
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: '#27ca40',
              }}
            />
          </Box>
          <Typography
            variant="caption"
            sx={{
              color: theme === 'dark' ? '#8b949e' : '#808080',
              fontSize: '0.7rem',
              ml: 1,
              fontFamily: 'inherit',
            }}
          >
            onboarding-logs — {clusterName}
          </Typography>
        </Box>

        {/* Log Content Area */}
        <Box sx={{ p: 2 }}>
          {/* Connecting State */}
          {!connected && !logs.length && !error && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                color: '#61dafb',
                py: 1,
              }}
            >
              <CircularProgress size={16} thickness={4} sx={{ color: 'inherit' }} />
              <Typography sx={{ fontFamily: 'inherit', fontSize: 'inherit' }}>
                {t('onboardingLogs.connecting')}
              </Typography>
            </Box>
          )}

          {/* Error State */}
          {error && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                py: 1.5,
                px: 1.5,
                borderLeft: '3px solid #f87171',
                backgroundColor: 'rgba(248, 113, 113, 0.1)',
                borderRadius: '0 6px 6px 0',
              }}
            >
              <span role="img" aria-label="error">
                ⚠️
              </span>
              <Typography sx={{ fontFamily: 'inherit', fontSize: 'inherit', color: '#f87171' }}>
                {error}
              </Typography>
            </Box>
          )}

          {/* Log Entries */}
          {logs.map((log, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                py: 1,
                px: 1.5,
                mb: 0.5,
                borderLeft: `3px solid ${getLogBorderColor(log.status, theme)}`,
                backgroundColor: getLogBackgroundColor(log.status, theme),
                borderRadius: '0 6px 6px 0',
                opacity: logs.length > 5 && index < logs.length - 5 ? 0.6 : 1,
                transition: 'all 0.2s ease',
                animation: index === logs.length - 1 ? 'slideIn 0.3s ease-out' : 'none',
                '@keyframes slideIn': {
                  from: {
                    opacity: 0,
                    transform: 'translateX(-10px)',
                  },
                  to: {
                    opacity: 1,
                    transform: 'translateX(0)',
                  },
                },
                '&:hover': {
                  backgroundColor:
                    theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                },
              }}
            >
              {/* Timestamp */}
              <Typography
                component="span"
                sx={{
                  color: theme === 'dark' ? '#6e7681' : '#6a737d',
                  minWidth: '75px',
                  fontSize: '0.75rem',
                  fontFamily: 'inherit',
                  flexShrink: 0,
                }}
              >
                {formatTime(log.timestamp)}
              </Typography>

              {/* Status Badge */}
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  minWidth: '110px',
                  flexShrink: 0,
                }}
              >
                <span
                  role="img"
                  aria-label={log.status.toLowerCase()}
                  style={{ fontSize: '0.85rem' }}
                >
                  {getStatusIcon(log.status)}
                </span>
                <Typography
                  component="span"
                  sx={{
                    color: getStatusColor(log.status),
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    fontFamily: 'inherit',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                  }}
                >
                  {log.status}
                </Typography>
              </Box>

              {/* Message */}
              <Typography
                component="span"
                sx={{
                  flex: 1,
                  wordBreak: 'break-word',
                  color:
                    log.status === 'Error' || log.status === 'Failed'
                      ? theme === 'dark'
                        ? '#fca5a5'
                        : '#fca5a5'
                      : theme === 'dark'
                        ? '#e6edf3'
                        : '#d4d4d4',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                }}
              >
                {log.message}
              </Typography>
            </Box>
          ))}

          {/* Auto-scroll anchor */}
          <div ref={logsEndRef} />

          {/* Blinking cursor when processing */}
          {connected && logs.length > 0 && !isCompleted && !isError && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                mt: 1,
                pl: 1.5,
                color: '#61dafb',
                '&::after': {
                  content: '"▋"',
                  animation: 'blink 1s step-end infinite',
                },
                '@keyframes blink': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0 },
                  '100%': { opacity: 1 },
                },
              }}
            />
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default OnboardingLogsDisplay;

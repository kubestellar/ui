import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, LinearProgress, Paper } from '@mui/material';

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
  onComplete: () => void;
  theme: string;
  colors: ColorScheme;
}

const OnboardingLogsDisplay: React.FC<OnboardingLogsDisplayProps> = ({
  clusterName,
  onComplete,
  theme,
  colors,
}) => {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Auto-scroll to bottom of logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Connect to WebSocket
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const encodedClusterName = encodeURIComponent(clusterName);
        const ws = new WebSocket(`ws://localhost:4000/ws/onboarding?cluster=${encodedClusterName}`);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connection established');
          setConnected(true);
          setError(null);
        };

        ws.onmessage = event => {
          try {
            const data = JSON.parse(event.data) as LogMessage;
            setLogs(prevLogs => [...prevLogs, data]);

            // If status is Completed, trigger the onComplete callback
            if (data.status === 'Completed') {
              setTimeout(() => {
                onComplete();
              }, 1000);
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        ws.onclose = () => {
          console.log('WebSocket connection closed');
          setConnected(false);
        };

        ws.onerror = error => {
          console.error('WebSocket error:', error);
          setError('WebSocket connection failed. Please try again.');
          setConnected(false);
        };

        return ws;
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        setError('Failed to connect to log stream. Please try again.');
        return null;
      }
    };

    const ws = connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [clusterName, onComplete]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Processing':
        return theme === 'dark' ? '#ffb347' : '#ff9d00';
      case 'Verifying':
        return theme === 'dark' ? '#61dafb' : '#0090e0';
      case 'Available':
        return theme === 'dark' ? '#67c073' : '#00a845';
      case 'Completed':
        return theme === 'dark' ? '#67c073' : '#00a845';
      case 'Error':
        return theme === 'dark' ? '#ff6b6b' : '#e53935';
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
    } catch (error) {
      return '';
      console.error('Error formatting timestamp:', error);
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
      default:
        return 5;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          pt: 2,
          pb: 2,
          backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.8)',
          borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
          boxShadow:
            theme === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.05)',
          borderTopLeftRadius: theme === 'dark' ? 8 : 10,
          borderTopRightRadius: theme === 'dark' ? 8 : 10,
          mx: -2.5,
          px: 2.5,
        }}
      >
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, alignItems: 'center' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: theme === 'dark' ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)',
                color: theme === 'dark' ? colors.primaryLight : colors.primary,
              }}
            >
              {logs.length > 0 && logs[logs.length - 1].status === 'Completed' ? (
                <span role="img" aria-label="completed">
                  ✓
                </span>
              ) : (
                <span role="img" aria-label="loading">
                  ⚡
                </span>
              )}
            </Box>
            <Typography
              variant="subtitle2"
              color={theme === 'dark' ? colors.white : colors.text}
              sx={{ fontWeight: 600 }}
            >
              Onboarding: {clusterName}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.5)',
              borderRadius: '12px',
              px: 1.5,
              py: 0.5,
              border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
            }}
          >
            <Typography
              variant="caption"
              color={
                logs.length > 0 && logs[logs.length - 1].status === 'Completed'
                  ? theme === 'dark'
                    ? colors.success
                    : '#00a845'
                  : colors.textSecondary
              }
              sx={{ fontWeight: 600 }}
            >
              {getProgress()}% Complete
            </Typography>
          </Box>
        </Box>
        <LinearProgress
          variant="determinate"
          value={getProgress()}
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            '& .MuiLinearProgress-bar': {
              backgroundColor:
                logs.length > 0 && logs[logs.length - 1].status === 'Completed'
                  ? colors.success
                  : colors.primary,
              borderRadius: 3,
            },
          }}
        />
        {logs.length > 0 && (
          <Box
            sx={{
              mt: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                color: getStatusColor(logs[logs.length - 1].status),
                backgroundColor:
                  theme === 'dark' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.7)',
                borderRadius: '12px',
                px: 1,
                py: 0.25,
                border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
              }}
            >
              <span role="img" aria-label={logs[logs.length - 1].status.toLowerCase()}>
                {getStatusIcon(logs[logs.length - 1].status)}
              </span>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: getStatusColor(logs[logs.length - 1].status),
                }}
              >
                {logs[logs.length - 1].status}
              </Typography>
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: colors.textSecondary,
                fontSize: '0.7rem',
                flex: 1,
                textAlign: 'center',
                fontStyle: 'italic',
              }}
            >
              {logs[logs.length - 1].message}
            </Typography>
          </Box>
        )}
      </Box>

      <Paper
        elevation={0}
        sx={{
          flex: 1,
          backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.9)',
          borderRadius: 2,
          p: 2,
          mt: 2,
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          color: '#eee',
          border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.2)'}`,
          boxShadow:
            theme === 'dark' ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        {!connected && !logs.length && !error && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: '#61dafb',
              animation: 'pulse 1.5s infinite',
              '@keyframes pulse': {
                '0%': { opacity: 0.6 },
                '50%': { opacity: 1 },
                '100%': { opacity: 0.6 },
              },
            }}
          >
            <span role="img" aria-label="connecting">
              ⏳
            </span>{' '}
            Connecting to log stream...
          </Box>
        )}

        {error && (
          <Box sx={{ color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: 1 }}>
            <span role="img" aria-label="error">
              ⚠️
            </span>{' '}
            {error}
          </Box>
        )}

        {logs.map((log, index) => (
          <Box
            key={index}
            sx={{
              mb: 1.5,
              display: 'flex',
              opacity: logs.length > 5 && index < logs.length - 5 ? 0.7 : 1,
              animation: index === logs.length - 1 ? 'fadeIn 0.3s ease-out' : 'none',
              '@keyframes fadeIn': {
                from: { opacity: 0, transform: 'translateY(5px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <Box
              sx={{
                color: '#888',
                mr: 1.5,
                minWidth: '80px',
                fontSize: '0.75rem',
              }}
            >
              {formatTime(log.timestamp)}
            </Box>
            <Box
              sx={{
                color: getStatusColor(log.status),
                fontWeight: 600,
                minWidth: '120px',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <span role="img" aria-label={log.status.toLowerCase()}>
                {getStatusIcon(log.status)}
              </span>
              {log.status}
            </Box>
            <Box
              sx={{
                flex: 1,
                wordBreak: 'break-word',
              }}
            >
              {log.message}
            </Box>
          </Box>
        ))}

        {/* Auto-scroll anchor */}
        <div ref={logsEndRef} />

        {connected && logs.length > 0 && logs[logs.length - 1].status !== 'Completed' && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              mt: 1,
              color: '#61dafb',
              '&::after': {
                content: '"|"',
                ml: 0.5,
                animation: 'blink 1.2s step-end infinite',
              },
              '@keyframes blink': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0 },
                '100%': { opacity: 1 },
              },
            }}
          >
            $
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default OnboardingLogsDisplay;

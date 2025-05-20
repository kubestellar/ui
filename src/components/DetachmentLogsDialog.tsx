import React, { useEffect, useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  Paper,
  CircularProgress,
  Chip,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Zoom } from '@mui/material';
import { Link2Off, Terminal } from 'lucide-react';

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

interface DetachmentLog {
  type: 'LOG' | 'STATUS';
  clusterName: string;
  status: string;
  message: string;
  timestamp: string;
}

interface DetachmentLogsDialogProps {
  open: boolean;
  onClose: () => void;
  clusterName: string;
  isDark: boolean;
  colors: ColorTheme;
}

const DetachmentLogsDialog: React.FC<DetachmentLogsDialogProps> = ({
  open,
  onClose,
  clusterName,
  isDark,
  colors,
}) => {
  const [logs, setLogs] = useState<DetachmentLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (error) {
      return dateString;
      console.error('Error formatting date:', error);
    }
  };

  // Auto-scroll to the bottom when new logs arrive
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Connect to WebSocket when dialog opens
  useEffect(() => {
    if (open && clusterName) {
      // Close any existing connection
      if (websocketRef.current) {
        websocketRef.current.close();
      }

      setLogs([]);
      setIsCompleted(false);
      setError(null);

      // Create a new WebSocket connection
      const websocketUrl = `ws://localhost:4000/ws/detachment?cluster=${encodeURIComponent(clusterName)}`;
      const ws = new WebSocket(websocketUrl);

      ws.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connection established for detachment logs');
      };

      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data) as DetachmentLog;
          setLogs(prev => [...prev, data]);

          // Check if this is a completion message
          if (data.type === 'STATUS' && data.status === 'Detached') {
            setIsCompleted(true);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = event => {
        console.error('WebSocket error:', event);
        setError('Connection error. Please try again.');
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket connection closed for detachment logs');
      };

      websocketRef.current = ws;

      // Clean up on unmount
      return () => {
        if (websocketRef.current) {
          websocketRef.current.close();
        }
      };
    }
  }, [open, clusterName]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
      case 'detached':
        return colors.success;
      case 'error':
      case 'failed':
        return colors.error;
      case 'removed':
      case 'removing':
        return colors.warning;
      default:
        return colors.primary;
    }
  };

  const getLogIcon = (log: DetachmentLog) => {
    const status = log.status.toLowerCase();

    if (status === 'success' || status === 'detached') {
      return <CheckCircleIcon fontSize="small" style={{ color: colors.success }} />;
    } else if (status === 'error' || status === 'failed') {
      return <ErrorIcon fontSize="small" style={{ color: colors.error }} />;
    } else {
      return <InfoIcon fontSize="small" style={{ color: colors.primary }} />;
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
          color: colors.error,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div className="flex items-center gap-2">
          <Link2Off size={24} style={{ color: colors.error }} />
          <Typography variant="h6" component="span">
            Detaching Cluster: {clusterName}
          </Typography>
        </div>
        <IconButton onClick={handleClose} size="small" style={{ color: colors.textSecondary }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent
        style={{
          padding: '24px',
          backgroundColor: isDark ? colors.background : undefined,
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Terminal size={20} style={{ color: colors.primary }} />
              <Typography variant="h6">Detachment Logs</Typography>
            </Box>

            <Chip
              label={isConnected ? 'Connected' : 'Disconnected'}
              size="small"
              sx={{
                backgroundColor: isConnected
                  ? isDark
                    ? 'rgba(103, 192, 115, 0.15)'
                    : 'rgba(103, 192, 115, 0.1)'
                  : isDark
                    ? 'rgba(255, 107, 107, 0.15)'
                    : 'rgba(255, 107, 107, 0.1)',
                color: isConnected ? colors.success : colors.error,
                fontWeight: 500,
              }}
            />
          </Box>

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 2,
                backgroundColor: isDark ? 'rgba(255, 107, 107, 0.1)' : 'rgba(255, 107, 107, 0.05)',
                color: colors.error,
              }}
            >
              {error}
            </Alert>
          )}

          <Paper
            elevation={0}
            sx={{
              height: '400px',
              overflow: 'auto',
              p: 2,
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.02)',
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
            }}
          >
            {logs.length === 0 && !error ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: 2,
                }}
              >
                <CircularProgress size={30} style={{ color: colors.primary }} />
                <Typography variant="body2" style={{ color: colors.textSecondary }}>
                  Connecting to detachment service...
                </Typography>
              </Box>
            ) : (
              logs.map((log, index) => (
                <Box
                  key={index}
                  sx={{
                    mb: 2,
                    p: 1.5,
                    borderRadius: '8px',
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getLogIcon(log)}
                      <Chip
                        label={log.status}
                        size="small"
                        sx={{
                          backgroundColor: `${getStatusColor(log.status)}15`,
                          color: getStatusColor(log.status),
                          fontWeight: 500,
                          fontSize: '0.75rem',
                        }}
                      />
                      <Chip
                        label={log.type}
                        size="small"
                        sx={{
                          backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(0, 0, 0, 0.05)',
                          color: colors.textSecondary,
                          fontSize: '0.7rem',
                        }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AccessTimeIcon
                        fontSize="small"
                        style={{ color: colors.textSecondary, fontSize: '0.9rem' }}
                      />
                      <Typography variant="caption" style={{ color: colors.textSecondary }}>
                        {formatDate(log.timestamp)}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" style={{ color: colors.text, marginLeft: '16px' }}>
                    {log.message}
                  </Typography>
                </Box>
              ))
            )}
            <div ref={logsEndRef} />
          </Paper>
        </Box>

        {isCompleted && (
          <Alert
            severity="success"
            icon={<CheckCircleIcon fontSize="inherit" />}
            sx={{
              backgroundColor: isDark ? 'rgba(103, 192, 115, 0.15)' : 'rgba(103, 192, 115, 0.1)',
              color: colors.success,
              border: `1px solid ${isDark ? 'rgba(103, 192, 115, 0.3)' : 'rgba(103, 192, 115, 0.2)'}`,
            }}
          >
            Cluster detachment completed successfully.
          </Alert>
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
          onClick={handleClose}
          style={{
            backgroundColor: isCompleted ? colors.success : colors.error,
            color: colors.white,
          }}
          variant="contained"
        >
          {isCompleted ? 'Done' : 'Close'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DetachmentLogsDialog;

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Typography,
  SelectChangeEvent,
} from '@mui/material';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import DownloadLogsButton from '../../DownloadLogsButton';
import { getWebSocketUrl } from '../../../lib/api';

interface ContainerInfo {
  ContainerName: string;
  Image: string;
}

interface LogsTabProps {
  type: string;
  theme: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  terminalRef: React.RefObject<HTMLDivElement>;
  logsContainers: ContainerInfo[];
  selectedLogsContainer: string;
  loadingLogsContainers: boolean;
  showPreviousLogs: boolean;
  logs: string[];
  cluster: string;
  namespace: string;
  name: string;
  isOpen: boolean;
  handleLogsContainerChange: (event: SelectChangeEvent<string>) => void;
  handlePreviousLogsToggle: () => void;
  setIsLogsContainerSelectActive: (active: boolean) => void;
}

const LogsTab: React.FC<LogsTabProps> = ({
  type,
  theme,
  t,
  terminalRef,
  logsContainers,
  selectedLogsContainer,
  loadingLogsContainers,
  showPreviousLogs,
  cluster,
  namespace,
  name,
  isOpen,
  handleLogsContainerChange,
  handlePreviousLogsToggle,
  setIsLogsContainerSelectActive,
}) => {
  const [actualLogs, setActualLogs] = useState<string[]>([]);
  const terminalInstance = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const hasShownConnectedMessageRef = useRef<boolean>(false);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || type.toLowerCase() !== 'pod') return;

    // Skip re-initialization if terminal already exists
    if (terminalInstance.current) {
      // Update existing terminal with latest logs instead of re-creating it
      const term = terminalInstance.current;
      const lastLogIndex = term.buffer.active.length - 1; // Approximate last written log
      const newLogs = actualLogs.slice(lastLogIndex > 0 ? lastLogIndex : 0);
      newLogs.forEach(log => {
        term.writeln(log);
      });
      return;
    }

    const term = new Terminal({
      theme: {
        background: theme === 'dark' ? '#1E1E1E' : '#FFFFFF',
        foreground: theme === 'dark' ? '#D4D4D4' : '#222222',
        cursor: '#00FF00',
      },
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'monospace',
      scrollback: 1000,
      disableStdin: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);

    setTimeout(() => fitAddon.fit(), 100);
    terminalInstance.current = term;
    term.clear();
    actualLogs.forEach(log => {
      term.writeln(log);
    });

    return () => {
      term.dispose();
      terminalInstance.current = null;
    };
  }, [theme, type, actualLogs, terminalRef]);

  // Connect WebSocket for real-time logs
  const connectWebSocket = useCallback(() => {
    if (!isOpen || type.toLowerCase() !== 'pod') return;

    // Build WebSocket URL with container and previous logs parameters
    let wsUrl = getWebSocketUrl(`/ws/logs?cluster=${cluster}&namespace=${namespace}&pod=${name}`);

    // Add container parameter if selected
    if (selectedLogsContainer) {
      wsUrl += `&container=${encodeURIComponent(selectedLogsContainer)}`;
    }

    // Add previous parameter if showPreviousLogs is true
    if (showPreviousLogs) {
      wsUrl += `&previous=true`;
    }

    setActualLogs(prev => [
      ...prev,
      `\x1b[33m[Connecting] WebSocket Request\x1b[0m`,
      `URL: ${wsUrl}`,
      `Container: ${selectedLogsContainer || 'default'}`,
      `Previous Logs: ${showPreviousLogs ? 'Yes' : 'No'}`,
      `Timestamp: ${new Date().toISOString()}`,
      `-----------------------------------`,
    ]);

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setActualLogs(prev => [
        ...prev,
        `\x1b[32m[Connected] WebSocket Connection Established\x1b[0m`,
        `Status: OPEN`,
        `Container: ${selectedLogsContainer || 'default'}`,
        `Previous Logs: ${showPreviousLogs ? 'Yes' : 'No'}`,
        `Timestamp: ${new Date().toISOString()}`,
        `-----------------------------------`,
      ]);
      hasShownConnectedMessageRef.current = true;
    };

    socket.onmessage = event => {
      const messageLines = event.data.split('\n').filter((line: string) => line.trim() !== '');
      const messageLog = messageLines.map((line: string) => line.trim());
      messageLog.push(`Timestamp: ${new Date().toISOString()}`);
      messageLog.push(`-----------------------------------`);
      setActualLogs(prev => [...prev, ...messageLog]);
    };

    socket.onerror = event => {
      setActualLogs(prev => [
        ...prev,
        `\x1b[31m[Error] WebSocket Connection Failed\x1b[0m`,
        `Details: ${JSON.stringify(event)}`,
        `Timestamp: ${new Date().toISOString()}`,
        `-----------------------------------`,
      ]);
    };

    socket.onclose = () => {
      setActualLogs(prev => [
        ...prev,
        `\x1b[31m[Closed] WebSocket Connection Terminated\x1b[0m`,
        `Timestamp: ${new Date().toISOString()}`,
        `-----------------------------------`,
      ]);
      wsRef.current = null;
    };
  }, [isOpen, type, cluster, namespace, name, selectedLogsContainer, showPreviousLogs]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!isOpen || type.toLowerCase() !== 'pod') {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setActualLogs([]);
      hasShownConnectedMessageRef.current = false;
      return;
    }

    // Close existing connection if container or previous logs selection changes
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isOpen, type, connectWebSocket, selectedLogsContainer, showPreviousLogs]);

  // Use available containers if logsContainers is empty
  const containersToUse = logsContainers.length > 0 ? logsContainers : [];
  const isLoadingContainers = loadingLogsContainers;

  return (
    <>
      {/* Add container selection and previous logs controls if the resource is a pod */}
      {type.toLowerCase() === 'pod' && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Container selection dropdown for logs */}
            <FormControl
              size="small"
              className="logs-container-dropdown"
              onMouseDown={() => {
                setIsLogsContainerSelectActive(true);
              }}
              sx={{
                minWidth: 200,
                '& .MuiInputBase-root': {
                  color: theme === 'dark' ? '#CCC' : '#444',
                  fontSize: '13px',
                  backgroundColor: theme === 'dark' ? '#333' : '#FFF',
                  border: theme === 'dark' ? '1px solid #444' : '1px solid #DDD',
                  borderRadius: '4px',
                  height: '36px',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  border: 'none',
                },
              }}
              onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                e.stopPropagation();
              }}
            >
              <Select
                value={selectedLogsContainer}
                onChange={handleLogsContainerChange}
                displayEmpty
                onMouseDown={(e: React.MouseEvent<HTMLElement>) => {
                  e.stopPropagation();
                  setIsLogsContainerSelectActive(true);
                }}
                onClose={() => {
                  setTimeout(() => setIsLogsContainerSelectActive(false), 300);
                }}
                MenuProps={{
                  slotProps: {
                    paper: {
                      onClick: (e: React.MouseEvent<HTMLDivElement>) => {
                        e.stopPropagation();
                      },
                      onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
                        e.stopPropagation();
                        setIsLogsContainerSelectActive(true);
                      },
                      style: {
                        zIndex: 9999,
                      },
                    },
                    root: {
                      onClick: (e: React.MouseEvent<HTMLDivElement>) => {
                        e.stopPropagation();
                      },
                      onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
                        e.stopPropagation();
                        setIsLogsContainerSelectActive(true);
                      },
                    },
                  },
                  anchorOrigin: {
                    vertical: 'bottom',
                    horizontal: 'left',
                  },
                  transformOrigin: {
                    vertical: 'top',
                    horizontal: 'left',
                  },
                }}
                renderValue={value => (
                  <Box
                    sx={{ display: 'flex', alignItems: 'center' }}
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                      e.stopPropagation();
                    }}
                  >
                    {isLoadingContainers ? (
                      <CircularProgress size={14} sx={{ mr: 1 }} />
                    ) : (
                      <span
                        className="fas fa-cube"
                        style={{ marginRight: '8px', fontSize: '12px' }}
                      />
                    )}
                    {value || t('wecsDetailsPanel.containers.selectContainer')}
                  </Box>
                )}
              >
                {containersToUse.map(container => (
                  <MenuItem
                    key={container.ContainerName}
                    value={container.ContainerName}
                    sx={{
                      fontSize: '13px',
                      py: 0.75,
                    }}
                    onMouseDown={(e: React.MouseEvent<HTMLLIElement>) => {
                      e.stopPropagation();
                      setIsLogsContainerSelectActive(true);
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2">{container.ContainerName}</Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: theme === 'dark' ? '#888' : '#666',
                          fontSize: '11px',
                        }}
                      >
                        {container.Image}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Previous logs toggle */}
            <Button
              variant={showPreviousLogs ? 'contained' : 'outlined'}
              onClick={handlePreviousLogsToggle}
              size="small"
              sx={{
                textTransform: 'none',
                backgroundColor: showPreviousLogs ? '#2F86FF' : 'transparent',
                borderRadius: '6px',
                color: showPreviousLogs ? '#fff' : '#2F86FF',
                border: showPreviousLogs ? 'none' : '1px solid #2F86FF',
                fontSize: '12px',
                height: '36px',
                px: 2,
                '&:hover': {
                  backgroundColor: showPreviousLogs ? '#1565c0' : 'rgba(47, 134, 255, 0.08)',
                },
              }}
            >
              <span className="fas fa-history" style={{ marginRight: '6px', fontSize: '11px' }} />
              {t('wecsDetailsPanel.logs.previousLogs')}
            </Button>
          </Box>

          {/* Download logs button */}
          <DownloadLogsButton
            cluster={cluster}
            namespace={namespace}
            podName={name}
            logContent={actualLogs.join('\n')}
          />
        </Box>
      )}
      <Box
        sx={{
          maxHeight: '500px',
          bgcolor: theme === 'dark' ? '#1E1E1E' : '#FFFFFF',
          borderRadius: 1,
          p: 1,
          overflow: 'auto',
        }}
      >
        <div ref={terminalRef} style={{ height: '100%', width: '100%', overflow: 'auto' }} />
      </Box>
    </>
  );
};

export default LogsTab;

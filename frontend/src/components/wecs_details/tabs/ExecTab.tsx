import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Typography,
  CircularProgress,
  SelectChangeEvent,
} from '@mui/material';
import { FiTrash2, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { getWebSocketUrl } from '../../../lib/api';

interface ContainerInfo {
  ContainerName: string;
  Image: string;
}

interface ExecTabProps {
  theme: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  name: string;
  containers: ContainerInfo[];
  selectedContainer: string;
  loadingContainers: boolean;
  isTerminalMaximized: boolean;
  execTerminalRef: React.RefObject<HTMLDivElement>;
  execTerminalKey: string;
  handleContainerChange: (event: SelectChangeEvent<string>) => void;
  setIsContainerSelectActive: (active: boolean) => void;
  setIsTerminalMaximized: (maximized: boolean) => void;
  cluster: string;
  namespace: string;
  type: string;
}

const ExecTab: React.FC<ExecTabProps> = ({
  theme,
  t,
  name,
  containers,
  selectedContainer,
  loadingContainers,
  isTerminalMaximized,
  execTerminalRef,
  execTerminalKey,
  handleContainerChange,
  setIsContainerSelectActive,
  setIsTerminalMaximized,
  cluster,
  namespace,
  type,
}) => {
  const [isExecConnected, setIsExecConnected] = useState<boolean>(false);
  const terminalInstance = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const currentPodRef = useRef<string | null>(null);

  // Clean up exec terminal when pod changes or panel closes
  useEffect(() => {
    if (currentPodRef.current !== name) {
      // Clean up existing exec terminal resources
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      if (terminalInstance.current) {
        terminalInstance.current.dispose();
        terminalInstance.current = null;
      }

      // Update current pod reference
      currentPodRef.current = name;
    }
  }, [name]);

  // Initialize exec terminal
  useEffect(() => {
    if (!execTerminalRef.current || type.toLowerCase() !== 'pod') return;

    // Always clean up previous terminal when switching to the exec tab
    if (terminalInstance.current) {
      terminalInstance.current.dispose();
      terminalInstance.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    let cleanupFn: (() => void) | undefined;
    const timeoutId = setTimeout(() => {
      if (!execTerminalRef.current) {
        console.error('Terminal reference is null after timeout');
        return;
      }

      // Create enhanced terminal with better styling
      const term = new Terminal({
        theme: {
          background: theme === 'dark' ? '#1A1A1A' : '#FAFAFA',
          foreground: theme === 'dark' ? '#E0E0E0' : '#333333',
          cursor: theme === 'dark' ? '#4D8FCA' : '#2B7DE9',
          black: theme === 'dark' ? '#000000' : '#333333',
          red: '#E06C75',
          green: '#98C379',
          yellow: '#E5C07B',
          blue: '#61AFEF',
          magenta: '#C678DD',
          cyan: '#56B6C2',
          white: theme === 'dark' ? '#FFFFFF' : '#FAFAFA',
        },
        cursorBlink: true,
        fontSize: 14,
        fontFamily: '"Menlo", "Monaco", "Consolas", "Ubuntu Mono", monospace',
        lineHeight: 1.3,
        scrollback: 3000,
        disableStdin: false,
        convertEol: true,
        allowProposedApi: true,
        cursorStyle: 'bar',
        cursorWidth: 2,
        windowsMode: false,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      try {
        // First make sure the container is empty
        if (execTerminalRef.current) {
          execTerminalRef.current.innerHTML = '';
        }

        term.open(execTerminalRef.current);

        setTimeout(() => {
          try {
            fitAddon.fit();
          } catch (error) {
            console.error('Failed to fit terminal:', error);
          }
        }, 100);
      } catch (error) {
        console.error('Failed to open terminal:', error);
        return;
      }

      terminalInstance.current = term;

      // Use selectedContainer if available, otherwise use fallback
      const containerName = selectedContainer || 'container';

      const wsUrl = getWebSocketUrl(
        `/ws/pod/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/shell/${encodeURIComponent(containerName)}?context=${encodeURIComponent(cluster)}&shell=sh`
      );

      // Show a minimal connecting message with a spinner effect
      term.writeln(`\x1b[33mConnecting to pod shell in container ${containerName}...\x1b[0m`);

      // Log full details to console for debugging but don't show in UI
      console.log(`Creating WebSocket connection:`, {
        pod: name,
        namespace,
        container: containerName,
        context: cluster,
        url: wsUrl,
      });

      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        // Completely clear the terminal once connected
        term.reset();
        term.clear();
        term.writeln(t('wecsDetailsPanel.terminal.connected', { containerName }));
        term.writeln('');
        setIsExecConnected(true);
      };

      socket.onmessage = event => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.Op === 'stdout') {
            term.write(msg.Data);
          } else {
            console.log(`Received non-stdout message:`, msg);
          }
        } catch {
          // If it's not JSON, write it directly
          term.writeln(event.data);
        }
      };

      socket.onerror = error => {
        console.error('WebSocket error:', error);
        term.writeln(`\x1b[31mError connecting to pod. Please try again.\x1b[0m`);
        setIsExecConnected(false);
      };

      socket.onclose = event => {
        if (event.code !== 1000 && event.code !== 1001) {
          term.writeln(t('wecsDetailsPanel.terminal.connectionClosed'));
        }
        wsRef.current = null;
        setIsExecConnected(false);
      };

      // Handle user input including Tab completion
      term.onData(data => {
        if (socket.readyState === WebSocket.OPEN) {
          // Special handling for Tab key for auto-completion
          if (data === '\t') {
            const msg = JSON.stringify({ Op: 'stdin', Data: data });
            socket.send(msg);
          } else {
            const msg = JSON.stringify({ Op: 'stdin', Data: data });
            socket.send(msg);
          }
        } else {
          console.warn(
            `Cannot send data: WebSocket not in OPEN state (state: ${socket.readyState})`
          );
          term.writeln(`\x1b[31mConnection not active. Cannot send command.\x1b[0m`);
        }
      });

      // Add ping to keep connection alive
      const pingInterval = setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ Op: 'ping' }));
        }
      }, 30000);

      // Update current pod reference
      currentPodRef.current = name;

      // Add Ctrl+L keybinding to clear the terminal
      term.attachCustomKeyEventHandler(event => {
        if (event.ctrlKey && event.key.toLowerCase() === 'l') {
          term.clear();
          event.preventDefault();
          return false; // Prevent default and xterm.js handling
        }
        return true;
      });

      cleanupFn = () => {
        clearInterval(pingInterval);

        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.close();
        }

        wsRef.current = null;

        if (term) {
          term.dispose();
        }

        terminalInstance.current = null;
      };
    }, 50); // Small delay to ensure DOM is ready

    return () => {
      clearTimeout(timeoutId);
      if (cleanupFn) cleanupFn();
    };
  }, [theme, type, name, namespace, cluster, selectedContainer, execTerminalKey, t]);

  // Use available containers if containers prop is empty
  const containersToUse = containers.length > 0 ? containers : [];
  const isLoadingContainers = loadingContainers;

  return (
    <Box
      sx={{
        height: isTerminalMaximized ? 'calc(100vh - 220px)' : '500px',
        bgcolor: theme === 'dark' ? '#1A1A1A' : '#FAFAFA',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        border: theme === 'dark' ? '1px solid #333' : '1px solid #E0E0E0',
        p: 0,
        pb: 0.5,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'height 0.3s ease-in-out',
      }}
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation(); // Stop clicks inside this box from bubbling
      }}
    >
      {/* Terminal header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 0.75,
          backgroundColor: theme === 'dark' ? '#252525' : '#F0F0F0',
          borderBottom: theme === 'dark' ? '1px solid #333' : '1px solid #E0E0E0',
          fontSize: '13px',
          fontWeight: 500,
          color: theme === 'dark' ? '#CCC' : '#444',
          fontFamily: '"Segoe UI", "Helvetica", "Arial", sans-serif',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <span
            style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: isExecConnected ? '#98C379' : '#FF6B6B',
              marginRight: '8px',
            }}
          />
          {name}
          {isExecConnected && (
            <Typography
              variant="caption"
              sx={{
                ml: 1,
                color: theme === 'dark' ? '#98C379' : '#2E7D32',
                fontSize: '11px',
              }}
            >
              Connected
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Container selection dropdown */}
          <FormControl
            size="small"
            className="container-dropdown"
            onMouseDown={() => {
              setIsContainerSelectActive(true);
            }}
            sx={{
              minWidth: 150,
              '& .MuiInputBase-root': {
                color: theme === 'dark' ? '#CCC' : '#444',
                fontSize: '13px',
                backgroundColor: theme === 'dark' ? '#333' : '#FFF',
                border: theme === 'dark' ? '1px solid #444' : '1px solid #DDD',
                borderRadius: '4px',
                height: '30px',
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
              value={selectedContainer}
              onChange={handleContainerChange}
              displayEmpty
              onMouseDown={(e: React.MouseEvent<HTMLElement>) => {
                e.stopPropagation();
                setIsContainerSelectActive(true);
              }}
              onClose={() => {
                setTimeout(() => setIsContainerSelectActive(false), 300);
              }}
              MenuProps={{
                slotProps: {
                  paper: {
                    onClick: (e: React.MouseEvent<HTMLDivElement>) => {
                      e.stopPropagation();
                    },
                    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
                      e.stopPropagation();
                      setIsContainerSelectActive(true);
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
                      setIsContainerSelectActive(true);
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
                    setIsContainerSelectActive(true);
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2">{container.ContainerName}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                      {container.Image.length > 40
                        ? container.Image.substring(0, 37) + '...'
                        : container.Image}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
              {containersToUse.length === 0 && !isLoadingContainers && (
                <MenuItem disabled>
                  <Typography variant="body2">
                    {t('wecsDetailsPanel.containers.noContainersFound')}
                  </Typography>
                </MenuItem>
              )}
            </Select>
          </FormControl>

          {/* Existing buttons */}
          <Tooltip title={t('wecsDetailsPanel.buttons.clearTerminal')}>
            <IconButton
              size="small"
              onClick={() => {
                if (terminalInstance.current) {
                  terminalInstance.current.clear();
                }
              }}
              sx={{
                color: theme === 'dark' ? '#CCC' : '#666',
                padding: '2px',
                '&:hover': {
                  backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                },
              }}
            >
              <FiTrash2 size={16} />
            </IconButton>
          </Tooltip>

          <Tooltip
            title={
              isTerminalMaximized
                ? t('wecsDetailsPanel.buttons.minimize')
                : t('wecsDetailsPanel.buttons.maximize')
            }
          >
            <IconButton
              size="small"
              onClick={() => setIsTerminalMaximized(!isTerminalMaximized)}
              sx={{
                color: theme === 'dark' ? '#CCC' : '#666',
                padding: '2px',
                '&:hover': {
                  backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                },
              }}
            >
              {isTerminalMaximized ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Terminal content */}
      <Box
        sx={{
          flex: 1,
          p: 1,
          overflow: 'hidden',
        }}
      >
        <div
          key={execTerminalKey}
          ref={execTerminalRef}
          style={{
            height: '100%',
            width: '100%',
            padding: '4px',
            overflow: 'hidden',
          }}
        />
      </Box>
    </Box>
  );
};

export default ExecTab;

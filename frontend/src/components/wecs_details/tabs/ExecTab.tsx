import React, { useEffect, useState } from 'react';
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
  Alert,
} from '@mui/material';
import { FiTrash2, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import { api } from '../../../lib/api';

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
  clearTerminal: () => void;
  cluster?: string;
  namespace?: string;
  type?: string;
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
  clearTerminal,
  cluster,
  namespace,
  type,
}) => {
  const [availableContainers, setAvailableContainers] = useState<ContainerInfo[]>([]);
  const [loadingAvailableContainers, setLoadingAvailableContainers] = useState<boolean>(false);
  const [execError, setExecError] = useState<string | null>(null);
  const [isExecConnected, setIsExecConnected] = useState<boolean>(false);

  // Fetch containers for the pod
  useEffect(() => {
    const fetchContainers = async () => {
      if (type?.toLowerCase() === 'pod' && name && namespace && cluster) {
        setLoadingAvailableContainers(true);
        try {
          const response = await api.get(`/api/pod/${namespace}/${name}/containers`, {
            params: { cluster },
          });
          setAvailableContainers(response.data.containers || []);
        } catch (error) {
          console.error('Failed to fetch containers:', error);
          setExecError(t('wecsDetailsPanel.errors.failedFetchContainers'));
        } finally {
          setLoadingAvailableContainers(false);
        }
      }
    };

    fetchContainers();
  }, [type, name, namespace, cluster, t]);

  // Initialize exec session when container is selected
  useEffect(() => {
    const initializeExecSession = async () => {
      if (type?.toLowerCase() === 'pod' && name && namespace && cluster && selectedContainer) {
        try {
          setExecError(null);
          // Initialize WebSocket connection for exec
          const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/pod/${namespace}/${name}/exec`;
          const ws = new WebSocket(wsUrl);

          ws.onopen = () => {
            setIsExecConnected(true);
            // Send container selection
            ws.send(
              JSON.stringify({
                action: 'connect',
                container: selectedContainer,
                cluster: cluster,
              })
            );
          };

          ws.onmessage = event => {
            const data = JSON.parse(event.data);
            if (data.type === 'output' && execTerminalRef.current) {
              // Append output to terminal
              execTerminalRef.current.innerHTML += data.data;
              execTerminalRef.current.scrollTop = execTerminalRef.current.scrollHeight;
            }
          };

          ws.onerror = error => {
            console.error('WebSocket error:', error);
            setExecError(t('wecsDetailsPanel.errors.failedConnectExec'));
            setIsExecConnected(false);
          };

          ws.onclose = () => {
            setIsExecConnected(false);
          };

          // Store WebSocket reference for cleanup
          (execTerminalRef as React.RefObject<HTMLDivElement & { ws?: WebSocket }>).current!.ws =
            ws;

          return () => {
            ws.close();
          };
        } catch (error) {
          console.error('Failed to initialize exec session:', error);
          setExecError(t('wecsDetailsPanel.errors.failedInitExec'));
        }
      }
    };

    initializeExecSession();
  }, [type, name, namespace, cluster, selectedContainer, t, execTerminalRef]);

  // Use available containers if containers prop is empty
  const containersToUse = containers.length > 0 ? containers : availableContainers;
  const isLoadingContainers = loadingContainers || loadingAvailableContainers;

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
              {t('wecsDetailsPanel.exec.connected')}
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
              onClick={clearTerminal}
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

      {execError && (
        <Alert severity="error" sx={{ mx: 2, mt: 1 }}>
          {execError}
        </Alert>
      )}

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
            fontFamily: 'monospace',
            fontSize: '12px',
            color: theme === 'dark' ? '#fff' : '#000',
            backgroundColor: theme === 'dark' ? '#1A1A1A' : '#FAFAFA',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        />
      </Box>
    </Box>
  );
};

export default ExecTab;

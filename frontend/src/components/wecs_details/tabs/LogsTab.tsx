import React, { useEffect, useState } from 'react';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Typography,
  SelectChangeEvent,
  Alert,
} from '@mui/material';
import DownloadLogsButton from '../../DownloadLogsButton';
import { api } from '../../../lib/api';

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
  logs: string[]; // This prop is kept for backward compatibility but we use actualLogs internally
  cluster: string;
  namespace: string;
  name: string;
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
  handleLogsContainerChange,
  handlePreviousLogsToggle,
  setIsLogsContainerSelectActive,
}) => {
  const [actualLogs, setActualLogs] = useState<string[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [availableContainers, setAvailableContainers] = useState<ContainerInfo[]>([]);
  const [loadingContainers, setLoadingContainers] = useState<boolean>(false);

  // Fetch containers for the pod
  useEffect(() => {
    const fetchContainers = async () => {
      if (type.toLowerCase() === 'pod' && name && namespace) {
        setLoadingContainers(true);
        try {
          const response = await api.get(`/api/pod/${namespace}/${name}/containers`, {
            params: { cluster },
          });
          setAvailableContainers(response.data.containers || []);
        } catch (error) {
          console.error('Failed to fetch containers:', error);
          setLogsError(t('wecsDetailsPanel.errors.failedFetchContainers'));
        } finally {
          setLoadingContainers(false);
        }
      }
    };

    fetchContainers();
  }, [type, name, namespace, cluster, t]);

  // Fetch logs when container or previous logs setting changes
  useEffect(() => {
    const fetchLogs = async () => {
      if (type.toLowerCase() === 'pod' && name && namespace && selectedLogsContainer) {
        setLoadingLogs(true);
        setLogsError(null);
        try {
          const response = await api.get(`/api/pod/${namespace}/${name}/logs`, {
            params: {
              cluster,
              container: selectedLogsContainer,
              previous: showPreviousLogs,
            },
          });
          setActualLogs(response.data.logs || []);
        } catch (error) {
          console.error('Failed to fetch logs:', error);
          setLogsError(t('wecsDetailsPanel.errors.failedLoadDetails', { type: 'logs' }));
        } finally {
          setLoadingLogs(false);
        }
      }
    };

    fetchLogs();
  }, [type, name, namespace, cluster, selectedLogsContainer, showPreviousLogs, t]);

  // Display logs in the terminal ref
  useEffect(() => {
    if (terminalRef.current && actualLogs.length > 0) {
      terminalRef.current.innerHTML = actualLogs.join('\n');
    }
  }, [actualLogs, terminalRef]);

  // Use available containers if logsContainers is empty
  const containersToUse = logsContainers.length > 0 ? logsContainers : availableContainers;
  const isLoadingContainers = loadingLogsContainers || loadingContainers;

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
                {containersToUse.length === 0 && !isLoadingContainers && (
                  <MenuItem disabled>
                    <Typography variant="body2">
                      {t('wecsDetailsPanel.containers.noContainersFound')}
                    </Typography>
                  </MenuItem>
                )}
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

      {logsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {logsError}
        </Alert>
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
        {loadingLogs ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px',
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <div
            ref={terminalRef}
            style={{
              height: '100%',
              width: '100%',
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: theme === 'dark' ? '#fff' : '#000',
              backgroundColor: theme === 'dark' ? '#1E1E1E' : '#FFFFFF',
              padding: '8px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          />
        )}
      </Box>
    </>
  );
};

export default LogsTab;

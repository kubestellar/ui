import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Stack,
  Typography,
  IconButton,
  Button,
  Tooltip,
  Snackbar,
  Alert,
  SelectChangeEvent,
} from '@mui/material';
import { FiX, FiGitPullRequest, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import useTheme from '../../stores/themeStore';
import WecsDetailsTabs from './WecsDetailsTabs';
import SummaryTab from './tabs/SummaryTab';
import EditTab from './tabs/EditTab';
import LogsTab from './tabs/LogsTab';
import ExecTab from './tabs/ExecTab';
import { getPanelStyles, getContentBoxStyles } from './WecsDetailsStyles';
import { api } from '../../lib/api';
import * as YAML from 'yaml';

// Import the ResourceInfo interface from SummaryTab
interface ResourceInfo {
  name: string;
  namespace: string;
  kind: string;
  createdAt: string;
  age: string;
  status: string;
  manifest: string;
  context?: string;
  labels?: Record<string, string>;
}

interface ResourceData {
  metadata?: {
    name?: string;
    namespace?: string;
    creationTimestamp?: string;
    labels?: Record<string, string>;
  };
  status?: Record<string, unknown>;
}

interface ClusterDetails {
  clusterName: string;
  itsManagedClusters?: Array<{
    context?: string;
    creationTime?: string;
    labels?: Record<string, string>;
  }>;
}

interface ContainerInfo {
  ContainerName: string;
  Image: string;
}

interface WecsDetailsProps {
  namespace: string;
  name: string;
  type: string;
  resourceData?: ResourceData;
  onClose: () => void;
  isOpen: boolean;
  onSync?: () => void;
  onDelete?: () => void;
  initialTab?: number;
  cluster: string;
  isDeploymentOrJobPod?: boolean;
}

const WecsDetailsPanel = ({
  namespace,
  name,
  type,
  resourceData,
  onClose,
  isOpen,
  onSync,
  onDelete,
  initialTab,
  cluster,
  isDeploymentOrJobPod,
}: WecsDetailsProps) => {
  const { t } = useTranslation();
  const theme = useTheme(state => state.theme);
  const [tabValue, setTabValue] = useState(initialTab ?? 0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const terminalRef = useRef<HTMLDivElement>(null);
  const execTerminalRef = useRef<HTMLDivElement>(null);
  const [execTerminalKey] = useState<string>(`${cluster}-${namespace}-${name}`);
  
  // State for cluster details and resource data
  const [clusterDetails, setClusterDetails] = useState<ClusterDetails | null>(null);
  const [resource] = useState<ResourceInfo | null>(null);
  const [editFormat, setEditFormat] = useState<'yaml' | 'json'>('yaml');
  const [editedManifest, setEditedManifest] = useState<string>('');
  const [loadingManifest, setLoadingManifest] = useState<boolean>(false);

  // State for logs functionality
  const [logsContainers, setLogsContainers] = useState<ContainerInfo[]>([]);
  const [selectedLogsContainer, setSelectedLogsContainer] = useState<string>('');
  const [loadingLogsContainers, setLoadingLogsContainers] = useState<boolean>(false);
  const [showPreviousLogs, setShowPreviousLogs] = useState<boolean>(false);
  const [logs] = useState<string[]>([]); // Used by LogsTab internally

  // State for exec functionality
  const [execContainers, setExecContainers] = useState<ContainerInfo[]>([]);
  const [selectedExecContainer, setSelectedExecContainer] = useState<string>('');
  const [loadingExecContainers, setLoadingExecContainers] = useState<boolean>(false);
  const [isExecTerminalMaximized, setIsExecTerminalMaximized] = useState<boolean>(false);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => setTabValue(newValue);
  const handleSnackbarClose = () => setSnackbarOpen(false);
  const handleClose = useCallback(() => onClose(), [onClose]);

  // Fetch cluster details when component mounts or cluster changes
  useEffect(() => {
    const fetchClusterDetails = async () => {
      if (type.toLowerCase() === 'cluster' && cluster) {
        try {
          const response = await api.get(`/api/cluster/details/${encodeURIComponent(cluster)}`);
          setClusterDetails(response.data);
        } catch (error) {
          console.error('Failed to fetch cluster details:', error);
          setSnackbarMessage(t('wecsDetailsPanel.errors.failedLoadClusterDetails'));
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
        }
      }
    };

    if (isOpen) {
      fetchClusterDetails();
    }
  }, [cluster, type, isOpen, t]);

  // Fetch containers for pods when component mounts
  useEffect(() => {
    const fetchContainers = async () => {
      if (type.toLowerCase() === 'pod' && name && namespace && cluster) {
        setLoadingLogsContainers(true);
        setLoadingExecContainers(true);
        try {
          const response = await api.get(`/api/pod/${namespace}/${name}/containers`, {
            params: { cluster }
          });
          const containers = response.data.containers || [];
          setLogsContainers(containers);
          setExecContainers(containers);
          
          // Auto-select first container if available
          if (containers.length > 0) {
            setSelectedLogsContainer(containers[0].ContainerName);
            setSelectedExecContainer(containers[0].ContainerName);
          }
        } catch (error) {
          console.error('Failed to fetch containers:', error);
          setSnackbarMessage(t('wecsDetailsPanel.errors.failedFetchContainers'));
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
        } finally {
          setLoadingLogsContainers(false);
          setLoadingExecContainers(false);
        }
      }
    };

    if (isOpen) {
      fetchContainers();
    }
  }, [type, name, namespace, cluster, isOpen, t]);

  // Fetch resource manifest when Edit tab is selected
  useEffect(() => {
    const fetchResourceManifest = async () => {
      if (tabValue === 1 && isOpen && name && type) {
        setLoadingManifest(true);
        try {
          // For clusters, use the cluster details endpoint
          if (type.toLowerCase() === 'cluster') {
            const response = await api.get(`/api/cluster/details/${encodeURIComponent(name)}`);
            if (response.data) {
              setEditedManifest(JSON.stringify(response.data, null, 2));
            } else {
              setEditedManifest('');
            }
          } else {
            // For other resources, use the resource endpoint with namespace
            if (!namespace) {
              throw new Error('Namespace is required for non-cluster resources');
            }
            const response = await api.get(`/api/${type.toLowerCase()}/${namespace}/${name}`);
            
            // The API returns the resource directly, convert it to JSON string
            if (response.data) {
              setEditedManifest(JSON.stringify(response.data, null, 2));
            } else {
              // If no data available, create a basic one from resourceData
              const basicManifest = resourceData ? JSON.stringify(resourceData, null, 2) : '';
              setEditedManifest(basicManifest);
            }
          }
        } catch (error) {
          console.error('Failed to fetch resource manifest:', error);
          
          // Create a basic manifest from available data
          let basicManifest = '';
          
          if (resourceData) {
            basicManifest = JSON.stringify(resourceData, null, 2);
          } else if (type.toLowerCase() === 'cluster' && clusterDetails) {
            // For clusters, create a basic manifest from cluster details
            basicManifest = JSON.stringify({
              apiVersion: 'cluster.open-cluster-management.io/v1',
              kind: 'ManagedCluster',
              metadata: {
                name: clusterDetails.clusterName,
                labels: clusterDetails.itsManagedClusters?.[0]?.labels || {}
              },
              spec: {},
              status: {}
            }, null, 2);
          } else {
            // Create a minimal manifest structure
            basicManifest = JSON.stringify({
              apiVersion: 'v1',
              kind: type,
              metadata: {
                name: name,
                namespace: namespace || 'default'
              },
              spec: {},
              status: {}
            }, null, 2);
          }
          
          setEditedManifest(basicManifest);
          
          // Show appropriate error message based on the error
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status === 404) {
            setSnackbarMessage(`Resource ${name} not found in ${namespace || 'cluster'}`);
          } else {
            setSnackbarMessage(t('wecsDetailsPanel.errors.failedLoadDetails', { type }));
          }
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
        } finally {
          setLoadingManifest(false);
        }
      }
    };

    fetchResourceManifest();
  }, [tabValue, isOpen, name, namespace, type, cluster, resourceData, clusterDetails, t]);

  // Calculate age function
  const calculateAge = useCallback((creationTimestamp: string | undefined): string => {
    if (!creationTimestamp) return t('wecsDetailsPanel.common.unknown');
    
    const now = new Date();
    const created = new Date(creationTimestamp);
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return t('wecsDetailsPanel.common.today');
    } else {
      return t('wecsDetailsPanel.common.daysAgo', { count: diffDays });
    }
  }, [t]);

  // JSON to YAML conversion function
  const jsonToYaml = useCallback((jsonString: string): string => {
    try {
      if (!jsonString) return '';
      const obj = JSON.parse(jsonString);
      // Convert JSON object to YAML format
      return YAML.stringify(obj, { indent: 2 });
    } catch (error) {
      console.error('Error converting JSON to YAML:', error);
      return jsonString;
    }
  }, []);

  // YAML to JSON conversion function
  const yamlToJson = useCallback((yamlString: string): string => {
    try {
      if (!yamlString) return '';
      const obj = YAML.parse(yamlString);
      return JSON.stringify(obj, null, 2);
    } catch (error) {
      console.error('Error converting YAML to JSON:', error);
      return yamlString;
    }
  }, []);

  // Handle editor change
  const handleEditorChange = useCallback((value: string | undefined) => {
    setEditedManifest(value || '');
  }, []);



  // Handle update
  const handleUpdate = useCallback(async () => {
    if (!editedManifest.trim()) {
      setSnackbarMessage(t('wecsDetailsPanel.errors.emptyManifest'));
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    try {
      let manifestData;
      
      // Parse the manifest based on format
      if (editFormat === 'json') {
        manifestData = JSON.parse(editedManifest);
      } else {
        // For YAML, convert it to JSON for the API
        try {
          manifestData = YAML.parse(editedManifest);
        } catch {
          setSnackbarMessage(t('wecsDetailsPanel.errors.invalidManifest'));
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          return;
        }
      }

      // Validate required fields
      if (!manifestData.metadata?.name || !manifestData.kind) {
        setSnackbarMessage(t('wecsDetailsPanel.errors.invalidManifest'));
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }

      // Determine the API endpoint based on resource type
      let endpoint: string;
      const method: 'PUT' | 'PATCH' = 'PUT';

      if (type.toLowerCase() === 'cluster') {
        endpoint = `/api/cluster/${encodeURIComponent(name)}`;
      } else {
        if (!namespace) {
          setSnackbarMessage(t('wecsDetailsPanel.errors.namespaceRequired'));
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          return;
        }
        endpoint = `/api/${type.toLowerCase()}/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;
      }

      // Add cluster context if available
      const params = cluster ? { cluster } : {};

      // Make the API call
      const response = await api.request({
        method,
        url: endpoint,
        data: manifestData,
        params,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status >= 200 && response.status < 300) {
        setSnackbarMessage(t('wecsDetailsPanel.success.manifestUpdated'));
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        
        // Refresh the manifest data
        if (tabValue === 1) {
          // Trigger a re-fetch of the manifest
          const event = new Event('manifest-updated');
          window.dispatchEvent(event);
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: unknown) {
      console.error('Failed to update manifest:', error);
      
      let errorMessage = t('wecsDetailsPanel.errors.failedUpdate');
      
      const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
      
      if (axiosError.response?.status === 404) {
        errorMessage = t('wecsDetailsPanel.errors.resourceNotFound');
      } else if (axiosError.response?.status === 403) {
        errorMessage = t('wecsDetailsPanel.errors.permissionDenied');
      } else if (axiosError.response?.status === 422) {
        errorMessage = t('wecsDetailsPanel.errors.invalidManifest');
      } else if (axiosError.response?.data?.message) {
        errorMessage = axiosError.response.data.message;
      }
      
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  }, [editedManifest, editFormat, type, name, namespace, cluster, tabValue, t]);

  // Handle logs container change
  const handleLogsContainerChange = useCallback((event: SelectChangeEvent<string>) => {
    setSelectedLogsContainer(event.target.value);
  }, []);

  // Handle previous logs toggle
  const handlePreviousLogsToggle = useCallback(() => {
    setShowPreviousLogs(!showPreviousLogs);
  }, [showPreviousLogs]);

  // Handle exec container change
  const handleExecContainerChange = useCallback((event: SelectChangeEvent<string>) => {
    setSelectedExecContainer(event.target.value);
  }, []);

  // Clear terminal function
  const clearTerminal = useCallback(() => {
    if (execTerminalRef.current) {
      execTerminalRef.current.innerHTML = '';
    }
  }, []);

  return (
    <Box sx={getPanelStyles(theme, isOpen)} onClick={e => e.stopPropagation()}>
      <Box sx={{ p: 4, height: '100%' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography
            variant="h4"
            fontWeight="bold"
            sx={{
              color: theme === 'dark' ? '#FFFFFF' : '#000000',
              fontSize: '30px',
              marginLeft: '4px',
            }}
          >
            {type.toUpperCase()} : <span style={{ color: '#2F86FF' }}>{name}</span>
          </Typography>
          <Stack direction="row" spacing={1}>
            {onSync && (
              <Tooltip title={t('wecsDetailsPanel.common.sync')}>
                <Button variant="contained" startIcon={<FiGitPullRequest />} onClick={onSync}>
                  {t('wecsDetailsPanel.common.sync')}
                </Button>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title={t('wecsDetailsPanel.common.delete')}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<FiTrash2 />}
                  onClick={onDelete}
                >
                  {t('wecsDetailsPanel.common.delete')}
                </Button>
              </Tooltip>
            )}
            <Tooltip title={t('wecsDetailsPanel.common.close')}>
              <IconButton
                onClick={handleClose}
                sx={{ color: theme === 'dark' ? '#B0B0B0' : '#6d7f8b' }}
              >
                <FiX />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
        <WecsDetailsTabs
          tabValue={tabValue}
          type={type}
          isDeploymentOrJobPod={isDeploymentOrJobPod}
          theme={theme}
          t={t}
          onTabChange={handleTabChange}
        />
        <Box sx={getContentBoxStyles(theme)}>
          {tabValue === 0 && (
            <SummaryTab
              type={type}
              resource={resource}
              clusterDetails={clusterDetails}
              resourceData={resourceData ?? null}
              theme={theme}
              t={t}
              calculateAge={calculateAge}
            />
          )}
          {tabValue === 1 && (
            <EditTab
              editFormat={editFormat}
              setEditFormat={setEditFormat}
              editedManifest={editedManifest}
              handleUpdate={handleUpdate}
              theme={theme}
              t={t}
              jsonToYaml={jsonToYaml}
              yamlToJson={yamlToJson}
              handleEditorChange={handleEditorChange}
              loadingManifest={loadingManifest}
            />
          )}
          {tabValue === 2 && type.toLowerCase() === 'pod' && (
            <LogsTab
              type={type}
              theme={theme}
              t={t}
              terminalRef={terminalRef}
              logsContainers={logsContainers}
              selectedLogsContainer={selectedLogsContainer}
              loadingLogsContainers={loadingLogsContainers}
              showPreviousLogs={showPreviousLogs}
              logs={logs}
              cluster={cluster}
              namespace={namespace}
              name={name}
              handleLogsContainerChange={handleLogsContainerChange}
              handlePreviousLogsToggle={handlePreviousLogsToggle}
              setIsLogsContainerSelectActive={() => {}}
            />
          )}
          {tabValue === 3 && type.toLowerCase() === 'pod' && (
            <ExecTab
              theme={theme}
              t={t}
              name={name}
              containers={execContainers}
              selectedContainer={selectedExecContainer}
              loadingContainers={loadingExecContainers}
              isTerminalMaximized={isExecTerminalMaximized}
              execTerminalRef={execTerminalRef}
              execTerminalKey={execTerminalKey}
              handleContainerChange={handleExecContainerChange}
              setIsContainerSelectActive={() => {}}
              setIsTerminalMaximized={setIsExecTerminalMaximized}
              clearTerminal={clearTerminal}
              cluster={cluster}
              namespace={namespace}
              type={type}
            />
          )}
        </Box>
        <Snackbar
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={handleSnackbarClose}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity={snackbarSeverity}
            sx={{
              width: '100%',
              backgroundColor: theme === 'dark' ? '#333' : '#fff',
              color: theme === 'dark' ? '#d4d4d4' : '#333',
            }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default WecsDetailsPanel;

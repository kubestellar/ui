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
  CircularProgress,
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
import { api, getWebSocketUrl } from '../../lib/api';
import * as YAML from 'yaml';
import { useClusterQueries } from '../../hooks/queries/useClusterQueries';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
  kind?: string;
  metadata?: {
    name?: string;
    namespace?: string;
    creationTimestamp?: string;
    labels?: Record<string, string>;
  };
  status?: {
    conditions?: Array<{ status?: string }>;
    phase?: string;
  };
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
  const { useUpdateClusterLabels } = useClusterQueries();
  const updateClusterLabelsMutation = useUpdateClusterLabels();
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(initialTab ?? 0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    'success' | 'error' | 'info' | 'warning'
  >('success');
  const terminalRef = useRef<HTMLDivElement>(null);
  const execTerminalRef = useRef<HTMLDivElement>(null);
  const [execTerminalKey] = useState<string>(`${cluster}-${namespace}-${name}`);

  // State for cluster details and resource data
  const [clusterDetails, setClusterDetails] = useState<ClusterDetails | null>(null);
  const [resource, setResource] = useState<ResourceInfo | null>(null);
  const [editFormat, setEditFormat] = useState<'yaml' | 'json'>('yaml');
  const [editedManifest, setEditedManifest] = useState<string>('');
  const [loadingManifest, setLoadingManifest] = useState<boolean>(false);

  // State for logs functionality
  const [logsContainers, setLogsContainers] = useState<ContainerInfo[]>([]);
  const [selectedLogsContainer, setSelectedLogsContainer] = useState<string>('');
  const [loadingLogsContainers, setLoadingLogsContainers] = useState<boolean>(false);
  const [showPreviousLogs, setShowPreviousLogs] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]); // Used by LogsTab internally

  // Missing state variables from original code
  const [isContainerSelectActive, setIsContainerSelectActive] = useState<boolean>(false);
  const [isLogsContainerSelectActive, setIsLogsContainerSelectActive] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  const wsParamsRef = useRef<{ cluster: string; namespace: string; pod: string } | null>(null);
  const hasShownConnectedMessageRef = useRef<boolean>(false);
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false);
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<string>('');
  const [loadingContainers, setLoadingContainers] = useState<boolean>(false);
  const previousNodeRef = useRef<{ name: string; namespace: string; type: string }>({
    name: '',
    namespace: '',
    type: '',
  });

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => setTabValue(newValue);
  const handleSnackbarClose = () => setSnackbarOpen(false);

  // React Query: Fetch manifest when Edit tab is open
  const isEditOpen = tabValue === 1 && isOpen && !!name && !!type;
  const resourceKey = [
    'wecs-manifest',
    type?.toLowerCase(),
    name,
    type?.toLowerCase() === 'cluster' ? '' : namespace,
    cluster || '',
  ];

  const {
    data: manifestQueryData,
    isLoading: manifestQueryLoading,
    error: manifestQueryError,
    refetch: refetchManifest,
  } = useQuery<string, Error>({
    queryKey: resourceKey,
    enabled: isEditOpen,
    staleTime: 30000,
    gcTime: 300000,
    queryFn: async () => {
      if (type.toLowerCase() === 'cluster') {
        const response = await api.get(`/api/cluster/details/${encodeURIComponent(name)}`);
        const clusterData = response.data;
        const formattedCluster = {
          apiVersion: 'v1',
          kind: 'Cluster',
          metadata: {
            name: clusterData.clusterName,
            creationTimestamp: clusterData.itsManagedClusters?.[0]?.creationTime,
            labels: clusterData.itsManagedClusters?.[0]?.labels || {},
          },
          spec: {
            context: clusterData.itsManagedClusters?.[0]?.context,
          },
        };
        return YAML.stringify(formattedCluster, { indent: 2 });
      }

      if (!namespace) {
        throw new Error('Namespace is required for non-cluster resources');
      }

      const response = await api.get(
        `/api/${type.toLowerCase()}/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`,
        { params: cluster ? { cluster } : {} }
      );

      if (response.data) {
        return YAML.stringify(response.data, { indent: 2 });
      }

      return resourceData ? YAML.stringify(resourceData, { indent: 2 }) : '';
    },
  });

  // Sync query state with local manifest loading state
  useEffect(() => {
    if (isEditOpen) {
      setLoadingManifest(manifestQueryLoading);
    }
  }, [isEditOpen, manifestQueryLoading]);

  useEffect(() => {
    if (manifestQueryData && isEditOpen) {
      setEditedManifest(manifestQueryData);
    }
  }, [manifestQueryData, isEditOpen]);

  useEffect(() => {
    if (manifestQueryError && isEditOpen) {
      setSnackbarMessage(t('wecsDetailsPanel.errors.failedLoadDetails', { type }));
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  }, [manifestQueryError, isEditOpen, t, type]);

  // Add a new effect to reset tab if logs tab is selected but unavailable
  useEffect(() => {
    // If the logs tab (index 2) is selected, but this is not a deployment/job pod, switch to summary tab
    if (tabValue === 2 && !(type.toLowerCase() === 'pod' && isDeploymentOrJobPod)) {
      setTabValue(0);
    }
  }, [tabValue, type, isDeploymentOrJobPod]);

  // Add a new effect to reset tab when node changes
  useEffect(() => {
    // Check if node identity has changed
    const isNewNode =
      previousNodeRef.current.name !== name ||
      previousNodeRef.current.namespace !== namespace ||
      previousNodeRef.current.type !== type;

    // Reset to initialTab or default to summary tab (0) if it's a new node
    if (isOpen && isNewNode) {
      setTabValue(initialTab ?? 0);
      // Update the reference to current node
      previousNodeRef.current = { name, namespace, type };
    }
  }, [name, namespace, type, isOpen, initialTab]);

  const handleClose = useCallback(() => {
    // Don't close if container selection is active
    if (isContainerSelectActive || isLogsContainerSelectActive) {
      return;
    }

    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 400);
  }, [isContainerSelectActive, isLogsContainerSelectActive, onClose]);

  // Add click outside handling
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (isOpen && !event.target) return;

      const target = event.target as Node;
      const panelElement = document.querySelector('[data-testid="wecs-details-panel"]');

      if (isOpen && panelElement && !panelElement.contains(target)) {
        handleClose();
      }
    },
    [isOpen, handleClose]
  );

  // Add keyboard shortcut handling
  const handleEsc = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    },
    [isOpen, handleClose]
  );

  // Add event listeners for click outside and escape key
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, handleClickOutside, handleEsc]);

  // Add manifest update event listener
  useEffect(() => {
    const handleManifestUpdate = () => {
      // Refresh manifest data when manifest is updated
      if (tabValue === 1) {
        // Trigger a re-fetch of the manifest
        const fetchResourceManifest = async () => {
          if (!name || !type) return;

          setLoadingManifest(true);
          try {
            let manifestData: string;

            if (type.toLowerCase() === 'cluster') {
              const response = await api.get(`/api/cluster/${encodeURIComponent(name)}`);
              manifestData = response.data
                ? JSON.stringify(response.data, null, 2)
                : t('wecsDetailsPanel.noManifest');
            } else {
              if (!namespace) {
                setError(t('wecsDetailsPanel.errors.namespaceRequired'));
                return;
              }
              const response = await api.get(
                `/api/${type.toLowerCase()}/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`,
                { params: cluster ? { cluster } : {} }
              );
              manifestData = response.data
                ? JSON.stringify(response.data, null, 2)
                : t('wecsDetailsPanel.noManifest');
            }

            setEditedManifest(manifestData);
            setError(null);
          } catch (error) {
            console.error('Failed to refresh manifest:', error);
            setError(t('wecsDetailsPanel.errors.failedLoadDetails', { type }));
          } finally {
            setLoadingManifest(false);
          }
        };

        fetchResourceManifest();
      }
    };

    window.addEventListener('manifest-updated', handleManifestUpdate);

    return () => {
      window.removeEventListener('manifest-updated', handleManifestUpdate);
    };
  }, [tabValue, name, type, namespace, cluster, t]);

  // Calculate age function
  const calculateAge = useCallback(
    (creationTimestamp: string | undefined): string => {
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
    },
    [t]
  );

  // Handle resource data and cluster details
  useEffect(() => {
    // Reset states when panel closes
    if (!isOpen) {
      setResource(null);
      setClusterDetails(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Handle cluster details
    if (type.toLowerCase() === 'cluster') {
      const fetchClusterDetails = async () => {
        try {
          const response = await api.get(`/api/cluster/details/${encodeURIComponent(name)}`);
          const data = response.data;
          setClusterDetails(data);

          // Also create a manifest representation for the edit tab
          const creationTime =
            data.itsManagedClusters && data.itsManagedClusters.length > 0
              ? data.itsManagedClusters[0].creationTime
              : new Date().toISOString();

          const clusterManifest = {
            apiVersion: 'v1',
            kind: 'Cluster',
            metadata: {
              name: data.clusterName,
              creationTimestamp: creationTime,
              labels:
                data.itsManagedClusters && data.itsManagedClusters.length > 0
                  ? data.itsManagedClusters[0].labels
                  : {},
            },
            spec: {
              context:
                data.itsManagedClusters && data.itsManagedClusters.length > 0
                  ? data.itsManagedClusters[0].context
                  : '',
            },
          };

          const resourceInfo: ResourceInfo = {
            name: data.clusterName,
            namespace: '',
            kind: 'Cluster',
            createdAt: creationTime,
            age: calculateAge(creationTime),
            status: t('wecsDetailsPanel.cluster.active'),
            manifest: JSON.stringify(clusterManifest, null, 2),
          };

          setResource(resourceInfo);
          setEditedManifest(resourceInfo.manifest);
          setError(null);
        } catch (err) {
          console.error(`Error fetching cluster details:`, err);
          setError(t('wecsDetailsPanel.errors.failedLoadClusterDetails'));
        } finally {
          setLoading(false);
        }
      };

      fetchClusterDetails();
      return;
    }

    // Handle pod details (original logic)
    if (type.toLowerCase() === 'pod') {
      const fetchResourceManifest = async () => {
        try {
          const kind = resourceData?.kind ?? type;
          const manifestData = resourceData
            ? JSON.stringify(resourceData, null, 2)
            : t('wecsDetailsPanel.noManifest');
          const resourceInfo: ResourceInfo = {
            name: resourceData?.metadata?.name ?? name,
            namespace: resourceData?.metadata?.namespace ?? namespace,
            kind: kind,
            createdAt: resourceData?.metadata?.creationTimestamp ?? t('wecsDetailsPanel.common.na'),
            age: calculateAge(resourceData?.metadata?.creationTimestamp),
            status:
              resourceData?.status?.conditions?.[0]?.status ??
              resourceData?.status?.phase ??
              t('wecsDetailsPanel.common.unknown'),
            manifest: manifestData,
          };

          setResource(resourceInfo);
          setEditedManifest(resourceInfo.manifest);
          setError(null);
        } catch (err) {
          console.error(`Error processing ${type} details:`, err);
          setError(t('wecsDetailsPanel.errors.failedLoadDetails', { type }));
        } finally {
          setLoading(false);
        }
      };

      fetchResourceManifest();
      return;
    }

    // Handle other resource types
    try {
      const kind = resourceData?.kind ?? type;
      const manifestData = resourceData
        ? JSON.stringify(resourceData, null, 2)
        : t('wecsDetailsPanel.noManifest');
      const resourceInfo: ResourceInfo = {
        name: resourceData?.metadata?.name ?? name,
        namespace: resourceData?.metadata?.namespace ?? namespace,
        kind: kind,
        createdAt: resourceData?.metadata?.creationTimestamp ?? t('wecsDetailsPanel.common.na'),
        age: calculateAge(resourceData?.metadata?.creationTimestamp),
        status:
          resourceData?.status?.conditions?.[0]?.status ??
          resourceData?.status?.phase ??
          t('wecsDetailsPanel.common.unknown'),
        manifest: manifestData,
      };

      setResource(resourceInfo);
      setEditedManifest(resourceInfo.manifest);
      setError(null);
    } catch (err) {
      console.error(`Error processing ${type} details:`, err);
      setError(t('wecsDetailsPanel.errors.failedLoadDetails', { type }));
    } finally {
      setLoading(false);
    }
  }, [namespace, name, type, resourceData, cluster, isOpen, t, calculateAge]);

  // Fetch containers for pods when component mounts
  useEffect(() => {
    const fetchContainers = async () => {
      if (type.toLowerCase() === 'pod' && name && namespace && cluster) {
        setLoadingLogsContainers(true);
        setLoadingContainers(true);
        try {
          const response = await api.get(
            `/list/container/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}?context=${encodeURIComponent(cluster)}`
          );
          if (response.data && response.data.data) {
            const containers = response.data.data;
            setLogsContainers(containers);
            setContainers(containers);

            // Auto-select first container if available
            if (containers.length > 0) {
              setSelectedLogsContainer(containers[0].ContainerName);
              setSelectedContainer(containers[0].ContainerName);
            }
          }
        } catch (error) {
          console.error('Failed to fetch containers:', error);
          setSnackbarMessage('Failed to fetch container list');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
        } finally {
          setLoadingLogsContainers(false);
          setLoadingContainers(false);
        }
      }
    };

    if (isOpen) {
      fetchContainers();
    }
  }, [type, name, namespace, cluster, isOpen]);

  // Keep effect as a safety net but prefer React Query data
  useEffect(() => {
    if (tabValue !== 1 || !isOpen || !name || !type) return;
    // If React Query already provided data, skip manual fetching
    if (manifestQueryData || manifestQueryLoading) return;
    // Otherwise, retain existing fallback minimal manifest behavior
    if (!editedManifest) {
      const fallback = resourceData
        ? YAML.stringify(resourceData, { indent: 2 })
        : YAML.stringify(
            {
              apiVersion: 'v1',
              kind: type,
              metadata: {
                name: name,
                namespace: namespace || 'default',
              },
              spec: {},
              status: {},
            },
            { indent: 2 }
          );
      setEditedManifest(fallback);
    }
  }, [tabValue, isOpen, name, namespace, type, manifestQueryData, manifestQueryLoading, editedManifest, resourceData]);

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

  // React Query mutation for manifest update
  const updateManifestMutation = useMutation({
    mutationFn: async ({ endpoint, method, manifestData, params }: { endpoint: string; method: 'PUT' | 'PATCH'; manifestData: unknown; params: Record<string, string> }) => {
      return api.request({ method, url: endpoint, data: manifestData, params, headers: { 'Content-Type': 'application/json' } });
    },
    onSuccess: () => {
      setSnackbarMessage(t('wecsDetailsPanel.success.manifestUpdated'));
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      queryClient.invalidateQueries({ queryKey: resourceKey });
      // Trigger the legacy event for listeners
      const event = new Event('manifest-updated');
      window.dispatchEvent(event);
      // Also refetch via hook
      refetchManifest();
    },
  });

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

      // Special handling for cluster resources
      if (type.toLowerCase() === 'cluster') {
        let labels = {};
        try {
          // Extract all labels from the manifest
          labels = manifestData?.metadata?.labels || {};
        } catch {
          setSnackbarMessage('Invalid manifest format');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          return;
        }

        try {
          await updateClusterLabelsMutation.mutateAsync({
            contextName: manifestData.spec?.context || 'its1',
            clusterName: manifestData.metadata.name,
            labels, // send ALL labels
          });
          setSnackbarMessage('Cluster labels updated successfully');
          setSnackbarSeverity('success');
          setSnackbarOpen(true);
          return;
        } catch (error: unknown) {
          let message = 'Failed to update cluster labels';
          if (
            error &&
            typeof error === 'object' &&
            'message' in error &&
            typeof (error as { message?: string }).message === 'string'
          ) {
            message = (error as { message?: string }).message as string;
          }
          setSnackbarMessage(message);
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          return;
        }
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
      const params: Record<string, string> = cluster ? { cluster } : {};

      // Execute mutation (preserves behavior, adds caching benefits)
      await updateManifestMutation.mutateAsync({ endpoint, method, manifestData, params });
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
  }, [
    editedManifest,
    editFormat,
    type,
    name,
    namespace,
    cluster,
    t,
    updateClusterLabelsMutation,
    updateManifestMutation,
  ]);

  // Convert to useCallback to memoize it
  const connectWebSocket = useCallback(() => {
    if (!wsParamsRef.current || !isOpen) return;

    const { cluster, namespace, pod } = wsParamsRef.current;
    // Build WebSocket URL with container and previous logs parameters
    let wsUrl = getWebSocketUrl(`/ws/logs?cluster=${cluster}&namespace=${namespace}&pod=${pod}`);

    // Add container parameter if selected
    if (selectedLogsContainer) {
      wsUrl += `&container=${encodeURIComponent(selectedLogsContainer)}`;
    }

    // Add previous parameter if showPreviousLogs is true
    if (showPreviousLogs) {
      wsUrl += `&previous=true`;
    }

    setLogs(prev => [
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
      setLogs(prev => [
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
      setLogs(prev => [...prev, ...messageLog]);
    };

    socket.onerror = event => {
      setLogs(prev => [
        ...prev,
        `\x1b[31m[Error] WebSocket Connection Failed\x1b[0m`,
        `Details: ${JSON.stringify(event)}`,
        `Timestamp: ${new Date().toISOString()}`,
        `-----------------------------------`,
      ]);
    };

    socket.onclose = () => {
      setLogs(prev => [
        ...prev,
        `\x1b[31m[Closed] WebSocket Connection Terminated\x1b[0m`,
        `Timestamp: ${new Date().toISOString()}`,
        `-----------------------------------`,
      ]);
      wsRef.current = null;
    };
  }, [isOpen, selectedLogsContainer, showPreviousLogs]); // Add new dependencies

  // Initialize WebSocket connection only once when the panel opens
  useEffect(() => {
    if (!isOpen || type.toLowerCase() !== 'pod') {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setLogs([]);
      hasShownConnectedMessageRef.current = false;
      return;
    }

    // Close existing connection if container or previous logs selection changes
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (wsParamsRef.current) {
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isOpen, type, connectWebSocket, selectedLogsContainer, showPreviousLogs]); // Add new dependencies

  // Handle logs container change
  const handleLogsContainerChange = useCallback((event: SelectChangeEvent<string>) => {
    setSelectedLogsContainer(event.target.value);
  }, []);

  // Handle container selection change
  const handleContainerChange = (event: SelectChangeEvent<string>) => {
    // Just use stopPropagation without checking for nativeEvent
    event.stopPropagation();

    // Set the selected container
    setSelectedContainer(event.target.value);
  };

  // Handle previous logs toggle
  const handlePreviousLogsToggle = () => {
    setShowPreviousLogs(!showPreviousLogs);
  };

  // Also make sure the container is still selected after switching tabs
  useEffect(() => {
    // If we're going to the exec tab and we have containers but no container selected,
    // select the first one
    if (
      tabValue === 3 &&
      type.toLowerCase() === 'pod' &&
      containers.length > 0 &&
      !selectedContainer
    ) {
      setSelectedContainer(containers[0].ContainerName);
    }
  }, [tabValue, type, containers, selectedContainer]);

  // Add a useEffect that resets container selection when the pod changes
  useEffect(() => {
    // Reset container selection and containers list when pod changes
    if (type.toLowerCase() === 'pod') {
      // console.log(`Pod changed to ${name}, resetting container selection`);
      setSelectedContainer('');
      setContainers([]);
    }
  }, [name, type]);

  // Add a useEffect that resets logs container selection when the pod changes
  useEffect(() => {
    // Reset logs container selection and containers list when pod changes
    if (type.toLowerCase() === 'pod') {
      // console.log(`Pod changed to ${name}, resetting logs container selection`);
      setSelectedLogsContainer('');
      setLogsContainers([]);
      setShowPreviousLogs(false);
    }
  }, [name, type]);

  return (
    <Box
      sx={getPanelStyles(theme, isOpen)}
      onClick={e => e.stopPropagation()}
      data-testid="wecs-details-panel"
    >
      {isClosing ? (
        <Box sx={{ height: '100%', width: '100%' }} />
      ) : loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
          <Alert severity="error">{error}</Alert>
        </Box>
      ) : (
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
                isOpen={isOpen}
                handleLogsContainerChange={handleLogsContainerChange}
                handlePreviousLogsToggle={handlePreviousLogsToggle}
                setIsLogsContainerSelectActive={setIsLogsContainerSelectActive}
              />
            )}
            {tabValue === 3 && type.toLowerCase() === 'pod' && (
              <ExecTab
                theme={theme}
                t={t}
                name={name}
                containers={containers}
                selectedContainer={selectedContainer}
                loadingContainers={loadingContainers}
                isTerminalMaximized={isTerminalMaximized}
                execTerminalRef={execTerminalRef}
                execTerminalKey={execTerminalKey}
                handleContainerChange={handleContainerChange}
                setIsContainerSelectActive={setIsContainerSelectActive}
                setIsTerminalMaximized={setIsTerminalMaximized}
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
      )}
    </Box>
  );
};

export default WecsDetailsPanel;

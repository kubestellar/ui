import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Table,
  TableRow,
  TableCell,
  TableBody,
  Alert,
  CircularProgress,
  Tooltip,
  Button,
  Stack,
  Snackbar,
  styled,
  Chip,
  Select,
  MenuItem,
  FormControl,
  SelectChangeEvent,
} from '@mui/material';
import { FiX, FiGitPullRequest, FiTrash2, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import Editor from '@monaco-editor/react';
import jsyaml from 'js-yaml';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { ResourceItem } from './TreeViewComponent';
import useTheme from '../stores/themeStore';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { api, getWebSocketUrl } from '../lib/api';

interface WecsDetailsProps {
  namespace: string;
  name: string;
  type: string;
  resourceData?: ResourceItem;
  onClose: () => void;
  isOpen: boolean;
  onSync?: () => void;
  onDelete?: () => void;
  initialTab?: number;
  cluster: string;
  isDeploymentOrJobPod?: boolean;
}

interface ResourceInfo {
  name: string;
  namespace: string;
  kind: string;
  createdAt: string;
  age: string;
  status: string;
  manifest: string;
}

interface ClusterDetails {
  clusterName: string;
  contexts: { name: string; cluster: string }[] | null;
  itsManagedClusters: {
    name: string;
    labels: Record<string, string>;
    creationTime: string;
    context: string;
  }[];
}

interface ContainerInfo {
  ContainerName: string;
  Image: string;
}

const StyledTab = styled(Tab)(({ theme }) => {
  const appTheme = useTheme(state => state.theme);
  return {
    textTransform: 'none',
    fontWeight: 500,
    fontSize: '0.8rem',
    color: appTheme === 'dark' ? '#d4d4d4' : theme.palette.grey[600],
    padding: '10px 17px',
    minHeight: '40px',
    marginLeft: '16px',
    marginTop: '4px',
    borderRadius: '12px 12px 12px 12px',
    border: '1px solid transparent',
    transition: 'background-color 0.2s ease, border-color 0.2s ease',
    '&.Mui-selected': {
      color: '#1976d2',
      fontWeight: 600,
      border: '1px solid rgba(25, 118, 210, 0.7)',
      boxShadow: `
        -2px 0 6px rgba(47, 134, 255, 0.2),
        2px 0 6px rgba(47, 134, 255, 0.2),
        0 -2px 6px rgba(47, 134, 255, 0.2),
        0 2px 6px rgba(47, 134, 255, 0.2)
      `,
      zIndex: 1,
      position: 'relative',
    },
    '&:hover': {
      backgroundColor: appTheme === 'dark' ? '#333' : '#f4f4f4',
      border: appTheme === 'dark' ? '1px solid #444' : '1px solid rgba(0, 0, 0, 0.1)',
    },
  };
});

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
  const theme = useTheme(state => state.theme);
  const [resource, setResource] = useState<ResourceInfo | null>(null);
  const [clusterDetails, setClusterDetails] = useState<ClusterDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(initialTab ?? 0);
  const [isClosing, setIsClosing] = useState(false);
  const [editFormat, setEditFormat] = useState<'yaml' | 'json'>('yaml');
  const [editedManifest, setEditedManifest] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const panelRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const wsParamsRef = useRef<{ cluster: string; namespace: string; pod: string } | null>(null);
  const hasShownConnectedMessageRef = useRef<boolean>(false);
  const execTerminalRef = useRef<HTMLDivElement>(null);
  const execTerminalInstance = useRef<Terminal | null>(null);
  const execSocketRef = useRef<WebSocket | null>(null);
  const currentPodRef = useRef<string | null>(null);
  const [execTerminalKey, setExecTerminalKey] = useState<string>(`${cluster}-${namespace}-${name}`);
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false);
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<string>('');
  const [loadingContainers, setLoadingContainers] = useState<boolean>(false);
  const [isContainerSelectActive, setIsContainerSelectActive] = useState<boolean>(false);
  // Track the previous node to detect node changes
  const previousNodeRef = useRef<{ name: string; namespace: string; type: string }>({
    name: '',
    namespace: '',
    type: '',
  });

  useEffect(() => {
    if (isOpen && initialTab !== undefined) {
      setTabValue(initialTab);
    }
  }, [isOpen, initialTab]);

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

  useEffect(() => {
    // Reset states when panel closes
    if (!isOpen) {
      setResource(null);
      setClusterDetails(null);
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
            status: 'Active',
            manifest: JSON.stringify(clusterManifest, null, 2),
          };

          setResource(resourceInfo);
          setEditedManifest(resourceInfo.manifest);
          setError(null);
        } catch (err) {
          console.error(`Error fetching cluster details:`, err);
          setError(`Failed to load cluster details.`);
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
            : 'No manifest available';
          const resourceInfo: ResourceInfo = {
            name: resourceData?.metadata?.name ?? name,
            namespace: resourceData?.metadata?.namespace ?? namespace,
            kind: kind,
            createdAt: resourceData?.metadata?.creationTimestamp ?? 'N/A',
            age: calculateAge(resourceData?.metadata?.creationTimestamp),
            status:
              resourceData?.status?.conditions?.[0]?.status ??
              resourceData?.status?.phase ??
              'Unknown',
            manifest: manifestData,
          };

          setResource(resourceInfo);
          setEditedManifest(resourceInfo.manifest);
          setError(null);

          wsParamsRef.current = {
            cluster: cluster,
            namespace: namespace,
            pod: resourceInfo.name,
          };
        } catch (err) {
          console.error(`Error processing ${type} details:`, err);
          setError(`Failed to load ${type} details.`);
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
        : 'No manifest available';
      const resourceInfo: ResourceInfo = {
        name: resourceData?.metadata?.name ?? name,
        namespace: resourceData?.metadata?.namespace ?? namespace,
        kind: kind,
        createdAt: resourceData?.metadata?.creationTimestamp ?? 'N/A',
        age: calculateAge(resourceData?.metadata?.creationTimestamp),
        status:
          resourceData?.status?.conditions?.[0]?.status ?? resourceData?.status?.phase ?? 'Unknown',
        manifest: manifestData,
      };

      setResource(resourceInfo);
      setEditedManifest(resourceInfo.manifest);
      setError(null);
    } catch (err) {
      console.error(`Error processing ${type} details:`, err);
      setError(`Failed to load ${type} details.`);
    } finally {
      setLoading(false);
    }
  }, [namespace, name, type, resourceData, cluster, isOpen]);

  // Convert to useCallback to memoize it
  const connectWebSocket = useCallback(() => {
    if (!wsParamsRef.current || !isOpen) return;

    const { cluster, namespace, pod } = wsParamsRef.current;
    const wsUrl = getWebSocketUrl(`/ws/logs?cluster=${cluster}&namespace=${namespace}&pod=${pod}`);

    setLogs(prev => [
      ...prev,
      `\x1b[33m[Connecting] WebSocket Request\x1b[0m`,
      `URL: ${wsUrl}`,
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
  }, [isOpen]); // Add isOpen as dependency

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

    if (!wsRef.current && wsParamsRef.current) {
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isOpen, type, connectWebSocket]); // Add connectWebSocket to dependencies

  useEffect(() => {
    // Only initialize terminal if needed and if it doesn't exist yet
    if (!terminalRef.current || type.toLowerCase() !== 'pod' || tabValue !== 2) return;

    // Skip re-initialization if terminal already exists
    if (terminalInstance.current) {
      // Update existing terminal with latest logs instead of re-creating it
      const term = terminalInstance.current;
      const lastLogIndex = term.buffer.active.length - 1; // Approximate last written log
      const newLogs = logs.slice(lastLogIndex > 0 ? lastLogIndex : 0);
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
    logs.forEach(log => {
      term.writeln(log);
    });

    return () => {
      term.dispose();
      terminalInstance.current = null;
    };
  }, [tabValue, theme, type, logs]); // Add logs as dependency with logic to prevent re-initialization

  // Add a useEffect to clean up exec terminal when pod changes or panel closes
  useEffect(() => {
    // This effect runs whenever the pod (name) or visibility (isOpen) changes
    if (currentPodRef.current !== name || !isOpen) {
      // Clean up existing exec terminal resources
      if (execSocketRef.current) {
        // console.log(`Closing exec socket for previous pod: ${currentPodRef.current}`);
        execSocketRef.current.close();
        execSocketRef.current = null;
      }

      if (execTerminalInstance.current) {
        // console.log(`Disposing exec terminal for previous pod: ${currentPodRef.current}`);
        execTerminalInstance.current.dispose();
        execTerminalInstance.current = null;
      }

      // Update current pod reference
      currentPodRef.current = isOpen ? name : null;
    }
  }, [name, isOpen]);

  // Add useEffect to fetch containers for the current pod when in exec tab
  useEffect(() => {
    // Only fetch containers when the exec tab is active and for pod resources
    if (tabValue !== 3 || type.toLowerCase() !== 'pod' || !isOpen) return;

    const fetchContainers = async () => {
      setLoadingContainers(true);
      try {
        // console.log(`Fetching containers for pod: ${name}`);
        const response = await api.get(
          `/list/container/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}?context=${encodeURIComponent(cluster)}`
        );
        if (response.data && response.data.data) {
          setContainers(response.data.data);
          // Set the first container as selected by default if available
          if (response.data.data.length > 0) {
            // console.log(`Setting default container to: ${response.data.data[0].ContainerName}`);
            setSelectedContainer(response.data.data[0].ContainerName);
          }
        }
      } catch (error) {
        console.error('Failed to fetch containers:', error);
        setSnackbarMessage('Failed to fetch container list');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      } finally {
        setLoadingContainers(false);
      }
    };

    fetchContainers();
  }, [tabValue, namespace, name, cluster, type, isOpen]);

  // Modify the terminal key update to include the selected container
  useEffect(() => {
    if (type.toLowerCase() === 'pod') {
      const newKey = `${cluster}-${namespace}-${name}-${selectedContainer}-${Date.now()}`;
      // console.log(`Updating exec terminal key: ${newKey}`);
      setExecTerminalKey(newKey);
    }
  }, [cluster, namespace, name, type, selectedContainer]);

  // Handle container selection change
  const handleContainerChange = (event: SelectChangeEvent<string>) => {
    // Just use stopPropagation without checking for nativeEvent
    event.stopPropagation();

    // Set the selected container
    setSelectedContainer(event.target.value);
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

  // Add the Exec terminal initialization - modified to use selectedContainer
  useEffect(() => {
    // Only initialize exec terminal when the exec tab is active
    if (!execTerminalRef.current || type.toLowerCase() !== 'pod' || tabValue !== 3) return;

    // console.log(`Initializing exec terminal for pod: ${name}, container: ${selectedContainer}, key: ${execTerminalKey}`);

    // Always clean up previous terminal when switching to the exec tab
    if (execTerminalInstance.current) {
      // console.log(`Disposing previous exec terminal for pod: ${currentPodRef.current}`);
      execTerminalInstance.current.dispose();
      execTerminalInstance.current = null;
    }

    if (execSocketRef.current) {
      // console.log(`Closing previous exec socket for pod: ${currentPodRef.current}`);
      execSocketRef.current.close();
      execSocketRef.current = null;
    }

    // Small delay to ensure the DOM is ready with the new terminal div
    setTimeout(() => {
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
        // console.log(`Terminal opened successfully for pod: ${name}`);

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

      execTerminalInstance.current = term;

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
      execSocketRef.current = socket;

      socket.onopen = () => {
        // console.log(`WebSocket connection established for pod: ${name}, container: ${containerName}`);
        // Completely clear the terminal once connected
        term.reset();
        term.clear();
        term.writeln(`\x1b[32mConnected to pod shell in container ${containerName}\x1b[0m`);
        term.writeln('');
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
          // console.log(`Received raw message: ${event.data}`);
          term.writeln(event.data);
        }
      };

      socket.onerror = error => {
        console.error('WebSocket error:', error);
        term.writeln(`\x1b[31mError connecting to pod. Please try again.\x1b[0m`);
      };

      socket.onclose = event => {
        // console.log(`WebSocket closed for pod ${name}:`, event);
        if (event.code !== 1000 && event.code !== 1001) {
          term.writeln(`\x1b[31mConnection closed\x1b[0m`);
        }
        execSocketRef.current = null;
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

      return () => {
        // console.log(`Cleaning up exec terminal resources for pod: ${name}`);
        clearInterval(pingInterval);

        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.close();
        }

        execSocketRef.current = null;

        if (term) {
          term.dispose();
        }

        execTerminalInstance.current = null;
      };
    }, 50); // Small delay to ensure DOM is ready
  }, [
    tabValue,
    theme,
    type,
    name,
    namespace,
    cluster,
    resourceData,
    execTerminalKey,
    selectedContainer,
  ]); // Added selectedContainer as dependency

  // Add a useEffect that resets container selection when the pod changes
  useEffect(() => {
    // Reset container selection and containers list when pod changes
    if (type.toLowerCase() === 'pod') {
      // console.log(`Pod changed to ${name}, resetting container selection`);
      setSelectedContainer('');
      setContainers([]);
    }
  }, [name, type]);

  const calculateAge = (creationTimestamp: string | undefined): string => {
    if (!creationTimestamp) return 'N/A';
    const createdDate = new Date(creationTimestamp);
    const currentDate = new Date();
    const diffMs = currentDate.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `${diffDays} days ago` : 'Today';
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const jsonToYaml = (jsonString: string) => {
    try {
      const jsonObj = JSON.parse(jsonString);
      return jsyaml.dump(jsonObj, { indent: 2 });
    } catch (error) {
      console.log(error);
      return jsonString;
    }
  };

  const yamlToJson = (yamlString: string) => {
    try {
      const yamlObj = jsyaml.load(yamlString);
      return JSON.stringify(yamlObj, null, 2);
    } catch (error) {
      console.log(error);
      return yamlString;
    }
  };

  const handleClose = () => {
    // Don't close if container selection is active
    if (isContainerSelectActive) {
      // console.log("Container select is active, preventing panel close");
      return;
    }

    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 400);
  };

  const handleFormatChange = (format: 'yaml' | 'json') => {
    if (editFormat === 'yaml' && format === 'json') {
      const jsonContent = yamlToJson(editedManifest);
      setEditedManifest(jsonContent);
    } else if (editFormat === 'json' && format === 'yaml') {
      const yamlContent = jsonToYaml(editedManifest);
      setEditedManifest(yamlContent);
    }
    setEditFormat(format);
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditedManifest(value);
    }
  };

  const handleUpdate = async () => {
    if (!resource) return;

    const resourceName = resource.name;

    setSnackbarMessage(`API not implemented for updating pod "${resourceName}"`);
    setSnackbarSeverity('error');
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const renderSummary = () => {
    if (type.toLowerCase() === 'cluster' && clusterDetails) {
      // Render cluster-specific information
      const clusterInfo =
        clusterDetails.itsManagedClusters && clusterDetails.itsManagedClusters.length > 0
          ? clusterDetails.itsManagedClusters[0]
          : null;

      return (
        <Box>
          <Table sx={{ borderRadius: 1, mb: 2 }}>
            <TableBody>
              {[
                { label: 'KIND', value: 'Cluster' },
                { label: 'NAME', value: clusterDetails.clusterName },
                { label: 'CONTEXT', value: clusterInfo?.context || 'Unknown' },
                {
                  label: 'CREATED AT',
                  value: clusterInfo
                    ? `${new Date(clusterInfo.creationTime).toLocaleString()} (${calculateAge(clusterInfo.creationTime)})`
                    : 'Unknown',
                },
              ].map((row, index) => (
                <TableRow key={index}>
                  <TableCell
                    sx={{
                      borderBottom: theme === 'dark' ? '1px solid #444' : '1px solid #e0e0e0',
                      color: theme === 'dark' ? '#D4D4D4' : '#333333',
                      fontSize: '14px',
                      fontWeight: 500,
                      width: '150px',
                      padding: '10px 16px',
                    }}
                  >
                    {row.label}
                  </TableCell>
                  <TableCell
                    sx={{
                      borderBottom: theme === 'dark' ? '1px solid #444' : '1px solid #e0e0e0',
                      color: theme === 'dark' ? '#D4D4D4' : '#333333',
                      fontSize: '14px',
                      padding: '10px 16px',
                    }}
                  >
                    {row.value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Display cluster labels if available */}
          {clusterInfo && clusterInfo.labels && Object.keys(clusterInfo.labels).length > 0 && (
            <Table sx={{ borderRadius: 1 }}>
              <TableBody>
                <TableRow>
                  <TableCell
                    sx={{
                      borderBottom: theme === 'dark' ? '1px solid #444' : '1px solid #e0e0e0',
                      color: theme === 'dark' ? '#D4D4D4' : '#333333',
                      fontSize: '14px',
                      fontWeight: 500,
                      width: '150px',
                      padding: '10px 16px',
                      verticalAlign: 'top',
                    }}
                  >
                    LABELS
                  </TableCell>
                  <TableCell
                    sx={{
                      borderBottom: theme === 'dark' ? '1px solid #444' : '1px solid #e0e0e0',
                      color: theme === 'dark' ? '#D4D4D4' : '#333333',
                      fontSize: '14px',
                      padding: '10px 16px',
                    }}
                  >
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {clusterInfo.labels &&
                        Object.entries(clusterInfo.labels).map(([key, value], index) => (
                          <Chip
                            key={index}
                            label={`${key}: ${value}`}
                            size="small"
                            sx={{
                              mr: 1,
                              mb: 1,
                              backgroundColor: theme === 'dark' ? '#334155' : undefined,
                              color: theme === 'dark' ? '#fff' : undefined,
                            }}
                          />
                        ))}
                    </Box>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </Box>
      );
    }

    // Original resource rendering for non-cluster types
    if (!resource) return null;

    // Create a basic summary table for any resource
    const summaryTable = (
      <Table sx={{ borderRadius: 1 }}>
        <TableBody>
          {[
            { label: 'KIND', value: resource.kind },
            { label: 'NAME', value: resource.name },
            { label: 'NAMESPACE', value: resource.namespace },
            { label: 'CREATED AT', value: `${resource.createdAt} (${resource.age})` },
          ].map((row, index) => (
            <TableRow key={index}>
              <TableCell
                sx={{
                  borderBottom: theme === 'dark' ? '1px solid #444' : '1px solid #e0e0e0',
                  color: theme === 'dark' ? '#D4D4D4' : '#333333',
                  fontSize: '14px',
                  fontWeight: 500,
                  width: '150px',
                  padding: '10px 16px',
                }}
              >
                {row.label}
              </TableCell>
              <TableCell
                sx={{
                  borderBottom: theme === 'dark' ? '1px solid #444' : '1px solid #e0e0e0',
                  color: theme === 'dark' ? '#D4D4D4' : '#333333',
                  fontSize: '14px',
                  padding: '10px 16px',
                }}
              >
                {row.value}
              </TableCell>
            </TableRow>
          ))}
          {resourceData?.metadata?.labels &&
            Object.keys(resourceData.metadata.labels).length > 0 && (
              <TableRow>
                <TableCell
                  sx={{
                    borderBottom: theme === 'dark' ? '1px solid #444' : '1px solid #e0e0e0',
                    color: theme === 'dark' ? '#D4D4D4' : '#333333',
                    fontSize: '14px',
                    fontWeight: 500,
                    width: '150px',
                    padding: '10px 16px',
                    verticalAlign: 'top',
                  }}
                >
                  LABELS
                </TableCell>
                <TableCell
                  sx={{
                    borderBottom: theme === 'dark' ? '1px solid #444' : '1px solid #e0e0e0',
                    color: theme === 'dark' ? '#D4D4D4' : '#333333',
                    fontSize: '14px',
                    padding: '10px 16px',
                  }}
                >
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {resourceData.metadata.labels &&
                      Object.entries(resourceData.metadata.labels).map(([key, value], index) => (
                        <Chip
                          key={index}
                          label={`${key}: ${value}`}
                          size="small"
                          sx={{
                            mr: 1,
                            mb: 1,
                            backgroundColor: theme === 'dark' ? '#334155' : undefined,
                            color: theme === 'dark' ? '#fff' : undefined,
                          }}
                        />
                      ))}
                  </Box>
                </TableCell>
              </TableRow>
            )}
        </TableBody>
      </Table>
    );

    return summaryTable;
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        right: isOpen ? 0 : '-80vw',
        top: 0,
        bottom: 0,
        width: '80vw',
        bgcolor: theme === 'dark' ? '#1F2937' : '#eff3f5',
        boxShadow: '-2px 0 10px rgba(0,0,0,0.2)',
        transition: 'right 0.4s ease-in-out',
        zIndex: 1001,
        overflowY: 'auto',
        borderTopLeftRadius: '8px',
        borderBottomLeftRadius: '8px',
      }}
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        // Stop propagation for all clicks in the panel
        e.stopPropagation();
      }}
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
      ) : (resource || clusterDetails) && isOpen ? (
        <Box ref={panelRef} sx={{ p: 4, height: '100%' }}>
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
                <Tooltip title="Sync Resource">
                  <Button
                    variant="contained"
                    startIcon={<FiGitPullRequest />}
                    onClick={onSync}
                    sx={{
                      bgcolor: '#00b4d8',
                      '&:hover': { bgcolor: '#009bbd' },
                    }}
                  >
                    Sync
                  </Button>
                </Tooltip>
              )}
              {onDelete && (
                <Tooltip title="Delete Resource">
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<FiTrash2 />}
                    onClick={onDelete}
                    sx={{ ml: 1 }}
                  >
                    Delete
                  </Button>
                </Tooltip>
              )}
              <Tooltip title="Close">
                <IconButton
                  onClick={handleClose}
                  sx={{ color: theme === 'dark' ? '#B0B0B0' : '#6d7f8b' }}
                >
                  <FiX />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{
              mt: 2,
              '.MuiTabs-indicator': {
                display: 'none',
              },
              '& .MuiTab-root': {
                color: theme === 'dark' ? '#fff' : '#333',
              },
            }}
          >
            <StyledTab
              label={
                <span>
                  <i className="fa fa-file-alt" style={{ marginRight: '8px' }}></i>SUMMARY
                </span>
              }
            />
            <StyledTab
              label={
                <span>
                  <i className="fa fa-edit" style={{ marginRight: '8px' }}></i>EDIT
                </span>
              }
            />
            {/* Only show logs tab for deployment/job pods */}
            {type.toLowerCase() === 'pod' &&
              isDeploymentOrJobPod &&
              type.toLowerCase() !== 'cluster' && (
                <StyledTab
                  label={
                    <span>
                      <i className="fa fa-align-left" style={{ marginRight: '8px' }}></i>LOGS
                    </span>
                  }
                />
              )}
            {/* Only show Exec Pods tab for pod resources */}
            {type.toLowerCase() === 'pod' && (
              <StyledTab
                label={
                  <span>
                    <i className="fa fa-terminal" style={{ marginRight: '8px' }}></i>EXEC PODS
                  </span>
                }
              />
            )}
          </Tabs>

          <Box
            sx={{
              backgroundColor: theme === 'dark' ? '#00000033' : 'rgba(255, 255, 255, 0.8)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              border: theme === 'dark' ? '1px solid #444' : '1px solid rgba(0, 0, 0, 0.1)',
              padding: 3,
              display: 'flex',
              flexDirection: 'column',
              mt: 2,
              mb: 4,
            }}
          >
            <Box sx={{ mt: 1, p: 1 }}>
              {tabValue === 0 && renderSummary()}
              {tabValue === 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Stack direction="row" spacing={4} mb={3} ml={4}>
                    <Button
                      variant={editFormat === 'yaml' ? 'contained' : 'outlined'}
                      onClick={() => handleFormatChange('yaml')}
                      sx={{
                        textTransform: 'none',
                        backgroundColor: editFormat === 'yaml' ? '#2F86FF' : 'transparent',
                        borderRadius: '8px',
                        color: editFormat === 'yaml' ? '#fff' : '#2F86FF',
                        border: editFormat === 'yaml' ? 'none' : '1px solid #2F86FF',
                        '&:hover': {
                          backgroundColor:
                            editFormat === 'yaml' ? '#1565c0' : 'rgba(47, 134, 255, 0.08)',
                        },
                      }}
                    >
                      YAML
                    </Button>
                    <Button
                      variant={editFormat === 'json' ? 'contained' : 'outlined'}
                      onClick={() => handleFormatChange('json')}
                      sx={{
                        textTransform: 'none',
                        backgroundColor: editFormat === 'json' ? '#2F86FF' : 'transparent',
                        borderRadius: '8px',
                        color: editFormat === 'json' ? '#fff' : '#2F86FF',
                        border: editFormat === 'json' ? 'none' : '1px solid #2F86FF',
                        '&:hover': {
                          backgroundColor:
                            editFormat === 'json' ? '#1565c0' : 'rgba(47, 134, 255, 0.08)',
                        },
                      }}
                    >
                      JSON
                    </Button>
                  </Stack>
                  <Box sx={{ overflow: 'auto', maxHeight: '500px' }}>
                    <Editor
                      height="500px"
                      language={editFormat}
                      value={
                        editFormat === 'yaml'
                          ? jsonToYaml(editedManifest)
                          : editedManifest || 'No manifest available'
                      }
                      onChange={handleEditorChange}
                      theme={theme === 'dark' ? 'vs-dark' : 'light'}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        readOnly: false,
                        automaticLayout: true,
                        wordWrap: 'on',
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleUpdate}
                      sx={{
                        textTransform: 'none',
                        backgroundColor: '#2F86FF',
                        borderRadius: '8px',
                        color: '#fff',
                        '&:hover': {
                          backgroundColor: '#1565c0',
                        },
                      }}
                    >
                      Update
                    </Button>
                  </Box>
                </Box>
              )}
              {tabValue === 2 && type.toLowerCase() === 'pod' && isDeploymentOrJobPod && (
                <Box
                  sx={{
                    height: '500px',
                    bgcolor: theme === 'dark' ? '#1E1E1E' : '#FFFFFF',
                    borderRadius: 1,
                    p: 1,
                    overflow: 'auto',
                  }}
                >
                  <div ref={terminalRef} style={{ height: '100%', width: '100%' }} />
                </Box>
              )}
              {tabValue === 3 && type.toLowerCase() === 'pod' && (
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
                          backgroundColor: '#98C379',
                          marginRight: '8px',
                        }}
                      />
                      {name}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {/* Container selection dropdown */}
                      <FormControl
                        size="small"
                        className="container-dropdown"
                        onMouseDown={() => {
                          // console.log("Container dropdown interaction started");
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
                            // console.log("Select mousedown");
                            setIsContainerSelectActive(true);
                          }}
                          onClose={() => {
                            // console.log("Select dropdown closed");
                            // Delay setting this to false to allow click events to process first
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
                            // Prevent menu from closing the panel by setting anchorOrigin and transformOrigin
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
                              {loadingContainers ? (
                                <CircularProgress size={14} sx={{ mr: 1 }} />
                              ) : (
                                <span
                                  className="fas fa-cube"
                                  style={{ marginRight: '8px', fontSize: '12px' }}
                                />
                              )}
                              {value || 'Select container'}
                            </Box>
                          )}
                        >
                          {containers.map(container => (
                            <MenuItem
                              key={container.ContainerName}
                              value={container.ContainerName}
                              sx={{
                                fontSize: '13px',
                                py: 0.75,
                              }}
                              onMouseDown={(e: React.MouseEvent<HTMLLIElement>) => {
                                e.stopPropagation();
                                // console.log(`MenuItem ${container.ContainerName} mousedown`);
                                setIsContainerSelectActive(true);
                              }}
                            >
                              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="body2">{container.ContainerName}</Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ fontSize: '11px' }}
                                >
                                  {container.Image.length > 40
                                    ? container.Image.substring(0, 37) + '...'
                                    : container.Image}
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))}
                          {containers.length === 0 && !loadingContainers && (
                            <MenuItem disabled>
                              <Typography variant="body2">No containers found</Typography>
                            </MenuItem>
                          )}
                        </Select>
                      </FormControl>

                      {/* Existing buttons */}
                      <Tooltip title="Clear Terminal">
                        <IconButton
                          size="small"
                          onClick={() => {
                            if (execTerminalInstance.current) {
                              execTerminalInstance.current.clear();
                            }
                          }}
                          sx={{
                            color: theme === 'dark' ? '#CCC' : '#666',
                            padding: '2px',
                            '&:hover': {
                              backgroundColor:
                                theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                            },
                          }}
                        >
                          <FiTrash2 size={16} />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title={isTerminalMaximized ? 'Minimize' : 'Maximize'}>
                        <IconButton
                          size="small"
                          onClick={() => setIsTerminalMaximized(!isTerminalMaximized)}
                          sx={{
                            color: theme === 'dark' ? '#CCC' : '#666',
                            padding: '2px',
                            '&:hover': {
                              backgroundColor:
                                theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                            },
                          }}
                        >
                          {isTerminalMaximized ? (
                            <FiMinimize2 size={16} />
                          ) : (
                            <FiMaximize2 size={16} />
                          )}
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
              )}
            </Box>
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
      ) : null}
    </Box>
  );
};

export default WecsDetailsPanel;

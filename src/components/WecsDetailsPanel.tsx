import { useEffect, useState, useRef, useCallback } from "react";
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
} from "@mui/material";
import { FiX, FiGitPullRequest, FiTrash2 } from "react-icons/fi";
import Editor from "@monaco-editor/react";
import jsyaml from "js-yaml";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { ResourceItem } from "./TreeViewComponent";
import useTheme from "../stores/themeStore";
import '@fortawesome/fontawesome-free/css/all.min.css';
import { api, getWebSocketUrl } from "../lib/api";

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

const StyledTab = styled(Tab)(({ theme }) => {
  const appTheme = useTheme((state) => state.theme);
  return {
    textTransform: "none",
    fontWeight: 500,
    fontSize: "0.8rem",
    color: appTheme === "dark" ? "#d4d4d4" : theme.palette.grey[600],
    padding: "10px 17px",
    minHeight: "40px",
    marginLeft: "16px",
    marginTop: "4px",
    borderRadius: "12px 12px 12px 12px",
    border: "1px solid transparent",
    transition: "background-color 0.2s ease, border-color 0.2s ease",
    "&.Mui-selected": {
      color: "#1976d2",
      fontWeight: 600,
      border: "1px solid rgba(25, 118, 210, 0.7)",
      boxShadow: `
        -2px 0 6px rgba(47, 134, 255, 0.2),
        2px 0 6px rgba(47, 134, 255, 0.2),
        0 -2px 6px rgba(47, 134, 255, 0.2),
        0 2px 6px rgba(47, 134, 255, 0.2)
      `,
      zIndex: 1,
      position: "relative",
    },
    "&:hover": {
      backgroundColor: appTheme === "dark" ? "#333" : "#f4f4f4",
      border: appTheme === "dark" ? "1px solid #444" : "1px solid rgba(0, 0, 0, 0.1)",
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
}: WecsDetailsProps) => {
  const theme = useTheme((state) => state.theme);
  const [resource, setResource] = useState<ResourceInfo | null>(null);
  const [clusterDetails, setClusterDetails] = useState<ClusterDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(initialTab ?? 0);
  const [isClosing, setIsClosing] = useState(false);
  const [editFormat, setEditFormat] = useState<"yaml" | "json">("yaml");
  const [editedManifest, setEditedManifest] = useState<string>("");
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");
  const panelRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const wsParamsRef = useRef<{ cluster: string; namespace: string; pod: string } | null>(null);
  const hasShownConnectedMessageRef = useRef<boolean>(false);
  const execTerminalRef = useRef<HTMLDivElement>(null);
  const execTerminalInstance = useRef<Terminal | null>(null);

  useEffect(() => {
    if (isOpen && initialTab !== undefined) {
      setTabValue(initialTab);
    }
  }, [isOpen, initialTab]);

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
    if (type.toLowerCase() === "cluster") {
      const fetchClusterDetails = async () => {
        try {
          const response = await api.get(`/api/cluster/details/${encodeURIComponent(name)}`);
          const data = response.data;
          setClusterDetails(data);
          
          // Also create a manifest representation for the edit tab
          const creationTime = data.itsManagedClusters && data.itsManagedClusters.length > 0 
            ? data.itsManagedClusters[0].creationTime 
            : new Date().toISOString();
          
          const clusterManifest = {
            apiVersion: "v1",
            kind: "Cluster",
            metadata: {
              name: data.clusterName,
              creationTimestamp: creationTime,
              labels: data.itsManagedClusters && data.itsManagedClusters.length > 0 
                ? data.itsManagedClusters[0].labels 
                : {}
            },
            spec: {
              context: data.itsManagedClusters && data.itsManagedClusters.length > 0 
                ? data.itsManagedClusters[0].context 
                : ""
            }
          };
          
          const resourceInfo: ResourceInfo = {
            name: data.clusterName,
            namespace: "",
            kind: "Cluster",
            createdAt: creationTime,
            age: calculateAge(creationTime),
            status: "Active",
            manifest: JSON.stringify(clusterManifest, null, 2)
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
    if (type.toLowerCase() === "pod") {
      const fetchResourceManifest = async () => {
        try {
          const kind = resourceData?.kind ?? type;
          const manifestData = resourceData ? JSON.stringify(resourceData, null, 2) : "No manifest available";
          const resourceInfo: ResourceInfo = {
            name: resourceData?.metadata?.name ?? name,
            namespace: resourceData?.metadata?.namespace ?? namespace,
            kind: kind,
            createdAt: resourceData?.metadata?.creationTimestamp ?? "N/A",
            age: calculateAge(resourceData?.metadata?.creationTimestamp),
            status:
              resourceData?.status?.conditions?.[0]?.status ??
              resourceData?.status?.phase ??
              "Unknown",
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
      const manifestData = resourceData ? JSON.stringify(resourceData, null, 2) : "No manifest available";
      const resourceInfo: ResourceInfo = {
        name: resourceData?.metadata?.name ?? name,
        namespace: resourceData?.metadata?.namespace ?? namespace,
        kind: kind,
        createdAt: resourceData?.metadata?.creationTimestamp ?? "N/A",
        age: calculateAge(resourceData?.metadata?.creationTimestamp),
        status:
          resourceData?.status?.conditions?.[0]?.status ??
          resourceData?.status?.phase ??
          "Unknown",
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
    
    setLogs((prev) => [...prev, 
      `\x1b[33m[Connecting] WebSocket Request\x1b[0m`,
      `URL: ${wsUrl}`,
      `Timestamp: ${new Date().toISOString()}`,
      `-----------------------------------`
    ]);

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setLogs((prev) => [...prev,
        `\x1b[32m[Connected] WebSocket Connection Established\x1b[0m`,
        `Status: OPEN`,
        `Timestamp: ${new Date().toISOString()}`,
        `-----------------------------------`
      ]);
      hasShownConnectedMessageRef.current = true;
    };

    socket.onmessage = (event) => {
      const messageLines = event.data.split('\n').filter((line: string) => line.trim() !== '');
      const messageLog = messageLines.map((line: string) => line.trim());
      messageLog.push(`Timestamp: ${new Date().toISOString()}`);
      messageLog.push(`-----------------------------------`);
      setLogs((prev) => [...prev, ...messageLog]);
    };

    socket.onerror = (event) => {
      setLogs((prev) => [...prev,
        `\x1b[31m[Error] WebSocket Connection Failed\x1b[0m`,
        `Details: ${JSON.stringify(event)}`,
        `Timestamp: ${new Date().toISOString()}`,
        `-----------------------------------`
      ]);
    };

    socket.onclose = () => {
      setLogs((prev) => [...prev,
        `\x1b[31m[Closed] WebSocket Connection Terminated\x1b[0m`,
        `Timestamp: ${new Date().toISOString()}`,
        `-----------------------------------`
      ]);
      wsRef.current = null;
    };
  }, [isOpen]); // Add isOpen as dependency

  // Initialize WebSocket connection only once when the panel opens
  useEffect(() => {
    if (!isOpen || type.toLowerCase() !== "pod") {
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
    if (!terminalRef.current || type.toLowerCase() !== "pod" || tabValue !== 2) return;
    
    // Skip re-initialization if terminal already exists
    if (terminalInstance.current) {
      // Update existing terminal with latest logs instead of re-creating it
      const term = terminalInstance.current;
      const lastLogIndex = term.buffer.active.length - 1; // Approximate last written log
      const newLogs = logs.slice(lastLogIndex > 0 ? lastLogIndex : 0);
      newLogs.forEach((log) => {
        term.writeln(log);
      });
      return;
    }

    const term = new Terminal({
      theme: {
        background: theme === "dark" ? "#1E1E1E" : "#FFFFFF",
        foreground: theme === "dark" ? "#D4D4D4" : "#222222",
        cursor: "#00FF00",
      },
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "monospace",
      scrollback: 1000,
      disableStdin: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);

    setTimeout(() => fitAddon.fit(), 100);
    terminalInstance.current = term;
    term.clear();
    logs.forEach((log) => {
      term.writeln(log);
    });

    return () => {
      term.dispose();
      terminalInstance.current = null;
    };
  }, [tabValue, theme, type, logs]); // Add logs as dependency with logic to prevent re-initialization

  // Add the Exec terminal initialization
  useEffect(() => {
    // Only initialize exec terminal when the exec tab is active
    if (!execTerminalRef.current || type.toLowerCase() !== "pod" || tabValue !== 3) return;
    
    // Skip re-initialization if terminal already exists
    if (execTerminalInstance.current) return;

    const term = new Terminal({
      theme: {
        background: theme === "dark" ? "#1E1E1E" : "#FFFFFF",
        foreground: theme === "dark" ? "#D4D4D4" : "#222222",
        cursor: "#00FF00",
      },
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "monospace",
      scrollback: 1000,
      disableStdin: false, // Enable stdin for exec
      convertEol: true,
      allowProposedApi: true
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(execTerminalRef.current);

    setTimeout(() => fitAddon.fit(), 100);
    execTerminalInstance.current = term;
    
    // Get the container name from the pod status if available
    let containerName = "";
    
    if (resourceData?.status?.containerStatuses && Array.isArray(resourceData.status.containerStatuses)) {
      const containerStatus = resourceData.status.containerStatuses[0];
      if (containerStatus && containerStatus.name) {
        containerName = containerStatus.name;
      }
    }
    
    const wsUrl = getWebSocketUrl(`/ws/pod/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/shell/${encodeURIComponent(containerName || "container")}?context=${encodeURIComponent(cluster)}&shell=sh`);
    
    // Show a simple connecting message
    term.writeln("\x1b[33mConnecting to pod shell...\x1b[0m");
    
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      // Clear the terminal once connected
      term.clear();
    };
    
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.Op === "stdout") {
          term.write(msg.Data);
        }
      } catch {
        // If it's not JSON, write it directly
        term.writeln(event.data);
      }
    };
    
    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      term.writeln(`\x1b[31mError connecting to pod. Please check console for details.\x1b[0m`);
    };
    
    socket.onclose = (event) => {
      console.log("WebSocket closed:", event);
      if (event.code !== 1000 && event.code !== 1001) {
        term.writeln(`\x1b[31mConnection closed (code: ${event.code})\x1b[0m`);
      }
    };
    
    // Handle user input including Tab completion
    term.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        // Special handling for Tab key for auto-completion
        if (data === '\t') {
          const msg = JSON.stringify({ Op: "stdin", Data: data });
          socket.send(msg);
        } else {
          const msg = JSON.stringify({ Op: "stdin", Data: data });
          socket.send(msg);
        }
      }
    });
    
    // Handle key events for special keys (arrow up/down, etc.)
    term.onKey(() => {
      // Handle special key combinations if needed
      // This allows for history navigation etc.
    });
    
    // Add ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ Op: "ping" }));
      }
    }, 30000);
    
    return () => {
      clearInterval(pingInterval);
      socket.close();
      term.dispose();
      execTerminalInstance.current = null;
    };
  }, [tabValue, theme, type, name, namespace, cluster, resourceData]); // Add necessary dependencies

  const calculateAge = (creationTimestamp: string | undefined): string => {
    if (!creationTimestamp) return "N/A";
    const createdDate = new Date(creationTimestamp);
    const currentDate = new Date();
    const diffMs = currentDate.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `${diffDays} days ago` : "Today";
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
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 400);
  };

  const handleFormatChange = (format: "yaml" | "json") => {
    if (editFormat === "yaml" && format === "json") {
      const jsonContent = yamlToJson(editedManifest);
      setEditedManifest(jsonContent);
    } else if (editFormat === "json" && format === "yaml") {
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
    setSnackbarSeverity("error");
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const renderSummary = () => {
    if (type.toLowerCase() === "cluster" && clusterDetails) {
      // Render cluster-specific information
      const clusterInfo = clusterDetails.itsManagedClusters && clusterDetails.itsManagedClusters.length > 0 
        ? clusterDetails.itsManagedClusters[0] 
        : null;
      
      return (
        <Box>
          <Table sx={{ borderRadius: 1, mb: 2 }}>
            <TableBody>
              {[
                { label: "KIND", value: "Cluster" },
                { label: "NAME", value: clusterDetails.clusterName },
                { label: "CONTEXT", value: clusterInfo?.context || "Unknown" },
                { label: "CREATED AT", value: clusterInfo ? `${new Date(clusterInfo.creationTime).toLocaleString()} (${calculateAge(clusterInfo.creationTime)})` : "Unknown" },
              ].map((row, index) => (
                <TableRow key={index}>
                  <TableCell
                    sx={{
                      borderBottom: theme === "dark" ? "1px solid #444" : "1px solid #e0e0e0",
                      color: theme === "dark" ? "#D4D4D4" : "#333333",
                      fontSize: "14px",
                      fontWeight: 500,
                      width: '150px',
                      padding: '10px 16px'
                    }}
                  >
                    {row.label}
                  </TableCell>
                  <TableCell
                    sx={{
                      borderBottom: theme === "dark" ? "1px solid #444" : "1px solid #e0e0e0",
                      color: theme === "dark" ? "#D4D4D4" : "#333333",
                      fontSize: "14px",
                      padding: '10px 16px'
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
                      borderBottom: theme === "dark" ? "1px solid #444" : "1px solid #e0e0e0",
                      color: theme === "dark" ? "#D4D4D4" : "#333333",
                      fontSize: "14px",
                      fontWeight: 500,
                      width: '150px',
                      padding: '10px 16px',
                      verticalAlign: 'top'
                    }}
                  >
                    LABELS
                  </TableCell>
                  <TableCell
                    sx={{
                      borderBottom: theme === "dark" ? "1px solid #444" : "1px solid #e0e0e0",
                      color: theme === "dark" ? "#D4D4D4" : "#333333",
                      fontSize: "14px",
                      padding: '10px 16px'
                    }}
                  >
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {clusterInfo.labels && Object.entries(clusterInfo.labels).map(([key, value], index) => (
                        <Chip
                          key={index}
                          label={`${key}: ${value}`}
                          size="small"
                          sx={{
                            mr: 1,
                            mb: 1,
                            backgroundColor: theme === "dark" ? "#334155" : undefined,
                            color: theme === "dark" ? "#fff" : undefined,
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
            { label: "KIND", value: resource.kind },
            { label: "NAME", value: resource.name },
            { label: "NAMESPACE", value: resource.namespace },
            { label: "CREATED AT", value: `${resource.createdAt} (${resource.age})` },
          ].map((row, index) => (
            <TableRow key={index}>
              <TableCell
                sx={{
                  borderBottom: theme === "dark" ? "1px solid #444" : "1px solid #e0e0e0",
                  color: theme === "dark" ? "#D4D4D4" : "#333333",
                  fontSize: "14px",
                  fontWeight: 500,
                  width: '150px',
                  padding: '10px 16px'
                }}
              >
                {row.label}
              </TableCell>
              <TableCell
                sx={{
                  borderBottom: theme === "dark" ? "1px solid #444" : "1px solid #e0e0e0",
                  color: theme === "dark" ? "#D4D4D4" : "#333333",
                  fontSize: "14px",
                  padding: '10px 16px'
                }}
              >
                {row.value}
              </TableCell>
            </TableRow>
          ))}
          {resourceData?.metadata?.labels && Object.keys(resourceData.metadata.labels).length > 0 && (
            <TableRow>
              <TableCell
                sx={{
                  borderBottom: theme === "dark" ? "1px solid #444" : "1px solid #e0e0e0",
                  color: theme === "dark" ? "#D4D4D4" : "#333333",
                  fontSize: "14px",
                  fontWeight: 500,
                  width: '150px',
                  padding: '10px 16px',
                  verticalAlign: 'top'
                }}
              >
                LABELS
              </TableCell>
              <TableCell
                sx={{
                  borderBottom: theme === "dark" ? "1px solid #444" : "1px solid #e0e0e0",
                  color: theme === "dark" ? "#D4D4D4" : "#333333",
                  fontSize: "14px",
                  padding: '10px 16px'
                }}
              >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {resourceData.metadata.labels && Object.entries(resourceData.metadata.labels).map(([key, value], index) => (
                    <Chip
                      key={index}
                      label={`${key}: ${value}`}
                      size="small"
                      sx={{
                        mr: 1,
                        mb: 1,
                        backgroundColor: theme === "dark" ? "#334155" : undefined,
                        color: theme === "dark" ? "#fff" : undefined,
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
        position: "fixed",
        right: isOpen ? 0 : "-80vw",
        top: 0,
        bottom: 0,
        width: "80vw",
        bgcolor: theme === "dark" ? "#1F2937" : "#eff3f5",
        boxShadow: "-2px 0 10px rgba(0,0,0,0.2)",
        transition: "right 0.4s ease-in-out",
        zIndex: 1001,
        overflowY: "auto",
        borderTopLeftRadius: "8px",
        borderBottomLeftRadius: "8px",
      }}
    >
      {isClosing ? (
        <Box sx={{ height: "100%", width: "100%" }} />
      ) : loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
          <Alert severity="error">{error}</Alert>
        </Box>
      ) : (resource || clusterDetails) && isOpen ? (
        <Box ref={panelRef} sx={{ p: 4, height: "100%" }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={3}
          >
            <Typography
              variant="h4"
              fontWeight="bold"
              sx={{
                color: theme === "dark" ? "#FFFFFF" : "#000000",
                fontSize: "30px",
                marginLeft: "4px"
              }}
            >
              {type.toUpperCase()} : {" "}
              <span style={{ color: "#2F86FF" }}>{name}</span>
            </Typography>
            <Stack direction="row" spacing={1}>
              {onSync && (
                <Tooltip title="Sync Resource">
                  <Button
                    variant="contained"
                    startIcon={<FiGitPullRequest />}
                    onClick={onSync}
                    sx={{
                      bgcolor: "#00b4d8",
                      "&:hover": { bgcolor: "#009bbd" },
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
                  sx={{ color: theme === "dark" ? "#B0B0B0" : "#6d7f8b" }}
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
              ".MuiTabs-indicator": {
                display: "none",
              },
              "& .MuiTab-root": {
                color: theme === "dark" ? "#fff" : "#333",
              },
            }}
          >
            <StyledTab label={<span><i className="fa fa-file-alt" style={{ marginRight: "8px" }}></i>SUMMARY</span>} />
            <StyledTab label={<span><i className="fa fa-edit" style={{ marginRight: "8px" }}></i>EDIT</span>} />
            <StyledTab label={<span><i className="fa fa-align-left" style={{ marginRight: "8px" }}></i>LOGS</span>} />
            {/* Only show Exec Pods tab for pod resources */}
            {type.toLowerCase() === "pod" && (
              <StyledTab label={<span><i className="fa fa-terminal" style={{ marginRight: "8px" }}></i>EXEC PODS</span>} />
            )}
          </Tabs>

          <Box
            sx={{
              backgroundColor: theme === "dark" ? "#00000033" : "rgba(255, 255, 255, 0.8)",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
              border: theme === "dark" ? "1px solid #444" : "1px solid rgba(0, 0, 0, 0.1)",
              padding: 3,
              display: "flex",
              flexDirection: "column",
              mt: 2,
              mb: 4,
            }}
          >
            <Box sx={{ mt: 1, p: 1 }}>
              {tabValue === 0 && renderSummary()}
              {tabValue === 1 && (
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Stack direction="row" spacing={4} mb={3} ml={4}>
                    <Button
                      variant={editFormat === "yaml" ? "contained" : "outlined"}
                      onClick={() => handleFormatChange("yaml")}
                      sx={{
                        textTransform: "none",
                        backgroundColor: "#2F86FF",
                        borderRadius: "8px",
                        color: "#fff",
                        "&:hover": {
                          backgroundColor: "#1565c0",
                        },
                      }}
                    >
                      YAML
                    </Button>
                    <Button
                      variant={editFormat === "json" ? "contained" : "outlined"}
                      onClick={() => handleFormatChange("json")}
                      sx={{
                        textTransform: "none",
                        backgroundColor: "#2F86FF",
                        borderRadius: "8px",
                        color: "#fff",
                        "&:hover": {
                          backgroundColor: "#1565c0",
                        },
                      }}
                    >
                      JSON
                    </Button>
                  </Stack>
                  <Box sx={{ overflow: "auto", maxHeight: "500px" }}>
                    <Editor
                      height="500px"
                      language={editFormat}
                      value={
                        editFormat === "yaml"
                          ? jsonToYaml(editedManifest)
                          : editedManifest || "No manifest available"
                      }
                      onChange={handleEditorChange}
                      theme={theme === "dark" ? "vs-dark" : "light"}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        readOnly: false,
                        automaticLayout: true,
                        wordWrap: "on",
                      }}
                    />
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleUpdate}
                      sx={{
                        textTransform: "none",
                        backgroundColor: "#2F86FF",
                        borderRadius: "8px",
                        color: "#fff",
                        "&:hover": {
                          backgroundColor: "#1565c0",
                        },
                      }}
                    >
                      Update
                    </Button>
                  </Box>
                </Box>
              )}
              {tabValue === 2 && (
                <Box
                  sx={{
                    height: "500px",
                    bgcolor: theme === "dark" ? "#1E1E1E" : "#FFFFFF",
                    borderRadius: 1,
                    p: 1,
                    overflow: "auto",
                  }}
                >
                  <div
                    ref={terminalRef}
                    style={{ height: "100%", width: "100%" }}
                  />
                </Box>
              )}
              {tabValue === 3 && type.toLowerCase() === "pod" && (
                <Box
                  sx={{
                    height: "500px",
                    bgcolor: theme === "dark" ? "#1E1E1E" : "#FFFFFF",
                    borderRadius: 1,
                    p: 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <div
                    ref={execTerminalRef}
                    style={{ height: "100%", width: "100%" }}
                  />
                </Box>
              )}
            </Box>
          </Box>

          <Snackbar
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
            open={snackbarOpen}
            autoHideDuration={4000}
            onClose={handleSnackbarClose}
          >
            <Alert
              onClose={handleSnackbarClose}
              severity={snackbarSeverity}
              sx={{
                width: "100%",
                backgroundColor: theme === "dark" ? "#333" : "#fff",
                color: theme === "dark" ? "#d4d4d4" : "#333",
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
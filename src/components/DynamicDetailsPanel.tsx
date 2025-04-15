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
} from "@mui/material";
import { FiX, FiGitPullRequest, FiTrash2 } from "react-icons/fi";
import Editor from "@monaco-editor/react";
import jsyaml from "js-yaml";
import axios from "axios";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { ResourceItem } from "./TreeViewComponent"; // Adjust the import path to your TreeView file
import useTheme from "../stores/themeStore"; // Import the useTheme hook
import '@fortawesome/fontawesome-free/css/all.min.css';

interface DynamicDetailsProps {
  namespace: string;
  name: string;
  type: string;
  resourceData?: ResourceItem;
  onClose: () => void;
  isOpen: boolean;
  onSync?: () => void;
  onDelete?: () => void;
  initialTab?: number; // Add initialTab prop to specify the initial tab
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

// Mapping of kind to the correct plural form for API endpoints
const kindToPluralMap: Record<string, string> = {
  Binding: "bindings",
  ComponentStatus: "componentstatuses",
  ConfigMap: "configmaps",
  Endpoints: "endpoints",
  Event: "events",
  LimitRange: "limitranges",
  Namespace: "namespaces",
  Node: "nodes",
  PersistentVolumeClaim: "persistentvolumeclaims",
  PersistentVolume: "persistentvolumes",
  Pod: "pods",
  PodTemplate: "podtemplates",
  ReplicationController: "replicationcontrollers",
  ResourceQuota: "resourcequotas",
  Secret: "secrets",
  ServiceAccount: "serviceaccounts",
  Service: "services",
  MutatingWebhookConfiguration: "mutatingwebhookconfigurations",
  ValidatingWebhookConfiguration: "validatingwebhookconfigurations",
  CustomResourceDefinition: "customresourcedefinitions",
  APIService: "apiservices",
  ControllerRevision: "controllerrevisions",
  DaemonSet: "daemonsets",
  Deployment: "deployments",
  ReplicaSet: "replicasets",
  StatefulSet: "statefulsets",
  Application: "applications",
  ApplicationSet: "applicationsets",
  AppProject: "appprojects",
  SelfSubjectReview: "selfsubjectreviews",
  TokenReview: "tokenreviews",
  LocalSubjectAccessReview: "localsubjectaccessreviews",
  SelfSubjectAccessReview: "selfsubjectaccessreviews",
  SelfSubjectRulesReview: "selfsubjectrulesreviews",
  SubjectAccessReview: "subjectaccessreviews",
  HorizontalPodAutoscaler: "horizontalpodautoscalers",
  CronJob: "cronjobs",
  Job: "jobs",
  CertificateSigningRequest: "certificatesigningrequests",
  BindingPolicy: "bindingpolicies",
  CombinedStatus: "combinedstatuses",
  CustomTransform: "customtransforms",
  StatusCollector: "statuscollectors",
  Lease: "leases",
  EndpointSlice: "endpointslices",
  FlowSchema: "flowschemas",
  PriorityLevelConfiguration: "prioritylevelconfigurations",
  IngressClass: "ingressclasses",
  Ingress: "ingresses",
  NetworkPolicy: "networkpolicies",
  RuntimeClass: "runtimeclasses",
  PodDisruptionBudget: "poddisruptionbudgets",
  ClusterRoleBinding: "clusterrolebindings",
  ClusterRole: "clusterroles",
  RoleBinding: "rolebindings",
  Role: "roles",
  PriorityClass: "priorityclasses",
  CSIDriver: "csidrivers",
  CSINode: "csinodes",
  CSIStorageCapacity: "csistoragecapacities",
  StorageClass: "storageclasses",
  VolumeAttachment: "volumeattachments",
};

// StyledTab to match CreateOptions, defined directly in this file
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

const DynamicDetailsPanel = ({
  namespace,
  name,
  type,
  resourceData,
  onClose,
  isOpen,
  onSync,
  onDelete,
  initialTab,
}: DynamicDetailsProps) => {
  const theme = useTheme((state) => state.theme); // Use the theme from the store
  const [resource, setResource] = useState<ResourceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(initialTab ?? 0); // Initialize with initialTab, default to 0
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
  const [logs, setLogs] = useState<string[]>([]); // New state to store logs
  const wsParamsRef = useRef<{ kind: string; namespace: string; name: string } | null>(null); // Store WebSocket parameters
  const [isPanelVisible, setIsPanelVisible] = useState(false);

  // Update panel visibility with a slight delay when isOpen changes to create proper transition
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure CSS transition works properly
      setTimeout(() => {
        setIsPanelVisible(true);
      }, 50);
    } else {
      setIsPanelVisible(false);
    }
  }, [isOpen]);

  // Update tabValue when the panel opens with a new initialTab
  useEffect(() => {
    if (isOpen && initialTab !== undefined) {
      setTabValue(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!namespace || !name) {
      setResource(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const fetchNamespaceManifest = async () => {
      try {
        const kind = resourceData?.kind ?? type;
        let manifestData: string;

        // If the resource is a Namespace, fetch the manifest from the API
        if (kind === "Namespace") {
          const response = await axios.get(`http://localhost:4000/api/namespaces/${name}`);
          manifestData = response.data ? JSON.stringify(response.data, null, 2) : "No manifest available";
        } else {
          // For all other resources, use the resourceData prop
          manifestData = resourceData ? JSON.stringify(resourceData, null, 2) : "No manifest available";
        }

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

        // Store WebSocket parameters in a ref when resource is first loaded
        wsParamsRef.current = {
          kind: resourceInfo.kind,
          namespace: resourceInfo.namespace,
          name: resourceInfo.name,
        };
      } catch (err) {
        console.error(`Error processing ${type} details:`, err);
        setError(`Failed to load ${type} details.`);
      } finally {
        setLoading(false);
      }
    };

    fetchNamespaceManifest();
  }, [namespace, name, type, resourceData]);

  // Function to establish WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (!wsParamsRef.current) return;

    const { kind, namespace, name } = wsParamsRef.current;

    // Skip WebSocket connection for Namespace resources
    if (kind === "Namespace") {
      setLogs(["No logs available for Namespace"]);
      return;
    }

    const pluralForm = kindToPluralMap[kind] || `${kind.toLowerCase()}s`;
    const wsUrl = `ws://localhost:4000/api/${pluralForm}/${namespace}/log?name=${name}`;
    console.log(`Connecting to WebSocket: ${wsUrl}`);

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setLogs((prev) => [...prev, "\x1b[32m✔ Connected to log stream...\x1b[0m"]);
    };

    socket.onmessage = (event) => {
      setLogs((prev) => [...prev, event.data]);
    };

    socket.onerror = (event) => {
      console.error("WebSocket encountered an issue:", event);
      setLogs((prev) => [...prev, "\x1b[31m⚠ WebSocket error occurred.\x1b[0m"]);
    };

    socket.onclose = () => {
      setLogs((prev) => [...prev, "\x1b[31m⚠ Complete Logs. Connection closed.\x1b[0m"]);
      wsRef.current = null;
      // Reconnect if the panel is still open
      if (isOpen) {
        setTimeout(() => {
          if (isOpen && !wsRef.current) {
            connectWebSocket();
          }
        }, 100); // Reduced from 1000ms to 100ms for faster reconnection
      }
    };
  }, [isOpen]);

  // Dedicated useEffect for WebSocket connection, only dependent on isOpen and wsParamsRef
  useEffect(() => {
    if (!isOpen) {
      // Close the WebSocket connection when the panel is closed
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setLogs([]);
      wsParamsRef.current = null; // Reset WebSocket parameters
      return;
    }

    // If the panel is open but no WebSocket parameters are available yet, wait
    if (!wsParamsRef.current) {
      return;
    }

    // Establish WebSocket connection only if not already connected
    if (!wsRef.current && wsParamsRef.current.kind !== "Namespace") {
      connectWebSocket();
    }

    // Cleanup function: only runs when isOpen changes to false
    return () => {
      if (!isOpen) {
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
      }
    };
  }, [isOpen, connectWebSocket]); // Removed wsParamsRef.current since it's a mutable ref value

  // UseEffect to initialize terminal and display logs when "LOGS" tab is selected
  useEffect(() => {
    if (tabValue !== 2 || !terminalRef.current || !resource) return;

    const term = new Terminal({
      theme: {
        background: theme === "dark" ? "#1E1E1E" : "#FFFFFF", // Dark or light background
        foreground: theme === "dark" ? "#D4D4D4" : "#222222", // Light or dark text
        cursor: "#00FF00", // Green cursor
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

    setTimeout(() => {
      fitAddon.fit();
    }, 100);

    terminalInstance.current = term;

    // If the resource is a Namespace, display the "No logs available" message
    if (resource.kind === "Namespace") {
      term.writeln("No logs available for Namespace");
    } else {
      // Write existing logs once
      logs.forEach((log) => {
        term.writeln(log);
      });

      // Keep track of the last log index we've written
      let lastLogIndex = logs.length - 1;

      // Watch for new logs
      const logsWatcher = setInterval(() => {
        if (logs.length > lastLogIndex + 1) {
          // Only write new logs that haven't been displayed yet
          const newLogs = logs.slice(lastLogIndex + 1);
          newLogs.forEach((log) => term.writeln(log));
          lastLogIndex = logs.length - 1;
        }
      }, 100);

      return () => {
        clearInterval(logsWatcher);
        term.dispose();
        terminalInstance.current = null;
      };
    }

    return () => {
      term.dispose();
      terminalInstance.current = null;
    };
  }, [tabValue, resource, logs, theme]); // Add theme as dependency

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
    setIsPanelVisible(false);
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

    const kind = resource.kind;
    const resourceNamespace = resource.namespace;
    const resourceName = resource.name;

    let updateEndpoint: string;
    let fetchEndpoint: string;

    // Check if the resource is a Namespace
    if (kind === "Namespace") {
      // Use the specific API for updating a Namespace
      updateEndpoint = `http://localhost:4000/api/namespaces/update/${resourceName}`;
      fetchEndpoint = `http://localhost:4000/api/namespaces/${resourceName}`;
      console.log(`Updating Namespace at: ${updateEndpoint}`);
    } else {
      // Use the existing API for other resources under a namespace
      const pluralForm = kindToPluralMap[kind] || `${kind.toLowerCase()}s`;
      updateEndpoint = `http://localhost:4000/api/${pluralForm}/${resourceNamespace}/${resourceName}`;
      fetchEndpoint = updateEndpoint; // Same endpoint for fetching
      console.log(`Updating resource at: ${updateEndpoint}`);
    }

    try {
      const manifestToUpdate = editFormat === "yaml" ? yamlToJson(editedManifest) : editedManifest;
      const editedData = JSON.parse(manifestToUpdate);

      // Update the resource using the appropriate endpoint
      await axios.put(updateEndpoint, editedData);

      // Fetch the updated resource using the appropriate endpoint
      const response = await axios.get(fetchEndpoint);
      const updatedResource = response.data;

      const newManifestString = JSON.stringify(updatedResource, null, 2);
      setResource((prev) => (prev ? { ...prev, manifest: newManifestString } : prev));
      setEditedManifest(newManifestString);

      // Only show the snackbar if it's not already open
      if (!snackbarOpen) {
        setSnackbarMessage(`${resourceName} updated successfully`);
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      }
    } catch (error: unknown) {
      console.error(`Failed to update ${resourceName}:`, error);
      // Only show the snackbar if it's not already open
      if (!snackbarOpen) {
        setSnackbarMessage(`Failed to update ${resourceName}`);
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const renderSummary = () => {
    if (!resource) return null;

    // Extract labels from resourceData.metadata.labels and format them
    const labels = resourceData?.metadata?.labels;
    const labelsString = labels
      ? Object.entries(labels)
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ")
      : "None";

    return (
      <Table sx={{ borderRadius: 1 }}>
        <TableBody>
          {[
            { label: "KIND", value: resource.kind },
            { label: "NAME", value: resource.name },
            { label: "NAMESPACE", value: resource.namespace },
            { label: "CREATED AT", value: `${resource.createdAt} (${resource.age})` },
            { label: "LABELS", value: labelsString }, // New row for labels
          ].map((row, index) => (
            <TableRow key={index}>
              <TableCell
                sx={{
                  borderBottom: theme === "dark" ? "1px solid #444" : "1px solid #e0e0e0",
                  color: theme === "dark" ? "#D4D4D4" : "#333333",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                {row.label}
              </TableCell>
              <TableCell
                sx={{
                  borderBottom: theme === "dark" ? "1px solid #444" : "1px solid #e0e0e0",
                  color: theme === "dark" ? "#D4D4D4" : "#333333",
                  fontSize: "14px",
                }}
              >
                {row.value}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Box
      sx={{
        position: "fixed",
        right: isPanelVisible ? 0 : "-80vw",
        top: 0,
        bottom: 0,
        width: "80vw",
        bgcolor: theme === "dark" ? "#1F2937" : "#eff3f5", // Dark or light background
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
      ) : resource && isOpen ? (
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
            {type.toUpperCase()} :{" "}
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
                    maxHeight: "500px",
                    bgcolor: theme === "dark" ? "#1E1E1E" : "#FFFFFF",
                    borderRadius: 1,
                    p: 1,
                    overflow: "auto",
                  }}
                >
                  <div
                    ref={terminalRef}
                    style={{ height: "100%", width: "100%", overflow: "auto" }}
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

export default DynamicDetailsPanel;
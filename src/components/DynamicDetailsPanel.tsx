import { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Tabs,
  Tab,
  Table,
  TableRow,
  TableCell,
  TableBody,
  Alert,
  CircularProgress,
  Chip,
  Tooltip,
  Button,
  Stack,
  Snackbar,
} from "@mui/material";
import { FiX, FiRefreshCw, FiGitPullRequest, FiTrash2 } from "react-icons/fi";
import Editor from "@monaco-editor/react";
import jsyaml from "js-yaml";
import axios from "axios";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { ResourceItem } from "./TreeViewComponent"; // Adjust the import path to your TreeView file

interface DynamicDetailsProps {
  namespace: string;
  name: string;
  type: string;
  resourceData?: ResourceItem;
  onClose: () => void;
  isOpen: boolean;
  onSync?: () => void;
  onDelete?: () => void;
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

const DynamicDetailsPanel = ({
  namespace,
  name,
  type,
  resourceData,
  onClose,
  isOpen,
  onSync,
  onDelete,
}: DynamicDetailsProps) => {
  const [resource, setResource] = useState<ResourceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
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

  useEffect(() => {
    if (!namespace || !name) {
      setResource(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const resourceInfo: ResourceInfo = {
        name: resourceData?.metadata?.name ?? name,
        namespace: resourceData?.metadata?.namespace ?? namespace,
        kind: resourceData?.kind ?? type,
        createdAt: resourceData?.metadata?.creationTimestamp ?? "N/A",
        age: calculateAge(resourceData?.metadata?.creationTimestamp),
        status:
          resourceData?.status?.conditions?.[0]?.status ??
          resourceData?.status?.phase ??
          "Unknown",
        manifest: resourceData
          ? JSON.stringify(resourceData, null, 2)
          : "No manifest available",
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
  }, [namespace, name, type, resourceData]);

  // Initialize the terminal and WebSocket when the "LOGS" tab is selected
  useEffect(() => {
    if (tabValue !== 2 || !terminalRef.current || !resource) return;

    // Initialize the terminal with a white background
    const term = new Terminal({
      theme: {
        background: "#FFFFFF", // White background
        foreground: "#222222", // Dark text for readability
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

    // Extract kind, namespace, and name
    const kind = resource.kind.toLowerCase();
    const resourceNamespace = resource.namespace;
    const resourceName = resource.name;

    // Construct the WebSocket URL
    const wsUrl = `ws://localhost:4000/api/${kind}s/${resourceNamespace}/log?name=${resourceName}`;
    console.log(`Connecting to WebSocket: ${wsUrl}`);

    // Initialize WebSocket
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      term.writeln("\x1b[32m✔ Connected to log stream...\x1b[0m");
    };

    socket.onmessage = (event) => {
      term.writeln(event.data);
    };

    socket.onerror = (event) => {
      console.error("WebSocket encountered an issue:", event);
      term.writeln("\x1b[31m⚠ WebSocket error occurred.\x1b[0m");
    };

    socket.onclose = () => {
      term.writeln("\x1b[31m⚠ Complete Logs. Connection closed.\x1b[0m");
    };

    // Cleanup on unmount or tab change
    return () => {
      socket.close();
      wsRef.current = null;
      term.dispose();
      terminalInstance.current = null;
    };
  }, [tabValue, resource]);

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

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000); // Simulate API call
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

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "synced":
        return "success";
      case "outofsync":
        return "warning";
      case "healthy":
        return "success";
      case "degraded":
        return "error";
      default:
        return "default";
    }
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

    const kind = resource.kind.toLowerCase();
    const resourceNamespace = resource.namespace;
    const resourceName = resource.name;

    const endpoint = `http://localhost:4000/api/${kind}s/${resourceNamespace}/${resourceName}`;
    console.log(`Fetching latest resource from: ${endpoint}`);

    try {
      const response = await axios.get(endpoint);
      const latestManifest = response.data;

      const editedData = editFormat === "yaml" ? jsyaml.load(editedManifest) : JSON.parse(editedManifest);
      const updatedManifest = {
        ...latestManifest,
        spec: {
          ...latestManifest.spec,
          replicas: editedData.spec?.replicas ?? latestManifest.spec.replicas,
        },
      };

      console.log(`Updating resource at: ${endpoint}`);
      await axios.put(endpoint, updatedManifest);

      const newManifestString = JSON.stringify(updatedManifest, null, 2);
      setResource((prev) => (prev ? { ...prev, manifest: newManifestString } : prev));
      setEditedManifest(newManifestString);

      setSnackbarMessage(`${resourceName} object scaled successfully`);
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error: unknown) {
      console.error(`Failed to update ${resourceName}:`, error);
      setSnackbarMessage(
          `Failed to update ${resourceName}`
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const renderSummary = () => {
    if (!resource) return null;
    return (
      <Table sx={{ borderRadius: 1 }}>
        <TableBody>
          {[
            { label: "KIND", value: resource.kind },
            { label: "NAME", value: resource.name },
            { label: "NAMESPACE", value: resource.namespace },
            { label: "CREATED AT", value: `${resource.createdAt} (${resource.age})` },
            {
              label: "STATUS",
              value: (
                <Chip
                  label={resource.status}
                  color={getStatusColor(resource.status)}
                  size="small"
                  variant="outlined"
                />
              ),
            },
          ].map((row, index) => (
            <TableRow key={index}>
              <TableCell
                sx={{
                  borderBottom: "1px solid #e0e0e0",
                  padding: "12px 16px",
                  color: "#333333",
                  width: "200px",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                {row.label}
              </TableCell>
              <TableCell
                sx={{
                  borderBottom: "1px solid #e0e0e0",
                  padding: "12px 16px",
                  color: "#333333",
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
        right: isOpen ? 0 : "-80vw",
        top: 0,
        bottom: 0,
        width: "80vw",
        bgcolor: "#e5f6fd",
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
              sx={{ color: "#000000", fontSize: "24px" }}
            >
              {name} ({type})
            </Typography>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Refresh">
                <IconButton onClick={handleRefresh} sx={{ color: "#6d7f8b" }}>
                  <FiRefreshCw />
                </IconButton>
              </Tooltip>
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
                <IconButton onClick={handleClose} sx={{ color: "#6d7f8b" }}>
                  <FiX />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{
              bgcolor: "#e5f6fd",
              "& .MuiTabs-indicator": { backgroundColor: "#00b4d8", height: 3 },
              "& .MuiTab-root": {
                textTransform: "none",
                fontSize: "14px",
                color: "#666666",
                "&.Mui-selected": { color: "#00b4d8", fontWeight: 600 },
                padding: "8px 24px",
                minHeight: "40px",
              },
            }}
          >
            <Tab label="SUMMARY" />
            <Tab label="EDIT" />
            <Tab label="LOGS" />
          </Tabs>

          <Paper
            elevation={1}
            sx={{ bgcolor: "#ffffff", p: 2, borderRadius: 2, mt: 2, mb: 4 }}
          >
            <Box sx={{ mt: 1, convictions: "center", p: 1, bgcolor: "#ffffff" }}>
              {tabValue === 0 && renderSummary()}
              {tabValue === 1 && (
                <Box>
                  <Stack direction="row" spacing={2} mb={2}>
                    <Button
                      variant={editFormat === "yaml" ? "contained" : "outlined"}
                      onClick={() => handleFormatChange("yaml")}
                      sx={{
                        textTransform: "none",
                        bgcolor: editFormat === "yaml" ? "#00b4d8" : "transparent",
                        "&:hover": { bgcolor: editFormat === "yaml" ? "#009bbd" : "#e0e0e0" },
                      }}
                    >
                      YAML
                    </Button>
                    <Button
                      variant={editFormat === "json" ? "contained" : "outlined"}
                      onClick={() => handleFormatChange("json")}
                      sx={{
                        textTransform: "none",
                        bgcolor: editFormat === "json" ? "#00b4d8" : "transparent",
                        "&:hover": { bgcolor: editFormat === "json" ? "#009bbd" : "#e0e0e0" },
                      }}
                    >
                      JSON
                    </Button>
                  </Stack>
                  <Editor
                    height="500px"
                    language={editFormat}
                    value={
                      editFormat === "yaml"
                        ? jsonToYaml(editedManifest)
                        : editedManifest || "No manifest available"
                    }
                    onChange={handleEditorChange}
                    theme="light"
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
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleUpdate}
                      sx={{
                        textTransform: "none",
                        bgcolor: "#4caf50",
                        "&:hover": { bgcolor: "#388e3c" },
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
                    bgcolor: "#FFFFFF", // White background for the Box
                    borderRadius: 1,
                    p: 1,
                  }}
                >
                  <div
                    ref={terminalRef}
                    style={{ height: "100%", width: "100%", overflow: "auto" }}
                  />
                </Box>
              )}
            </Box>
          </Paper>

          <Snackbar
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
            open={snackbarOpen}
            autoHideDuration={4000}
            onClose={handleSnackbarClose}
          >
            <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: "100%" }}>
              {snackbarMessage}
            </Alert>
          </Snackbar>
        </Box>
      ) : null}
    </Box>
  );
};

export default DynamicDetailsPanel;
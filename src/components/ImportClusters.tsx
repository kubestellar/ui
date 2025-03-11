import React, { useEffect, useState, ChangeEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  Alert,
  AlertTitle,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Snackbar,
  Checkbox,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
} from "@mui/material";
import Editor from "@monaco-editor/react";
import useTheme from "../stores/themeStore";
import { useClusterQueries } from "../hooks/queries/useClusterQueries";
import { api } from "../lib/api";
import { CloudOff } from "lucide-react";

// Common styling objects
const commonInputSx = {
  mb: 2,
  input: { color: "inherit" },
  label: { color: "inherit" },
  fieldset: { borderColor: "inherit" },
  "& .MuiInputLabel-root.Mui-focused": { color: "inherit" },
};

const formContentStyles = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  width: "100%",
  maxWidth: "800px",
  mx: "auto",
  "& .MuiFormControl-root": {
    width: "100%",
  },
  "& .MuiTextField-root": {
    width: "100%",
  },
};

interface Props {
  activeOption: string | null;
  setActiveOption: (option: string | null) => void;
  onCancel: () => void;
}

export interface CommandResponse {
  clusterName: string;
  token: string;
  command: string;
}

const ImportClusters: React.FC<Props> = ({ activeOption, setActiveOption, onCancel }) => {
  const { useClusters } = useClusterQueries();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const { data, error, isLoading } = useClusters(currentPage);
  const theme = useTheme((state) => state.theme);
  const textColor = theme === "dark" ? "white" : "black";
  const bgColor = theme === "dark" ? "#1F2937" : "background.paper";

  // State for non-manual tabs
  const [fileType, setFileType] = useState<"yaml">("yaml");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editorContent, setEditorContent] = useState<string>("");

  // Global form state
  const [formData, setFormData] = useState({
    clusterName: "",
    token: "",
    hubApiServer: "",
  });

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning" | "info";
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  // State for Manual tab (option4)
  const [manualCommand, setManualCommand] = useState<CommandResponse | null>(null);
  const [manualLoading, setManualLoading] = useState<boolean>(false);
  const [manualError, setManualError] = useState<string>("");

  // Define interface for hub API response
  interface HubApiResponse {
    apiserver: string;
  }

  // For non-manual tabs, fetch hub API Server info using a POST request
  useEffect(() => {
    if (activeOption !== "option4") {
      api
        .post<HubApiResponse>("/clusters/manual/generateCommand", {})
        .then((response) => {
          setFormData((prev) => ({ ...prev, hubApiServer: response.data.apiserver }));
        })
        .catch((err: unknown) => console.error("Error fetching hub API server:", err));
    }
  }, [activeOption]);

  // Generate command for Manual tab using Axios
  const handleGenerateCommand = async () => {
    if (!formData.clusterName.trim()) return;
    setManualError("");
    setManualLoading(true);
    try {
      const response = await api.post<CommandResponse>("/clusters/manual/generateCommand", {
        clusterName: formData.clusterName.trim(),
      });
      setManualCommand(response.data);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "An unknown error occurred.";
      setManualError(errMsg);
    } finally {
      setManualLoading(false);
    }
  };

  // File upload handler for YAML/Kubeconfig (if needed)
  const handleFileUpload = async () => {
    console.log("File upload triggered");
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setEditorContent("");
    setManualCommand(null);
    setManualError("");
    setFormData((prev) => ({ ...prev, clusterName: "" }));
    setActiveOption(null);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    // Reset manual command if clusterName is modified
    if (activeOption === "option4") {
      setManualCommand(null);
      setManualError("");
    }
  };

  const tabContentStyles = {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    border: 1,
    borderColor: "divider",
    borderRadius: 1,
    p: 3,
    overflowY: "auto",
    flexGrow: 1,
    minHeight: 0,
    bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
  };

  if (isLoading)
    return (
      <div className="w-full p-4">
        <CircularProgress />
        <p>Loading clusters...</p>
      </div>
    );

  if (error)
    return (
      <div className="w-full p-4">
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          {error instanceof Error ? error.message : "Failed to load clusters. Please try again later."}
        </Alert>
      </div>
    );

  const clusters = data?.itsData || [];

  const handleNextPage = () => setCurrentPage((prev) => prev + 1);
  const handlePreviousPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  const colors = {
    primary: "#2f86ff",
    primaryLight: "#9ad6f9",
    primaryDark: "#1a65cc",
    secondary: "#67c073",
    white: "#ffffff",
    background: theme === "dark" ? "#0f172a" : "#ffffff",
    paper: theme === "dark" ? "#1e293b" : "#f8fafc",
    text: theme === "dark" ? "#f1f5f9" : "#1e293b",
    textSecondary: theme === "dark" ? "#94a3b8" : "#64748b",
    border: theme === "dark" ? "#334155" : "#e2e8f0",
    success: "#67c073",
    warning: "#ffb347",
    error: "#ff6b6b",
    disabled: theme === "dark" ? "#475569" : "#94a3b8",
  };

  return (
    <>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>

      <Dialog
        open={!!activeOption}
        onClose={onCancel}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: "80vh",
            display: "flex",
            flexDirection: "column",
            m: 2,
            bgcolor: bgColor,
            color: textColor,
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: 1, borderColor: "divider", p: 2, flex: "0 0 auto" }}>
          Import Cluster
        </DialogTitle>
        <DialogContent sx={{ p: 0, flex: 1, overflow: "hidden" }}>
          <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Tabs
              value={activeOption}
              onChange={(_event, newValue) => setActiveOption(newValue)}
              sx={{
                borderBottom: 2,
                borderColor: "divider",
                bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
                "& .MuiTab-root": {
                  px: 3,
                  py: 1.5,
                  color: textColor,
                  borderRight: 1,
                  borderColor: "divider",
                  "&.Mui-selected": {
                    color: "primary.main",
                    bgcolor: theme === "dark" ? "rgba(144, 202, 249, 0.08)" : "#E3F2FD",
                    borderBottom: 2,
                    borderColor: "primary.main",
                  },
                  "&:hover": {
                    bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
                  },
                },
                "& .MuiTabs-indicator": {
                  height: 3,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                },
              }}
            >
              <Tab label="YAML paste" value="option1" />
              <Tab label="Kubeconfig" value="option2" />
              <Tab label="API/URL" value="option3" />
              <Tab label="Manual" value="option4" />
            </Tabs>

            <Box sx={{ flex: 1, overflow: "auto", p: 3 }}>
              {activeOption === "option1" && (
                <Box sx={tabContentStyles}>
                  <Alert severity="info">
                    <AlertTitle>Info</AlertTitle>
                    Paste a YAML file.
                  </Alert>
                  <FormControl
                    sx={{
                      flex: "0 0 auto",
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 1,
                        "& fieldset": { borderWidth: 1, borderColor: "divider" },
                        "&:hover fieldset": { borderColor: "primary.main" },
                      },
                    }}
                  >
                    <InputLabel sx={{ color: textColor }}>File Type</InputLabel>
                    <Select
                      value={fileType}
                      onChange={(e) => {
                        setFileType(e.target.value as "yaml");
                        setEditorContent("");
                      }}
                      label="File Type"
                      sx={{ bgcolor: bgColor, color: textColor }}
                    >
                      <MenuItem value="yaml">YAML</MenuItem>
                    </Select>
                  </FormControl>
                  <Box sx={{ flex: 1, minHeight: 0, border: 1, borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
                    <Editor
                      height="100%"
                      language={fileType}
                      value={editorContent}
                      theme={theme === "dark" ? "vs-dark" : "light"}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                      }}
                      onChange={(value) => setEditorContent(value || "")}
                    />
                  </Box>
                  <DialogActions sx={{ pt: 2, borderTop: 1, borderColor: "divider" }}>
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button
                      variant="contained"
                      disabled={!editorContent}
                      sx={{
                        "&:disabled": { cursor: "not-allowed", pointerEvents: "all !important" },
                        boxShadow: 2,
                      }}
                    >
                      Upload
                    </Button>
                  </DialogActions>
                </Box>
              )}

              {activeOption === "option2" && (
                <Box sx={tabContentStyles}>
                  <Alert severity="info">
                    <AlertTitle>Info</AlertTitle>
                    Select a kubeconfig file to import cluster.
                  </Alert>
                  <Box
                    sx={{
                      border: 2,
                      borderStyle: "dashed",
                      borderColor: "divider",
                      borderRadius: 2,
                      p: 3,
                      textAlign: "center",
                      transition: "border-color 0.2s",
                      "&:hover": { borderColor: "primary.main" },
                    }}
                  >
                    <Box sx={{ borderRadius: 1, p: 2, textAlign: "center" }}>
                      <Button component="label" sx={{ boxShadow: 2 }}>
                        Select Kubeconfig file
                        <input
                          type="file"
                          hidden
                          accept=".kube/config, .yaml, .yml"
                          onClick={(e) => (e.currentTarget.value = "")}
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setSelectedFile(file);
                          }}
                        />
                      </Button>
                    </Box>
                    {selectedFile && (
                      <Box sx={{ mt: 2 }}>
                        Selected file: <strong>{selectedFile.name}</strong>
                      </Box>
                    )}
                  </Box>
                  <DialogActions>
                    <Button onClick={handleCancel}>Cancel</Button>
                    <Button
                      variant="contained"
                      onClick={handleFileUpload}
                      disabled={!selectedFile}
                      sx={{
                        "&:disabled": { cursor: "not-allowed", pointerEvents: "all !important" },
                        boxShadow: 2,
                      }}
                    >
                      Upload & Import
                    </Button>
                  </DialogActions>
                </Box>
              )}

              {activeOption === "option3" && (
                <Box sx={tabContentStyles}>
                  <Alert severity="info">
                    <AlertTitle>Info</AlertTitle>
                    Enter API/URL to import cluster.
                  </Alert>
                  <TextField
                    fullWidth
                    label="API/URL"
                    value={formData.clusterName}
                    onChange={(e) => setFormData({ ...formData, clusterName: e.target.value })}
                    sx={commonInputSx}
                  />
                  <DialogActions>
                    <Button onClick={handleCancel} sx={{ color: textColor }}>
                      Cancel
                    </Button>
                    <Button variant="contained" sx={{ boxShadow: 2 }}>
                      Import
                    </Button>
                  </DialogActions>
                </Box>
              )}

              {activeOption === "option4" && (
                <Box sx={tabContentStyles}>
                  <Alert severity="info">
                    <AlertTitle>Info</AlertTitle>
                    Enter the cluster name to generate the onboarding command.
                  </Alert>
                  <Box sx={formContentStyles}>
                    <TextField
                      label="Cluster Name"
                      variant="outlined"
                      name="clusterName"
                      value={formData.clusterName}
                      onChange={handleChange}
                      sx={commonInputSx}
                      fullWidth
                    />
                    {!manualCommand ? (
                      <Box display="flex" flexDirection="column" gap={2}>
                        {manualError && (
                          <Alert severity="error">
                            <AlertTitle>Error</AlertTitle>
                            {manualError}
                          </Alert>
                        )}
                        <Button
                          variant="contained"
                          onClick={handleGenerateCommand}
                          disabled={!formData.clusterName.trim() || manualLoading}
                          sx={{ minWidth: { xs: "100%", sm: 150 } }}
                        >
                          {manualLoading ? (
                            <CircularProgress size={24} color="inherit" />
                          ) : (
                            "Generate Command"
                          )}
                        </Button>
                      </Box>
                    ) : (
                      <Box display="flex" flexDirection="column" gap={2}>
                        <Alert severity="success">
                          <AlertTitle>Success</AlertTitle>
                          Command generated for cluster: <strong>{manualCommand.clusterName}</strong>
                        </Alert>
                        <Box
                          component="pre"
                          p={2}
                          sx={{
                            backgroundColor: "#f5f5f5",
                            borderRadius: 1,
                            overflowX: "auto",
                          }}
                        >
                          {manualCommand.command}
                        </Box>
                        <Button
                          variant="contained"
                          onClick={() => navigator.clipboard.writeText(manualCommand.command)}
                          sx={{ minWidth: { xs: "100%", sm: 150 } }}
                        >
                          Copy Command
                        </Button>
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ mt: "auto", pt: 2, borderTop: 1, borderColor: "divider" }}>
                    <DialogActions>
                      <Button onClick={handleCancel}>Cancel</Button>
                    </DialogActions>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Pagination and Clusters Table */}
      <div>
        <button onClick={handlePreviousPage} disabled={currentPage === 1}>
          Previous
        </button>
        <button onClick={handleNextPage}>Next</button>
      </div>
      <h2>Clusters</h2>
      <TableContainer
        component={Paper}
        className="overflow-auto"
        sx={{
          backgroundColor: colors.paper,
          boxShadow:
            theme === "dark"
              ? "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)"
              : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
          borderRadius: "12px",
          border: `1px solid ${colors.border}`,
        }}
      >
        <Table>
          <TableHead>
            <TableRow
              sx={{
                background: colors.primary,
                "& .MuiTableCell-head": {
                  color: colors.white,
                  fontWeight: 600,
                  padding: "16px",
                  fontSize: "0.95rem",
                },
              }}
            >
              <TableCell>
                <Checkbox
                  checked={false}
                  sx={{
                    color: colors.white,
                    "&.Mui-checked": { color: colors.white },
                  }}
                />
              </TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Labels</TableCell>
              <TableCell>Creation Time</TableCell>
              <TableCell>Context</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clusters.length > 0 ? (
              clusters.map((cluster) => (
                <TableRow
                  key={cluster.name}
                  sx={{
                    backgroundColor: colors.paper,
                    "&:hover": {
                      backgroundColor:
                        theme === "dark" ? "rgba(47, 134, 255, 0.08)" : "rgba(47, 134, 255, 0.04)",
                    },
                    "& .MuiTableCell-body": {
                      color: colors.text,
                      borderColor: colors.border,
                      padding: "12px 16px",
                    },
                  }}
                >
                  <TableCell>
                    <Checkbox sx={{ color: colors.textSecondary, "&.Mui-checked": { color: colors.primary } }} />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{cluster.name}</div>
                  </TableCell>
                  <TableCell>
                    {cluster.labels && Object.keys(cluster.labels).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(cluster.labels).map(([key, value]) => (
                          <span
                            key={`${key}-${value}`}
                            style={{
                              backgroundColor:
                                theme === "dark" ? "rgba(47, 134, 255, 0.15)" : "rgba(47, 134, 255, 0.08)",
                              color: colors.primary,
                              border: `1px solid ${
                                theme === "dark" ? "rgba(47, 134, 255, 0.4)" : "rgba(47, 134, 255, 0.3)"
                              }`,
                            }}
                            className="px-2 py-1 rounded text-xs font-medium"
                          >
                            {key}={value}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: colors.textSecondary }}>No labels</span>
                    )}
                  </TableCell>
                  <TableCell>{new Date(cluster.creationTime).toLocaleString()}</TableCell>
                  <TableCell>
                    <span
                      style={{
                        backgroundColor:
                          theme === "dark" ? "rgba(103, 192, 115, 0.2)" : "rgba(103, 192, 115, 0.1)",
                        color: theme === "dark" ? "rgb(154, 214, 249)" : "rgb(47, 134, 255)",
                        border: `1px solid ${
                          theme === "dark" ? "rgba(103, 192, 115, 0.4)" : "rgba(103, 192, 115, 0.3)"
                        }`,
                      }}
                      className="px-2 py-1 text-xs font-medium rounded-lg"
                    >
                      {cluster.context}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className="px-2 py-1 text-xs font-medium rounded-lg inline-flex items-center gap-1"
                      style={{
                        backgroundColor:
                          cluster.status === "Inactive"
                            ? theme === "dark"
                              ? "rgba(255, 107, 107, 0.2)"
                              : "rgba(255, 107, 107, 0.1)"
                            : cluster.status === "Pending"
                            ? theme === "dark"
                              ? "rgba(255, 179, 71, 0.2)"
                              : "rgba(255, 179, 71, 0.1)"
                            : theme === "dark"
                            ? "rgba(103, 192, 115, 0.2)"
                            : "rgba(103, 192, 115, 0.1)",
                        color:
                          cluster.status === "Inactive"
                            ? colors.error
                            : cluster.status === "Pending"
                            ? colors.warning
                            : colors.success,
                        border:
                          cluster.status === "Inactive"
                            ? `1px solid ${
                                theme === "dark" ? "rgba(255, 107, 107, 0.4)" : "rgba(255, 107, 107, 0.3)"
                              }`
                            : cluster.status === "Pending"
                            ? `1px solid ${
                                theme === "dark" ? "rgba(255, 179, 71, 0.4)" : "rgba(255, 179, 71, 0.3)"
                              }`
                            : `1px solid ${
                                theme === "dark" ? "rgba(103, 192, 115, 0.4)" : "rgba(103, 192, 115, 0.3)"
                              }`,
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor:
                            cluster.status === "Inactive"
                              ? colors.error
                              : cluster.status === "Pending"
                              ? colors.warning
                              : colors.success,
                        }}
                      ></span>
                      {cluster.status || "Active✓"}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-12">
                  <div className="flex flex-col items-center justify-center text-center p-6">
                    <CloudOff size={48} style={{ color: colors.textSecondary, marginBottom: "16px" }} />
                    <h3 style={{ color: colors.text }} className="text-lg font-semibold mb-2">
                      No Clusters Found
                    </h3>
                    <p style={{ color: colors.textSecondary }} className="mb-4 max-w-md">
                      {clusters.length === 0 ? "No clusters available" : "No clusters match your search criteria"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <div className="flex justify-between items-center mt-6 px-2">
        <Button
          disabled={currentPage === 1}
          onClick={handlePreviousPage}
          sx={{
            color: currentPage === 1 ? colors.disabled : colors.primary,
            borderColor: currentPage === 1 ? colors.disabled : colors.primary,
            backgroundColor: theme === "dark" && currentPage !== 1 ? "rgba(47, 134, 255, 0.1)" : "transparent",
            "&:hover": {
              borderColor: colors.primaryLight,
              backgroundColor: theme === "dark" ? "rgba(47, 134, 255, 0.2)" : "rgba(47, 134, 255, 0.1)",
            },
            "&.Mui-disabled": { color: colors.disabled, borderColor: colors.disabled },
            textTransform: "none",
            fontWeight: "600",
            padding: "6px 16px",
            borderRadius: "8px",
          }}
          variant="outlined"
        >
          Previous
        </Button>
        <div className="flex items-center gap-2">
          <span style={{ color: colors.textSecondary }} className="font-medium">
            Page {currentPage} of {data?.totalPages || 1}
          </span>
        </div>
        <Button
          disabled={currentPage === (data?.totalPages || 1)}
          onClick={handleNextPage}
          sx={{
            color: currentPage === (data?.totalPages || 1) ? colors.disabled : colors.primary,
            borderColor: currentPage === (data?.totalPages || 1) ? colors.disabled : colors.primary,
            backgroundColor: theme === "dark" && currentPage !== (data?.totalPages || 1) ? "rgba(47, 134, 255, 0.1)" : "transparent",
            "&:hover": {
              borderColor: colors.primaryLight,
              backgroundColor: theme === "dark" ? "rgba(47, 134, 255, 0.2)" : "rgba(47, 134, 255, 0.1)",
            },
            "&.Mui-disabled": { color: colors.disabled, borderColor: colors.disabled },
            textTransform: "none",
            fontWeight: "600",
            padding: "6px 16px",
            borderRadius: "8px",
          }}
          variant="outlined"
        >
          Next
        </Button>
      </div>
    </>
  );
};

export default ImportClusters;

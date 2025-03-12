import React, { useState, ChangeEvent } from "react";
import {
  Dialog,
  DialogContent,
  Button,
  Tabs,
  Tab,
  Box,
  Alert,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Snackbar,
} from "@mui/material";
import Editor from "@monaco-editor/react";
import useTheme from "../stores/themeStore";
import { api } from "../lib/api";

// Common styling objects
const commonInputSx = {
  mb: 2,
  input: { color: "inherit" },
  label: { color: "inherit" },
  fieldset: { borderColor: "inherit" },
  "& .MuiInputLabel-root.Mui-focused": { color: "inherit" },
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
  const theme = useTheme((state) => state.theme);
  const textColor = theme === "dark" ? "white" : "black";
  const bgColor = theme === "dark" ? "#1F2937" : "background.paper";

  // Define colors first, before any styling objects that use it
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

  const [manualCommand, setManualCommand] = useState<CommandResponse | null>(null);
  const [manualLoading, setManualLoading] = useState<boolean>(false);
  const [manualError, setManualError] = useState<string>("");

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

  // Enhanced styling objects - now defined after colors
  const enhancedTabContentStyles = {
    ...tabContentStyles,
    borderRadius: 2,
    boxShadow: theme === "dark" 
      ? "inset 0 1px 3px 0 rgba(0, 0, 0, 0.3)" 
      : "inset 0 1px 3px 0 rgba(0, 0, 0, 0.06)",
    transition: "all 0.2s ease-in-out",
    bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
  };

  const buttonStyles = {
    textTransform: "none",
    fontWeight: 600,
    borderRadius: 1.5,
    py: { xs: 1, sm: 1.2, md: 1.4 },
    px: { xs: 2, sm: 3, md: 4 },
    boxShadow: theme === "dark" ? "0 4px 6px -1px rgba(0, 0, 0, 0.2)" : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    transition: "all 0.2s ease",
    fontSize: { xs: "0.875rem", sm: "0.9rem", md: "1rem" },
  };

  const primaryButtonStyles = {
    ...buttonStyles,
    bgcolor: colors.primary,
    color: colors.white,
    "&:hover": {
      bgcolor: colors.primaryDark,
      transform: "translateY(-2px)",
      boxShadow: theme === "dark" 
        ? "0 6px 10px -1px rgba(0, 0, 0, 0.3)" 
        : "0 6px 10px -1px rgba(0, 0, 0, 0.15)",
    },
    "&:active": {
      transform: "translateY(0)",
    },
    "&.Mui-disabled": {
      bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
      color: theme === "dark" ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.26)",
    }
  };

  const secondaryButtonStyles = {
    ...buttonStyles,
    bgcolor: "transparent",
    color: textColor,
    border: 1,
    borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.23)" : "rgba(0, 0, 0, 0.23)",
    "&:hover": {
      bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
      borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)",
      transform: "translateY(-2px)",
      boxShadow: theme === "dark" 
        ? "0 4px 8px -2px rgba(0, 0, 0, 0.3)" 
        : "0 4px 8px -2px rgba(0, 0, 0, 0.1)",
    },
    "&:active": {
      transform: "translateY(0)",
    }
  };


  return (
    <>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity={snackbar.severity}
          sx={{
            borderRadius: 2,
            boxShadow: theme === "dark" 
              ? "0 8px 16px rgba(0, 0, 0, 0.4)" 
              : "0 8px 16px rgba(0, 0, 0, 0.1)",
            "& .MuiAlert-icon": {
              fontSize: "1.5rem",
              mr: 1.5
            },
            "& .MuiAlert-message": {
              fontSize: "0.95rem",
              fontWeight: 500
            }
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Dialog
        open={!!activeOption}
        onClose={onCancel}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: { xs: "90vh", sm: "85vh", md: "80vh" },
            display: "flex",
            flexDirection: "column",
            m: { xs: 0.5, sm: 1, md: 2 },
            bgcolor: bgColor,
            color: textColor,
            borderRadius: { xs: 1, sm: 2, md: 3 },
            overflow: "hidden",
            boxShadow: theme === "dark" 
              ? "0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 10px 10px -5px rgba(0, 0, 0, 0.5)" 
              : "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
            border: theme === "dark" ? `1px solid ${colors.border}` : "none",
            maxWidth: { sm: "98%", md: "95%", lg: "1000px" },
          },
        }}
        TransitionProps={{
          style: {
            transition: "transform 0.3s ease-out, opacity 0.3s ease"
          }
        }}
      >
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            p: { xs: 1, sm: 1.5, md: 2 },
            flex: "0 0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
            bgcolor: theme === "dark" ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.02)",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box sx={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 1,
              color: theme === "dark" ? colors.primaryLight : colors.primary,
            }}>
              <Box 
                sx={{ 
                  width: { xs: 32, sm: 36 }, 
                  height: { xs: 32, sm: 36 }, 
                  borderRadius: "10px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.15)" : "rgba(47, 134, 255, 0.1)",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                <span role="img" aria-label="import" style={{ fontSize: "1.25rem" }}>⚓</span>
              </Box>
              <Box>
                <Box sx={{ fontSize: { xs: "1rem", sm: "1.1rem" }, fontWeight: 700, color: textColor }}>
                  Import Cluster
                </Box>
                <Box sx={{ 
                  fontSize: "0.75rem",
                  color: colors.textSecondary, 
                  mt: 0.25,
                  display: { xs: "none", sm: "block" } 
                }}>
                  Connect your Kubernetes cluster to the platform
                </Box>
              </Box>
            </Box>
            <Button 
              onClick={onCancel}
              sx={{ 
                minWidth: 'auto', 
                p: 0.5,
                borderRadius: "50%",
                color: theme === "dark" ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)",
                "&:hover": {
                  backgroundColor: theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                }
              }}
            >
              <Box sx={{ fontSize: "1.1rem" }}>✕</Box>
            </Button>
          </Box>
          
          <Tabs
            value={activeOption}
            onChange={(_event, newValue) => setActiveOption(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              mt: 0.25,
              "& .MuiTabs-flexContainer": {
                gap: { xs: 0.25, sm: 0.5 },
              },
              "& .MuiTab-root": {
                minHeight: { xs: 36, sm: 40 },
                px: { xs: 1, sm: 1.5 },
                py: { xs: 0.5, sm: 0.75 },
                color: colors.textSecondary,
                fontSize: { xs: "0.75rem", sm: "0.8rem" },
                fontWeight: 500,
                transition: "all 0.2s ease",
                borderRadius: "8px",
                "&.Mui-selected": {
                  color: theme === "dark" ? colors.white : colors.primary,
                  bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.15)" : "rgba(47, 134, 255, 0.08)",
                  fontWeight: 600,
                },
                "&:hover": {
                  bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
                  color: theme === "dark" ? colors.primaryLight : colors.primary,
                },
              },
              "& .MuiTabs-indicator": {
                display: "none",
              },
            }}
          >
            <Tab 
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Box 
                    sx={{ 
                      width: 24, 
                      height: 24, 
                      borderRadius: "6px", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.04)",
                    }}
                  >
                    <span role="img" aria-label="yaml" style={{ fontSize: "0.9rem" }}>📄</span>
                  </Box>
                  YAML
                </Box>
              } 
              value="option1" 
            />
            <Tab 
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Box 
                    sx={{ 
                      width: 24, 
                      height: 24, 
                      borderRadius: "6px", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.04)",
                    }}
                  >
                    <span role="img" aria-label="kubeconfig" style={{ fontSize: "0.9rem" }}>📁</span>
                  </Box>
                  Kubeconfig
                </Box>
              } 
              value="option2" 
            />
            <Tab 
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Box 
                    sx={{ 
                      width: 24, 
                      height: 24, 
                      borderRadius: "6px", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.04)",
                    }}
                  >
                    <span role="img" aria-label="api" style={{ fontSize: "0.9rem" }}>🔗</span>
                  </Box>
                  API/URL
                </Box>
              } 
              value="option3" 
            />
            <Tab 
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Box 
                    sx={{ 
                      width: 24, 
                      height: 24, 
                      borderRadius: "6px", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.04)",
                    }}
                  >
                    <span role="img" aria-label="manual" style={{ fontSize: "0.9rem" }}>⚙️</span>
                  </Box>
                  Manual
                </Box>
              } 
              value="option4" 
            />
          </Tabs>
        </Box>

        <DialogContent sx={{ p: 0, flex: 1, overflow: "hidden" }}>
          <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Box sx={{ flex: 1, overflow: "auto", p: { xs: 1, sm: 1.5 } }}>
              {/* YAML paste option */}
              {activeOption === "option1" && (
                <Box sx={{
                  ...enhancedTabContentStyles,
                  border: "none",
                  boxShadow: "none",
                  bgcolor: "transparent",
                  p: 0,
                }}>
                  <Box sx={{
                    p: { xs: 1.5, sm: 2, md: 2.5 },
                    borderRadius: { xs: 1.5, sm: 2 },
                    backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.8)",
                    border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
                    boxShadow: theme === "dark" 
                      ? "0 4px 12px rgba(0, 0, 0, 0.3)" 
                      : "0 4px 12px rgba(0, 0, 0, 0.05)",
                    mb: 1.5,
                    width: "100%",
                    maxWidth: "100%",
                    display: "flex",
                    flexDirection: "column",
                    height: "calc(100% - 8px)",
                  }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                      <Box 
                        sx={{ 
                          width: 36, 
                          height: 36, 
                          borderRadius: "8px", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.15)" : "rgba(47, 134, 255, 0.1)",
                          color: theme === "dark" ? colors.primaryLight : colors.primary,
                        }}
                      >
                        <span role="img" aria-label="info" style={{ fontSize: "1.25rem" }}>📄</span>
                      </Box>
                      <Box>
                        <Box sx={{ fontWeight: 600, fontSize: "1rem", color: textColor }}>
                          Paste your Kubernetes YAML configuration
                        </Box>
                        <Box sx={{ color: colors.textSecondary, fontSize: "0.875rem", mt: 0.5 }}>
                          Import your cluster by pasting a valid Kubernetes YAML configuration
                        </Box>
                      </Box>
                    </Box>

                  <FormControl
                    sx={{
                        mb: 3,
                      "& .MuiOutlinedInput-root": {
                          borderRadius: 1.5,
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
                        sx={{ 
                          bgcolor: theme === "dark" ? "rgba(0, 0, 0, 0.2)" : bgColor, 
                          color: textColor,
                          minWidth: 150,
                        }}
                    >
                      <MenuItem value="yaml">YAML</MenuItem>
                    </Select>
                  </FormControl>

                    <Box 
                      sx={{ 
                        height: { xs: "calc(100% - 160px)", sm: "calc(100% - 170px)", md: "calc(100% - 180px)" },
                        border: 1, 
                        borderColor: "divider", 
                        borderRadius: 1.5,
                        overflow: "hidden",
                        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)",
                        mb: 1.5,
                      }}
                    >
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
                          padding: { top: 16, bottom: 16 },
                          fontFamily: "'Fira Code', monospace",
                      }}
                      onChange={(value) => setEditorContent(value || "")}
                    />
                  </Box>

                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
                      <Button 
                        onClick={onCancel}
                        variant="outlined"
                        sx={secondaryButtonStyles}
                      >
                        Cancel
                      </Button>
                    <Button
                      variant="contained"
                      disabled={!editorContent}
                        sx={primaryButtonStyles}
                    >
                        Import Cluster
                    </Button>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Kubeconfig option */}
              {activeOption === "option2" && (
                <Box sx={{
                  ...enhancedTabContentStyles,
                  border: "none",
                  boxShadow: "none",
                  bgcolor: "transparent",
                  p: 0,
                }}>
                  <Box sx={{
                    p: { xs: 1.5, sm: 2, md: 2.5 },
                    borderRadius: { xs: 1.5, sm: 2 },
                    backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.8)",
                    border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
                    boxShadow: theme === "dark" 
                      ? "0 4px 12px rgba(0, 0, 0, 0.3)" 
                      : "0 4px 12px rgba(0, 0, 0, 0.05)",
                    mb: 1.5,
                    width: "100%",
                    maxWidth: "100%",
                    display: "flex",
                    flexDirection: "column",
                    height: "calc(100% - 8px)",
                  }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                      <Box 
                        sx={{ 
                          width: 36, 
                          height: 36, 
                          borderRadius: "8px", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.15)" : "rgba(47, 134, 255, 0.1)",
                          color: theme === "dark" ? colors.primaryLight : colors.primary,
                        }}
                      >
                        <span role="img" aria-label="info" style={{ fontSize: "1.25rem" }}>📁</span>
                      </Box>
                      <Box>
                        <Box sx={{ fontWeight: 600, fontSize: "1rem", color: textColor }}>
                          Upload Kubeconfig File
                        </Box>
                        <Box sx={{ color: colors.textSecondary, fontSize: "0.875rem", mt: 0.5 }}>
                          Import your cluster by uploading a kubeconfig file
                        </Box>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        border: 1,
                        borderStyle: "dashed",
                        borderColor: "divider",
                        borderRadius: { xs: 1.5, sm: 2 },
                        p: { xs: 1.5, sm: 2 },
                        textAlign: "center",
                        transition: "all 0.3s ease",
                        backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.01)",
                        "&:hover": { 
                          borderColor: "primary.main",
                          backgroundColor: theme === "dark" ? "rgba(47, 134, 255, 0.05)" : "rgba(47, 134, 255, 0.02)",
                        },
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "calc(100% - 160px)",
                        mb: 1.5,
                      }}
                    >
                      <Box 
                        sx={{ 
                          mb: 2,
                          p: 1.5,
                          borderRadius: "50%",
                          backgroundColor: theme === "dark" ? "rgba(47, 134, 255, 0.1)" : "rgba(47, 134, 255, 0.05)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span role="img" aria-label="upload" style={{ fontSize: "1.5rem" }}>📤</span>
                      </Box>
                      <Box sx={{ mb: 1.5, fontWeight: 500, fontSize: "0.9rem" }}>
                        Drag and drop your kubeconfig file here
                      </Box>
                      <Box sx={{ color: colors.textSecondary, mb: 1.5, fontSize: "0.8rem" }}>
                        - or -
                      </Box>
                      <Button 
                        component="label" 
                        variant="contained"
                        sx={primaryButtonStyles}
                      >
                        Browse Files
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
                    {selectedFile && (
                        <Box 
                          sx={{ 
                            mt: 3, 
                            p: 2, 
                            borderRadius: 2, 
                            backgroundColor: theme === "dark" ? "rgba(47, 134, 255, 0.1)" : "rgba(47, 134, 255, 0.05)",
                            border: `1px solid ${theme === "dark" ? "rgba(47, 134, 255, 0.3)" : "rgba(47, 134, 255, 0.2)"}`,
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 1.5,
                            animation: "fadeIn 0.3s ease",
                            "@keyframes fadeIn": {
                              "0%": { opacity: 0, transform: "translateY(10px)" },
                              "100%": { opacity: 1, transform: "translateY(0)" }
                            }
                          }}
                        >
                          <span role="img" aria-label="file" style={{ fontSize: "1.25rem" }}>📄</span>
                          <Box>
                            <Box sx={{ fontWeight: 600 }}>{selectedFile.name}</Box>
                            <Box sx={{ fontSize: "0.75rem", color: colors.textSecondary }}>
                              {(selectedFile.size / 1024).toFixed(1)} KB
                            </Box>
                          </Box>
                      </Box>
                    )}
                  </Box>

                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
                      <Button 
                        onClick={handleCancel}
                        variant="outlined"
                        sx={secondaryButtonStyles}
                      >
                        Cancel
                      </Button>
                    <Button
                      variant="contained"
                      onClick={handleFileUpload}
                      disabled={!selectedFile}
                        sx={primaryButtonStyles}
                    >
                        Import Cluster
                    </Button>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* API/URL option */}
              {activeOption === "option3" && (
                <Box sx={{
                  ...enhancedTabContentStyles,
                  border: "none",
                  boxShadow: "none",
                  bgcolor: "transparent",
                  p: 0,
                }}>
                  <Box sx={{
                    p: { xs: 1.5, sm: 2, md: 2.5 },
                    borderRadius: { xs: 1.5, sm: 2 },
                    backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.8)",
                    border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
                    boxShadow: theme === "dark" 
                      ? "0 4px 12px rgba(0, 0, 0, 0.3)" 
                      : "0 4px 12px rgba(0, 0, 0, 0.05)",
                    mb: 1.5,
                    width: "100%",
                    maxWidth: "100%",
                    display: "flex",
                    flexDirection: "column",
                    height: "calc(100% - 8px)",
                  }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                      <Box 
                        sx={{ 
                          width: 36, 
                          height: 36, 
                          borderRadius: "8px", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.15)" : "rgba(47, 134, 255, 0.1)",
                          color: theme === "dark" ? colors.primaryLight : colors.primary,
                        }}
                      >
                        <span role="img" aria-label="info" style={{ fontSize: "1.25rem" }}>🔗</span>
                      </Box>
                      <Box>
                        <Box sx={{ fontWeight: 600, fontSize: "1rem", color: textColor }}>
                          Connect via API/URL
                        </Box>
                        <Box sx={{ color: colors.textSecondary, fontSize: "0.875rem", mt: 0.5 }}>
                          Import your cluster by providing the API endpoint and authentication details
                        </Box>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                        label="API/URL Endpoint"
                        placeholder="https://kubernetes.example.com:6443"
                    value={formData.clusterName}
                    onChange={(e) => setFormData({ ...formData, clusterName: e.target.value })}
                    InputProps={{
                      sx: {
                        borderRadius: 1.5,
                        backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)",
                        color: theme === "dark" ? "#ffffff" : "inherit",
                      },
                      startAdornment: (
                        <Box sx={{ color: colors.textSecondary, mr: 1 }}>🔗</Box>
                      ),
                    }}
                    sx={{
                      ...commonInputSx,
                      "& .MuiOutlinedInput-root": {
                        color: theme === "dark" ? "#ffffff" : "inherit",
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: "primary.main",
                          borderWidth: "1px",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "primary.main",
                          borderWidth: "2px",
                        },
                      },
                      "& .MuiOutlinedInput-input": {
                        color: theme === "dark" ? "#ffffff" : "inherit",
                      },
                      "& .MuiInputLabel-root": {
                        color: theme === "dark" ? "rgba(255, 255, 255, 0.7)" : "inherit",
                      },
                      "& .MuiInputLabel-root.Mui-focused": {
                        color: theme === "dark" ? colors.primaryLight : colors.primary,
                      },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Authentication Token (Optional)"
                    placeholder="Enter authentication token if required"
                    type="password"
                    value={formData.token}
                    onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                    InputProps={{
                      sx: {
                        borderRadius: 1.5,
                        backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)",
                        color: theme === "dark" ? "#ffffff" : "inherit",
                      },
                      startAdornment: (
                        <Box sx={{ color: colors.textSecondary, mr: 1 }}>🔒</Box>
                      ),
                    }}
                    sx={{
                      ...commonInputSx,
                      mb: 0,
                      "& .MuiOutlinedInput-root": {
                        color: theme === "dark" ? "#ffffff" : "inherit",
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: "primary.main",
                          borderWidth: "1px",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "primary.main",
                          borderWidth: "2px",
                        },
                      },
                      "& .MuiOutlinedInput-input": {
                        color: theme === "dark" ? "#ffffff" : "inherit",
                      },
                      "& .MuiInputLabel-root": {
                        color: theme === "dark" ? "rgba(255, 255, 255, 0.7)" : "inherit",
                      },
                      "& .MuiInputLabel-root.Mui-focused": {
                        color: theme === "dark" ? colors.primaryLight : colors.primary,
                      },
                    }}
                  />
                </Box>

                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
                      <Button 
                        onClick={handleCancel} 
                        variant="outlined"
                        sx={secondaryButtonStyles}
                      >
                      Cancel
                    </Button>
                      <Button 
                        variant="contained" 
                        disabled={!formData.clusterName.trim()}
                        sx={primaryButtonStyles}
                      >
                        Connect & Import
                    </Button>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Manual option - Enhanced */}
              {activeOption === "option4" && (
                <Box sx={{
                  ...enhancedTabContentStyles,
                  border: "none",
                  boxShadow: "none",
                  bgcolor: "transparent",
                  p: 0,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}>
                  <Box sx={{
                    p: { xs: 1.5, sm: 2, md: 2.5 },
                    borderRadius: { xs: 1.5, sm: 2 },
                    backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.8)",
                    border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
                    boxShadow: theme === "dark" 
                      ? "0 4px 12px rgba(0, 0, 0, 0.3)" 
                      : "0 4px 12px rgba(0, 0, 0, 0.05)",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                  }}>
                    {/* Header with improved description */}
                    <Box sx={{ 
                      display: "flex", 
                      alignItems: "flex-start", 
                      gap: 1.5, 
                      mb: 2,
                      p: 1.5,
                      borderRadius: 1.5,
                      bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.08)" : "rgba(47, 134, 255, 0.04)",
                    }}>
                      <Box 
                        sx={{ 
                          width: 32, 
                          height: 32, 
                          borderRadius: "8px", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.15)" : "rgba(47, 134, 255, 0.1)",
                          color: theme === "dark" ? colors.primaryLight : colors.primary,
                          flexShrink: 0,
                          mt: 0.5,
                        }}
                      >
                        <span role="img" aria-label="info" style={{ fontSize: "1rem" }}>⚙️</span>
                      </Box>
                      <Box>
                        <Box sx={{ fontWeight: 600, fontSize: "0.95rem", color: textColor, mb: 0.5 }}>
                          Manual Cluster Setup
                        </Box>
                        <Box sx={{ color: colors.textSecondary, fontSize: "0.8rem", lineHeight: 1.4 }}>
                          This is the simplest way to connect your Kubernetes cluster. Enter a name below, generate a command, and run it on your cluster to establish the connection.
                        </Box>
                      </Box>
                    </Box>

                    {!manualCommand ? (
                      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                        {/* Input section with improved styling */}
                        <Box sx={{ 
                          backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
                          borderRadius: 1.5,
                          p: 2,
                          mb: 2,
                          border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"}`,
                        }}>
                          <Box sx={{ mb: 1, fontWeight: 500, fontSize: "0.85rem", color: textColor }}>
                            Name your cluster
                          </Box>
                          <TextField
                            variant="outlined"
                            name="clusterName"
                            value={formData.clusterName}
                            onChange={handleChange}
                            placeholder="e.g., production-cluster, dev-k8s"
                            size="small"
                            InputProps={{
                              sx: {
                                borderRadius: 1.5,
                                backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.8)",
                                fontSize: "0.85rem",
                                height: "40px",
                                color: theme === "dark" ? "#ffffff" : "inherit",
                              },
                              startAdornment: (
                                <Box sx={{ color: colors.textSecondary, mr: 1, display: "flex", alignItems: "center" }}>
                                  <span role="img" aria-label="cluster" style={{ fontSize: "0.9rem" }}>🔶</span>
                                </Box>
                              ),
                            }}
                            sx={{
                              ...commonInputSx,
                              mb: 0,
                              "& .MuiOutlinedInput-root": {
                                color: theme === "dark" ? "#ffffff" : "inherit",
                                "&:hover .MuiOutlinedInput-notchedOutline": {
                                  borderColor: colors.primary,
                                  borderWidth: "1px",
                                },
                                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                  borderColor: colors.primary,
                                  borderWidth: "2px",
                                },
                              },
                              "& .MuiOutlinedInput-input": {
                                color: theme === "dark" ? "#ffffff" : "inherit",
                              },
                              "& .MuiInputLabel-root": {
                                color: theme === "dark" ? "rgba(255, 255, 255, 0.7)" : "inherit",
                              },
                              "& .MuiInputLabel-root.Mui-focused": {
                                color: theme === "dark" ? colors.primaryLight : colors.primary,
                              },
                            }}
                            fullWidth
                          />
                          <Box sx={{ 
                            mt: 1, 
                            fontSize: "0.75rem", 
                            color: colors.textSecondary,
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5
                          }}>
                            <span role="img" aria-label="tip" style={{ fontSize: "0.8rem" }}>💡</span>
                            Use a descriptive name that helps you identify this cluster
                          </Box>
                        </Box>

                        {/* Error message with improved styling */}
                        {manualError && (
                          <Alert 
                            severity="error" 
                            icon={<span role="img" aria-label="error" style={{ fontSize: "1rem" }}>❌</span>}
                            sx={{ 
                              mb: 2, 
                              borderRadius: 1.5,
                              py: 1,
                              px: 1.5,
                              animation: "fadeIn 0.3s ease-in-out",
                              "@keyframes fadeIn": {
                                "0%": { opacity: 0, transform: "translateY(-5px)" },
                                "100%": { opacity: 1, transform: "translateY(0)" }
                              },
                              boxShadow: "0 2px 6px rgba(255,107,107,0.15)",
                              "& .MuiAlert-message": {
                                fontSize: "0.8rem",
                              }
                            }}
                          >
                            <Box sx={{ fontWeight: 600 }}>Error</Box>
                            {manualError}
                          </Alert>
                        )}

                        {/* Visual guide with steps */}
                        <Box sx={{ 
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          gap: 1.5,
                          mt: 1,
                        }}>
                          <Box sx={{ 
                            display: "flex", 
                            alignItems: "flex-start", 
                            gap: 1.5,
                            p: 1.5,
                            borderRadius: 1.5,
                            bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
                            border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"}`,
                          }}>
                            <Box sx={{ 
                              width: 24, 
                              height: 24, 
                              borderRadius: "50%", 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center",
                              bgcolor: theme === "dark" ? "rgba(103, 192, 115, 0.15)" : "rgba(103, 192, 115, 0.1)",
                              color: colors.success,
                              flexShrink: 0,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}>
                              1
                            </Box>
                            <Box sx={{ fontSize: "0.8rem", color: colors.textSecondary }}>
                              Enter a unique name for your cluster above
                            </Box>
                          </Box>
                          
                          <Box sx={{ 
                            display: "flex", 
                            alignItems: "flex-start", 
                            gap: 1.5,
                            p: 1.5,
                            borderRadius: 1.5,
                            bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
                            border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"}`,
                          }}>
                            <Box sx={{ 
                              width: 24, 
                              height: 24, 
                              borderRadius: "50%", 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center",
                              bgcolor: theme === "dark" ? "rgba(103, 192, 115, 0.15)" : "rgba(103, 192, 115, 0.1)",
                              color: colors.success,
                              flexShrink: 0,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}>
                              2
                            </Box>
                            <Box sx={{ fontSize: "0.8rem", color: colors.textSecondary }}>
                              Click "Generate Command" to create a connection command
                            </Box>
                          </Box>
                          
                          <Box sx={{ 
                            display: "flex", 
                            alignItems: "flex-start", 
                            gap: 1.5,
                            p: 1.5,
                            borderRadius: 1.5,
                            bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
                            border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"}`,
                          }}>
                            <Box sx={{ 
                              width: 24, 
                              height: 24, 
                              borderRadius: "50%", 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center",
                              bgcolor: theme === "dark" ? "rgba(103, 192, 115, 0.15)" : "rgba(103, 192, 115, 0.1)",
                              color: colors.success,
                              flexShrink: 0,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}>
                              3
                            </Box>
                            <Box sx={{ fontSize: "0.8rem", color: colors.textSecondary }}>
                              Run the generated command on your cluster to establish the connection
                            </Box>
                          </Box>
                        </Box>

                        {/* Button section with improved styling */}
                        <Box sx={{ 
                          display: "flex", 
                          justifyContent: "flex-end", 
                          gap: { xs: 0.75, sm: 1 }, 
                          mt: "auto",
                          pt: 2,
                          borderTop: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"}`,
                        }}>
                          <Button 
                            onClick={handleCancel}
                            variant="outlined"
                            size="small"
                            sx={{
                              ...secondaryButtonStyles,
                              py: { xs: 0.5, sm: 0.75 },
                              px: { xs: 1, sm: 1.5 },
                              fontSize: { xs: "0.75rem", sm: "0.8rem" },
                              minWidth: { xs: "60px", sm: "70px" },
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={handleGenerateCommand}
                            disabled={!formData.clusterName.trim() || manualLoading}
                            sx={{
                              ...primaryButtonStyles,
                              py: { xs: 0.5, sm: 0.75 },
                              px: { xs: 1.5, sm: 2 },
                              fontSize: { xs: "0.75rem", sm: "0.8rem" },
                            }}
                            startIcon={
                              manualLoading ? (
                                <CircularProgress size={14} color="inherit" />
                              ) : (
                                <span role="img" aria-label="generate" style={{ fontSize: "0.9rem" }}>⚡</span>
                              )
                            }
                          >
                            {manualLoading ? "Generating..." : "Generate Command"}
                          </Button>
                        </Box>
                      </Box>
                    ) : (
                      <Box 
                        sx={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          animation: "fadeIn 0.4s ease-in-out",
                          "@keyframes fadeIn": {
                            "0%": { opacity: 0 },
                            "100%": { opacity: 1 }
                          }
                        }}
                      >
                        {/* Success message with improved styling */}
                        <Alert 
                          severity="success" 
                          icon={<span role="img" aria-label="success" style={{ fontSize: "1rem" }}>✅</span>}
                          sx={{ 
                            mb: 2, 
                            borderRadius: 1.5,
                            py: 1,
                            px: 1.5,
                            boxShadow: "0 2px 6px rgba(103,192,115,0.15)",
                            "& .MuiAlert-message": {
                              fontSize: "0.8rem",
                            }
                          }}
                        >
                          <Box sx={{ fontWeight: 600 }}>Command Generated Successfully</Box>
                          <Box sx={{ mt: 0.5 }}>
                            Run this command on your cluster <strong>{manualCommand.clusterName}</strong> to connect it to the platform.
                          </Box>
                        </Alert>

                        {/* Command display with improved styling and text wrapping */}
                        <Box sx={{ position: "relative", mb: 2 }}>
                          <Box
                            component="pre"
                            sx={{
                              flex: "1 1 auto",
                              p: { xs: 1.5, sm: 2 },
                              backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.4)" : "#f5f5f5",
                              color: theme === "dark" ? "#e6e6e6" : "#333",
                              borderRadius: 1.5,
                              overflowX: "auto",
                              border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
                              fontSize: { xs: "0.75rem", sm: "0.8rem" },
                              fontFamily: "'Fira Code', monospace",
                              position: "relative",
                              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
                              lineHeight: 1.4,
                              minHeight: "120px",
                              maxHeight: "200px",
                              whiteSpace: "pre-wrap",
                              wordWrap: "break-word",
                              wordBreak: "break-all",
                              maxWidth: "100%",
                              "&::-webkit-scrollbar": {
                                width: "4px",
                                height: "4px",
                              },
                              "&::-webkit-scrollbar-thumb": {
                                backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)",
                                borderRadius: "2px",
                              },
                              "&::-webkit-scrollbar-track": {
                                backgroundColor: "transparent",
                              },
                              "&::before": {
                                content: '"$"',
                                color: theme === "dark" ? "#9ad6f9" : "#1a65cc",
                                marginRight: "6px",
                                fontWeight: "bold",
                                position: "absolute",
                                left: { xs: "0.75rem", sm: "1rem" },
                                top: { xs: "0.75rem", sm: "1rem" },
                              },
                              paddingLeft: { xs: "1.5rem", sm: "2rem" },
                            }}
                          >
                            {manualCommand.command}
                          </Box>
                          
                          {/* Copy button overlay */}
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => {
                              navigator.clipboard.writeText(manualCommand.command);
                              setSnackbar({
                                open: true,
                                message: "Command copied to clipboard!",
                                severity: "success"
                              });
                            }}
                            sx={{
                              position: "absolute",
                              top: 8,
                              right: 8,
                              minWidth: "auto",
                              p: 0.5,
                              borderRadius: 1,
                              bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.2)" : "rgba(47, 134, 255, 0.1)",
                              color: theme === "dark" ? colors.primaryLight : colors.primary,
                              boxShadow: "none",
                              "&:hover": {
                                bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.3)" : "rgba(47, 134, 255, 0.2)",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                              }
                            }}
                          >
                            <span role="img" aria-label="copy" style={{ fontSize: "0.9rem" }}>📋</span>
                          </Button>
                        </Box>

                        {/* Instructions section with improved styling */}
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ fontWeight: 600, fontSize: "0.85rem", mb: 1.5, color: textColor }}>
                            Next steps:
                          </Box>
                          
                          <Box sx={{ 
                            display: "flex", 
                            flexDirection: "column",
                            gap: 1.5,
                          }}>
                            <Box sx={{ 
                              display: "flex", 
                              alignItems: "flex-start", 
                              gap: 1.5,
                              p: 1.5,
                              borderRadius: 1.5,
                              bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
                              border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"}`,
                            }}>
                              <Box sx={{ 
                                width: 24, 
                                height: 24, 
                                borderRadius: "50%", 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center",
                                bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.15)" : "rgba(47, 134, 255, 0.1)",
                                color: theme === "dark" ? colors.primaryLight : colors.primary,
                                flexShrink: 0,
                                fontSize: "0.75rem",
                                fontWeight: 600,
                              }}>
                                1
                              </Box>
                              <Box sx={{ fontSize: "0.8rem", color: colors.textSecondary }}>
                                Copy the command above and run it on your Kubernetes cluster
                              </Box>
                            </Box>
                            
                            <Box sx={{ 
                              display: "flex", 
                              alignItems: "flex-start", 
                              gap: 1.5,
                              p: 1.5,
                              borderRadius: 1.5,
                              bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
                              border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"}`,
                            }}>
                              <Box sx={{ 
                                width: 24, 
                                height: 24, 
                                borderRadius: "50%", 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center",
                                bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.15)" : "rgba(47, 134, 255, 0.1)",
                                color: theme === "dark" ? colors.primaryLight : colors.primary,
                                flexShrink: 0,
                                fontSize: "0.75rem",
                                fontWeight: 600,
                              }}>
                                2
                              </Box>
                              <Box sx={{ fontSize: "0.8rem", color: colors.textSecondary }}>
                                Wait for the connection to be established (this may take a few moments)
                              </Box>
                            </Box>
                            
                            <Box sx={{ 
                              display: "flex", 
                              alignItems: "flex-start", 
                              gap: 1.5,
                              p: 1.5,
                              borderRadius: 1.5,
                              bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
                              border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"}`,
                            }}>
                              <Box sx={{ 
                                width: 24, 
                                height: 24, 
                                borderRadius: "50%", 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center",
                                bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.15)" : "rgba(47, 134, 255, 0.1)",
                                color: theme === "dark" ? colors.primaryLight : colors.primary,
                                flexShrink: 0,
                                fontSize: "0.75rem",
                                fontWeight: 600,
                              }}>
                                3
                              </Box>
                              <Box sx={{ fontSize: "0.8rem", color: colors.textSecondary }}>
                                Your cluster will appear in the clusters list when connected
                              </Box>
                            </Box>
                          </Box>
                        </Box>

                        {/* Button section with improved styling */}
                        <Box sx={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          gap: { xs: 0.75, sm: 1 }, 
                          mt: "auto",
                          pt: 2,
                          borderTop: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"}`,
                        }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setManualCommand(null);
                              setFormData(prev => ({ ...prev, clusterName: "" }));
                            }}
                            sx={{
                              ...secondaryButtonStyles,
                              py: { xs: 0.5, sm: 0.75 },
                              px: { xs: 1, sm: 1.5 },
                              fontSize: { xs: "0.75rem", sm: "0.8rem" },
                            }}
                            startIcon={<span role="img" aria-label="reset" style={{ fontSize: "0.8rem" }}>🔄</span>}
                          >
                            Start Over
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => {
                              navigator.clipboard.writeText(manualCommand.command);
                              setSnackbar({
                                open: true,
                                message: "Command copied to clipboard!",
                                severity: "success"
                              });
                            }}
                            sx={{
                              ...primaryButtonStyles,
                              py: { xs: 0.5, sm: 0.75 },
                              px: { xs: 1.5, sm: 2 },
                              fontSize: { xs: "0.75rem", sm: "0.8rem" },
                            }}
                            startIcon={<span role="img" aria-label="copy" style={{ fontSize: "0.8rem" }}>📋</span>}
                          >
                            Copy Command
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImportClusters;

import React, { useState, ChangeEvent, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Button,
  Tabs,
  Tab,
  Box,
  Alert,
  TextField,
  CircularProgress,
  Snackbar,
} from "@mui/material";
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

// Define a proper interface for Axios errors with specific types
interface AxiosErrorResponse {
  status: number;
  data: {
    error?: string;
    [key: string]: unknown;
  };
}

interface AxiosError extends Error {
  response?: AxiosErrorResponse;
  request?: unknown;
  config?: unknown;
}

// Add a debug helper function to log data structure
const debugLogData = (data: unknown, label = "Data") => {
  console.log(`${label}:`, JSON.stringify(data, null, 2));
};

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

  // State for non-manual tabs - removing fileType and editorContent since YAML tab is being removed
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  // Add ref for scrolling to success alert
  const successAlertRef = useRef<HTMLDivElement>(null);
  
  // Effect to scroll to success alert when command is generated
  useEffect(() => {
    if (manualCommand && successAlertRef.current) {
      // Scroll the success alert into view with smooth behavior
      successAlertRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [manualCommand]);

  // Update useEffect to handle initial tab selection with new option names
  useEffect(() => {
    // If activeOption is null or invalid, set to first available tab
    if (!activeOption || 
        (activeOption !== "kubeconfig" && 
         activeOption !== "apiurl" && 
         activeOption !== "manual")) {
      setActiveOption("kubeconfig");
    }
  }, [activeOption, setActiveOption]);

  // Update the state type to match the expected data structure
  const [availableClusters, setAvailableClusters] = useState<Array<{name: string, cluster: string}>>([]);
  const [availableClustersLoading, setAvailableClustersLoading] = useState<boolean>(false);
  const [availableClustersError, setAvailableClustersError] = useState<string>("");

  // Add useEffect to fetch available clusters
  useEffect(() => {
    if (activeOption === "manual") {
      fetchAvailableClusters();
    }
  }, [activeOption]);

  // Function to fetch available clusters
  const fetchAvailableClusters = async () => {
    setAvailableClustersLoading(true);
    setAvailableClustersError("");
    try {
      const response = await api.get("/api/clusters/available");
      // Debug log to inspect the data structure
      debugLogData(response.data, "Available Clusters Response");
      
      // Handle different possible data structures
      let clusters = response.data || [];
      
      // If clusters is not an array, try to handle the structure appropriately
      if (!Array.isArray(clusters)) {
        if (typeof clusters === 'object') {
          // Convert object to array of objects with name/cluster properties
          clusters = Object.entries(clusters).map(([name, cluster]) => ({ 
            name, 
            cluster: typeof cluster === 'string' ? cluster : name 
          }));
        } else {
          clusters = [];
        }
      }
      
      // Filter out the specific cluster names
      clusters = clusters.filter((cluster: { name: string }) => {
        const name = cluster.name || "";
        return !name.includes("k3d-kubeflex") && !name.includes("kind-kubeflex");
      });
      
      setAvailableClusters(clusters);
    } catch (error) {
      console.error("Error fetching available clusters:", error);
      setAvailableClustersError("Failed to load available clusters. Please try again later.");
    } finally {
      setAvailableClustersLoading(false);
    }
  };

  const handleGenerateCommand = async () => {
    if (!formData.clusterName.trim()) return;
    setManualError("");
    setManualLoading(true);
    try {
      const response = await api.post<CommandResponse>("/clusters/manual/generateCommand", {
        clusterName: formData.clusterName.trim(),
      });
      setManualCommand(response.data);
    } catch (error) {
      console.error("Command generation error:", error);
      let errorMessage = "An unknown error occurred.";
      
      // Type guard to check if error is an Error object
      if (error instanceof Error) {
        // Check if it's an Axios error with response data
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          // Server responded with an error
          const status = axiosError.response.status;
          const responseData = axiosError.response.data;
          
          if (status === 500) {
            if (responseData && responseData.error) {
              // If there's a specific error message from the server
              const serverError = responseData.error;
              
              if (serverError.includes("Failed to get token")) {
                errorMessage = "Could not generate token. Please verify that:\n\n" +
                  "• The ITS hub cluster is running\n" +
                  "• You have proper permissions\n" +
                  "• The 'clusteradm' CLI tool is installed";
              } else if (serverError.includes("context")) {
                errorMessage = "Could not find the required context 'its1'. Please ensure your kubeconfig is properly set up with the ITS hub context.";
              } else {
                // Include the actual server error for specific issues
                errorMessage = `Server error: ${serverError}`;
              }
            } else {
              errorMessage = "The server encountered an error. Please verify that the ITS hub is running and accessible.";
            }
          } else if (status === 404) {
            errorMessage = "API endpoint not found. Please check if the service is properly deployed.";
          } else if (status === 401 || status === 403) {
            errorMessage = "Authorization failed. Please check your credentials and permissions.";
          } else {
            errorMessage = `Request failed with status code ${status}. Please try again later.`;
          }
        } else if (axiosError.request) {
          // Request was made but no response received
          errorMessage = "No response received from server. Please check your network connection and verify the server is running.";
        } else {
          // Error in setting up the request
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      setManualError(errorMessage);
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
    setManualCommand(null);
    setManualError("");
    setFormData({
      clusterName: "",
      token: "",
      hubApiServer: "",
    });
    onCancel();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    // Reset manual command if clusterName is modified
    if (activeOption === "manual") {
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

  // Define a consistent button style object that will be used for all buttons
  const buttonStyles = {
    textTransform: "none",
    fontWeight: 600,
    borderRadius: 1.5,
    py: 1.2,
    px: 3,
    boxShadow: theme === "dark" ? "0 4px 6px -1px rgba(0, 0, 0, 0.2)" : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    transition: "all 0.2s ease",
    fontSize: "0.875rem",
    minWidth: "120px",
    height: "40px",
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

  // First, add a clearManualCommand function to reset the command state
  const clearManualCommand = () => {
    setManualCommand(null);
    setManualError("");
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
          </Box>
            <Tabs
              value={activeOption}
              onChange={(_event, newValue) => setActiveOption(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                mt: 1.5,
                ml: 1.5,
                "& .MuiTabs-flexContainer": {
                  gap: { xs: 1.5, sm: 2 },
                },
                "& .MuiTabs-indicator": {
                  display: "none",
                },
                "& .MuiTabs-scroller": {
                  pl: 0.5,
                  overflow: "visible", 
                },
                "& .MuiTab-root": {
                  minWidth: "auto",
                  minHeight: { xs: 36, sm: 40 },
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 0.75, sm: 1 },
                  mt: 0.5,
                  mb: 0.5,
                  color: colors.textSecondary,
                  fontSize: { xs: "0.8rem", sm: "0.85rem" },
                  fontWeight: 500,
                  textTransform: "none",
                  transition: "all 0.25s ease",
                  borderRadius: "12px",
                  position: "relative",
                  overflow: "visible",
                  border: "1px solid transparent !important",
                  WebkitAppearance: "none",
                  outline: "none !important",
                  "&:focus": {
                    outline: "none !important",
                    boxShadow: "none !important",
                    border: "1px solid transparent !important",
                  },
                  "&:focus-visible": {
                    outline: "none !important",
                    boxShadow: "none !important",
                  },
                  WebkitTapHighlightColor: "transparent",
                  WebkitTouchCallout: "none",
                  "&::-webkit-focus-ring-color": {
                    color: "transparent",
                  },
                  "&::before, &::after": {
                    content: '""',
                    display: "none",
                  },
                  "@media not all and (min-resolution:.001dpcm)": {
                    "@supports (-webkit-appearance:none)": {
                      outline: "none !important", 
                      boxShadow: "none !important",
                      borderColor: "transparent !important",
                    }
                  },
                  
                        "&:hover": { 
                    backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                    color: theme === "dark" ? colors.white : colors.primary,
                    borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)", 
                    "& .iconContainer": {
                      backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                      transform: "scale(1.05)",
                    },
                  },
                  
                  "&.Mui-selected": {
                    color: theme === "dark" ? colors.white : colors.primary,
                    backgroundColor: theme === "dark" ? "rgba(47, 134, 255, 0.08)" : "rgba(47, 134, 255, 0.05)",
                    fontWeight: 600,
                    border: `1px solid ${colors.primary} !important`,
                    boxShadow: theme === "dark" 
                      ? `0 0 8px ${colors.primary}40` 
                      : `0 0 6px ${colors.primary}30`,
                    zIndex: 1,
                    position: "relative",
                    "&:focus, &:focus-visible": {
                      outline: "none !important",
                      border: `1px solid ${colors.primary} !important`,
                    },
                    "&::before, &::after": {
                      display: "none !important",
                    },
                    "@media not all and (min-resolution:.001dpcm)": {
                      "@supports (-webkit-appearance:none)": {
                        border: `1px solid ${colors.primary} !important`,
                        outline: "none !important",
                      }
                    },
                    "& .iconContainer": {
                      backgroundColor: theme === "dark" ? "rgba(47, 134, 255, 0.2)" : "rgba(47, 134, 255, 0.1)",
                      transform: "scale(1.1)",
                      color: colors.primary,
                    }
                  },
                },
              }}
            >
            <Tab 
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box 
                    className="iconContainer"
                    sx={{ 
                      width: 26, 
                      height: 26, 
                      borderRadius: "8px", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
                      transition: "all 0.25s ease",
                    }}
                  >
                    <span role="img" aria-label="kubeconfig" style={{ fontSize: "0.9rem" }}>📁</span>
                  </Box>
                  Kubeconfig
                </Box>
              } 
              value="kubeconfig" 
            />
            <Tab 
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box 
                    className="iconContainer"
                    sx={{ 
                      width: 26, 
                      height: 26, 
                      borderRadius: "8px", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
                      transition: "all 0.25s ease",
                    }}
                  >
                    <span role="img" aria-label="api" style={{ fontSize: "0.9rem" }}>🔗</span>
                  </Box>
                  API/URL
                </Box>
              } 
              value="apiurl" 
            />
            <Tab 
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box 
                    className="iconContainer"
                    sx={{ 
                      width: 26, 
                      height: 26, 
                      borderRadius: "8px", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
                      transition: "all 0.25s ease",
                    }}
                  >
                    <span role="img" aria-label="manual" style={{ fontSize: "0.9rem" }}>⚙️</span>
                  </Box>
                  Manual
                </Box>
              } 
              value="manual" 
            />
            </Tabs>
        </Box>

        <DialogContent sx={{ p: 0, flex: 1, overflow: "hidden" }}>
          <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Box sx={{ flex: 1, overflow: "auto", p: { xs: 1, sm: 1.5 } }}>
              {/* Kubeconfig option */}
              {activeOption === "kubeconfig" && (
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
                    height: "auto",
                    maxHeight: "calc(100% - 8px)",
                  }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
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
                        p: { xs: 2, sm: 3 },
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
                    flex: 1,
                        mb: 2,
                        minHeight: { xs: "200px", sm: "220px" },
                        maxHeight: { xs: "250px", sm: "300px", md: "350px" }
                      }}
                    >
                      <Box 
                        sx={{ 
                          mb: 3,
                          p: 2,
                          borderRadius: "50%",
                          backgroundColor: theme === "dark" ? "rgba(47, 134, 255, 0.1)" : "rgba(47, 134, 255, 0.05)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span role="img" aria-label="upload" style={{ fontSize: "1.75rem" }}>📤</span>
                      </Box>
                      <Box sx={{ mb: 2, fontWeight: 500, fontSize: "1rem" }}>
                        Drag and drop your kubeconfig file here
                      </Box>
                      <Box sx={{ color: colors.textSecondary, mb: 2, fontSize: "0.85rem" }}>
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

                    <Box sx={{ 
                      display: "flex", 
                      justifyContent: "flex-end", 
                      gap: 2,
                      mt: "auto",
                      pt: 1,
                      position: "relative",
                      zIndex: 2,
                    }}>
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
              {activeOption === "apiurl" && (
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

              {/* Manual option - Enhanced with better user experience */}
              {activeOption === "manual" && (
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
                    {/* Header with improved description and visual appeal */}
                    <Box sx={{ 
                      display: "flex", 
                      alignItems: "flex-start", 
                      gap: 1.5, 
                      mb: 2,
                      p: 2,
                      borderRadius: 2,
                      background: theme === "dark" 
                        ? "linear-gradient(145deg, rgba(47, 134, 255, 0.08) 0%, rgba(47, 134, 255, 0.02) 100%)" 
                        : "linear-gradient(145deg, rgba(47, 134, 255, 0.04) 0%, rgba(47, 134, 255, 0.01) 100%)",
                      border: `1px solid ${theme === "dark" ? "rgba(47, 134, 255, 0.1)" : "rgba(47, 134, 255, 0.05)"}`,
                    }}>
                      <Box 
                        sx={{ 
                          width: 36, 
                          height: 36, 
                          borderRadius: "10px", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.15)" : "rgba(47, 134, 255, 0.1)",
                          color: theme === "dark" ? colors.primaryLight : colors.primary,
                          flexShrink: 0,
                          mt: 0.5,
                          boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                        }}
                      >
                        <span role="img" aria-label="info" style={{ fontSize: "1.1rem" }}>⚙️</span>
                      </Box>
                      <Box>
                        <Box sx={{ 
                          fontWeight: 600, 
                          fontSize: { xs: "0.95rem", sm: "1rem" }, 
                          color: textColor, 
                          mb: 0.5,
                          display: "flex",
                          alignItems: "center" 
                        }}>
                          Manual Cluster Setup
                          <Box 
                            component="span" 
                            sx={{ 
                              ml: 1.5, 
                              fontSize: "0.7rem", 
                              fontWeight: 500,
                              px: 1, 
                              py: 0.3, 
                              borderRadius: "10px", 
                              bgcolor: theme === "dark" ? "rgba(103, 192, 115, 0.15)" : "rgba(103, 192, 115, 0.1)",
                              color: theme === "dark" ? "#97e6a5" : "#3d9950",
                              border: `1px solid ${theme === "dark" ? "rgba(103, 192, 115, 0.2)" : "rgba(103, 192, 115, 0.15)"}`,
                            }}
                          >
                            Recommended
                        </Box>
                        </Box>
                        <Box sx={{ 
                          color: colors.textSecondary, 
                          fontSize: "0.825rem", 
                          lineHeight: 1.5,
                          maxWidth: "90%" 
                        }}>
                          This is the simplest way to connect your Kubernetes cluster. Select a cluster, generate a command, and run it to establish the connection with your hub.
                        </Box>
                      </Box>
                    </Box>

                    {!manualCommand ? (
                      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                        {/* Input section with improved styling and clearer presentation */}
                        <Box sx={{ 
                          backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
                          borderRadius: 2,
                          p: 2.5,
                          mb: 2,
                          border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"}`,
                        }}>
                          <Box sx={{ 
                            mb: 1.5, 
                            fontWeight: 600, 
                            fontSize: "0.9rem", 
                            color: textColor,
                            display: "flex",
                            alignItems: "center",
                            gap: 1
                          }}>
                            <span role="img" aria-label="select" style={{ fontSize: "0.9rem" }}>🔍</span>
                            Select a cluster to connect
                          </Box>
                          
                          {availableClustersLoading ? (
                            <Box sx={{ 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center", 
                              py: 3,
                              minHeight: "56px",
                              bgcolor: theme === "dark" ? "rgba(0, 0, 0, 0.1)" : "rgba(0, 0, 0, 0.02)",
                                borderRadius: 1.5,
                              border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"}`,
                            }}>
                              <CircularProgress size={24} sx={{ color: colors.primary }} />
                              <Box sx={{ ml: 2, fontSize: "0.85rem", color: colors.textSecondary }}>
                                Loading available clusters...
                                </Box>
                            </Box>
                          ) : availableClustersError ? (
                            <Alert 
                              severity="error" 
                              icon={<span role="img" aria-label="error" style={{ fontSize: "0.9rem" }}>⚠️</span>}
                              sx={{ 
                                borderRadius: 1.5,
                                py: 1, 
                                fontSize: "0.825rem",
                                mb: 1
                              }}
                            >
                              <Box sx={{ fontWeight: 600, mb: 0.5 }}>Error loading clusters</Box>
                              <Box sx={{ fontSize: "0.8rem" }}>{availableClustersError}</Box>
                              <Button 
                                size="small" 
                            sx={{
                                  mt: 1,
                                  minWidth: "auto", 
                                  fontSize: "0.75rem",
                                  color: colors.primary,
                                  borderRadius: 1,
                                  "&:hover": { backgroundColor: "rgba(47, 134, 255, 0.08)" }
                                }}
                                onClick={fetchAvailableClusters}
                                startIcon={<span role="img" aria-label="retry" style={{ fontSize: "0.8rem" }}>🔄</span>}
                              >
                                Retry
                              </Button>
                            </Alert>
                          ) : (
                            <>
                              <Box 
                                sx={{
                                  border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)"}`,
                                  borderRadius: 1.5,
                                  backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 255, 255, 0.8)",
                                  position: "relative",
                                  overflow: "hidden",
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                  mb: 1.5,
                                  "&:hover": {
                                  borderColor: colors.primary,
                                    boxShadow: `0 0 0 1px ${colors.primary}30`,
                                },
                                  "&:focus-within": {
                                  borderColor: colors.primary,
                                    boxShadow: `0 0 0 2px ${colors.primary}30`,
                                  },
                                }}
                              >
                                <Box 
                                  component="select"
                                  value={formData.clusterName}
                                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                    handleChange({
                                      target: {
                                        name: "clusterName",
                                        value: e.target.value
                                      }
                                    } as ChangeEvent<HTMLInputElement>);
                                  }}
                                  sx={{
                                    width: "100%",
                                    height: "52px",
                                    padding: "0 16px",
                                    paddingLeft: "46px",
                                    appearance: "none",
                                    border: "none",
                                    outline: "none",
                                    backgroundColor: "transparent",
                                color: theme === "dark" ? "#ffffff" : "inherit",
                                    fontSize: "0.95rem",
                                    fontFamily: "inherit",
                                    cursor: "pointer",
                                    position: "relative",
                                    zIndex: 1,
                                    // Add specific styles for dark mode to improve option visibility
                                    "& option": {
                                      backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
                                      color: theme === "dark" ? "#ffffff" : "#000000",
                                      padding: "10px",
                                      fontSize: "0.9rem",
                                    },
                                  }}
                                >
                                  <option value="" disabled>Choose a cluster...</option>
                                  {availableClusters.length === 0 ? (
                                    <option value="" disabled>No clusters available</option>
                                  ) : (
                                    availableClusters.map((clusterObj, index) => {
                                      // Safely handle different structures
                                      const name = clusterObj.name || `Cluster ${index + 1}`;
                                      const value = clusterObj.name || name;
                                      return (
                                        <option key={value} value={value}>
                                          {name}
                                        </option>
                                      );
                                    })
                                  )}
                                </Box>
                          <Box sx={{ 
                                  position: "absolute", 
                                  left: "14px", 
                                  top: "50%", 
                                  transform: "translateY(-50%)",
                            color: colors.textSecondary,
                                  zIndex: 0,
                                }}>
                                  <Box 
                                    sx={{ 
                                      width: 20, 
                                      height: 20, 
                                      borderRadius: "6px", 
                            display: "flex",
                            alignItems: "center",
                                      justifyContent: "center",
                                      bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.15)" : "rgba(47, 134, 255, 0.1)",
                                      color: theme === "dark" ? colors.primaryLight : colors.primary,
                                    }}
                                  >
                                    <span role="img" aria-label="cluster" style={{ fontSize: "0.8rem" }}>🔶</span>
                                  </Box>
                                </Box>
                                <Box sx={{ 
                                  position: "absolute", 
                                  right: "12px", 
                                  top: "50%", 
                                  transform: "translateY(-50%)",
                                  color: theme === "dark" ? colors.primaryLight : colors.primary,
                                  zIndex: 0,
                                  pointerEvents: "none",
                                }}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                          </Box>
                              </Box>
                              
                              <Box sx={{ 
                                display: "flex", 
                                alignItems: "center",
                                gap: 1,
                                p: 1.5,
                                borderRadius: 1.5,
                                backgroundColor: theme === "dark" ? "rgba(255, 215, 0, 0.05)" : "rgba(255, 215, 0, 0.08)",
                                border: `1px solid ${theme === "dark" ? "rgba(255, 215, 0, 0.1)" : "rgba(255, 215, 0, 0.15)"}`,
                              }}>
                                <span role="img" aria-label="tip" style={{ fontSize: "0.9rem" }}>💡</span>
                                <Box sx={{ 
                                  fontSize: "0.8rem", 
                                  color: theme === "dark" ? "rgba(255, 215, 0, 0.8)" : "#7d6608",
                                  flex: 1
                                }}>
                                  These are clusters discovered in your environment. Select one to continue.
                                </Box>
                                <Button 
                                  size="small" 
                                  onClick={fetchAvailableClusters} 
                                  sx={{ 
                                    minWidth: "36px", 
                                    height: "36px",
                                    p: 0,
                                    ml: 0.5,
                                    borderRadius: "50%",
                                    color: theme === "dark" ? colors.primaryLight : colors.primary,
                                    "&:hover": {
                                      backgroundColor: theme === "dark" ? "rgba(47, 134, 255, 0.08)" : "rgba(47, 134, 255, 0.05)",
                                    }
                                  }}
                                  aria-label="Refresh clusters list"
                                  title="Refresh clusters list"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M8 12L12 16L16 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M12 2V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </Button>
                              </Box>
                            </>
                          )}
                        </Box>

                        {/* Error message with improved styling */}
                        {manualError && (
                          <Alert 
                            severity="error" 
                            icon={<span role="img" aria-label="error" style={{ fontSize: "1rem" }}>❌</span>}
                            sx={{ 
                              mb: 2, 
                              borderRadius: 2,
                              py: 1.5,
                              px: 2,
                              animation: "fadeIn 0.3s ease-in-out",
                              "@keyframes fadeIn": {
                                "0%": { opacity: 0, transform: "translateY(-5px)" },
                                "100%": { opacity: 1, transform: "translateY(0)" }
                              },
                              boxShadow: "0 3px 8px rgba(255,107,107,0.15)",
                              "& .MuiAlert-message": {
                                fontSize: "0.85rem",
                              },
                              border: `1px solid ${theme === "dark" ? "rgba(255, 107, 107, 0.2)" : "rgba(255, 107, 107, 0.15)"}`,
                            }}
                          >
                            <Box sx={{ fontWeight: 600, fontSize: "0.9rem", mb: 0.5 }}>Connection Error</Box>
                            <Box sx={{ whiteSpace: "pre-line" }}>{manualError}</Box>
                            {manualError.includes("clusteradm") && (
                              <Box sx={{ 
                                mt: 1.5, 
                                pt: 1, 
                                borderTop: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
                                fontSize: "0.775rem", 
                                fontStyle: "italic" 
                              }}>
                                <Box sx={{ fontWeight: 600, mb: 0.5 }}>💻 Installation Guide:</Box>
                                To install clusteradm, run: 
                                <Box 
                                  component="pre" 
                                  sx={{ 
                                    fontFamily: "'Fira Code', monospace",
                                    backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.04)",
                                    p: 1.5,
                                    mt: 0.5,
                                    borderRadius: 1,
                                    fontSize: "0.75rem",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-all",
                                    position: "relative",
                                    overflow: "hidden"
                                  }}
                                >
                                  curl -fsSL https://raw.githubusercontent.com/open-cluster-management-io/clusteradm/main/install.sh | bash
                                  <Button
                                    size="small"
                                    onClick={() => {
                                      navigator.clipboard.writeText("curl -fsSL https://raw.githubusercontent.com/open-cluster-management-io/clusteradm/main/install.sh | bash");
                                      setSnackbar({
                                        open: true,
                                        message: "Installation command copied!",
                                        severity: "success"
                                      });
                                    }}
                                    sx={{
                                      position: "absolute",
                                      top: 3,
                                      right: 3,
                                      minWidth: "24px",
                                      width: "24px",
                                      height: "24px",
                                      p: 0,
                                      borderRadius: 0.5,
                                      bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.2)" : "rgba(47, 134, 255, 0.1)",
                                      color: theme === "dark" ? colors.primaryLight : colors.primary,
                                      boxShadow: "none",
                                      "&:hover": {
                                        bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.3)" : "rgba(47, 134, 255, 0.2)",
                                      }
                                    }}
                                  >
                                    <span role="img" aria-label="copy" style={{ fontSize: "0.7rem" }}>📋</span>
                                  </Button>
                                </Box>
                              </Box>
                            )}
                          </Alert>
                        )}

                        {/* Info about generating command - enhanced with clearer instructions */}
                        <Box sx={{
                          p: 2.5,
                          mt: 2,
                          borderRadius: 2,
                          backgroundColor: theme === "dark" ? "rgba(47, 134, 255, 0.05)" : "rgba(47, 134, 255, 0.03)",
                          border: `1px solid ${theme === "dark" ? "rgba(47, 134, 255, 0.1)" : "rgba(47, 134, 255, 0.08)"}`,
                          display: "flex",
                          flexDirection: "column",
                          gap: 1.5
                        }}>
                          <Box sx={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: 1.5,
                          }}>
                            <Box sx={{ 
                              width: 32, 
                              height: 32, 
                              borderRadius: "50%", 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center",
                              bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.15)" : "rgba(47, 134, 255, 0.1)",
                              color: theme === "dark" ? colors.primaryLight : colors.primary,
                            }}>
                              <span role="img" aria-label="info" style={{ fontSize: "0.9rem" }}>ℹ️</span>
                            </Box>
                            <Box sx={{ fontWeight: 600, fontSize: "0.9rem", color: textColor }}>
                              How to connect your cluster
                            </Box>
                          </Box>
                          
                          <Box sx={{ 
                            display: "flex", 
                            alignItems: "flex-start", 
                            gap: 1.5,
                            pl: 5
                          }}>
                            <Box 
                              sx={{ 
                                width: 20, 
                                height: 20, 
                                borderRadius: "50%", 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center",
                                bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.1)" : "rgba(47, 134, 255, 0.05)",
                                color: theme === "dark" ? colors.primaryLight : colors.primary,
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                flexShrink: 0
                              }}
                            >
                              1
                            </Box>
                            <Box sx={{ fontSize: "0.825rem", color: colors.textSecondary }}>
                              Select a cluster from the dropdown above
                          </Box>
                        </Box>

                          <Box sx={{ 
                            display: "flex", 
                            alignItems: "flex-start", 
                            gap: 1.5,
                            pl: 5
                          }}>
                            <Box 
                              sx={{ 
                                width: 20, 
                                height: 20, 
                                borderRadius: "50%", 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center",
                                bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.1)" : "rgba(47, 134, 255, 0.05)",
                                color: theme === "dark" ? colors.primaryLight : colors.primary,
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                flexShrink: 0
                              }}
                            >
                              2
                            </Box>
                            <Box sx={{ fontSize: "0.825rem", color: colors.textSecondary }}>
                              Click "Generate Command" button to create a connection command
                            </Box>
                          </Box>
                          
                          <Box sx={{ 
                            display: "flex", 
                            alignItems: "flex-start", 
                            gap: 1.5,
                            pl: 5
                          }}>
                            <Box 
                              sx={{ 
                                width: 20, 
                                height: 20, 
                                borderRadius: "50%", 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center",
                                bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.1)" : "rgba(47, 134, 255, 0.05)",
                                color: theme === "dark" ? colors.primaryLight : colors.primary,
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                flexShrink: 0
                              }}
                            >
                              3
                            </Box>
                            <Box sx={{ fontSize: "0.825rem", color: colors.textSecondary }}>
                              Run the generated command on your cluster to establish the connection
                            </Box>
                          </Box>
                        </Box>

                        {/* Button section with improved styling and accessibility */}
                        <Box sx={{ 
                          display: "flex", 
                          justifyContent: "flex-end", 
                          gap: 2, 
                          mt: "auto",
                          pt: 2.5,
                          borderTop: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"}`,
                        }}>
                          <Button 
                            variant="outlined"
                            onClick={onCancel}
                            sx={{
                              ...secondaryButtonStyles,
                              "&:focus-visible": {
                                outline: `2px solid ${colors.primary}`,
                                outlineOffset: 2
                              }
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="contained"
                            onClick={handleGenerateCommand}
                            disabled={!formData.clusterName.trim() || manualLoading || availableClustersLoading}
                            sx={{
                              ...primaryButtonStyles,
                              "&:focus-visible": {
                                outline: `2px solid ${colors.primary}`,
                                outlineOffset: 2
                              }
                            }}
                            startIcon={
                              manualLoading ? (
                                <CircularProgress size={16} color="inherit" />
                              ) : (
                                <span role="img" aria-label="generate" style={{ fontSize: "0.9rem" }}>⚡</span>
                              )
                            }
                            aria-label={manualLoading ? "Generating command..." : "Generate Connection Command"}
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
                        <Box ref={successAlertRef}>
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
                        </Box>

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
                              minWidth: "36px",
                              width: "36px",
                              height: "36px",
                              p: 0.5,
                              borderRadius: 1,
                              bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.2)" : "rgba(47, 134, 255, 0.1)",
                              color: theme === "dark" ? colors.primaryLight : colors.primary,
                              boxShadow: "none",
                              "&:hover": {
                                bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.3)" : "rgba(47, 134, 255, 0.2)",
                              }
                            }}
                            aria-label="Copy command to clipboard"
                            title="Copy command to clipboard"
                          >
                            <span role="img" aria-label="copy" style={{ fontSize: "0.9rem" }}>📋</span>
                          </Button>
                        </Box>

                        {/* Instructions section with improved styling */}
                        <Box sx={{ 
                          flex: 1, 
                          mb: 2,
                          p: 2,
                          borderRadius: 1.5,
                          bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
                          border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"}`,
                        }}>
                          <Box sx={{ 
                            fontWeight: 600, 
                            fontSize: "0.9rem", 
                            mb: 1.5, 
                            color: textColor,
                            display: "flex",
                            alignItems: "center",
                            gap: 1
                          }}>
                            <span role="img" aria-label="steps" style={{ fontSize: "0.9rem" }}>📝</span>
                            Next steps
                          </Box>
                          
                          <Box sx={{ 
                            display: "flex", 
                            flexDirection: "column",
                            gap: 1.5,
                          }}>
                            {/* Step 1: Context switching */}
                            <Box sx={{ 
                              display: "flex", 
                              alignItems: "flex-start", 
                              gap: 1.5,
                              p: 1.5,
                              borderRadius: 1.5,
                              bgcolor: theme === "dark" ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.5)",
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
                              <Box sx={{ fontSize: "0.825rem", color: colors.textSecondary, width: "100%" }}>
                                <Box sx={{ mb: 1, fontWeight: 500, color: textColor }}>
                                  First, switch to the correct context on your terminal
                                </Box>
                                <Box
                                  sx={{
                                    position: "relative",
                                    p: 1.5,
                                    backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.3)" : "#f0f0f0",
                                    color: theme === "dark" ? "#e6e6e6" : "#333",
                                    borderRadius: 1,
                                    fontFamily: "'Fira Code', monospace",
                                    fontSize: "0.75rem",
                                    mb: 1,
                                    overflow: "hidden",
                                    border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
                                    whiteSpace: "pre",
                                    "&::before": {
                                      content: '"$"',
                                      color: theme === "dark" ? colors.primaryLight : colors.primary,
                                      marginRight: "6px",
                                      fontWeight: "bold",
                                      display: "inline-block",
                                    },
                                  }}
                                >
                                  <Box component="span" sx={{ paddingLeft: "1rem" }}>kubectl config use-context its1</Box>
                                  <Button
                                    onClick={() => {
                                      navigator.clipboard.writeText("kubectl config use-context its1");
                                      setSnackbar({
                                        open: true,
                                        message: "Context command copied!",
                                        severity: "success"
                                      });
                                    }}
                                    sx={{
                                      position: "absolute",
                                      top: 4,
                                      right: 4,
                                      minWidth: "28px",
                                      width: "28px",
                                      height: "28px",
                                      p: 0,
                                      borderRadius: 0.75,
                                      bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.2)" : "rgba(47, 134, 255, 0.1)",
                                      color: theme === "dark" ? colors.primaryLight : colors.primary,
                                      boxShadow: "none",
                                      "&:hover": {
                                        bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.3)" : "rgba(47, 134, 255, 0.2)",
                                      }
                                    }}
                                  >
                                    <span role="img" aria-label="copy" style={{ fontSize: "0.7rem" }}>📋</span>
                                  </Button>
                                </Box>
                              </Box>
                            </Box>
                            
                            {/* Step 2: Run command */}
                            <Box sx={{ 
                              display: "flex", 
                              alignItems: "flex-start", 
                              gap: 1.5,
                              p: 1.5,
                              borderRadius: 1.5,
                              bgcolor: theme === "dark" ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.5)",
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
                              <Box sx={{ fontSize: "0.825rem", color: colors.textSecondary }}>
                                <Box sx={{ fontWeight: 500, color: textColor, mb: 0.5 }}>
                                  Copy and paste the command above into your terminal
                                </Box>
                                <Box sx={{ fontSize: "0.8rem" }}>
                                  This will register your cluster with the platform and establish the connection.
                                </Box>
                              </Box>
                            </Box>
                            
                            {/* Step 3: Wait for CSR approval */}
                            <Box sx={{ 
                              display: "flex", 
                              alignItems: "flex-start", 
                              gap: 1.5,
                              p: 1.5,
                              borderRadius: 1.5,
                              bgcolor: theme === "dark" ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.5)",
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
                              <Box sx={{ fontSize: "0.825rem", color: colors.textSecondary, width: "100%" }}>
                                <Box sx={{ fontWeight: 500, color: textColor, mb: 0.5 }}>
                                  Wait for CSR approval and connection establishment
                              </Box>
                                <Box sx={{ fontSize: "0.8rem", mb: 1.5 }}>
                                  After running the command, a Certificate Signing Request (CSR) is generated and must be approved. This process typically takes 1-2 minutes to complete automatically.
                            </Box>
                            
                                <Box sx={{ 
                                  p: 1.5,
                                  borderRadius: 1.5,
                                  backgroundColor: theme === "dark" ? "rgba(255, 215, 0, 0.08)" : "rgba(255, 215, 0, 0.05)",
                                  border: `1px solid ${theme === "dark" ? "rgba(255, 215, 0, 0.15)" : "rgba(255, 215, 0, 0.1)"}`,
                                }}>
                                  <Box sx={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: 1,
                                    mb: 1
                                  }}>
                                    <Box 
                                      sx={{ 
                                        width: 20, 
                                        height: 20, 
                                        borderRadius: "50%", 
                                        display: "flex", 
                                        alignItems: "center", 
                                        justifyContent: "center",
                                        bgcolor: theme === "dark" ? "rgba(255, 215, 0, 0.2)" : "rgba(255, 215, 0, 0.15)",
                                        color: theme === "dark" ? "rgba(255, 215, 0, 0.9)" : "#7d6608",
                                        flexShrink: 0,
                                      }}
                                    >
                                      <span role="img" aria-label="tip" style={{ fontSize: "0.7rem" }}>💡</span>
                                    </Box>
                                    <Box sx={{ 
                                      fontSize: "0.8rem", 
                                      fontWeight: 600,
                                      color: theme === "dark" ? "rgba(255, 215, 0, 0.9)" : "#7d6608"
                                    }}>
                                      Check CSR Status
                                    </Box>
                                  </Box>
                                  
                                  <Box
                                    component="pre"
                                    sx={{
                                      position: "relative",
                                      p: 1.5,
                                      backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.3)" : "#f7f3e3",
                                      color: theme === "dark" ? "#e6e6e6" : "#333",
                                      borderRadius: 1,
                                      fontFamily: "'Fira Code', monospace",
                                      fontSize: "0.75rem",
                                      mb: 0.5,
                                      overflow: "auto",
                                      border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 215, 0, 0.2)"}`,
                                      whiteSpace: "pre",
                                      "&::before": {
                                        content: '"$"',
                                        color: theme === "dark" ? "rgba(255, 215, 0, 0.7)" : "#7d6608",
                                        marginRight: "6px",
                                        fontWeight: "bold",
                                        display: "inline-block",
                                      },
                                    }}
                                  >
                                    <Box component="span" sx={{ paddingLeft: "1rem" }}>kubectl get csr | grep {manualCommand.clusterName}</Box>
                                    <Button
                                      onClick={() => {
                                        navigator.clipboard.writeText(`kubectl get csr | grep ${manualCommand.clusterName}`);
                                        setSnackbar({
                                          open: true,
                                          message: "CSR check command copied!",
                                          severity: "success"
                                        });
                                      }}
                                      sx={{
                                        position: "absolute",
                                        top: 4,
                                        right: 4,
                                        minWidth: "28px",
                                        width: "28px",
                                        height: "28px",
                                        p: 0,
                                        borderRadius: 0.75,
                                        bgcolor: theme === "dark" ? "rgba(255, 215, 0, 0.15)" : "rgba(255, 215, 0, 0.1)",
                                        color: theme === "dark" ? "rgba(255, 215, 0, 0.9)" : "#7d6608",
                                        boxShadow: "none",
                                        "&:hover": {
                                          bgcolor: theme === "dark" ? "rgba(255, 215, 0, 0.25)" : "rgba(255, 215, 0, 0.2)",
                                        }
                                      }}
                                    >
                                      <span role="img" aria-label="copy" style={{ fontSize: "0.7rem" }}>📋</span>
                                    </Button>
                                  </Box>
                                </Box>
                              </Box>
                            </Box>

                            {/* Step 4: Verify connection */}
                            <Box sx={{ 
                              display: "flex", 
                              alignItems: "flex-start", 
                              gap: 1.5,
                              p: 1.5,
                              borderRadius: 1.5,
                              bgcolor: theme === "dark" ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.5)",
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
                                4
                              </Box>
                              <Box sx={{ fontSize: "0.825rem", color: colors.textSecondary, width: "100%" }}>
                                <Box sx={{ fontWeight: 500, color: textColor, mb: 0.5 }}>
                                  Verify the connection is successful
                              </Box>
                                <Box sx={{ fontSize: "0.8rem", mb: 1.5 }}>
                                  Once connected, the cluster will appear in your clusters list with status "Ready". You can verify the connection status using:
                            </Box>
                                
                                <Box
                                  component="pre"
                                  sx={{
                                    position: "relative",
                                    p: 1.5,
                                    backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.04)",
                                    color: theme === "dark" ? "#e6e6e6" : "#333",
                                    borderRadius: 1,
                                    fontFamily: "'Fira Code', monospace",
                                    fontSize: "0.75rem",
                                    mb: 0.5,
                                    overflow: "hidden",
                                    border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
                                    whiteSpace: "pre",
                                    "&::before": {
                                      content: '"$"',
                                      color: theme === "dark" ? colors.primaryLight : colors.primary,
                                      marginRight: "6px",
                                      fontWeight: "bold",
                                      display: "inline-block",
                                    },
                                  }}
                                >
                                  <Box component="span" sx={{ paddingLeft: "1rem" }}>kubectl get managedclusters</Box>
                                  <Button
                                    onClick={() => {
                                      navigator.clipboard.writeText("kubectl get managedclusters");
                                      setSnackbar({
                                        open: true,
                                        message: "Verify command copied!",
                                        severity: "success"
                                      });
                                    }}
                                    sx={{
                                      position: "absolute",
                                      top: 4,
                                      right: 4,
                                      minWidth: "28px",
                                      width: "28px",
                                      height: "28px",
                                      p: 0,
                                      borderRadius: 0.75,
                                      bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.2)" : "rgba(47, 134, 255, 0.1)",
                                      color: theme === "dark" ? colors.primaryLight : colors.primary,
                                      boxShadow: "none",
                                      "&:hover": {
                                        bgcolor: theme === "dark" ? "rgba(47, 134, 255, 0.3)" : "rgba(47, 134, 255, 0.2)",
                                      }
                                    }}
                                  >
                                    <span role="img" aria-label="copy" style={{ fontSize: "0.7rem" }}>📋</span>
                                  </Button>
                                </Box>
                                
                                <Box sx={{ 
                                  mt: 2,
                                  p: 1.5,
                                  borderRadius: 1.5,
                                  backgroundColor: theme === "dark" ? "rgba(103, 192, 115, 0.08)" : "rgba(103, 192, 115, 0.05)",
                                  border: `1px solid ${theme === "dark" ? "rgba(103, 192, 115, 0.15)" : "rgba(103, 192, 115, 0.1)"}`,
                                  fontSize: "0.8rem",
                                  color: theme === "dark" ? "rgba(103, 192, 115, 0.9)" : "#3d9950",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 2,
                                }}>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Box 
                                      sx={{ 
                                        width: 20, 
                                        height: 20, 
                                        borderRadius: "50%", 
                                        display: "flex", 
                                        alignItems: "center", 
                                        justifyContent: "center",
                                        bgcolor: theme === "dark" ? "rgba(103, 192, 115, 0.2)" : "rgba(103, 192, 115, 0.15)",
                                        color: theme === "dark" ? "rgba(103, 192, 115, 0.9)" : "#3d9950",
                                        flexShrink: 0,
                                      }}
                                    >
                                      <span role="img" aria-label="success" style={{ fontSize: "0.7rem" }}>✓</span>
                                    </Box>
                                    <Box>
                                      After approval, your cluster will show <strong>status: Ready</strong> and be available for management
                          </Box>
                        </Box>

                                  <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
                                    <Button
                                      variant="contained"
                                      component="a"
                                      href="/its"
                                      onClick={() => {
                                        // Close the dialog when redirecting
                                        onCancel();
                                      }}
                                      sx={{
                                        ...primaryButtonStyles,
                                        bgcolor: theme === "dark" ? "rgba(103, 192, 115, 0.3)" : "rgba(103, 192, 115, 0.8)",
                                        color: theme === "dark" ? "#ffffff" : "#ffffff",
                                        border: `1px solid ${theme === "dark" ? "rgba(103, 192, 115, 0.5)" : "rgba(103, 192, 115, 0.3)"}`,
                                        width: "100%",
                                        maxWidth: "300px",
                                        "&:hover": {
                                          bgcolor: theme === "dark" ? "rgba(103, 192, 115, 0.4)" : "rgba(103, 192, 115, 0.9)",
                                          transform: "translateY(-2px)",
                                          boxShadow: theme === "dark" 
                                            ? "0 6px 10px -1px rgba(0, 0, 0, 0.3)" 
                                            : "0 6px 10px -1px rgba(103, 192, 115, 0.3)",
                                        },
                                      }}
                                      startIcon={<span role="img" aria-label="view" style={{ fontSize: "0.9rem" }}>👁️</span>}
                                    >
                                      View Cluster in Dashboard
                                    </Button>
                                  </Box>
                                </Box>
                              </Box>
                            </Box>
                          </Box>
                        </Box>

                        {/* Button section with improved styling - Added Back button */}
                        <Box sx={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          gap: 2, 
                          mt: "auto",
                          pt: 2,
                          borderTop: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"}`,
                        }}>
                          <Box display="flex" gap={2}>
                          <Button
                            variant="outlined"
                              onClick={clearManualCommand}
                              sx={{
                                ...secondaryButtonStyles,
                                bgcolor: theme === "dark" ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.03)",
                                "&:hover": {
                                  bgcolor: theme === "dark" ? "rgba(0, 0, 0, 0.25)" : "rgba(0, 0, 0, 0.05)",
                                  borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)",
                                  transform: "translateY(-2px)",
                                  boxShadow: theme === "dark" 
                                    ? "0 4px 8px -2px rgba(0, 0, 0, 0.3)" 
                                    : "0 4px 8px -2px rgba(0, 0, 0, 0.1)",
                                },
                              }}
                              startIcon={<span role="img" aria-label="back" style={{ fontSize: "0.8rem" }}>⬅️</span>}
                            >
                              Back
                            </Button>
                            <Button
                              variant="outlined"
                              onClick={onCancel}
                            sx={secondaryButtonStyles}
                          >
                              Cancel
                            </Button>
                          </Box>
                          <Button
                            variant="contained"
                            onClick={() => {
                              navigator.clipboard.writeText(manualCommand.command);
                              setSnackbar({
                                open: true,
                                message: "Command copied to clipboard!",
                                severity: "success"
                              });
                            }}
                            sx={primaryButtonStyles}
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

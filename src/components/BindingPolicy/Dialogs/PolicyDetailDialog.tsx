import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Paper,
  Grid,
  CircularProgress,
  Alert,
} from "@mui/material";
import {  BindingPolicyInfo } from "../../../types/bindingPolicy";
import Editor from "@monaco-editor/react";
import ContentCopy from "@mui/icons-material/ContentCopy";
import useTheme from "../../../stores/themeStore";

interface PolicyCondition {
  type: string;
  status: string;
  reason?: string;
  message?: string;
}

interface PolicyDetailDialogProps {
  open: boolean;
  onClose: () => void;
  policy: BindingPolicyInfo;
  onEdit: (policy: BindingPolicyInfo) => void;
  isLoading?: boolean;
  error?: string;
}

const PolicyDetailDialog: React.FC<PolicyDetailDialogProps> = ({
  open,
  onClose,
  policy,
  onEdit,
  isLoading = false,
  error
}) => {
  const theme = useTheme((state) => state.theme)
  const isDarkTheme = theme === "dark";
  const [yamlContent, setYamlContent] = useState<string>("");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState<boolean>(false);

  // Debug log the incoming policy object
  useEffect(() => {
    console.log("PolicyDetailDialog - Received policy:", policy);
    console.log("PolicyDetailDialog - YAML property:", policy.yaml);
  }, [policy]);

  // Process YAML content when policy changes
  useEffect(() => {
    const processYaml = async () => {
      console.log("Processing YAML, current value:", policy.yaml);
      
      if (!policy.yaml) {
        console.log("No YAML content found in policy object");
        setYamlContent("");
        return;
      }

      setFetchLoading(true);
      setFetchError(null);

      try {
        // Check if policy.yaml is a URL
        if (typeof policy.yaml === 'string' && policy.yaml.trim().startsWith('http')) {
          console.log("YAML appears to be a URL, fetching...");
          const response = await fetch(policy.yaml);
          if (!response.ok) {
            throw new Error(`Failed to fetch YAML: ${response.statusText}`);
          }
          
          const content = await response.text();
          console.log("Fetched YAML content:", content.substring(0, 100) + "...");
          setYamlContent(content);
        } else {
          // The yaml field contains the actual content
          console.log("Using direct YAML content, length:", 
            typeof policy.yaml === 'string' ? policy.yaml.length : 'not a string');
          setYamlContent(policy.yaml);
        }
      } catch (err) {
        console.error("Error processing YAML:", err);
        setFetchError(`Failed to process YAML: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setYamlContent("");
      } finally {
        setFetchLoading(false);
      }
    };

    processYaml();
  }, [policy.yaml]);

  // Use the binding mode directly from the policy object
  const bindingMode = policy.bindingMode || "N/A";

  // Use the cluster list directly from the policy object
  const clusterNames = policy.clusterList || [];

  // Use the workload list directly from the policy object
  const workloads = policy.workloadList || [];

  // Add creation timestamp formatting if available
  const formattedCreationDate = policy.creationTimestamp 
    ? new Date(policy.creationTimestamp).toLocaleString() 
    : 'Not available';

  if (isLoading) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        PaperProps={{
          sx: {
            backgroundColor: isDarkTheme ? "#1e293b" : "#fff",
            color: isDarkTheme ? "#fff" : "inherit",
          },
        }}
      >
        <DialogTitle>Loading Policy Details</DialogTitle>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        PaperProps={{
          sx: {
            backgroundColor: isDarkTheme ? "#1e293b" : "#fff",
            color: isDarkTheme ? "#fff" : "inherit",
          },
        }}
      >
        <DialogTitle>Error Loading Policy Details</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: "90vh",
          m: 2,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          backgroundColor: isDarkTheme ? "#1e293b" : "#fff",
          color: isDarkTheme ? "#fff" : "inherit",
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <Typography
              variant="h6"
              className={isDarkTheme ? "text-white" : "text-black"}
            >
              {policy.name} 
            </Typography>
            <Chip
              label={policy.status}
              size="small"
              color={
                policy.status.toLowerCase() === "active" ? "success" : "error"
              }
            />
          </Box>
          <Button
            onClick={() => onEdit(policy)}
            sx={{
              color: isDarkTheme ? "#fff" : "text.primary",
              "&:hover": {
                color: isDarkTheme ? "#fff" : "text.primary",
                opacity: 0.8
              },
            }}
          >
            Edit
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent
        sx={{
          flex: 1,
          overflow: "auto",
          p: 2,
          "&:first-of-type": {
            pt: 2,
          },
        }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper
              sx={{
                p: 2,
                height: "100%",
                backgroundColor: isDarkTheme ? "#0f172a" : "#fff",
                color: isDarkTheme ? "#fff" : "text.primary",
              }}
            >
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                gutterBottom
                sx={{ color: isDarkTheme ? "#fff" : "text.primary" }}
              >
                Policy Information
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: isDarkTheme ? "rgba(255,255,255,0.7)" : "text.secondary" }}
                  >
                    Created
                  </Typography>
                  <Typography sx={{ color: isDarkTheme ? "#fff" : "text.primary" }}>
                    {formattedCreationDate || policy.creationDate || 'Not available'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: isDarkTheme ? "rgba(255,255,255,0.7)" : "text.secondary" }}
                  >
                    Last Modified
                  </Typography>
                  <Typography sx={{ color: isDarkTheme ? "#fff" : "text.primary" }}>
                    {policy.lastModifiedDate || "Not available"}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: isDarkTheme ? "rgba(255,255,255,0.7)" : "text.secondary" }}
                  >
                    Binding Mode
                  </Typography>
                  <Typography sx={{ color: isDarkTheme ? "#fff" : "text.primary" }}>
                    {bindingMode}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: isDarkTheme ? "rgba(255,255,255,0.7)" : "text.secondary" }}
                  >
                    Namespace
                  </Typography>
                  <Typography sx={{ color: isDarkTheme ? "#fff" : "text.primary" }}>
                    {policy.namespace || "default"}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: isDarkTheme ? "rgba(255,255,255,0.7)" : "text.secondary" }}
                  >
                    Clusters ({clusterNames.length})
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {clusterNames.length > 0 ? (
                      <>
                      
                        {clusterNames.map((name, index) => (
                          <Chip
                            key={index}
                            label={name}
                            size="small"
                            sx={{
                              mr: 1,
                              mb: 1,
                              backgroundColor: isDarkTheme
                                ? "#334155"
                                : undefined,
                              color: isDarkTheme ? "#fff" : undefined,
                            }}
                          />
                        ))}
                      </>
                    ) : (
                      <Typography 
                        sx={{ 
                          fontSize: "0.875rem",
                          color: isDarkTheme ? "rgba(255, 255, 255, 0.99)" : "text.secondary"
                        }}
                      >
                        No specific clusters defined
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: isDarkTheme ? "rgba(255,255,255,0.7)" : "text.secondary" }}
                  >
                    Workloads
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {workloads && workloads.length > 0 ? (
                      <>
                       
                        {workloads.map((workload, index) => (
                          <Chip
                            key={index}
                            label={workload}
                            size="small"
                            sx={{
                              mr: 1,
                              mb: 1,
                              backgroundColor: isDarkTheme
                                ? "#334155"
                                : undefined,
                              color: isDarkTheme ? "#fff" : undefined,
                            }}
                          />
                        ))}
                      </>
                    ) : (
                      <Typography 
                        sx={{ 
                          fontSize: "0.875rem",
                          color: isDarkTheme ? "rgba(255,255,255,0.7)" : "text.secondary"
                        }}
                      >
                        No workloads defined
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: isDarkTheme ? "rgba(255,255,255,0.7)" : "text.secondary" }}
                  >
                    Status
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label={policy.status}
                      size="small"
                      color={
                        policy.status.toLowerCase() === "active"
                          ? "success"
                          : "error"
                      }
                    />
                  </Box>
                </Box>

                {policy.conditions && policy.conditions.length > 0 && (
                  <Box>
                    <Typography
                      variant="body2"
                      className={
                        isDarkTheme ? "text-gray-400" : "text-gray-600"
                      }
                    >
                      Conditions
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      {policy.conditions.map((condition: PolicyCondition, index: number) => (
                        <Box key={index} sx={{ mb: 1 }}>
                          <Typography
                            variant="body2"
                            fontWeight="medium"
                            className={
                              isDarkTheme ? "text-gray-300" : "text-gray-700"
                            }
                          >
                            {condition.type}: {condition.status}
                          </Typography>
                          {condition.reason && (
                            <Typography
                              variant="body2"
                              className={
                                isDarkTheme ? "text-gray-400" : "text-gray-600"
                              }
                            >
                              Reason: {condition.reason}
                            </Typography>
                          )}
                          {condition.message && (
                            <Typography
                              variant="body2"
                              className={
                                isDarkTheme ? "text-gray-400" : "text-gray-600"
                              }
                            >
                              {condition.message}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={8}>
            <Paper
              sx={{
                p: 2,
                height: "100%",
                backgroundColor: isDarkTheme ? "#0f172a" : "#fff",
                color: isDarkTheme ? "#fff" : "inherit",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  className={isDarkTheme ? "text-white" : ""}
                >
                  YAML Configuration
                </Typography>
                <Button
                  size="small"
                  startIcon={<ContentCopy />}
                  onClick={() => navigator.clipboard.writeText(yamlContent || '')}
                  sx={{
                    color: isDarkTheme ? "#fff" : "text.primary",
                    "&:hover": {
                      color: isDarkTheme ? "#fff" : "text.primary",
                      opacity: 0.8
                    },
                  }}
                >
                  Copy
                </Button>
              </Box>
              <Box
                sx={{
                  mt: 2,
                  border: 1,
                  borderColor: isDarkTheme ? "gray.700" : "divider",
                }}
              >
                {fetchLoading ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                    <CircularProgress />
                  </Box>
                ) : fetchError ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                    <Alert severity="error" sx={{ width: "100%" }}>
                      {fetchError}
                    </Alert>
                  </Box>
                ) : !yamlContent ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                    <Alert severity="warning" sx={{ width: "100%" }}>
                      No YAML content available
                    </Alert>
                  </Box>
                ) : (
                  <Editor
                    height="400px"
                    language="yaml"
                    value={yamlContent}
                    theme={isDarkTheme ? "vs-dark" : "light"}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                    onMount={() => {
                      console.log("Editor mounted. YAML content:", yamlContent);
                    }}
                  />
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <Button onClick={onClose} sx={{ color: isDarkTheme ? "#fff" : "text.primary" }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PolicyDetailDialog;
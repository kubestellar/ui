import React, { useState, useEffect, useContext } from "react";
import Editor from "@monaco-editor/react";
import yaml from "js-yaml";
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
  Snackbar,
  Typography,
  CircularProgress,
} from "@mui/material";
import { ThemeContext } from "../context/ThemeContext";
import { api } from "../lib/api";

interface PolicyData {
  name: string;
  workload: string;
  yaml: string;
}

interface YamlMetadata {
  metadata?: {
    name?: string;
  };
}

interface CreateBindingPolicyDialogProps {
  open: boolean;
  onClose: () => void;
  onCreatePolicy: (policyData: PolicyData) => void;
}

// Add confirmation dialog
const CancelConfirmationDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ open, onClose, onConfirm }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Cancel Policy Creation</DialogTitle>
    <DialogContent>
      <Alert severity="warning">
        <AlertTitle>Warning</AlertTitle>
        Are you sure you want to cancel? All changes will be lost.
      </Alert>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Continue Editing</Button>
      <Button onClick={onConfirm} color="error" variant="contained">
        Yes, Cancel
      </Button>
    </DialogActions>
  </Dialog>
);

const CreateBindingPolicyDialog: React.FC<CreateBindingPolicyDialogProps> = ({
  open,
  onClose,
  onCreatePolicy,
}) => {
  const defaultYamlTemplate = `apiVersion: control.kubestellar.io/v1alpha1
kind: BindingPolicy
metadata:
  name: example-binding-policy
  namespace: default
spec:
  clusterSelectors:
    - matchLabels:
        kubernetes.io/cluster-name: cluster1
    - matchLabels:
        kubernetes.io/cluster-name: cluster2
  downsync:
    - apiGroup: "apps"
      resources: ["Deployment"]
      namespaces: ["default"]`;

  const [activeTab, setActiveTab] = useState<string>("yaml");
  const [editorContent, setEditorContent] =
    useState<string>(defaultYamlTemplate);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [policyName, setPolicyName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleTabChange = (_event: React.SyntheticEvent, value: string) => {
    setActiveTab(value);
    if (value === "yaml" && !editorContent) {
      setEditorContent(defaultYamlTemplate);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === "string") {
          setFileContent(result);
          try {
            const parsedYaml = yaml.load(result) as YamlMetadata;
            if (parsedYaml?.metadata?.name) {
              setPolicyName(parsedYaml.metadata.name);
            }
          } catch (e) {
            console.error("Error parsing YAML:", e);
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const validateYaml = (content: string): boolean => {
    try {
      const parsedYaml = yaml.load(content) as YamlMetadata;

      // Check for required fields
      if (!parsedYaml) {
        setError("YAML content is empty or invalid");
        return false;
      }

      if (!parsedYaml.metadata) {
        setError("YAML must include metadata section");
        return false;
      }

      if (!parsedYaml.metadata.name) {
        setError("YAML must include metadata.name field");
        return false;
      }

      // Update policy name from YAML if needed
      if (parsedYaml.metadata.name !== policyName) {
        setPolicyName(parsedYaml.metadata.name);
      }

      return true;
    } catch (e) {
      if (e instanceof Error) {
        setError(`Invalid YAML format: ${e.message}`);
      } else {
        setError("Invalid YAML format");
      }
      return false;
    }
  };

  const handleCreate = async () => {
    const content = activeTab === "yaml" ? editorContent : fileContent;
    if (!content) {
      setError("YAML content is required");
      return;
    }

    if (!validateYaml(content)) {
      return;
    }

    setIsLoading(true);
    try {
      // Create FormData object
      const formData = new FormData();

      if (activeTab === "yaml") {
        const yamlBlob = new Blob([editorContent], {
          type: "application/x-yaml",
        });
        formData.append("bpYaml", yamlBlob, `${policyName}.yaml`);
      } else {
        if (selectedFile) {
          formData.append("bpYaml", selectedFile);
        }
      }

      // Use the api instance for the request
      const response = await api.post("/api/bp/create", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Policy created successfully:", response.data);

      // Call the onCreatePolicy callback with the created policy data
      onCreatePolicy({
        name: policyName,
        workload: "default-workload",
        yaml: content,
      });

      // Reset form
      setEditorContent(defaultYamlTemplate);
      setPolicyName("");
      setSelectedFile(null);
      setFileContent("");
      onClose();
    } catch (error) {
      console.error("Error creating binding policy:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create binding policy"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setEditorContent(defaultYamlTemplate);
      setPolicyName("");
      setSelectedFile(null);
      setFileContent("");
      setError("");
    }
  }, [open, defaultYamlTemplate]);

  // Extract policy name from the YAML content when it changes
  useEffect(() => {
    if (activeTab === "yaml" && editorContent) {
      try {
        const parsedYaml = yaml.load(editorContent) as YamlMetadata;
        if (parsedYaml?.metadata?.name) {
          setPolicyName(parsedYaml.metadata.name);
        }
      } catch (e) {
        // Don't show error here, just don't update the policy name
        console.debug("Error parsing YAML while typing:", e);
      }
    }
  }, [activeTab, editorContent]);

  const handleCancelClick = () => {
    if (
      activeTab === "yaml"
        ? editorContent !== defaultYamlTemplate
        : fileContent || policyName
    ) {
      setShowCancelConfirmation(true);
    } else {
      onClose();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirmation(false);
    onClose();
  };

  const { theme } = useContext(ThemeContext);
  const isDarkTheme = theme === "dark";
  const bgColor = isDarkTheme ? "#1F2937" : "background.paper";
  const textColor = isDarkTheme ? "white" : "black";
  const helperTextColor = isDarkTheme
    ? "rgba(255, 255, 255, 0.7)"
    : "rgba(0, 0, 0, 0.6)";

  return (
    <>
      <Dialog
        open={open}
        onClose={handleCancelClick}
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
        <DialogTitle
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            p: 2,
            flex: "0 0 auto",
          }}
        >
          Create Binding Policy
        </DialogTitle>

        <DialogContent
          sx={{
            p: 0,
            flex: 1,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={{ p: 2 }}>
              <Alert severity="info">
                <AlertTitle>
                  Create a binding policy by providing YAML configuration or
                  uploading a file.
                </AlertTitle>
              </Alert>
            </Box>

            <Box sx={{ px: 2 }}>
              <TextField
                fullWidth
                label="Binding Policy Name"
                value={policyName}
                onChange={(e) => setPolicyName(e.target.value)}
                required
                sx={{
                  my: 2,
                  "& .MuiInputBase-input": { color: textColor },
                  "& .MuiInputLabel-root": { color: textColor },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "divider",
                  },
                  "& .MuiFormHelperText-root": {
                    color: helperTextColor,
                  },
                }}
                InputProps={{
                  readOnly: true,
                }}
                helperText="Policy name is extracted from YAML metadata.name"
              />
            </Box>

            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                "& .MuiTab-root": {
                  color: textColor,
                  "&.Mui-selected": {
                    color: "primary.main",
                  },
                },
              }}
            >
              <Tab label="Create from YAML" value="yaml" />
              <Tab label="Upload File" value="file" />
            </Tabs>

            <Box
              sx={{
                flex: 1,
                overflow: "auto",
                p: 2,
              }}
            >
              {activeTab === "yaml" && (
                <Box
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Editor
                    height="100%"
                    language="yaml"
                    value={editorContent}
                    theme={isDarkTheme ? "vs-dark" : "light"}
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
              )}

              {activeTab === "file" && (
                <Box
                  sx={{
                    height: "100%",
                    border: "2px dashed",
                    borderColor: "divider",
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Box sx={{ textAlign: "center" }}>
                    <Button
                      variant="contained"
                      component="label"
                      sx={{ mb: 2 }}
                    >
                      Choose YAML file
                      <input
                        type="file"
                        hidden
                        accept=".yaml,.yml"
                        onChange={handleFileChange}
                      />
                    </Button>
                    {selectedFile && (
                      <Typography>
                        Selected file: {selectedFile.name}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </Box>

            <DialogActions
              sx={{
                p: 2,
                borderTop: 1,
                borderColor: "divider",
                bgcolor: bgColor,
              }}
            >
              <Button onClick={handleCancelClick} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleCreate}
                color="primary"
                disabled={
                  isLoading ||
                  !policyName ||
                  (activeTab === "yaml" ? !editorContent : !fileContent)
                }
                sx={{
                  bgcolor: "#1976d2 !important",
                  color: "#fff !important",
                  "&:hover": {
                    bgcolor: "#1565c0 !important",
                  },
                  "&:disabled": {
                    bgcolor: "rgba(25, 118, 210, 0.5) !important",
                    color: "rgba(255, 255, 255, 0.7) !important",
                  },
                }}
              >
                {isLoading ? (
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Creating...
                  </Box>
                ) : (
                  "Create Policy"
                )}
              </Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>

      <CancelConfirmationDialog
        open={showCancelConfirmation}
        onClose={() => setShowCancelConfirmation(false)}
        onConfirm={handleConfirmCancel}
      />

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="error"
          onClose={() => setError("")}
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CreateBindingPolicyDialog;

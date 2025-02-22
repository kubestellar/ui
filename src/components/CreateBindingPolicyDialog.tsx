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
} from "@mui/material";
import { ThemeContext } from "../context/ThemeContext";

interface PolicyData {
  name: string;
  workload: string;
  yaml: string;
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
  namespace: kubestellar
spec:
  subject:
    kind: Application
    apiGroup: app.kubestellar.io
    name: my-app
    namespace: default
  placement:
    clusterSelector:
      matchLabels:
        environment: production
        region: us-east
    staticPlacement:
      clusterNames:
        - cluster-a
        - cluster-b
  bindingMode: Propagate
  overrides:
    - clusterName: cluster-a
      patch:
        spec:
          replicas: 3
    - clusterName: cluster-b
      patch:
        spec:
          replicas: 5`;

  const [activeTab, setActiveTab] = useState<string>("yaml");
  const [editorContent, setEditorContent] =
    useState<string>(defaultYamlTemplate);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [policyName, setPolicyName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);

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
        }
      };
      reader.readAsText(file);
    }
  };

  const validateYaml = (content: string): boolean => {
    try {
      yaml.load(content);
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
    if (!content || !policyName) {
      return;
    }

    if (!validateYaml(content)) {
      return;
    }

    try {
      onCreatePolicy({
        name: policyName,
        workload: "default-workload",
        yaml: content,
      });
      setEditorContent(defaultYamlTemplate);
      setPolicyName("");
      setSelectedFile(null);
      setFileContent("");
      onClose();
    } catch (error) {
      console.error("Error creating binding policy:", error);
    }
  };

  useEffect(() => {
    if (open) {
      setEditorContent(defaultYamlTemplate);
      setPolicyName("");
      setSelectedFile(null);
      setFileContent("");
    }
  }, [open, defaultYamlTemplate]);

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

  return (
    <>
      <Dialog 
        open={open} 
        onClose={handleCancelClick} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: {
            height: '80vh', // Fixed height
            display: 'flex',
            flexDirection: 'column',
            m: 2, // Margin from screen edges
            bgcolor: bgColor,
            color: textColor,
          }
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            p: 2,
            flex: '0 0 auto', // Prevent title from growing
          }}
        >
          Create Binding Policy
        </DialogTitle>
        
        <DialogContent
          sx={{
            p: 0, // Remove default padding
            flex: 1, // Take remaining space
            overflow: 'hidden', // Prevent double scrollbars
          }}
        >
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Info Alert */}
            <Box sx={{ p: 2 }}>
              <Alert severity="info">
                <AlertTitle>Create a binding policy by providing YAML configuration or uploading a file.</AlertTitle>
              </Alert>
            </Box>

            {/* Policy Name Input */}
            <Box sx={{ px: 2 }}>
              <TextField
                fullWidth
                label="Binding Policy Name"
                value={policyName}
                onChange={(e) => setPolicyName(e.target.value)}
                required
                sx={{
                  my: 2,
                  '& .MuiInputBase-input': { color: textColor },
                  '& .MuiInputLabel-root': { color: textColor },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                }}
              />
            </Box>

            {/* Tabs */}
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': {
                  color: textColor,
                  '&.Mui-selected': {
                    color: 'primary.main',
                  },
                },
              }}
            >
              <Tab label="Create from YAML" value="yaml" />
              <Tab label="Upload File" value="file" />
            </Tabs>

            {/* Tab Content */}
            <Box sx={{ 
              flex: 1,
              overflow: 'auto',
              p: 2,
            }}>
              {activeTab === "yaml" && (
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
                    height: '100%',
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Box sx={{ textAlign: 'center' }}>
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

            {/* Actions */}
            <DialogActions sx={{ 
              p: 2, 
              borderTop: 1, 
              borderColor: 'divider',
              bgcolor: bgColor,
            }}>
              <Button onClick={handleCancelClick}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleCreate}
                disabled={!policyName || (activeTab === "yaml" ? !editorContent : !fileContent)}
              >
                Create Policy
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
        message={error}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </>
  );
};

export default CreateBindingPolicyDialog;

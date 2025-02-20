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
  }, [open]);

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

  return (
    <>
      <Dialog open={open} onClose={handleCancelClick} maxWidth="lg" fullWidth>
        <DialogTitle
          className={isDarkTheme ? "bg-slate-800 text-white" : ""}
        >
          Create Binding Policy
        </DialogTitle>
        <DialogContent
          className={isDarkTheme ? "bg-slate-800 text-white" : ""}
        >
          <div className="mb-6">
            <Alert severity="info" className={isDarkTheme ? "text-white" : ""}>
              <AlertTitle>Create a binding policy by providing YAML configuration or uploading a file. The policy will determine how workloads are distributed across your clusters.</AlertTitle>
            </Alert>
          </div>

          <TextField
            fullWidth
            label="Binding Policy Name"
            value={policyName}
            onChange={(e) => setPolicyName(e.target.value)}
            margin="normal"
            required
            InputProps={{
              className: isDarkTheme ? "!text-white" : "",
            }}
            className={isDarkTheme ? "bg-slate-800" : ""}
          />


          <Box sx={{ width: "100%" }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="Create from YAML" value="yaml" />
              <Tab label="Upload File" value="file" />
            </Tabs>

            <Box sx={{ mt: 2 }}>
              {activeTab === "yaml" && (
                <div className="rounded-md border">
                  <Editor
                    height="400px"
                    language="yaml"
                    value={editorContent}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                    onChange={(value) => setEditorContent(value || "")}
                  />
                </div>
              )}

              {activeTab === "file" && (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <label className="cursor-pointer">
                        <Button
                          variant="contained"
                          component="span"
                          color="primary"
                        >
                          Choose YAML file
                        </Button>
                        <input
                          type="file"
                          className="hidden"
                          accept=".yaml,.yml"
                          onChange={handleFileChange}
                        />
                      </label>
                    </div>
                    {selectedFile && (
                      <div className="text-sm text-gray-600">
                        Selected file: {selectedFile.name}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Box>
          </Box>

          <DialogActions>
            <Button variant="outlined" onClick={handleCancelClick}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={
                !policyName ||
                (activeTab === "yaml" ? !editorContent : !fileContent)
              }
            >
              Create Policy
            </Button>
          </DialogActions>
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

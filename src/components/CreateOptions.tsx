import { useState } from "react";
import Editor from "@monaco-editor/react";
import jsyaml from "js-yaml";
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";

interface Props {
  activeOption: string | null;
  setActiveOption: (option: string) => void;
  setHasUnsavedChanges: (value: boolean) => void;
  onCancel: () => void;
}

const CreateOptions = ({
  activeOption,
  setActiveOption,
  setHasUnsavedChanges,
  onCancel,
}: Props) => {
  const [fileType, setFileType] = useState<"yaml" | "json">("yaml");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [editorContent, setEditorContent] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [formData, setFormData] = useState({
    appName: "",
    containerImage: "",
    numberOfPods: 1,
    service: "None",
    description: "",
    namespace: "",
    cpuRequirement: "",
    memoryRequirement: "",
    runCommand: "",
    runCommandArgs: "",
    key: "",
    value: "",
    imagePullRequest: "",
  });

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError("No file selected.");
      return;
    }


    const formData = new FormData();
    formData.append("wds", selectedFile);

    try {
      const response = await fetch("http://localhost:4000/api/wds/create", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log(data);
      
      if (response.ok) {
        alert("Deploy Successfully");
        window.location.reload();
      } else {
        // setError(Deployment failed: ${data.message || "Unknown error"});
        console.log("error");
        
      }
    } catch (error) {
      console.error("Upload Error:", error);
      setError("Upload failed.");
    }

    setSelectedFile(null);
    setActiveOption("null");
  };

  const handleRawUpload = async () => {
    const fileContent = editorContent.trim();

    if (!fileContent) {
      setError("Please enter YAML or JSON content.");
      return;
    }

    let requestBody;

    try {
      if (fileType === "json") {
        requestBody = JSON.parse(fileContent);
      } else if (fileType === "yaml") {
        requestBody = jsyaml.load(fileContent);
      } else {
        setError("Unsupported file type.");
        return;
      }
    } catch (error) {
      console.log(error);
      setError("Invalid JSON/YAML format.");
      return;
    }

    if (!requestBody.namespace || !requestBody.name || !requestBody.container) {
      setError("Missing required fields: 'namespace', 'name', or 'container'.");
      return;
    }

    try {
      const response = await fetch("http://localhost:4000/api/wds/create/json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(errorText);
        
        // throw new Error(Upload failed: ${errorText});
      }

      alert("Upload successful!");
      window.location.reload();
    } catch (error) {
      console.error("Error uploading:", error);
      setError("Upload failed.");
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    onCancel();
  };

  return (
    <Dialog open={!!activeOption} onClose={onCancel} maxWidth="lg" fullWidth>
      <DialogTitle>Create Deployment</DialogTitle>
      <DialogContent>
        <Box sx={{ width: "100%" }}>
          <Tabs
            value={activeOption}
            onChange={(_event, newValue) => setActiveOption(newValue)}
          >
            <Tab label="Create from Input" value="option1" />
            <Tab label="Create from File" value="option2" />
            <Tab label="Create from Form" value="option3" />
          </Tabs>

          <Box sx={{ mt: 2 }}>
            {activeOption === "option1" && (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <AlertTitle>Info</AlertTitle>
                  Select a YAML or JSON file specifying the resources to deploy to
                  the currently selected namespace.
                </Alert>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>File Type</InputLabel>
                  <Select
                    value={fileType}
                    onChange={(e) =>
                      setFileType(e.target.value as "yaml" | "json")
                    }
                    label="File Type"
                  >
                    <MenuItem value="yaml">YAML</MenuItem>
                    <MenuItem value="json">JSON</MenuItem>
                  </Select>
                </FormControl>

                <Editor
                  height="400px"
                  language={fileType}
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

                <DialogActions>
                  <Button onClick={handleCancel}>Cancel</Button>
                  <Button
                    variant="contained"
                    onClick={handleRawUpload}
                    disabled={!editorContent}
                  >
                    Upload
                  </Button>
                </DialogActions>
              </Box>
            )}

            {activeOption === "option2" && (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <AlertTitle>Info</AlertTitle>
                  Select a YAML or JSON file specifying the resources to deploy to
                  the currently selected namespace.
                </Alert>

                <Box
                  sx={{
                    border: 2,
                    borderColor: "grey.500",
                    borderRadius: 1,
                    p: 2,
                    textAlign: "center",
                  }}
                >
                  <Button variant="contained" component="label">
                    Choose YAML or JSON file
                    <input
                      type="file"
                      hidden
                      accept=".yaml,.yml,.json"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSelectedFile(file);
                        setHasUnsavedChanges(true);
                      }}
                    />
                  </Button>

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
                  >
                    Upload & Deploy
                  </Button>
                </DialogActions>
              </Box>
            )}

            {activeOption === "option3" && (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <AlertTitle>Info</AlertTitle>
                  Fill out the form to create a deployment.
                </Alert>

                <TextField
                  fullWidth
                  label="App Name"
                  value={formData.appName}
                  onChange={(e) =>
                    setFormData({ ...formData, appName: e.target.value })
                  }
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="Container Image"
                  value={formData.containerImage}
                  onChange={(e) =>
                    setFormData({ ...formData, containerImage: e.target.value })
                  }
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="Number of Pods"
                  type="number"
                  value={formData.numberOfPods}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      numberOfPods: +e.target.value,
                    })
                  }
                  sx={{ mb: 2 }}
                />

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Service Type</InputLabel>
                  <Select
                    value={formData.service}
                    onChange={(e) =>
                      setFormData({ ...formData, service: e.target.value })
                    }
                    label="Service Type"
                  >
                    <MenuItem value="None">None</MenuItem>
                    <MenuItem value="ClusterIP">ClusterIP</MenuItem>
                    <MenuItem value="NodePort">NodePort</MenuItem>
                    <MenuItem value="LoadBalancer">LoadBalancer</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Namespace"
                  value={formData.namespace}
                  onChange={(e) =>
                    setFormData({ ...formData, namespace: e.target.value })
                  }
                  sx={{ mb: 2 }}
                />

                {showAdvancedOptions && (
                  <>
                    <TextField
                      fullWidth
                      label="Description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      sx={{ mb: 2 }}
                    />

                    <TextField
                      fullWidth
                      label="CPU Requirement"
                      value={formData.cpuRequirement}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cpuRequirement: e.target.value,
                        })
                      }
                      sx={{ mb: 2 }}
                    />

                    <TextField
                      fullWidth
                      label="Memory Requirement"
                      value={formData.memoryRequirement}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          memoryRequirement: e.target.value,
                        })
                      }
                      sx={{ mb: 2 }}
                    />

                    <TextField
                      fullWidth
                      label="Run Command"
                      value={formData.runCommand}
                      onChange={(e) =>
                        setFormData({ ...formData, runCommand: e.target.value })
                      }
                      sx={{ mb: 2 }}
                    />

                    <TextField
                      fullWidth
                      label="Run Command Arguments"
                      value={formData.runCommandArgs}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          runCommandArgs: e.target.value,
                        })
                      }
                      sx={{ mb: 2 }}
                    />

                    <TextField
                      fullWidth
                      label="Image Pull Request"
                      value={formData.imagePullRequest}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          imagePullRequest: e.target.value,
                        })
                      }
                      sx={{ mb: 2 }}
                    />
                  </>
                )}

                <DialogActions>
                  <Button onClick={handleCancel}>Cancel</Button>
                  <Button
                    variant="contained"
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  >
                    {showAdvancedOptions
                      ? "Hide Advanced Options"
                      : "Show Advanced Options"}
                  </Button>
                  <Button variant="contained">Deploy</Button>
                </DialogActions>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError("")}
        message={error}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Dialog>
  );
};

export default CreateOptions;
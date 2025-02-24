import { useState } from "react";
import Editor from "@monaco-editor/react";
import jsyaml from "js-yaml";
import { ThemeContext } from "../context/ThemeContext"; 
import { AlertColor } from "@mui/material";
import { useContext } from "react";
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
  setActiveOption: (option: string | null) => void;
  // setHasUnsavedChanges: (value: boolean) => void;
  onCancel: () => void;
}

const CreateOptions = ({
  activeOption,
  setActiveOption,
  // setHasUnsavedChanges,
  onCancel,
}: Props) => {
  const [fileType, setFileType] = useState<"yaml" | "json">("yaml");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [editorContent, setEditorContent] = useState<string>("");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor; // Set correct type
  }>({
    open: false,
    message: "",
    severity: "success", // Default value
  });  
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { theme } = useContext(ThemeContext);

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
    githuburl: "",
    path: ""
  });

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setSnackbar({
        open: true,
        message: "No file selected.",
        severity: "error",
      });
      return;
    }
  
    const formData = new FormData();
    formData.append("wds", selectedFile);
  
    try {
      const response = await fetch(`${process.env.VITE_BASE_URL}/api/wds/create`, {
        method: "POST",
        body: formData,
      });
  
      const data = await response.json();
      console.log(data);
  
      if (response.ok) {
        setSnackbar({
          open: true,
          message: "Deployment successful!",
          severity: "success",
        });
  
        // Close modal properly before reloading
        handleCancel();
  
        // Wait a short time, then reload the page
        setTimeout(() => {
          window.location.reload();
        }, 100);
  
      } else if (response.status === 400 || response.status === 409) {
        setSnackbar({
          open: true,
          message: "Deployment already exists.",
          severity: "warning",
        });
      } else {
        setSnackbar({
          open: true,
          message: "Deployment failed. Please try again.",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Upload Error:", error);
      setSnackbar({
        open: true,
        message: "Upload failed.",
        severity: "error",
      });
    }
  };
  
  const handleRawUpload = async () => {
    const fileContent = editorContent.trim();
  
    if (!fileContent) {
      setSnackbar({
        open: true,
        message: "Please enter YAML or JSON content.",
        severity: "error",
      });
      return;
    }
  
    let requestBody;
  
    try {
      let parsedInput: {
        metadata?: { name: string; namespace?: string; labels?: Record<string, string> };
        spec?: {
          replicas?: number;
          selector?: { matchLabels?: Record<string, string> };
          template?: {
            metadata?: { labels?: Record<string, string> };
            spec?: {
              containers?: {
                name: string;
                image: string;
                ports?: { containerPort: number }[];
              }[];
            };
          };
        };
      };
  
      if (fileType === "json") {
        parsedInput = JSON.parse(fileContent);
      } else if (fileType === "yaml") {
        parsedInput = jsyaml.load(fileContent) as typeof parsedInput;
      } else {
        setSnackbar({
          open: true,
          message: "Unsupported file type. Please use JSON or YAML.",
          severity: "error",
        });
        return;
      }
  
      // ✅ Convert parsed input (either JSON or YAML) to match backend format
      requestBody = {
        namespace: parsedInput.metadata?.namespace || "default",
        name: parsedInput.metadata?.name,
        replicas: parsedInput.spec?.replicas || 1,
        labels: parsedInput.metadata?.labels || {},
        container: {
          name: parsedInput.spec?.template?.spec?.containers?.[0]?.name || "",
          image: parsedInput.spec?.template?.spec?.containers?.[0]?.image || "",
          ports:
            parsedInput.spec?.template?.spec?.containers?.[0]?.ports?.map(
              (port: { containerPort: number }) => ({
                containerPort: port.containerPort,
              })
            ) || [],
        },
      };
    } catch (error) {
      console.error("Parsing Error:", error);
      setSnackbar({
        open: true,
        message: "Invalid JSON/YAML format.",
        severity: "error",
      });
      return;
    }
  
    // ✅ Validate required fields before sending the request
    if (!requestBody.namespace || !requestBody.name || !requestBody.container.name) {
      setSnackbar({
        open: true,
        message: "Missing required fields: 'namespace', 'name', or 'container'.",
        severity: "error",
      });
      return;
    }
  
    if (!requestBody.container.ports.length) {
      setSnackbar({
        open: true,
        message: "Container must have at least one port.",
        severity: "error",
      });
      return;
    }
  
    try {
      const response = await fetch(`${process.env.VITE_BASE_URL}/api/wds/create/json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
  
      const responseData = await response.json();
  
      if (!response.ok) {
        console.error("Backend Error:", responseData);
  
        if (response.status === 400 || response.status === 409 || response.status === 500) {
          setSnackbar({
            open: true,
            message: `Deployment failed: ${responseData.err?.ErrStatus?.message || "Already exists."}`,
            severity: "error",
          });
          return;
        }
  
        setSnackbar({
          open: true,
          message: "Unknown error occurred.",
          severity: "error",
        });
        return;
      }
  
      setSnackbar({
        open: true,
        message: "Deployment successful!",
        severity: "success",
      });
  
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error("Error uploading:", error);
      setSnackbar({
        open: true,
        message: "Upload failed.",
        severity: "error",
      });
    }
  };
  
  console.log(error);
  
  const handleDeploy = async () => {
    // Check if both fields are filled
    if (!formData.githuburl || !formData.path) {
      setSnackbar({ open: true, message: "Please fill in both fields.", severity: "error" });
      return;
    }
  
    setLoading(true);
  
    // Prepare the data to send to the backend
    const requestData = {
      url: formData.githuburl,
      path: formData.path,
    };
  
    try {
      const response = await fetch(`${process.env.VITE_BASE_URL}/api/wds/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });
  
      const result = await response.json();
  
      if (response.ok) {
        setSnackbar({
          open: true,
          message: "Deployment created successfully!",
          severity: "success",
        });
  
      // Clear only the githuburl and path fields after deployment
          setFormData((prevState) => ({
            ...prevState, // Keep all other properties intact
            githuburl: "", // Clear the GitHub URL field
            path: "", // Clear the Path field
          }))
  
        // Refresh the page after a successful deployment
        setTimeout(() => {
          window.location.reload();
        }, 1000);
  
        // Close the dialog if necessary (you can modify this based on your dialog setup)
        handleCancel();
      } else {
        // Handle error response, e.g., if deployment already exists
        if (response.status === 409 || response.status === 400 || response.status === 500) {
          setSnackbar({
            open: true,
            message: `Deployment already exists: ${result.message}`,
            severity: "warning",
          });
        } else {
          setSnackbar({
            open: true,
            message: `Error: ${result.message}`,
            severity: "error",
          });
        }
      }
    } catch (error) {
      console.log(error);
      setSnackbar({
        open: true,
        message: "An error occurred while creating the deployment.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };
  

  const handleCancel = () => {
    setSelectedFile(null); // Clear file selection
    setError("");          // Clear error messages
    setActiveOption(null);  // Close the modal
  };
  

  return (
    <Dialog 
      open={!!activeOption} 
      onClose={onCancel} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: {
          height: '80vh',
          display: 'flex',
          flexDirection: 'column',
          m: 2,
          bgcolor: theme === 'dark' ? '#1F2937' : 'background.paper',
          color: theme === 'dark' ? 'white' : 'black',
        }
      }}
    >
      <DialogTitle
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          p: 2,
          flex: '0 0 auto',
        }}
      >
        Create Deployment
      </DialogTitle>
      
      <DialogContent
        sx={{
          p: 0,
          flex: 1,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Tabs
            value={activeOption}
            onChange={(_event, newValue) => setActiveOption(newValue)}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              '& .MuiTab-root': {
                px: 3,
                py: 1.5,
                color: theme === 'dark' ? 'white' : 'black',
                '&.Mui-selected': {
                  color: 'primary.main',
                  bgcolor: theme === 'dark' ? 'rgba(144, 202, 249, 0.08)' : '#E3F2FD',
                },
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderTopLeftRadius: 3,
                borderTopRightRadius: 3,
              }
            }}
          >
            <Tab label="Create from Input" value="option1" />
            <Tab label="Create from File" value="option2" />
            <Tab label="Create from Form" value="option3" />
            <Tab label="Create from Github" value="option4" />
          </Tabs>

          <Box sx={{ 
            flex: 1,
            overflow: 'auto',
            p: 3,
          }}>
            {activeOption === "option1" && (
              <Box sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}>
                <Alert severity="info">
                  <AlertTitle>Info</AlertTitle>
                  Select a YAML or JSON file specifying the resources to deploy.
                </Alert>

                <FormControl sx={{ flex: '0 0 auto' }}>
                  <InputLabel>File Type</InputLabel>
                  <Select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value as "yaml" | "json")}
                    label="File Type"
                  >
                    <MenuItem value="yaml">YAML</MenuItem>
                    <MenuItem value="json">JSON</MenuItem>
                  </Select>
                </FormControl>

                <Box sx={{ flex: 1, minHeight: 0 }}>
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

                <DialogActions sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Button onClick={onCancel}>Cancel</Button>
                  <Button
                    variant="contained"
                    onClick={handleRawUpload}
                    disabled={!editorContent}
                  >
                    Deploy
                  </Button>
                </DialogActions>
              </Box>
            )}

            {activeOption === "option2" && (
              <Box sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}>
                <Alert severity="info">
                  <AlertTitle>Info</AlertTitle>
                  Select a YAML or JSON file specifying the resources to deploy.
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
                      onClick={(e) => (e.currentTarget.value = "")} // Ensure new file selection triggers event
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSelectedFile(file);
                        // setHasUnsavedChanges(true);
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
                  <Button onClick={onCancel}>Cancel</Button>
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
              <Box sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}>
                <Alert severity="info">
                  <AlertTitle>Info</AlertTitle>
                  Not Developed Full.
                </Alert>

                <TextField
                  fullWidth
                  label="App Name"
                  value={formData.appName}
                  onChange={(e) =>
                    setFormData({ ...formData, appName: e.target.value })
                  }
                  sx={{
                    mb: 2,
                    input: { color: theme === "dark" ? "white" : "black" },
                    label: { color: theme === "dark" ? "white" : "black" },
                    fieldset: {
                      borderColor: theme === "dark" ? "white" : "black",
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: theme === "dark" ? "white" : "black",
                    },
                  }}
                />


                <TextField
                  fullWidth
                  label="Container Image"
                  value={formData.containerImage}
                  onChange={(e) =>
                    setFormData({ ...formData, containerImage: e.target.value })
                  }
                  sx={{
                    mb: 2,
                    input: { color: theme === "dark" ? "white" : "black" },
                    label: { color: theme === "dark" ? "white" : "black" },
                    fieldset: {
                      borderColor: theme === "dark" ? "white" : "black",
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: theme === "dark" ? "white" : "black",
                    },
                  }}
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
                  sx={{
                    mb: 2,
                    input: { color: theme === "dark" ? "white" : "black" },
                    label: { color: theme === "dark" ? "white" : "black" },
                    fieldset: {
                      borderColor: theme === "dark" ? "white" : "black",
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: theme === "dark" ? "white" : "black",
                    },
                  }}
                />

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel
                      sx={{
                        color: theme === "dark" ? "white" : "black",
                        "&.Mui-focused": { color: theme === "dark" ? "white" : "black" },
                      }}
                    >
                      Service Type
                    </InputLabel>
                    <Select
                      value={formData.service}
                      onChange={(e) =>
                        setFormData({ ...formData, service: e.target.value })
                      }
                      label="Service Type"
                      sx={{
                        color: theme === "dark" ? "white" : "black",
                        "& .MuiSelect-select": {
                          color: theme === "dark" ? "white" : "black",
                        },
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: theme === "dark" ? "white" : "black",
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: theme === "dark" ? "white" : "black",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: theme === "dark" ? "white" : "black",
                        },
                      }}
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
                  sx={{
                    mb: 2,
                    input: { color: theme === "dark" ? "white" : "black" },
                    label: { color: theme === "dark" ? "white" : "black" },
                    fieldset: {
                      borderColor: theme === "dark" ? "white" : "black",
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: theme === "dark" ? "white" : "black",
                    },
                  }}
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
                  sx={{
                    mb: 2,
                    input: { color: theme === "dark" ? "white" : "black" },
                    label: { color: theme === "dark" ? "white" : "black" },
                    fieldset: {
                      borderColor: theme === "dark" ? "white" : "black",
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: theme === "dark" ? "white" : "black",
                    },
                  }}
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
                  sx={{
                    mb: 2,
                    input: { color: theme === "dark" ? "white" : "black" },
                    label: { color: theme === "dark" ? "white" : "black" },
                    fieldset: {
                      borderColor: theme === "dark" ? "white" : "black",
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: theme === "dark" ? "white" : "black",
                    },
                  }}
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
                  sx={{
                    mb: 2,
                    input: { color: theme === "dark" ? "white" : "black" },
                    label: { color: theme === "dark" ? "white" : "black" },
                    fieldset: {
                      borderColor: theme === "dark" ? "white" : "black",
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: theme === "dark" ? "white" : "black",
                    },
                  }}
                    />

                    <TextField
                      fullWidth
                      label="Run Command"
                      value={formData.runCommand}
                      onChange={(e) =>
                        setFormData({ ...formData, runCommand: e.target.value })
                      }
                  sx={{
                    mb: 2,
                    input: { color: theme === "dark" ? "white" : "black" },
                    label: { color: theme === "dark" ? "white" : "black" },
                    fieldset: {
                      borderColor: theme === "dark" ? "white" : "black",
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: theme === "dark" ? "white" : "black",
                    },
                  }}
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
                  sx={{
                    mb: 2,
                    input: { color: theme === "dark" ? "white" : "black" },
                    label: { color: theme === "dark" ? "white" : "black" },
                    fieldset: {
                      borderColor: theme === "dark" ? "white" : "black",
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: theme === "dark" ? "white" : "black",
                    },
                  }}
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
                  sx={{
                    mb: 2,
                    input: { color: theme === "dark" ? "white" : "black" },
                    label: { color: theme === "dark" ? "white" : "black" },
                    fieldset: {
                      borderColor: theme === "dark" ? "white" : "black",
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: theme === "dark" ? "white" : "black",
                    },
                  }}
                    />
                  </>
                )}

                <DialogActions>
                  <Button onClick={onCancel}>Cancel</Button>
                  <Button
                    variant="contained"
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  >
                    {showAdvancedOptions ? "Hide Advanced Options" : "Show Advanced Options"}
                  </Button>
                  <Button variant="contained">Deploy</Button>
                </DialogActions>
              </Box>
            )}
            {activeOption === "option4" && (
              <Box sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}>
                <Alert severity="info">
                  <AlertTitle>Info</AlertTitle>
                  Fill out the form to create a deployment.
                </Alert>

                <TextField
                  fullWidth
                  label="GitHub Url"
                  value={formData.githuburl}
                  onChange={(e) => setFormData({ ...formData, githuburl: e.target.value })}
                  sx={{
                    mb: 2,
                    input: { color: theme === "dark" ? "white" : "black" },
                    label: { color: theme === "dark" ? "white" : "black" },
                    fieldset: { borderColor: theme === "dark" ? "white" : "black" },
                    "& .MuiInputLabel-root.Mui-focused": { color: theme === "dark" ? "white" : "black" },
                  }}
                />

                <TextField
                  fullWidth
                  label="Path"
                  value={formData.path}
                  onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                  sx={{
                    mb: 2,
                    input: { color: theme === "dark" ? "white" : "black" },
                    label: { color: theme === "dark" ? "white" : "black" },
                    fieldset: { borderColor: theme === "dark" ? "white" : "black" },
                    "& .MuiInputLabel-root.Mui-focused": { color: theme === "dark" ? "white" : "black" },
                  }}
                />

                <DialogActions>
                  <Button onClick={onCancel}>Cancel</Button>
                  <Button variant="contained" onClick={handleDeploy} disabled={loading}>
                    {loading ? "Deploying..." : "Deploy"}
                  </Button>
                </DialogActions>
              </Box>
            )}

          </Box>
        </Box>
      </DialogContent>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default CreateOptions;
import { useState, useContext } from "react";
import Editor from "@monaco-editor/react";
import jsyaml from "js-yaml";
import { ThemeContext } from "../context/ThemeContext";
import { AlertColor } from "@mui/material";
import { useWDSQueries } from "../hooks/queries/useWDSQueries";
import { toast } from "react-hot-toast";
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
  CircularProgress,
} from "@mui/material";

interface Props {
  open: boolean;
  activeOption: string | null;
  setActiveOption: (option: string | null) => void;
  onCancel: () => void;
  onSubmit: (data: any, isJson: boolean) => void;
}

const CreateOptions = ({ open, activeOption, setActiveOption, onCancel }: Props) => {
  const { theme } = useContext(ThemeContext);
  const [editorContent, setEditorContent] = useState("");
  const [isValidContent, setIsValidContent] = useState(false);
  const [fileType, setFileType] = useState<"yaml" | "json">("yaml");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
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

  const wdsQueries = useWDSQueries();
  const createMutation = wdsQueries.useCreateWorkload();

  const validateContent = (content: string) => {
    try {
      if (!content) {
        setIsValidContent(false);
        return;
      }

      if (activeOption === "option2") {
        // Validate JSON
        JSON.parse(content);
      } else {
        // For YAML, just check if it's not empty for now
        // You might want to add a YAML validator library
        if (content.trim().length > 0) {
          setIsValidContent(true);
          return;
        }
      }
      setIsValidContent(true);
    } catch (error) {
      console.error('Validation error:', error);
      setIsValidContent(false);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    const content = value || "";
    setEditorContent(content);
    validateContent(content);
  };

  const handleCreate = async () => {
    try {
      if (!editorContent) {
        toast.error("Please enter workload configuration");
        return;
      }

      console.log('Creating workload with:', {
        content: editorContent,
        isJson: activeOption === "option2"
      });

      await createMutation.mutateAsync({
        data: editorContent,
        isJson: activeOption === "option2"
      });

      setEditorContent("");
      onCancel();
    } catch (error) {
      console.error('Create error:', error);
      // Error toast is handled by the mutation
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    setActiveOption(newValue);
    validateContent(editorContent);
  };

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
      const response = await fetch("http://localhost:4000/api/wds/create", {
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
        onCancel();
  
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
  
      // Convert parsed input (either JSON or YAML) to match backend format
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
      const response = await fetch("http://localhost:4000/api/wds/create/json", {
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
      const response = await fetch("http://localhost:4000/api/wds/create", {
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
        onCancel();
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
      open={open} 
      onClose={onCancel} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle>Create Workload</DialogTitle>
      <DialogContent>
        <Tabs
          value={activeOption}
          onChange={handleTabChange}
          sx={{ mb: 2 }}
        >
          <Tab value="option1" label="YAML" />
          <Tab value="option2" label="JSON" />
        </Tabs>
        <Box sx={{ height: '400px' }}>
          <Editor
            height="100%"
            defaultLanguage={activeOption === "option1" ? "yaml" : "json"}
            theme={theme === "dark" ? "vs-dark" : "light"}
            value={editorContent}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button 
          onClick={handleCreate}
          disabled={!isValidContent || createMutation.isPending}
          variant="contained"
          color="primary"
        >
          {createMutation.isPending ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Creating...
            </>
          ) : (
            'Create'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateOptions;
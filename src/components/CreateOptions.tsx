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
import axios, { AxiosError } from "axios"; // Import AxiosError for proper typing
import useTheme from "../stores/themeStore";
import { useWDSQueries } from "../hooks/queries/useWDSQueries";
import { toast } from "react-hot-toast";

interface Props {
  activeOption: string | null;
  setActiveOption: (option: string | null) => void;
  onCancel: () => void;
}

const CreateOptions = ({
  activeOption,
  setActiveOption,
  onCancel,
}: Props) => {
  const [fileType, setFileType] = useState<"yaml" | "json">("yaml");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editorContent, setEditorContent] = useState<string>("");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning" | "info";
  }>({
    open: false,
    message: "",
    severity: "success",
  });
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const theme = useTheme((state) => state.theme);

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
    path: "",
  });

  const { useCreateWorkload } = useWDSQueries();
  const createWorkloadMutation = useCreateWorkload();

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error("No file selected.");
      return;
    }

    const formData = new FormData();
    formData.append("wds", selectedFile);

    try {
      await createWorkloadMutation.mutateAsync({ data: formData, isJson: false });
      toast.success("Deployment successful!");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Upload Error:", error);
      toast.error("Upload failed.");
    }
  };

  const handleRawUpload = async () => {
    const fileContent = editorContent.trim();

    if (!fileContent) {
      toast.error("Please enter YAML or JSON content.");
      return;
    }

    let requestBody;

    try {
      let parsedInput: {
        metadata?: {
          name: string;
          namespace?: string;
          labels?: Record<string, string>;
        };
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
        toast.error("Unsupported file type. Please use JSON or YAML.");
        return;
      }

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
    } catch (error: unknown) {
      console.error("Parsing Error:", error);
      toast.error("An error occurred while parsing the input.");
      return;
    }

    if (!requestBody.namespace || !requestBody.name || !requestBody.container.name) {
      toast.error("Missing required fields: 'namespace', 'name', or 'container'.");
      return;
    }

    if (!requestBody.container.ports.length) {
      toast.error("Container must have at least one port.");
      return;
    }

    try {
      await createWorkloadMutation.mutateAsync({ data: requestBody, isJson: true });
      toast.success("Deployment successful!");
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error("Error uploading:", error);
      toast.error("Upload failed.");
    }
  };

  // Updated handleDeploy with proper AxiosError typing
  const handleDeploy = async () => {
    if (!formData.githuburl || !formData.path) {
      setSnackbar({
        open: true,
        message: "Please fill both GitHub URL and Path fields!",
        severity: "error",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post("http://localhost:4000/api/deploy", {
        repo_url: formData.githuburl,
        folder_path: formData.path,
      });

      console.log("Deploy response:", response);

      if (response.status === 200) {
        setSnackbar({
          open: true,
          message: "Deployed successfully!",
          severity: "success",
        });
        setFormData({ ...formData, githuburl: "", path: "" });
        setTimeout(() => window.location.reload(), 4000); // Matches TreeView's snackbar duration
      } else {
        throw new Error("Unexpected response status: " + response.status);
      }
    } catch (error: unknown) {
      const err = error as AxiosError; // Use AxiosError instead of any
      console.error("Deploy error:", err);

      if (err.response) {
        if (err.response.status === 500) {
          setSnackbar({
            open: true,
            message: "Deploy already exists!",
            severity: "error",
          });
        } else if (err.response.status === 409) {
          setSnackbar({
            open: true,
            message: "Conflict error: Deployment already in progress!",
            severity: "error",
          });
        } else {
          setSnackbar({
            open: true,
            message: `Deployment failed! (${err.response.status})`,
            severity: "error",
          });
        }
      } else {
        setSnackbar({
          open: true,
          message: "Deployment failed due to network error!",
          severity: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = () => {
    setSelectedFile(null); // Clear file selection
    setError(""); // Clear error messages
    setActiveOption(null); // Close the modal
    onCancel(); // Call parent cancel function
  };

  return (
    <>
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      <Dialog open={!!activeOption} onClose={onCancel} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ color: theme === "dark" ? "white" : "black", bgcolor: theme === "dark" ? "#1F2937" : "background.paper" }}>
          Create Deployment
        </DialogTitle>
        <DialogContent sx={{ bgcolor: theme === "dark" ? "#1F2937" : "background.paper" }}>
          <Box sx={{ width: "100%" }}>
            <Tabs
              value={activeOption}
              onChange={(_event, newValue) => setActiveOption(newValue)}
            >
              <Tab sx={{ color: theme === "dark" ? "white" : "black" }} label="Create from Input" value="option1" />
              <Tab sx={{ color: theme === "dark" ? "white" : "black" }} label="Create from File" value="option2" />
              <Tab sx={{ color: theme === "dark" ? "white" : "black" }} label="Create from Github" value="option3" />
            </Tabs>

            <Box sx={{ mt: 2 }}>
              {activeOption === "option1" && (
                <Box>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <AlertTitle>Info</AlertTitle>
                    Select a YAML or JSON file specifying the resources to deploy to
                    the currently selected namespace.
                  </Alert>

                  <FormControl
                    fullWidth
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
                  >
                    <InputLabel>File Type</InputLabel>
                    <Select
                      sx={{
                        bgcolor: theme === "dark" ? "#1F2937" : "background.paper",
                        color: theme === "dark" ? "white" : "black",
                      }}
                      value={fileType}
                      onChange={(e) => {
                        setFileType(e.target.value as "yaml" | "json");
                        setEditorContent("");
                      }}
                      label="File Type"
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            bgcolor: theme === "dark" ? "#1F2937" : "background.paper",
                          },
                        },
                      }}
                    >
                      <MenuItem sx={{ color: theme === "dark" ? "white" : "black" }} value="yaml">
                        YAML
                      </MenuItem>
                      <MenuItem sx={{ color: theme === "dark" ? "white" : "black" }} value="json">
                        JSON
                      </MenuItem>
                    </Select>
                  </FormControl>

                  <Editor
                    height="400px"
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

                  <DialogActions>
                    <Button onClick={handleCancelClick}>Cancel</Button>
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
                <Box
                  sx={{
                    color: theme === "dark" ? "white" : "black",
                    height: "617px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
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
                      p: 27,
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Button variant="contained" component="label">
                      Choose YAML or JSON file
                      <input
                        type="file"
                        hidden
                        accept=".yaml,.yml,.json"
                        onClick={(e) => (e.currentTarget.value = "")}
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setSelectedFile(file);
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
                    <Button onClick={handleCancelClick}>Cancel</Button>
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
                <Box
                  className={theme === "dark" ? "bg-gray-800 text-white" : "text-black"}
                  sx={{ height: "617px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
                  p={2}
                  borderRadius={2}
                >
                  {/* Alert at the Top */}
                  <Alert severity="info">
                    <AlertTitle>Info</AlertTitle>
                    Fill out the form to create a deployment.
                  </Alert>
                  {/* Centered GitHub URL and Path Fields */}
                  <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
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
                  </Box>

                  {/* Deploy and Cancel Buttons at the Bottom */}
                  <DialogActions>
                    <Button onClick={handleCancelClick} sx={{ color: theme === "dark" ? "white" : "black" }}>
                      Cancel
                    </Button>
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
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Dialog>
    </>
  );
};

export default CreateOptions;
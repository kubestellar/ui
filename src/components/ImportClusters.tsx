import { useEffect, useState, useContext } from "react";
import Editor from "@monaco-editor/react";
import { ThemeContext } from "../context/ThemeContext";
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Snackbar,
} from "@mui/material";
import axios from "axios";

interface Props {
  activeOption: string | null;
  setActiveOption: (option: string | null) => void;
  onCancel: () => void;
}

const commonInputSx = {
  mb: 2,
  input: { color: "inherit" },
  label: { color: "inherit" },
  fieldset: { borderColor: "inherit" },
  "& .MuiInputLabel-root.Mui-focused": { color: "inherit" },
};

const ImportClusters = ({ activeOption, setActiveOption, onCancel }: Props) => {
  const { theme } = useContext(ThemeContext);
  const textColor = theme === "dark" ? "white" : "black";
  const bgColor = theme === "dark" ? "#1F2937" : "background.paper";

  const [fileType, setFileType] = useState<"yaml">("yaml");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editorContent, setEditorContent] = useState<string>("");
  const [labels, setLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [command, setCommand] = useState("");

  const [formData, setFormData] = useState({
    clusterName: "",
    token: "",
    value: ["1"],
  });

  const [token, setToken] = useState<string>("");

  useEffect(() => {
    setToken("placeholder-token"); // Temporary fix so it's "used"
  }, []);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning" | "info";
  }>({
    open: false,
    message: "",
    severity: "info", // Can be "success", "error", "warning", or "info"
  });

  // Fetch token whenever clusterName changes
  useEffect(() => {
    if (formData.clusterName) {
      fetch(`/api/get-token?cluster=${formData.clusterName}`)
        .then((res) => res.json())
        .then((data) => {
          setFormData((prev) => ({ ...prev, token: data.token }));
        })
        .catch((err) => console.error("Error fetching token:", err));
    }
  }, [formData.clusterName]);

  // Update the command dynamically when formData changes
  useEffect(() => {
    console.log("Current clusterName:", formData.clusterName);
    console.log("Current token:", formData.token);

    if (formData.clusterName && formData.token) {
      const newCommand = `clusteradm join --hub-token ${formData.token} --cluster-name ${formData.clusterName}`;
      console.log("Generated Command:", newCommand); // ✅ Debugging step
      setCommand(newCommand);
    }
  }, [formData.clusterName, formData.token]);


  const API_BASE_URL = "http://localhost:5000"; // JSON-Server runs on this port by default

  const handleImportCluster = async () => {
    setErrorMessage("");
    setLoading(true);

    try {
      // Send cluster import request to backend
      const response = await axios.post(`${API_BASE_URL}/clusters`, { ...formData, value: labels });
      console.log("Cluster import initiated:", response.data);

      // Clear form fields after a successful import
      setFormData({ clusterName: "", token: "", value: [] });
      setLabels([]);

      // Show success message (if needed)
      setSnackbar({
        open: true,
        message: "Cluster import started successfully!",
        severity: "success",
      });

    } catch (error: unknown) {
      console.error("Error importing cluster:", error);
      // Handle Axios errors properly
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("An unknown error occurred");
      }

      // Show error message (if needed)
      setSnackbar({
        open: true,
        message: "Error importing cluster. Please check your inputs.",
        severity: "error",
      });

    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    // Implement file reading and processing here
    console.log("File upload triggered");
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setEditorContent("");
    setErrorMessage("");
    setActiveOption(null);
  };

  const tabContentStyles = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    border: 1,
    borderColor: 'divider',
    borderRadius: 0,
    p: 3,
    overflowY: 'auto',  // Scroll in the right place
    flexGrow: 1,        //Ensures proper height
    minHeight: 0,       //Prevents flexbox shrinking issues
    bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
  };

  const formContentStyles = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    width: '100%',
    maxWidth: '800px', // Limit maximum width for better readability
    mx: 'auto', // Center the form
    '& .MuiFormControl-root': {
      width: '100%',
    },
    '& .MuiTextField-root': {
      width: '100%',
    }
  };

  return (
    <>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>

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
            flex: '0 0 auto',
          }}
        >
          Import Cluster
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
                position: 'relative',
                '& .MuiTabs-flexContainer': {
                  gap: '4px',
                  position: 'relative',
                  zIndex: 1,
                  justifyContent: 'flex',
                },
                '& .MuiTab-root': {
                  px: 3,
                  py: 1.5,
                  minHeight: '48px',
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                  color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                  backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f0f0f0',
                  border: '3px solid',
                  borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '0px 0px 0 0',
                  transition: 'all 0.2s ease-in-out',
                  marginBottom: '-5px',
                  
                  '&:hover': {
                    backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.07)' : '#f5f5f5',
                    borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                  },
                  
                  '&.Mui-selected': {
                    color: theme === 'dark' ? '#fff' : '#000',
                    backgroundColor: theme === 'dark' ? 'rgba(31, 41, 55, 0.9)' : '#ffffff',
                    borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                    borderBottom: 'none',
                    zIndex: 2,
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: -2,
                      right: -2,
                      height: '2px',
                      backgroundColor: theme === 'dark' ? 'rgba(31, 41, 55, 0.9)' : '#ffffff',
                    },
                  },
                },
                '& .MuiTabs-indicator': {
                  display: 'none',
                },
              }}
            >
              <Tab label="YAML paste" value="option1" />
              <Tab label="Kubeconfig" value="option2" />
              <Tab label="API/URL" value="option3" />
              <Tab label="Manual" value="option4" />
            </Tabs>

            <Box sx={{
              flex: 1,
              overflow: 'auto',
              p: 3,
            }}>
              {activeOption === "option1" && (
                <Box sx={{
                  ...tabContentStyles,
                  border: 1,
                  borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.3)',
                  borderTop: 'none',
                  borderLeft: '2px solid',
                  marginLeft: '20px',
                  marginRight: '8px',
                  position: 'relative',
                  width: 'calc(100% - 28px)',
                }}>
                  <Alert severity="info">
                    <AlertTitle>Info</AlertTitle>
                    Paste a YAML file.
                  </Alert>

                  <FormControl
                    sx={{
                      flex: '0 0 auto',
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1,
                        '& fieldset': {
                          borderWidth: 1,
                          borderColor: 'divider',
                        },
                        '&:hover fieldset': {
                          borderColor: 'primary.main',
                        },
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
                      sx={{ bgcolor: bgColor, color: textColor }}
                    >
                      <MenuItem value="yaml">YAML</MenuItem>
                    </Select>
                  </FormControl>

                  <Box sx={{
                    flex: 1,
                    minHeight: 0,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                  }}>
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
                      disabled={!editorContent}
                      sx={{
                        "&:disabled": {
                          cursor: "not-allowed",
                          pointerEvents: "all !important",
                        },
                        boxShadow: 2,
                      }}
                      className={`${!editorContent
                        ? theme === "dark"
                          ? "!bg-gray-700 !text-gray-400"
                          : "!bg-gray-300 !text-gray-500"
                        : ""
                        }`}
                    >
                      Upload
                    </Button>

                  </DialogActions>
                </Box>
              )}

              {activeOption === "option2" && (
                <Box sx={tabContentStyles}>
                  <Alert severity="info">
                    <AlertTitle>Info</AlertTitle>
                    Select a kubeconfig file to import cluster.
                  </Alert>
                  <Box
                    sx={{
                      border: 2,
                      borderStyle: 'dashed',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 3,
                      textAlign: "center",
                      transition: 'border-color 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        borderRadius: 1,
                        p: 2,
                        textAlign: "center",
                      }}
                    >
                      <Button component="label" sx={{ boxShadow: 2 }}>
                        Select Kubeconfig file
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
                    </Box>
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
                      sx={{
                        "&:disabled": {
                          cursor: "not-allowed",
                          pointerEvents: "all !important",
                        },
                        boxShadow: 2,
                      }}
                      className={`${!editorContent
                        ? theme === "dark"
                          ? "!bg-gray-700 !text-gray-400"
                          : "!bg-gray-300 !text-gray-500"
                        : ""
                        }`}
                    >
                      Upload & Import
                    </Button>
                  </DialogActions>
                </Box>
              )}

              {activeOption === "option3" && (
                <Box sx={tabContentStyles}>
                  <Alert severity="info">
                    <AlertTitle>Info</AlertTitle>
                    Enter API/URL to import cluster.
                  </Alert>
                  <TextField
                    fullWidth
                    label="API/URL"
                    value={formData.clusterName}
                    onChange={(e) =>
                      setFormData({ ...formData, clusterName: e.target.value })
                    }
                    sx={commonInputSx}
                  />
                  <DialogActions>
                    <Button onClick={handleCancel} sx={{ color: textColor }}>
                      Cancel
                    </Button>
                    <Button variant="contained" sx={{ boxShadow: 2 }}>
                      Import
                    </Button>
                  </DialogActions>
                </Box>
              )}

              {activeOption === "option4" && (
                <Box sx={tabContentStyles}>
                  <Alert severity="info">
                    <AlertTitle>Info</AlertTitle>
                    Enter cluster name to generate a token, to then run in the CLI.
                  </Alert>

                  <Box
                    sx={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'visible', //Prevents label cutting
                      minHeight: 0,        //Ensures proper flex behavior
                    }}
                  >
                    <Box sx={formContentStyles}>
                      <TextField
                        label="Cluster Name"
                        value={formData.clusterName}
                        onChange={(e) => setFormData({ ...formData, clusterName: e.target.value })}
                        sx={commonInputSx}
                        fullWidth
                      />
                      <div>
                        <p>Run this command in the CLI:</p>
                        <code>
                          clusteradm join --token {token} --cluster-name {formData.clusterName}
                        </code>
                        <Button
                          onClick={() =>
                            navigator.clipboard.writeText(
                              `clusteradm join --hub-token ${formData.token} --cluster-name ${formData.clusterName}`
                            )
                          }
                          variant="contained"
                        >
                          Copy
                        </Button>
                      </div>
                    </Box>

                    <Box sx={{
                      mt: 'auto',
                      pt: 2,
                      borderTop: 1,
                      borderColor: 'divider',
                    }}>
                      <DialogActions>
                        <Button onClick={handleCancel}>Cancel</Button>
                        <Button
                          variant="contained"
                          onClick={handleImportCluster}
                          disabled={!formData.clusterName || loading}
                          sx={{
                            "&:disabled": {
                              cursor: "not-allowed",
                              pointerEvents: "all !important",
                            },
                          }}
                          className={`${(!formData.clusterName || loading)
                            ? theme === "dark"
                              ? "!bg-gray-700 !text-gray-400"
                              : "!bg-gray-300 !text-gray-500"
                            : ""
                            }`}
                        >
                          {loading ? <CircularProgress size={24} /> : "Import"}
                        </Button>
                      </DialogActions>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage("")}
        message={errorMessage}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </>
  );
};

export default ImportClusters;
import { useEffect, useState } from "react";
import { useClusterQueries } from '../hooks/queries/useClusterQueries';
import Editor from "@monaco-editor/react";
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
import useTheme from "../stores/themeStore";
//import { useCSRStatus } from "../hooks/useCSRStatus";

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
  const { useClusters } = useClusterQueries(); // Import the hook
  const [currentPage, setCurrentPage] = useState(1);
  const { data, error, isLoading } = useClusters(currentPage); // Fetch clusters for the current page

  const theme = useTheme((state) => state.theme)
  const textColor = theme === "dark" ? "white" : "black";
  const bgColor = theme === "dark" ? "#1F2937" : "background.paper";

  const [fileType, setFileType] = useState<"yaml">("yaml");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editorContent, setEditorContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

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

   // ✅ Fetch the Hub API Server URL on mount
   useEffect(() => {
    fetch("/clusters/manual/generateCommand") // Change this to your actual endpoint
      .then((res) => res.json())
      .then((data) => {
        setFormData((prev) => ({ ...prev, hubApiServer: data.apiserver }));
      })
      .catch((err) => console.error("Error fetching hub API server:", err));
  }, []);

  const generatedCommand = `clusteradm join --hub-token ${formData.token} --hub-apiserver ${formData.hubApiServer} --cluster-name ${formData.clusterName}`;
  //const { status, loading: csrLoading, error } = useCSRStatus(formData.clusterName);
 

  const handleImportCluster = async () => {
    setErrorMessage("");
    setLoading(true);
  
    try {
      const response = await fetch("http://localhost:4000/clusters/manual/generateCommand", {  // ✅ Updated API endopoint
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clusterName: formData.clusterName,
          token: formData.token,
          hubApiServer: formData.hubApiServer,
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.message || "Failed to generate import command.");
      }
  
      // Show success message and display the command
      setSnackbar({
        open: true,
        message: "Cluster import command generated successfully!",
        severity: "success",
      });
  
      console.log("Generated Command:", data.command); // Log for debugging
      // Optionally, you can display the command in the UI
  
      // Clear form fields after a successful request
      setFormData({ clusterName: "", token: "", hubApiServer: "" });
  
    } catch (error: unknown) {
      console.error("Error generating import command:", error);
  
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("An unknown error occurred");
      }
  
      // Show error message
      setSnackbar({
        open: true,
        message: "Error generating import command. Please check your inputs.",
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const tabContentStyles = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    border: 1,
    borderColor: 'divider',
    borderRadius: 1,
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

  // Handle loading state
  if (isLoading) return (
    <div className="w-full p-4">
      <CircularProgress />
      <p>Loading clusters...</p>
    </div>
  );

  // Handle error state
  if (error) return (
    <div className="w-full p-4">
      <Alert severity="error">
        <AlertTitle>Error</AlertTitle>
        {error.message || 'Failed to load clusters. Please try again later.'}
      </Alert>
    </div>
  );

  const clusters = data?.itsData || []; // Extract clusters from the fetched data

  // Add pagination controls
  const handleNextPage = () => {
    setCurrentPage((prev) => prev + 1);
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1)); // Prevent going below page 1
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
                borderBottom: 2,
                borderColor: 'divider',
                bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                '& .MuiTab-root': {
                  px: 3,
                  py: 1.5,
                  color: textColor,
                  borderRight: 1,
                  borderColor: 'divider',
                  '&.Mui-selected': {
                    color: 'primary.main',
                    bgcolor: theme === 'dark' ? 'rgba(144, 202, 249, 0.08)' : '#E3F2FD',
                    borderBottom: 2,
                    borderColor: 'primary.main',
                  },
                  '&:hover': {
                    bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                  },
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                }
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
                <Box sx={tabContentStyles}>
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
                        variant="outlined"
                        name="clusterName"
                        value={formData.clusterName}
                        onChange={handleChange}
                        sx={commonInputSx}
                        fullWidth
                      />
                      <div>
                        {/* Show the generated command inside a <code> block */}
                        <p>Run this command in the CLI:</p>
                        <code>{generatedCommand}</code>

                        {/* Copy Button */}
                        <Button onClick={() => navigator.clipboard.writeText(generatedCommand)} variant="contained">
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

      <div>
        <button onClick={handlePreviousPage} disabled={currentPage === 1}>
          Previous
        </button>
        <button onClick={handleNextPage}>
          Next
        </button>
      </div>

      <h2>Clusters</h2>
      <ul>
        {clusters.map((cluster) => (
          <li key={cluster.name}>
            {cluster.name} - {cluster.namespace}
          </li>
        ))}
      </ul>
    </>
  );
};
export default ImportClusters;
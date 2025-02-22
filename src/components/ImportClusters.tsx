import { useState, useContext } from "react";
import Editor from "@monaco-editor/react";
import { ThemeContext } from "../context/ThemeContext";
import {
  Autocomplete,
  Chip,
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
  FormHelperText,
  Snackbar,
} from "@mui/material";
import axios from "axios";
import { BASE_URL } from "../utils/credentials";

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
  const [option, setOption] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [formData, setFormData] = useState({
    clusterName: "",
    Region: "",
    value: ["1"],
    node: "",
  });

  const handleImportCluster = async () => {
    setErrorMessage("");
    setLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/clusters/import`, {...formData, value:labels});
      if (response.status !== 200 && response.status !== 202) {
        throw new Error("Network response was not ok");
      }
      console.log("Cluster import initiated:", response.data);
      setFormData({ clusterName: "", Region: "", value: [], node: "" });
      setLabels([]);
    } catch (error: unknown) {
      console.error("Error importing cluster:", error);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("An unknown error occurred");
      }
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
    borderRadius: 1,
    p: 3,
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
                      <Button  component="label" sx={{ boxShadow: 2 }}>
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
                      sx={{ boxShadow: 2 }}
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
                    Fill out the form to import cluster manually.
                  </Alert>
                  
                  <Box 
                    sx={{
                      flex: 1,
                      overflow: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
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
                      
                      <FormControl sx={commonInputSx} required fullWidth>
                        <InputLabel>Cluster Set</InputLabel>
                        <Select
                          value={option}
                          onChange={(e) => setOption(e.target.value)}
                          label="Cluster Set"
                        >
                          <MenuItem value="Cluster Set 1">Cluster Set 1</MenuItem>
                          <MenuItem value="Cluster Set 2">Cluster Set 2</MenuItem>
                          <MenuItem value="Cluster Set 3">Cluster Set 3</MenuItem>
                        </Select>
                        {!option && (
                          <FormHelperText>Please select a cluster set.</FormHelperText>
                        )}
                      </FormControl>
                      
                      <TextField
                        label="Number of Nodes"
                        value={formData.node}
                        onChange={(e) => setFormData({ ...formData, node: e.target.value })}
                        sx={commonInputSx}
                        fullWidth
                      />
                      
                      <TextField
                        label="Region"
                        value={formData.Region}
                        onChange={(e) => setFormData({ ...formData, Region: e.target.value })}
                        sx={commonInputSx}
                        fullWidth
                      />
                      
                      <Autocomplete
                        multiple
                        freeSolo
                        options={[]}
                        value={labels}
                        onChange={(_, newValue) => setLabels(newValue)}
                        renderTags={(value: string[], getTagProps) =>
                          value.map((option, index) => (
                            <Chip 
                              label={option} 
                              {...getTagProps({ index })}
                              sx={{ 
                                borderRadius: 1,
                                '& .MuiChip-deleteIcon': {
                                  color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                                }
                              }}
                            />
                          ))
                        }
                        renderInput={(params) => (
                          <TextField 
                            {...params} 
                            label="Labels" 
                            placeholder="Add Labels" 
                            sx={commonInputSx}
                            fullWidth
                          />
                        )}
                      />
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
                          disabled={!formData.clusterName || !formData.Region || !labels.length || !formData.node || loading}
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
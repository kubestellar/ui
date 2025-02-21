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
  Typography,
  FormHelperText,
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
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    clusterName: "",
    Region: "",
    value: ["1"],
    node: "",
  });

  const handleImportCluster = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/clusters/import`, {...formData, value:labels});
      if (response.status !== 200 && response.status !== 202) {
        throw new Error("Network response was not ok");
      }
      console.log("Cluster import initiated:", response.data);
      setFormData({ clusterName: "", Region: "", value: [], node: "" });
      setLabels([]);
    } catch (err: any) {
      console.error("Error importing cluster:", err);
      setError("Failed to initiate cluster import. Please try again.");
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
    setError("");
    setActiveOption(null);
  };


  return (
    <Dialog open={!!activeOption} onClose={onCancel} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ color: textColor, bgcolor: bgColor }}>
        Import Cluster
      </DialogTitle>
      <DialogContent sx={{ bgcolor: bgColor }}>
        <Box sx={{ width: "100%" }}>
          <Tabs
            value={activeOption}
            onChange={(_event, newValue) => setActiveOption(newValue)}
            sx={{
              ".Mui-selected": {
                backgroundColor: "#E3F2FD",
                borderRadius: "5px 5px 0 0",
              },
            }}
          >
            <Tab sx={{ color: textColor }} label="YAML paste" value="option1" />
            <Tab sx={{ color: textColor }} label="Kubeconfig" value="option2" />
            <Tab sx={{ color: textColor }} label="API/URL" value="option3" />
            <Tab sx={{ color: textColor }} label="Manual" value="option4" />
          </Tabs>

          <Box sx={{ mt: 2 }}>
            {activeOption === "option1" && (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <AlertTitle>Info</AlertTitle>
                  Paste a YAML file.
                </Alert>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel sx={{ color: textColor }}>File Type</InputLabel>
                  <Select
                    sx={{ bgcolor: bgColor, color: textColor }}
                    value={fileType}
                    onChange={(e) => {
                      setFileType(e.target.value as "yaml");
                      setEditorContent("");
                    }}
                    label="File Type"
                    MenuProps={{
                      PaperProps: { sx: { bgcolor: bgColor } },
                    }}
                  >
                    <MenuItem sx={{ color: textColor }} value="yaml">
                      YAML
                    </MenuItem>
                  </Select>
                </FormControl>
                <Editor
                  height="400px"
                  language={fileType}
                  value={editorContent}
                  theme={theme === "dark" ? "light" : "vs-dark"}
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
                    disabled={!editorContent}
                    sx={{ boxShadow: 2 }}
                  >
                    Upload
                  </Button>
                </DialogActions>
              </Box>
            )}

            {activeOption === "option2" && (
              <Box sx={{ color: textColor }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <AlertTitle>Info</AlertTitle>
                  Select a kubeconfig file to import cluster.
                </Alert>
                <Box
                  sx={{
                    mt: 2,
                    border: 2,
                    borderColor: "grey.500",
                    borderRadius: 1,
                    p: 2,
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
              <Box sx={{ color: textColor, p: 2, borderRadius: 2 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
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
              <Box sx={{ color: textColor, p: 2, borderRadius: 2 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <AlertTitle>Info</AlertTitle>
                  Fill out the form to import cluster manually.
                </Alert>
                <form>
                  <TextField
                    fullWidth
                    label="Cluster Name"
                    value={formData.clusterName}
                    onChange={(e) =>
                      setFormData({ ...formData, clusterName: e.target.value })
                    }
                    sx={commonInputSx}
                  />
                  <FormControl fullWidth sx={commonInputSx} required>
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
                    fullWidth
                    label="Number of Nodes"
                    value={formData.node}
                    onChange={(e) =>
                      setFormData({ ...formData, node: e.target.value })
                    }
                    sx={commonInputSx}
                  />
                  <TextField
                    fullWidth
                    label="Region"
                    value={formData.Region}
                    onChange={(e) =>
                      setFormData({ ...formData, Region: e.target.value })
                    }
                    sx={commonInputSx}
                  />
                  <Autocomplete
                    multiple
                    freeSolo
                    options={[]} // Allows custom input
                    value={labels}
                    onChange={(_, newValue) => setLabels(newValue)}
                    renderTags={(value: string[], getTagProps) =>
                      value.map((option, index) => (
                        <Chip label={option} {...getTagProps({ index })} />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Labels" placeholder="Add Labels" sx={commonInputSx} />
                    )}
                  />
                  {error && (
                    <Typography color="error" sx={{ mb: 2 }}>
                      {error}
                    </Typography>
                  )}
                  <DialogActions>
                    <Button onClick={handleCancel} sx={{ color: textColor }}>
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleImportCluster}
                      disabled={
                        !formData.clusterName ||
                        !formData.Region ||
                        !labels.length ||
                        !formData.node ||
                        loading
                      }
                      sx={{ boxShadow: 2 }}
                    >
                      {loading ? <CircularProgress size={24} color="inherit" /> : "Import"}
                    </Button>
                  </DialogActions>
                </form>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
export default ImportClusters;
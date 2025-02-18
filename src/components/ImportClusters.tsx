import { useState } from "react";
import Editor from "@monaco-editor/react";
import { ThemeContext } from "../context/ThemeContext"; 
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

const ImportClusters = ({
  activeOption,
  setActiveOption,
  // setHasUnsavedChanges,
  onCancel,
}: Props) => {
  const [fileType, setFileType] = useState<"yaml" | "json">("yaml");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [editorContent, setEditorContent] = useState<string>("");
  const [error, setError] = useState<string>("");
  //const [loading, setLoading] = useState(false);
  const { theme } = useContext(ThemeContext);

  const [formData, setFormData] = useState({
    clusterName: "",
    Region: "",
    value: "",
  });

  const handleFileUpload = async () => {
  };
  
  console.log(error);  

  const handleCancel = () => {
    setSelectedFile(null); // Clear file selection
    setError("");          // Clear error messages
    setActiveOption(null);  // Close the modal
  };
  

  return (
    <Dialog  open={!!activeOption} onClose={onCancel} maxWidth="lg" fullWidth>
      <DialogTitle sx={{color: theme === "dark" ? "white" : "black" , bgcolor: theme === "dark" ? "#1F2937" : "background.paper"}}>Create Deployment</DialogTitle>
      <DialogContent sx={{ bgcolor: theme === "dark" ? "#1F2937" : "background.paper"}} >
        <Box sx={{ width: "100%"}}>
          <Tabs
            value={activeOption}
            onChange={(_event, newValue) => setActiveOption(newValue)}
          >
            <Tab sx={{color: theme === "dark" ? "white" : "black"}} label="YAML paste" value="option1" />
            <Tab sx={{color: theme === "dark" ? "white" : "black"}} label="Kubeconfig" value="option2" />
            <Tab sx={{color: theme === "dark" ? "white" : "black"}} label="API/URL" value="option3" />
            <Tab sx={{color: theme === "dark" ? "white" : "black"}} label="Manual" value="option4" />
          </Tabs>

          <Box 
          sx={{ 
            mt: 2 ,
          }}
          >
            {activeOption === "option1" && (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <AlertTitle>Info</AlertTitle>
                  Paste a YAML file.
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
                          setEditorContent(""); // Clear the editor content on file type change
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
                      </Select>
                </FormControl>


                <Editor
                    height="400px"
                    language={fileType}
                    value={editorContent}
                    theme={theme === "dark" ? "light" : "vs-dark"} // Switch themes dynamically
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
                  >
                    Upload
                  </Button>
                </DialogActions>

              </Box>
            )}

            {activeOption === "option2" && (
              <Box sx={{color: theme === "dark" ? "white" : "black"}}>
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
              <Box
                className={theme === "dark" ? "bg-gray-800 text-white" : "text-black"}
                p={2}
                borderRadius={2}
              >
                <Alert severity="info" sx={{ mb: 2 }}>
                  <AlertTitle>Info</AlertTitle>
                  Not Developed Full.
                </Alert>

                <TextField
                  fullWidth
                  label="App Name"
                  value={formData.clusterName}
                  onChange={(e) =>
                    setFormData({ ...formData, clusterName: e.target.value })
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
                  value={formData.Region}
                  onChange={(e) =>
                    setFormData({ ...formData, Region: e.target.value })
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

                <DialogActions>
                  <Button onClick={handleCancel} sx={{ color: theme === "dark" ? "white" : "black" }}>
                    Cancel
                  </Button>
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
              <Box className={theme === "dark" ? "bg-gray-800 text-white" : "text-black"} p={2} borderRadius={2}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <AlertTitle>Info</AlertTitle>
                  Fill out the form to create a deployment.
                </Alert>

              </Box>
            )}

          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ImportClusters;
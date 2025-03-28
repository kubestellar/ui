import { Box, Button, TextField, Typography, Snackbar, FormControlLabel, Checkbox } from "@mui/material"; // Added Checkbox and FormControlLabel
// import DoneIcon from "@mui/icons-material/Done";
import FileUploadIcon from "@mui/icons-material/FileUpload";
// import ContentCopyIcon from "@mui/icons-material/ContentCopy";
// import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { StyledContainer, StyledPaper } from "../StyledComponents";
import yaml from "js-yaml";
import { useState, useEffect } from "react";
import useTheme from "../../stores/themeStore";
import Editor from "@monaco-editor/react";
// import { toast } from "react-hot-toast";

// Define the type for the YAML document
interface YamlDocument {
  metadata?: {
    name?: string;
  };
  [key: string]: unknown;
}

interface Props {
  workloadName: string;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  loading: boolean;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  formatFileSize: (size: number) => string;
  handleFileUpload: (autoNs: boolean) => void; // Updated to accept autoNs parameter
  handleCancelClick: () => void;
}

export const UploadFileTab = ({
  selectedFile,
  setSelectedFile,
  loading,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleFileChange,
  formatFileSize,
  handleFileUpload,
  handleCancelClick,
}: Props) => {
  const theme = useTheme((state) => state.theme);
  const [localWorkloadName, setLocalWorkloadName] = useState("");
  const [fileContent, setFileContent] = useState<string | null>(null);
  // const [dialogOpen, setDialogOpen] = useState(false);
  // const [editedContent, setEditedContent] = useState<string>("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  // const [snackbarMessage, setSnackbarMessage] = useState("Changes saved successfully");
  // const [isEditable, setIsEditable] = useState(false);
  const [autoNs, setAutoNs] = useState(false); // Added state for checkbox

  useEffect(() => {
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setFileContent(content);
        // setEditedContent(content);

        try {
          const yamlObj = yaml.load(content) as YamlDocument;
          if (yamlObj && yamlObj.metadata && yamlObj.metadata.name) {
            setLocalWorkloadName(yamlObj.metadata.name);
          } else {
            setLocalWorkloadName("");
          }
        } catch (error) {
          console.error("Error parsing YAML:", error);
          setLocalWorkloadName("");
        }
      };
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        setLocalWorkloadName("");
        setFileContent(null);
        // setEditedContent("");
      };
      reader.readAsText(selectedFile);
    } else {
      setLocalWorkloadName("");
      setFileContent(null);
      // setEditedContent("");
    }
  }, [selectedFile]);

  const handleWorkloadNameChange = (newName: string) => {
    setLocalWorkloadName(newName);

    if (fileContent && selectedFile) {
      try {
        const yamlObj = yaml.load(fileContent) as YamlDocument;
        if (yamlObj && yamlObj.metadata) {
          yamlObj.metadata.name = newName;
          const updatedYaml = yaml.dump(yamlObj);
          const updatedFile = new File([updatedYaml], selectedFile.name, {
            type: selectedFile.type,
            lastModified: selectedFile.lastModified,
          });
          setSelectedFile(updatedFile);
          setFileContent(updatedYaml);
          // setEditedContent(updatedYaml);
        }
      } catch (error) {
        console.error("Error updating YAML:", error);
      }
    }
  };

  // const handleOpenDialog = () => {
  //   setDialogOpen(true);
  //   setIsEditable(false);
  // };

  // const handleCloseDialog = () => {
  //   setDialogOpen(false);
  //   setEditedContent(fileContent || "");
  //   setIsEditable(false);
  // };

  // const handleEnableEdit = () => {
  //   setIsEditable(true);
  // };

  // const handleSaveChanges = () => {
  //   if (selectedFile) {
  //     const updatedFile = new File([editedContent], selectedFile.name, {
  //       type: selectedFile.type,
  //       lastModified: selectedFile.lastModified,
  //     });
  //     setSelectedFile(updatedFile);
  //     setFileContent(editedContent);

  //     try {
  //       const yamlObj = yaml.load(editedContent) as YamlDocument;
  //       if (yamlObj && yamlObj.metadata && yamlObj.metadata.name) {
  //         setLocalWorkloadName(yamlObj.metadata.name);
  //       } else {
  //         setLocalWorkloadName("");
  //       }
  //     } catch (error) {
  //       console.error("Error parsing updated YAML:", error);
  //       setLocalWorkloadName("");
  //     }

  //     setDialogOpen(false);
      // setSnackbarMessage("Changes saved successfully");
  //     setSnackbarOpen(true);
  //     setIsEditable(false);
  //   }
  // };

  // const handleCopyContent = () => {
  //   navigator.clipboard.writeText(editedContent).then(() => {
      // setSnackbarMessage("Content copied to clipboard");
  //     setSnackbarOpen(true);
  //   }).catch((error) => {
  //     console.error("Failed to copy content:", error);
      // setSnackbarMessage("Failed to copy content");
  //     setSnackbarOpen(true);
  //   });
  // };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // const handleEditorChangeAttempt = () => {
  //   if (!isEditable) {
  //     toast.error("Click on Edit to edit");
  //   }
  // };

  return (
    <StyledContainer>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
        }}
      >
        <TextField
          fullWidth
          label="Workload Name *"
          value={localWorkloadName}
          onChange={(e) => handleWorkloadNameChange(e.target.value)}
          helperText="Workload name is extracted from YAML metadata.name"
          sx={{
            width: "98.5%",
            margin: "0 auto 10px auto",
            input: { color: theme === "dark" ? "#d4d4d4" : "#333" },
            label: { color: theme === "dark" ? "#858585" : "#666" },
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                borderColor: theme === "dark" ? "#444" : "#e0e0e0",
              },
              "&:hover fieldset": {
                borderColor: "#1976d2",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#1976d2",
              },
            },
            "& .MuiInputLabel-root.Mui-focused": {
              color: "#1976d2",
            },
            "& .MuiFormHelperText-root": {
              color: theme === "dark" ? "#858585" : "#666",
            },
          }}
        />
        {/* Added Checkbox */}
        <FormControlLabel
          control={
            <Checkbox
              checked={autoNs}
              onChange={(e) => setAutoNs(e.target.checked)}
              sx={{
                color: theme === "dark" ? "#858585" : "#666",
                "&.Mui-checked": {
                  color: "#1976d2",
                },
              }}
            />
          }
          label="Create Namespace Automatically"
          sx={{
            mb: 2,
            ml: 0.1,
            color: theme === "dark" ? "#d4d4d4" : "#333",
          }}
        />
        {/* Updated Section: Show selected file details and editor */}
        {selectedFile ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
              sx={{
                // width: "98.5%",
                width: "98.5%",
                margin: "0 auto 10px auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 1.6,
                borderRadius: "4px",
                // bgcolor: theme === "dark" ? "rgba(25, 118, 210, 0.08)" : "rgba(25, 118, 210, 0.04)",
                border: "1px solid",
                borderColor: theme === "dark" ? "#444" : "#e0e0e0",
                
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" , borderColor: theme === "dark" ? "rgba(25, 118, 210, 0.2)" : "rgba(25, 118, 210, 0.1)" }}>
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="body1" sx={{color: theme === "dark" ? "#fff" : "#333"}}>
                  <strong>{selectedFile.name}</strong> ({formatFileSize(selectedFile.size)})
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setSelectedFile(null);
                  setFileContent("");
                  setLocalWorkloadName("");
                }}
                sx={{
                  textTransform: "none",
                  borderRadius: "8px",
                  color: theme === "dark" ? "#fff" : "#333",
                  borderColor: theme === "dark" ? "#444" : "#e0e0e0",
                }}
              >
                Choose Different YAML File
              </Button>
            </Box>
            <Typography variant="subtitle1" ml={2} fontWeight={500} sx={{color: theme === "dark" ? "#fff" : "#333"}}>
              File Preview:
            </Typography>
            <StyledPaper
              elevation={0}
              sx={{
                flexGrow: 1,
                height: "calc(100% - 90px)",
                overflow: "auto",
                border: `1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)"}`,
                borderRadius: "8px",
                display: "flex",
                flexDirection: "column",
                // mb: 2,
              }}
            >
              <Editor
                height="27vh"
                language="yaml"
                value={fileContent || ""}
                theme={theme === "dark" ? "vs-dark" : "light"}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  scrollBeyondLastLine: true,
                  automaticLayout: true,
                  fontFamily: "'JetBrains Mono', monospace",
                  padding: { top: 0, bottom: 10 },
                  readOnly: true,
                }}
              />
            </StyledPaper>
          </Box>
        ) : (
          <StyledPaper
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              border: theme === "dark" ? "2px dashed #444" : "2px dashed #e0e0e0",
            }}
          >
            <span role="img" aria-label="upload" style={{ fontSize: "1.75rem" }}>
              📤
            </span>
            <Typography variant="h6" sx={{ color: theme === "dark" ? "#d4d4d4" : "#333" }}>
              Choose or Drag & Drop a YAML File
            </Typography>
            <Typography variant="body2" sx={{ color: theme === "dark" ? "#858585" : "gray" }}>
              - or -
            </Typography>
            <Button
              variant="contained"
              component="label"
              startIcon={<FileUploadIcon />}
              sx={{
                textTransform: "none",
                padding: "8px 24px",
                borderRadius: "8px",
                backgroundColor: "#1976d2",
                color: "#fff",
                "&:hover": {
                  backgroundColor: "#1565c0",
                },
              }}
            >
              Choose YAML File
              <input
                type="file"
                hidden
                accept=".yaml,.yml,.json"
                onClick={(e) => (e.currentTarget.value = "")}
                onChange={handleFileChange}
              />
            </Button>
          </StyledPaper>
        )}
      </Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
        <Button
          onClick={handleCancelClick}
          disabled={loading}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            color: theme === "dark" ? "#d4d4d4" : "#666",
            padding: "8px 16px",
            "&:hover": {
              backgroundColor: theme === "dark" ? "#333" : "#f5f5f5",
            },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => handleFileUpload(autoNs)} // Pass autoNs to handleFileUpload
          disabled={!selectedFile || loading}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            backgroundColor: "#1976d2",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: "8px",
            "&:hover": {
              backgroundColor: "#1565c0",
            },
            "&:disabled": {
              backgroundColor: "#b0bec5",
              color: "#fff",
            },
          }}
        >
          Upload & Deploy
        </Button>
      </Box>

      {/* <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: theme === "dark" ? "#1e1e1e" : "#fff",
          },
        }}
      >
        <DialogTitle sx={{ color: theme === "dark" ? "#d4d4d4" : "#333", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Edit File: {selectedFile?.name}</span>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              onClick={handleEnableEdit}
              startIcon={<EditIcon />}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                color: theme === "dark" ? "#d4d4d4" : "#666",
                padding: "4px 12px",
                "&:hover": {
                  backgroundColor: theme === "dark" ? "#333" : "#f5f5f5",
                },
              }}
              disabled={isEditable}
            >
              Edit
            </Button>
            <Button
              onClick={handleCopyContent}
              startIcon={<ContentCopyIcon />}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                color: theme === "dark" ? "#d4d4d4" : "#666",
                padding: "4px 12px",
                "&:hover": {
                  backgroundColor: theme === "dark" ? "#333" : "#f5f5f5",
                },
              }}
            >
              Copy
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              border: theme === "dark" ? "1px solid #444" : "1px solid #e0e0e0",
              borderRadius: "8px",
              overflow: "hidden",
              mt: 1,
              backgroundColor: theme === "dark" ? "#1e1e1e" : "#fff",
            }}
          >
            <Editor
              height="400px"
              language="yaml"
              value={editedContent}
              theme={theme === "dark" ? "vs-dark" : "light"}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 27, bottom: 20 },
                readOnly: !isEditable,
              }}
              onChange={(value) => {
                if (!isEditable) {
                  handleEditorChangeAttempt();
                  return;
                }
                setEditedContent(value || "");
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseDialog}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              color: theme === "dark" ? "#d4d4d4" : "#666",
              padding: "8px 16px",
              "&:hover": {
                backgroundColor: theme === "dark" ? "#333" : "#f5f5f5",
              },
            }}
          >
            Cancel
          </Button>
          {isEditable && (
            <Button
              variant="contained"
              onClick={handleSaveChanges}
              disabled={editedContent === fileContent}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                backgroundColor: "#1976d2",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: "8px",
                "&:hover": {
                  backgroundColor: "#1565c0",
                },
                "&:disabled": {
                  backgroundColor: "#b0bec5",
                  color: "#fff",
                },
              }}
            >
              Save Changes
            </Button>
          )}
        </DialogActions>
      </Dialog> */}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        // message={snackbarMessage}
        sx={{
          "& .MuiSnackbarContent-root": {
            backgroundColor: theme === "dark" ? "#333" : "#fff",
            color: theme === "dark" ? "#d4d4d4" : "#333",
          },
        }}
      />
    </StyledContainer>
  );
};
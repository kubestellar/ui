import { Box, Button, TextField, Typography, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar } from "@mui/material";
import DoneIcon from "@mui/icons-material/Done";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import ContentCopyIcon from "@mui/icons-material/ContentCopy"; // Import the copy icon
import EditIcon from "@mui/icons-material/Edit"; // Import the edit icon
import { StyledContainer, StyledPaper } from "../StyledComponents";
import yaml from "js-yaml"; // Import js-yaml to parse and update YAML
import { useState, useEffect } from "react"; // Import useState and useEffect for local state management
import useTheme from "../../stores/themeStore"; // Import useTheme for dark mode support
import Editor from "@monaco-editor/react"; // Import Monaco Editor for editable content
import { toast } from "react-hot-toast"; // Import toast for showing messages

interface Props {
  workloadName: string;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void; // Add prop to update selectedFile
  loading: boolean;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  formatFileSize: (size: number) => string;
  handleFileUpload: () => void;
  handleCancelClick: () => void;
}

// Define the type for the YAML document
interface YamlDocument {
  metadata?: {
    name?: string;
  };
  [key: string]: unknown;
}

export const UploadFileTab = ({
  // workloadName,
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
  const theme = useTheme((state) => state.theme); // Get the current theme
  // Local state to manage the workload name
  const [localWorkloadName, setLocalWorkloadName] = useState("");
  // Local state to store the file content
  const [fileContent, setFileContent] = useState<string | null>(null);
  // State to manage the dialog open/close
  const [dialogOpen, setDialogOpen] = useState(false);
  // State to manage the edited content in the dialog
  const [editedContent, setEditedContent] = useState<string>("");
  // State to manage the success snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  // State to manage the snackbar message (for both save and copy actions)
  const [snackbarMessage, setSnackbarMessage] = useState("Changes saved successfully");
  // State to manage whether the editor is editable
  const [isEditable, setIsEditable] = useState(false);

  // Read the file content and extract workload name when selectedFile changes
  useEffect(() => {
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setFileContent(content); // Store the file content
        setEditedContent(content); // Initialize edited content for the dialog

        // Parse the content to extract workload name
        try {
          const yamlObj = yaml.load(content) as YamlDocument;
          if (yamlObj && yamlObj.metadata && yamlObj.metadata.name) {
            setLocalWorkloadName(yamlObj.metadata.name);
          } else {
            setLocalWorkloadName(""); // Reset if no name is found
          }
        } catch (error) {
          console.error("Error parsing YAML:", error);
          setLocalWorkloadName(""); // Reset on error
        }
      };
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        setLocalWorkloadName("");
        setFileContent(null);
        setEditedContent("");
      };
      reader.readAsText(selectedFile);
    } else {
      setLocalWorkloadName("");
      setFileContent(null);
      setEditedContent("");
    }
  }, [selectedFile]);

  // Handle workload name change from the input box
  const handleWorkloadNameChange = (newName: string) => {
    setLocalWorkloadName(newName); // Update local state

    if (fileContent && selectedFile) {
      // Parse the current file content and update metadata.name
      try {
        const yamlObj = yaml.load(fileContent) as YamlDocument;
        if (yamlObj && yamlObj.metadata) {
          yamlObj.metadata.name = newName;
          // Convert back to YAML string
          const updatedYaml = yaml.dump(yamlObj);
          // Create a new File object with the updated content
          const updatedFile = new File([updatedYaml], selectedFile.name, {
            type: selectedFile.type,
            lastModified: selectedFile.lastModified,
          });
          setSelectedFile(updatedFile); // Update the selected file
          setFileContent(updatedYaml); // Update the stored content
          setEditedContent(updatedYaml); // Update the edited content for the dialog
        }
      } catch (error) {
        console.error("Error updating YAML:", error);
      }
    }
  };

  // Handle opening the dialog
  const handleOpenDialog = () => {
    setDialogOpen(true);
    setIsEditable(false); // Reset to non-editable when opening the dialog
  };

  // Handle closing the dialog without saving
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditedContent(fileContent || ""); // Reset edited content to original
    setIsEditable(false); // Reset editable state
  };

  // Handle enabling editing
  const handleEnableEdit = () => {
    setIsEditable(true);
  };

  // Handle saving the edited content
  const handleSaveChanges = () => {
    if (selectedFile) {
      // Create a new File object with the edited content
      const updatedFile = new File([editedContent], selectedFile.name, {
        type: selectedFile.type,
        lastModified: selectedFile.lastModified,
      });
      setSelectedFile(updatedFile); // Update the selected file
      setFileContent(editedContent); // Update the stored content

      // Re-parse the updated content to extract the new workload name
      try {
        const yamlObj = yaml.load(editedContent) as YamlDocument;
        if (yamlObj && yamlObj.metadata && yamlObj.metadata.name) {
          setLocalWorkloadName(yamlObj.metadata.name); // Update the workload name
        } else {
          setLocalWorkloadName(""); // Reset if no name is found
        }
      } catch (error) {
        console.error("Error parsing updated YAML:", error);
        setLocalWorkloadName(""); // Reset on error
      }

      setDialogOpen(false); // Close the dialog
      setSnackbarMessage("Changes saved successfully"); // Set message for save action
      setSnackbarOpen(true); // Show success snackbar
      setIsEditable(false); // Reset editable state after saving
    }
  };

  // Handle copying the editor content to clipboard
  const handleCopyContent = () => {
    navigator.clipboard.writeText(editedContent).then(() => {
      setSnackbarMessage("Content copied to clipboard"); // Set message for copy action
      setSnackbarOpen(true); // Show success snackbar
    }).catch((error) => {
      console.error("Failed to copy content:", error);
      setSnackbarMessage("Failed to copy content"); // Set error message
      setSnackbarOpen(true);
    });
  };

  // Handle closing the snackbar
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Handle editor change attempt when not editable
  const handleEditorChangeAttempt = () => {
    if (!isEditable) {
      toast.error("Click on Edit to edit");
    }
  };

  return (
    // --- Upload File Tab Section ---
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
          value={localWorkloadName} // Use local state instead of prop
          onChange={(e) => handleWorkloadNameChange(e.target.value)} // Add onChange handler
          helperText="Workload name is extracted from YAML metadata.name"
          sx={{
            width: "98.5%",
            margin: "0 auto 25px auto",
            input: { color: theme === "dark" ? "#d4d4d4" : "#333" },
            label: { color: theme === "dark" ? "#858585" : "#666" },
            "& .MuiOutlinedInput-root": {
              backgroundColor: theme === "dark" ? "#252526" : "#fff",
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
        <StyledPaper
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          sx={{
            backgroundColor: theme === "dark" ? "#252526" : "#fff",
            border: theme === "dark" ? "1px dashed #444" : "1px dashed #e0e0e0",
          }}
        >
          <span role="img" aria-label="upload" style={{ fontSize: "1.75rem" }}>
            📤
          </span>
          <Typography variant="h6" sx={{ color: theme === "dark" ? "#d4d4d4" : "#333" }}>
            {selectedFile ? "YAML File Selected" : "Choose or Drag & Drop a YAML File"}
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
            {selectedFile ? "Choose Different YAML File" : "Choose YAML File"}
            <input
              type="file"
              hidden
              accept=".yaml,.yml,.json"
              onClick={(e) => (e.currentTarget.value = "")}
              onChange={handleFileChange}
            />
          </Button>
          {selectedFile && (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, mt: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <DoneIcon sx={{ color: "green", fontSize: "1rem" }} />
                <Typography variant="body2" sx={{ color: "green" }}>
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </Typography>
              </Box>
              <Button
                onClick={handleOpenDialog}
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
                See Uploaded File
              </Button>
            </Box>
          )}
        </StyledPaper>
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
          onClick={handleFileUpload}
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

      {/* Dialog for viewing and editing file content */}
      <Dialog
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
              disabled={isEditable} // Disable if already editable
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
                readOnly: !isEditable, // Make editor read-only unless editable
              }}
              onChange={(value) => {
                if (!isEditable) {
                  handleEditorChangeAttempt(); // Show message if trying to edit while read-only
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
              disabled={editedContent === fileContent} // Disable if no changes
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
      </Dialog>

      {/* Snackbar for success message */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        message={snackbarMessage} // Use dynamic message
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
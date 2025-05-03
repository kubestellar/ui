import { Box, Button, Typography, Snackbar, FormControlLabel, Checkbox } from "@mui/material";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { StyledContainer, StyledPaper } from "../StyledComponents";
import yaml from "js-yaml";
import { useState, useEffect } from "react";
import useTheme from "../../stores/themeStore";
import Editor from "@monaco-editor/react";
import WorkloadLabelInput from "./WorkloadLabelInput";

// Define the type for the YAML document
interface YamlDocument {
  metadata?: {
    labels?: Record<string, string>;
    [key: string]: unknown;
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
  handleFileUpload: (autoNs: boolean) => void;
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
  const [localWorkloadLabel, setLocalWorkloadLabel] = useState("");
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [autoNs, setAutoNs] = useState(false);
  const [hasLabelsError, setHasLabelsError] = useState<boolean>(false);
  const [isLabelEdited, setIsLabelEdited] = useState(false); // Flag to track manual edits

  useEffect(() => {
    if (selectedFile && !isLabelEdited) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setFileContent(content);

        try {
          const documents: YamlDocument[] = [];
          yaml.loadAll(content, (doc) => documents.push(doc as YamlDocument), {});

          let found = false;
          for (let i = 0; i < documents.length; i++) {
            const doc = documents[i];
            if (doc && doc.metadata && doc.metadata.labels && Object.keys(doc.metadata.labels).length > 0) {
              const firstLabelKey = Object.keys(doc.metadata.labels)[0];
              setLocalWorkloadLabel(doc.metadata.labels[firstLabelKey]);
              found = true;
              break;
            }
          }

          setHasLabelsError(!found); // Set error only if no labels found after file is uploaded
          if (!found) {
            setLocalWorkloadLabel("");
          }
        } catch (error) {
          console.error("Error parsing YAML:", error);
          setLocalWorkloadLabel("");
          setHasLabelsError(true); // Set error on parsing failure
        }
      };
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        setLocalWorkloadLabel("");
        setFileContent(null);
        setHasLabelsError(true); // Set error on file read failure
      };
      reader.readAsText(selectedFile);
    } else if (!selectedFile) {
      setLocalWorkloadLabel("");
      setFileContent(null);
      setHasLabelsError(false); // Reset error when no file is selected
      setIsLabelEdited(false); // Reset edit flag when no file
    }
  }, [selectedFile, isLabelEdited]);

  const handleWorkloadLabelChange = (newLabel: string) => {
    setLocalWorkloadLabel(newLabel);
    setIsLabelEdited(true); // Mark as edited when user types

    if (fileContent && selectedFile) {
      try {
        const yamlObj = yaml.load(fileContent) as YamlDocument;
        if (yamlObj && yamlObj.metadata) {
          const [key, value] = newLabel.split(':');
          if (!yamlObj.metadata.labels) {
            yamlObj.metadata.labels = {};
          }
          yamlObj.metadata.labels[key] = value;
          
          const updatedYaml = yaml.dump(yamlObj);
          const updatedFile = new File([updatedYaml], selectedFile.name, {
            type: selectedFile.type,
            lastModified: selectedFile.lastModified,
          });
          setSelectedFile(updatedFile);
          setFileContent(updatedYaml);
          setHasLabelsError(false); // Reset error when label is added manually
        }
      } catch (error) {
        console.error("Error updating YAML:", error);
      }
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

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
        <WorkloadLabelInput handleChange={(e) => handleWorkloadLabelChange(e.target.value)} isError={selectedFile ? hasLabelsError : false} theme={theme} value={localWorkloadLabel} />
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
        {selectedFile ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
              sx={{
                width: "98.5%",
                margin: "0 auto 10px auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 1.6,
                borderRadius: "4px",
                border: "1px solid",
                borderColor: theme === "dark" ? "#444" : "#e0e0e0",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", borderColor: theme === "dark" ? "rgba(25, 118, 210, 0.2)" : "rgba(25, 118, 210, 0.1)" }}>
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="body1" sx={{ color: theme === "dark" ? "#fff" : "#333" }}>
                  <strong>{selectedFile.name}</strong> ({formatFileSize(selectedFile.size)})
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setSelectedFile(null);
                  setFileContent("");
                  setLocalWorkloadLabel("");
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
            <Typography variant="subtitle1" ml={2} fontWeight={500} sx={{ color: theme === "dark" ? "#fff" : "#333" }}>
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
      <Box sx={{ 
        display: "flex", 
        justifyContent: "flex-end", 
        gap: 1, 
        mt: 2,
        position: "relative",
        width: "100%",
        height: "auto",
        minHeight: "40px",
        padding: "8px 0",
        zIndex: 1
      }}>
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
          onClick={() => handleFileUpload(autoNs)}
          disabled={!selectedFile || loading || (selectedFile && hasLabelsError)}
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

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
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
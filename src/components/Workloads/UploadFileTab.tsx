import { Box, Button, Typography, FormControlLabel, Checkbox, Paper } from "@mui/material";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
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
  height?: string; // Added height prop for consistency with other modals
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
  height = "calc(75vh - 140px)", // Increased height from -180px to -140px for more space
}: Props) => {
  const theme = useTheme((state) => state.theme);
  const [localWorkloadLabel, setLocalWorkloadLabel] = useState("");
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [autoNs, setAutoNs] = useState(false);
  const [hasLabelsError, setHasLabelsError] = useState<boolean>(false);
  const [isLabelEdited, setIsLabelEdited] = useState(false);

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

          setHasLabelsError(!found);
          if (!found) {
            setLocalWorkloadLabel("");
          }
        } catch (error) {
          console.error("Error parsing YAML:", error);
          setLocalWorkloadLabel("");
          setHasLabelsError(true);
        }
      };
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        setLocalWorkloadLabel("");
        setFileContent(null);
        setHasLabelsError(true);
      };
      reader.readAsText(selectedFile);
    } else if (!selectedFile) {
      setLocalWorkloadLabel("");
      setFileContent(null);
      setHasLabelsError(false);
      setIsLabelEdited(false);
    }
  }, [selectedFile, isLabelEdited]);

  const handleWorkloadLabelChange = (newLabel: string) => {
    setLocalWorkloadLabel(newLabel);
    setIsLabelEdited(true);

    if (fileContent && selectedFile) {
      try {
        const yamlObj = yaml.load(fileContent) as YamlDocument;
        if (yamlObj && yamlObj.metadata) {
          const key = "kubestellar.io/workload";
          const value = newLabel;
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
          setHasLabelsError(false);
        }
      } catch (error) {
        console.error("Error updating YAML:", error);
      }
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        pt: 2, // Add top padding to push content down
      }}
    >
      {/* Improved workload label section with better visibility */}
      <Box sx={{ 
        mb: 3, // Increased bottom margin
        mt: 1, // Added top margin for better positioning
      }}>
        <WorkloadLabelInput 
          handleChange={(e) => handleWorkloadLabelChange(e.target.value)} 
          isError={selectedFile ? hasLabelsError : false} 
          theme={theme} 
          value={localWorkloadLabel} 
        />

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
            mt: 1.5, 
            ml: -1.2,
            color: theme === "dark" ? "#d4d4d4" : "#333",
          }}
        />
      </Box>

      {selectedFile ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, overflow: "hidden" }}>
          <Box
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 2,
              borderRadius: "8px",
              backgroundColor: theme === "dark" ? "rgba(25, 118, 210, 0.08)" : "rgba(25, 118, 210, 0.04)",
              border: "1px solid",
              borderColor: theme === "dark" ? "rgba(25, 118, 210, 0.2)" : "rgba(25, 118, 210, 0.1)",
              mb: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
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
                borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.23)" : "rgba(0, 0, 0, 0.23)",
              }}
            >
              Choose Different File
            </Button>
          </Box>
          
          <Typography variant="subtitle1" fontWeight={500} sx={{ 
            mb: 1, 
            color: theme === "dark" ? "#fff" : "#333" 
          }}>
            File Preview:
          </Typography>
          
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              height: "calc(100% - 72px)",
              overflow: "auto",
              border: theme === "dark" ? "1px solid #444" : "1px solid #e0e0e0",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              bgcolor: theme === "dark" ? "#1e1e1e" : "#fff",
            }}
          >
            <Editor
              height="100%"
              language="yaml"
              value={fileContent || ""}
              theme={theme === "dark" ? "vs-dark" : "light"}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                fontFamily: "'JetBrains Mono', monospace",
                padding: { top: 18, bottom: 18 },
                readOnly: true,
              }}
            />
          </Paper>
        </Box>
      ) : (
        <Paper
          elevation={0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          sx={{
            height: height,
            minHeight: "650px", 
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: "2px dashed",
            borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.2)" : "divider",
            borderRadius: "8px",
            padding: 5, 
            backgroundColor: "transparent",
            transition: "all 0.2s ease",
            flex: 1,
            "&:hover": {
              borderColor: theme === "dark" ? "#90caf9" : "#1976d2",
              backgroundColor: theme === "dark" ? "rgba(25, 118, 210, 0.08)" : "rgba(25, 118, 210, 0.04)",
            },
          }}
        >
          <span role="img" aria-label="upload" style={{ fontSize: "3rem", marginBottom: "24px" }}>
            📤
          </span>
          <Typography variant="h6" gutterBottom sx={{ color: theme === "dark" ? "#d4d4d4" : "#333" }}>
            Choose or Drag & Drop a YAML File
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: theme === "dark" ? "#858585" : "gray",
              mb: 3,
              mt: 1,
            }}
          >
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
              fontWeight: 500,
              "&:hover": {
                backgroundColor: "#1565c0",
                transform: "translateY(-2px)",
                boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
              },
              transition: "all 0.2s ease",
            }}
          >
            Select YAML File
            <input
              type="file"
              hidden
              accept=".yaml,.yml,.json"
              onClick={(e) => (e.currentTarget.value = "")}
              onChange={handleFileChange}
            />
          </Button>
          <Typography
            variant="body2"
            sx={{
              mt: 2,
              color: theme === "dark" ? "rgba(255,255,255,0.6)" : "text.secondary",
              fontSize: "0.8rem",
            }}
          >
            Accepted formats: .yaml, .yml, .json
          </Typography>
        </Paper>
      )}

      <Box sx={{ 
        display: "flex", 
        justifyContent: "flex-end", 
        gap: 1, 
        mt: 2,
        py: 1, // Consistent padding with YamlTab
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
          Deploy
        </Button>
      </Box>
    </Box>
  );
};
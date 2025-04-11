import Editor from "@monaco-editor/react";
import { Box, Button, TextField, FormControlLabel, Checkbox } from "@mui/material"; // Added Checkbox and FormControlLabel
import { StyledContainer } from "../StyledComponents";
import yaml from "js-yaml";
import { useState, useEffect } from "react";
import useTheme from "../../stores/themeStore";

interface Props {
  editorContent: string;
  setEditorContent: (value: string) => void;
  workloadName: string;
  detectContentType: (content: string) => "json" | "yaml";
  isEditorContentEdited: boolean;
  loading: boolean;
  handleRawUpload: (autoNs: boolean) => void; // Updated to accept autoNs parameter
  handleCancelClick: () => void;
}

interface YamlDocument {
  metadata?: {
    name?: string;
    namespace?: string;
    labels?: Record<string, unknown>;
  };
  [key: string]: unknown;
}

export const YamlTab = ({
  editorContent,
  setEditorContent,
  detectContentType,
  isEditorContentEdited,
  loading,
  handleRawUpload,
  handleCancelClick,
}: Props) => {
  const theme = useTheme((state) => state.theme);
  const [localWorkloadName, setLocalWorkloadName] = useState("");
  const [nameDocumentIndex, setNameDocumentIndex] = useState<number | null>(null);
  const [autoNs, setAutoNs] = useState(false); // Added state for checkbox

  useEffect(() => {
    try {
      const documents: YamlDocument[] = [];
      yaml.loadAll(editorContent, (doc) => documents.push(doc as YamlDocument), {});

      let foundIndex: number | null = null;
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        if (doc && doc.metadata && doc.metadata.name) {
          setLocalWorkloadName(doc.metadata.name);
          foundIndex = i;
          break;
        }
      }

      if (foundIndex !== null) {
        setNameDocumentIndex(foundIndex);
      } else {
        setLocalWorkloadName("");
        setNameDocumentIndex(null);
      }
    } catch (error) {
      console.error("Error parsing YAML:", error);
      setLocalWorkloadName("");
      setNameDocumentIndex(null);
    }
  }, [editorContent]);

  const handleWorkloadNameChange = (newName: string) => {
    setLocalWorkloadName(newName);

    try {
      const documents: YamlDocument[] = [];
      yaml.loadAll(editorContent, (doc) => documents.push(doc as YamlDocument), {});

      if (
        nameDocumentIndex !== null &&
        documents[nameDocumentIndex] &&
        documents[nameDocumentIndex].metadata
      ) {
        documents[nameDocumentIndex].metadata!.name = newName;
        documents[nameDocumentIndex].metadata!.namespace = newName;
        if (!documents[nameDocumentIndex].metadata!.labels) {
          documents[nameDocumentIndex].metadata!.labels = {};
        }
        (documents[nameDocumentIndex].metadata!.labels as Record<string, unknown>)["kubernetes.io/metadata.name"] = newName;
      } else {
        if (documents.length === 0) {
          documents.push({ 
            metadata: { 
              name: newName,
              namespace: newName,
              labels: { "kubernetes.io/metadata.name": newName }
            } 
          });
        } else {
          if (!documents[0].metadata) {
            documents[0].metadata = { 
              name: newName,
              namespace: newName,
              labels: { "kubernetes.io/metadata.name": newName }
            };
          } else {
            documents[0].metadata.name = newName;
            documents[0].metadata.namespace = newName;
            if (!documents[0].metadata.labels) {
              documents[0].metadata.labels = {};
            }
            (documents[0].metadata.labels as Record<string, unknown>)["kubernetes.io/metadata.name"] = newName;
          }
          setNameDocumentIndex(0);
        }
      }

      const updatedYaml = documents
        .map((doc) => yaml.dump(doc))
        .join("---\n");
      setEditorContent(updatedYaml);
    } catch (error) {
      console.error("Error updating YAML:", error);
    }
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
        <TextField
          fullWidth
          label="Workload Name *"
          value={localWorkloadName}
          onChange={(e) => handleWorkloadNameChange(e.target.value)}
          sx={{
            // mb: 20,
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
          helperText="Workload name is extracted from YAML/JSON metadata.name"
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
        <Box
          sx={{
            border: theme === "dark" ? "1px solid #444" : "1px solid #e0e0e0",
            borderRadius: "8px",
            overflow: "hidden",
            mt: 1,
            width: "98.5%",
            margin: "0 auto",
            // mb:4
          }}
        >
          <Editor
            height="435px"
            language={detectContentType(editorContent)}
            value={editorContent}
            theme={theme === "dark" ? "vs-dark" : "light"}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 27, bottom: 20 },
            }}
            onChange={(value) => setEditorContent(value || "")}
          />
        </Box>
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
          onClick={() => handleRawUpload(autoNs)} // Pass autoNs to handleRawUpload
          disabled={!isEditorContentEdited || loading}
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
    </StyledContainer>
  );
};
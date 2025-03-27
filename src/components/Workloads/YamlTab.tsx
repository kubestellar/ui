import Editor from "@monaco-editor/react";
import { Box, Button, TextField } from "@mui/material";
import { StyledContainer } from "../StyledComponents";
import yaml from "js-yaml"; // Import js-yaml to parse and update YAML
import { useState, useEffect } from "react"; // Import useState and useEffect for local state management
import useTheme from "../../stores/themeStore"; // Import useTheme for dark mode support

interface Props {
  editorContent: string;
  setEditorContent: (value: string) => void;
  workloadName: string; // We'll still accept this prop but not rely on it
  detectContentType: (content: string) => "json" | "yaml";
  isEditorContentEdited: boolean;
  loading: boolean;
  handleRawUpload: () => void;
  handleCancelClick: () => void;
}

// Define the type for the YAML document
interface YamlDocument {
  metadata?: {
    name?: string;
  };
  [key: string]: unknown;
}

export const YamlTab = ({
  editorContent,
  setEditorContent,
  // workloadName, // Remove the unused alias initialWorkloadName
  detectContentType,
  isEditorContentEdited,
  loading,
  handleRawUpload,
  handleCancelClick,
}: Props) => {
  const theme = useTheme((state) => state.theme); // Get the current theme
  // Local state to manage the workload name
  const [localWorkloadName, setLocalWorkloadName] = useState("");
  // Track the index of the document from which the workload name was extracted
  const [nameDocumentIndex, setNameDocumentIndex] = useState<number | null>(null);

  // Extract workload name from editorContent when it changes (supports multiple documents)
  useEffect(() => {
    try {
      // Parse all YAML documents
      const documents: YamlDocument[] = []; // Use the defined type
      yaml.loadAll(editorContent, (doc) => documents.push(doc as YamlDocument), {});

      // Find the first document with metadata.name
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
        setLocalWorkloadName(""); // Reset if no name is found
        setNameDocumentIndex(null);
      }
    } catch (error) {
      console.error("Error parsing YAML:", error);
      setLocalWorkloadName(""); // Reset on error
      setNameDocumentIndex(null);
    }
  }, [editorContent]);

  // Handle workload name change from the input box
  const handleWorkloadNameChange = (newName: string) => {
    setLocalWorkloadName(newName); // Update local state

    // Parse all YAML documents
    try {
      const documents: YamlDocument[] = []; // Use the defined type
      yaml.loadAll(editorContent, (doc) => documents.push(doc as YamlDocument), {});

      // Update the metadata.name in the correct document
      if (nameDocumentIndex !== null && documents[nameDocumentIndex] && documents[nameDocumentIndex].metadata) {
        documents[nameDocumentIndex].metadata!.name = newName;

        // Convert all documents back to a multi-document YAML string
        const updatedYaml = documents
          .map((doc) => yaml.dump(doc))
          .join("---\n");
        setEditorContent(updatedYaml);
      }
    } catch (error) {
      console.error("Error updating YAML:", error);
    }
  };

  return (
    // --- YAML Tab Section ---
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
          sx={{
            mb: 2,
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
          helperText="Workload name is extracted from YAML/JSON metadata.name"
        />
        <Box
          sx={{
            border: theme === "dark" ? "1px solid #444" : "1px solid #e0e0e0",
            borderRadius: "8px",
            overflow: "hidden",
            mt: 1,
            width: "98.5%",
            margin: "0 auto",
            backgroundColor: theme === "dark" ? "#1e1e1e" : "#fff",
          }}
        >
          <Editor
            height="335px"
            language={detectContentType(editorContent)}
            value={editorContent}
            theme={theme === "dark" ? "vs-dark" : "light"} // Switch editor theme based on the app theme
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
          onClick={handleRawUpload}
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
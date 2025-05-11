import Editor from "@monaco-editor/react";
import { Box, Button, FormControlLabel, Checkbox, Paper } from "@mui/material";
import yaml from "js-yaml";
import { useState, useEffect } from "react";
import useTheme from "../../stores/themeStore";
import WorkloadLabelInput from "./WorkloadLabelInput";

interface Props {
  editorContent: string;
  setEditorContent: (value: string) => void;
  workloadName: string;
  detectContentType: (content: string) => "json" | "yaml";
  isEditorContentEdited: boolean;
  loading: boolean;
  handleRawUpload: (autoNs: boolean) => void;
  handleCancelClick: () => void;
  height?: string; // Added height prop for consistency with other modals
}

interface YamlDocument {
  metadata?: {
    labels?: Record<string, string>;
    [key: string]: unknown;
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
  height = "calc(75vh - 200px)", // Default height that matches CreateBindingPolicyDialog
}: Props) => {
  const theme = useTheme((state) => state.theme);
  const [localWorkloadLabel, setLocalWorkloadLabel] = useState("");
  const [nameDocumentIndex, setNameDocumentIndex] = useState<number | null>(null);
  const [autoNs, setAutoNs] = useState(false);
  const [hasLabelsError, setHasLabelsError] = useState(true);

  useEffect(() => {
    const checkLabels = () => {
      try {
        const documents: YamlDocument[] = [];
        yaml.loadAll(editorContent, (doc) => documents.push(doc as YamlDocument), {});
        let foundIndex: number | null = null;
        let foundValue = "";
        for (let i = 0; i < documents.length; i++) {
          const doc = documents[i];
          if (doc?.metadata?.labels?.["kubestellar.io/workload"]) {
            foundValue = doc.metadata.labels["kubestellar.io/workload"];
            foundIndex = i;
            break;
          }
        }
        const hasLabelsResult = foundIndex !== null;
        setHasLabelsError(!hasLabelsResult);
        if (foundIndex !== null) {
          setLocalWorkloadLabel(foundValue);
          setNameDocumentIndex(foundIndex);
        } else {
          setLocalWorkloadLabel("");
          setNameDocumentIndex(null);
        }
        return hasLabelsResult;
      } catch (error) {
        console.error("Error parsing YAML:", error);
        setLocalWorkloadLabel("");
        setNameDocumentIndex(null);
        setHasLabelsError(true);
        return false;
      }
    };
    checkLabels();
  }, [editorContent]);

  const handleWorkloadLabelChange = (newLabel: string) => {
    setLocalWorkloadLabel(newLabel);

    try {
      const documents: YamlDocument[] = [];
      yaml.loadAll(editorContent, (doc) => documents.push(doc as YamlDocument), {});
      const key = "kubestellar.io/workload";
      const value = newLabel;

      if (
        nameDocumentIndex !== null &&
        documents[nameDocumentIndex] &&
        documents[nameDocumentIndex].metadata
      ) {
        if (!documents[nameDocumentIndex].metadata!.labels) {
          documents[nameDocumentIndex].metadata!.labels = {};
        }
        documents[nameDocumentIndex].metadata!.labels[key] = value;
      } else {
        if (documents.length === 0) {
          documents.push({
            metadata: {
              labels: { [key]: value },
            },
          });
        } else {
          if (!documents[0].metadata) {
            documents[0].metadata = {
              labels: { [key]: value },
            };
          } else {
            if (!documents[0].metadata.labels) {
              documents[0].metadata.labels = {};
            }
            documents[0].metadata.labels[key] = value;
          }
          setNameDocumentIndex(0);
        }
      }

      const updatedYaml = documents.map((doc) => yaml.dump(doc)).join("---\n");
      setEditorContent(updatedYaml);
    } catch (error) {
      console.error("Error updating YAML:", error);
    }
  };

  const hasLabels = () => {
    try {
      const documents: YamlDocument[] = [];
      yaml.loadAll(editorContent, (doc) => documents.push(doc as YamlDocument), {});
      return documents.some(
        (doc) => doc.metadata && doc.metadata.labels && Object.keys(doc.metadata.labels).length > 0
      );
    } catch (error) {
      console.error("Error checking labels:", error);
      return false;
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
      {/* Add proper spacing around the workload label section */}
      <Box
        sx={{
          mb: 3, // Increased from 2 to 3 for more space below
          mt: 1, // Added top margin for better positioning
        }}
      >
        <WorkloadLabelInput
          handleChange={(e) => handleWorkloadLabelChange(e.target.value)}
          isError={hasLabelsError}
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
            mt: 1.5, // Increased from 0.5 to 1.5 for better spacing
            ml: -1.2,
            color: theme === "dark" ? "#d4d4d4" : "#333",
          }}
        />
      </Box>

      <Paper
        elevation={0}
        sx={{
          height: height,
          overflow: "auto",
          flexGrow: 1,
          border: theme === "dark" ? "1px solid #444" : "1px solid #e0e0e0",
          borderRadius: "8px",
          display: "flex",
          flexDirection: "column",
          bgcolor: theme === "dark" ? "#1e1e1e" : "#fff",
        }}
      >
        <Editor
          height="100%"
          language={detectContentType(editorContent)}
          value={editorContent}
          theme={theme === "dark" ? "vs-dark" : "light"}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 18, bottom: 18 },
          }}
          onChange={(value) => setEditorContent(value || "")}
        />
      </Paper>

      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 1,
          mt: 2,
          py: 1,
        }}
      >
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
          onClick={() => handleRawUpload(autoNs)}
          disabled={hasLabelsError || !isEditorContentEdited || loading || !hasLabels()}
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
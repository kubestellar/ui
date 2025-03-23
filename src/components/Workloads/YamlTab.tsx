import Editor from "@monaco-editor/react";
import { Box, Button, TextField } from "@mui/material";
import { StyledContainer } from "../StyledComponents";

interface Props {
  editorContent: string;
  setEditorContent: (value: string) => void;
  workloadName: string;
  detectContentType: (content: string) => "json" | "yaml";
  isEditorContentEdited: boolean;
  loading: boolean;
  handleRawUpload: () => void;
  handleCancelClick: () => void;
}

export const YamlTab = ({
  editorContent,
  setEditorContent,
  workloadName,
  detectContentType,
  isEditorContentEdited,
  loading,
  handleRawUpload,
  handleCancelClick,
}: Props) => {
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
          value={workloadName}
          InputProps={{ readOnly: true }}
          sx={{
            mb: 2,
            width: "98.5%",
            margin: "0 auto 25px auto",
            input: { color: "#333" },
            label: { color: "#666" },
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                borderColor: "#e0e0e0",
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
          }}
          helperText="Workload name is extracted from YAML/JSON metadata.name"
        />
        <Box
          sx={{
            border: "1px solid #e0e0e0",
            borderRadius: "8px",
            overflow: "hidden",
            mt: 1,
            width: "98.5%",
            margin: "0 auto",
          }}
        >
          <Editor
            height="335px"
            language={detectContentType(editorContent)}
            value={editorContent}
            theme="light"
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
            color: "#666",
            padding: "8px 16px",
            "&:hover": {
              backgroundColor: "#f5f5f5",
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
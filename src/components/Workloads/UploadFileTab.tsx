import { Box, Button, TextField, Typography } from "@mui/material";
import DoneIcon from "@mui/icons-material/Done";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import { StyledContainer, StyledPaper } from "../StyledComponents";

interface Props {
  workloadName: string;
  selectedFile: File | null;
  loading: boolean;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  formatFileSize: (size: number) => string;
  handleFileUpload: () => void;
  handleCancelClick: () => void;
}

export const UploadFileTab = ({
  workloadName,
  selectedFile,
  loading,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleFileChange,
  formatFileSize,
  handleFileUpload,
  handleCancelClick,
}: Props) => {
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
          value={workloadName}
          InputProps={{ readOnly: true }}
          helperText="Workload name is extracted from YAML metadata.name"
          sx={{
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
        />
        <StyledPaper
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <span role="img" aria-label="upload" style={{ fontSize: "1.75rem" }}>
            📤
          </span>
          <Typography variant="h6">
            {selectedFile ? "YAML File Selected" : "Choose or Drag & Drop a YAML File"}
          </Typography>
          <Typography variant="body2" sx={{ color: "gray" }}>
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
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
              <DoneIcon sx={{ color: "green", fontSize: "1rem" }} />
              <Typography variant="body2" sx={{ color: "green" }}>
                Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </Typography>
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
    </StyledContainer>
  );
};
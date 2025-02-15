import React, { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, Card, CardContent, Typography, TextField, Box } from "@mui/material";
import axios from "axios";

const KubeconfigOnboarding: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const { clusterName = "", importMode = "" } = location.state || {};

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setUploadStatus(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await axios.post("/api/upload-kubeconfig", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadStatus(`✅ Upload successful: ${response.data.message}`);
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadStatus("❌ Upload failed. Please try again.");
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="#E0F2F1">
      <Card sx={{ width: 500, p: 3, borderRadius: 2, boxShadow: 3, bgcolor: "white" }}>
        <CardContent>
          <Typography variant="h5" fontWeight="bold" align="center">Create Cluster</Typography>
          <Typography variant="h6" sx={{ mt: 2 }}>Cluster Details</Typography>
          <Box mt={2} display="flex" flexDirection="column" alignItems="center" gap={2}>
            {/* Cluster Name Field */}
            <TextField fullWidth label="Cluster Name" value={clusterName} disabled margin="normal" />
            <TextField fullWidth label="Import Mode" value={importMode} disabled margin="normal" />

            {/* File Input for Kubeconfig */}
            <input type="file" ref={fileInputRef} style={{ display: "none" }} accept=".kubeconfig" onChange={handleFileChange} />
            {selectedFile && <Typography variant="body2">Selected: {selectedFile.name}</Typography>}

            {/* Upload Button */}
            <Button variant="contained" color="primary" onClick={handleUpload} sx={{ mt: 1 }}>
              {selectedFile ? "Upload Kubeconfig" : "Choose File"}
            </Button>

            {/* Upload Status */}
            {uploadStatus && <Typography variant="body2" color={uploadStatus.includes("✅") ? "green" : "red"}>{uploadStatus}</Typography>}
          </Box>
        </CardContent>

        <Box mt={3} display="flex" justifyContent="space-between" p={2}>
          <Button variant="outlined" onClick={() => navigate(-1)}>Back</Button>
          <Button variant="contained" color="primary" onClick={() => navigate("/next-step", { state: { clusterName, importMode } })}>Next</Button>
          <Button variant="text" color="primary" onClick={() => navigate("/")}>Cancel</Button>
        </Box>
      </Card>
    </Box>
  );
};

export default KubeconfigOnboarding;
